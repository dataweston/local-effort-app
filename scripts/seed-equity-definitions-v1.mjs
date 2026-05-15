import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const SOURCE = 'codex_seed';
const SOURCE_ID = 'equity-ledger-v1:definitions-2026-05-15';
const EVENT_TYPE = 'equity.terms.defined';

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
  const priorLedger = await prisma.ledgerEvent.findFirst({
    where: { sourceId: 'equity-ledger-v1:EQ-2026-0001', tombstonedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  const priorEquityClassId = priorLedger?.payload?.entityIds?.equityClass ?? null;
  const priorTransactionId = priorLedger?.payload?.entityIds?.transaction ?? null;
  const priorReneeId = priorLedger?.payload?.entityIds?.renee ?? null;

  const organization = await upsertEntity({
    entityType: 'Organization',
    name: 'Local Effort Cooperative',
    aliases: ['Local Effort', 'Local Effort Cooperative'],
    properties: {
      exactLegalName: 'Local Effort Cooperative',
      legalStructure: 'Minnesota 308B cooperative',
      taxPosture: 'Partnership-taxed cooperative',
      issuerOfReneeFutureEquityRight: true,
    },
  });

  const businessLine = await upsertEntity({
    entityType: 'BusinessLine',
    name: 'Local Effort',
    aliases: ['Local Effort operating brand'],
    properties: {
      operatingBrandOf: 'Local Effort Cooperative',
      organizationEntityId: organization.entity.id,
    },
  });

  if (apply) {
    await prisma.brainEntityAlias.deleteMany({
      where: {
        entityId: businessLine.entity.id,
        alias: 'Local Effort Cooperative',
        source: SOURCE,
      },
    });
  }

  const weston = await upsertEntity({
    entityType: 'Person',
    name: 'Weston Smith',
    aliases: ['dataweston@gmail.com', 'yum@localeffortfood.com'],
    properties: {
      legalName: 'Weston Smith',
      capitalizationRole: 'founder/cofounder',
    },
  });

  const catherine = await upsertEntity({
    entityType: 'Person',
    name: 'Catherine Olsen',
    aliases: ['colsen03@gmail.com'],
    properties: {
      legalName: 'Catherine Olsen',
      capitalizationRole: 'founder/cofounder',
    },
  });

  const equityClass = await upsertEntity({
    preferredId: priorEquityClassId,
    entityType: 'EquityClass',
    name: 'Future Non-Governance Profit Interest Class',
    aliases: ['Future Non-Voting Equity Class', 'Future Non-Governance Equity Class'],
    status: 'proposed',
    properties: {
      classLabel: 'Future Non-Governance Profit Interest Class',
      priorWorkingName: 'Future Non-Voting Equity Class',
      technicalLabelStatus: 'needs counsel review',
      intendedEconomicRights: 'Takes profits / true equity economics',
      intendedGovernanceRights: 'No governance participation',
      intendedPatronageRights: 'No patronage participation',
      intendedVotingRights: 'No voting rights except any non-waivable rights required by law',
      notes: 'Business-facing term changed from Non-Voting to Non-Governance to better reflect no patronage or governance participation.',
    },
  });

  const deFactoPartnerStatus = await upsertEntity({
    entityType: 'Status',
    name: 'De Facto Partner From Day 1',
    properties: {
      statusType: 'relationship',
      appliesTo: 'Renee Owens',
      starts: 'day 1',
      legalEffect: 'TBD; paperwork and counsel review needed',
    },
  });

  const paperworkCondition = await upsertEntity({
    entityType: 'Constraint',
    name: 'Legal and Paperwork Completion for Renee Equity Issuance',
    properties: {
      constraintType: 'legal_paperwork',
      description: 'Renee is intended to be treated as a de facto partner from day 1; remaining activation conditions are legal documentation, governance approvals, and paperwork.',
      activationUnclear: true,
      severity: 5,
    },
  });

  const transaction = priorTransactionId
    ? await upsertEntity({
        preferredId: priorTransactionId,
        entityType: 'LedgerTransaction',
        name: 'Renee Owens Future Non-Governance Profit Interest Investment',
        aliases: ['Renee Owens Future Non-Voting Equity Investment'],
        properties: {
          issuerLegalName: 'Local Effort Cooperative',
          issuerEntityId: organization.entity.id,
          classOrSeries: 'Future Non-Governance Profit Interest Class; final legal label TBD',
          votingRights: 'No governance participation; no voting except non-waivable legal rights, if any',
          patronageRights: 'No patronage participation intended',
          economicRights: 'Future 1.00% true equity/profit interest',
          issuanceConditions: 'Legal documentation, governance approvals, and paperwork; Renee intended as de facto partner from day 1.',
          activationStatus: 'unclear; legal/paperwork activation point needs counsel review',
          deFactoPartnerFromDayOne: true,
        },
      })
    : null;

  const payload = {
    clarificationOfLedgerEventId: priorLedger?.id ?? null,
    definitions: {
      exactLegalName: 'Local Effort Cooperative',
      organizationIsFirstClassEntityType: true,
      issuerOfReneeFutureEquityRight: 'Local Effort Cooperative',
      equityClassWorkingDefinition: {
        label: 'Future Non-Governance Profit Interest Class',
        economics: 'Takes profits / true equity economics',
        governance: 'No governance participation',
        patronage: 'No patronage participation',
        legalLabel: 'TBD; counsel review needed',
      },
      capitalizationFounders: ['Weston Smith', 'Catherine Olsen'],
      reneeActivation: 'Renee intended as de facto partner from day 1; activation mechanics unclear and limited to legal/paperwork/governance formalities.',
    },
    entityIds: {
      organization: organization.entity.id,
      businessLine: businessLine.entity.id,
      weston: weston.entity.id,
      catherine: catherine.entity.id,
      equityClass: equityClass.entity.id,
      deFactoPartnerStatus: deFactoPartnerStatus.entity.id,
      paperworkCondition: paperworkCondition.entity.id,
      transaction: transaction?.entity.id ?? null,
      renee: priorReneeId,
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
      dstId: businessLine.entity.id,
      relType: 'OPERATES',
      ledgerEventId,
      metadata: { relationship: 'legal entity operates business/brand surface' },
    }),
    await createAssertion({
      srcId: organization.entity.id,
      dstId: weston.entity.id,
      relType: 'HAS_FOUNDER',
      ledgerEventId,
      metadata: { capitalizationRole: 'founder/cofounder' },
    }),
    await createAssertion({
      srcId: organization.entity.id,
      dstId: catherine.entity.id,
      relType: 'HAS_FOUNDER',
      ledgerEventId,
      metadata: { capitalizationRole: 'founder/cofounder' },
    }),
    await createAssertion({
      srcId: organization.entity.id,
      dstId: equityClass.entity.id,
      relType: 'HAS_EQUITY_CLASS',
      ledgerEventId,
      metadata: { status: 'proposed', legalLabelStatus: 'needs counsel review' },
    }),
    transaction && await createAssertion({
      srcId: organization.entity.id,
      dstId: transaction.entity.id,
      relType: 'ISSUES_EQUITY_RIGHT',
      ledgerEventId,
      metadata: { holder: 'Renee Owens', ledgerId: 'EQ-2026-0001' },
    }),
    transaction && await createAssertion({
      srcId: transaction.entity.id,
      dstId: paperworkCondition.entity.id,
      relType: 'CONSTRAINED_BY',
      ledgerEventId,
      metadata: { remainingCondition: 'legal documentation, governance approvals, and paperwork' },
    }),
    priorReneeId && await createAssertion({
      srcId: priorReneeId,
      dstId: organization.entity.id,
      relType: 'INVESTS_IN',
      ledgerEventId,
      metadata: { issuer: 'Local Effort Cooperative', ledgerId: 'EQ-2026-0001' },
    }),
    priorReneeId && await createAssertion({
      srcId: priorReneeId,
      dstId: deFactoPartnerStatus.entity.id,
      relType: 'HAS_STATUS',
      ledgerEventId,
      metadata: { starts: 'day 1', legalEffect: 'TBD' },
      confidence: 0.8,
    }),
  ].filter(Boolean);

  console.log(JSON.stringify({
    ok: true,
    applied: apply,
    ledgerEvent: ledgerEvent ? { id: ledgerEvent.id, created: ledgerCreated, eventType: EVENT_TYPE, sourceId: SOURCE_ID } : null,
    entities: {
      organization,
      businessLine,
      weston,
      catherine,
      equityClass,
      deFactoPartnerStatus,
      paperworkCondition,
      transaction,
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
