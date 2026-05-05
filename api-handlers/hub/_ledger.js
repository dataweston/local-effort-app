const { cleanString } = require('./_http');

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sourceIdFor(body, fallbackParts = []) {
  const source = cleanString(body.source, 80) || 'mobile';
  const explicit = cleanString(body.sourceId, 160);
  if (explicit) return explicit;
  const offlineQueueId = cleanString(body.offlineQueueId, 160);
  if (offlineQueueId) return `${source}:${offlineQueueId}`;
  const fallback = fallbackParts.filter(Boolean).join(':');
  return fallback ? `${source}:${fallback}` : null;
}

async function findExistingLedger(prisma, { eventType, source, sourceId }) {
  if (!sourceId) return null;
  return prisma.ledgerEvent.findFirst({
    where: {
      eventType,
      source,
      sourceId,
      tombstonedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function writeLedger(prisma, { eventType, source, sourceId, auth, occurredAt, payload, schemaVersion = 1 }) {
  const existing = await findExistingLedger(prisma, { eventType, source, sourceId });
  if (existing) return { event: existing, existing: true };

  const event = await prisma.ledgerEvent.create({
    data: {
      eventType,
      schemaVersion,
      occurredAt: parseDate(occurredAt) || new Date(),
      source,
      sourceId,
      actorType: payload?.actorRole || auth.roles[0] || null,
      actorId: auth.viewer.userId || auth.viewer.supabaseUid,
      payload,
    },
  });

  return { event, existing: false };
}

module.exports = { parseDate, sourceIdFor, writeLedger };
