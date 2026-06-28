/**
 * Business-level inferences — computed from the now-live payment + order streams.
 *
 * Unlike the vendor/customer-pair jobs in inferenceEngine.js, these are
 * business-wide metrics anchored on the "Local Effort" BusinessLine entity
 * (self-edge, src=dst), or per-dish for demand. Added 2026-06-27 once Local
 * Budget payments (payment.completed / payment.received) and Square orders
 * (order.placed + ORDERED edges) gave the brain both sides of the ledger.
 *
 *   CASHFLOW       — monthly net (received − completed), burn, runway estimate
 *   COGS_RATIO     — COGS spend as % of revenue, by month, with drift flag
 *   SEASONALITY    — per-calendar-month demand multiplier vs baseline
 *   DISH_DEMAND    — per-dish order rank folded with feedback satisfaction
 *
 * Each writes a self-anchored BrainInference and supersedes the prior one.
 */

const { getPrisma } = require('../utils/prisma');

function monthKey(d) { return new Date(d).toISOString().slice(0, 7); }

async function getBusinessAnchor(prisma) {
  return prisma.brainEntity.findFirst({
    where: { entityType: 'BusinessLine', tombstonedAt: null, name: { equals: 'Local Effort', mode: 'insensitive' } },
    select: { id: true, name: true },
  });
}

// Supersede-and-write one self-anchored inference.
async function writeBusinessInference(prisma, { anchorId, inferenceType, confidence, summary, computedFrom, decayRate, now, staleDays = 7 }) {
  const prior = await prisma.brainInference.findFirst({
    where: { srcId: anchorId, dstId: anchorId, inferenceType, knownUntil: null, supersededBy: null },
  });
  const created = await prisma.brainInference.create({
    data: {
      srcId: anchorId, dstId: anchorId, inferenceType,
      confidence, decayRate: decayRate || 'medium',
      knownFrom: now, computedAt: now, computedFrom: computedFrom || [],
      summary, staleAt: new Date(now.getTime() + staleDays * 86_400_000),
    },
  });
  if (prior) {
    await prisma.brainInference.update({ where: { id: prior.id }, data: { knownUntil: now, supersededBy: created.id } });
  }
  return created;
}

// ── CASHFLOW ────────────────────────────────────────────────────────────────
async function computeCashflow(prisma, anchorId, now) {
  const events = await prisma.ledgerEvent.findMany({
    where: { eventType: { in: ['payment.completed', 'payment.received'] }, source: 'local_budget', tombstonedAt: null },
    select: { eventType: true, occurredAt: true, payload: true },
  });
  if (events.length < 10) return null;

  const byMonth = {};
  for (const ev of events) {
    const mo = monthKey(ev.occurredAt);
    if (!byMonth[mo]) byMonth[mo] = { in: 0, out: 0 };
    const cents = Number(ev.payload?.amountCents || 0);
    if (ev.eventType === 'payment.received') byMonth[mo].in += cents;
    else byMonth[mo].out += cents;
  }
  const months = Object.keys(byMonth).sort();
  if (months.length < 2) return null;

  // Use the last up-to-3 complete months for the burn/runway estimate.
  const recent = months.slice(-4, -1); // drop the current (partial) month
  const netByMonth = recent.map(m => ({ m, net: byMonth[m].in - byMonth[m].out }));
  const avgNet = netByMonth.reduce((s, x) => s + x.net, 0) / Math.max(netByMonth.length, 1);

  const latest = months[months.length - 1];
  const latestNet = byMonth[latest].in - byMonth[latest].out;
  const trailingNet = recent.reduce((s, m) => s + (byMonth[m].in - byMonth[m].out), 0);

  const dir = avgNet >= 0 ? 'positive' : 'negative';
  const summary =
    `Cashflow ${dir}: avg net $${(avgNet / 100).toFixed(0)}/mo over ${netByMonth.length} mo ` +
    `(in $${(byMonth[latest].in / 100).toFixed(0)} / out $${(byMonth[latest].out / 100).toFixed(0)} latest).` +
    (avgNet < 0 ? ' Burning cash — net negative.' : '');

  // confidence scales with months of data
  const confidence = Math.min(1, months.length / 6);
  return {
    inferenceType: 'CASHFLOW', confidence, summary, decayRate: 'fast', staleDays: 35,
    detail: { byMonth, avgNetCents: Math.round(avgNet), latestNetCents: latestNet, trailingNetCents: trailingNet },
  };
}

