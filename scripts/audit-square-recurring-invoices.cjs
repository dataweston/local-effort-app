const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function argValue(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || '' : '';
}

function invoiceDate(invoice) {
  return String(invoice.paymentRequests?.find((request) => request?.dueDate)?.dueDate || invoice.saleOrServiceDate || invoice.createdAt || '').slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimit(error) {
  return Number(error?.statusCode || error?.response?.statusCode || error?.response?.status || 0) === 429
    || /\b429\b/.test(String(error?.message || ''));
}

async function squareCall(operation) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRateLimit(error) || attempt === 4) throw error;
      await sleep(Math.min(8000, 500 * (2 ** attempt)));
    }
  }
  throw lastError;
}

async function amountCents(client, invoice) {
  const nextAmount = Number(invoice.nextPaymentAmountMoney?.amount || 0);
  if (nextAmount > 0) return nextAmount;
  if (!invoice.orderId) return 0;
  const response = await squareCall(() => client.ordersApi.retrieveOrder(invoice.orderId));
  return Number(response.result?.order?.totalMoney?.amount || 0);
}

async function recipientLabel(client, invoice, cache) {
  const recipient = invoice.primaryRecipient || {};
  const direct = [recipient.companyName, recipient.emailAddress].filter(Boolean);
  if (!recipient.customerId || !client.customersApi) {
    return direct.join(' | ') || recipient.customerId || 'unknown';
  }
  if (!cache.has(recipient.customerId)) {
    const response = await squareCall(() => client.customersApi.retrieveCustomer(recipient.customerId));
    const customer = response.result?.customer || {};
    const name = [customer.givenName, customer.familyName].filter(Boolean).join(' ');
    cache.set(
      recipient.customerId,
      [name, customer.companyName, customer.emailAddress].filter(Boolean),
    );
  }
  return [...direct, ...cache.get(recipient.customerId)].filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(' | ');
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function main() {
  loadEnv(path.resolve(__dirname, '..', '.env'));
  const { getSquareClient } = require('../api-handlers/_lib/squareClient');
  const { client, locationId } = getSquareClient();
  if (!client?.invoicesApi || !locationId) throw new Error('Square invoices are unavailable');

  const invoices = [];
  let cursor;
  do {
    const response = await squareCall(() => client.invoicesApi.listInvoices(locationId, cursor, 200));
    invoices.push(...(response.result.invoices || []));
    cursor = response.result.cursor;
  } while (cursor);

  const query = argValue('query').trim().toLowerCase();
  const customerCache = new Map();
  const rows = [];
  for (const invoice of invoices) {
    const recipient = await recipientLabel(client, invoice, customerCache);
    const title = String(invoice.title || '').trim();
    const description = String(invoice.description || '').trim();
    const searchable = [recipient, title, description, invoice.id].join(' ').toLowerCase();
    if (query && !searchable.includes(query)) continue;
    const amount = await amountCents(client, invoice);
    rows.push({
      invoiceId: invoice.id,
      subscriptionId: invoice.subscriptionId || null,
      date: invoiceDate(invoice),
      status: invoice.status,
      amountCents: amount,
      recipient,
      title,
      description,
      happyMonday: [title, description, recipient].join(' ').toLowerCase().includes('happy monday'),
    });
    await sleep(75);
  }

  const grouped = new Map();
  for (const row of rows.filter((item) => item.date && item.amountCents > 0 && item.status !== 'CANCELED')) {
    const key = row.subscriptionId || `${row.recipient}|${row.title.toLowerCase()}|${row.amountCents}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }

  const series = [...grouped.entries()].map(([key, items]) => {
    const sorted = items.sort((a, b) => a.date.localeCompare(b.date));
    const intervals = sorted.slice(1).map((item, index) => Math.round((new Date(item.date) - new Date(sorted[index].date)) / 86_400_000));
    const cadenceDays = median(intervals);
    const recent = sorted.at(-1);
    return {
      seriesId: crypto.createHash('sha256').update(key).digest('hex').slice(0, 10),
      recipient: recent.recipient,
      title: recent.title,
      invoiceCount: sorted.length,
      cadenceDays,
      firstDate: sorted[0].date,
      lastDate: recent.date,
      latestAmountCents: recent.amountCents,
      latestStatus: recent.status,
      happyMonday: sorted.some((item) => item.happyMonday),
      monthlyCandidate: sorted.length >= 2 && cadenceDays >= 25 && cadenceDays <= 35,
    };
  }).sort((a, b) => b.latestAmountCents - a.latestAmountCents);

  const activeCutoff = new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10);
  const monthly = series.filter((item) => item.monthlyCandidate && item.lastDate >= activeCutoff);
  const historicalMonthly = series.filter((item) => item.monthlyCandidate && item.lastDate < activeCutoff);
  console.log(JSON.stringify({
    query: query || null,
    invoiceCount: invoices.length,
    matchedInvoiceCount: rows.length,
    matchedInvoices: query ? rows : undefined,
    monthlyRecurringCents: monthly.reduce((sum, item) => sum + item.latestAmountCents, 0),
    monthlySeriesCount: monthly.length,
    monthlySeries: monthly,
    historicalMonthlySeries: historicalMonthly,
    nonMonthlySeries: series.filter((item) => !item.monthlyCandidate),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
