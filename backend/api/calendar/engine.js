// The universal calendar's rules, as pure functions over plain data.
//
// Nothing here touches a database, the network or the clock: callers pass in
// the graph (nodes + routes), the facts (admin slots, bookings, imported feed
// days) and `today`. That is what lets the routing rules be tested directly and
// lets the patch-cable UI preview the effect of a cable before it is saved.
//
// Node ids:  resource:<slug>   a thing we sell a date of
//            feed:<id>         an inbound calendar (Airbnb, Google, any iCal)
//            ics:<name>        an outbound .ics URL others subscribe to
//            google:<name>     a Google calendar we write bookings into
//            hub               the hub calendar (downstream only)
//
// Route kinds:
//   blocks   the destination resource cannot be sold on days the source is busy
//   mirrors  the destination reflects the source's own commitments
//
// See docs/design/UNIVERSAL-CALENDAR.md.

const { addDaysIso, eachDay } = require('./dates');

const NODE_KINDS = ['resource', 'feed', 'ics', 'google', 'hub'];
const ROUTE_KINDS = ['blocks', 'mirrors'];

const kindOf = (id) => String(id || '').split(':')[0];

// Which cables may exist. `mirrors` out of a feed is only meaningful into an
// .ics node (a pass-through); a feed has no booking details to write to Google.
const ALLOWED = {
  blocks: { from: ['feed', 'resource'], to: ['resource'] },
  mirrors: { from: ['resource', 'feed'], to: ['ics', 'google', 'hub'] },
};

function validateRoute({ fromId, toId, kind }) {
  if (!ROUTE_KINDS.includes(kind)) return 'unknown-route-kind';
  if (fromId === toId) return 'self-route';
  const rule = ALLOWED[kind];
  if (!rule.from.includes(kindOf(fromId)) || !rule.to.includes(kindOf(toId))) return 'route-not-allowed';
  if (kind === 'mirrors' && kindOf(fromId) === 'feed' && kindOf(toId) !== 'ics') return 'route-not-allowed';
  return null;
}

// Status precedence, strongest first. A day absent from the map is "no
// information"; the UI shows it as an enquiry unless the resource is
// default-open.
const RANK = { booked: 3, blocked: 2, open: 1 };

const stronger = (a, b) => (!a || RANK[b.status] >= RANK[a.status] ? b : a);

/**
 * Paid bookings for one resource, as busy days. A date is only taken by a
 * confirmed deposit, so `bookings` rows are all `state: 'booked'`.
 */
const ownCommitments = (resourceSlug, facts) =>
  (facts.bookings || [])
    .filter((row) => row.venue === resourceSlug)
    .map((row) => ({ date: row.date, status: 'booked', source: 'booking' }));

const slug = (nodeId) => String(nodeId).slice('resource:'.length);

function incomingBlocks(graph) {
  return (graph.routes || []).filter((route) => route.enabled !== false && route.kind === 'blocks');
}

/**
 * One status per day for a resource, between `from` and `to` inclusive.
 *
 *   booked   confirmed booking here, a confirmed booking on a resource cabled
 *            into this one, or an imported feed day cabled into this one
 *            (nothing is held for an unpaid checkout)
 *   blocked  an owner-closed day on this resource only
 *   open     owner-opened, or implicitly open inside the resource's window
 */
function resolveResourceDays({ resource, from, to, today, graph, facts }) {
  const node = (graph.nodes || []).find((entry) => entry.id === `resource:${resource}`);
  const window = node?.config?.defaultOpen || null;
  const days = new Map();
  const put = (day) => {
    if (day.date < from || day.date > to) return;
    days.set(day.date, stronger(days.get(day.date), day));
  };

  if (window) {
    const first = addDaysIso(today, Number(window.minLeadDays) || 0);
    const last = addDaysIso(today, Number(window.maxDays) || 0);
    const start = first > from ? first : from;
    const end = last < to ? last : to;
    if (start <= end) {
      for (const date of eachDay(start, end)) put({ date, status: 'open', implicit: true });
    }
  }

  for (const slot of facts.slots || []) {
    if (slot.venue !== resource) continue;
    put({
      date: slot.date,
      status: slot.status === 'blocked' ? 'blocked' : 'open',
      notes: slot.notes || '',
      source: slot.source,
    });
  }

  for (const day of ownCommitments(resource, facts)) put(day);

  for (const route of incomingBlocks(graph)) {
    if (route.toId !== `resource:${resource}`) continue;
    const fromKind = kindOf(route.fromId);
    if (fromKind === 'resource') {
      for (const day of ownCommitments(slug(route.fromId), facts)) {
        put({ date: day.date, status: day.status, source: 'resource', via: route.fromId });
      }
    } else if (fromKind === 'feed') {
      const feedId = route.fromId.slice('feed:'.length);
      for (const block of facts.blocks || []) {
        if (block.feedId !== feedId) continue;
        put({ date: block.date, status: 'booked', source: block.source || 'feed', summary: block.summary || '', via: route.fromId });
      }
    }
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Days an outbound node should publish. Only the source's OWN commitments go
 * out (bookings, live holds, owner-closed days). Days that arrived from a feed
 * are never echoed back unless the owner cables that feed into the node
 * explicitly, so Airbnb never receives its own reservations back as ours.
 */
function resolveOutboundDays({ nodeId, graph, facts, from, to }) {
  const out = new Map();
  const add = (date, status, extra = {}) => {
    if (date < from || date > to) return;
    out.set(date, stronger(out.get(date), { date, status, ...extra }));
  };

  for (const route of graph.routes || []) {
    if (route.enabled === false || route.kind !== 'mirrors' || route.toId !== nodeId) continue;
    const fromKind = kindOf(route.fromId);
    if (fromKind === 'resource') {
      const resource = slug(route.fromId);
      for (const day of ownCommitments(resource, facts)) add(day.date, day.status, { via: route.fromId });
      for (const slot of facts.slots || []) {
        if (slot.venue === resource && slot.status === 'blocked') add(slot.date, 'blocked', { via: route.fromId });
      }
    } else if (fromKind === 'feed') {
      const feedId = route.fromId.slice('feed:'.length);
      for (const block of facts.blocks || []) {
        if (block.feedId === feedId) add(block.date, 'booked', { via: route.fromId });
      }
    }
  }
  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** The day's status for one resource, or null when it carries no information. */
function resolveDay({ resource, date, today, graph, facts }) {
  return resolveResourceDays({ resource, from: date, to: date, today, graph, facts })[0] || null;
}

const isSellable = (day) => Boolean(day) && day.status === 'open';

/** Resources whose bookings are mirrored to a node, for booking-event writers. */
function mirrorSources(nodeId, graph) {
  return (graph.routes || [])
    .filter((route) => route.enabled !== false && route.kind === 'mirrors' && route.toId === nodeId)
    .map((route) => route.fromId);
}

/** Enabled mirror targets of a given kind for a resource (e.g. its Google calendars). */
function mirrorTargets(resource, kind, graph) {
  const nodes = new Map((graph.nodes || []).map((node) => [node.id, node]));
  return (graph.routes || [])
    .filter((route) => route.enabled !== false && route.kind === 'mirrors' && route.fromId === `resource:${resource}`)
    .map((route) => nodes.get(route.toId))
    .filter((node) => node && node.kind === kind);
}

module.exports = {
  NODE_KINDS,
  ROUTE_KINDS,
  isSellable,
  kindOf,
  mirrorSources,
  mirrorTargets,
  resolveDay,
  resolveOutboundDays,
  resolveResourceDays,
  validateRoute,
};
