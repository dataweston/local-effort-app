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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!sq) {
    return res.status(500).json({ error: 'Square not configured' });
  }
  if (!LOCATION_ID) {
    return res.status(500).json({ error: 'Square location missing' });
  }

  const { amount, name, email, phone, eventDate, notes } = req.body || {};
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const amountCents = Math.round(numericAmount * 100);
    const noteParts = [];
    if (name) noteParts.push(`Name: ${String(name).trim()}`);
    if (email) noteParts.push(`Email: ${String(email).trim()}`);
    if (phone) noteParts.push(`Phone: ${String(phone).trim()}`);
    if (eventDate) noteParts.push(`Event: ${String(eventDate).trim()}`);
    if (notes) noteParts.push(`Notes: ${String(notes).trim().slice(0, 120)}`);
    const note = noteParts.join(' | ').slice(0, 500);

    const response = await sq.checkoutApi.createPaymentLink({
      idempotencyKey: createKey(),
      order: {
        locationId: LOCATION_ID,
        lineItems: [
          {
            name: 'Food truck deposit',
            quantity: '1',
            basePriceMoney: { amount: amountCents, currency: 'USD' },
          },
        ],
        note,
      },
      checkoutOptions: {
        redirectUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/book-food-truck` : undefined,
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
