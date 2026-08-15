import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalUrl = process.env.LOCAL_BUDGET_API_URL;
const originalToken = process.env.LOCAL_BUDGET_API_TOKEN;
let localBudgetCostForecast;
let summarizePlannerCards;
let isLiveRecurringSeries;

beforeEach(async () => {
  ({ __internals: { localBudgetCostForecast, summarizePlannerCards, isLiveRecurringSeries } } = await import('../forecast'));
});

function cashflowPayload(months) {
  return {
    contractVersion: 1,
    methodVersion: 'cashflow-actuals-v1',
    currency: 'USD',
    generatedAt: '2026-07-14T18:00:00.000Z',
    sourceMaxDate: '2026-07-12',
    range: { from: '2026-01-01', toExclusive: '2026-07-01', completeMonthsOnly: true },
    months,
    quality: {
      unclassifiedTransactionCount: 2,
      unclassifiedCents: 500,
      splitMismatchCount: 1,
      pendingTransactionCount: 3,
      latestBankSyncAt: '2026-07-14T17:30:00.000Z',
      warnings: ['One split requires review'],
    },
  };
}

afterEach(() => {
  if (originalUrl === undefined) delete process.env.LOCAL_BUDGET_API_URL;
  else process.env.LOCAL_BUDGET_API_URL = originalUrl;
  if (originalToken === undefined) delete process.env.LOCAL_BUDGET_API_TOKEN;
  else process.env.LOCAL_BUDGET_API_TOKEN = originalToken;
});

describe('Local Budget forecast actuals', () => {
  it('uses the complete-month API baseline and preserves quality metadata', async () => {
    process.env.LOCAL_BUDGET_API_URL = 'https://budget.example/';
    process.env.LOCAL_BUDGET_API_TOKEN = 'budget-token';
    const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'].map((month, index) => ({
      month,
      inventoryCents: (index + 1) * 100,
      operatingCents: (index + 1) * 200,
      laborCents: (index + 1) * 300,
      complete: true,
    }));
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => cashflowPayload(months) });

    const result = await localBudgetCostForecast(['2026-07', '2026-08'], fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'https://budget.example/api/integration/v1/cashflow-actuals?from=2026-01-01&to=2026-07-01&grain=month' }),
      { headers: { Authorization: 'Bearer budget-token', Accept: 'application/json' } },
    );
    expect(result).toMatchObject({
      status: 'ready',
      source: 'local_budget_api',
      averageCogsCents: 350,
      averageOperatingCents: 700,
      averageLaborCents: 1050,
      baselineMonths: months.map((month) => month.month),
      lastEventAt: '2026-07-12',
      quality: { unclassifiedCents: 500, splitMismatchCount: 1 },
      warnings: ['One split requires review'],
    });
    expect(result.actualByMonth['2026-01']).toEqual({ cogs: 100, operating: 200, labor: 300 });
    expect(result.cogsByMonth).toEqual({ '2026-07': 350, '2026-08': 350 });
  });

  it('rejects missing or partial actuals without a fallback source', async () => {
    process.env.LOCAL_BUDGET_API_URL = 'https://budget.example';
    process.env.LOCAL_BUDGET_API_TOKEN = 'budget-token';
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => cashflowPayload([{ month: '2026-01', inventoryCents: 100, operatingCents: 200, laborCents: 300, complete: false }]),
    });

    const result = await localBudgetCostForecast(['2026-07'], fetchImpl);

    expect(result).toMatchObject({ status: 'unavailable', baselineMonths: [] });
    expect(result).not.toHaveProperty('source');
    expect(result.error).toContain('incomplete actuals');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('planner event cash forecast', () => {
  it('forecasts only unpaid event balances and keeps deposits out of future cash', () => {
    const keys = ['2026-09', '2026-10'];
    const result = summarizePlannerCards([
      {
        id: 'gigi', title: 'Gigi baby shower', date: '2026-09-26', objectType: 'event',
        revenueCents: 175000, cashReceivedCents: 25000, financialStatus: 'booked_deposit_received_estimate',
      },
      {
        id: 'laura', title: 'Laura wedding', date: '2026-10-10', objectType: 'event',
        revenueCents: 300000, cashReceivedCents: 41500, financialStatus: 'booked_deposit_received_estimate',
      },
      {
        id: 'meal-prep', title: 'Weekly meal prep', date: '2026-09-02', objectType: 'prep_task',
        revenueCents: 38100, cashReceivedCents: 0, financialStatus: 'forecast',
      },
    ], keys, '2026-08-15');

    expect(result).toMatchObject({
      eventContractValueCents: 475000,
      eventCashReceivedCents: 66500,
      eventBalanceCents: 408500,
      securedEventBalanceCents: 408500,
      plannedEventBalanceCents: 0,
      excludedOperationalRevenueCents: 38100,
      eventRevenueByMonth: { '2026-09': 150000, '2026-10': 258500 },
      eventCount: 2,
      unpricedEventCount: 0,
    });
  });

  it('uses canonical meal-prep billing dates and excludes paused schedules', () => {
    const billingCard = (templateId, name, metadata, enabled = true) => ({
      id: templateId,
      templateId,
      title: `Meal prep — ${name}`,
      date: '2026-08-20',
      objectType: 'prep_task',
      revenueCents: 10000,
      enabled,
      financialMetadata: { cashflowBillingOverride: true, billingCustomerName: name, ...metadata },
    });
    const result = summarizePlannerCards([
      billingCard('samantha', 'Samantha Bailey', { billingAmountCents: 11000, billingCadence: 'weekly_saturday', nextBillingDate: '2026-08-22', billingStatus: 'active', squareRecipient: 'sam@example.com' }),
      billingCard('sanjay', 'Sanjay', { billingAmountCents: 51200, billingCadence: 'monthly', nextBillingDate: '2026-09-05', billingStatus: 'active', squareRecipient: 'sanjay@example.com' }),
      billingCard('gabriella', 'Gabriella Scarpa', { billingAmountCents: 140500, billingCadence: 'monthly_month_end', nextBillingDate: '2026-08-31', billingStatus: 'active', squareRecipient: 'gabriella@example.com' }),
      billingCard('david', 'David and Allison', { billingAmountCents: 106800, billingCadence: 'monthly', nextBillingDate: '2026-09-10', billingStatus: 'active', squareRecipient: 'david@example.com' }),
      billingCard('catherine', 'Catherine Squires', { billingAmountCents: 12000, billingCadence: 'weekly_monday', nextBillingDate: null, billingStatus: 'paused_pending_confirmation', squareRecipient: 'catherine@example.com' }, false),
    ], ['2026-08', '2026-09', '2026-10'], '2026-08-15');

    expect(result.mealPrepBillingByMonth).toEqual({
      '2026-08': 162500,
      '2026-09': 342500,
      '2026-10': 353500,
    });
    expect(result.billingSeries).toHaveLength(4);
    expect(result.pausedBillingSeries).toHaveLength(1);
    expect(result.squareOverrideRecipients).toHaveLength(5);
  });

  it('flags unpriced events without inventing revenue', () => {
    const result = summarizePlannerCards([
      { id: 'tbd', title: 'Unpriced event', date: '2026-09-20', objectType: 'event', revenue: 0, notes: 'Confirmed date.' },
      { id: 'milestone', title: 'RFP selection', date: '2026-09-21', objectType: 'event', revenue: 0, notes: 'Expected, not guaranteed.' },
    ], ['2026-09'], '2026-08-15');

    expect(result.eventRevenueByMonth['2026-09']).toBe(0);
    expect(result.unpricedEvents).toEqual([{ id: 'tbd', title: 'Unpriced event', date: '2026-09-20' }]);
  });
});

