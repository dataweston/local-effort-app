/**
 * Gmail → Brain ingestion.
 *
 * Ingests Gmail messages from the founder's sent mail and the shared yum@
 * mailbox into the lossless source corpus, LedgerEvents, and triage inbox.
 *
 * Setup required (one-time):
 *   1. Enable Gmail API in Google Cloud Console (same project as Google Calendar)
 *   2. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET to .env
 *   3. GET /api/brain/gmail/auth  → redirect to Google OAuth
 *   4. Google redirects to /api/brain/gmail/callback → stores refresh token in BrainApiToken
 *   5. Sync runs via POST /api/brain/gmail/sync or `node scripts/gmail.cjs sync`.
 *      Each call drains bounded pages; repeat until it reports complete.
 *
 * "gmail-sync" and grants read-only Gmail access plus calendar-list discovery
 * and event writes. Calendar writes must enforce an explicit target calendar.
 */

const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent, createInboxItem } = require('./ledger');
const { parseGmailRawMessage } = require('./gmailMime');
const { writeSourceDocument } = require('./sourceCorpus');
const { gmail: createGmailClient, auth: googleAuth } = require('@googleapis/gmail');
const { OAuth2Client } = require('google-auth-library');
// Build OAuth clients from the same googleapis-common instance as Gmail.
// A cross-major google-auth-library client is not recognized and the request
// silently leaves without an Authorization header.

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.owned',
];
const GMAIL_TOKEN_LABEL = 'gmail-sync';

// ── OAuth helpers ────────────────────────────────────────────────────────────

function getGmailRedirectUri() {
  const configured =
    process.env.GMAIL_REDIRECT_URI ||
    `${process.env.VITE_PUBLIC_URL || 'https://www.localeffortfood.com'}/api/brain/gmail/callback`;
  return configured === 'https://localeffortfood.com/api/brain/gmail/callback'
    ? 'https://www.localeffortfood.com/api/brain/gmail/callback'
    : configured;
}

function getOAuthClient() {
  return new googleAuth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    getGmailRedirectUri()
  );
}

function getAuthUrl() {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent',
    state: createOAuthState(),
  });
}

