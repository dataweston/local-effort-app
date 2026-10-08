#!/usr/bin/env node
/**
 * Food Operations Core operator CLI (docs/architecture/food-operations-core-plan.md).
 * Every write command is a DRY RUN until --apply.
 *
 *   node scripts/food-ops.cjs seed-price-book --data file.json [--offline] [--apply]
 *   node scripts/food-ops.cjs apply-mapping  --data map.json [--data map2.json ...] [--apply]
 *   node scripts/food-ops.cjs import-recipes  --data file.json [--offline --price-book file.json] [--apply]
 *   node scripts/food-ops.cjs sync-lb         [--since-days 90] [--apply]
 *   node scripts/food-ops.cjs unmapped        [--limit 50]
 *   node scripts/food-ops.cjs costs           [--recipe key]
 *   node scripts/food-ops.cjs requirements    --cycle <menuCycleId> [--version n]
 *   node scripts/food-ops.cjs scope-summary   [--source receipt_wedge]
 *
 * --offline plans against an empty database without connecting (validation of
 * a data file before the migration exists). For import-recipes it takes stock
 * products from the --price-book file.
 *
 * Data files (JSON):
 *   mapping:    { "stockProducts": [...as price book], "mappings": [{ identityKey, stockKey, packText?, confidence: high|medium, why }],
 *                 "ignore": [{ identityKey, reason }], "review": [{ identityKey, description, question }], "stats": {} }
 *               (apply-mapping never overwrites an owner decision; rows it cannot apply are reported as skipped)
 *   price book: { "stockProducts": [{ key, name, kind?, dimension, densityGPerMl?, aliases? }],
 *                 "vendorItems":   [{ vendor, sku?, description, packText?, stock?, packCostCents?, purchasedAt? }] }
 *   recipes:    { "recipes": [{ key, name, kind?, output?, dishEntityId?, yield: {quantity, unit}, servings?,
 *                               components: [{ stock | recipe, quantity, unit, wastePct? }] }] }
 */
require('dotenv').config();

const fs = require('fs');
const catalog = require('../backend/api/foodOps/catalog');
const recipeCatalog = require('../backend/api/foodOps/recipeCatalog');
const { costAllRecipes, costRecipe } = require('../backend/api/foodOps/recipeCost');
const { computeRequirements } = require('../backend/api/foodOps/requirements');
const localBudget = require('../backend/api/foodOps/localBudgetClient');
const mappingPlan = require('../backend/api/foodOps/mappingPlan');
const receiptScope = require('../backend/api/foodOps/receiptScope');

const args = process.argv.slice(3);
const has = (flag) => args.includes(flag);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const values = (flag) => args.flatMap((arg, index) => (arg === flag && index + 1 < args.length ? [args[index + 1]] : []));

