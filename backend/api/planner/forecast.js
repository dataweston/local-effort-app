const { getSupabase } = require('../supabaseClient');
const { getSquareClient } = require('../../../api-handlers/_lib/squareClient');

const DAY_MS = 86_400_000;

function isoDate(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
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

function localBudgetApiConfig() {
  const baseUrl = String(process.env.LOCAL_BUDGET_API_URL || '').trim().replace(/\/+$/, '');
  const token = String(process.env.LOCAL_BUDGET_API_TOKEN || '').trim();
  if (!baseUrl || !token) throw new Error('LOCAL_BUDGET_API_URL and LOCAL_BUDGET_API_TOKEN are required');
  return { baseUrl, token };
}

function unavailableLocalBudgetForecast(error) {
  return {
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
    error: error?.message || String(error || 'Local Budget actuals are unavailable'),
  };
}

function isCents(value) {
  return Number.isSafeInteger(value);
}

function hoursBetween(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return Math.max(0, ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60);
}

function plannerCardLaborCents(card) {
  if (card.costPerHourCents > 0) {
    return Math.round(card.costPerHourCents * hoursBetween(card.startTime, card.endTime));
  }
  if (card.costPerHour > 0) {
    return Math.round(card.costPerHour * hoursBetween(card.startTime, card.endTime) * 100);
  }
  if (card.costCents != null) return Number(card.costCents || 0);
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

async function squareForecast(keys, today, { excludedRecipients = [] } = {}) {
  const excludedRecipientSet = new Set(excludedRecipients.map((value) => String(value).trim().toLowerCase()).filter(Boolean));
  const empty = {
    status: 'unavailable',
    scheduledByMonth: {},
    recurringByMonth: {},
    scheduledOneOffByMonth: {},
    recurringMonthlyCents: 0,
    recurringSeriesCount: 0,
    scheduledOneOffCents: 0,
    scheduledInvoiceCount: 0,
    knownScheduledCents: 0,
    outstandingCents: 0,
    draftCents: 0,
    overlapExcludedCents: 0,
    ownerOverrideExcludedCents: 0,
    ownerOverrideRecipientCount: excludedRecipientSet.size,
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
    let ownerOverrideExcludedCents = 0;

    const rows = [];
    for (const invoice of invoices) {
      const cents = await invoiceAmountCents(client, invoice);
      const date = invoiceForecastDate(invoice);
      const recipient = invoice.primaryRecipient?.emailAddress
        || invoice.primaryRecipient?.companyName
        || invoice.primaryRecipient?.customerId
        || 'unknown';
      const normalizedRecipient = String(recipient).trim().toLowerCase();
      const seriesKey = `${recipient}|${String(invoice.title || '').trim().toLowerCase()}`;
      rows.push({ invoice, cents, date, seriesKey, normalizedRecipient });
    }

    const groups = new Map();
    for (const row of rows.filter(({ invoice, cents, date, normalizedRecipient }) => (
      invoice.status !== 'CANCELED'
      && cents > 0
      && date
      && !excludedRecipientSet.has(normalizedRecipient)
    ))) {
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

    for (const { invoice, cents, date, seriesKey, normalizedRecipient } of rows) {
      if (invoice.status === 'DRAFT') {
        draftCents += cents;
        continue;
      }
      if (invoice.status === 'UNPAID' || invoice.status === 'PARTIALLY_PAID') {
        outstandingCents += cents;
        continue;
      }
      if (invoice.status !== 'SCHEDULED' || !date || date < today || !Object.hasOwn(scheduledOneOffByMonth, date.slice(0, 7))) continue;
      if (excludedRecipientSet.has(normalizedRecipient)) {
        ownerOverrideExcludedCents += cents;
        continue;
      }
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
      scheduledOneOffByMonth,
      recurringMonthlyCents,
      recurringSeriesCount: recurringSeries.length,
      scheduledOneOffCents: knownScheduledCents,
      scheduledInvoiceCount,
      knownScheduledCents,
      outstandingCents,
      draftCents,
      overlapExcludedCents,
      ownerOverrideExcludedCents,
      ownerOverrideRecipientCount: excludedRecipientSet.size,
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

async function localBudgetCostForecast(keys, fetchImpl = fetch) {
  const [forecastYear, forecastMonth] = keys[0].split('-').map(Number);
  const baselineStart = new Date(Date.UTC(forecastYear, forecastMonth - 7, 1));
  const baselineEnd = new Date(Date.UTC(forecastYear, forecastMonth - 1, 1));
  const baselineMonths = monthKeys(6, baselineStart);

  try {
    const { baseUrl, token } = localBudgetApiConfig();
    const from = isoDate(baselineStart);
    const to = isoDate(baselineEnd);
    const url = new URL(`${baseUrl}/api/integration/v1/cashflow-actuals`);
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    url.searchParams.set('grain', 'month');
    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Local Budget API ${response.status}: ${body.slice(0, 300)}`);
    }
    const payload = await response.json();
    if (payload?.contractVersion !== 1 || payload?.methodVersion !== 'cashflow-actuals-v1' || payload?.currency !== 'USD') {
      throw new Error('Local Budget API returned an unsupported cashflow contract');
    }
    if (payload?.range?.from !== from || payload?.range?.toExclusive !== to || payload?.range?.completeMonthsOnly !== true) {
      throw new Error('Local Budget API returned a mismatched cashflow range');
    }

    const rowsByMonth = new Map((payload.months || []).map((row) => [row?.month, row]));
    const actualByMonth = {};
    for (const key of baselineMonths) {
      const row = rowsByMonth.get(key);
      if (!row || row.complete !== true || !isCents(row.inventoryCents) || !isCents(row.operatingCents) || !isCents(row.laborCents)) {
        throw new Error(`Local Budget API returned incomplete actuals for ${key}`);
      }
      actualByMonth[key] = {
        cogs: row.inventoryCents,
        operating: row.operatingCents,
        labor: row.laborCents,
      };
    }

    const averageCogsCents = average(baselineMonths.map((key) => actualByMonth[key].cogs));
    const averageOperatingCents = average(baselineMonths.map((key) => actualByMonth[key].operating));
    const averageLaborCents = average(baselineMonths.map((key) => actualByMonth[key].labor));

    return {
      status: 'ready',
      source: 'local_budget_api',
      cogsByMonth: Object.fromEntries(keys.map((key) => [key, averageCogsCents])),
      operatingByMonth: Object.fromEntries(keys.map((key) => [key, averageOperatingCents])),
      laborBaselineByMonth: Object.fromEntries(keys.map((key) => [key, averageLaborCents])),
      actualByMonth,
      averageCogsCents,
      averageOperatingCents,
      averageLaborCents,
      baselineMonths,
      lastEventAt: payload.sourceMaxDate || null,
      freshnessDays: daysOld(payload.sourceMaxDate),
      contractVersion: payload.contractVersion,
      methodVersion: payload.methodVersion,
      currency: payload.currency,
      generatedAt: payload.generatedAt || null,
      sourceMaxDate: payload.sourceMaxDate || null,
      quality: payload.quality || {},
      warnings: payload.quality?.warnings || [],
    };
  } catch (err) {
    return unavailableLocalBudgetForecast(err);
  }
}

function cardRevenueCents(card) {
  return card.revenueCents != null
    ? Number(card.revenueCents || 0)
    : Math.round(Number(card.revenue || 0) * 100);
}

function addBillingInterval(dateString, cadence) {
  const [year, month, day] = dateString.split('-').map(Number);
  const current = new Date(Date.UTC(year, month - 1, day));
  if (String(cadence).startsWith('weekly')) {
    current.setUTCDate(current.getUTCDate() + 7);
    return isoDate(current);
  }
  if (cadence === 'every_4_weeks') {
    current.setUTCDate(current.getUTCDate() + 28);
    return isoDate(current);
  }
  const nextMonthStart = new Date(Date.UTC(year, month, 1));
  const finalDay = new Date(Date.UTC(nextMonthStart.getUTCFullYear(), nextMonthStart.getUTCMonth() + 1, 0)).getUTCDate();
  if (cadence === 'monthly_month_end') {
    nextMonthStart.setUTCDate(finalDay);
    return isoDate(nextMonthStart);
  }
  nextMonthStart.setUTCDate(Math.min(day, finalDay));
  return isoDate(nextMonthStart);
}

function summarizePlannerCards(cards, keys, today) {
  const laborByMonth = Object.fromEntries(keys.map((key) => [key, 0]));
  const eventRevenueByMonth = Object.fromEntries(keys.map((key) => [key, 0]));
  const mealPrepBillingByMonth = Object.fromEntries(keys.map((key) => [key, 0]));
  const events = [];
  const unpricedEvents = [];
  const billingTemplates = new Map();
  let laborCardCount = 0;
  let eventContractValueCents = 0;
  let eventCashReceivedCents = 0;
  let eventBalanceCents = 0;
  let securedEventBalanceCents = 0;
  let plannedEventBalanceCents = 0;
  let excludedOperationalRevenueCents = 0;

  for (const card of cards) {
    const metadata = card.financialMetadata || {};
    if (!metadata.cashflowBillingOverride || !card.templateId || billingTemplates.has(card.templateId)) continue;
    billingTemplates.set(card.templateId, {
      templateId: card.templateId,
      name: metadata.billingCustomerName || card.title.replace(/^Meal prep\s*[—-]\s*/i, ''),
      billingAmountCents: Number(metadata.billingAmountCents || 0),
      billingCadence: metadata.billingCadence || null,
      nextBillingDate: metadata.nextBillingDate || null,
      billingStatus: metadata.billingStatus || 'active',
      squareRecipient: String(metadata.squareRecipient || '').trim().toLowerCase() || null,
      evidence: metadata.billingEvidence || null,
    });
  }

  const billingSeries = [];
  const pausedBillingSeries = [];
  const horizonEnd = endOfMonthIso(keys.at(-1));
  for (const series of billingTemplates.values()) {
    const target = series.billingStatus === 'active' ? billingSeries : pausedBillingSeries;
    target.push(series);
    if (series.billingStatus !== 'active' || series.billingAmountCents <= 0 || !series.nextBillingDate) continue;
    let billingDate = series.nextBillingDate;
    while (billingDate < today) billingDate = addBillingInterval(billingDate, series.billingCadence);
    while (billingDate <= horizonEnd) {
      const key = billingDate.slice(0, 7);
      if (Object.hasOwn(mealPrepBillingByMonth, key)) mealPrepBillingByMonth[key] += series.billingAmountCents;
      billingDate = addBillingInterval(billingDate, series.billingCadence);
    }
  }

  for (const card of cards) {
    const key = card.date.slice(0, 7);
    if (!Object.hasOwn(laborByMonth, key)) continue;
    if (card.enabled === false) continue;

    const laborCents = plannerCardLaborCents(card);
    laborByMonth[key] += laborCents;
    if (laborCents > 0) laborCardCount += 1;

    const revenueCents = cardRevenueCents(card);
    if (card.objectType !== 'event') {
      excludedOperationalRevenueCents += revenueCents;
      continue;
    }

    if (revenueCents <= 0) {
      const confirmed = card.status === 'confirmed'
        || /confirmed|booked/i.test(String(card.financialStatus || ''))
        || /confirmed|booked/i.test(String(card.notes || ''));
      if (card.date >= today && confirmed) unpricedEvents.push({ id: card.id, title: card.title, date: card.date });
      continue;
    }

    if (card.date < today) continue;

    const cashReceivedCents = Math.min(revenueCents, Math.max(0, Number(card.cashReceivedCents || 0)));
    const balanceCents = Math.max(0, revenueCents - cashReceivedCents);
    eventContractValueCents += revenueCents;
    eventCashReceivedCents += cashReceivedCents;
    eventBalanceCents += balanceCents;
    const secured = cashReceivedCents > 0
      || /booked|committed|confirmed/.test(String(card.financialStatus || card.status || '').toLowerCase());
    if (secured) securedEventBalanceCents += balanceCents;
    else plannedEventBalanceCents += balanceCents;

    const event = {
      id: card.id,
      title: card.title,
      date: card.date,
      revenueCents,
      cashReceivedCents,
      balanceCents,
      financialStatus: card.financialStatus || card.status || 'planned',
      secured,
      financialSource: card.financialSource || null,
      financialMetadata: card.financialMetadata || null,
    };
    events.push(event);

    if (!['canceled', 'cancelled'].includes(card.financialStatus)) {
      eventRevenueByMonth[key] += balanceCents;
    }
  }

  return {
    status: 'ready',
    laborByMonth,
    laborCardCount,
    eventRevenueByMonth,
    mealPrepBillingByMonth,
    billingSeries: billingSeries.sort((a, b) => a.name.localeCompare(b.name)),
    pausedBillingSeries: pausedBillingSeries.sort((a, b) => a.name.localeCompare(b.name)),
    squareOverrideRecipients: [...new Set([...billingSeries, ...pausedBillingSeries].map((series) => series.squareRecipient).filter(Boolean))],
    eventContractValueCents,
    eventCashReceivedCents,
    eventBalanceCents,
    securedEventBalanceCents,
    plannedEventBalanceCents,
    eventCount: events.length,
    events: events.sort((a, b) => a.date.localeCompare(b.date)),
    unpricedEventCount: unpricedEvents.length,
    unpricedEvents: unpricedEvents.sort((a, b) => a.date.localeCompare(b.date)),
    excludedOperationalRevenueCents,
  };
}

async function plannerForecast(prisma, plannerUid, keys, today) {
  const cards = await prisma.plannerCard.findMany({
    where: {
      supabaseUid: plannerUid,
      date: { gte: `${keys[0]}-01`, lte: endOfMonthIso(keys.at(-1)) },
    },
    select: {
      date: true,
      id: true,
      title: true,
      templateId: true,
      enabled: true,
      objectType: true,
      revenue: true,
      revenueCents: true,
      cashReceivedCents: true,
      financialStatus: true,
      financialSource: true,
      financialMetadata: true,
      notes: true,
      status: true,
      cost: true,
      costCents: true,
      costPerHour: true,
      costPerHourCents: true,
      startTime: true,
      endTime: true,
    },
  });

  return summarizePlannerCards(cards, keys, today);
}

async function buildPlannerForecast({ prisma, plannerUid, now = new Date() }) {
  const keys = monthKeys(6, now);
  const today = isoDate(now);
  const planner = await plannerForecast(prisma, plannerUid, keys, today);
  const [square, happyMonday, localBudget] = await Promise.all([
    squareForecast(keys, today, { excludedRecipients: planner.squareOverrideRecipients }),
    happyMondayForecast(keys, today),
    localBudgetCostForecast(keys),
  ]);

  const months = keys.map((key) => {
    const recurringSquareRevenueCents = square.recurringByMonth[key] || 0;
    const scheduledSquareRevenueCents = square.scheduledOneOffByMonth[key] || 0;
    const squareRevenueCents = recurringSquareRevenueCents + scheduledSquareRevenueCents;
    const happyMondayRevenueCents = happyMonday.forecastByMonth[key] || 0;
    const plannerEventRevenueCents = planner.eventRevenueByMonth[key] || 0;
    const mealPrepRevenueCents = planner.mealPrepBillingByMonth[key] || 0;
    const cogsCents = localBudget.cogsByMonth[key] || 0;
    const operatingCents = localBudget.operatingByMonth[key] || 0;
    const scheduledLaborCents = planner.laborByMonth[key] || 0;
    const laborBaselineCents = localBudget.laborBaselineByMonth[key] || 0;
    const laborCents = localBudget.status === 'ready'
      ? Math.max(scheduledLaborCents, laborBaselineCents)
      : scheduledLaborCents;
    const revenueCents = squareRevenueCents + happyMondayRevenueCents + plannerEventRevenueCents + mealPrepRevenueCents;
    const costsAvailable = localBudget.status === 'ready';
    const costCents = costsAvailable ? cogsCents + operatingCents + laborCents : null;
    return {
      month: key,
      revenueCents,
      squareRevenueCents,
      recurringSquareRevenueCents,
      scheduledSquareRevenueCents,
      happyMondayRevenueCents,
      plannerEventRevenueCents,
      mealPrepRevenueCents,
      cogsCents,
      operatingCents,
      laborCents,
      scheduledLaborCents,
      laborBaselineCents,
      costsAvailable,
      costCents,
      netCents: costsAvailable ? revenueCents - costCents : null,
    };
  });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    currency: 'USD',
    methodology: 'Expected cash in combines non-meal-prep Square invoices, owner-confirmed meal-prep billing schedules, committed Happy Monday orders, and unpaid balances on dated planner events. Owner-confirmed meal-prep schedules override matching Square invoice projections so stale recurring invoices are not counted. Event deposits already received are excluded from future cash. Costs use six complete Local Budget months; labor uses the higher of that actual baseline or scheduled planner labor. Net is withheld when Local Budget costs are unavailable.',
    months,
    sources: {
      square,
      happyMonday,
      localBudget,
      planner,
    },
  };
}

module.exports = {
  buildPlannerForecast,
  __internals: {
    localBudgetCostForecast,
    localBudgetApiConfig,
    unavailableLocalBudgetForecast,
    summarizePlannerCards,
  },
};
