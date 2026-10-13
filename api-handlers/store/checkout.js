// POST /api/store/checkout
// Expects { customer, pickup, address, items, token, store, verificationToken?, checkoutAttemptId? }.
// The amount charged is always recomputed server-side from canonical product data.

const { Client, Environment } = require('square');
const sanity = require('@sanity/client');
const { resolveCommercialProductRef } = require('../../backend/api/pricing/commercialCatalogBridge');
const { priceStorefrontCart } = require('../../backend/api/pricing/storefrontCatalogService');
const { validateSmithOrder } = require('./_pizzaOnSmith');
const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');
const { prisma } = require('../_lib/prisma');
const { businessLineForStore } = require('../../backend/api/finance/businessLines');
const { startCommercialCheckout } = require('../../backend/api/finance/commercialOrders');
const {
  markPaymentAttemptFailed,
  markPaymentAttemptSucceeded,
} = require('../../backend/api/finance/paymentAttempts');
const { isRealIsoDate } = require('./_dateSelection');
const {
  pickupByStore,
  resolveDeliveryMinimum,
  resolveFulfillmentFee,
  normalizePickupWindow,
  storeUsesUnifiedFulfillment,
  PIZZA_ORDER_START,
  PIZZA_ORDER_END,
  PIZZA_FULFILLMENT_DATE,
} = require('./_fulfillment');
const { buildPizzaCustomerConfirmationHtml } = require('./_confirmation-email');
const { getManualInventoryRequirements, reserveManualInventory, releaseManualInventory } = require('./_manualInventory');
const { buildDirectSaleConfirmations, queueSaleConfirmations } = require('./sale-confirmation-outbox');
const PIZZA_EMAIL_IMAGE_URL = 'https://res.cloudinary.com/dokyhfvyd/image/upload/f_jpg,q_85,w_900,c_limit/v1769659841/b4eqpmf6wiusuziyxaly.heic';

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

