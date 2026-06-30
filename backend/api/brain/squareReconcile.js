/**
 * Square Payout ↔ Local Budget income reconciliation (Track 3).
 *
 * Local Budget is the revenue source of truth: its INCOME rows are written as
 * `payment.received` events with `squareMatchPending: true` and NO payer
 * (localBudgetSync.js). Most LB income is NOT Square (transfers/Zelle/other) —
 * which is exactly why LB owns the money. This job identifies the SUBSET that
 * IS Square revenue and labels it, WITHOUT changing any dollar amount and
 * WITHOUT writing a new revenue event (so no double-count is possible).
 *
 * How: a Square payout is a net bank deposit aggregating charges minus fees and
 * capital-loan payments. We match each pending LB `payment.received` to a Square
 * payout by NET AMOUNT (exact) + ARRIVAL DATE proximity, then stamp the LB event
 * IN PLACE (by primary key) with:
 *   - squarePayoutId, squarePayoutArrivalDate, squareNetCents
 *   - squareMatched: true, and clears squareMatchPending.
 *
 * The LB amountCents is never touched. CASHFLOW / COGS_RATIO keep reading LB
 * `payment.received` exactly as before. Track 3 only adds a Square/non-Square
 * label onto money that already exists — it tells us WHICH LB deposits are
 * Square sales revenue (vs transfers/Zelle/other), without summing anything.
 *
 * Per-deposit BUYER attribution is NOT available: this merchant's payout-entries
 * expose no payment_id on CHARGE entries (verified live 2026-06-29), so the
 * payout → payment → order → customer chain can't be walked. Customer
 * attribution therefore lives only on the Track-2 ORDERED edges, which is the
 * right place for it. `withCustomers` is retained as an opt-in but is a no-op
 * until Square exposes payment_id on entries.
 *
 * Match key is EXACT NET AMOUNT, so date tolerance is only a tiebreaker among
 * equal-amount payouts (verified: match count is stable from 1d to 7d windows).
 *
 * Idempotent: already-matched events leave the squareMatchPending set, so a
 * re-run never re-examines them. Reversible: only additive payload keys change;
 * squareMatchPending can be restored.
 *
 * Routes:
 *   POST/GET /api/brain/square-reconcile/run  (admin | cron | BRAIN_ADMIN_KEY)
 *     body/query: daysBack (default null = all), dryRun (default false),
 *                 toleranceDays (default 3), withCustomers (default false)
 */

const crypto = require('crypto');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { getPrisma } = require('../utils/prisma');
const { withJobRun } = require('./jobRuns');

const verifyAdminRequest = createAdminVerifier();

const cents = (m) => (m && m.amount != null ? Number(m.amount) : 0);
const dayKey = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null); // YYYY-MM-DD

// ── Square HTTP (Payouts API) ───────────────────────────────────────────────
// We call the REST API directly rather than via the SDK: the installed square
// v37 build serializes `undefined` positional args into empty `&` query params
// ("Invalid query parameters &&&&limit=100"), breaking every paginated payouts
// call. Direct fetch mirrors the brain-sidecar extract_square_customers job and
// is version-independent.

const SQUARE_BASE = (process.env.SQUARE_BASE || 'https://connect.squareup.com/v2').replace(/\/$/, '');
const SQUARE_VERSION = process.env.SQUARE_VERSION || '2026-01-22';

async function squareGet(path, params = {}) {
  const token = process.env.SQUARE_ACCESS_TOKEN || '';
  if (!token) throw new Error('SQUARE_ACCESS_TOKEN not set');
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, String(v));
  const url = `${SQUARE_BASE}/${path}${qs.toString() ? `?${qs}` : ''}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Square-Version': SQUARE_VERSION, Accept: 'application/json' },
  });
  if (!resp.ok) throw new Error(`Square ${path} ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return resp.json();
}

async function fetchAllPayouts() {
  const payouts = [];
  let cursor;
  let pages = 0;
  do {
    const data = await squareGet('payouts', { limit: 100, cursor });
    for (const p of data.payouts || []) payouts.push(p);
    cursor = data.cursor;
    pages += 1;
  } while (cursor && pages < 50);
  return payouts;
}

