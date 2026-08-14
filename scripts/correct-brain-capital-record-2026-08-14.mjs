import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const NOW = new Date();
const SOURCE = 'owner_correction';
const SOURCE_ID = 'owner-corrections:2026-08-14:capital-master-v2-3';
const ACTOR = 'founder:weston-smith';

const founderCompPolicy = {
  effectiveFrom: '2026-04-01',
  assessmentTiming: 'month_end',
  westonAnnualCents: 4500000,
  catherineAnnualCents: 4500000,
  combinedAnnualCents: 9000000,
  combinedMonthlyCents: 750000,
  personalTransactionsOffsetAccrual: true,
};

const kitchenAccess = {
  facility: 'MSP Kitchenery',
  location: 'Hopkins, Minnesota',
  effectiveFrom: '2026-08-01',
  pricingModel: 'hourly_plus_fixed_fees',
  hourlyRateCents: 2500,
  monthlyFeesCents: 15000,
  monthlyStorageCents: 20000,
  monthlyFixedCents: 35000,
  typicalMonthlyHoursMin: 80,
  typicalMonthlyHoursMax: 100,
  priorTieredKitchenTermsSuperseded: true,
};

async function exactEntity(tx, name, entityType) {
  const rows = await tx.brainEntity.findMany({ where: { name, entityType } });
  if (rows.length !== 1) throw new Error(`Expected one ${entityType} named "${name}"; found ${rows.length}`);
  return rows[0];
}

async function applyCorrection(tx) {
  const existing = await tx.ledgerEvent.findFirst({ where: { source: SOURCE, sourceId: SOURCE_ID } });
  if (existing) return { alreadyApplied: true, eventId: existing.id };

  const [org, business, snapshot, transfer, facility] = await Promise.all([
    exactEntity(tx, 'Local Effort Cooperative', 'Organization'),
    exactEntity(tx, 'Local Effort', 'BusinessLine'),
    exactEntity(tx, 'Local Effort Cooperative Current Fully Diluted Cap Table', 'CapitalizationSnapshot'),
    exactEntity(tx, 'Weston Smith to Catherine Olsen 10% Equity Transfer', 'LedgerTransaction'),
    exactEntity(tx, 'Msp Kitchenery', 'Vendor'),
  ]);

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
        effectiveAsOf: '2026-08-14',
        corrections: {
          capitalization: {
            confirmedCurrent: true,
            holders: [
              { holder: 'Catherine Olsen', percent: 56.5 },
              { holder: 'Weston Smith', percent: 36.5 },
              { holder: 'Sarah Olsen', percent: 5 },
              { holder: 'Renee Owens', percent: 2 },
            ],
            womenHeldPercent: 63.5,
            transfer: {
              from: 'Weston Smith', to: 'Catherine Olsen', percent: 10,
              effectiveDate: '2026-07-28', consideration: 'none',
              purpose: 'cofounder ownership rebalance',
            },
          },
          founderCompensation: founderCompPolicy,
          kitchenAccess,
        },
        evidence: ['Owner confirmation in Codex conversation on 2026-08-14'],
      },
    },
  });

  for (const entity of [org, business]) {
    await tx.brainEntity.update({
      where: { id: entity.id },
      data: {
        properties: {
          ...(entity.properties || {}),
          factBasis: { source: SOURCE, correctedAt: NOW.toISOString(), sourceEventId: event.id },
          founderCompPolicy,
          kitchenAccess,
        },
      },
    });
  }

  await tx.brainEntity.update({
    where: { id: snapshot.id },
    data: {
      properties: {
        ...(snapshot.properties || {}),
        correctedAt: NOW.toISOString(),
        lastTransfer: {
          from: 'Weston Smith', to: 'Catherine Olsen', percent: 10,
          effectiveDate: '2026-07-28', consideration: 'none',
          purpose: 'cofounder ownership rebalance', confirmedAt: NOW.toISOString(),
        },
      },
    },
  });

  await tx.brainEntity.update({
    where: { id: transfer.id },
    data: {
      properties: {
        ...(transfer.properties || {}),
        effectiveDate: '2026-07-28',
        consideration: 'none',
        considerationAmountCents: 0,
        purpose: 'cofounder ownership rebalance',
        ownerConfirmedAt: NOW.toISOString(),
      },
    },
  });

  await tx.brainEntity.update({
    where: { id: facility.id },
    data: {
      properties: {
        ...(facility.properties || {}),
        role: 'current production facility',
        location: 'Hopkins, Minnesota',
        kitchenAccess,
        ownerConfirmedAt: NOW.toISOString(),
      },
    },
  });

  const transferAssertions = await tx.brainAssertion.findMany({
    where: {
      srcId: transfer.id,
      relType: { in: ['TRANSFERS_EQUITY_FROM', 'TRANSFERS_EQUITY_TO'] },
      knownUntil: null,
      retractedAt: null,
    },
  });
  for (const assertion of transferAssertions) {
    await tx.brainAssertion.update({
      where: { id: assertion.id },
      data: {
        metadata: {
          ...(assertion.metadata || {}),
          effectiveDate: '2026-07-28',
          consideration: 'none',
          purpose: 'cofounder ownership rebalance',
          confirmedByEventId: event.id,
        },
      },
    });
  }

  return { alreadyApplied: false, eventId: event.id, updated: {
    founderCompensation: true, kitchenAccess: true, transferDetails: true,
  } };
}

async function main() {
  if (!APPLY) {
    console.log(JSON.stringify({
      mode: 'dry-run', sourceId: SOURCE_ID,
      wouldWrite: { founderCompPolicy, kitchenAccess, transfer: {
        effectiveDate: '2026-07-28', consideration: 'none', purpose: 'cofounder ownership rebalance',
      } },
      hint: 'Re-run with --apply to write.',
    }, null, 2));
    return;
  }
  const result = await prisma.$transaction((tx) => applyCorrection(tx), { timeout: 30000 });
  console.log(JSON.stringify({ mode: 'apply', ...result }, null, 2));
}

main()
  .catch((error) => { console.error('FAILED:', error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
