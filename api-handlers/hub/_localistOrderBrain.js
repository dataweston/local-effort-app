const SECURITY_PICKUP_WINDOW = 'Security at Neon';
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

function notificationEmail() {
  return process.env.LOCALIST_ORDER_NOTIFY_EMAIL
    || 'dataweston@gmail.com';
}

function senderEmail() {
  return process.env.SENDER_EMAIL || process.env.LOCALIST_ORDER_SENDER_EMAIL || notificationEmail();
}

function orderAreaLabel(order) {
  return order?.pickupWindow === SECURITY_PICKUP_WINDOW ? 'Security at Neon' : 'Localist';
}

function formatCurrency(cents) {
  return `$${((Number(cents) || 0) / 100).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function itemSummary(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const options = Array.isArray(item.customerOptions) && item.customerOptions.length
        ? ` (${item.customerOptions.join(', ')})`
        : '';
      return `${item.quantity}x ${item.name}${options}`;
    })
    .join('; ');
}

function orderRawContent(order, prefix = 'Localist order') {
  const areaLabel = orderAreaLabel(order);
  const lines = [
    `${prefix}: ${order.customerName}`,
    `Area: ${areaLabel}`,
    `Status: ${order.status}`,
    `Total: ${formatCurrency(order.totalCents)} (${order.totalQuantity} item${order.totalQuantity === 1 ? '' : 's'})`,
    areaLabel === 'Localist' ? `Pickup: ${order.pickupWindow}` : null,
    order.customerEmail ? `Email: ${order.customerEmail}` : null,
    order.customerPhone ? `Phone: ${order.customerPhone}` : null,
    order.customerNote ? `Notes/allergies: ${order.customerNote}` : null,
    `Items: ${itemSummary(order.items)}`,
    order.squareOrderId ? `Square order: ${order.squareOrderId}` : null,
    order.squarePaymentId ? `Square payment: ${order.squarePaymentId}` : null,
    order.squareReceiptUrl ? `Square receipt: ${order.squareReceiptUrl}` : null,
    order.squarePaymentLinkUrl ? `Square checkout: ${order.squarePaymentLinkUrl}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

async function sendPaidOrderEmail(order) {
  const apiKey = process.env.BREVO_API_KEY;
  const toEmail = notificationEmail();
  const fromEmail = senderEmail();
  if (!apiKey || !toEmail || !fromEmail) return { skipped: true };

  const areaLabel = orderAreaLabel(order);
  const subject = `${areaLabel} paid order - ${order.customerName || 'customer'} - ${formatCurrency(order.totalCents)}`;
  const items = itemSummary(order.items) || 'No item details';
  const pickupLine = areaLabel === 'Localist' && order.pickupWindow
    ? `<p><strong>Pickup:</strong> ${escapeHtml(order.pickupWindow)}</p>`
    : '';
  const htmlContent = `
    <h2>${escapeHtml(subject)}</h2>
    <p><strong>Status:</strong> ${escapeHtml(order.status || 'paid')}</p>
    <p><strong>Total:</strong> ${escapeHtml(formatCurrency(order.totalCents))} (${Number(order.totalQuantity) || 0} item${Number(order.totalQuantity) === 1 ? '' : 's'})</p>
    ${pickupLine}
    <p><strong>Name:</strong> ${escapeHtml(order.customerName || '')}</p>
    ${order.customerEmail ? `<p><strong>Email:</strong> ${escapeHtml(order.customerEmail)}</p>` : ''}
    ${order.customerPhone ? `<p><strong>Phone:</strong> ${escapeHtml(order.customerPhone)}</p>` : ''}
    ${order.customerNote ? `<p><strong>Notes:</strong> ${escapeHtml(order.customerNote)}</p>` : ''}
    <p><strong>Items:</strong> ${escapeHtml(items)}</p>
    ${order.squareReceiptUrl ? `<p><a href="${escapeHtml(order.squareReceiptUrl)}">Square receipt</a></p>` : ''}
    ${order.squareOrderId ? `<p><strong>Square order:</strong> ${escapeHtml(order.squareOrderId)}</p>` : ''}
    ${order.squarePaymentId ? `<p><strong>Square payment:</strong> ${escapeHtml(order.squarePaymentId)}</p>` : ''}
  `;
  const textContent = orderRawContent(order, `Paid ${areaLabel} order`);

  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: process.env.LOCALIST_ORDER_SENDER_NAME || 'Local Effort' },
      to: [{ email: toEmail }],
      subject,
      htmlContent,
      textContent,
    }),
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    const error = new Error('Brevo paid order email failed');
    error.status = response.status;
    error.details = details;
    throw error;
  }
  return { sent: true };
}

