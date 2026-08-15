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

    return { attempt, transaction, externalPaymentId };
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
  failureDetails,
  markPaymentAttemptFailed,
  markPaymentAttemptSucceeded,
  paymentEvidence,
  paymentOccurredAt,
};
