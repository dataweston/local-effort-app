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
 *       5. CSV-import customerName → match an existing Customer by name/alias.
 *          The `extraction.square_csv` stream (same Square txns, joined by
 *          txnId==orderId) carries the buyer name the order.placed line often
 *          lacks. Match-only, never mints.
 *     Email/phone/name match EXISTING directory entities only — a bare name never
 *     mints a Customer (self-identity guard / founder decision #4).
 *   - Orders with no usable signal are attributed to a single
 *     "Square Walk-in (unattributed)" placeholder Customer so line-item demand
 *     stays complete and honestly labeled.
 *   - line item → existing Product or Dish by exact/canonical name match.
 *     Square catalog object ids are NOT stored on brain entities today, so
 *     matching is name-based. UNMATCHED named line items ARE LOGGED, NEVER MINTED —
 *     the report is the catalog-normalization worklist. BUT unnamed/uncatalogued
 *     line items ("Custom Amount", null) that the CSV import confirms are a real
 *     sale (carries a dollar `amount`) are attributed to the synthetic
 *     "Uncatalogued Square sale" Dish using the CSV amount — recovering revenue
 *     that was previously dropped (the systemic undercount fixed 2026-06-30).
 *     No double-count: we never project the csv events separately, only join them.
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

// Backfill recovered contact info onto a resolved Customer. The buyer email /
// payment-level customerId often arrive in identitySignals AFTER the entity was
// created (e.g. a card-fingerprint cluster that later receives an email-receipt
// order). Without this, that email stays in the ledger and never reaches the
// entity, so the customer looks "anonymous" to any email-based segmentation.
// Writes the email as an alias and sets the squareCustomerId FK when missing.
// Idempotent: skips aliases that already exist; never overwrites a set FK.
async function enrichResolvedCustomer(prisma, customer, sig, cache) {
  if (!customer?.id || !sig) return { aliasesAdded: 0, fkSet: false };
  let aliasesAdded = 0, fkSet = false;
  const emails = [...new Set([...(sig.buyerEmails || []), ...(sig.recipientEmails || [])].map(e => String(e || '').trim().toLowerCase()).filter(Boolean))];
  for (const email of emails) {
    const exists = await prisma.brainEntityAlias.findFirst({ where: { entityId: customer.id, alias: { equals: email, mode: 'insensitive' } }, select: { id: true } });
    if (exists) continue;
    try {
      await prisma.brainEntityAlias.create({ data: { entityId: customer.id, alias: email, source: 'square_buyer_email' } });
      aliasesAdded++;
      cache.byAlias.set(email, { id: customer.id, name: customer.name });
    } catch { /* unique race — alias already present */ }
  }
  // Adopt a real payment-level squareCustomerId when the entity lacks one.
  const sqId = (sig.paymentCustomerIds || [])[0] || sig.orderCustomerId || null;
  if (sqId) {
    const ent = await prisma.brainEntity.findUnique({ where: { id: customer.id }, select: { squareCustomerId: true } });
    if (ent && !ent.squareCustomerId) {
      await prisma.brainEntity.update({ where: { id: customer.id }, data: { squareCustomerId: sqId } }).catch(() => {});
      cache.bySquareId.set(sqId, { id: customer.id, name: customer.name });
      fkSet = true;
    }
  }
  return { aliasesAdded, fkSet };
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

  // 5. CSV-import customer name (extraction.square_csv carries customerName the
  //    order.placed event lacks). Match to an existing Customer only — never mint.
  if (payload._csvCustomerName) {
    const c = await resolveCustomerByName(prisma, payload._csvCustomerName, cache);
    if (c) return { customer: c, matchedBy: 'csvName' };
  }

  // 6. labeled placeholder.
  return { customer: await getPlaceholder(prisma, cache), matchedBy: 'placeholder' };
}

// Match a free-text customer name to an EXISTING Customer (alias then canonicalName).
// Never mints — same founder rule as everywhere else. Bare emails are routed
// through the alias path too. Used to recover the buyer from the CSV-import
// stream (`extraction.square_csv` carries `customerName`, which the matching
// `order.placed` event usually lacks).
async function resolveCustomerByName(prisma, name, cache) {
  const raw = String(name || '').trim();
  if (!raw || raw.length < 2) return null;
  const key = `name:${raw.toLowerCase()}`;
  if (cache.byAlias.has(key)) return cache.byAlias.get(key);
  // alias match first
  let c = await findByAlias(prisma, raw, cache);
  if (!c) {
    const norm = canonicalName(raw);
    if (norm) {
      c = await prisma.brainEntity.findFirst({
        where: { entityType: 'Customer', tombstonedAt: null, OR: [{ canonicalName: norm }, { name: { equals: raw, mode: 'insensitive' } }] },
        select: { id: true, name: true },
      });
    }
  }
  cache.byAlias.set(key, c || null);
  return c || null;
}

// Generic target for real sales whose Square line item has no catalog name
// ("Custom Amount" / null line items). We attribute the dollar amount to the
// customer against this single labeled Dish rather than dropping the sale or
// minting a per-string Product. find-or-create (stable synthetic).
const UNCATALOGUED_SALE_NAME = 'Uncatalogued Square sale';
async function getUncataloguedTarget(prisma, cache) {
  if (cache.uncatalogued) return cache.uncatalogued;
  let d = await prisma.brainEntity.findFirst({
    where: { entityType: 'Dish', tombstonedAt: null, canonicalName: canonicalName(UNCATALOGUED_SALE_NAME) },
    select: { id: true, name: true, entityType: true },
  });
  if (!d) {
    d = await prisma.brainEntity.create({
      data: {
        entityType: 'Dish', name: UNCATALOGUED_SALE_NAME, canonicalName: canonicalName(UNCATALOGUED_SALE_NAME),
        status: 'active', properties: { synthetic: true, role: 'uncatalogued-sale-target' },
      },
      select: { id: true, name: true, entityType: true },
    });
  }
  cache.uncatalogued = d;
  return d;
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

  // CSV-import enrichment index. `extraction.square_csv` events are the SAME Square
  // transactions (txnId == order.placed orderId) but carry `customerName` + a real
  // `amount`, which the order.placed line items often lack (name=null "Custom
  // Amount" sales). We DON'T project the csv events separately (that would double-
  // count); instead we join by txnId to (a) recover the buyer and (b) still emit an
  // ORDERED edge for a real sale whose line item is unnamed/uncatalogued, attributed
  // to the "Uncatalogued Square sale" Dish. See order-projector-csv-catalog-gap-brief.
  // (extraction.square_catalog is the menu/price catalog, NOT sales — left untouched.)
  const csvEvents = await prisma.ledgerEvent.findMany({
    where: { eventType: 'extraction.square_csv', tombstonedAt: null },
    select: { payload: true },
  });
  const csvByTxn = new Map();
  for (const c of csvEvents) {
    const txn = c.payload?.txnId;
    if (txn && !csvByTxn.has(txn)) csvByTxn.set(txn, c.payload);
  }

  // Customers whose revenue was set by a MANUAL substantiation (e.g.
  // hm_substantiation, built from the customer's COMPLETE Square payment list).
  // Those edges are keyed by squarePaymentId, not the order.placed event, so the
  // normal idempotency check can't see them — re-projecting that customer's
  // order.placed events would double-count hand-corrected revenue. Skip them.
  const substantiatedCustomerIds = new Set();
  const subEdges = await prisma.brainAssertion.findMany({
    where: { relType: 'ORDERED', retractedAt: null, sourceType: { not: 'order_projection' } },
    select: { srcId: true },
  });
  for (const e of subEdges) substantiatedCustomerIds.add(e.srcId);

  const cache = { bySquareId: new Map(), byAlias: new Map(), byFingerprint: new Map(), bySaleable: new Map(), placeholder: null, uncatalogued: null };
  const stats = {
    ordersSeen: orders.length,
    lineItemsSeen: 0,
    edgesWritten: 0,
    edgesExisting: 0,
    customersResolved: 0,
    customersUnattributed: 0,
    // attribution breakdown by recovery method (Track 2 + csv recovery)
    bySquareCustomerId: 0,
    byEmail: 0,
    byPhone: 0,
    byCardFingerprint: 0,
    byCsvName: 0,
    lineItemsMatched: 0,
    lineItemsUnmatched: 0,
    lineItemsUnnamed: 0,
    csvRecoveredSales: 0, // unnamed/uncatalogued line items rescued via csv amount
  };
  const MATCH_STAT = {
    squareCustomerId: 'bySquareCustomerId', email: 'byEmail', phone: 'byPhone', cardFingerprint: 'byCardFingerprint', csvName: 'byCsvName',
  };
  const unmatched = new Map(); // canonicalName → { name, count, qty, totalCents, sampleOrderIds }

  for (const ev of orders) {
    const pl = ev.payload || {};
    // Join the CSV-import record (by Square order id) so resolveCustomer can use
    // its customerName and the line-item loop can rescue unnamed sales by amount.
    const csv = pl.orderId ? csvByTxn.get(pl.orderId) : null;
    if (csv?.customerName) pl._csvCustomerName = csv.customerName;
    const { customer, matchedBy } = await resolveCustomer(prisma, pl, cache);
    if (matchedBy !== 'placeholder') {
      stats.customersResolved++;
      if (MATCH_STAT[matchedBy]) stats[MATCH_STAT[matchedBy]]++;
      // Backfill recovered email/FK onto the resolved entity (esp. fingerprint
      // clusters that carry a buyer email but were never made emailable).
      const enriched = await enrichResolvedCustomer(prisma, customer, pl.identitySignals || {}, cache);
      stats.emailsBackfilled = (stats.emailsBackfilled || 0) + enriched.aliasesAdded;
      stats.squareIdsBackfilled = (stats.squareIdsBackfilled || 0) + (enriched.fkSet ? 1 : 0);
    } else {
      stats.customersUnattributed++;
    }

    // Skip customers whose revenue is hand-substantiated (avoid double-count).
    if (customer && substantiatedCustomerIds.has(customer.id)) {
      stats.ordersSkippedSubstantiated = (stats.ordersSkippedSubstantiated || 0) + 1;
      continue;
    }

    for (const li of pl.lineItems || []) {
      stats.lineItemsSeen++;
      const liName = (li.name || '').trim();

      // Resolve the saleable target. Named line items match a Product/Dish exactly.
      // Unnamed/uncatalogued lines ("Custom Amount", null) that the CSV import
      // confirms are a real sale get attributed to the "Uncatalogued Square sale"
      // Dish using the CSV amount — recovering revenue the projector used to drop.
      let saleable = liName ? await resolveSaleable(prisma, liName, cache) : null;
      let effectiveCents = Number(li.totalCents || 0);
      let recoveredViaCsv = false;
      if (!saleable) {
        const csvCents = csv ? Math.round(Number(csv.amount || 0) * 100) : 0;
        if (csvCents > 0) {
          // Real sale, just uncatalogued — rescue it rather than logging/dropping.
          saleable = await getUncataloguedTarget(prisma, cache);
          if (!effectiveCents) effectiveCents = csvCents;
          recoveredViaCsv = true;
          stats.csvRecoveredSales++;
        } else if (!liName) {
          stats.lineItemsUnnamed++; continue;
        } else {
          stats.lineItemsUnmatched++;
          const k = canonicalName(liName);
          const rec = unmatched.get(k) || { name: liName, count: 0, qty: 0, totalCents: 0, sampleOrderIds: [] };
          rec.count++; rec.qty += Number(li.quantity || 1); rec.totalCents += Number(li.totalCents || 0);
          if (rec.sampleOrderIds.length < 3) rec.sampleOrderIds.push(pl.orderId || ev.id);
          unmatched.set(k, rec);
          continue;
        }
      }
      stats.lineItemsMatched++;
      const edgeLineName = liName || (recoveredViaCsv ? UNCATALOGUED_SALE_NAME : '');

      if (dryRun) { stats.edgesWritten++; continue; }

      // Idempotency: same ledger event + same line item name + same target = same edge.
      const existing = await prisma.brainAssertion.findFirst({
        where: {
          srcId: customer.id, dstId: saleable.id, relType: 'ORDERED',
          sourceId: ev.id, retractedAt: null,
          metadata: { path: ['lineItemName'], equals: edgeLineName },
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
            lineItemName: edgeLineName,
            quantity: Number(li.quantity || 1),
            totalCents: effectiveCents,
            orderId: pl.orderId || null,
            attributed: matchedBy !== 'placeholder',
            attributedBy: matchedBy,
            ...(recoveredViaCsv ? { recoveredViaCsv: true } : {}),
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
