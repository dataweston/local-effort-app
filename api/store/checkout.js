// POST /api/store/checkout
// Expects { customer, pickup, items, token, store } and captures payment via Square.
const { Client, Environment } = require('square');
const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = process.env.SQUARE_ENVIRONMENT || 'Production'; // 'Production' or 'Sandbox'
const sanitizeIdempotencyKey = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 45);
};

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
    const { items, customer, token, store, verificationToken, checkoutAttemptId } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'No items' });
    if (!token) return res.status(400).json({ error: 'Missing payment token' });

    // Define store-specific pickup information
    const storePickupInfo = {
      'tiny-diner': {
        name: 'Tiny Diner',
        date: 'October 31, 2025',
        time: '4-7pm',
        address: '1024 E 38th St, Minneapolis'
      },
      'happy-monday': {
        name: 'Happy Monday Coffee',
        date: 'October 23, 2025',
        time: '4-7pm',
        address: '2420 Cleveland Ave N, Roseville'
      },
      'sale': {
        name: 'Local Effort',
        date: 'TBD',
        time: 'TBD',
        address: 'Details will be sent separately'
      },
      'chez-garage': {
        name: 'Chez Garage',
        date: 'TBD',
        time: 'TBD',
        address: 'Details will be sent separately'
      }
    };

    const pickupDetails = storePickupInfo[store] || storePickupInfo['sale'];

    const idempotencyKey =
      sanitizeIdempotencyKey(checkoutAttemptId) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Create payment directly (no explicit order API required for simple sales)
    const amount = items.reduce((s, i) => s + Number(i.unitPrice || 0) * Number(i.qty || 1), 0);
    
    // Build order note with store identifier
    const storeLabel = pickupDetails.name || store || 'Local Effort';
    const orderNote = `[${storeLabel}] ${customer?.name || 'Customer'} - ${items.length} item(s)`;
    
    const body = {
      sourceId: token, // from Square Web Payments SDK on frontend
      idempotencyKey,
      amountMoney: { amount: Number(amount), currency: 'USD' },
      locationId: LOCATION_ID,
      autocomplete: true,
      buyerEmailAddress: customer?.email,
      note: orderNote, // Now includes store identifier
      referenceId: `${store}-${Date.now()}`, // Store identifier in reference ID
    };
    if (verificationToken) {
      body.verificationToken = verificationToken;
    }

    const resp = await sq.paymentsApi.createPayment(body);
    const paymentId = resp.result.payment?.id;

    // Log order to Firestore for record-keeping and store-based organization
    const { firestore } = getFirebaseAdmin();
    if (firestore) {
      try {
        await firestore.collection('store_orders').add({
          store: store || 'sale', // Store identifier: 'tiny-diner', 'happy-monday', or 'sale'
          storeName: pickupDetails.name,
          paymentId,
          customer: {
            name: customer?.name || 'Unknown',
            email: customer?.email || '',
            phone: customer?.phone || '',
          },
          items: items.map(i => ({
            productId: i.productId,
            variationId: i.variationId,
            title: i.title,
            qty: i.qty,
            unitPrice: i.unitPrice,
          })),
          amount: amount,
          amountUsd: (amount / 100).toFixed(2),
          pickup: pickupDetails,
          createdAt: new Date().toISOString(),
          createdAtMs: Date.now(),
        });
        console.log(`✅ Order logged to Firestore: ${store} - ${paymentId}`);
      } catch (err) {
        console.error('⚠️  Failed to log order to Firestore:', err.message);
        // Don't fail the checkout if Firestore logging fails
      }
    }

    // Best-effort email via Brevo
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const TEAM_EMAIL = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
    const SENDER_EMAIL = process.env.SENDER_EMAIL || TEAM_EMAIL;
    const customerEmail = customer?.email;
    if (BREVO_API_KEY && TEAM_EMAIL && SENDER_EMAIL) {
      const summary = (items || []).map(i => `• ${i.title} x${i.qty} — $${(Number(i.unitPrice) / 100).toFixed(2)}`).join('\n');
      const totalUsd = (amount / 100).toFixed(2);
      
      // Build pickup information text with prominent store identification
      const storeHeader = `🏪 STORE: ${pickupDetails.name.toUpperCase()}\n`;
      const pickupInfo = `\n\n${storeHeader}📍 PICKUP INFORMATION:\nWhen: ${pickupDetails.date} at ${pickupDetails.time}\nWhere: ${pickupDetails.name}\n${pickupDetails.address}\n`;
      
      const friendly = `Hi ${customer?.name || 'there'},\n\nThanks for your order! We're on it. Here's a quick summary:\n\n${summary}\n\nSubtotal: $${totalUsd}${pickupInfo}\nWe'll be in touch soon.\n\n— Local Effort`;
      
      // Team notification with store prominently displayed in subject and body
      const teamSubject = `🛒 New Order - ${pickupDetails.name}`;
      const teamBody = `NEW ORDER FROM: ${pickupDetails.name.toUpperCase()}\nStore ID: ${store}\n\nOrder ${paymentId || ''}\nCustomer: ${customer?.name || 'Unknown'}\nEmail: ${customerEmail || 'N/A'}\nPhone: ${customer?.phone || 'N/A'}\n\n${summary}\n\nTotal: $${totalUsd}${pickupInfo}\n\n---\nThis order was placed via ${store === 'tiny-diner' ? 'Tiny Diner' : store === 'happy-monday' ? 'Happy Monday Coffee' : 'the general sale'} page.`;
      
      const headers = { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' };

      // notify team
      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            to: [{ email: TEAM_EMAIL }],
            sender: { email: SENDER_EMAIL, name: 'Local Effort' },
            subject: teamSubject,
            textContent: teamBody,
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
              subject: `Thanks for your order from ${pickupDetails.name}!`,
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
