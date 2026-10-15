// Pure helpers for the calendar-routing editor: which cables may exist, where
// nodes sit by default, the shape of a cable, and the sentences the editor says.
//
// The cable rules are a copy of `validateRoute` in backend/api/calendar/engine.js
// (kept small on purpose, not imported: that file is server code). The server
// re-validates every save and every preview, so this copy only decides which
// ports light up while a cable is being dragged.

export const NODE_W = 232;
export const PORT_Y = 22; // port centre below the node's top edge; half of the 44px header
export const ROUTE_KINDS = ['blocks', 'mirrors'];

const COLUMN_GAP = 120;
const ROW_GAP = 20;
const DEFAULT_HEIGHT = { feed: 156, resource: 112, ics: 100, google: 200, hub: 100 };

export const kindOf = (id) => String(id || '').split(':')[0];

const ALLOWED = {
  blocks: { from: ['feed', 'resource'], to: ['resource'] },
  mirrors: { from: ['resource', 'feed'], to: ['ics', 'google', 'hub'] },
};

export function routeProblem({ fromId, toId, kind }) {
  if (!ROUTE_KINDS.includes(kind)) return 'unknown-route-kind';
  if (fromId === toId) return 'self-route';
  const rule = ALLOWED[kind];
  if (!rule.from.includes(kindOf(fromId)) || !rule.to.includes(kindOf(toId))) return 'route-not-allowed';
  if (kind === 'mirrors' && kindOf(fromId) === 'feed' && kindOf(toId) !== 'ics') return 'route-not-allowed';
  return null;
}

/** The cable kind implied by its two ends, or null when no kind is legal. */
export const inferKind = (fromId, toId) => ROUTE_KINDS.find((kind) => !routeProblem({ fromId, toId, kind })) || null;

export const canSend = (id) => ['feed', 'resource'].includes(kindOf(id));
export const canReceive = (id) => ['resource', 'ics', 'google', 'hub'].includes(kindOf(id));

export const routeKey = (route) => `${route.fromId}|${route.toId}|${route.kind}`;

/** A plain sentence saying why two ports cannot be joined, or null when they can. */
export function refusal(fromId, toId, routes) {
  if (fromId === toId) return 'A calendar cannot be cabled to itself.';
  const kind = inferKind(fromId, toId);
  if (!kind) {
    const from = kindOf(fromId);
    const to = kindOf(toId);
    if (to === 'feed') return 'An inbound calendar only sends. Nothing can be cabled into it.';
    if (from === 'feed') return 'An inbound calendar can close a resource, or pass through to a published .ics address. It cannot go to Google Calendar or the hub.';
    if (to === 'resource') return 'Only an inbound calendar or another resource can close a resource’s dates.';
    if (from === 'resource') return 'That target cannot receive bookings.';
    return 'Those two cannot be joined.';
  }
  if (routes.some((route) => route.fromId === fromId && route.toId === toId && route.kind === kind)) {
    return 'Those two are already cabled.';
  }
  return null;
}

export function describeRoute(route, labelOf) {
  const from = labelOf(route.fromId);
  const to = labelOf(route.toId);
  if (route.kind === 'blocks') return `${from} closes ${to} on the days it is busy.`;
  if (kindOf(route.fromId) === 'feed') return `Days busy on ${from} are passed through to ${to}.`;
  return `Bookings on ${from} are copied to ${to}.`;
}

// ── Graph shape ───────────────────────────────────────────────────────────

export function normalizeGraph(graph) {
  return {
    nodes: (graph?.nodes || []).map((node) => ({
      id: node.id,
      kind: node.kind,
      label: node.label,
      config: node.config && typeof node.config === 'object' ? node.config : {},
      posX: Number.isFinite(node.posX) ? node.posX : null,
      posY: Number.isFinite(node.posY) ? node.posY : null,
    })),
    routes: (graph?.routes || []).map((route) => ({
      fromId: route.fromId,
      toId: route.toId,
      kind: route.kind,
      enabled: route.enabled !== false,
    })),
  };
}

