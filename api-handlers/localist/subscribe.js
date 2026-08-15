const crypto = require('crypto');
const { getSupabase } = require('../../backend/api/supabaseClient');
const { getSquareClient } = require('../_lib/squareClient');
const { prisma } = require('../_lib/prisma');

const BREVO_API_BASE = 'https://api.brevo.com/v3';

const TIER_PRICING_CENTS = { monthly: 4500, annual: 37500 };

// Square subscription plan VARIATION ids — the object Checkout enrolls a buyer
// into. Read per-call for the same dotenv-ordering reason as membershipUrl().
// Absent (not yet created in the Square catalog), paid signups degrade to the
// old behaviour: recorded, team notified, a human follows up. The page stays
// functional; it upgrades to instant checkout the moment these are set.
const planVariationId = (tier) =>
  ({
    monthly: process.env.SQUARE_LOCALIST_MONTHLY_PLAN_VARIATION_ID,
    annual: process.env.SQUARE_LOCALIST_ANNUAL_PLAN_VARIATION_ID,
  })[tier] || '';

// Where a new member goes to see their perks, spending, notes from us, and the
// 308B offerings. Returned to the client so the signup success state can link
// straight through. Component: src/components/hub/HubMembershipView.jsx
//
// Read per-call, not at module scope: this file is required at the top of
// backend/api/index.js, and a caller that configures dotenv after that require
// would otherwise bake in the fallback for the life of the process.
const siteUrl = () => process.env.PUBLIC_SITE_URL || 'https://www.localeffortfood.com';
const membershipUrl = (inviteToken) =>
  `${siteUrl()}/hub/membership${inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : ''}`;