function getStateSecret() {
  return (
    process.env.GMAIL_OAUTH_STATE_SECRET ||
    process.env.BRAIN_ADMIN_KEY ||
    process.env.GMAIL_CLIENT_SECRET ||
    ''
  );
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function createOAuthState() {
  const crypto = require('crypto');
  const secret = getStateSecret();
  if (!secret) throw new Error('Gmail OAuth state secret not configured');
  const payload = JSON.stringify({
    ts: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  });
  const encoded = base64url(payload);
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyOAuthState(state, maxAgeMs = 15 * 60 * 1000) {
  const crypto = require('crypto');
  const secret = getStateSecret();
  if (!secret || typeof state !== 'string') return false;
  const [encoded, sig] = state.split('.');
  if (!encoded || !sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return Number.isFinite(payload.ts) && Date.now() - payload.ts <= maxAgeMs;
  } catch {
    return false;
  }
}

async function exchangeCodeForTokens(code) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * One stable row per label. tokenHash is the upsert key, so hashing the token
 * payload minted a brand new row on every refresh — eight orphans accumulated,
 * and loadGmailTokens then ordered by a lastUsedAt nothing ever set, picking
 * among them arbitrarily. Hash the label instead: same row forever.
 */
function tokenRowKey(label = GMAIL_TOKEN_LABEL) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(`brain-api-token:${label}`).digest('hex');
}

async function storeGmailTokens(tokens, prismaClient = null) {
  const prisma = prismaClient || getPrisma();
  const tokenHash = tokenRowKey();

  // Google returns refresh_token only on the first consent. Refresh responses
  // carry just access_token/expiry_date, so a blind write would drop the
  // refresh_token and silently un-authorize the integration.
  const existing = await prisma.brainApiToken.findUnique({ where: { tokenHash } });
  const merged = { ...(existing?.tokenData || {}), ...tokens };
  if (!merged.refresh_token && existing?.tokenData?.refresh_token) {
    merged.refresh_token = existing.tokenData.refresh_token;
  }

  await prisma.brainApiToken.upsert({
    where: { tokenHash },
    update: { lastUsedAt: new Date(), tokenData: merged, scopes: GMAIL_SCOPES },
    create: {
      label: GMAIL_TOKEN_LABEL,
      tokenHash,
      scopes: GMAIL_SCOPES,
      tokenData: merged,
    },
  });

  return tokenHash;
}

/** Local fallback written by earlier one-off scripts; gitignored. */
function loadGmailTokenFile() {
  const fs = require('fs');
  const path = require('path');
  const file = path.resolve(__dirname, '..', '..', '..', '.gmail-tokens.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

async function loadGmailTokens(prismaClient = null) {
  const prisma = prismaClient || getPrisma();
  // Canonical row first, then any legacy row that still holds data, then the
  // local file. Legacy rows predate tokenRowKey and have no usable ordering.
  const row =
    (await prisma.brainApiToken.findUnique({ where: { tokenHash: tokenRowKey() } })) ||
    (await prisma.brainApiToken.findFirst({
      where: { label: GMAIL_TOKEN_LABEL, NOT: { tokenData: { equals: null } } },
      orderBy: { createdAt: 'desc' },
    }));

  const raw = row?.tokenData || loadGmailTokenFile();
  if (!raw) return null;
  // Normalize python google-auth-oauthlib format for google-auth-library.
  // Python writes: { token, refresh_token, token_uri, client_id, client_secret, scopes }
  // OAuth2Client expects: { access_token, refresh_token, expiry_date, ... }
  if (raw.token && !raw.access_token) {
    return {
      access_token: raw.token,
      refresh_token: raw.refresh_token,
      token_uri: raw.token_uri,
      client_id: raw.client_id,
      client_secret: raw.client_secret,
      scope: Array.isArray(raw.scopes) ? raw.scopes.join(' ') : raw.scopes,
    };
  }
  return raw;
}

function grantedGoogleScopes(tokens) {
  const value = tokens?.scope || tokens?.scopes || '';
  return new Set(Array.isArray(value) ? value : String(value).split(/\s+/).filter(Boolean));
}

async function getAuthorizedGoogleOAuthClient(requiredScopes = [], prismaClient = null) {
  const tokens = await loadGmailTokens(prismaClient);
  if (!tokens) {
    throw new Error('Google Workspace not authorized — visit /api/brain/gmail/auth to connect');
  }
  const scopes = grantedGoogleScopes(tokens);
  const missing = requiredScopes.filter((scope) => !scopes.has(scope));
  if (missing.length) {
    throw new Error(`Google Workspace reauthorization required for: ${missing.join(', ')}`);
  }
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
  oauth2Client.on('tokens', (newTokens) => {
    storeGmailTokens(newTokens, prismaClient).catch(() => {});
  });
  await oauth2Client.getAccessToken();
  return oauth2Client;
}

/** Build an authenticated, read-only Gmail client for bounded specialist syncs. */
async function getAuthorizedGmailClient() {
  const oauth2Client = await getAuthorizedGoogleOAuthClient([GMAIL_SCOPES[0]]);
  return createGmailClient({ version: 'v1', auth: oauth2Client });
}

/**
 * Non-throwing auth probe for health checks and CLI diagnostics.
 * Returns { ok, reason, detail, expiresAt, testingModeGrant }.
 */
function gmailAuthenticationRejected(error) {
  const status = Number(error?.response?.status || error?.code || 0);
  const message = [
    error?.message,
    error?.response?.data?.error_description,
    error?.response?.data?.error?.message,
  ].filter(Boolean).join(' ');
  return status === 401 || /login required|invalid credentials|unauthori[sz]ed/i.test(message);
}

async function probeGmailAccess(oauth2Client) {
  const gmail = createGmailClient({ version: 'v1', auth: oauth2Client });
  await gmail.users.getProfile({ userId: 'me' });
}

async function getGmailAuthHealth(dependencies = {}) {
  const loadTokens = dependencies.loadGmailTokens || loadGmailTokens;
  const createOAuthClient = dependencies.getOAuthClient || getOAuthClient;
  const persistTokens = dependencies.storeGmailTokens || storeGmailTokens;
  const probeAccess = dependencies.probeGmailAccess || probeGmailAccess;
  let tokens;
  try {
    tokens = await loadTokens();
  } catch (err) {
    return { ok: false, reason: 'load-failed', detail: err.message };
  }
  if (!tokens) return { ok: false, reason: 'not-connected', detail: 'No stored Gmail tokens' };
  if (!tokens.refresh_token) {
    return {
      ok: false,
      reason: 'no-refresh-token',
      detail: 'Stored grant cannot refresh; reconnect required',
    };
  }

  // A 7-day refresh window means the Google Cloud OAuth client is still in
  // "Testing" publishing status, which expires refresh tokens weekly.
  const testingModeGrant =
    Number(tokens.refresh_token_expires_in) > 0 &&
    Number(tokens.refresh_token_expires_in) <= 8 * 86400;

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials(tokens);
  try {
    const { token } = await oauth2Client.getAccessToken();
    if (!token) throw new Error('No access token returned');

    try {
      await probeAccess(oauth2Client);
    } catch (probeError) {
      if (!gmailAuthenticationRejected(probeError)) throw probeError;

      // getAccessToken() reuses an unexpired access token even when Google has
      // revoked it. Force one refresh and verify the Gmail API itself before
      // declaring the connector healthy.
      const refreshedResponse = await oauth2Client.refreshAccessToken();
      const refreshed = { ...tokens, ...(refreshedResponse?.credentials || {}) };
      oauth2Client.setCredentials(refreshed);
      await persistTokens(refreshed);
      await probeAccess(oauth2Client);
    }

    const credentials = { ...tokens, ...(oauth2Client.credentials || {}) };
    if (credentials.access_token) await persistTokens(credentials);
    return {
      ok: true,
      reason: 'connected',
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
      testingModeGrant,
    };
  } catch (err) {
    const detail = [
      err?.message,
      err?.response?.data?.error_description,
      err?.response?.data?.error?.message,
    ].filter(Boolean).join(' ');
    const invalid = /invalid_grant/i.test(detail);
    return {
      ok: false,
      reason: invalid
        ? 'grant-expired'
        : gmailAuthenticationRejected(err)
          ? 'authorization-rejected'
          : 'refresh-failed',
      detail,
      testingModeGrant,
    };
  }
}

// ── Sync logic ───────────────────────────────────────────────────────────────

function mailboxText(values) {
  return (values || [])
    .map((entry) => entry.name ? `${entry.name} <${entry.address || ''}>` : entry.address)
    .filter(Boolean)
    .join(', ');
}

/**
 * Bounded, resumable thread sync.
 *
 * Two queries feed the brain: everything the founder sent inside the retention
 * window, and everything touching the shared yum@ mailbox. One unbounded pass
 * cannot finish inside a serverless invocation, and detaching it after the HTTP
 * response does not escape that limit - it only hides the kill, because the
 * instance freezes mid-loop and the run reports nothing.
 *
 * So a call claims one stream, processes exactly one Gmail result page, stores
 * the next page token on BrainSyncCursor, and returns real counts. Repeated
 * calls resume from the stored token; a finished pass restarts on request.
 */

const MESSAGE_EVENT_TYPE = 'email.message';
const THREAD_SOURCE = 'gmail';
const GMAIL_EXTRACTION_VERSION = 1;
const GMAIL_COMMIT_MAX_WAIT_MS = 10_000;
const GMAIL_COMMIT_TIMEOUT_MS = 60_000;
const DEFAULT_YUM_ADDRESS = 'yum@localeffortfood.com';
const THREAD_WINDOW = new Date(0);
const DAY_MS = 86_400_000;
const DEFAULT_RECENT_DAYS = 30;
const RECENT_ARCHIVE_OVERLAP_MS = DAY_MS;
const THREAD_STREAMS = Object.freeze([
  Object.freeze({ stream: 'messages-v3:recent:sent', label: 'sent', lane: 'recent' }),
  Object.freeze({ stream: 'messages-v3:recent:yum', label: 'yum', lane: 'recent' }),
  Object.freeze({ stream: 'messages-v3:archive:sent', label: 'sent', lane: 'archive' }),
  Object.freeze({ stream: 'messages-v3:archive:yum', label: 'yum', lane: 'archive' }),
]);
const THREAD_STREAM_NAMES = Object.freeze(THREAD_STREAMS.map((entry) => entry.stream));
const RECENT_THREAD_STREAM_NAMES = Object.freeze(
  THREAD_STREAMS.filter((entry) => entry.lane === 'recent').map((entry) => entry.stream)
);
const ARCHIVE_THREAD_STREAM_NAMES = Object.freeze(
  THREAD_STREAMS.filter((entry) => entry.lane === 'archive').map((entry) => entry.stream)
);
const GMAIL_HISTORY_STREAM = 'messages-v3:history';
const DEFAULT_THREAD_BATCH = 100;
const MAX_THREAD_BATCH = 250;
const THREAD_READ_CONCURRENCY = 8;
const MESSAGE_WRITE_CONCURRENCY = 4;
const MAX_THREAD_BATCHES = 500;
const DEFAULT_THREAD_TIME_BUDGET_MS = 40 * 1000;
const THREAD_RETRY_DELAY_MS = 15 * 60 * 1000;
const THREAD_STALE_RUNNING_MS = 30 * 60 * 1000;
const MAX_HISTORY_PAGES = 100;
const gmailPushVerifier = new OAuth2Client();

function gmailQueryEpoch(value) {
  return Math.floor(new Date(value).getTime() / 1000);
}

function threadScopeQuery(label, yumAddress = DEFAULT_YUM_ADDRESS) {
  if (label === 'sent') return 'in:sent';
  if (label === 'yum') {
    return `{from:${yumAddress} to:${yumAddress} cc:${yumAddress} bcc:${yumAddress}}`;
  }
  throw new Error(`Unknown Gmail thread stream: ${label}`);
}

function buildThreadQuery(label, {
  lane = 'recent',
  recentDays = DEFAULT_RECENT_DAYS,
  yumAddress = DEFAULT_YUM_ADDRESS,
  cutoffAt = new Date(),
} = {}) {
  const cutoff = new Date(cutoffAt);
  if (Number.isNaN(cutoff.getTime())) throw new Error('Invalid Gmail query cutoff');
  const scope = threadScopeQuery(label, yumAddress);
  if (lane === 'archive') return `${scope} before:${gmailQueryEpoch(cutoff)}`;
  if (lane === 'recent') {
    const days = Math.max(1, Math.min(3650, Number(recentDays) || DEFAULT_RECENT_DAYS));
    const lowerBound = new Date(cutoff.getTime() - days * DAY_MS - RECENT_ARCHIVE_OVERLAP_MS);
    return `${scope} after:${gmailQueryEpoch(lowerBound)}`;
  }
  throw new Error(`Unknown Gmail thread lane: ${lane}`);
}

function threadStreamDefinition(stream) {
  const entry = THREAD_STREAMS.find((candidate) => candidate.stream === stream);
  if (!entry) throw new Error(`Unknown Gmail thread stream: ${stream}`);
  return entry;
}

function threadCursorKey(stream) {
  return {
    source_stream_windowStart_windowEnd: {
      source: THREAD_SOURCE,
      stream,
      windowStart: THREAD_WINDOW,
      windowEnd: THREAD_WINDOW,
    },
  };
}

function buildThreadCursorMetadata(definition, {
  recentDays = DEFAULT_RECENT_DAYS,
  yumAddress = DEFAULT_YUM_ADDRESS,
  cutoffAt = new Date(),
} = {}) {
  const queryCutoffAt = new Date(cutoffAt);
  return {
    label: definition.label,
    lane: definition.lane,
    query: buildThreadQuery(definition.label, {
      lane: definition.lane,
      recentDays,
      yumAddress,
      cutoffAt: queryCutoffAt,
    }),
    queryVersion: 3,
    queryCutoffAt: queryCutoffAt.toISOString(),
    ...(definition.lane === 'recent' ? { recentDays } : {}),
  };
}

async function ensureThreadCursors({
  prisma = getPrisma(),
  recentDays = DEFAULT_RECENT_DAYS,
  yumAddress = DEFAULT_YUM_ADDRESS,
  cutoffAt = new Date(),
} = {}) {
  await Promise.all(THREAD_STREAMS.map((definition) => prisma.brainSyncCursor.upsert({
    where: threadCursorKey(definition.stream),
    // A page token is valid only for the exact query stored in metadata. Never
    // mutate either while a pass is live.
    update: {},
    create: {
      source: THREAD_SOURCE,
      stream: definition.stream,
      windowStart: THREAD_WINDOW,
      windowEnd: THREAD_WINDOW,
      status: 'pending',
      metadata: buildThreadCursorMetadata(definition, {
        recentDays,
        yumAddress,
        cutoffAt,
      }),
    },
  })));
  return THREAD_STREAMS.length;
}

async function recoverStaleRunningThreadCursors(prisma = getPrisma(), now = new Date()) {
  const staleBefore = new Date(now.getTime() - THREAD_STALE_RUNNING_MS);
  return prisma.brainSyncCursor.updateMany({
    where: {
      source: THREAD_SOURCE,
      stream: { in: THREAD_STREAM_NAMES },
      status: 'running',
      OR: [
        { lastObservedAt: { lte: staleBefore } },
        { lastObservedAt: null, updatedAt: { lte: staleBefore } },
      ],
    },
    data: { status: 'error', retryAfter: now },
  });
}

async function nextThreadCursor(prisma = getPrisma(), lane = null) {
  const now = new Date();
  const streams = lane === 'recent'
    ? RECENT_THREAD_STREAM_NAMES
    : lane === 'archive'
      ? ARCHIVE_THREAD_STREAM_NAMES
      : THREAD_STREAM_NAMES;
  return prisma.brainSyncCursor.findFirst({
    where: {
      source: THREAD_SOURCE,
      stream: { in: streams },
      status: { in: ['pending', 'error'] },
      OR: [{ retryAfter: null }, { retryAfter: { lte: now } }],
    },
    orderBy: { stream: 'asc' },
  });
}

/** Start a new immutable current-mail pass; archive streams remain one-time. */
async function resetCompletedRecentCursors({
  prisma = getPrisma(),
  recentDays = DEFAULT_RECENT_DAYS,
  yumAddress = DEFAULT_YUM_ADDRESS,
  cutoffAt = new Date(),
} = {}) {
  const completed = await prisma.brainSyncCursor.findMany({
    where: {
      source: THREAD_SOURCE,
      stream: { in: RECENT_THREAD_STREAM_NAMES },
      status: 'complete',
    },
  });
  await Promise.all(completed.map((row) => {
    const definition = threadStreamDefinition(row.stream);
    return prisma.brainSyncCursor.update({
      where: { id: row.id },
      data: {
        status: 'pending',
        pageToken: null,
        retryAfter: null,
        metadata: {
          ...(row.metadata || {}),
          ...buildThreadCursorMetadata(definition, {
            recentDays,
            yumAddress,
            cutoffAt,
          }),
        },
      },
    });
  }));
  return { count: completed.length };
}

function gmailHistoryCursorKey() {
  return threadCursorKey(GMAIL_HISTORY_STREAM);
}

function gmailPushConfiguration() {
  if (!process.env.GMAIL_PUBSUB_TOPIC) {
    return { configured: false, reason: 'GMAIL_PUBSUB_TOPIC not configured' };
  }
  if (!process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT) {
    return { configured: false, reason: 'GMAIL_PUBSUB_SERVICE_ACCOUNT not configured' };
  }
  return { configured: true, reason: null };
}

async function ensureGmailHistoryCursor(prisma = getPrisma()) {
  const pushConfig = gmailPushConfiguration();
  return prisma.brainSyncCursor.upsert({
    where: gmailHistoryCursorKey(),
    update: {},
    create: {
      source: THREAD_SOURCE,
      stream: GMAIL_HISTORY_STREAM,
      windowStart: THREAD_WINDOW,
      windowEnd: THREAD_WINDOW,
      status: 'complete',
      metadata: {
        mode: pushConfig.configured ? 'push-uninitialized' : 'polling',
        historyId: null,
        watchExpiration: null,
        reason: pushConfig.reason || 'watch not registered',
      },
    },
  });
}

function pushAudience() {
  if (process.env.GMAIL_PUBSUB_AUDIENCE) return process.env.GMAIL_PUBSUB_AUDIENCE;
  const origin = process.env.VITE_PUBLIC_URL || 'https://www.localeffortfood.com';
  return new URL('/api/brain/gmail/push', origin).toString();
}

function requestError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function decodeGmailPushEnvelope(body) {
  const encoded = body?.message?.data;
  if (typeof encoded !== 'string' || !encoded) {
    throw requestError('invalid Pub/Sub envelope', 400);
  }
  let notification;
  try {
    notification = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    throw requestError('invalid Pub/Sub message data', 400);
  }
  if (!notification?.emailAddress || !notification?.historyId) {
    throw requestError('Gmail notification missing emailAddress or historyId', 400);
  }
  return {
    emailAddress: String(notification.emailAddress),
    historyId: String(notification.historyId),
    messageId: body.message.messageId ? String(body.message.messageId) : null,
    publishTime: body.message.publishTime || null,
  };
}

async function verifyGmailPubSubRequest(req, dependencies = {}) {
  const authorization = String(req.headers?.authorization || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw requestError('Pub/Sub bearer token required', 401);
  const audience = pushAudience();
  const verifyIdToken = dependencies.verifyIdToken || (async (idToken, expectedAudience) => {
    const ticket = await gmailPushVerifier.verifyIdToken({
      idToken,
      audience: expectedAudience,
    });
    return ticket.getPayload();
  });

  let payload;
  try {
    payload = await verifyIdToken(match[1], audience);
  } catch {
    throw requestError('invalid Pub/Sub bearer token', 401);
  }
  const audiences = Array.isArray(payload?.aud) ? payload.aud : [payload?.aud];
  if (payload?.aud && !audiences.includes(audience)) {
    throw requestError('invalid Pub/Sub token audience', 401);
  }
  if (payload?.email_verified !== true) {
    throw requestError('Pub/Sub identity is not verified', 403);
  }
  const issuer = payload?.iss;
  if (issuer && issuer !== 'accounts.google.com' && issuer !== 'https://accounts.google.com') {
    throw requestError('invalid Pub/Sub token issuer', 401);
  }
  const expectedEmail = process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT;
  if (!expectedEmail) throw requestError('GMAIL_PUBSUB_SERVICE_ACCOUNT not configured', 503);
  if (payload.email !== expectedEmail) {
    throw requestError('unexpected Pub/Sub service account', 403);
  }
  return {
    audience,
    serviceAccount: payload.email || null,
    subject: payload.sub || null,
  };
}

async function renewGmailWatch({
  topicName = process.env.GMAIL_PUBSUB_TOPIC,
  serviceAccount = process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT,
  prismaClient = null,
  gmailClient = null,
  logger,
} = {}) {
  const prisma = prismaClient || getPrisma();
  const cursor = await ensureGmailHistoryCursor(prisma);
  if (!topicName) {
    const metadata = {
      ...(cursor.metadata || {}),
      mode: 'polling',
      reason: 'GMAIL_PUBSUB_TOPIC not configured',
      watchExpiration: null,
      lastCheckedAt: new Date().toISOString(),
    };
    await prisma.brainSyncCursor.update({
      where: { id: cursor.id },
      data: { status: 'complete', metadata },
    });
    return {
      ok: true,
      configured: false,
      mode: 'polling',
      reason: metadata.reason,
    };
  }
  if (!serviceAccount) {
    throw requestError('GMAIL_PUBSUB_SERVICE_ACCOUNT not configured', 503);
  }

  const gmail = gmailClient || await getAuthorizedGmailClient();
  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: { topicName },
  });
  const watchHistoryId = response.data.historyId ? String(response.data.historyId) : null;
  const expirationMs = Number(response.data.expiration);
  const watchExpiration = Number.isFinite(expirationMs)
    ? new Date(expirationMs).toISOString()
    : null;
  const metadata = {
    ...(cursor.metadata || {}),
    mode: 'push',
    reason: null,
    topicName,
    // Renewal must not skip unprocessed changes. Keep the processing cursor
    // once initialized and store Google's new watch baseline separately.
    historyId: cursor.metadata?.historyId || watchHistoryId,
    watchBaselineHistoryId: watchHistoryId,
    watchExpiration,
    watchRenewedAt: new Date().toISOString(),
  };
  await prisma.brainSyncCursor.update({
    where: { id: cursor.id },
    data: { status: 'complete', retryAfter: null, metadata },
  });
  const result = {
    ok: true,
    configured: true,
    mode: 'push',
    historyId: metadata.historyId,
    watchExpiration,
  };
  logger?.info?.(result, 'brain/gmail: push watch renewed');
  return result;
}

function gmailHistoryExpired(error) {
  return Number(error?.response?.status || error?.code || 0) === 404;
}

function maxGmailHistoryId(left, right) {
  const first = left == null ? '' : String(left);
  const second = right == null ? '' : String(right);
  if (!first) return second;
  if (!second) return first;
  if (!/^\d+$/.test(first) || !/^\d+$/.test(second)) {
    throw requestError('invalid Gmail history id', 400);
  }
  if (first.length !== second.length) return first.length > second.length ? first : second;
  return first >= second ? first : second;
}

async function processClaimedGmailHistoryNotification(notification, {
  batchSize = DEFAULT_THREAD_BATCH,
  maxBatches = 4,
  recentDays = DEFAULT_RECENT_DAYS,
  logger,
  dependencies,
} = {}) {
  const prisma = dependencies?.prisma || getPrisma();
  const authorizeGmail = dependencies?.getAuthorizedGmailClient || getAuthorizedGmailClient;
  const runSync = dependencies?.syncGmailThreads || syncGmailThreads;
  const cursor = dependencies?.historyCursor || await ensureGmailHistoryCursor(prisma);
  const targetHistoryId = String(notification?.historyId || '');
  if (!targetHistoryId) throw requestError('Gmail notification missing historyId', 400);

  const runRecentSync = () => runSync({
    batchSize,
    maxBatches,
    recentDays,
    refreshRecent: true,
    logger,
    ...(dependencies?.syncDependencies
      ? { dependencies: dependencies.syncDependencies }
      : {}),
  });
  const metadata = cursor.metadata || {};
  const startHistoryId = metadata.historyId ? String(metadata.historyId) : null;

  if (!startHistoryId) {
    const sync = await runRecentSync();
    await prisma.brainSyncCursor.update({
      where: { id: cursor.id },
      data: {
        status: 'complete',
        metadata: {
          ...metadata,
          mode: gmailPushConfiguration().configured ? 'push' : 'polling',
          historyId: targetHistoryId,
          lastNotificationAt: new Date().toISOString(),
          lastNotificationMessageId: notification.messageId || null,
          lastHistoryChangeCount: null,
          reason: 'history baseline initialized by recent sync',
        },
      },
    });
    return {
      ok: true,
      mode: 'recent-baseline',
      historyPages: 0,
      historyChanges: null,
      ...sync,
    };
  }

  const gmail = await authorizeGmail();
  let pageToken = null;
  let historyPages = 0;
  let latestHistoryId = maxGmailHistoryId(startHistoryId, targetHistoryId);
  const changedMessageIds = new Set();
  try {
    do {
      if (historyPages >= MAX_HISTORY_PAGES) {
        throw new Error(`Gmail history exceeded ${MAX_HISTORY_PAGES} pages`);
      }
      const page = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
        maxResults: 500,
        ...(pageToken ? { pageToken } : {}),
      });
      historyPages++;
      for (const history of page.data.history || []) {
        for (const added of history.messagesAdded || []) {
          if (added.message?.id) changedMessageIds.add(added.message.id);
        }
      }
      if (page.data.historyId) latestHistoryId = maxGmailHistoryId(latestHistoryId, page.data.historyId);
      pageToken = page.data.nextPageToken || null;
    } while (pageToken);
  } catch (error) {
    if (!gmailHistoryExpired(error)) throw error;

    const sync = await runRecentSync();
    await prisma.brainSyncCursor.update({
      where: { id: cursor.id },
      data: {
        status: 'complete',
        retryAfter: null,
        metadata: {
          ...metadata,
          mode: 'polling-fallback',
          historyId: maxGmailHistoryId(startHistoryId, targetHistoryId),
          historyExpiredAt: new Date().toISOString(),
          lastNotificationAt: new Date().toISOString(),
          lastNotificationMessageId: notification.messageId || null,
          reason: 'Gmail history cursor expired; recent query replayed',
        },
      },
    });
    return {
      ok: true,
      mode: 'polling-fallback',
      historyExpired: true,
      historyPages,
      historyChanges: null,
      ...sync,
    };
  }

  const sync = await runRecentSync();
  await prisma.brainSyncCursor.update({
    where: { id: cursor.id },
    data: {
      status: 'complete',
      retryAfter: null,
      lastObservedAt: new Date(),
      metadata: {
        ...metadata,
        mode: 'push',
        historyId: latestHistoryId,
        lastNotificationAt: new Date().toISOString(),
        lastNotificationMessageId: notification.messageId || null,
        lastHistoryChangeCount: changedMessageIds.size,
        lastHistoryPageCount: historyPages,
        reason: null,
      },
    },
  });
  return {
    ok: true,
    mode: 'push',
    historyPages,
    historyChanges: changedMessageIds.size,
    ...sync,
  };
}

