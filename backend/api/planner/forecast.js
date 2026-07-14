const { getSupabase } = require('../supabaseClient');
const { getSquareClient } = require('../../../api-handlers/_lib/squareClient');

const DAY_MS = 86_400_000;

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
    scheduledInvoiceCount: 0,
    knownScheduledCents: 0,
    outstandingCents: 0,
    draftCents: 0,
    overlapExcludedCents: 0,
    recurringSeriesObserved: 0,
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

    const scheduledByMonth = Object.fromEntries(keys.map((key) => [key, 0]));
    let scheduledInvoiceCount = 0;
    let knownScheduledCents = 0;
    let outstandingCents = 0;
    let draftCents = 0;
    let overlapExcludedCents = 0;

    const candidates = invoices.filter((invoice) => ['SCHEDULED', 'UNPAID', 'PARTIALLY_PAID', 'DRAFT'].includes(invoice.status));
    for (const invoice of candidates) {
      const cents = await invoiceAmountCents(client, invoice);
      const date = invoiceForecastDate(invoice);
      if (invoice.status === 'DRAFT') {
        draftCents += cents;
        continue;
      }
      if (invoice.status === 'UNPAID' || invoice.status === 'PARTIALLY_PAID') {
        outstandingCents += cents;
        continue;
      }
      if (!date || date < today || !Object.hasOwn(scheduledByMonth, date.slice(0, 7))) continue;
      if (looksLikeHappyMonday(invoice)) {
        overlapExcludedCents += cents;
        continue;
      }
      scheduledByMonth[date.slice(0, 7)] += cents;
      knownScheduledCents += cents;
      scheduledInvoiceCount += 1;
    }

    const lastUpdatedAt = invoices.map((invoice) => invoice.updatedAt).filter(Boolean).sort().at(-1) || null;
    return {
      status: 'ready',
      scheduledByMonth,
      scheduledInvoiceCount,
      knownScheduledCents,
      outstandingCents,
      draftCents,
      overlapExcludedCents,
      recurringSeriesObserved: new Set(invoices.map((invoice) => invoice.subscriptionId).filter(Boolean)).size,
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
    averageMonthlyCents: 0,
    lookbackDays: 56,
    orderCount: 0,
    futureOrderCount: 0,
    lastOrderDate: null,
  };
  try {
    const supabase = getSupabase();
    if (!supabase) return empty;
    const historyStart = isoDate(Date.now() - empty.lookbackDays * DAY_MS);
    const horizonEnd = endOfMonthIso(keys.at(-1));
    const { data, error } = await supabase
      .from('happymonday_orders')
      .select('order_date,total_cents,status')
      .gte('order_date', historyStart)
      .lte('order_date', horizonEnd)
      .order('order_date', { ascending: true });
    if (error) throw error;

    const usable = (data || []).filter((row) => !['refunded', 'canceled'].includes(String(row.status || '').toLowerCase()));
    const history = usable.filter((row) => row.order_date <= today);
    const future = usable.filter((row) => row.order_date > today);
    const historyCents = history.reduce((sum, row) => sum + Number(row.total_cents || 0), 0);
    const dailyRunRate = historyCents / Math.max(empty.lookbackDays, 1);
    const forecastByMonth = {};
    for (const key of keys) {
      const [year, month] = key.split('-').map(Number);
      forecastByMonth[key] = Math.round(dailyRunRate * new Date(Date.UTC(year, month, 0)).getUTCDate());
    }

    return {
      status: 'ready',
      forecastByMonth,
      averageMonthlyCents: Math.round(dailyRunRate * (365.25 / 12)),
      lookbackDays: empty.lookbackDays,
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
    const baselineMonths = observedMonths.filter((key) => key !== latestObservedMonth).slice(-3);
    const averageCogsCents = average(baselineMonths.map((key) => actualByMonth[key].cogs));
    const averageOperatingCents = average(baselineMonths.map((key) => actualByMonth[key].operating));
    const averageLaborCents = average(baselineMonths.map((key) => actualByMonth[key].labor));
    const lastEventAt = events.map((event) => event.occurredAt).sort((a, b) => a - b).at(-1)?.toISOString() || null;

    return {
      status: baselineMonths.length ? 'ready' : 'unavailable',
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
    methodology: 'Known scheduled Square invoices + Happy Monday 56-day run rate - Local Budget trailing complete-month costs - planner labor. Square Payroll register costs and planner event revenue are excluded until their source feeds are connected.',
    months,
    sources: {
      square,
      happyMonday,
      localBudget,
      planner,
      squarePayroll: {
        status: 'report_required',
        includedInForecast: false,
        note: 'Square Payroll company totals or payroll history export is required for gross wages, employer taxes, and adjustments.',
      },
    },
  };
}

module.exports = { buildPlannerForecast };
