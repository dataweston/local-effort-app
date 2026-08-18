/**
 * Local Budget line items → Brain ledger (per-item price + quantity stream).
 *
 * Local Budget persists a `LineItem` per sold Square order line and per parsed
 * receipt line, and exposes them at `GET /api/integration/v1/items` — an
 * endpoint its own docstring describes as existing "for the brain's recipe/margin
 * subsystem". Nothing here consumed it, which is why menu pricing, food cost and
 * per-unit price drift had no source data: the brain only ever saw payment
 * TOTALS, and a total cannot tell you whether flour got more expensive or you
 * simply bought more of it.
 *
 * Writes `line_item.recorded` events, one per LB line item:
 *
 *   purchased lines (receipts / vendor invoices)
 *     → resolve Vendor via LB's canonical vendor id, the brain's own
 *       `localBudgetVendorId` FK anchor, so the join is exact rather than a
 *       name guess. Feeds per-ingredient unit cost and PRICE_DRIFT.
 *
 *   sold lines (Square order items)
 *     → match an EXISTING Dish or Product by name. Never mints: an unmatched
 *       sold item is a catalog-normalisation task, not a new entity (same rule
 *       as orderGraphProjector.js, founder decision 2026-06-27). Feeds demand
 *       and menu-pricing work.
 *
 * These events carry no cash direction and are never summed as revenue or
 * expense — the money is already counted once, by localBudgetSync.js. This
 * stream is about WHAT was in the transaction, at what unit price.
 *
 * Idempotent: sourceId is the LB line-item id, and `updatePayload` lets a re-run
 * enrich a line whose vendor or item resolution improved.
 *
 * Uses the versioned integration API rather than the LB database directly, per
 * the contract in docs/local-budget-integration.md.
 *
 * Routes:
 *   POST/GET /api/brain/local-budget/items-sync  (admin | cron | BRAIN_ADMIN_KEY)
 *     body/query: sinceDays (default 90), lineType (default ITEM), source,
 *                 dryRun (default false)
 */

const crypto = require('crypto');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent } = require('./ledger');
const { resolveEntity } = require('./resolver');

const verifyAdminRequest = createAdminVerifier();

const PAGE_LIMIT = 1000;
const SOLD_ENTITY_TYPES = ['Dish', 'Product'];

function apiConfig() {
  const baseUrl = String(process.env.LOCAL_BUDGET_API_URL || '').trim().replace(/\/+$/, '');
  const token = String(process.env.LOCAL_BUDGET_API_TOKEN || '').trim();
  if (!baseUrl || !token) {
    throw new Error('LOCAL_BUDGET_API_URL and LOCAL_BUDGET_API_TOKEN are required');
  }
  return { baseUrl, token };
}

function toCents(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100);
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/** A line is "sold" when it came from a Square order (LB stamps sourceUid). */
function isSoldLine(row) {
  return !!row.sourceUid;
}

