/**
 * Small events → Finance Core.
 *
 * The small-events flow already has real native records: an estimate, a date
 * hold, and Square deposit payments. What it has never had is a statement of
 * what is *owed* — the deposit and the balance behind it — so an event that is
 * booked and half-paid looks the same in aggregate as one that is fully paid.
 *
 * Mapping:
 *   estimate            → CommercialOrder (channel small_events, line: events)
 *   deposit             → CommercialInvoice `<estimate>:deposit`
 *   remaining balance   → CommercialInvoice `<estimate>:balance`, only once the
 *                         event is confirmed
 *   SmallEventPayment   → FinancePaymentTransaction + FIFO allocation
 *
 * The balance invoice is deliberately withheld until confirmation. An estimate
 * is a quote, and quoting is not billing: raising AR against work nobody has
 * agreed to would inflate receivables with pipeline.
 */

const { applyPaymentFifo, fifoOrder, recordPaymentTransaction } = require('./receivables');

const SOURCE_SYSTEM = 'small_events';
const CHANNEL = 'small_events';
const BUSINESS_LINE_KEY = 'events';

/** An estimate is pipeline until it is confirmed; only then is it booked work. */
function orderStatus(estimate) {
  const status = String(estimate?.status || '').trim().toLowerCase();
  if (status === 'confirmed') return 'booked';
  if (status === 'expired') return 'expired';
  return 'quoted';
}

