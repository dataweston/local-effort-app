const crypto = require('crypto');
const express = require('express');

const februaryCheckoutHandler = require('../../../api-handlers/february/checkout');
const weeklyOrderCheckoutHandler = require('../../../api-handlers/weekly-order/checkout');
const psycheCheckoutHandler = require('../../../api-handlers/psyche/checkout');
const { prisma } = require('../utils/prisma');

const UCP_VERSION = '2026-01-11';
const CHECKOUT_CAPABILITY_NAME = 'dev.ucp.shopping.checkout';
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const MAX_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const STORE_RETENTION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const SITE_FALLBACK = 'https://www.localeffortfood.com';

const CHECKOUT_SCOPES = {
  create: 'commerce:checkout:create',
  read: 'commerce:checkout:read',
  update: 'commerce:checkout:update',
  complete: 'commerce:checkout:complete',
  cancel: 'commerce:checkout:cancel',
};

const FLOW_DEFS = {
  psyche: {
    aliases: ['psyche', 'psyche-olive-oil', 'psychepage'],
    title: 'Psyche Olive Oil',
    path: '/psyche',
    kind: 'physical_good',
  },
  february: {
    aliases: ['february', 'february-dinner', 'february-home-dinner', 'februarypage'],
    title: 'February Home Dinner',
    path: '/february',
    kind: 'service_booking',
  },
  'weekly-order': {
    aliases: ['weekly-order', 'weekly', 'weekly-order-meals', 'weeklyorderpage'],
    title: 'Weekly Order',
    path: '/weekly-order',
    kind: 'meal_plan',
  },
  'small-events': {
    aliases: ['small-events', 'small-events-catering', 'small events'],
    title: 'Small Events',
    path: '/#small-events',
    kind: 'event_booking',
  },
  'local-pizza': {
    aliases: ['local-pizza', 'local-pizza-party', 'pizza-party', 'pizza'],
    title: 'Local Pizza Party',
    path: '/#local-pizza',
    kind: 'event_booking',
  },
};

const sessions = new Map();
const completionIdempotency = new Map();

let storeReady = null;
let storeInitPromise = null;
let lastStoreWarningAt = 0;

function nowIso() {
  return new Date().toISOString();
}

function normalizeString(value, max = 200) {
  if (value == null) return '';
  return String(value).trim().slice(0, max);
}

function parsePositiveInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function toCents(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.round(num));
}

function resolveSiteUrl() {
  const raw =
    process.env.PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_URL ||
    process.env.VERCEL_URL ||
    SITE_FALLBACK;
  if (!raw) return SITE_FALLBACK;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/$/, '');
  return `https://${raw}`.replace(/\/$/, '');
}

function generateSessionId() {
  const suffix = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : crypto.randomBytes(16).toString('hex');
  return `chk_${suffix.slice(0, 24)}`;
}

function normalizeFlowCandidate(raw) {
  const candidate = normalizeString(raw, 120).toLowerCase();
  if (!candidate) return null;
  const entries = Object.entries(FLOW_DEFS);
  for (const [flowId, def] of entries) {
    if (flowId === candidate) return flowId;
    if (def.aliases.includes(candidate)) return flowId;
  }
  return null;
}

function inferFlowFromLineItems(lineItems) {
  for (const item of lineItems || []) {
    const id = normalizeFlowCandidate(item?.id || item?.item?.id || item?.sku || item?.product_id);
    if (id) return id;
  }
  return null;
}

function normalizeLineItems(lineItems) {
  if (!Array.isArray(lineItems)) return [];
  return lineItems
    .map((item, idx) => {
      const quantity = parsePositiveInt(item?.quantity ?? item?.qty, 1);
      const itemId = normalizeString(item?.id || item?.item?.id || `item-${idx + 1}`, 120);
      const title = normalizeString(
        item?.item?.title || item?.title || item?.name || itemId || `Item ${idx + 1}`,
        200
      );
      const unitPriceCents = toCents(
        item?.item?.unit_price?.amount ??
        item?.unitPriceCents ??
        item?.unit_price_cents ??
        item?.priceCents ??
        item?.price
      );
      return {
        id: itemId || `item-${idx + 1}`,
        quantity,
        item: {
          id: itemId || `item-${idx + 1}`,
          title,
          unit_price: {
            amount: unitPriceCents,
            currency: 'USD',
          },
        },
      };
    })
    .filter((item) => item.quantity > 0);
}

