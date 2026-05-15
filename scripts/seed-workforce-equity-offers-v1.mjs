import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const SOURCE = 'codex_seed';
const SOURCE_ID = 'workforce-equity-offers-v1:2026-05-15';
const EVENT_TYPE = 'workforce.equity_offers.recorded';

function canonicalName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergeProperties(existing, next) {
  return {
    ...((existing && typeof existing === 'object' && !Array.isArray(existing)) ? existing : {}),
    ...next,
  };
}

async function upsertEntity({ entityType, name, properties = {}, status = 'active', aliases = [], preferredId = null }) {
  const normalized = canonicalName(name);
  const existing = preferredId
    ? await prisma.brainEntity.findUnique({ where: { id: preferredId }, include: { aliases: true } })
    : await prisma.brainEntity.findFirst({
        where: {
          entityType,
          tombstonedAt: null,
          OR: [
            { canonicalName: normalized },
            { name: { equals: name, mode: 'insensitive' } },
            ...aliases.map((alias) => ({ aliases: { some: { alias: { equals: alias, mode: 'insensitive' } } } })),
          ],
        },
        include: { aliases: true },
      });

  if (!apply) {
    return {
      entity: existing || { id: `[new:${entityType}:${normalized}]`, entityType, name, canonicalName: normalized, properties, status },
      created: !existing,
    };
  }

  const entity = existing
    ? await prisma.brainEntity.update({
        where: { id: existing.id },
        data: {
          entityType,
          name,
          canonicalName: normalized,
          status,
          properties: mergeProperties(existing.properties, properties),
        },
        include: { aliases: true },
      })
    : await prisma.brainEntity.create({
        data: { entityType, name, canonicalName: normalized, status, properties },
        include: { aliases: true },
      });

  for (const alias of aliases) {
    await prisma.brainEntityAlias.upsert({
      where: { entityId_alias: { entityId: entity.id, alias } },
      update: {},
      create: { entityId: entity.id, alias, source: SOURCE },
    });
  }

  return { entity, created: !existing };
}

async function createAssertion({ srcId, dstId, relType, ledgerEventId, metadata = {}, confidence = 0.9 }) {
  const existing = apply
    ? await prisma.brainAssertion.findFirst({
        where: { srcId, dstId, relType, sourceId: ledgerEventId, retractedAt: null },
        orderBy: { createdAt: 'desc' },
      })
    : null;

  if (existing) return { assertion: existing, created: false };
  if (!apply) return { assertion: { id: `[new:${relType}:${srcId}:${dstId}]`, relType }, created: true };

  const assertion = await prisma.brainAssertion.create({
    data: {
      srcId,
      dstId,
      relType,
      metadata,
      validFrom: new Date(),
      knownFrom: new Date(),
      confidence,
      sourceType: 'ledger_event',
      sourceId: ledgerEventId,
      createdBy: 'codex',
      provisional: true,
    },
  });
  return { assertion, created: true };
}

