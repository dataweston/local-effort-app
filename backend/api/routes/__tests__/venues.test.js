import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// Required rather than imported, and the prisma client is injected per call
// instead of mocked: backend/ is CJS, so a vi.mock of ../../utils/prisma does
// not reliably intercept the require inside the router, and a miss there means
// a test quietly opening the live database.
const require = createRequire(import.meta.url);
const { __internals } = require('../venues.js');
const { loadVenueCalendar, publicVenue } = __internals;

/** Minimal stand-in for the three queries loadVenueCalendar issues. */
const fakeDb = ({ slots = [], blocks = [], holds = [] }) => ({
  smallEventAvailability: { findMany: async () => slots },
  venueBlock: { findMany: async () => blocks },
  smallEventHold: { findMany: async () => holds },
});

const load = (data) =>
  loadVenueCalendar({ slug: 'firehouse', from: '2026-10-01', to: '2026-10-31', db: fakeDb(data) });

const statusOn = (days, date) => days.find((day) => day.date === date)?.status;

describe('venue availability precedence', () => {
  it('reports an admin-opened date as open', async () => {
    const days = await load({
      slots: [{ date: '2026-10-05', type: 'dinner', venue: 'firehouse', status: 'open', source: 'manual' }],
    });
    expect(statusOn(days, '2026-10-05')).toBe('open');
  });

  it('reports an admin-closed date as blocked', async () => {
    const days = await load({
      slots: [{ date: '2026-10-05', type: 'dinner', venue: 'firehouse', status: 'blocked', source: 'manual' }],
    });
    expect(statusOn(days, '2026-10-05')).toBe('blocked');
  });

  it('lets a live hold outrank an open slot', async () => {
    const days = await load({
      slots: [{ id: 's1', date: '2026-10-05', type: 'dinner', venue: 'firehouse', status: 'open' }],
      holds: [
        {
          status: 'held',
          holdUntil: new Date(Date.now() + 3600_000),
          slot: { id: 's1', date: '2026-10-05', venue: 'firehouse' },
        },
      ],
    });
    expect(statusOn(days, '2026-10-05')).toBe('held');
  });

  it('reports a confirmed hold as booked', async () => {
    const days = await load({
      slots: [{ id: 's1', date: '2026-10-05', type: 'dinner', venue: 'firehouse', status: 'open' }],
      holds: [{ status: 'confirmed', slot: { id: 's1', date: '2026-10-05', venue: 'firehouse' } }],
    });
    expect(statusOn(days, '2026-10-05')).toBe('booked');
  });

  it('lets an imported feed block outrank everything, including an open slot', async () => {
    // This is the double-booking guard: the room is physically taken according
    // to Airbnb, whatever our own grid says.
    const days = await load({
      slots: [{ id: 's1', date: '2026-10-05', type: 'dinner', venue: 'firehouse', status: 'open' }],
      blocks: [{ date: '2026-10-05', venue: 'firehouse', source: 'Airbnb', summary: 'Reserved' }],
    });
    expect(statusOn(days, '2026-10-05')).toBe('booked');
    expect(days.find((day) => day.date === '2026-10-05').source).toBe('Airbnb');
  });

  it('ignores a hold belonging to the other venue', async () => {
    const days = await load({
      slots: [{ id: 's1', date: '2026-10-05', type: 'dinner', venue: 'firehouse', status: 'open' }],
      holds: [{ status: 'confirmed', slot: { id: 's2', date: '2026-10-05', venue: 'foodist' } }],
    });
    expect(statusOn(days, '2026-10-05')).toBe('open');
  });

  it('ignores a hold whose slot falls outside the requested window', async () => {
    const days = await load({
      holds: [{ status: 'confirmed', slot: { id: 's9', date: '2026-12-25', venue: 'firehouse' } }],
    });
    expect(statusOn(days, '2026-12-25')).toBeUndefined();
  });

  it('omits days nobody has managed, rather than guessing them open', async () => {
    const days = await load({});
    expect(days).toEqual([]);
  });

  it('returns days in date order', async () => {
    const days = await load({
      slots: [
        { date: '2026-10-09', type: 'dinner', venue: 'firehouse', status: 'open' },
        { date: '2026-10-02', type: 'dinner', venue: 'firehouse', status: 'open' },
      ],
    });
    expect(days.map((day) => day.date)).toEqual(['2026-10-02', '2026-10-09']);
  });
});

describe('public venue projection', () => {
  it('strips TODO placeholders instead of publishing them', () => {
    const projected = publicVenue({
      slug: 'firehouse',
      nickname: 'FIREHOUSE',
      name: 'TODO — legal/Business Profile name',
      accent: 'poppy',
      hours: { earliest: 'TODO', latest: 'TODO' },
      verified: false,
    });
    expect(projected.name).toBeNull();
    expect(projected.hours.earliest).toBeNull();
    expect(projected.verified).toBe(false);
  });

  it('never exposes a feed URL or any address field', () => {
    const projected = publicVenue({
      slug: 'firehouse',
      nickname: 'FIREHOUSE',
      name: 'Firehouse',
      address: { street: '1 Example St' },
      verified: true,
    });
    expect(JSON.stringify(projected)).not.toContain('Example St');
    expect(projected.address).toBeUndefined();
  });
});
