import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const SOURCE = 'codex_seed';
const SOURCE_ID = 'equity-ledger-v1:capitalization-2026-05-15';
const EVENT_TYPE = 'equity.capitalization.defined';

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
  const priorDefinitions = await prisma.ledgerEvent.findFirst({
    where: { sourceId: 'equity-ledger-v1:definitions-2026-05-15', tombstonedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  const priorReneeLedger = await prisma.ledgerEvent.findFirst({
    where: { sourceId: 'equity-ledger-v1:EQ-2026-0001', tombstonedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  const organizationId = priorDefinitions?.payload?.entityIds?.organization ?? '94cc2471-9461-478d-a533-e71217d274d9';
  const westonId = priorDefinitions?.payload?.entityIds?.weston ?? '7d923315-436b-4b36-bb7b-0113605f5741';
  const catherineId = priorDefinitions?.payload?.entityIds?.catherine ?? 'f821e875-449c-4333-955c-1af00a046743';
  const reneeId = priorDefinitions?.payload?.entityIds?.renee ?? priorReneeLedger?.payload?.entityIds?.renee ?? '4cba7811-c20c-415f-b3cf-428d09c827a8';
  const reneeTransactionId = priorDefinitions?.payload?.entityIds?.transaction ?? priorReneeLedger?.payload?.entityIds?.transaction ?? 'a9a35f7a-f183-4266-a040-f83c1c45601e';

  const organization = await upsertEntity({
    preferredId: organizationId,
    entityType: 'Organization',
    name: 'Local Effort Cooperative',
    properties: {
      capitalizationBasis: 'fully diluted pre-money',
      capitalizationLastClarifiedBy: SOURCE_ID,
    },
  });

  const weston = await upsertEntity({
    preferredId: westonId,
    entityType: 'Person',
    name: 'Weston Smith',
    properties: {
      initialEquityPercent: 50,
      postTrustPostReneeEquityPercent: 46.5,
      capitalizationRole: 'founder/cofounder',
    },
  });

  const catherine = await upsertEntity({
    preferredId: catherineId,
    entityType: 'Person',
    name: 'Catherine Olsen',
    properties: {
      initialEquityPercent: 50,
      postTrustPostReneeEquityPercent: 47.5,
      capitalizationRole: 'founder/cofounder',
    },
  });

  const renee = await upsertEntity({
    preferredId: reneeId,
    entityType: 'Person',
    name: 'Renee Owens',
    properties: {
      postTrustPostReneeEquityPercent: 1,
      equitySource: 'Weston Smith',
      purchasePriceCents: 300000,
      calculationBasis: 'fully diluted pre-money',
    },
  });

  const sarahCustomer = await prisma.brainEntity.findFirst({
    where: { entityType: 'Customer', canonicalName: 'saraholsen001 gmail com', tombstonedAt: null },
    select: { id: true },
  });

  const sarah = await upsertEntity({
    entityType: 'Person',
    name: 'Sarah Olsen',
    aliases: ['saraholsen001@gmail.com'],
    properties: {
      legalName: 'Sarah Olsen',
      relatedCustomerEntityId: sarahCustomer?.id ?? null,
      contributionWindow: 'previous 6 months',
    },
  });

  const sarahTrust = await upsertEntity({
    entityType: 'Trust',
    name: 'Sarah Olsen Contribution Trust',
    aliases: ['Trust in Sarah Olsen name'],
    properties: {
      trustPurpose: 'Equity held in Sarah Olsen name for prior contributions',
      beneficiaryName: 'Sarah Olsen',
      contributionWindow: 'previous 6 months',
      postTrustPostReneeEquityPercent: 5,
      calculationBasis: 'fully diluted pre-money',
    },
  });

  const sarahGrant = await upsertEntity({
    entityType: 'LedgerTransaction',
    name: 'Sarah Olsen Contribution Trust Equity Grant',
    properties: {
      transactionType: 'equity_transfer_for_contributions',
      recipient: 'Sarah Olsen Contribution Trust',
      beneficiary: 'Sarah Olsen',
      contributionWindow: 'previous 6 months',
      totalPercent: 5,
      sourceBreakdown: [
        { source: 'Weston Smith', percent: 2.5 },
        { source: 'Catherine Olsen', percent: 2.5 },
      ],
      consideration: 'Services/contributions over previous 6 months',
      calculationBasis: 'fully diluted pre-money',
    },
  });

  const reneeTransaction = await upsertEntity({
    preferredId: reneeTransactionId,
    entityType: 'LedgerTransaction',
    name: 'Renee Owens Future Non-Governance Profit Interest Investment',
    properties: {
      sourceEquityHolder: 'Weston Smith',
      sourceEquityHolderEntityId: weston.entity.id,
      transferredPercent: 1,
      purchasePriceCents: 300000,
      pricePerOnePercentCents: 300000,
      calculationBasis: 'fully diluted pre-money',
      valuationTiming: 'pre-money',
    },
  });

  const snapshot = await upsertEntity({
    entityType: 'CapitalizationSnapshot',
    name: 'Local Effort Cooperative Cap Table - Fully Diluted Pre-Money After Renee',
    properties: {
      organization: 'Local Effort Cooperative',
      calculationBasis: 'fully diluted',
      valuationTiming: 'pre-money',
      snapshotMoment: 'after Sarah trust grant and Renee sale',
      holderPercents: [
        { holder: 'Weston Smith', percent: 46.5, source: 'initial 50%, minus 2.5% to Sarah trust, minus 1% to Renee' },
        { holder: 'Catherine Olsen', percent: 47.5, source: 'initial 50%, minus 2.5% to Sarah trust' },
        { holder: 'Sarah Olsen Contribution Trust', percent: 5, source: '2.5% from Weston and 2.5% from Catherine for Sarah Olsen contributions' },
        { holder: 'Renee Owens', percent: 1, source: 'purchased from Weston Smith for $3,000' },
      ],
      totalsToPercent: 100,
      initialFounderSplit: [
        { holder: 'Weston Smith', percent: 50 },
        { holder: 'Catherine Olsen', percent: 50 },
      ],
    },
  });

  const payload = {
    clarificationOfLedgerEventIds: [priorDefinitions?.id, priorReneeLedger?.id].filter(Boolean),
    basis: {
      calculationBasis: 'fully diluted',
      valuationTiming: 'pre-money',
    },
    initialCapitalization: [
      { holder: 'Weston Smith', percent: 50 },
      { holder: 'Catherine Olsen', percent: 50 },
    ],
    equityTransfers: [
      {
        recipient: 'Sarah Olsen Contribution Trust',
        beneficiary: 'Sarah Olsen',
        totalPercent: 5,
        sources: [
          { holder: 'Weston Smith', percent: 2.5 },
          { holder: 'Catherine Olsen', percent: 2.5 },
        ],
        consideration: 'contributions over the previous 6 months',
      },
      {
        recipient: 'Renee Owens',
        totalPercent: 1,
        source: 'Weston Smith',
        cashPaidCents: 300000,
      },
    ],
    resultingCapitalization: [
      { holder: 'Weston Smith', percent: 46.5 },
      { holder: 'Catherine Olsen', percent: 47.5 },
      { holder: 'Sarah Olsen Contribution Trust', percent: 5 },
      { holder: 'Renee Owens', percent: 1 },
    ],
    entityIds: {
      organization: organization.entity.id,
      weston: weston.entity.id,
      catherine: catherine.entity.id,
      sarah: sarah.entity.id,
      sarahTrust: sarahTrust.entity.id,
      sarahGrant: sarahGrant.entity.id,
      renee: renee.entity.id,
      reneeTransaction: reneeTransaction.entity.id,
      snapshot: snapshot.entity.id,
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
    await createAssertion({
      srcId: organization.entity.id,
      dstId: snapshot.entity.id,
      relType: 'HAS_CAP_TABLE_SNAPSHOT',
      ledgerEventId,
      metadata: { calculationBasis: 'fully diluted', valuationTiming: 'pre-money' },
    }),
    await createAssertion({
      srcId: weston.entity.id,
      dstId: organization.entity.id,
      relType: 'HOLDS_EQUITY_IN',
      ledgerEventId,
      metadata: { percent: 46.5, basis: 'fully diluted pre-money', snapshotId: snapshot.entity.id },
    }),
    await createAssertion({
      srcId: catherine.entity.id,
      dstId: organization.entity.id,
      relType: 'HOLDS_EQUITY_IN',
      ledgerEventId,
      metadata: { percent: 47.5, basis: 'fully diluted pre-money', snapshotId: snapshot.entity.id },
    }),
    await createAssertion({
      srcId: sarahTrust.entity.id,
      dstId: organization.entity.id,
      relType: 'HOLDS_EQUITY_IN',
      ledgerEventId,
      metadata: { percent: 5, basis: 'fully diluted pre-money', snapshotId: snapshot.entity.id },
    }),
    await createAssertion({
      srcId: renee.entity.id,
      dstId: organization.entity.id,
      relType: 'HOLDS_EQUITY_IN',
      ledgerEventId,
      metadata: { percent: 1, basis: 'fully diluted pre-money', source: 'Weston Smith', cashPaidCents: 300000, snapshotId: snapshot.entity.id },
    }),
    await createAssertion({
      srcId: sarahTrust.entity.id,
      dstId: sarah.entity.id,
      relType: 'HAS_BENEFICIARY',
      ledgerEventId,
      metadata: { namedFor: 'Sarah Olsen', contributionWindow: 'previous 6 months' },
    }),
    await createAssertion({
      srcId: sarahGrant.entity.id,
      dstId: weston.entity.id,
      relType: 'TRANSFERS_EQUITY_FROM',
      ledgerEventId,
      metadata: { percent: 2.5, recipient: 'Sarah Olsen Contribution Trust' },
    }),
    await createAssertion({
      srcId: sarahGrant.entity.id,
      dstId: catherine.entity.id,
      relType: 'TRANSFERS_EQUITY_FROM',
      ledgerEventId,
      metadata: { percent: 2.5, recipient: 'Sarah Olsen Contribution Trust' },
    }),
    await createAssertion({
      srcId: sarahGrant.entity.id,
      dstId: sarahTrust.entity.id,
      relType: 'TRANSFERS_EQUITY_TO',
      ledgerEventId,
      metadata: { percent: 5, consideration: 'contributions over previous 6 months' },
    }),
    await createAssertion({
      srcId: reneeTransaction.entity.id,
      dstId: weston.entity.id,
      relType: 'TRANSFERS_EQUITY_FROM',
      ledgerEventId,
      metadata: { percent: 1, recipient: 'Renee Owens', cashPaidCents: 300000 },
    }),
    await createAssertion({
      srcId: reneeTransaction.entity.id,
      dstId: renee.entity.id,
      relType: 'TRANSFERS_EQUITY_TO',
      ledgerEventId,
      metadata: { percent: 1, source: 'Weston Smith', cashPaidCents: 300000 },
    }),
  ];

  console.log(JSON.stringify({
    ok: true,
    applied: apply,
    ledgerEvent: ledgerEvent ? { id: ledgerEvent.id, created: ledgerCreated, eventType: EVENT_TYPE, sourceId: SOURCE_ID } : null,
    entities: {
      organization,
      weston,
      catherine,
      sarah,
      sarahTrust,
      sarahGrant,
      renee,
      reneeTransaction,
      snapshot,
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
