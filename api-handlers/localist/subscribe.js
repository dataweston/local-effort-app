const BREVO_API_BASE = 'https://api.brevo.com/v3';

// Per-IP rate limit: SMS list subscription is an abuse target.
const rateBuckets = new Map();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

function isRateLimited(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' && forwarded.split(',')[0].trim()) ||
    req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.expiresAt <= now) {
    rateBuckets.set(ip, { count: 1, expiresAt: now + RATE_WINDOW_MS });
    if (rateBuckets.size > 5000) {
      for (const [key, value] of rateBuckets.entries()) {
        if (value.expiresAt <= now) rateBuckets.delete(key);
      }
    }
    return false;
  }
  if (bucket.count >= RATE_MAX) return true;
  bucket.count += 1;
  return false;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  // Honeypot: real users never fill the hidden "website" field.
  if (typeof req.body?.website === 'string' && req.body.website.trim()) {
    return res.status(200).json({ ok: true, suppressed: true });
  }

  if (isRateLimited(req)) {
    res.setHeader('Retry-After', '600');
    return res.status(429).json({ error: 'rate-limit-exceeded' });
  }

  const { phone, name, email, tier } = req.body || {};
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'valid-phone-required' });
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) {
    return res.status(400).json({ error: 'valid-phone-required' });
  }

  // Optional membership fields — backward compatible: legacy clients send { phone } only.
  const VALID_TIERS = ['monthly', 'annual', 'waived'];
  if (tier !== undefined && (typeof tier !== 'string' || !VALID_TIERS.includes(tier))) {
    return res.status(400).json({ error: 'invalid-tier' });
  }
  const safeName = typeof name === 'string' ? name.trim().slice(0, 120) : '';
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const safeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) ? trimmedEmail : '';
  if (trimmedEmail && !safeEmail) {
    return res.status(400).json({ error: 'invalid-email' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[localist/subscribe] BREVO_API_KEY not configured');
    return res.status(503).json({ error: 'brevo-not-configured' });
  }

  const listIdsEnv = process.env.BREVO_LOCALIST_LIST_ID || '';
  const listIds = listIdsEnv
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id));

  const mobilePhone = `+1${digits}`;

  // Split "First Last" for Brevo's standard attributes.
  const nameParts = safeName.split(/\s+/).filter(Boolean);
  const attributes = {
    SMS: mobilePhone,
    ...(nameParts.length > 0 && { FIRSTNAME: nameParts[0] }),
    ...(nameParts.length > 1 && { LASTNAME: nameParts.slice(1).join(' ') }),
    ...(safeEmail && { EMAIL: safeEmail }),
    ...(tier && {
      LOCALIST_TIER: tier,
      LOCALIST_SIGNUP_DATE: new Date().toISOString().split('T')[0],
    }),
  };

  try {
    const payload = {
      mobilePhone,
      ...(safeEmail && { email: safeEmail }),
      attributes,
      ...(listIds.length > 0 && { listIds }),
      updateEnabled: true,
    };

    const response = await fetch(`${BREVO_API_BASE}/contacts`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 400 && data.code === 'duplicate_parameter') {
        await fetch(`${BREVO_API_BASE}/contacts/${encodeURIComponent(mobilePhone)}`, {
          method: 'PUT',
          headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            attributes,
            ...(listIds.length > 0 && { listIds }),
          }),
        });
        return res.status(200).json({ ok: true });
      }
      throw new Error(data.message || response.statusText);
    }

    console.log(`[localist/subscribe] subscribed: ${mobilePhone}${tier ? ` (tier: ${tier})` : ''}`);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[localist/subscribe] error:', error.message);
    return res.status(500).json({ error: 'internal-error' });
  }
};
