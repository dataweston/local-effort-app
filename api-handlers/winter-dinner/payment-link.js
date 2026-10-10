const { prisma } = require('../_lib/prisma');
const { createHostedPaymentLink } = require('../../backend/api/finance/hostedPaymentLinks');
const { buildWinterDinnerConfirmationFacts } = require('./confirmation-facts');
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

  if (!prisma) return res.status(503).json({ error: 'Payment records unavailable' });
  const { customer = {}, dietaryRestrictions, drinkMenu, amount, quantity, checkoutAttemptId } = req.body || {};
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

    const amountCents = Math.round(ticketPrice);
    const facts = buildWinterDinnerConfirmationFacts({ customer, dietaryRestrictions, drinkMenu, ticketPrice: amountCents, ticketCount });
    const url = await createHostedPaymentLink({
      prisma, squareClient: sq, locationId: LOCATION_ID, flow: 'winter-dinner', checkoutAttemptId, customer, totalCents: amountCents,
      lines: [{ name: `Winter Dinner (${ticketCount} ticket${ticketCount > 1 ? 's' : ''})`, quantity: 1, unitPriceCents: amountCents, totalCents: amountCents }],
      facts,
      basket: { customer, dietaryRestrictions: dietaryRestrictions || '', drinkMenu: drinkMenu || '', amountCents, ticketCount },
      note,
      checkoutOptions: { redirectUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/winter-dinner` : undefined },
    });
    return res.status(200).json({ url });
  } catch (err) {
    return res.status(err?.statusCode === 409 ? 409 : 500).json({ error: 'Failed to create payment link' });
  }
};