function eventDate(estimate) {
  const raw = String(estimate?.eventDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildLines(estimate) {
  const subtotalCents = Math.round(Number(estimate?.subtotalCents) || 0);
  if (!subtotalCents) return [];
  const guests = Number(estimate?.guestCount) || 0;
  const label = `${estimate?.type || 'Small event'}${guests ? ` — ${guests} guests` : ''}`;
  return [{
    lineType: 'item',
    name: label,
    description: estimate?.serviceStyle || null,
    quantity: 1,
    unitPriceCents: subtotalCents,
    totalCents: subtotalCents,
    sourceSystem: SOURCE_SYSTEM,
    sourceId: `${estimate.id}:event`,
    metadata: {
      guestCount: guests || null,
      estimateMinCents: estimate?.estimateMinCents ?? null,
      estimateMaxCents: estimate?.estimateMaxCents ?? null,
    },
  }];
}

async function projectEstimate({ prisma, estimate }) {
  const subtotalCents = Math.round(Number(estimate?.subtotalCents) || 0);
  const depositCents = Math.round(Number(estimate?.depositAmountCents) || 0);
  const serviceAt = eventDate(estimate);
  const status = orderStatus(estimate);
  const confirmed = status === 'booked';

  return prisma.$transaction(async (tx) => {
    const order = await tx.commercialOrder.upsert({
      where: { sourceSystem_sourceId: { sourceSystem: SOURCE_SYSTEM, sourceId: estimate.id } },
      update: {
        status,
        totalCents: subtotalCents,
        subtotalCents,
        serviceStartAt: serviceAt,
        bookedAt: confirmed ? (estimate.lastEditedAt || estimate.createdAt || null) : null,
        customerName: estimate.contactName || null,
        customerEmail: estimate.contactEmail || null,
      },
      create: {
        channel: CHANNEL,
        businessLineKey: BUSINESS_LINE_KEY,
        customerName: estimate.contactName || null,
        customerEmail: estimate.contactEmail || null,
        status,
        totalCents: subtotalCents,
        subtotalCents,
        serviceStartAt: serviceAt,
        bookedAt: confirmed ? (estimate.lastEditedAt || estimate.createdAt || null) : null,
        sourceSystem: SOURCE_SYSTEM,
        sourceId: estimate.id,
        metadata: {
          estimateType: estimate.type || null,
          guestCount: estimate.guestCount ?? null,
          location: estimate.location || null,
          depositPercent: estimate.depositPercent ?? null,
        },
      },
    });

    await tx.commercialOrderLine.deleteMany({ where: { orderId: order.id } });
    const lines = buildLines(estimate);
    if (lines.length) {
      await tx.commercialOrderLine.createMany({
        data: lines.map((line) => ({ ...line, orderId: order.id })),
      });
    }

    const invoices = [];

    if (depositCents > 0) {
      invoices.push(await tx.commercialInvoice.upsert({
        where: { sourceSystem_sourceId: { sourceSystem: SOURCE_SYSTEM, sourceId: `${estimate.id}:deposit` } },
        update: { totalCents: depositCents, orderId: order.id },
        create: {
          orderId: order.id,
          invoiceNumber: `${estimate.id.slice(0, 8)}-DEP`,
          status: 'issued',
          totalCents: depositCents,
          outstandingCents: depositCents,
          issuedAt: estimate.createdAt || new Date(),
          dueAt: serviceAt,
          sourceSystem: SOURCE_SYSTEM,
          sourceId: `${estimate.id}:deposit`,
          metadata: { kind: 'deposit' },
        },
      }));
    }

    const balanceCents = Math.max(0, subtotalCents - depositCents);
    if (confirmed && balanceCents > 0) {
      invoices.push(await tx.commercialInvoice.upsert({
        where: { sourceSystem_sourceId: { sourceSystem: SOURCE_SYSTEM, sourceId: `${estimate.id}:balance` } },
        update: { totalCents: balanceCents, orderId: order.id },
        create: {
          orderId: order.id,
          invoiceNumber: `${estimate.id.slice(0, 8)}-BAL`,
          status: 'issued',
          totalCents: balanceCents,
          outstandingCents: balanceCents,
          issuedAt: estimate.lastEditedAt || estimate.createdAt || new Date(),
          // The balance is owed on the event date, not before it.
          dueAt: serviceAt,
          sourceSystem: SOURCE_SYSTEM,
          sourceId: `${estimate.id}:balance`,
          metadata: { kind: 'balance' },
        },
      }));
    }

    return { order, invoices };
  });
}

/** Deposit payments already carry their Square id; allocate them deposit-first. */
async function projectPayments({ prisma, estimate, payments, invoices }) {
  let allocatedCents = 0;
  let unappliedCents = 0;

  for (const payment of payments) {
    const amountCents = Math.round(Number(payment.amountCents) || 0);
    if (amountCents <= 0 || String(payment.status).toLowerCase() !== 'paid') continue;

    const transaction = await recordPaymentTransaction({
      prisma,
      provider: payment.squarePaymentId ? 'square' : 'manual',
      externalPaymentId: payment.squarePaymentId || `small-event-payment:${payment.id}`,
      amountCents,
      occurredAt: payment.createdAt,
      metadata: {
        source: SOURCE_SYSTEM,
        estimateId: estimate.id,
        squareOrderId: payment.squareOrderId || null,
      },
    });

    const applied = await applyPaymentFifo({
      prisma,
      transactionId: transaction.id,
      amountCents,
      invoices,
    });
    allocatedCents += applied.allocated;
    unappliedCents += applied.unappliedCents;
  }

  return { allocatedCents, unappliedCents };
}

async function runSmallEventsProjection({ prisma, dryRun = false, logger = null }) {
  if (!prisma) throw new Error('Prisma is required');

  const estimates = await prisma.smallEventEstimate.findMany({
    include: { payments: true },
    orderBy: { createdAt: 'asc' },
  });

  const summary = {
    estimates: estimates.length,
    ordersWritten: 0,
    invoicesWritten: 0,
    billedCents: 0,
    collectedCents: 0,
    unappliedCents: 0,
    dryRun,
  };

  if (dryRun) {
    for (const estimate of estimates) {
      summary.billedCents += Math.round(Number(estimate.subtotalCents) || 0);
      summary.collectedCents += (estimate.payments || [])
        .filter((payment) => String(payment.status).toLowerCase() === 'paid')
        .reduce((sum, payment) => sum + (Number(payment.amountCents) || 0), 0);
    }
    return summary;
  }

  for (const estimate of estimates) {
    try {
      const { invoices } = await projectEstimate({ prisma, estimate });
      summary.ordersWritten += 1;
      summary.invoicesWritten += invoices.length;
      summary.billedCents += invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0);

      if (invoices.length) {
        const applied = await projectPayments({
          prisma,
          estimate,
          payments: estimate.payments || [],
          invoices: fifoOrder(invoices),
        });
        summary.collectedCents += applied.allocatedCents;
        summary.unappliedCents += applied.unappliedCents;
      }
    } catch (error) {
      logger?.error?.({ err: error, estimateId: estimate.id }, 'small-events projection failed');
    }
  }

  return summary;
}

module.exports = {
  BUSINESS_LINE_KEY,
  CHANNEL,
  SOURCE_SYSTEM,
  buildLines,
  orderStatus,
  projectEstimate,
  projectPayments,
  runSmallEventsProjection,
};
