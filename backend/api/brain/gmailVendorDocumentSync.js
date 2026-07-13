/**
 * Read-only Gmail vendor-document ingestion.
 *
 * Three years are split into bounded windows, newest first: monthly windows for
 * the most recent six months, then quarterly windows. BrainSyncCursor makes each
 * page resumable. The ledger receives compact extraction evidence, not full
 * messages, attachment binaries, or recipient lists.
 */

const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent } = require('./ledger');
const { getAuthorizedGmailClient } = require('./gmailSync');

const SOURCE = 'gmail_vendor_documents';
const STREAM = 'vendor-documents-v1';
const MAX_BATCH = 100;
const DEFAULT_BATCH = 50;
const QUERY_TERMS = '{invoice receipt statement "order confirmation" "purchase order" "amount due" "payment confirmation" "fresh sheet" "price list"}';
const BLOCKED_DOMAINS = /(?:^|\.)(?:localeffortfood\.com|google\.com|intuit\.com|turbotax\.com)$/i;

function addUtcMonths(value, count) {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + count, d.getUTCDate()));
}

function gmailDate(value) {
  const d = new Date(value);
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Produce six recent monthly windows followed by older quarterly windows. */
function buildVendorDocumentWindows(now = new Date(), monthsBack = 36) {
  // A stable month boundary prevents creating overlapping cursors on every run.
  const d = new Date(now);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  const oldest = addUtcMonths(end, -Math.max(6, Math.min(60, Number(monthsBack) || 36)));
  const recentBoundary = addUtcMonths(end, -6);
  const windows = [];

  let cursorEnd = end;
  while (cursorEnd > recentBoundary) {
    const cursorStart = addUtcMonths(cursorEnd, -1) < recentBoundary ? recentBoundary : addUtcMonths(cursorEnd, -1);
    windows.push({ windowStart: cursorStart, windowEnd: cursorEnd, priority: 'recent' });
    cursorEnd = cursorStart;
  }
  while (cursorEnd > oldest) {
    const cursorStart = addUtcMonths(cursorEnd, -3) < oldest ? oldest : addUtcMonths(cursorEnd, -3);
    windows.push({ windowStart: cursorStart, windowEnd: cursorEnd, priority: 'historical' });
    cursorEnd = cursorStart;
  }
  return windows;
}

function decodeBase64Url(value) {
  if (!value) return '';
  try { return Buffer.from(value, 'base64url').toString('utf8'); } catch { return ''; }
}

function plainText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectParts(part, result = { text: [], attachments: [] }) {
  if (!part) return result;
  const mimeType = String(part.mimeType || '').toLowerCase();
  const filename = String(part.filename || '').trim();
  if (filename || part.body?.attachmentId) {
    result.attachments.push({
      filename: filename || 'attachment',
      mimeType: mimeType || 'application/octet-stream',
      size: Number(part.body?.size || 0),
      attachmentId: part.body?.attachmentId || null,
    });
  }
  if (part.body?.data && (mimeType === 'text/plain' || mimeType === 'text/html')) {
    const decoded = decodeBase64Url(part.body.data);
    result.text.push(mimeType === 'text/html' ? plainText(decoded) : decoded);
  }
  for (const child of (part.parts || [])) collectParts(child, result);
  return result;
}

function headerMap(headers) {
  return Object.fromEntries((headers || []).map((h) => [String(h.name || '').toLowerCase(), String(h.value || '')]));
}

function parseMailbox(value) {
  const raw = String(value || '');
  const address = (raw.match(/<([^>]+)>/)?.[1] || raw.match(/[\w.+-]+@[\w.-]+/)?.[0] || '').toLowerCase();
  const name = raw.replace(/<[^>]+>/g, '').replace(address, '').replace(/^['"]|['"]$/g, '').trim();
  return { name: name || null, address: address || null, domain: address.split('@')[1] || null };
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = String(text || '').match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractDocument(message) {
  const headers = headerMap(message.payload?.headers);
  const sender = parseMailbox(headers.from);
  const parts = collectParts(message.payload);
  const body = plainText(parts.text.join('\n'));
  const searchable = `${headers.subject || ''}\n${message.snippet || ''}\n${body}`.slice(0, 50000);
  const amount = firstMatch(searchable, [
    /(?:amount due|invoice total|order total|grand total|total)\s*[:\-]?\s*\$?([0-9,]+(?:\.\d{2})?)/i,
    /\$([0-9,]+\.\d{2})\b/,
  ]);
  const invoiceNumber = firstMatch(searchable, [
    /(?:invoice|inv)\s*(?:number|no\.?|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9-]{2,})/i,
    /(?:order|purchase order|po)\s*(?:number|no\.?|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9-]{2,})/i,
  ]);
  const documentType = /receipt/i.test(searchable) ? 'receipt'
    : /statement/i.test(searchable) ? 'statement'
      : /order confirmation|purchase order/i.test(searchable) ? 'order_confirmation'
        : /price list|fresh sheet/i.test(searchable) ? 'availability_or_price_list'
          : 'invoice';
  return {
    messageId: message.id,
    threadId: message.threadId,
    documentType,
    subject: String(headers.subject || '(no subject)').slice(0, 300),
    sender,
    sentAt: headers.date || null,
    invoiceNumber,
    amount: amount ? Number(amount.replace(/,/g, '')) : null,
    amountCents: amount ? Math.round(Number(amount.replace(/,/g, '')) * 100) : null,
    currency: amount ? 'USD' : null,
    excerpt: plainText(body || message.snippet || '').slice(0, 1200),
    attachments: parts.attachments.slice(0, 20).map(({ attachmentId, ...safe }) => ({
      ...safe,
      availableForExtraction: Boolean(attachmentId),
    })),
  };
}

async function ensureCursors({ monthsBack = 36 } = {}) {
  const prisma = getPrisma();
  const windows = buildVendorDocumentWindows(new Date(), monthsBack);
  for (const window of windows) {
    await prisma.brainSyncCursor.upsert({
      where: {
        source_stream_windowStart_windowEnd: {
          source: SOURCE,
          stream: STREAM,
          windowStart: window.windowStart,
          windowEnd: window.windowEnd,
        },
      },
      update: {},
      create: {
        source: SOURCE,
        stream: STREAM,
        windowStart: window.windowStart,
        windowEnd: window.windowEnd,
        metadata: { priority: window.priority, queryVersion: 1 },
      },
    });
  }
  return windows.length;
}

async function nextCursor() {
  const prisma = getPrisma();
  const now = new Date();
  return prisma.brainSyncCursor.findFirst({
    where: {
      source: SOURCE,
      stream: STREAM,
      status: { in: ['pending', 'running', 'error'] },
      OR: [{ retryAfter: null }, { retryAfter: { lte: now } }],
    },
    // Recent-first. A window keeps returning until its page token is exhausted.
    orderBy: { windowEnd: 'desc' },
  });
}

async function ingestVendorDocumentMessage(gmail, messageId) {
  const response = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  const extracted = extractDocument(response.data);
  if (extracted.sender.domain && BLOCKED_DOMAINS.test(extracted.sender.domain)) return { skipped: true };
  const occurredAt = extracted.sentAt && !Number.isNaN(new Date(extracted.sentAt).valueOf())
    ? new Date(extracted.sentAt) : new Date();
  const event = await writeLedgerEvent({
    eventType: 'vendor.document.observed',
    occurredAt,
    source: SOURCE,
    sourceId: extracted.messageId,
    actorType: 'vendor_candidate',
    payload: {
      ...extracted,
      privacy: 'private',
      extractionVersion: 1,
      gmailUrl: `https://mail.google.com/mail/u/0/#all/${extracted.threadId}`,
    },
    updatePayload: true,
  });
  return { skipped: false, existing: Boolean(event._existing), eventId: event.id };
}

/** Process one Gmail result page; callers repeat until all cursors are complete. */
async function runNextVendorDocumentBatch({ batchSize = DEFAULT_BATCH, monthsBack = 36, logger } = {}) {
  const prisma = getPrisma();
  await ensureCursors({ monthsBack });
  const cursor = await nextCursor();
  if (!cursor) return { complete: true, processed: 0, errors: 0 };

  const limit = Math.max(1, Math.min(MAX_BATCH, Number(batchSize) || DEFAULT_BATCH));
  await prisma.brainSyncCursor.update({ where: { id: cursor.id }, data: { status: 'running', retryAfter: null } });
  const gmail = await getAuthorizedGmailClient();
  const q = `after:${gmailDate(cursor.windowStart)} before:${gmailDate(cursor.windowEnd)} -in:sent ${QUERY_TERMS}`;
  let processed = 0, skipped = 0, errors = 0;
  try {
    const page = await gmail.users.messages.list({
      userId: 'me', q, maxResults: limit, ...(cursor.pageToken ? { pageToken: cursor.pageToken } : {}),
    });
    for (const stub of (page.data.messages || [])) {
      try {
        const result = await ingestVendorDocumentMessage(gmail, stub.id);
        if (result.skipped) skipped++; else processed++;
      } catch (err) {
        errors++;
        logger?.warn?.({ err, messageId: stub.id }, 'brain/gmail-vendor: message extraction failed');
      }
    }
    const pageToken = page.data.nextPageToken || null;
    await prisma.brainSyncCursor.update({
      where: { id: cursor.id },
      data: {
        pageToken,
        status: pageToken ? 'pending' : 'complete',
        processedCount: { increment: processed + skipped },
        errorCount: { increment: errors },
        lastObservedAt: new Date(),
        metadata: { ...(cursor.metadata || {}), query: q, lastBatchSize: processed + skipped, lastErrorCount: errors },
      },
    });
    const result = {
      complete: false,
      cursorId: cursor.id,
      windowStart: cursor.windowStart,
      windowEnd: cursor.windowEnd,
      windowComplete: !pageToken,
      processed,
      skipped,
      errors,
    };
    logger?.info?.(result, 'brain/gmail-vendor: bounded batch complete');
    return result;
  } catch (err) {
    await prisma.brainSyncCursor.update({
      where: { id: cursor.id },
      data: { status: 'error', errorCount: { increment: 1 }, retryAfter: new Date(Date.now() + 15 * 60 * 1000) },
    });
    throw err;
  }
}

async function getVendorDocumentSyncStatus() {
  const prisma = getPrisma();
  const cursors = await prisma.brainSyncCursor.findMany({
    where: { source: SOURCE, stream: STREAM }, orderBy: { windowEnd: 'desc' },
  });
  return {
    source: SOURCE,
    stream: STREAM,
    totals: cursors.reduce((out, row) => {
      out.windows++;
      out[row.status] = (out[row.status] || 0) + 1;
      out.processed += row.processedCount;
      out.errors += row.errorCount;
      return out;
    }, { windows: 0, processed: 0, errors: 0 }),
    windows: cursors,
  };
}

module.exports = {
  buildVendorDocumentWindows,
  extractDocument,
  ensureCursors,
  runNextVendorDocumentBatch,
  getVendorDocumentSyncStatus,
};
