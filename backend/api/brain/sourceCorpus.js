'use strict';

/**
 * Canonical lossless source-corpus storage.
 *
 * Invariants:
 * - source + sourceId identifies one source object.
 * - contentHash is SHA-256 of the exact uncompressed source bytes.
 * - rawContent is a reversible gzip archive; searchable text is a derived view.
 * - captureStatus describes byte capture, extractionStatus describes searchable
 *   interpretation. A successful capture is never relabeled failed because a
 *   parser could not understand an attachment.
 */

const crypto = require('crypto');
const { promisify } = require('util');
const { gzip, gunzip } = require('zlib');
const { getPrisma } = require('../utils/prisma');

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const CAPTURE_STATUSES = new Set(['complete', 'partial', 'failed']);
const EXTRACTION_STATUSES = new Set(['complete', 'partial', 'failed']);
const PUBLIC_SOURCE_DOCUMENT_SELECT = Object.freeze({
  id: true,
  source: true,
  sourceId: true,
  parentSourceId: true,
  sourceUrl: true,
  mediaType: true,
  title: true,
  headers: true,
  textContent: true,
  htmlContent: true,
  attachments: true,
  rawEncoding: true,
  contentHash: true,
  rawByteLength: true,
  storedByteLength: true,
  captureStatus: true,
  extractionStatus: true,
  extractionVersion: true,
  metadata: true,
  occurredAt: true,
  capturedAt: true,
  updatedAt: true,
});

function requiredText(value, field) {
  const clean = String(value || '').trim();
  if (!clean) throw new Error(`${field} is required`);
  return clean;
}

function sourceDocumentWhere({ id, source, sourceId }) {
  if (id) return { id: String(id) };
  if (source && sourceId) {
    return { source_sourceId: { source: String(source), sourceId: String(sourceId) } };
  }
  throw new Error('id or source + sourceId required');
}

function publicSourceDocument(row) {
  if (!row) return null;
  const { rawContent, ...safe } = row;
  return safe;
}

async function writeSourceDocument({
  source,
  sourceId,
  parentSourceId = null,
  sourceUrl = null,
  mediaType,
  title = null,
  headers = null,
  textContent = '',
  htmlContent = null,
  attachments = null,
  rawContent,
  occurredAt,
  captureStatus = 'complete',
  extractionStatus = 'complete',
  extractionVersion = 1,
  metadata = null,
  prismaClient = null,
}) {
  const prisma = prismaClient || getPrisma();
  const cleanSource = requiredText(source, 'source');
  const cleanSourceId = requiredText(sourceId, 'sourceId');
  const cleanMediaType = requiredText(mediaType, 'mediaType');
  if (!CAPTURE_STATUSES.has(captureStatus)) throw new Error(`invalid captureStatus: ${captureStatus}`);
  if (!EXTRACTION_STATUSES.has(extractionStatus)) throw new Error(`invalid extractionStatus: ${extractionStatus}`);
  if (!Number.isInteger(extractionVersion) || extractionVersion < 1) {
    throw new Error('extractionVersion must be a positive integer');
  }

  const raw = Buffer.isBuffer(rawContent) ? rawContent : Buffer.from(rawContent || '');
  if (captureStatus === 'complete' && raw.length === 0) {
    throw new Error('complete source capture requires rawContent');
  }
  const contentHash = crypto.createHash('sha256').update(raw).digest('hex');
  const where = sourceDocumentWhere({ source: cleanSource, sourceId: cleanSourceId });
  const existing = await prisma.brainSourceDocument.findUnique({
    where,
    select: PUBLIC_SOURCE_DOCUMENT_SELECT,
  });

  // Source bytes are immutable for the same extraction version. Avoid recompressing
  // and rewriting large values on every current-window Gmail pass.
  if (
    existing
    && existing.contentHash === contentHash
    && Number(existing.extractionVersion) >= extractionVersion
    && existing.captureStatus === captureStatus
    && existing.extractionStatus === extractionStatus
  ) {
    return { ...existing, _existing: true };
  }

  const compressed = await gzipAsync(raw, { level: 6 });
  const data = {
    source: cleanSource,
    sourceId: cleanSourceId,
    parentSourceId: parentSourceId ? String(parentSourceId) : null,
    sourceUrl: sourceUrl ? String(sourceUrl) : null,
    mediaType: cleanMediaType,
    title: title ? String(title) : null,
    headers: headers ?? undefined,
    textContent: String(textContent || ''),
    htmlContent: htmlContent ? String(htmlContent) : null,
    attachments: attachments ?? undefined,
    rawContent: compressed,
    rawEncoding: 'gzip',
    contentHash,
    rawByteLength: raw.length,
    storedByteLength: compressed.length,
    captureStatus,
    extractionStatus,
    extractionVersion,
    metadata: metadata ?? undefined,
    occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
  };

  const row = await prisma.brainSourceDocument.upsert({
    where,
    create: data,
    update: data,
    select: PUBLIC_SOURCE_DOCUMENT_SELECT,
  });
  return { ...row, ...(existing ? { _existing: true, _updated: true } : {}) };
}

async function readSourceDocument({ id, source, sourceId, includeRaw = false, prismaClient = null }) {
  const prisma = prismaClient || getPrisma();
  const row = await prisma.brainSourceDocument.findUnique({
    where: sourceDocumentWhere({ id, source, sourceId }),
    ...(includeRaw ? {} : { select: PUBLIC_SOURCE_DOCUMENT_SELECT }),
  });
  if (!row) return null;

  const result = publicSourceDocument(row);
  if (includeRaw) {
    const stored = Buffer.from(row.rawContent || []);
    const raw = row.rawEncoding === 'gzip' ? await gunzipAsync(stored) : stored;
    const contentHash = crypto.createHash('sha256').update(raw).digest('hex');
    if (contentHash !== row.contentHash) {
      throw new Error(`source document integrity check failed: ${row.id}`);
    }
    result.rawBase64 = raw.toString('base64');
  }
  return result;
}

module.exports = {
  writeSourceDocument,
  readSourceDocument,
  publicSourceDocument,
};
