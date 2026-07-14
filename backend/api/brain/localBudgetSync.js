/**
 * Local Budget → Brain ledger sync (Track B).
 *
 * Reads transactions from the Local Budget Postgres (read-only, consumer-only —
 * this repo never migrates/writes LB) via LOCAL_BUDGET_DATABASE_URL, and writes
 * brain ledger events:
 *
 *   EXPENSE (COGS|OPERATING) → `payment.completed`
 *     resolve merchantName → Vendor (resolver; create provisional when unmatched,
 *     self-identity guarded). payload carries merchantName + amountCents +
 *     resolved vendorEntityId. This is the long-missing vendor outflow stream
 *     that PREFERS/AVOIDS/PRICE_DRIFT consume.
 *
 *   INCOME → `payment.received`
 *     LB has income sources beyond Square (the reason LB is the source of truth).
 *     But LB income rows carry no merchantName/payer, so we record amount + date
 *     + description with counterparty null, tagged squareMatchPending for a later
 *     Square-payout matching pass. No double-count risk because these are NOT
 *     attributed to a customer yet.
 *
 * Idempotent: dedupes on (eventType, source='local_budget', sourceId=LB tx id).
 * The unique index from 20260627000100 enforces this at the DB level too.
 *
 * Amount: LB stores positive `amount`; direction is the `type` enum. We convert
 * to integer cents.
 */

const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent } = require('./ledger');
const { resolveEntity } = require('./resolver');

const verifyAdminRequest = createAdminVerifier();

