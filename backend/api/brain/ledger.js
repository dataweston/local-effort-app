/**
 * Brain ledger helpers — shared write path for all ingestion sources.
 * Every external event writes a LedgerEvent first, then derives graph state.
 */

const { getPrisma } = require('../utils/prisma');
const { checkSelfIdentity } = require('./selfIdentity');

function canonicalName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Order-insensitive deep equality via stable-key JSON. Used so payload-merge
// backfills don't rewrite a row whose values are unchanged but whose stored
// key order differs from a freshly-built object.
function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
}

/**
 * Write an immutable ledger event. Returns the created row.
 * All ingestion paths must call this before writing any BrainAssertion or BrainInboxItem.
 */
async function writeLedgerEvent({
  eventType,
  schemaVersion = 1,
  occurredAt,
  source,
  sourceId = null,
  actorType = null,
  actorId = null,
  payload,
  updatePayload = false, // when an event already exists, merge `payload` into it
                         // instead of skipping. Used by enrichment backfills that
                         // add new fields (e.g. identitySignals, customerEntityId)
                         // to events written by an earlier sync. New keys win.
}) {
  const prisma = getPrisma();
  if (sourceId) {
    const existing = await prisma.ledgerEvent.findFirst({
      where: {
        eventType,
        source,
        sourceId: String(sourceId),
        tombstonedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      if (updatePayload && payload && typeof payload === 'object') {
        const merged = { ...(existing.payload || {}), ...payload };
        // Only write if something actually changed — keeps re-runs no-op.
        // Order-insensitive compare: stored key order differs from a fresh build.
        if (stableStringify(merged) !== stableStringify(existing.payload || {})) {
          const updated = await prisma.ledgerEvent.update({
            where: { id: existing.id },
            data: { payload: merged },
          });
          return { ...updated, _existing: true, _updated: true };
        }
      }
      return { ...existing, _existing: true };
    }
  }
  try {
    return await prisma.ledgerEvent.create({
      data: {
        eventType,
        schemaVersion,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        source,
        sourceId: sourceId ? String(sourceId) : null,
        actorType,
        actorId: actorId ? String(actorId) : null,
        payload,
      },
    });
  } catch (err) {
    // A concurrent writer may have inserted the same (eventType, source, sourceId)
    // between the findFirst above and this create. The partial unique index
    // (20260627000100_brain_unique_constraints) now enforces this; treat the
    // race as a dedupe hit rather than an error.
    if (err?.code === 'P2002' && sourceId) {
      const existing = await prisma.ledgerEvent.findFirst({
        where: { eventType, source, sourceId: String(sourceId), tombstonedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) return { ...existing, _existing: true };
    }
    throw err;
  }
}

async function findOrCreateEntity({ entityType, name, properties = null, status = 'active' }) {
  const prisma = getPrisma();

  // Never mint the business's own identity as a counterparty (Customer/Vendor/
  // Person). This is the single choke point for triage, intake, constraint, and
  // inbox ingestion — see backend/api/brain/selfIdentity.js. Existing rows that
  // match are still returned (so callers can re-link), but new ones are refused.
  const self = checkSelfIdentity(entityType, name);
  if (self.blocked) {
    const existingSelf = await prisma.brainEntity.findFirst({
      where: {
        entityType,
        tombstonedAt: null,
        OR: [
          { canonicalName: canonicalName(name) },
          { name: { equals: name, mode: 'insensitive' } },
        ],
      },
    });
    return { entity: existingSelf || null, created: false, blocked: true, blockReason: self.reason };
  }

  const normalized = canonicalName(name);
  const existing = await prisma.brainEntity.findFirst({
    where: {
      entityType,
      tombstonedAt: null,
      OR: [
        { canonicalName: normalized },
        { name: { equals: name, mode: 'insensitive' } },
        { aliases: { some: { alias: { equals: name, mode: 'insensitive' } } } },
      ],
    },
  });
  if (existing) return { entity: existing, created: false };

  const entity = await prisma.brainEntity.create({
    data: {
      entityType,
      name,
      canonicalName: normalized,
      properties,
      status,
    },
  });
  return { entity, created: true };
}

/**
 * Find a Vendor BrainEntity by merchant name (exact or alias match).
 * Returns the entity id or null.
 */
async function findVendorByName(merchantName) {
  const prisma = getPrisma();
  if (!merchantName) return null;

  const normalized = merchantName.toLowerCase().trim();

  // Direct name match (case-insensitive)
  const direct = await prisma.brainEntity.findFirst({
    where: {
      entityType: 'Vendor',
      status: { not: 'tombstoned' },
      name: { equals: merchantName, mode: 'insensitive' },
    },
    select: { id: true },
  });
  if (direct) return direct.id;

  // Alias match
  const alias = await prisma.brainEntityAlias.findFirst({
    where: {
      alias: { equals: merchantName, mode: 'insensitive' },
      entity: { entityType: 'Vendor', status: { not: 'tombstoned' } },
    },
    select: { entityId: true },
  });
  if (alias) return alias.entityId;

  // Normalized alias match
  const normalizedAlias = await prisma.brainEntityAlias.findFirst({
    where: {
      alias: { contains: normalized, mode: 'insensitive' },
      entity: { entityType: 'Vendor', status: { not: 'tombstoned' } },
    },
    select: { entityId: true },
  });
  return normalizedAlias?.entityId ?? null;
}

/**
 * Upsert a BrainInboxItem from a ledger event.
 * Used when an event needs human triage rather than automatic graph update.
 */
async function createInboxItem({ rawContent, source, attachments = null, ledgerEventId = null }) {
  const prisma = getPrisma();
  return prisma.brainInboxItem.create({
    data: {
      rawContent,
      source,
      attachments: attachments ?? undefined,
      capturedAt: new Date(),
      status: 'pending',
    },
  });
}

module.exports = { writeLedgerEvent, findVendorByName, createInboxItem, findOrCreateEntity, canonicalName };