function computeTotals(lineItems) {
  const subtotal = lineItems.reduce((sum, item) => {
    const unit = toCents(item?.item?.unit_price?.amount);
    const qty = parsePositiveInt(item?.quantity, 0);
    return sum + (unit * qty);
  }, 0);
  return [
    { type: 'subtotal', amount: { amount: subtotal, currency: 'USD' } },
    { type: 'total', amount: { amount: subtotal, currency: 'USD' } },
  ];
}

function createEscalationMessage(text) {
  return [{ severity: 'escalation', code: 'requires_buyer_interaction', text }];
}

function buildContinueUrl(flowId, sessionId) {
  const base = resolveSiteUrl();
  const def = FLOW_DEFS[flowId];
  const path = def?.path || '/';
  const url = new URL(path, base);
  if (!url.searchParams.get('ucpCheckoutId')) {
    url.searchParams.set('ucpCheckoutId', sessionId);
  }
  return url.toString();
}

function parseExpiresAtMs(requestedExpiresAt) {
  if (!requestedExpiresAt) return Date.now() + DEFAULT_SESSION_TTL_MS;
  const parsed = new Date(requestedExpiresAt);
  const value = parsed.getTime();
  if (!Number.isFinite(value)) return Date.now() + DEFAULT_SESSION_TTL_MS;
  const min = Date.now() + 60_000;
  const max = Date.now() + MAX_SESSION_TTL_MS;
  return Math.min(max, Math.max(min, value));
}

function normalizeScopes(value) {
  if (Array.isArray(value)) {
    return value
      .map((scope) => normalizeString(scope, 120))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((scope) => normalizeString(scope, 120))
      .filter(Boolean);
  }
  return [];
}

function normalizeAuthContext(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const actorId = normalizeString(raw.actorId || raw.actor_id, 200);
  if (!actorId) return null;
  const actorType = normalizeString(raw.actorType || raw.actor_type, 80) || 'agent';
  const sessionId = normalizeString(raw.sessionId || raw.session_id, 120) || null;
  const scopes = normalizeScopes(raw.scopes);
  return {
    actorId,
    actorType,
    sessionId,
    scopes,
  };
}

function authHasScope(auth, requiredScope) {
  if (!auth || !requiredScope) return false;
  const scopes = Array.isArray(auth.scopes) ? auth.scopes : [];
  if (!scopes.length) return false;
  if (scopes.includes('*')) return true;
  if (scopes.includes(requiredScope)) return true;
  return scopes.some((scope) => {
    if (!scope.endsWith('*')) return false;
    const prefix = scope.slice(0, -1);
    return requiredScope.startsWith(prefix);
  });
}

function authorizeAction({ auth, requireAuth = false, requiredScope = null, session = null }) {
  if (requireAuth && !auth) {
    return { ok: false, statusCode: 401, body: { error: 'auth-required' } };
  }

  if (requiredScope && auth && !authHasScope(auth, requiredScope)) {
    return {
      ok: false,
      statusCode: 403,
      body: { error: 'scope-required', requiredScope },
    };
  }

  if (session?.owner?.actorId) {
    if (!auth) {
      return { ok: false, statusCode: 401, body: { error: 'auth-required-for-owner-session' } };
    }
    if (auth.actorId !== session.owner.actorId) {
      return { ok: false, statusCode: 403, body: { error: 'session-owner-mismatch' } };
    }
    if (session.owner.sessionId && auth.sessionId && session.owner.sessionId !== auth.sessionId) {
      return { ok: false, statusCode: 403, body: { error: 'session-context-mismatch' } };
    }
  }

  return { ok: true };
}

function sessionLinks() {
  const site = resolveSiteUrl();
  return [
    { rel: 'privacy', href: `${site}/privacy` },
    { rel: 'terms', href: `${site}/terms` },
  ];
}

function buildResponse(session, extra = {}) {
  return {
    ucp: {
      version: UCP_VERSION,
      capabilities: [
        {
          name: CHECKOUT_CAPABILITY_NAME,
          version: UCP_VERSION,
        },
      ],
    },
    checkout_session_id: session.id,
    status: session.status,
    currency: 'USD',
    line_items: session.lineItems,
    buyer: session.buyer || null,
    totals: session.totals,
    payment: session.payment || { status: 'pending' },
    order: session.order || null,
    continue_url: session.continueUrl,
    links: sessionLinks(),
    metadata: session.metadata || {},
    security: {
      owner: session.owner
        ? {
            actor_id: session.owner.actorId,
            actor_type: session.owner.actorType,
            session_id: session.owner.sessionId,
          }
        : null,
    },
    created_at: session.createdAt,
    updated_at: session.updatedAt,
    expires_at: new Date(session.expiresAtMs).toISOString(),
    ...extra,
  };
}