async function processGmailHistoryNotification(notification, options = {}) {
  const dependencies = options.dependencies || {};
  const prisma = dependencies.prisma || getPrisma();
  const cursor = await ensureGmailHistoryCursor(prisma);
  const targetHistoryId = String(notification?.historyId || '');
  if (!targetHistoryId) throw requestError('Gmail notification missing historyId', 400);
  if (!/^\d+$/.test(targetHistoryId)) throw requestError('invalid Gmail history id', 400);
  const now = new Date();
  const claimed = await prisma.brainSyncCursor.updateMany({
    where: {
      id: cursor.id,
      status: { in: ['complete', 'error', 'pending'] },
      OR: [{ retryAfter: null }, { retryAfter: { lte: now } }],
    },
    data: {
      status: 'running',
      lastObservedAt: now,
      retryAfter: null,
    },
  });
  if (claimed.count !== 1) {
    throw requestError('Gmail history processing is already running or awaiting retry', 503);
  }

  try {
    return await processClaimedGmailHistoryNotification(notification, {
      ...options,
      dependencies: { ...dependencies, prisma, historyCursor: cursor },
    });
  } catch (error) {
    try {
      await prisma.brainSyncCursor.update({
        where: { id: cursor.id },
        data: {
          status: 'error',
          errorCount: { increment: 1 },
          retryAfter: new Date(Date.now() + THREAD_RETRY_DELAY_MS),
          metadata: {
            ...(cursor.metadata || {}),
            lastHistoryError: error?.message || String(error),
            lastNotificationAt: new Date().toISOString(),
            lastNotificationMessageId: notification?.messageId || null,
          },
        },
      });
    } catch {
      // Preserve the ingestion failure; Pub/Sub will retry the non-2xx request.
    }
    throw error;
  }
}