let prismaInstance = null;
function prisma() {
  if (!prismaInstance) {
    const { PrismaClient } = require('@prisma/client');
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

function readJson(flag) {
  const file = value(flag);
  if (!file) throw new Error(`${flag} <file.json> is required`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function print(object) {
  console.log(JSON.stringify(object, null, 2));
}

function finish(planned, summary) {
  print({ mode: has('--apply') ? 'applied' : 'dry-run', ...summary });
  if (summary.plan?.errors?.length || summary.errors?.length) process.exitCode = 2;
  else if (!has('--apply') && planned) console.error('\nDry run. Re-run with --apply to write.');
}

async function seedPriceBook() {
  const data = readJson('--data');
  const existing = has('--offline')
    ? { stockProducts: [], vendorItems: [], observationKeys: new Set() }
    : await catalog.loadExistingState(prisma());
  const plan = catalog.planPriceBook(data, existing);
  const summary = catalog.summarizePlan(plan);
  if (has('--apply') && !plan.errors.length) {
    if (has('--offline')) throw new Error('--offline cannot be combined with --apply');
    await catalog.applyPlan(prisma(), plan);
  }
  finish(catalog.planHasWrites(plan), { plan: summary });
}

async function importRecipes() {
  const data = readJson('--data');
  let existing;
  if (has('--offline')) {
    const book = catalog.priceBookSchema.parse(readJson('--price-book'));
    existing = {
      stockProducts: book.stockProducts.map((row) => ({ id: row.key, key: row.key, dimension: row.dimension, densityGPerMl: row.densityGPerMl ?? null })),
      recipes: [],
    };
  } else {
    existing = await recipeCatalog.loadRecipeState(prisma());
  }
  const plan = recipeCatalog.planRecipeImport(data, existing);
  const summary = recipeCatalog.summarizeRecipePlan(plan);
  if (has('--apply') && !plan.errors.length) {
    if (has('--offline')) throw new Error('--offline cannot be combined with --apply');
    await recipeCatalog.applyRecipePlan(prisma(), plan, { createdBy: 'cli:food-ops' });
  }
  finish(plan.create.length + plan.newVersion.length > 0, { plan: summary });
}

async function syncLb() {
  const sinceDays = Number(value('--since-days') || 90);
  const { lines, skipped, truncated } = await localBudget.fetchPurchasedLines({ sinceDays });
  const plan = catalog.planVendorLines(lines, await catalog.loadExistingState(prisma()));
  const summary = catalog.summarizePlan(plan);
  if (has('--apply')) await catalog.applyPlan(prisma(), plan);
  finish(catalog.planHasWrites(plan), { linesRead: lines.length, linesSkipped: skipped, truncated, plan: summary });
}

async function applyMapping() {
  const files = values('--data');
  if (!files.length) throw new Error('--data <mapping.json> is required (repeatable)');
  const plan = mappingPlan.planMappings(
    files.map((file) => JSON.parse(fs.readFileSync(file, 'utf8'))),
    await mappingPlan.loadMappingState(prisma()),
    { names: files },
  );
  const summary = mappingPlan.summarizeMappingPlan(plan);
  const apply = has('--apply') && !plan.errors.length;
  const result = apply ? await mappingPlan.applyMappingPlan(prisma(), plan) : undefined;
  finish(plan.stockProducts.create.length + plan.mappings.create.length + plan.ignore.create.length > 0, { plan: summary, ...(result ? { result } : {}) });
}

async function unmapped() {
  const limit = Number(value('--limit') || 50);
  const rows = await prisma().vendorItem.findMany({
    where: { status: 'unmapped' },
    orderBy: [{ vendorKey: 'asc' }, { normalizedDescription: 'asc' }],
    take: limit,
  });
  print({ count: rows.length, vendorItems: rows.map((row) => ({ id: row.id, vendor: row.vendorName, description: row.description, packText: row.packText, lastPackCostCents: row.lastPackCostCents })) });
}

async function costs() {
  const ctx = await catalog.loadCostContext(prisma());
  const key = value('--recipe');
  if (key) {
    const recipe = [...ctx.recipes.values()].find((row) => row.key === key);
    if (!recipe) throw new Error(`recipe "${key}" not found`);
    return print({ cost: costRecipe(ctx, recipe.id), stockCostIssues: ctx.issues });
  }
  return print({ costs: costAllRecipes(ctx), stockCostIssues: ctx.issues });
}

async function requirements() {
  const cycle = value('--cycle');
  if (!cycle) throw new Error('--cycle <menuCycleId> is required');
  const version = value('--version') ? Number(value('--version')) : null;
  const batch = await prisma().mealPrepProductionBatch.findFirst({
    where: { menuCycleId: cycle, ...(version ? { version } : {}) },
    orderBy: { version: 'desc' },
  });
  if (!batch) throw new Error('production batch not found');
  const ctx = await catalog.loadCostContext(prisma());
  print({ requirements: computeRequirements({ batch, operatorSheet: batch.operatorSheet, ctx, vendorItems: ctx.vendorItems }) });
}

// Read-only: lines and $ by source x effective scope (observation decision, else item default, else unassigned).
async function scopeSummary() {
  const rows = await receiptScope.scopeSummary(prisma(), { source: value('--source') });
  print({
    rows: rows.map((row) => ({ ...row, dollars: Number((row.cents / 100).toFixed(2)) })),
    note: 'scope never affects price evidence; unassigned = no observation decision and no item default',
  });
}

const COMMANDS = {
  'seed-price-book': seedPriceBook,
  'import-recipes': importRecipes,
  'sync-lb': syncLb,
  'apply-mapping': applyMapping,
  unmapped,
  costs,
  requirements,
  'scope-summary': scopeSummary,
};

(async () => {
  const handler = COMMANDS[process.argv[2]];
  if (!handler) {
    const usage = fs.readFileSync(__filename, 'utf8').split('*/')[0].split('\n').slice(2);
    console.log(usage.map((line) => line.replace(/^ \* ?/, '')).join('\n'));
    process.exitCode = 1;
    return;
  }
  try {
    await handler();
  } catch (error) {
    console.error(error.details ? JSON.stringify(error.details, null, 2) : '', error.message);
    process.exitCode = 1;
  } finally {
    if (prismaInstance) await prismaInstance.$disconnect();
  }
})();