// Pull a payout's entries and return the paymentIds it settled. Used to walk
// payout → payment → order → customer. Best-effort; never throws.
async function fetchPayoutPaymentIds(payoutId, cache) {
  if (cache.entries.has(payoutId)) return cache.entries.get(payoutId);
  const ids = [];
  try {
    let cursor;
    let pages = 0;
    do {
      const data = await squareGet(`payouts/${payoutId}/payout-entries`, { limit: 100, cursor });
      for (const e of data.payout_entries || []) {
        if (e.type === 'CHARGE' && e.payment_id) ids.push(e.payment_id);
      }
      cursor = data.cursor;
      pages += 1;
    } while (cursor && pages < 20);
  } catch {
    /* best-effort */
  }
  cache.entries.set(payoutId, ids);
  return ids;
}

// ── customer resolution from a payout's payments ────────────────────────────

// Map a payout's paymentIds → resolved Customer entity ids. Each payment →
// its Square order (payments/{id} → order_id) → the order.placed ledger event →
// the attributed ORDERED edges already projected by Track 2. Reuses Track 1/2
// work; the only extra Square call is one getPayment per payment to learn its
// order_id (cached). Best-effort — a missing link just yields no customer.
async function customersForPaymentIds(prisma, paymentIds, cache) {
  const out = new Set();
  for (const pid of paymentIds) {
    if (cache.paymentCustomers.has(pid)) {
      for (const c of cache.paymentCustomers.get(pid)) out.add(c);
      continue;
    }
    const found = new Set();
    let orderId = null;
    try {
      const data = await squareGet(`payments/${pid}`);
      orderId = data.payment?.order_id || null;
    } catch { orderId = null; }

    if (orderId) {
      const ev = await prisma.ledgerEvent.findFirst({
        where: {
          eventType: 'order.placed', source: 'square', tombstonedAt: null,
          payload: { path: ['orderId'], equals: orderId },
        },
        select: { id: true },
      }).catch(() => null);
      if (ev) {
        const edges = await prisma.brainAssertion.findMany({
          where: { relType: 'ORDERED', sourceId: ev.id, retractedAt: null, metadata: { path: ['attributed'], equals: true } },
          select: { srcId: true },
        });
        for (const e of edges) found.add(e.srcId);
      }
    }
    cache.paymentCustomers.set(pid, [...found]);
    for (const c of found) out.add(c);
  }
  return [...out];
}

// ── reconciliation ──────────────────────────────────────────────────────────