// ── COGS_RATIO ───────────────────────────────────────────────────────────────
async function computeCogsRatio(prisma, anchorId, now) {
  const events = await prisma.ledgerEvent.findMany({
    where: { eventType: { in: ['payment.completed', 'payment.received'] }, source: 'local_budget', tombstonedAt: null },
    select: { eventType: true, occurredAt: true, payload: true },
  });
  if (events.length < 10) return null;

  const byMonth = {};
  for (const ev of events) {
    const mo = monthKey(ev.occurredAt);
    if (!byMonth[mo]) byMonth[mo] = { cogs: 0, revenue: 0 };
    const cents = Number(ev.payload?.amountCents || 0);
    if (ev.eventType === 'payment.received') byMonth[mo].revenue += cents;
    else if (ev.payload?.classification === 'COGS') byMonth[mo].cogs += cents;
  }
  const months = Object.keys(byMonth).sort().filter(m => byMonth[m].revenue > 0);
  if (months.length < 2) return null;

  const ratios = months.map(m => ({ m, pct: Math.round((byMonth[m].cogs / byMonth[m].revenue) * 100) }));
  const recent = ratios.slice(-3);
  const avgPct = Math.round(recent.reduce((s, r) => s + r.pct, 0) / recent.length);
  const latest = ratios[ratios.length - 1];

  // drift vs the prior window
  const prior = ratios.slice(-6, -3);
  const priorAvg = prior.length ? Math.round(prior.reduce((s, r) => s + r.pct, 0) / prior.length) : null;
  const drift = priorAvg != null ? latest.pct - priorAvg : null;

  const flag = avgPct >= 40 ? 'high' : avgPct >= 30 ? 'watch' : 'healthy';
  const summary =
    `Food cost ~${avgPct}% of revenue (last 3 mo; latest ${latest.pct}%). ` +
    (drift != null ? `Drift ${drift >= 0 ? '+' : ''}${drift}pts vs prior. ` : '') +
    `Flag: ${flag}.`;
  return {
    inferenceType: 'COGS_RATIO', confidence: Math.min(1, months.length / 4), summary, decayRate: 'medium', staleDays: 35,
    detail: { ratios, avgPct, latestPct: latest.pct, driftPts: drift, flag },
  };
}