async function getGmailWatchStatus(prisma = getPrisma()) {
  const cursor = await prisma.brainSyncCursor.findFirst({
    where: { source: THREAD_SOURCE, stream: GMAIL_HISTORY_STREAM },
  });
  const metadata = cursor?.metadata || {};
  const pushConfig = gmailPushConfiguration();
  const expiration = metadata.watchExpiration ? new Date(metadata.watchExpiration) : null;
  return {
    configured: pushConfig.configured,
    mode: pushConfig.configured ? (metadata.mode || 'push-uninitialized') : 'polling',
    reason: pushConfig.reason || metadata.reason || null,
    historyId: metadata.historyId || null,
    watchExpiration: expiration && !Number.isNaN(expiration.getTime())
      ? expiration.toISOString()
      : null,
    watchExpired: Boolean(expiration && expiration.getTime() <= Date.now()),
    lastNotificationAt: metadata.lastNotificationAt || null,
    lastHistoryChangeCount: metadata.lastHistoryChangeCount ?? null,
  };
}

/**
 * Message ids with both halves of canonical ingestion committed: exact current
 * source bytes and the ledger event whose transaction also creates the inbox
 * item. Intersecting them repairs either half after an interrupted write and
 * backfills source bytes for legacy ledger-only messages.
 */
