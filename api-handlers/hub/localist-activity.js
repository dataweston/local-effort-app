const crypto = require('crypto');
const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString, tableMissing } = require('./_http');
const { enforcePublicRateLimit, PUBLIC_RATE_LIMITS } = require('./_publicRateLimit');


const EVENT_ALLOWLIST = new Set([
  'localist.window.viewed',
  'localist.menu.loaded',
  'localist.cart.updated',
  'localist.checkout.started',
  'localist.checkout.success',
  'localist.link.shared',
]);

function randomId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

function eventSourceId(sessionId, eventType) {
  return ['localist', cleanString(sessionId, 120) || randomId(), eventType, randomId()].join(':');
}

function requestOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}`;
}

function localistUrl(req, token, shared = false) {
  const params = new URLSearchParams({ localist: token });
  if (shared) params.set('shared', '1');
  return `${requestOrigin(req)}/hub?${params.toString()}`;
}

function cleanObject(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 3) return {};
  if (Array.isArray(value)) return value.slice(0, 30).map((entry) => cleanObject(entry, depth + 1));
  return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, entry]) => {
    if (typeof entry === 'string') return [key, entry.slice(0, 500)];
    if (typeof entry === 'number' || typeof entry === 'boolean' || entry === null) return [key, entry];
    if (Array.isArray(entry)) return [key, entry.slice(0, 30).map((item) => (typeof item === 'object' ? cleanObject(item, depth + 1) : item))];
    if (typeof entry === 'object') return [key, cleanObject(entry, depth + 1)];
    return [key, null];
  }));
}


async function findWindowByToken(token) {
  const cleaned = cleanString(token, 240);
  if (!cleaned) return null;
  return prisma.hubLocalistWindow.findUnique({ where: { token: cleaned } });
}

function summarizeEvents(events) {
  const summary = {
    totalEvents: events.length,
    uniqueVisitors: new Set(),
    sharedVisitors: new Set(),
    sessions: new Set(),
    cartSessions: new Map(),
    shareVisitors: new Set(),
    checkoutStartedSessions: new Set(),
    checkoutSuccessSessions: new Set(),
    views: 0,
    menuLoads: 0,
    shareEvents: 0,
    cartUpdates: 0,
    checkoutStarts: 0,
    checkoutSuccesses: 0,
    lastActivityAt: null,
  };

  for (const event of events) {
    const payload = event.payload || {};
    const visitorId = payload.visitorId || null;
    const sessionId = payload.sessionId || null;
    if (visitorId) summary.uniqueVisitors.add(visitorId);
    if (sessionId) summary.sessions.add(sessionId);
    if (payload.entrySource === 'shared' && visitorId) summary.sharedVisitors.add(visitorId);
    if (!summary.lastActivityAt || new Date(event.occurredAt) > new Date(summary.lastActivityAt)) {
      summary.lastActivityAt = asIso(event.occurredAt);
    }

    if (event.eventType === 'localist.window.viewed') summary.views += 1;
    if (event.eventType === 'localist.menu.loaded') summary.menuLoads += 1;
    if (event.eventType === 'localist.link.shared') {
      summary.shareEvents += 1;
      if (visitorId) summary.shareVisitors.add(visitorId);
    }
    if (event.eventType === 'localist.checkout.started') {
      summary.checkoutStarts += 1;
      if (sessionId) summary.checkoutStartedSessions.add(sessionId);
    }
    if (event.eventType === 'localist.checkout.success') {
      summary.checkoutSuccesses += 1;
      if (sessionId) summary.checkoutSuccessSessions.add(sessionId);
    }
    if (event.eventType === 'localist.cart.updated') {
      summary.cartUpdates += 1;
      if (sessionId) {
        summary.cartSessions.set(sessionId, {
          totalQuantity: Number(payload.cart?.totalQuantity) || 0,
          totalCents: Number(payload.cart?.totalCents) || 0,
        });
      }
    }
  }

  const cartSessions = Array.from(summary.cartSessions.entries()).filter(([, cart]) => cart.totalQuantity > 0);
  const abandonedCartSessions = cartSessions.filter(([sessionId]) => !summary.checkoutSuccessSessions.has(sessionId));
  const checkoutAbandonedSessions = Array.from(summary.checkoutStartedSessions).filter((sessionId) => !summary.checkoutSuccessSessions.has(sessionId));
  const uniqueVisitors = summary.uniqueVisitors.size;

  return {
    totalEvents: summary.totalEvents,
    views: summary.views,
    menuLoads: summary.menuLoads,
    uniqueVisitors,
    sessions: summary.sessions.size,
    shareEvents: summary.shareEvents,
    shareVisitors: summary.shareVisitors.size,
    shareRate: uniqueVisitors ? summary.shareVisitors.size / uniqueVisitors : 0,
    sharedVisitors: summary.sharedVisitors.size,
    cartUpdates: summary.cartUpdates,
    cartsStarted: cartSessions.length,
    abandonedCarts: abandonedCartSessions.length,
    checkoutStarts: summary.checkoutStarts,
    checkoutSuccesses: summary.checkoutSuccesses,
    checkoutAbandoned: checkoutAbandonedSessions.length,
    lastActivityAt: summary.lastActivityAt,
  };
}

function publicWindow(req, window, events) {
  const now = Date.now();
  const expiresAtMs = window?.expiresAt ? new Date(window.expiresAt).getTime() : 0;
  return {
    id: window.id,
    valid: !!window.active && Number.isFinite(expiresAtMs) && expiresAtMs > now,
    active: window.active,
    url: localistUrl(req, window.token),
    sharedUrl: localistUrl(req, window.token, true),
    expiresAt: asIso(window.expiresAt),
    createdAt: asIso(window.createdAt),
    smsCampaignId: window.smsCampaignId || null,
    smsSentAt: asIso(window.smsSentAt),
    metrics: summarizeEvents(events),
  };
}

async function handlePost(req, res) {
  if (!await enforcePublicRateLimit(req, res, PUBLIC_RATE_LIMITS.activity)) return;

  const body = req.body || {};
  const eventType = cleanString(body.eventType, 80);
  if (!EVENT_ALLOWLIST.has(eventType)) return res.status(204).end();

  try {
    const window = await findWindowByToken(body.localistToken);
    const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();
    const safeOccurredAt = Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt;
    const payload = {
      windowId: window?.id || null,
      tokenPresent: !!cleanString(body.localistToken, 240),
      tokenValid: window ? !!window.active && new Date(window.expiresAt) > new Date() : null,
      visitorId: cleanString(body.visitorId, 120),
      sessionId: cleanString(body.sessionId, 120),
      entrySource: body.entrySource === 'shared' ? 'shared' : 'direct',
      referrer: cleanString(body.referrer, 500),
      path: cleanString(body.path, 500),
      shareMethod: cleanString(body.shareMethod, 40),
      cart: cleanObject(body.cart),
      metadata: cleanObject(body.metadata),
    };

    await prisma.ledgerEvent.create({
      data: {
        eventType,
        schemaVersion: 1,
        occurredAt: safeOccurredAt,
        source: 'hub_localist',
        sourceId: eventSourceId(payload.sessionId, eventType),
        actorType: 'visitor',
        actorId: payload.visitorId || null,
        payload,
      },
    });
    return res.status(204).end();
  } catch (err) {
    console.warn('[hub/localist-activity] log failed', err?.message);
    return res.status(204).end();
  }
}

async function handleGet(req, res) {
  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { privileged: true });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const limit = Math.max(1, Math.min(Number(req.query?.limit) || 10, 30));
  const windows = await prisma.hubLocalistWindow.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  if (!windows.length) return res.status(200).json({ ok: true, windows: [] });

  const earliest = windows.reduce((min, window) => (
    !min || new Date(window.createdAt) < new Date(min) ? window.createdAt : min
  ), null);
  const windowIds = new Set(windows.map((window) => window.id));
  const events = await prisma.ledgerEvent.findMany({
    where: {
      source: 'hub_localist',
      eventType: { startsWith: 'localist.' },
      occurredAt: { gte: earliest },
      tombstonedAt: null,
    },
    orderBy: { occurredAt: 'asc' },
    take: 5000,
  });

  const eventsByWindow = new Map(windows.map((window) => [window.id, []]));
  for (const event of events) {
    const windowId = event.payload?.windowId || null;
    if (windowIds.has(windowId)) eventsByWindow.get(windowId).push(event);
  }

  return res.status(200).json({
    ok: true,
    generatedAt: new Date().toISOString(),
    windows: windows.map((window) => publicWindow(req, window, eventsByWindow.get(window.id) || [])),
  });
}

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  try {
    if (req.method === 'POST') return handlePost(req, res);
    return handleGet(req, res);
  } catch (err) {
    console.error('[hub/localist-activity] error', err);
    if (tableMissing(err)) return res.status(503).json({ error: 'Localist activity storage is not ready. Run Prisma migrations.' });
    return res.status(500).json({ error: 'Unable to load Localist activity' });
  }
};
