// POST /api/store/checkout
// Expects { customer, pickup, items, token, store, verificationToken?, checkoutAttemptId? }
// Items shape: [{ productId, variationId, qty, addOnIndices?, dairyFree?, title }]
//
// IMPORTANT: the total charged is ALWAYS recomputed server-side from Sanity prices.
// The frontend unitPrice is used only for the order summary display in emails — never
// for the charged amount.

const { Client, Environment } = require('square');
const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');
const sanity = require('@sanity/client');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = process.env.SQUARE_ENVIRONMENT || 'Production';

const projectId =
  process.env.VITE_APP_SANITY_PROJECT_ID ||
  process.env.VITE_SANITY_PROJECT_ID ||
  process.env.SANITY_PROJECT_ID;
const dataset =
  process.env.VITE_APP_SANITY_DATASET ||
  process.env.VITE_SANITY_DATASET ||
  process.env.SANITY_DATASET;

const sanityClient =
  projectId && dataset
    ? sanity.createClient({ projectId, dataset, useCdn: false, apiVersion: '2023-05-03' })
    : null;

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
  // handle at runtime
}

// Fetch canonical product data from Sanity for price verification.
const fetchProducts = async (ids) => {
  if (!sanityClient || !ids.length) return {};
  const query = `*[_type == "product" && _id in $ids]{
    _id, title, price, salePrice,
    variants[]{squareVariationId, price},
    addOns[]{name, additionalCost},
    offerDairyFree, dairyFreeCost
  }`;
  const docs = await sanityClient.fetch(query, { ids });
  return Object.fromEntries((docs || []).map((d) => [d._id, d]));
};

