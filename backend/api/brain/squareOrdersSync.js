/**
 * Square Orders → Brain ledger sync.
 *
 * Pulls COMPLETED orders from Square (SearchOrders across all locations) and
 * writes one `order.placed` LedgerEvent per order, with line items in the
 * payload. This fills the revenue-side blind spot: payments OUT live in
 * local-budget, but customer sales never reached the brain. CHURNING
 * inference reads `order.placed` events with payload.customerId directly.
 *
 * Idempotent — writeLedgerEvent dedupes on (eventType, source, sourceId).
 *
 * Routes:
 *   POST/GET /api/brain/square-orders/sync   (admin | cron | BRAIN_ADMIN_KEY)
 *     body/query: daysBack (default 7; use a large value for backfill)
 */

const crypto = require('crypto');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { writeLedgerEvent } = require('./ledger');
const { getPrisma } = require('../utils/prisma');
// Root api/ is excluded by .vercelignore; use the deployed api-handlers copy.
const { getSquareClient } = require('../../../api-handlers/_lib/squareClient');

const verifyAdminRequest = createAdminVerifier();

function toCents(money) {
  if (!money || money.amount == null) return 0;
  return Number(money.amount); // Square SDK v37 returns BigInt
}

async function listLocationIds(client) {
  const { result } = await client.locationsApi.listLocations();
  return (result.locations || [])
    .filter((l) => l.status === 'ACTIVE' || !l.status)
    .map((l) => l.id);
}

async function runSquareOrdersSync({ logger, daysBack = 7 } = {}) {
  const prisma = getPrisma();
  const { client } = getSquareClient();
  if (!client) {
    return { ordersSeen: 0, eventsWritten: 0, customersMatched: 0, errors: ['square client unavailable'] };
  }

  const startAt = new Date(Date.now() - daysBack * 86_400_000).toISOString();
  const endAt = new Date().toISOString();

  const locationIds = await listLocationIds(client);
  if (!locationIds.length) {
    return { ordersSeen: 0, eventsWritten: 0, customersMatched: 0, errors: ['no active square locations'] };
  }

  let ordersSeen = 0;
  let eventsWritten = 0;
  let customersMatched = 0;
  const errors = [];
  let cursor = undefined;
  let pages = 0;

  do {
    const { result } = await client.ordersApi.searchOrders({
      locationIds: locationIds.slice(0, 10), // Square caps at 10 location ids
      limit: 100,
      cursor,
      query: {
        filter: {
          stateFilter: { states: ['COMPLETED'] },
          dateTimeFilter: { closedAt: { startAt, endAt } },
        },
        sort: { sortField: 'CLOSED_AT', sortOrder: 'DESC' },
      },
    });

    const orders = result.orders || [];
    cursor = result.cursor;
    pages += 1;

    for (const order of orders) {
      ordersSeen += 1;
      try {
        const occurredAt = order.closedAt || order.createdAt || new Date().toISOString();
        const lineItems = (order.lineItems || []).map((li) => ({
          name: li.name || null,
          quantity: Number(li.quantity || 1),
          totalCents: toCents(li.totalMoney),
          catalogObjectId: li.catalogObjectId || null,
        }));

        const event = await writeLedgerEvent({
          eventType: 'order.placed',
          occurredAt,
          source: 'square',
          sourceId: order.id,
          actorType: 'customer',
          actorId: order.customerId || null,
          payload: {
            orderId: order.id,
            locationId: order.locationId || null,
            customerId: order.customerId || null,
            state: order.state,
            totalCents: toCents(order.totalMoney),
            currency: order.totalMoney?.currency || 'USD',
            lineItems,
            itemCount: lineItems.reduce((s, li) => s + li.quantity, 0),
            syncedBy: 'square_orders_sync',
          },
        });
        if (!event._existing) eventsWritten += 1;

        if (order.customerId) {
          const matched = await prisma.brainEntity.count({
            where: { squareCustomerId: order.customerId, tombstonedAt: null },
          });
          if (matched > 0) customersMatched += 1;
        }
      } catch (err) {
        errors.push(`${order.id}: ${err.message}`);
        if (errors.length > 20) break;
      }
    }
  } while (cursor && pages < 30);

  logger?.info({ ordersSeen, eventsWritten, customersMatched, pages, daysBack }, 'brain/square-orders: sync complete');
  return { ordersSeen, eventsWritten, customersMatched, pages, errors };
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

function registerSquareOrdersRoutes(app, { logger } = {}) {
  const runHandler = async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      const isCron = req.headers['x-vercel-cron'] === '1'
        || String(req.headers['user-agent'] || '').startsWith('vercel-cron');
      if (!admin && !isCron && !hasBrainAdminHeader(req)) {
        return res.status(403).json({ error: 'admin only' });
      }

      if (running) return res.status(409).json({ error: 'sync already running', lastRun });

      const daysBack = Math.min(Math.max(parseInt(req.body?.daysBack || req.query?.daysBack) || 7, 1), 730);
      running = true;
      runSquareOrdersSync({ logger, daysBack })
        .then((result) => {
          lastRun = { completedAt: new Date().toISOString(), daysBack, ...result };
          logger?.info(lastRun, 'brain/square-orders: run finished');
        })
        .catch((err) => logger?.error({ err }, 'brain/square-orders: run error'))
        .finally(() => { running = false; });

      return res.json({ ok: true, status: 'started', daysBack, lastRun });
    } catch (err) {
      logger?.error({ err }, 'brain/square-orders: trigger error');
      return res.status(500).json({ error: 'internal-error' });
    }
  };
  app.post('/api/brain/square-orders/sync', runHandler);
  app.get('/api/brain/square-orders/sync', runHandler);
}

module.exports = { runSquareOrdersSync, registerSquareOrdersRoutes };
