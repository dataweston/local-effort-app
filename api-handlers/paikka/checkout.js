const { MENU_LOOKUP } = require('../../src/features/paikka/menu');
const { base64UrlEncode } = require('../../src/features/paikka/utils');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_PUBLIC_BASE_URL || 'http://localhost:3000';

const parseBody = (req) => {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (req.body && typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (_) {
      return null;
    }
  }
  return null;
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = parseBody(req);
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  try {
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) {
      return res.status(400).json({ error: 'At least one item is required.' });
    }

    const parsedItems = items.map((item) => {
      if (!item || typeof item !== 'object') {
        throw new Error('Invalid item payload.');
      }
      const sku = item.sku;
      const qty = Number(item.qty);
      if (!MENU_LOOKUP.has(sku)) {
        throw new Error('Unsupported SKU.');
      }
      if (!Number.isInteger(qty) || qty <= 0) {
        throw new Error('Invalid quantity.');
      }
      return { sku, qty };
    });

    const customer = payload.customer || {};
    const firstName = typeof customer.firstName === 'string' ? customer.firstName.trim() : '';
    const lastNameRaw = typeof customer.lastName === 'string' ? customer.lastName.trim() : '';
    const email = typeof customer.email === 'string' ? customer.email.trim() : '';

    if (!firstName) {
      throw new Error('First name is required.');
    }
    if (!email || !/.+@.+/.test(email)) {
      throw new Error('A valid email is required.');
    }

    const tipCentsRaw = Number(payload.tipCents || 0);
    const tipCents = Number.isFinite(tipCentsRaw) && tipCentsRaw > 0 ? Math.round(tipCentsRaw) : 0;

    const state = base64UrlEncode({
      email,
      firstName,
      lastName: lastNameRaw || undefined,
      items: parsedItems,
      tipCents,
    });

    const redirectUrl = new URL('/paikka/success', PUBLIC_BASE_URL);
    redirectUrl.searchParams.set('state', state);

    const squareItems = parsedItems.map((item) => {
      const menuItem = MENU_LOOKUP.get(item.sku);
      if (!menuItem) {
        throw new Error('Unsupported SKU.');
      }
      return {
        sku: item.sku,
        name: menuItem.squareName,
        unit: menuItem.presalePriceCents,
        qty: item.qty,
      };
    });

    const response = await fetch(`${API_BASE_URL}/square/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: squareItems,
        tipCents,
        redirectUrl: redirectUrl.toString(),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({ error: data?.error || 'Unable to start Square checkout.' });
    }

    const checkoutUrl = data.checkout_url || data.checkoutUrl;
    if (!checkoutUrl) {
      return res.status(502).json({ error: 'Square did not return a checkout URL.' });
    }

    return res.status(200).json({ checkoutUrl });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to start checkout.' });
  }
};
