const { getSupabase } = require('../supabaseClient');
const { getSquareClient } = require('../../../api-handlers/_lib/squareClient');
const { PrismaClient } = require('@prisma/client');

const DAY_MS = 86_400_000;
let localBudgetClient = null;

function getLocalBudgetClient() {
  if (localBudgetClient) return localBudgetClient;
  let url = String(process.env.LOCAL_BUDGET_DATABASE_URL || '').trim();
  url = url.replace(/^["']|["']$/g, '').replace(/^[A-Z_]+=/, '').replace(/^["']|["']$/g, '');
  if (!url) return null;
  localBudgetClient = new PrismaClient({ datasources: { db: { url } } });
  return localBudgetClient;
}

function isoDate(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

function monthKey(value) {
  return isoDate(value).slice(0, 7);
}

function monthKeys(count = 6, now = new Date()) {
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

function endOfMonthIso(key) {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function daysOld(value) {
  if (!value) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS));
}

function hoursBetween(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return Math.max(0, ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60);
}

function plannerCardLaborCents(card) {
  if (card.costPerHour > 0) {
    return Math.round(card.costPerHour * hoursBetween(card.startTime, card.endTime) * 100);
  }
  return Math.round(Number(card.cost || 0) * 100);
}

async function invoiceAmountCents(client, invoice) {
  const nextAmount = Number(invoice.nextPaymentAmountMoney?.amount || 0);
  if (nextAmount > 0) return nextAmount;
  if (!invoice.orderId) return 0;
  try {
    const response = await client.ordersApi.retrieveOrder(invoice.orderId);
    return Number(response.result?.order?.totalMoney?.amount || 0);
  } catch (_err) {
    return 0;
  }
}

function invoiceForecastDate(invoice) {
  return String(
    invoice.scheduledAt
      || invoice.paymentRequests?.find((request) => request?.dueDate)?.dueDate
      || invoice.saleOrServiceDate
      || invoice.createdAt
      || ''
  ).slice(0, 10);
}

function looksLikeHappyMonday(invoice) {
  const text = [
    invoice.title,
    invoice.description,
    invoice.primaryRecipient?.companyName,
    invoice.primaryRecipient?.emailAddress,
  ].filter(Boolean).join(' ').toLowerCase();
  return text.includes('happy monday');
}

async function squareForecast(keys, today) {
  const empty = {
    status: 'unavailable',
    scheduledByMonth: {},
    recurringByMonth: {},
    recurringMonthlyCents: 0,
    recurringSeriesCount: 0,
    scheduledOneOffCents: 0,
    scheduledInvoiceCount: 0,
    knownScheduledCents: 0,
    outstandingCents: 0,
    draftCents: 0,
    overlapExcludedCents: 0,
    lastUpdatedAt: null,
  };

  try {
    const { client, locationId } = getSquareClient();
    if (!client || !locationId || !client.invoicesApi) return empty;

    const invoices = [];
    let cursor;
    do {
      const response = await client.invoicesApi.listInvoices(locationId, cursor, 200);
      invoices.push(...(response.result?.invoices || []));
      cursor = response.result?.cursor;
    } while (cursor && invoices.length < 2000);

    const recurringByMonth = Object.fromEntries(keys.map((key) => [key, 0]));
    const scheduledOneOffByMonth = Object.fromEntries(keys.map((key) => [key, 0]));
    let scheduledInvoiceCount = 0;
    let knownScheduledCents = 0;
    let outstandingCents = 0;
    let draftCents = 0;
    let overlapExcludedCents = 0;

    const rows = [];
    for (const invoice of invoices) {
      const cents = await invoiceAmountCents(client, invoice);
      const date = invoiceForecastDate(invoice);
      const recipient = invoice.primaryRecipient?.customerId
        || invoice.primaryRecipient?.emailAddress
        || invoice.primaryRecipient?.companyName
        || 'unknown';
      const seriesKey = `${recipient}|${String(invoice.title || '').trim().toLowerCase()}`;
      rows.push({ invoice, cents, date, seriesKey });
    }

    const groups = new Map();
    for (const row of rows.filter(({ invoice, cents, date }) => invoice.status !== 'CANCELED' && cents > 0 && date)) {
      if (!groups.has(row.seriesKey)) groups.set(row.seriesKey, []);
      groups.get(row.seriesKey).push(row);
    }
    const recurringSeries = [...groups.entries()].map(([seriesKey, items]) => {
      const sorted = items.sort((a, b) => a.date.localeCompare(b.date));
      const intervals = sorted.slice(1).map((item, index) => Math.round((new Date(item.date) - new Date(sorted[index].date)) / DAY_MS));
      const cadenceDays = median(intervals);
      return { seriesKey, items: sorted, cadenceDays, latest: sorted.at(-1) };
    }).filter((series) => series.items.length >= 2 && series.cadenceDays >= 25 && series.cadenceDays <= 35);
    const recurringKeys = new Set(recurringSeries.map((series) => series.seriesKey));
    const recurringMonthlyCents = recurringSeries.reduce((sum, series) => sum + series.latest.cents, 0);
    for (const key of keys) recurringByMonth[key] = recurringMonthlyCents;

    for (const { invoice, cents, date, seriesKey } of rows) {
      if (invoice.status === 'DRAFT') {
        draftCents += cents;
        continue;
      }
      if (invoice.status === 'UNPAID' || invoice.status === 'PARTIALLY_PAID') {
        outstandingCents += cents;
        continue;
      }
      if (invoice.status !== 'SCHEDULED' || !date || date < today || !Object.hasOwn(scheduledOneOffByMonth, date.slice(0, 7))) continue;
      if (recurringKeys.has(seriesKey)) continue;
      if (looksLikeHappyMonday(invoice)) {
        overlapExcludedCents += cents;
        continue;
      }
      scheduledOneOffByMonth[date.slice(0, 7)] += cents;
      knownScheduledCents += cents;
      scheduledInvoiceCount += 1;
    }

    const scheduledByMonth = Object.fromEntries(keys.map((key) => [
      key,
      recurringByMonth[key] + scheduledOneOffByMonth[key],
    ]));

    const lastUpdatedAt = invoices.map((invoice) => invoice.updatedAt).filter(Boolean).sort().at(-1) || null;
    return {
      status: 'ready',
      scheduledByMonth,
      recurringByMonth,
      recurringMonthlyCents,
      recurringSeriesCount: recurringSeries.length,
      scheduledOneOffCents: knownScheduledCents,
      scheduledInvoiceCount,
      knownScheduledCents,
      outstandingCents,
      draftCents,
      overlapExcludedCents,
      lastUpdatedAt,
    };
  } catch (err) {
    return { ...empty, error: err.message };
  }
}

async function happyMondayForecast(keys, today) {
  const empty = {
    status: 'unavailable',
    forecastByMonth: {},
    actualByMonth: {},
    historyMonths: 6,
    orderCount: 0,
    futureOrderCount: 0,
    lastOrderDate: null,
  };
  try {
    const supabase = getSupabase();
    if (!supabase) return empty;
    const historyStart = isoDate(Date.now() - 183 * DAY_MS);
    const horizonEnd = endOfMonthIso(keys.at(-1));
    const { data, error } = await supabase
      .from('happymonday_orders')
      .select('order_date,total_cents,status')
      .gte('order_date', historyStart)
      .lte('order_date', horizonEnd)
      .order('order_date', { ascending: true });
    if (error) throw error;

    const usable = (data || []).filter((row) => !['refunded', 'canceled'].includes(String(row.status || '').toLowerCase()));
    const history = usable.filter((row) => row.order_date < today);
    const future = usable.filter((row) => row.order_date >= today);
    const forecastByMonth = Object.fromEntries(keys.map((key) => [key, 0]));
    const actualByMonth = {};
    for (const row of history) {
      const key = row.order_date.slice(0, 7);
      actualByMonth[key] = (actualByMonth[key] || 0) + Number(row.total_cents || 0);
    }
    for (const row of future) {
      const key = row.order_date.slice(0, 7);
      if (Object.hasOwn(forecastByMonth, key)) forecastByMonth[key] += Number(row.total_cents || 0);
    }

    return {
      status: 'ready',
      forecastByMonth,
      actualByMonth,
      historyMonths: empty.historyMonths,
      orderCount: history.length,
      futureOrderCount: future.length,
      lastOrderDate: usable.map((row) => row.order_date).sort().at(-1) || null,
    };
  } catch (err) {
    return { ...empty, error: err.message };
  }
}

async function localBudgetCostForecast(prisma, keys) {
  const empty = {
    status: 'unavailable',
    cogsByMonth: {},
    operatingByMonth: {},
    laborBaselineByMonth: {},
    averageCogsCents: 0,
    averageOperatingCents: 0,
    averageLaborCents: 0,
    baselineMonths: [],
    lastEventAt: null,
    freshnessDays: null,
  };
  const [forecastYear, forecastMonth] = keys[0].split('-').map(Number);
  const baselineStart = new Date(Date.UTC(forecastYear, forecastMonth - 7, 1));
  const baselineEnd = new Date(Date.UTC(forecastYear, forecastMonth - 1, 1));
  const baselineMonths = monthKeys(6, baselineStart);
  const lb = getLocalBudgetClient();
  if (lb) {
    try {
      const rows = await lb.$queryRawUnsafe(`
        WITH cost_lines AS (
          SELECT
            t.date,
            COALESCE(sc.name, c.name, 'Uncategorized') AS category,
            COALESCE(
              s.classification::text,
              sc."defaultClassification"::text,
              t.classification::text,
              c."defaultClassification"::text
            ) AS classification,
            ABS(CASE WHEN s.id IS NULL THEN t.amount ELSE s.amount END) AS amount
          FROM transactions t
          LEFT JOIN categories c ON c.id = t."categoryId"
          LEFT JOIN transaction_splits s ON s."transactionId" = t.id
          LEFT JOIN categories sc ON sc.id = s."categoryId"
          WHERE t.date >= $1 AND t.date < $2 AND t.status::text = 'POSTED'
        )
        SELECT
          TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
          CASE
            WHEN LOWER(category) ~ '(labor|payroll|wage|contractor|staff)' THEN 'labor'
            WHEN classification = 'COGS' THEN 'cogs'
            WHEN classification = 'OPERATING' THEN 'operating'
          END AS bucket,
          SUM(amount) AS amount
        FROM cost_lines
        WHERE classification IN ('COGS', 'OPERATING')
           OR LOWER(category) ~ '(labor|payroll|wage|contractor|staff)'
        GROUP BY month, bucket
      `, baselineStart, baselineEnd);
      const latest = await lb.$queryRawUnsafe(`
        SELECT MAX(date) AS "lastEventAt" FROM transactions WHERE status::text = 'POSTED'
      `);
      const actualByMonth = Object.fromEntries(baselineMonths.map((key) => [key, { cogs: 0, operating: 0, labor: 0 }]));
      for (const row of rows) {
        if (!actualByMonth[row.month] || !row.bucket) continue;
        actualByMonth[row.month][row.bucket] += Math.round(Number(row.amount || 0) * 100);
      }
      const averageCogsCents = average(baselineMonths.map((key) => actualByMonth[key].cogs));
      const averageOperatingCents = average(baselineMonths.map((key) => actualByMonth[key].operating));
      const averageLaborCents = average(baselineMonths.map((key) => actualByMonth[key].labor));
      const lastEventAt = latest[0]?.lastEventAt?.toISOString() || null;
      return {
        status: 'ready',
        source: 'local_budget_read_only',
        cogsByMonth: Object.fromEntries(keys.map((key) => [key, averageCogsCents])),
        operatingByMonth: Object.fromEntries(keys.map((key) => [key, averageOperatingCents])),
        laborBaselineByMonth: Object.fromEntries(keys.map((key) => [key, averageLaborCents])),
        actualByMonth,
        averageCogsCents,
        averageOperatingCents,
        averageLaborCents,
        baselineMonths,
        lastEventAt,
        freshnessDays: daysOld(lastEventAt),
      };
    } catch (_directError) {
      // Fall back to the Brain mirror when the read-only Local Budget connection is unavailable.
    }
  }
  try {
    const since = new Date(Date.now() - 240 * DAY_MS);
    const events = await prisma.ledgerEvent.findMany({
      where: {
        source: 'local_budget',
        eventType: 'payment.completed',
        occurredAt: { gte: since },
        tombstonedAt: null,
      },
      select: { occurredAt: true, payload: true },
    });
    if (!events.length) return empty;

    const actualByMonth = {};
    for (const event of events) {
      const key = monthKey(event.occurredAt);
      if (!actualByMonth[key]) actualByMonth[key] = { cogs: 0, operating: 0, labor: 0 };
      const cents = Number(event.payload?.amountCents || 0);
      const bucket = event.payload?.costBucket;
      if (bucket === 'LABOR') actualByMonth[key].labor += cents;
      else if (bucket === 'INVENTORY' || event.payload?.classification === 'COGS') actualByMonth[key].cogs += cents;
      else if (bucket === 'OPERATING' || event.payload?.classification === 'OPERATING') actualByMonth[key].operating += cents;
    }

    const observedMonths = Object.keys(actualByMonth).sort();
    const latestObservedMonth = observedMonths.at(-1);
    const baselineMonths = observedMonths.filter((key) => key !== latestObservedMonth).slice(-6);
    const averageCogsCents = average(baselineMonths.map((key) => actualByMonth[key].cogs));
    const averageOperatingCents = average(baselineMonths.map((key) => actualByMonth[key].operating));
    const averageLaborCents = average(baselineMonths.map((key) => actualByMonth[key].labor));
    const lastEventAt = events.map((event) => event.occurredAt).sort((a, b) => a - b).at(-1)?.toISOString() || null;

    return {
      status: baselineMonths.length ? 'ready' : 'unavailable',
      source: 'brain_mirror',
      cogsByMonth: Object.fromEntries(keys.map((key) => [key, averageCogsCents])),
      operatingByMonth: Object.fromEntries(keys.map((key) => [key, averageOperatingCents])),
      laborBaselineByMonth: Object.fromEntries(keys.map((key) => [key, averageLaborCents])),
      averageCogsCents,
      averageOperatingCents,
      averageLaborCents,
      baselineMonths,
      lastEventAt,
      freshnessDays: daysOld(lastEventAt),
    };
  } catch (err) {
    return { ...empty, error: err.message };
  }
}

async function plannerForecast(prisma, plannerUid, keys) {
  const cards = await prisma.plannerCard.findMany({
    where: {
      supabaseUid: plannerUid,
      date: { gte: `${keys[0]}-01`, lte: endOfMonthIso(keys.at(-1)) },
      enabled: true,
    },
    select: {
      date: true,
      revenue: true,
      cost: true,
      costPerHour: true,
      startTime: true,
      endTime: true,
    },
  });

  const laborByMonth = Object.fromEntries(keys.map((key) => [key, 0]));
  let excludedEventRevenueCents = 0;
  for (const card of cards) {
    const key = card.date.slice(0, 7);
    if (!Object.hasOwn(laborByMonth, key)) continue;
    laborByMonth[key] += plannerCardLaborCents(card);
    excludedEventRevenueCents += Math.round(Number(card.revenue || 0) * 100);
  }
  return { status: 'ready', laborByMonth, laborCardCount: cards.length, excludedEventRevenueCents };
}

async function buildPlannerForecast({ prisma, plannerUid, now = new Date() }) {
  const keys = monthKeys(6, now);
  const today = isoDate(now);
  const [square, happyMonday, localBudget, planner] = await Promise.all([
    squareForecast(keys, today),
    happyMondayForecast(keys, today),
    localBudgetCostForecast(prisma, keys),
    plannerForecast(prisma, plannerUid, keys),
  ]);

  const months = keys.map((key) => {
    const squareRevenueCents = square.scheduledByMonth[key] || 0;
    const happyMondayRevenueCents = happyMonday.forecastByMonth[key] || 0;
    const cogsCents = localBudget.cogsByMonth[key] || 0;
    const operatingCents = localBudget.operatingByMonth[key] || 0;
    const laborCents = planner.laborByMonth[key] || 0;
    const revenueCents = squareRevenueCents + happyMondayRevenueCents;
    const costCents = cogsCents + operatingCents + laborCents;
    return {
      month: key,
      revenueCents,
      squareRevenueCents,
      happyMondayRevenueCents,
      cogsCents,
      operatingCents,
      laborCents,
      netCents: revenueCents - costCents,
    };
  });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    currency: 'USD',
    methodology: 'Square monthly invoice series inferred from repeated 25-35 day invoice history, plus scheduled one-offs and committed Happy Monday orders, less six complete months of Local Budget actual cost averages and scheduled planner labor. Event revenue is excluded.',
    months,
    sources: {
      square,
      happyMonday,
      localBudget,
      planner,
    },
  };
}

module.exports = { buildPlannerForecast };
