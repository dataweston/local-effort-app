/**
 * Square payment evidence and recovery.
 *
 * Two jobs:
 *
 *   1. The webhook half. Every completed Square payment is linked back to the
 *      attempt that raised it and recorded as a provider-neutral transaction.
 *      A capture nobody claims is still written down — an orphan is a fact to
 *      measure, not a record to discard.
 *   2. The recovery half. Invariant 6 of the staged plan says a database
 *      failure after capture leaves a pending attempt that "a webhook or
 *      reconciliation job can recover". This is that job.
 *
 * Resolution order for linking a payment to an attempt, most to least certain:
 * the provider payment id we already stored, then the reference id we handed
 * Square at charge time (an attempt id, a commercial order id, or a weekly
 * order id, depending on channel).
 */

const {
  markPaymentAttemptSucceeded,
  paymentEvidence,
  paymentOccurredAt,
} = require('./paymentAttempts');
const { recordPaymentTransaction } = require('./receivables');

const PROVIDER = 'square';

function field(payment, camel, snake) {
  return payment?.[camel] ?? payment?.[snake] ?? null;
}

function amountCentsOf(payment) {
  const amount = payment?.amount_money?.amount ?? payment?.amountMoney?.amount ?? 0;
  return Math.round(Number(amount) || 0);
}

function isChefDuesAttempt(attempt) {
  return attempt?.metadata?.saleConfirmationFacts?.flow === 'chef-dues'
    || attempt?.metadata?.channel === 'chef-dues_hosted_link';
}

// Private dues have one immutable invoice/attempt, not a reusable public basket.
// Reject mismatched evidence before finance state or confirmation recovery advances.
function assertChefDuesPaymentEvidence(payment, attempt, locationId) {
  const reject = () => {
    throw Object.assign(new Error('Completed Square payment does not match the owned chef dues attempt'), {
      code: 'chef-dues-payment-evidence-rejected', status: 409,
    });
  };
  const amount = payment?.amountMoney || payment?.amount_money;
  const cents = Number(amount?.amount);
  if (!attempt?.id || attempt.provider !== PROVIDER || !attempt.invoiceId || !attempt.commercialOrderId
    || !payment?.id || payment.status !== 'COMPLETED' || !locationId
    || field(payment, 'locationId', 'location_id') !== locationId
    || !Number.isSafeInteger(cents) || cents <= 0 || cents !== attempt.requestedCents
    || amount?.currency !== attempt.currency
    || (attempt.externalPaymentId && attempt.externalPaymentId !== payment.id)) reject();
  const reference = field(payment, 'referenceId', 'reference_id');
  const storedOrderId = attempt.metadata?.squareOrderId;
  if (storedOrderId) {
    if (field(payment, 'orderId', 'order_id') !== storedOrderId) reject();
    if (reference && reference !== attempt.commercialOrderId && reference !== attempt.id) reject();
  } else if (reference !== attempt.commercialOrderId && reference !== attempt.id) reject();
}

async function claimChefDuesPaymentEvidence(prisma, payment, attempt, locationId) {
  assertChefDuesPaymentEvidence(payment, attempt, locationId);
  // Reserve the verified identity with CAS before the existing success writer.
  // A post-claim failure is repairable by the same payment; a different payment
  // can never replace it, even when two authenticated events race.
  const claimed = await prisma.financePaymentAttempt.updateMany({
    where: { id: attempt.id, OR: [{ externalPaymentId: null }, { externalPaymentId: payment.id }] },
    data: { externalPaymentId: payment.id },
  });
  if (claimed.count !== 1) throw Object.assign(new Error('Chef dues attempt already belongs to another payment'), {
    code: 'chef-dues-payment-evidence-rejected', status: 409,
  });
}

/** Find the attempt a Square payment belongs to, or null if nothing claims it. */
async function findAttemptForPayment(prisma, payment) {
  const externalPaymentId = payment?.id ? String(payment.id) : null;
  if (externalPaymentId) {
    const byPaymentId = await prisma.financePaymentAttempt.findFirst({
      where: { provider: PROVIDER, externalPaymentId },
    });
    if (byPaymentId) return byPaymentId;
  }

  const reference = field(payment, 'referenceId', 'reference_id');
  if (reference) {
    const referenceId = String(reference);
    // The reference is one of ours in exactly one of three roles.
    const byReference = await prisma.financePaymentAttempt.findFirst({
      where: {
        provider: PROVIDER,
        OR: [
          { id: referenceId },
          { commercialOrderId: referenceId },
          { weeklyOrderId: referenceId },
        ],
      },
      orderBy: { startedAt: 'desc' },
    });
    if (byReference) return byReference;
  }

  const externalOrderId = field(payment, 'orderId', 'order_id');
  if (!externalOrderId) return null;
  return prisma.financePaymentAttempt.findFirst({
    where: {
      provider: PROVIDER,
      metadata: { path: ['squareOrderId'], equals: String(externalOrderId) },
    },
  });
}

/**
 * Record one completed Square payment. Returns what happened so the webhook can
 * report it: `linked` when an attempt was advanced, `orphan` when the capture
 * had no attempt behind it, `ignored` when the payment is not completed.
 */
