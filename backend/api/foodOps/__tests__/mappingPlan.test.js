import { describe, expect, it } from 'vitest';
import mappingPlanModule from '../mappingPlan';

const { applyMappingPlan, planMappings, summarizeMappingPlan } = mappingPlanModule;

const FLOUR = { id: 'sp-flour', key: 'flour', dimension: 'mass', densityGPerMl: null };
const MILK = { id: 'sp-milk', key: 'milk', dimension: 'volume', densityGPerMl: '1.03' };
const EGGS = { id: 'sp-eggs', key: 'eggs', dimension: 'count', densityGPerMl: null };

const item = (identityKey, extra = {}) => ({
  id: `vi-${identityKey}`,
  identityKey,
  status: 'unmapped',
  packBaseQuantity: null,
  packDimension: null,
  packText: null,
  stockProductId: null,
  ...extra,
});

const stateOf = (vendorItems, stockProducts = [FLOUR, MILK, EGGS]) => ({ stockProducts, vendorItems });
const mapping = (identityKey, stockKey, extra = {}) => ({ identityKey, stockKey, confidence: 'high', why: 'test', ...extra });
const skippedReason = (plan, identityKey) => plan.skipped.find((row) => row.identityKey === identityKey)?.reason;

describe('planMappings: pack validation (same rules as mapVendorItem)', () => {
  it('takes the pack from packText, else from the existing item pack', () => {
    const state = stateOf([
      item('a|flour'),
      item('b|flour', { packBaseQuantity: '2267.96185', packDimension: 'mass', packText: '5 lb' }),
    ]);
    const plan = planMappings([{ mappings: [mapping('a|flour', 'flour', { packText: '50 lb' }), mapping('b|flour', 'flour')] }], state);

    expect(plan.errors).toEqual([]);
    expect(plan.mappings.create).toEqual([
      { identityKey: 'a|flour', stockKey: 'flour', packText: '50 lb', pack: { baseQuantity: 50 * 453.59237, dimension: 'mass', text: '50 lb' } },
      { identityKey: 'b|flour', stockKey: 'flour', pack: { baseQuantity: 2267.96185, dimension: 'mass', text: '5 lb' } },
    ]);
  });

  it('skips (not errors) rows with no pack, an unreadable pack, or an unconvertible dimension', () => {
    const state = stateOf([item('nopack'), item('badpack'), item('count-vs-mass'), item('mass-vs-volume-no-density'), item('good')]);
    const plan = planMappings([{
      mappings: [
        mapping('nopack', 'flour'),
        mapping('badpack', 'flour', { packText: 'a big bag' }),
        mapping('count-vs-mass', 'eggs', { packText: '5 lb' }),
        mapping('mass-vs-volume-no-density', 'flour', { packText: '1 gal' }),
        mapping('good', 'flour', { packText: '50 lb' }),
      ],
    }], state);

    expect(plan.errors).toEqual([]);
    expect(plan.mappings.create.map((row) => row.identityKey)).toEqual(['good']);
    expect(skippedReason(plan, 'nopack')).toMatch(/pack size is required/);
    expect(skippedReason(plan, 'badpack')).toMatch(/could not read a pack size/);
    expect(skippedReason(plan, 'count-vs-mass')).toMatch(/measured in mass but the product is count/);
    expect(skippedReason(plan, 'mass-vs-volume-no-density')).toMatch(/measured in volume but the product is mass/);
  });

  it('converts mass <-> volume only when the product has a density; count never converts', () => {
    const state = stateOf([item('milk-by-weight'), item('eggs-by-volume')]);
    const plan = planMappings([{
      mappings: [mapping('milk-by-weight', 'milk', { packText: '10 lb' }), mapping('eggs-by-volume', 'eggs', { packText: '1 gal' })],
    }], state);

    expect(plan.mappings.create.map((row) => row.identityKey)).toEqual(['milk-by-weight']);
    expect(skippedReason(plan, 'eggs-by-volume')).toMatch(/measured in volume but the product is count/);
  });

  it('validates against a stock product that this plan creates (including its density)', () => {
    const files = [{
      stockProducts: [{ key: 'honey', name: 'Honey', dimension: 'volume', densityGPerMl: 1.42 }, { key: 'salt', name: 'Salt', dimension: 'mass' }],
      mappings: [mapping('h|honey', 'honey', { packText: '5 lb' }), mapping('h|salt', 'salt', { packText: '1 gal' })],
    }];
    const plan = planMappings(files, stateOf([item('h|honey'), item('h|salt')]));

    expect(plan.stockProducts.create.map((row) => row.key)).toEqual(['honey', 'salt']);
    expect(plan.mappings.create.map((row) => row.identityKey)).toEqual(['h|honey']);
    expect(skippedReason(plan, 'h|salt')).toMatch(/measured in volume/);
  });
});

