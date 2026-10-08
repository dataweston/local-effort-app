import { describe, expect, it } from 'vitest';
import catalog from '../catalog';
import recipeCatalog from '../recipeCatalog';
import recipeCost from '../recipeCost';
import requirementsModule from '../requirements';
import units from '../units';

const { planPriceBook, planVendorLines } = catalog;
const { hashContent, planRecipeImport } = recipeCatalog;
const { RecipeCycleError, buildCostContext, costRecipe } = recipeCost;
const { computeRequirements } = requirementsModule;
const { parsePackText, toBase, toBaseInDimension } = units;

const LB = 453.59237;

// Turn a price-book plan into the "existing" state a database would hold after applying it.
function materialize(plan, existing = { stockProducts: [], vendorItems: [], observationKeys: new Set() }) {
  const stockProducts = [...existing.stockProducts, ...plan.stockProducts.create.map((row) => ({ id: `s-${row.key}`, ...row }))];
  const vendorItems = [
    ...existing.vendorItems,
    ...plan.vendorItems.create.map(({ stockKey, ...row }) => ({
      id: `v-${row.identityKey}`,
      ...row,
      status: stockKey ? 'mapped' : 'unmapped',
      stockProduct: stockKey ? { key: stockKey } : null,
    })),
  ];
  const observationKeys = new Set(existing.observationKeys);
  for (const row of plan.observations.create) observationKeys.add(`${row.source}|${row.sourceKey}`);
  return { stockProducts, vendorItems, observationKeys };
}

const priceBook = {
  stockProducts: [
    { key: 'flour', name: 'Flour', dimension: 'mass' },
    { key: 'cheese', name: 'Mozzarella', dimension: 'mass' },
  ],
  vendorItems: [
    { vendor: 'Sysco', description: 'Flour AP 25 lb', packText: '25 lb', stock: 'flour', packCostCents: 2000, purchasedAt: '2026-09-01' },
    { vendor: 'Sysco', description: 'Mozzarella 5 lb', packText: '5 lb', stock: 'cheese', packCostCents: 1500, purchasedAt: '2026-09-01' },
  ],
};

describe('units', () => {
  it('parses pack text into a base quantity and dimension', () => {
    const pack = parsePackText('25 lb');
    expect(pack.dimension).toBe('mass');
    expect(pack.baseQuantity).toBeCloseTo(25 * LB, 4);
    const multi = parsePackText('6/5 lb');
    expect(multi.baseQuantity).toBeCloseTo(30 * LB, 4);
  });

  it('refuses to convert across dimensions without a density', () => {
    expect(() => toBaseInDimension(1, 'cup', 'mass')).toThrow();
    expect(toBaseInDimension(1000, 'ml', 'mass', { densityGPerMl: 1.03 })).toBeCloseTo(1030, 6);
  });

  it('rejects unknown units instead of guessing', () => {
    expect(() => toBase(1, 'bunchish')).toThrow(/Unknown unit/);
  });
});

describe('price book planning', () => {
  it('is idempotent: re-planning against applied state produces no writes', () => {
    const first = planPriceBook(priceBook, { stockProducts: [], vendorItems: [], observationKeys: new Set() });
    expect(first.errors).toEqual([]);
    expect(catalog.planHasWrites(first)).toBe(true);
    const second = planPriceBook(priceBook, materialize(first));
    expect(second.errors).toEqual([]);
    expect(catalog.planHasWrites(second)).toBe(false);
  });

  it('rejects a mapping whose pack is a different dimension (no density) and blocks apply', async () => {
    const plan = planPriceBook({
      stockProducts: [{ key: 'oil', name: 'Oil', dimension: 'mass' }],
      vendorItems: [{ vendor: 'Sysco', description: 'Oil 1 gal', packText: '1 gal', stock: 'oil' }],
    }, { stockProducts: [], vendorItems: [], observationKeys: new Set() });
    expect(plan.errors.map((e) => e.type)).toContain('pack_dimension_mismatch');
    await expect(catalog.applyPlan({}, plan)).rejects.toMatchObject({ statusCode: 422 });
  });

  it('never auto-maps vendor lines, even when the description matches a stock product', () => {
    const existing = materialize(planPriceBook(priceBook, { stockProducts: [], vendorItems: [], observationKeys: new Set() }));
    const plan = planVendorLines([
      { sourceKey: 'lb-1', vendor: 'Sysco', description: 'Flour AP 25 lb', packText: '25 lb', observedAt: '2026-09-10', unitPriceCents: 2100 },
      { sourceKey: 'lb-2', vendor: 'Restaurant Depot', description: 'Flour', observedAt: '2026-09-11', unitPriceCents: 1800 },
    ], existing);
    expect(plan.errors).toEqual([]);
    const created = plan.vendorItems.create;
    expect(created.length).toBe(1);
    expect(created[0].stockKey ?? null).toBeNull();
    expect(plan.vendorItems.update.every((row) => !row.stockKey)).toBe(true);
  });
});