async function findCompletedMessageIds(messageIds, prisma = getPrisma()) {
  if (!messageIds.length) return new Set();
  const [sourceRows, eventRows] = await Promise.all([
    prisma.brainSourceDocument.findMany({
      where: {
        source: THREAD_SOURCE,
        sourceId: { in: messageIds },
        captureStatus: 'complete',
        extractionVersion: { gte: GMAIL_EXTRACTION_VERSION },
      },
      select: { sourceId: true },
    }),
    prisma.ledgerEvent.findMany({
      where: {
        eventType: MESSAGE_EVENT_TYPE,
        source: THREAD_SOURCE,
        sourceId: { in: messageIds },
        tombstonedAt: null,
      },
      select: { sourceId: true },
    }),
  ]);
  const eventIds = new Set(eventRows.map((row) => row.sourceId));
  return new Set(sourceRows.map((row) => row.sourceId).filter((id) => eventIds.has(id)));
}
async function settleWithConcurrency(items, concurrency, worker) {
  if (!items.length) return [];
  const results = new Array(items.length);
  let nextIndex = 0;
  const run = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = { status: 'fulfilled', value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    () => run()
  );
  await Promise.all(workers);
  return results;
}

/**
 * Discover all message ids for a Gmail search page, dedupe them in one DB
 * query, then fetch unseen raw messages with bounded concurrency. Any failed
 * item leaves the cursor on the same page; successful writes are idempotent.
 */
