const crypto = require('crypto');
const { Client, Environment } = require('square');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = process.env.SQUARE_ENVIRONMENT || 'Production';

let sq = null;
try {
  if (ACCESS_TOKEN) {
    const env = (Environment && Environment[ENV_NAME]) ? Environment[ENV_NAME] : Environment.Production;
    sq = new Client({ accessToken: ACCESS_TOKEN, environment: env });
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

  const { customer = {}, dietaryRestrictions, drinkMenu, amount, quantity } = req.body || {};
  const ticketCount = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
  const ticketPrice = Number(amount) || 7500;
  if (!ticketPrice || ticketPrice <= 0) {
    return res.status(400).json({ error: 'Invalid ticket amount' });
  }

  try {
    const noteParts = [];
    if (customer?.name) noteParts.push(customer.name);
    if (customer?.email) noteParts.push(customer.email);
    if (drinkMenu) noteParts.push(drinkMenu);
    if (dietaryRestrictions) noteParts.push(`Dietary: ${String(dietaryRestrictions).slice(0, 120)}`);
    const note = `Winter dinner tickets x${ticketCount} - ${noteParts.join(' | ')}`.slice(0, 500);

    const response = await sq.checkoutApi.createPaymentLink({
      idempotencyKey: createKey(),
      order: {
        locationId: LOCATION_ID,
        lineItems: [
          {
            name: `Winter Dinner (${ticketCount} ticket${ticketCount > 1 ? 's' : ''})`,
            quantity: '1',
            basePriceMoney: { amount: Math.round(ticketPrice), currency: 'USD' },
          },
        ],
        note,
      },
      checkoutOptions: {
        redirectUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/winter-dinner` : undefined,
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
