// POST /api/store/checkout
// Expects { customer, pickup, items, token } and captures payment via Square.
const { Client, Environment } = require('square');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = process.env.SQUARE_ENVIRONMENT || 'Production'; // 'Production' or 'Sandbox'

let sq = null;
try {
  if (ACCESS_TOKEN) {
    const env = (Environment && Environment[ENV_NAME]) ? Environment[ENV_NAME] : Environment.Production;
    sq = new Client({ accessToken: ACCESS_TOKEN, environment: env });
  }
} catch (e) {
  // do not throw during module init; handle at runtime
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!sq) return res.status(500).json({ error: 'Square not configured' });
    const { items, customer, token } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'No items' });
    if (!token) return res.status(400).json({ error: 'Missing payment token' });

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Create payment directly (no explicit order API required for simple sales)
    const amount = items.reduce((s, i) => s + Number(i.unitPrice || 0) * Number(i.qty || 1), 0);
    const body = {
      sourceId: token, // from Square Web Payments SDK on frontend
      idempotencyKey,
      amountMoney: { amount: Number(amount), currency: 'USD' },
      locationId: LOCATION_ID,
      autocomplete: true,
      buyerEmailAddress: customer?.email,
      note: 'Local Effort web checkout',
    };

    const resp = await sq.paymentsApi.createPayment(body);
    return res.status(200).json({ ok: true, paymentId: resp.result.payment?.id });
  } catch (e) {
    const msg = (e?.errors && JSON.stringify(e.errors)) || e?.message || 'Checkout failed';
    res.status(500).json({ error: msg });
  }
};
