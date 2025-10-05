const { MENU_LOOKUP } = require('./menu');

const TIP_OPTIONS = [
  { label: '0%', value: '0' },
  { label: '10%', value: '10' },
  { label: '15%', value: '15' },
  { label: '20%', value: '20' },
  { label: 'Other', value: 'custom' },
];

const isValidEmail = (value = '') => /.+@.+/.test(String(value).trim());

const base64UrlEncode = (payload) => {
  const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
  }
  if (typeof btoa === 'function') {
    const encoded = btoa(unescape(encodeURIComponent(json)));
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
  }
  throw new Error('No base64 encoder available');
};

const base64UrlDecode = (value) => {
  if (typeof value !== 'string') throw new Error('State must be a string');
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf8');
  }
  if (typeof atob === 'function') {
    const binary = atob(padded);
    if (typeof TextDecoder !== 'undefined') {
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return decodeURIComponent(binary.split('').map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
  }
  throw new Error('No base64 decoder available');
};

const decodeCheckoutState = (value) => {
  const raw = base64UrlDecode(value);
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid state payload');
  }
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const sanitizedItems = items
    .map((item) => ({
      sku: typeof item?.sku === 'string' ? item.sku : null,
      qty: Number(item?.qty ?? 0),
    }))
    .filter((item) => MENU_LOOKUP.has(item.sku) && Number.isFinite(item.qty) && item.qty > 0);

  return {
    email: String(parsed.email ?? ''),
    firstName: String(parsed.firstName ?? ''),
    lastName: typeof parsed.lastName === 'string' && parsed.lastName.trim() ? parsed.lastName : undefined,
    items: sanitizedItems,
    tipCents: Number.isFinite(parsed.tipCents) ? Number(parsed.tipCents) : 0,
  };
};

const PAYMENT_REFERENCE_KEYS = [
  'transactionId',
  'transaction_id',
  'paymentId',
  'payment_id',
  'checkoutId',
  'checkout_id',
  'orderId',
  'order_id',
];

const resolvePaymentReference = (params) => {
  if (!params) return undefined;
  const getValues = (key) => {
    if (typeof params.getAll === 'function') {
      const values = params.getAll(key);
      return values && values.length ? values : [params.get(key)];
    }
    const value = params[key];
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null) return [];
    return [value];
  };

  for (const key of PAYMENT_REFERENCE_KEYS) {
    const candidates = getValues(key).filter((val) => typeof val === 'string' && val.trim().length > 0);
    if (candidates.length) {
      return candidates[0];
    }
  }
  return undefined;
};

const computeTotals = (state, menuLookup) => {
  if (!state) return { subtotal: 0, tip: 0, total: 0 };
  const lookup = menuLookup ?? MENU_LOOKUP ?? new Map();
  const subtotal = state.items.reduce((sum, item) => {
    const menu = lookup.get(item.sku);
    if (!menu) return sum;
    return sum + Number(menu.presalePriceCents) * Number(item.qty);
  }, 0);
  const tip = Number(state.tipCents || 0);
  return { subtotal, tip, total: subtotal + tip };
};

export {
  TIP_OPTIONS,
  isValidEmail,
  base64UrlEncode,
  base64UrlDecode,
  decodeCheckoutState,
  resolvePaymentReference,
  computeTotals,
};

if (typeof module !== 'undefined') {
  module.exports = {
    TIP_OPTIONS,
    isValidEmail,
    base64UrlEncode,
    base64UrlDecode,
    decodeCheckoutState,
    resolvePaymentReference,
    computeTotals,
  };
}
