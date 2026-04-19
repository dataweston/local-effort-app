/**
 * Brain inference engine — nightly SQL-level signal computation.
 *
 * Computes four inference types from the LedgerEvent log:
 *   PREFERS       — vendor paid repeatedly (≥3 times in 90 days)
 *   AVOIDS        — vendor used to appear, has gone silent (>60 days, ≥2 prior)
 *   CHURNING      — customer order frequency dropping (last period < half of prior)
 *   PRICE_DRIFT   — average payment to vendor shifted >15% vs prior 90-day window
 *
 * Each run:
 *   1. Supersedes any prior inference of the same type + entity pair
 *   2. Writes a new BrainInference row
 *   3. Marks stale inferences that reference tombstoned/inactive entities
 */

const { getPrisma } = require('../utils/prisma');

const DECAY_RATES = {
  PREFERS: 'slow',       // vendor relationship — stable
  AVOIDS: 'medium',      // could resume ordering
  CHURNING: 'fast',      // customer state changes quickly
  PRICE_DRIFT: 'medium',
};

// ── helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000);
}

function confidence(score, max) {
  return Math.min(1.0, score / max);
}

// ── PREFERS ──────────────────────────────────────────────────────────────────
// Vendor paid ≥3 times in last 90 days

async function computePrefers(prisma, now) {
  const cutoff = daysAgo(90);

  // Group payment.completed ledger events by source (vendor identity from payload.merchantName)
  const events = await prisma.ledgerEvent.findMany({
    where: {
      eventType: 'payment.completed',
      occurredAt: { gte: cutoff },
      tombstonedAt: null,
    },
    select: { id: true, payload: true, occurredAt: true },
  });

  // Bucket by normalised merchant name
  const buckets = new Map();
  for (const ev of events) {
    const name = ev.payload?.merchantName;
    if (!name) continue;
    const key = name.toLowerCase().trim();
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(ev);
  }

  const results = [];
  for (const [name, evs] of buckets) {
    if (evs.length < 3) continue;

    // Resolve entity
    const entity = await prisma.brainEntity.findFirst({
      where: {
        entityType: 'Vendor',
        tombstonedAt: null,
        status: 'active',
        aliases: { some: { alias: name } },
      },
      select: { id: true, name: true },
    });
    if (!entity) continue;

    const conf = confidence(evs.length, 12);
    const summary = `Paid ${evs.length}× in last 90 days — regular vendor`;
    results.push({ entity, evIds: evs.map(e => e.id), conf, summary });
  }
  return results;
}

// ── AVOIDS ───────────────────────────────────────────────────────────────────
// Vendor had ≥2 payments, last one was >60 days ago

async function computeAvoids(prisma, now) {
  const recentCutoff = daysAgo(60);
  const historyStart = daysAgo(365);

  const events = await prisma.ledgerEvent.findMany({
    where: {
      eventType: 'payment.completed',
      occurredAt: { gte: historyStart },
      tombstonedAt: null,
    },
    select: { id: true, payload: true, occurredAt: true },
    orderBy: { occurredAt: 'desc' },
  });

  const buckets = new Map();
  for (const ev of events) {
    const name = ev.payload?.merchantName;
    if (!name) continue;
    const key = name.toLowerCase().trim();
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(ev);
  }

  const results = [];
  for (const [name, evs] of buckets) {
    if (evs.length < 2) continue;
    const latest = new Date(evs[0].occurredAt);
    if (latest >= recentCutoff) continue; // still active

    const entity = await prisma.brainEntity.findFirst({
      where: {
        entityType: 'Vendor',
        tombstonedAt: null,
        status: 'active',
        aliases: { some: { alias: name } },
      },
      select: { id: true, name: true },
    });
    if (!entity) continue;

    const daysSince = Math.floor((now - latest) / 86_400_000);
    const conf = confidence(Math.min(daysSince, 180), 180);
    const summary = `No payment in ${daysSince} days — previously used ${evs.length}×`;
    results.push({ entity, evIds: evs.map(e => e.id), conf, summary });
  }
  return results;
}

// ── CHURNING ─────────────────────────────────────────────────────────────────
// Customer: orders in last 30 days < half of orders in prior 30 days

async function computeChurning(prisma, now) {
  const period1Start = daysAgo(60);
  const period2Start = daysAgo(30);

  const events = await prisma.ledgerEvent.findMany({
    where: {
      eventType: { in: ['order.placed', 'payment.completed'] },
      occurredAt: { gte: period1Start },
      tombstonedAt: null,
      source: { in: ['square', 'local_effort'] },
    },
    select: { id: true, payload: true, occurredAt: true },
  });

  // Bucket by customerId
  const buckets = new Map();
  for (const ev of events) {
    const cid = ev.payload?.customerId || ev.payload?.customer_id;
    if (!cid) continue;
    if (!buckets.has(cid)) buckets.set(cid, { prior: [], recent: [] });
    const d = new Date(ev.occurredAt);
    if (d < period2Start) {
      buckets.get(cid).prior.push(ev);
    } else {
      buckets.get(cid).recent.push(ev);
    }
  }

  const results = [];
  for (const [cid, { prior, recent }] of buckets) {
    if (prior.length < 2) continue;
    if (recent.length * 2 >= prior.length) continue; // not churning

    const entity = await prisma.brainEntity.findFirst({
      where: {
        squareCustomerId: cid,
        tombstonedAt: null,
        status: 'active',
      },
      select: { id: true, name: true },
    });
    if (!entity) continue;

    const drop = Math.round((1 - recent.length / prior.length) * 100);
    const conf = confidence(drop, 100);
    const summary = `Order frequency down ${drop}% vs prior 30 days (${recent.length} vs ${prior.length} orders)`;
    const allIds = [...prior, ...recent].map(e => e.id);
    results.push({ entity, evIds: allIds, conf, summary });
  }
  return results;
}

