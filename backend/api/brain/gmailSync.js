/**
 * Gmail → Brain ingestion.
 *
 * Syncs recent Gmail threads from the founder's account into BrainInboxItems.
 * Filters to threads with vendor/customer keywords to reduce noise.
 *
 * Setup required (one-time):
 *   1. Enable Gmail API in Google Cloud Console (same project as Google Calendar)
 *   2. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET to .env
 *   3. GET /api/brain/gmail/auth  → redirect to Google OAuth
 *   4. Google redirects to /api/brain/gmail/callback → stores refresh token in BrainApiToken
 *   5. Sync runs via POST /api/brain/gmail/sync (cron or manual)
 *
 * The existing GoogleCalendarToken model pattern is reused here via BrainApiToken
 * with label: "gmail-sync" and scopes: ["gmail:readonly"].
 */

const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent, createInboxItem } = require('./ledger');
const { OAuth2Client } = require('google-auth-library');
const { gmail: createGmailClient } = require('@googleapis/gmail');

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const GMAIL_TOKEN_LABEL = 'gmail-sync';

// ── OAuth helpers ────────────────────────────────────────────────────────────

function getOAuthClient() {
  return new OAuth2Client(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || `${process.env.VITE_PUBLIC_URL || 'https://localeffortfood.com'}/api/brain/gmail/callback`
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
  return process.env.GMAIL_OAUTH_STATE_SECRET ||
    process.env.BRAIN_ADMIN_KEY ||
    process.env.GMAIL_CLIENT_SECRET ||
    '';
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

async function storeGmailTokens(tokens) {
  const prisma = getPrisma();
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

async function loadGmailTokens() {
  const prisma = getPrisma();
  // Canonical row first, then any legacy row that still holds data, then the
  // local file. Legacy rows predate tokenRowKey and have no usable ordering.
  const row =
    (await prisma.brainApiToken.findUnique({ where: { tokenHash: tokenRowKey() } }))
    || (await prisma.brainApiToken.findFirst({
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

/** Build an authenticated, read-only Gmail client for bounded specialist syncs. */
async function getAuthorizedGmailClient() {
  const tokens = await loadGmailTokens();
  if (!tokens) {
    throw new Error('Gmail not authorized — visit /api/brain/gmail/auth to connect');
  }
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
  // Persist every refresh, not just ones carrying a refresh_token. Refreshed
  // access tokens were previously discarded, so each run re-refreshed from a
  // grant that had already lapsed.
  oauth2Client.on('tokens', (newTokens) => {
    storeGmailTokens(newTokens).catch(() => {});
  });
  return createGmailClient({ version: 'v1', auth: oauth2Client });
}

/**
 * Non-throwing auth probe for health checks and CLI diagnostics.
 * Returns { ok, reason, detail, expiresAt, testingModeGrant }.
 */
async function getGmailAuthHealth() {
  let tokens;
  try {
    tokens = await loadGmailTokens();
  } catch (err) {
    return { ok: false, reason: 'load-failed', detail: err.message };
  }
  if (!tokens) return { ok: false, reason: 'not-connected', detail: 'No stored Gmail tokens' };
  if (!tokens.refresh_token) {
    return { ok: false, reason: 'no-refresh-token', detail: 'Stored grant cannot refresh; reconnect required' };
  }

  // A 7-day refresh window means the Google Cloud OAuth client is still in
  // "Testing" publishing status, which expires refresh tokens weekly.
  const testingModeGrant = Number(tokens.refresh_token_expires_in) > 0
    && Number(tokens.refresh_token_expires_in) <= 8 * 86400;

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
  try {
    const { token } = await oauth2Client.getAccessToken();
    if (!token) throw new Error('No access token returned');
    const creds = oauth2Client.credentials || {};
    if (creds.access_token) await storeGmailTokens(creds);
    return {
      ok: true,
      reason: 'connected',
      expiresAt: creds.expiry_date ? new Date(creds.expiry_date).toISOString() : null,
      testingModeGrant,
    };
  } catch (err) {
    const invalid = /invalid_grant/i.test(err.message || '');
    return {
      ok: false,
      reason: invalid ? 'grant-expired' : 'refresh-failed',
      detail: err.message,
      testingModeGrant,
    };
  }
}

// ── Sync logic ───────────────────────────────────────────────────────────────

/**
 * Paginate through all results of a Gmail threads.list query.
 * Returns an array of { id, snippet } thread stubs.
 */
async function listAllThreads(gmail, q, maxResults = 5000) {
  const threads = [];
  let pageToken;
  do {
    const res = await gmail.users.threads.list({
      userId: 'me',
      q,
      maxResults: Math.min(500, maxResults - threads.length),
      ...(pageToken ? { pageToken } : {}),
    });
    const page = res.data.threads || [];
    threads.push(...page);
    pageToken = res.data.nextPageToken;
  } while (pageToken && threads.length < maxResults);
  return threads;
}

/**
 * Collect all unique participant addresses across all messages in a thread.
 */
function collectParticipants(messages) {
  const seen = new Set();
  const FIELDS = ['from', 'to', 'cc', 'bcc'];
  for (const msg of messages) {
    for (const h of (msg.payload?.headers || [])) {
      if (FIELDS.includes(h.name.toLowerCase())) {
        // Each header value may contain multiple comma-separated addresses
        for (const addr of h.value.split(',')) {
          const trimmed = addr.trim();
          if (trimmed) seen.add(trimmed);
        }
      }
    }
  }
  return [...seen];
}

/**
 * Full historical Gmail sync.
 *
 * Runs two queries and unions their results by threadId:
 *   1. in:sent after:<2yr ago>           — everything the founder sent
 *   2. yum@localeffortfood.com           — any thread involving the yum@ address
 *
 * Threads are indexed at the thread level (one ledger event per thread).
 * Each thread gets metadata from the first message plus all participants
 * aggregated across every message in the thread.
 *
 * @param {object} options
 * @param {number} options.daysBack       - how far back for sent query (default 730 = 2yr)
 * @param {number} options.maxPerQuery    - max threads per query (default 5000)
 * @param {string} options.yumAddress     - the yum@ address to search (default yum@localeffortfood.com)
 * @param {object} options.logger
 * @returns {{ processed, skipped, errors, queryCounts }}
 */
async function syncGmailThreads({ daysBack = 730, maxPerQuery = 5000, yumAddress = 'yum@localeffortfood.com', logger } = {}) {
  const tokens = await loadGmailTokens();
  if (!tokens) {
    throw new Error('Gmail not authorized — visit /api/brain/gmail/auth to connect');
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);

  oauth2Client.on('tokens', (newTokens) => {
    storeGmailTokens(newTokens).catch(() => {});
  });

  const gmail = createGmailClient({ version: 'v1', auth: oauth2Client });
  const prisma = getPrisma();

  // Build after: date string for Gmail query (YYYY/MM/DD)
  const after = new Date(Date.now() - daysBack * 86400000);
  const afterStr = `${after.getFullYear()}/${String(after.getMonth() + 1).padStart(2, '0')}/${String(after.getDate()).padStart(2, '0')}`;

  const queries = [
    { label: 'sent', q: `in:sent after:${afterStr}` },
    { label: 'yum', q: yumAddress },
  ];

  // Collect all thread IDs from both queries, dedup
  const threadIdSet = new Set();
  const queryCounts = {};
  for (const { label, q } of queries) {
    logger?.info({ q }, `brain/gmail: listing threads for query "${label}"`);
    const stubs = await listAllThreads(gmail, q, maxPerQuery);
    queryCounts[label] = stubs.length;
    for (const t of stubs) threadIdSet.add(t.id);
  }

  const allThreadIds = [...threadIdSet];
  logger?.info({ total: allThreadIds.length, ...queryCounts }, 'brain/gmail: thread union complete');

  // Batch idempotency check — one query instead of N round-trips
  const alreadyIngested = new Set(
    (await prisma.ledgerEvent.findMany({
      where: { source: 'gmail', sourceId: { in: allThreadIds } },
      select: { sourceId: true },
    })).map(r => r.sourceId)
  );
  const newThreadIds = allThreadIds.filter(id => !alreadyIngested.has(id));
  logger?.info({ total: allThreadIds.length, alreadyIngested: alreadyIngested.size, toProcess: newThreadIds.length }, 'brain/gmail: idempotency check complete');

  let processed = 0, skipped = alreadyIngested.size, errors = 0;

  for (const threadId of newThreadIds) {
    try {
      const threadRes = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'To', 'Cc', 'Bcc', 'Date'],
      });

      const messages = threadRes.data.messages || [];
      if (!messages.length) { skipped++; continue; }

      const firstMsg = messages[0];
      const headers = Object.fromEntries(
        (firstMsg.payload?.headers || []).map(h => [h.name.toLowerCase(), h.value])
      );

      const subject = headers['subject'] || '(no subject)';
      const from = headers['from'] || '';
      const to = headers['to'] || '';
      const date = headers['date'] || '';
      const messageCount = messages.length;
      const participants = collectParticipants(messages);

      const occurredAt = date ? new Date(date) : new Date();

      await writeLedgerEvent({
        eventType: 'email.thread',
        occurredAt,
        source: 'gmail',
        sourceId: threadId,
        actorType: 'system',
        payload: {
          threadId,
          subject,
          from,
          to,
          messageCount,
          participants,
          snippet: threadRes.data.snippet || '',
        },
      });

      await createInboxItem({
        rawContent: `Email thread: "${subject}"\nFrom: ${from}\nTo: ${to}\nMessages: ${messageCount}\nSnippet: ${threadRes.data.snippet || ''}`.trim(),
        source: 'gmail',
        attachments: [{
          url: `https://mail.google.com/mail/u/0/#all/${threadId}`,
          mimeType: 'text/html',
          label: 'Open in Gmail',
        }],
      });

      processed++;
    } catch (err) {
      errors++;
      logger?.warn({ err, threadId }, 'brain/gmail: thread error');
    }
  }

  return { processed, skipped, errors, queryCounts };
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  storeGmailTokens,
  loadGmailTokens,
  syncGmailThreads,
  verifyOAuthState,
  getAuthorizedGmailClient,
  getGmailAuthHealth,
};
