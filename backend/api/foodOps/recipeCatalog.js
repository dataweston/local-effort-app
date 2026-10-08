'use strict';

/**
 * Recipe import with immutable versions.
 *
 * A recipe version is content-addressed: the same content imports as a no-op,
 * changed content becomes a new version that replaces the active one. Active
 * versions are never edited (the database trigger enforces this too). Planning
 * is pure; `applyRecipePlan` writes in one transaction.
 */

const crypto = require('crypto');
const { z } = require('zod');
const { assertNoCycle, RecipeCycleError } = require('./recipeCost');
const { normalizeUnit, toBase, toBaseInDimension } = require('./units');

const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const keySchema = z.string().trim().toLowerCase().regex(KEY_PATTERN, 'lowercase letters, digits, - and _ only');

const componentInput = z.object({
  stock: keySchema.optional(),
  recipe: keySchema.optional(),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1),
  wastePct: z.number().min(0).lt(100).default(0),
  note: z.string().trim().optional(),
}).strict().refine((row) => Boolean(row.stock) !== Boolean(row.recipe), {
  message: 'exactly one of "stock" or "recipe" is required',
});

const recipeInput = z.object({
  key: keySchema,
  name: z.string().trim().min(1),
  kind: z.enum(['prep', 'menu', 'retail']).default('prep'),
  output: keySchema.optional(),
  dishEntityId: z.string().trim().min(1).optional(),
  yield: z.object({ quantity: z.number().positive(), unit: z.string().trim().min(1) }).strict(),
  servings: z.number().int().positive().optional(),
  notes: z.string().trim().optional(),
  components: z.array(componentInput).min(1),
}).strict();

const recipeImportSchema = z.object({ recipes: z.array(recipeInput).min(1) }).strict();

function canonicalContent(recipe) {
  return {
    yield: { quantity: recipe.yield.quantity, unit: normalizeUnit(recipe.yield.unit) },
    servings: recipe.servings ?? null,
    components: recipe.components.map((component) => ({
      ref: component.stock ? `stock:${component.stock}` : `recipe:${component.recipe}`,
      quantity: component.quantity,
      unit: normalizeUnit(component.unit),
      wastePct: component.wastePct ?? 0,
    })),
  };
}

function hashContent(recipe) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalContent(recipe))).digest('hex');
}

/**
 * existing = {
 *   stockProducts: [{ id, key, dimension, densityGPerMl }],
 *   recipes: [{ id, key, outputStockProductId, versions: [{ id, version, status, contentHash, yieldQuantity, yieldUnit,
 *               components: [{ stockProductId, subRecipeId }] }] }]
 * }
 */
function planRecipeImport(rawInput, existing) {
  const input = recipeImportSchema.parse(rawInput);
  const plan = { create: [], newVersion: [], unchanged: [], errors: [] };

  const stockByKey = new Map(existing.stockProducts.map((row) => [row.key, row]));
  const stockKeyById = new Map(existing.stockProducts.map((row) => [row.id, row.key]));
  const recipeKeyById = new Map(existing.recipes.map((row) => [row.id, row.key]));
  const existingByKey = new Map(existing.recipes.map((row) => [row.key, row]));
  const inputByKey = new Map();
  for (const recipe of input.recipes) {
    if (inputByKey.has(recipe.key)) plan.errors.push({ type: 'duplicate_recipe_key', key: recipe.key });
    inputByKey.set(recipe.key, recipe);
  }

  const yieldOf = (key) => {
    const fromInput = inputByKey.get(key);
    if (fromInput) return { yieldUnit: fromInput.yield.unit, output: fromInput.output };
    const current = existingByKey.get(key);
    const active = current?.versions.find((v) => v.status === 'active');
    if (!active) return null;
    return { yieldUnit: active.yieldUnit, output: current.outputStockProductId ? stockKeyById.get(current.outputStockProductId) : undefined };
  };

  for (const recipe of input.recipes) {
    const problems = [];
    const yieldUnit = normalizeUnit(recipe.yield.unit);
    if (!yieldUnit) problems.push({ type: 'unknown_unit', where: 'yield', unit: recipe.yield.unit });
    if (recipe.output && !stockByKey.has(recipe.output)) problems.push({ type: 'unknown_stock_product', where: 'output', key: recipe.output });

    recipe.components.forEach((component, index) => {
      const where = `components[${index}]`;
      const unit = normalizeUnit(component.unit);
      if (!unit) {
        problems.push({ type: 'unknown_unit', where, unit: component.unit });
        return;
      }
      if (component.stock) {
        const product = stockByKey.get(component.stock);
        if (!product) {
          problems.push({ type: 'unknown_stock_product', where, key: component.stock });
          return;
        }
        try {
          toBaseInDimension(1, unit, product.dimension, { densityGPerMl: Number(product.densityGPerMl) });
        } catch (error) {
          problems.push({ type: 'unit_mismatch', where, key: component.stock, detail: error.message });
        }
      } else {
        if (component.recipe === recipe.key) {
          problems.push({ type: 'self_reference', where });
          return;
        }
        const target = yieldOf(component.recipe);
        if (!target) {
          problems.push({ type: 'unknown_recipe', where, key: component.recipe });
          return;
        }
        const targetUnit = normalizeUnit(target.yieldUnit);
        const targetDimension = targetUnit ? toBase(1, targetUnit).dimension : null;
        const output = target.output ? stockByKey.get(target.output) : null;
        try {
          toBaseInDimension(1, unit, targetDimension, { densityGPerMl: Number(output?.densityGPerMl) });
        } catch (error) {
          problems.push({ type: 'unit_mismatch', where, key: component.recipe, detail: error.message });
        }
      }
    });
    if (problems.length) plan.errors.push({ type: 'invalid_recipe', key: recipe.key, problems });
  }
  if (plan.errors.length) return plan;

  // Cycle check over the graph as it WOULD be after import.
  const subRecipesAfter = (key) => {
    const fromInput = inputByKey.get(key);
    if (fromInput) return fromInput.components.filter((c) => c.recipe).map((c) => c.recipe);
    const active = existingByKey.get(key)?.versions.find((v) => v.status === 'active');
    return (active?.components || []).filter((c) => c.subRecipeId).map((c) => recipeKeyById.get(c.subRecipeId));
  };
  for (const recipe of input.recipes) {
    try {
      assertNoCycle({
        recipeId: recipe.key,
        subRecipeIds: recipe.components.filter((c) => c.recipe).map((c) => c.recipe),
        componentsOf: subRecipesAfter,
      });
    } catch (error) {
      if (!(error instanceof RecipeCycleError)) throw error;
      plan.errors.push({ type: 'cycle', key: recipe.key, path: error.path });
    }
  }
  if (plan.errors.length) return plan;

  for (const recipe of input.recipes) {
    const contentHash = hashContent(recipe);
    const current = existingByKey.get(recipe.key);
    const entry = { recipe, contentHash };
    if (!current) {
      plan.create.push({ ...entry, version: 1 });
      continue;
    }
    const active = current.versions.find((v) => v.status === 'active');
    if (active && active.contentHash === contentHash) {
      plan.unchanged.push(recipe.key);
      continue;
    }
    const nextVersion = Math.max(0, ...current.versions.map((v) => v.version)) + 1;
    plan.newVersion.push({ ...entry, version: nextVersion, retires: active ? active.version : null });
  }
  return plan;
}

