// backend/api/server.js
/* eslint-disable no-console */
require('dotenv').config({ path: './.env' });
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
const admin = require('firebase-admin');
const { getSanityClient } = require('./sanityClient');
const fs = require('fs');
const path = require('path');
// Structured logger (pino wrapper)
const { logger } = require('./logger');
const { createBrevoService } = require('./services/brevo');
const { createCrowdfundingRouter } = require('./routes/crowdfunding');
const crowdfundCheckoutHandler = require('../../api/crowdfund/checkout');
const crowdfundFeedbackHandler = require('../../api/crowdfund/feedback');
const storeCheckoutHandler = require('../../api/store/checkout');
const giftCardCheckoutHandler = require('../../api/store/gift-card-checkout');
const pizzaPartyCheckoutHandler = require('../../api/store/pizza-party-checkout');
const pizzaPartyStatusHandler = require('../../api/store/pizza-party-status');
const pizzaPartyReceiptHandler = require('../../api/store/pizza-party-receipt');
const pizzaPartyLinkHandler = require('../../api/store/pizza-party-link');
const pizzaPartyBookingsHandler = require('../../api/store/pizza-party-bookings');
const storeProductsHandler = require('../../api/store/products');
const { createMessagesRouter } = require('./routes/messages');
const {
  verifySquareSignature,
  applyCompletedPayment,
  getCrowdfundingSummary,
  createFeedback,
  listFeedback,
} = require('../../packages/lib/crowdfundingPipeline');
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
const { v4: uuidv4 } = require('uuid'); // Import UUID for idempotency

// --- INITIALIZE FIREBASE ---
let db;
const normalizeServiceAccount = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const projectId =
    raw.projectId || raw.project_id || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
  const clientEmail =
    raw.clientEmail || raw.client_email || process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || '';
  let privateKey =
    raw.privateKey || raw.private_key || process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '';
  const databaseURL =
    raw.databaseURL ||
    raw.database_url ||
    process.env.FIREBASE_DATABASE_URL ||
    process.env.GOOGLE_CLOUD_FIREBASE_DATABASE_URL ||
    undefined;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  return {
    projectId,
    clientEmail,
    privateKey,
    databaseURL,
  };
};

const loadServiceAccount = () => {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      const normalized = normalizeServiceAccount(parsed);
      if (normalized) return normalized;
    }
  } catch (err) {
    console.warn('[firebase-admin] failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', err?.message);
  }

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      const normalized = normalizeServiceAccount(parsed);
      if (normalized) return normalized;
    }
  } catch (err) {
    console.warn('[firebase-admin] failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64', err?.message);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      if (fs.existsSync(saPath)) {
        const raw = fs.readFileSync(saPath, 'utf8');
        const parsed = JSON.parse(raw);
        const normalized = normalizeServiceAccount(parsed);
        if (normalized) return normalized;
      } else {
        console.warn(`[firebase-admin] FIREBASE_SERVICE_ACCOUNT_PATH not found: ${saPath}`);
      }
    } catch (err) {
      console.warn('[firebase-admin] failed to read FIREBASE_SERVICE_ACCOUNT_PATH', err?.message);
    }
  }

  return normalizeServiceAccount({});
};

try {
  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: serviceAccount.projectId,
          clientEmail: serviceAccount.clientEmail,
          privateKey: serviceAccount.privateKey,
        }),
        projectId: serviceAccount.projectId,
        databaseURL: serviceAccount.databaseURL,
      });
    }
    db = admin.firestore();
  } else {
    console.warn('Firebase service account not provided — Firestore will be unavailable in this process.');
  }
} catch (err) {
  console.error('Failed to initialize Firebase admin:', err.message);
  console.warn('Firestore will be unavailable in this process.');
}

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

