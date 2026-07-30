// POST /api/store/chez-garage-at-home-checkout
// Charges the server-authoritative $200 date-hold deposit and sends a Brevo receipt.

const { Client, Environment } = require('square');
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
const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
const FROM_EMAIL = process.env.RECEIPTS_FROM_EMAIL || process.env.SUPPORT_INBOX_EMAIL || 'no-reply@localeffort.app';
const FROM_NAME = process.env.RECEIPTS_FROM_NAME || 'Local Effort';

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
const escapeHtml = (value) => cleanText(value, 2000)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

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

const formatDate = (value) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T12:00:00Z`));
  } catch (_) {
    return value;
  }
};

const sendReceipt = async ({ paymentId, date, name, email, phone, address, guestCount, notes }) => {
  if (!BREVO_API_KEY || typeof fetch !== 'function') return { sent: false, skipped: true };

  const formattedDate = formatDate(date);
  const addressLine = [
    address.line1,
    address.line2,
    [address.city, address.state, address.postal].filter(Boolean).join(', '),
  ].filter(Boolean).join('<br>');
  const htmlContent = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Thanks for bringing <strong>Chez Garage by Local Effort</strong> to your home.</p>
    <p>We received your <strong>$200 date-hold deposit</strong> for <strong>${escapeHtml(formattedDate)}</strong>.</p>
    <p><strong>Event address</strong><br>${addressLine.split('<br>').map(escapeHtml).join('<br>')}</p>
    ${guestCount ? `<p><strong>Estimated guests:</strong> ${escapeHtml(guestCount)}</p>` : ''}
    ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
    ${notes ? `<p><strong>Your notes:</strong><br>${escapeHtml(notes).replace(/\n/g, '<br>')}</p>` : ''}
    <p>A chef will reach out directly to help make your menu and plan the event. Estimated final costs depend on your menu choices; anticipate $25–$45 per person. Chez Garage is intended for a maximum of 40 guests, so please contact us directly if your group may be larger.</p>
    <p><strong>Payment reference:</strong> ${escapeHtml(paymentId)}</p>
    <p>Questions? Reply to this email and the Local Effort team will help.</p>
  `;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email, name }],
      subject: `Chez Garage deposit confirmed — ${formattedDate}`,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    console.error('[chez-garage-at-home] Brevo receipt failed', response.status, responseText.slice(0, 500));
    return { sent: false, skipped: false };
  }
  return { sent: true, skipped: false };
};

module.exports = async (req, res) => {
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

  try {
    const paymentRequest = {
      idempotencyKey: sanitizeIdempotencyKey(body.checkoutAttemptId),
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

    const paymentResponse = await squareClient.paymentsApi.createPayment(paymentRequest);
    const paymentId = paymentResponse.result.payment?.id;
    if (!paymentId) throw new Error('Square did not return a payment ID.');

    let receipt = { sent: false, skipped: false };
    try {
      receipt = await sendReceipt({
        paymentId,
        date,
        name,
        email,
        phone,
        address,
        guestCount,
        notes,
      });
    } catch (receiptError) {
      console.error('[chez-garage-at-home] receipt exception after successful payment', receiptError?.message);
    }

    return res.status(200).json({
      ok: true,
      paymentId,
      amountCents: DEPOSIT_CENTS,
      receiptSent: receipt.sent,
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