function stockFixture() {
  const stockProducts = [
    { id: 'flour', key: 'flour', name: 'Flour', dimension: 'mass', densityGPerMl: null },
    { id: 'cheese', key: 'cheese', name: 'Mozzarella', dimension: 'mass', densityGPerMl: null },
    { id: 'dough', key: 'dough', name: 'Pizza dough', dimension: 'mass', densityGPerMl: null },
  ];
  const vendorItems = [
    { id: 'vi-flour', status: 'mapped', stockProductId: 'flour', vendorName: 'Sysco', description: 'Flour 25 lb', packText: '25 lb', packBaseQuantity: 25 * LB, packDimension: 'mass', observations: [{ observedAt: '2026-09-01', packCostCents: 2000 }] },
    { id: 'vi-cheese', status: 'mapped', stockProductId: 'cheese', vendorName: 'Sysco', description: 'Mozz 5 lb', packText: '5 lb', packBaseQuantity: 5 * LB, packDimension: 'mass', observations: [{ observedAt: '2026-09-01', packCostCents: 1500 }] },
  ];
  const component = (lineNo, target, quantity, unit, wastePct = 0) => ({ lineNo, quantity, unit, wastePct, ...target });
  const version = (id, extra) => ({ id, version: 1, ...extra });
  const recipes = [
    { id: 'r-dough', key: 'dough', name: 'Dough', outputStockProductId: 'dough', activeVersion: version('rv-dough', { yieldQuantity: 1500, yieldUnit: 'g', servings: null, components: [component(1, { stockProductId: 'flour' }, 1000, 'g')] }) },
    { id: 'r-pizza', key: 'pizza', name: 'Pizza', dishEntityId: 'dish-pizza', outputStockProductId: null, activeVersion: version('rv-pizza', { yieldQuantity: 1, yieldUnit: 'each', servings: 1, components: [component(1, { subRecipeId: 'r-dough' }, 250, 'g'), component(2, { stockProductId: 'cheese' }, 100, 'g')] }) },
  ];
  return { stockProducts, vendorItems, recipes };
}

describe('recipe costing', () => {
  it('costs a nested recipe to the hand calculation', () => {
    const ctx = buildCostContext(stockFixture());
    const cost = costRecipe(ctx, 'r-pizza');
    const flourPerG = 2000 / (25 * LB);
    const cheesePerG = 1500 / (5 * LB);
    const doughPerG = (1000 * flourPerG) / 1500;
    expect(cost.status).toBe('complete');
    expect(cost.totalCostCents).toBeCloseTo(250 * doughPerG + 100 * cheesePerG, 6);
    expect(cost.label).toBe('modeled');
  });

  it('reports incomplete with a missing list rather than costing an unpriced ingredient at zero', () => {
    const fixture = stockFixture();
    fixture.vendorItems = fixture.vendorItems.filter((item) => item.id !== 'vi-cheese');
    const cost = costRecipe(buildCostContext(fixture), 'r-pizza');
    expect(cost.status).toBe('incomplete');
    expect(cost.totalCostCents).toBeNull();
    expect(cost.missing).toEqual([expect.objectContaining({ type: 'no_cost', ref: 'cheese' })]);
  });

  it('applies waste as quantity / (1 - waste%)', () => {
    const fixture = stockFixture();
    fixture.recipes[0].activeVersion.components[0].wastePct = 20;
    const cost = costRecipe(buildCostContext(fixture), 'r-dough');
    expect(cost.totalCostCents).toBeCloseTo((1000 / 0.8) * (2000 / (25 * LB)), 6);
  });

  it('rejects a cycle instead of recursing', () => {
    const fixture = stockFixture();
    fixture.recipes[0].activeVersion.components.push({ lineNo: 2, quantity: 1, unit: 'g', wastePct: 0, subRecipeId: 'r-pizza' });
    expect(() => costRecipe(buildCostContext(fixture), 'r-pizza')).toThrow(RecipeCycleError);
  });

  it('a later price changes the cost; the pack conversion applies to history', () => {
    const fixture = stockFixture();
    fixture.vendorItems[0].observations.push({ observedAt: '2026-10-01', packCostCents: 2500 });
    const cost = costRecipe(buildCostContext(fixture), 'r-dough');
    expect(cost.totalCostCents).toBeCloseTo(1000 * (2500 / (25 * LB)), 6);
  });
});

