// What the owner should do about a checkout failure, and the owner alert email
// built from it. One table feeds both the alert and scripts/checkout-failures.cjs
// so the two can never disagree.

const NEXT_STEP = {
  TRANSACTION_LIMIT: 'A limit on this amount was hit, at the card issuer or on the Square account. Check Square Dashboard > Account & Settings > Payment limits; otherwise the customer must call their bank or use another card.',
  PAYMENT_LIMIT_EXCEEDED: 'Square account payment limit. Check Square Dashboard > Account & Settings > Payment limits.',
  ADDRESS_VERIFICATION_FAILURE: 'Billing ZIP did not match the card. The customer fixes the ZIP; nothing to change on the site.',
  CVV_FAILURE: 'Wrong security code. The customer retries.',
  PAN_FAILURE: 'Bad card number. The customer retries or uses another card.',
  GENERIC_DECLINE: 'The issuer declined. The customer contacts their bank or uses another card.',
  'catalog-price-changed': 'The customer\'s cart had a stale price book. Check /api/store/price against the Sanity snapshot (catalog-revision-drift).',
  'ordering-window-closed': 'The customer tried outside the CMS order window. Confirm the Sanity drop window.',
  'ordering-database-unavailable': 'Database outage. Check Supabase/Prisma connectivity; nothing was charged.',
  config: 'Server misconfiguration (Square or database). Check production env.',
  server: 'Unexpected server error. Reproduce with the reason text; check the handler.',
  tokenize: 'The browser could not tokenize the card (Square SDK). Check the reason; test the card form on mobile Safari and Chrome.',
  verify: 'Buyer verification (3-D Secure) failed or timed out in the browser.',
  submit: 'The browser could not reach /api/store/checkout (network drop or timeout).',
  express: 'Apple/Google Pay token failed after approval.',
  'card-form': 'The Square card form failed to load; the pay button was unusable.',
};

function adviceFor({ declineCodes, code, stage } = {}) {
  const codes = String(declineCodes || code || '').split(',').filter(Boolean);
  for (const entry of codes) if (NEXT_STEP[entry]) return NEXT_STEP[entry];
  return NEXT_STEP[stage] || 'No guidance for this code yet; read the reason.';
}

// Which server-side failures page the owner. Validation rejects (empty cart,
// bad quantity, missing token) are what bots and broken clients produce, so they
// stay in the ledger only, as do 4xx rejections thrown mid-checkout. A stale
// price book is a real customer blocked.
const ALERT_STAGES = new Set(['square', 'config']);
const ALERT_CODES = new Set(['catalog-price-changed']);

function shouldAlertOwner({ stage, code, status }) {
  return ALERT_STAGES.has(stage)
    || (stage === 'server' && Number(status) >= 500)
    || ALERT_CODES.has(code);
}
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function formatChicago(date) {
  return `${new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)} Central`;
}

/**
 * Owner-only alert. Carries no customer contact details: the session reference
 * and the Square dashboard are how the owner finds the buyer.
 * Returns { payload, idempotencyKey }.
 */
function buildCheckoutFailureAlert({
  store, sessionId, stage, status, code, declineCodes, reason, amountCents,
  occurredAt = new Date(), ownerEmail, senderEmail,
}) {
  const amount = Number.isFinite(Number(amountCents)) && amountCents !== undefined && amountCents !== null
    ? `$${(Number(amountCents) / 100).toFixed(2)}`
    : 'unknown';
  const codeText = declineCodes || code || 'none';
  const next = adviceFor({ declineCodes, code, stage });
  const when = formatChicago(occurredAt);
  const rows = [
    ['Store', store],
    ['When', when],
    ['Amount', amount],
    ['Where it failed', `${stage} (HTTP ${status})`],
    ['Error code', codeText],
    ['What the customer saw', reason || '(none)'],
    ['Session reference', sessionId || '(none)'],
  ];

  const intro = 'A customer tried to pay and did not get through. They were told they have not been charged.';
  const textContent = [
    `Local Effort checkout failure: ${store}`,
    '',
    intro,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `What to do: ${next}`,
    '',
    'Full list: node scripts/checkout-failures.cjs --days 7',
    'You are receiving this because it is the owner alert address for site checkout. Reply to this message or contact the site maintainer if it looks wrong.',
  ].join('\n');

  const htmlContent = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222">
<p>${escapeHtml(intro)}</p>
<table cellpadding="4" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#666;vertical-align:top">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}</table>
<p><strong>What to do:</strong> ${escapeHtml(next)}</p>
<p style="color:#666;font-size:13px">Full list: <code>node scripts/checkout-failures.cjs --days 7</code><br>You are receiving this because it is the owner alert address for site checkout.</p>
</div>`;

  // A real decline is its own event, keyed by attempt. Anything else repeats
  // identically for every visitor while the fault lasts, so collapse it to one
  // alert per hour instead of one per attempt.
  const hour = occurredAt.toISOString().slice(0, 13);
  const idempotencyKey = stage === 'square' && sessionId
    ? `checkout-failure-alert:${sessionId}`
    : `checkout-failure-alert:${store}:${stage}:${code || 'none'}:${hour}`;

  return {
    idempotencyKey,
    payload: {
      to: [{ email: ownerEmail }],
      sender: { email: senderEmail, name: 'Local Effort' },
      subject: `Checkout failed: ${store} ${amount} (${codeText})`,
      textContent,
      htmlContent,
    },
  };
}

module.exports = { NEXT_STEP, adviceFor, shouldAlertOwner, buildCheckoutFailureAlert };