function warnStoreFallback(error) {
  const now = Date.now();
  if (now - lastStoreWarningAt < 60_000) return;
  lastStoreWarningAt = now;
  const message = error?.message || error || 'unknown';
  console.warn('[ucp] persistent store unavailable, using in-memory sessions only:', message);
}

async function ensureStoreReady() {
  if (storeReady !== null) return storeReady;
  if (!prisma || typeof prisma.$executeRawUnsafe !== 'function') {
    storeReady = false;
    return false;
  }
  if (storeInitPromise) return storeInitPromise;

  storeInitPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ucp_checkout_sessions" (
          "id" TEXT PRIMARY KEY,
          "status" TEXT NOT NULL,
          "flow_id" TEXT NOT NULL,
          "owner_actor_id" TEXT,
          "owner_actor_type" TEXT,
          "owner_session_id" TEXT,
          "expires_at" TIMESTAMPTZ NOT NULL,
          "created_at" TIMESTAMPTZ NOT NULL,
          "updated_at" TIMESTAMPTZ NOT NULL,
          "payload" JSONB NOT NULL
        )
      `);
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "ucp_checkout_sessions_expires_at_idx" ON "ucp_checkout_sessions" ("expires_at")'
      );
      storeReady = true;
      return true;
    } catch (error) {
      storeReady = false;
      warnStoreFallback(error);
      return false;
    } finally {
      storeInitPromise = null;
    }
  })();

  return storeInitPromise;
}

function serializeSession(session) {
  return {
    id: session.id,
    flowId: session.flowId,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    expiresAtMs: session.expiresAtMs,
    lineItems: session.lineItems,
    totals: session.totals,
    buyer: session.buyer || null,
    metadata: session.metadata || {},
    payment: session.payment || { status: 'pending' },
    order: session.order || null,
    continueUrl: session.continueUrl,
    platformAgent: session.platformAgent || '',
    messages: Array.isArray(session.messages) ? session.messages : [],
    owner: session.owner || null,
  };
}

function deserializeSession(rawPayload) {
  let raw = rawPayload;
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object') return null;

  const id = normalizeString(raw.id, 120);
  if (!id) return null;

  const flowId = normalizeFlowCandidate(raw.flowId || raw.flow_id || raw.flow) || 'weekly-order';
  const createdAt = normalizeString(raw.createdAt || raw.created_at, 80) || nowIso();
  const updatedAt = normalizeString(raw.updatedAt || raw.updated_at, 80) || createdAt;
  const expiresAtMs = Number.isFinite(Number(raw.expiresAtMs))
    ? Number(raw.expiresAtMs)
    : parseExpiresAtMs(raw.expiresAt || raw.expires_at);
  const status = normalizeString(raw.status, 80) || 'incomplete';
  const lineItems = normalizeLineItems(raw.lineItems || raw.line_items || []);
  const totals = Array.isArray(raw.totals) ? raw.totals : computeTotals(lineItems);
  const buyer = raw.buyer && typeof raw.buyer === 'object' ? raw.buyer : null;
  const metadata = raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {};
  const payment = raw.payment && typeof raw.payment === 'object' ? raw.payment : { status: 'pending' };
  const order = raw.order && typeof raw.order === 'object' ? raw.order : null;
  const continueUrl = normalizeString(raw.continueUrl || raw.continue_url, 1000) || buildContinueUrl(flowId, id);
  const platformAgent = normalizeString(raw.platformAgent || raw.platform_agent, 500);
  const messages = Array.isArray(raw.messages) ? raw.messages : [];
  const owner = normalizeAuthContext(raw.owner);

  return {
    id,
    flowId,
    status,
    createdAt,
    updatedAt,
    expiresAtMs,
    lineItems,
    totals,
    buyer,
    metadata,
    payment,
    order,
    continueUrl,
    platformAgent,
    messages,
    owner: owner
      ? {
          actorId: owner.actorId,
          actorType: owner.actorType,
          sessionId: owner.sessionId,
          scopes: owner.scopes,
        }
      : null,
  };
}

async function persistSessionToStore(session) {
  const ready = await ensureStoreReady();
  if (!ready) return false;
  try {
    const payload = JSON.stringify(serializeSession(session));
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "ucp_checkout_sessions" (
          "id", "status", "flow_id", "owner_actor_id", "owner_actor_type", "owner_session_id",
          "expires_at", "created_at", "updated_at", "payload"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
        ON CONFLICT ("id")
        DO UPDATE SET
          "status" = EXCLUDED."status",
          "flow_id" = EXCLUDED."flow_id",
          "owner_actor_id" = EXCLUDED."owner_actor_id",
          "owner_actor_type" = EXCLUDED."owner_actor_type",
          "owner_session_id" = EXCLUDED."owner_session_id",
          "expires_at" = EXCLUDED."expires_at",
          "updated_at" = EXCLUDED."updated_at",
          "payload" = EXCLUDED."payload"
      `,
      session.id,
      session.status,
      session.flowId,
      session.owner?.actorId || null,
      session.owner?.actorType || null,
      session.owner?.sessionId || null,
      new Date(session.expiresAtMs),
      new Date(session.createdAt),
      new Date(session.updatedAt),
      payload
    );
    return true;
  } catch (error) {
    warnStoreFallback(error);
    return false;
  }
}

