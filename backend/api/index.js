// backend/api/server.js
/* eslint-disable no-console */
require('dotenv').config();
// Sentry (full backend)
let Sentry; let sentryEnabled = false;
try {
  Sentry = require('@sentry/node');
  const { nodeProfilingIntegration } = require('@sentry/profiling-node');
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENV || process.env.NODE_ENV || 'development',
      integrations: [nodeProfilingIntegration()],
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
      profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE || 0.0),
    });
    sentryEnabled = true;
  }
} catch (e) {
  // ignore if not installed yet
}
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { getSanityClient, getSanityReadClient } = require('./sanityClient');
const { getSupabase } = require('./supabaseClient');
const fs = require('fs');
const path = require('path');
// Structured logger (pino wrapper)
const { logger } = require('./logger');
const { createBrevoService } = require('./services/brevo');
const { createEmailOutboxService } = require('./services/emailOutbox');
const { createCrowdfundingRouter } = require('./routes/crowdfunding');
const crowdfundCheckoutHandler = require('../../api-handlers/crowdfund/checkout');
const crowdfundFeedbackHandler = require('../../api-handlers/crowdfund/feedback');
const storeCheckoutHandler = require('../../api-handlers/store/checkout');
const giftCardCheckoutHandler = require('../../api-handlers/store/gift-card-checkout');
const pizzaPartyCheckoutHandler = require('../../api-handlers/store/pizza-party-checkout');
const pizzaPartyStatusHandler = require('../../api-handlers/store/pizza-party-status');
const pizzaPartyReceiptHandler = require('../../api-handlers/store/pizza-party-receipt');
const pizzaPartyLinkHandler = require('../../api-handlers/store/pizza-party-link');
const pizzaPartyBookingsHandler = require('../../api-handlers/store/pizza-party-bookings');
const storeProductsHandler = require('../../api-handlers/store/products');
const storeSyncSquareHandler = require('../../api-handlers/store/sync-square');
const giftCardLinkHandler = require('../../api-handlers/store/gift-card-link');
const salesProxyHandler = require('../../api-handlers/sales-proxy');
const winterDinnerCheckoutHandler = require('../../api-handlers/winter-dinner/checkout');
const winterDinnerPaymentLinkHandler = require('../../api-handlers/winter-dinner/payment-link');
const februaryBookedDatesHandler = require('../../api-handlers/february/booked-dates');
const februaryCheckoutHandler = require('../../api-handlers/february/checkout');
const februaryPaymentLinkHandler = require('../../api-handlers/february/payment-link');
const weeklyOrderCheckoutLinkHandler = require('../../api-handlers/weekly-order/checkout-link');
const psycheCheckoutHandler = require('../../api-handlers/psyche/checkout');
const pizzafunderPaymentLinkHandler = require('../../api-handlers/pizzafunder/payment-link');
const foodTruckDepositLinkHandler = require('../../api-handlers/food-truck/deposit-link');
const happymondayProcessPaymentHandler = require('../../api-handlers/happymonday/process-payment');
const happymondayPaymentLinkHandler = require('../../api-handlers/happymonday/payment-link');
const { createMessagesRouter } = require('./routes/messages');
const { createSmallEventsRouter } = require('./routes/smallEvents');
const { createPlannerRouter } = require('./routes/planner');
const {
  CHECKOUT_SCOPES,
  createUcpRouter,
  buildBusinessProfile: buildUcpBusinessProfile,
} = require('./routes/ucp');
const {
  verifySquareSignature,
  applyCompletedPayment,
  getCrowdfundingSummary,
  createFeedback,
  listFeedback,
} = require('../../packages/lib/crowdfundingPipeline');
const { applySmallEventPayment } = require('./utils/smallEventsPayments');
const {
  loadPublishedCrowdfundingSummary,
} = require('../../packages/lib/crowdfundingFallbacks');

// Fallback: if critical vars are missing, also try loading project root .env
if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.BREVO_API_KEY) {
  try {
    const rootEnvPath = path.resolve(__dirname, '../../.env');
    require('dotenv').config({ path: rootEnvPath });
  } catch (e) {
    // no-op
  }
}

// Import Square Client (defensive: handle varying export shapes across versions)
let Client, Environment;
try {
  const squarePkg = require('square');
  Client = squarePkg.Client || (squarePkg.default && squarePkg.default.Client);
  Environment = squarePkg.Environment || (squarePkg.default && squarePkg.default.Environment) || null;
} catch (err) {
  console.warn('Square SDK not available or failed to load:', err && err.message);
}
const { getFirebaseAdmin } = require('../../api-handlers/_lib/firebaseAdmin');
const firebaseAdminResources = (() => {
  try {
    return getFirebaseAdmin();
  } catch (error) {
    console.warn('[backend] failed to load firebase admin helper', error?.message || error);
    return { admin: null, firestore: null };
  }
})();

const admin = firebaseAdminResources.admin;
const db = firebaseAdminResources.firestore;
if (!db) {
  console.warn('Firestore will be unavailable in this process.');
}

const { v4: uuidv4 } = require('uuid'); // Import UUID for idempotency

// --- Auth middleware for admin-only endpoints (Gallant tools) ---
const GALLANT_ALLOWED = new Set([
  'dataweston@gmail.com',
  'colsen03@gmail.com',
  ...(process.env.GALLANT_ALLOWED_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
]);

// (MCP allowlists removed from this process — handled by dedicated MCP server if needed)

// AI manifest path (machine-readable site schema) used by /api/public/site
const AI_MANIFEST_PATH = path.resolve(__dirname, '../../public/ai/manifest.json');

async function authenticateAllowedUser(req) {
  const authHeader = req.headers.authorization || '';
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return { ok: false, status: 401, error: 'missing-auth' };
  if (!admin?.auth) return { ok: false, status: 500, error: 'auth-unavailable' };
  try {
    const decoded = await admin.auth().verifyIdToken(m[1]);
    const email = decoded?.email;
    if (!email || !GALLANT_ALLOWED.has(email)) return { ok: false, status: 403, error: 'forbidden' };
    return { ok: true, user: { uid: decoded.uid, email } };
  } catch (err) {
    return { ok: false, status: 401, error: 'invalid-auth' };
  }
}

async function requireAllowedUser(req, res, next) {
  const auth = await authenticateAllowedUser(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  req.user = auth.user;
  return next();
}

function createRateLimiter({ name, windowMs, max }) {
  const cache = new Map();
  const windowDuration = Math.max(1000, Number(windowMs) || 60000);
  const maxRequests = Math.max(1, Number(max) || 60);

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    const key = `${name}:${String(ip).split(',')[0].trim()}`;
    const now = Date.now();
    const current = cache.get(key);
    if (!current || current.expiresAt <= now) {
      cache.set(key, { count: 1, expiresAt: now + windowDuration });
      return next();
    }
    if (current.count >= maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((current.expiresAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'rate-limit-exceeded', scope: name, retryAfter });
    }
    current.count += 1;
    if (cache.size > 5000) {
      for (const [cacheKey, value] of cache.entries()) {
        if (value.expiresAt <= now) cache.delete(cacheKey);
      }
    }
    return next();
  };
}

function auditLog(req, action, details = {}) {
  logger.info(
    {
      audit: true,
      action,
      actor: req.user?.email || null,
      path: req.path,
      method: req.method,
      ip: req.ip || null,
      userAgent: req.get('user-agent') || null,
      ...details,
    },
    'audit event'
  );
}

function normalizeGroq(query) {
  return String(query || '').replace(/\s+/g, ' ').trim();
}

const PUBLIC_SANITY_QUERY_ALLOWLIST = new Set([
  normalizeGroq('*[_type == "blogPost"] | order(publishedAt desc)[0...50]{ title, "slug": slug.current, excerpt, publishedAt }'),
  normalizeGroq('*[_type == "blogPost"] | order(publishedAt desc)[0...50]{ title, "slug": slug.current, excerpt, publishedAt, mainImage }'),
  normalizeGroq('*[_type == "blogPost" && slug.current == $slug][0]{ title, publishedAt, body }'),
  normalizeGroq('*[_type == "blogPost" && slug.current == $slug][0]{ title, publishedAt, body, mainImage }'),
  normalizeGroq('*[_type == "salePage"][0]{ title, titleIcon, subheading, intro }'),
  normalizeGroq('*[_type == "release"] | order(coalesce(publishedAt, _createdAt) desc)[0...50]{ _id, title, "slug": slug.current, summary, publishedAt, body, canonicalUrl, metaDescription, heroImage{ alt, "url": asset->url } }'),
  normalizeGroq('*[_type in ["pricingFaq","page","post"] && (defined(question) && question match $q || defined(answer) && answer match $q || defined(title) && title match $q || defined(body) && body match $q)] | order(_updatedAt desc)[0...10]{ _id, question, answer, title }'),
]);

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasValidSanityParams(params) {
  if (!isPlainObject(params)) return false;
  const entries = Object.entries(params);
  if (entries.length > 10) return false;
  return entries.every(([key, value]) => {
    if (!/^[a-zA-Z0-9_]{1,64}$/.test(key)) return false;
    if (value === null) return true;
    if (typeof value === 'string') return value.length <= 200;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'boolean') return true;
    return false;
  });
}

function isSanityAuthError(err) {
  const statusCode = err?.statusCode || err?.status || err?.response?.statusCode || err?.response?.status;
  return statusCode === 401 || statusCode === 403;
}

function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function validateSanityWebhookSecret(req) {
  const expected = process.env.SANITY_WEBHOOK_SECRET || process.env.BLOG_WEBHOOK_SECRET;
  if (!expected) {
    return { ok: false, status: 503, error: 'webhook-secret-not-configured' };
  }

  const body = isPlainObject(req.body) ? req.body : {};
  const query = isPlainObject(req.query) ? req.query : {};
  const candidates = [
    req.get('X-Sanity-Webhook-Secret'),
    req.get('X-Webhook-Secret'),
    req.get('X-Admin-Token'),
    typeof query.secret === 'string' ? query.secret : null,
    typeof body.secret === 'string' ? body.secret : null,
  ].filter((value) => typeof value === 'string' && value.length > 0);

  if (!candidates.some((value) => timingSafeEqualString(value, expected))) {
    return { ok: false, status: 401, error: 'unauthorized' };
  }

  return { ok: true };
}

function validateBrevoWebhookSecret(req) {
  const expected = process.env.BREVO_WEBHOOK_SECRET;
  if (!expected) {
    return { ok: false, status: 503, error: 'brevo-webhook-secret-not-configured' };
  }
  const body = isPlainObject(req.body) ? req.body : {};
  const query = isPlainObject(req.query) ? req.query : {};
  const candidates = [
    req.get('X-Brevo-Webhook-Secret'),
    req.get('X-Brevo-Webhook-Token'),
    req.get('X-Webhook-Token'),
    req.get('X-Webhook-Secret'),
    req.get('X-Mailin-Token'),
    typeof query.secret === 'string' ? query.secret : null,
    typeof query.token === 'string' ? query.token : null,
    typeof body.secret === 'string' ? body.secret : null,
    typeof body.token === 'string' ? body.token : null,
  ].filter((value) => typeof value === 'string' && value.length > 0);
  if (!candidates.some((value) => timingSafeEqualString(value, expected))) {
    return { ok: false, status: 401, error: 'unauthorized' };
  }
  return { ok: true };
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeBrevoEventType(raw) {
  const normalized = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const aliasMap = {
    hardbounce: 'hard_bounce',
    hard_bounce: 'hard_bounce',
    softbounce: 'soft_bounce',
    soft_bounce: 'soft_bounce',
    spamcomplaint: 'complaint',
    spam_complaint: 'complaint',
    complaint: 'complaint',
    spam: 'spam',
    unsubscribe: 'unsubscribed',
    unsubscribed: 'unsubscribed',
    invalid: 'invalid_email',
    invalid_email: 'invalid_email',
    blocked: 'blocked',
    delivered: 'delivered',
    deferred: 'deferred',
    error: 'error',
    opened: 'opened',
    click: 'click',
    clicked: 'click',
  };
  return aliasMap[normalized] || normalized;
}

function extractBrevoEvents(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.events)) return body.events;
  if (body && typeof body === 'object') return [body];
  return [];
}

