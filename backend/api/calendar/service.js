// The universal calendar's entry points: what a resource looks like on a range,
// what an outbound node publishes, and the atomic claim every sale goes through.
// `db` is injected (Prisma client or a test fake).

const { buildCalendar, groupIntoRanges } = require('../utils/ical');
const { addDaysIso, todayChicago } = require('./dates');
const { resolveResourceDays, resolveOutboundDays, resolveDay } = require('./engine');
const { loadGraph, loadFacts, CLIENT_RESOURCE } = require('./graph');

const SITE = 'https://www.localeffortfood.com';

/** Days for one resource, in the shape the venue calendar UI already renders. */
async function loadResourceCalendar({ resource, from, to, db, now = new Date() }) {
  const [graph, facts] = await Promise.all([loadGraph(db), loadFacts(db, { from, to, now })]);
  return resolveResourceDays({ resource, from, to, today: todayChicago(now), graph, facts }).map((day) => ({
    date: day.date,
    status: day.status,
    source: day.source,
    notes: day.notes || '',
    summary: day.summary || '',
  }));
}

/**
 * An outbound node as an iCalendar body. Only days that make the date
 * unavailable are published, grouped into ranges, with no customer details:
 * the feed is public to anyone holding the URL.
 */
async function buildOutboundIcs({ nodeId, name, from, to, db, now = new Date() }) {
  const [graph, facts] = await Promise.all([loadGraph(db), loadFacts(db, { from, to, now })]);
  const days = resolveOutboundDays({ nodeId, graph, facts, from, to }).map((day) => day.date);
  const label = (graph.nodes.find((node) => node.id === nodeId)?.label || name).trim();
  return buildCalendar({
    name: label,
    events: groupIntoRanges(days).map((range) => ({
      uid: `${nodeId.replace(/[^a-z0-9-]/gi, '-')}-${range.start}-${range.end}@localeffortfood.com`,
      start: range.start,
      end: range.end,
      summary: `${label} — unavailable`,
      description: `Not available to book on ${SITE}`,
    })),
  });
}

/**
 * Is this date for sale right now? Read-only: nothing is reserved, and nobody's
 * unpaid checkout counts. Throws Error('date-not-open') or Error('date-taken').
 */
async function assertDateAvailable({ db, resource, date, now = new Date(), graph: preloaded }) {
  const graph = preloaded || (await loadGraph(db));
  const facts = await loadFacts(db, { from: date, to: date });
  const day = resolveDay({ resource, date, today: todayChicago(now), graph, facts });
  if (!day || day.status === 'blocked') throw new Error('date-not-open');
  if (day.status === 'booked') throw new Error('date-taken');
}

/**
 * Take a date for a paid deposit, atomically.
 *
 * A date is taken by money, not by a visitor looking at it: this runs when the
 * deposit has been captured, under a per-date advisory lock. The lock is on the
 * date alone, not (resource, date), because a FIREHOUSE booking and a Small
 * Events booking on the same day are not independent: one blocks the other.
 * Two deposits racing for one day serialise here and the second one sees the
 * first one's confirmed booking.
 *
 * Idempotent: the estimate's own booking never counts against it, so a webhook
 * replay re-confirms rather than conflicts.
 *
 * Returns { ok: true } once the booking is written, or { ok: false, reason }
 * with reason 'date-not-open' | 'date-taken' when the day is no longer
 * available. The caller owns what happens to the money in that case.
 */
async function settleDate({ db, resource, date, estimateId, now = new Date(), graph: preloaded }) {
  const graph = preloaded || (await loadGraph(db));
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`calendar-day:${date}`}))`;
    const facts = await loadFacts(tx, { from: date, to: date });
    const others = { ...facts, bookings: facts.bookings.filter((row) => row.estimateId !== estimateId) };
    const day = resolveDay({ resource, date, today: todayChicago(now), graph, facts: others });

    if (!day || day.status === 'blocked') return { ok: false, reason: 'date-not-open' };
    if (day.status === 'booked') return { ok: false, reason: 'date-taken' };

    // Default-open resources have no slot row until somebody buys the day. The
    // booking needs one to hang from, so it is created here, under the lock.
    let slot = facts.slots.find((row) => row.venue === resource && row.date === date && row.status !== 'blocked');
    if (!slot) {
      slot = await tx.smallEventAvailability.create({
        data: { date, type: 'event', status: 'open', source: 'default-open', venue: resource },
      });
    }
    // `holdUntil` is a required column from when dates were held for checkout.
    // On a confirmed booking it only records when the deposit was taken.
    await tx.smallEventHold.upsert({
      where: { estimateId },
      update: { slotId: slot.id, status: 'confirmed', holdUntil: now },
      create: { estimateId, slotId: slot.id, status: 'confirmed', holdUntil: now },
    });
    return { ok: true };
  });
}

module.exports = {
  CLIENT_RESOURCE,
  addDaysIso,
  assertDateAvailable,
  buildOutboundIcs,
  loadResourceCalendar,
  settleDate,
};

