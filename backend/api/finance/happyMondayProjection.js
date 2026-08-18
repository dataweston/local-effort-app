/**
 * Happy Monday → Finance Core projection.
 *
 * Happy Monday's portal writes orders and payments straight into Supabase from
 * the browser, so there is no server call to intercept. This projects that
 * roster into provider-neutral commercial records instead: one standing
 * agreement, one commercial order and invoice per portal order, one payment
 * transaction per portal payment, and FIFO allocations that say which invoices
 * the money actually settled.
 *
 * Everything is keyed on the Supabase row id under sourceSystem `happymonday`,
 * so the projection is idempotent and safe to re-run over full history — which
 * matters here specifically: this is the account whose revenue the brain
 * undercounted by ~80% because its money arrived through a path no projector
 * read (memory: happy-monday-revenue-undercount-2026-06-30).
 *
 * Truth boundaries this respects:
 *   - the portal stays the operational system of record for what was ordered;
 *   - `total_cents` from the portal is authoritative for what was billed —
 *     line prices come from the menu catalog and any residual is carried as an
 *     explicit reconciliation line rather than silently rounding the invoice;
 *   - Local Budget remains authoritative for bank cash and classification.
 */

const { HAPPY_MONDAY_ITEMS_BY_ID } = require('../../../api-handlers/happymonday/_catalog');
const { applyPaymentFifo, fifoOrder, recordPaymentTransaction } = require('./receivables');

const SOURCE_SYSTEM = 'happymonday';
const AGREEMENT_SOURCE_ID = 'standing-wholesale-agreement';
const CHANNEL = 'happy_monday';
const BUSINESS_LINE_KEY = 'wholesale';

/** Portal order status → commercial order status. */
function orderStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'paid' || value === 'synced') return 'paid';
  if (value === 'partial') return 'partially_paid';
  if (value === 'refunded' || value === 'returned') return 'refunded';
  return 'booked';
}

/** Portal order status → invoice status. Money applied refines this later. */
function invoiceStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'paid' || value === 'synced') return 'paid';
  if (value === 'partial') return 'partially_paid';
  if (value === 'refunded' || value === 'returned') return 'void';
  return 'issued';
}