describe('planMappings: skips', () => {
  it('skips confidence other than high/medium, unknown items, and unknown stock products', () => {
    const plan = planMappings([{
      mappings: [
        mapping('low', 'flour', { packText: '5 lb', confidence: 'low' }),
        mapping('medium', 'flour', { packText: '5 lb', confidence: 'Medium' }),
        mapping('ghost', 'flour', { packText: '5 lb' }),
        mapping('nostock', 'tofu', { packText: '5 lb' }),
      ],
      ignore: [{ identityKey: 'ghost-ignore', reason: 'x' }],
    }], stateOf([item('low'), item('medium'), item('nostock')]));

    expect(plan.mappings.create.map((row) => row.identityKey)).toEqual(['medium']);
    expect(skippedReason(plan, 'low')).toMatch(/confidence "low"/);
    expect(skippedReason(plan, 'ghost')).toBe('unknown vendor item');
    expect(skippedReason(plan, 'ghost-ignore')).toBe('unknown vendor item');
    expect(skippedReason(plan, 'nostock')).toMatch(/unknown stock product "tofu"/);
    expect(plan.errors).toEqual([]);
  });
});

describe('planMappings: owner decisions are never overwritten', () => {
  const mappedFlour = (id, extra = {}) => item(id, {
    status: 'mapped', stockProductId: FLOUR.id, packBaseQuantity: '22679.6185', packDimension: 'mass', packText: '50 lb', ...extra,
  });

  it('skips an item already mapped to a different stock product, and an ignored item the file maps', () => {
    const state = stateOf([mappedFlour('owner-mapped'), item('owner-ignored', { status: 'ignored' })]);
    const plan = planMappings([{
      mappings: [mapping('owner-mapped', 'eggs', { packText: '12 ct' }), mapping('owner-ignored', 'flour', { packText: '5 lb' })],
      ignore: [],
    }], state);

    expect(plan.mappings.create).toEqual([]);
    expect(skippedReason(plan, 'owner-mapped')).toBe('already mapped to flour');
    expect(skippedReason(plan, 'owner-ignored')).toBe('already ignored');
  });

  it('skips an ignore row for an item the owner already mapped', () => {
    const plan = planMappings([{ ignore: [{ identityKey: 'm', reason: 'junk' }] }], stateOf([mappedFlour('m')]));
    expect(plan.ignore.create).toEqual([]);
    expect(skippedReason(plan, 'm')).toBe('already mapped to flour');
  });

  it('treats same stock + same pack as unchanged, but a different pack as an owner decision', () => {
    const state = stateOf([mappedFlour('same'), mappedFlour('other-pack')]);
    const plan = planMappings([{
      mappings: [mapping('same', 'flour', { packText: '50 lb' }), mapping('other-pack', 'flour', { packText: '25 lb' })],
    }], state);

    expect(plan.mappings.unchanged).toBe(1);
    expect(plan.mappings.create).toEqual([]);
    expect(skippedReason(plan, 'other-pack')).toMatch(/^already mapped to flour with a different pack/);
  });
});