async function hydrateSessionFromStore(sessionId) {
  const ready = await ensureStoreReady();
  if (!ready) return null;
  try {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "payload" FROM "ucp_checkout_sessions" WHERE "id" = $1 LIMIT 1',
      sessionId
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    const session = deserializeSession(row?.payload || null);
    if (!session) return null;
    sessions.set(session.id, session);
    return session;
  } catch (error) {
    warnStoreFallback(error);
    return null;
  }
}

async function getSessionRecord(sessionId) {
  const id = normalizeString(sessionId, 120);
  if (!id) return null;
  const cached = sessions.get(id);
  if (cached) return cached;
  return hydrateSessionFromStore(id);
}

function markExpiredIfNeeded(session) {
  if (!session) return false;
  if (session.expiresAtMs > Date.now()) return false;
  if (session.status === 'completed' || session.status === 'canceled' || session.status === 'expired') return false;
  session.status = 'expired';
  session.updatedAt = nowIso();
  return true;
}

async function performStoreCleanup() {
  const ready = await ensureStoreReady();
  if (!ready) return;
  try {
    const cutoff = new Date(Date.now() - STORE_RETENTION_TTL_MS);
    await prisma.$executeRawUnsafe(
      'DELETE FROM "ucp_checkout_sessions" WHERE "expires_at" < $1',
      cutoff
    );
  } catch (error) {
    warnStoreFallback(error);
  }
}

setInterval(() => {
  void (async () => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
      const changed = markExpiredIfNeeded(session);
      if (changed) {
        await persistSessionToStore(session);
      }
      if (session.expiresAtMs + MAX_SESSION_TTL_MS < now) {
        sessions.delete(id);
      }
    }
    await performStoreCleanup();
  })();
}, 60_000).unref();

async function invokeCheckoutHandler(handler, payload, headers = {}) {
  let statusCode = 200;
  let body = null;
  let ended = false;
  const req = {
    method: 'POST',
    body: payload,
    headers,
  };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(nextBody) {
      body = nextBody;
      ended = true;
      return this;
    },
    setHeader() {
      return this;
    },
    end(raw) {
      if (!ended) {
        body = raw || null;
      }
      ended = true;
      return this;
    },
  };
  await handler(req, res);
  return { statusCode, body };
}

