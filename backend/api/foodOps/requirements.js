'use strict';

/**
 * Ingredient requirements for a meal-prep production batch.
 *
 * Computed on read from a frozen `MealPrepProductionBatch.operatorSheet` and
 * the active recipe versions. Nothing is written: the result is a pure
 * function of (sheet, recipe versions, vendor pack data) and carries the
 * batch `sourceHash` plus the recipe version ids it used, so two runs over the
 * same inputs are byte-identical and a stale result is detectable.
 *
 * The operator sheet carries servings only. A dish contributes ingredients
 * only if it has an active recipe with a servings basis whose references all
 * resolve; every other dish is listed under `uncoveredDishes` with a reason,
 * and the result reports coverage so the numbers are never read as complete
 * when they are not.
 */

const { LABEL, RecipeCycleError, convertFactor } = require('./recipeCost');
const { BASE_UNIT, toBase, toBaseInDimension } = require('./units');

const CONTRACT_VERSION = 1;
const PACK_EPSILON = 1e-9;

function round6(value) {
  return Math.round(value * 1e6) / 1e6;
}

function num(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Explode `scale` yield-batches of a recipe's active version into raw stock
 * and prep quantities (base units). Throws on anything unresolvable so a dish
 * is either fully exploded or reported uncovered. Throws RecipeCycleError.
 */
function explode(ctx, recipeId, scale, acc, stack = []) {
  if (stack.includes(recipeId)) {
    const label = (id) => ctx.recipes.get(id)?.key || id;
    throw new RecipeCycleError([...stack, recipeId].map(label));
  }
  const recipe = ctx.recipes.get(recipeId);
  const version = recipe?.activeVersion;
  if (!version) throw new RangeError(`recipe ${recipe?.key || recipeId} has no active version`);
  acc.versionIds.add(version.id);

  for (const component of version.components) {
    const usable = 1 - (num(component.wastePct) || 0) / 100;
    const quantity = num(component.quantity) * scale;
    if (component.stockProductId) {
      const product = ctx.stockProducts.get(component.stockProductId);
      if (!product) throw new RangeError(`unknown stock product ${component.stockProductId}`);
      const base = toBaseInDimension(quantity, component.unit, product.dimension, { densityGPerMl: num(product.densityGPerMl) }) / usable;
      acc.raw.set(product.id, (acc.raw.get(product.id) || 0) + base);
    } else {
      const sub = ctx.recipes.get(component.subRecipeId);
      const subVersion = sub?.activeVersion;
      if (!subVersion) throw new RangeError(`recipe ${sub?.key || component.subRecipeId} has no active version`);
      const subYield = toBase(subVersion.yieldQuantity, subVersion.yieldUnit);
      const needed = toBaseInDimension(quantity, component.unit, subYield.dimension, {
        densityGPerMl: num(ctx.stockProducts.get(sub.outputStockProductId)?.densityGPerMl),
      }) / usable;
      acc.prep.set(sub.id, (acc.prep.get(sub.id) || 0) + needed);
      explode(ctx, sub.id, needed / subYield.quantity, acc, [...stack, recipeId]);
    }
  }
}

function newAccumulator() {
  return { raw: new Map(), prep: new Map(), versionIds: new Set() };
}

function mergeInto(target, source) {
  for (const [id, value] of source.raw) target.raw.set(id, (target.raw.get(id) || 0) + value);
  for (const [id, value] of source.prep) target.prep.set(id, (target.prep.get(id) || 0) + value);
  for (const id of source.versionIds) target.versionIds.add(id);
}

/**
 * @param {object} args
 * @param {object} args.batch        { menuCycleId, version, sourceHash }
 * @param {object} args.operatorSheet frozen sheet; uses production.cook[]
 * @param {object} args.ctx          cost context from buildCostContext (recipes + stock products + stock costs)
 * @param {Array}  args.vendorItems  mapped vendor items (pack data) for the shopping list
 */
function computeRequirements({ batch, operatorSheet, ctx, vendorItems = [] }) {
  const cookRows = Array.isArray(operatorSheet?.production?.cook) ? operatorSheet.production.cook : [];

  const recipeByDish = new Map();
  for (const recipe of ctx.recipes.values()) {
    if (recipe.dishEntityId && recipe.activeVersion) recipeByDish.set(recipe.dishEntityId, recipe);
  }
  const anyRecipeByDish = new Map();
  for (const recipe of ctx.recipes.values()) {
    if (recipe.dishEntityId) anyRecipeByDish.set(recipe.dishEntityId, recipe);
  }

  const total = newAccumulator();
  const uncovered = new Map();
  let servingsTotal = 0;
  let servingsCovered = 0;
  const dishes = new Map();

  for (const row of cookRows) {
    const servings = num(row.quantity) || 0;
    servingsTotal += servings;
    const dishKey = row.dishEntityId || `name:${row.dishName}`;
    const dish = dishes.get(dishKey) || { dishEntityId: row.dishEntityId || null, dishName: row.dishName, servings: 0 };
    dish.servings += servings;
    dishes.set(dishKey, dish);
  }

  for (const [dishKey, dish] of dishes) {
    const recipe = dish.dishEntityId ? recipeByDish.get(dish.dishEntityId) : null;
    const fail = (reason, detail) => uncovered.set(dishKey, { ...dish, reason, ...(detail ? { detail } : {}) });
    if (!dish.dishEntityId) { fail('no_dish_entity'); continue; }
    if (!recipe) { fail(anyRecipeByDish.has(dish.dishEntityId) ? 'no_active_recipe' : 'no_recipe'); continue; }
    const basis = num(recipe.activeVersion.servings);
    if (!(basis > 0)) { fail('no_servings_basis', recipe.key); continue; }

    const acc = newAccumulator();
    try {
      explode(ctx, recipe.id, dish.servings / basis, acc);
    } catch (error) {
      fail(error instanceof RecipeCycleError ? 'cycle' : 'unresolvable_recipe', error.message);
      continue;
    }
    mergeInto(total, acc);
    servingsCovered += dish.servings;
  }

  const stockRows = [...total.raw.entries()]
    .map(([id, quantity]) => ({ product: ctx.stockProducts.get(id), quantity }))
    .sort((a, b) => a.product.key.localeCompare(b.product.key));

  const rawRequirements = stockRows.map(({ product, quantity }) => ({
    stockProductKey: product.key,
    name: product.name,
    dimension: product.dimension,
    baseUnit: BASE_UNIT[product.dimension],
    quantity: round6(quantity),
  }));

  const prepRequirements = [...total.prep.entries()]
    .map(([id, baseQuantity]) => {
      const recipe = ctx.recipes.get(id);
      const yieldBase = toBase(recipe.activeVersion.yieldQuantity, recipe.activeVersion.yieldUnit);
      return {
        recipeKey: recipe.key,
        name: recipe.name,
        dimension: yieldBase.dimension,
        baseUnit: BASE_UNIT[yieldBase.dimension],
        quantity: round6(baseQuantity),
        batches: round6(baseQuantity / yieldBase.quantity),
      };
    })
    .sort((a, b) => a.recipeKey.localeCompare(b.recipeKey));

  const vendorById = new Map(vendorItems.map((item) => [item.id, item]));
  const shoppingList = [];
  const unorderable = [];
  for (const { product, quantity } of stockRows) {
    if (product.kind === 'prep') continue;
    const cost = ctx.stockCosts.get(product.id);
    const item = cost ? vendorById.get(cost.vendorItemId) : null;
    const packBase = num(item?.packBaseQuantity);
    if (!item || !(packBase > 0)) {
      unorderable.push({ stockProductKey: product.key, reason: 'no_priced_vendor_item' });
      continue;
    }
    const factor = convertFactor(item.packDimension, product.dimension, num(product.densityGPerMl));
    if (factor === null) {
      unorderable.push({ stockProductKey: product.key, reason: 'pack_dimension_mismatch' });
      continue;
    }
    const packBaseInProduct = packBase * factor;
    const packs = Math.max(1, Math.ceil(quantity / packBaseInProduct - PACK_EPSILON));
    shoppingList.push({
      stockProductKey: product.key,
      name: product.name,
      requiredQuantity: round6(quantity),
      baseUnit: BASE_UNIT[product.dimension],
      vendorItemId: item.id,
      vendorName: item.vendorName,
      description: item.description,
      packText: item.packText || null,
      packs,
      estimatedCostCents: Math.round(packs * cost.packCostCents),
    });
  }

  const uncoveredList = [...uncovered.values()].sort((a, b) => `${a.dishName}`.localeCompare(`${b.dishName}`));
  return {
    contractVersion: CONTRACT_VERSION,
    label: LABEL,
    menuCycleId: batch.menuCycleId,
    batchVersion: batch.version ?? null,
    sourceHash: batch.sourceHash,
    recipeVersionIds: [...total.versionIds].sort(),
    coverage: {
      servingsTotal,
      servingsCovered,
      servingsCoveredPct: servingsTotal > 0 ? Math.round((servingsCovered / servingsTotal) * 10000) / 100 : null,
      dishesTotal: dishes.size,
      dishesCovered: dishes.size - uncovered.size,
    },
    uncoveredDishes: uncoveredList,
    rawRequirements,
    prepRequirements,
    shoppingList,
    unorderable,
  };
}

module.exports = { CONTRACT_VERSION, computeRequirements };
