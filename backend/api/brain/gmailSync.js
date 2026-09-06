/**
 * Gmail → Brain ingestion.
 *
 * Ingests Gmail threads from the founder's sent mail and the shared yum@
 * mailbox into LedgerEvents plus one triage BrainInboxItem per new thread.
 *
 * Setup required (one-time):
 *   1. Enable Gmail API in Google Cloud Console (same project as Google Calendar)
 *   2. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET to .env
 *   3. GET /api/brain/gmail/auth  → redirect to Google OAuth
 *   4. Google redirects to /api/brain/gmail/callback → stores refresh token in BrainApiToken
 *   5. Sync runs via POST /api/brain/gmail/sync or `node scripts/gmail.cjs sync`.
 *      Each call drains bounded pages; repeat until it reports complete.
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

const THREAD_EVENT_TYPE = 'email.thread';
const THREAD_SOURCE = 'gmail';
const DEFAULT_YUM_ADDRESS = 'yum@localeffortfood.com';
// Streams are query-shaped, not time-windowed. The cursor table keys on
// (source, stream, windowStart, windowEnd), so both rows pin their window to
// the epoch and carry identity in the stream name.
const THREAD_WINDOW = new Date(0);
const THREAD_STREAMS = Object.freeze([
  Object.freeze({ stream: 'threads-v1:sent', label: 'sent' }),
  Object.freeze({ stream: 'threads-v1:yum', label: 'yum' }),
]);
const THREAD_STREAM_NAMES = Object.freeze(THREAD_STREAMS.map((entry) => entry.stream));
const DEFAULT_THREAD_BATCH = 100;
const MAX_THREAD_BATCH = 250;
const MAX_THREAD_BATCHES = 500;
const DEFAULT_THREAD_TIME_BUDGET_MS = 40 * 1000;
const THREAD_RETRY_DELAY_MS = 15 * 60 * 1000;
const THREAD_STALE_RUNNING_MS = 30 * 60 * 1000;

function gmailQueryDate(value) {
  const date = new Date(value);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

function buildThreadQuery(label, { daysBack = 730, yumAddress = DEFAULT_YUM_ADDRESS } = {}) {
  if (label === 'sent') return `in:sent after:${gmailQueryDate(Date.now() - daysBack * 86400000)}`;
  if (label === 'yum') return yumAddress;
  throw new Error(`Unknown Gmail thread stream: ${label}`);
}

function threadStreamLabel(stream) {
  const entry = THREAD_STREAMS.find((candidate) => candidate.stream === stream);
  if (!entry) throw new Error(`Unknown Gmail thread stream: ${stream}`);
  return entry.label;
}

async function ensureThreadCursors({
  prisma = getPrisma(),
  daysBack = 730,
  yumAddress = DEFAULT_YUM_ADDRESS,
} = {}) {
  for (const { stream, label } of THREAD_STREAMS) {
    await prisma.brainSyncCursor.upsert({
      where: {
        source_stream_windowStart_windowEnd: {
          source: THREAD_SOURCE,
          stream,
          windowStart: THREAD_WINDOW,
          windowEnd: THREAD_WINDOW,
        },
      },
      // Never clobber a live page token just because a caller re-entered.
      update: {},
      create: {
        source: THREAD_SOURCE,
        stream,
        windowStart: THREAD_WINDOW,
        windowEnd: THREAD_WINDOW,
        metadata: { label, query: buildThreadQuery(label, { daysBack, yumAddress }), queryVersion: 1 },
      },
    });
  }
  return THREAD_STREAMS.length;
}

async function recoverStaleRunningThreadCursors(prisma = getPrisma(), now = new Date()) {
  const staleBefore = new Date(now.getTime() - THREAD_STALE_RUNNING_MS);
  // A killed invocation leaves its claim behind. Recover only stale claims; a
  // page another invocation is still working must never be selected twice.
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

async function nextThreadCursor(prisma = getPrisma()) {
  const now = new Date();
  return prisma.brainSyncCursor.findFirst({
    where: {
      source: THREAD_SOURCE,
      stream: { in: THREAD_STREAM_NAMES },
      status: { in: ['pending', 'error'] },
      OR: [{ retryAfter: null }, { retryAfter: { lte: now } }],
    },
    orderBy: { stream: 'asc' },
  });
}

/** Begin a fresh pass over streams whose previous pass ran to completion. */
async function resetCompletedThreadCursors(prisma = getPrisma()) {
  return prisma.brainSyncCursor.updateMany({
    where: { source: THREAD_SOURCE, stream: { in: THREAD_STREAM_NAMES }, status: 'complete' },
    data: { status: 'pending', pageToken: null, retryAfter: null },
  });
}

/** Thread ids already ingested, using the same predicate writeLedgerEvent dedupes on. */
async function findIngestedThreadIds(threadIds, prisma = getPrisma()) {
  if (!threadIds.length) return new Set();
  const rows = await prisma.ledgerEvent.findMany({
    where: {
      eventType: THREAD_EVENT_TYPE,
      source: THREAD_SOURCE,
      sourceId: { in: threadIds },
      tombstonedAt: null,
    },
    select: { sourceId: true },
  });
  return new Set(rows.map((row) => row.sourceId));
}

