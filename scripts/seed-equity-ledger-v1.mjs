import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const SOURCE = 'codex_seed';
const SOURCE_ID = 'equity-ledger-v1:EQ-2026-0001';
const EVENT_TYPE = 'equity.ledger_entry.recorded';
const SCHEMA_VERSION = 1;
const OCCURRED_AT = new Date('2026-05-14T00:00:00.000-05:00');

const ledgerEntry = {
  ledgerId: 'EQ-2026-0001',
  holderLegalName: 'Renee Owens',
  holderType: 'Investor / possible member category TBD',
  contact: 'TBD',
  residency: 'TBD',
  accreditedStatus: 'Non-accredited',
  relationship: 'Investor; Renee approached company',
  instrumentType: 'Future non-voting equity right',
  classOrSeries: 'Future non-voting equity, exact class TBD',
  votingRights: 'Non-voting',
  economicRights: 'Future 1.00% true equity interest',
  amountPaidCents: 300000,
  amountPaidDisplay: '$3,000',
  nonCashConsideration: 'None known',
  dateApproved: 'TBD; formal permission reportedly exists',
  approvalSource: 'Governing documents / written consent TBD',
  dateSigned: 'TBD',
  dateFunded: 'TBD',
  issuanceStatus: 'Conditionally issuable / future equity',
  formalIssuanceDate: 'TBD',
  exemptionReliedOn: 'Minnesota 308B cooperative exemption analysis; final counsel review needed',
  disclosureVersion: 'Renee Disclosure Pack v1',
  questionnaireReceived: 'Pending',
  transferRestrictions: 'Restricted; no public resale; subject to governing documents and securities law',
  taxTreatmentNotes: 'Partnership-taxed cooperative; tax allocation details TBD',
  brainEntityId: 'TBD until seed execution',
  ledgerEventId: 'TBD until seed execution',
  documentFolder: 'TBD',
  notes: 'Not YC SAFE; not immediate issued equity; founder/cofounder capitalization still being formalized',
};

const equityLedgerSchema = {
  type: 'object',
  required: ['ledgerEntry'],
  properties: {
    ledgerEntry: {
      type: 'object',
      required: ['ledgerId', 'holderLegalName', 'instrumentType', 'issuanceStatus'],
      properties: {
        ledgerId: { type: 'string' },
        holderLegalName: { type: 'string' },
        holderType: { type: 'string' },
        contact: { type: 'string' },
        residency: { type: 'string' },
        accreditedStatus: { type: 'string' },
        relationship: { type: 'string' },
        instrumentType: { type: 'string' },
        classOrSeries: { type: 'string' },
        votingRights: { type: 'string' },
        economicRights: { type: 'string' },
        amountPaidCents: { type: 'integer' },
        nonCashConsideration: { type: 'string' },
        issuanceStatus: { type: 'string' },
        exemptionReliedOn: { type: 'string' },
        disclosureVersion: { type: 'string' },
        questionnaireReceived: { type: 'string' },
        transferRestrictions: { type: 'string' },
        taxTreatmentNotes: { type: 'string' },
      },
    },
    graphSeed: { type: 'object' },
  },
};

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

async function findOrCreateEntity({ entityType, name, properties = {}, status = 'active', visibility = 'private', aliases = [] }) {
  const normalized = canonicalName(name);
  const aliasCandidates = aliases.length ? aliases : [name];
  const existing = await prisma.brainEntity.findFirst({
    where: {
      entityType,
      tombstonedAt: null,
      OR: [
        { canonicalName: normalized },
        { name: { equals: name, mode: 'insensitive' } },
        ...aliasCandidates.map((alias) => ({ aliases: { some: { alias: { equals: alias, mode: 'insensitive' } } } })),
      ],
    },
    include: { aliases: true },
  });

  if (existing) {
    if (apply) {
      await prisma.brainEntity.update({
        where: { id: existing.id },
        data: {
          name,
          canonicalName: normalized,
          properties: mergeProperties(existing.properties, properties),
          status,
          visibility,
        },
      });
      for (const alias of aliases) {
        await prisma.brainEntityAlias.upsert({
          where: { entityId_alias: { entityId: existing.id, alias } },
          update: {},
          create: { entityId: existing.id, alias, source: SOURCE },
        });
      }
    }
    return { entity: { ...existing, name, canonicalName: normalized }, created: false };
  }

  if (!apply) {
    return {
      entity: { id: `[new:${entityType}:${normalized}]`, entityType, name, canonicalName: normalized, properties, status, visibility },
      created: true,
    };
  }

  const entity = await prisma.brainEntity.create({
    data: { entityType, name, canonicalName: normalized, properties, status, visibility },
    include: { aliases: true },
  });
  for (const alias of aliases) {
    await prisma.brainEntityAlias.upsert({
      where: { entityId_alias: { entityId: entity.id, alias } },
      update: {},
      create: { entityId: entity.id, alias, source: SOURCE },
    });
  }
  return { entity, created: true };
}

