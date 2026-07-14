import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalUrl = process.env.LOCAL_BUDGET_API_URL;
const originalToken = process.env.LOCAL_BUDGET_API_TOKEN;
let localBudgetCostForecast;

beforeEach(async () => {
  ({ __internals: { localBudgetCostForecast } } = await import('../forecast'));
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