// Lazy singleton read-only client for the Local Budget DB.
let lbClient = null;
function getLbClient() {
  if (lbClient) return lbClient;
  let url = (process.env.LOCAL_BUDGET_DATABASE_URL || '').trim();
  url = url.replace(/^["']|["']$/g, '').replace(/^[A-Z_]+=/, '').replace(/^["']|["']$/g, '');
  if (!url) return null;
  lbClient = new PrismaClient({ datasources: { db: { url } } });
  return lbClient;
}

const EXPENSE_CLASSIFICATIONS = ['COGS', 'OPERATING'];

function costBucket(classification, categoryName) {
  const category = String(categoryName || '').toLowerCase();
  if (/labor|payroll|wage|contractor|staff/.test(category)) return 'LABOR';
  if (classification === 'COGS') return 'INVENTORY';
  if (classification === 'OPERATING') return 'OPERATING';
  return null;
}

function toCents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

/**
 * Strip bank-statement descriptor noise so "Debit Card THUMBTACK 7139724290"
 * resolves to the same vendor as "Thumbtack" instead of minting a duplicate.
 * Removes leading payment-method prefixes, trailing store/ref numbers, and
 * common processor markers. Returns the cleaned merchant name (or original if
 * nothing matched). We keep the ORIGINAL as an alias on the resolved entity so
 * future identical descriptors match by alias.
 */
function cleanMerchantName(raw) {
  let s = String(raw || '').trim();
  if (!s) return s;
  // leading payment-method prefixes
  s = s.replace(/^(debit card|credit card|direct payment|ach|pos|recurring|check card|purchase authorized on \d+\/\d+)\s+/i, '');
  // processor markers: "SQ *", "TST*", "SP "/"SPO*", "PAYPAL *", "PP*"
  s = s.replace(/\b(sq|tst|spo?|paypal|pp|ach|web)\s*\*\s*/i, '');
  s = s.replace(/\*/g, ' ');
  // trailing store/ref numbers and city/state tails like "#3404", "7139724290", "TWIN LA"
  s = s.replace(/\s+#?\d{3,}\b.*$/i, '');           // store/ref numbers + anything after
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s || String(raw).trim();
}

async function runLocalBudgetSync({ logger, sinceDays = null, limit = 10000 } = {}) {
  const prisma = getPrisma();
  const lb = getLbClient();
  if (!lb) {
    return { ok: false, error: 'LOCAL_BUDGET_DATABASE_URL not set', expenseWritten: 0, incomeWritten: 0 };
  }

  const stats = {
    expenseSeen: 0, expenseWritten: 0, expenseExisting: 0,
    vendorsResolved: 0, vendorsCreated: 0, vendorsBlocked: 0,
    incomeSeen: 0, incomeWritten: 0, incomeExisting: 0,
    errors: [],
  };

  const dateFilter = sinceDays
    ? `AND date >= now() - interval '${parseInt(sinceDays)} days'`
    : '';

  // ── EXPENSE (COGS|OPERATING) → payment.completed ──
  const expenses = await lb.$queryRawUnsafe(
    `SELECT t.id, t."externalId", t.date, t."merchantName", t.amount,
            COALESCE(t.classification::text, c."defaultClassification"::text) AS classification,
            c.name AS "categoryName", t.description
     FROM transactions t
     LEFT JOIN categories c ON c.id = t."categoryId"
     WHERE t.type::text='EXPENSE'
       AND (
         COALESCE(t.classification::text, c."defaultClassification"::text) = ANY($1::text[])
         OR LOWER(COALESCE(c.name, '')) ~ '(labor|payroll|wage|contractor|staff)'
       ) ${dateFilter}
     ORDER BY t.date DESC LIMIT ${parseInt(limit)}`,
    EXPENSE_CLASSIFICATIONS
  );

  const vendorCache = new Map();
  for (const tx of expenses) {
    stats.expenseSeen++;
    try {
      const sourceId = tx.externalId || tx.id;
      const merchant = (tx.merchantName || '').trim();

      // Resolve vendor (create provisional when unmatched). Skip resolution when
      // no merchant name — still record the payment, vendorEntityId null.
      let vendorEntityId = null;
      if (merchant) {
        const cleaned = cleanMerchantName(merchant);
        const cacheKey = cleaned.toLowerCase();
        if (vendorCache.has(cacheKey)) {
          vendorEntityId = vendorCache.get(cacheKey);
        } else {
          // Resolve by the cleaned name; attach the raw bank descriptor as an
          // alias so the next identical descriptor matches by alias.
          const extraAliases = cleaned.toLowerCase() !== merchant.toLowerCase() ? [merchant] : [];
          const r = await resolveEntity({
            type: 'Vendor', name: cleaned, aliases: extraAliases, create: true,
            properties: { source: 'local_budget_sync' },
          });
          if (r.blocked) { stats.vendorsBlocked++; vendorEntityId = null; }
          else {
            vendorEntityId = r.entity?.id || null;
            if (r.created) stats.vendorsCreated++; else if (r.entity) stats.vendorsResolved++;
          }
          vendorCache.set(cacheKey, vendorEntityId);
        }
      }

      const event = await writeLedgerEvent({
        eventType: 'payment.completed',
        occurredAt: tx.date,
        source: 'local_budget',
        sourceId,
        actorType: 'system',
        payload: {
          localBudgetTxId: tx.id,
          merchantName: merchant || null,
          amountCents: toCents(tx.amount),
          direction: 'outflow',
          classification: tx.classification,
          categoryName: tx.categoryName || null,
          costBucket: costBucket(tx.classification, tx.categoryName),
          vendorEntityId,
          description: tx.description || null,
        },
      });
      if (event._existing) stats.expenseExisting++; else stats.expenseWritten++;
    } catch (err) {
      stats.errors.push(`expense ${tx.id}: ${err.message}`);
      if (stats.errors.length > 30) break;
    }
  }

  // ── INCOME → payment.received (counterparty deferred to Square match) ──
  const incomes = await lb.$queryRawUnsafe(
    `SELECT id, "externalId", date, "merchantName", amount, classification::text AS classification, description
     FROM transactions
     WHERE type::text='INCOME' ${dateFilter}
     ORDER BY date DESC LIMIT ${parseInt(limit)}`
  );

  for (const tx of incomes) {
    stats.incomeSeen++;
    try {
      const sourceId = tx.externalId || tx.id;
      const event = await writeLedgerEvent({
        eventType: 'payment.received',
        occurredAt: tx.date,
        source: 'local_budget',
        sourceId,
        actorType: 'system',
        payload: {
          localBudgetTxId: tx.id,
          amountCents: toCents(tx.amount),
          direction: 'inflow',
          classification: tx.classification,
          merchantName: (tx.merchantName || '').trim() || null,
          description: tx.description || null,
          customerEntityId: null,           // LB income carries no payer
          squareMatchPending: true,         // a later pass joins to a Square payout/customer
        },
      });
      if (event._existing) stats.incomeExisting++; else stats.incomeWritten++;
    } catch (err) {
      stats.errors.push(`income ${tx.id}: ${err.message}`);
      if (stats.errors.length > 30) break;
    }
  }

  logger?.info(stats, 'brain/local-budget: sync complete');
  return { ok: true, ...stats };
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

function registerLocalBudgetRoutes(app, { logger } = {}) {
  const runHandler = async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      const isCron = req.headers['x-vercel-cron'] === '1'
        || String(req.headers['user-agent'] || '').startsWith('vercel-cron');
      if (!admin && !isCron && !hasBrainAdminHeader(req)) {
        return res.status(403).json({ error: 'admin only' });
      }
      if (running) return res.status(409).json({ error: 'sync already running', lastRun });

      const sinceDays = req.body?.sinceDays || req.query?.sinceDays
        ? Math.min(Math.max(parseInt(req.body?.sinceDays || req.query?.sinceDays) || 0, 1), 1825)
        : null;

      running = true;
      const { withJobRun } = require('./jobRuns');
      withJobRun('local-budget-sync', () => runLocalBudgetSync({ logger, sinceDays }))
        .then((result) => { lastRun = { completedAt: new Date().toISOString(), sinceDays, ...result }; })
        .catch((err) => logger?.error({ err }, 'brain/local-budget: run error'))
        .finally(() => { running = false; });

      return res.json({ ok: true, status: 'started', sinceDays });
    } catch (err) {
      logger?.error({ err }, 'brain/local-budget: trigger error');
      return res.status(500).json({ error: 'internal-error' });
    }
  };
  app.post('/api/brain/local-budget/sync', runHandler);
  app.get('/api/brain/local-budget/sync', runHandler);
}

module.exports = { runLocalBudgetSync, registerLocalBudgetRoutes };
