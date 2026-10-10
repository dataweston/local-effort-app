const { prisma } = require('../_lib/prisma');
const { createHostedPaymentLink } = require('../../backend/api/finance/hostedPaymentLinks');
const { buildFebruaryConfirmationFacts } = require('./confirmation-facts');
const { getSquareClient } = require('../_lib/squareClient');

const MIN_GUESTS = 4;
const MAX_GUESTS = 12;

const PARTY_PRICES_CENTS = {
  4: 30000,
  5: 36000,
  6: 42000,
  7: 49000,
  8: 52000,
  9: 58500,
  10: 65000,
  11: 71500,
  12: 78000,
};

const getPartyPrice = (guests) => {
  const clamped = Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, guests));
  return PARTY_PRICES_CENTS[clamped] || PARTY_PRICES_CENTS[MIN_GUESTS];
};

const parseFebruaryDate = (isoDate) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || '')) return null;
  const [year, month, day] = isoDate.split('-').map((part) => parseInt(part, 10));
  if (month !== 2) return null;
  const date = new Date(year, month - 1, day, 12, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getMonth() !== 1 || date.getDate() !== day) return null;
  const weekday = date.getDay();
  const isAvailable = weekday === 4 || weekday === 6;
  return { date, isAvailable };
};


module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { client: squareClient, locationId } = getSquareClient();
  if (!squareClient) return res.status(500).json({ error: 'Square not configured' });
  if (!locationId) return res.status(500).json({ error: 'Square location missing' });

  if (!prisma) return res.status(503).json({ error: 'Payment records unavailable' });
  const { date, guestCount, preferredTime, dietaryNotes, notes, customer = {}, address = {}, checkoutAttemptId } = req.body || {};
  if (!date) return res.status(400).json({ error: 'Missing date' });

  const parsedDate = parseFebruaryDate(date);
  if (!parsedDate || !parsedDate.isAvailable) {
    return res.status(400).json({ error: 'Selected date is unavailable' });
  }

  const guests = Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, parseInt(guestCount, 10) || MIN_GUESTS));
  const amountCents = getPartyPrice(guests);

  try {
    const facts = buildFebruaryConfirmationFacts({ date, guests, amountCents, preferredTime, dietaryNotes, notes, customer, address });
    const url = await createHostedPaymentLink({
      prisma, squareClient, locationId, flow: 'february', checkoutAttemptId, customer, totalCents: amountCents,
      lines: [{ name: `February chef dinner (${guests} guests)`, quantity: 1, unitPriceCents: amountCents, totalCents: amountCents }],
      facts,
      basket: { date, guests, amountCents, preferredTime: preferredTime || '', dietaryNotes: dietaryNotes || '', notes: notes || '', customer, address },
      note: `February dinner ${date} for ${guests} guests${preferredTime ? ` @ ${preferredTime}` : ''}`.slice(0, 500),
      checkoutOptions: { redirectUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/february` : undefined },
    });
    return res.status(200).json({ url });
  } catch (err) {
    return res.status(err?.statusCode === 409 ? 409 : 500).json({ error: 'Failed to create payment link' });
  }
};
