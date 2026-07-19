import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const NOW = new Date();
const SOURCE = 'owner_correction';
const SOURCE_ID = 'owner-corrections:2026-07-18:economist-facts-v2';
const ACTOR = 'founder:weston-smith';

const merge = (current, patch) => ({ ...(current || {}), ...patch });

async function exactEntity(tx, name, entityType) {
  const rows = await tx.brainEntity.findMany({
    where: { name, ...(entityType ? { entityType } : {}) },
  });
  if (rows.length !== 1) {
    throw new Error(`Expected one ${entityType || 'entity'} named ${name}; found ${rows.length}`);
  }
  return rows[0];
}

async function oneOfEntity(tx, names, entityType) {
  const rows = await tx.brainEntity.findMany({
    where: { name: { in: names }, entityType },
  });
  if (rows.length !== 1) {
    throw new Error(`Expected one ${entityType} named one of [${names.join(', ')}]; found ${rows.length}`);
  }
  return rows[0];
}

async function replaceAssertions(tx, where, replacements, eventId, reason) {
  const old = await tx.brainAssertion.findMany({
    where: { ...where, knownUntil: null, retractedAt: null },
  });
  const created = [];
  for (const replacement of replacements) {
    created.push(await tx.brainAssertion.create({
      data: {
        ...replacement,
        validFrom: NOW,
        knownFrom: NOW,
        confidence: 1,
        sourceType: SOURCE,
        sourceId: eventId,
        createdBy: ACTOR,
        provisional: false,
        confirmedAt: NOW,
        confirmedBy: ACTOR,
      },
    }));
  }
  for (const prior of old) {
    await tx.brainAssertion.update({
      where: { id: prior.id },
      data: {
        knownUntil: NOW,
        supersededAt: NOW,
        supersededBy: created[0]?.id || null,
        supersededReason: reason,
      },
    });
  }
  return { superseded: old.length, created: created.length };
}

async function loadTargets(tx) {
  const [org, business, maria, mariaJob, mariaEquity, renee, reneeTxn, sarah, sarahTrust,
    weston, catherine, snapshot, laborConstraint, seasonalConstraint] = await Promise.all([
    exactEntity(tx, 'Local Effort Cooperative', 'Organization'),
    exactEntity(tx, 'Local Effort', 'BusinessLine'),
    exactEntity(tx, 'Maria Beck', 'Person'),
    exactEntity(tx, 'Maria Beck Chef Offer', 'JobOffer'),
    oneOfEntity(tx, ['Maria Beck 0.5% Worker Equity Offer', 'Maria Beck 1% Worker Equity Offer'], 'EquityGrant'),
    exactEntity(tx, 'Renee Owens', 'Person'),
    exactEntity(tx, 'Renee Owens Future Non-Governance Profit Interest Investment', 'LedgerTransaction'),
    exactEntity(tx, 'Sarah Olsen', 'Person'),
    exactEntity(tx, 'Sarah Olsen Contribution Trust', 'Trust'),
    exactEntity(tx, 'Weston Smith', 'Person'),
    exactEntity(tx, 'Catherine Olsen', 'Person'),
    oneOfEntity(tx, [
      'Local Effort Cooperative Cap Table - Fully Diluted Pre-Money After Renee',
      'Local Effort Cooperative Current Fully Diluted Cap Table',
    ], 'CapitalizationSnapshot'),
    exactEntity(tx, 'Labor Hours', 'Constraint'),
    exactEntity(tx, 'Seasonal Ingredient Availability', 'Constraint'),
  ]);
  return { org, business, maria, mariaJob, mariaEquity, renee, reneeTxn, sarah, sarahTrust,
    weston, catherine, snapshot, laborConstraint, seasonalConstraint };
}

