import { describe, expect, it } from 'vitest';

const { claimDate, loadResourceCalendar, buildOutboundIcs } = require('../service');

const NOW = new Date('2026-10-13T15:00:00Z');

/**
 * A just-enough Prisma. Transactions run one at a time, which is what the
 * advisory lock guarantees on Postgres; the test is that claimDate re-reads
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
      findMany: async () =>
        t.holds
          .filter((h) => h.status === 'confirmed' || (h.status === 'held' && h.holdUntil > NOW))
          .map((h) => ({ ...h, slot: t.slots.find((s) => s.id === h.slotId) })),
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

const hold = (api, t) => async (tx, slot) => {
  const row = { estimateId: `e-${t.holds.length + 1}`, slotId: slot.id, status: 'held', holdUntil: new Date(NOW.getTime() + 86400000) };
  t.holds.push(row);
  return row;
};

describe('claimDate', () => {
  it('two buyers racing for one Small Events day: one wins, one is told it is taken', async () => {
    const { api, t } = fakeDb();
    const results = await Promise.allSettled([
      claimDate({ db: api, resource: 'client', date: '2026-12-05', now: NOW, build: hold(api, t) }),
      claimDate({ db: api, resource: 'client', date: '2026-12-05', now: NOW, build: hold(api, t) }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(results.find((r) => r.status === 'rejected').reason.message).toBe('date-taken');
    expect(t.holds).toHaveLength(1);
  });

  it('a FIREHOUSE hold and a Small Events claim on the same day cannot both succeed', async () => {
    const { api, t } = fakeDb({ slots: [{ id: 'fh', venue: 'firehouse', date: '2026-12-05', type: 'holiday', status: 'open' }] });
    await claimDate({ db: api, resource: 'firehouse', date: '2026-12-05', now: NOW, build: hold(api, t) });
    await expect(
      claimDate({ db: api, resource: 'client', date: '2026-12-05', now: NOW, build: hold(api, t) }),
    ).rejects.toThrow('date-taken');
  });

  it('a Small Events hold does not stop FIREHOUSE selling the night', async () => {
    const { api, t } = fakeDb({ slots: [{ id: 'fh', venue: 'firehouse', date: '2026-12-05', type: 'holiday', status: 'open' }] });
    await claimDate({ db: api, resource: 'client', date: '2026-12-05', now: NOW, build: hold(api, t) });
    await expect(
      claimDate({ db: api, resource: 'firehouse', date: '2026-12-05', now: NOW, build: hold(api, t) }),
    ).resolves.toBeTruthy();
  });

  it('an Airbnb-imported night is not sellable at FIREHOUSE but is at Small Events', async () => {
    const { api, t } = fakeDb({
      slots: [{ id: 'fh', venue: 'firehouse', date: '2026-12-05', type: 'holiday', status: 'open' }],
      feeds: [{ id: 'airbnb', venue: 'firehouse', label: 'Airbnb', url: 'https://x/a.ics', active: true }],
      blocks: [{ feedId: 'airbnb', venue: 'firehouse', date: '2026-12-05', source: 'Airbnb' }],
    });
    await expect(claimDate({ db: api, resource: 'firehouse', date: '2026-12-05', now: NOW, build: hold(api, t) })).rejects.toThrow('date-taken');
    await expect(claimDate({ db: api, resource: 'client', date: '2026-12-05', now: NOW, build: hold(api, t) })).resolves.toBeTruthy();
  });

  it('refuses an unmanaged FIREHOUSE night, a closed Small Events day, and a day inside the lead time', async () => {
    const { api, t } = fakeDb({ slots: [{ id: 'c', venue: 'client', date: '2026-12-06', type: 'event', status: 'blocked' }] });
    await expect(claimDate({ db: api, resource: 'firehouse', date: '2026-12-05', now: NOW, build: hold(api, t) })).rejects.toThrow('date-not-open');
    await expect(claimDate({ db: api, resource: 'client', date: '2026-12-06', now: NOW, build: hold(api, t) })).rejects.toThrow('date-not-open');
    await expect(claimDate({ db: api, resource: 'client', date: '2026-10-20', now: NOW, build: hold(api, t) })).rejects.toThrow('date-not-open');
  });

  it('an expired hold no longer blocks the day', async () => {
    const { api, t } = fakeDb();
    t.slots.push({ id: 's0', venue: 'client', date: '2026-12-05', type: 'event', status: 'open' });
    t.holds.push({ estimateId: 'old', slotId: 's0', status: 'held', holdUntil: new Date(NOW.getTime() - 1000) });
    await expect(claimDate({ db: api, resource: 'client', date: '2026-12-05', now: NOW, build: hold(api, t) })).resolves.toBeTruthy();
  });
});

describe('published feeds', () => {
  it('the FIREHOUSE .ics carries our bookings as ranges and none of the Airbnb import', async () => {
    const { api, t } = fakeDb({
      slots: [{ id: 'fh', venue: 'firehouse', date: '2026-12-05', type: 'holiday', status: 'open' }],
      feeds: [{ id: 'airbnb', venue: 'firehouse', label: 'Airbnb', url: 'https://x/a.ics', active: true }],
      blocks: [{ feedId: 'airbnb', venue: 'firehouse', date: '2026-12-20', source: 'Airbnb' }],
    });
    await claimDate({ db: api, resource: 'firehouse', date: '2026-12-05', now: NOW, build: hold(api, t) });
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
