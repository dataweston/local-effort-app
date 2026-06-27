/**
 * order.placed → graph projector.
 *
 * The Square orders sync (`squareOrdersSync.js`) writes `order.placed` LedgerEvents
 * with line items + customerId, but never projects them into the graph. This module
 * closes that gap: it reads `order.placed` events and writes
 *
 *   Customer -[ORDERED]-> Product|Dish   metadata: { quantity, totalCents, orderId, occurredAt }
 *
 * Resolution rules (deliberately conservative — see founder decision 2026-06-27):
 *   - customerId → existing Customer via squareCustomerId. Never minted.
 *     Orders without a resolvable customer are attributed to a single
 *     "Square Walk-in (unattributed)" placeholder Customer so line-item demand
 *     stays complete and honestly labeled.
 *   - line item → existing Product or Dish by exact/canonical name match.
 *     Square catalog object ids are NOT stored on brain entities today, so
 *     matching is name-based. UNMATCHED LINE ITEMS ARE LOGGED, NEVER MINTED —
 *     the report is the catalog-normalization worklist.
 *
 * Idempotent: an ORDERED assertion is keyed on (srcId, dstId, sourceId=ledgerEventId,
 * metadata.lineItemName). Re-running writes nothing new.
 *
 * Routes:
 *   POST/GET /api/brain/order-projection/run   (admin | cron | BRAIN_ADMIN_KEY)
 *     body/query: daysBack (default all), dryRun (default false)
 */

const crypto = require('crypto');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { getPrisma } = require('../utils/prisma');
const { canonicalName, writeLedgerEvent } = require('./ledger');
const { validateRelationship } = require('./relationshipDictionary');

const verifyAdminRequest = createAdminVerifier();

const PLACEHOLDER_CUSTOMER_NAME = 'Square Walk-in (unattributed)';

// ── entity resolution ─────────────────────────────────────────────────────────

async function resolveCustomer(prisma, customerId, cache) {
  if (customerId && cache.bySquareId.has(customerId)) return cache.bySquareId.get(customerId);
  if (customerId) {
    const c = await prisma.brainEntity.findFirst({
      where: { entityType: 'Customer', tombstonedAt: null, squareCustomerId: customerId },
      select: { id: true, name: true },
    });
    if (c) { cache.bySquareId.set(customerId, c); return c; }
  }
  // fall through to placeholder
  if (cache.placeholder) return cache.placeholder;
  let ph = await prisma.brainEntity.findFirst({
    where: { entityType: 'Customer', tombstonedAt: null, canonicalName: canonicalName(PLACEHOLDER_CUSTOMER_NAME) },
    select: { id: true, name: true },
  });
  if (!ph) {
    ph = await prisma.brainEntity.create({
      data: {
        entityType: 'Customer',
        name: PLACEHOLDER_CUSTOMER_NAME,
        canonicalName: canonicalName(PLACEHOLDER_CUSTOMER_NAME),
        status: 'active',
        properties: { synthetic: true, role: 'order-attribution-placeholder' },
      },
      select: { id: true, name: true },
    });
  }
  cache.placeholder = ph;
  return ph;
}

async function resolveSaleable(prisma, name, cache) {
  const key = canonicalName(name);
  if (!key) return null;
  if (cache.bySaleable.has(key)) return cache.bySaleable.get(key);
  // Prefer Product, then Dish; exact canonicalName match only (no fuzzy minting).
  const match = await prisma.brainEntity.findFirst({
    where: {
      entityType: { in: ['Product', 'Dish'] },
      tombstonedAt: null,
      canonicalName: key,
    },
    orderBy: { entityType: 'asc' }, // Dish < Product alphabetically; we accept either
    select: { id: true, name: true, entityType: true },
  });
  cache.bySaleable.set(key, match || null);
  return match || null;
}

// ── projection ────────────────────────────────────────────────────────────────

