/**
 * Finance Core commercial-checkout intake.
 *
 * One primitive every provider-charging channel calls *before* it asks a
 * processor to move money. It writes the booked commercial order, its sale
 * lines, and a pending FinancePaymentAttempt in a single transaction, which is
 * what makes the staged plan's lifecycle invariants hold per channel:
 *
 *   1. order + pending attempt exist atomically before the charge;
 *   2. the caller can hand the provider our internal order id as its reference
 *      and the attempt's idempotency key as its idempotency key;
 *   5. a database failure before the external call means no charge — this
 *      throws, and the caller must not proceed to the processor;
 *   6. a database failure after capture leaves the pending attempt behind as
 *      the recovery anchor (see squarePaymentEvidence.js);
 *   7. provider ids are mappings written later, never the business identity.
 *
 * Replays are decided here rather than in each handler. A repeated checkout
 * attempt id resolves to the same order instead of double-booking, and an
 * attempt whose amount no longer matches the basket is refused outright — the
 * one case where silently reusing a durable record would charge the wrong
 * total.
 */

class CommercialCheckoutConflictError extends Error {
  constructor(message, code, statusCode = 409) {
    super(message);
    this.name = 'CommercialCheckoutConflictError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function requireInt(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${field} must be a number`);
  return Math.round(number);
}

function normalizeLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((line, index) => {
    const quantity = Math.max(1, requireInt(line.quantity ?? 1, 'line.quantity'));
    const unitPriceCents = requireInt(line.unitPriceCents ?? 0, 'line.unitPriceCents');
    const totalCents = line.totalCents === undefined || line.totalCents === null
      ? unitPriceCents * quantity
      : requireInt(line.totalCents, 'line.totalCents');
    return {
      lineType: line.lineType || 'item',
      sku: line.sku ? String(line.sku).slice(0, 240) : null,
      name: String(line.name || `Line ${index + 1}`).slice(0, 500),
      description: line.description ? String(line.description).slice(0, 2000) : null,
      quantity,
      unitPriceCents,
      totalCents,
      sourceSystem: line.sourceSystem || null,
      sourceId: line.sourceId ? String(line.sourceId).slice(0, 240) : null,
      metadata: line.metadata || undefined,
    };
  });
}

function findAttempt(prisma, provider, idempotencyKey) {
  return prisma.financePaymentAttempt.findUnique({
    where: { provider_idempotencyKey: { provider, idempotencyKey } },
    include: { commercialOrder: { include: { lines: true } } },
  });
}

function resolveExistingAttempt(attempt, totalCents) {
  if (attempt.requestedCents !== totalCents) {
    throw new CommercialCheckoutConflictError(
      'Checkout attempt amount changed. Please start checkout again.',
      'attempt-amount-changed',
    );
  }
  if (attempt.status === 'succeeded' && attempt.externalPaymentId) {
    return { order: attempt.commercialOrder, attempt, replay: 'succeeded' };
  }
  if (attempt.status === 'failed') {
    throw new CommercialCheckoutConflictError(
      'This checkout attempt failed. Please try again.',
      'attempt-failed',
    );
  }
  return { order: attempt.commercialOrder, attempt, replay: 'pending' };
}

/**
 * Create (or recover) the commercial order and pending payment attempt for a
 * checkout. Returns `{ order, attempt, replay }` where `replay` is `null` for a
 * fresh booking, `'pending'` when an unfinished attempt was recovered, and
 * `'succeeded'` when the provider already captured this exact attempt — in
 * which case the caller must return the earlier result and never charge again.
 */
async function startCommercialCheckout({
  prisma,
  provider = 'square',
  idempotencyKey,
  sourceSystem,
  sourceId,
  channel,
  businessLineKey = null,
  customerId = null,
  customerName = null,
  customerEmail = null,
  agreementId = null,
  subscriptionId = null,
  invoiceId = null,
  currency = 'USD',
  subtotalCents = null,
  totalCents,
  serviceStartAt = null,
  serviceEndAt = null,
  lines = [],
  orderMetadata = null,
  attemptMetadata = null,
}) {
  if (!prisma) throw new Error('Prisma is required');
  if (!idempotencyKey) throw new Error('idempotencyKey is required');
  if (!sourceSystem || !sourceId) throw new Error('sourceSystem and sourceId are required');
  if (!channel) throw new Error('channel is required');

  const amountCents = requireInt(totalCents, 'totalCents');
  if (amountCents <= 0) throw new Error('totalCents must be positive');

  const existing = await findAttempt(prisma, provider, idempotencyKey);
  if (existing) return resolveExistingAttempt(existing, amountCents);

  const orderLines = normalizeLines(lines);

  try {
    const order = await prisma.commercialOrder.create({
      data: {
        channel,
        businessLineKey,
        customerId,
        customerName: customerName ? String(customerName).slice(0, 500) : null,
        customerEmail: customerEmail ? String(customerEmail).toLowerCase().slice(0, 320) : null,
        agreementId,
        subscriptionId,
        status: 'payment_pending',
        currency,
        subtotalCents: subtotalCents === null ? null : requireInt(subtotalCents, 'subtotalCents'),
        totalCents: amountCents,
        serviceStartAt,
        serviceEndAt,
        sourceSystem,
        sourceId: String(sourceId).slice(0, 240),
        metadata: orderMetadata || undefined,
        ...(orderLines.length ? { lines: { createMany: { data: orderLines } } } : {}),
        paymentAttempts: {
          create: {
            provider,
            idempotencyKey,
            invoiceId,
            status: 'pending',
            requestedCents: amountCents,
            currency,
            metadata: attemptMetadata || undefined,
          },
        },
      },
      include: { lines: true, paymentAttempts: true },
    });
    return { order, attempt: order.paymentAttempts[0], replay: null };
  } catch (error) {
    // A concurrent replay can win either unique insert. Recover its durable
    // records rather than booking the order twice.
    if (error?.code !== 'P2002') throw error;
    const raced = await findAttempt(prisma, provider, idempotencyKey);
    if (raced) return resolveExistingAttempt(raced, amountCents);

    // The source identity collided without a matching attempt: two different
    // checkout attempts claimed one source id. Refusing is the only safe answer
    // — proceeding would charge against another checkout's evidence.
    throw new CommercialCheckoutConflictError(
      'This order was already recorded under a different checkout attempt.',
      'source-id-conflict',
    );
  }
}

module.exports = {
  CommercialCheckoutConflictError,
  normalizeLines,
  startCommercialCheckout,
};
