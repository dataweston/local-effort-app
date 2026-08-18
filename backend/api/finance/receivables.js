/**
 * Receivables: invoices and the application of money to them.
 *
 * Two rules hold this together, both chosen so repeated runs converge instead
 * of drifting:
 *
 *   - an invoice's outstanding balance is always *recomputed* from its
 *     allocations, never decremented;
 *   - an allocation is keyed on (transaction, target), so re-projecting a
 *     payment rewrites the same row rather than stacking a second one.
 *
 * Allocation policy is oldest-invoice-first. Accounts like Happy Monday pay a
 * running balance rather than a chosen invoice, so something has to decide what
 * a payment settles; FIFO is the standard answer and, being derived rather than
 * stored, it can be recomputed if the owner ever wants a different policy.
 * Money that outruns the open invoices is reported as unapplied — never
 * silently attached to an invoice that does not exist yet.
 */

const { settleInvoiceFromAllocations } = require('./paymentAttempts');

/** Oldest first: issue date, then due date, then creation order. */
function fifoOrder(invoices) {
  const key = (invoice) => {
    const issued = invoice.issuedAt ? new Date(invoice.issuedAt).getTime() : null;
    const due = invoice.dueAt ? new Date(invoice.dueAt).getTime() : null;
    const created = invoice.createdAt ? new Date(invoice.createdAt).getTime() : 0;
    return issued ?? due ?? created;
  };
  return [...invoices].sort((a, b) => key(a) - key(b) || String(a.id).localeCompare(String(b.id)));
}

/**
 * Apply one payment transaction across invoices, oldest first.
 *
 * Returns `{ allocated, unappliedCents, allocations }`. Idempotent: each
 * invoice's capacity is measured excluding this transaction's own prior
 * allocations, so re-running produces the same distribution.
 */
async function applyPaymentFifo({ prisma, transactionId, amountCents, invoices, tx = null }) {
  if (!prisma && !tx) throw new Error('Prisma is required');
  if (!transactionId) throw new Error('transactionId is required');

  const run = async (client) => {
    const ordered = fifoOrder(invoices || []);
    let remaining = Math.max(0, Math.round(Number(amountCents) || 0));
    const allocations = [];

    for (const invoice of ordered) {
      const applied = await client.financePaymentAllocation.aggregate({
        where: { invoiceId: invoice.id, NOT: { transactionId } },
        _sum: { amountCents: true },
      });
      const paidByOthers = Number(applied?._sum?.amountCents || 0);
      const capacity = Math.max(0, invoice.totalCents - paidByOthers);
      const amount = Math.min(remaining, capacity);

      const where = {
        transactionId_targetType_targetId: {
          transactionId,
          targetType: 'invoice',
          targetId: invoice.id,
        },
      };

      if (amount <= 0) {
        // This transaction pays nothing toward this invoice. Drop a stale
        // allocation from an earlier run rather than leaving a zero row.
        await client.financePaymentAllocation.deleteMany({
          where: { transactionId, targetType: 'invoice', targetId: invoice.id },
        });
      } else {
        const allocation = await client.financePaymentAllocation.upsert({
          where,
          update: { amountCents: amount },
          create: {
            transactionId,
            targetType: 'invoice',
            targetId: invoice.id,
            invoiceId: invoice.id,
            orderId: invoice.orderId || null,
            amountCents: amount,
          },
        });
        allocations.push(allocation);
        remaining -= amount;
      }

      await settleInvoiceFromAllocations(client, invoice.id);
    }

    return {
      allocated: Math.max(0, Math.round(Number(amountCents) || 0)) - remaining,
      unappliedCents: remaining,
      allocations,
    };
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

/**
 * Record a provider payment that arrived without a pre-created attempt —
 * historical rows, manual/offline payments, or a capture whose attempt was lost.
 * Keyed on (provider, externalPaymentId) so redelivery updates one row.
 */
async function recordPaymentTransaction({
  prisma,
  provider,
  externalPaymentId,
  amountCents,
  occurredAt,
  currency = 'USD',
  status = 'COMPLETED',
  transactionType = 'payment',
  attemptId = null,
  metadata = null,
  client = null,
}) {
  const db = client || prisma;
  if (!db) throw new Error('Prisma is required');
  if (!provider || !externalPaymentId) throw new Error('provider and externalPaymentId are required');

  const grossCents = Math.round(Number(amountCents) || 0);
  const when = occurredAt ? new Date(occurredAt) : new Date();

  return db.financePaymentTransaction.upsert({
    where: { provider_externalPaymentId: { provider, externalPaymentId } },
    update: {
      grossCents,
      status,
      occurredAt: Number.isNaN(when.getTime()) ? new Date() : when,
      ...(attemptId ? { attemptId } : {}),
      ...(metadata ? { metadata } : {}),
    },
    create: {
      provider,
      externalPaymentId,
      transactionType,
      status,
      currency,
      grossCents,
      occurredAt: Number.isNaN(when.getTime()) ? new Date() : when,
      attemptId,
      metadata: metadata || undefined,
    },
  });
}

/** Open invoices for an agreement, oldest first. */
async function openInvoicesForAgreement({ prisma, agreementId, client = null }) {
  const db = client || prisma;
  const invoices = await db.commercialInvoice.findMany({
    where: { agreementId, status: { not: 'void' } },
  });
  return fifoOrder(invoices);
}

module.exports = {
  applyPaymentFifo,
  fifoOrder,
  openInvoicesForAgreement,
  recordPaymentTransaction,
};