// --- INITIALIZE SQUARE CLIENT (defensive) ---
let squareClient = null;
if (Client) {
  // Resolve environment: prefer SDK Environment enum when available
  const envName = process.env.SQUARE_ENVIRONMENT || 'Sandbox';
  let resolvedEnv = null;
  if (Environment && Environment[envName]) {
    resolvedEnv = Environment[envName];
  } else if (Environment && Environment.Sandbox) {
    resolvedEnv = Environment.Sandbox;
  } else {
    // fall back to string (some SDK versions tolerate this)
    resolvedEnv = envName;
  }

  squareClient = new Client({
    environment: resolvedEnv,
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
  });
  logger.info({ env: envName, hasToken: !!process.env.SQUARE_ACCESS_TOKEN }, 'square client initialized');
} else {
  logger.warn('square client missing; crowdfund endpoints will error');
}

const app = express();
const brevoService = createBrevoService({ getSanityClient, logger });
const emailOutboxService = createEmailOutboxService({
  getSanityClient,
  getSanityReadClient,
  brevoService,
  logger,
});
const publishRateLimit = createRateLimiter({ name: 'publish', windowMs: 60 * 1000, max: 30 });
const webhookRateLimit = createRateLimiter({ name: 'webhook', windowMs: 60 * 1000, max: 120 });
const sanityQueryRateLimit = createRateLimiter({ name: 'sanity-query', windowMs: 60 * 1000, max: 180 });

// Attach Sentry request + tracing handlers early (before other middleware) if enabled
if (sentryEnabled) {
  try {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  } catch (e) {
    logger.warn({ err: e && e.message }, 'failed to register sentry handlers');
  }
}

// --- CORS CONFIGURATION ---
const allowedOrigins = [
  'https://localeffortfood.com',
  'https://www.localeffortfood.com'
];
const corsOptions = { origin: allowedOrigins };
app.use(cors(corsOptions));
app.post('/api/square/webhook', express.raw({ type: '*/*', limit: '2mb' }), async (req, res) => {
  try {
    const signatureHeader = req.headers['x-square-hmacsha256-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!signature) {
      return res.status(400).json({ ok: false, error: 'missing-signature' });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    if (!verifySquareSignature(rawBody, signature)) {
      return res.status(400).json({ ok: false, error: 'invalid-signature' });
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventType = payload?.type ?? payload?.event_type;
    if (!eventType || !String(eventType).includes('payment')) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const payment = payload?.data?.object?.payment;
    if (!payment || !payment.id) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const status = String(payment.status || '').toUpperCase();
    if (status !== 'COMPLETED') {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const handledSmallEvent = await applySmallEventPayment(payment, { logger });
    if (handledSmallEvent) {
      return res.status(200).json({ ok: true, handled: 'small-events' });
    }

    await applyCompletedPayment(payment, { db });
    return res.status(200).json({ ok: true });
  } catch (err) {
    if (logger?.error) {
      logger.error({ err }, 'square webhook handler error');
    } else {
      console.error('square webhook handler error', err);
    }
    return res.status(500).json({ ok: false, error: 'internal-error' });
  }
});
app.use(express.json({ limit: '2mb' }));

const sendUcpProfile = (res) => {
  try {
    const siteUrl = process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_URL || 'https://localeffortfood.com';
    return res.status(200).json(buildUcpBusinessProfile(siteUrl));
  } catch (err) {
    logger.error({ err }, 'ucp profile route failed');
    return res.status(500).json({ error: 'ucp-profile-failed' });
  }
};

app.get('/.well-known/ucp', (req, res) => sendUcpProfile(res));
app.get('/.well-known/ucp.json', (req, res) => sendUcpProfile(res));

// MCP HTTP bridge removed (mcpTransport not initialized in this process). If needed, reintroduce with proper import.
// --- MCP STREAMABLE HTTP BRIDGE ---
// Provides a lightweight HTTP/SSE surface for the MCP server that normally runs via stdio.
// This allows tools/resources to be accessed over the web for LLM agents or internal tooling.
try {
  const { createMcpServer } = require('../mcp/server');
  const { randomUUID } = require('crypto');
  const mcpServer = createMcpServer();
  // In-memory session map (ephemeral). Could be replaced with Redis if needed.
  const sessions = new Map();
  const SESSION_TTL_MS = 1000 * 60 * 30; // 30 minutes inactivity

  const issueSession = () => {
    const id = randomUUID();
    sessions.set(id, { id, last: Date.now() });
    return id;
  };
  const touchSession = (id) => {
    const entry = sessions.get(id);
    if (entry) entry.last = Date.now();
  };
  setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions.entries()) {
      if (now - s.last > SESSION_TTL_MS) sessions.delete(id);
    }
  }, 60000).unref();

  const allowOrigins = (process.env.MCP_ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
  const allowHosts = (process.env.MCP_ALLOWED_HOSTS || '').split(',').map(s=>s.trim()).filter(Boolean);
  const ucpCheckoutTools = new Set([
    'ucp.checkout.create',
    'ucp.checkout.get',
    'ucp.checkout.update',
    'ucp.checkout.complete',
    'ucp.checkout.cancel',
  ]);
  const ucpRequiredScopes = {
    'ucp.checkout.create': CHECKOUT_SCOPES.create,
    'ucp.checkout.get': CHECKOUT_SCOPES.read,
    'ucp.checkout.update': CHECKOUT_SCOPES.update,
    'ucp.checkout.complete': CHECKOUT_SCOPES.complete,
    'ucp.checkout.cancel': CHECKOUT_SCOPES.cancel,
  };
  const requireBearerForUcp = /^(1|true|yes)$/i.test(process.env.MCP_REQUIRE_BEARER_FOR_UCP || '');

  const normalizeMcpScopes = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((scope) => (scope == null ? '' : String(scope).trim()))
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean);
    }
    return [];
  };

  const normalizeMcpAuth = (raw, fallbackSessionId = null) => {
    if (!raw || typeof raw !== 'object') return null;
    const actorId = (raw.actorId || raw.actor_id || '').toString().trim();
    if (!actorId) return null;
    const actorType = (raw.actorType || raw.actor_type || 'agent').toString().trim() || 'agent';
    const sessionId = (
      raw.sessionId ||
      raw.session_id ||
      fallbackSessionId ||
      null
    );
    const scopes = normalizeMcpScopes(raw.scopes || raw.scope);
    return {
      actorId,
      actorType,
      sessionId: sessionId == null ? null : String(sessionId).trim() || null,
      scopes,
    };
  };

  const configuredAuthTokens = (() => {
    const map = new Map();
    const defaultScopes = (
      process.env.MCP_AUTH_DEFAULT_SCOPES ||
      [
        CHECKOUT_SCOPES.create,
        CHECKOUT_SCOPES.read,
        CHECKOUT_SCOPES.update,
        CHECKOUT_SCOPES.complete,
        CHECKOUT_SCOPES.cancel,
      ].join(',')
    );
    const addToken = (token, config) => {
      const normalizedToken = (token || '').toString().trim();
      if (!normalizedToken) return;
      const baseConfig = (config && typeof config === 'object') ? config : {};
      const auth = normalizeMcpAuth({
        actorId: baseConfig.actorId || baseConfig.actor_id || `mcp:${normalizedToken.slice(0, 8)}`,
        actorType: baseConfig.actorType || baseConfig.actor_type || 'mcp-client',
        sessionId: baseConfig.sessionId || baseConfig.session_id || null,
        scopes: baseConfig.scopes || baseConfig.scope || defaultScopes,
      });
      if (!auth) return;
      map.set(normalizedToken, auth);
    };

    if (process.env.MCP_AUTH_BEARER_TOKEN) {
      addToken(process.env.MCP_AUTH_BEARER_TOKEN, {
        actorId: process.env.MCP_AUTH_BEARER_ACTOR_ID || 'mcp-bearer-client',
        actorType: process.env.MCP_AUTH_BEARER_ACTOR_TYPE || 'mcp-client',
        scopes: process.env.MCP_AUTH_BEARER_SCOPES || defaultScopes,
      });
    }

    const rawJson = process.env.MCP_AUTH_TOKENS_JSON;
    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) {
          for (const entry of parsed) {
            if (!entry || typeof entry !== 'object') continue;
            addToken(entry.token || entry.bearer || entry.value, entry);
          }
        } else if (parsed && typeof parsed === 'object') {
          for (const [token, config] of Object.entries(parsed)) {
            addToken(token, config);
          }
        }
      } catch (err) {
        logger.warn({ err }, 'invalid MCP_AUTH_TOKENS_JSON');
      }
    }
    return map;
  })();

  const resolveMcpToolAuth = (req, params, requiredScope) => {
    const sessionId = (req.headers['mcp-session-id'] || '').toString().trim() || null;
    const explicitAuthFromParams = normalizeMcpAuth(params?.auth, sessionId);
    const explicitAuthFromHeaders = normalizeMcpAuth({
      actorId: req.headers['x-ucp-actor-id'],
      actorType: req.headers['x-ucp-actor-type'],
      sessionId: req.headers['x-ucp-session-id'] || sessionId,
      scopes: req.headers['x-ucp-scopes'],
    }, sessionId);
    const explicitAuth = explicitAuthFromParams || explicitAuthFromHeaders;
    const authHeader = (req.headers.authorization || '').toString().trim();
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    let tokenAuth = null;

    if (bearerToken) {
      const configured = configuredAuthTokens.get(bearerToken);
      if (!configured) {
        return { ok: false, statusCode: 401, error: 'mcp-invalid-bearer-token' };
      }
      tokenAuth = {
        ...configured,
        sessionId: configured.sessionId || sessionId,
      };
    }

    if (requireBearerForUcp && !tokenAuth) {
      return { ok: false, statusCode: 401, error: 'mcp-bearer-token-required' };
    }

    const auth = tokenAuth || explicitAuth;
    if (!auth) {
      return { ok: false, statusCode: 401, error: 'mcp-auth-required' };
    }
    if (!requiredScope) {
      return { ok: true, auth };
    }

    const scopes = Array.isArray(auth.scopes) ? auth.scopes : [];
    const hasScope = (
      scopes.includes('*') ||
      scopes.includes(requiredScope) ||
      scopes.some((scope) => scope.endsWith('*') && requiredScope.startsWith(scope.slice(0, -1)))
    );
    if (!hasScope) {
      return {
        ok: false,
        statusCode: 403,
        error: 'mcp-scope-required',
        requiredScope,
      };
    }
    return { ok: true, auth };
  };

  const checkAllowed = (req) => {
    if (allowOrigins.length) {
      const origin = req.headers.origin || '';
      if (origin && !allowOrigins.includes(origin)) return false;
    }
    if (allowHosts.length) {
      const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
      if (host && !allowHosts.includes(host)) return false;
    }
    return true;
  };

  const mcpHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Mcp-Session-Id, Authorization, X-Ucp-Actor-Id, X-Ucp-Actor-Type, X-Ucp-Session-Id, X-Ucp-Scopes'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  };

  app.options('/.well-known/mcp', (req, res) => { mcpHeaders(res); return res.status(204).end(); });
  app.get('/.well-known/mcp.json', (req, res) => {
    mcpHeaders(res);
    res.json({
      name: 'local-effort-mcp',
      transport: 'streamable-http',
      endpoints: { primary: '/.well-known/mcp' },
      auth: {
        type: 'bearer-or-explicit',
        header: 'Authorization: Bearer <token>',
        env: ['MCP_AUTH_BEARER_TOKEN', 'MCP_AUTH_TOKENS_JSON'],
      },
      tools: [
        'support.search',
        'sanity.query',
        'ucp.profile',
        'ucp.checkout.create',
        'ucp.checkout.get',
        'ucp.checkout.update',
        'ucp.checkout.complete',
        'ucp.checkout.cancel',
      ],
      resources: [
        'support-chunk://{chunkId}',
        'support-cache://{cacheKey}',
        'support-source://{sourceId}',
        'sanity-document://{docId}',
        'ucp-checkout://{checkoutSessionId}',
      ],
      toolAuth: {
        'ucp.checkout.create': CHECKOUT_SCOPES.create,
        'ucp.checkout.get': CHECKOUT_SCOPES.read,
        'ucp.checkout.update': CHECKOUT_SCOPES.update,
        'ucp.checkout.complete': CHECKOUT_SCOPES.complete,
        'ucp.checkout.cancel': CHECKOUT_SCOPES.cancel,
      },
    });
  });

  // GET provides SSE stream. If no session id, one is issued.
  app.get('/.well-known/mcp', async (req, res) => {
    mcpHeaders(res);
    if (!checkAllowed(req)) return res.status(403).json({ error: 'mcp-forbidden' });
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    let sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !sessions.has(sessionId)) {
      sessionId = issueSession();
      res.write(`event: session\n`);
      res.write(`data: {"sessionId":"${sessionId}"}\n\n`);
    } else {
      touchSession(sessionId);
    }

    // Provide a simple heartbeat
    const interval = setInterval(() => {
      res.write('event: ping\n');
      res.write('data: {}\n\n');
    }, 25000);
    interval.unref();

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  // POST processes JSON-RPC-like envelopes { id, method, params }
  app.post('/.well-known/mcp', express.json(), async (req, res) => {
    mcpHeaders(res);
    if (!checkAllowed(req)) return res.status(403).json({ error: 'mcp-forbidden' });
    let sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !sessions.has(sessionId)) {
      sessionId = issueSession();
      res.setHeader('Mcp-Session-Id', sessionId);
    } else {
      touchSession(sessionId);
    }
    const { id, method, params } = req.body || {};
    if (!method) return res.status(400).json({ error: 'missing-method' });
    try {
      // Map JSON-RPC method names to MCP server methods
      if (method === 'tool.call') {
        const toolName = params?.name;
        const toolParams = params?.arguments || {};
        const tool = mcpServer?._registeredTools?.[toolName];
        if (!tool || tool.enabled === false) return res.status(404).json({ error: 'tool-not-found' });
        let finalToolParams = toolParams;
        if (ucpCheckoutTools.has(toolName)) {
          const requiredScope = ucpRequiredScopes[toolName] || null;
          const authResult = resolveMcpToolAuth(req, toolParams, requiredScope);
          if (!authResult.ok) {
            return res.status(authResult.statusCode || 401).json({
              error: authResult.error || 'mcp-auth-failed',
              requiredScope: authResult.requiredScope || requiredScope || undefined,
            });
          }
          finalToolParams = {
            ...toolParams,
            auth: authResult.auth,
          };
        }
        const result = await tool.callback(finalToolParams);
        return res.json({ id, result });
      }
      if (method === 'resource.get') {
        const uri = params?.uri;
        if (!uri) return res.status(400).json({ error: 'missing-uri' });
        const resourceUrl = new URL(uri);
        const isUcpCheckoutResource = resourceUrl.protocol === 'ucp-checkout:';
        let resourceAuth = null;
        if (isUcpCheckoutResource) {
          const authResult = resolveMcpToolAuth(req, params, CHECKOUT_SCOPES.read);
          if (!authResult.ok) {
            return res.status(authResult.statusCode || 401).json({
              error: authResult.error || 'mcp-auth-failed',
              requiredScope: authResult.requiredScope || CHECKOUT_SCOPES.read,
            });
          }
          resourceAuth = authResult.auth;
        }

        // First check exact registered resources (no templates).
        const directEntries = Object.values(mcpServer?._registeredResources || {});
        for (const entry of directEntries) {
          const resourceUri = entry?.resource?.uri;
          if (resourceUri === resourceUrl.href && typeof entry?.readCallback === 'function') {
            const resource = await entry.readCallback(resourceUrl, {
              auth: resourceAuth,
              requireAuth: isUcpCheckoutResource,
            });
            return res.json({ id, resource });
          }
        }

        // Then check URI templates.
        const templateEntries = Object.values(mcpServer?._registeredResourceTemplates || {});
        for (const entry of templateEntries) {
          const matcher = entry?.resourceTemplate?._uriTemplate;
          const matched = matcher && typeof matcher.match === 'function'
            ? matcher.match(resourceUrl.href)
            : null;
          if (matched && typeof entry?.readCallback === 'function') {
            const resource = await entry.readCallback(resourceUrl, matched, {
              auth: resourceAuth,
              requireAuth: isUcpCheckoutResource,
            });
            return res.json({ id, resource });
          }
        }

        return res.status(404).json({ error: 'resource-not-found' });
      }
      if (method === 'ping') {
        return res.json({ id, result: { pong: true, ts: Date.now() } });
      }
      return res.status(400).json({ error: 'unknown-method' });
    } catch (err) {
      logger.error({ err }, 'mcp method error');
      return res.status(500).json({ error: 'mcp-internal-error' });
    }
  });
  logger.info('MCP HTTP bridge active');
} catch (e) {
  logger.warn({ err: e && e.message }, 'mcp bridge init failed');
}