async function completeViaFlow(flowId, session, requestBody, logger) {
  const metadataPayload = session.metadata?.checkoutPayload;
  const requestPayload = requestBody?.checkout_payload;
  const payload = (requestPayload && typeof requestPayload === 'object')
    ? requestPayload
    : (metadataPayload && typeof metadataPayload === 'object' ? metadataPayload : null);

  if (!payload) {
    return {
      ok: false,
      statusCode: 422,
      message: 'Missing checkout payload. Provide checkout_payload with required payment fields.',
      escalation: true,
    };
  }

  if (!payload.checkoutAttemptId) {
    payload.checkoutAttemptId = session.id;
  }

  let result = null;
  if (flowId === 'psyche') {
    result = await invokeCheckoutHandler(psycheCheckoutHandler, payload);
  } else if (flowId === 'february') {
    result = await invokeCheckoutHandler(februaryCheckoutHandler, payload);
  } else if (flowId === 'weekly-order') {
    result = await invokeCheckoutHandler(weeklyOrderCheckoutHandler, payload);
  } else {
    return {
      ok: false,
      statusCode: 409,
      message: 'This flow requires buyer interaction in hosted checkout UI.',
      escalation: true,
    };
  }

  if (result.statusCode >= 200 && result.statusCode < 300) {
    return {
      ok: true,
      statusCode: result.statusCode,
      payload: result.body || {},
    };
  }

  if (logger?.warn) {
    logger.warn({ flowId, statusCode: result.statusCode, payload: result.body }, 'ucp complete flow failed');
  }

  return {
    ok: false,
    statusCode: result.statusCode || 500,
    message: result.body?.error || 'Checkout completion failed.',
    escalation: false,
  };
}

function buildBusinessProfile(siteUrl) {
  const normalizedSite = (siteUrl || resolveSiteUrl()).replace(/\/$/, '');
  const services = {
    'dev.ucp.shopping': [
      {
        version: UCP_VERSION,
        transport: 'rest',
        endpoint: `${normalizedSite}/ucp/v1`,
        spec: 'https://ucp.dev/specification/overview/',
        schema: 'https://ucp.dev/specification/services/shopping/capabilities/checkout-rest-binding/',
      },
      {
        version: UCP_VERSION,
        transport: 'mcp',
        endpoint: `${normalizedSite}/.well-known/mcp`,
        spec: 'https://ucp.dev/specification/overview/',
      },
    ],
  };
  const capabilities = [
    {
      name: CHECKOUT_CAPABILITY_NAME,
      version: UCP_VERSION,
      spec: 'https://ucp.dev/specification/services/shopping/capabilities/checkout/',
    },
  ];
  const products = Object.entries(FLOW_DEFS).map(([id, def]) => ({
    id,
    title: def.title,
    kind: def.kind,
    continue_url: new URL(def.path, normalizedSite).toString(),
  }));
  return {
    version: UCP_VERSION,
    services,
    capabilities,
    ucp: {
      version: UCP_VERSION,
      services,
      capabilities,
    },
    business: {
      name: 'Local Effort Cooperative',
      site: normalizedSite,
      products,
    },
    payment: {
      provider: 'square',
      notes: [
        'Card-capture completion is currently implemented for psyche, february, and weekly-order flows.',
        'small-events and local-pizza currently require hosted buyer interaction (estimate + hold + deposit link).',
      ],
    },
  };
}

async function createCheckoutSession(requestBody = {}, options = {}) {
  const auth = normalizeAuthContext(options.auth);
  const authz = authorizeAction({
    auth,
    requireAuth: Boolean(options.requireAuth),
    requiredScope: CHECKOUT_SCOPES.create,
  });
  if (!authz.ok) return authz;

  const body = requestBody && typeof requestBody === 'object' ? requestBody : {};
  const lineItems = normalizeLineItems(body.line_items || body.lineItems || []);
  const metadata = body.metadata && typeof body.metadata === 'object' ? { ...body.metadata } : {};
  const buyer = body.buyer && typeof body.buyer === 'object' ? body.buyer : null;
  const flowFromInput = normalizeFlowCandidate(body.flow || metadata.flow || metadata.product);
  const flowId = flowFromInput || inferFlowFromLineItems(lineItems) || 'weekly-order';
  const id = generateSessionId();
  const expiresAtMs = parseExpiresAtMs(body.expires_at || body.expiresAt);
  const createdAt = nowIso();
  const continueUrl = buildContinueUrl(flowId, id);

  const status = (flowId === 'small-events' || flowId === 'local-pizza')
    ? 'requires_escalation'
    : 'incomplete';
  const messages = status === 'requires_escalation'
    ? createEscalationMessage('This flow requires buyer interaction in hosted checkout UI.')
    : [];

  const session = {
    id,
    flowId,
    status,
    createdAt,
    updatedAt: createdAt,
    expiresAtMs,
    lineItems,
    totals: computeTotals(lineItems),
    buyer,
    metadata,
    payment: { status: 'pending' },
    order: null,
    continueUrl,
    platformAgent: normalizeString(options.platformAgent || options.userAgent, 500),
    messages,
    owner: auth
      ? {
          actorId: auth.actorId,
          actorType: auth.actorType,
          sessionId: auth.sessionId,
          scopes: auth.scopes,
        }
      : null,
  };

  sessions.set(id, session);
  await persistSessionToStore(session);

  return {
    statusCode: 201,
    body: buildResponse(session, { messages }),
  };
}