describe('planMappings: conflicts are plan errors', () => {
  it('errors when an item is in both mappings and ignore, even across files', () => {
    const plan = planMappings(
      [{ mappings: [mapping('x', 'flour', { packText: '5 lb' })] }, { ignore: [{ identityKey: 'x', reason: 'junk' }] }],
      stateOf([item('x')]),
      { names: ['a.json', 'b.json'] },
    );
    expect(plan.errors).toHaveLength(1);
    expect(plan.errors[0]).toMatch(/"x" is mapped to "flour" in a\.json but ignored in b\.json/);
    expect(plan.mappings.create).toEqual([]);
    expect(plan.ignore.create).toEqual([]);
  });

  it('errors when two files map one item to different stock products', () => {
    const plan = planMappings(
      [{ mappings: [mapping('x', 'flour', { packText: '5 lb' })] }, { mappings: [mapping('x', 'eggs', { packText: '5 lb' })] }],
      stateOf([item('x')]),
    );
    expect(plan.errors.join('\n')).toMatch(/"x" is mapped to "flour" in file 1 and "eggs" in file 2/);
  });

  it('merges stock products across files (first wins) and errors on a conflicting definition naming both files', () => {
    const honey = (dimension, extra = {}) => ({ key: 'honey', name: 'Honey', dimension, ...extra });
    const merged = planMappings([{ stockProducts: [honey('mass')] }, { stockProducts: [honey('mass')] }], stateOf([]), { names: ['a', 'b'] });
    expect(merged.errors).toEqual([]);
    expect(merged.stockProducts.create).toHaveLength(1);

    const conflict = planMappings([{ stockProducts: [honey('mass')] }, { stockProducts: [honey('volume')] }], stateOf([]), { names: ['a.json', 'b.json'] });
    expect(conflict.errors).toHaveLength(1);
    expect(conflict.errors[0]).toMatch(/"honey".*a\.json.*dimension=mass.*b\.json.*dimension=volume/);

    const density = planMappings([{ stockProducts: [honey('volume', { densityGPerMl: 1.4 })] }, { stockProducts: [honey('volume', { densityGPerMl: 1.2 })] }], stateOf([]));
    expect(density.errors).toHaveLength(1);

    const kind = planMappings([{ stockProducts: [honey('mass', { kind: 'prep' })] }, { stockProducts: [honey('mass')] }], stateOf([]));
    expect(kind.errors).toHaveLength(1);
  });

  it('errors when an existing stock product has a different dimension or density; identical counts as existing', () => {
    const same = planMappings([{ stockProducts: [{ key: 'milk', name: 'Milk', dimension: 'volume', densityGPerMl: 1.03 }, { key: 'flour', name: 'Flour', dimension: 'mass' }] }], stateOf([]));
    expect(same.errors).toEqual([]);
    expect(same.stockProducts).toEqual({ create: [], existing: 2 });

    const dimension = planMappings([{ stockProducts: [{ key: 'flour', name: 'Flour', dimension: 'volume' }] }], stateOf([]), { names: ['f.json'] });
    expect(dimension.errors).toHaveLength(1);
    expect(dimension.errors[0]).toMatch(/"flour" in f\.json differs from the database/);

    const density = planMappings([{ stockProducts: [{ key: 'milk', name: 'Milk', dimension: 'volume', densityGPerMl: 1.1 }] }], stateOf([]));
    expect(density.errors).toHaveLength(1);
    const lostDensity = planMappings([{ stockProducts: [{ key: 'milk', name: 'Milk', dimension: 'volume' }] }], stateOf([]));
    expect(lostDensity.errors).toHaveLength(1);
  });

  it('reports a malformed file as a plan error instead of throwing', () => {
    const plan = planMappings([{ mappings: [{ identityKey: 'x' }] }, { stockProducts: [{ key: 'Bad Key!', name: 'x', dimension: 'mass' }] }], stateOf([]), { names: ['bad.json', 'key.json'] });
    expect(plan.errors).toHaveLength(2);
    expect(plan.errors[0]).toMatch(/^bad\.json: invalid mapping file/);
  });
});