async function ingestGmailPage(gmail, threadIds, {
  prismaClient = null,
  findCompleted = findCompletedMessageIds,
  ingestMessage = ingestGmailMessage,
  threadConcurrency = THREAD_READ_CONCURRENCY,
  messageConcurrency = MESSAGE_WRITE_CONCURRENCY,
} = {}) {
  const prisma = prismaClient || getPrisma();
  const errors = [];
  const uniqueThreadIds = [...new Set(threadIds.filter(Boolean))];
  const threadResults = await settleWithConcurrency(
    uniqueThreadIds,
    threadConcurrency,
    async (threadId) => {
      const response = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'minimal',
      });
      return {
        threadId,
        messageIds: (response.data.messages || []).map((message) => message.id).filter(Boolean),
      };
    }
  );

  const messageIds = [];
  for (let index = 0; index < threadResults.length; index += 1) {
    const result = threadResults[index];
    if (result.status === 'fulfilled') {
      messageIds.push(...result.value.messageIds);
    } else {
      errors.push({
        stage: 'thread',
        id: uniqueThreadIds[index],
        message: result.reason?.message || String(result.reason),
      });
    }
  }

  const uniqueMessageIds = [...new Set(messageIds)];
  const alreadyCompleted = await findCompleted(uniqueMessageIds, prisma);
  const pendingMessageIds = uniqueMessageIds.filter((id) => !alreadyCompleted.has(id));
  let processed = 0;
  let skipped = uniqueMessageIds.length - pendingMessageIds.length;
  let captureIncomplete = 0;
  let extractionIncomplete = 0;
  let extractionGaps = 0;
  const messageResults = await settleWithConcurrency(
    pendingMessageIds,
    messageConcurrency,
    (messageId) => ingestMessage(gmail, messageId, { prismaClient: prisma })
  );
  for (let index = 0; index < messageResults.length; index += 1) {
    const result = messageResults[index];
    if (result.status === 'fulfilled') {
      if (result.value.status === 'ingested') processed++;
      else skipped++;
      if (result.value.captureStatus !== 'complete') captureIncomplete++;
      if (result.value.extractionStatus !== 'complete') extractionIncomplete++;
      extractionGaps += Number(result.value.extractionGapCount) || 0;
    } else {
      errors.push({
        stage: 'message',
        id: pendingMessageIds[index],
        message: result.reason?.message || String(result.reason),
      });
    }
  }

  return {
    processed,
    skipped,
    errors,
    captureIncomplete,
    extractionIncomplete,
    extractionGaps,
  };
}


async function ingestGmailMessage(gmail, messageId, {
  prismaClient = null,
  parseMessage = parseGmailRawMessage,
  archiveSource = writeSourceDocument,
  writeLedger = writeLedgerEvent,
  createInbox = createInboxItem,
} = {}) {
  const prisma = prismaClient || getPrisma();
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'raw',
  });
  const message = response.data;
  const parsed = await parseMessage(message);
  const threadId = message.threadId || parsed.metadata.gmailThreadId;
  const gmailUrl = `https://mail.google.com/mail/u/0/#all/${threadId || messageId}`;

  const sourceInput = {
    source: THREAD_SOURCE,
    sourceId: messageId,
    parentSourceId: threadId || null,
    sourceUrl: gmailUrl,
    mediaType: 'message/rfc822',
    title: parsed.title,
    headers: parsed.headers,
    textContent: parsed.textContent,
    htmlContent: parsed.htmlContent,
    attachments: parsed.attachments,
    rawContent: parsed.rawContent,
    occurredAt: parsed.occurredAt,
    captureStatus: parsed.captureStatus,
    extractionStatus: parsed.extractionStatus,
    extractionVersion: GMAIL_EXTRACTION_VERSION,
    metadata: {
      ...parsed.metadata,
      extractionGaps: parsed.extractionGaps,
    },
  };

  const from = mailboxText(parsed.metadata.from);
  const to = mailboxText(parsed.metadata.to);
  const inboxContent = [
    `Email message: \"${parsed.title}\"`,
    from ? `From: ${from}` : null,
    to ? `To: ${to}` : null,
    `Gmail message id: ${messageId}`,
    '',
    parsed.textContent || '[Raw message captured; searchable text extraction failed.]',
  ].filter((value) => value !== null).join('\n').trim();

  const commit = async (tx) => {
    const sourceDocument = await archiveSource({ ...sourceInput, prismaClient: tx });
    const sourceChanged = !sourceDocument._existing || sourceDocument._updated === true;
    const event = await writeLedger({
      eventType: MESSAGE_EVENT_TYPE,
      schemaVersion: 2,
      occurredAt: parsed.occurredAt,
      source: THREAD_SOURCE,
      sourceId: messageId,
      actorType: 'system',
      payload: {
        messageId,
        threadId: threadId || null,
        subject: parsed.title,
        from: parsed.metadata.from,
        to: parsed.metadata.to,
        cc: parsed.metadata.cc,
        bcc: parsed.metadata.bcc,
        rfcMessageId: parsed.metadata.rfcMessageId,
        sourceDocumentId: sourceDocument.id,
        sourceUrl: gmailUrl,
        contentHash: sourceDocument.contentHash,
        rawByteLength: sourceDocument.rawByteLength,
        attachmentCount: parsed.attachments.length,
        captureStatus: parsed.captureStatus,
        extractionStatus: parsed.extractionStatus,
        extractionGaps: parsed.extractionGaps,
      },
      updatePayload: true,
      prismaClient: tx,
    });

    let inboxExists = false;
    if (event._existing && sourceChanged) {
      inboxExists = Boolean(await tx.brainInboxItem.findFirst({
        where: {
          source: THREAD_SOURCE,
          triageHint: { path: ['ledgerEventId'], equals: event.id },
        },
        select: { id: true },
      }));
    }
    if (!event._existing || (sourceChanged && !inboxExists)) {
      await createInbox({
        rawContent: inboxContent,
        source: THREAD_SOURCE,
        ledgerEventId: event.id,
        attachments: [
          { url: gmailUrl, mimeType: 'text/html', label: 'Open in Gmail' },
          ...parsed.attachments,
        ],
        prismaClient: tx,
      });
    }
    return { event, sourceDocument, sourceChanged };
  };

  const committed = typeof prisma.$transaction === 'function'
    ? await prisma.$transaction(commit, {
      maxWait: GMAIL_COMMIT_MAX_WAIT_MS,
      timeout: GMAIL_COMMIT_TIMEOUT_MS,
    })
    : await commit(prisma);
  const { event, sourceDocument, sourceChanged } = committed;
  return {
    status: event._existing && !sourceChanged ? 'existing' : 'ingested',
    eventId: event.id,
    sourceDocumentId: sourceDocument.id,
    captureStatus: parsed.captureStatus,
    extractionStatus: parsed.extractionStatus,
    extractionGapCount: Array.isArray(parsed.extractionGaps) ? parsed.extractionGaps.length : 0,
  };
}

async function ingestGmailThread(gmail, threadId, {
  prismaClient = null,
  ingestMessage = ingestGmailMessage,
  findCompleted = findCompletedMessageIds,
} = {}) {
  const prisma = prismaClient || getPrisma();
  // A thread is only an envelope. Revisit it every current-window pass, compare
  // immutable Gmail message ids, and fetch exact bytes only for new replies.
  const threadRes = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'minimal',
  });
  const messageIds = (threadRes.data.messages || []).map((message) => message.id).filter(Boolean);
  if (!messageIds.length) return { status: 'empty', processed: 0, skipped: 0 };

  const alreadyCompleted = await findCompleted(messageIds, prisma);
  let processed = 0;
  let skipped = 0;
  for (const id of messageIds) {
    if (alreadyCompleted.has(id)) {
      skipped++;
      continue;
    }
    const result = await ingestMessage(gmail, id, { prismaClient: prisma });
    if (result.status === 'ingested') processed++;
    else skipped++;
  }

  return {
    status: processed ? 'ingested' : 'existing',
    processed,
    skipped,
  };
}