async function requireAllowedUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'missing-auth' });
    if (!admin?.auth) return res.status(500).json({ error: 'auth-unavailable' });
    const decoded = await admin.auth().verifyIdToken(m[1]);
    const email = decoded?.email;
    if (!email || !GALLANT_ALLOWED.has(email)) return res.status(403).json({ error: 'forbidden' });
    req.user = { uid: decoded.uid, email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid-auth' });
  }
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
app.use(express.json());

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  };

  app.options('/.well-known/mcp', (req, res) => { mcpHeaders(res); return res.status(204).end(); });
  app.get('/.well-known/mcp.json', (req, res) => {
    mcpHeaders(res);
    res.json({
      name: 'local-effort-mcp',
      transport: 'streamable-http',
      endpoints: { primary: '/.well-known/mcp' },
      tools: ['support.search','sanity.query'],
      resources: [
        'support-chunk://{chunkId}',
        'support-cache://{cacheKey}',
        'support-source://{sourceId}',
        'sanity-document://{docId}'
      ],
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
        const tool = mcpServer.tools.get(toolName);
        if (!tool) return res.status(404).json({ error: 'tool-not-found' });
        const result = await tool.invoke(toolParams);
        return res.json({ id, result });
      }
      if (method === 'resource.get') {
        const uri = params?.uri;
        if (!uri) return res.status(400).json({ error: 'missing-uri' });
        const resource = await mcpServer.getResource(uri);
        return res.json({ id, resource });
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
    return res.status(500).json({ ok: false, error: 'internal-error' });
  }
};

app.get('/api/crowdfunding/summary', handleCrowdfundingSummary);
app.get('/api/crowdfund/summary', handleCrowdfundingSummary);

app.get('/api/feedback', async (req, res) => {
  try {
    const sinceRaw = Array.isArray(req.query.since) ? req.query.since[0] : req.query.since;
    const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const items = await listFeedback(
      {
        since: sinceRaw ?? undefined,
        limit: limitRaw ? Number(limitRaw) : undefined,
      },
      { db },
    );
    res.json({ ok: true, items });
  } catch (err) {
    if (logger?.error) logger.error({ err }, 'feedback list error');
    res.status(500).json({ ok: false, error: 'internal-error' });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const result = await createFeedback(req.body ?? {}, { db });
    res.json({ ok: true, id: result.id });
  } catch (err) {
    const code = err && typeof err === 'object' ? err.code : null;
    if (code === 'invalid-rating' || code === 'missing-comment') {
      return res.status(400).json({ ok: false, error: code });
    }
    if (logger?.error) logger.error({ err }, 'feedback create error');
    res.status(500).json({ ok: false, error: 'internal-error' });
  }
});

app.use('/api', createMessagesRouter({ logger, brevoService, getSanityClient, db }));

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
  // path relative to this file: ../../api/search-images.js
  // The handler exports a function (req, res)
  // We mount it at GET /api/search-images to preserve the original behavior.
  // eslint-disable-next-line global-require
  const searchImagesHandler = require('../../api/search-images.js');
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

// --- Generic Sanity query proxy (to avoid client-side CORS) ---
app.post('/api/sanity/query', async (req, res) => {
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
    return res.status(500).json({ error: 'sanity-fetch-failed', message: err.message });
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


app.post('/api/food-truck/deposit', async (req, res) => {
  try {
    if (!squareClient) {
      return res.status(500).json({ error: 'square-not-configured' });
    }

    const {
      token,
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

    const idempotencyKey = uuidv4();
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
app.post('/api/blog/publish', async (req, res) => {
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
      const headers = brevoService.getHeaders();
      if (headers) {
        const recipients = Array.isArray(emailTo) && emailTo.length
          ? emailTo
          : (process.env.BLOG_ANNOUNCE_TO || '').split(',').map(s => s.trim()).filter(Boolean);
        if (recipients.length) {
          const base = (process.env.PUBLIC_URL || 'https://localeffortfood.com');
          const url = base.replace(/\/$/, '') + '/weekly/' + doc.slug.current;
          const snippet = (text || JSON.stringify(blocks)).slice(0, 400);
          const payload = {
            to: recipients.map((e) => ({ email: e })),
            sender: { email: process.env.SENDER_EMAIL || recipients[0], name: 'Local Effort' },
            subject: `New post: ${title}`,
            htmlContent: `<h2>${title}</h2><p>${snippet}…</p><p><a href="${url}">Read on the site</a></p>`,
            tags: ['blog','auto'],
          };
          const resp = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers, body: JSON.stringify(payload) });
          emailed = resp.ok ? recipients.length : 0;
        }
      }
    }

    return res.json({ ok: true, id: doc._id, slug: doc.slug?.current, emailed });
  } catch (err) {
  logger.error({ err }, 'blog publish error');
    return res.status(500).json({ error: 'publish-failed' });
  }
});

// Sanity webhook: on blogPost publish, send Brevo email to a small list
app.post('/api/webhooks/sanity/blog', async (req, res) => {
  try {
    const { _type, slug, title } = req.body || {};
    if (_type !== 'blogPost') return res.status(400).json({ ok: false });
    // Fetch the full post content
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ error: 'sanity-not-configured' });
    const doc = await sc.fetch('*[_type == "blogPost" && slug.current == $slug][0]{ title, publishedAt, body }', { slug: slug?.current || slug });

    // Render a simple HTML from blocks (very basic)
    const text = JSON.stringify(doc?.body || []);
    const snippet = (text || '').slice(0, 400);

    const headers = brevoService.getHeaders();
    if (!headers) return res.status(500).json({ error: 'email-not-configured' });

    const recipientsRaw = process.env.BLOG_ANNOUNCE_TO || '';
    const recipients = recipientsRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (!recipients.length) return res.json({ ok: true, skipped: 'no-recipients' });

    const payload = {
      to: recipients.map((e) => ({ email: e })),
      sender: { email: process.env.SENDER_EMAIL || recipients[0], name: 'Local Effort' },
      subject: `New post: ${doc?.title || title || 'Local Effort Blog'}`,
      htmlContent: `
        <h2>${doc?.title || title || 'Local Effort Blog'}</h2>
        <p>${snippet}…</p>
        <p><a href="${(process.env.PUBLIC_URL || 'https://localeffortfood.com').replace(/\/$/, '')}/weekly/${slug?.current || slug}">Read on the site</a></p>
      `,
      tags: ['blog', 'auto'],
    };
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers, body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      return res.status(502).json({ ok: false, error: 'email-failed', details: t });
    }
    return res.json({ ok: true, recipients: recipients.length });
  } catch (err) {
  logger.error({ err }, 'sanity blog webhook error');
    return res.status(500).json({ error: 'webhook-failed' });
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
        ];

    return res.json({
      name: manifest?.name || 'Local Effort',
      url: siteUrl,
      navigation,
      endpoints: apis,
      feeds,
      support: manifest?.support || { email: 'yum@localeffortfood.com' },
      mcp,
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

// --- COOKBOOK API PROXY (same-origin for frontend) ---
// IMPORTANT: Require explicit external base to avoid self-origin loops.
const COOKBOOK_API_BASE = process.env.COOKBOOK_API_BASE;
if (COOKBOOK_API_BASE) {
  const buildCookbookUrl = (p, qs) => {
    const base = COOKBOOK_API_BASE.replace(/\/$/, '');
    const url = new URL(base + p);
    if (qs && typeof qs === 'object') {
      for (const [k, v] of Object.entries(qs)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    return url;
  };

  const isSameOrigin = (targetUrl, req) => {
    try {
      const host = (req.headers.host || '').toLowerCase();
      const tu = new URL(String(targetUrl));
      return host === tu.host.toLowerCase();
    } catch {
      return false;
    }
  };

  app.get('/api/search', async (req, res) => {
    try {
      const upstream = buildCookbookUrl('/api/search', { q: req.query.q || '' });
      if (isSameOrigin(upstream, req)) {
    logger.error({ upstream: String(upstream) }, 'cookbook api base misconfigured search');
        return res.status(500).json({ error: 'proxy-misconfigured', message: 'COOKBOOK_API_BASE must point to external Cookbook API, not this site.' });
      }
      const r = await fetch(String(upstream), { headers: { Accept: 'application/json' } });
      const contentType = r.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await r.json() : await r.text();
      if (!r.ok) return res.status(r.status).json({ error: 'upstream-error', details: body });
      return res.status(200).json(body);
    } catch (err) {
  logger.error({ err }, 'cookbook proxy search failed');
      return res.status(502).json({ error: 'cookbook-proxy-failed' });
    }
  });

  app.get('/api/recipes/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const upstream = buildCookbookUrl(`/api/recipes/${encodeURIComponent(id)}`);
      if (isSameOrigin(upstream, req)) {
    logger.error({ upstream: String(upstream) }, 'cookbook api base misconfigured recipe');
        return res.status(500).json({ error: 'proxy-misconfigured', message: 'COOKBOOK_API_BASE must point to external Cookbook API, not this site.' });
      }
      const r = await fetch(String(upstream), { headers: { Accept: 'application/json' } });
      const contentType = r.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await r.json() : await r.text();
      if (!r.ok) return res.status(r.status).json({ error: 'upstream-error', details: body });
      return res.status(200).json(body);
    } catch (err) {
  logger.error({ err }, 'cookbook proxy recipe failed');
      return res.status(502).json({ error: 'cookbook-proxy-failed' });
    }
  });
} else {
  // No external host — serve Cookbook endpoints from local repo data.
  console.warn('COOKBOOK_API_BASE not set — enabling internal Cookbook endpoints from local data.');

  const COOKBOOK_DATA_DIR = process.env.COOKBOOK_DATA_DIR || path.resolve(__dirname, '../../cookbook/repo/data');

  let cookbookIndex = null;
  let cookbookById = null;
  const buildCookbookIndex = async () => {
    if (cookbookIndex && cookbookById) return;
    const t0 = Date.now();
    const index = [];
    const byId = new Map();
    function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(full);
        else if (ent.isFile() && ent.name.toLowerCase().endsWith('.json')) {
          try {
            const raw = fs.readFileSync(full, 'utf8');
            const doc = JSON.parse(raw);
            const id = String(doc.identifier || path.basename(full, path.extname(full)) || '').trim();
            if (!id) continue;
            const title = String(doc.title || doc.name || id);
            const ingredients = Array.isArray(doc.ingredients) ? doc.ingredients : [];
            const instructions = Array.isArray(doc.instructions) ? doc.instructions : [];
            const source = doc.source || 'cookbook';
            const item = {
              id,
              title,
              ingredients,
              instructions,
              source,
              _search: {
                title: title.toLowerCase(),
                ingredients: ingredients.join(' ').toLowerCase(),
                instructions: instructions.join(' ').slice(0, 5000).toLowerCase(),
              },
              _path: full,
            };
            index.push(item);
            if (!byId.has(id)) byId.set(id, item);
          } catch (e) {
            // skip malformed
          }
        }
      }
    }
    try {
      walk(COOKBOOK_DATA_DIR);
    } catch (e) {
      console.error('Failed to scan Cookbook data dir:', COOKBOOK_DATA_DIR, e?.message);
    }
    cookbookIndex = index;
    cookbookById = byId;
    console.info(`Cookbook index built (${index.length} docs) in ${Date.now() - t0}ms`);
  };

  app.get('/api/search', async (req, res) => {
    try {
      await buildCookbookIndex();
      const q = String(req.query.q || '').trim().toLowerCase();
      // If empty query, return first N results
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      if (!q) {
        const results = cookbookIndex
          .slice(0, limit)
          .map((doc) => ({ id: doc.id, title: doc.title, ingredients: doc.ingredients, source: doc.source }));
        return res.json({ results });
      }
      const terms = q.split(/\s+/).filter(Boolean);
      const scored = [];
      for (const doc of cookbookIndex) {
        let score = 0;
        for (const t of terms) {
          if (doc._search.title.includes(t)) score += 5;
          if (doc._search.ingredients.includes(t)) score += 3;
          if (doc._search.instructions.includes(t)) score += 1;
        }
        if (score > 0) scored.push({ doc, score });
      }
      scored.sort((a, b) => b.score - a.score);
      const results = scored.slice(0, limit).map(({ doc }) => {
        const out = { id: doc.id, title: doc.title, ingredients: doc.ingredients, source: doc.source };
        // simple highlight snippet from instructions
        if (doc.instructions && doc.instructions.length) {
          const joined = doc.instructions.join(' ');
          const pos = Math.max(0, doc._search.instructions.indexOf(terms[0] || ''));
          const start = Math.max(0, pos - 80);
          out.snippet = joined.slice(start, start + 200).trim();
        }
        return out;
      });
      return res.json({ results });
    } catch (err) {
      logger.error({ err }, 'internal search failed');
      return res.status(500).json({ error: 'internal-search-failed' });
    }
  });

  app.get('/api/recipes/:id', async (req, res) => {
    try {
      await buildCookbookIndex();
      const id = String(req.params.id || '').trim();
      let item = cookbookById.get(id);
      if (!item) {
        // Attempt file basename fallback
        const alt = path.basename(id, path.extname(id));
        item = cookbookById.get(alt);
      }
      if (!item) return res.status(404).json({ error: 'not-found' });
      // Load full JSON from disk for the recipe response
      try {
        const raw = fs.readFileSync(item._path, 'utf8');
        const json = JSON.parse(raw);
        // Ensure id/title fields
        json.id = json.identifier || item.id;
        json.title = json.title || item.title || json.id;
        return res.json(json);
      } catch (e) {
        return res.json({ id: item.id, title: item.title, ingredients: item.ingredients, instructions: item.instructions, source: item.source });
      }
    } catch (err) {
      logger.error({ err }, 'internal recipes failed');
      return res.status(500).json({ error: 'internal-recipes-failed' });
    }
  });
}

// Sentry error handler should be before any custom error handlers (none at bottom yet)
if (sentryEnabled) {
  app.use(Sentry.Handlers.errorHandler());
}

const createApiApp = () => app;

module.exports = { createApiApp };

