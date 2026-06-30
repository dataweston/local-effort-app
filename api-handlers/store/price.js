// POST /api/store/price
// Accepts a cart payload, resolves authoritative prices from Sanity, returns
// a fully server-computed pricing breakdown. The frontend must never show a
// total it computed itself — only what this endpoint returns.
//
// Body: {
//   items: [{ productId, variationId, qty, addOnIndices?, dairyFree? }]
// }
//
// Response: {
//   lines: [{ productId, variationId, qty, title, unitPrice, lineTotal, addOns, dairyFree }],
//   subtotal, fulfillmentFee, total, currency, pricedAt
// }

const sanity = require('@sanity/client');
const { getGeneratedSaleProductMap } = require('./_saleCatalog');
const { LOCAL_DELIVERY_FEE_CENTS, resolveFulfillmentFee } = require('./_fulfillment');

const projectId =
  process.env.VITE_APP_SANITY_PROJECT_ID ||
  process.env.VITE_SANITY_PROJECT_ID ||
  process.env.SANITY_PROJECT_ID;
const dataset =
  process.env.VITE_APP_SANITY_DATASET ||
  process.env.VITE_SANITY_DATASET ||
  process.env.SANITY_DATASET;

const client =
  projectId && dataset
    ? sanity.createClient({ projectId, dataset, useCdn: false, apiVersion: '2023-05-03' })
    : null;

// Fetch canonical product data keyed by Sanity _id.
const fetchProducts = async (ids) => {
  const fallback = getGeneratedSaleProductMap(ids);
  if (!client || !ids.length) return fallback;
  const query = `*[_type == "product" && _id in $ids]{
    _id,
    title,
    price,
    salePrice,
    variants[]{squareVariationId, price},
    addOns[]{name, additionalCost},
    offerDairyFree,
    dairyFreeCost,
    inventoryMode,
    manualQty
  }`;
  const docs = await client.fetch(query, { ids });
  return {
    ...fallback,
    ...Object.fromEntries((docs || []).map((d) => [d._id, d])),
  };
};

// Resolve the canonical unit price for one item in cents.
const resolveUnitPrice = (doc, variationId, addOnIndices, dairyFree) => {
  let base = doc.salePrice ?? doc.price ?? 0;

  // Variant override
  if (variationId && Array.isArray(doc.variants)) {
    const v = doc.variants.find((vt) => vt.squareVariationId === variationId);
    if (v && typeof v.price === 'number') base = v.price;
  }

  // Add-ons
  let addOnTotal = 0;
  const resolvedAddOns = [];
  if (Array.isArray(addOnIndices) && Array.isArray(doc.addOns)) {
    for (const idx of addOnIndices) {
      const addon = doc.addOns[idx];
      if (addon) {
        addOnTotal += addon.additionalCost || 0;
        resolvedAddOns.push({ name: addon.name, cost: addon.additionalCost || 0 });
      }
    }
  }

  // Dairy-free
  let dairyFreeCost = 0;
  if (dairyFree && doc.offerDairyFree) {
    dairyFreeCost = doc.dairyFreeCost || 0;
  }

  return {
    unitPrice: base + addOnTotal + dairyFreeCost,
    addOns: resolvedAddOns,
    dairyFree: !!dairyFree,
    dairyFreeCost,
  };
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { items, store = 'sale', pickup = true } = req.body || {};
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'items required' });
  }

  // Validate item shape
  for (const item of items) {
    if (!item.productId) return res.status(400).json({ error: 'Each item needs productId' });
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ error: 'Each item needs qty >= 1' });
    }
  }

  try {
    const ids = [...new Set(items.map((i) => i.productId))];
    const productMap = await fetchProducts(ids);

    const lines = [];
    let subtotal = 0;

    for (const item of items) {
      const doc = productMap[item.productId];
      if (!doc) {
        return res.status(422).json({ error: `Product not found: ${item.productId}` });
      }

      const qty = Math.max(1, Number(item.qty) || 1);
      const { unitPrice, addOns, dairyFree, dairyFreeCost } = resolveUnitPrice(
        doc,
        item.variationId || null,
        item.addOnIndices || [],
        item.dairyFree || false,
      );

      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;

      lines.push({
        productId: item.productId,
        variationId: item.variationId || null,
        qty,
        title: doc.title,
        unitPrice,
        lineTotal,
        addOns,
        dairyFree,
        dairyFreeCost,
      });
    }

    // Local delivery adds a flat fee; pickup is always free. The same helper
    // is used by /api/store/checkout so the displayed total matches the charge.
    const fulfillmentFee = resolveFulfillmentFee(store, pickup !== false);

    return res.status(200).json({
      lines,
      subtotal,
      fulfillmentFee,
      total: subtotal + fulfillmentFee,
      localDeliveryFee: LOCAL_DELIVERY_FEE_CENTS,
      currency: 'USD',
      pricedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[store/price]', err?.message);
    return res.status(500).json({ error: err?.message || 'Pricing failed' });
  }
};