async function runOrderGraphProjection({ logger, daysBack = null, dryRun = false } = {}) {
  const prisma = getPrisma();
  const where = { eventType: 'order.placed', source: 'square', tombstonedAt: null };
  if (daysBack) where.occurredAt = { gte: new Date(Date.now() - daysBack * 86_400_000) };

  const orders = await prisma.ledgerEvent.findMany({
    where,
    select: { id: true, occurredAt: true, payload: true },
    orderBy: { occurredAt: 'desc' },
  });

  const cache = { bySquareId: new Map(), bySaleable: new Map(), placeholder: null };
  const stats = {
    ordersSeen: orders.length,
    lineItemsSeen: 0,
    edgesWritten: 0,
    edgesExisting: 0,
    customersResolved: 0,
    customersUnattributed: 0,
    lineItemsMatched: 0,
    lineItemsUnmatched: 0,
    lineItemsUnnamed: 0,
  };
  const unmatched = new Map(); // canonicalName → { name, count, qty, totalCents, sampleOrderIds }

  for (const ev of orders) {
    const pl = ev.payload || {};
    const customerId = pl.customerId || pl.customer_id || null;
    const customer = await resolveCustomer(prisma, customerId, cache);
    if (customer && customer.id !== cache.placeholder?.id) stats.customersResolved++;
    else stats.customersUnattributed++;

    for (const li of pl.lineItems || []) {
      stats.lineItemsSeen++;
      const liName = (li.name || '').trim();
      if (!liName) { stats.lineItemsUnnamed++; continue; }

      const saleable = await resolveSaleable(prisma, liName, cache);
      if (!saleable) {
        stats.lineItemsUnmatched++;
        const k = canonicalName(liName);
        const rec = unmatched.get(k) || { name: liName, count: 0, qty: 0, totalCents: 0, sampleOrderIds: [] };
        rec.count++; rec.qty += Number(li.quantity || 1); rec.totalCents += Number(li.totalCents || 0);
        if (rec.sampleOrderIds.length < 3) rec.sampleOrderIds.push(pl.orderId || ev.id);
        unmatched.set(k, rec);
        continue;
      }
      stats.lineItemsMatched++;

      if (dryRun) { stats.edgesWritten++; continue; }

      // Idempotency: same ledger event + same line item name + same target = same edge.
      const existing = await prisma.brainAssertion.findFirst({
        where: {
          srcId: customer.id, dstId: saleable.id, relType: 'ORDERED',
          sourceId: ev.id, retractedAt: null,
          metadata: { path: ['lineItemName'], equals: liName },
        },
        select: { id: true },
      });
      if (existing) { stats.edgesExisting++; continue; }

      const validation = validateRelationship({
        relType: 'ORDERED', srcType: 'Customer', dstType: saleable.entityType,
        srcId: customer.id, dstId: saleable.id,
      });

      await prisma.brainAssertion.create({
        data: {
          srcId: customer.id,
          dstId: saleable.id,
          relType: 'ORDERED',
          metadata: {
            lineItemName: liName,
            quantity: Number(li.quantity || 1),
            totalCents: Number(li.totalCents || 0),
            orderId: pl.orderId || null,
            attributed: customer.id !== cache.placeholder?.id,
            ...(validation.warnings.length ? { relationshipWarnings: validation.warnings } : {}),
          },
          validFrom: ev.occurredAt,
          knownFrom: new Date(),
          confidence: 1.0,
          sourceType: 'order_projection',
          sourceId: ev.id,
          createdBy: 'order_graph_projector',
          provisional: false,
        },
      });
      stats.edgesWritten++;
    }
  }

  const unmatchedReport = [...unmatched.values()]
    .sort((a, b) => b.qty - a.qty)
    .map(r => ({ ...r, totalDollars: (r.totalCents / 100).toFixed(2) }));

  if (!dryRun) {
    await writeLedgerEvent({
      eventType: 'order.projection.run',
      source: 'order_graph_projector',
      actorType: 'system',
      payload: { ...stats, unmatchedDistinct: unmatchedReport.length, dryRun: false },
    });
  }

  logger?.info({ ...stats, unmatchedDistinct: unmatchedReport.length, dryRun }, 'brain/order-projection: complete');
  return { ...stats, unmatchedReport };
}

// ── routes ──────────────────────────────────────────────────────────────────

function hasBrainAdminHeader(req) {
  const provided = String(req.headers['x-brain-admin-key'] || '');
  const expected = process.env.BRAIN_ADMIN_KEY || '';
  if (!provided || !expected || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

let running = false;
let lastRun = null;

function registerOrderProjectionRoutes(app, { logger } = {}) {
  const runHandler = async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      const isCron = req.headers['x-vercel-cron'] === '1'
        || String(req.headers['user-agent'] || '').startsWith('vercel-cron');
      if (!admin && !isCron && !hasBrainAdminHeader(req)) {
        return res.status(403).json({ error: 'admin only' });
      }
      if (running) return res.status(409).json({ error: 'projection already running', lastRun });

      const daysBack = req.body?.daysBack || req.query?.daysBack
        ? Math.min(Math.max(parseInt(req.body?.daysBack || req.query?.daysBack) || 0, 1), 1825)
        : null;
      const dryRun = String(req.body?.dryRun ?? req.query?.dryRun) === 'true';

      running = true;
      runOrderGraphProjection({ logger, daysBack, dryRun })
        .then((result) => { lastRun = { completedAt: new Date().toISOString(), daysBack, dryRun, ...result }; })
        .catch((err) => logger?.error({ err }, 'brain/order-projection: run error'))
        .finally(() => { running = false; });

      return res.json({ ok: true, status: 'started', daysBack, dryRun });
    } catch (err) {
      logger?.error({ err }, 'brain/order-projection: trigger error');
      return res.status(500).json({ error: 'internal-error' });
    }
  };
  app.post('/api/brain/order-projection/run', runHandler);
  app.get('/api/brain/order-projection/run', runHandler);
}

module.exports = { runOrderGraphProjection, registerOrderProjectionRoutes };
