/**
 * Shared OAuth for Google-owned business systems.
 *
 * One offline grant covers GA4, Business Profile, Merchant Center, and Ads.
 * Tokens are stored in BrainApiToken, consistent with the Gmail integration.
 */

const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { getPrisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');

const TOKEN_LABEL = 'google-business-integrations';
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/content',
  'https://www.googleapis.com/auth/adwords',
  // Added 2026-07-04 for Search Console. Grants stored before this date lack
  // it — re-authorize via /api/brain/google/auth before the sync will work.
  'https://www.googleapis.com/auth/webmasters.readonly',
];

const verifyAdminRequest = createAdminVerifier();

function redirectUri() {
  return process.env.GOOGLE_BUSINESS_REDIRECT_URI
    || 'https://www.localeffortfood.com/api/brain/google/callback';
}

function createOAuthClient() {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'Google OAuth client missing: set GOOGLE_BUSINESS_CLIENT_ID/SECRET '
      + 'or reuse GMAIL_CLIENT_ID/SECRET'
    );
  }
  return new OAuth2Client(clientId, clientSecret, redirectUri());
}

function stateSecret() {
  return process.env.GOOGLE_BUSINESS_OAUTH_STATE_SECRET
    || process.env.BRAIN_ADMIN_KEY
    || process.env.GOOGLE_BUSINESS_CLIENT_SECRET
    || process.env.GMAIL_CLIENT_SECRET
    || '';
}

