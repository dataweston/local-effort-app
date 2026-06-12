const crypto = require('crypto');
const { Client, Environment } = require('square');
const { PrismaClient } = require('@prisma/client');
const { getSanityClient, getSanityReadClient } = require('../../backend/api/sanityClient');
const { methodNotAllowed, cleanString } = require('./_http');
const { writeOrderBrainRecords } = require('./_localistOrderBrain');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = ((process.env.SQUARE_ENVIRONMENT || process.env.SQUARE_ENV || 'production').toLowerCase() === 'sandbox') ? 'Sandbox' : 'Production';
const LOCALIST_CUSTOMER_OPTIONS = new Map([
  ['glutenFree', 'Gluten free'],
  ['nutAllergy', 'Nut allergy'],
  ['vegetarian', 'Vegetarian'],
  ['dairyFree', 'Dairy free'],
]);
const PICKUP_WINDOWS = new Set([
  'Tuesday, 2pm-4pm',
  'Tuesday, 4pm-6pm',
  'Wednesday, 2pm-4pm',
  'Wednesday, 4pm-6pm',
]);
const HUB_MENU_AREAS = new Set(['localist', 'security']);
const SECURITY_PICKUP_WINDOW = 'Security at Neon';

let squareClient = null;
try {
  if (ACCESS_TOKEN) {
    const env = Environment?.[ENV_NAME] || Environment?.Production || ENV_NAME;
    squareClient = new Client({ accessToken: ACCESS_TOKEN, environment: env });
  }
} catch (_err) {
  squareClient = null;
}

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const LOCALIST_ITEMS_QUERY = `
*[
  _type == "hubLocalistItem" &&
  active != false &&
  defined(_id) &&
  (defined(name) || defined(title)) &&
  (
    $area in areas ||
    ($area == "localist" && (!defined(areas) || count(areas) == 0))
  )
] {
  _id,
  "name": coalesce(name, title),
  "price": coalesce(price, displayPrice, priceLabel),
  priceCents,
  inventoryCount
}`;

const createKey = () => (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));

function normalizeArea(value) {
  const area = String(value || 'localist').trim().toLowerCase();
  return HUB_MENU_AREAS.has(area) ? area : 'localist';
}

function requestOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}`;
}

function parsePriceCents(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value);

  const raw = String(value).trim();
  if (!raw) return null;
  const match = raw.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const dollars = Number(match[1]);
  if (!Number.isFinite(dollars) || dollars <= 0) return null;
  return Math.round(dollars * 100);
}

function parseExactCents(value) {
  const cents = Number(value);
  return Number.isFinite(cents) && cents > 0 ? Math.round(cents) : null;
}

function normalizeQuantity(value) {
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty < 1) return 0;
  return Math.min(qty, 20);
}

function parseInventoryCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.round(count) : null;
}

function normalizeCustomerOptions(value) {
  if (!value || typeof value !== 'object') return [];
  return Array.from(LOCALIST_CUSTOMER_OPTIONS.entries())
    .filter(([key]) => value[key] === true)
    .map(([, label]) => label);
}

function checkoutRedirectUrl(req, token, orderId, area) {
  const params = new URLSearchParams({ checkout: `${area}-success` });
  if (token) params.set('localist', token);
  if (orderId) params.set('localistOrder', orderId);
  const path = area === 'security' ? '/hub/security' : '/hub';
  return `${requestOrigin(req)}${path}?${params.toString()}`;
}

async function validateWindow(token) {
  if (!token) return;
  if (!prisma) {
    const error = new Error('Localist checkout window storage unavailable');
    error.status = 503;
    throw error;
  }

  const window = await prisma.hubLocalistWindow.findUnique({ where: { token } });
  if (!window || !window.active || new Date(window.expiresAt) <= new Date()) {
    const error = new Error('Localist ordering window is closed');
    error.status = 410;
    throw error;
  }
  return window;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  if (!squareClient) return res.status(500).json({ error: 'Square not configured' });
  if (!LOCATION_ID) return res.status(500).json({ error: 'Square location missing' });

  const client = getSanityClient() || getSanityReadClient();
  if (!client) return res.status(503).json({ error: 'Sanity not configured' });

  const name = cleanString(req.body?.name, 80);
  const phone = cleanString(req.body?.phone, 40);
  const note = cleanString(req.body?.note, 180);
  const pickupWindow = cleanString(req.body?.pickupWindow, 40);
  const token = cleanString(req.body?.localistToken, 240);
  const sourceVisitorId = cleanString(req.body?.visitorId, 120);
  const sourceSessionId = cleanString(req.body?.sessionId, 120);
  const entrySource = req.body?.entrySource === 'shared' ? 'shared' : 'direct';
  const sourceArea = normalizeArea(req.body?.sourceArea);
  const submittedItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const resolvedPickupWindow = sourceArea === 'security' ? SECURITY_PICKUP_WINDOW : pickupWindow;

  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (sourceArea === 'localist' && (!pickupWindow || !PICKUP_WINDOWS.has(pickupWindow))) {
    return res.status(400).json({ error: 'Pickup window is required' });
  }
  if (!submittedItems.length) return res.status(400).json({ error: 'No items selected' });

  let localOrder = null;
  try {
    const localistWindow = await validateWindow(token);

    const sanityItems = await client.fetch(LOCALIST_ITEMS_QUERY, { area: sourceArea });
    const itemMap = new Map((Array.isArray(sanityItems) ? sanityItems : []).map((item) => [item._id, item]));

    const lineItems = [];
    const orderItems = [];
    for (const submitted of submittedItems) {
      const id = cleanString(submitted?.id, 160);
      const quantity = normalizeQuantity(submitted?.quantity);
      if (!id || !quantity) continue;

      const item = itemMap.get(id);
      if (!item) return res.status(400).json({ error: 'Selected item is no longer available' });

      const inventoryCount = parseInventoryCount(item.inventoryCount);
      if (inventoryCount === 0) {
        return res.status(400).json({ error: `${item.name || 'Item'} is sold out` });
      }
      if (inventoryCount !== null && quantity > inventoryCount) {
        return res.status(400).json({ error: `Only ${inventoryCount} ${item.name || 'item'} available` });
      }

      const priceCents = parseExactCents(item.priceCents) || parsePriceCents(item.price);
      if (!priceCents) {
        return res.status(400).json({ error: `${item.name || 'Item'} does not have a checkout price` });
      }

      lineItems.push({
        name: String(item.name || 'Menu item').slice(0, 120),
        quantity: String(quantity),
        basePriceMoney: { amount: priceCents, currency: 'USD' },
      });
      const customerOptions = normalizeCustomerOptions(submitted?.customerOptions);
      orderItems.push({
        id,
        name: String(item.name || 'Localist item').slice(0, 160),
        quantity,
        unitPriceCents: priceCents,
        totalCents: priceCents * quantity,
        customerOptions,
      });
    }

    if (!lineItems.length) return res.status(400).json({ error: 'No payable items selected' });

    const totalCents = orderItems.reduce((sum, item) => sum + item.totalCents, 0);
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    localOrder = await prisma.hubLocalistOrder.create({
      data: {
        status: 'checkout_created',
        customerName: name,
        customerPhone: phone || null,
        pickupWindow: resolvedPickupWindow,
        customerNote: note || null,
        localistWindowId: localistWindow?.id || null,
        localistToken: token || null,
        sourceVisitorId: sourceVisitorId || null,
        sourceSessionId: sourceSessionId || null,
        entrySource,
        totalCents,
        totalQuantity,
        items: orderItems,
        checkoutStartedAt: new Date(),
      },
    });

    const noteParts = [
      `${sourceArea === 'security' ? 'Security at Neon' : 'Localist'} order - ${name}`,
      sourceArea === 'localist' ? `Pickup: ${resolvedPickupWindow}` : null,
      phone ? `Phone: ${phone}` : null,
      note ? `Note: ${note}` : null,
      orderItems.length ? `Items: ${orderItems.map((item) => (
        `${item.quantity}x ${item.name}${item.customerOptions.length ? ` (${item.customerOptions.join(', ')})` : ''}`
      )).join('; ')}` : null,
    ].filter(Boolean);

    const response = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: createKey(),
      order: {
        locationId: LOCATION_ID,
        lineItems,
        note: noteParts.join(' | ').slice(0, 500),
      },
      checkoutOptions: {
        redirectUrl: checkoutRedirectUrl(req, token, localOrder.id, sourceArea),
      },
    });

    const paymentLink = response?.result?.paymentLink || {};
    const url = paymentLink.url;
    if (!url) return res.status(500).json({ error: 'Failed to create Square checkout' });
    const updatedOrder = await prisma.hubLocalistOrder.update({
      where: { id: localOrder.id },
      data: {
        squarePaymentLinkId: paymentLink.id || null,
        squarePaymentLinkUrl: url,
        squareOrderId: paymentLink.orderId || paymentLink.order_id || null,
      },
    });
    await writeOrderBrainRecords(prisma, updatedOrder).catch((brainErr) => {
      console.warn('[hub/localist-checkout] brain record failed', brainErr?.message);
    });
    return res.status(200).json({ ok: true, url, orderId: updatedOrder.id });
  } catch (err) {
    if (localOrder?.id) {
      await prisma.hubLocalistOrder.update({
        where: { id: localOrder.id },
        data: { status: 'checkout_failed' },
      }).catch(() => {});
    }
    const squareMessage = err?.errors ? JSON.stringify(err.errors) : null;
    console.error('[hub/localist-checkout] error', squareMessage || err);
    return res.status(err.status || 500).json({ error: squareMessage || err.message || 'Unable to create checkout' });
  }
};