async function runSquareReconcile({ logger, daysBack = null, dryRun = false, toleranceDays = 3, withCustomers = false } = {}) {
  const prisma = getPrisma();
  if (!process.env.SQUARE_ACCESS_TOKEN) return { ok: false, error: 'square token unavailable', matched: 0 };

  // Index PAID, positive-amount payouts by (netCents, arrivalDate). Negative
  // payouts are fee/loan debits, not income deposits. REST API → snake_case.
  const payouts = await fetchAllPayouts();
  const byAmount = new Map(); // netCents → [{ payout, arrivalKey }]
  let paidPositive = 0;
  for (const p of payouts) {
    if (p.status !== 'PAID') continue;
    const net = cents(p.amount_money);
    if (net <= 0) continue;
    paidPositive += 1;
    const arrivalKey = dayKey(p.arrival_date || p.created_at);
    if (!byAmount.has(net)) byAmount.set(net, []);
    byAmount.get(net).push({ payout: p, arrivalKey });
  }

  const where = {
    eventType: 'payment.received', source: 'local_budget', tombstonedAt: null,
    payload: { path: ['squareMatchPending'], equals: true },
  };
  if (daysBack) where.occurredAt = { gte: new Date(Date.now() - daysBack * 86_400_000) };
  const pending = await prisma.ledgerEvent.findMany({
    where, select: { id: true, occurredAt: true, payload: true }, orderBy: { occurredAt: 'desc' },
  });

  const cache = { entries: new Map(), paymentCustomers: new Map() };
  const usedPayoutIds = new Set();
  const stats = {
    payoutsSeen: payouts.length, payoutsPaidPositive: paidPositive,
    pendingSeen: pending.length,
    matched: 0, ambiguous: 0, unmatched: 0, customersLinked: 0, alreadyMatched: 0,
  };

  for (const ev of pending) {
    const pl = ev.payload || {};
    const amt = Number(pl.amountCents || 0);
    if (!amt) { stats.unmatched++; continue; }
    const candidates = byAmount.get(amt) || [];
    if (!candidates.length) { stats.unmatched++; continue; }

    // Within exact-amount matches, pick the payout whose arrival date is closest
    // to the LB transaction date and within tolerance and not already consumed.
    const lbKey = dayKey(ev.occurredAt);
    const scored = candidates
      .filter((c) => !usedPayoutIds.has(c.payout.id))
      .map((c) => ({ ...c, dist: Math.abs((new Date(lbKey) - new Date(c.arrivalKey)) / 86_400_000) }))
      .filter((c) => c.dist <= toleranceDays)
      .sort((a, b) => a.dist - b.dist);

    if (!scored.length) { stats.unmatched++; continue; }
    // Ambiguous when ≥2 equally-close candidates remain — skip rather than guess.
    if (scored.length >= 2 && scored[0].dist === scored[1].dist) { stats.ambiguous++; continue; }

    const { payout } = scored[0];
    usedPayoutIds.add(payout.id);

    let customerEntityIds = [];
    if (withCustomers) {
      const paymentIds = await fetchPayoutPaymentIds(payout.id, cache);
      customerEntityIds = await customersForPaymentIds(prisma, paymentIds, cache);
      stats.customersLinked += customerEntityIds.length;
    }

    if (dryRun) { stats.matched++; continue; }

    // Update the ORIGINAL LB event in place by its primary key. We must NOT route
    // through writeLedgerEvent's sourceId path here: the LB event's sourceId is
    // its externalId, not localBudgetTxId, so a sourceId lookup would miss and
    // create a duplicate. Annotate-in-place; never change amountCents.
    if (pl.squareMatched === true && pl.squarePayoutId === payout.id) {
      stats.alreadyMatched++;
      continue;
    }
    await prisma.ledgerEvent.update({
      where: { id: ev.id },
      data: {
        payload: {
          ...pl,
          squareMatchPending: false,
          squareMatched: true,
          squarePayoutId: payout.id,
          squarePayoutArrivalDate: payout.arrival_date || null,
          squareNetCents: cents(payout.amount_money),
          squareCustomerEntityIds: customerEntityIds,
          reconciledBy: 'square_reconcile',
          reconciledAt: new Date().toISOString(),
        },
      },
    });
    stats.matched++;
  }

  logger?.info(stats, 'brain/square-reconcile: complete');
  return { ok: true, ...stats };
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

function registerSquareReconcileRoutes(app, { logger } = {}) {
  const runHandler = async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      const isCron = req.headers['x-vercel-cron'] === '1'
        || String(req.headers['user-agent'] || '').startsWith('vercel-cron');
      if (!admin && !isCron && !hasBrainAdminHeader(req)) {
        return res.status(403).json({ error: 'admin only' });
      }
      if (running) return res.status(409).json({ error: 'reconcile already running', lastRun });

      const daysBack = req.body?.daysBack || req.query?.daysBack
        ? Math.min(Math.max(parseInt(req.body?.daysBack || req.query?.daysBack) || 0, 1), 1825)
        : null;
      const dryRun = String(req.body?.dryRun ?? req.query?.dryRun) === 'true';
      const toleranceDays = Math.min(Math.max(parseInt(req.body?.toleranceDays || req.query?.toleranceDays) || 3, 0), 10);

      running = true;
      const exec = dryRun
        ? runSquareReconcile({ logger, daysBack, dryRun, toleranceDays })
        : withJobRun('square-reconcile', () => runSquareReconcile({ logger, daysBack, dryRun, toleranceDays }));
      exec
        .then((result) => { lastRun = { completedAt: new Date().toISOString(), daysBack, dryRun, ...result }; })
        .catch((err) => logger?.error({ err }, 'brain/square-reconcile: run error'))
        .finally(() => { running = false; });

      return res.json({ ok: true, status: 'started', daysBack, dryRun, toleranceDays });
    } catch (err) {
      logger?.error({ err }, 'brain/square-reconcile: trigger error');
      return res.status(500).json({ error: 'internal-error' });
    }
  };
  app.post('/api/brain/square-reconcile/run', runHandler);
  app.get('/api/brain/square-reconcile/run', runHandler);
}

module.exports = { runSquareReconcile, registerSquareReconcileRoutes };