// Resolve server-side unit price for one item.
const resolveUnitPrice = (doc, variationId, addOnIndices, dairyFree) => {
  let base = doc.salePrice ?? doc.price ?? 0;
  if (variationId && Array.isArray(doc.variants)) {
    const v = doc.variants.find((vt) => vt.squareVariationId === variationId);
    if (v && typeof v.price === 'number') base = v.price;
  }
  let addOnTotal = 0;
  if (Array.isArray(addOnIndices) && Array.isArray(doc.addOns)) {
    for (const idx of addOnIndices) {
      addOnTotal += doc.addOns[idx]?.additionalCost || 0;
    }
  }
  const dairyFreeCost = (dairyFree && doc.offerDairyFree) ? (doc.dairyFreeCost || 0) : 0;
  return base + addOnTotal + dairyFreeCost;
};

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!sq) return res.status(500).json({ error: 'Square not configured' });

    const { items, customer, token, store, verificationToken, checkoutAttemptId } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'No items' });
    if (!token) return res.status(400).json({ error: 'Missing payment token' });

    // Validate item shapes
    for (const item of items) {
      if (!item.productId) return res.status(400).json({ error: 'Each item needs productId' });
      const qty = Number(item.qty);
      if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'Invalid qty' });
    }

    // ── Server-side price recomputation ──────────────────────────────────────
    const ids = [...new Set(items.map((i) => i.productId))];
    const productMap = await fetchProducts(ids);

    let amount = 0;
    const pricedLines = [];

    for (const item of items) {
      const doc = productMap[item.productId];
      if (!doc) return res.status(422).json({ error: `Product not found: ${item.productId}` });

      const qty = Math.max(1, Number(item.qty) || 1);
      const unitPrice = resolveUnitPrice(
        doc,
        item.variationId || null,
        item.addOnIndices || [],
        item.dairyFree || false,
      );
      const lineTotal = unitPrice * qty;
      amount += lineTotal;
      pricedLines.push({
        productId: item.productId,
        variationId: item.variationId || null,
        title: doc.title || item.title || '',
        qty,
        unitPrice,
        lineTotal,
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Store-specific pickup information
    const storePickupInfo = {
      'tiny-diner': {
        name: 'Tiny Diner',
        date: 'October 31, 2025',
        time: '4-7pm',
        address: '1024 E 38th St, Minneapolis',
      },
      'happy-monday': {
        name: 'Happy Monday Coffee',
        date: 'October 23, 2025',
        time: '4-7pm',
        address: '2420 Cleveland Ave N, Roseville',
      },
      'sale': {
        name: 'Local Effort',
        date: 'TBD',
        time: 'TBD',
        address: 'Details will be sent separately',
      },
      'chez-garage': {
        name: 'Chez Garage',
        date: 'TBD',
        time: 'TBD',
        address: 'Details will be sent separately',
      },
    };
    const pickupDetails = storePickupInfo[store] || storePickupInfo['sale'];

    const idempotencyKey =
      sanitizeIdempotencyKey(checkoutAttemptId) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const storeLabel = pickupDetails.name || store || 'Local Effort';
    const orderNote = `[${storeLabel}] ${customer?.name || 'Customer'} - ${pricedLines.length} item(s)`;

    const body = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: Number(amount), currency: 'USD' },
      locationId: LOCATION_ID,
      autocomplete: true,
      buyerEmailAddress: customer?.email,
      note: orderNote,
      referenceId: `${store}-${Date.now()}`,
    };
    if (verificationToken) body.verificationToken = verificationToken;

    const resp = await sq.paymentsApi.createPayment(body);
    const paymentId = resp.result.payment?.id;

    // Log to Firestore
    const { firestore } = getFirebaseAdmin();
    if (firestore) {
      try {
        await firestore.collection('store_orders').add({
          store: store || 'sale',
          storeName: pickupDetails.name,
          paymentId,
          customer: {
            name: customer?.name || 'Unknown',
            email: customer?.email || '',
            phone: customer?.phone || '',
          },
          items: pricedLines,
          amount,
          amountUsd: (amount / 100).toFixed(2),
          pickup: pickupDetails,
          createdAt: new Date().toISOString(),
          createdAtMs: Date.now(),
        });
      } catch (err) {
        console.error('⚠️  Failed to log order to Firestore:', err.message);
      }
    }

    // Best-effort emails via Brevo
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const TEAM_EMAIL = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
    const SENDER_EMAIL = process.env.SENDER_EMAIL || TEAM_EMAIL;
    const customerEmail = customer?.email;

    if (BREVO_API_KEY && TEAM_EMAIL && SENDER_EMAIL) {
      const summary = pricedLines.map((l) => `• ${l.title} x${l.qty} — $${(l.unitPrice / 100).toFixed(2)}`).join('\n');
      const totalUsd = (amount / 100).toFixed(2);
      const storeHeader = `STORE: ${pickupDetails.name.toUpperCase()}\n`;
      const pickupInfo = `\n\n${storeHeader}PICKUP:\nWhen: ${pickupDetails.date} at ${pickupDetails.time}\nWhere: ${pickupDetails.name}\n${pickupDetails.address}\n`;
      const friendly = `Hi ${customer?.name || 'there'},\n\nThanks for your order! Here's a summary:\n\n${summary}\n\nTotal: $${totalUsd}${pickupInfo}\nWe'll be in touch.\n\n— Local Effort`;
      const teamBody = `NEW ORDER - ${pickupDetails.name.toUpperCase()}\nStore: ${store}\n\nPayment: ${paymentId || ''}\nCustomer: ${customer?.name || 'Unknown'}\nEmail: ${customerEmail || 'N/A'}\nPhone: ${customer?.phone || 'N/A'}\n\n${summary}\n\nTotal: $${totalUsd}${pickupInfo}`;
      const headers = { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' };

      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST', headers,
          body: JSON.stringify({
            to: [{ email: TEAM_EMAIL }],
            sender: { email: SENDER_EMAIL, name: 'Local Effort' },
            subject: `New Order - ${pickupDetails.name}`,
            textContent: teamBody,
          }),
        });
      } catch (_) { /* ignore */ }

      if (customerEmail) {
        try {
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST', headers,
            body: JSON.stringify({
              to: [{ email: customerEmail }],
              sender: { email: SENDER_EMAIL, name: 'Local Effort' },
              subject: `Thanks for your order from ${pickupDetails.name}!`,
              textContent: friendly,
            }),
          });
        } catch (_) { /* ignore */ }
      }
    }

    return res.status(200).json({ ok: true, paymentId, amountCents: amount });
  } catch (e) {
    const msg = (e?.errors && JSON.stringify(e.errors)) || e?.message || 'Checkout failed';
    res.status(500).json({ error: msg });
  }
};
