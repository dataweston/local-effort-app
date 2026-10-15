import { describe, expect, it } from 'vitest';

const { settleDate, assertDateAvailable, loadResourceCalendar, buildOutboundIcs } = require('../service');

const NOW = new Date('2026-10-13T15:00:00Z');

/**
 * A just-enough Prisma. Transactions run one at a time, which is what the
 * advisory lock guarantees on Postgres; the test is that settleDate re-reads
 * state inside the lock, not that the fake locks correctly.
 */
function fakeDb(seed = {}) {
  const t = {
    slots: seed.slots || [],
    blocks: seed.blocks || [],
    holds: seed.holds || [],
    feeds: seed.feeds || [],
    nodes: [],
    routes: [],
  };
  let ids = 0;
  let chain = Promise.resolve();
  const api = {
    venueCalendarFeed: { findMany: async () => t.feeds },
    calendarNode: { findMany: async () => t.nodes },
    calendarRoute: { findMany: async () => t.routes },
    venueBlock: { findMany: async () => t.blocks },
    smallEventAvailability: {
      findMany: async () => t.slots,
      create: async ({ data }) => {
        const row = { id: `slot-${++ids}`, notes: null, ...data };
        t.slots.push(row);
        return row;
      },
    },
    smallEventHold: {
      findMany: async ({ where }) =>
        t.holds
          .filter((h) => !where?.status || h.status === where.status)
          .map((h) => ({ ...h, slot: t.slots.find((s) => s.id === h.slotId) })),
      upsert: async ({ where, update, create }) => {
        const existing = t.holds.find((h) => h.estimateId === where.estimateId);
        if (existing) return Object.assign(existing, update);
        const row = { ...create };
        t.holds.push(row);
        return row;
      },
    },
    $executeRaw: async () => 0,
    $transaction: (fn) => {
      const run = chain.then(() => fn(api));
      chain = run.catch(() => {});
      return run;
    },
  };
  return { api, t };
}

const take = (api, resource, estimateId, date = '2026-12-05') =>
  settleDate({ db: api, resource, date, estimateId, now: NOW });

describe('settleDate: a date is taken by a paid deposit', () => {
  it('two deposits racing for one Small Events day: the first gets it, the second is told it is taken', async () => {
    const { api, t } = fakeDb();
    const results = await Promise.all([take(api, 'client', 'e-1'), take(api, 'client', 'e-2')]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok).reason).toBe('date-taken');
    expect(t.holds).toHaveLength(1);
    expect(t.holds[0].status).toBe('confirmed');
  });

  it('a payment replay re-confirms the same estimate instead of conflicting with itself', async () => {
    const { api, t } = fakeDb();
    await take(api, 'client', 'e-1');
    await expect(take(api, 'client', 'e-1')).resolves.toEqual({ ok: true });
    expect(t.holds).toHaveLength(1);
  });

  it('a confirmed FIREHOUSE booking and a Small Events booking on the same day cannot both succeed', async () => {
    const { api } = fakeDb({ slots: [{ id: 'fh', venue: 'firehouse', date: '2026-12-05', type: 'holiday', status: 'open' }] });
    await take(api, 'firehouse', 'e-1');
    await expect(take(api, 'client', 'e-2')).resolves.toEqual({ ok: false, reason: 'date-taken' });
  });

  it('a Small Events booking does not stop FIREHOUSE selling the night', async () => {
    const { api } = fakeDb({ slots: [{ id: 'fh', venue: 'firehouse', date: '2026-12-05', type: 'holiday', status: 'open' }] });
    await take(api, 'client', 'e-1');
    await expect(take(api, 'firehouse', 'e-2')).resolves.toEqual({ ok: true });
  });

  it('an Airbnb-imported night is not sellable at FIREHOUSE but is at Small Events', async () => {
    const { api } = fakeDb({
      slots: [{ id: 'fh', venue: 'firehouse', date: '2026-12-05', type: 'holiday', status: 'open' }],
      feeds: [{ id: 'airbnb', venue: 'firehouse', label: 'Airbnb', url: 'https://x/a.ics', active: true }],
      blocks: [{ feedId: 'airbnb', venue: 'firehouse', date: '2026-12-05', source: 'Airbnb' }],
    });
    await expect(take(api, 'firehouse', 'e-1')).resolves.toEqual({ ok: false, reason: 'date-taken' });
    await expect(take(api, 'client', 'e-2')).resolves.toEqual({ ok: true });
  });

  it('refuses an unmanaged FIREHOUSE night, a closed Small Events day, and a day inside the lead time', async () => {
    const { api } = fakeDb({ slots: [{ id: 'c', venue: 'client', date: '2026-12-06', type: 'event', status: 'blocked' }] });
    await expect(take(api, 'firehouse', 'e-1')).resolves.toEqual({ ok: false, reason: 'date-not-open' });
    await expect(take(api, 'client', 'e-2', '2026-12-06')).resolves.toEqual({ ok: false, reason: 'date-not-open' });
    await expect(take(api, 'client', 'e-3', '2026-10-20')).resolves.toEqual({ ok: false, reason: 'date-not-open' });
  });
});

