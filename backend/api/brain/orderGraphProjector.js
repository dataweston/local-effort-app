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
 *   - Multi-signal customer resolution (Track 2). Square stamps order.customerId
 *     on only ~1/9 orders, so we recover identity from the `identitySignals`
 *     block the orders sync now harvests, tried in confidence order:
 *       1. squareCustomerId (order or payment level) → FK anchor. Never minted.
 *       2. buyer / recipient EMAIL → alias match against the Square customer
 *          directory (extract_square_customers stores email as an alias).
 *       3. recipient PHONE → alias match.
 *       4. card FINGERPRINT → a stable synthetic "Square card buyer" cluster so
 *          anonymous repeat purchases group to one node (promotable to a real
 *          Customer once any order in the cluster reveals a name/email).
 *     Email/phone match EXISTING directory entities only — a bare name never
 *     mints a Customer (self-identity guard / founder decision #4).
 *   - Orders with no usable signal are attributed to a single
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
const { withJobRun } = require('./jobRuns');

const verifyAdminRequest = createAdminVerifier();

const PLACEHOLDER_CUSTOMER_NAME = 'Square Walk-in (unattributed)';

// ── entity resolution ─────────────────────────────────────────────────────────

// Find an existing Customer whose alias matches an email or phone. Matches
// EXISTING directory entities only — never mints from contact info.
async function findByAlias(prisma, value, cache) {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return null;
  if (cache.byAlias.has(key)) return cache.byAlias.get(key);
  const hit = await prisma.brainEntityAlias.findFirst({
    where: {
      alias: { equals: key, mode: 'insensitive' },
      entity: { entityType: 'Customer', tombstonedAt: null },
    },
    select: { entity: { select: { id: true, name: true } } },
  });
  const c = hit?.entity || null;
  cache.byAlias.set(key, c);
  return c;
}

// Card-fingerprint cluster: a stable synthetic Customer keyed on the card
// fingerprint via properties.squareCardFingerprint. Groups anonymous repeat
// purchases to one node. find-or-create (the fingerprint IS a stable id, so
// the self-identity name guard doesn't apply — there's no real name to mint).
async function resolveByFingerprint(prisma, fingerprint, cache) {
  const fp = String(fingerprint || '').trim();
  if (!fp) return null;
  if (cache.byFingerprint.has(fp)) return cache.byFingerprint.get(fp);
  let c = await prisma.brainEntity.findFirst({
    where: {
      entityType: 'Customer', tombstonedAt: null,
      properties: { path: ['squareCardFingerprint'], equals: fp },
    },
    select: { id: true, name: true },
  });
  if (!c) {
    const label = `Square card buyer ••${fp.slice(-4)}`;
    c = await prisma.brainEntity.create({
      data: {
        entityType: 'Customer',
        name: label,
        canonicalName: canonicalName(`square-card-${fp}`),
        status: 'active',
        properties: { synthetic: true, role: 'card-fingerprint-cluster', squareCardFingerprint: fp },
      },
      select: { id: true, name: true },
    });
  }
  cache.byFingerprint.set(fp, c);
  return c;
}

async function getPlaceholder(prisma, cache) {
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

// Multi-signal customer resolution (Track 2). `signals` is the identitySignals
// block written by the orders sync. Returns { customer, matchedBy }.
async function resolveCustomer(prisma, payload, cache) {
  const sig = payload.identitySignals || {};
  // back-compat: legacy events predate identitySignals.
  const squareIds = [payload.customerId || payload.customer_id, sig.orderCustomerId, ...(sig.paymentCustomerIds || [])]
    .filter(Boolean);

  // 1. squareCustomerId (FK anchor).
  for (const id of squareIds) {
    if (cache.bySquareId.has(id)) {
      const c = cache.bySquareId.get(id);
      if (c) return { customer: c, matchedBy: 'squareCustomerId' };
      continue;
    }
    const c = await prisma.brainEntity.findFirst({
      where: { entityType: 'Customer', tombstonedAt: null, squareCustomerId: id },
      select: { id: true, name: true },
    });
    cache.bySquareId.set(id, c || null);
    if (c) return { customer: c, matchedBy: 'squareCustomerId' };
  }

  // 2. email (buyer + recipient).
  for (const email of [...(sig.buyerEmails || []), ...(sig.recipientEmails || [])]) {
    const c = await findByAlias(prisma, email, cache);
    if (c) return { customer: c, matchedBy: 'email' };
  }

  // 3. phone.
  for (const phone of sig.recipientPhones || []) {
    const c = await findByAlias(prisma, phone, cache);
    if (c) return { customer: c, matchedBy: 'phone' };
  }

  // 4. card fingerprint cluster.
  for (const fp of sig.cardFingerprints || []) {
    const c = await resolveByFingerprint(prisma, fp, cache);
    if (c) return { customer: c, matchedBy: 'cardFingerprint' };
  }

  // 5. labeled placeholder.
  return { customer: await getPlaceholder(prisma, cache), matchedBy: 'placeholder' };
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

  const cache = { bySquareId: new Map(), byAlias: new Map(), byFingerprint: new Map(), bySaleable: new Map(), placeholder: null };
  const stats = {
    ordersSeen: orders.length,
    lineItemsSeen: 0,
    edgesWritten: 0,
    edgesExisting: 0,
    customersResolved: 0,
    customersUnattributed: 0,
    // attribution breakdown by recovery method (Track 2)
    bySquareCustomerId: 0,
    byEmail: 0,
    byPhone: 0,
    byCardFingerprint: 0,
    lineItemsMatched: 0,
    lineItemsUnmatched: 0,
    lineItemsUnnamed: 0,
  };
  const MATCH_STAT = {
    squareCustomerId: 'bySquareCustomerId', email: 'byEmail', phone: 'byPhone', cardFingerprint: 'byCardFingerprint',
  };
  const unmatched = new Map(); // canonicalName → { name, count, qty, totalCents, sampleOrderIds }

  for (const ev of orders) {
    const pl = ev.payload || {};
    const { customer, matchedBy } = await resolveCustomer(prisma, pl, cache);
    if (matchedBy !== 'placeholder') {
      stats.customersResolved++;
      if (MATCH_STAT[matchedBy]) stats[MATCH_STAT[matchedBy]]++;
    } else {
      stats.customersUnattributed++;
    }

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
            attributed: matchedBy !== 'placeholder',
            attributedBy: matchedBy,
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
      const exec = dryRun
        ? runOrderGraphProjection({ logger, daysBack, dryRun })
        : withJobRun('order-projection', () => runOrderGraphProjection({ logger, daysBack, dryRun }));
      exec
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

  // GET /api/brain/jobs/freshness — per-job last-success + SLA staleness alarm.
  app.get('/api/brain/jobs/freshness', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      const isCron = req.headers['x-vercel-cron'] === '1'
        || String(req.headers['user-agent'] || '').startsWith('vercel-cron');
      if (!admin && !isCron && !hasBrainAdminHeader(req)) {
        return res.status(403).json({ error: 'admin only' });
      }
      const { jobFreshness } = require('./jobRuns');
      const report = await jobFreshness(getPrisma());
      return res.json({ ok: true, ...report });
    } catch (err) {
      logger?.error({ err }, 'brain/jobs-freshness: error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });
}

module.exports = { runOrderGraphProjection, registerOrderProjectionRoutes };
