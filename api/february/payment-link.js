const crypto = require('crypto');
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

const createKey = () => (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { client: squareClient, locationId } = getSquareClient();
  if (!squareClient) return res.status(500).json({ error: 'Square not configured' });
  if (!locationId) return res.status(500).json({ error: 'Square location missing' });

  const { date, guestCount, preferredTime } = req.body || {};
  if (!date) return res.status(400).json({ error: 'Missing date' });

  const parsedDate = parseFebruaryDate(date);
  if (!parsedDate || !parsedDate.isAvailable) {
    return res.status(400).json({ error: 'Selected date is unavailable' });
  }

  const guests = Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, parseInt(guestCount, 10) || MIN_GUESTS));
  const amountCents = getPartyPrice(guests);

  try {
    const note = `February dinner ${date} for ${guests} guests${preferredTime ? ` @ ${preferredTime}` : ''}`.slice(0, 500);
    const response = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: createKey(),
      order: {
        locationId,
        lineItems: [
          {
            name: `February chef dinner (${guests} guests)`,
            quantity: '1',
            basePriceMoney: { amount: amountCents, currency: 'USD' },
          },
        ],
        note,
      },
      checkoutOptions: {
        redirectUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/february` : undefined,
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
