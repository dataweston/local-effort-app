const { Client, Environment } = require('square');

const { MENU_LOOKUP, formatCurrency } = require('../../src/features/paikka/menu');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();

let squareClient = null;

try {
  if (ACCESS_TOKEN) {
    const env = ENV_NAME === 'sandbox' ? Environment.Sandbox : Environment.Production;
    squareClient = new Client({ accessToken: ACCESS_TOKEN, environment: env });
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[paikka.pay] Square client initialized', {
        env: env === Environment.Sandbox ? 'Sandbox' : 'Production',
        hasLocation: Boolean(LOCATION_ID),
        tokenTail: ACCESS_TOKEN.slice(-4),
      });
    }
  }
} catch (error) {
  squareClient = null;
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[paikka.pay] Failed to initialize Square client', error);
  }
}

const parseItems = (items) => {
  if (!Array.isArray(items) || !items.length) {
    throw new Error('At least one item is required.');
  }

  return items.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Invalid item payload.');
    }
    const sku = entry.sku;
    const qty = Number(entry.qty);
    if (typeof sku !== 'string' || !MENU_LOOKUP.has(sku)) {
      throw new Error('Unsupported SKU.');
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error('Invalid quantity.');
    }
    return { sku, qty };
  });
};

const sanitizeCustomer = (customer = {}) => {
  const firstName = typeof customer.firstName === 'string' ? customer.firstName.trim() : '';
  const lastName = typeof customer.lastName === 'string' ? customer.lastName.trim() : '';
  const email = typeof customer.email === 'string' ? customer.email.trim() : '';

  if (!firstName) {
    throw new Error('First name is required.');
  }
  if (!email || !/.+@.+/.test(email)) {
    throw new Error('A valid email is required.');
  }

  return {
    firstName,
    lastName: lastName || undefined,
    email,
  };
};

const computeTotals = (parsedItems, tipCentsRaw = 0) => {
  const subtotal = parsedItems.reduce((sum, item) => {
    const menuItem = MENU_LOOKUP.get(item.sku);
    if (!menuItem) {
      throw new Error('Unsupported SKU.');
    }
    return sum + menuItem.presalePriceCents * item.qty;
  }, 0);

  if (subtotal <= 0) {
    throw new Error('Cart is empty.');
  }

  const tipCents = Number.isFinite(Number(tipCentsRaw)) && Number(tipCentsRaw) > 0 ? Math.round(Number(tipCentsRaw)) : 0;
  return { subtotal, tipCents, total: subtotal + tipCents };
};

const buildPaymentNote = (items, tipCents) => {
  const parts = items.map(({ sku, qty }) => {
    const menu = MENU_LOOKUP.get(sku);
    if (!menu) return `${sku} x${qty}`;
    return `${menu.summaryTitle || menu.squareName || menu.title} x${qty}`;
  });
  if (tipCents > 0) {
    parts.push(`Tip ${formatCurrency(tipCents)}`);
  }
  return parts.join(' | ').slice(0, 500);
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

  if (!squareClient) {
    return res.status(500).json({ error: 'Square is not configured' });
  }

  try {
    const { items, customer, tipCents: tipCentsRaw, token } = req.body || {};
    if (!token || typeof token !== 'string') {
      throw new Error('Missing payment token.');
    }

    const parsedItems = parseItems(items);
    const normalizedCustomer = sanitizeCustomer(customer);
    const totals = computeTotals(parsedItems, tipCentsRaw);

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const paymentsApi = squareClient.paymentsApi;
    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      locationId: LOCATION_ID,
      amountMoney: { amount: totals.total, currency: 'USD' },
      autocomplete: true,
      buyerEmailAddress: normalizedCustomer.email,
      note: buildPaymentNote(parsedItems, totals.tipCents),
      metadata: {
        first_name: normalizedCustomer.firstName.slice(0, 50),
        last_name: (normalizedCustomer.lastName || '').slice(0, 50),
      },
    };

    if (totals.tipCents > 0) {
      paymentBody.tipMoney = { amount: totals.tipCents, currency: 'USD' };
    }

    const response = await paymentsApi.createPayment(paymentBody);
    const paymentId = response?.result?.payment?.id;

    if (!paymentId) {
      throw new Error('Payment failed.');
    }

    return res.status(200).json({ ok: true, paymentId });
  } catch (error) {
    const squareErrors = error?.errors;
    if (Array.isArray(squareErrors) && squareErrors.length > 0) {
      const summarized = squareErrors.slice(0, 3).map((entry) => ({ code: entry.code, detail: entry.detail }));
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[paikka.pay] Square error', summarized);
      }
      return res.status(502).json({ error: JSON.stringify(summarized) });
    }

    const message = error instanceof Error ? error.message : 'Checkout failed. Please try again.';
    return res.status(400).json({ error: message });
  }
};
