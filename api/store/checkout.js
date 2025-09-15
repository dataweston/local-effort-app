// POST /api/store/checkout
// Expects { customer, pickup, items, token } and captures payment via Square in production.
const { Client, Environment } = require('square');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;

const sq = ACCESS_TOKEN ? new Client({ accessToken: ACCESS_TOKEN, environment: Environment.Production }) : null;

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
      amountMoney: { amount: BigInt(amount), currency: 'USD' },
      locationId: LOCATION_ID,
      autocomplete: true,
      buyerEmailAddress: customer?.email,
      note: 'Local Effort web checkout',
    };

    const resp = await sq.paymentsApi.createPayment(body);
    return res.status(200).json({ ok: true, paymentId: resp.result.payment?.id });
  } catch (e) {
    const msg = e?.message || (e?.errors && JSON.stringify(e.errors)) || 'Checkout failed';
    res.status(500).json({ error: msg });
  }
};
// POST /api/store/checkout
// Accepts cart and customer, creates order and captures payment via Square (to be implemented)

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
  const { items, customer } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Empty cart' });
  if (!customer || !customer.email) return res.status(400).json({ error: 'Missing customer' });
    // TODO: Integrate Square Orders + Payments API here using production keys via env
    // For now, dummy response
    const orderId = 'TEST-' + Date.now();
    res.status(200).json({ ok: true, orderId });
  } catch (e) {
    res.status(500).json({ error: e && (e.message || String(e)) });
  }
};
