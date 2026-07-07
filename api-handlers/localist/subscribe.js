const crypto = require('crypto');
const { getSupabase } = require('../../backend/api/supabaseClient');
const { getSquareClient } = require('../_lib/squareClient');

const BREVO_API_BASE = 'https://api.brevo.com/v3';

const TIER_PRICING_CENTS = { monthly: 4500, annual: 37500 };
const TIER_LABELS = {
  monthly: 'Localist membership — monthly',
  annual: 'Localist membership — annual',
  waived: 'Localist membership — cost waived',
};

// Membership roster row in Supabase. Non-fatal: Brevo is the signup floor,
// so a Supabase hiccup is logged and the signup still succeeds.
async function recordMembership({ name, email, phone, tier, squareCustomerId, squareInvoiceId }) {
  const supabase = getSupabase();
  if (!supabase) return;
  const row = {
    name,
    phone,
    tier,
    email: email || null,
    square_customer_id: squareCustomerId || null,
    square_invoice_id: squareInvoiceId || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('localist_members')
    .upsert(row, { onConflict: 'phone' });
  if (error) {
    console.error(
      '[localist/subscribe] supabase upsert failed:',
      error.message || error.code || JSON.stringify(error)
    );
  }
}

// For paid tiers: find-or-create the Square customer and stage a DRAFT
// invoice with ACH (bank transfer) and card enabled. The draft is NOT sent
// from here — the co-op reviews and sends it from the Square dashboard,
// which keeps the page's "no payment taken here" promise honest.
async function prepareSquareBilling({ name, email, phone, tier }) {
  const priceCents = TIER_PRICING_CENTS[tier];
  if (!priceCents) return {};
  const { client, locationId } = getSquareClient();
  if (!client || !locationId) {
    console.warn('[localist/subscribe] square unavailable; skipping billing prep');
    return {};
  }

  const nameParts = name.split(/\s+/).filter(Boolean);
  const givenName = nameParts[0] || undefined;
  const familyName = nameParts.slice(1).join(' ') || undefined;

  // Find by phone first so repeat signups reuse the same customer.
  let customerId = null;
  try {
    const search = await client.customersApi.searchCustomers({
      query: { filter: { phoneNumber: { exact: phone } } },
    });
    customerId = search?.result?.customers?.[0]?.id || null;
  } catch (error) {
    console.warn('[localist/subscribe] square customer search failed:', error.message);
  }

  if (!customerId) {
    const created = await client.customersApi.createCustomer({
      idempotencyKey: crypto.randomUUID(),
      givenName,
      familyName,
      emailAddress: email || undefined,
      phoneNumber: phone,
      note: `Localist member (${tier})`,
    });
    customerId = created?.result?.customer?.id || null;
  }
  if (!customerId) return {};

  const orderRes = await client.ordersApi.createOrder({
    idempotencyKey: crypto.randomUUID(),
    order: {
      locationId,
      customerId,
      lineItems: [
        {
          name: TIER_LABELS[tier],
          quantity: '1',
          basePriceMoney: { amount: priceCents, currency: 'USD' },
        },
      ],
    },
  });
  const orderId = orderRes?.result?.order?.id;
  if (!orderId) return { squareCustomerId: customerId };

  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const invoiceRes = await client.invoicesApi.createInvoice({
    idempotencyKey: crypto.randomUUID(),
    invoice: {
      locationId,
      orderId,
      primaryRecipient: { customerId },
      deliveryMethod: 'EMAIL',
      title: TIER_LABELS[tier],
      description:
        'Welcome to the co-op. Bank transfer (ACH) is the fee-free way to pay — every processing dollar saved stays in the food. Card works too.',
      paymentRequests: [{ requestType: 'BALANCE', dueDate }],
      acceptedPaymentMethods: {
        card: true,
        bankAccount: true,
        squareGiftCard: false,
        buyNowPayLater: false,
        cashAppPay: false,
      },
    },
  });
  const squareInvoiceId = invoiceRes?.result?.invoice?.id || null;
  return { squareCustomerId: customerId, squareInvoiceId };
}

// Internal ops ping so a human follows up within the promised day.
async function notifyTeam({ apiKey, name, email, phone, tier, squareInvoiceId }) {
  const teamEmail = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
  const senderEmail = process.env.SENDER_EMAIL || teamEmail;
  if (!teamEmail) return;
  const lines = [
    `<p>New Localist signup — <strong>${tier}</strong></p>`,
    `<p>Name: ${name}<br/>Phone: ${phone}${email ? `<br/>Email: ${email}` : ''}</p>`,
    squareInvoiceId
      ? '<p>A draft Square invoice (ACH + card) is staged — review and send it from the Square dashboard.</p>'
      : tier === 'waived'
        ? '<p>Cost-waived membership — no invoice needed, just the welcome.</p>'
        : '<p>No Square invoice could be staged — create one manually.</p>',
  ];
  await fetch(`${BREVO_API_BASE}/smtp/email`, {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      to: [{ email: teamEmail }],
      sender: { email: senderEmail, name: 'Local Effort' },
      subject: `Localist signup: ${name} (${tier})`,
      htmlContent: lines.join('\n'),
      tags: ['localist', 'signup'],
    }),
  });
}

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

    const isDuplicate = !response.ok && response.status === 400 && data.code === 'duplicate_parameter';
    if (isDuplicate) {
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
    } else if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }

    // Membership program (tiered signups from /localist): roster row in
    // Supabase, draft Square invoice for paid tiers, and an ops ping so a
    // human follows up within the promised day. Each step is non-fatal —
    // the Brevo contact above is the signup floor.
    if (tier && safeName) {
      let billing = {};
      if (tier === 'monthly' || tier === 'annual') {
        try {
          billing = await prepareSquareBilling({
            name: safeName,
            email: safeEmail,
            phone: mobilePhone,
            tier,
          });
        } catch (error) {
          console.error('[localist/subscribe] square billing prep failed:', error.message);
        }
      }
      try {
        await recordMembership({
          name: safeName,
          email: safeEmail,
          phone: mobilePhone,
          tier,
          squareCustomerId: billing.squareCustomerId,
          squareInvoiceId: billing.squareInvoiceId,
        });
      } catch (error) {
        console.error('[localist/subscribe] membership record failed:', error.message);
      }
      try {
        await notifyTeam({
          apiKey,
          name: safeName,
          email: safeEmail,
          phone: mobilePhone,
          tier,
          squareInvoiceId: billing.squareInvoiceId,
        });
      } catch (error) {
        console.error('[localist/subscribe] team notification failed:', error.message);
      }
    }

    console.log(`[localist/subscribe] subscribed: ${mobilePhone}${tier ? ` (tier: ${tier})` : ''}${isDuplicate ? ' (existing contact)' : ''}`);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[localist/subscribe] error:', error.message);
    return res.status(500).json({ error: 'internal-error' });
  }
};
