// POST /api/psyche/checkout
// Body: { token, verificationToken, checkoutAttemptId, fulfillment, deliveryZone, deliveryNotes, quantity, customer, address }
// Processes a Square payment and sends Brevo emails to customer and admin.

const { getSquareClient } = require('../_lib/squareClient');
const { createBrevoService } = require('../../backend/api/services/brevo');

const PRODUCT_PRICE_CENTS = 7000;
const MAX_QUANTITY = 1;
const DELIVERY_FEE_CENTS = 1000;
const SHIPPING_FEE_CENTS = 1000;

const TEAM_EMAIL = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
const SENDER_EMAIL = process.env.SENDER_EMAIL || TEAM_EMAIL;

const brevoService = createBrevoService();

const sanitizeIdempotencyKey = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 45);
};

const resolveFeeCents = (fulfillment, deliveryZone) => {
  if (fulfillment === 'shipping') return SHIPPING_FEE_CENTS;
  if (fulfillment === 'delivery') {
    if (deliveryZone === 'extended') return DELIVERY_FEE_CENTS;
    return 0;
  }
  return null;
};

const parseQuantity = (value) => {
  const parsed = Number.isInteger(value) ? value : Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return 1;
  return parsed;
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { client: squareClient, locationId } = getSquareClient();
  if (!squareClient) return res.status(500).json({ error: 'Square not configured' });
  if (!locationId) return res.status(500).json({ error: 'Square location missing' });

  const {
    token,
    verificationToken,
    checkoutAttemptId,
    fulfillment,
    deliveryZone,
    deliveryNotes,
    quantity: rawQuantity,
    customer,
    address,
  } = req.body || {};

  if (!token) return res.status(400).json({ error: 'Missing payment token' });
  if (!customer?.name || !customer?.email || !customer?.phone) {
    return res.status(400).json({ error: 'Missing customer information' });
  }
  if (!address?.line1 || !address?.city || !address?.state || !address?.postal) {
    return res.status(400).json({ error: 'Missing address information' });
  }

  const feeCents = resolveFeeCents(fulfillment, deliveryZone);
  if (feeCents === null) {
    return res.status(400).json({ error: 'Invalid fulfillment option' });
  }

  const quantity = parseQuantity(rawQuantity);
  if (quantity < 1 || quantity > MAX_QUANTITY) {
    return res.status(400).json({ error: `Quantity must be between 1 and ${MAX_QUANTITY}.` });
  }

  const amountCents = PRODUCT_PRICE_CENTS * quantity + feeCents;
  const idempotencyKey =
    sanitizeIdempotencyKey(checkoutAttemptId) ||
    `psyche-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    const fulfillmentLabel =
      fulfillment === 'shipping'
        ? 'Midwest shipping'
        : deliveryZone === 'extended'
          ? 'Delivery (10+ miles)'
          : 'Delivery (within 10 miles)';

    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: amountCents, currency: 'USD' },
      locationId,
      autocomplete: true,
      buyerEmailAddress: customer.email,
      note: `Psyche olive oil x${quantity} - ${fulfillmentLabel}`.slice(0, 500),
      referenceId: `psyche-${Date.now()}`,
      metadata: {
        fulfillment: fulfillment || 'delivery',
        delivery_zone: deliveryZone || '',
        quantity: String(quantity),
        customer_name: customer.name.slice(0, 80),
        customer_phone: customer.phone.slice(0, 30),
        city: address.city.slice(0, 60),
      },
    };
    if (verificationToken) {
      paymentBody.verificationToken = verificationToken;
    }

    const paymentResp = await squareClient.paymentsApi.createPayment(paymentBody);
    const paymentId = paymentResp?.result?.payment?.id;

    if (!paymentId) {
      throw new Error('Payment failed');
    }

    const emailStatus = { customer: false, admin: false };
    const fullAddress = `${address.line1}${address.line2 ? `, ${address.line2}` : ''}, ${address.city}, ${address.state} ${address.postal}`;

    if (SENDER_EMAIL && customer.email) {
      try {
        const customerBody = [
          'Thanks for your Psyche olive oil purchase.',
          '',
          `Fulfillment: ${fulfillmentLabel}`,
          `Address: ${fullAddress}`,
          `Delivery/shipping notes: ${deliveryNotes || 'None'}`,
          '',
          `Product: Psyche olive oil (x${quantity})`,
          `Subtotal: $${((PRODUCT_PRICE_CENTS * quantity) / 100).toFixed(2)}`,
          `Fulfillment fee: $${(feeCents / 100).toFixed(2)}`,
          `Total: $${(amountCents / 100).toFixed(2)}`,
          '',
          `Payment ID: ${paymentId}`,
        ].join('\n');

        await brevoService.sendEmail({
          to: [{ email: customer.email, name: customer.name }],
          sender: { email: SENDER_EMAIL, name: 'Local Effort' },
          subject: 'Psyche olive oil order confirmed',
          textContent: customerBody,
        });
        emailStatus.customer = true;
      } catch (err) {
        console.warn('[psyche.checkout] customer email failed', err?.message);
      }
    }

    if (SENDER_EMAIL && TEAM_EMAIL) {
      try {
        const adminBody = [
          'NEW PSYCHE OLIVE OIL ORDER',
          '',
          `Fulfillment: ${fulfillmentLabel}`,
          `Quantity: ${quantity}`,
          `Subtotal: $${((PRODUCT_PRICE_CENTS * quantity) / 100).toFixed(2)}`,
          `Fulfillment fee: $${(feeCents / 100).toFixed(2)}`,
          `Total: $${(amountCents / 100).toFixed(2)}`,
          '',
          `Customer: ${customer.name}`,
          `Email: ${customer.email}`,
          `Phone: ${customer.phone}`,
          `Address: ${fullAddress}`,
          `Notes: ${deliveryNotes || 'None'}`,
          '',
          `Payment ID: ${paymentId}`,
        ].join('\n');

        await brevoService.sendEmail({
          to: [{ email: TEAM_EMAIL }],
          sender: { email: SENDER_EMAIL, name: 'Local Effort' },
          subject: `Psyche order - ${customer.name}`,
          textContent: adminBody,
        });
        emailStatus.admin = true;
      } catch (err) {
        console.warn('[psyche.checkout] admin email failed', err?.message);
      }
    }

    return res.status(200).json({
      ok: true,
      paymentId,
      amountCents,
      emailStatus,
    });
  } catch (err) {
    const squareErrors = err?.errors
      ? err.errors.map((er) => ({ code: er.code, detail: er.detail })).slice(0, 3)
      : null;
    if (squareErrors) console.warn('[psyche.checkout] square errors', squareErrors);
    const msg = squareErrors ? JSON.stringify(squareErrors) : err?.message || 'Checkout failed';
    return res.status(500).json({ error: msg });
  }
};
