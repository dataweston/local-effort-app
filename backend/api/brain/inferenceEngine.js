/**
 * Brain inference engine — nightly SQL-level signal computation.
 *
 * Computes inference types from the LedgerEvent log:
 *   PREFERS       — vendor paid repeatedly (≥3 times in 90 days)
 *   AVOIDS        — vendor used to appear, has gone silent (>60 days, ≥2 prior)
 *   CHURNING      — customer order frequency dropping (last period < half of prior)
 *   PRICE_DRIFT   — average payment to vendor shifted >15% vs prior 90-day window
 *   REPEAT_CUSTOMER — customer placed ≥2 orders in the last year
 *   CHANNEL_TRAFFIC_TREND — web channel sessions moved ≥30% (28d vs prior 28d)
 *   WEB_CONVERSION — meal-prep intake submissions vs intake-page sessions
 *
 * Each run:
 *   1. Supersedes any prior inference of the same type + entity pair
 *   2. Writes a new BrainInference row
 *   3. Marks stale inferences that reference tombstoned/inactive entities
 */

const { getPrisma } = require('../utils/prisma');
const { canonicalName } = require('./ledger');

const DECAY_RATES = {
  PREFERS: 'slow',          // vendor relationship — stable
  AVOIDS: 'medium',         // could resume ordering
  CHURNING: 'fast',         // customer state changes quickly
  PRICE_DRIFT: 'medium',
  REPEAT_CUSTOMER: 'slow',  // loyalty is a durable trait
  CHANNEL_TRAFFIC_TREND: 'fast',  // web traffic shifts week to week
  WEB_CONVERSION: 'medium',
};

// ── helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000);
}

function confidence(score, max) {
  return Math.min(1.0, score / max);
}

// Bucket payment events by the resolved vendorEntityId when the entity-id
// backfill has stamped it, else by normalised merchantName. Preferring the
// resolved id makes the vendor inference jobs agree with the hypothesis engine.
function bucketVendorEvents(events) {
  const buckets = new Map();
  for (const ev of events) {
    const entityId = ev.payload?.vendorEntityId || null;
    const name = ev.payload?.merchantName;
    const key = entityId || (name ? name.toLowerCase().trim() : null);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, { evs: [], entityId, name: name || null });
    buckets.get(key).evs.push(ev);
  }
  return buckets;
}