function orderDate(order) {
  const raw = order?.order_date || order?.created_at;
  if (!raw) return null;
  const date = new Date(String(raw).length <= 10 ? `${raw}T12:00:00Z` : raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Sale lines for one portal order: catalogued items, explicit adjustments, and
 * — when they disagree with the portal total — one reconciliation line naming
 * the gap. The gap is real information: it means the menu catalog this repo
 * holds no longer matches what the invoice was actually priced at.
 */
function buildLines(order) {
  const lines = [];
  const items = order?.items && typeof order.items === 'object' ? order.items : {};

  for (const [itemId, quantity] of Object.entries(items)) {
    const qty = Number(quantity) || 0;
    if (!qty) continue;
    const catalogItem = HAPPY_MONDAY_ITEMS_BY_ID.get(Number.parseInt(itemId, 10)) || null;
    const unitPriceCents = catalogItem ? Math.round(catalogItem.price * 100) : 0;
    lines.push({
      lineType: 'item',
      sku: `hm-item-${itemId}`,
      name: catalogItem?.name || `Item ${itemId}`,
      description: catalogItem?.category || null,
      quantity: Math.abs(qty),
      unitPriceCents: qty < 0 ? -unitPriceCents : unitPriceCents,
      totalCents: Math.round(unitPriceCents * qty),
      sourceSystem: SOURCE_SYSTEM,
      sourceId: `${order.id}:item:${itemId}`,
      metadata: { catalogued: !!catalogItem },
    });
  }

  const adjustments = Array.isArray(order?.adjustments) ? order.adjustments : [];
  adjustments.forEach((adjustment, index) => {
    const amountCents = Math.round(Number(adjustment?.amount_cents) || 0);
    if (!amountCents) return;
    lines.push({
      lineType: 'adjustment',
      name: String(adjustment?.description || '').trim() || 'Credit adjustment',
      quantity: 1,
      unitPriceCents: amountCents,
      totalCents: amountCents,
      sourceSystem: SOURCE_SYSTEM,
      sourceId: `${order.id}:adjustment:${adjustment?.id || index}`,
    });
  });

  const totalCents = Math.round(Number(order?.total_cents) || 0);
  const linesTotal = lines.reduce((sum, line) => sum + line.totalCents, 0);
  const residual = totalCents - linesTotal;
  if (residual !== 0) {
    lines.push({
      lineType: 'reconciliation',
      name: 'Unexplained difference from portal total',
      description: 'Portal total_cents is authoritative; this repo\'s menu prices did not reproduce it.',
      quantity: 1,
      unitPriceCents: residual,
      totalCents: residual,
      sourceSystem: SOURCE_SYSTEM,
      sourceId: `${order.id}:residual`,
    });
  }

  return lines;
}

async function ensureAgreement({ prisma, client = null }) {
  const db = client || prisma;
  return db.commercialAgreement.upsert({
    where: { sourceSystem_sourceId: { sourceSystem: SOURCE_SYSTEM, sourceId: AGREEMENT_SOURCE_ID } },
    update: {},
    create: {
      agreementType: 'wholesale_supply',
      status: 'active',
      title: 'Happy Monday standing wholesale supply',
      counterpartyName: 'Happy Monday',
      counterpartyEmail: 'hello@happymonday.company',
      businessLineKey: BUSINESS_LINE_KEY,
      autoRenew: true,
      sourceSystem: SOURCE_SYSTEM,
      sourceId: AGREEMENT_SOURCE_ID,
      terms: { billing: 'per-order invoice', settlement: 'running account balance' },
    },
  });
}

/** Upsert one portal order as a commercial order + invoice. */
async function projectOrder({ prisma, agreementId, order }) {
  const totalCents = Math.round(Number(order?.total_cents) || 0);
  const issuedAt = orderDate(order);
  const lines = buildLines(order);

  return prisma.$transaction(async (tx) => {
    const commercialOrder = await tx.commercialOrder.upsert({
      where: { sourceSystem_sourceId: { sourceSystem: SOURCE_SYSTEM, sourceId: order.id } },
      update: {
        status: orderStatus(order.status),
        totalCents,
        subtotalCents: totalCents,
        bookedAt: issuedAt,
        serviceStartAt: issuedAt,
        metadata: { orderNumber: order.order_number || null, notes: order.notes || null },
      },
      create: {
        agreementId,
        channel: CHANNEL,
        businessLineKey: BUSINESS_LINE_KEY,
        customerName: 'Happy Monday',
        status: orderStatus(order.status),
        totalCents,
        subtotalCents: totalCents,
        bookedAt: issuedAt,
        serviceStartAt: issuedAt,
        sourceSystem: SOURCE_SYSTEM,
        sourceId: order.id,
        metadata: { orderNumber: order.order_number || null, notes: order.notes || null },
      },
    });

    // Lines are a projection of portal state, so they are replaced wholesale.
    // The invoice and its allocations — the financial evidence — are not.
    await tx.commercialOrderLine.deleteMany({ where: { orderId: commercialOrder.id } });
    if (lines.length) {
      await tx.commercialOrderLine.createMany({
        data: lines.map((line) => ({ ...line, orderId: commercialOrder.id })),
      });
    }

    const invoice = await tx.commercialInvoice.upsert({
      where: { sourceSystem_sourceId: { sourceSystem: SOURCE_SYSTEM, sourceId: order.id } },
      update: {
        totalCents,
        issuedAt,
        invoiceNumber: order.order_number || null,
        orderId: commercialOrder.id,
      },
      create: {
        agreementId,
        orderId: commercialOrder.id,
        invoiceNumber: order.order_number || null,
        status: invoiceStatus(order.status),
        totalCents,
        // Outstanding starts at the full amount; allocations settle it.
        outstandingCents: totalCents,
        issuedAt,
        sourceSystem: SOURCE_SYSTEM,
        sourceId: order.id,
        metadata: { portalStatus: order.status || null },
      },
    });

    return { commercialOrder, invoice, lineCount: lines.length };
  });
}

/**
 * Project one portal payment and apply it to open invoices, oldest first.
 * Square card payments carry their Square id; manual/offline rows are recorded
 * under the `happymonday_portal` provider so the evidence is never lost just
 * because no processor was involved.
 */
async function projectPayment({ prisma, payment, invoices }) {
  const amountCents = Math.round(Number(payment?.amount_cents) || 0);
  if (amountCents <= 0) return { skipped: 'non-positive-amount' };

  const provider = payment?.square_payment_id ? 'square' : 'happymonday_portal';
  const externalPaymentId = payment?.square_payment_id || `portal-payment:${payment.id}`;

  const transaction = await recordPaymentTransaction({
    prisma,
    provider,
    externalPaymentId,
    amountCents,
    occurredAt: payment?.created_at || payment?.processed_at || null,
    metadata: {
      source: SOURCE_SYSTEM,
      portalPaymentId: payment.id,
      paymentType: payment?.payment_type || null,
    },
  });

  const applied = await applyPaymentFifo({
    prisma,
    transactionId: transaction.id,
    amountCents,
    invoices,
  });

  return { transaction, ...applied };
}

/**
 * Full projection run. Reads the portal roster, writes commercial evidence, and
 * reports coverage: how much money landed on an invoice and how much did not.
 */
async function runHappyMondayProjection({ prisma, supabase, dryRun = false, logger = null }) {
  if (!prisma) throw new Error('Prisma is required');
  if (!supabase) throw new Error('Supabase is required');

  const { data: orders, error: ordersError } = await supabase
    .from('happymonday_orders')
    .select('id, order_number, order_date, items, adjustments, total_cents, status, notes, created_at')
    .order('order_date', { ascending: true });
  if (ordersError) throw new Error(ordersError.message || 'Unable to read happymonday_orders');

  const { data: payments, error: paymentsError } = await supabase
    .from('happymonday_payments')
    .select('id, amount_cents, payment_type, square_payment_id, created_at, notes')
    .order('created_at', { ascending: true });
  if (paymentsError) throw new Error(paymentsError.message || 'Unable to read happymonday_payments');

  const summary = {
    orders: orders?.length || 0,
    payments: payments?.length || 0,
    invoicesWritten: 0,
    paymentsApplied: 0,
    billedCents: 0,
    collectedCents: 0,
    unappliedCents: 0,
    dryRun,
  };

  if (dryRun) {
    summary.billedCents = (orders || []).reduce((sum, order) => sum + (Number(order.total_cents) || 0), 0);
    summary.collectedCents = (payments || []).reduce((sum, row) => sum + (Number(row.amount_cents) || 0), 0);
    return summary;
  }

  const agreement = await ensureAgreement({ prisma });

  for (const order of orders || []) {
    try {
      await projectOrder({ prisma, agreementId: agreement.id, order });
      summary.invoicesWritten += 1;
      summary.billedCents += Math.round(Number(order.total_cents) || 0);
    } catch (error) {
      logger?.error?.({ err: error, orderId: order.id }, 'happy-monday projection: order failed');
    }
  }

  // Allocation runs after every invoice exists so FIFO sees the whole ledger.
  const invoices = fifoOrder(await prisma.commercialInvoice.findMany({
    where: { agreementId: agreement.id, status: { not: 'void' } },
  }));

  for (const payment of payments || []) {
    try {
      const result = await projectPayment({ prisma, payment, invoices });
      if (result.skipped) continue;
      summary.paymentsApplied += 1;
      summary.collectedCents += Math.round(Number(payment.amount_cents) || 0);
      summary.unappliedCents += result.unappliedCents || 0;
    } catch (error) {
      logger?.error?.({ err: error, paymentId: payment.id }, 'happy-monday projection: payment failed');
    }
  }

  const outstanding = await prisma.commercialInvoice.aggregate({
    where: { agreementId: agreement.id, status: { not: 'void' } },
    _sum: { outstandingCents: true },
  });
  summary.outstandingCents = Number(outstanding?._sum?.outstandingCents || 0);

  return summary;
}

module.exports = {
  AGREEMENT_SOURCE_ID,
  BUSINESS_LINE_KEY,
  CHANNEL,
  SOURCE_SYSTEM,
  buildLines,
  ensureAgreement,
  invoiceStatus,
  orderStatus,
  projectOrder,
  projectPayment,
  runHappyMondayProjection,
};