describe('planMappings: determinism and idempotence', () => {
  const files = () => [{
    stockProducts: [{ key: 'zucchini', name: 'Zucchini', dimension: 'mass' }, { key: 'apple', name: 'Apple', dimension: 'mass' }],
    mappings: [
      mapping('c', 'zucchini', { packText: '10 lb' }),
      mapping('a', 'apple', { packText: '40 lb' }),
      mapping('b', 'apple', { packText: '40 lb' }),
      mapping('bad', 'apple', { packText: 'nope' }),
    ],
    ignore: [{ identityKey: 'z', reason: 'bags' }, { identityKey: 'y', reason: 'bags' }],
    review: [{ identityKey: 'r1', description: 'd', question: 'q' }, { identityKey: 'r1', description: 'd', question: 'q' }, { identityKey: 'r2' }],
  }];
  const vendorItems = ['a', 'b', 'bad', 'c', 'y', 'z', 'r1', 'r2'].map((key) => item(key));

  it('orders output by key regardless of input order and counts distinct review items', () => {
    const plan = planMappings(files(), stateOf(vendorItems, []));
    const reversed = files();
    reversed[0].mappings.reverse();
    reversed[0].ignore.reverse();
    reversed[0].stockProducts.reverse();

    expect(planMappings(reversed, stateOf(vendorItems, []))).toEqual(plan);
    expect(plan.stockProducts.create.map((row) => row.key)).toEqual(['apple', 'zucchini']);
    expect(plan.mappings.create.map((row) => row.identityKey)).toEqual(['a', 'b', 'c']);
    expect(plan.ignore.create).toEqual(['y', 'z']);
    expect(plan.review).toBe(2);
  });

  it('a second plan over the applied state is all unchanged', () => {
    const first = planMappings(files(), stateOf(vendorItems, []));
    const productIds = new Map(first.stockProducts.create.map((row) => [row.key, `id-${row.key}`]));
    const applied = vendorItems.map((row) => {
      const mapped = first.mappings.create.find((m) => m.identityKey === row.identityKey);
      if (mapped) {
        return { ...row, status: 'mapped', stockProductId: productIds.get(mapped.stockKey), packBaseQuantity: String(mapped.pack.baseQuantity), packDimension: mapped.pack.dimension, packText: mapped.pack.text };
      }
      return first.ignore.create.includes(row.identityKey) ? { ...row, status: 'ignored' } : row;
    });
    const state = stateOf(applied, first.stockProducts.create.map((row) => ({ id: productIds.get(row.key), ...row, densityGPerMl: row.densityGPerMl ?? null })));

    const second = planMappings(files(), state);
    expect(second.errors).toEqual([]);
    expect(second.stockProducts).toEqual({ create: [], existing: 2 });
    expect(second.mappings).toEqual({ create: [], unchanged: 3 });
    expect(second.ignore).toEqual({ create: [], unchanged: 2 });
    expect(second.skipped.map((row) => row.identityKey)).toEqual(['bad']);
  });
});

describe('summarizeMappingPlan', () => {
  it('groups skipped rows by reason with at most five examples', () => {
    const rows = Array.from({ length: 8 }, (_, i) => item(`k${i}`));
    const plan = planMappings([{ mappings: rows.map((row) => mapping(row.identityKey, 'flour')) }], stateOf(rows));
    const summary = summarizeMappingPlan(plan);

    expect(summary.skipped.total).toBe(8);
    expect(summary.skipped.byReason).toHaveLength(1);
    expect(summary.skipped.byReason[0]).toMatchObject({ count: 8, examples: ['k0', 'k1', 'k2', 'k3', 'k4'] });
  });
});

