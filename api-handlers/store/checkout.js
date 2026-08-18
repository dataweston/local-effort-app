// POST /api/store/checkout
// Expects { customer, pickup, address, items, token, store, verificationToken?, checkoutAttemptId? }.
// The amount charged is always recomputed server-side from canonical product data.

const { Client, Environment } = require('square');
const sanity = require('@sanity/client');
const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');
const { prisma } = require('../_lib/prisma');
const { businessLineForStore } = require('../../backend/api/finance/businessLines');
const { startCommercialCheckout } = require('../../backend/api/finance/commercialOrders');
const {
  markPaymentAttemptFailed,
  markPaymentAttemptSucceeded,
} = require('../../backend/api/finance/paymentAttempts');
const { getGeneratedSaleProductMap } = require('./_saleCatalog');
const { isRealIsoDate, isSelectableDate } = require('./_dateSelection');
const {
  getManualInventoryRequirements,
  releaseManualInventory,
  reserveManualInventory,
} = require('./_manualInventory');
const {
  pickupByStore,
  resolveDeliveryMinimum,
  resolveFulfillmentFee,
  normalizePickupWindow,
  storeUsesUnifiedFulfillment,
} = require('./_fulfillment');

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
const sanityWriteToken = process.env.SANITY_WRITE_TOKEN;

const sanityClient =
  projectId && dataset
    ? sanity.createClient({
        projectId,
        dataset,
        token: sanityWriteToken,
        useCdn: false,
        perspective: 'published',
        apiVersion: '2025-02-19',
      })
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
    offerDairyFree, dairyFreeCost,
    inventoryMode, manualQty,
    allowsDelivery,
    requiresDateSelection
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

// Commercial sale lines for Finance Core. Each priced basket line becomes one
// order line keyed by its Sanity product id, and a charged delivery fee becomes
// its own fee line so margin work never mistakes fulfilment revenue for food.
const buildCommercialLines = (pricedLines, deliveryFee) => {
  const lines = pricedLines.map((line) => ({
    lineType: 'item',
    sku: line.productId,
    name: line.title || 'Store item',
    description: line.optionSummary || null,
    quantity: line.qty,
    unitPriceCents: line.unitPrice,
    totalCents: line.lineTotal,
    sourceSystem: 'sanity',
    sourceId: line.variationId || line.productId,
    metadata: {
      variationId: line.variationId || null,
      addOnIndices: line.addOnIndices,
      dairyFree: line.dairyFree,
      selectedDate: line.selectedDate || null,
    },
  }));

  if (deliveryFee > 0) {
    lines.push({
      lineType: 'fee',
      name: 'Local delivery',
      quantity: 1,
      unitPriceCents: deliveryFee,
      totalCents: deliveryFee,
      sourceSystem: 'store',
      sourceId: 'local_delivery_fee',
    });
  }

  return lines;
};

