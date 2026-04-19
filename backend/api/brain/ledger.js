/**
 * Brain ledger helpers — shared write path for all ingestion sources.
 * Every external event writes a LedgerEvent first, then derives graph state.
 */

const { getPrisma } = require('../utils/prisma');

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
}) {
  const prisma = getPrisma();
  return prisma.ledgerEvent.create({
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

module.exports = { writeLedgerEvent, findVendorByName, createInboxItem };