const wholeNumber = (value) => {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

function savedConfig(node) {
  // A feed's config is live status owned by the feed itself; the server ignores it.
  if (node.kind === 'feed') return {};
  const config = node.config || {};
  if (node.kind === 'google') return { ...config, calendarId: String(config.calendarId ?? '').trim() || null };
  if (node.kind === 'resource' && config.defaultOpen) {
    return {
      ...config,
      defaultOpen: {
        minLeadDays: wholeNumber(config.defaultOpen.minLeadDays),
        maxDays: wholeNumber(config.defaultOpen.maxDays),
      },
    };
  }
  return config;
}

/** The body for PUT /graph and POST /preview. */
export function toSaveGraph(graph) {
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      label: node.label,
      config: savedConfig(node),
      posX: Number.isFinite(node.posX) ? Math.round(node.posX) : null,
      posY: Number.isFinite(node.posY) ? Math.round(node.posY) : null,
    })),
    routes: graph.routes.map((route) => ({
      fromId: route.fromId,
      toId: route.toId,
      kind: route.kind,
      enabled: route.enabled !== false,
    })),
  };
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const byKey = (a, b) => (routeKey(a) < routeKey(b) ? -1 : routeKey(a) > routeKey(b) ? 1 : 0);

/** Everything the server would store. Two graphs with the same key save identically. */
export function graphKey(graph) {
  const body = toSaveGraph(graph);
  return JSON.stringify({ nodes: [...body.nodes].sort(byId), routes: [...body.routes].sort(byKey) });
}

/** What can change a date's status: wiring and node settings, not positions or labels. */
export function previewKey(graph) {
  const body = toSaveGraph(graph);
  return JSON.stringify({
    nodes: body.nodes.map(({ id, kind, config }) => ({ id, kind, config })).sort(byId),
    routes: [...body.routes].sort(byKey),
  });
}