// The earliest customer-chosen date in the basket is when this order is owed.
// Step 6's expected-value windows need a service date, not just a booking date.
const earliestServiceDate = (pricedLines) => {
  const dates = pricedLines
    .map((line) => line.selectedDate)
    .filter((date) => isRealIsoDate(date))
    .sort();
  return dates.length ? new Date(`${dates[0]}T12:00:00Z`) : null;
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

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!sq) return res.status(500).json({ error: 'Square not configured' });
    if (!LOCATION_ID) return res.status(500).json({ error: 'Square location missing' });
    // Payment integrity is fail-closed: the booked commercial order and its
    // pending attempt must exist before Square is allowed to move money.
    if (!prisma) {
      return res.status(503).json({
        error: 'Ordering database unavailable. No payment was taken; please try again shortly.',
        code: 'ordering-database-unavailable',
      });
    }

    const {
      items,
      customer,
      token,
      store = 'sale',
      pickup = true,
      address,
      deliveryInstructions = '',
      pickupWindow,
      customerNotes = '',
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
      const selectedDate = String(item.selectedDate || '').trim();
      if (
        doc.requiresDateSelection === true &&
        !isSelectableDate(selectedDate)
      ) {
        return res.status(422).json({
          error: `Choose a future date for ${doc.title || 'this event'}. No payment was taken.`,
        });
      }
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
        selectedDate,
        optionSummary: buildOptionSummary(doc, variationId, addOnIndices, dairyFree),
      });
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(422).json({ error: 'Invalid order total' });
    }

    const subtotal = amount;

    if (!pickup) {
      const pickupOnlyLine = pricedLines.find(
        (line) => productMap[line.productId]?.allowsDelivery === false,
      );
      if (pickupOnlyLine) {
        throw Object.assign(
          new Error(`${pickupOnlyLine.title} is pickup only. Choose pickup or remove it from your bag. No payment was taken.`),
          {statusCode: 409, code: 'pickup-only-product'},
        );
      }
      const deliveryMinimum = resolveDeliveryMinimum(store);
      if (deliveryMinimum && subtotal < deliveryMinimum) {
        throw Object.assign(
          new Error(`Chez Garage delivery requires a $${(deliveryMinimum / 100).toFixed(0)} merchandise minimum. Add $${((deliveryMinimum - subtotal) / 100).toFixed(2)} more or choose pickup. No payment was taken.`),
          {statusCode: 409, code: 'delivery-minimum'},
        );
      }
      const deliveryAddress = normalizeAddress(address);
      if (
        !deliveryAddress?.line1 ||
        !deliveryAddress?.city ||
        !deliveryAddress?.state ||
        deliveryAddress.postal.replace(/\D/g, '').length < 5
      ) {
        throw Object.assign(
          new Error('A complete local-delivery address is required. No payment was taken.'),
          {statusCode: 400, code: 'delivery-address-required'},
        );
      }
    }

    // Local delivery adds a flat fee, recomputed server-side from the same
    // helper the pricing endpoint uses so the charge matches what was shown.
    const deliveryFee = resolveFulfillmentFee(store, pickup);
    amount = subtotal + deliveryFee;

    const pickupDetails = pickupByStore[store] || pickupByStore.sale;
    const fulfillment = pickup ? 'pickup' : 'local_delivery';
    const normalizedAddress = pickup ? null : normalizeAddress(address);
    // Resolve the chosen Wednesday pickup window for unified-fulfillment stores.
    const resolvedPickupWindow =
      pickup && storeUsesUnifiedFulfillment(store) ? normalizePickupWindow(pickupWindow) : null;
    const trimmedCustomerNotes =
      typeof customerNotes === 'string' ? customerNotes.trim().slice(0, 1000) : '';
    const idempotencyKey =
      sanitizeIdempotencyKey(checkoutAttemptId) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storeLabel = pickupDetails.name || store || 'Local Effort';

    // Finance Core: book the commercial order and a pending payment attempt
    // before the processor is called. Firestore below is now a downstream
    // mirror of this record, not the order of record.
    const checkout = await startCommercialCheckout({
      prisma,
      idempotencyKey,
      sourceSystem: 'store',
      sourceId: idempotencyKey,
      channel: 'store',
      businessLineKey: businessLineForStore(store),
      customerName: customer?.name || null,
      customerEmail: customer?.email || null,
      subtotalCents: subtotal,
      totalCents: amount,
      serviceStartAt: earliestServiceDate(pricedLines),
      lines: buildCommercialLines(pricedLines, deliveryFee),
      orderMetadata: {
        store,
        storeName: pickupDetails.name,
        fulfillment,
        pickupWindow: resolvedPickupWindow,
        deliveryFeeCents: deliveryFee,
        itemCount: pricedLines.reduce((sum, line) => sum + line.qty, 0),
      },
      attemptMetadata: { channel: 'store', store },
    });

    // The provider already captured this exact attempt. Return the first
    // outcome instead of charging a second time.
    if (checkout.replay === 'succeeded') {
      return res.status(200).json({
        ok: true,
        paymentId: checkout.attempt.externalPaymentId,
        orderId: checkout.order?.id || null,
        amountCents: amount,
        subtotalCents: subtotal,
        deliveryFeeCents: deliveryFee,
        lines: pricedLines,
        idempotentReplay: true,
      });
    }

    const commercialOrderId = checkout.order?.id || null;
    const paymentAttemptId = checkout.attempt.id;

    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: Number(amount), currency: 'USD' },
      locationId: LOCATION_ID,
      autocomplete: true,
      buyerEmailAddress: customer?.email || undefined,
      note: `[${storeLabel}] ${customer?.name || 'Customer'} - ${pricedLines.length} item(s) - ${fulfillment}`,
      // Our order id, not a timestamp: the payment must point back at the
      // business record, and the business record must not be a provider id.
      referenceId: commercialOrderId,
    };
    if (verificationToken) paymentBody.verificationToken = verificationToken;

    const inventoryRequirements = getManualInventoryRequirements(pricedLines, productMap);
    if (inventoryRequirements.length && !sanityWriteToken) {
      throw Object.assign(
        new Error('Inventory is temporarily unavailable. No payment was taken; please try again shortly.'),
        {statusCode: 503, code: 'inventory-unavailable'},
      );
    }

    // Reserve manual inventory before charging. Revision guards make concurrent
    // checkouts retry against the newest quantity instead of overselling.
    const inventoryReservation = await reserveManualInventory(
      inventoryRequirements.length ? sanityClient : null,
      inventoryRequirements,
    );

    let resp;
    try {
      resp = await sq.paymentsApi.createPayment(paymentBody);
    } catch (paymentError) {
      try {
        await releaseManualInventory(sanityClient, inventoryReservation);
      } catch (releaseError) {
        console.error('[store.checkout] failed to release inventory after payment failure', {
          releaseError: releaseError?.message || releaseError,
          inventoryReservation,
        });
      }
      // The order and attempt survive the failure carrying why it failed.
      try {
        await markPaymentAttemptFailed({ prisma, attemptId: paymentAttemptId, error: paymentError });
      } catch (stateError) {
        console.error('[store.checkout] failed to persist payment failure', {
          commercialOrderId,
          error: stateError?.message || stateError,
        });
      }
      throw paymentError;
    }
    const payment = resp.result.payment;
    const paymentId = payment?.id;

    let reconciliationPending = false;
    try {
      await markPaymentAttemptSucceeded({
        prisma,
        attemptId: paymentAttemptId,
        provider: 'square',
        payment,
        amountCents: amount,
      });
    } catch (stateError) {
      // Money moved. The pending attempt is the recovery anchor the webhook
      // reconciles later; never tell a paid customer their payment failed.
      reconciliationPending = true;
      console.error('[store.checkout] payment captured; state reconciliation pending', {
        commercialOrderId,
        paymentId,
        error: stateError?.message || stateError,
      });
    }

    const { firestore } = getFirebaseAdmin();
    if (firestore) {
      try {
        await firestore.collection('store_orders').add({
          store,
          storeName: pickupDetails.name,
          paymentId,
          // Mirror only: the durable order lives in CommercialOrder.
          commercialOrderId,
          customer: {
            name: customer?.name || 'Unknown',
            email: customer?.email || '',
            phone: customer?.phone || '',
          },
          items: pricedLines,
          subtotal,
          deliveryFee,
          amount,
          amountUsd: (amount / 100).toFixed(2),
          fulfillment,
          deliveryAddress: normalizedAddress,
          deliveryInstructions: typeof deliveryInstructions === 'string' ? deliveryInstructions.slice(0, 1000) : '',
          customerNotes: trimmedCustomerNotes,
          pickupWindow: resolvedPickupWindow,
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
        const selectedDate = line.selectedDate ? ` — Date: ${line.selectedDate}` : '';
        return `- ${line.title}${options}${selectedDate} x${line.qty} - $${(line.unitPrice / 100).toFixed(2)}`;
      }).join('\n');
      const subtotalUsd = (subtotal / 100).toFixed(2);
      const totalUsd = (amount / 100).toFixed(2);
      // Show a delivery-fee line only when one was charged.
      const totalsBlock = deliveryFee > 0
        ? `Subtotal: $${subtotalUsd}\nLocal delivery: $${(deliveryFee / 100).toFixed(2)}\nTotal: $${totalUsd}`
        : `Total: $${totalUsd}`;
      const deliveryAddress = normalizedAddress
        ? [
            normalizedAddress.line1,
            normalizedAddress.line2,
            [normalizedAddress.city, normalizedAddress.state, normalizedAddress.postal].filter(Boolean).join(', '),
          ].filter(Boolean).join('\n')
        : '';
      // Pickup "When" prefers the customer's chosen Wednesday window.
      const pickupWhen = store === 'chez-garage'
        ? pickupDetails.date
        : resolvedPickupWindow
          ? `${pickupDetails.date} ${resolvedPickupWindow}`
          : `${pickupDetails.date} at ${pickupDetails.time}`;
      const notesLine = trimmedCustomerNotes ? `\nNotes: ${trimmedCustomerNotes}` : '';
      const fulfillmentInfo = pickup
        ? `\n\nSTORE: ${pickupDetails.name.toUpperCase()}\nPICKUP:\nWhen: ${pickupWhen}\nWhere: ${pickupDetails.name}\n${pickupDetails.address}${notesLine}\n`
        : `\n\nSTORE: ${pickupDetails.name.toUpperCase()}\nLOCAL DELIVERY:\n${deliveryAddress || 'Address not provided'}${deliveryInstructions ? `\nDelivery notes: ${deliveryInstructions}` : ''}${notesLine}\n`;
      const friendly = `Hi ${customer?.name || 'there'},\n\nThanks for your order! Here's a summary:\n\n${summary}\n\n${totalsBlock}${fulfillmentInfo}\nWe'll be in touch.\n\n- Local Effort`;
      const teamBody = `NEW ORDER - ${pickupDetails.name.toUpperCase()}\nStore: ${store}\n\nPayment: ${paymentId || ''}\nCustomer: ${customer?.name || 'Unknown'}\nEmail: ${customerEmail || 'N/A'}\nPhone: ${customer?.phone || 'N/A'}\n\n${summary}\n\n${totalsBlock}${fulfillmentInfo}`;
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

    return res.status(200).json({
      ok: true,
      paymentId,
      orderId: commercialOrderId,
      amountCents: amount,
      subtotalCents: subtotal,
      deliveryFeeCents: deliveryFee,
      lines: pricedLines,
      ...(reconciliationPending ? { reconciliationPending: true } : {}),
    });
  } catch (error) {
    const msg = (error?.errors && JSON.stringify(error.errors)) || error?.message || 'Checkout failed';
    return res.status(error?.statusCode || 500).json({
      error: msg,
      ...(error?.code ? {code: error.code} : {}),
    });
  }
};