// ── SEASONALITY ──────────────────────────────────────────────────────────────
async function computeSeasonality(prisma, anchorId, now) {
  // Use all transaction-like events with a date to build calendar-month multipliers.
  const events = await prisma.ledgerEvent.findMany({
    where: { eventType: { in: ['payment.received', 'order.placed'] }, tombstonedAt: null },
    select: { occurredAt: true },
  });
  if (events.length < 30) return null;

  const byCalMonth = {}; // 1..12 → count
  const monthsSeen = new Set();
  for (const ev of events) {
    const d = new Date(ev.occurredAt);
    const cm = d.getUTCMonth() + 1;
    byCalMonth[cm] = (byCalMonth[cm] || 0) + 1;
    monthsSeen.add(monthKey(ev.occurredAt));
  }
  // average events per calendar-month occurrence (normalize by how many times that month appeared)
  const monthOccurrences = {};
  for (const mk of monthsSeen) { const cm = Number(mk.slice(5, 7)); monthOccurrences[cm] = (monthOccurrences[cm] || 0) + 1; }
  const perMonthAvg = {};
  for (const cm of Object.keys(byCalMonth)) perMonthAvg[cm] = byCalMonth[cm] / (monthOccurrences[cm] || 1);
  const baseline = Object.values(perMonthAvg).reduce((s, v) => s + v, 0) / Object.values(perMonthAvg).length;

  const multipliers = {};
  for (const cm of Object.keys(perMonthAvg)) multipliers[cm] = Number((perMonthAvg[cm] / baseline).toFixed(2));

  // next month's multiplier
  const nextCm = (now.getUTCMonth() + 1) % 12 + 1;
  const nextMult = multipliers[nextCm];
  const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const peak = Object.entries(multipliers).sort((a, b) => b[1] - a[1])[0];

  const summary =
    `Seasonality: peak month ${names[peak[0]]} (${peak[1]}× baseline). ` +
    (nextMult ? `Next month (${names[nextCm]}) historically ${nextMult}× — ${nextMult >= 1.2 ? 'busier, prep ahead' : nextMult <= 0.8 ? 'slower' : 'typical'}.` : '');
  return {
    inferenceType: 'SEASONALITY', confidence: Math.min(1, monthsSeen.size / 12), summary, decayRate: 'slow', staleDays: 35,
    detail: { multipliers, baseline: Math.round(baseline * 100) / 100, nextMonth: nextCm, nextMultiplier: nextMult },
  };
}

// ── DISH_DEMAND (per-dish) ───────────────────────────────────────────────────
async function computeDishDemand(prisma, now) {
  // Rank dishes/products by ORDERED quantity; fold in GAVE_FEEDBACK satisfaction.
  const ordered = await prisma.brainAssertion.findMany({
    where: { relType: 'ORDERED', retractedAt: null },
    select: { dstId: true, metadata: true },
  });
  if (!ordered.length) return [];

  const byDish = new Map();
  for (const a of ordered) {
    if (!byDish.has(a.dstId)) byDish.set(a.dstId, { qty: 0, orders: 0, cents: 0 });
    const b = byDish.get(a.dstId);
    b.qty += Number(a.metadata?.quantity || 1);
    b.orders += 1;
    b.cents += Number(a.metadata?.totalCents || 0);
  }

  // Demand rank within this set (1 = most ordered).
  const ranked = [...byDish.entries()].sort((a, b) => b[1].qty - a[1].qty);
  const totalQty = ranked.reduce((s, [, d]) => s + d.qty, 0) || 1;

  const results = [];
  let rank = 0;
  for (const [dishId, d] of ranked) {
    rank++;
    const dish = await prisma.brainEntity.findFirst({ where: { id: dishId, tombstonedAt: null }, select: { id: true, name: true } });
    if (!dish) continue;

    // NOTE: there is no per-dish rating data in the brain today — GAVE_FEEDBACK
    // holds customer testimonials/subscriptions (not dish ratings) and
    // menu.feedback events are 0. So DISH_DEMAND is demand-only until a real
    // dish-rating stream exists (portal ratings). We report rank + share.
    const sharePct = Math.round((d.qty / totalQty) * 100);
    const summary = `Demand rank #${rank}: ${d.qty} ordered across ${d.orders} order(s), $${(d.cents / 100).toFixed(0)} (${sharePct}% of tracked order volume).`;

    results.push({ dishId: dish.id, name: dish.name, qty: d.qty, rank, sharePct, summary });
  }
  return results;
}

