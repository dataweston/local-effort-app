const CONTACT = 'yum@localeffortfood.com';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents || 0) / 100);

function formatWeek(value) {
  if (!value) return 'Week not specified';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Week not specified';
  return `Week of ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
}

function customerEmail(order) {
  const emails = Array.isArray(order?.customer?.users) ? order.customer.users : [];
  return emails.map((user) => String(user?.email || '').trim()).find((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) || null;
}

function buildWeeklyOrderConfirmations({ order, paymentId, paidCents, ownerEmail = CONTACT, senderEmail = process.env.SENDER_EMAIL || CONTACT }) {
  if (!order?.id || !paymentId) throw new Error('weekly-order-confirmation-payment-required');
  const week = formatWeek(order.menuWeek?.weekStart);
  const rows = (order.items || []).map((item) => ({
    title: item.dish?.title || `Item ${item.dishId}`,
    quantity: Number(item.quantity) || 0,
    unitPriceCents: Number(item.unitPriceCents) || 0,
    lineTotalCents: (Number(item.quantity) || 0) * (Number(item.unitPriceCents) || 0),
    includedInPlan: Boolean(item.includedInPlan),
    isAddon: Boolean(item.isAddon),
  }));
  const details = [
    ['Order', order.id],
    ['Menu week', week],
    ...rows.map((item) => [`${item.title} × ${item.quantity}`, item.includedInPlan ? 'Included in plan' : money(item.lineTotalCents)]),
    ['Plan price', money(order.basePriceCents)],
    ['Delivery fee', money(order.deliveryFeeCents)],
    ['Total paid', money(paidCents ?? order.totalsCents)],
  ];
  const table = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${details.map(([key, value]) => `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #ddd">${escapeHtml(key)}</td><td style="padding:8px 0;border-bottom:1px solid #ddd;text-align:right">${escapeHtml(value)}</td></tr>`).join('')}</table>`;
  const shell = (body) => `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#24201c"><main style="max-width:600px;margin:auto;padding:24px"><h1>Weekly order confirmation</h1>${body}<p>Questions? Reply to this email or contact ${CONTACT}.</p></main></body></html>`;
  const plainDetails = details.map(([key, value]) => `${key}: ${value}`).join('\n');
  const base = { sender: { email: senderEmail, name: 'Local Effort' }, replyTo: { email: CONTACT, name: 'Local Effort' }, tags: ['sale-confirmation', 'weekly-order'] };
  const confirmations = [];
  const email = customerEmail(order);
  if (email) {
    const name = order.customer?.name;
    confirmations.push({
      role: 'customer',
      payload: { ...base, to: [{ email }], subject: `Weekly order confirmed — ${week}`, htmlContent: shell(`<p>Thank you${name ? `, ${escapeHtml(name)}` : ''}. We received your payment and confirmed your weekly order.</p>${table}<p>We will use your saved weekly-order details for fulfillment. Reply to this email if you have a question.</p>`), textContent: `Thank you${name ? `, ${name}` : ''}. We received your payment and confirmed your weekly order.\n\n${plainDetails}\n\nQuestions? Reply to this email or contact ${CONTACT}.` },
    });
  }
  confirmations.push({
    role: 'owner',
    payload: { ...base, to: [{ email: ownerEmail }], subject: `Weekly order paid — ${week}`, htmlContent: shell(`<p>A weekly order payment was confirmed.</p>${table}<p>Customer: ${escapeHtml(order.customer?.name || 'Name not provided')}<br>Customer email: ${escapeHtml(email || 'Not available')}</p>`), textContent: `A weekly order payment was confirmed.\n${plainDetails}\nCustomer: ${order.customer?.name || 'Name not provided'}\nCustomer email: ${email || 'Not available'}` },
  });
  return confirmations;
}

async function queueWeeklyOrderConfirmations({ order, payment, paymentId = payment?.id, paidCents = payment?.amountMoney?.amount ?? payment?.amount_money?.amount, emailOutboxService }) {
  if (!emailOutboxService) throw new Error('weekly-order-confirmation-outbox-required');
  const confirmations = buildWeeklyOrderConfirmations({ order, paymentId, paidCents });
  const results = await Promise.allSettled(confirmations.map(({ role, payload }) => emailOutboxService.enqueue({
    payload,
    idempotencyKey: `weekly-order-confirmation:${paymentId}:${role}:v1`,
    category: 'transactional',
    source: 'sale-confirmation',
    context: { paymentId, orderId: order.id, role },
  })));
  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length) throw new Error(`weekly-order-confirmation-enqueue-failed:${failed.length}`);
  const ids = results.map((result) => result.value.id).filter(Boolean);
  if (ids.length) await emailOutboxService.processBatch({ ids, limit: ids.length });
  return { queued: ids.length, buyerEmailAvailable: confirmations.some(({ role }) => role === 'customer') };
}

module.exports = { buildWeeklyOrderConfirmations, queueWeeklyOrderConfirmations };
