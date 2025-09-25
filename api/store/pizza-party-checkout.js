// POST /api/store/pizza-party-checkout
// Body: { date: 'Oct 2', email, addOnGuests: number, token, basePriceCents, addOnPricePerGuestCents }
// Creates a direct Square payment instead of a hosted payment link. Returns { ok, paymentId }.

const { Client, Environment } = require('square');
let db = null;
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp();
  db = admin.firestore();
} catch (_) { /* Firestore optional */ }

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
  const { date, email, name, phone, address, mealTime, pizzaRequests, addOnGuests = 0, token, basePriceCents = 30000, addOnPricePerGuestCents = 900 } = req.body || {};
  if (!date || !token) return res.status(400).json({ error: 'Missing required fields (date, token)' });
  if (!name || !phone || !(address && address.line1 && address.city && address.postal)) {
    return res.status(400).json({ error: 'Missing required contact information' });
  }
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
      note: `PizzaParty ${date}${guestsInt>0?` +${guestsInt} add-on`:''}${mealTime?` @ ${mealTime}`:''}`.slice(0,500),
      buyerEmailAddress: email || undefined,
      metadata: {
        pizza_party_date: date,
        add_on_guests: String(guestsInt),
        name: name?.slice(0,80) || '',
        phone: phone?.slice(0,30) || '',
        meal_time: mealTime || '',
        addr_line1: address?.line1?.slice(0,120) || '',
        addr_line2: address?.line2?.slice(0,120) || '',
        addr_city: address?.city?.slice(0,60) || '',
        addr_state: address?.state?.slice(0,10) || '',
        addr_postal: address?.postal?.slice(0,20) || '',
        pizza_requests: pizzaRequests ? pizzaRequests.slice(0,250) : ''
      }
    };
    const resp = await paymentsApi.createPayment(paymentBody);
    const paymentId = resp.result.payment?.id;
    if (!paymentId) throw new Error('Payment failed');
    // Persist booking & create calendar event (best-effort)
    if (db) {
      try {
        const createdAtIso = new Date().toISOString();
        const doc = {
          date,
          email: email || null,
          name: name || null,
          phone: phone || null,
          address: address || null,
          mealTime: mealTime || null,
          pizzaRequests: pizzaRequests || null,
          addOnGuests: guestsInt || 0,
          amountCents: amount,
          paymentId,
          createdAt: createdAtIso
        };
        // Create calendar event in gallant tool's 'events' collection
        // Date parsing heuristic: attempt to construct Date from provided date + optional mealTime.
        let eventDate = null;
        try {
          // If date already includes year assume current year if missing.
          const currentYear = new Date().getFullYear();
          // Examples: "Oct 2" or "Oct 2 2025"; mealTime like "Dinner" or "5:30 PM"
          const base = /\b\d{4}\b/.test(date) ? date : `${date} ${currentYear}`;
          // If mealTime looks like time digits include; else ignore textual labels.
            const timePart = /\d/.test(mealTime || '') ? mealTime : '12:00 PM';
          eventDate = new Date(`${base} ${timePart}`);
          if (isNaN(eventDate.getTime())) eventDate = null;
        } catch (_) { eventDate = null; }
        let eventId = null;
        try {
          const eventPayload = {
            title: `Pizza Party: ${name || 'Booking'}`.slice(0,80),
            date: eventDate ? eventDate : new Date(),
            status: 'pending',
            notes: [`Guests: ${1 + guestsInt}`, mealTime ? `Meal: ${mealTime}` : null, pizzaRequests ? `Requests: ${pizzaRequests}` : null, address?.line1 ? `Addr: ${address.line1}, ${address.city} ${address.state} ${address.postal}` : null, `BookingId: ${paymentId}`].filter(Boolean).join('\n').slice(0,2000),
            estimatedRevenue: amount / 100,
            estimatedFoodCost: 0,
            estimatedLaborCost: 0,
            repeat: 'none',
            repeatUntil: eventDate ? eventDate : new Date(),
            source: 'pizza-party-booking'
          };
          const evRef = await db.collection('events').add(eventPayload);
          eventId = evRef.id;
        } catch (calErr) {
          console.warn('[pizza-party.checkout] failed to create calendar event', calErr?.message);
        }
        if (eventId) doc.eventId = eventId;
        await db.collection('pizzaPartyBookings').doc(paymentId).set(doc, { merge: true });
      } catch (err) {
        console.warn('[pizza-party.checkout] failed to persist booking', err?.message);
      }
    }
    return res.status(200).json({ ok: true, paymentId });
  } catch (e) {
    const squareErrors = e?.errors ? e.errors.map(er => ({ code: er.code, detail: er.detail })).slice(0,3) : null;
    if (squareErrors) console.warn('[pizza-party.checkout] Square errors', squareErrors);
    const msg = squareErrors ? JSON.stringify(squareErrors) : (e?.message || 'Payment error');
    return res.status(500).json({ error: msg });
  }
};
