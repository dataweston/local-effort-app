function cleanString(value, max = 500) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
}

function paymentField(payment, camel, snake) {
  return payment?.[camel] ?? payment?.[snake] ?? null;
}

function paymentOccurredAt(payment, fallback = new Date()) {
  const raw = paymentField(payment, 'createdAt', 'created_at')
    || paymentField(payment, 'updatedAt', 'updated_at');
  const date = raw ? new Date(raw) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function paymentEvidence(payment) {
  return {
    receiptUrl: cleanString(paymentField(payment, 'receiptUrl', 'receipt_url'), 1000),
    orderId: cleanString(paymentField(payment, 'orderId', 'order_id'), 200),
    customerId: cleanString(paymentField(payment, 'customerId', 'customer_id'), 200),
    locationId: cleanString(paymentField(payment, 'locationId', 'location_id'), 200),
  };
}

function failureDetails(error) {
  const first = Array.isArray(error?.errors) ? error.errors[0] : null;
  return {
    failureCode: cleanString(first?.code || error?.code || 'payment_failed', 120),
    failureMessage: cleanString(first?.detail || first?.message || error?.message || 'Payment failed', 1000),
  };
}

/**
 * What this payment pays for. An attempt bound to an invoice allocates to the
 * invoice (receivables are the obligation being settled); otherwise it
 * allocates to the commercial order it was raised against. Weekly orders have
 * no commercial record yet and allocate to nothing — their native Order status
 * remains the evidence until that channel is migrated.
 */
function allocationTarget(attempt) {
  if (attempt?.invoiceId) {
    return {
      targetType: 'invoice',
      targetId: attempt.invoiceId,
      invoiceId: attempt.invoiceId,
      orderId: attempt.commercialOrderId || null,
    };
  }
  if (attempt?.commercialOrderId) {
    return {
      targetType: 'commercial_order',
      targetId: attempt.commercialOrderId,
      invoiceId: null,
      orderId: attempt.commercialOrderId,
    };
  }
  return null;
}

/**
 * Recompute an invoice from its allocations rather than decrementing it.
 * Webhooks redeliver and reconciliation re-runs; a subtraction would drift on
 * every replay, a recomputation cannot.
 */
async function settleInvoiceFromAllocations(tx, invoiceId) {
  const invoice = await tx.commercialInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return null;

  const applied = await tx.financePaymentAllocation.aggregate({
    where: { invoiceId },
    _sum: { amountCents: true },
  });
  const paidCents = Number(applied?._sum?.amountCents || 0);
  const outstandingCents = Math.max(0, invoice.totalCents - paidCents);

  let status = invoice.status;
  if (outstandingCents === 0) status = 'paid';
  else if (paidCents > 0) status = 'partially_paid';

  return tx.commercialInvoice.update({
    where: { id: invoiceId },
    data: {
      outstandingCents,
      status,
      paidAt: outstandingCents === 0 ? (invoice.paidAt || new Date()) : null,
    },
  });
}

async function markPaymentAttemptSucceeded({ prisma, attemptId, provider, payment, amountCents }) {
  if (!prisma) throw new Error('Prisma is required');
  const externalPaymentId = cleanString(payment?.id, 240);
  if (!externalPaymentId) throw new Error('Provider returned no payment id');
  const occurredAt = paymentOccurredAt(payment);
  const providerStatus = cleanString(payment?.status || 'COMPLETED', 80);

  return prisma.$transaction(async (tx) => {
    const attempt = await tx.financePaymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'succeeded',
        externalPaymentId,
        failureCode: null,
        failureMessage: null,
        completedAt: new Date(),
      },
    });

    const transaction = await tx.financePaymentTransaction.upsert({
      where: { provider_externalPaymentId: { provider, externalPaymentId } },
      update: {
        attemptId: attempt.id,
        status: providerStatus || 'COMPLETED',
        grossCents: Math.round(Number(amountCents)),
        occurredAt,
        metadata: paymentEvidence(payment),
      },
      create: {
        attemptId: attempt.id,
        provider,
        externalPaymentId,
        transactionType: 'payment',
        status: providerStatus || 'COMPLETED',
        currency: attempt.currency,
        grossCents: Math.round(Number(amountCents)),
        occurredAt,
        metadata: paymentEvidence(payment),
      },
    });

    if (attempt.weeklyOrderId) {
      await tx.order.update({
        where: { id: attempt.weeklyOrderId },
        data: { status: 'paid', submittedAt: new Date(), squarePaymentId: externalPaymentId },
      });
    }
    if (attempt.commercialOrderId) {
      await tx.commercialOrder.update({
        where: { id: attempt.commercialOrderId },
        data: { status: 'paid', bookedAt: new Date() },
      });
    }

    // Explicit application of money to the obligation it settles. Keyed on
    // (transaction, target) so a redelivered webhook rewrites one row instead
    // of inflating what the invoice looks paid against.
    const target = allocationTarget(attempt);
    let allocation = null;
    if (target) {
      allocation = await tx.financePaymentAllocation.upsert({
        where: {
          transactionId_targetType_targetId: {
            transactionId: transaction.id,
            targetType: target.targetType,
            targetId: target.targetId,
          },
        },
        update: { amountCents: Math.round(Number(amountCents)) },
        create: {
          transactionId: transaction.id,
          ...target,
          amountCents: Math.round(Number(amountCents)),
        },
      });
      if (target.invoiceId) {
        await settleInvoiceFromAllocations(tx, target.invoiceId);
      }
    }

    return { attempt, transaction, allocation, externalPaymentId };
  });
}

async function markPaymentAttemptFailed({ prisma, attemptId, error }) {
  if (!prisma || !attemptId) return null;
  const details = failureDetails(error);
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.financePaymentAttempt.update({
      where: { id: attemptId },
      data: { status: 'failed', completedAt: new Date(), ...details },
    });
    if (attempt.weeklyOrderId) {
      await tx.order.update({
        where: { id: attempt.weeklyOrderId },
        data: { status: 'payment_failed' },
      });
    }
    if (attempt.commercialOrderId) {
      await tx.commercialOrder.update({
        where: { id: attempt.commercialOrderId },
        data: { status: 'payment_failed' },
      });
    }
    return attempt;
  });
}

module.exports = {
  allocationTarget,
  failureDetails,
  markPaymentAttemptFailed,
  markPaymentAttemptSucceeded,
  paymentEvidence,
  paymentOccurredAt,
  settleInvoiceFromAllocations,
};
