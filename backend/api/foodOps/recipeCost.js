'use strict';

/**
 * Modeled recipe costing (method `last-paid-v1`).
 *
 * Pure functions over in-memory data so the arithmetic is testable without a
 * database. A cost here is: latest observed pack cost / pack base quantity,
 * multiplied through the recipe graph. It is a MODELED estimate of ingredient
 * cost. It is not margin, not inventory valuation, and not an accounting
 * figure. A recipe with any uncostable component is `incomplete` and reports
 * no total; a missing price is never treated as zero.
 *
 * Costs are fractional cents. Nothing is rounded until presentation.
 */

const { BASE_UNIT, costPerBaseUnit, toBase, toBaseInDimension } = require('./units');

const METHOD = 'last-paid-v1';
const LABEL = 'modeled';

class RecipeCycleError extends Error {
  constructor(path) {
    super(`Recipe cycle: ${path.join(' -> ')}`);
    this.name = 'RecipeCycleError';
    this.path = path;
    this.statusCode = 422;
  }
}

function num(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundCents(value) {
  if (value === null || value === undefined) return null;
  return Math.round(value * 10000) / 10000;
}

function toTime(value) {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

/**
 * Latest cost per base unit for each stock product, from mapped vendor items.
 * The pack conversion is the vendor item's CURRENT one, applied to the newest
 * observation, so fixing a pack size repairs history. Among several vendors
 * the most recently observed price wins (ties break on vendor item id).
 *
 * Returns { costs: Map<stockProductId, {...}>, issues: [] }.
 */
function deriveStockCosts({ stockProducts, vendorItems }) {
  const products = new Map(stockProducts.map((product) => [product.id, product]));
  const costs = new Map();
  const issues = [];

  for (const item of vendorItems) {
    if (item.status !== 'mapped' || !item.stockProductId) continue;
    const product = products.get(item.stockProductId);
    if (!product) {
      issues.push({ type: 'unknown_stock_product', vendorItemId: item.id, stockProductId: item.stockProductId });
      continue;
    }
    const packBase = num(item.packBaseQuantity);
    if (!(packBase > 0) || !item.packDimension) {
      issues.push({ type: 'missing_pack_size', vendorItemId: item.id, stockProductKey: product.key });
      continue;
    }

    const observations = (item.observations || [])
      .map((row) => ({ observedAt: row.observedAt, packCostCents: num(row.packCostCents) }))
      .filter((row) => row.packCostCents !== null);
    if (observations.length === 0 && num(item.lastPackCostCents) !== null) {
      observations.push({ observedAt: item.lastPurchasedAt, packCostCents: num(item.lastPackCostCents) });
    }
    if (observations.length === 0) {
      issues.push({ type: 'no_price', vendorItemId: item.id, stockProductKey: product.key });
      continue;
    }
    const latest = observations.reduce((best, row) => (toTime(row.observedAt) >= toTime(best.observedAt) ? row : best));

    let perBase = costPerBaseUnit(latest.packCostCents, packBase);
    if (item.packDimension !== product.dimension) {
      // Pack is measured in a different dimension than the product (e.g. a
      // 5 gal jug of an item tracked by weight): convert through density.
      const density = num(product.densityGPerMl);
      const factor = convertFactor(item.packDimension, product.dimension, density);
      if (factor === null) {
        issues.push({
          type: 'pack_dimension_mismatch',
          vendorItemId: item.id,
          stockProductKey: product.key,
          packDimension: item.packDimension,
          productDimension: product.dimension,
        });
        continue;
      }
      perBase = latest.packCostCents / (packBase * factor);
    }

    const candidate = {
      costPerBaseCents: perBase,
      vendorItemId: item.id,
      observedAt: latest.observedAt || null,
      packCostCents: latest.packCostCents,
    };
    const current = costs.get(product.id);
    const newer = !current
      || toTime(candidate.observedAt) > toTime(current.observedAt)
      || (toTime(candidate.observedAt) === toTime(current.observedAt) && candidate.vendorItemId < current.vendorItemId);
    if (newer) costs.set(product.id, candidate);
  }
  return { costs, issues };
}

// Base quantity of `to` per one base quantity of `from` (mass<->volume only).
function convertFactor(from, to, densityGPerMl) {
  if (from === to) return 1;
  if (!(densityGPerMl > 0)) return null;
  if (from === 'volume' && to === 'mass') return densityGPerMl;
  if (from === 'mass' && to === 'volume') return 1 / densityGPerMl;
  return null;
}

/**
 * Build a costing context.
 *   stockProducts: [{ id, key, name, dimension, densityGPerMl }]
 *   vendorItems:   [{ id, status, stockProductId, packBaseQuantity, packDimension,
 *                     lastPackCostCents, lastPurchasedAt, observations: [{observedAt, packCostCents}] }]
 *   recipes:       [{ id, key, name, outputStockProductId,
 *                     activeVersion: { id, version, yieldQuantity, yieldUnit, servings,
 *                                      components: [{ lineNo, stockProductId, subRecipeId, quantity, unit, wastePct }] } | null }]
 */
function buildCostContext({ stockProducts, vendorItems = [], recipes }) {
  const { costs, issues } = deriveStockCosts({ stockProducts, vendorItems });
  return {
    stockProducts: new Map(stockProducts.map((product) => [product.id, product])),
    recipes: new Map(recipes.map((recipe) => [recipe.id, recipe])),
    stockCosts: costs,
    issues,
    memo: new Map(),
  };
}

function yieldInfo(version, outputProduct) {
  const base = toBase(version.yieldQuantity, version.yieldUnit);
  const baseQuantity = base.quantity;
  if (!(baseQuantity > 0)) throw new RangeError('yieldQuantity must be positive');
  return { baseQuantity, dimension: base.dimension, baseUnit: BASE_UNIT[base.dimension], outputProduct };
}

/**
 * Cost the active version of a recipe, recursing into sub-recipes. Memoized
 * per context. Throws RecipeCycleError on a cycle.
 */
function costRecipe(ctx, recipeId, stack = []) {
  if (stack.includes(recipeId)) {
    const label = (id) => ctx.recipes.get(id)?.key || id;
    throw new RecipeCycleError([...stack, recipeId].map(label));
  }
  if (ctx.memo.has(recipeId)) return ctx.memo.get(recipeId);

  const recipe = ctx.recipes.get(recipeId);
  if (!recipe) throw new RangeError(`Unknown recipe ${recipeId}`);
  const base = { recipeId: recipe.id, recipeKey: recipe.key, name: recipe.name, method: METHOD, label: LABEL };

  const version = recipe.activeVersion;
  if (!version) {
    const result = {
      ...base,
      versionId: null,
      version: null,
      status: 'incomplete',
      yield: null,
      servings: null,
      totalCostCents: null,
      knownCostCents: 0,
      costPerYieldBaseCents: null,
      costPerServingCents: null,
      lines: [],
      missing: [{ type: 'no_active_version', recipeKey: recipe.key }],
    };
    ctx.memo.set(recipeId, result);
    return result;
  }

  const outputProduct = recipe.outputStockProductId ? ctx.stockProducts.get(recipe.outputStockProductId) : null;
  const yieldDetail = yieldInfo(version, outputProduct);
  const lines = [];
  const missing = [];
  let known = 0;
  const nextStack = [...stack, recipeId];

  for (const component of [...version.components].sort((a, b) => a.lineNo - b.lineNo)) {
    const wastePct = num(component.wastePct) || 0;
    const usable = 1 - wastePct / 100;
    const rawQuantity = num(component.quantity);
    const line = { lineNo: component.lineNo, kind: null, ref: null, name: null, quantity: rawQuantity, unit: component.unit, wastePct, costCents: null };

    if (component.stockProductId) {
      const product = ctx.stockProducts.get(component.stockProductId);
      line.kind = 'stock';
      line.ref = product?.key || component.stockProductId;
      line.name = product?.name || null;
      if (!product) {
        missing.push({ type: 'unknown_stock_product', lineNo: component.lineNo, ref: component.stockProductId });
        lines.push(line);
        continue;
      }
      let baseQuantity;
      try {
        baseQuantity = toBaseInDimension(rawQuantity, component.unit, product.dimension, { densityGPerMl: num(product.densityGPerMl) });
      } catch (error) {
        missing.push({ type: 'unit_mismatch', lineNo: component.lineNo, ref: product.key, detail: error.message });
        lines.push(line);
        continue;
      }
      const cost = ctx.stockCosts.get(product.id);
      if (!cost) {
        missing.push({ type: 'no_cost', lineNo: component.lineNo, ref: product.key });
        lines.push(line);
        continue;
      }
      line.costCents = (baseQuantity / usable) * cost.costPerBaseCents;
      line.costSource = { vendorItemId: cost.vendorItemId, observedAt: cost.observedAt };
    } else {
      const sub = ctx.recipes.get(component.subRecipeId);
      line.kind = 'recipe';
      line.ref = sub?.key || component.subRecipeId;
      line.name = sub?.name || null;
      if (!sub) {
        missing.push({ type: 'unknown_recipe', lineNo: component.lineNo, ref: component.subRecipeId });
        lines.push(line);
        continue;
      }
      const subCost = costRecipe(ctx, sub.id, nextStack);
      if (subCost.status !== 'complete') {
        for (const item of subCost.missing) missing.push({ ...item, via: sub.key, lineNo: component.lineNo });
        lines.push(line);
        continue;
      }
      let baseQuantity;
      try {
        baseQuantity = toBaseInDimension(rawQuantity, component.unit, subCost.yield.dimension, {
          densityGPerMl: num(ctx.stockProducts.get(sub.outputStockProductId)?.densityGPerMl),
        });
      } catch (error) {
        missing.push({ type: 'unit_mismatch', lineNo: component.lineNo, ref: sub.key, detail: error.message });
        lines.push(line);
        continue;
      }
      line.costCents = (baseQuantity / usable) * subCost.costPerYieldBaseCents;
    }
    known += line.costCents;
    lines.push(line);
  }

  const complete = missing.length === 0;
  const servings = num(version.servings);
  const result = {
    ...base,
    versionId: version.id,
    version: version.version,
    status: complete ? 'complete' : 'incomplete',
    yield: { quantity: num(version.yieldQuantity), unit: version.yieldUnit, baseQuantity: yieldDetail.baseQuantity, dimension: yieldDetail.dimension, baseUnit: yieldDetail.baseUnit },
    servings,
    totalCostCents: complete ? known : null,
    knownCostCents: known,
    costPerYieldBaseCents: complete ? known / yieldDetail.baseQuantity : null,
    costPerServingCents: complete && servings > 0 ? known / servings : null,
    lines,
    missing,
  };
  ctx.memo.set(recipeId, result);
  return result;
}

/** Cost every recipe that has an active version; cycles are reported, not thrown. */
function costAllRecipes(ctx) {
  const results = [];
  for (const recipe of [...ctx.recipes.values()].sort((a, b) => a.key.localeCompare(b.key))) {
    if (!recipe.activeVersion) continue;
    try {
      results.push(costRecipe(ctx, recipe.id));
    } catch (error) {
      if (!(error instanceof RecipeCycleError)) throw error;
      results.push({ recipeId: recipe.id, recipeKey: recipe.key, name: recipe.name, method: METHOD, label: LABEL, status: 'error', error: error.message, cyclePath: error.path, totalCostCents: null, missing: [] });
    }
  }
  return results;
}

/**
 * Would giving `recipeId` these components create a cycle? `componentsOf(id)`
 * returns the sub-recipe ids of a recipe's active version. Used before a new
 * version is activated. Throws RecipeCycleError.
 */
function assertNoCycle({ recipeId, subRecipeIds, componentsOf, labelOf = (id) => id }) {
  const visiting = [recipeId];
  const seen = new Set();
  const walk = (ids) => {
    for (const id of ids) {
      if (id === recipeId) throw new RecipeCycleError([...visiting, id].map(labelOf));
      if (seen.has(id)) continue;
      seen.add(id);
      visiting.push(id);
      walk(componentsOf(id));
      visiting.pop();
    }
  };
  walk(subRecipeIds);
}

module.exports = {
  LABEL,
  METHOD,
  RecipeCycleError,
  assertNoCycle,
  buildCostContext,
  costAllRecipes,
  costRecipe,
  deriveStockCosts,
  convertFactor,
  roundCents,
};