// Records every call so the test can assert what was written and how.
function fakePrisma({ failOnUpdateCount } = {}) {
  const calls = [];
  const productsByKey = new Map([[FLOUR.key, FLOUR.id], [EGGS.key, EGGS.id]]);
  let transactionOptions = null;
  const tx = {
    stockProduct: {
      createMany: async ({ data }) => {
        calls.push(['stockProduct.createMany', data]);
        for (const row of data) productsByKey.set(row.key, `id-${row.key}`);
      },
      findMany: async () => [...productsByKey].map(([key, id]) => ({ id, key })),
    },
    vendorItem: {
      updateMany: async ({ where, data }) => {
        calls.push(['vendorItem.updateMany', where, data]);
        return { count: failOnUpdateCount ?? where.identityKey.in.length };
      },
    },
  };
  return {
    calls,
    get transactionOptions() { return transactionOptions; },
    $transaction: async (fn, options) => {
      transactionOptions = options;
      return fn(tx);
    },
  };
}

describe('applyMappingPlan', () => {
  const plan = () => planMappings([{
    stockProducts: [{ key: 'honey', name: 'Honey', dimension: 'mass' }],
    mappings: [
      mapping('a', 'honey', { packText: '5 lb' }),
      mapping('b', 'honey', { packText: '5 lb' }),
      mapping('c', 'honey', { packText: '10 lb' }),
      mapping('d', 'flour'),
      mapping('e', 'flour'),
    ],
    ignore: [{ identityKey: 'g', reason: 'bag' }],
  }], stateOf([
    item('a'), item('b'), item('c'), item('g'),
    item('d', { packBaseQuantity: '2267.96185', packDimension: 'mass', packText: '5 lb' }),
    item('e', { packBaseQuantity: '2267.96185', packDimension: 'mass', packText: '5 lb' }),
  ]));

  it('writes in one bounded transaction, grouping items by stock product and pack', async () => {
    const prisma = fakePrisma();
    const result = await applyMappingPlan(prisma, plan());

    expect(prisma.transactionOptions).toEqual({ timeout: 120000, maxWait: 20000 });
    expect(prisma.calls.map((call) => call[0])).toEqual([
      'stockProduct.createMany', 'vendorItem.updateMany', 'vendorItem.updateMany', 'vendorItem.updateMany', 'vendorItem.updateMany',
    ]);
    const updates = prisma.calls.slice(1).map(([, where, data]) => ({ ids: where.identityKey.in, data }));
    const honey5 = updates.find((u) => u.ids.includes('a'));
    expect(honey5).toEqual({
      ids: ['a', 'b'],
      data: { status: 'mapped', stockProductId: 'id-honey', packBaseQuantity: 5 * 453.59237, packDimension: 'mass', packText: '5 lb' },
    });
    expect(updates.find((u) => u.ids.includes('c')).data.packText).toBe('10 lb');
    // existing packs are kept: only status + product are written
    expect(updates.find((u) => u.ids.includes('d'))).toEqual({ ids: ['d', 'e'], data: { status: 'mapped', stockProductId: 'sp-flour' } });
    expect(updates.find((u) => u.ids.includes('g'))).toEqual({ ids: ['g'], data: { status: 'ignored', stockProductId: null } });
    expect(result).toEqual({ stockProductsCreated: 1, mapped: 5, ignored: 1, updateStatements: 4 });
  });

  it('only touches items that are still unmapped', async () => {
    const prisma = fakePrisma();
    await applyMappingPlan(prisma, plan());
    for (const [, where] of prisma.calls.filter((call) => call[0] === 'vendorItem.updateMany')) {
      expect(where.status).toBe('unmapped');
    }
  });

  it('refuses a plan with errors (422) without opening a transaction', async () => {
    const prisma = fakePrisma();
    const bad = planMappings([{ stockProducts: [{ key: 'flour', name: 'Flour', dimension: 'volume' }] }], stateOf([]));
    await expect(applyMappingPlan(prisma, bad)).rejects.toMatchObject({ statusCode: 422 });
    expect(prisma.calls).toEqual([]);
    expect(prisma.transactionOptions).toBeNull();
  });

  it('aborts (rolling back via the transaction) when the catalog changed under the plan', async () => {
    const prisma = fakePrisma({ failOnUpdateCount: 1 });
    await expect(applyMappingPlan(prisma, plan())).rejects.toMatchObject({ statusCode: 409 });
  });
});