// --- API ENDPOINTS ---

app.use('/api/crowdfund', createCrowdfundingRouter({ db, squareClient, logger }));
app.use('/api/small-events', createSmallEventsRouter({ logger }));
app.use('/api/planner', createPlannerRouter());
app.use('/ucp/v1', createUcpRouter({ logger }));
app.all('/api/crowdfund/checkout', async (req, res, next) => {
  try {
    await crowdfundCheckoutHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'crowdfund checkout handler failed');
    next(err);
  }
});
app.all('/api/crowdfund/feedback', async (req, res, next) => {
  try {
    await crowdfundFeedbackHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'crowdfund feedback handler failed');
    next(err);
  }
});

// --- PizzaFunder Routes ---
const pizzafunderPledgeHandler = require('../../api-handlers/pizzafunder/pledge');
const pizzafunderStatusHandler = require('../../api-handlers/pizzafunder/status');
const pizzafunderFeedbackHandler = require('../../api-handlers/pizzafunder/feedback');

app.all('/api/pizzafunder/pledge', async (req, res, next) => {
  try {
    await pizzafunderPledgeHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'pizzafunder pledge handler failed');
    next(err);
  }
});

app.all('/api/pizzafunder/status', async (req, res, next) => {
  try {
    await pizzafunderStatusHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'pizzafunder status handler failed');
    next(err);
  }
});

app.all('/api/pizzafunder/feedback', async (req, res, next) => {
  try {
    await pizzafunderFeedbackHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'pizzafunder feedback handler failed');
    next(err);
  }
});

app.all('/api/pizzafunder/payment-link', async (req, res, next) => {
  try {
    await pizzafunderPaymentLinkHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'pizzafunder payment link handler failed');
    next(err);
  }
});

app.all('/api/sales-proxy', async (req, res, next) => {
  try {
    await salesProxyHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'sales proxy handler failed');
    next(err);
  }
});

app.all('/api/store/checkout', async (req, res, next) => {
  try {
    await storeCheckoutHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'store checkout handler failed');
    next(err);
  }
});

app.all('/api/store/gift-card-checkout', async (req, res, next) => {
  try {
    await giftCardCheckoutHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'gift-card checkout handler failed');
    next(err);
  }
});

app.all('/api/store/gift-card-link', async (req, res, next) => {
  try {
    await giftCardLinkHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'gift-card link handler failed');
    next(err);
  }
});

app.all('/api/store/pizza-party-checkout', async (req, res, next) => {
  try {
    await pizzaPartyCheckoutHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'pizza-party checkout handler failed');
    next(err);
  }
});

app.all('/api/store/pizza-party-status', async (req, res, next) => {
  try {
    await pizzaPartyStatusHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'pizza-party status handler failed');
    next(err);
  }
});

app.all('/api/store/pizza-party-receipt', async (req, res, next) => {
  try {
    await pizzaPartyReceiptHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'pizza-party receipt handler failed');
    next(err);
  }
});

app.all('/api/store/pizza-party-link', async (req, res, next) => {
  try {
    await pizzaPartyLinkHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'pizza-party link handler failed');
    next(err);
  }
});

app.all('/api/store/pizza-party-bookings', async (req, res, next) => {
  try {
    await pizzaPartyBookingsHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'pizza-party bookings handler failed');
    next(err);
  }
});

app.all('/api/store/products', async (req, res, next) => {
  try {
    await storeProductsHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'store products handler failed');
    next(err);
  }
});

app.all('/api/store/sync-square', async (req, res, next) => {
  try {
    await storeSyncSquareHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'store sync-square handler failed');
    next(err);
  }
});

app.all('/api/happymonday/process-payment', async (req, res, next) => {
  try {
    await happymondayProcessPaymentHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'happymonday process-payment handler failed');
    next(err);
  }
});

app.all('/api/happymonday/payment-link', async (req, res, next) => {
  try {
    await happymondayPaymentLinkHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'happymonday payment-link handler failed');
    next(err);
  }
});

app.all('/api/paikka/checkout', (req, res) => res.status(410).json({ error: 'paikka-retired' }));
app.all('/api/paikka/pay', (req, res) => res.status(410).json({ error: 'paikka-retired' }));
app.all('/api/paikka/finalize', (req, res) => res.status(410).json({ error: 'paikka-retired' }));
app.all('/api/paikka/resend', (req, res) => res.status(410).json({ error: 'paikka-retired' }));

app.all('/api/winter-dinner/checkout', async (req, res, next) => {
  try {
    await winterDinnerCheckoutHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'winter dinner checkout handler failed');
    next(err);
  }
});

app.all('/api/winter-dinner/payment-link', async (req, res, next) => {
  try {
    await winterDinnerPaymentLinkHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'winter dinner payment link handler failed');
    next(err);
  }
});

app.all('/api/february/booked-dates', async (req, res, next) => {
  try {
    await februaryBookedDatesHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'february booked-dates handler failed');
    next(err);
  }
});

app.all('/api/february/checkout', async (req, res, next) => {
  try {
    await februaryCheckoutHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'february checkout handler failed');
    next(err);
  }
});

app.all('/api/february/payment-link', async (req, res, next) => {
  try {
    await februaryPaymentLinkHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'february payment link handler failed');
    next(err);
  }
});

app.all('/api/psyche/checkout', async (req, res, next) => {
  try {
    await psycheCheckoutHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'psyche checkout handler failed');
    next(err);
  }
});

app.all('/api/sanity-query', sanityQueryRateLimit, async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method-not-allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const readClient = getSanityReadClient();
  const writeClient = getSanityClient();
  if (!readClient && !writeClient) {
    return res.status(500).json({ ok: false, error: 'sanity-not-configured' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (err) {
      return res.status(400).json({ ok: false, error: 'invalid-body' });
    }
  }

  if (!body || typeof body !== 'object' || typeof body.query !== 'string') {
    return res.status(400).json({ ok: false, error: 'missing-query' });
  }

  const normalizedQuery = normalizeGroq(body.query);
  if (!PUBLIC_SANITY_QUERY_ALLOWLIST.has(normalizedQuery)) {
    return res.status(403).json({ ok: false, error: 'query-not-allowed' });
  }

  const params = body.params && typeof body.params === 'object' ? body.params : {};
  if (!hasValidSanityParams(params)) {
    return res.status(400).json({ ok: false, error: 'invalid-params' });
  }

  try {
    const primaryClient = readClient || writeClient;
    let result;
    try {
      result = await primaryClient.fetch(body.query, params);
    } catch (err) {
      if (!writeClient || writeClient === primaryClient || !isSanityAuthError(err)) {
        throw err;
      }
      // If dataset is private, fall back to token-backed client for allowlisted queries only.
      result = await writeClient.fetch(body.query, params);
    }
    return res.status(200).json({ ok: true, result });
  } catch (err) {
    logger.error({ err }, 'sanity query fetch failed');
    return res.status(500).json({ ok: false, error: 'sanity-fetch-failed' });
  }
});

app.all('/api/weekly-order/active', async (req, res, next) => {
  try {
    await require('../../api-handlers/weekly-order/active')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'weekly order active handler failed');
    next(err);
  }
});

app.all('/api/weekly-order/checkout', async (req, res, next) => {
  try {
    await require('../../api-handlers/weekly-order/checkout')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'weekly order checkout handler failed');
    next(err);
  }
});

app.all('/api/weekly-order/checkout-link', async (req, res, next) => {
  try {
    await weeklyOrderCheckoutLinkHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'weekly order checkout link handler failed');
    next(err);
  }
});

app.all('/api/recipes/ingest', async (req, res, next) => {
  try {
    await require('../../api-handlers/recipes/ingest')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'recipe ingest handler failed');
    next(err);
  }
});

