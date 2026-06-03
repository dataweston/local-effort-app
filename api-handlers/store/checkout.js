// POST /api/store/checkout
// Expects { customer, pickup, address, items, token, store, verificationToken?, checkoutAttemptId? }.
// The amount charged is always recomputed server-side from canonical product data.

const { Client, Environment } = require('square');
const sanity = require('@sanity/client');
const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');
const { getGeneratedSaleProductMap } = require('./_saleCatalog');

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
} catch (_) {
  sq = null;
}

const normalizeAddOnIndices = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((idx) => Number(idx))
      .filter((idx) => Number.isInteger(idx) && idx >= 0)
  )].sort((a, b) => a - b);
};

const fetchProducts = async (ids) => {
  const fallback = getGeneratedSaleProductMap(ids);
  if (!sanityClient || !ids.length) return fallback;

  const query = `*[_type == "product" && _id in $ids]{
    _id, title, price, salePrice,
    variants[]{name, squareVariationId, price},
    addOns[]{name, additionalCost},
    offerDairyFree, dairyFreeCost
  }`;

  try {
    const docs = await sanityClient.fetch(query, { ids });
    return {
      ...fallback,
      ...Object.fromEntries((docs || []).map((doc) => [doc._id, doc])),
    };
  } catch (error) {
    if (ids.every((id) => fallback[id])) return fallback;
    throw error;
  }
};

const resolveUnitPrice = (doc, variationId, addOnIndices, dairyFree) => {
  let base = doc.salePrice ?? doc.price ?? 0;
  if (variationId && Array.isArray(doc.variants)) {
    const variant = doc.variants.find((entry) => entry.squareVariationId === variationId);
    if (variant && typeof variant.price === 'number') base = variant.price;
  }

  const addOnTotal = addOnIndices.reduce(
    (sum, idx) => sum + (doc.addOns?.[idx]?.additionalCost || 0),
    0
  );
  const dairyFreeCost = dairyFree && doc.offerDairyFree ? (doc.dairyFreeCost || 0) : 0;
  return base + addOnTotal + dairyFreeCost;
};

const buildOptionSummary = (doc, variationId, addOnIndices, dairyFree) => {
  const labels = [];
  if (variationId && Array.isArray(doc.variants)) {
    const variant = doc.variants.find((entry) => entry.squareVariationId === variationId);
    if (variant?.name) labels.push(variant.name);
  }
  addOnIndices.forEach((idx) => {
    const name = doc.addOns?.[idx]?.name;
    if (name) labels.push(name);
  });
  if (dairyFree && doc.offerDairyFree) labels.push('Dairy-free');
  return labels.join(', ');
};

const normalizeAddress = (address) => {
  if (!address || typeof address !== 'object') return null;
  return {
    line1: String(address.line1 || '').trim(),
    line2: String(address.line2 || '').trim(),
    city: String(address.city || '').trim(),
    state: String(address.state || '').trim(),
    postal: String(address.postal || '').trim(),
  };
};