async function writeOrderBrainRecords(prisma, order, { paid = false } = {}) {
  if (!prisma?.ledgerEvent?.create || !prisma?.brainInboxItem?.create) return {};

  const eventType = paid ? 'localist.order.paid' : 'localist.order.checkout_created';
  const sourceId = paid ? `${order.id}:paid` : order.id;
  const existing = await prisma.ledgerEvent.findFirst({
    where: {
      eventType,
      source: 'hub_localist_order',
      sourceId,
      tombstonedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) return { ledgerEvent: existing };

  const payload = {
    orderId: order.id,
    status: order.status,
    customer: {
      name: order.customerName,
      email: order.customerEmail || null,
      phone: order.customerPhone || null,
    },
    pickupWindow: order.pickupWindow,
    customerNote: order.customerNote || null,
    totalCents: order.totalCents,
    totalQuantity: order.totalQuantity,
    items: order.items,
    localistWindowId: order.localistWindowId || null,
    sourceVisitorId: order.sourceVisitorId || null,
    sourceSessionId: order.sourceSessionId || null,
    entrySource: order.entrySource || null,
    squarePaymentLinkId: order.squarePaymentLinkId || null,
    squarePaymentLinkUrl: order.squarePaymentLinkUrl || null,
    squareOrderId: order.squareOrderId || null,
    squarePaymentId: order.squarePaymentId || null,
    squareCustomerId: order.squareCustomerId || null,
    squareReceiptUrl: order.squareReceiptUrl || null,
    checkoutStartedAt: order.checkoutStartedAt,
    paidAt: order.paidAt || null,
  };

  const ledgerEvent = await prisma.ledgerEvent.create({
    data: {
      eventType,
      schemaVersion: 1,
      occurredAt: paid ? (order.paidAt || new Date()) : (order.checkoutStartedAt || new Date()),
      source: 'hub_localist_order',
      sourceId,
      actorType: 'customer',
      actorId: order.sourceVisitorId || null,
      payload,
    },
  });

  const inboxItem = await prisma.brainInboxItem.create({
    data: {
      rawContent: orderRawContent(order, paid ? `Paid ${orderAreaLabel(order)} order` : `${orderAreaLabel(order)} checkout started`),
      source: 'hub_localist_order',
      attachments: order.squarePaymentLinkUrl
        ? [
            { url: order.squarePaymentLinkUrl, mimeType: 'text/html', label: 'Square checkout' },
            ...(order.squareReceiptUrl ? [{ url: order.squareReceiptUrl, mimeType: 'text/html', label: 'Square receipt' }] : []),
          ]
        : undefined,
      capturedAt: new Date(),
      status: paid ? 'pending' : 'processed',
      triageHint: {
        type: 'localist_order',
        orderId: order.id,
        paid,
        squareOrderId: order.squareOrderId || null,
      },
    },
  });

  await prisma.hubLocalistOrder.update({
    where: { id: order.id },
    data: paid
      ? { brainLedgerEventId: ledgerEvent.id, brainInboxItemId: inboxItem.id }
      : { brainLedgerEventId: ledgerEvent.id, brainInboxItemId: inboxItem.id },
  }).catch(() => {});

  if (paid) {
    await sendPaidOrderEmail(order).catch((err) => {
      console.warn('[hub/localist-order] paid order email failed', err?.message || err);
    });
  }

  return { ledgerEvent, inboxItem };
}

function paymentField(payment, snakeKey, camelKey) {
  return payment?.[snakeKey] ?? payment?.[camelKey] ?? null;
}

async function markLocalistOrderPaidFromSquare(prisma, payment) {
  const squareOrderId = paymentField(payment, 'order_id', 'orderId');
  if (!squareOrderId || !prisma?.hubLocalistOrder?.findUnique) return null;

  const existing = await prisma.hubLocalistOrder.findUnique({ where: { squareOrderId } });
  if (!existing) return null;

  const paidAtRaw = paymentField(payment, 'created_at', 'createdAt');
  const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();
  const buyerEmail = paymentField(payment, 'buyer_email_address', 'buyerEmailAddress') || paymentField(payment, 'receipt_email', 'receiptEmail');
  const updated = await prisma.hubLocalistOrder.update({
    where: { id: existing.id },
    data: {
      status: 'paid',
      paidAt: existing.paidAt || paidAt,
      squarePaymentId: existing.squarePaymentId || payment.id || null,
      customerEmail: existing.customerEmail || buyerEmail || null,
      squareCustomerId: existing.squareCustomerId || paymentField(payment, 'customer_id', 'customerId') || null,
      squareReceiptUrl: existing.squareReceiptUrl || paymentField(payment, 'receipt_url', 'receiptUrl') || null,
    },
  });
  await writeOrderBrainRecords(prisma, updated, { paid: true });
  return updated;
}

module.exports = {
  itemSummary,
  orderRawContent,
  orderAreaLabel,
  sendPaidOrderEmail,
  writeOrderBrainRecords,
  markLocalistOrderPaidFromSquare,
};