/** Process one immutable Gmail query page; callers repeat until a lane completes. */
async function runNextThreadBatch({
  batchSize = DEFAULT_THREAD_BATCH,
  lane = null,
  recentDays = DEFAULT_RECENT_DAYS,
  yumAddress = DEFAULT_YUM_ADDRESS,
  cutoffAt = new Date(),
  gmailClient = null,
  cursorsReady = false,
  logger,
  dependencies,
} = {}) {
  const prisma = dependencies?.prisma || getPrisma();
  const authorizeGmail = dependencies?.getAuthorizedGmailClient || getAuthorizedGmailClient;
  const ingestPage = dependencies?.ingestGmailPage
    || ((client, threadIds) => ingestGmailPage(client, threadIds, { prismaClient: prisma }));

  if (!cursorsReady) {
    await ensureThreadCursors({ prisma, recentDays, yumAddress, cutoffAt });
    await recoverStaleRunningThreadCursors(prisma);
  }
  // Authorization happens before claim. A revoked grant is a source-level
  // failure and must not march every cursor into error.
  const gmail = gmailClient || await authorizeGmail();
  const cursor = await nextThreadCursor(prisma, lane);
  if (!cursor) {
    const streamNames = lane === 'recent'
      ? RECENT_THREAD_STREAM_NAMES
      : lane === 'archive'
        ? ARCHIVE_THREAD_STREAM_NAMES
        : THREAD_STREAM_NAMES;
    const backlog = await prisma.brainSyncCursor.findFirst({
      where: {
        source: THREAD_SOURCE,
        stream: { in: streamNames },
        status: { not: 'complete' },
      },
      select: { stream: true, status: true, retryAfter: true },
    });
    return {
      complete: !backlog,
      retryPending: Boolean(backlog),
      blockedStream: backlog?.stream || null,
      processed: 0,
      skipped: 0,
      errors: 0,
      captureIncomplete: 0,
      extractionIncomplete: 0,
      extractionGaps: 0,
    };
  }

  const limit = Math.max(1, Math.min(MAX_THREAD_BATCH, Number(batchSize) || DEFAULT_THREAD_BATCH));
  const definition = threadStreamDefinition(cursor.stream);
  const q = cursor.metadata?.query;
  let claimed = false;
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let captureIncomplete = 0;
  let extractionIncomplete = 0;
  let extractionGaps = 0;

  try {
    const claim = await prisma.brainSyncCursor.updateMany({
      where: { id: cursor.id, status: { in: ['pending', 'error'] } },
      data: { status: 'running', retryAfter: null, lastObservedAt: new Date() },
    });
    if (claim.count !== 1) {
      return {
        complete: false,
        claimed: false,
        processed: 0,
        skipped: 0,
        errors: 0,
        captureIncomplete: 0,
        extractionIncomplete: 0,
        extractionGaps: 0,
      };
    }
    claimed = true;
    if (
      typeof q !== 'string'
      || !q
      || cursor.metadata?.queryVersion !== 3
      || cursor.metadata?.lane !== definition.lane
    ) {
      throw new Error(`Gmail cursor ${cursor.stream} has no valid immutable query`);
    }

    const page = await gmail.users.threads.list({
      userId: 'me',
      q,
      maxResults: limit,
      ...(cursor.pageToken ? { pageToken: cursor.pageToken } : {}),
    });
    const threadIds = (page.data.threads || []).map((stub) => stub.id);
    const pageResult = await ingestPage(gmail, threadIds);
    processed = pageResult.processed || 0;
    skipped = pageResult.skipped || 0;
    errors = Array.isArray(pageResult.errors)
      ? pageResult.errors.length
      : Number(pageResult.errors) || 0;
    captureIncomplete = Number(pageResult.captureIncomplete) || 0;
    extractionIncomplete = Number(pageResult.extractionIncomplete) || 0;
    extractionGaps = Number(pageResult.extractionGaps) || 0;
    for (const failure of Array.isArray(pageResult.errors) ? pageResult.errors : []) {
      logger?.warn?.({ failure }, 'brain/gmail: page item ingest failed');
    }

    const pageToken = page.data.nextPageToken || null;
    const batchMetadata = {
      ...(cursor.metadata || {}),
      deferredPage: errors > 0,
      successfulOnDeferredPage: errors > 0 ? processed + skipped : 0,
      lastBatchSize: threadIds.length,
      lastErrorCount: errors,
      lastCaptureIncomplete: captureIncomplete,
      lastExtractionIncomplete: extractionIncomplete,
      lastExtractionGapCount: extractionGaps,
    };
    if (errors > 0) {
      const retryAfter = new Date(Date.now() + THREAD_RETRY_DELAY_MS);
      await prisma.brainSyncCursor.update({
        where: { id: cursor.id },
        data: {
          // Keep the original pageToken and immutable metadata.query. Captured
          // messages are idempotent, so replay is safer than skipping failures.
          status: 'error',
          retryAfter,
          errorCount: { increment: errors },
          lastObservedAt: new Date(),
          metadata: batchMetadata,
        },
      });
      const deferred = {
        complete: false,
        cursorId: cursor.id,
        stream: cursor.stream,
        lane: definition.lane,
        streamComplete: false,
        pageDeferred: true,
        retryAfter,
        processed,
        skipped,
        errors,
        captureIncomplete,
        extractionIncomplete,
        extractionGaps,
      };
      logger?.warn?.(deferred, 'brain/gmail: thread page deferred for lossless retry');
      return deferred;
    }

    await prisma.brainSyncCursor.update({
      where: { id: cursor.id },
      data: {
        pageToken,
        status: pageToken ? 'pending' : 'complete',
        processedCount: { increment: processed + skipped },
        lastObservedAt: new Date(),
        metadata: batchMetadata,
      },
    });

    const result = {
      complete: false,
      cursorId: cursor.id,
      stream: cursor.stream,
      lane: definition.lane,
      streamComplete: !pageToken,
      processed,
      skipped,
      errors,
      captureIncomplete,
      extractionIncomplete,
      extractionGaps,
    };
    logger?.info?.(result, 'brain/gmail: bounded thread batch complete');
    return result;
  } catch (error) {
    if (claimed) {
      await prisma.brainSyncCursor.update({
        where: { id: cursor.id },
        data: {
          status: 'error',
          errorCount: { increment: 1 },
          retryAfter: new Date(Date.now() + THREAD_RETRY_DELAY_MS),
          lastObservedAt: new Date(),
          metadata: {
            ...(cursor.metadata || {}),
            lastError: error?.message || String(error),
          },
        },
      });
    }
    throw error;
  }
}

/**
 * Prioritize a fresh, repeating current-mail pass while reserving bounded
 * progress for the one-time full archive. Both lanes store the exact Gmail
 * query that minted each page token.
 */
