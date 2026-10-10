// POST /api/store/chez-garage-at-home-checkout
// Charges the server-authoritative $200 date-hold deposit and queues durable confirmations.

const { Client, Environment } = require('square');
const { prisma } = require('../_lib/prisma');
const { startCommercialCheckout } = require('../../backend/api/finance/commercialOrders');
const {
  markPaymentAttemptFailed,
  markPaymentAttemptSucceeded,
} = require('../../backend/api/finance/paymentAttempts');
const { isRealIsoDate, isSelectableDate } = require('./_dateSelection');

const DEPOSIT_CENTS = 20000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const attemptsByIp = new Map();

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = ((process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase() === 'sandbox')
  ? 'Sandbox'
  : 'Production';

let squareClient = null;
try {
  if (ACCESS_TOKEN) {
    squareClient = new Client({
      accessToken: ACCESS_TOKEN,
      environment: Environment[ENV_NAME] || Environment.Production,
    });
  }
} catch (_) {
  squareClient = null;
}

const cleanText = (value, max = 500) => String(value || '').trim().slice(0, max);

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(value, 254));

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
};

const checkRateLimit = (req) => {
  const now = Date.now();
  const ip = getClientIp(req);
  const recent = (attemptsByIp.get(ip) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfter = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 1000));
    attemptsByIp.set(ip, recent);
    return { limited: true, retryAfter };
  }
  recent.push(now);
  attemptsByIp.set(ip, recent);
  return { limited: false, retryAfter: 0 };
};

