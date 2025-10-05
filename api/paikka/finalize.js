const { decodeCheckoutState } = require('../../src/features/paikka/utils');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

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

const resolvePaymentReference = (value) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const candidate = value.find((entry) => typeof entry === 'string' && entry.trim());
    if (candidate) return candidate.trim();
  }
  return undefined;
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
    const stateParam = typeof payload.state === 'string' ? payload.state : undefined;
    if (!stateParam) {
      throw new Error('Missing checkout state.');
    }

    const checkoutState = decodeCheckoutState(stateParam);
    if (!checkoutState.items.length) {
      throw new Error('No items found in checkout.');
    }

    const paymentReference =
      resolvePaymentReference(payload.paymentReference) ||
      resolvePaymentReference(payload.payment_reference) ||
      resolvePaymentReference(payload.transactionId) ||
      resolvePaymentReference(payload.paymentId) ||
      resolvePaymentReference(payload.checkoutId) ||
      resolvePaymentReference(payload.orderId);

    if (!paymentReference) {
      throw new Error('Missing payment reference from Square.');
    }

    const response = await fetch(`${API_BASE_URL}/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: checkoutState.email,
        firstName: checkoutState.firstName,
        lastName: checkoutState.lastName,
        items: checkoutState.items,
        paymentReference,
        tipCents: checkoutState.tipCents || 0,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || 'Unable to finalize order.');
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to finalize order.' });
  }
};