// ── PRICE_DRIFT ───────────────────────────────────────────────────────────────
// Avg payment to vendor shifted >15% in last 90 days vs prior 90 days

async function computePriceDrift(prisma, now) {
  const period2Start = daysAgo(90);
  const period1Start = daysAgo(180);

  const events = await prisma.ledgerEvent.findMany({
    where: {
      eventType: 'payment.completed',
      occurredAt: { gte: period1Start },
      tombstonedAt: null,
    },
    select: { id: true, payload: true, occurredAt: true },
  });

  const buckets = new Map();
  for (const ev of events) {
    const name = ev.payload?.merchantName;
    if (!name) continue;
    const key = name.toLowerCase().trim();
    if (!buckets.has(key)) buckets.set(key, { prior: [], recent: [] });
    const d = new Date(ev.occurredAt);
    if (d < period2Start) {
      buckets.get(key).prior.push(ev);
    } else {
      buckets.get(key).recent.push(ev);
    }
  }

  const results = [];
  for (const [name, { prior, recent }] of buckets) {
    if (prior.length < 2 || recent.length < 2) continue;

    const avg = arr => arr.reduce((s, e) => s + (e.payload?.amountCents || 0), 0) / arr.length;
    const priorAvg = avg(prior);
    const recentAvg = avg(recent);
    if (priorAvg === 0) continue;

    const drift = (recentAvg - priorAvg) / priorAvg;
    if (Math.abs(drift) < 0.15) continue;

    const entity = await prisma.brainEntity.findFirst({
      where: {
        entityType: 'Vendor',
        tombstonedAt: null,
        status: 'active',
        aliases: { some: { alias: name } },
      },
      select: { id: true, name: true },
    });
    if (!entity) continue;

    const pct = Math.round(drift * 100);
    const dir = drift > 0 ? 'up' : 'down';
    const conf = confidence(Math.min(Math.abs(pct), 80), 80);
    const summary = `Avg payment ${dir} ${Math.abs(pct)}% vs prior 90 days ($${(recentAvg / 100).toFixed(2)} vs $${(priorAvg / 100).toFixed(2)})`;
    const allIds = [...prior, ...recent].map(e => e.id);
    results.push({ entity, evIds: allIds, conf, summary, drift });
  }
  return results;
}

// ── Writer ────────────────────────────────────────────────────────────────────

async function upsertInference(prisma, { entity, inferenceType, conf, summary, evIds, now }) {
  // Supersede any prior active inference of this type for this entity pair
  const prior = await prisma.brainInference.findFirst({
    where: {
      srcId: entity.id,
      dstId: entity.id,
      inferenceType,
      knownUntil: null,
      supersededBy: null,
    },
  });

  const created = await prisma.brainInference.create({
    data: {
      srcId: entity.id,
      dstId: entity.id,
      inferenceType,
      confidence: conf,
      decayRate: DECAY_RATES[inferenceType] || 'medium',
      knownFrom: now,
      computedAt: now,
      computedFrom: evIds,
      summary,
      staleAt: new Date(now.getTime() + 30 * 86_400_000), // stale if not recomputed in 30 days
    },
  });

  if (prior) {
    await prisma.brainInference.update({
      where: { id: prior.id },
      data: {
        knownUntil: now,
        supersededBy: created.id,
      },
    });
  }

  return created;
}

// ── Mark stale ────────────────────────────────────────────────────────────────

async function markStaleInferences(prisma, now) {
  // Mark inferences where staleAt has passed and they haven't been superseded
  const stale = await prisma.brainInference.findMany({
    where: {
      staleAt: { lt: now },
      knownUntil: null,
      supersededBy: null,
    },
    select: { id: true, inferenceType: true },
  });

  if (stale.length === 0) return 0;

  await prisma.brainInference.updateMany({
    where: { id: { in: stale.map(s => s.id) } },
    data: { staleReason: 'not-recomputed', knownUntil: now },
  });

  return stale.length;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Run the full nightly inference pass.
 * @returns {{ written: number, superseded: number, staleMarked: number, errors: string[] }}
 */
async function runInferencePass({ logger } = {}) {
  const prisma = getPrisma();
  const now = new Date();
  let written = 0;
  let superseded = 0;
  const errors = [];

  const jobs = [
    { name: 'PREFERS',    fn: computePrefers },
    { name: 'AVOIDS',     fn: computeAvoids },
    { name: 'CHURNING',   fn: computeChurning },
    { name: 'PRICE_DRIFT',fn: computePriceDrift },
  ];

  for (const { name, fn } of jobs) {
    try {
      const candidates = await fn(prisma, now);
      for (const c of candidates) {
        try {
          const prior = await prisma.brainInference.findFirst({
            where: { srcId: c.entity.id, dstId: c.entity.id, inferenceType: name, knownUntil: null, supersededBy: null },
          });
          await upsertInference(prisma, {
            entity: c.entity,
            inferenceType: name,
            conf: c.conf,
            summary: c.summary,
            evIds: c.evIds,
            now,
          });
          written++;
          if (prior) superseded++;
        } catch (err) {
          errors.push(`${name}:${c.entity.id}: ${err.message}`);
          logger?.warn({ err, entity: c.entity.id }, `brain/inference: write error for ${name}`);
        }
      }
      logger?.info({ name, count: candidates.length }, 'brain/inference: job complete');
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
      logger?.error({ err, name }, 'brain/inference: job failed');
    }
  }

  const staleMarked = await markStaleInferences(prisma, now);
  logger?.info({ written, superseded, staleMarked, errors: errors.length }, 'brain/inference: pass complete');

  return { written, superseded, staleMarked, errors };
}

module.exports = { runInferencePass };