async function getCheckoutSession(checkoutSessionId, options = {}) {
  const auth = normalizeAuthContext(options.auth);
  const session = await getSessionRecord(checkoutSessionId);
  if (!session) return { statusCode: 404, body: { error: 'checkout-session-not-found' } };

  if (markExpiredIfNeeded(session)) {
    await persistSessionToStore(session);
  }

  const authz = authorizeAction({
    auth,
    requireAuth: Boolean(options.requireAuth),
    requiredScope: CHECKOUT_SCOPES.read,
    session,
  });
  if (!authz.ok) return authz;

  return {
    statusCode: 200,
    body: buildResponse(session, { messages: session.messages || [] }),
  };
}

async function updateCheckoutSession(checkoutSessionId, requestBody = {}, options = {}) {
  const auth = normalizeAuthContext(options.auth);
  const session = await getSessionRecord(checkoutSessionId);
  if (!session) return { statusCode: 404, body: { error: 'checkout-session-not-found' } };

  const authz = authorizeAction({
    auth,
    requireAuth: Boolean(options.requireAuth),
    requiredScope: CHECKOUT_SCOPES.update,
    session,
  });
  if (!authz.ok) return authz;

  if (session.status === 'completed' || session.status === 'canceled') {
    return { statusCode: 409, body: { error: 'checkout-session-not-mutable' } };
  }

  const body = requestBody && typeof requestBody === 'object' ? requestBody : {};
  if (Array.isArray(body.line_items) || Array.isArray(body.lineItems)) {
    session.lineItems = normalizeLineItems(body.line_items || body.lineItems || []);
    session.totals = computeTotals(session.lineItems);
  }
  if (body.buyer && typeof body.buyer === 'object') {
    session.buyer = body.buyer;
  }
  if (body.metadata && typeof body.metadata === 'object') {
    session.metadata = { ...session.metadata, ...body.metadata };
  }
  if (body.expires_at || body.expiresAt) {
    session.expiresAtMs = parseExpiresAtMs(body.expires_at || body.expiresAt);
  }

  if (session.flowId === 'small-events' || session.flowId === 'local-pizza') {
    session.status = 'requires_escalation';
    session.messages = createEscalationMessage('This flow requires buyer interaction in hosted checkout UI.');
  } else {
    session.status = 'incomplete';
    session.messages = [];
  }

  session.updatedAt = nowIso();
  await persistSessionToStore(session);

  return {
    statusCode: 200,
    body: buildResponse(session, { messages: session.messages }),
  };
}

async function completeCheckoutSession(checkoutSessionId, requestBody = {}, options = {}) {
  const auth = normalizeAuthContext(options.auth);
  const session = await getSessionRecord(checkoutSessionId);
  if (!session) return { statusCode: 404, body: { error: 'checkout-session-not-found' } };

  const authz = authorizeAction({
    auth,
    requireAuth: Boolean(options.requireAuth),
    requiredScope: CHECKOUT_SCOPES.complete,
    session,
  });
  if (!authz.ok) return authz;

  if (session.status === 'completed') {
    return { statusCode: 200, body: buildResponse(session, { messages: [] }) };
  }
  if (session.status === 'canceled') {
    return { statusCode: 409, body: { error: 'checkout-session-canceled' } };
  }
  if (session.expiresAtMs <= Date.now()) {
    session.status = 'expired';
    session.updatedAt = nowIso();
    await persistSessionToStore(session);
    return {
      statusCode: 409,
      body: buildResponse(session, {
        messages: [{ severity: 'error', code: 'expired', text: 'Checkout session expired.' }],
      }),
    };
  }

  const idempotencyKey = normalizeString(options.idempotencyKey, 120);
  const actorKey = auth?.actorId || 'anonymous';
  if (idempotencyKey) {
    const cacheKey = `${session.id}:${actorKey}:${idempotencyKey}`;
    const cached = completionIdempotency.get(cacheKey);
    if (cached) {
      return { statusCode: 200, body: cached };
    }
  }

  const completion = await completeViaFlow(session.flowId, session, requestBody || {}, options.logger);
  if (!completion.ok) {
    session.status = completion.escalation ? 'requires_escalation' : 'incomplete';
    session.messages = completion.escalation
      ? createEscalationMessage(completion.message)
      : [{ severity: 'error', code: 'complete_failed', text: completion.message }];
    session.updatedAt = nowIso();
    await persistSessionToStore(session);
    return {
      statusCode: completion.statusCode || 422,
      body: buildResponse(session, { messages: session.messages }),
    };
  }

  const paymentId = normalizeString(completion.payload?.paymentId, 120) || null;
  const orderId = normalizeString(completion.payload?.orderId, 120) || paymentId;
  session.status = 'completed';
  session.payment = {
    status: 'paid',
    payment_id: paymentId,
  };
  session.order = {
    order_id: orderId || null,
  };
  session.messages = [];
  session.updatedAt = nowIso();
  await persistSessionToStore(session);

  const responseBody = buildResponse(session, { messages: [] });
  if (idempotencyKey) {
    completionIdempotency.set(`${session.id}:${actorKey}:${idempotencyKey}`, responseBody);
  }
  return { statusCode: 200, body: responseBody };
}

