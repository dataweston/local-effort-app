// Loading side of the universal calendar: the effective routing graph and the
// facts the engine needs. All functions take an injected `db` (Prisma client or
// a fake) so they can be tested without a database.

const venuesData = require('../../../src/config/venues.json');
const { addDaysIso } = require('./dates');
const { validateRoute, kindOf } = require('./engine');

const VENUES = venuesData.venues;

// Small Events (a chef at the customer's place) is open unless something blocks
// it. The window is a policy the owner edits on the resource node in the
// calendar-routing screen; these are only the starting values.
const CLIENT_DEFAULT_OPEN = { minLeadDays: 14, maxDays: 365 };

const CLIENT_RESOURCE = 'client';

const resourceLabel = (slug) =>
  slug === CLIENT_RESOURCE ? 'Small Events' : VENUES.find((venue) => venue.slug === slug)?.nickname || slug;

/** Resource slugs the calendar manages: every venue plus Small Events. */
const resourceSlugs = () => [CLIENT_RESOURCE, ...VENUES.map((venue) => venue.slug)];

/**
 * Which resource an estimate occupies. For a room it is `location` (the venue
 * slug); a Small Event at the customer's address stores that address in
 * `location` instead, so anything that is not a venue slug is a client event.
 */
const resourceOfEstimate = (estimate) =>
  VENUES.some((venue) => venue.slug === estimate?.location) ? estimate.location : CLIENT_RESOURCE;

/**
 * The wiring that applies until the owner saves their own. It encodes the rules
 * the owner stated: Airbnb blocks FIREHOUSE but never Small Events; a FIREHOUSE
 * booking blocks Small Events (as does a FOODIST one, since the chef is in the
 * room); bookings mirror to Airbnb's .ics and to each shared Google calendar.
 */
function defaultGraph(feeds = []) {
  const nodes = [
    { id: `resource:${CLIENT_RESOURCE}`, kind: 'resource', label: resourceLabel(CLIENT_RESOURCE), config: { defaultOpen: CLIENT_DEFAULT_OPEN } },
    ...VENUES.map((venue) => ({ id: `resource:${venue.slug}`, kind: 'resource', label: venue.nickname, config: {} })),
    ...VENUES.map((venue) => ({
      id: `ics:${venue.slug}`,
      kind: 'ics',
      label: `${venue.nickname} .ics`,
      config: { path: `/api/venues/${venue.slug}/calendar.ics` },
    })),
    ...VENUES.map((venue) => ({
      id: `google:${venue.slug}-shared`,
      kind: 'google',
      label: `${venue.nickname} shared Google calendar`,
      config: { calendarId: null },
    })),
    { id: 'hub', kind: 'hub', label: 'Hub calendar', config: {} },
    ...feeds.map((feed) => ({
      id: `feed:${feed.id}`,
      kind: 'feed',
      label: feed.label,
      config: {
        active: feed.active,
        lastSyncAt: feed.lastSyncAt || null,
        lastStatus: feed.lastStatus || null,
        lastError: feed.lastError || null,
        lastBlockCount: feed.lastBlockCount || 0,
        isGoogle: String(feed.url || '').startsWith('google-calendar:'),
      },
    })),
  ];

  const routes = [];
  const route = (fromId, toId, kind) => routes.push({ fromId, toId, kind, enabled: true });
  for (const feed of feeds) route(`feed:${feed.id}`, `resource:${feed.venue}`, 'blocks');
  for (const venue of VENUES) {
    route(`resource:${venue.slug}`, `resource:${CLIENT_RESOURCE}`, 'blocks');
    route(`resource:${venue.slug}`, `ics:${venue.slug}`, 'mirrors');
    route(`resource:${venue.slug}`, `google:${venue.slug}-shared`, 'mirrors');
  }
  for (const slug of resourceSlugs()) route(`resource:${slug}`, 'hub', 'mirrors');
  return { nodes, routes };
}

/**
 * Effective graph: stored nodes are authoritative for themselves; anything the
 * stored graph does not know about (a new feed, a resource added in a later
 * release) arrives with its default wiring.
 */
function mergeGraph(defaults, stored) {
  const storedIds = new Set(stored.nodes.map((node) => node.id));
  const knownNodes = new Set([...storedIds, ...defaults.nodes.map((node) => node.id)]);
  const nodes = [...stored.nodes, ...defaults.nodes.filter((node) => !storedIds.has(node.id))];
  const routes = [
    ...stored.routes,
    ...defaults.routes.filter((route) => !storedIds.has(route.fromId) && !storedIds.has(route.toId)),
  ].filter((route) => knownNodes.has(route.fromId) && knownNodes.has(route.toId));
  return { nodes, routes };
}

