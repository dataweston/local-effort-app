const { PrismaClient } = require('@prisma/client');
const { writeLedgerEvent } = require('../backend/api/brain/ledger');

for (const file of ['.env', '.env.local', '.env.production.local', '.env.vercel.production']) {
  require('dotenv').config({ path: file, override: false });
}

const APPLY = process.argv.includes('--apply');
const EVIDENCE_AS_OF = '2026-08-15';
const prisma = new PrismaClient();

async function loadTargets() {
  const entities = await prisma.brainEntity.findMany({
    where: {
      entityType: 'Customer',
      tombstonedAt: null,
      name: { equals: 'Sanjay Roy', mode: 'insensitive' },
    },
    select: { id: true, name: true, localEffortCustomerId: true, properties: true },
  });
  if (entities.length !== 1) throw new Error(`Expected one Sanjay Roy Brain entity, found ${entities.length}`);

  const events = await prisma.ledgerEvent.findMany({
    where: {
      source: 'local_budget',
      eventType: 'payment.received',
      tombstonedAt: null,
      OR: [
        { payload: { path: ['description'], string_contains: 'Sanjay' } },
        { payload: { path: ['merchantName'], string_contains: 'Sanjay' } },
      ],
    },
    select: { id: true, occurredAt: true, payload: true },
    orderBy: { occurredAt: 'asc' },
  });
  return { entity: entities[0], events };
}

async function main() {
  const { entity, events } = await loadTargets();
  const totalCents = events.reduce((sum, event) => sum + Number(event.payload?.amountCents || 0), 0);
  const stripeEvidence = entity.properties?.unifiedCustomersCsv || {};
  const stripePaymentCount = Number(stripeEvidence.paymentCount || 0);
  const stripeGrossChargesCents = Number(stripeEvidence.totalSpendCents || 0);
  const stripeRefundedCents = Number(stripeEvidence.refundedVolumeCents || 0);
  const preview = {
    mode: APPLY ? 'apply' : 'dry-run',
    customerEntityId: entity.id,
    localEffortCustomerId: entity.localEffortCustomerId,
    paymentCount: events.length,
    totalCents,
    earliestPayment: events[0]?.occurredAt || null,
    latestPayment: events.at(-1)?.occurredAt || null,
    alreadyAttributed: events.filter((event) => event.payload?.customerEntityId === entity.id).length,
  };
  console.log(JSON.stringify(preview, null, 2));
  if (!APPLY) return;

  await prisma.$transaction(events.map((event) => prisma.ledgerEvent.update({
    where: { id: event.id },
    data: {
      payload: {
        ...(event.payload || {}),
        customerEntityId: entity.id,
        customerName: entity.name,
        paymentMethod: 'zelle',
        squareMatchPending: false,
        attributionSource: 'local_budget_description_owner_confirmed',
        attributionEvidenceAsOf: EVIDENCE_AS_OF,
      },
    },
  })));

  await prisma.brainEntity.update({
    where: { id: entity.id },
    data: {
      properties: {
        ...(entity.properties || {}),
        mealPrepCustomerSince: '2024-06-10',
        paymentHistoryCoverage: {
          verifiedLocalBudgetFrom: '2025-02-17',
          verifiedLocalBudgetThrough: '2026-08-08',
          verifiedPaymentCount: events.length,
          verifiedPaymentTotalCents: totalCents,
          stripeAggregate: {
            source: 'stripe_unified_customers_csv',
            paymentCount: stripePaymentCount,
            grossChargesCents: stripeGrossChargesCents,
            refundedCents: stripeRefundedCents,
            netAfterRefundsCents: stripeGrossChargesCents - stripeRefundedCents,
            individualLedgerEvents: 0,
            cashTimingAvailable: false,
          },
          unresolvedProcessorPeriod: {
            processor: 'stripe',
            from: '2024-06-10',
            through: '2025-02-16',
            status: 'aggregate_available_cash_timing_unreconciled',
          },
          evidenceAsOf: EVIDENCE_AS_OF,
        },
      },
    },
  });

  await writeLedgerEvent({
    eventType: 'customer.payment_attribution.backfilled',
    source: 'operator:sanjay-zelle-reconciliation',
    sourceId: `sanjay-zelle-attribution:${EVIDENCE_AS_OF}`,
    actorType: 'operator',
    payload: {
      customerEntityId: entity.id,
      customerName: entity.name,
      paymentMethod: 'zelle',
      paymentCount: events.length,
      totalCents,
      earliestPayment: events[0]?.occurredAt || null,
      latestPayment: events.at(-1)?.occurredAt || null,
      evidenceAsOf: EVIDENCE_AS_OF,
    },
    updatePayload: true,
  });

  await writeLedgerEvent({
    eventType: 'customer.payment_history.coverage_gap',
    source: 'operator:sanjay-payment-reconciliation',
    sourceId: 'sanjay-stripe-history-gap:2024-06-10:2025-02-16',
    actorType: 'operator',
    payload: {
      customerEntityId: entity.id,
      customerName: entity.name,
      processor: 'stripe',
      periodStart: '2024-06-10',
      periodEnd: '2025-02-16',
      status: 'unresolved_not_counted_as_revenue',
      stripeAggregate: {
        source: 'stripe_unified_customers_csv',
        paymentCount: stripePaymentCount,
        grossChargesCents: stripeGrossChargesCents,
        refundedCents: stripeRefundedCents,
        netAfterRefundsCents: stripeGrossChargesCents - stripeRefundedCents,
        individualLedgerEvents: 0,
        cashTimingAvailable: false,
      },
      evidence: [
        { source: 'gmail', subject: 'Local Effort Meal Plan', date: '2024-06-10', fact: 'weekly Stripe billing established' },
        { source: 'gmail', subject: 'Local Effort Extra Charges Need Refund ASAP', date: '2024-12-17', fact: 'five $275 charges alleged; refunds and settlement disputed' },
        { source: 'gmail', subject: 'Re: Local Effort Extra Charges Need Refund ASAP', date: '2024-12-17', fact: 'operator estimated two or possibly three weeks owed; one refund pending; Stripe cash receipt unclear' },
      ],
      accountingTreatment: 'Do not add revenue until Stripe settlements, refunds, and service weeks reconcile.',
      evidenceAsOf: EVIDENCE_AS_OF,
    },
    updatePayload: true,
  });

  const verified = await loadTargets();
  const attributed = verified.events.filter((event) => (
    event.payload?.customerEntityId === entity.id
    && event.payload?.paymentMethod === 'zelle'
    && event.payload?.squareMatchPending === false
  ));
  if (attributed.length !== events.length) {
    throw new Error(`Post-write verification failed: ${attributed.length}/${events.length} payments attributed`);
  }
  console.log(JSON.stringify({ mode: 'applied', paymentCount: events.length, verifiedAttributed: attributed.length }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
