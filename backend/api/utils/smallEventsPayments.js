const { prisma } = require('./prisma');
const { queueEventConfirmations } = require('../services/saleConfirmations');
const { fifoOrder } = require('../finance/receivables');
const { projectEstimate, projectPayments } = require('../finance/smallEventsProjection');

const extractEstimateId = (payment) => {
  const reference = payment?.reference_id || payment?.referenceId || '';
  const note = payment?.note || '';
  const candidates = [reference, note].filter(Boolean);
  for (const candidate of candidates) {
    const match = String(candidate).match(/small-event:([a-f0-9-]{8,})/i);
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
  return match?.estimateId || null;
};

async function applySmallEventPayment(payment, { logger, emailOutboxService } = {}) {
  try {
    if (!prisma) return false;
    if (!payment?.id || String(payment.status || '').toUpperCase() !== 'COMPLETED') return false;
    const paymentId = payment.id;
    const amountCents = Number(payment?.amount_money?.amount ?? payment?.amountMoney?.amount ?? 0);
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
    return true;
  } catch (error) {
    if (logger?.error) logger.error({ err: error }, 'small-events payment apply error');
    throw error; // Acknowledge only after confirmation jobs are durable; Square will retry.
  }
}

module.exports = { applySmallEventPayment };