async function loadGraph(db) {
  const feeds = await db.venueCalendarFeed.findMany({ orderBy: { createdAt: 'asc' } });
  const defaults = defaultGraph(feeds);
  // Until `prisma migrate deploy` has created the routing tables (P2021), the
  // built-in wiring applies. Any other failure still fails closed: an empty
  // calendar reads as "every night is open".
  const unlessTableMissing = (error) => {
    if (error?.code === 'P2021') return [];
    throw error;
  };
  const [nodeRows, routeRows] = await Promise.all([
    db.calendarNode.findMany().catch(unlessTableMissing),
    db.calendarRoute.findMany().catch(unlessTableMissing),
  ]);
  const liveFeedIds = new Set(feeds.map((feed) => `feed:${feed.id}`));
  const live = (id) => kindOf(id) !== 'feed' || liveFeedIds.has(id);
  const defaultNode = new Map(defaults.nodes.map((node) => [node.id, node]));
  const stored = {
    nodes: nodeRows
      .filter((row) => live(row.id))
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        label: kindOf(row.id) === 'feed' ? defaultNode.get(row.id)?.label || row.label : row.label,
        // Live sync status always wins over whatever was saved with the layout.
        config: kindOf(row.id) === 'feed' ? { ...(row.config || {}), ...(defaultNode.get(row.id)?.config || {}) } : row.config || {},
        posX: row.posX,
        posY: row.posY,
      })),
    routes: routeRows
      .filter((row) => live(row.fromId) && live(row.toId))
      .map((row) => ({ id: row.id, fromId: row.fromId, toId: row.toId, kind: row.kind, enabled: row.enabled })),
  };
  return mergeGraph(defaults, stored);
}

const NODE_ID_PATTERN = /^(resource|feed|ics|google):[a-z0-9][a-z0-9-]{0,60}$|^hub$/;

/** Validate a graph submitted by the editor. Returns an error string or null. */
function validateGraph({ nodes, routes }) {
  if (!Array.isArray(nodes) || !Array.isArray(routes)) return 'graph-shape-invalid';
  if (nodes.length > 80 || routes.length > 400) return 'graph-too-large';
  const ids = new Set();
  for (const node of nodes) {
    if (!node || !NODE_ID_PATTERN.test(String(node.id || ''))) return 'node-id-invalid';
    if (kindOf(node.id) !== node.kind && !(node.id === 'hub' && node.kind === 'hub')) return 'node-kind-mismatch';
    if (ids.has(node.id)) return 'node-duplicate';
    ids.add(node.id);
  }
  const seen = new Set();
  for (const route of routes) {
    if (!ids.has(route?.fromId) || !ids.has(route?.toId)) return 'route-endpoint-missing';
    const problem = validateRoute(route);
    if (problem) return problem;
    const key = `${route.fromId}|${route.toId}|${route.kind}`;
    if (seen.has(key)) return 'route-duplicate';
    seen.add(key);
  }
  return null;
}

/**
 * Everything the engine reads, for a date range. Bookings are confirmed holds
 * plus unexpired holds; expired holds never block.
 */
async function loadFacts(db, { from, to, now = new Date() }) {
  const [slots, blocks, holds] = await Promise.all([
    db.smallEventAvailability.findMany({ where: { date: { gte: from, lte: to } } }),
    db.venueBlock.findMany({ where: { date: { gte: from, lte: to } } }),
    db.smallEventHold.findMany({
      where: {
        slot: { date: { gte: from, lte: to } },
        OR: [{ status: 'confirmed' }, { status: 'held', holdUntil: { gt: now } }],
      },
      include: { slot: true },
    }),
  ]);
  return {
    slots,
    blocks,
    bookings: holds
      .filter((hold) => hold.slot)
      .map((hold) => ({
        venue: hold.slot.venue,
        date: hold.slot.date,
        state: hold.status === 'confirmed' ? 'booked' : 'held',
        holdUntil: hold.holdUntil,
        estimateId: hold.estimateId,
      })),
  };
}

const horizonEnd = (today, days) => addDaysIso(today, days);

module.exports = {
  CLIENT_DEFAULT_OPEN,
  CLIENT_RESOURCE,
  defaultGraph,
  horizonEnd,
  loadFacts,
  loadGraph,
  mergeGraph,
  resourceLabel,
  resourceOfEstimate,
  resourceSlugs,
  validateGraph,
};