const localistReturnUrl = (tier, inviteToken) => {
  const params = new URLSearchParams({ joined: tier, invite: inviteToken });
  return `${siteUrl()}/localist?${params.toString()}`;
};
const INVITE_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;
const TIER_LABELS = {
  monthly: 'Localist membership — monthly',
  annual: 'Localist membership — annual',
  waived: 'Localist membership — cost waived',
};
async function provisionLocalistInvite({ email, name }) {
  if (!prisma) throw new Error('Hub database unavailable');

  const now = new Date();
  const existing = await prisma.hubInvite.findFirst({
    where: {
      email: { equals: email, mode: 'insensitive' },
      accessLevel: 'localist',
      acceptedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) return existing;

  return prisma.hubInvite.create({
    data: {
      token: crypto.randomBytes(32).toString('base64url'),
      email,
      accessLevel: 'localist',
      displayNameHint: name || null,
      expiresAt: new Date(now.getTime() + INVITE_VALIDITY_MS),
    },
  });
}

// Membership roster row in Supabase. Paid checkout is not returned to the
// browser unless this durable activation record exists for the webhook.
async function recordMembership({ name, email, phone, tier, status, squareCustomerId, squareOrderId }) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase unavailable while recording Localist membership');
  const row = {
    name,
    phone,
    tier,
    status: status || 'pending',
    email: email || null,
    square_customer_id: squareCustomerId || null,
    square_order_id: squareOrderId || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('localist_members')
    .upsert(row, { onConflict: 'phone' });
  if (error) throw new Error(error.message || error.code || 'Unable to record Localist membership');
}

// For paid tiers: find-or-create the Square customer, then mint a Square-hosted
// checkout link that both TAKES the first payment and ENROLLS the buyer in the
// recurring subscription plan, in one page.
//
// This replaces an earlier flow that staged a DRAFT invoice for a human to send
// from the Square dashboard. Signing up and paying were two disjoint events and
// nothing happened until someone noticed the ops email; the co-op asked for them
// merged (2026-07-26).
//
// Note the tradeoff that came with it: Checkout-hosted payment links do not
// support ACH bank transfer (invoices do). The page's ACH copy was removed in
// the same change rather than left making a promise checkout cannot keep.
async function createSubscriptionCheckout({ name, email, phone, tier, inviteToken }) {
  const priceCents = TIER_PRICING_CENTS[tier];
  if (!priceCents) return {};
  const variationId = planVariationId(tier);
  const { client, locationId } = getSquareClient();
  if (!client || !locationId) {
    console.warn('[localist/subscribe] square unavailable; skipping checkout');
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

  // No plan configured yet => no checkout link. Deliberately not an error: the
  // caller still records the member and pings the team, so the co-op keeps the
  // signup and follows up by hand, exactly as before.
  if (!variationId) {
    console.warn(
      `[localist/subscribe] no subscription plan variation for "${tier}"; ` +
        'set SQUARE_LOCALIST_MONTHLY_PLAN_VARIATION_ID / SQUARE_LOCALIST_ANNUAL_PLAN_VARIATION_ID'
    );
    return { squareCustomerId: customerId };
  }

  const linkRes = await client.checkoutApi.createPaymentLink({
    idempotencyKey: crypto.randomUUID(),
    description: TIER_LABELS[tier],
    order: {
      locationId,
      customerId,
      lineItems: [{ quantity: '1', catalogObjectId: variationId }],
    },
    checkoutOptions: {
      // Enrols the buyer in the recurring plan rather than charging once.
      subscriptionPlanId: variationId,
      allowTipping: false,
      askForShippingAddress: false,
      redirectUrl: localistReturnUrl(tier, inviteToken),
      merchantSupportEmail:
        process.env.SUPPORT_INBOX_EMAIL || process.env.SENDER_EMAIL || undefined,
      acceptedPaymentMethods: {
        applePay: true,
        googlePay: true,
        cashAppPay: true,
        afterpayClearpay: false,
      },
    },
    prePopulatedData: {
      buyerEmail: email || undefined,
      buyerPhoneNumber: phone || undefined,
    },
    paymentNote: `Localist membership (${tier})`,
  });

  const link = linkRes?.result?.paymentLink;
  return {
    squareCustomerId: customerId,
    squareCheckoutUrl: link?.url || null,
    squareOrderId: link?.orderId || null,
  };
}

// Internal ops ping so a human follows up within the promised day.
async function notifyTeam({ apiKey, name, email, phone, tier, squareCheckoutUrl }) {
  const teamEmail = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
  const senderEmail = process.env.SENDER_EMAIL || teamEmail;
  if (!teamEmail) return;
  const lines = [
    `<p>New Localist signup — <strong>${tier}</strong></p>`,
    `<p>Name: ${name}<br/>Phone: ${phone}${email ? `<br/>Email: ${email}` : ''}</p>`,
    squareCheckoutUrl
      ? '<p>They were sent straight to Square checkout to pay and start the subscription. Square confirms the payment — no action needed unless they drop off.</p>'
      : tier === 'waived'
        ? '<p>Cost-waived membership — nothing to bill, just the welcome.</p>'
        : '<p><strong>No checkout link could be created</strong>, so they were NOT charged. Follow up by hand, and check that the Square subscription plan variation ids are configured.</p>',
    // NOTE: there is deliberately no member-facing welcome email from here yet.
    // Member-facing sends must be dry-run to the owner before shipping (see
    // AGENTS.md). Until that happens, send this link by hand.
    `<p>Their membership page: <a href="${membershipUrl()}">${membershipUrl()}</a></p>`,
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
  if (tier && !safeName) {
    return res.status(400).json({ error: 'name-required' });
  }
  if (tier && !safeEmail) {
    return res.status(400).json({ error: 'valid-email-required' });
  }
  if (tier && !prisma) {
    return res.status(503).json({ error: 'hub-database-unavailable' });
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

    // Tiered signups always receive an email-bound Localist invite. The token is
    // returned to the browser only; no member message is sent from this handler.
    let inviteToken = null;
    let billing = {};
    if (tier) {
      const invite = await provisionLocalistInvite({ email: safeEmail, name: safeName });
      inviteToken = invite.token;

      if (tier === 'monthly' || tier === 'annual') {
        try {
          billing = await createSubscriptionCheckout({
            name: safeName,
            email: safeEmail,
            phone: mobilePhone,
            tier,
            inviteToken,
          });
        } catch (error) {
          console.error('[localist/subscribe] square checkout creation failed:', error.message);
        }
      }
      await recordMembership({
        name: safeName,
        email: safeEmail,
        phone: mobilePhone,
        tier,
        status: tier === 'waived' ? 'active' : billing.squareCheckoutUrl ? 'checkout_started' : 'pending',
        squareCustomerId: billing.squareCustomerId,
        squareOrderId: billing.squareOrderId,
      });
      try {
        await notifyTeam({
          apiKey,
          name: safeName,
          email: safeEmail,
          phone: mobilePhone,
          tier,
          squareCheckoutUrl: billing.squareCheckoutUrl,
        });
      } catch (error) {
        console.error('[localist/subscribe] team notification failed:', error.message);
      }
    }

    console.log(`[localist/subscribe] subscribed: ${mobilePhone}${tier ? ` (tier: ${tier})` : ''}${isDuplicate ? ' (existing contact)' : ''}${billing.squareCheckoutUrl ? ' → checkout' : ''}`);
    // checkoutUrl present => the client sends them straight to Square to pay and
    // subscribe. Absent (waived tier, or plans not configured) => the client
    // shows the confirmation state and a human follows up.
    return res.status(200).json({
      ok: true,
      membershipUrl: membershipUrl(inviteToken),
      checkoutUrl: billing.squareCheckoutUrl || null,
    });
  } catch (error) {
    console.error('[localist/subscribe] error:', error.message);
    return res.status(500).json({ error: 'internal-error' });
  }
};
