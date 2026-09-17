import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * Owner operating-model correction of 2026-09-15.
 *
 * Foodist becomes the primary production and small-event facility from
 * 2026-10-01 at a flat $1,800/month with unlimited included kitchen hours.
 * MSP Kitchenery (Hopkins) drops to a reserve kitchen for overflow, larger
 * events, and frozen-pizza CPG, and keeps an unresolved residual storage
 * charge for one or two months beyond its ~$350 September bill. Meal prep for
 * the Cooper household resumes 2026-09-27 at an owner-estimated $1,424/month
 * of food, with Localist dues billed separately through Square and not
 * recognized until a billing plan or invoice is activated.
 *
 * This correction was first written to the Brain interactively on 2026-09-15.
 * The script exists so the write is reproducible and auditable: it is keyed on
 * the ledger `sourceId`, so it reports `alreadyApplied` against any database
 * that already carries the event and only writes on a database that does not
 * (a restored snapshot, a clone, or a rebuilt Brain).
 *
 * Dry run by default; pass --apply to write.
 *
 *   node scripts/correct-brain-operating-model-2026-09-15.mjs
 *   node scripts/correct-brain-operating-model-2026-09-15.mjs --apply
 */

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const NOW = new Date();
const SOURCE = 'owner_correction';
const SOURCE_ID = 'owner-corrections:2026-09-15:operating-model-v1';
const EFFECTIVE_AS_OF = '2026-09-15';
const EVIDENCE = ['Owner instruction in coding session on 2026-09-15'];

const regulatoryGate = {
  agency: 'Minnesota Department of Agriculture',
  grocerySalesStatus: 'blocked_until_certified',
  certificationStatus: 'pending',
};

const primaryFacility = {
  facility: 'Foodist',
  nameStatus: 'working_name',
  pricingModel: 'flat_monthly',
  effectiveFrom: '2026-10-01',
  monthlyFixedCents: 180000,
  includedKitchenHours: 'unlimited',
  smallEventSpaceIncluded: true,
};

const reserveFacility = {
  role: 'reserve',
  uses: ['overflow', 'larger_events', 'frozen_pizza_cpg'],
  facility: 'MSP Kitchenery',
  location: 'Hopkins, Minnesota',
  temporaryStorageMonthsMax: 2,
  temporaryStorageMonthsMin: 1,
  postSeptemberMonthlyStorageCents: null,
};

const currentTransition = {
  month: '2026-09',
  steadyState: false,
  licensingHost: 'MSP Kitchenery',
  dayToDayPrepPricingModel: 'mostly_no_charge',
  expectedHopkinsBillCents: 35000,
};

const kitchenAccess = { regulatoryGate, primaryFacility, reserveFacility, currentTransition };

const mealPrepResume = {
  status: 'scheduled',
  effectiveFrom: '2026-09-27',
  customerEntityId: 'f4e717ab-454d-4b33-a64e-9033e6b10778',
  estimatePrecision: 'approximate',
  membershipDuesSeparate: true,
  ownerEstimatedIncreaseCents: 20000,
  ownerEstimatedMonthlyFoodTotalCents: 142400,
  priorObservedRecurringFoodTotalCents: 122400,
};

const membershipRevenueAssumptions = {
  asOf: EFFECTIVE_AS_OF,
  status: 'owner_directed_pending_activation',
  foodistOwners: {
    count: null,
    status: 'planned_unquantified',
    foodPlans: null,
    startDates: null,
    duesClasses: null,
  },
  recognitionRule:
    'Do not treat dues as booked or collected until the Square billing plan or invoice is activated.',
  billingAuthority: 'square',
  workingClassCode: 'localist_monthly',
  workingMonthlyDuesCents: 4500,
  plannedCurrentHouseholds: [
    { canonicalName: 'tyler cooper', customerEntityId: 'f4e717ab-454d-4b33-a64e-9033e6b10778' },
    { canonicalName: 'gabriella scarpa', customerEntityId: '866aacac-e8ab-4f34-b47d-dda68a5654af' },
    { canonicalName: 'levy family', customerEntityId: 'f573c4b0-5e59-4f02-a01d-6aea9811f71c' },
  ],
  duesSeparateFromFoodBilling: true,
};

