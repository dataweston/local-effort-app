import { describe, expect, it } from 'vitest';

const { resolveResourceDays, resolveOutboundDays, resolveDay, validateRoute, mirrorTargets } = require('../engine');
const { defaultGraph, mergeGraph, validateGraph } = require('../graph');
const { todayChicago, chicagoDateOf } = require('../dates');

const TODAY = '2026-10-13';
const feed = { id: 'airbnb', venue: 'firehouse', label: 'Airbnb', url: 'https://example.com/a.ics', active: true };
const graph = defaultGraph([feed]);
const facts = (over = {}) => ({ slots: [], blocks: [], bookings: [], ...over });
const statusOn = (resource, date, f) => resolveDay({ resource, date, today: TODAY, graph, facts: f })?.status ?? null;

describe('availability rules the owner stated', () => {
  it('an Airbnb-blocked night blocks FIREHOUSE but never Small Events', () => {
    const f = facts({
      slots: [{ venue: 'firehouse', date: '2026-12-05', status: 'open', type: 'holiday' }],
      blocks: [{ feedId: 'airbnb', venue: 'firehouse', date: '2026-12-05', source: 'Airbnb' }],
    });
    expect(statusOn('firehouse', '2026-12-05', f)).toBe('booked');
    expect(statusOn('client', '2026-12-05', f)).toBe('open');
  });

  it('a confirmed FIREHOUSE booking blocks Small Events that day', () => {
    const f = facts({ bookings: [{ venue: 'firehouse', date: '2026-12-05', state: 'booked' }] });
    expect(statusOn('client', '2026-12-05', f)).toBe('booked');
    expect(statusOn('client', '2026-12-06', f)).toBe('open');
  });

  it('a paid FIREHOUSE booking shows as booked for Small Events, so two people cannot pay for the same day', () => {
    const f = facts({ bookings: [{ venue: 'firehouse', date: '2026-12-05', state: 'booked' }] });
    expect(statusOn('client', '2026-12-05', f)).toBe('booked');
  });

  it('a Small Events booking does not take FIREHOUSE off the market', () => {
    const f = facts({
      slots: [{ venue: 'firehouse', date: '2026-12-05', status: 'open' }],
      bookings: [{ venue: 'client', date: '2026-12-05', state: 'booked' }],
    });
    expect(statusOn('firehouse', '2026-12-05', f)).toBe('open');
  });

  it('a confirmed booking outranks an owner-open slot on the same resource', () => {
    const f = facts({
      slots: [{ venue: 'firehouse', date: '2026-12-05', status: 'open' }],
      bookings: [{ venue: 'firehouse', date: '2026-12-05', state: 'booked' }],
    });
    expect(statusOn('firehouse', '2026-12-05', f)).toBe('booked');
  });

  it('an owner-closed day outranks the implicit open window but not a booking', () => {
    const closed = facts({ slots: [{ venue: 'client', date: '2026-12-05', status: 'blocked' }] });
    expect(statusOn('client', '2026-12-05', closed)).toBe('blocked');
  });

  it('a disabled cable stops blocking', () => {
    const cut = {
      ...graph,
      routes: graph.routes.map((r) => (r.fromId === 'resource:firehouse' && r.toId === 'resource:client' ? { ...r, enabled: false } : r)),
    };
    const f = facts({ bookings: [{ venue: 'firehouse', date: '2026-12-05', state: 'booked' }] });
    expect(resolveDay({ resource: 'client', date: '2026-12-05', today: TODAY, graph: cut, facts: f }).status).toBe('open');
  });
});

describe('default-open window', () => {
  const days = (from, to) => resolveResourceDays({ resource: 'client', from, to, today: TODAY, graph, facts: facts() });

  it('starts after the lead time and ends at the horizon', () => {
    const all = days('2026-10-13', '2027-12-31');
    expect(all[0].date).toBe('2026-10-27');
    expect(all[all.length - 1].date).toBe('2027-10-13');
  });

  it('FIREHOUSE has no implicit window: an unmanaged night is not a promise', () => {
    expect(statusOn('firehouse', '2026-12-05', facts())).toBeNull();
  });
});

describe('outbound feeds', () => {
  it('publish our own commitments and never echo an Airbnb import back to Airbnb', () => {
    const f = facts({
      bookings: [{ venue: 'firehouse', date: '2026-12-05', state: 'booked' }],
      blocks: [{ feedId: 'airbnb', venue: 'firehouse', date: '2026-12-20', source: 'Airbnb' }],
    });
    const out = resolveOutboundDays({ nodeId: 'ics:firehouse', graph, facts: f, from: '2026-12-01', to: '2026-12-31' });
    expect(out.map((d) => d.date)).toEqual(['2026-12-05']);
  });

  it('includes owner-closed days and paid bookings', () => {
    const f = facts({
      slots: [{ venue: 'firehouse', date: '2026-12-07', status: 'blocked' }],
      bookings: [{ venue: 'firehouse', date: '2026-12-06', state: 'booked' }],
    });
    const out = resolveOutboundDays({ nodeId: 'ics:firehouse', graph, facts: f, from: '2026-12-01', to: '2026-12-31' });
    expect(out.map((d) => [d.date, d.status])).toEqual([['2026-12-06', 'booked'], ['2026-12-07', 'blocked']]);
  });

  it('finds the Google calendars a resource mirrors into', () => {
    expect(mirrorTargets('firehouse', 'google', graph).map((n) => n.id)).toEqual(['google:firehouse-shared']);
  });
});

describe('route validation', () => {
  it('rejects cables that make no sense', () => {
    expect(validateRoute({ fromId: 'ics:x', toId: 'resource:client', kind: 'blocks' })).toBe('route-not-allowed');
    expect(validateRoute({ fromId: 'feed:a', toId: 'google:x', kind: 'mirrors' })).toBe('route-not-allowed');
    expect(validateRoute({ fromId: 'resource:client', toId: 'resource:client', kind: 'blocks' })).toBe('self-route');
    expect(validateRoute({ fromId: 'resource:client', toId: 'hub', kind: 'mirrors' })).toBeNull();
  });

  it('a saved graph with a bad cable is refused', () => {
    const nodes = [
      { id: 'resource:client', kind: 'resource', label: 'c' },
      { id: 'hub', kind: 'hub', label: 'h' },
    ];
    expect(validateGraph({ nodes, routes: [{ fromId: 'hub', toId: 'resource:client', kind: 'blocks' }] })).toBe('route-not-allowed');
    expect(validateGraph({ nodes, routes: [{ fromId: 'resource:client', toId: 'hub', kind: 'mirrors' }] })).toBeNull();
  });
});

describe('merging a saved graph with defaults', () => {
  it('keeps a cable the owner cut, and wires a feed added later', () => {
    const stored = {
      nodes: graph.nodes.filter((n) => n.id !== 'feed:airbnb'),
      routes: graph.routes.filter((r) => r.fromId !== 'resource:firehouse' || r.toId !== 'resource:client'),
    };
    const merged = mergeGraph(graph, stored);
    expect(merged.routes.some((r) => r.fromId === 'resource:firehouse' && r.toId === 'resource:client')).toBe(false);
    expect(merged.routes.some((r) => r.fromId === 'feed:airbnb')).toBe(true);
  });
});

describe('Chicago business days', () => {
  it('8pm Central on the 12th is still the 12th', () => {
    expect(chicagoDateOf(new Date('2026-10-13T01:00:00Z'))).toBe('2026-10-12');
    expect(todayChicago(new Date('2026-10-13T06:00:00Z'))).toBe('2026-10-13');
  });
});
