const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');
const catalog = require('../foodOps/catalog');
const recipeCatalog = require('../foodOps/recipeCatalog');
const { costAllRecipes, costRecipe } = require('../foodOps/recipeCost');
const { computeRequirements } = require('../foodOps/requirements');
const localBudget = require('../foodOps/localBudgetClient');
const receiptScope = require('../foodOps/receiptScope');
const usage = require('../foodOps/usage');
const { createOwnerReviewService } = require('../ownerReview');

// Every write route previews by default and writes only with `apply: true`.
const applyFlag = z.object({ apply: z.boolean().default(false) });
const priceBookBody = applyFlag.extend({ data: z.unknown() });
const recipeImportBody = applyFlag.extend({ data: z.unknown() });
const syncBody = applyFlag.extend({ sinceDays: z.number().int().min(1).max(1825).default(90) });

function createFoodOpsRouter({
  logger = null,
  prismaClient = prisma,
  verifyAdminRequest = createAdminVerifier(),
  localBudgetClient = localBudget,
  ownerReviewService = null,
} = {}) {
  const router = express.Router();
  const reviewService = ownerReviewService || createOwnerReviewService({ prismaClient });

  const guarded = (handler) => async (req, res) => {
    const admin = await verifyAdminRequest(req);
    if (!admin) return res.status(401).json({ error: 'food-ops-admin-unauthorized' });
    if (!prismaClient) return res.status(503).json({ error: 'database unavailable' });
    try {
      return await handler(req, res, admin);
    } catch (error) {
      logger?.error?.({ err: error, path: req.path }, 'food ops route failed');
      if (error?.name === 'ZodError') {
        return res.status(400).json({ error: 'food-ops-request-invalid', details: error.issues });
      }
      const status = error?.statusCode || 500;
      return res.status(status).json({ error: error?.message || 'internal-error', ...(error?.details ? { details: error.details } : {}) });
    }
  };

  router.get('/stock-products', guarded(async (_req, res) => {
    const stockProducts = await prismaClient.stockProduct.findMany({ orderBy: { key: 'asc' } });
    res.json({ stockProducts });
  }));

  // Seed stock products and vendor items (with optional price evidence).
  router.post('/price-book', guarded(async (req, res) => {
    const { apply, data } = priceBookBody.parse(req.body || {});
    catalog.priceBookSchema.parse(data);
    const existing = await catalog.loadExistingState(prismaClient);
    const plan = catalog.planPriceBook(data, existing);
    if (!apply || plan.errors.length) {
      return res.status(plan.errors.length ? 422 : 200).json({ applied: false, plan: catalog.summarizePlan(plan) });
    }
    const summary = await catalog.applyPlan(prismaClient, plan);
    return res.json({ applied: true, plan: summary });
  }));

  router.get('/vendor-items', guarded(async (req, res) => {
    const status = z.enum(['unmapped', 'mapped', 'ignored']).optional().parse(req.query.status);
    const vendorItems = await prismaClient.vendorItem.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ vendorKey: 'asc' }, { normalizedDescription: 'asc' }],
      include: { stockProduct: { select: { key: true, name: true } } },
    });
    res.json({ vendorItems });
  }));

  router.post('/vendor-items/:id/map', guarded(async (req, res) => {
    const vendorItem = await catalog.mapVendorItem(prismaClient, req.params.id, req.body || {});
    res.json({ vendorItem });
  }));

  router.post('/vendor-items/:id/ignore', guarded(async (req, res) => {
    const vendorItem = await catalog.ignoreVendorItem(prismaClient, req.params.id);
    res.json({ vendorItem });
  }));

  // Pull purchased lines from Local Budget into the unmapped queue.
  router.post('/vendor-items/sync-local-budget', guarded(async (req, res) => {
    const { apply, sinceDays } = syncBody.parse(req.body || {});
    const { lines, skipped, truncated } = await localBudgetClient.fetchPurchasedLines({ sinceDays });
    const existing = await catalog.loadExistingState(prismaClient);
    const plan = catalog.planVendorLines(lines, existing);
    const summary = apply ? await catalog.applyPlan(prismaClient, plan) : catalog.summarizePlan(plan);
    res.json({ applied: apply, linesRead: lines.length, linesSkipped: skipped, truncated, plan: summary });
  }));

  // Personal vs business scope (docs/architecture/food-operations-core-plan.md, 4c).
  // Scope never changes prices; it only drives spend and usage reporting.
  router.get('/receipts', guarded(async (req, res) => {
    res.json(await receiptScope.listReceipts(prismaClient, req.query));
  }));

  router.post('/receipts/scope', guarded(async (req, res) => {
    const result = await receiptScope.applyReceiptScope(prismaClient, req.body || {}, { ownerReviewService: reviewService });
    const receipt = await receiptScope.getReceipt(prismaClient, result.source, result.receiptKey);
    res.json({ result, receipt });
  }));

  // Stores current suggestions on still-unassigned lines only; never touches a decided line.
  router.post('/receipts/accept-suggestions', guarded(async (req, res) => {
    const result = await receiptScope.acceptSuggestions(prismaClient, req.body || {});
    const { source, receiptKey } = req.body || {};
    const receipt = receiptKey ? await receiptScope.getReceipt(prismaClient, source, receiptKey) : undefined;
    res.json({ result, ...(receipt ? { receipt } : {}) });
  }));

  router.post('/vendor-items/:id/default-scope', guarded(async (req, res) => {
    const vendorItem = await receiptScope.setDefaultScope(prismaClient, req.params.id, req.body || {});
    res.json({ vendorItem });
  }));

  router.post('/recipes/import', guarded(async (req, res, admin) => {
    const { apply, data } = recipeImportBody.parse(req.body || {});
    recipeCatalog.recipeImportSchema.parse(data);
    const existing = await recipeCatalog.loadRecipeState(prismaClient);
    const plan = recipeCatalog.planRecipeImport(data, existing);
    if (!apply || plan.errors.length) {
      return res.status(plan.errors.length ? 422 : 200).json({ applied: false, plan: recipeCatalog.summarizeRecipePlan(plan) });
    }
    const summary = await recipeCatalog.applyRecipePlan(prismaClient, plan, { createdBy: admin?.email || null });
    return res.json({ applied: true, plan: summary });
  }));

  router.get('/recipes/costs', guarded(async (req, res) => {
    const ctx = await catalog.loadCostContext(prismaClient);
    const key = typeof req.query.recipe === 'string' ? req.query.recipe : null;
    if (key) {
      const recipe = [...ctx.recipes.values()].find((row) => row.key === key);
      if (!recipe) return res.status(404).json({ error: 'recipe not found' });
      return res.json({ cost: costRecipe(ctx, recipe.id), stockCostIssues: ctx.issues });
    }
    return res.json({ costs: costAllRecipes(ctx), stockCostIssues: ctx.issues });
  }));

  // Ingredient requirements for a frozen production batch. Computed on read; writes nothing.
  router.get('/production/:menuCycleId/requirements', guarded(async (req, res) => {
    const version = req.query.version === undefined ? null : z.coerce.number().int().positive().parse(req.query.version);
    const batch = await prismaClient.mealPrepProductionBatch.findFirst({
      where: { menuCycleId: req.params.menuCycleId, ...(version ? { version } : {}) },
      orderBy: { version: 'desc' },
    });
    if (!batch) return res.status(404).json({ error: 'production batch not found' });
    const ctx = await catalog.loadCostContext(prismaClient);
    const requirements = computeRequirements({
      batch,
      operatorSheet: batch.operatorSheet,
      ctx,
      vendorItems: ctx.vendorItems,
    });
    return res.json({ requirements });
  }));

  // Recipe-free usage and cost analytics from purchase history. Read-only; see foodOps/usage.js.
  router.get('/usage/:report', guarded(async (req, res) => {
    const report = z.enum(usage.KINDS).parse(req.params.report);
    res.json(await usage.runUsage(prismaClient, report, req.query, { localBudgetClient }));
  }));

  return router;
}

module.exports = { createFoodOpsRouter };
