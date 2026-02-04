const crypto = require('crypto');
const { Client: SquareClient, Environment } = require('square');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = process.env.SQUARE_ENVIRONMENT === 'production' ? 'Production' : 'Sandbox';

let sq = null;
try {
  if (ACCESS_TOKEN) {
    const env = Environment[ENV_NAME] || Environment.Production;
    sq = new SquareClient({ accessToken: ACCESS_TOKEN, environment: env });
  }
} catch (_) {
  sq = null;
}

const createKey = () => (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!sq) {
    return res.status(500).json({ error: 'Square not configured' });
  }
  if (!LOCATION_ID) {
    return res.status(500).json({ error: 'Square location missing' });
  }

  const {
    pizzaCount = 1,
    funderName = '',
    email = '',
    discountCode = '',
    totalCents,
    amountCents,
  } = req.body || {};

  const amount = Number(totalCents || amountCents || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid pledge amount' });
  }

  try {
    const noteParts = [];
    if (funderName) noteParts.push(`Name: ${funderName}`.trim());
    if (email) noteParts.push(`Email: ${email}`.trim());
    if (discountCode) noteParts.push(`Discount: ${discountCode}`.trim());
    const note = noteParts.join(' | ').slice(0, 500);

    const response = await sq.checkoutApi.createPaymentLink({
      idempotencyKey: createKey(),
      order: {
        locationId: LOCATION_ID,
        lineItems: [
          {
            name: `Pizza pledge (${pizzaCount} pizza${Number(pizzaCount) > 1 ? 's' : ''})`,
            quantity: '1',
            basePriceMoney: { amount: Math.round(amount), currency: 'USD' },
          },
        ],
        note,
      },
      checkoutOptions: {
        redirectUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/pizzafunder` : undefined,
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
