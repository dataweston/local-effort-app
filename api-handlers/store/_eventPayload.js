const crypto = require('crypto');

const MAX_META_KEYS = 24;

const ACQUISITION_ALIASES = Object.freeze({
  source: ['source', 'utmSource', 'utm_source'],
  medium: ['medium', 'utmMedium', 'utm_medium'],
  campaign: ['campaign', 'utmCampaign', 'utm_campaign'],
  term: ['term', 'utmTerm', 'utm_term'],
  content: ['content', 'utmContent', 'utm_content'],
  gclid: ['gclid'],
  gbraid: ['gbraid'],
  wbraid: ['wbraid'],
  gaClientId: ['gaClientId', 'ga_client_id'],
  gaSessionId: ['gaSessionId', 'ga_session_id'],
  referrer: ['referrer'],
  landingPage: ['landingPage', 'landing_page'],
  capturedAt: ['capturedAt', 'captured_at'],
});

const TEXT_LIMITS = Object.freeze({
  source: 120,
  medium: 120,
  campaign: 240,
  term: 240,
  content: 240,
  gclid: 240,
  gbraid: 240,
  wbraid: 240,
  gaClientId: 120,
  gaSessionId: 120,
});

function cleanString(value, maxLength) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const cleaned = String(value).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function redactPotentialPii(value, maxLength) {
  const cleaned = cleanString(value, maxLength);
  if (!cleaned) return null;
  return cleaned
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted]')
    .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, '[redacted]');
}

function cleanIdentifier(value, maxLength = 160) {
  const cleaned = cleanString(value, maxLength);
  if (!cleaned) return null;
  return /^[A-Za-z0-9._~:+/-]+$/.test(cleaned) ? cleaned : null;
}

function cleanUrlWithoutQuery(value, maxLength = 500) {
  const cleaned = cleanString(value, 2000);
  if (!cleaned) return null;
  try {
    const url = new URL(cleaned, 'https://www.localeffortfood.com');
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const output = url.origin === 'https://www.localeffortfood.com'
      ? url.pathname
      : `${url.origin}${url.pathname}`;
    return output.slice(0, maxLength);
  } catch (_err) {
    return null;
  }
}

function firstValue(object, aliases) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return null;
  for (const key of aliases) {
    if (object[key] !== undefined && object[key] !== null) return object[key];
  }
  return null;
}

function sanitizeAcquisitionTouch(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const result = {};

  for (const [field, aliases] of Object.entries(ACQUISITION_ALIASES)) {
    const value = firstValue(raw, aliases);
    if (value === null) continue;
    if (field === 'referrer' || field === 'landingPage') {
      const safeUrl = cleanUrlWithoutQuery(value);
      if (safeUrl) result[field] = safeUrl;
      continue;
    }
    if (field === 'capturedAt') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) result[field] = date.toISOString();
      continue;
    }
    const limit = TEXT_LIMITS[field] || 120;
    const safeValue = ['term', 'content', 'campaign'].includes(field)
      ? redactPotentialPii(value, limit)
      : cleanIdentifier(value, limit);
    if (safeValue) result[field] = safeValue;
  }

  return Object.keys(result).length ? result : null;
}

function sanitizeAcquisition(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const firstTouch = sanitizeAcquisitionTouch(raw.firstTouch);
  const lastTouch = sanitizeAcquisitionTouch(raw.lastTouch);
  if (!firstTouch && !lastTouch) return null;
  return {
    ...(firstTouch ? { firstTouch } : {}),
    ...(lastTouch ? { lastTouch } : {}),
  };
}

function cleanInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function sanitizeMeta(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const meta = {};
  const copyText = (key, maxLength, { identifier = false, redact = false } = {}) => {
    if (Object.keys(meta).length >= MAX_META_KEYS) return;
    const value = identifier
      ? cleanIdentifier(raw[key], maxLength)
      : redact
        ? redactPotentialPii(raw[key], maxLength)
        : cleanString(raw[key], maxLength);
    if (value) meta[key] = value;
  };
  const copyInteger = (key, min, max) => {
    if (Object.keys(meta).length >= MAX_META_KEYS) return;
    const value = cleanInteger(raw[key], min, max);
    if (value !== null) meta[key] = value;
  };

  copyText('productId', 120, { identifier: true });
  copyText('paymentId', 160, { identifier: true });
  copyText('bookingType', 80, { identifier: true });
  copyText('leadType', 100, { identifier: true });
  copyText('method', 80, { identifier: true });
  copyText('reason', 240, { redact: true });
  copyInteger('itemCount', 0, 1000);
  copyInteger('amountCents', 0, 100000000);

  const acquisition = sanitizeAcquisition(raw.acquisition);
  if (acquisition) meta.acquisition = acquisition;

  return meta;
}

function sanitizeCheckoutEvent({ event, store, sessionId, meta }) {
  return {
    event,
    store: cleanIdentifier(store, 80) || 'unknown',
    sessionId: cleanIdentifier(sessionId, 160),
    meta: sanitizeMeta(meta),
  };
}

function checkoutEventSourceId(event) {
  if (event.event === 'order.placed') {
    const durableId = event.meta.paymentId || event.sessionId;
    if (durableId) return `checkout:${event.store}:order:${durableId}`.slice(0, 500);
  }
  const randomId = crypto.randomUUID
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');
  return `checkout:${event.store}:${event.event}:${randomId}`;
}

module.exports = {
  sanitizeAcquisition,
  sanitizeAcquisitionTouch,
  sanitizeCheckoutEvent,
  sanitizeMeta,
  checkoutEventSourceId,
};