async function syncGmailThreads({
  batchSize = DEFAULT_THREAD_BATCH,
  maxBatches = 1,
  timeBudgetMs = DEFAULT_THREAD_TIME_BUDGET_MS,
  refreshRecent = false,
  recentDays = DEFAULT_RECENT_DAYS,
  yumAddress = DEFAULT_YUM_ADDRESS,
  cutoffAt = new Date(),
  logger,
  dependencies,
} = {}) {
  const prisma = dependencies?.prisma || getPrisma();
  const runBatch = dependencies?.runNextThreadBatch || runNextThreadBatch;
  const authorizeGmail = dependencies?.getAuthorizedGmailClient || getAuthorizedGmailClient;
  const ceiling = Math.max(1, Math.min(MAX_THREAD_BATCHES, Number(maxBatches) || 1));
  const budgetMs = Number.isFinite(timeBudgetMs) ? Math.max(0, Number(timeBudgetMs)) : Infinity;

  await ensureThreadCursors({ prisma, recentDays, yumAddress, cutoffAt });
  await recoverStaleRunningThreadCursors(prisma);
  if (refreshRecent) {
    await resetCompletedRecentCursors({
      prisma,
      recentDays,
      yumAddress,
      cutoffAt,
    });
  }
  const gmailClient = runBatch === runNextThreadBatch ? await authorizeGmail() : null;
  const startedAt = Date.now();
  const totals = {
    processed: 0,
    skipped: 0,
    errors: 0,
    captureIncomplete: 0,
    extractionIncomplete: 0,
    extractionGaps: 0,
  };
  const laneBatches = { recent: 0, archive: 0 };
  const laneComplete = { recent: false, archive: false };
  let batches = 0;
  let stoppedBy = 'batchCeiling';
  let deferred = false;
  let contended = false;
  let timeExpired = false;

  const runLaneBatch = async (lane) => {
    const batch = await runBatch({
      batchSize,
      lane,
      recentDays,
      yumAddress,
      cutoffAt,
      gmailClient,
      cursorsReady: true,
      logger,
      dependencies,
    });
    batches++;
    laneBatches[lane]++;
    totals.processed += batch.processed || 0;
    totals.skipped += batch.skipped || 0;
    totals.errors += batch.errors || 0;
    totals.captureIncomplete += batch.captureIncomplete || 0;
    totals.extractionIncomplete += batch.extractionIncomplete || 0;
    totals.extractionGaps += batch.extractionGaps || 0;
    if (batch.complete) laneComplete[lane] = true;
    if (batch.pageDeferred || batch.retryPending) deferred = true;
    if (batch.claimed === false) contended = true;
    return batch;
  };

  // With two or more batches, reserve at least one for archive progress. A
  // one-batch invocation is intentionally freshness-first.
  const recentCeiling = ceiling === 1 ? 1 : ceiling - 1;
  while (laneBatches.recent < recentCeiling && batches < ceiling) {
    if (batches > 0 && Date.now() - startedAt >= budgetMs) {
      timeExpired = true;
      break;
    }
    const batch = await runLaneBatch('recent');
    if (batch.complete || batch.pageDeferred || batch.retryPending || batch.claimed === false) break;
  }

  while (!timeExpired && !deferred && !contended && batches < ceiling) {
    if (batches > 0 && Date.now() - startedAt >= budgetMs) {
      timeExpired = true;
      break;
    }
    const batch = await runLaneBatch('archive');
    if (batch.complete || batch.pageDeferred || batch.retryPending || batch.claimed === false) break;
  }

  const complete = laneComplete.recent && laneComplete.archive;
  if (complete) stoppedBy = 'complete';
  else if (timeExpired) stoppedBy = 'timeBudget';
  else if (deferred) stoppedBy = 'pageDeferred';
  else if (contended) stoppedBy = 'claimContended';

  const result = {
    complete,
    stoppedBy,
    batches,
    laneBatches,
    laneComplete,
    ...totals,
    itemsProcessed: totals.processed + totals.skipped,
    itemsWritten: totals.processed,
    errorCount: totals.errors,
    elapsedMs: Date.now() - startedAt,
  };
  logger?.info?.(result, 'brain/gmail: thread sync pass finished');
  return result;
}

function summarizeThreadLane(cursors, lane) {
  const rows = cursors.filter((row) => row.metadata?.lane === lane);
  return {
    streams: rows.length,
    completeStreams: rows.filter((row) => row.status === 'complete').length,
    pendingStreams: rows.filter((row) => row.status !== 'complete').length,
    errorStreams: rows.filter((row) => row.status === 'error').length,
    processed: rows.reduce((sum, row) => sum + Number(row.processedCount || 0), 0),
    errors: rows.reduce((sum, row) => sum + Number(row.errorCount || 0), 0),
  };
}

async function getThreadSyncStatus(prisma = getPrisma()) {
  const [cursors, watch] = await Promise.all([
    prisma.brainSyncCursor.findMany({
      where: { source: THREAD_SOURCE, stream: { in: THREAD_STREAM_NAMES } },
      orderBy: { stream: 'asc' },
    }),
    getGmailWatchStatus(prisma),
  ]);
  const streams = cursors.map((row) => ({
    stream: row.stream,
    lane: row.metadata?.lane || null,
    status: row.status,
    processed: row.processedCount,
    errors: row.errorCount,
    pending: row.status !== 'complete',
    hasPageToken: Boolean(row.pageToken),
    query: row.metadata?.query || null,
    queryCutoffAt: row.metadata?.queryCutoffAt || null,
    lastObservedAt: row.lastObservedAt,
    lastCaptureIncomplete: row.metadata?.lastCaptureIncomplete || 0,
    lastExtractionIncomplete: row.metadata?.lastExtractionIncomplete || 0,
    lastExtractionGapCount: row.metadata?.lastExtractionGapCount || 0,
  }));
  const lanes = {
    recent: summarizeThreadLane(cursors, 'recent'),
    archive: summarizeThreadLane(cursors, 'archive'),
  };
  return {
    source: THREAD_SOURCE,
    mode: watch.mode,
    watch,
    backlog: {
      recentPending: lanes.recent.pendingStreams,
      archivePending: lanes.archive.pendingStreams,
      failedStreams: lanes.recent.errorStreams + lanes.archive.errorStreams,
    },
    lanes,
    streams,
  };
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  storeGmailTokens,
  loadGmailTokens,
  getAuthorizedGoogleOAuthClient,
  ensureThreadCursors,
  runNextThreadBatch,
  syncGmailThreads,
  getThreadSyncStatus,
  renewGmailWatch,
  processGmailHistoryNotification,
  verifyGmailPubSubRequest,
  decodeGmailPushEnvelope,
  getGmailWatchStatus,
  verifyOAuthState,
  getAuthorizedGmailClient,
  getGmailAuthHealth,
  // Exported for focused reliability tests; not an API surface.
  ingestGmailMessage,
  ingestGmailThread,
  ingestGmailPage,
  findCompletedMessageIds,
  nextThreadCursor,
  recoverStaleRunningThreadCursors,
  resetCompletedRecentCursors,
  buildThreadQuery,
};
