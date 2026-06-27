const { getSanityClient } = require('../../backend/api/sanityClient');

const SECURITY_PICKUP_WINDOW = 'Security at Neon';
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

// Subtract purchased quantities from each item's Sanity inventoryCount.
// Only touches items that already track inventory and never goes below zero.
// Callers must gate this on the first transition into "paid" so duplicate
// confirmations (checkout.success event + Square webhook) can't double-subtract.
async function decrementInventoryForOrder(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return;

  const client = getSanityClient();
  if (!client) return;

  const quantityById = new Map();
  for (const line of items) {
    const id = typeof line?.id === 'string' ? line.id.trim() : '';
    const qty = Number(line?.quantity);
    if (!id || !Number.isInteger(qty) || qty < 1) continue;
    quantityById.set(id, (quantityById.get(id) || 0) + qty);
  }
  if (!quantityById.size) return;

  let current = [];
  try {
    current = await client.fetch('*[_id in $ids]{ _id, inventoryCount }', {
      ids: Array.from(quantityById.keys()),
    });
  } catch (err) {
    console.warn('[localistOrderBrain] inventory lookup failed', err?.message);
    return;
  }

  await Promise.all((Array.isArray(current) ? current : []).map(async (doc) => {
    const count = Number(doc?.inventoryCount);
    if (!Number.isFinite(count)) return; // item does not track inventory
    const qty = quantityById.get(doc._id) || 0;
    if (qty < 1) return;
    const next = Math.max(0, Math.round(count) - qty);
    try {
      await client.patch(doc._id).set({ inventoryCount: next }).commit();
    } catch (err) {
      console.warn('[localistOrderBrain] inventory decrement failed', doc._id, err?.message);
    }
  }));
}

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

function normalizedItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPriceCents = Number(item.unitPriceCents) || 0;
    const totalCents = Number(item.totalCents) || (unitPriceCents * quantity);
    return {
      ...item,
      quantity,
      unitPriceCents,
      totalCents,
      name: String(item.name || 'Menu item'),
      customerOptions: Array.isArray(item.customerOptions) ? item.customerOptions : [],
    };
  }).filter((item) => item.quantity > 0);
}

function itemOptionsText(item) {
  return item.customerOptions.length ? ` (${item.customerOptions.join(', ')})` : '';
}

function itemSummary(items) {
  return normalizedItems(items)
    .map((item) => `${item.quantity}x ${item.name}${itemOptionsText(item)}`)
    .join('; ');
}

function itemTextLines(items) {
  const lines = normalizedItems(items).map((item) => (
    `- ${item.quantity}x ${item.name}${itemOptionsText(item)} @ ${formatCurrency(item.unitPriceCents)} = ${formatCurrency(item.totalCents)}`
  ));
  return lines.length ? lines.join('\n') : '- No item details';
}

