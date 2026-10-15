const { prisma } = require('./prisma');
const { queueEventConfirmations } = require('../services/saleConfirmations');
const { fifoOrder } = require('../finance/receivables');
const { projectEstimate, projectPayments } = require('../finance/smallEventsProjection');
const { findAttemptForPayment } = require('../finance/squarePaymentEvidence');
const { mirrorEstimate } = require('../calendar/mirror');

// Both the legacy reference (`small-event:<id>`) and the venue/Small Events
// reference (`venue:<slug>:<id>`) carry the estimate id.
const extractEstimateId = (payment) => {
  const reference = payment?.reference_id || payment?.referenceId || '';
  const note = payment?.note || '';
  const candidates = [reference, note].filter(Boolean);
  for (const candidate of candidates) {
    const match = String(candidate).match(/(?:small-event:|venue:[a-z0-9-]+:)([a-f0-9-]{8,})/i);
    if (match) return match[1];
  }
  return null;
};

const resolveEstimateFromOrder = async (payment) => {
  const orderId = payment?.order_id || payment?.orderId || '';
  if (!orderId) return null;
  const match = await prisma.smallEventPayment.findFirst({
    where: { squareOrderId: orderId },
  });
  if (match?.estimateId) return match.estimateId;
  // The payment-attempt anchor is written before checkout, so it still
  // identifies the sale if the process died before the payment row was linked.
  const attempt = await findAttemptForPayment(prisma, payment);
  return attempt?.metadata?.estimateId || null;
};

/**
 * Does the money match the sale? A completed Square payment is real money
 * whatever we think of it, so a mismatch is recorded and held for the owner
 * instead of being confirmed (wrong amount) or thrown (which would make Square
 * retry the same webhook forever).
 */
const verifyPayment = ({ estimate, amountCents, currency }) => {
  if (String(currency || 'USD').toUpperCase() !== 'USD') return 'currency-mismatch';
  if (estimate.depositAmountCents && amountCents < estimate.depositAmountCents) return 'amount-below-deposit';
  return null;
};

/**
 * Someone else may have been sold the date if this hold lapsed before the
 * payment landed. The payment still stands; the owner has to refund or rebook.
 */
const holdConflict = async ({ estimateId, now }) => {
  const hold = await prisma.smallEventHold.findUnique({ where: { estimateId } });
  if (!hold || hold.status === 'confirmed') return false;
  if (hold.status === 'held' && hold.holdUntil > now) return false;
  const rival = await prisma.smallEventHold.findFirst({
    where: {
      slotId: hold.slotId,
      estimateId: { not: estimateId },
      OR: [{ status: 'confirmed' }, { status: 'held', holdUntil: { gt: now } }],
    },
  });
  return Boolean(rival);
};

async function applySmallEventPayment(payment, { logger, emailOutboxService, now = new Date() } = {}) {
  try {
    if (!prisma) return false;
    if (!payment?.id || String(payment.status || '').toUpperCase() !== 'COMPLETED') return false;
    const paymentId = payment.id;
    const amountCents = Number(payment?.amount_money?.amount ?? payment?.amountMoney?.amount ?? 0);
    const currency = payment?.amount_money?.currency ?? payment?.amountMoney?.currency ?? 'USD';
    let estimateId = extractEstimateId(payment);
    if (!estimateId) {
      estimateId = await resolveEstimateFromOrder(payment);
    }
    if (!estimateId) return false;

    await prisma.smallEventPayment.upsert({
      where: { squarePaymentId: paymentId },
      update: {
        status: 'paid',
        amountCents: amountCents || undefined,
      },
      create: {
        estimateId,
        amountCents: amountCents || 0,
        status: 'paid',
        squarePaymentId: paymentId,
      },
    });

    const existing = await prisma.smallEventEstimate.findUnique({ where: { id: estimateId } });
    if (!existing) return false;

    const problem =
      verifyPayment({ estimate: existing, amountCents, currency }) ||
      ((await holdConflict({ estimateId, now })) ? 'date-no-longer-held' : null);
    if (problem && existing.status !== 'confirmed') {
      await prisma.smallEventEstimate.update({
        where: { id: estimateId },
        data: { status: 'payment-review', depositStatus: 'paid', notes: appendReviewNote(existing.notes, problem) },
      });
      if (logger?.error) logger.error({ estimateId, paymentId, problem }, 'small-events payment held for owner review');
      return true;
    }

    const confirmedEstimate = await prisma.smallEventEstimate.update({
      where: { id: estimateId },
      data: {
        depositStatus: 'paid',
        status: 'confirmed',
      },
    });

    await prisma.smallEventHold.updateMany({
      where: { estimateId },
      data: { status: 'confirmed' },
    });

    // Finance Core: a confirmed event is booked work with a deposit paid and a
    // balance owed. Best effort — the native records above are already durable
    // and the projection route can rebuild this at any time.
    try {
      const estimate = await prisma.smallEventEstimate.findUnique({
        where: { id: estimateId },
        include: { payments: true },
      });
      if (estimate) {
        const { invoices } = await projectEstimate({ prisma, estimate });
        if (invoices.length) {
          await projectPayments({
            prisma,
            estimate,
            payments: estimate.payments || [],
            invoices: fifoOrder(invoices),
          });
        }
      }
    } catch (projectionError) {
      if (logger?.warn) logger.warn({ err: projectionError, estimateId }, 'small-events finance projection deferred');
    }

    await queueEventConfirmations({ estimate: confirmedEstimate, amountCents, emailOutboxService });

    // After the confirmations are durable: the calendar write is retryable
    // (CalendarMirror) and must never fail an already-captured payment.
    try {
      await mirrorEstimate({ db: prisma, estimate: confirmedEstimate, logger });
    } catch (mirrorError) {
      if (logger?.warn) logger.warn({ err: mirrorError, estimateId }, 'calendar mirror deferred');
    }
    return true;
  } catch (error) {
    if (logger?.error) logger.error({ err: error }, 'small-events payment apply error');
    throw error; // Acknowledge only after confirmation jobs are durable; Square will retry.
  }
}

const appendReviewNote = (notes, problem) =>
  [notes, `[payment review: ${problem}]`].filter(Boolean).join('\n').slice(0, 2000);

module.exports = { applySmallEventPayment, extractEstimateId };