function summarizeRecipePlan(plan) {
  return {
    created: plan.create.map((row) => ({ key: row.recipe.key, version: row.version })),
    newVersions: plan.newVersion.map((row) => ({ key: row.recipe.key, version: row.version, retires: row.retires })),
    unchanged: plan.unchanged,
    errors: plan.errors,
  };
}

async function loadRecipeState(prisma) {
  const [stockProducts, recipes] = await Promise.all([
    prisma.stockProduct.findMany(),
    prisma.recipe.findMany({ include: { versions: { include: { components: true } } } }),
  ]);
  return { stockProducts, recipes };
}

async function applyRecipePlan(prisma, plan, { createdBy = null } = {}) {
  if (plan.errors.length) {
    const error = new Error(`Plan has ${plan.errors.length} error(s); nothing was written`);
    error.statusCode = 422;
    error.details = plan.errors;
    throw error;
  }
  return prisma.$transaction(async (tx) => {
    const products = await tx.stockProduct.findMany({ select: { id: true, key: true } });
    const productId = new Map(products.map((row) => [row.key, row.id]));

    // Recipe rows first so sub-recipe references resolve in any order.
    for (const { recipe } of plan.create) {
      await tx.recipe.create({
        data: {
          key: recipe.key,
          name: recipe.name,
          kind: recipe.kind,
          dishEntityId: recipe.dishEntityId ?? null,
          outputStockProductId: recipe.output ? productId.get(recipe.output) : null,
        },
      });
    }
    for (const { recipe } of plan.newVersion) {
      await tx.recipe.update({
        where: { key: recipe.key },
        data: {
          name: recipe.name,
          kind: recipe.kind,
          dishEntityId: recipe.dishEntityId ?? null,
          outputStockProductId: recipe.output ? productId.get(recipe.output) : null,
        },
      });
    }
    const recipes = await tx.recipe.findMany({ select: { id: true, key: true } });
    const recipeId = new Map(recipes.map((row) => [row.key, row.id]));

    // Retire every replaced active version before any activation (one active per recipe).
    for (const { recipe, retires } of plan.newVersion) {
      if (retires !== null) {
        await tx.recipeVersion.updateMany({ where: { recipeId: recipeId.get(recipe.key), version: retires, status: 'active' }, data: { status: 'retired' } });
      }
    }
    for (const { recipe, contentHash, version } of [...plan.create, ...plan.newVersion]) {
      const created = await tx.recipeVersion.create({
        data: {
          recipeId: recipeId.get(recipe.key),
          version,
          status: 'draft',
          yieldQuantity: recipe.yield.quantity,
          yieldUnit: normalizeUnit(recipe.yield.unit),
          servings: recipe.servings ?? null,
          contentHash,
          notes: recipe.notes ?? null,
          createdBy,
        },
      });
      for (const [index, component] of recipe.components.entries()) {
        await tx.recipeComponent.create({
          data: {
            recipeVersionId: created.id,
            lineNo: index + 1,
            stockProductId: component.stock ? productId.get(component.stock) : null,
            subRecipeId: component.recipe ? recipeId.get(component.recipe) : null,
            quantity: component.quantity,
            unit: normalizeUnit(component.unit),
            wastePct: component.wastePct ?? 0,
            note: component.note ?? null,
          },
        });
      }
      await tx.recipeVersion.update({ where: { id: created.id }, data: { status: 'active', activatedAt: new Date() } });
    }
    return summarizeRecipePlan(plan);
  });
}

module.exports = {
  applyRecipePlan,
  hashContent,
  loadRecipeState,
  planRecipeImport,
  recipeImportSchema,
  summarizeRecipePlan,
};