function createOAuthState() {
  const secret = stateSecret();
  if (!secret) throw new Error('Google business OAuth state secret not configured');
  const encoded = Buffer.from(JSON.stringify({
    ts: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyOAuthState(state, maxAgeMs = 15 * 60 * 1000) {
  const secret = stateSecret();
  if (!secret || typeof state !== 'string') return false;
  const [encoded, signature] = state.split('.');
  if (!encoded || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  if (!timingSafeEqual(signature, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return Number.isFinite(payload.ts) && Date.now() - payload.ts <= maxAgeMs;
  } catch {
    return false;
  }
}

function getAuthUrl() {
  return createOAuthClient().generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    prompt: 'consent',
    scope: SCOPES,
    state: createOAuthState(),
  });
}

async function exchangeCodeForTokens(code) {
  const { tokens } = await createOAuthClient().getToken(code);
  return tokens;
}

async function storeTokens(tokens) {
  const prisma = getPrisma();
  const tokenHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(tokens))
    .digest('hex');
  await prisma.brainApiToken.upsert({
    where: { tokenHash },
    update: { lastUsedAt: new Date(), tokenData: tokens, scopes: SCOPES },
    create: {
      label: TOKEN_LABEL,
      tokenHash,
      scopes: SCOPES,
      tokenData: tokens,
      lastUsedAt: new Date(),
    },
  });
  return tokenHash;
}

async function loadTokens() {
  // The env override is intended for local-only setup. In production, prefer
  // the database grant so completing the OAuth callback can actually add new
  // scopes (for example Search Console) without an older Vercel refresh token
  // permanently shadowing it.
  if (!process.env.VERCEL && process.env.GOOGLE_BUSINESS_REFRESH_TOKEN) {
    return { refresh_token: process.env.GOOGLE_BUSINESS_REFRESH_TOKEN };
  }
  const prisma = getPrisma();
  try {
    const row = await prisma.brainApiToken.findFirst({
      where: { label: TOKEN_LABEL },
      orderBy: { createdAt: 'desc' },
    });
    if (row?.tokenData) return row.tokenData;
  } catch (error) {
    if (!process.env.GOOGLE_BUSINESS_REFRESH_TOKEN) throw error;
  }
  return process.env.GOOGLE_BUSINESS_REFRESH_TOKEN
    ? { refresh_token: process.env.GOOGLE_BUSINESS_REFRESH_TOKEN }
    : null;
}

async function getAuthorizedOAuthClient() {
  const tokens = await loadTokens();
  if (!tokens) {
    throw new Error('Google business OAuth not connected; visit /api/brain/google/auth');
  }
  const client = createOAuthClient();
  client.setCredentials(tokens);
  return client;
}

async function getGoogleAccessToken(auth) {
  const result = await auth.getAccessToken();
  const token = typeof result === 'string' ? result : result?.token;
  if (!token) throw new Error('Unable to obtain Google OAuth access token');
  return token;
}

function googleErrorMessage(body, status, rawText) {
  const root = body?.error || body;
  const messages = [];
  if (root?.message) messages.push(root.message);
  for (const detail of root?.details || []) {
    for (const failure of detail?.errors || []) {
      const code = failure.errorCode
        ? Object.entries(failure.errorCode).map(([key, value]) => `${key}.${value}`).join(',')
        : null;
      messages.push([code, failure.message].filter(Boolean).join(': '));
    }
  }
  if (!messages.length && rawText) messages.push(rawText.slice(0, 1000));
  return messages.filter(Boolean).join(' | ') || `Google API HTTP ${status}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Business Profile APIs enforce tight per-minute quotas; a burst of discovery +
// metrics calls can 429 every run. Waiting out the minute window and retrying
// turns those runs into slow successes instead of guaranteed failures.
const RETRY_DELAYS_MS = [15_000, 30_000, 65_000];

async function googleApiRequest(auth, url, {
  method = 'GET',
  body,
  headers = {},
} = {}) {
  const token = await getGoogleAccessToken(auth);
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const rawText = await response.text();
    let data = {};
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = {};
      }
    }
    if (!response.ok) {
      const retryable = response.status === 429 || response.status === 503;
      if (retryable && attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      const error = new Error(googleErrorMessage(data, response.status, rawText));
      error.status = response.status;
      error.requestId = response.headers.get('request-id') || null;
      throw error;
    }
    return data;
  }
}

function timingSafeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function hasBrainAdminHeader(req) {
  return timingSafeEqual(req.headers['x-brain-admin-key'], process.env.BRAIN_ADMIN_KEY);
}

function isAuthorizedCron(req) {
  const marked = req.headers['x-vercel-cron'] === '1'
    || String(req.headers['user-agent'] || '').startsWith('vercel-cron');
  if (!marked) return false;
  if (!process.env.CRON_SECRET) return true;
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  return timingSafeEqual(match?.[1], process.env.CRON_SECRET);
}

async function authorizeGoogleJobRequest(req) {
  const admin = await verifyAdminRequest(req);
  return Boolean(admin || isAuthorizedCron(req) || hasBrainAdminHeader(req));
}

function registerGoogleBusinessAuthRoutes(app, { logger } = {}) {
  app.get('/api/brain/google/auth', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin && !hasBrainAdminHeader(req)) {
        return res.status(403).json({ error: 'admin only' });
      }
      const authUrl = getAuthUrl();
      if (req.query.format === 'json') return res.json({ authUrl, scopes: SCOPES });
      return res.redirect(authUrl);
    } catch (error) {
      logger?.error({ err: error }, 'brain/google: auth error');
      return res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/brain/google/callback', async (req, res) => {
    try {
      if (req.query.error) return res.status(400).send(`OAuth error: ${req.query.error}`);
      if (!req.query.code) return res.status(400).send('Missing code');
      if (!verifyOAuthState(req.query.state)) return res.status(400).send('Invalid OAuth state');
      const tokens = await exchangeCodeForTokens(req.query.code);
      if (!tokens.refresh_token) {
        return res.status(400).send('Google did not return a refresh token; revoke the prior grant and reconnect');
      }
      await storeTokens(tokens);
      return res.send(
        '<html><body><h2>Google business systems connected.</h2>'
        + '<p>You can close this tab.</p></body></html>'
      );
    } catch (error) {
      logger?.error({ err: error }, 'brain/google: callback error');
      return res.status(500).send('Token exchange failed');
    }
  });
}

module.exports = {
  SCOPES,
  authorizeGoogleJobRequest,
  getGoogleAccessToken,
  getAuthorizedOAuthClient,
  googleApiRequest,
  isAuthorizedCron,
  registerGoogleBusinessAuthRoutes,
  timingSafeEqual,
};
