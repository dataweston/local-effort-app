/**
 * Square Orders → Brain ledger sync.
 *
 * Pulls COMPLETED orders from Square (SearchOrders across all locations) and
 * writes one `order.placed` LedgerEvent per order, with line items in the
 * payload. This fills the revenue-side blind spot: payments OUT live in
 * local-budget, but customer sales never reached the brain. CHURNING
 * inference reads `order.placed` events with payload.customerId directly.
 *
 * IDENTITY RECOVERY (Track 1): order.customerId is sparse (~33/299 orders).
 * Square holds the buyer identity in several OTHER places we now harvest into
 * an `identitySignals` block on the payload so the projector's multi-signal
 * resolver (Track 2) can recover the customer:
 *   - tenders[]            → cardFingerprint, tender-level customerId
 *   - payments (fetched)   → buyer_email_address, payment-level customerId
 *   - fulfillments[]       → recipient display name / email / phone
 * Money is NOT re-ingested here — local-budget stays the revenue source of
 * truth. This sync only supplies the WHO and the WHAT (structure), never a
 * `payment.received` event. No double-count is possible.
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

const norm = (s) => (s == null ? null : String(s).trim() || null);
const lc = (s) => { const v = norm(s); return v ? v.toLowerCase() : null; };

/**
 * Fetch a Square payment and pull the identity it carries — the buyer email,
 * a payment-level customerId (present even when the parent order has none),
 * and the card fingerprint (stable per physical card → clusters anonymous
 * repeat buyers). Returns null on any error; identity recovery never breaks
 * the order sync.
 */
async function fetchPaymentIdentity(client, paymentId, cache) {
  if (!paymentId) return null;
  if (cache.payments.has(paymentId)) return cache.payments.get(paymentId);
  let identity = null;
  try {
    const { result } = await client.paymentsApi.getPayment(paymentId);
    const p = result?.payment;
    if (p) {
      identity = {
        paymentId: p.id || paymentId,
        customerId: norm(p.customerId),
        buyerEmail: lc(p.buyerEmailAddress),
        cardFingerprint: norm(p.cardDetails?.card?.fingerprint),
        cardLast4: norm(p.cardDetails?.card?.last4),
        receiptNumber: norm(p.receiptNumber),
      };
    }
  } catch {
    identity = null;
  }
  cache.payments.set(paymentId, identity);
  return identity;
}

/**
 * Collapse every identity signal an order carries into a single normalized
 * block. Arrays are deduped; the projector tries them in confidence order.
 */
function buildIdentitySignals(order, paymentIdentities) {
  const paymentCustomerIds = new Set();
  const buyerEmails = new Set();
  const cardFingerprints = new Set();
  const recipientNames = new Set();
  const recipientEmails = new Set();
  const recipientPhones = new Set();

  for (const t of order.tenders || []) {
    if (t.customerId) paymentCustomerIds.add(norm(t.customerId));
    const fp = t.cardDetails?.card?.fingerprint;
    if (fp) cardFingerprints.add(norm(fp));
  }
  for (const pi of paymentIdentities) {
    if (!pi) continue;
    if (pi.customerId) paymentCustomerIds.add(pi.customerId);
    if (pi.buyerEmail) buyerEmails.add(pi.buyerEmail);
    if (pi.cardFingerprint) cardFingerprints.add(pi.cardFingerprint);
  }
  for (const f of order.fulfillments || []) {
    const r = f.pickupDetails?.recipient || f.deliveryDetails?.recipient
      || f.shipmentDetails?.recipient || null;
    if (!r) continue;
    if (r.displayName) recipientNames.add(norm(r.displayName));
    if (r.emailAddress) recipientEmails.add(lc(r.emailAddress));
    if (r.phoneNumber) recipientPhones.add(norm(r.phoneNumber));
  }

  const arr = (s) => [...s].filter(Boolean);
  return {
    orderCustomerId: norm(order.customerId),
    paymentCustomerIds: arr(paymentCustomerIds),
    buyerEmails: arr(buyerEmails),
    cardFingerprints: arr(cardFingerprints),
    recipientNames: arr(recipientNames),
    recipientEmails: arr(recipientEmails),
    recipientPhones: arr(recipientPhones),
  };
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
  let eventsEnriched = 0;    // existing events that gained the identitySignals block
  let customersMatched = 0;
  let identityRecovered = 0; // orders that gained a usable signal beyond order.customerId
  const errors = [];
  let cursor = undefined;
  let pages = 0;
  const cache = { payments: new Map() };

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

        // Identity recovery: gather the payment ids attached to this order, fetch
        // each payment's buyer email / customerId / card fingerprint, then collapse
        // every signal (tenders, payments, fulfillment recipients) into one block.
        const paymentIds = new Set([
          ...((order.tenders || []).map((t) => t.paymentId).filter(Boolean)),
        ]);
        const paymentIdentities = [];
        for (const pid of paymentIds) {
          paymentIdentities.push(await fetchPaymentIdentity(client, pid, cache));
        }
        const identitySignals = buildIdentitySignals(order, paymentIdentities);
        const hasExtraSignal = !!(
          identitySignals.paymentCustomerIds.length
          || identitySignals.buyerEmails.length
          || identitySignals.cardFingerprints.length
          || identitySignals.recipientEmails.length
          || identitySignals.recipientPhones.length
        );
        if (hasExtraSignal) identityRecovered += 1;

        const event = await writeLedgerEvent({
          eventType: 'order.placed',
          occurredAt,
          source: 'square',
          sourceId: order.id,
          actorType: 'customer',
          actorId: order.customerId || null,
          // Enrich existing events: earlier syncs wrote order.placed without an
          // identitySignals block, so merge it in on backfill rather than skip.
          updatePayload: true,
          payload: {
            orderId: order.id,
            locationId: order.locationId || null,
            customerId: order.customerId || null,
            state: order.state,
            totalCents: toCents(order.totalMoney),
            currency: order.totalMoney?.currency || 'USD',
            lineItems,
            itemCount: lineItems.reduce((s, li) => s + li.quantity, 0),
            identitySignals,
            syncedBy: 'square_orders_sync',
          },
        });
        if (!event._existing) eventsWritten += 1;
        else if (event._updated) eventsEnriched += 1;

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

  logger?.info({ ordersSeen, eventsWritten, eventsEnriched, customersMatched, identityRecovered, pages, daysBack }, 'brain/square-orders: sync complete');
  return { ordersSeen, eventsWritten, eventsEnriched, customersMatched, identityRecovered, pages, errors };
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
      const { withJobRun } = require('./jobRuns');
      withJobRun('square-orders-sync', () => runSquareOrdersSync({ logger, daysBack }))
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