async function main() {
  const organization = await upsertEntity({
    entityType: 'Organization',
    name: 'Local Effort Cooperative',
    properties: {
      hasWorkerEquityOffers: true,
      workforceEquityLastClarifiedBy: SOURCE_ID,
    },
  });

  const maria = await upsertEntity({
    entityType: 'Person',
    name: 'Maria Beck',
    properties: {
      legalName: 'Maria Beck',
      workforceStatus: 'hired_not_started',
      title: 'Chef',
      hourlyKitchenRateCents: 3500,
      offeredEquityPercent: 0.5,
      equityVesting: '90 days from starting work',
      startStatus: 'not_started',
    },
  });

  const zachary = await upsertEntity({
    entityType: 'Person',
    name: 'Zachary Hurdle',
    properties: {
      legalName: 'Zachary Hurdle',
      workforceStatus: 'hired_not_started',
      title: 'Associate of Community Projects',
      hourlyKitchenRateCents: 3500,
      offeredEquityPercent: 0.5,
      equityVesting: '90 days from starting work',
      startStatus: 'not_started',
    },
  });

  const alyssa = await upsertEntity({
    entityType: 'Person',
    name: 'Alyssa Andes',
    aliases: ['soupsistersmn@gmail.com'],
    properties: {
      legalName: 'Alyssa Andes',
      workforceStatus: 'job_offered',
      title: 'TBD',
      startStatus: 'not_started',
    },
  });

  const chefRole = await upsertEntity({
    entityType: 'StaffRole',
    name: 'Chef',
    properties: { title: 'Chef' },
  });

  const communityProjectsRole = await upsertEntity({
    entityType: 'StaffRole',
    name: 'Associate of Community Projects',
    properties: { title: 'Associate of Community Projects' },
  });

  const titleTbdRole = await upsertEntity({
    entityType: 'StaffRole',
    name: 'Title TBD',
    status: 'proposed',
    properties: { title: 'TBD' },
  });

  const kitchenHourly35 = await upsertEntity({
    entityType: 'CompensationTerm',
    name: '$35/hour kitchen work',
    properties: {
      compensationType: 'hourly',
      amountCents: 3500,
      currency: 'USD',
      appliesTo: 'kitchen work',
    },
  });

  const vesting90DaysFromStart = await upsertEntity({
    entityType: 'VestingTerm',
    name: '90 days from starting work',
    properties: {
      vestingTrigger: 'start_of_work',
      vestingDelayDays: 90,
      startDateKnown: false,
      vestingClockStatus: 'not_started',
    },
  });

  const mariaOffer = await upsertEntity({
    entityType: 'JobOffer',
    name: 'Maria Beck Chef Offer',
    properties: {
      person: 'Maria Beck',
      title: 'Chef',
      status: 'hired_not_started',
      startStatus: 'not_started',
      hourlyKitchenRateCents: 3500,
      offeredEquityPercent: 0.5,
      equityVesting: '90 days from starting work',
    },
  });

  const zacharyOffer = await upsertEntity({
    entityType: 'JobOffer',
    name: 'Zachary Hurdle Associate of Community Projects Offer',
    properties: {
      person: 'Zachary Hurdle',
      title: 'Associate of Community Projects',
      status: 'hired_not_started',
      startStatus: 'not_started',
      hourlyKitchenRateCents: 3500,
      offeredEquityPercent: 0.5,
      equityVesting: '90 days from starting work',
    },
  });

  const alyssaOffer = await upsertEntity({
    entityType: 'JobOffer',
    name: 'Alyssa Andes Job Offer',
    status: 'proposed',
    properties: {
      person: 'Alyssa Andes',
      title: 'TBD',
      status: 'offered',
      startStatus: 'not_started',
    },
  });

  const mariaEquity = await upsertEntity({
    entityType: 'EquityGrant',
    name: 'Maria Beck 0.5% Worker Equity Offer',
    status: 'conditionally_issuable',
    properties: {
      holder: 'Maria Beck',
      offeredPercent: 0.5,
      vestingTerm: '90 days from starting work',
      vestingClockStatus: 'not_started',
      startDate: null,
      issuanceStatus: 'offered_not_vested',
      finalPaperworkNeeded: true,
    },
  });

  const zacharyEquity = await upsertEntity({
    entityType: 'EquityGrant',
    name: 'Zachary Hurdle 0.5% Worker Equity Offer',
    status: 'conditionally_issuable',
    properties: {
      holder: 'Zachary Hurdle',
      offeredPercent: 0.5,
      vestingTerm: '90 days from starting work',
      vestingClockStatus: 'not_started',
      startDate: null,
      issuanceStatus: 'offered_not_vested',
      finalPaperworkNeeded: true,
    },
  });

  const payload = {
    organization: 'Local Effort Cooperative',
    facts: {
      hiredNotStarted: [
        {
          person: 'Maria Beck',
          title: 'Chef',
          hourlyKitchenRateCents: 3500,
          offeredEquityPercent: 0.5,
          vesting: '90 days from starting work',
        },
        {
          person: 'Zachary Hurdle',
          title: 'Associate of Community Projects',
          hourlyKitchenRateCents: 3500,
          offeredEquityPercent: 0.5,
          vesting: '90 days from starting work',
        },
      ],
      jobOffered: [
        {
          person: 'Alyssa Andes',
          title: 'TBD',
        },
      ],
      startStatus: 'Maria Beck and Zachary Hurdle have not started; vesting clock has not started.',
    },
    entityIds: {
      organization: organization.entity.id,
      maria: maria.entity.id,
      zachary: zachary.entity.id,
      alyssa: alyssa.entity.id,
      chefRole: chefRole.entity.id,
      communityProjectsRole: communityProjectsRole.entity.id,
      titleTbdRole: titleTbdRole.entity.id,
      kitchenHourly35: kitchenHourly35.entity.id,
      vesting90DaysFromStart: vesting90DaysFromStart.entity.id,
      mariaOffer: mariaOffer.entity.id,
      zacharyOffer: zacharyOffer.entity.id,
      alyssaOffer: alyssaOffer.entity.id,
      mariaEquity: mariaEquity.entity.id,
      zacharyEquity: zacharyEquity.entity.id,
    },
  };

  let ledgerEvent = apply
    ? await prisma.ledgerEvent.findFirst({
        where: { eventType: EVENT_TYPE, source: SOURCE, sourceId: SOURCE_ID, tombstonedAt: null },
        orderBy: { createdAt: 'desc' },
      })
    : null;

  let ledgerCreated = false;
  if (apply && !ledgerEvent) {
    ledgerEvent = await prisma.ledgerEvent.create({
      data: {
        eventType: EVENT_TYPE,
        schemaVersion: 1,
        occurredAt: new Date(),
        source: SOURCE,
        sourceId: SOURCE_ID,
        actorType: 'mcp:codex',
        payload,
      },
    });
    ledgerCreated = true;
  }

  const ledgerEventId = ledgerEvent?.id ?? '[dry-run-ledger-event-id]';
  const assertions = [
    await createAssertion({ srcId: maria.entity.id, dstId: organization.entity.id, relType: 'HIRED_BY', ledgerEventId, metadata: { status: 'hired_not_started' } }),
    await createAssertion({ srcId: zachary.entity.id, dstId: organization.entity.id, relType: 'HIRED_BY', ledgerEventId, metadata: { status: 'hired_not_started' } }),
    await createAssertion({ srcId: mariaOffer.entity.id, dstId: organization.entity.id, relType: 'OFFERED_BY', ledgerEventId }),
    await createAssertion({ srcId: zacharyOffer.entity.id, dstId: organization.entity.id, relType: 'OFFERED_BY', ledgerEventId }),
    await createAssertion({ srcId: alyssaOffer.entity.id, dstId: organization.entity.id, relType: 'OFFERED_BY', ledgerEventId }),
    await createAssertion({ srcId: mariaOffer.entity.id, dstId: maria.entity.id, relType: 'OFFERED_TO', ledgerEventId, metadata: { status: 'accepted/hired_not_started' } }),
    await createAssertion({ srcId: zacharyOffer.entity.id, dstId: zachary.entity.id, relType: 'OFFERED_TO', ledgerEventId, metadata: { status: 'accepted/hired_not_started' } }),
    await createAssertion({ srcId: alyssaOffer.entity.id, dstId: alyssa.entity.id, relType: 'OFFERED_TO', ledgerEventId, metadata: { title: 'TBD' } }),
    await createAssertion({ srcId: maria.entity.id, dstId: chefRole.entity.id, relType: 'HAS_ROLE', ledgerEventId }),
    await createAssertion({ srcId: zachary.entity.id, dstId: communityProjectsRole.entity.id, relType: 'HAS_ROLE', ledgerEventId }),
    await createAssertion({ srcId: alyssaOffer.entity.id, dstId: titleTbdRole.entity.id, relType: 'HAS_ROLE', ledgerEventId }),
    await createAssertion({ srcId: mariaOffer.entity.id, dstId: kitchenHourly35.entity.id, relType: 'HAS_COMPENSATION', ledgerEventId, metadata: { appliesTo: 'kitchen work' } }),
    await createAssertion({ srcId: zacharyOffer.entity.id, dstId: kitchenHourly35.entity.id, relType: 'HAS_COMPENSATION', ledgerEventId, metadata: { appliesTo: 'kitchen work' } }),
    await createAssertion({ srcId: mariaOffer.entity.id, dstId: mariaEquity.entity.id, relType: 'OFFERS_EQUITY_RIGHT', ledgerEventId, metadata: { offeredPercent: 0.5 } }),
    await createAssertion({ srcId: zacharyOffer.entity.id, dstId: zacharyEquity.entity.id, relType: 'OFFERS_EQUITY_RIGHT', ledgerEventId, metadata: { offeredPercent: 0.5 } }),
    await createAssertion({ srcId: mariaEquity.entity.id, dstId: maria.entity.id, relType: 'OFFERED_TO', ledgerEventId, metadata: { offeredPercent: 0.5 } }),
    await createAssertion({ srcId: zacharyEquity.entity.id, dstId: zachary.entity.id, relType: 'OFFERED_TO', ledgerEventId, metadata: { offeredPercent: 0.5 } }),
    await createAssertion({ srcId: mariaEquity.entity.id, dstId: vesting90DaysFromStart.entity.id, relType: 'VESTS_UNDER', ledgerEventId, metadata: { vestingClockStatus: 'not_started' } }),
    await createAssertion({ srcId: zacharyEquity.entity.id, dstId: vesting90DaysFromStart.entity.id, relType: 'VESTS_UNDER', ledgerEventId, metadata: { vestingClockStatus: 'not_started' } }),
  ];

  console.log(JSON.stringify({
    ok: true,
    applied: apply,
    ledgerEvent: ledgerEvent ? { id: ledgerEvent.id, created: ledgerCreated, eventType: EVENT_TYPE, sourceId: SOURCE_ID } : null,
    entities: {
      organization,
      maria,
      zachary,
      alyssa,
      chefRole,
      communityProjectsRole,
      titleTbdRole,
      kitchenHourly35,
      vesting90DaysFromStart,
      mariaOffer,
      zacharyOffer,
      alyssaOffer,
      mariaEquity,
      zacharyEquity,
    },
    assertions: assertions.map((item) => ({ id: item.assertion.id, relType: item.assertion.relType, created: item.created })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