describe('recipe import planning', () => {
  const stockProducts = [
    { id: 'flour', key: 'flour', dimension: 'mass', densityGPerMl: null },
    { id: 'dough', key: 'dough', dimension: 'mass', densityGPerMl: null },
  ];
  const doughRecipe = {
    key: 'dough', name: 'Dough', output: 'dough', yield: { quantity: 1.5, unit: 'kg' },
    components: [{ stock: 'flour', quantity: 1, unit: 'kg' }],
  };

  it('creates v1, treats identical content as a no-op, and versions changed content', () => {
    const first = planRecipeImport({ recipes: [doughRecipe] }, { stockProducts, recipes: [] });
    expect(first.errors).toEqual([]);
    expect(first.create).toHaveLength(1);

    const stored = {
      id: 'r1', key: 'dough', outputStockProductId: 'dough',
      versions: [{ id: 'rv1', version: 1, status: 'active', contentHash: first.create[0].contentHash, yieldQuantity: 1500, yieldUnit: 'g', components: [{ stockProductId: 'flour', subRecipeId: null }] }],
    };
    const same = planRecipeImport({ recipes: [doughRecipe] }, { stockProducts, recipes: [stored] });
    expect(same.create).toHaveLength(0);
    expect(same.newVersion).toHaveLength(0);
    expect(same.unchanged).toBeTruthy();

    const changed = planRecipeImport({ recipes: [{ ...doughRecipe, components: [{ stock: 'flour', quantity: 1.2, unit: 'kg' }] }] }, { stockProducts, recipes: [stored] });
    expect(changed.newVersion).toHaveLength(1);
    expect(changed.newVersion[0]).toMatchObject({ version: 2, retires: 1 });
  });

  it('hash ignores key order and unit spelling', () => {
    const a = hashContent({ yield: { quantity: 1, unit: 'kg' }, servings: 2, components: [{ stock: 'flour', quantity: 1, unit: 'kg', wastePct: 0 }] });
    const b = hashContent({ components: [{ wastePct: 0, unit: 'kg', quantity: 1, stock: 'flour' }], servings: 2, yield: { unit: 'kg', quantity: 1 } });
    expect(a).toBe(b);
  });

  it('rejects an import that introduces a cycle and an unknown stock reference', () => {
    const cyclic = planRecipeImport({
      recipes: [
        { key: 'a', name: 'A', output: 'dough', yield: { quantity: 1, unit: 'kg' }, components: [{ recipe: 'b', quantity: 1, unit: 'kg' }] },
        { key: 'b', name: 'B', output: 'dough', yield: { quantity: 1, unit: 'kg' }, components: [{ recipe: 'a', quantity: 1, unit: 'kg' }] },
      ],
    }, { stockProducts, recipes: [] });
    expect(cyclic.errors.length).toBeGreaterThan(0);

    const unknown = planRecipeImport({
      recipes: [{ key: 'c', name: 'C', yield: { quantity: 1, unit: 'kg' }, components: [{ stock: 'nope', quantity: 1, unit: 'kg' }] }],
    }, { stockProducts, recipes: [] });
    expect(unknown.errors.length).toBeGreaterThan(0);
  });
});

describe('production requirements', () => {
  const batch = { menuCycleId: 'cycle-1', version: 3, sourceHash: 'hash-abc' };
  const sheet = {
    production: {
      cook: [
        { dishEntityId: 'dish-pizza', dishName: 'Pizza', meal: 'dinner', quantity: 10 },
        { dishEntityId: 'dish-pizza', dishName: 'Pizza', meal: 'lunch', quantity: 5 },
        { dishEntityId: 'dish-soup', dishName: 'Soup', meal: 'dinner', quantity: 5 },
      ],
    },
  };
  const build = () => {
    const ctx = buildCostContext(stockFixture());
    return computeRequirements({ batch, operatorSheet: sheet, ctx, vendorItems: ctx.vendorItems || stockFixture().vendorItems });
  };

  it('explodes sub-recipes, scales by servings, and reports uncovered dishes and coverage', () => {
    const result = build();
    const flour = result.rawRequirements.find((row) => row.stockProductKey === 'flour');
    // 15 pizzas * 250 g dough = 3750 g dough = 2.5 batches * 1000 g flour
    expect(flour.quantity).toBeCloseTo(2500, 4);
    expect(result.rawRequirements.find((row) => row.stockProductKey === 'cheese').quantity).toBeCloseTo(1500, 4);
    expect(result.prepRequirements).toEqual([expect.objectContaining({ recipeKey: 'dough', quantity: 3750 })]);
    expect(result.uncoveredDishes).toEqual([expect.objectContaining({ dishName: 'Soup', reason: 'no_recipe' })]);
    expect(result.coverage).toMatchObject({ servingsTotal: 20, servingsCovered: 15, servingsCoveredPct: 75 });
    expect(result.sourceHash).toBe('hash-abc');
    expect(result.recipeVersionIds).toEqual(['rv-dough', 'rv-pizza']);
    expect(result.label).toBe('modeled');
  });

  it('rounds the shopping list up to whole packs and is byte-identical across runs', () => {
    const result = build();
    const flourLine = result.shoppingList.find((row) => row.stockProductKey === 'flour');
    expect(flourLine.packs).toBe(1); // 2500 g < one 25 lb (11,340 g) bag
    expect(flourLine.estimatedCostCents).toBe(2000);
    expect(result.shoppingList.find((row) => row.stockProductKey === 'cheese').packs).toBe(1); // 1500 g < 5 lb
    expect(JSON.stringify(build())).toBe(JSON.stringify(result));
  });
});
