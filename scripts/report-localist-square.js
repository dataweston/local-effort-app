require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV = String(process.env.SQUARE_ENVIRONMENT || process.env.SQUARE_ENV || 'production').toLowerCase();
const API_BASE = ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';

function asString(value) {
  return value == null ? '' : String(value);
}

async function squareFetch(path, options = {}) {
  if (!ACCESS_TOKEN) throw new Error('SQUARE_ACCESS_TOKEN is not configured');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Square-Version': '2025-05-21',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`Square ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function parseNote(note) {
  const result = {};
  for (const part of asString(note).split('|').map((entry) => entry.trim()).filter(Boolean)) {
    const idx = part.indexOf(':');
    if (part.startsWith('Localist order - ')) result.name = part.replace('Localist order - ', '').trim();
    else if (idx > 0) result[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim();
  }
  return result;
}

async function recentSuccessIds() {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const events = await prisma.ledgerEvent.findMany({
    where: {
      source: 'hub_localist',
      eventType: 'localist.checkout.success',
      occurredAt: { gte: since },
      tombstonedAt: null,
    },
    orderBy: { occurredAt: 'asc' },
  });
  return [...new Set(events.map((event) => {
    const path = event.payload?.path || '';
    try {
      const url = new URL(path, 'https://www.localeffortfood.com');
      return url.searchParams.get('orderId') || url.searchParams.get('transactionId');
    } catch (_err) {
      return null;
    }
  }).filter(Boolean))];
}

async function retrieveOrder(orderId) {
  try {
    const data = await squareFetch(`/v2/orders/${encodeURIComponent(orderId)}`);
    return data.order || null;
  } catch (err) {
    return { id: orderId, error: err.message };
  }
}

async function listOrderCustomAttributes(orderId) {
  try {
    const params = new URLSearchParams({
      visibility_filter: 'ALL',
      with_definitions: 'true',
      limit: '100',
    });
    const data = await squareFetch(`/v2/orders/${encodeURIComponent(orderId)}/custom-attributes?${params.toString()}`);
    return data.custom_attributes || {};
  } catch (err) {
    return { error: err.message };
  }
}

async function retrievePayment(paymentId) {
  try {
    const data = await squareFetch(`/v2/payments/${encodeURIComponent(paymentId)}`);
    return data.payment || null;
  } catch (err) {
    return { id: paymentId, error: err.message };
  }
}

async function retrieveCustomer(customerId) {
  try {
    const data = await squareFetch(`/v2/customers/${encodeURIComponent(customerId)}`);
    return data.customer || null;
  } catch (err) {
    return { id: customerId, error: err.message };
  }
}

async function listLocalistPayments(since) {
  const params = new URLSearchParams({
    begin_time: since.toISOString(),
    sort_order: 'ASC',
  });
  if (LOCATION_ID) params.set('location_id', LOCATION_ID);
  const data = await squareFetch(`/v2/payments?${params.toString()}`);
  const payments = Array.isArray(data.payments) ? data.payments : [];
  const rows = [];
  for (const payment of payments) {
    const orderId = payment.order_id || null;
    if (!orderId) continue;
    const order = await retrieveOrder(orderId);
    const note = order?.note || '';
    if (/Localist order/i.test(note)) {
      rows.push({ payment, order });
    }
  }
  return rows;
}

async function main() {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const ids = await recentSuccessIds();
  const returnedOrders = [];
  for (const id of ids) returnedOrders.push(await retrieveOrder(id));
  const returnedOrderCustomAttributes = [];
  for (const id of ids) {
    returnedOrderCustomAttributes.push({
      orderId: id,
      customAttributes: await listOrderCustomAttributes(id),
    });
  }
  const tenderPaymentIds = [...new Set(returnedOrders.flatMap((order) => (
    Array.isArray(order?.tenders) ? order.tenders.map((tender) => tender.payment_id).filter(Boolean) : []
  )))];
  const returnedPayments = [];
  for (const id of tenderPaymentIds) returnedPayments.push(await retrievePayment(id));
  const customerIds = [...new Set(returnedPayments.map((payment) => payment?.customer_id).filter(Boolean))];
  const returnedCustomers = [];
  for (const id of customerIds) returnedCustomers.push(await retrieveCustomer(id));
  const localistPayments = await listLocalistPayments(since);

  const output = {
    since: since.toISOString(),
    returnedSquareOrderIds: ids,
    returnedOrders: returnedOrders.map((order) => ({
      id: order?.id,
      error: order?.error || null,
      state: order?.state || null,
      createdAt: order?.created_at || null,
      totalMoney: order?.total_money || null,
      note: order?.note || null,
      parsed: parseNote(order?.note),
      lineItems: (order?.line_items || []).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        totalMoney: item.total_money || null,
      })),
      tenders: order?.tenders || [],
    })),
    returnedOrderCustomAttributes,
    returnedPayments: returnedPayments.map((payment) => ({
      id: payment?.id,
      error: payment?.error || null,
      status: payment?.status || null,
      createdAt: payment?.created_at || null,
      orderId: payment?.order_id || null,
      amountMoney: payment?.amount_money || null,
      receiptUrl: payment?.receipt_url || null,
      buyerEmailAddress: payment?.buyer_email_address || null,
      customerId: payment?.customer_id || null,
      note: payment?.note || null,
      cardDetails: payment?.card_details ? {
        status: payment.card_details.status,
        entryMethod: payment.card_details.entry_method,
        brand: payment.card_details.card?.card_brand || null,
        last4: payment.card_details.card?.last_4 || null,
      } : null,
    })),
    returnedCustomers: returnedCustomers.map((customer) => ({
      id: customer?.id,
      error: customer?.error || null,
      givenName: customer?.given_name || null,
      familyName: customer?.family_name || null,
      emailAddress: customer?.email_address || null,
      phoneNumber: customer?.phone_number || null,
      address: customer?.address || null,
      createdAt: customer?.created_at || null,
      updatedAt: customer?.updated_at || null,
    })),
    localistPayments: localistPayments.map(({ payment, order }) => ({
      paymentId: payment.id,
      orderId: payment.order_id,
      status: payment.status,
      createdAt: payment.created_at,
      amountMoney: payment.amount_money,
      receiptUrl: payment.receipt_url || null,
      buyerEmailAddress: payment.buyer_email_address || null,
      note: order?.note || null,
      parsed: parseNote(order?.note),
      lineItems: (order?.line_items || []).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        totalMoney: item.total_money || null,
      })),
    })),
  };
  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