async function resolveVendor(prisma, key, entityId) {
  if (entityId) {
    return prisma.brainEntity.findFirst({
      where: { id: entityId, entityType: 'Vendor', tombstonedAt: null, status: 'active' },
      select: { id: true, name: true },
    });
  }
  return prisma.brainEntity.findFirst({
    where: { entityType: 'Vendor', tombstonedAt: null, status: 'active', aliases: { some: { alias: key } } },
    select: { id: true, name: true },
  });
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

  // Bucket by resolved vendorEntityId when present, else normalised merchant name.
  const buckets = bucketVendorEvents(events);

  const results = [];
  for (const [key, { evs, entityId }] of buckets) {
    if (evs.length < 3) continue;

    const entity = await resolveVendor(prisma, key, entityId);
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

  const buckets = bucketVendorEvents(events);

  const results = [];
  for (const [key, { evs, entityId }] of buckets) {
    if (evs.length < 2) continue;
    const latest = new Date(evs[0].occurredAt);
    if (latest >= recentCutoff) continue; // still active

    const entity = await resolveVendor(prisma, key, entityId);
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

  // Bucket by the resolved customer entity id when present (written by the
  // entity-id backfill / ingest resolver), else by the raw Square customerId.
  // Preferring customerEntityId makes this engine agree with the hypothesis
  // engine, which keys on the same resolved id.
  const buckets = new Map();
  for (const ev of events) {
    const cid = ev.payload?.customerEntityId || ev.payload?.customerId || ev.payload?.customer_id;
    if (!cid) continue;
    if (!buckets.has(cid)) buckets.set(cid, { prior: [], recent: [], resolved: !!ev.payload?.customerEntityId });
    const d = new Date(ev.occurredAt);
    if (d < period2Start) {
      buckets.get(cid).prior.push(ev);
    } else {
      buckets.get(cid).recent.push(ev);
    }
  }

  const results = [];
  for (const [cid, { prior, recent, resolved }] of buckets) {
    if (prior.length < 2) continue;
    if (recent.length * 2 >= prior.length) continue; // not churning

    const entity = await prisma.brainEntity.findFirst({
      where: {
        tombstonedAt: null,
        status: 'active',
        ...(resolved ? { id: cid } : { squareCustomerId: cid }),
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

// ── REPEAT_CUSTOMER ─────────────────────────────────────────────────────────
// Customer placed ≥2 orders in the last year — the positive counterpart to
// CHURNING. Runs off order.placed (Square), which exists today. NOTE: most
// Square tickets are anonymous (customerId null), so this only sees customers
// Square attached an id to; that's a data-coverage limit, not a code one.
// Unresolved ids still produce an inference (anchored to a Customer entity when
// one matches; skipped only if truly unresolvable) so coverage stays visible.

async function computeRepeatCustomer(prisma, now) {
  const windowStart = daysAgo(365);

  const events = await prisma.ledgerEvent.findMany({
    where: {
      eventType: { in: ['order.placed', 'payment.completed'] },
      occurredAt: { gte: windowStart },
      tombstonedAt: null,
      source: { in: ['square', 'local_effort'] },
    },
    select: { id: true, payload: true, occurredAt: true },
  });

  // Bucket by the resolved customer entity id when present, else raw Square id.
  // The customerEntityId (from the entity-id backfill / resolver) is the shared
  // key the hypothesis engine also reads.
  const buckets = new Map();
  for (const ev of events) {
    const cid = ev.payload?.customerEntityId || ev.payload?.customerId || ev.payload?.customer_id;
    if (!cid) continue; // anonymous ticket — can't attribute to a customer
    if (!buckets.has(cid)) buckets.set(cid, { evs: [], resolved: !!ev.payload?.customerEntityId });
    buckets.get(cid).evs.push(ev);
  }

  const results = [];
  for (const [cid, { evs, resolved }] of buckets) {
    if (evs.length < 2) continue; // a single order isn't a repeat

    // Resolve to a brain Customer. If the id is already a resolved entity id,
    // match by primary key; else fall back to squareCustomerId/alias.
    const entity = await prisma.brainEntity.findFirst({
      where: resolved
        ? { id: cid, entityType: 'Customer', tombstonedAt: null, status: 'active' }
        : {
            entityType: 'Customer',
            tombstonedAt: null,
            status: 'active',
            OR: [
              { squareCustomerId: cid },
              { properties: { path: ['squareCustomerId'], equals: cid } },
              { aliases: { some: { alias: cid } } },
            ],
          },
      select: { id: true, name: true },
    });
    if (!entity) continue; // no entity to anchor the inference to yet

    const ordered = evs.map(e => new Date(e.occurredAt)).sort((a, b) => b - a);
    const last = ordered[0];
    const daysSinceLast = Math.floor((now - last) / 86_400_000);
    // Confidence grows with order count, capped at 10 orders.
    const conf = confidence(evs.length, 10);
    const summary =
      `Repeat customer — ${evs.length} orders in last 12 months` +
      (daysSinceLast <= 45 ? ' (active)' : `, last ${daysSinceLast} days ago`);
    results.push({ entity, evIds: evs.map(e => e.id), conf, summary });
  }
  return results;
}

// ── PRICE_DRIFT ───────────────────────────────────────────────────────────────
// Per-unit price of an item bought from a vendor shifted >15% in the last 90
// days vs the prior 90 — falling back to average payment size where no
// line-item evidence exists.
//
// The average-payment version is a proxy that cannot tell a price rise from a
// bigger order. Local Budget now exports per-line unit prices
// (localBudgetItemsSync.js), so where those exist the drift is measured on the
// thing actually named: "Flour up 22%" instead of "payments up 22%".

const PRICE_DRIFT_MIN_OBSERVATIONS = 2;

/**
 * Unit-price drift per vendor, from purchased line items. Returns a Map keyed by
 * the same vendor key the payment buckets use, so either evidence source can
 * answer for a vendor.
 */
function bucketUnitPriceDrift(lineEvents, period2Start) {
  const byVendorItem = new Map();
  for (const ev of lineEvents) {
    const payload = ev.payload || {};
    if (payload.lineRole !== 'purchased') continue;
    const unitPriceCents = Number(payload.unitPriceCents);
    if (!Number.isFinite(unitPriceCents) || unitPriceCents <= 0) continue;

    const vendorKey = payload.vendorEntityId
      || (payload.merchantName ? String(payload.merchantName).toLowerCase().trim() : null);
    const itemName = payload.itemName || payload.description;
    if (!vendorKey || !itemName) continue;

    const key = `${vendorKey}::${String(itemName).toLowerCase().trim()}`;
    if (!byVendorItem.has(key)) {
      byVendorItem.set(key, {
        vendorKey,
        vendorEntityId: payload.vendorEntityId || null,
        itemName,
        unit: payload.unitOfMeasure || null,
        prior: [],
        recent: [],
      });
    }
    const bucket = byVendorItem.get(key);
    const target = new Date(ev.occurredAt) < period2Start ? bucket.prior : bucket.recent;
    target.push({ id: ev.id, unitPriceCents });
  }

  // Keep, per vendor, the item whose price moved most — that is the one worth
  // telling the operator about.
  const byVendor = new Map();
  for (const bucket of byVendorItem.values()) {
    if (bucket.prior.length < PRICE_DRIFT_MIN_OBSERVATIONS) continue;
    if (bucket.recent.length < PRICE_DRIFT_MIN_OBSERVATIONS) continue;

    const avg = (rows) => rows.reduce((sum, row) => sum + row.unitPriceCents, 0) / rows.length;
    const priorAvg = avg(bucket.prior);
    const recentAvg = avg(bucket.recent);
    if (priorAvg === 0) continue;

    const drift = (recentAvg - priorAvg) / priorAvg;
    const existing = byVendor.get(bucket.vendorKey);
    if (existing && Math.abs(existing.drift) >= Math.abs(drift)) continue;

    byVendor.set(bucket.vendorKey, {
      vendorKey: bucket.vendorKey,
      vendorEntityId: bucket.vendorEntityId,
      itemName: bucket.itemName,
      unit: bucket.unit,
      drift,
      priorAvg,
      recentAvg,
      evIds: [...bucket.prior, ...bucket.recent].map((row) => row.id),
      observations: bucket.prior.length + bucket.recent.length,
    });
  }
  return byVendor;
}

async function computePriceDrift(prisma, now) {
  const period2Start = daysAgo(90);
  const period1Start = daysAgo(180);

  const [events, lineEvents] = await Promise.all([
    prisma.ledgerEvent.findMany({
      where: {
        eventType: 'payment.completed',
        occurredAt: { gte: period1Start },
        tombstonedAt: null,
      },
      select: { id: true, payload: true, occurredAt: true },
    }),
    prisma.ledgerEvent.findMany({
      where: {
        eventType: 'line_item.recorded',
        occurredAt: { gte: period1Start },
        tombstonedAt: null,
      },
      select: { id: true, payload: true, occurredAt: true },
    }),
  ]);

  const unitDriftByVendor = bucketUnitPriceDrift(lineEvents, period2Start);

  const buckets = new Map();
  for (const ev of events) {
    const entityId = ev.payload?.vendorEntityId || null;
    const name = ev.payload?.merchantName;
    const key = entityId || (name ? name.toLowerCase().trim() : null);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, { prior: [], recent: [], entityId });
    const d = new Date(ev.occurredAt);
    if (d < period2Start) {
      buckets.get(key).prior.push(ev);
    } else {
      buckets.get(key).recent.push(ev);
    }
  }

  const results = [];
  const seenVendorKeys = new Set();

  // Unit-price evidence first: it measures price, not order size.
  for (const [key, unit] of unitDriftByVendor) {
    if (Math.abs(unit.drift) < 0.15) continue;
    const entity = await resolveVendor(prisma, key, unit.vendorEntityId);
    if (!entity) continue;

    const pct = Math.round(unit.drift * 100);
    const dir = unit.drift > 0 ? 'up' : 'down';
    const per = unit.unit ? ` per ${unit.unit}` : '';
    results.push({
      entity,
      evIds: unit.evIds,
      conf: confidence(Math.min(Math.abs(pct), 80), 80),
      summary: `${unit.itemName} unit price ${dir} ${Math.abs(pct)}%${per} vs prior 90 days ($${(unit.recentAvg / 100).toFixed(2)} vs $${(unit.priorAvg / 100).toFixed(2)}, ${unit.observations} line items)`,
      drift: unit.drift,
    });
    seenVendorKeys.add(key);
  }

  for (const [key, { prior, recent, entityId }] of buckets) {
    // A vendor with real unit prices has already been answered above; adding the
    // average-payment proxy on top would contradict it with weaker evidence.
    if (seenVendorKeys.has(key) || unitDriftByVendor.has(key)) continue;
    if (prior.length < 2 || recent.length < 2) continue;

    const avg = arr => arr.reduce((s, e) => s + (e.payload?.amountCents || 0), 0) / arr.length;
    const priorAvg = avg(prior);
    const recentAvg = avg(recent);
    if (priorAvg === 0) continue;

    const drift = (recentAvg - priorAvg) / priorAvg;
    if (Math.abs(drift) < 0.15) continue;

    const entity = await resolveVendor(prisma, key, entityId);
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

// ── CHANNEL_TRAFFIC_TREND ────────────────────────────────────────────────────
// Web channel sessions moved ≥30% last 28 days vs the prior 28 days. Entities
// are the `Web: <group>` Channel nodes the Google graph projector maintains —
// if the projector hasn't run yet for a group, that group is skipped.

async function computeChannelTrafficTrend(prisma, now) {
  const windowMs = 28 * 86_400_000;
  const recentStart = new Date(now.getTime() - windowMs);
  const priorStart = new Date(now.getTime() - 2 * windowMs);

  const events = await prisma.ledgerEvent.findMany({
    where: {
      eventType: 'web.traffic.daily',
      occurredAt: { gte: priorStart },
      tombstonedAt: null,
      payload: { path: ['reportType'], equals: 'acquisition' },
    },
    select: { id: true, occurredAt: true, payload: true },
  });

  const groups = new Map(); // channelGroup → { recent, prior, evIds }
  for (const ev of events) {
    const group = String(ev.payload?.sessionDefaultChannelGroup || 'Unassigned').trim() || 'Unassigned';
    let rec = groups.get(group);
    if (!rec) { rec = { recent: 0, prior: 0, evIds: [] }; groups.set(group, rec); }
    const sessions = Number(ev.payload?.sessions || 0);
    if (ev.occurredAt >= recentStart) rec.recent += sessions;
    else rec.prior += sessions;
    rec.evIds.push(ev.id);
  }

  const results = [];
  for (const [group, rec] of groups) {
    // Volume floor: percentage swings on a handful of sessions are noise.
    if (Math.max(rec.recent, rec.prior) < 20) continue;
    if (rec.prior === 0) continue; // new channel group; trend undefined
    const delta = (rec.recent - rec.prior) / rec.prior;
    if (Math.abs(delta) < 0.30) continue;

    const entity = await prisma.brainEntity.findFirst({
      where: { entityType: 'Channel', tombstonedAt: null, canonicalName: canonicalName(`Web: ${group}`) },
      select: { id: true, name: true },
    });
    if (!entity) continue;

    const pct = Math.round(delta * 100);
    const dir = delta > 0 ? 'up' : 'down';
    const conf = confidence(Math.min(Math.abs(pct), 100), 100);
    const summary = `Web sessions ${dir} ${Math.abs(pct)}% vs prior 28 days (${rec.recent} vs ${rec.prior})`;
    results.push({ entity, evIds: rec.evIds.slice(0, 50), conf, summary });
  }
  return results;
}

// ── WEB_CONVERSION ───────────────────────────────────────────────────────────
// Meal-prep intake submissions vs sessions on the intake landing page, last
// 28 days vs prior. The one web conversion loop that is fully instrumented
// today (GA4 landing_page events + intake.meal_prep.submitted).

async function computeWebConversion(prisma, now) {
  const windowMs = 28 * 86_400_000;
  const recentStart = new Date(now.getTime() - windowMs);
  const priorStart = new Date(now.getTime() - 2 * windowMs);

  const [pageEvents, intakes] = await Promise.all([
    prisma.ledgerEvent.findMany({
      where: {
        eventType: 'web.traffic.daily',
        occurredAt: { gte: priorStart },
        tombstonedAt: null,
        payload: { path: ['landingPage'], equals: '/meal-prep-intake' },
      },
      select: { id: true, occurredAt: true, payload: true },
    }),
    prisma.ledgerEvent.findMany({
      where: { eventType: 'intake.meal_prep.submitted', occurredAt: { gte: priorStart }, tombstonedAt: null },
      select: { id: true, occurredAt: true },
    }),
  ]);

  let recentSessions = 0, priorSessions = 0;
  for (const ev of pageEvents) {
    const s = Number(ev.payload?.sessions || 0);
    if (ev.occurredAt >= recentStart) recentSessions += s;
    else priorSessions += s;
  }
  const recentIntakes = intakes.filter((e) => e.occurredAt >= recentStart).length;
  const priorIntakes = intakes.length - recentIntakes;

  if (recentSessions === 0 && recentIntakes === 0) return [];

  const entity = await prisma.brainEntity.findFirst({
    where: { entityType: 'Offer', tombstonedAt: null, canonicalName: canonicalName('Weekly Meal Prep') },
    select: { id: true, name: true },
  });
  if (!entity) return [];

  const rate = recentSessions > 0 ? Math.round((recentIntakes / recentSessions) * 100) : null;
  const summary = `${recentIntakes} intake submission${recentIntakes === 1 ? '' : 's'} from ${recentSessions} intake-page sessions`
    + (rate === null ? '' : ` (${rate}%)`)
    + ` last 28 days (prior 28d: ${priorIntakes}/${priorSessions})`;
  const evIds = [...pageEvents.map((e) => e.id).slice(0, 30), ...intakes.map((e) => e.id)];
  return [{ entity, evIds, conf: 0.8, summary }];
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

// ── Source-data diagnostics ─────────────────────────────────────────────────
// Three of the four jobs read `payment.completed` ledger events, which the
// data audit (docs/brain-data-audit.md) found to be ZERO — the Square payment
// webhook ingest is gated off and Local Budget's payment export was never
// wired up (see docs/local-budget-integration.md). When that source is empty
// the jobs silently write nothing, which is why the inference layer looked
// "dead". This makes the empty-source condition loud and explicit instead.

const JOB_SOURCE = {
  PREFERS:     { eventType: 'payment.completed' },
  AVOIDS:      { eventType: 'payment.completed' },
  PRICE_DRIFT: { eventType: 'payment.completed' },
  CHURNING:        { eventType: { in: ['order.placed', 'payment.completed'] } },
  REPEAT_CUSTOMER: { eventType: { in: ['order.placed', 'payment.completed'] } },
  CHANNEL_TRAFFIC_TREND: { eventType: 'web.traffic.daily' },
  WEB_CONVERSION:        { eventType: 'web.traffic.daily' },
};

async function inputDiagnostics(prisma) {
  const [payments, orders, webTraffic] = await Promise.all([
    prisma.ledgerEvent.count({ where: { eventType: 'payment.completed', tombstonedAt: null } }),
    prisma.ledgerEvent.count({ where: { eventType: 'order.placed', tombstonedAt: null } }),
    prisma.ledgerEvent.count({ where: { eventType: 'web.traffic.daily', tombstonedAt: null } }),
  ]);
  return { payments, orders, webTraffic };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Run the full nightly inference pass.
 * @returns {{ written, superseded, staleMarked, errors, diagnostics }}
 */
async function runInferencePass({ logger } = {}) {
  const prisma = getPrisma();
  const now = new Date();
  let written = 0;
  let superseded = 0;
  const errors = [];

  // Surface the root cause up front: which inputs actually exist tonight.
  const diagnostics = await inputDiagnostics(prisma);
  if (diagnostics.payments === 0) {
    logger?.warn(
      { ...diagnostics, blocked: ['PREFERS', 'AVOIDS', 'PRICE_DRIFT'] },
      'brain/inference: 0 payment.completed events — PREFERS/AVOIDS/PRICE_DRIFT can produce nothing. ' +
      'Root cause: no payment stream ingested (Square webhook gated off + Local Budget export unwired). ' +
      'See docs/local-budget-integration.md.'
    );
  }
  if (diagnostics.orders === 0) {
    logger?.warn({ ...diagnostics, blocked: ['CHURNING', 'REPEAT_CUSTOMER'] },
      'brain/inference: 0 order.placed events — CHURNING/REPEAT_CUSTOMER can produce nothing. Run the Square orders sync.');
  }

  const jobs = [
    { name: 'PREFERS',         fn: computePrefers },
    { name: 'AVOIDS',          fn: computeAvoids },
    { name: 'CHURNING',        fn: computeChurning },
    { name: 'REPEAT_CUSTOMER', fn: computeRepeatCustomer },
    { name: 'PRICE_DRIFT',     fn: computePriceDrift },
    { name: 'CHANNEL_TRAFFIC_TREND', fn: computeChannelTrafficTrend },
    { name: 'WEB_CONVERSION',  fn: computeWebConversion },
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
      // Distinguish "ran but found nothing" from "no input data at all" so a
      // zero result isn't mistaken for a healthy quiet night.
      const ordersJob = name === 'CHURNING' || name === 'REPEAT_CUSTOMER';
      const webJob = name === 'CHANNEL_TRAFFIC_TREND' || name === 'WEB_CONVERSION';
      const sourceEmpty =
        (JOB_SOURCE[name]?.eventType === 'payment.completed' && diagnostics.payments === 0) ||
        (ordersJob && diagnostics.payments === 0 && diagnostics.orders === 0) ||
        (webJob && diagnostics.webTraffic === 0);
      if (candidates.length === 0 && sourceEmpty) {
        logger?.warn({ name }, `brain/inference: ${name} produced 0 — its source ledger events do not exist (not a quiet night).`);
      } else {
        logger?.info({ name, count: candidates.length }, 'brain/inference: job complete');
      }
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
      logger?.error({ err, name }, 'brain/inference: job failed');
    }
  }

  // Business-level inferences (cashflow, COGS ratio, seasonality, dish demand) —
  // computed from the now-live payment + order streams.
  try {
    const { runBusinessInferences } = require('./businessInferences');
    const biz = await runBusinessInferences({ logger });
    written += biz.written;
    for (const e of biz.errors) errors.push(`business:${e}`);
  } catch (err) {
    errors.push(`business: ${err.message}`);
    logger?.error({ err }, 'brain/inference: business inferences failed');
  }

  const staleMarked = await markStaleInferences(prisma, now);
  logger?.info({ written, superseded, staleMarked, errors: errors.length, diagnostics }, 'brain/inference: pass complete');

  return { written, superseded, staleMarked, errors, diagnostics };
}

module.exports = { runInferencePass, __internals: { bucketUnitPriceDrift } };