const confirmationHtml = (text) => {
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const paragraphs = String(text || '').split('\n').map((line) => `<p style="margin:0 0 12px;line-height:1.55">${escapeHtml(line) || '&nbsp;'}</p>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#f7f5f1;color:#28231e;font:15px/1.55 Arial,sans-serif"><main style="max-width:600px;margin:24px auto;padding:28px;background:#fff;border:1px solid #e7e1d8"><p style="margin:0 0 20px;color:#8b4b31;letter-spacing:.08em;text-transform:uppercase;font-size:12px">Local Effort Cooperative</p>${paragraphs}<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e7e1d8;font-size:13px;color:#625c55">Questions? Reply to this email or contact yum@localeffortfood.com.</p></main></body></html>`;
};

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


// Commercial sale lines for Finance Core. Each priced basket line becomes one
// order line keyed by its Sanity product id, and a charged delivery fee becomes
// its own fee line so margin work never mistakes fulfilment revenue for food.
const buildCommercialLines = (pricedLines, deliveryFee) => {
  const lines = pricedLines.map((line) => {
    const productRef = resolveCommercialProductRef({
      store: line.store || 'sale',
      sourceSystem: line.sourceSystem,
      productId: line.productId,
      productTitle: line.title || line.productId,
      productKey: line.productKey,
      offerKey: line.offerKey,
    });
    return {
      lineType: 'item',
      sku: line.offerKey,
      name: line.title || 'Store item',
      description: line.optionSummary || null,
      quantity: line.qty,
      unitPriceCents: line.unitPrice,
      totalCents: line.lineTotal,
      sourceSystem: productRef.sourceSystem,
      sourceId: line.productId,
      commercialProductId: line.commercialProductId,
      commercialOfferId: line.commercialOfferId,
      priceBookId: line.priceBookId,
      catalogRevision: line.catalogRevision,
      metadata: {
        variationId: line.variationId || null,
        addOnKeys: line.addOnKeys || [],
        pricingRuleKeys: line.pricingRuleKeys || [],
        priceBookKey: line.priceBookKey,
        priceBookVersion: line.priceBookVersion,
        addOnIndices: line.addOnIndices,
        dairyFree: line.dairyFree,
        selectedDate: line.selectedDate || null,
        productKey: line.productKey || productRef.productKey,
        offerKey: line.offerKey || productRef.offerKey,
        businessLineKey: line.businessLineKey || productRef.businessLineKey,
        store: line.store || 'sale',
      },
    };
  });

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

module.exports = async (req, res, { emailOutboxService } = {}) => {
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
      fulfillmentMethod = pickup ? 'pickup' : 'delivery',
      address,
      deliveryInstructions = '',
      pickupWindow,
      customerNotes = '',
      verificationToken,
      checkoutAttemptId,
      pricingVersion,
      smsReleaseOptIn = false,
      fulfillmentAreaConfirmed = false,
    } = req.body || {};

    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'No items' });
    if (!token) return res.status(400).json({ error: 'Missing payment token' });
    if (store === 'pizza-on-smith' && (Date.now() < Date.parse(PIZZA_ORDER_START) || Date.now() >= Date.parse(PIZZA_ORDER_END))) {
      return res.status(409).json({ error: 'Pizza on Smith orders are open October 13–28, 2026.', code: 'ordering-window-closed' });
    }
    if (store === 'pizza-on-smith' && fulfillmentMethod !== 'pickup' && fulfillmentAreaConfirmed !== true) {
      return res.status(422).json({ error: 'Confirm your address is within the selected fulfillment area.', code: 'fulfillment-area-unconfirmed' });
    }
    if (!pricingVersion) return res.status(409).json({ error: 'Prices changed; review your bag before checking out.', code: 'catalog-price-changed' });

    for (const item of items) {
      if (!item?.productId) return res.status(400).json({ error: 'Each item needs productId' });
      const qty = Number(item.qty);
      if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'Invalid qty' });
    }

    const smithError = validateSmithOrder(items, store, pickup, fulfillmentMethod);
    if (smithError) return res.status(422).json({ error: smithError });

    const priced = await priceStorefrontCart({ store, items, fulfillment: { pickup }, expectedPriceBookVersion: pricingVersion, prisma });
    const pricedLines = priced.lines;
    const productMap = Object.fromEntries(pricedLines.map((line) => [line.productId, line]));
    let amount = priced.subtotal;

    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(422).json({ error: 'Invalid order total' });
    }

    const subtotal = amount;

    if (!pickup) {
      const pickupOnlyLine = pricedLines.find(
        (line) => line.allowsDelivery === false,
      );
      if (pickupOnlyLine) {
        throw Object.assign(
          new Error(`${pickupOnlyLine.title} is pickup only. Choose pickup or remove it from your bag. No payment was taken.`),
          {statusCode: 409, code: 'pickup-only-product'},
        );
      }
      const deliveryMinimum = resolveDeliveryMinimum(store, fulfillmentMethod);
      if (deliveryMinimum && subtotal < deliveryMinimum) {
        throw Object.assign(
          new Error(`${store === 'pizza-on-smith' ? 'Pizza on Smith shipping' : 'Chez Garage delivery'} requires a $${(deliveryMinimum / 100).toFixed(0)} merchandise minimum. Add $${((deliveryMinimum - subtotal) / 100).toFixed(2)} more or choose pickup. No payment was taken.`),
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
    const deliveryFee = resolveFulfillmentFee(store, pickup, fulfillmentMethod);
    amount = subtotal + deliveryFee;

    const pickupDetails = pickupByStore[store] || pickupByStore.sale;
    const fulfillment = pickup ? 'pickup' : fulfillmentMethod === 'shipping' ? 'shipping' : store === 'pizza-on-smith' ? 'metro_delivery' : 'local_delivery';
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
    const TEAM_EMAIL = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
    const SENDER_EMAIL = process.env.SENDER_EMAIL || TEAM_EMAIL;
    const customerEmail = customer?.email;
    const factsLines = pricedLines.map((line) => {
      const options = line.optionSummary ? ` (${line.optionSummary})` : '';
      const selectedDate = line.selectedDate ? ` — Date: ${line.selectedDate}` : '';
      return `- ${line.title}${options}${selectedDate} x${line.qty} - $${(line.unitPrice / 100).toFixed(2)}`;
    }).join('\n');
    const pickupWhen = store === 'pizza-on-smith'
      ? PIZZA_FULFILLMENT_DATE
      : store === 'chez-garage'
        ? pickupDetails.date
        : resolvedPickupWindow
          ? `${pickupDetails.date} ${resolvedPickupWindow}`
          : `${pickupDetails.date}${pickupDetails.time ? ` at ${pickupDetails.time}` : ''}`;
    const deliveryAddress = normalizedAddress
      ? [
          normalizedAddress.line1,
          normalizedAddress.line2,
          [normalizedAddress.city, normalizedAddress.state, normalizedAddress.postal].filter(Boolean).join(', '),
        ].filter(Boolean).join('\n')
      : '';
    const notesLine = trimmedCustomerNotes ? `\nNotes: ${trimmedCustomerNotes}` : '';
    const fulfillmentLabel = store === 'pizza-on-smith'
      ? fulfillmentMethod === 'shipping' ? 'SHIPPING' : 'METRO DELIVERY'
      : 'LOCAL DELIVERY';
    const fulfillmentInfo = pickup
      ? `\n\nSTORE: ${pickupDetails.name.toUpperCase()}\nPICKUP:\nWhen: ${pickupWhen}\nWhere: ${pickupDetails.name}\n${pickupDetails.address}${notesLine}\n`
      : `\n\nSTORE: ${pickupDetails.name.toUpperCase()}\n${fulfillmentLabel}:\n${deliveryAddress || 'Address not provided'}${deliveryInstructions ? `\nDelivery notes: ${deliveryInstructions}` : ''}${notesLine}${store === 'pizza-on-smith' ? `\nFulfillment: ${PIZZA_FULFILLMENT_DATE}` : ''}\n`;
    const subtotalUsd = (subtotal / 100).toFixed(2);
    const totalUsd = (amount / 100).toFixed(2);
    const feeLabel = fulfillmentMethod === 'shipping' ? 'Shipping' : 'Delivery';
    const totalsBlock = deliveryFee > 0
      ? `Subtotal: $${subtotalUsd}\n${feeLabel}: $${(deliveryFee / 100).toFixed(2)}\nTotal: $${totalUsd}`
      : `Total: $${totalUsd}`;
    const friendly = `Hi ${customer?.name || 'there'},\n\nThanks for your order! Here's a summary:\n\n${factsLines}\n\n${totalsBlock}${fulfillmentInfo}\nPayment reference: {{paymentId}}\nWe'll be in touch.\n\n- Local Effort`;
    const pizzaCustomerHtml = store === 'pizza-on-smith'
      ? buildPizzaCustomerConfirmationHtml({
          imageUrl: PIZZA_EMAIL_IMAGE_URL,
          customerName: customer?.name || '',
          items: pricedLines.map((line) => ({
            title: line.title,
            optionSummary: line.optionSummary,
            qty: line.qty,
            unitPrice: line.unitPrice,
          })),
          subtotal,
          feeLabel,
          fee: deliveryFee,
          total: amount,
          fulfillment: fulfillmentInfo.trim(),
        })
      : null;
    const teamBody = `NEW ORDER - ${pickupDetails.name.toUpperCase()}\nStore: ${store}\n\nPayment: {{paymentId}}\nCustomer: ${customer?.name || 'Unknown'}\nEmail: ${customerEmail || 'N/A'}\nPhone: ${customer?.phone || 'N/A'}\n\n${factsLines}\n\n${totalsBlock}${fulfillmentInfo}`;
    const saleConfirmationFacts = {
      flow: 'store',
      title: `Thanks for your order from ${pickupDetails.name}`,
      customer: {
        name: customer?.name || 'Unknown',
        email: customer?.email || '',
        phone: customer?.phone || '',
        smsReleaseOptIn: store === 'pizza-on-smith' && smsReleaseOptIn === true,
      },
      store,
      storeName: pickupDetails.name,
      fulfillment,
      pickupWindow: resolvedPickupWindow,
      pickup: pickupDetails,
      deliveryAddress: normalizedAddress,
      deliveryInstructions: typeof deliveryInstructions === 'string' ? deliveryInstructions.slice(0, 1000) : '',
      customerNotes: trimmedCustomerNotes,
      subtotalCents: subtotal,
      deliveryFeeCents: deliveryFee,
      totalCents: amount,
      lines: pricedLines,
      details: {
        Store: pickupDetails.name,
        Items: factsLines,
        Subtotal: `$${(subtotal / 100).toFixed(2)}`,
        [fulfillmentMethod === 'shipping' ? 'Shipping' : 'Delivery']: deliveryFee > 0 ? `$${(deliveryFee / 100).toFixed(2)}` : 'None',
        Total: `$${(amount / 100).toFixed(2)}`,
        Fulfillment: pickup
          ? `Pickup at ${pickupDetails.name}${pickupWhen ? ` — ${pickupWhen}` : ''}${pickupDetails.address ? `\n${pickupDetails.address}` : ''}`
          : `${fulfillmentLabel}${store === 'pizza-on-smith' ? ` — ${PIZZA_FULFILLMENT_DATE}` : ''}\n${deliveryAddress || 'Address not provided'}`,
        'Delivery notes': typeof deliveryInstructions === 'string' ? deliveryInstructions.slice(0, 1000) : '',
        Notes: trimmedCustomerNotes,
        Phone: customer?.phone || '',
      },
      confirmationTemplates: [
        ...(TEAM_EMAIL && SENDER_EMAIL ? [{
          role: 'owner',
          payload: {
            to: [{ email: TEAM_EMAIL }],
            sender: { email: SENDER_EMAIL, name: 'Local Effort' },
            subject: `New Order - ${pickupDetails.name}`,
            replyTo: { email: TEAM_EMAIL, name: 'Local Effort' },
            textContent: teamBody,
            htmlContent: confirmationHtml(teamBody),
          },
        }] : []),
        ...(customerEmail && SENDER_EMAIL ? [{
          role: 'customer',
          payload: {
            to: [{ email: customerEmail }],
            sender: { email: SENDER_EMAIL, name: 'Local Effort' },
            subject: `Thanks for your order from ${pickupDetails.name}!`,
            replyTo: { email: TEAM_EMAIL || SENDER_EMAIL, name: 'Local Effort' },
            textContent: friendly,
            htmlContent: pizzaCustomerHtml || confirmationHtml(friendly),
          },
        }] : []),
      ],
    };

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
        smsReleaseOptIn: store === 'pizza-on-smith' && smsReleaseOptIn === true,
        fulfillmentMethod: store === 'pizza-on-smith' ? fulfillmentMethod : pickup ? 'pickup' : 'delivery',
        fulfillmentAreaConfirmed: store === 'pizza-on-smith' && fulfillmentAreaConfirmed === true,
        pickupWindow: resolvedPickupWindow,
        deliveryFeeCents: deliveryFee,
        itemCount: pricedLines.reduce((sum, line) => sum + line.qty, 0),
        saleConfirmationFacts,
      },
      basket: {
        store,
        fulfillment,
        pickupWindow: resolvedPickupWindow,
        deliveryAddress: normalizedAddress,
        deliveryFeeCents: deliveryFee,
        priceBookKey: priced.priceBookKey,
        priceBookVersion: priced.priceBookVersion,
        pricingVersion: priced.pricingVersion,
        lines: pricedLines.map((line) => ({
          productId: line.productId,
          offerKey: line.offerKey,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          totalCents: line.totalCents,
          variationId: line.variationId,
          addOnKeys: line.addOnKeys,
          dairyFree: line.dairyFree,
          selectedDate: line.selectedDate,
        })),
      },
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


    if (TEAM_EMAIL && SENDER_EMAIL) {
      try {
        await queueSaleConfirmations({
          emailOutboxService,
          payment,
          paymentId,
          confirmations: buildDirectSaleConfirmations(
            'store',
            { ...saleConfirmationFacts, paymentId },
            { ownerEmail: TEAM_EMAIL, senderEmail: SENDER_EMAIL },
          ),
        });
      } catch (confirmationError) {
        console.error('[store.checkout] payment captured; confirmation queue reconciliation pending', {
          paymentId,
          error: confirmationError?.message || confirmationError,
        });
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
module.exports.queueSaleConfirmations = queueSaleConfirmations;