async function ingestGmailThread(gmail, threadId) {
  const threadRes = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'metadata',
    metadataHeaders: ['Subject', 'From', 'To', 'Cc', 'Bcc', 'Date'],
  });

  const messages = threadRes.data.messages || [];
  if (!messages.length) return { status: 'empty' };

  const headers = Object.fromEntries(
    (messages[0].payload?.headers || []).map((h) => [h.name.toLowerCase(), h.value])
  );
  const subject = headers['subject'] || '(no subject)';
  const from = headers['from'] || '';
  const to = headers['to'] || '';
  const date = headers['date'] || '';
  // A malformed Date header must not fail the page; the ledger keeps arrival order.
  const parsed = date ? new Date(date) : null;
  const occurredAt = parsed && !Number.isNaN(parsed.valueOf()) ? parsed : new Date();
  const snippet = threadRes.data.snippet || '';

  const event = await writeLedgerEvent({
    eventType: THREAD_EVENT_TYPE,
    occurredAt,
    source: THREAD_SOURCE,
    sourceId: threadId,
    actorType: 'system',
    payload: {
      threadId,
      subject,
      from,
      to,
      messageCount: messages.length,
      participants: collectParticipants(messages),
      snippet,
    },
  });

  // A replayed page must not mint a second triage item for the same thread.
  if (event._existing) return { status: 'existing', eventId: event.id };

  await createInboxItem({
    rawContent: `Email thread: "${subject}"\nFrom: ${from}\nTo: ${to}\nMessages: ${messages.length}\nSnippet: ${snippet}`.trim(),
    source: THREAD_SOURCE,
    ledgerEventId: event.id,
    attachments: [{
      url: `https://mail.google.com/mail/u/0/#all/${threadId}`,
      mimeType: 'text/html',
      label: 'Open in Gmail',
    }],
  });

  return { status: 'ingested', eventId: event.id };
}

/** Process one Gmail thread page; callers repeat until the pass reports complete. */
async function runNextThreadBatch({
  batchSize = DEFAULT_THREAD_BATCH,
  daysBack = 730,
  yumAddress = DEFAULT_YUM_ADDRESS,
  logger,
  dependencies,
} = {}) {
  // Dependency injection is intentionally private to deterministic reliability
  // tests. Production callers omit it and use the real Prisma/Gmail/ledger path.
  const prisma = dependencies?.prisma || getPrisma();
  const authorizeGmail = dependencies?.getAuthorizedGmailClient || getAuthorizedGmailClient;
  const ingestThread = dependencies?.ingestGmailThread || ingestGmailThread;
  const findIngested = dependencies?.findIngestedThreadIds || findIngestedThreadIds;

  await ensureThreadCursors({ prisma, daysBack, yumAddress });
  await recoverStaleRunningThreadCursors(prisma);
  // Authorize before selecting or claiming a stream. A revoked token is a
  // source-level problem and must not march every cursor into error.
  const gmail = await authorizeGmail();
  const cursor = await nextThreadCursor(prisma);
  if (!cursor) return { complete: true, processed: 0, skipped: 0, errors: 0 };

  const limit = Math.max(1, Math.min(MAX_THREAD_BATCH, Number(batchSize) || DEFAULT_THREAD_BATCH));
  const label = threadStreamLabel(cursor.stream);
  const q = buildThreadQuery(label, { daysBack, yumAddress });
  let processed = 0, skipped = 0, errors = 0;

  try {
    const claim = await prisma.brainSyncCursor.updateMany({
      where: { id: cursor.id, status: { in: ['pending', 'error'] } },
      data: { status: 'running', retryAfter: null, lastObservedAt: new Date() },
    });
    if (claim.count !== 1) {
      return { complete: false, claimed: false, processed: 0, skipped: 0, errors: 0 };
    }

    const page = await gmail.users.threads.list({
      userId: 'me',
      q,
      maxResults: limit,
      ...(cursor.pageToken ? { pageToken: cursor.pageToken } : {}),
    });
    const threadIds = (page.data.threads || []).map((stub) => stub.id);
    // One lookup decides the whole page, so re-listed history costs no Gmail reads.
    const alreadyIngested = await findIngested(threadIds, prisma);

    for (const threadId of threadIds) {
      if (alreadyIngested.has(threadId)) { skipped++; continue; }
      try {
        const result = await ingestThread(gmail, threadId);
        if (result.status === 'ingested') processed++; else skipped++;
      } catch (err) {
        errors++;
        logger?.warn?.({ err, threadId }, 'brain/gmail: thread ingest failed');
      }
    }

    const pageToken = page.data.nextPageToken || null;
    if (errors > 0) {
      const retryAfter = new Date(Date.now() + THREAD_RETRY_DELAY_MS);
      await prisma.brainSyncCursor.update({
        where: { id: cursor.id },
        data: {
          // Keep the original pageToken. Ingested threads are idempotent, so
          // replaying the page is safer than skipping failures forever.
          status: 'error',
          retryAfter,
          errorCount: { increment: errors },
          lastObservedAt: new Date(),
          metadata: {
            ...(cursor.metadata || {}),
            label,
            query: q,
            deferredPage: true,
            successfulOnDeferredPage: processed + skipped,
            lastBatchSize: threadIds.length,
            lastErrorCount: errors,
          },
        },
      });
      const deferred = {
        complete: false,
        cursorId: cursor.id,
        stream: cursor.stream,
        streamComplete: false,
        pageDeferred: true,
        retryAfter,
        processed,
        skipped,
        errors,
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
        errorCount: { increment: errors },
        lastObservedAt: new Date(),
        metadata: {
          ...(cursor.metadata || {}),
          label,
          query: q,
          deferredPage: false,
          successfulOnDeferredPage: 0,
          lastBatchSize: threadIds.length,
          lastErrorCount: 0,
        },
      },
    });

    const result = {
      complete: false,
      cursorId: cursor.id,
      stream: cursor.stream,
      streamComplete: !pageToken,
      processed,
      skipped,
      errors,
    };
    logger?.info?.(result, 'brain/gmail: bounded thread batch complete');
    return result;
  } catch (err) {
    await prisma.brainSyncCursor.update({
      where: { id: cursor.id },
      data: {
        status: 'error',
        errorCount: { increment: 1 },
        retryAfter: new Date(Date.now() + THREAD_RETRY_DELAY_MS),
        lastObservedAt: new Date(),
      },
    });
    throw err;
  }
}

