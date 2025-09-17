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
    const paymentId = resp.result.payment?.id;

    // Best-effort email via Brevo
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const TEAM_EMAIL = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
    const SENDER_EMAIL = process.env.SENDER_EMAIL || TEAM_EMAIL;
    const customerEmail = customer?.email;
    if (BREVO_API_KEY && TEAM_EMAIL && SENDER_EMAIL) {
      const summary = (items || []).map(i => `• ${i.title} x${i.qty} — $${(Number(i.unitPrice) / 100).toFixed(2)}`).join('\n');
      const totalUsd = (amount / 100).toFixed(2);
      const friendly = `Hi ${customer?.name || 'there'},\n\nThanks for your order! We're on it. Here's a quick summary:\n\n${summary}\n\nSubtotal: $${totalUsd}\n\nWe'll be in touch soon.\n\n— Local Effort`;
      const headers = { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' };

      // notify team
      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            to: [{ email: TEAM_EMAIL }],
            sender: { email: SENDER_EMAIL, name: 'Local Effort' },
            subject: 'New order',
            textContent: `Order ${paymentId || ''}\n\n${friendly}`,
          }),
        });
      } catch (_) { /* ignore email errors */ }

      // thank customer
      if (customerEmail) {
        try {
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              to: [{ email: customerEmail }],
              sender: { email: SENDER_EMAIL, name: 'Local Effort' },
              subject: 'Thanks for your order!',
              textContent: friendly,
            }),
          });
        } catch (_) { /* ignore email errors */ }
      }
    }

    return res.status(200).json({ ok: true, paymentId });
  } catch (e) {
    const msg = (e?.errors && JSON.stringify(e.errors)) || e?.message || 'Checkout failed';
    res.status(500).json({ error: msg });
  }
};