async function cancelCheckoutSession(checkoutSessionId, options = {}) {
  const auth = normalizeAuthContext(options.auth);
  const session = await getSessionRecord(checkoutSessionId);
  if (!session) return { statusCode: 404, body: { error: 'checkout-session-not-found' } };

  const authz = authorizeAction({
    auth,
    requireAuth: Boolean(options.requireAuth),
    requiredScope: CHECKOUT_SCOPES.cancel,
    session,
  });
  if (!authz.ok) return authz;

  if (session.status === 'completed') {
    return { statusCode: 409, body: { error: 'checkout-session-completed' } };
  }

  session.status = 'canceled';
  session.updatedAt = nowIso();
  session.messages = [];
  await persistSessionToStore(session);

  return {
    statusCode: 200,
    body: buildResponse(session, { messages: [] }),
  };
}

function resolveRequestAuth(req) {
  if (!req || !req.headers) return null;
  const actorId = normalizeString(req.headers['x-ucp-actor-id'], 200);
  if (!actorId) return null;
  return normalizeAuthContext({
    actorId,
    actorType: normalizeString(req.headers['x-ucp-actor-type'], 80) || 'api-client',
    sessionId: normalizeString(req.headers['x-ucp-session-id'], 120) || null,
    scopes: normalizeScopes(req.headers['x-ucp-scopes']),
  });
}

function createUcpRouter({ logger } = {}) {
  const router = express.Router();

  router.post('/checkout-sessions', async (req, res) => {
    const result = await createCheckoutSession(req.body, {
      platformAgent: req.headers['ucp-agent'],
      userAgent: req.headers['user-agent'],
      auth: resolveRequestAuth(req),
      requireAuth: false,
    });
    return res.status(result.statusCode).json(result.body);
  });

  router.get('/checkout-sessions/:id', async (req, res) => {
    const result = await getCheckoutSession(req.params.id, {
      auth: resolveRequestAuth(req),
      requireAuth: false,
    });
    return res.status(result.statusCode).json(result.body);
  });

  router.put('/checkout-sessions/:id', async (req, res) => {
    const result = await updateCheckoutSession(req.params.id, req.body, {
      auth: resolveRequestAuth(req),
      requireAuth: false,
    });
    return res.status(result.statusCode).json(result.body);
  });

  router.post('/checkout-sessions/:id/complete', async (req, res) => {
    const result = await completeCheckoutSession(req.params.id, req.body, {
      idempotencyKey: req.headers['idempotency-key'],
      logger,
      auth: resolveRequestAuth(req),
      requireAuth: false,
    });
    return res.status(result.statusCode).json(result.body);
  });

  router.post('/checkout-sessions/:id/cancel', async (req, res) => {
    const result = await cancelCheckoutSession(req.params.id, {
      auth: resolveRequestAuth(req),
      requireAuth: false,
    });
    return res.status(result.statusCode).json(result.body);
  });

  return router;
}

module.exports = {
  CHECKOUT_SCOPES,
  createUcpRouter,
  buildBusinessProfile,
  createCheckoutSession,
  getCheckoutSession,
  updateCheckoutSession,
  completeCheckoutSession,
  cancelCheckoutSession,
};
