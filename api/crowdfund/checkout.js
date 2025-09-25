// POST /api/crowdfund/checkout
// Accepts embedded card payment (Square) for crowdfunding pizzas / pledges.
// Body: { items: [{ name, price (in cents), quantity, type, pizzaCount }], funderName, token, pizzaQty }

const { Client, Environment } = require('square');
const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = ((process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase() === 'sandbox') ? 'Sandbox' : 'Production';

let sq = null;
try {
  if (ACCESS_TOKEN) {
    const env = Environment[ENV_NAME] || Environment.Production;
    sq = new Client({ accessToken: ACCESS_TOKEN, environment: env });
    /* eslint-disable no-console */
    if (process.env.NODE_ENV !== 'production') {
      console.log('[crowdfund.checkout] Square client initialized', { env: ENV_NAME, locPresent: !!LOCATION_ID, tokenTail: ACCESS_TOKEN.slice(-4) });
    }
    /* eslint-enable no-console */
  }
} catch (_) { /* ignore init errors */ }

// Firestore (for updating pizzasSold) — reuse backend server style if available
let db = null;
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    // Expect credentials to already be provisioned via GOOGLE_APPLICATION_CREDENTIALS or env vars.
    admin.initializeApp();
  }
  db = admin.firestore();
} catch (_) { /* ignore Firestore errors; endpoint will still process payment */ }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (!sq) return res.status(500).json({ error: 'Square not configured' });
  const { items, funderName, token, email, phone, notes, notify } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing payment token' });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'No items' });

    // Items have price in cents now (unlike contribute endpoint which used dollars)
    const lineTotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    if (!lineTotal) return res.status(400).json({ error: 'Invalid total' });

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const metaNoteParts = [funderName || 'Anonymous'];
    if (email) metaNoteParts.push(email);
    if (phone) metaNoteParts.push(phone);
    if (notify && notify !== 'none') metaNoteParts.push(`notify:${notify}`);
    const noteStr = metaNoteParts.join(' | ').slice(0, 500);
    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: Math.round(lineTotal), currency: 'USD' },
      locationId: LOCATION_ID,
      note: noteStr,
      autocomplete: true,
    };

  const resp = await sq.paymentsApi.createPayment(paymentBody);
    const paymentId = resp.result.payment?.id;

    // Update crowdfund totals (best-effort) — count pizzas from items where type === 'pizza'
    if (db) {
      try {
        const pizzasInCart = items.filter(p => p.type === 'pizza').reduce((sum, it) => sum + (it.pizzaCount || it.quantity || 1), 0);
        if (pizzasInCart > 0) {
          const docRef = db.collection('crowdfund').doc('status');
          await db.runTransaction(async (tx) => {
            const doc = await tx.get(docRef);
            if (!doc.exists) {
              tx.set(docRef, { goal: 1000, pizzasSold: pizzasInCart, funders: [{ name: funderName, date: new Date().toISOString() }] });
            } else {
              const data = doc.data() || {};
              const funders = Array.isArray(data.funders) ? data.funders : [];
              funders.push({ name: funderName, date: new Date().toISOString(), email: email || null, phone: phone || null, notes: notes || null, notify: notify || 'none', pizzas: pizzasInCart });
              tx.update(docRef, { pizzasSold: (data.pizzasSold || 0) + pizzasInCart, funders });
            }
          });
        }
      } catch (err) {
        console.warn('Failed to update crowdfund metrics after payment', err?.message);
      }
    }

    return res.status(200).json({ ok: true, paymentId });
  } catch (e) {
    const squareErrors = e?.errors ? e.errors.map(er => ({ code: er.code, detail: er.detail })).slice(0,3) : null;
    if (squareErrors) console.warn('[crowdfund.checkout] Square errors', squareErrors);
    const msg = squareErrors ? JSON.stringify(squareErrors) : (e?.message || 'Crowdfund checkout failed');
    return res.status(500).json({ error: msg });
  }
};