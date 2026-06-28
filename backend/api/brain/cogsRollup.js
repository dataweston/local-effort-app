/**
 * COGS spend rollup (Track C, Phase 0).
 *
 * Full recipe costing needs per-ingredient price+unit from Local Budget receipts
 * (not yet ingested — items=0, line_items are non-food). What LB DOES have today
 * is COGS-classified spend per vendor. This rollup turns that into vendor-level
 * food-cost intelligence: for each Vendor with COGS payment.completed events,
 * compute total + monthly breakdown and write a SPEND_HISTORY assertion carrying
 * the metric. Answers "what do I spend on food, by supplier, over time" and is
 * the foundation the per-ingredient layer will sit on.
 *
 * Source: payment.completed events (source='local_budget', classification=COGS)
 * keyed by the resolved vendorEntityId (Track B + resolver guarantee 99% have it).
 *
 * Writes ONE current SPEND_HISTORY self-assertion per vendor (Vendor->Vendor with
 * relType SPEND_HISTORY, metadata = rollup). Supersedes the prior one (knownUntil)
 * so history is preserved and the graph shows the latest rollup. Idempotent per run.
 */

const crypto = require('crypto');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent } = require('./ledger');

const verifyAdminRequest = createAdminVerifier();

async function runCogsRollup({ logger } = {}) {
  const prisma = getPrisma();

  const events = await prisma.ledgerEvent.findMany({
    where: {
      eventType: 'payment.completed',
      source: 'local_budget',
      tombstonedAt: null,
    },
    select: { occurredAt: true, payload: true },
  });

  // Bucket COGS spend by vendorEntityId.
  const byVendor = new Map();
  for (const ev of events) {
    const pl = ev.payload || {};
    if (pl.classification !== 'COGS') continue;
    const vid = pl.vendorEntityId;
    if (!vid) continue;
    if (!byVendor.has(vid)) byVendor.set(vid, { totalCents: 0, count: 0, byMonth: {}, first: null, last: null });
    const b = byVendor.get(vid);
    const cents = Number(pl.amountCents || 0);
    b.totalCents += cents;
    b.count += 1;
    const month = new Date(ev.occurredAt).toISOString().slice(0, 7);
    b.byMonth[month] = (b.byMonth[month] || 0) + cents;
    const d = new Date(ev.occurredAt);
    if (!b.first || d < b.first) b.first = d;
    if (!b.last || d > b.last) b.last = d;
  }

  const now = new Date();
  let written = 0, superseded = 0, skipped = 0;
  const top = [];

  for (const [vid, b] of byVendor) {
    const vendor = await prisma.brainEntity.findFirst({
      where: { id: vid, entityType: 'Vendor', tombstonedAt: null },
      select: { id: true, name: true },
    });
    if (!vendor) { skipped++; continue; }

    const metadata = {
      kind: 'cogs_spend',
      totalCents: b.totalCents,
      totalDollars: (b.totalCents / 100).toFixed(2),
      txCount: b.count,
      byMonth: b.byMonth,
      firstSpendAt: b.first?.toISOString() || null,
      lastSpendAt: b.last?.toISOString() || null,
      computedAt: now.toISOString(),
    };

    // Supersede prior current rollup for this vendor.
    const prior = await prisma.brainAssertion.findFirst({
      where: { srcId: vid, dstId: vid, relType: 'SPEND_HISTORY', knownUntil: null, retractedAt: null,
        metadata: { path: ['kind'], equals: 'cogs_spend' } },
    });

    const created = await prisma.brainAssertion.create({
      data: {
        srcId: vid, dstId: vid, relType: 'SPEND_HISTORY',
        metadata, confidence: 1.0, sourceType: 'cogs_rollup', createdBy: 'system:cogs_rollup',
        validFrom: b.last || now, knownFrom: now, provisional: false,
      },
    });
    if (prior) {
      await prisma.brainAssertion.update({
        where: { id: prior.id },
        data: { knownUntil: now, supersededBy: created.id, supersededAt: now, supersededReason: 'cogs_rollup_recompute' },
      });
      superseded++;
    }
    written++;
    top.push({ vendor: vendor.name, totalDollars: metadata.totalDollars, txCount: b.count });
  }

  top.sort((a, b) => Number(b.totalDollars) - Number(a.totalDollars));
  const grandTotalCents = [...byVendor.values()].reduce((s, b) => s + b.totalCents, 0);

  await writeLedgerEvent({
    eventType: 'cogs.rollup.run', source: 'cogs_rollup', actorType: 'system',
    payload: { vendorsWritten: written, superseded, skipped, grandTotalDollars: (grandTotalCents / 100).toFixed(2) },
  });

  logger?.info({ written, superseded, skipped, grandTotalCents }, 'brain/cogs-rollup: complete');
  return { written, superseded, skipped, grandTotalDollars: (grandTotalCents / 100).toFixed(2), top: top.slice(0, 15) };
}

// ── Route ─────────────────────────────────────────────────────────────────────

function hasBrainAdminHeader(req) {
  const provided = String(req.headers['x-brain-admin-key'] || '');
  const expected = process.env.BRAIN_ADMIN_KEY || '';
  if (!provided || !expected || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

function registerCogsRollupRoutes(app, { logger } = {}) {
  const runHandler = async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      const isCron = req.headers['x-vercel-cron'] === '1'
        || String(req.headers['user-agent'] || '').startsWith('vercel-cron');
      if (!admin && !isCron && !hasBrainAdminHeader(req)) return res.status(403).json({ error: 'admin only' });
      const { withJobRun } = require('./jobRuns');
      const result = await withJobRun('cogs-rollup', () => runCogsRollup({ logger }));
      return res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error({ err }, 'brain/cogs-rollup: error');
      return res.status(500).json({ error: 'internal-error' });
    }
  };
  app.post('/api/brain/cogs-rollup/run', runHandler);
  app.get('/api/brain/cogs-rollup/run', runHandler);
}

module.exports = { runCogsRollup, registerCogsRollupRoutes };
