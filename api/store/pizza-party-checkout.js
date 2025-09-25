// POST /api/store/pizza-party-checkout
// Body: { date: 'Oct 2', email, addOnGuests: number, token, basePriceCents, addOnPricePerGuestCents }
// Creates a direct Square payment instead of a hosted payment link. Returns { ok, paymentId }.

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
      console.log('[pizza-party.checkout] Square client initialized', { env: ENV_NAME, locPresent: !!LOCATION_ID, tokenTail: ACCESS_TOKEN.slice(-4) });
    }
    /* eslint-enable no-console */
  }
} catch (e) {
  // swallow; handled later
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!sq) return res.status(500).json({ error: 'Square not configured' });
  const { date, email, addOnGuests = 0, token, basePriceCents = 30000, addOnPricePerGuestCents = 900 } = req.body || {};
  if (!date || !token) return res.status(400).json({ error: 'Missing required fields (date, token)' });
  try {
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const guestsInt = parseInt(addOnGuests, 10) || 0;
    const amount = basePriceCents + (guestsInt > 0 ? guestsInt * addOnPricePerGuestCents : 0);
    const paymentsApi = sq.paymentsApi;
    const paymentBody = {
      idempotencyKey,
      sourceId: token,
      locationId: LOCATION_ID,
      amountMoney: { amount, currency: 'USD' },
      note: `PizzaParty ${date}${guestsInt>0?` +${guestsInt} add-on`:''}`,
      buyerEmailAddress: email || undefined,
      metadata: { pizza_party_date: date, add_on_guests: String(guestsInt) }
    };
    const resp = await paymentsApi.createPayment(paymentBody);
    const paymentId = resp.result.payment?.id;
    if (!paymentId) throw new Error('Payment failed');
    return res.status(200).json({ ok: true, paymentId });
  } catch (e) {
    const squareErrors = e?.errors ? e.errors.map(er => ({ code: er.code, detail: er.detail })).slice(0,3) : null;
    if (squareErrors) console.warn('[pizza-party.checkout] Square errors', squareErrors);
    const msg = squareErrors ? JSON.stringify(squareErrors) : (e?.message || 'Payment error');
    return res.status(500).json({ error: msg });
  }
};