app.all('/api/weekly-order/admin/ingests', async (req, res, next) => {
  try {
    await require('../../api-handlers/weekly-order/admin/ingests')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'weekly order ingests handler failed');
    next(err);
  }
});

app.all('/api/weekly-order/admin/drafts', async (req, res, next) => {
  try {
    await require('../../api-handlers/weekly-order/admin/drafts')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'weekly order drafts handler failed');
    next(err);
  }
});

app.all('/api/weekly-order/admin/dishes', async (req, res, next) => {
  try {
    await require('../../api-handlers/weekly-order/admin/dishes')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'weekly order dishes handler failed');
    next(err);
  }
});

app.all('/api/weekly-order/admin/menu-weeks', async (req, res, next) => {
  try {
    await require('../../api-handlers/weekly-order/admin/menu-weeks')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'weekly order menu weeks handler failed');
    next(err);
  }
});

app.all('/api/weekly-order/admin/pricing', async (req, res, next) => {
  try {
    await require('../../api-handlers/weekly-order/admin/pricing')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'weekly order pricing handler failed');
    next(err);
  }
});

app.all('/api/weekly-order/admin/customers', async (req, res, next) => {
  try {
    await require('../../api-handlers/weekly-order/admin/customers')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'weekly order customers handler failed');
    next(err);
  }
});

app.all('/api/weekly-order/admin/overrides', async (req, res, next) => {
  try {
    await require('../../api-handlers/weekly-order/admin/overrides')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'weekly order overrides handler failed');
    next(err);
  }
});

app.all('/api/weekly-order/admin/plans', async (req, res, next) => {
  try {
    await require('../../api-handlers/weekly-order/admin/plans')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'weekly order plans handler failed');
    next(err);
  }
});

app.all('/api/weekly-order/admin/user-overrides', async (req, res, next) => {
  try {
    await require('../../api-handlers/weekly-order/admin/user-overrides')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'weekly order user overrides handler failed');
    next(err);
  }
});

// --- Calendar API Routes ---
app.all('/api/calendar/events', async (req, res, next) => {
  try {
    await require('../../api-handlers/calendar/events')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'calendar events handler failed');
    next(err);
  }
});

app.all('/api/calendar/receipts', async (req, res, next) => {
  try {
    await require('../../api-handlers/calendar/receipts')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'calendar receipts handler failed');
    next(err);
  }
});

app.all('/api/calendar/sync-sanity', async (req, res) => {
  try {
    logger.info({ method: req.method }, 'calendar sync-sanity request received');
    const handler = require('../../api-handlers/calendar/sync-sanity');
    logger.info('handler loaded');
    await handler(req, res);
    logger.info('handler completed');
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack, method: req.method }, 'calendar sync-sanity handler failed');
    if (!res.headersSent) {
      res.status(500).json({ error: 'sync failed' });
    }
  }
});

app.all('/api/calendar/time-slots', async (req, res, next) => {
  try {
    await require('../../api-handlers/calendar/time-slots')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'calendar time-slots handler failed');
    next(err);
  }
});

app.all('/api/calendar/public-events', async (req, res, next) => {
  try {
    await require('../../api-handlers/calendar/public-events')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'calendar public-events handler failed');
    next(err);
  }
});

app.all('/api/calendar/generate-invite', async (req, res, next) => {
  try {
    await require('../../api-handlers/calendar/generate-invite')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'calendar generate-invite handler failed');
    next(err);
  }
});

app.all('/api/calendar/validate-invite', async (req, res, next) => {
  try {
    await require('../../api-handlers/calendar/validate-invite')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'calendar validate-invite handler failed');
    next(err);
  }
});

app.all('/api/calendar/mark-invite-used', async (req, res, next) => {
  try {
    await require('../../api-handlers/calendar/mark-invite-used')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'calendar mark-invite-used handler failed');
    next(err);
  }
});

app.all('/api/calendar/book', async (req, res, next) => {
  try {
    await require('../../api-handlers/calendar/book')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'calendar book handler failed');
    next(err);
  }
});

app.all('/api/calendar/availability', async (req, res, next) => {
  try {
    await require('../../api-handlers/calendar/availability')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'calendar availability handler failed');
    next(err);
  }
});

app.all('/api/calendar/check-conflicts', async (req, res, next) => {
  try {
    await require('../../api-handlers/calendar/check-conflicts')(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'calendar check-conflicts handler failed');
    next(err);
  }
});

const handleCrowdfundingSummary = async (req, res) => {
  try {
    const data = await getCrowdfundingSummary({ db });
    res.set('Cache-Control', 'no-store');
    return res.json({
      pizzas: typeof data.pizzas === 'number' ? data.pizzas : Number(data.pizzas) || 0,
      backers: typeof data.backers === 'number' ? data.backers : Number(data.backers) || 0,
      updatedAt: data.updatedAt ?? null,
    });
  } catch (err) {
    if (logger?.error) logger.error({ err }, 'crowdfunding summary error');
    try {
      const fallback = await loadPublishedCrowdfundingSummary({ sanityClient: getSanityClient });
      if (fallback) {
        res.set('Cache-Control', 'no-store');
        return res.json(fallback);
      }
    } catch (fallbackErr) {
      if (logger?.warn) logger.warn({ err: fallbackErr }, 'crowdfunding summary fallback error');
    }
    res.set('Cache-Control', 'no-store');
    return res.json({ pizzas: 0, backers: 0, goal: null, updatedAt: null, source: 'unavailable' });
  }
};

app.get('/api/crowdfunding/summary', handleCrowdfundingSummary);
app.get('/api/crowdfund/summary', handleCrowdfundingSummary);

const FEEDBACK_FALLBACK_MAX = 50;
const FEEDBACK_FALLBACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const FEEDBACK_COMMENT_LIMIT = 2000;
const feedbackFallbackEntries = [];

const isFirestoreUnavailable = (err) =>
  !!(err && typeof err === 'object' && err.code === 'firestore-unavailable');

const resolveFeedbackLimit = (value) => {
  let limit = Number(value ?? 200);
  if (!Number.isFinite(limit) || limit <= 0) limit = 200;
  return Math.min(Math.max(Math.floor(limit), 1), 500);
};

const resolveFeedbackSince = (value) => {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(Date.now() - FEEDBACK_FALLBACK_WINDOW_MS);
};

const listFallbackFeedback = (sinceRaw, limitRaw) => {
  const since = resolveFeedbackSince(sinceRaw);
  const limit = resolveFeedbackLimit(limitRaw);
  return feedbackFallbackEntries
    .filter((entry) => entry.createdAt >= since)
    .slice(0, limit);
};

const addFallbackFeedback = ({ rating, comment, customerId, orderId }) => {
  const entry = {
    id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    rating,
    comment,
    customerId: customerId || null,
    orderId: orderId || null,
    createdAt: new Date(),
  };
  feedbackFallbackEntries.unshift(entry);
  if (feedbackFallbackEntries.length > FEEDBACK_FALLBACK_MAX) {
    feedbackFallbackEntries.length = FEEDBACK_FALLBACK_MAX;
  }
  return entry;
};

const parseFeedbackBody = (body) => {
  const rating = Number(body?.rating);
  const comment = typeof body?.comment === 'string'
    ? body.comment.replace(/\r/g, '').trim().slice(0, FEEDBACK_COMMENT_LIMIT)
    : '';
  const customerId = typeof body?.customerId === 'string' && body.customerId.trim()
    ? body.customerId.trim()
    : null;
  const orderId = typeof body?.orderId === 'string' && body.orderId.trim()
    ? body.orderId.trim()
    : null;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'invalid-rating' };
  }
  if (!comment) {
    return { error: 'missing-comment' };
  }

  return { rating, comment, customerId, orderId };
};

app.get('/api/feedback', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({ ok: false, error: 'database-unavailable' });
    }

    const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    let limit = parseInt(limitRaw) || 200;
    limit = Math.min(Math.max(limit, 1), 500);

    const { data, error } = await supabase
      .from('crowdfund_feedback')
      .select('id, name, comment, rating, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[feedback.get] Supabase error:', error.message);
      return res.status(500).json({ ok: false, error: 'internal-error' });
    }

    const items = (data || []).map(item => ({
      id: item.id,
      name: item.name,
      comment: item.comment,
      rating: item.rating,
      createdAt: item.created_at,
    }));

    res.json({ ok: true, items });
  } catch (err) {
    if (logger?.error) logger.error({ err }, 'feedback list error');
    res.status(500).json({ ok: false, error: 'internal-error' });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({ ok: false, error: 'database-unavailable' });
    }

    const body = req.body ?? {};
    const name = typeof body.name === 'string' ? body.name.trim().substring(0, 200) : 'Anonymous';
    const comment = typeof body.comment === 'string' ? body.comment.trim().substring(0, 2000) : '';
    const rating = Number(body.rating);

    if (!comment) {
      return res.status(400).json({ ok: false, error: 'missing-comment' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ ok: false, error: 'invalid-rating' });
    }

    const { data, error } = await supabase
      .from('crowdfund_feedback')
      .insert({ name, comment, rating })
      .select()
      .single();

    if (error) {
      console.error('[feedback.post] Supabase error:', error.message);
      return res.status(500).json({ ok: false, error: 'internal-error' });
    }

    res.json({ ok: true, id: data.id });
  } catch (err) {
    if (logger?.error) logger.error({ err }, 'feedback create error');
    res.status(500).json({ ok: false, error: 'internal-error' });
  }
});

app.use('/api', createMessagesRouter({
  logger,
  brevoService,
  getSanityClient,
  db,
  getSupabase,
  emailOutboxService,
  auditLogger: (event, details) => logger.info({ audit: true, event, ...details }, 'messages audit'),
}));

// Diagnostic endpoint (safe): reports whether required env vars are present
// and attempts a lightweight Cloudinary ping if configured. Do NOT expose
// credentials. This endpoint is intended for temporary debugging in staging.
app.get('/api/_diag', async (req, res) => {
  try {
  const hasCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  const sanityAvailable = !!getSanityClient();
    const result = { ok: true, hasCloudinary };
  result.sanity = { available: sanityAvailable };
    result.square = {
      sdkLoaded: !!Client,
      clientInitialized: !!squareClient,
      hasToken: !!process.env.SQUARE_ACCESS_TOKEN,
      env: process.env.SQUARE_ENVIRONMENT || 'Sandbox',
    };
    if (hasCloudinary) {
      try {
        // require cloudinary lazily to avoid issues when not installed in some environments
        // eslint-disable-next-line global-require
        const cloudinary = require('cloudinary').v2;
        // Use configured cloudinary if available
        await cloudinary.api.ping();
        result.cloudinary = { ping: 'ok' };
      } catch (err) {
        // don't include error stack or secrets — only a short message
        result.cloudinary = { ping: 'failed', message: String(err).slice(0, 200) };
      }
    }
    res.json(result);
  } catch (err) {
  logger.error({ err }, 'diag endpoint error');
    res.status(500).json({ ok: false, error: 'diag-failed' });
  }
});

// Mount the standalone search-images handler (from root /api) so the
// backend will serve /api/search-images when deployed via Vercel.
try {
  // require the handler from the repository root api/search-images.js
  // path relative to this file: ../../api-handlers/search-images.js
  // The handler exports a function (req, res)
  // We mount it at GET /api/search-images to preserve the original behavior.
  // eslint-disable-next-line global-require
  const searchImagesHandler = require('../../api-handlers/search-images.js');
  if (typeof searchImagesHandler === 'function') {
    app.get('/api/search-images', async (req, res) => {
      try {
        // Delegate to the handler and await if it returns a promise
        await Promise.resolve(searchImagesHandler(req, res));
      } catch (err) {
        console.error('search-images handler runtime error:', err);
        // Ensure we always return JSON on error (avoid HTML error pages)
        res.status(500).json({ error: 'search-images failed', details: String(err) });
      }
    });
  }
} catch (err) {
  logger.warn({ err: err.message }, 'search-images handler not available');
}

