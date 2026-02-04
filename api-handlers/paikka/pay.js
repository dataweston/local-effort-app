const { Client, Environment } = require('square');

const { MENU_LOOKUP, formatCurrency } = require('../../src/features/paikka/menu');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
const sanitizeIdempotencyKey = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 45);
};

const normalizeDiscountCode = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const resolveDiscountPrice = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
};

const CONFIGURED_DISCOUNT = (() => {
  const code =
    normalizeDiscountCode(process.env.PAIKKA_DISCOUNT_CODE) ||
    normalizeDiscountCode(process.env.VITE_PAIKKA_DISCOUNT_CODE);
  const priceCents =
    resolveDiscountPrice(process.env.PAIKKA_DISCOUNT_PRICE_CENTS) ??
    resolveDiscountPrice(process.env.VITE_PAIKKA_DISCOUNT_PRICE_CENTS);
  return { code, priceCents };
})();

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

const computeTotals = (parsedItems, tipCentsRaw = 0, discount = {}) => {
  const discountPriceCents =
    resolveDiscountPrice(discount.priceCents) ??
    resolveDiscountPrice(discount.discountPriceCents);
  const discountApplied = Boolean(discount.applied && discountPriceCents);

  const subtotalAccumulator = parsedItems.reduce(
    (acc, item) => {
      const menuItem = MENU_LOOKUP.get(item.sku);
      if (!menuItem) {
        throw new Error('Unsupported SKU.');
      }
      const defaultUnitPrice = Number(menuItem.presalePriceCents);
      const effectiveUnitPrice =
        discountApplied && discountPriceCents
          ? Math.min(defaultUnitPrice, discountPriceCents)
          : defaultUnitPrice;
      const qty = Number(item.qty);
      acc.subtotal += effectiveUnitPrice * qty;
      acc.discount += Math.max(0, defaultUnitPrice - effectiveUnitPrice) * qty;
      return acc;
    },
    { subtotal: 0, discount: 0 }
  );

  const subtotal = subtotalAccumulator.subtotal;
  if (subtotal <= 0) {
    throw new Error('Cart is empty.');
  }

  const tipCents = Number.isFinite(Number(tipCentsRaw)) && Number(tipCentsRaw) > 0 ? Math.round(Number(tipCentsRaw)) : 0;
  return { subtotal, tipCents, total: subtotal + tipCents, discountCents: subtotalAccumulator.discount };
};

const buildPaymentNote = (items, tipCents, discountCents = 0, discountCode) => {
  const parts = items.map(({ sku, qty }) => {
    const menu = MENU_LOOKUP.get(sku);
    if (!menu) return `${sku} x${qty}`;
    return `${menu.summaryTitle || menu.squareName || menu.title} x${qty}`;
  });
  if (tipCents > 0) {
    parts.push(`Tip ${formatCurrency(tipCents)}`);
  }
  if (discountCents > 0) {
    const label = discountCode ? `Discount ${discountCode}` : 'Discount';
    parts.push(`${label} -${formatCurrency(discountCents)}`);
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
    const { items, customer, tipCents: tipCentsRaw, token, discountCode, verificationToken, checkoutAttemptId } = req.body || {};
    if (!token || typeof token !== 'string') {
      throw new Error('Missing payment token.');
    }

    const parsedItems = parseItems(items);
    const normalizedCustomer = sanitizeCustomer(customer);
    const normalizedDiscountCode = normalizeDiscountCode(discountCode);
    const discountApplied =
      Boolean(CONFIGURED_DISCOUNT.code) &&
      normalizedDiscountCode &&
      normalizedDiscountCode === CONFIGURED_DISCOUNT.code &&
      CONFIGURED_DISCOUNT.priceCents;
    const totals = computeTotals(parsedItems, tipCentsRaw, {
      applied: discountApplied,
      priceCents: CONFIGURED_DISCOUNT.priceCents,
    });

    const idempotencyKey =
      sanitizeIdempotencyKey(checkoutAttemptId) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const paymentsApi = squareClient.paymentsApi;
    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      locationId: LOCATION_ID,
      amountMoney: { amount: totals.total, currency: 'USD' },
      autocomplete: true,
      buyerEmailAddress: normalizedCustomer.email,
      note: buildPaymentNote(
        parsedItems,
        totals.tipCents,
        discountApplied ? totals.discountCents : 0,
        discountApplied ? discountCode : undefined
      ),
      metadata: {
        first_name: normalizedCustomer.firstName.slice(0, 50),
        last_name: (normalizedCustomer.lastName || '').slice(0, 50),
      },
    };
    if (verificationToken) {
      paymentBody.verificationToken = verificationToken;
    }

    if (totals.tipCents > 0) {
      paymentBody.tipMoney = { amount: totals.tipCents, currency: 'USD' };
    }
    if (discountApplied) {
      paymentBody.metadata.discount_code = normalizedDiscountCode;
      paymentBody.metadata.discount_cents = String(totals.discountCents);
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
