const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

const fetchFn = (...args) => {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch(...args);
  }
  return import('node-fetch').then(({ default: fetch }) => fetch(...args));
};

const sanitize = (value, limit) => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (typeof limit === 'number' && limit > 0) {
    return trimmed.slice(0, limit);
  }
  return trimmed;
};

const formatCurrency = (value) => {
  const normalized = Number.isFinite(value) ? Number(value) : 0;
  return `$${(Math.max(0, Math.round(normalized)) / 100).toFixed(2)}`;
};

const normalizeItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => {
      if (!item) return null;
      const name = sanitize(item.name, 120) || 'Contribution';
      const rawQuantity = Number(item.quantity);
      const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? Math.round(rawQuantity) : 1;
      const rawPrice = Number(item.priceCents ?? item.price ?? 0);
      const priceCents = Number.isFinite(rawPrice) ? Math.max(0, Math.round(rawPrice)) : 0;
      return { name, quantity, priceCents };
    })
    .filter(Boolean);
};

const buildItemsSummary = (items) => {
  if (!items.length) {
    return '• Contribution recorded (no item details provided).';
  }
  return items
    .map((item) => {
      const lineTotal = item.priceCents * item.quantity;
      const totalLabel = lineTotal > 0 ? formatCurrency(lineTotal) : '$0.00';
      return `• ${item.name} ×${item.quantity} — ${totalLabel}`;
    })
    .join('\n');
};

const postBrevoEmail = async (headers, payload) => {
  try {
    await fetchFn(BREVO_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[crowdfund.receipts] brevo send failed', err?.message || err);
  }
};

async function sendCrowdfundReceipts(options = {}) {
  const apiKey = process.env.BREVO_API_KEY;
  const teamEmail =
    process.env.CROWDFUND_RECEIPT_EMAIL ||
    process.env.SUPPORT_INBOX_EMAIL ||
    process.env.TEAM_INBOX_EMAIL ||
    process.env.SENDER_EMAIL;
  const senderEmail = process.env.CROWDFUND_SENDER_EMAIL || process.env.SENDER_EMAIL || teamEmail;
  const senderName = process.env.CROWDFUND_SENDER_NAME || 'Local Effort';

  if (!apiKey || !teamEmail || !senderEmail) {
    return;
  }

  const headers = {
    'api-key': apiKey,
    'content-type': 'application/json',
    accept: 'application/json',
  };

  const normalizedItems = normalizeItems(options.items);
  const explicitTotal = Number(options.totalCents);
  const itemsTotal = normalizedItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const contributionTotal = Number.isFinite(explicitTotal) && explicitTotal >= 0
    ? Math.round(explicitTotal)
    : itemsTotal;
  const totalLabel = formatCurrency(contributionTotal);
  const successSummary = buildItemsSummary(normalizedItems);

  const funderName = sanitize(options.funderName, 120);
  const friendlyName = funderName || 'Local Effort supporter';
  const customerEmail = sanitize(options.email, 120);
  const phone = sanitize(options.phone, 30);
  const notify = sanitize(options.notify, 60) || 'none';
  const rewardPreference = sanitize(options.rewardPreference, 120);
  const notes = sanitize(options.notes, 500);
  const discountCode = sanitize(options.discountCode, 60);
  const discountLabel = sanitize(options.discountLabel, 120);
  const paymentId = sanitize(options.paymentId, 80);
  const complimentary = Boolean(options.isComplimentary) || contributionTotal <= 0;

  const detailLines = [];
  if (discountCode) {
    detailLines.push(`Discount code: ${discountCode}`);
  }
  if (discountLabel) {
    detailLines.push(`Discount: ${discountLabel}`);
  }
  if (rewardPreference) {
    detailLines.push(`Reward preference: ${rewardPreference}`);
  }
  if (notify && notify !== 'none') {
    detailLines.push(`Updates preference: ${notify}`);
  }
  if (phone) {
    detailLines.push(`Phone: ${phone}`);
  }
  if (notes) {
    detailLines.push(`Notes: ${notes}`);
  }

  const adminLines = [
    `New crowdfunding contribution${paymentId ? ` (${paymentId})` : ''}`,
    '',
    `From: ${funderName || 'Anonymous'}`,
    `Email: ${customerEmail || 'not provided'}`,
    ...detailLines,
    '',
    successSummary,
    '',
    `Total: ${totalLabel}${complimentary ? ' (complimentary)' : ''}`,
  ];

  await postBrevoEmail(headers, {
    to: [{ email: teamEmail }],
    sender: { email: senderEmail, name: senderName },
    subject: 'New crowdfunding contribution',
    textContent: adminLines.join('\n'),
  });

  if (!customerEmail) {
    return;
  }

  const greetingName = funderName || 'there';
  const customerLines = [
    `Hi ${greetingName},`,
    '',
    "Thanks for fueling Local Effort! Here's what we recorded:",
    '',
    successSummary,
    '',
    `Total: ${totalLabel}${complimentary ? ' (complimentary)' : ''}`,
  ];
  if (discountLabel) {
    customerLines.push('', `Discount applied: ${discountLabel}`);
  } else if (discountCode) {
    customerLines.push('', `Discount code used: ${discountCode}`);
  }
  if (rewardPreference) {
    customerLines.push('', `Reward preference noted: ${rewardPreference}`);
  }
  customerLines.push('', 'We will reach out soon with reward details and next steps.', '', '— Local Effort');

  await postBrevoEmail(headers, {
    to: [{ email: customerEmail, name: funderName || undefined }],
    sender: { email: senderEmail, name: senderName },
    subject: 'Thanks for fueling Local Effort!',
    textContent: customerLines.join('\n'),
  });
}

module.exports = { sendCrowdfundReceipts };