// --- Proxy About page data from Sanity (to avoid client-side CORS) ---
app.get('/api/about', async (req, res) => {
  try {
    const sanity = getSanityClient();
    if (!sanity) return res.status(500).json({ error: 'sanity-not-configured' });
    const query = `{
      "page": *[_type == "page" && slug.current == "about-us"][0]{ title, introduction },
      "persons": *[_type == "person"]{ name, role, bio, image{asset->{_ref}}, headshot{ asset{ public_id }, alt } }
    }`;
    const data = await sanity.fetch(query);
    return res.json(data || {});
  } catch (err) {
  logger.error({ err }, 'about proxy error');
    return res.status(500).json({ error: 'about-fetch-failed' });
  }
});

async function fetchPublishedReleases(limit = 20) {
  const client = getSanityReadClient() || getSanityClient();
  if (!client) return [];
  const docs = await client.fetch(
    '*[_type == "release"] | order(coalesce(publishedAt, _createdAt) desc)[0...$limit]{ _id, title, "slug": slug.current, summary, publishedAt, _updatedAt, canonicalUrl }',
    { limit: Math.max(1, Math.min(100, Number(limit) || 20)) }
  );
  const site = (process.env.PUBLIC_URL || 'https://localeffortfood.com').replace(/\/$/, '');
  return (Array.isArray(docs) ? docs : []).map((doc) => {
    const slug = String(doc?.slug || '').trim();
    const fallbackUrl = slug ? `${site}/releases#${encodeURIComponent(slug)}` : `${site}/releases`;
    return {
      id: String(doc?._id || slug || Math.random().toString(36).slice(2)),
      title: String(doc?.title || 'Release'),
      summary: String(doc?.summary || ''),
      url: String(doc?.canonicalUrl || fallbackUrl),
      publishedAt: doc?.publishedAt || null,
      updatedAt: doc?._updatedAt || doc?.publishedAt || null,
    };
  });
}

app.get('/api/feeds/releases.rss', async (req, res) => {
  try {
    const site = (process.env.PUBLIC_URL || 'https://localeffortfood.com').replace(/\/$/, '');
    const releases = await fetchPublishedReleases(50);
    const items = releases.map((release) => `
    <item>
      <guid isPermaLink="false">${escapeXml(release.id)}</guid>
      <title>${escapeXml(release.title)}</title>
      <link>${escapeXml(release.url)}</link>
      <pubDate>${new Date(release.publishedAt || release.updatedAt || Date.now()).toUTCString()}</pubDate>
      <description>${escapeXml(release.summary)}</description>
    </item>`).join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Local Effort Releases</title>
    <link>${escapeXml(site)}/releases</link>
    <description>Press releases and media updates from Local Effort Food Co.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.end(xml);
  } catch (err) {
    logger.error({ err }, 'releases rss feed failed');
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    return res.end('Failed to generate releases RSS');
  }
});

app.get('/api/feeds/releases.atom', async (req, res) => {
  try {
    const site = (process.env.PUBLIC_URL || 'https://localeffortfood.com').replace(/\/$/, '');
    const releases = await fetchPublishedReleases(50);
    const updated = releases[0]?.updatedAt || new Date().toISOString();
    const entries = releases.map((release) => `
  <entry>
    <id>tag:localeffortfood.com,2026:${escapeXml(release.id)}</id>
    <title>${escapeXml(release.title)}</title>
    <link href="${escapeXml(release.url)}" />
    <updated>${escapeXml(new Date(release.updatedAt || release.publishedAt || Date.now()).toISOString())}</updated>
    <summary>${escapeXml(release.summary)}</summary>
  </entry>`).join('');
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>tag:localeffortfood.com,2026:releases</id>
  <title>Local Effort Releases</title>
  <updated>${escapeXml(new Date(updated).toISOString())}</updated>
  <link rel="self" href="${escapeXml(site)}/api/feeds/releases.atom" />
  <link rel="alternate" href="${escapeXml(site)}/releases" />${entries}
</feed>`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.end(xml);
  } catch (err) {
    logger.error({ err }, 'releases atom feed failed');
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    return res.end('Failed to generate releases Atom feed');
  }
});

// --- Generic Sanity query proxy (admin-only) ---
app.post('/api/sanity/query', requireAllowedUser, async (req, res) => {
  try {
    const sanity = getSanityClient();
    if (!sanity) {
      logger.error('Sanity client not configured - check SANITY_PROJECT_ID env var');
      return res.status(500).json({ error: 'sanity-not-configured' });
    }
    
    const { query, params } = req.body;
    if (!query) return res.status(400).json({ error: 'query-required' });
    
    logger.info({ query: query.substring(0, 100), params }, 'Proxying Sanity query');
    const data = await sanity.fetch(query, params || {});
    logger.info({ resultType: typeof data, hasData: !!data }, 'Sanity query result');
    return res.json({ result: data });
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'sanity query proxy error');
    return res.status(500).json({ error: 'sanity-fetch-failed' });
  }
});

// Mount support search endpoint (Supabase-powered hybrid search)
try {
  const { registerSupportSearch } = require('./supportSearch');
  if (registerSupportSearch) registerSupportSearch(app);
} catch (err) {
  logger.warn({ err: err?.message }, 'support search not available');
}

// Mount support ingestion endpoints (manual sync + webhook)
try {
  const { registerSupportIngest } = require('./supportIngest');
  if (registerSupportIngest) registerSupportIngest(app);
} catch (err) {
  logger.warn({ err: err?.message }, 'support ingest not available');
}

// (removed legacy lightweight messages/submit — unified below with Brevo-enabled version)

// Helpful startup log for local debugging
// if (require.main === module) {
//   console.info('Backend API starting (local)');
// }


app.post('/api/food-truck/deposit-link', async (req, res, next) => {
  try {
    await foodTruckDepositLinkHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'food-truck deposit link handler failed');
    next(err);
  }
});

app.post('/api/food-truck/deposit', async (req, res) => {
  try {
    if (!squareClient) {
      return res.status(500).json({ error: 'square-not-configured' });
    }

    const {
      token,
      verificationToken,
      checkoutAttemptId,
      amount,
      name,
      email,
      phone,
      eventDate,
      notes,
    } = req.body || {};

    const trimmedName = String(name || '').trim();
    const trimmedEmail = String(email || '').trim();
    const trimmedPhone = String(phone || '').trim();
    const trimmedEventDate = String(eventDate || '').trim();
    if (!token) return res.status(400).json({ error: 'missing-token' });
    if (!trimmedName) return res.status(400).json({ error: 'missing-name' });
    if (!trimmedEmail) return res.status(400).json({ error: 'missing-email' });
    if (!trimmedPhone) return res.status(400).json({ error: 'missing-phone' });
    if (!trimmedEventDate) return res.status(400).json({ error: 'missing-event-date' });

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'invalid-amount' });
    }
    const amountCents = Math.round(numericAmount * 100);
    if (!amountCents) {
      return res.status(400).json({ error: 'invalid-amount' });
    }

    const locationId = process.env.SQUARE_LOCATION_ID;
    if (!locationId) {
      return res.status(500).json({ error: 'square-location-missing' });
    }

    const idempotencyKey = typeof checkoutAttemptId === 'string' && checkoutAttemptId.trim()
      ? checkoutAttemptId.trim().slice(0, 45)
      : uuidv4();
    const referenceId = `ft-${Date.now().toString(36)}-${idempotencyKey.slice(0, 8)}`.slice(0, 40);
    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      locationId,
      amountMoney: { amount: amountCents, currency: 'USD' },
      autocomplete: true,
      note: `Food truck deposit ${trimmedEventDate}`.slice(0, 500),
      referenceId,
      buyerEmailAddress: trimmedEmail,
      buyerPhoneNumber: trimmedPhone,
    };
    if (verificationToken) {
      paymentBody.verificationToken = verificationToken;
    }

    logger.info({
      email: trimmedEmail,
      eventDate: trimmedEventDate,
      amountCents,
    }, 'food-truck deposit attempt');

    const paymentResponse = await squareClient.paymentsApi.createPayment(paymentBody);
    const payment = paymentResponse?.result?.payment || null;

    const [firstName, ...restName] = trimmedName.split(/\s+/);
    try {
      await brevoService.upsertContact({
        email: trimmedEmail,
        firstName: firstName || undefined,
        lastName: restName.join(' ') || undefined,
        phone: trimmedPhone,
      });
    } catch (err) {
      if (logger) logger.warn({ err }, 'food-truck deposit contact sync failed');
    }

    if (db) {
      try {
        await db.collection('foodTruckDeposits').add({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          eventDate: trimmedEventDate,
          notes: notes ? String(notes) : '',
          amount: numericAmount,
          amountCents,
          paymentId: payment?.id || null,
          paymentStatus: payment?.status || null,
          referenceId,
          locationId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (err) {
        if (logger) logger.warn({ err }, 'food-truck deposit firestore write failed');
      }
    }

    const teamEmail = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
    const senderEmail = process.env.SENDER_EMAIL || teamEmail;
    const escapeHtml = (value) => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    if (teamEmail && senderEmail) {
      const amountUsd = (amountCents / 100).toFixed(2);
      const htmlContent = `
        <p><strong>Food truck deposit received</strong></p>
        <p><strong>Name:</strong> ${escapeHtml(trimmedName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(trimmedPhone)}</p>
        <p><strong>Event Date:</strong> ${escapeHtml(trimmedEventDate)}</p>
        <p><strong>Amount:</strong> $${escapeHtml(amountUsd)}</p>
        ${notes ? `<p><strong>Notes:</strong><br/>${escapeHtml(String(notes)).replace(/\n/g, '<br />')}</p>` : ''}
        <p><strong>Square Payment:</strong> ${escapeHtml(payment?.id || 'N/A')} (${escapeHtml(payment?.status || 'unknown')})</p>
      `;
      try {
        await brevoService.sendEmail({
          to: [{ email: teamEmail }],
          sender: { email: senderEmail, name: 'Local Effort' },
          subject: `Food truck deposit${trimmedEventDate ? ` - ${trimmedEventDate}` : ''}`,
          htmlContent,
          replyTo: { email: trimmedEmail, name: trimmedName },
          tags: ['food-truck', 'deposit'],
        });
      } catch (err) {
        if (logger) logger.warn({ err }, 'food-truck deposit email failed');
      }
    }

    logger.info({ paymentId: payment?.id, status: payment?.status }, 'food-truck deposit processed');
    return res.json({
      ok: true,
      paymentId: payment?.id || null,
      status: payment?.status || null,
    });
  } catch (err) {
    const details = Array.isArray(err?.errors)
      ? err.errors.map((e) => e?.detail || e?.message).filter(Boolean).join('; ')
      : err?.message;
    logger.error({ err }, 'food-truck deposit error');
    return res.status(500).json({ error: details || 'deposit-failed' });
  }
});


function icsEscape(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatDateBasic(date) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function buildICS({ uid, summary, description, location, startDate, endDate, allDay = true, method = 'PUBLISH' }) {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `METHOD:${method}`,
    'PRODID:-//Local Effort//Event Request//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
  ];
  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateBasic(startDate)}`);
    if (endDate) lines.push(`DTEND;VALUE=DATE:${formatDateBasic(endDate)}`);
  } else {
    const dt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    lines.push(`DTSTART:${dt(startDate)}`);
    if (endDate) lines.push(`DTEND:${dt(endDate)}`);
  }
  if (summary) lines.push(`SUMMARY:${icsEscape(summary)}`);
  if (location) lines.push(`LOCATION:${icsEscape(location)}`);
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

// Admin/Tool endpoint: confirm or update an event and optionally publish to public events in Sanity
app.post('/api/events/confirm', requireAllowedUser, async (req, res) => {
  try {
    const { eventId, status = 'confirmed', startDateTime, endDateTime, location, visibility = 'private', ticketsUrl, description } = req.body || {};
    if (!eventId) return res.status(400).json({ error: 'missing-eventId' });
    if (!db) return res.status(500).json({ error: 'firestore-unavailable' });

    const ref = db.collection('events').doc(eventId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'not-found' });

  const updates = { status };
    if (startDateTime) updates.date = new Date(startDateTime);
    if (location !== undefined) updates.location = location;
  // set isPublic flag; publicEventId handled below
  updates.isPublic = visibility === 'public';
  await ref.update(updates);

    let publicEventId = null;
    if (visibility === 'public') {
      const sc = getSanityClient();
      if (!sc) return res.status(500).json({ error: 'sanity-unavailable' });
      const ev = snap.data();
      const start = startDateTime ? new Date(startDateTime) : (ev.date?.toDate ? ev.date.toDate() : new Date(ev.date));
      const end = endDateTime ? new Date(endDateTime) : null;
      const toDateOnly = (d) => d.toISOString().slice(0, 10);
      const blocks = description ? [{ _type: 'block', style: 'normal', children: [{ _type: 'span', text: String(description), marks: [] }] }] : [{ _type: 'block', style: 'normal', children: [{ _type: 'span', text: ev.notes || '', marks: [] }] }];
      const doc = await sc.create({
        _type: 'publicEvent',
        location: location || ev.location || '',
        startDate: toDateOnly(start),
        endDate: end ? toDateOnly(end) : undefined,
        foodType: ev.eventType || undefined,
        ticketsUrl: ticketsUrl || undefined,
        description: blocks,
        firestoreEventId: eventId,
      });
      publicEventId = doc._id;
      await ref.update({ publicEventId });
    } else {
      // mark as private: clear publicEventId in Firestore; leave any existing Sanity doc untouched for now
      await ref.update({ publicEventId: null });
    }

    // Send confirmation email with ICS to client if we have their contact
    try {
      const ev = (await ref.get()).data();
      const contact = ev && ev.contact;
      const headers = brevoService.getHeaders();
      if (headers && contact && contact.email) {
        const title = ev.title || 'Your Event';
        const start = startDateTime ? new Date(startDateTime) : (ev.date?.toDate ? ev.date.toDate() : new Date(ev.date));
        const ics = buildICS({
          uid: `evt-${eventId}@localeffortfood.com`,
          summary: title,
          description: ev.notes || '',
          location: location || ev.location || '',
          startDate: start,
          allDay: true,
        });
        const payload = {
          to: [{ email: contact.email, name: contact.name }],
          sender: { email: process.env.SENDER_EMAIL || contact.email, name: 'Local Effort' },
          subject: `Confirmed: ${title}`,
          htmlContent: `<p>We’ve confirmed your event. Details below.</p><pre style="white-space:pre-wrap;font-family:inherit">${(ev.notes || '').replace(/</g, '&lt;')}</pre>`,
          attachment: [{ name: 'event.ics', content: Buffer.from(ics).toString('base64') }],
          tags: ['event-confirmed'],
        };
        await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers, body: JSON.stringify(payload) });
      }
    } catch (_e) {
      // ignore email errors
    }

    return res.json({ ok: true, eventId, isPublic: visibility === 'public', publicEventId });
  } catch (err) {
  logger.error({ err }, 'events confirm error');
    return res.status(500).json({ error: 'event-confirm-failed' });
  }
});