async function findOrCreateAssertion({ srcId, dstId, relType, ledgerEventId, metadata = {}, validFrom = OCCURRED_AT, confidence = 0.85 }) {
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
      validFrom,
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
  const existingCustomer = await prisma.brainEntity.findFirst({
    where: { entityType: 'Customer', canonicalName: 'renee owens', tombstonedAt: null },
    select: { id: true, entityType: true, name: true },
  });

  const existingLedger = await prisma.ledgerEvent.findFirst({
    where: { eventType: EVENT_TYPE, source: SOURCE, sourceId: SOURCE_ID, tombstonedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  const graphSeed = {
    analysis: {
      localEffortTypeChoice: 'BusinessLine was used because the live graph has BusinessLine entities and no Organization entities.',
      reneeIdentityChoice: 'The existing Person with reneelillianowens@gmail.com is normalized to legal name Renee Owens; existing Customer Renee Owens is referenced but not merged.',
      assertionReviewPosture: 'Assertions are provisional because approval, funding, questionnaire, document folder, and counsel review remain TBD.',
    },
    existingCustomerEntityId: existingCustomer?.id ?? null,
  };

  if (apply) {
    await prisma.ledgerEventSchema.upsert({
      where: { eventType_version: { eventType: EVENT_TYPE, version: SCHEMA_VERSION } },
      update: {},
      create: { eventType: EVENT_TYPE, version: SCHEMA_VERSION, schema: equityLedgerSchema },
    });
  }

  const localEffort = await findOrCreateEntity({
    entityType: 'BusinessLine',
    name: 'Local Effort',
    properties: {
      legalStructure: 'Minnesota 308B cooperative',
      taxPosture: 'Partnership-taxed cooperative',
      securitiesGovernanceNote: 'Founder/cofounder capitalization and member class mechanics still being formalized.',
    },
    aliases: ['Local Effort Cooperative'],
  });

  const renee = await findOrCreateEntity({
    entityType: 'Person',
    name: 'Renee Owens',
    properties: {
      legalName: 'Renee Owens',
      holderType: 'Investor / possible member category TBD',
      accreditedStatus: 'Non-accredited',
      securitiesResidency: 'TBD',
      contactStatus: 'TBD',
      relatedCustomerEntityId: existingCustomer?.id ?? null,
      visibility: 'private',
    },
    aliases: ['reneelillianowens@gmail.com', 'Reneelillianowens'],
  });

  const transaction = await findOrCreateEntity({
    entityType: 'LedgerTransaction',
    name: 'Renee Owens Future Non-Voting Equity Investment',
    properties: {
      ...ledgerEntry,
      brainEntityId: null,
      ledgerEventId: existingLedger?.id ?? null,
      reviewStatus: 'founder_and_counsel_review_needed',
    },
  });

  const disclosure = await findOrCreateEntity({
    entityType: 'Note',
    name: 'Renee Disclosure Pack v1',
    status: 'draft',
    properties: {
      documentType: 'Disclosure pack',
      version: 'v1',
      holderLegalName: 'Renee Owens',
      questionnaireReceived: 'Pending',
      documentFolder: 'TBD',
    },
  });

  const equityClass = await findOrCreateEntity({
    entityType: 'Asset',
    name: 'Future Non-Voting Equity Class',
    status: 'proposed',
    properties: {
      assetType: 'EquityClass',
      votingRights: 'Non-voting',
      classOrSeries: 'TBD',
      status: 'proposed',
    },
  });

  const capitalizationConstraint = await findOrCreateEntity({
    entityType: 'Constraint',
    name: 'Incomplete Founder/Cofounder Capitalization Formalities',
    properties: {
      constraintType: 'securities_governance',
      description: 'Founder/cofounder capitalization formalities remain incomplete and constrain the Renee future equity right.',
      severity: 5,
    },
  });

  const governanceConstraint = await findOrCreateEntity({
    entityType: 'Constraint',
    name: 'Governing Documents and Board/Member Approval Mechanics',
    properties: {
      constraintType: 'securities_governance',
      description: 'Future non-voting equity class remains subject to governing documents and board/member approval mechanics.',
      severity: 5,
    },
  });

  const accreditedStatus = await findOrCreateEntity({
    entityType: 'Status',
    name: 'Non-Accredited Investor',
    properties: {
      statusType: 'securities_accreditation',
      value: 'non-accredited',
      finalReviewNeeded: true,
    },
  });

  const workingCapital = await findOrCreateEntity({
    entityType: 'Asset',
    name: 'Local Effort Working Capital',
    properties: {
      assetType: 'WorkingCapital',
      businessLine: 'Local Effort',
    },
  });

  const payload = {
    ledgerPurpose: 'Canonical internal record of actual, promised, conditionally issuable, and future equity rights.',
    ledgerEntry: {
      ...ledgerEntry,
      brainEntityId: transaction.entity.id,
      ledgerEventId: existingLedger?.id ?? 'TBD until write',
    },
    graphSeed,
    entityIds: {
      localEffort: localEffort.entity.id,
      renee: renee.entity.id,
      transaction: transaction.entity.id,
      disclosure: disclosure.entity.id,
      equityClass: equityClass.entity.id,
      capitalizationConstraint: capitalizationConstraint.entity.id,
      governanceConstraint: governanceConstraint.entity.id,
      accreditedStatus: accreditedStatus.entity.id,
      workingCapital: workingCapital.entity.id,
    },
  };

  let ledgerEvent = existingLedger;
  let ledgerCreated = false;
  if (apply && !ledgerEvent) {
    ledgerEvent = await prisma.ledgerEvent.create({
      data: {
        eventType: EVENT_TYPE,
        schemaVersion: SCHEMA_VERSION,
        occurredAt: OCCURRED_AT,
        source: SOURCE,
        sourceId: SOURCE_ID,
        actorType: 'mcp:codex',
        payload,
      },
    });
    ledgerCreated = true;

    await prisma.brainEntity.update({
      where: { id: transaction.entity.id },
      data: {
        properties: {
          ...transaction.entity.properties,
          brainEntityId: transaction.entity.id,
          ledgerEventId: ledgerEvent.id,
        },
      },
    });
  }

  const ledgerEventId = ledgerEvent?.id ?? '[dry-run-ledger-event-id]';
  const assertions = [
    await findOrCreateAssertion({
      srcId: renee.entity.id,
      dstId: localEffort.entity.id,
      relType: 'INVESTS_IN',
      ledgerEventId,
      metadata: { ledgerId: ledgerEntry.ledgerId, amountPaidCents: ledgerEntry.amountPaidCents, instrumentType: ledgerEntry.instrumentType },
    }),
    await findOrCreateAssertion({
      srcId: transaction.entity.id,
      dstId: disclosure.entity.id,
      relType: 'EVIDENCED_BY',
      ledgerEventId,
      metadata: { disclosureVersion: ledgerEntry.disclosureVersion, questionnaireReceived: ledgerEntry.questionnaireReceived },
    }),
    await findOrCreateAssertion({
      srcId: transaction.entity.id,
      dstId: capitalizationConstraint.entity.id,
      relType: 'CONSTRAINED_BY',
      ledgerEventId,
      metadata: { reason: 'Incomplete founder/cofounder capitalization formalities' },
    }),
    await findOrCreateAssertion({
      srcId: equityClass.entity.id,
      dstId: governanceConstraint.entity.id,
      relType: 'CONSTRAINED_BY',
      ledgerEventId,
      metadata: { reason: 'Subject to governing documents and board/member approval mechanics' },
    }),
    await findOrCreateAssertion({
      srcId: renee.entity.id,
      dstId: accreditedStatus.entity.id,
      relType: 'HAS_STATUS',
      ledgerEventId,
      metadata: { statusContext: 'securities', value: 'non-accredited' },
    }),
    await findOrCreateAssertion({
      srcId: renee.entity.id,
      dstId: localEffort.entity.id,
      relType: 'APPROACHED',
      ledgerEventId,
      metadata: { context: 'Renee approached company regarding investment', source: 'agent_instruction' },
      confidence: 0.7,
    }),
    await findOrCreateAssertion({
      srcId: transaction.entity.id,
      dstId: workingCapital.entity.id,
      relType: 'CAPITALIZES',
      ledgerEventId,
      metadata: { amountPaidCents: ledgerEntry.amountPaidCents, purpose: 'working capital' },
    }),
    await findOrCreateAssertion({
      srcId: transaction.entity.id,
      dstId: workingCapital.entity.id,
      relType: 'HAS_MARGIN_DRIVER',
      ledgerEventId,
      metadata: { note: 'Optional working-capital/margin-driver link from seed instruction' },
      confidence: 0.65,
    }),
  ];

  const result = {
    ok: true,
    applied: apply,
    ledgerEvent: ledgerEvent ? { id: ledgerEvent.id, created: ledgerCreated, eventType: EVENT_TYPE, sourceId: SOURCE_ID } : null,
    entities: {
      localEffort,
      renee,
      transaction,
      disclosure,
      equityClass,
      capitalizationConstraint,
      governanceConstraint,
      accreditedStatus,
      workingCapital,
    },
    assertions: assertions.map((item) => ({ id: item.assertion.id, relType: item.assertion.relType, created: item.created })),
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
