// GET /api/store/pizza-party-link?date=Oct%202
// Returns a Square payment link (or error) for the $300 Pizza Party event specifying the selected date in the note.
// If Square Checkout API (payment links) is not desired, we could fall back to a simple intent creation.
// For now we'll use Orders + CreatePaymentLink for clarity.

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
} catch (e) {
  // ignore; will be handled at runtime
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!sq) return res.status(500).json({ error: 'Square not configured' });

  const { date } = req.query || {};
  if (!date) return res.status(400).json({ error: 'Missing date' });

  try {
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const orderBody = {
      order: {
        locationId: LOCATION_ID,
        lineItems: [
          {
            name: 'In-Home Pizza Party (Up to 15 Guests)',
            quantity: '1',
            basePriceMoney: { amount: 30000, currency: 'USD' }, // $300
            note: `Selected date: ${date}`,
          },
        ],
        state: 'OPEN',
        metadata: { pizza_party_date: date },
        referenceId: `pizza-party-${date}`,
      },
      idempotencyKey,
    };

    const orderResp = await sq.ordersApi.createOrder(orderBody);
    const orderId = orderResp.result.order?.id;
    if (!orderId) throw new Error('Order creation failed');

    const linkBody = {
      idempotencyKey: `${idempotencyKey}-link`,
      orderId,
      checkoutOptions: {
        merchantSupportEmail: process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL,
        askForShippingAddress: false,
        redirectUrl: `${process.env.PUBLIC_BASE_URL || ''}/pizza-party?booked=${encodeURIComponent(date)}`,
        enableTipping: false,
        // optional: prePopulateBuyerEmail
      },
    };

    const linkResp = await sq.checkoutApi.createPaymentLink(linkBody);
    const url = linkResp.result.paymentLink?.url;
    if (!url) throw new Error('No payment link URL returned');

    return res.status(200).json({ ok: true, url });
  } catch (e) {
    const msg = (e?.errors && JSON.stringify(e.errors)) || e?.message || 'Failed to create payment link';
    return res.status(500).json({ error: msg });
  }
};