async function fetchItemsPage({ baseUrl, token }, params) {
  const url = new URL(`${baseUrl}/api/integration/v1/items`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`local budget items ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

/**
 * Match a sold line to an existing catalog entity. Match-only by design; the
 * count of misses is the catalog worklist.
 */
async function matchSoldItem(prisma, cache, name) {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);

  const hit = await prisma.brainEntity.findFirst({
    where: {
      entityType: { in: SOLD_ENTITY_TYPES },
      tombstonedAt: null,
      status: 'active',
      OR: [
        { name: { equals: key, mode: 'insensitive' } },
        { aliases: { some: { alias: { equals: key, mode: 'insensitive' } } } },
      ],
    },
    select: { id: true, entityType: true, name: true },
  });
  cache.set(key, hit || null);
  return hit || null;
}

async function runLocalBudgetItemsSync({
  logger,
  sinceDays = 90,
  lineType = 'ITEM',
  source = null,
  dryRun = false,
} = {}) {
  const prisma = getPrisma();
  let config;
  try {
    config = apiConfig();
  } catch (error) {
    return { ok: false, error: error.message, itemsWritten: 0 };
  }

  const stats = {
    seen: 0, written: 0, existing: 0,
    soldLines: 0, purchasedLines: 0,
    vendorsResolved: 0, vendorsCreated: 0, vendorsBlocked: 0,
    itemsMatched: 0, itemsUnmatched: 0,
    unmatchedSoldNames: [],
    dryRun,
    errors: [],
  };

  const vendorCache = new Map();
  const soldCache = new Map();
  let cursor = null;

  do {
    const page = await fetchItemsPage(config, {
      from: sinceDays ? isoDaysAgo(sinceDays) : null,
      lineType,
      source,
      limit: PAGE_LIMIT,
      cursor,
    });
    const rows = Array.isArray(page?.items) ? page.items : [];

    for (const row of rows) {
      stats.seen++;
      const sold = isSoldLine(row);
      if (sold) stats.soldLines++; else stats.purchasedLines++;

      try {
        // Vendor: exact FK anchor on LB's canonical vendor id.
        let vendorEntityId = null;
        if (row.vendorId || row.vendorName) {
          const cacheKey = row.vendorId || String(row.vendorName).toLowerCase();
          if (vendorCache.has(cacheKey)) {
            vendorEntityId = vendorCache.get(cacheKey);
          } else if (!dryRun) {
            const resolved = await resolveEntity({
              type: 'Vendor',
              name: row.vendorName || null,
              ids: row.vendorId ? { localBudgetVendorId: row.vendorId } : {},
              create: !!row.vendorName,
              properties: { source: 'local_budget_items_sync' },
            });
            if (resolved.blocked) stats.vendorsBlocked++;
            else {
              vendorEntityId = resolved.entity?.id || null;
              if (resolved.created) stats.vendorsCreated++;
              else if (resolved.entity) stats.vendorsResolved++;
            }
            vendorCache.set(cacheKey, vendorEntityId);
          }
        }

        // Sold lines: match the catalog, never mint.
        const displayName = row.itemName || row.description || null;
        let soldEntity = null;
        if (sold && displayName && !dryRun) {
          soldEntity = await matchSoldItem(prisma, soldCache, displayName);
          if (soldEntity) stats.itemsMatched++;
          else {
            stats.itemsUnmatched++;
            if (stats.unmatchedSoldNames.length < 50 && !stats.unmatchedSoldNames.includes(displayName)) {
              stats.unmatchedSoldNames.push(displayName);
            }
          }
        }

        if (dryRun) continue;

        const event = await writeLedgerEvent({
          eventType: 'line_item.recorded',
          occurredAt: row.date || new Date().toISOString(),
          source: 'local_budget',
          sourceId: row.id,
          actorType: 'system',
          updatePayload: true,
          payload: {
            localBudgetLineItemId: row.id,
            localBudgetTxId: row.transactionId || null,
            lineRole: sold ? 'sold' : 'purchased',
            lineType: row.lineType || null,
            classification: row.classification || null,
            itemName: displayName,
            description: row.description || null,
            unitOfMeasure: row.unitOfMeasure || null,
            quantity: row.quantity === null || row.quantity === undefined ? null : Number(row.quantity),
            unitPriceCents: toCents(row.unitPrice),
            totalPriceCents: toCents(row.totalPrice),
            merchantName: row.merchantName || null,
            customerName: row.customerName || null,
            vendorEntityId,
            localBudgetVendorId: row.vendorId || null,
            localBudgetItemId: row.itemId || null,
            soldEntityId: soldEntity?.id || null,
            soldEntityType: soldEntity?.entityType || null,
            // No cash direction on purpose: localBudgetSync.js already counted
            // this money once. This event describes contents, not cash.
            cashEvent: false,
          },
        });
        if (event._existing) stats.existing++; else stats.written++;
      } catch (error) {
        stats.errors.push(`line ${row.id}: ${error.message}`);
        if (stats.errors.length > 30) break;
      }
    }

    cursor = page?.nextCursor || null;
    if (stats.errors.length > 30) break;
  } while (cursor);

  logger?.info(stats, 'brain/local-budget-items: sync complete');
  return {
    ok: true,
    ...stats,
    itemsProcessed: stats.seen,
    itemsWritten: stats.written,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

function hasBrainAdminHeader(req) {
  const provided = String(req.headers['x-brain-admin-key'] || '');
  const expected = process.env.BRAIN_ADMIN_KEY || '';
  if (!provided || !expected || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

let running = false;
let lastRun = null;

function registerLocalBudgetItemsRoutes(app, { logger } = {}) {
  const runHandler = async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      const isCron = req.headers['x-vercel-cron'] === '1'
        || String(req.headers['user-agent'] || '').startsWith('vercel-cron');
      if (!admin && !isCron && !hasBrainAdminHeader(req)) {
        return res.status(403).json({ error: 'admin only' });
      }
      if (running) return res.status(409).json({ error: 'sync already running', lastRun });

      const rawSince = req.body?.sinceDays ?? req.query?.sinceDays;
      const sinceDays = rawSince === 'all'
        ? null
        : Math.min(Math.max(parseInt(rawSince, 10) || 90, 1), 1825);
      const lineType = String(req.body?.lineType || req.query?.lineType || 'ITEM');
      const source = req.body?.source || req.query?.source || null;
      const dryRun = String(req.body?.dryRun ?? req.query?.dryRun) === 'true';

      running = true;
      const { withJobRun } = require('./jobRuns');
      const exec = dryRun
        ? runLocalBudgetItemsSync({ logger, sinceDays, lineType, source, dryRun })
        : withJobRun('local-budget-items-sync', () => runLocalBudgetItemsSync({
          logger, sinceDays, lineType, source, dryRun,
        }));
      exec
        .then((result) => { lastRun = { completedAt: new Date().toISOString(), sinceDays, ...result }; })
        .catch((err) => logger?.error({ err }, 'brain/local-budget-items: run error'))
        .finally(() => { running = false; });

      return res.json({ ok: true, status: 'started', sinceDays, lineType, source, dryRun });
    } catch (err) {
      logger?.error({ err }, 'brain/local-budget-items: trigger error');
      return res.status(500).json({ error: 'internal-error' });
    }
  };
  app.post('/api/brain/local-budget/items-sync', runHandler);
  app.get('/api/brain/local-budget/items-sync', runHandler);
}

module.exports = {
  isSoldLine,
  matchSoldItem,
  registerLocalBudgetItemsRoutes,
  runLocalBudgetItemsSync,
};