// Create a blog post in Sanity. Accepts either { title, bodyBlocks?, text? }.
// If `text` is provided, convert to a simple Portable Text block array.
// Optional: { publishedAt, emailOnPublish, emailTo[] }
app.post('/api/blog/publish', publishRateLimit, requireAllowedUser, async (req, res) => {
  try {
    const { title, bodyBlocks, text, publishedAt, emailOnPublish = false, emailTo } = req.body || {};
    if (!title) return res.status(400).json({ error: 'missing-title' });
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ error: 'sanity-not-configured' });

    const blocks = Array.isArray(bodyBlocks) && bodyBlocks.length
      ? bodyBlocks
      : [{
          _type: 'block',
          style: 'normal',
          children: [{ _type: 'span', text: (text || '').trim(), marks: [] }],
        }];

    const slugBase = (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
    const now = new Date().toISOString();
    const doc = await sc.create({
      _type: 'blogPost',
      title,
      slug: { current: `${slugBase}-${Date.now().toString(36)}` },
      body: blocks,
      publishedAt: publishedAt || now,
      emailOnPublish: !!emailOnPublish,
    });

    let emailed = null;
    if (emailOnPublish) {
      const recipients = Array.isArray(emailTo) && emailTo.length
        ? emailTo
        : (process.env.BLOG_ANNOUNCE_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (recipients.length) {
        const base = (process.env.PUBLIC_URL || 'https://localeffortfood.com').replace(/\/$/, '');
        const url = `${base}/weekly/${doc.slug.current}`;
        const snippet = (text || JSON.stringify(blocks)).slice(0, 400);
        const payload = {
          to: recipients.map((e) => ({ email: e })),
          sender: { email: process.env.SENDER_EMAIL || recipients[0], name: 'Local Effort' },
          subject: `New post: ${title}`,
          htmlContent: `<h2>${escapeXml(title)}</h2><p>${escapeXml(snippet)}...</p><p><a href="${url}">Read on the site</a></p>`,
          tags: ['blog', 'auto'],
        };
        const queued = await emailOutboxService.enqueue({
          payload,
          idempotencyKey: `blog-publish-${doc._id}`,
          category: 'publishing',
          source: '/api/blog/publish',
          context: { docId: doc._id, slug: doc.slug?.current, actor: req.user?.email || null },
        });
        Promise.resolve()
          .then(() => emailOutboxService.processBatch({ limit: 5, maxAttempts: 5 }))
          .catch((queueErr) => logger.warn({ err: queueErr }, 'outbox opportunistic process failed after blog publish'));
        emailed = { queued: recipients.length, queueId: queued.id };
      }
    }

    auditLog(req, 'blog.publish', { docId: doc._id, slug: doc.slug?.current, emailOnPublish: !!emailOnPublish });
    return res.json({ ok: true, id: doc._id, slug: doc.slug?.current, emailed });
  } catch (err) {
    logger.error({ err }, 'blog publish error');
    return res.status(500).json({ error: 'publish-failed' });
  }
});

// Sanity webhook: on blogPost publish, enqueue email in outbox
app.post('/api/webhooks/sanity/blog', webhookRateLimit, async (req, res) => {
  try {
    const auth = validateSanityWebhookSecret(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

    const { _type, slug, title } = req.body || {};
    if (_type !== 'blogPost') return res.status(400).json({ ok: false });

    const sc = getSanityReadClient() || getSanityClient();
    if (!sc) return res.status(500).json({ error: 'sanity-not-configured' });
    const doc = await sc.fetch('*[_type == "blogPost" && slug.current == $slug][0]{ _id, title, publishedAt, body, slug }', { slug: slug?.current || slug });

    const bodyText = JSON.stringify(doc?.body || []);
    const snippet = (bodyText || '').slice(0, 400);
    const recipientsRaw = process.env.BLOG_ANNOUNCE_TO || '';
    const recipients = recipientsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!recipients.length) return res.json({ ok: true, skipped: 'no-recipients' });

    const base = (process.env.PUBLIC_URL || 'https://localeffortfood.com').replace(/\/$/, '');
    const slugValue = doc?.slug?.current || slug?.current || slug;
    const payload = {
      to: recipients.map((e) => ({ email: e })),
      sender: { email: process.env.SENDER_EMAIL || recipients[0], name: 'Local Effort' },
      subject: `New post: ${doc?.title || title || 'Local Effort Blog'}`,
      htmlContent: `<h2>${escapeXml(doc?.title || title || 'Local Effort Blog')}</h2><p>${escapeXml(snippet)}...</p><p><a href="${base}/weekly/${slugValue}">Read on the site</a></p>`,
      tags: ['blog', 'auto'],
    };
    const queued = await emailOutboxService.enqueue({
      payload,
      idempotencyKey: `sanity-blog-webhook-${doc?._id || slugValue}-${doc?.publishedAt || ''}`,
      category: 'publishing',
      source: '/api/webhooks/sanity/blog',
      context: { docId: doc?._id || null, slug: slugValue || null },
    });
    Promise.resolve()
      .then(() => emailOutboxService.processBatch({ limit: 5, maxAttempts: 5 }))
      .catch((queueErr) => logger.warn({ err: queueErr }, 'outbox opportunistic process failed after sanity webhook'));

    auditLog(req, 'webhook.sanity.blog', { queueId: queued.id, recipients: recipients.length, slug: slugValue || null });
    logger.info({ queueId: queued.id, recipients: recipients.length, slug: slugValue }, 'sanity blog webhook queued email');
    return res.json({ ok: true, queueId: queued.id, recipients: recipients.length });
  } catch (err) {
    logger.error({ err }, 'sanity blog webhook error');
    return res.status(500).json({ error: 'webhook-failed' });
  }
});

