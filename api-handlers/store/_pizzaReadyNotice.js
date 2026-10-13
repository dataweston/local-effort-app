// Customer notice the owner sends when a paid Pizza on Smith order is ready.
// The wording follows how the buyer chose to receive it, so a shipped box is
// never described as waiting for pickup. Facts come from the order record and
// the Sanity-owned drop; nothing here invents a date or an address.

const REPLY_EMAIL = 'yum@localeffortfood.com';

function money(cents, currency) {
  return `$${(Number(cents || 0) / 100).toFixed(2)} ${currency || 'USD'}`;
}

function methodOf(metadata) {
  const raw = metadata?.fulfillmentMethod || metadata?.saleConfirmationFacts?.fulfillmentMethod || '';
  if (raw === 'shipping' || raw === 'delivery' || raw === 'pickup') return raw;
  // Orders written before fulfillmentMethod was stored carry only `fulfillment`.
  const legacy = metadata?.fulfillment || metadata?.saleConfirmationFacts?.fulfillment || '';
  if (legacy === 'shipping') return 'shipping';
  if (legacy === 'metro_delivery' || legacy === 'local_delivery') return 'delivery';
  return 'pickup';
}

function buildPizzaReadyNotice({ order, method, paymentReference, fulfillmentLabel, pickupAddress, deliveryAddress, tracking }) {
  const items = (order.lines || [])
    .map((line) => `${line.quantity} × ${line.name} — $${(Number(line.totalCents || 0) / 100).toFixed(2)}`)
    .join('\n');
  const when = fulfillmentLabel ? `Fulfillment: ${fulfillmentLabel}` : '';

  let subject;
  let headline;
  const where = [];
  if (method === 'shipping') {
    subject = 'Your Pizza on Smith order has shipped';
    headline = 'Your Pizza on Smith order has shipped.';
    if (tracking?.carrier) where.push(`Carrier: ${tracking.carrier}`);
    where.push(`Tracking number: ${tracking?.number}`);
    if (deliveryAddress) where.push(`Shipping to: ${deliveryAddress}`);
  } else if (method === 'delivery') {
    subject = 'Your Pizza on Smith order is on its way';
    headline = 'Your Pizza on Smith order is out for delivery.';
    if (deliveryAddress) where.push(`Delivering to: ${deliveryAddress}`);
  } else {
    subject = 'Your Pizza on Smith order is ready for pickup';
    headline = 'Your Pizza on Smith order is ready for pickup.';
    if (pickupAddress) where.push(`Pick up at: ${pickupAddress}`);
  }

  const details = [
    `Order reference: ${paymentReference}`,
    `Items:\n${items}`,
    `Total paid: ${money(order.totalCents, order.currency)}`,
    when,
    ...where,
  ].filter(Boolean).join('\n\n');

  return {
    subject,
    headline,
    details,
    contact: `Questions about this order? Reply to this email or write ${REPLY_EMAIL}.`,
  };
}

module.exports = { buildPizzaReadyNotice, methodOf, REPLY_EMAIL };