/**
 * Run bounded batches until the pass completes, the batch ceiling is reached,
 * or the time budget expires. Always returns before the caller's own deadline,
 * so an unfinished backfill is reported instead of silently truncated.
 */
async function syncGmailThreads({
  batchSize = DEFAULT_THREAD_BATCH,
  maxBatches = 1,
  timeBudgetMs = DEFAULT_THREAD_TIME_BUDGET_MS,
  restart = false,
  daysBack = 730,
  yumAddress = DEFAULT_YUM_ADDRESS,
  logger,
  dependencies,
} = {}) {
  const prisma = dependencies?.prisma || getPrisma();
  const runBatch = dependencies?.runNextThreadBatch || runNextThreadBatch;
  const ceiling = Math.max(1, Math.min(MAX_THREAD_BATCHES, Number(maxBatches) || 1));
  const budgetMs = Number.isFinite(timeBudgetMs) ? Math.max(0, Number(timeBudgetMs)) : Infinity;

  if (restart) {
    await ensureThreadCursors({ prisma, daysBack, yumAddress });
    await resetCompletedThreadCursors(prisma);
  }

  const startedAt = Date.now();
  const totals = { processed: 0, skipped: 0, errors: 0 };
  let batches = 0;
  let complete = false;
  let stoppedBy = 'batchCeiling';

  for (let index = 0; index < ceiling; index += 1) {
    if (index > 0 && Date.now() - startedAt >= budgetMs) { stoppedBy = 'timeBudget'; break; }
    const batch = await runBatch({ batchSize, daysBack, yumAddress, logger, dependencies });
    batches++;
    totals.processed += batch.processed || 0;
    totals.skipped += batch.skipped || 0;
    totals.errors += batch.errors || 0;
    if (batch.complete) { complete = true; stoppedBy = 'complete'; break; }
    if (batch.pageDeferred) { stoppedBy = 'pageDeferred'; break; }
    if (batch.claimed === false) { stoppedBy = 'claimContended'; break; }
  }

  const result = { complete, stoppedBy, batches, ...totals, elapsedMs: Date.now() - startedAt };
  logger?.info?.(result, 'brain/gmail: thread sync pass finished');
  return result;
}

async function getThreadSyncStatus(prisma = getPrisma()) {
  const cursors = await prisma.brainSyncCursor.findMany({
    where: { source: THREAD_SOURCE, stream: { in: THREAD_STREAM_NAMES } },
    orderBy: { stream: 'asc' },
  });
  return {
    source: THREAD_SOURCE,
    streams: cursors.map((row) => ({
      stream: row.stream,
      status: row.status,
      processed: row.processedCount,
      errors: row.errorCount,
      pending: Boolean(row.pageToken),
      lastObservedAt: row.lastObservedAt,
    })),
  };
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  storeGmailTokens,
  loadGmailTokens,
  ensureThreadCursors,
  runNextThreadBatch,
  syncGmailThreads,
  getThreadSyncStatus,
  verifyOAuthState,
  getAuthorizedGmailClient,
  getGmailAuthHealth,
  // Exported for focused reliability tests; not an API surface.
  ingestGmailThread,
  nextThreadCursor,
  recoverStaleRunningThreadCursors,
  resetCompletedThreadCursors,
};
