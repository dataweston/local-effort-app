const crypto = require('crypto');
const { startCommercialCheckout } = require('./commercialOrders');

const digest = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 36);

async function createHostedPaymentLink({ prisma, squareClient, locationId, flow, checkoutAttemptId, customer = {}, totalCents, lines, facts, basket, note, checkoutOptions }) {
  const identity = typeof checkoutAttemptId === 'string' && checkoutAttemptId.trim()
    ? checkoutAttemptId.trim()
    : JSON.stringify(basket);
  const idempotencyKey = `hl-${digest(`${flow}:${identity}`)}`;
  const checkout = await startCommercialCheckout({
    prisma,
    idempotencyKey,
    sourceSystem: flow,
    sourceId: `${flow}:hosted:${idempotencyKey}`,
    channel: flow === 'crowdfunding' ? 'store' : 'small_events',
    businessLineKey: flow === 'crowdfunding' ? 'pizza' : 'events',
    customerName: customer.name,
    customerEmail: customer.email,
    totalCents,
    lines,
    orderMetadata: { saleConfirmationFacts: facts },
    attemptMetadata: { channel: `${flow}_hosted_link`, saleConfirmationFacts: facts },
    basket,
  });
  if (checkout.attempt.metadata?.squarePaymentLinkUrl) return checkout.attempt.metadata.squarePaymentLinkUrl;

  const linkIdempotencyKey = `link-${digest(checkout.attempt.id)}`;
  const metadata = { ...checkout.attempt.metadata, linkIdempotencyKey };
  // Persist the provider request identity before a provider call can succeed.
  await prisma.financePaymentAttempt.update({ where: { id: checkout.attempt.id }, data: { metadata } });
  const response = await squareClient.checkoutApi.createPaymentLink({
    idempotencyKey: linkIdempotencyKey,
    order: {
      locationId,
      referenceId: checkout.order.id,
      metadata: { commercialOrderId: checkout.order.id },
      lineItems: lines.map((line) => ({ name: line.name, quantity: String(line.quantity), basePriceMoney: { amount: line.unitPriceCents, currency: 'USD' } })),
      ...(note ? { note } : {}),
    },
    checkoutOptions,
    ...(customer.email ? { prePopulatedData: { buyerEmail: customer.email } } : {}),
  });
  const paymentLink = response?.result?.paymentLink;
  const url = paymentLink?.url;
  const squareOrderId = paymentLink?.orderId || response?.result?.relatedResources?.orders?.[0]?.id;
  if (!url || !squareOrderId) throw new Error('Hosted checkout response is incomplete');
  await prisma.financePaymentAttempt.update({
    where: { id: checkout.attempt.id },
    data: { metadata: { ...metadata, squareOrderId, squarePaymentLinkUrl: url } },
  });
  return url;
}

module.exports = { createHostedPaymentLink };