function itemRowsHtml(items) {
  const rows = normalizedItems(items).map((item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(`${item.quantity}x ${item.name}${itemOptionsText(item)}`)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(formatCurrency(item.unitPriceCents))}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(formatCurrency(item.totalCents))}</td>
    </tr>
  `).join('');

  return rows || `
    <tr>
      <td colspan="3" style="padding:8px 0;border-bottom:1px solid #eee;">No item details</td>
    </tr>
  `;
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
    'Items:',
    itemTextLines(order.items),
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
    <h3>Items purchased</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:8px 0;border-bottom:2px solid #ddd;text-align:left;">Item</th>
          <th style="padding:8px 0;border-bottom:2px solid #ddd;text-align:right;">Unit</th>
          <th style="padding:8px 0;border-bottom:2px solid #ddd;text-align:right;">Line total</th>
        </tr>
      </thead>
      <tbody>${itemRowsHtml(order.items)}</tbody>
    </table>
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

async function sendCustomerConfirmationEmail(order) {
  const apiKey = process.env.BREVO_API_KEY;
  const toEmail = order.customerEmail;
  const fromEmail = senderEmail();
  if (!apiKey || !toEmail || !fromEmail) return { skipped: true };

  const areaLabel = orderAreaLabel(order);
  const subject = `Your ${areaLabel} order confirmation - ${formatCurrency(order.totalCents)}`;
  const pickupLine = areaLabel === 'Localist' && order.pickupWindow
    ? `<p><strong>Pickup:</strong> ${escapeHtml(order.pickupWindow)}</p>`
    : '';
  const receiptLine = order.squareReceiptUrl
    ? `<p><a href="${escapeHtml(order.squareReceiptUrl)}">View your Square receipt</a></p>`
    : '';
  const htmlContent = `
    <h2>${escapeHtml(subject)}</h2>
    <p>Thanks${order.customerName ? `, ${escapeHtml(order.customerName)}` : ''}. Your order is confirmed and paid.</p>
    <p><strong>Total:</strong> ${escapeHtml(formatCurrency(order.totalCents))} (${Number(order.totalQuantity) || 0} item${Number(order.totalQuantity) === 1 ? '' : 's'})</p>
    ${pickupLine}
    <h3>Items purchased</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:8px 0;border-bottom:2px solid #ddd;text-align:left;">Item</th>
          <th style="padding:8px 0;border-bottom:2px solid #ddd;text-align:right;">Unit</th>
          <th style="padding:8px 0;border-bottom:2px solid #ddd;text-align:right;">Line total</th>
        </tr>
      </thead>
      <tbody>${itemRowsHtml(order.items)}</tbody>
    </table>
    ${order.customerNote ? `<p><strong>Notes:</strong> ${escapeHtml(order.customerNote)}</p>` : ''}
    ${receiptLine}
    <p>Questions? Reply to this email.</p>
  `;
  const textContent = [
    `Your ${areaLabel} order is confirmed and paid.`,
    `Name: ${order.customerName || ''}`,
    `Total: ${formatCurrency(order.totalCents)} (${Number(order.totalQuantity) || 0} item${Number(order.totalQuantity) === 1 ? '' : 's'})`,
    areaLabel === 'Localist' && order.pickupWindow ? `Pickup: ${order.pickupWindow}` : null,
    '',
    'Items purchased:',
    itemTextLines(order.items),
    order.customerNote ? `Notes: ${order.customerNote}` : null,
    order.squareReceiptUrl ? `Square receipt: ${order.squareReceiptUrl}` : null,
  ].filter((line) => line !== null).join('\n');

  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: process.env.LOCALIST_ORDER_SENDER_NAME || 'Local Effort' },
      to: [{ email: toEmail, name: order.customerName || undefined }],
      replyTo: { email: notificationEmail(), name: 'Local Effort' },
      subject,
      htmlContent,
      textContent,
    }),
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    const error = new Error('Brevo customer confirmation email failed');
    error.status = response.status;
    error.details = details;
    throw error;
  }
  return { sent: true };
}

async function emailEventExists(prisma, eventType, sourceId) {
  if (!prisma?.ledgerEvent?.findFirst) return false;
  const existing = await prisma.ledgerEvent.findFirst({
    where: {
      eventType,
      source: 'hub_localist_order',
      sourceId,
      tombstonedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });
  return !!existing;
}

async function recordEmailEvent(prisma, eventType, sourceId, order, recipient) {
  if (!prisma?.ledgerEvent?.create) return;
  await prisma.ledgerEvent.create({
    data: {
      eventType,
      schemaVersion: 1,
      occurredAt: new Date(),
      source: 'hub_localist_order',
      sourceId,
      actorType: 'system',
      actorId: null,
      payload: {
        orderId: order.id,
        area: orderAreaLabel(order),
        recipient,
        customerEmail: order.customerEmail || null,
        totalCents: order.totalCents,
        totalQuantity: order.totalQuantity,
        items: order.items,
      },
    },
  });
}

async function sendPaidOrderEmails(prisma, order) {
  const ownerEventType = 'localist.order.notification_email_sent';
  const ownerSourceId = `${order.id}:owner`;
  const customerEventType = 'localist.order.customer_confirmation_email_sent';
  const customerSourceId = `${order.id}:customer`;

  if (!(await emailEventExists(prisma, ownerEventType, ownerSourceId))) {
    try {
      const result = await sendPaidOrderEmail(order);
      if (result?.sent) await recordEmailEvent(prisma, ownerEventType, ownerSourceId, order, notificationEmail());
    } catch (err) {
      console.warn('[hub/localist-order] paid order email failed', err?.message || err);
    }
  }

  if (order.customerEmail && !(await emailEventExists(prisma, customerEventType, customerSourceId))) {
    try {
      const result = await sendCustomerConfirmationEmail(order);
      if (result?.sent) await recordEmailEvent(prisma, customerEventType, customerSourceId, order, order.customerEmail);
    } catch (err) {
      console.warn('[hub/localist-order] customer confirmation email failed', err?.message || err);
    }
  }
}

async function writeOrderBrainRecords(prisma, order, { paid = false } = {}) {
  if (!prisma?.ledgerEvent?.create) return {};
  if (!prisma?.brainInboxItem?.create) {
    if (paid) await sendPaidOrderEmails(prisma, order);
    return {};
  }

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
  if (existing) {
    if (paid) await sendPaidOrderEmails(prisma, order);
    return { ledgerEvent: existing };
  }

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
    await sendPaidOrderEmails(prisma, order);
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

  if (existing.status !== 'paid') {
    await decrementInventoryForOrder(updated).catch((err) => {
      console.warn('[localistOrderBrain] inventory update failed', err?.message);
    });
  }

  await writeOrderBrainRecords(prisma, updated, { paid: true });
  return updated;
}

module.exports = {
  itemSummary,
  orderRawContent,
  orderAreaLabel,
  sendPaidOrderEmail,
  sendCustomerConfirmationEmail,
  sendPaidOrderEmails,
  writeOrderBrainRecords,
  markLocalistOrderPaidFromSquare,
  decrementInventoryForOrder,
};