const sanitizeIdempotencyKey = (value) => {
  const cleaned = cleanText(value, 45).replace(/[^a-zA-Z0-9_-]/g, '-');
  return cleaned || `chez-home-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};


module.exports = async (req, res, { emailOutboxService } = {}) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  if (cleanText(body.website, 255)) {
    return res.status(200).json({ ok: true, suppressed: true });
  }

  const rateLimit = checkRateLimit(req);
  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return res.status(429).json({
      error: 'Too many payment attempts. Please wait a few minutes and try again.',
      retryAfter: rateLimit.retryAfter,
    });
  }

  if (!squareClient || !LOCATION_ID) {
    return res.status(503).json({ error: 'Payment is temporarily unavailable.' });
  }
  // A deposit with no durable booking is an orphan capture. Fail closed.
  if (!prisma) {
    return res.status(503).json({ error: 'Booking is temporarily unavailable. No payment was taken.' });
  }

  const date = cleanText(body.date, 10);
  const name = cleanText(body.name, 100);
  const email = cleanText(body.email, 254).toLowerCase();
  const phone = cleanText(body.phone, 40);
  const token = cleanText(body.token, 500);
  const verificationToken = cleanText(body.verificationToken, 500);
  const address = {
    line1: cleanText(body.line1, 150),
    line2: cleanText(body.line2, 150),
    city: cleanText(body.city, 80),
    state: cleanText(body.state, 20),
    postal: cleanText(body.postal, 20),
  };
  const guestCount = cleanText(body.guestCount, 4);
  const notes = cleanText(body.notes, 1500);

  if (!isSelectableDate(date) || !name || !isValidEmail(email) || !phone || !token) {
    return res.status(400).json({ error: 'Please complete the event date and contact information.' });
  }
  if (!address.line1 || !address.city || !address.state || !address.postal) {
    return res.status(400).json({ error: 'Please enter the event address.' });
  }
  const queueConfirmations = async (paymentId) => {
    const { queueChezGarageConfirmations } = require('../../backend/api/services/storeConfirmations');
    try {
      return await queueChezGarageConfirmations({
        paymentId, emailOutboxService, date, name, email, phone, address, guestCount, notes,
        amountCents: DEPOSIT_CENTS,
      });
    } catch (error) {
      console.error('[chez-garage-at-home] confirmation enqueue failed after successful payment', {
        paymentId, error: error?.message || error,
      });
      return { queued: false, processingPending: true, queueError: error?.message || String(error) };
    }
  };

  try {
    const idempotencyKey = sanitizeIdempotencyKey(body.checkoutAttemptId);

    // The deposit books a private event, with contact facts retained for
    // payment replay and confirmation reconciliation.
    const checkout = await startCommercialCheckout({
      prisma,
      idempotencyKey,
      sourceSystem: 'store',
      sourceId: idempotencyKey,
      channel: 'store',
      businessLineKey: 'events',
      customerName: name,
      customerEmail: email,
      totalCents: DEPOSIT_CENTS,
      serviceStartAt: new Date(`${date}T12:00:00Z`),
      lines: [{
        lineType: 'deposit',
        name: 'Chez Garage at Home — date-hold deposit',
        quantity: 1,
        unitPriceCents: DEPOSIT_CENTS,
        sourceSystem: 'store',
        sourceId: 'chez-garage-at-home-deposit',
      }],
      orderMetadata: {
        offer: 'chez-garage-at-home',
        eventDate: date,
        guestCount: guestCount || null,
        contactName: name,
        contactEmail: email,
        contactPhone: phone,
        contactAddress: address,
        customerNotes: notes || null,
      },
      attemptMetadata: { channel: 'store', offer: 'chez-garage-at-home' },
    });

    if (checkout.replay === 'succeeded') {
      const replayConfirmations = await queueConfirmations(checkout.attempt.externalPaymentId);
      return res.status(200).json({
        ok: true,
        paymentId: checkout.attempt.externalPaymentId,
        orderId: checkout.order?.id || null,
        amountCents: DEPOSIT_CENTS,
        ...(replayConfirmations.processingPending ? { confirmationQueuePending: true } : {}),
        idempotentReplay: true,
      });
    }

    const commercialOrderId = checkout.order?.id || null;
    const paymentAttemptId = checkout.attempt.id;

    const paymentRequest = {
      idempotencyKey,
      referenceId: commercialOrderId,
      sourceId: token,
      locationId: LOCATION_ID,
      amountMoney: { amount: DEPOSIT_CENTS, currency: 'USD' },
      buyerEmailAddress: email,
      note: `Chez Garage at home deposit — ${date} — ${name}`.slice(0, 500),
      metadata: {
        booking_type: 'chez-garage-at-home',
        event_date: date,
        customer_name: name.slice(0, 80),
        customer_phone: phone.slice(0, 30),
        event_address: `${address.line1}, ${address.city}, ${address.state} ${address.postal}`.slice(0, 250),
        estimated_guests: guestCount || 'not provided',
      },
    };
    if (verificationToken) paymentRequest.verificationToken = verificationToken;

    let paymentResponse;
    try {
      paymentResponse = await squareClient.paymentsApi.createPayment(paymentRequest);
    } catch (paymentError) {
      try {
        await markPaymentAttemptFailed({ prisma, attemptId: paymentAttemptId, error: paymentError });
      } catch (stateError) {
        console.error('[chez-garage-at-home] failed to persist payment failure', stateError?.message || stateError);
      }
      throw paymentError;
    }
    const payment = paymentResponse.result.payment;
    const paymentId = payment?.id;
    if (!paymentId) throw new Error('Square did not return a payment ID.');
    if (String(payment.status || '').toUpperCase() !== 'COMPLETED') {
      console.warn('[chez-garage-at-home] payment returned before successful completion', {
        commercialOrderId, paymentId, status: payment.status || 'unknown',
      });
      return res.status(202).json({
        ok: true,
        paymentId,
        orderId: commercialOrderId,
        paymentPending: true,
      });
    }

    let reconciliationPending = false;
    try {
      await markPaymentAttemptSucceeded({
        prisma,
        attemptId: paymentAttemptId,
        provider: 'square',
        payment,
        amountCents: DEPOSIT_CENTS,
      });
    } catch (stateError) {
      reconciliationPending = true;
      console.error('[chez-garage-at-home] deposit captured; state reconciliation pending', {
        commercialOrderId,
        paymentId,
        error: stateError?.message || stateError,
      });
    }

    const confirmations = await queueConfirmations(paymentId);
    return res.status(200).json({
      ok: true,
      paymentId,
      orderId: commercialOrderId,
      amountCents: DEPOSIT_CENTS,
      ...(reconciliationPending ? { reconciliationPending: true } : {}),
      ...(confirmations.processingPending ? { confirmationQueuePending: true } : {}),
    });
  } catch (error) {
    const squareErrors = Array.isArray(error?.errors)
      ? error.errors.slice(0, 3).map((entry) => entry.detail || entry.code).filter(Boolean)
      : [];
    console.error('[chez-garage-at-home] checkout failed', squareErrors.length ? squareErrors : error?.message);
    return res.status(500).json({
      error: squareErrors[0] || 'Payment could not be completed. No booking was created.',
    });
  }
};

module.exports.__internals = {
  DEPOSIT_CENTS,
  isValidDate: isRealIsoDate,
  isFutureOrToday: isSelectableDate,
  isValidEmail,
  sanitizeIdempotencyKey,
};
