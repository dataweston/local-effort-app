require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const PLANNER_UID = process.env.HUB_MASTER_SUPABASE_UID || '57063b69-34ba-4779-9321-0ebb47c4c19d';

const updates = [
  {
    id: 'event-2026-10-10-laura-dotson-wedding',
    revenueCents: 300000,
    cashReceivedCents: 41500,
    financialSource: 'Owner-confirmed $60/person for 50 anticipated guests; Square invoice 000055 paid July 19',
    metadata: {
      guestEstimate: 50,
      perPersonCents: 6000,
      depositCents: 41500,
      depositInvoiceId: '000055',
      depositPaidAt: '2026-07-19T19:52:11Z',
      balanceCents: 258500,
      currentRevenueEstimateCents: 300000,
      evidenceAsOf: '2026-08-15',
      pricingEvidence: 'owner_reported_empirical',
      depositEvidence: 'square_invoice_paid',
      depositLabel: 'deposit',
    },
    removeMetadataKeys: ['originalDepositEstimateBasisCents'],
    notes(record) {
      const operationalNotes = String(record.notes || '').split('\n\nPricing note:')[0].trim();
      return `${operationalNotes}\n\nPricing: $60/person for 50 anticipated guests ($3,000 expected total). Square invoice #000055 confirms the $415 deposit was paid July 19, leaving $2,585 to collect. Guest count remains an estimate until finalized.`;
    },
  },
  {
    id: 'event-2026-09-26-gigi-baby-shower',
    revenueCents: 175000,
    cashReceivedCents: 25000,
    financialSource: 'Owner-confirmed $45/person for 30 guests plus approximately $400 wine; Square invoice 000058 paid July 23',
    metadata: {
      guestEstimate: 30,
      perPersonCents: 4500,
      foodAndServiceCents: 135000,
      estimatedWineCents: 40000,
      depositCents: 25000,
      depositInvoiceId: '000058',
      depositPaidAt: '2026-07-23T18:52:57Z',
      balanceCents: 150000,
      currentRevenueEstimateCents: 175000,
      evidenceAsOf: '2026-08-15',
      pricingEvidence: 'owner_reported_empirical',
      depositEvidence: 'square_invoice_paid',
      wineEstimateNeedsFinalization: true,
    },
    notes() {
      return 'BOOKED - deposit received. Approximately 30 guests on September 26. Pricing is $45/person ($1,350) plus wine currently estimated at $400, for a $1,750 working total. Square invoice #000058 confirms the $250 deposit was paid July 23, leaving an estimated $1,500 to collect. Final revenue should be updated when the wine cost is known.';
    },
  },
];

async function main() {
  const existing = await prisma.plannerCard.findMany({
    where: { supabaseUid: PLANNER_UID, id: { in: updates.map((update) => update.id) } },
  });
  if (existing.length !== updates.length) {
    throw new Error(`Expected ${updates.length} planner events, found ${existing.length}`);
  }

  const proposed = updates.map((update) => {
    const record = existing.find((candidate) => candidate.id === update.id);
    return {
      id: update.id,
      title: record.title,
      revenueCents: update.revenueCents,
      cashReceivedCents: update.cashReceivedCents,
      balanceCents: update.revenueCents - update.cashReceivedCents,
    };
  });

  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'dry-run', proposed }, null, 2));
    return;
  }

  await prisma.$transaction(updates.map((update) => {
    const record = existing.find((candidate) => candidate.id === update.id);
    const retainedMetadata = { ...(record.financialMetadata || {}) };
    for (const key of update.removeMetadataKeys || []) delete retainedMetadata[key];
    return prisma.plannerCard.update({
      where: { id: update.id },
      data: {
        revenue: Math.round(update.revenueCents / 100),
        revenueCents: update.revenueCents,
        cashReceivedCents: update.cashReceivedCents,
        financialStatus: 'booked_deposit_received_estimate',
        financialSource: update.financialSource,
        financialMetadata: { ...retainedMetadata, ...update.metadata },
        notes: update.notes(record),
      },
    });
  }));

  const verified = await prisma.plannerCard.findMany({
    where: { supabaseUid: PLANNER_UID, id: { in: updates.map((update) => update.id) } },
    select: { id: true, title: true, revenueCents: true, cashReceivedCents: true, financialStatus: true, financialSource: true, financialMetadata: true },
    orderBy: { date: 'asc' },
  });
  console.log(JSON.stringify({ mode: 'applied', verified }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
