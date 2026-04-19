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

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const GMAIL_TOKEN_LABEL = 'gmail-sync';

// ── OAuth helpers ────────────────────────────────────────────────────────────

function getOAuthClient() {
  const { google } = requireGoogle();
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || `${process.env.VITE_PUBLIC_URL || 'https://localeffortfood.com'}/api/brain/gmail/callback`
  );
}

function requireGoogle() {
  try {
    return require('googleapis');
  } catch {
    throw new Error('googleapis package not installed — run: pnpm add googleapis');
  }
}

function getAuthUrl() {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent',
  });
}

async function exchangeCodeForTokens(code) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

async function storeGmailTokens(tokens) {
  const prisma = getPrisma();
  const crypto = require('crypto');
  const tokenData = JSON.stringify(tokens);
  const tokenHash = crypto.createHash('sha256').update(tokenData).digest('hex');

  await prisma.brainApiToken.upsert({
    where: { tokenHash },
    update: { lastUsedAt: new Date() },
    create: {
      label: GMAIL_TOKEN_LABEL,
      tokenHash,
      scopes: GMAIL_SCOPES,
    },
  });

  // Store actual token data separately — tokenHash is just the index key
  // We use a simple JSON file in a secure location for the actual OAuth tokens
  // In production this should use a secrets manager or encrypted DB field
  const fs = require('fs');
  const path = require('path');
  const tokenPath = path.resolve(process.cwd(), '.gmail-tokens.json');
  fs.writeFileSync(tokenPath, tokenData, { mode: 0o600 });
  return tokenHash;
}

async function loadGmailTokens() {
  const fs = require('fs');
  const path = require('path');
  const tokenPath = path.resolve(process.cwd(), '.gmail-tokens.json');
  if (!fs.existsSync(tokenPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  } catch {
    return null;
  }
}

// ── Sync logic ───────────────────────────────────────────────────────────────

// Keywords that indicate a thread is operationally relevant
const RELEVANT_KEYWORDS = [
  'invoice', 'order', 'delivery', 'pickup', 'quote', 'estimate', 'receipt',
  'payment', 'bill', 'purchase', 'vendor', 'supplier', 'farm', 'produce',
  'catering', 'event', 'booking', 'deposit', 'contract', 'menu', 'weekly',
  'csa', 'wholesale', 'pricing', 'price', 'proposal',
];

function isRelevantSubject(subject) {
  if (!subject) return false;
  const lower = subject.toLowerCase();
  return RELEVANT_KEYWORDS.some(kw => lower.includes(kw));
}

function extractPlainText(parts) {
  if (!parts) return '';
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf8').slice(0, 500);
    }
    if (part.parts) {
      const nested = extractPlainText(part.parts);
      if (nested) return nested;
    }
  }
  return '';
}

/**
 * Sync recent Gmail threads into brain inbox.
 * @param {object} options
 * @param {number} options.maxThreads - max threads to process (default 20)
 * @param {number} options.daysBack - how far back to look (default 7)
 * @param {object} options.logger
 * @returns {{ processed: number, skipped: number, errors: number }}
 */
async function syncGmailThreads({ maxThreads = 20, daysBack = 7, logger } = {}) {
  const tokens = await loadGmailTokens();
  if (!tokens) {
    throw new Error('Gmail not authorized — visit /api/brain/gmail/auth to connect');
  }

  const { google } = requireGoogle();
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);

  // Auto-refresh tokens
  oauth2Client.on('tokens', async (newTokens) => {
    if (newTokens.refresh_token) {
      await storeGmailTokens({ ...tokens, ...newTokens });
    }
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Query: unread or recent threads, not spam/trash
  const afterDate = Math.floor((Date.now() - daysBack * 86400000) / 1000);
  const query = `after:${afterDate} -in:spam -in:trash`;

  const prisma = getPrisma();
  let processed = 0, skipped = 0, errors = 0;

  try {
    const listRes = await gmail.users.threads.list({
      userId: 'me',
      q: query,
      maxResults: maxThreads,
    });

    const threads = listRes.data.threads || [];
    if (logger?.info) logger.info({ count: threads.length }, 'brain/gmail: fetched thread list');

    for (const thread of threads) {
      try {
        // Check if already ingested
        const existing = await prisma.ledgerEvent.findFirst({
          where: { source: 'gmail', sourceId: thread.id },
        });
        if (existing) { skipped++; continue; }

        // Fetch full thread
        const threadRes = await gmail.users.threads.get({
          userId: 'me',
          id: thread.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date', 'To'],
        });

        const messages = threadRes.data.messages || [];
        if (!messages.length) { skipped++; continue; }

        const firstMsg = messages[0];
        const headers = Object.fromEntries(
          (firstMsg.payload?.headers || []).map(h => [h.name.toLowerCase(), h.value])
        );

        const subject = headers['subject'] || '(no subject)';
        const from = headers['from'] || '';
        const date = headers['date'] || '';
        const messageCount = messages.length;

        // Filter to relevant threads only
        if (!isRelevantSubject(subject)) { skipped++; continue; }

        // Write ledger event
        const occurredAt = date ? new Date(date) : new Date();
        const ledgerEvent = await writeLedgerEvent({
          eventType: 'email.thread',
          occurredAt,
          source: 'gmail',
          sourceId: thread.id,
          actorType: 'system',
          payload: {
            threadId: thread.id,
            subject,
            from,
            messageCount,
            snippet: threadRes.data.snippet || '',
          },
        });

        // Create inbox item for triage
        await createInboxItem({
          rawContent: `Email: "${subject}" from ${from} (${messageCount} message${messageCount !== 1 ? 's' : ''})${threadRes.data.snippet ? '\n' + threadRes.data.snippet : ''}`,
          source: 'gmail',
          attachments: [{
            url: `https://mail.google.com/mail/u/0/#inbox/${thread.id}`,
            mimeType: 'text/html',
            label: 'Open in Gmail',
          }],
        });

        processed++;
      } catch (err) {
        errors++;
        if (logger?.warn) logger.warn({ err, threadId: thread.id }, 'brain/gmail: thread error');
      }
    }
  } catch (err) {
    if (logger?.error) logger.error({ err }, 'brain/gmail: sync failed');
    throw err;
  }

  return { processed, skipped, errors };
}

module.exports = { getAuthUrl, exchangeCodeForTokens, storeGmailTokens, syncGmailThreads };