const pickupByStore = {
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
  sale: {
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

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!sq) return res.status(500).json({ error: 'Square not configured' });
    if (!LOCATION_ID) return res.status(500).json({ error: 'Square location missing' });

    const {
      items,
      customer,
      token,
      store = 'sale',
      pickup = true,
      address,
      deliveryInstructions = '',
      verificationToken,
      checkoutAttemptId,
    } = req.body || {};

    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'No items' });
    if (!token) return res.status(400).json({ error: 'Missing payment token' });

    for (const item of items) {
      if (!item?.productId) return res.status(400).json({ error: 'Each item needs productId' });
      const qty = Number(item.qty);
      if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'Invalid qty' });
    }

    const ids = [...new Set(items.map((item) => item.productId))];
    const productMap = await fetchProducts(ids);
    const pricedLines = [];
    let amount = 0;

    for (const item of items) {
      const doc = productMap[item.productId];
      if (!doc) return res.status(422).json({ error: `Product not found: ${item.productId}` });

      const qty = Math.max(1, Number(item.qty) || 1);
      const variationId = item.variationId || null;
      const addOnIndices = normalizeAddOnIndices(item.addOnIndices);
      const dairyFree = !!item.dairyFree;
      const unitPrice = resolveUnitPrice(doc, variationId, addOnIndices, dairyFree);
      const lineTotal = unitPrice * qty;
      amount += lineTotal;
      pricedLines.push({
        productId: item.productId,
        variationId,
        title: doc.title || item.title || '',
        qty,
        unitPrice,
        lineTotal,
        addOnIndices,
        dairyFree,
        optionSummary: buildOptionSummary(doc, variationId, addOnIndices, dairyFree),
      });
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(422).json({ error: 'Invalid order total' });
    }

    const pickupDetails = pickupByStore[store] || pickupByStore.sale;
    const fulfillment = pickup ? 'pickup' : 'local_delivery';
    const normalizedAddress = pickup ? null : normalizeAddress(address);
    const idempotencyKey =
      sanitizeIdempotencyKey(checkoutAttemptId) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storeLabel = pickupDetails.name || store || 'Local Effort';

    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: Number(amount), currency: 'USD' },
      locationId: LOCATION_ID,
      autocomplete: true,
      buyerEmailAddress: customer?.email || undefined,
      note: `[${storeLabel}] ${customer?.name || 'Customer'} - ${pricedLines.length} item(s) - ${fulfillment}`,
      referenceId: `${store}-${Date.now()}`,
    };
    if (verificationToken) paymentBody.verificationToken = verificationToken;

    const resp = await sq.paymentsApi.createPayment(paymentBody);
    const paymentId = resp.result.payment?.id;

    const { firestore } = getFirebaseAdmin();
    if (firestore) {
      try {
        await firestore.collection('store_orders').add({
          store,
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
          fulfillment,
          deliveryAddress: normalizedAddress,
          deliveryInstructions: typeof deliveryInstructions === 'string' ? deliveryInstructions.slice(0, 1000) : '',
          pickup: pickupDetails,
          createdAt: new Date().toISOString(),
          createdAtMs: Date.now(),
        });
      } catch (err) {
        console.error('[store.checkout] failed to log order', err?.message || err);
      }
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const TEAM_EMAIL = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
    const SENDER_EMAIL = process.env.SENDER_EMAIL || TEAM_EMAIL;
    const customerEmail = customer?.email;

    if (BREVO_API_KEY && TEAM_EMAIL && SENDER_EMAIL) {
      const summary = pricedLines.map((line) => {
        const options = line.optionSummary ? ` (${line.optionSummary})` : '';
        return `- ${line.title}${options} x${line.qty} - $${(line.unitPrice / 100).toFixed(2)}`;
      }).join('\n');
      const totalUsd = (amount / 100).toFixed(2);
      const deliveryAddress = normalizedAddress
        ? [
            normalizedAddress.line1,
            normalizedAddress.line2,
            [normalizedAddress.city, normalizedAddress.state, normalizedAddress.postal].filter(Boolean).join(', '),
          ].filter(Boolean).join('\n')
        : '';
      const fulfillmentInfo = pickup
        ? `\n\nSTORE: ${pickupDetails.name.toUpperCase()}\nPICKUP:\nWhen: ${pickupDetails.date} at ${pickupDetails.time}\nWhere: ${pickupDetails.name}\n${pickupDetails.address}\n`
        : `\n\nSTORE: ${pickupDetails.name.toUpperCase()}\nLOCAL DELIVERY:\n${deliveryAddress || 'Address not provided'}${deliveryInstructions ? `\nNotes: ${deliveryInstructions}` : ''}\n`;
      const friendly = `Hi ${customer?.name || 'there'},\n\nThanks for your order! Here's a summary:\n\n${summary}\n\nTotal: $${totalUsd}${fulfillmentInfo}\nWe'll be in touch.\n\n- Local Effort`;
      const teamBody = `NEW ORDER - ${pickupDetails.name.toUpperCase()}\nStore: ${store}\n\nPayment: ${paymentId || ''}\nCustomer: ${customer?.name || 'Unknown'}\nEmail: ${customerEmail || 'N/A'}\nPhone: ${customer?.phone || 'N/A'}\n\n${summary}\n\nTotal: $${totalUsd}${fulfillmentInfo}`;
      const headers = { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' };

      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            to: [{ email: TEAM_EMAIL }],
            sender: { email: SENDER_EMAIL, name: 'Local Effort' },
            subject: `New Order - ${pickupDetails.name}`,
            textContent: teamBody,
          }),
        });
      } catch (_) {
        // Email is best effort.
      }

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
        } catch (_) {
          // Email is best effort.
        }
      }
    }

    return res.status(200).json({ ok: true, paymentId, amountCents: amount, lines: pricedLines });
  } catch (error) {
    const msg = (error?.errors && JSON.stringify(error.errors)) || error?.message || 'Checkout failed';
    return res.status(500).json({ error: msg });
  }
};