async function correct(tx) {
  const existing = await tx.ledgerEvent.findFirst({ where: { source: SOURCE, sourceId: SOURCE_ID } });
  if (existing) return { alreadyApplied: true, eventId: existing.id };
  const t = await loadTargets(tx);

  const event = await tx.ledgerEvent.create({
    data: {
      eventType: 'business.facts.corrected',
      schemaVersion: 1,
      occurredAt: NOW,
      source: SOURCE,
      sourceId: SOURCE_ID,
      actorType: 'founder',
      actorId: 'Weston Smith',
      payload: {
        effectiveAsOf: '2026-07-18',
        corrections: {
          capitalization: {
            basis: 'fully diluted',
            holders: [
              { holder: 'Weston Smith', percent: 45.5 },
              { holder: 'Catherine Olsen', percent: 47.5 },
              { holder: 'Sarah Olsen', percent: 5 },
              { holder: 'Renee Owens', percent: 2, cashPaidCents: 600000, source: 'Weston Smith' },
            ],
            totalsToPercent: 100,
            mariaOffer: { percent: 1, accepted: false, includedInCapTable: false },
          },
          mariaEmployment: {
            status: 'active', payrollProvider: 'Square Payroll', hourlyRateCents: 3500,
            documentedWorkingFrom: '2026-05-31', exactStartDateKnown: false,
            documentedGrossThrough2026_06_15Cents: 154000,
            additionalOwnerEstimatedGrossCents: 50000,
          },
          kitchenAccess: {
            first20HoursHourlyCents: 4000, additionalHoursHourlyCents: 3500,
            monthlyStorageCents: 20000, flatMonthlyRent: false,
          },
          founderComp: {
            effectiveFrom: '2026-04-01', assessed: 'month_end',
            westonAnnualCents: 9000000, catherineAnnualCents: 7000000,
            combinedMonthlyCents: 1333333, personalTransactionsOffsetAccrual: true,
          },
          localFirst: {
            inventoryShareRangePercent: [75, 85], isLooseTarget: true,
            includes: ['inventory sourcing', 'aesthetics', 'branding', 'menu design', 'branded/proprietary details'],
          },
          capitalRaise: { status: 'ready_to_go', channels: ['Wefunder', 'SMBX'], financialModelAvailable: false },
        },
        retiredClaims: [
          'annual gross revenue is approximately $120,000',
          'EBITDA margin is approximately 20%',
          'kitchen rent is a flat $1,850 per month',
          'PropCo/OpCo is a current strategy',
          'SBA 504/C-PACE are current financing assumptions',
        ],
        evidence: [
          'Founder corrections in Codex conversation on 2026-07-18',
          'Owner-supplied Square Payroll paystubs covering 2026-05-22 through 2026-06-24',
          'Local Budget classifications and transactions through 2026-07-18',
        ],
      },
    },
  });

  const commonBusinessFacts = {
    factBasis: { source: SOURCE, correctedAt: NOW.toISOString() },
    kitchenAccess: {
      pricingModel: 'hourly_tiered', first20HoursHourlyCents: 4000,
      additionalHoursHourlyCents: 3500, monthlyStorageCents: 20000,
      formula: '20000 + 4000*min(hours,20) + 3500*max(hours-20,0)', flatMonthlyRent: false,
    },
    localFirstPolicy: {
      inventoryShareTargetMinPct: 75, inventoryShareTargetMaxPct: 85, isLooseTarget: true,
      additionalScope: ['aesthetics', 'branding', 'menu design', 'branded/proprietary details'],
    },
    founderCompPolicy: {
      effectiveFrom: '2026-04-01', assessmentTiming: 'month_end',
      westonAnnualCents: 9000000, catherineAnnualCents: 7000000,
      combinedMonthlyCents: 1333333, personalTransactionsOffsetAccrual: true,
    },
    capitalRaise: { status: 'ready_to_go', channels: ['Wefunder', 'SMBX'], financialModelAvailable: false },
    retiredClaims: {
      annualGross120k: true, ebitdaMargin20Pct: true, flatKitchenRent1850: true,
      propCoOpCoCurrentStrategy: true, sba504CpaceCurrentAssumption: true,
    },
    managerialBusinessLineTaxonomy: { status: 'not_chosen' },
  };

  for (const entity of [t.org, t.business]) {
    await tx.brainEntity.update({
      where: { id: entity.id },
      data: { properties: merge(entity.properties, commonBusinessFacts) },
    });
  }

  await tx.brainEntity.update({
    where: { id: t.maria.id },
    data: { properties: merge(t.maria.properties, {
      title: 'Chef', workforceStatus: 'active', startStatus: 'started', payrollProvider: 'Square Payroll',
      hourlyKitchenRateCents: 3500, documentedWorkingFrom: '2026-05-31', exactStartDate: null,
      payrollEvidence: { documentedHoursThrough2026_06_15: 44, documentedGrossCents: 154000,
        additionalOwnerEstimatedGrossCents: 50000 },
      offeredEquityPercent: 1, equityOfferStatus: 'offered_not_accepted', ownsEquityPercent: 0,
    }) },
  });
  await tx.brainEntity.update({
    where: { id: t.mariaJob.id },
    data: { properties: merge(t.mariaJob.properties, {
      status: 'accepted_started', startStatus: 'started', documentedWorkingFrom: '2026-05-31',
      exactStartDate: null, payrollProvider: 'Square Payroll', offeredEquityPercent: 1,
      equityOfferStatus: 'offered_not_accepted',
    }) },
  });
  await tx.brainEntity.update({
    where: { id: t.mariaEquity.id },
    data: {
      name: 'Maria Beck 1% Worker Equity Offer', status: 'offered_unaccepted',
      properties: merge(t.mariaEquity.properties, {
        offeredPercent: 1, accepted: false, issuanceStatus: 'offered_not_accepted',
        vestingClockStatus: 'not_started', startDate: null, includedInCapTable: false,
      }),
    },
  });

  await tx.brainEntity.update({
    where: { id: t.renee.id },
    data: { properties: merge(t.renee.properties, {
      purchasePriceCents: 600000, postTrustPostReneeEquityPercent: 2,
      equityPercent: 2, equitySource: 'Weston Smith', ownershipConfirmedByFounder: true,
    }) },
  });
  await tx.brainEntity.update({
    where: { id: t.reneeTxn.id },
    data: { properties: merge(t.reneeTxn.properties, {
      economicRights: '2.00% equity/profit interest; legal class and paperwork details remain subject to review',
      amountPaidCents: 600000, purchasePriceCents: 600000, amountPaidDisplay: '$6,000',
      transferredPercent: 2, pricePerOnePercentCents: 300000, sourceEquityHolder: 'Weston Smith',
      sourceEquityHolderEntityId: t.weston.id, ownershipConfirmedByFounder: true,
    }) },
  });
  await tx.brainEntity.update({
    where: { id: t.sarah.id },
    data: { properties: merge(t.sarah.properties, { equityPercent: 5, ownershipConfirmedByFounder: true }) },
  });
  await tx.brainEntity.update({
    where: { id: t.sarahTrust.id },
    data: { status: 'superseded', properties: merge(t.sarahTrust.properties, {
      currentOwnershipRepresentation: 'Sarah Olsen directly', supersededByOwnerCorrectionAt: NOW.toISOString(),
    }) },
  });

  const capHolders = [
    { entity: t.weston, percent: 45.5, source: 'initial 50%, minus 2.5% to Sarah Olsen, minus 2% to Renee Owens' },
    { entity: t.catherine, percent: 47.5, source: 'initial 50%, minus 2.5% to Sarah Olsen' },
    { entity: t.sarah, percent: 5, source: '2.5% from Weston Smith and 2.5% from Catherine Olsen' },
    { entity: t.renee, percent: 2, source: 'purchased from Weston Smith for $6,000', cashPaidCents: 600000 },
  ];
  await tx.brainEntity.update({
    where: { id: t.snapshot.id },
    data: {
      name: 'Local Effort Cooperative Current Fully Diluted Cap Table', status: 'active',
      properties: merge(t.snapshot.properties, {
        holderPercents: capHolders.map(({ entity, percent, source }) => ({ holder: entity.name, percent, source })),
        snapshotMoment: 'current after Sarah Olsen 5% and Renee Owens 2%; excludes Maria Beck unaccepted 1% offer',
        totalsToPercent: 100, mariaUnacceptedOfferPercent: 1, correctedAt: NOW.toISOString(),
      }),
    },
  });

  await tx.brainEntity.update({
    where: { id: t.laborConstraint.id },
    data: { properties: merge(t.laborConstraint.properties, {
      description: 'Founder and chef labor remains a production constraint; active team includes Weston, Catherine, and Maria. Capacity must be measured rather than assumed to be single-operator.',
      singleOperatorClaimSuperseded: true, correctedAt: NOW.toISOString(),
    }) },
  });
  await tx.brainEntity.update({
    where: { id: t.seasonalConstraint.id },
    data: { properties: merge(t.seasonalConstraint.properties, {
      description: 'A loose 75-85% local inventory target creates seasonal menu and sourcing constraints; local-first also materially shapes aesthetics, branding, menu design, and proprietary details.',
      localInventoryTargetMinPct: 75, localInventoryTargetMaxPct: 85,
    }) },
  });

  const stats = {};
  stats.mariaHired = await replaceAssertions(tx,
    { srcId: t.maria.id, dstId: t.org.id, relType: 'HIRED_BY' },
    [{ srcId: t.maria.id, dstId: t.org.id, relType: 'HIRED_BY', metadata: {
      status: 'active', title: 'Chef', documentedWorkingFrom: '2026-05-31', payrollProvider: 'Square Payroll',
    } }], event.id, 'Maria is actively working and paid through Square Payroll');
  stats.mariaEmploymentOffer = await replaceAssertions(tx,
    { srcId: t.mariaJob.id, dstId: t.maria.id, relType: 'OFFERED_TO' },
    [{ srcId: t.mariaJob.id, dstId: t.maria.id, relType: 'OFFERED_TO', metadata: { status: 'accepted_started' } }],
    event.id, 'Employment accepted and started');
  stats.mariaEquityOffer = await replaceAssertions(tx,
    { OR: [
      { srcId: t.mariaJob.id, dstId: t.mariaEquity.id, relType: 'OFFERS_EQUITY_RIGHT' },
      { srcId: t.mariaEquity.id, dstId: t.maria.id, relType: 'OFFERED_TO' },
      { srcId: t.mariaEquity.id, relType: 'VESTS_UNDER' },
    ] },
    [
      { srcId: t.mariaJob.id, dstId: t.mariaEquity.id, relType: 'OFFERS_EQUITY_RIGHT', metadata: { offeredPercent: 1, accepted: false } },
      { srcId: t.mariaEquity.id, dstId: t.maria.id, relType: 'OFFERED_TO', metadata: { offeredPercent: 1, accepted: false, includedInCapTable: false } },
    ], event.id, 'Maria was offered 1% and has not accepted; no ownership or vesting recorded');

  stats.capTable = await replaceAssertions(tx,
    { dstId: t.org.id, relType: 'HOLDS_EQUITY_IN' },
    capHolders.map(({ entity, percent, source, cashPaidCents }) => ({
      srcId: entity.id, dstId: t.org.id, relType: 'HOLDS_EQUITY_IN', metadata: {
        basis: 'fully diluted', percent, source, snapshotId: t.snapshot.id,
        ...(cashPaidCents ? { cashPaidCents } : {}),
      },
    })), event.id, 'Founder-confirmed fully diluted cap table correction');

  const reneeRelationshipSpecs = [
    { where: { srcId: t.reneeTxn.id, dstId: t.renee.id, relType: 'TRANSFERS_EQUITY_TO' }, metadata: { source: 'Weston Smith', percent: 2, cashPaidCents: 600000 } },
    { where: { srcId: t.reneeTxn.id, dstId: t.weston.id, relType: 'TRANSFERS_EQUITY_FROM' }, metadata: { recipient: 'Renee Owens', percent: 2, cashPaidCents: 600000 } },
  ];
  stats.reneeTransfers = { superseded: 0, created: 0 };
  for (const spec of reneeRelationshipSpecs) {
    const result = await replaceAssertions(tx, spec.where, [{ ...spec.where, metadata: spec.metadata }], event.id,
      'Renee ownership corrected to 2% purchased from Weston for $6,000');
    stats.reneeTransfers.superseded += result.superseded;
    stats.reneeTransfers.created += result.created;
  }
  const oldMoneyAssertions = await tx.brainAssertion.findMany({
    where: {
      knownUntil: null, retractedAt: null,
      OR: [
        { srcId: t.renee.id, relType: 'INVESTS_IN' },
        { srcId: t.reneeTxn.id, relType: 'CAPITALIZES' },
      ],
    },
  });
  for (const old of oldMoneyAssertions) {
    const metadata = merge(old.metadata, { amountPaidCents: 600000, percent: 2 });
    const fresh = await tx.brainAssertion.create({ data: {
      srcId: old.srcId, dstId: old.dstId, relType: old.relType, metadata,
      validFrom: NOW, knownFrom: NOW, confidence: 1, sourceType: SOURCE, sourceId: event.id,
      createdBy: ACTOR, provisional: false, confirmedAt: NOW, confirmedBy: ACTOR,
    } });
    await tx.brainAssertion.update({ where: { id: old.id }, data: {
      knownUntil: NOW, supersededAt: NOW, supersededBy: fresh.id,
      supersededReason: 'Renee investment corrected to $6,000 for 2%',
    } });
  }
  stats.reneeMoneyAssertions = { superseded: oldMoneyAssertions.length, created: oldMoneyAssertions.length };

  return { alreadyApplied: false, eventId: event.id, stats };
}

try {
  if (!APPLY) {
    const targets = await loadTargets(prisma);
    const currentHoldings = await prisma.brainAssertion.findMany({
      where: { dstId: targets.org.id, relType: 'HOLDS_EQUITY_IN', knownUntil: null, retractedAt: null },
      include: { src: { select: { name: true } } },
    });
    console.log(JSON.stringify({ mode: 'dry-run', sourceId: SOURCE_ID,
      currentHoldings: currentHoldings.map(x => ({ holder: x.src.name, metadata: x.metadata })),
      intendedHoldings: [
        { holder: 'Weston Smith', percent: 45.5 }, { holder: 'Catherine Olsen', percent: 47.5 },
        { holder: 'Sarah Olsen', percent: 5 }, { holder: 'Renee Owens', percent: 2, cashPaidCents: 600000 },
      ], maria: { employment: 'active', equityOfferPercent: 1, equityAccepted: false },
    }, null, 2));
  } else {
    const result = await prisma.$transaction(tx => correct(tx), { timeout: 30000 });
    console.log(JSON.stringify({ mode: 'apply', ...result }, null, 2));
  }
} finally {
  await prisma.$disconnect();
}
