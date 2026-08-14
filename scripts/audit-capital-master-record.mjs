import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function relevantPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const text = JSON.stringify(payload);
  return /capital|equity|founder|comp|salary|kitchen|hopkins|renee|weston|catherine|maria/i.test(text)
    ? payload
    : undefined;
}

try {
  const [org, business, currentHoldings, ownerCorrections, capitalSnapshots, facilityEntities] = await Promise.all([
    prisma.brainEntity.findFirst({
      where: { name: 'Local Effort Cooperative', entityType: 'Organization' },
      select: { id: true, name: true, status: true, updatedAt: true, properties: true },
    }),
    prisma.brainEntity.findFirst({
      where: { name: 'Local Effort', entityType: 'BusinessLine' },
      select: { id: true, name: true, status: true, updatedAt: true, properties: true },
    }),
    prisma.brainAssertion.findMany({
      where: {
        relType: 'HOLDS_EQUITY_IN',
        knownUntil: null,
        retractedAt: null,
        dst: { name: 'Local Effort Cooperative', entityType: 'Organization' },
      },
      select: {
        id: true, metadata: true, validFrom: true, knownFrom: true, sourceType: true,
        sourceId: true, confirmedAt: true, src: { select: { name: true, entityType: true } },
      },
      orderBy: { knownFrom: 'desc' },
    }),
    prisma.ledgerEvent.findMany({
      where: {
        occurredAt: { gte: new Date('2026-07-18T00:00:00.000Z') },
        OR: [
          { source: 'owner_correction' },
          { eventType: { contains: 'capital', mode: 'insensitive' } },
          { eventType: { contains: 'fact', mode: 'insensitive' } },
        ],
      },
      select: { id: true, eventType: true, source: true, sourceId: true, occurredAt: true, payload: true },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    }),
    prisma.brainEntity.findMany({
      where: { entityType: 'CapitalizationSnapshot', tombstonedAt: null },
      select: { id: true, name: true, status: true, updatedAt: true, properties: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    prisma.brainEntity.findMany({
      where: {
        tombstonedAt: null,
        OR: [
          { name: { contains: 'Hopkins', mode: 'insensitive' } },
          { name: { contains: 'Kitchenery', mode: 'insensitive' } },
          { name: { contains: 'Kitchen', mode: 'insensitive' } },
        ],
      },
      select: { id: true, entityType: true, name: true, status: true, updatedAt: true, properties: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
  ]);

  const relevantCorrections = ownerCorrections
    .map((event) => ({ ...event, payload: relevantPayload(event.payload) }))
    .filter((event) => event.payload !== undefined);

  console.log(JSON.stringify({
    extractedAt: new Date().toISOString(),
    organization: org,
    businessLine: business,
    currentHoldings,
    ownerCorrections: relevantCorrections,
    capitalSnapshots,
    facilityEntities,
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