const CALENDAR_ID = /^[A-Za-z0-9._%+@#-]{1,200}$/;
const MAX_WINDOW_DAYS = 1095;

/** Problems the owner can fix before saving, keyed by node id. */
export function draftProblems(graph) {
  const found = {};
  for (const node of graph.nodes) {
    const config = node.config || {};
    if (node.kind === 'google') {
      const id = String(config.calendarId ?? '').trim();
      if (id && !CALENDAR_ID.test(id)) {
        found[node.id] = 'Calendar IDs use letters, numbers and . _ % + @ # - only.';
      }
    }
    if (node.kind === 'resource' && config.defaultOpen) {
      const min = Number(config.defaultOpen.minLeadDays);
      const max = Number(config.defaultOpen.maxDays);
      const whole = (n) => Number.isInteger(n) && n >= 0 && n <= MAX_WINDOW_DAYS;
      if (config.defaultOpen.minLeadDays === '' || config.defaultOpen.maxDays === '' || !whole(min) || !whole(max)) {
        found[node.id] = `Use whole numbers of days between 0 and ${MAX_WINDOW_DAYS}.`;
      } else if (min > max) {
        found[node.id] = 'The earliest day cannot come after the latest day.';
      }
    }
  }
  return found;
}

// ── Layout ────────────────────────────────────────────────────────────────

const COLUMN_OF = { feed: 0, resource: 1, ics: 2, google: 2, hub: 2 };
const OUT_ORDER = { ics: 0, google: 1, hub: 2 };

/** Left to right reads: what comes in, which calendar it closes, where bookings go. */
export function orderedNodes(nodes) {
  const column = (node) => COLUMN_OF[node.kind] ?? 2;
  return [...nodes].sort((a, b) => {
    if (column(a) !== column(b)) return column(a) - column(b);
    if (column(a) === 2 && a.kind !== b.kind) return (OUT_ORDER[a.kind] ?? 9) - (OUT_ORDER[b.kind] ?? 9);
    // Small Events is fed by the rooms, so it sits below them.
    if (a.id === 'resource:client') return 1;
    if (b.id === 'resource:client') return -1;
    return 0;
  });
}

/** Default position for every node, from measured (or estimated) heights. */
export function defaultPositions(nodes, heights = {}) {
  const columns = [[], [], []];
  for (const node of orderedNodes(nodes)) columns[COLUMN_OF[node.kind] ?? 2].push(node);
  const heightOf = (node) => heights[node.id] || DEFAULT_HEIGHT[node.kind] || 100;
  const out = {};
  columns.forEach((column, index) => {
    let y = 0; // columns start level, so the first of each is in view on a phone
    for (const node of column) {
      out[node.id] = { x: index * (NODE_W + COLUMN_GAP), y: Math.round(y) };
      y += heightOf(node) + ROW_GAP;
    }
  });
  return out;
}

// ── Cables ────────────────────────────────────────────────────────────────

/**
 * A cable that hangs between two jacks: the handles lead out horizontally and
 * both drop by the same amount, so a straight run still sags in the middle.
 */
export function cableGeometry(x1, y1, x2, y2) {
  const span = Math.hypot(x2 - x1, y2 - y1);
  const lead = Math.max(70, Math.abs(x2 - x1) * 0.45);
  const sag = Math.min(90, 28 + span * 0.1);
  const c1x = x1 + lead;
  const c1y = y1 + sag;
  const c2x = x2 - lead;
  const c2y = y2 + sag;
  return {
    d: `M${x1} ${y1} C${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2}`,
    mid: { x: (x1 + 3 * c1x + 3 * c2x + x2) / 8, y: (y1 + 3 * c1y + 3 * c2y + y2) / 8 },
  };
}

// ── Dates and status ──────────────────────────────────────────────────────

const CHICAGO = 'America/Chicago';

/** Today's calendar date in Chicago, as YYYY-MM-DD. */
export const todayChicago = () => new Intl.DateTimeFormat('en-CA', { timeZone: CHICAGO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function addDaysIso(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function formatWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${new Intl.DateTimeFormat('en-US', { timeZone: CHICAGO, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)} CT`;
}

export const STATUS_LABEL = {
  open: 'Open',
  held: 'Held',
  booked: 'Booked',
  blocked: 'Closed',
  none: 'No entry',
};

/** How many dates differ between two preview results (a missing date is "none"). */
export function countChangedDates(before, after) {
  const map = (days) => new Map((days || []).map((day) => [day.date, day.status]));
  const a = map(before);
  const b = map(after);
  let changed = 0;
  for (const date of new Set([...a.keys(), ...b.keys()])) {
    if ((a.get(date) || 'none') !== (b.get(date) || 'none')) changed += 1;
  }
  return changed;
}

// ── Words ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  unauthorized: 'The admin token was not accepted.',
  'database-unavailable': 'The database is not reachable right now. Try again in a minute.',
  'graph-unavailable': 'The saved routing could not be loaded.',
  'graph-save-failed': 'The routing could not be saved. Nothing was changed.',
  'preview-unavailable': 'The preview could not be calculated right now.',
  'graph-shape-invalid': 'The layout was not in a shape the server accepts. Revert and try again.',
  'graph-too-large': 'There are too many calendars or cables on the board.',
  'node-id-invalid': 'A calendar on the board has a name the server does not accept.',
  'node-kind-mismatch': 'A calendar on the board does not match its type.',
  'node-duplicate': 'The same calendar is on the board twice.',
  'route-endpoint-missing': 'A cable points at a calendar that is not on the board.',
  'unknown-route-kind': 'A cable has a type the server does not know.',
  'self-route': 'A calendar cannot be cabled to itself.',
  'route-not-allowed': 'A cable joins two things that cannot be joined.',
  'route-duplicate': 'Two cables join the same pair.',
  'invalid-calendar-id': 'A Google calendar ID has characters that are not allowed.',
  'unknown-resource': 'That calendar is not known to the server.',
  'invalid-range': 'The preview range was not accepted.',
  network: 'The server could not be reached.',
};

export const messageFor = (code) => MESSAGES[code] || `The server answered “${code}”.`;
