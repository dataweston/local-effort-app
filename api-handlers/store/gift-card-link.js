const crypto = require('crypto');
const { Client, Environment } = require('square');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = ((process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase() === 'sandbox') ? 'Sandbox' : 'Production';

let sq = null;
try {
  if (ACCESS_TOKEN) {
    const env = Environment[ENV_NAME] || Environment.Production;
    sq = new Client({ accessToken: ACCESS_TOKEN, environment: env });
  }
} catch (_) {
  sq = null;
}

const createKey = () => (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));

const toCents = (value) => {
  const num = typeof value === 'string' ? Number(value.replace(/[^0-9.]/g, '')) : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!sq) return res.status(500).json({ error: 'Square not configured' });
  if (!LOCATION_ID) return res.status(500).json({ error: 'Square location missing' });

  const {
    amount,
    cardType = 'digital',
    deliveryTarget = 'recipient',
    buyer = {},
    recipient = {},
    note = '',
    shipping = null,
  } = req.body || {};

  const amountCents = toCents(amount);
  if (amountCents < 5000) {
    return res.status(400).json({ error: 'Gift card must be at least $50.' });
  }
  const wantsPhysical = cardType === 'physical';
  if (wantsPhysical && amountCents < 25000) {
    return res.status(400).json({ error: 'Physical gift cards require $250 or more.' });
  }

  const buyerName = (buyer?.name || '').trim();
  const recipientName = (recipient?.name || '').trim();
  const noteParts = [];
  if (buyerName) noteParts.push(`Buyer: ${buyerName}`);
  if (buyer?.email) noteParts.push(`Buyer email: ${buyer.email}`);
  if (recipientName) noteParts.push(`Recipient: ${recipientName}`);
  if (recipient?.email) noteParts.push(`Recipient email: ${recipient.email}`);
  if (deliveryTarget) noteParts.push(`Delivery: ${deliveryTarget}`);
  if (wantsPhysical && shipping?.address) {
    const addr = shipping.address;
    const line = [addr.line1, addr.line2, addr.city, addr.state, addr.postal].filter(Boolean).join(', ');
    if (line) noteParts.push(`Ship: ${line}`);
  }
  if (note) noteParts.push(`Note: ${String(note).slice(0, 120)}`);

  try {
    const response = await sq.checkoutApi.createPaymentLink({
      idempotencyKey: createKey(),
      order: {
        locationId: LOCATION_ID,
        lineItems: [
          {
            name: 'Local Effort gift card',
            quantity: '1',
            basePriceMoney: { amount: amountCents, currency: 'USD' },
          },
        ],
        note: noteParts.join(' | ').slice(0, 500),
      },
      checkoutOptions: {
        redirectUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/#gift-cards` : undefined,
      },
    });
    const url = response?.result?.paymentLink?.url;
    if (!url) return res.status(500).json({ error: 'Failed to create payment link' });
    return res.status(200).json({ url });
  } catch (err) {
    const msg = err?.errors ? JSON.stringify(err.errors) : err?.message || 'Failed to create payment link';
    return res.status(500).json({ error: msg });
  }
};