const externalActions = {
  messagesSent: false,
  membershipActivated: false,
  squareChargesCreated: false,
};

async function exactEntity(tx, name, entityType) {
  const rows = await tx.brainEntity.findMany({ where: { name, entityType } });
  if (rows.length !== 1) throw new Error(`Expected one ${entityType} named "${name}"; found ${rows.length}`);
  return rows[0];
}

async function applyCorrection(tx) {
  const existing = await tx.ledgerEvent.findFirst({ where: { source: SOURCE, sourceId: SOURCE_ID } });
  if (existing) return { alreadyApplied: true, eventId: existing.id, occurredAt: existing.occurredAt };

  const [org, business, reserve] = await Promise.all([
    exactEntity(tx, 'Local Effort Cooperative', 'Organization'),
    exactEntity(tx, 'Local Effort', 'BusinessLine'),
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
        evidence: EVIDENCE,
        corrections: { kitchenAccess, mealPrepResume, membershipRevenueAssumptions },
        effectiveAsOf: EFFECTIVE_AS_OF,
        externalActions,
      },
    },
  });

  const operatingFactBasis = {
    source: SOURCE,
    confirmedAt: NOW.toISOString(),
    sourceEventId: event.id,
  };

  for (const entity of [org, business]) {
    await tx.brainEntity.update({
      where: { id: entity.id },
      data: {
        properties: {
          ...(entity.properties || {}),
          operatingFactBasis,
          kitchenAccess,
          membershipRevenueAssumptions,
        },
      },
    });
  }

  const primaryProperties = {
    role: 'primary production and small-event facility',
    workingName: true,
    kitchenAccess: primaryFacility,
    ownerConfirmedAt: NOW.toISOString(),
    relationshipStatus: 'scheduled_to_start',
    futureMealPrepMembers: {
      count: null,
      status: 'owner_reported_planned_unquantified',
      foodPlans: null,
      startDates: null,
      duesClasses: null,
      sourceEventId: event.id,
    },
  };

  const primaryRows = await tx.brainEntity.findMany({ where: { name: 'Foodist', entityType: 'Vendor' } });
  if (primaryRows.length > 1) throw new Error(`Expected at most one Vendor named "Foodist"; found ${primaryRows.length}`);
  let primaryCreated = false;
  if (primaryRows.length === 1) {
    await tx.brainEntity.update({
      where: { id: primaryRows[0].id },
      data: { properties: { ...(primaryRows[0].properties || {}), ...primaryProperties } },
    });
  } else {
    await tx.brainEntity.create({
      data: {
        entityType: 'Vendor',
        name: 'Foodist',
        canonicalName: 'foodist',
        properties: primaryProperties,
      },
    });
    primaryCreated = true;
  }

  await tx.brainEntity.update({
    where: { id: reserve.id },
    data: {
      properties: {
        ...(reserve.properties || {}),
        role: 'reserve kitchen',
        kitchenAccess: reserveFacility,
        sourceEventId: event.id,
        ownerConfirmedAt: NOW.toISOString(),
      },
    },
  });

  return {
    alreadyApplied: false,
    eventId: event.id,
    updated: {
      organizationKitchenAccess: true,
      businessLineKitchenAccess: true,
      membershipRevenueAssumptions: true,
      primaryFacilityVendor: primaryCreated ? 'created' : 'updated',
      reserveFacilityVendor: 'updated',
    },
  };
}

async function main() {
  if (!APPLY) {
    const existing = await prisma.ledgerEvent.findFirst({ where: { source: SOURCE, sourceId: SOURCE_ID } });
    console.log(JSON.stringify({
      mode: 'dry-run',
      sourceId: SOURCE_ID,
      alreadyAppliedToThisDatabase: Boolean(existing),
      existingEventId: existing?.id || null,
      wouldWrite: { kitchenAccess, mealPrepResume, membershipRevenueAssumptions },
      hint: existing
        ? 'Event already present; --apply would be a no-op.'
        : 'Re-run with --apply to write.',
    }, null, 2));
    return;
  }
  const result = await prisma.$transaction((tx) => applyCorrection(tx), { timeout: 30000 });
  console.log(JSON.stringify({ mode: 'apply', ...result }, null, 2));
}

main()
  .catch((error) => { console.error('FAILED:', error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
