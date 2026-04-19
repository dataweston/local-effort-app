/**
 * Ingredient / Recipe / Batch routes.
 *
 * POST /api/brain/ingredients              — create ingredient
 * GET  /api/brain/ingredients              — list ingredients
 * POST /api/brain/ingredients/:id/pricing  — set vendor pricing
 *
 * POST /api/brain/recipes                  — create recipe with lines
 * GET  /api/brain/recipes                  — list recipes
 * GET  /api/brain/recipes/:id              — get recipe with cost breakdown
 *
 * POST /api/brain/batches                  — record a batch
 * GET  /api/brain/batches                  — list recent batches
 *
 * GET  /api/brain/margin                   — margin summary across all dishes with recipes
 * GET  /api/brain/margin/:dishEntityId     — margin for one dish
 */

const { createAdminVerifier } = require('../utils/adminVerifier');
const { getPrisma } = require('../utils/prisma');
const {
  createIngredient, setPricing,
  createRecipe, recordBatch,
  computeRecipeCost, computeDishMargin,
} = require('./ontologyHelpers');

const verifyAdminRequest = createAdminVerifier();

function registerOntologyRoutes(app, { logger } = {}) {
  const prisma = getPrisma();

  // ── Ingredients ─────────────────────────────────────────────────────────────

  app.post('/api/brain/ingredients', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { name, unit, defaultVendorId } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name required' });

      const result = await createIngredient({ name, unit, defaultVendorId });
      return res.status(result.created ? 201 : 200).json({ ok: true, ...result });
    } catch (err) {
      logger?.error({ err }, 'brain: ingredient create error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.get('/api/brain/ingredients', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { q, limit = '100' } = req.query;
      const ingredients = await prisma.brainEntity.findMany({
        where: {
          entityType: 'Ingredient',
          tombstonedAt: null,
          status: 'active',
          ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
        },
        orderBy: { name: 'asc' },
        take: Math.min(parseInt(limit) || 100, 500),
        include: {
          srcAssertions: {
            where: { relType: 'PRICED_AT', retractedAt: null, knownUntil: null },
            include: { dst: { select: { name: true } } },
          },
        },
      });
      return res.json({ ok: true, ingredients, count: ingredients.length });
    } catch (err) {
      logger?.error({ err }, 'brain: ingredient list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.post('/api/brain/ingredients/:id/pricing', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { vendorId, pricePerUnit, unit, effectiveDate } = req.body || {};
      if (!vendorId || pricePerUnit == null) return res.status(400).json({ error: 'vendorId and pricePerUnit required' });

      const assertion = await setPricing({
        ingredientId: req.params.id,
        vendorId,
        pricePerUnit: Number(pricePerUnit),
        unit: unit || 'unit',
        effectiveDate: effectiveDate || null,
      });
      return res.json({ ok: true, assertionId: assertion.id });
    } catch (err) {
      logger?.error({ err }, 'brain: ingredient pricing error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // ── Recipes ─────────────────────────────────────────────────────────────────

  app.post('/api/brain/recipes', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { name, dishEntityId, yieldPortions, lines, notes } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name required' });
      if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'lines (ingredient array) required' });

      const result = await createRecipe({ name, dishEntityId, yieldPortions: Number(yieldPortions) || 1, lines, notes });
      return res.status(201).json({ ok: true, ...result });
    } catch (err) {
      logger?.error({ err }, 'brain: recipe create error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.get('/api/brain/recipes', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { dishEntityId, limit = '50' } = req.query;
      const recipes = await prisma.brainEntity.findMany({
        where: {
          entityType: 'Recipe',
          tombstonedAt: null,
          ...(dishEntityId ? {
            srcAssertions: { some: { relType: 'VERSION_OF', dstId: dishEntityId, knownUntil: null } },
          } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit) || 50, 200),
        select: { id: true, name: true, status: true, properties: true, createdAt: true },
      });
      return res.json({ ok: true, recipes, count: recipes.length });
    } catch (err) {
      logger?.error({ err }, 'brain: recipe list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.get('/api/brain/recipes/:id', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const recipe = await prisma.brainEntity.findUnique({
        where: { id: req.params.id },
        include: {
          srcAssertions: {
            where: { relType: { in: ['CONTAINS', 'VERSION_OF'] }, retractedAt: null, knownUntil: null },
            include: { dst: { select: { id: true, name: true, entityType: true, properties: true } } },
          },
        },
      });
      if (!recipe || recipe.entityType !== 'Recipe') return res.status(404).json({ error: 'not found' });

      const cost = await computeRecipeCost(req.params.id);
      return res.json({ ok: true, recipe, cost });
    } catch (err) {
      logger?.error({ err }, 'brain: recipe get error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // ── Batches ──────────────────────────────────────────────────────────────────

  app.post('/api/brain/batches', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { recipeId, madeAt, portionsMade, actualCostCents, notes } = req.body || {};
      if (!recipeId || !portionsMade || actualCostCents == null) {
        return res.status(400).json({ error: 'recipeId, portionsMade, and actualCostCents required' });
      }

      const batch = await recordBatch({
        recipeId,
        madeAt: madeAt || null,
        portionsMade: Number(portionsMade),
        actualCostCents: Number(actualCostCents),
        notes,
      });
      return res.status(201).json({ ok: true, batch });
    } catch (err) {
      logger?.error({ err }, 'brain: batch record error');
      return res.status(500).json({ error: err.message || 'internal-error' });
    }
  });

  app.get('/api/brain/batches', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { recipeId, limit = '30' } = req.query;
      const where = { entityType: 'Batch', tombstonedAt: null };
      if (recipeId) where.properties = { path: ['recipeId'], equals: recipeId };

      const batches = await prisma.brainEntity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit) || 30, 100),
      });
      return res.json({ ok: true, batches, count: batches.length });
    } catch (err) {
      logger?.error({ err }, 'brain: batch list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // ── Margin ───────────────────────────────────────────────────────────────────

  app.get('/api/brain/margin', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      // Find all Dish entities that have at least one Recipe linked
      const dishAssertions = await prisma.brainAssertion.findMany({
        where: { relType: 'VERSION_OF', retractedAt: null, knownUntil: null },
        select: { dstId: true },
        distinct: ['dstId'],
      });

      const results = await Promise.all(
        dishAssertions.map(a => computeDishMargin(a.dstId).catch(err => ({ dishEntityId: a.dstId, error: err.message })))
      );

      const sorted = results.sort((a, b) => (a.marginPct ?? 999) - (b.marginPct ?? 999));
      const flagCounts = { low: 0, ok: 0, good: 0, unknown: 0 };
      for (const r of sorted) flagCounts[r.marginFlag || 'unknown'] = (flagCounts[r.marginFlag || 'unknown'] || 0) + 1;

      return res.json({ ok: true, dishes: sorted, flagCounts, count: sorted.length });
    } catch (err) {
      logger?.error({ err }, 'brain: margin summary error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.get('/api/brain/margin/:dishEntityId', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const result = await computeDishMargin(req.params.dishEntityId);
      return res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error({ err }, 'brain: margin dish error');
      return res.status(500).json({ error: err.message || 'internal-error' });
    }
  });
}

module.exports = { registerOntologyRoutes };