describe('assertDateAvailable', () => {
  it('reserves nothing: an unpaid checkout never blocks a second visitor', async () => {
    const { api, t } = fakeDb();
    await assertDateAvailable({ db: api, resource: 'client', date: '2026-12-05', now: NOW });
    await assertDateAvailable({ db: api, resource: 'client', date: '2026-12-05', now: NOW });
    expect(t.holds).toHaveLength(0);
  });

  it('a leftover unpaid hold does not block the day', async () => {
    const { api, t } = fakeDb();
    t.slots.push({ id: 's0', venue: 'client', date: '2026-12-05', type: 'event', status: 'open' });
    t.holds.push({ estimateId: 'old', slotId: 's0', status: 'held', holdUntil: new Date(NOW.getTime() + 3600_000) });
    await expect(assertDateAvailable({ db: api, resource: 'client', date: '2026-12-05', now: NOW })).resolves.toBeUndefined();
  });

  it('refuses a booked day and a closed day', async () => {
    const { api } = fakeDb();
    await take(api, 'client', 'e-1');
    await expect(assertDateAvailable({ db: api, resource: 'client', date: '2026-12-05', now: NOW })).rejects.toThrow('date-taken');
    await expect(assertDateAvailable({ db: api, resource: 'firehouse', date: '2026-12-07', now: NOW })).rejects.toThrow('date-not-open');
  });
});

describe('published feeds', () => {
  it('the FIREHOUSE .ics carries our bookings as ranges and none of the Airbnb import', async () => {
    const { api } = fakeDb({
      slots: [{ id: 'fh', venue: 'firehouse', date: '2026-12-05', type: 'holiday', status: 'open' }],
      feeds: [{ id: 'airbnb', venue: 'firehouse', label: 'Airbnb', url: 'https://x/a.ics', active: true }],
      blocks: [{ feedId: 'airbnb', venue: 'firehouse', date: '2026-12-20', source: 'Airbnb' }],
    });
    await settleDate({ db: api, resource: 'firehouse', date: '2026-12-05', estimateId: 'e-1', now: NOW });
    const ics = await buildOutboundIcs({ nodeId: 'ics:firehouse', name: 'FIREHOUSE', from: '2026-10-13', to: '2027-10-13', db: api, now: NOW });
    expect(ics).toContain('DTSTART;VALUE=DATE:20261205');
    expect(ics).not.toContain('20261220');
  });

  it('Small Events days are listed open inside the window and shut inside the lead time', async () => {
    const { api } = fakeDb();
    const days = await loadResourceCalendar({ resource: 'client', from: '2026-10-13', to: '2026-11-05', db: api, now: NOW });
    expect(days[0].date).toBe('2026-10-27');
    expect(days.every((d) => d.status === 'open')).toBe(true);
  });
});