// Brevo events webhook: updates subscriber suppression / subscription state
app.post('/api/webhooks/brevo/events', webhookRateLimit, async (req, res) => {
  try {
    const auth = validateBrevoWebhookSecret(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

    const events = extractBrevoEvents(req.body);
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ error: 'sanity-not-configured' });

    const now = new Date().toISOString();
    let processed = 0;
    let suppressed = 0;
    let delivered = 0;
    let ignored = 0;

    for (const event of events) {
      const email = String(event?.email || '').trim().toLowerCase();
      const eventType = normalizeBrevoEventType(event?.event || event?.type || event?.eventType || '');
      if (!email || !eventType) {
        ignored += 1;
        continue;
      }
      const subscriberId = `email-subscriber-${email.replace(/@/g, '-at-').replace(/\./g, '-').replace(/[^a-z0-9-]/g, '-')}`;
      await sc.createIfNotExists({ _id: subscriberId, _type: 'emailSubscriber', email, createdAt: now });
      const patch = { email, updatedAt: now, lastBrevoEvent: eventType, lastBrevoEventAt: now };

      if (['hard_bounce', 'spam', 'unsubscribed', 'blocked', 'invalid_email', 'complaint'].includes(eventType)) {
        patch.status = eventType === 'unsubscribed' ? 'unsubscribed' : (eventType === 'hard_bounce' ? 'bounced' : 'suppressed');
        patch.suppressedAt = now;
        patch.suppressionReason = eventType;
        suppressed += 1;
      } else if (eventType === 'delivered') {
        patch.lastDeliveredAt = now;
        if (!['unsubscribed', 'bounced', 'suppressed', 'complained'].includes(String(event?.status || '').toLowerCase())) {
          patch.status = 'subscribed';
        }
        delivered += 1;
      }

      await sc.patch(subscriberId).set(patch).commit();
      const eventId = `email-event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
      const parsedOccurredAt = new Date(event?.date || now);
      await sc.create({
        _id: eventId,
        _type: 'emailEvent',
        email,
        eventType,
        provider: 'brevo',
        occurredAt: Number.isNaN(parsedOccurredAt.getTime()) ? now : parsedOccurredAt.toISOString(),
        payload: JSON.stringify(event).slice(0, 20000),
        createdAt: now,
      });
      processed += 1;
    }

    logger.info({ processed, suppressed, delivered, ignored }, 'processed brevo webhook events');
    auditLog(req, 'webhook.brevo.events', { processed, suppressed, delivered, ignored });
    return res.json({ ok: true, processed, suppressed, delivered, ignored });
  } catch (err) {
    logger.error({ err }, 'brevo webhook processing failed');
    return res.status(500).json({ error: 'brevo-webhook-failed' });
  }
});

app.post('/api/email/outbox/process', webhookRateLimit, async (req, res) => {
  try {
    const token = req.get('X-Job-Token') || req.query?.token || req.body?.token;
    const expected = process.env.EMAIL_OUTBOX_JOB_TOKEN || '';
    let authorized = false;
    if (expected && token && timingSafeEqualString(String(token), String(expected))) {
      authorized = true;
    } else {
      const auth = await authenticateAllowedUser(req);
      authorized = !!auth.ok;
      if (authorized) req.user = auth.user;
    }
    if (!authorized) return res.status(401).json({ error: 'unauthorized' });

    const limit = Math.max(1, Math.min(100, Number(req.body?.limit || req.query?.limit || 20)));
    const maxAttempts = Math.max(1, Math.min(10, Number(req.body?.maxAttempts || req.query?.maxAttempts || 5)));
    const result = await emailOutboxService.processBatch({ limit, maxAttempts });
    auditLog(req, 'email.outbox.process', result);
    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, 'email outbox process failed');
    return res.status(500).json({ error: 'outbox-process-failed' });
  }
});

app.get('/api/email/outbox/stats', requireAllowedUser, async (req, res) => {
  try {
    const stats = await emailOutboxService.getStats();
    auditLog(req, 'email.outbox.stats');
    return res.json({ ok: true, stats });
  } catch (err) {
    logger.error({ err }, 'email outbox stats failed');
    return res.status(500).json({ error: 'outbox-stats-failed' });
  }
});

app.get('/api/email/events/summary', requireAllowedUser, async (req, res) => {
  try {
    const sc = getSanityReadClient() || getSanityClient();
    if (!sc) return res.status(500).json({ error: 'sanity-not-configured' });

    const summary = await sc.fetch(`{
      "totalEvents": count(*[_type == "emailEvent"]),
      "eventsLast24h": count(*[_type == "emailEvent" && dateTime(_createdAt) > dateTime(now()) - 60*60*24]),
      "subscribers": count(*[_type == "emailSubscriber"]),
      "subscriberStatusCounts": {
        "pending_double_opt_in": count(*[_type == "emailSubscriber" && status == "pending_double_opt_in"]),
        "subscribed": count(*[_type == "emailSubscriber" && status == "subscribed"]),
        "unsubscribed": count(*[_type == "emailSubscriber" && status == "unsubscribed"]),
        "suppressed": count(*[_type == "emailSubscriber" && status == "suppressed"]),
        "bounced": count(*[_type == "emailSubscriber" && status == "bounced"])
      },
      "recentEvents": *[_type == "emailEvent"] | order(_createdAt desc)[0...20]{ email, eventType, occurredAt, _createdAt }
    }`);

    auditLog(req, 'email.events.summary');
    return res.json({ ok: true, summary: summary || {} });
  } catch (err) {
    logger.error({ err }, 'email events summary failed');
    return res.status(500).json({ error: 'email-events-summary-failed' });
  }
});

// --- Notes (admin-backed) endpoints to support Gallant Notepad ---
// List notes (newest first)
app.get('/api/notes', requireAllowedUser, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'firestore-unavailable' });
    const snap = await db.collection('notes').orderBy('updatedAt', 'desc').limit(200).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ items });
  } catch (err) {
  logger.error({ err }, 'notes list error');
    return res.status(500).json({ error: 'notes-list-failed' });
  }
});

// Create a note
app.post('/api/notes', requireAllowedUser, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'firestore-unavailable' });
    const { title, content } = req.body || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    const ref = await db.collection('notes').add({ title: title || 'Untitled', content: content || '', createdAt: now, updatedAt: now });
    return res.json({ ok: true, id: ref.id });
  } catch (err) {
  logger.error({ err }, 'notes create error');
    return res.status(500).json({ error: 'notes-create-failed' });
  }
});

// Update a note
app.put('/api/notes/:id', requireAllowedUser, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'firestore-unavailable' });
    const { id } = req.params;
    const { title, content } = req.body || {};
    const patch = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (typeof title === 'string') patch.title = title;
    if (typeof content === 'string') patch.content = content;
    await db.collection('notes').doc(id).update(patch);
    return res.json({ ok: true });
  } catch (err) {
  logger.error({ err }, 'notes update error');
    return res.status(500).json({ error: 'notes-update-failed' });
  }
});

// Save campaign (draft) to Sanity
app.post('/api/campaigns/save', async (req, res) => {
  try {
    const { name, html } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ error: 'Sanity not configured' });
    const doc = await sc.create({ _type: 'campaign', name, status: 'draft', html, createdAt: new Date().toISOString() });
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
  logger.error({ err }, 'campaign save error');
    return res.status(500).json({ error: 'save-failed' });
  }
});

// Team: send outbound message
app.post('/api/messages/send', async (req, res) => {
  try {
    const { to, subject, html, text, threadId, fromName, fromEmail } = req.body || {};
    if (!to || !Array.isArray(to) || to.length === 0) return res.status(400).json({ error: 'Missing recipients' });
    const headers = brevoService.getHeaders();
    if (!headers) return res.status(500).json({ error: 'Email service not configured' });

    const senderEmail = fromEmail || process.env.SENDER_EMAIL;
    if (!senderEmail) return res.status(500).json({ error: 'Missing SENDER_EMAIL' });

    const payload = {
      to: to.map((e) => ({ email: e })),
      sender: { email: senderEmail, name: fromName || 'Local Effort' },
      subject: subject || '(no subject)',
      htmlContent: html || undefined,
      textContent: text || undefined,
      tags: ['outbound'],
      headers: threadId ? { 'X-Thread-Id': String(threadId) } : undefined,
    };
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      return res.status(502).json({ error: 'send-failed', details: t });
    }

    // Mirror into Sanity
    const sc = getSanityClient();
    let msgDoc = null;
    if (sc) {
      try {
        msgDoc = await sc.create({
          _type: 'message',
          direction: 'outbound',
          status: 'sent',
          subject: subject || '(no subject)',
          bodyHtml: html || null,
          bodyText: text || null,
          toEmails: to,
          channel: 'email',
          inbox: 'general',
          threadId: threadId || null,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Failed to mirror outbound message:', e && e.message);
      }
    }
    return res.json({ ok: true, id: msgDoc?._id || null });
  } catch (err) {
  logger.error({ err }, 'messages send error');
    return res.status(500).json({ error: 'send-failed' });
  }
});

// Team: read inbox (basic, newest first)
app.get('/api/inbox', async (req, res) => {
  try {
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ error: 'Sanity not configured' });
    const { status = 'open', limit = '50' } = req.query || {};
    const lim = Math.min(200, parseInt(limit, 10) || 50);
    const query = `*[_type == "message" && status == $status] | order(createdAt desc)[0...$lim]{
      _id, direction, subject, fromEmail, fromName, toEmails, createdAt, inbox, status
    }`;
    const docs = await sc.fetch(query, { status, lim });
    return res.json({ items: docs });
  } catch (err) {
  logger.error({ err }, 'inbox error');
    return res.status(500).json({ error: 'inbox-failed' });
  }
});

// Event request form submission
app.post('/api/events/request', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      eventDate,
      city,
      state,
      zip,
      eventType,
      guestCount,
      notes,
      sendCopy = false,
    } = req.body || {};

    // Validation
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({
        error: 'Missing required fields: firstName, lastName, email, phone',
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Store in Firestore
    let firestoreId = null;
    if (db) {
      try {
        const eventRef = db.collection('events').doc();
        const eventDoc = {
          contact: {
            firstName,
            lastName,
            email,
            phone,
            name: `${firstName} ${lastName}`,
          },
          date: eventDate ? new Date(eventDate) : null,
          location: [city, state, zip].filter(Boolean).join(', '),
          city,
          state,
          zip,
          eventType: eventType || null,
          guestCount: guestCount ? parseInt(guestCount, 10) : null,
          notes: notes || '',
          status: 'pending',
          source: 'website-form',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await eventRef.set(eventDoc);
        firestoreId = eventRef.id;
      } catch (error) {
        logger.error({ err: error }, 'Firestore save error for event request');
        // Continue even if Firestore fails - we'll still send the email
      }
    }

    // Send email notification to business
    const headers = brevoService.getHeaders();
    if (headers) {
      const businessEmail = process.env.BUSINESS_EMAIL || 'yum@localeffortfood.com';
      const senderEmail = process.env.SENDER_EMAIL || email;
      const location = [city, state, zip].filter(Boolean).join(', ');

      const htmlContent = `
        <h2>New Event Request</h2>
        <h3>Contact Information</h3>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        
        <h3>Event Details</h3>
        ${eventDate ? `<p><strong>Date:</strong> ${eventDate}</p>` : ''}
        ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
        ${eventType ? `<p><strong>Event Type:</strong> ${eventType}</p>` : ''}
        ${guestCount ? `<p><strong>Guest Count:</strong> ${guestCount}</p>` : ''}
        ${notes ? `<p><strong>Notes:</strong><br>${notes.replace(/\n/g, '<br>')}</p>` : ''}
      `;

      // Send to business
      try {
        const businessPayload = {
          to: [{ email: businessEmail }],
          sender: { email: senderEmail, name: 'Event Request Form' },
          subject: `New Event Request from ${firstName} ${lastName}`,
          htmlContent,
          tags: ['event-request', 'form-submission'],
        };

        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers,
          body: JSON.stringify(businessPayload),
        });

        // Send copy to customer if requested
        if (sendCopy && email) {
          const customerPayload = {
            to: [{ email, name: `${firstName} ${lastName}` }],
            sender: { email: businessEmail, name: 'Local Effort' },
            subject: 'Your Event Request - Local Effort',
            htmlContent: `
              <h2>Thank you for your event request!</h2>
              <p>Hi ${firstName},</p>
              <p>We've received your event request and will get back to you shortly.</p>
              <h3>Your Request Details</h3>
              ${eventDate ? `<p><strong>Date:</strong> ${eventDate}</p>` : ''}
              ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
              ${eventType ? `<p><strong>Event Type:</strong> ${eventType}</p>` : ''}
              ${guestCount ? `<p><strong>Guest Count:</strong> ${guestCount}</p>` : ''}
              ${notes ? `<p><strong>Your Notes:</strong><br>${notes.replace(/\n/g, '<br>')}</p>` : ''}
              <p>We look forward to working with you!</p>
              <p>Best regards,<br>Local Effort Team</p>
            `,
            tags: ['event-request', 'customer-copy'],
          };

          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers,
            body: JSON.stringify(customerPayload),
          });
        }
      } catch (emailErr) {
        logger.error({ err: emailErr }, 'Email send error for event request');
        // Don't fail the whole request if email fails
      }

      // Add to Brevo contacts (async, non-blocking)
      brevoService.upsertContact({ email, firstName, lastName, phone }).catch((err) => {
        logger.warn({ err }, 'Background contact sync failed for event request');
      });
    }

    return res.json({
      ok: true,
      message: 'Event request submitted successfully',
      id: firestoreId,
    });
  } catch (err) {
    logger.error({ err }, 'Event request error');
    return res.status(500).json({
      error: 'Failed to process event request',
    });
  }
});

// --- Push subscriptions (Web Push) ---
let webPush = null;
try {
  webPush = require('web-push');
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_SUBJECT || 'mailto:admin@localhost';
  if (pub && priv) webPush.setVapidDetails(email, pub, priv);
} catch (e) {
  console.warn('web-push not available:', e && e.message);
}

app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { userId, subscription } = req.body || {};
    if (!subscription) return res.status(400).json({ error: 'Missing subscription' });
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ error: 'Sanity not configured' });
    const doc = await sc.create({
      _type: 'pushSubscription',
      userId: userId || null,
      endpoint: subscription.endpoint,
      keys: subscription.keys || null,
      createdAt: new Date().toISOString(),
    });
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
  logger.error({ err }, 'push subscribe error');
    return res.status(500).json({ error: 'subscribe-failed' });
  }
});

app.post('/api/push/notify', async (req, res) => {
  try {
    if (!webPush) return res.status(500).json({ error: 'web-push not configured' });
    const { title, body, url = '/' } = req.body || {};
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ error: 'Sanity not configured' });
    const subs = await sc.fetch('*[_type == "pushSubscription"]').catch(() => []);
    const payload = JSON.stringify({ title: title || 'Local Effort', body: body || '', url });
    const results = [];
    for (const s of subs) {
      try {
        // minimal shape for webpush
        const sub = { endpoint: s.endpoint, keys: s.keys };
        // eslint-disable-next-line no-await-in-loop
        await webPush.sendNotification(sub, payload);
        results.push({ id: s._id, ok: true });
      } catch (e) {
        results.push({ id: s._id, ok: false, error: String(e).slice(0, 120) });
      }
    }
    return res.json({ ok: true, sent: results.length, results });
  } catch (err) {
  logger.error({ err }, 'push notify error');
    return res.status(500).json({ error: 'notify-failed' });
  }
});

// --- Public, machine-readable JSON endpoints ---
// Lightweight, JS-free data for crawlers/LLMs and integrations.
app.get('/api/public/site', (req, res) => {
  try {
    let manifest = null;
    if (fs.existsSync(AI_MANIFEST_PATH)) {
      try {
        const raw = fs.readFileSync(AI_MANIFEST_PATH, 'utf8');
        manifest = JSON.parse(raw);
      } catch (parseErr) {
        console.warn('Failed to parse AI manifest JSON:', parseErr.message);
      }
    }

    const siteUrl = (manifest && manifest.site) || process.env.PUBLIC_URL || 'https://localeffortfood.com';
    const trimmedSite = siteUrl.replace(/\/$/, '');
    const navigation = Array.isArray(manifest?.navigation) ? manifest.navigation : [];
    const mcp = Array.isArray(manifest?.mcpServers) ? manifest.mcpServers : [];
    const ucp = Array.isArray(manifest?.ucpServers) ? manifest.ucpServers : [];
    const apis = Array.isArray(manifest?.apis)
      ? manifest.apis
      : [
          { path: '/api/support/search', method: 'GET', query: { q: 'query string' } },
          { path: '/api/messages/submit', method: 'POST' },
          { path: '/api/events/request', method: 'POST' },
          { path: '/api/public/pricing-faq', method: 'GET' },
          { path: '/api/public/estimator-help', method: 'GET' },
        ];
    const feeds = Array.isArray(manifest?.feeds)
      ? manifest.feeds
      : [
          { type: 'sitemap', url: `${trimmedSite}/sitemap.xml` },
          { type: 'sitemap', url: `${trimmedSite}/api/sitemap.xml` },
          { type: 'rss', url: `${trimmedSite}/api/feeds/releases.rss` },
          { type: 'atom', url: `${trimmedSite}/api/feeds/releases.atom` },
        ];

    return res.json({
      name: manifest?.name || 'Local Effort',
      url: siteUrl,
      navigation,
      endpoints: apis,
      feeds,
      support: manifest?.support || { email: 'yum@localeffortfood.com' },
      mcp,
      ucp,
      sitemap: `${trimmedSite}/sitemap.xml`,
      aiTxt: `${trimmedSite}/ai.txt`,
      manifest: `${trimmedSite}/ai/manifest.json`,
      updatedAt: manifest?.updated || new Date().toISOString(),
    });
  } catch (err) {
  logger.error({ err }, 'public site error');
    return res.status(500).json({ error: 'public-site-failed' });
  }
});

function readJsonFileSafe(filePath, fallback = []) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

app.get('/api/public/pricing-faq', (req, res) => {
  try {
    const file = path.resolve(__dirname, '../../src/data/pricingFaq.json');
    const items = readJsonFileSafe(file, []);
    let updatedAt = null;
    try {
      const st = fs.statSync(file);
      updatedAt = st.mtime.toISOString();
    } catch (e) {
      updatedAt = null;
    }
    return res.json({ items, updatedAt });
  } catch (err) {
  logger.error({ err }, 'public pricing faq error');
    return res.status(500).json({ error: 'public-pricing-faq-failed' });
  }
});

app.get('/api/public/estimator-help', (req, res) => {
  try {
    const file = path.resolve(__dirname, '../../src/data/estimatorHelp.json');
    const items = readJsonFileSafe(file, []);
    let updatedAt = null;
    try {
      const st = fs.statSync(file);
      updatedAt = st.mtime.toISOString();
    } catch (e) {
      updatedAt = null;
    }
    return res.json({ items, updatedAt });
  } catch (err) {
  logger.error({ err }, 'public estimator help error');
    return res.status(500).json({ error: 'public-estimator-help-failed' });
  }
});

// --- Referral: validate a code (Sanity-backed) ---
app.post('/api/referrals/validate', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ ok: false, error: 'missing-code' });
    }
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ ok: false, error: 'sanity-not-configured' });
    const trimmed = code.trim();
    const doc = await sc.fetch('*[_type == "referralParticipant" && code == $code][0]{ _id, name, email, code }', { code: trimmed }).catch(() => null);
    if (!doc) return res.json({ ok: false, valid: false });
    return res.json({ ok: true, valid: true, participant: { id: doc._id, name: doc.name || null, email: doc.email || null, code: doc.code } });
  } catch (err) {
  logger.error({ err }, 'referrals validate error');
    return res.status(500).json({ ok: false, error: 'validate-failed' });
  }
});

// --- Square Customers: list and import ---
// List Square customers (minimal fields) with pagination cursor support
app.get('/api/square/customers', async (req, res) => {
  try {
    if (!squareClient) return res.status(500).json({ error: 'square-not-configured' });
    const { cursor } = req.query || {};
    const result = await squareClient.customersApi.listCustomers(cursor ? { cursor } : undefined);
    const customers = (result.result.customers || []).map((c) => ({
      id: c.id,
      givenName: c.givenName,
      familyName: c.familyName,
      email: c.emailAddress,
      phone: c.phoneNumber,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    return res.json({ items: customers, cursor: result.result.cursor || null });
  } catch (err) {
  logger.error({ err }, 'square customers list error');
    return res.status(500).json({ error: 'square-list-failed' });
  }
});

async function mirrorContactInSanity({ email, firstName, lastName, phone, tags }) {
  const sc = getSanityClient();
  if (!sc) return null;
  const now = new Date().toISOString();
  const hasEmail = !!email;
  const id = hasEmail ? `contact-${email}` : undefined;
  try {
    if (id) {
      // Upsert by deterministic id when email exists
      return await sc.createOrReplace({
        _id: id,
        _type: 'contact',
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        tags: Array.isArray(tags) && tags.length ? tags : ['square'],
        updatedAt: now,
      });
    }
    // No email: create new document with generated id
    return await sc.create({
      _type: 'contact',
      email: null,
      firstName: firstName || null,
      lastName: lastName || null,
      phone: phone || null,
      tags: Array.isArray(tags) && tags.length ? tags : ['square'],
      updatedAt: now,
    });
  } catch (e) {
    console.warn('Failed to mirror contact in Sanity:', e && e.message);
    return null;
  }
}

// Import Square customers into Sanity contacts (and optionally Brevo)
// POST body: { cursor?, limit?, upsertBrevo?: boolean }
app.post('/api/square/customers/import', async (req, res) => {
  try {
    if (!squareClient) return res.status(500).json({ error: 'square-not-configured' });
    const { cursor, upsertBrevo = false } = req.body || {};
    const out = { imported: 0, skipped: 0, errors: 0, cursor: null };
    // Pull one page to keep request sizes modest; clients can call repeatedly with cursor
    const result = await squareClient.customersApi.listCustomers(cursor ? { cursor } : undefined);
    const list = result.result.customers || [];
    out.cursor = result.result.cursor || null;
    for (const c of list) {
      try {
        const email = c.emailAddress || null;
        const firstName = c.givenName || null;
        const lastName = c.familyName || null;
        const phone = c.phoneNumber || null;
        // Mirror to Sanity
        await mirrorContactInSanity({ email, firstName, lastName, phone, tags: ['square'] });
        // Optional: upsert to Brevo contacts
        if (upsertBrevo && email) {
          try {
            await brevoService.upsertContact({ email, firstName, lastName, phone });
          } catch (e) {
            console.warn('Brevo upsert failed:', e && e.message);
          }
        }
        out.imported += 1;
      } catch (e) {
        out.errors += 1;
      }
    }
    return res.json(out);
  } catch (err) {
  logger.error({ err }, 'square customers import error');
    return res.status(500).json({ error: 'square-import-failed' });
  }
});

// Intake form submission - sends email to admin
app.post('/api/intake/submit', async (req, res) => {
  try {
    const formData = req.body;
    if (!formData) {
      return res.status(400).json({ error: 'No form data provided' });
    }

    // Helper to format field labels nicely
    const formatLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Helper to format values for email display
    const formatValue = (value, indent = 0) => {
      if (value === null || value === undefined || value === '') return '<em style="color:#999;">—</em>';
      if (Array.isArray(value)) {
        if (value.length === 0) return '<em style="color:#999;">None selected</em>';
        return value.join(', ');
      }
      if (typeof value === 'object') {
        // Handle nested objects like protein sub-options
        const entries = Object.entries(value);
        if (entries.length === 0) return '<em style="color:#999;">—</em>';
        return entries.map(([k, v]) => {
          const label = formatLabel(k);
          if (Array.isArray(v) && v.length > 0) {
            return `<strong>${label}:</strong> ${v.join(', ')}`;
          } else if (typeof v === 'object' && v !== null) {
            // Deep nested object (e.g., proteins with sub-options)
            const subItems = Object.entries(v)
              .filter(([, sv]) => Array.isArray(sv) ? sv.length > 0 : sv)
              .map(([sk, sv]) => `${formatLabel(sk)}: ${Array.isArray(sv) ? sv.join(', ') : sv}`)
              .join('; ');
            return `<strong>${label}:</strong> ${subItems || '—'}`;
          }
          return `<strong>${label}:</strong> ${v || '—'}`;
        }).join('<br>');
      }
      return String(value);
    };

    // Group fields by category for better organization
    const sections = {
      'Contact & Timing': ['email', 'phone', 'address', 'due_date', 'first_delivery'],
      'Kara\'s Preferences': ['kara_proteins', 'kara_favorites', 'kara_dislikes', 'kara_allergies'],
      'Dad\'s Preferences': ['dad_proteins', 'dad_favorites', 'dad_dislikes', 'dad_allergies'],
      'Meal Logistics': ['servings_per_meal', 'meals_per_week', 'dietary_notes', 'fridge_freezer'],
      'Cuisine & Cooking': ['cuisines', 'spice_level', 'cooking_equipment'],
      'Breakfast & Snacks': ['breakfast_options', 'snack_options', 'other_requests'],
      'Delivery & Billing': ['preferred_delivery_day', 'billing_preference', 'additional_notes'],
    };

    let htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2d2a26; border-bottom: 2px solid #e8e4df; padding-bottom: 12px;">
          New Meal Plan Intake
        </h1>
        <p style="color: #666; margin-bottom: 24px;">
          Submitted on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
    `;

    const usedKeys = new Set();

    for (const [sectionName, keys] of Object.entries(sections)) {
      const sectionData = keys.filter(k => formData[k] !== undefined && formData[k] !== '');
      if (sectionData.length === 0) continue;

      htmlContent += `
        <h2 style="color: #5c5650; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 12px; border-bottom: 1px solid #e8e4df; padding-bottom: 8px;">
          ${sectionName}
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
      `;

      for (const key of keys) {
        if (formData[key] === undefined) continue;
        usedKeys.add(key);
        const label = formatLabel(key);
        const value = formatValue(formData[key]);
        htmlContent += `
          <tr>
            <td style="padding: 8px 12px 8px 0; vertical-align: top; width: 140px; color: #888; font-size: 13px;">
              ${label}
            </td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; line-height: 1.5;">
              ${value}
            </td>
          </tr>
        `;
      }
      htmlContent += '</table>';
    }

    // Include any fields not in predefined sections
    const remainingKeys = Object.keys(formData).filter(k => !usedKeys.has(k));
    if (remainingKeys.length > 0) {
      htmlContent += `
        <h2 style="color: #5c5650; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 12px; border-bottom: 1px solid #e8e4df; padding-bottom: 8px;">
          Other Information
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
      `;
      for (const key of remainingKeys) {
        const label = formatLabel(key);
        const value = formatValue(formData[key]);
        htmlContent += `
          <tr>
            <td style="padding: 8px 12px 8px 0; vertical-align: top; width: 140px; color: #888; font-size: 13px;">
              ${label}
            </td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; line-height: 1.5;">
              ${value}
            </td>
          </tr>
        `;
      }
      htmlContent += '</table>';
    }

    htmlContent += `
        <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e8e4df; color: #999; font-size: 12px;">
          This intake form was submitted via the Local Effort website.
        </p>
      </div>
    `;

    const senderEmail = process.env.SENDER_EMAIL || 'yum@localeffortfood.com';
    await brevoService.sendEmail({
      sender: { name: 'Local Effort', email: senderEmail },
      to: [{ email: 'dataweston@gmail.com', name: 'Admin' }],
      subject: 'New Meal Plan Intake: ' + (formData.client_name || formData.email || 'New Client'),
      htmlContent,
      tags: ['intake', 'meal-plan'],
    });

    logger.info({ client: formData.client_name }, 'intake form submitted');
    return res.json({ success: true, message: 'Form submitted successfully' });
  } catch (err) {
    logger.error({ err }, 'intake form submission error');
    return res.status(500).json({ error: 'Failed to submit form' });
  }
});

// Sentry error handler should be before any custom error handlers (none at bottom yet)
if (sentryEnabled) {
  app.use(Sentry.Handlers.errorHandler());
}

// Ensure JSON error responses for unhandled errors.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'internal-error' });
});

const createApiApp = () => app;

module.exports = { createApiApp };