async function recordSquarePaymentEvidence(payment, { prisma, logger = null, locationId = process.env.SQUARE_LOCATION_ID } = {}) {
  if (!prisma || !payment?.id) return { outcome: 'ignored', reason: 'no-prisma-or-payment' };
  if (String(payment.status || '').toUpperCase() !== 'COMPLETED') {
    return { outcome: 'ignored', reason: 'not-completed' };
  }

  const amountCents = amountCentsOf(payment);

  try {
    const attempt = await findAttemptForPayment(prisma, payment);

    if (attempt) {
      if (isChefDuesAttempt(attempt)) await claimChefDuesPaymentEvidence(prisma, payment, attempt, locationId);
      // Idempotent by construction: the transaction upserts on
      // (provider, externalPaymentId) and allocations upsert on their target.
      await markPaymentAttemptSucceeded({
        prisma,
        attemptId: attempt.id,
        provider: PROVIDER,
        payment,
        amountCents: amountCents || attempt.requestedCents,
      });
      return { outcome: 'linked', attemptId: attempt.id };
    }

    const transaction = await recordPaymentTransaction({
      prisma,
      provider: PROVIDER,
      externalPaymentId: String(payment.id),
      amountCents,
      occurredAt: paymentOccurredAt(payment),
      metadata: { ...paymentEvidence(payment), orphan: true },
    });
    return { outcome: 'orphan', transactionId: transaction.id };
  } catch (error) {
    logger?.error?.({ err: error, paymentId: payment.id }, 'square payment evidence failed');
    return { outcome: 'error', error: error?.message || String(error) };
  }
}

/**
 * Recover attempts stuck in `pending`.
 *
 * A pending attempt means one of three things: the charge never happened, the
 * charge happened and the follow-up write was lost, or the customer walked away
 * mid-checkout. Square is asked which, by listing payments over the window and
 * matching on the reference id we stamped at charge time.
 *
 * Nothing is expired unless the caller asks for it: an attempt with no provider
 * record is evidence of an abandoned checkout, and abandoned checkouts are a
 * sales-layer signal worth keeping rather than deleting.
 */
async function reconcilePendingAttempts({
  prisma,
  lookbackHours = 72,
  minimumAgeMinutes = 10,
  dryRun = false,
  expire = false,
  logger = null,
  squareClient = null,
} = {}) {
  if (!prisma) throw new Error('Prisma is required');

  const now = Date.now();
  const since = new Date(now - lookbackHours * 3600 * 1000);
  const cutoff = new Date(now - minimumAgeMinutes * 60 * 1000);

  const pending = await prisma.financePaymentAttempt.findMany({
    where: { provider: PROVIDER, status: 'pending', startedAt: { gte: since, lte: cutoff } },
    orderBy: { startedAt: 'asc' },
  });

  const summary = {
    lookbackHours,
    pendingFound: pending.length,
    recovered: 0,
    stillUnresolved: 0,
    expired: 0,
    orphanCaptures: 0,
    dryRun,
  };
  if (!pending.length) return summary;

  const client = squareClient || require('../../../api-handlers/_lib/squareClient').getSquareClient().client;
  if (!client) {
    summary.error = 'square-client-unavailable';
    summary.stillUnresolved = pending.length;
    return summary;
  }

  // One pass over the window's payments, indexed by the reference ids we own.
  const byReference = new Map();
  const capturedIds = new Set();
  let cursor;
  do {
    const response = await client.paymentsApi.listPayments(
      since.toISOString(),
      undefined,
      undefined,
      cursor,
    );
    const payments = response?.result?.payments || [];
    for (const payment of payments) {
      if (String(payment.status || '').toUpperCase() !== 'COMPLETED') continue;
      capturedIds.add(String(payment.id));
      const reference = field(payment, 'referenceId', 'reference_id');
      if (reference) byReference.set(String(reference), payment);
    }
    cursor = response?.result?.cursor;
  } while (cursor);

  for (const attempt of pending) {
    const payment = byReference.get(attempt.id)
      || (attempt.commercialOrderId && byReference.get(attempt.commercialOrderId))
      || (attempt.weeklyOrderId && byReference.get(attempt.weeklyOrderId))
      || null;

    if (payment) {
      summary.recovered += 1;
      try {
        if (isChefDuesAttempt(attempt)) {
          assertChefDuesPaymentEvidence(payment, attempt, process.env.SQUARE_LOCATION_ID);
          if (!dryRun) await claimChefDuesPaymentEvidence(prisma, payment, attempt, process.env.SQUARE_LOCATION_ID);
        }
        if (dryRun) continue;
        await markPaymentAttemptSucceeded({
          prisma,
          attemptId: attempt.id,
          provider: PROVIDER,
          payment,
          amountCents: amountCentsOf(payment) || attempt.requestedCents,
        });
      } catch (error) {
        logger?.error?.({ err: error, attemptId: attempt.id }, 'attempt recovery failed');
        summary.recovered -= 1;
        summary.stillUnresolved += 1;
      }
      continue;
    }

    summary.stillUnresolved += 1;
    if (expire && !dryRun) {
      await prisma.financePaymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'abandoned',
          failureCode: 'no-provider-record',
          failureMessage: 'No completed Square payment referenced this attempt within the window.',
          completedAt: new Date(),
        },
      });
      summary.expired += 1;
    }
  }

  // Captures inside the window that no transaction row claims. This is the
  // coverage number the staged plan's kill condition is measured against.
  if (capturedIds.size) {
    const known = await prisma.financePaymentTransaction.findMany({
      where: { provider: PROVIDER, externalPaymentId: { in: [...capturedIds] } },
      select: { externalPaymentId: true },
    });
    const knownIds = new Set(known.map((row) => row.externalPaymentId));
    summary.orphanCaptures = [...capturedIds].filter((id) => !knownIds.has(id)).length;
    summary.capturedInWindow = capturedIds.size;
    summary.linkedCoverage = capturedIds.size
      ? Number((((capturedIds.size - summary.orphanCaptures) / capturedIds.size) * 100).toFixed(1))
      : null;
  }

  return summary;
}

module.exports = {
  assertChefDuesPaymentEvidence,
  claimChefDuesPaymentEvidence,
  findAttemptForPayment,
  recordSquarePaymentEvidence,
  reconcilePendingAttempts,
};