describe('Happy Monday weekly billing forecast', () => {
  const sundayCard = (date, revenueCents, enabled = true) => ({
    id: `hm-${date}`,
    templateId: 'happy-monday-weekly-billing',
    title: 'Happy Monday — weekly billing forecast',
    date,
    objectType: 'prep_task',
    revenueCents,
    enabled,
    financialMetadata: { happyMondayWeeklyForecast: true, weeklyAverageCents: revenueCents },
  });

  it('collects future Sunday run-rate cards by week and keeps them out of excluded operational revenue', () => {
    const result = summarizePlannerCards([
      sundayCard('2026-08-09', 38282),
      sundayCard('2026-08-16', 38282),
      sundayCard('2026-08-23', 38282, false),
      sundayCard('2026-08-30', 38282),
    ], ['2026-08', '2026-09'], '2026-08-15');

    expect(result.happyMondayPlannedByWeek).toEqual({ '2026-08-16': 38282, '2026-08-30': 38282 });
    expect(result.excludedOperationalRevenueCents).toBe(0);
  });
});

describe('Square recurring series liveness', () => {
  const series = (cadenceDays, items) => ({
    cadenceDays,
    items,
    latest: items[items.length - 1],
  });
  const item = (date, status) => ({ date, invoice: { status } });

  it('keeps series with a future open invoice', () => {
    expect(isLiveRecurringSeries(series(28, [
      item('2026-08-09', 'PAID'),
      item('2026-09-10', 'SCHEDULED'),
    ]), '2026-08-15')).toBe(true);
  });

  it('keeps a paid series still inside one cadence plus grace', () => {
    expect(isLiveRecurringSeries(series(28, [
      item('2026-06-20', 'PAID'),
      item('2026-07-18', 'PAID'),
    ]), '2026-08-15')).toBe(true);
  });

  it('drops churned series whose newest invoice is older than one cadence plus grace', () => {
    expect(isLiveRecurringSeries(series(28, [
      item('2026-05-11', 'PAID'),
      item('2026-06-08', 'PARTIALLY_REFUNDED'),
    ]), '2026-08-15')).toBe(false);
  });

  it('drops series whose newest invoice was refunded', () => {
    expect(isLiveRecurringSeries(series(28, [
      item('2026-07-05', 'PAID'),
      item('2026-08-02', 'REFUNDED'),
    ]), '2026-08-15')).toBe(false);
  });
});