// ── QUOTE_CLOSE ──────────────────────────────────────────────────────────────
// What fraction of customers who were QUOTED / DISCUSSED an offer went on to a
// tracked ORDER. Understated (most Square orders are anonymous), so reported as
// a floor.
async function computeQuoteClose(prisma, anchorId, now) {
  const quoted = await prisma.brainAssertion.findMany({
    where: { relType: { in: ['QUOTED', 'DISCUSSED_OFFER'] }, retractedAt: null },
    select: { srcId: true, metadata: true },
  });
  if (quoted.length < 5) return null;

  const quotedCustomers = new Set(quoted.map(q => q.srcId));
  let closed = 0;
  for (const cid of quotedCustomers) {
    const ordered = await prisma.brainAssertion.count({
      where: { srcId: cid, relType: 'ORDERED', retractedAt: null },
    });
    if (ordered > 0) closed++;
  }
  const n = quotedCustomers.size;
  const floorPct = Math.round((closed / n) * 100);
  const summary =
    `Quote→close: ≥${closed} of ${n} quoted/discussed customers placed a tracked order (≥${floorPct}% floor; ` +
    `understated because most Square orders are anonymous). ${quoted.length} quote/offer interactions total.`;
  return {
    inferenceType: 'QUOTE_CLOSE', confidence: Math.min(1, n / 50), summary, decayRate: 'medium', staleDays: 35,
    detail: { quotedCustomers: n, closedCustomers: closed, floorPct, interactions: quoted.length },
  };
}

// ── LOCALIST_FUNNEL ──────────────────────────────────────────────────────────
// Conversion through the live Localist pickup-window funnel.
async function computeLocalistFunnel(prisma, anchorId, now) {
  const rows = await prisma.ledgerEvent.groupBy({
    by: ['eventType'],
    where: { eventType: { in: ['localist.window.viewed', 'localist.cart.updated', 'localist.checkout.started', 'localist.checkout.success', 'localist.order.paid'] }, tombstonedAt: null },
    _count: { _all: true },
  });
  const c = {};
  for (const r of rows) c[r.eventType] = r._count._all;
  const viewed = c['localist.window.viewed'] || 0;
  const carted = c['localist.cart.updated'] || 0;
  const paid = (c['localist.order.paid'] || 0) + (c['localist.checkout.success'] || 0);
  if (viewed < 5) return null;

  const cartRate = viewed ? Math.round((carted / viewed) * 100) : 0;
  const closeRate = carted ? Math.round((paid / carted) * 100) : 0;
  const overallRate = viewed ? Math.round((paid / viewed) * 100) : 0;
  const summary =
    `Localist funnel: ${viewed} viewed → ${carted} carted (${cartRate}%) → ${paid} paid (${closeRate}% of carts; ${overallRate}% overall).` +
    (cartRate < 40 ? ' View→cart is the leak.' : closeRate < 40 ? ' Cart→pay is the leak.' : '');
  return {
    inferenceType: 'LOCALIST_FUNNEL', confidence: Math.min(1, viewed / 100), summary, decayRate: 'fast', staleDays: 21,
    detail: { viewed, carted, paid, cartRate, closeRate, overallRate },
  };
}

// ── Entry point — called by runInferencePass ─────────────────────────────────
async function runBusinessInferences({ logger } = {}) {
  const prisma = getPrisma();
  const now = new Date();
  const anchor = await getBusinessAnchor(prisma);
  let written = 0;
  const errors = [];

  if (anchor) {
    for (const fn of [computeCashflow, computeCogsRatio, computeSeasonality, computeQuoteClose, computeLocalistFunnel]) {
      try {
        const r = await fn(prisma, anchor.id, now);
        if (!r) continue;
        await writeBusinessInference(prisma, { anchorId: anchor.id, now, computedFrom: [], ...r });
        written++;
      } catch (err) { errors.push(`${fn.name}: ${err.message}`); logger?.warn({ err }, `brain/business-inference: ${fn.name} failed`); }
    }
  } else {
    errors.push('no Local Effort BusinessLine anchor');
  }

  // Dish demand — per dish, self-anchored.
  try {
    const dishes = await computeDishDemand(prisma, now);
    for (const d of dishes) {
      await writeBusinessInference(prisma, {
        anchorId: d.dishId, inferenceType: 'DISH_DEMAND', confidence: 1,
        summary: d.summary, decayRate: 'fast', staleDays: 14, now,
      });
      written++;
    }
  } catch (err) { errors.push(`dishDemand: ${err.message}`); }

  logger?.info({ written, errors: errors.length }, 'brain/business-inference: complete');
  return { written, errors };
}

module.exports = { runBusinessInferences };
