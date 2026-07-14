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

function invoiceDate(invoice) {
  return String(invoice.paymentRequests?.find((request) => request?.dueDate)?.dueDate || invoice.saleOrServiceDate || invoice.createdAt || '').slice(0, 10);
}

async function amountCents(client, invoice) {
  if (!invoice.orderId) return Number(invoice.nextPaymentAmountMoney?.amount || 0);
  const response = await client.ordersApi.retrieveOrder(invoice.orderId);
  return Number(response.result?.order?.totalMoney?.amount || 0);
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
    const response = await client.invoicesApi.listInvoices(locationId, cursor, 200);
    invoices.push(...(response.result.invoices || []));
    cursor = response.result.cursor;
  } while (cursor);

  const rows = await Promise.all(invoices.map(async (invoice) => ({
    date: invoiceDate(invoice),
    status: invoice.status,
    amountCents: await amountCents(client, invoice),
    recipient: invoice.primaryRecipient?.customerId || invoice.primaryRecipient?.emailAddress || invoice.primaryRecipient?.companyName || 'unknown',
    title: String(invoice.title || '').trim().toLowerCase(),
    happyMonday: [invoice.title, invoice.description, invoice.primaryRecipient?.companyName, invoice.primaryRecipient?.emailAddress]
      .filter(Boolean).join(' ').toLowerCase().includes('happy monday'),
  })));

  const grouped = new Map();
  for (const row of rows.filter((item) => item.date && item.amountCents > 0 && item.status !== 'CANCELED')) {
    const key = `${row.recipient}|${row.title}`;
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

  const monthly = series.filter((item) => item.monthlyCandidate);
  console.log(JSON.stringify({
    invoiceCount: invoices.length,
    monthlyRecurringCents: monthly.reduce((sum, item) => sum + item.latestAmountCents, 0),
    monthlySeriesCount: monthly.length,
    monthlySeries: monthly,
    nonMonthlySeries: series.filter((item) => !item.monthlyCandidate),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
