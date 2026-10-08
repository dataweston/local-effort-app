import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createFoodOpsRouter } from '../foodOps';

function createApp({ authorized = true, prismaClient = {}, localBudgetClient } = {}) {
  const app = express();
  app.use(express.json());
  app.use('/api/food-ops', createFoodOpsRouter({
    prismaClient,
    ...(localBudgetClient ? { localBudgetClient } : {}),
    verifyAdminRequest: vi.fn().mockResolvedValue(authorized ? { id: 'admin-1', email: 'owner@example.com' } : null),
  }));
  return app;
}

describe('food ops routes', () => {
  it('requires admin authentication on reads and writes', async () => {
    const app = createApp({ authorized: false });
    expect((await request(app).get('/api/food-ops/stock-products')).status).toBe(401);
    expect((await request(app).post('/api/food-ops/price-book').send({ data: {} })).status).toBe(401);
    expect((await request(app).get('/api/food-ops/production/c1/requirements')).status).toBe(401);
  });

  it('rejects a malformed price book with 400 and writes nothing', async () => {
    const app = createApp();
    const response = await request(app).post('/api/food-ops/price-book').send({ apply: true, data: { stockProducts: [{ key: 'Bad Key!' }] } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('food-ops-request-invalid');
  });

  it('previews a price book by default and does not apply', async () => {
    const prismaClient = {
      stockProduct: { findMany: vi.fn().mockResolvedValue([]) },
      vendorItem: { findMany: vi.fn().mockResolvedValue([]) },
      costObservation: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(),
    };
    const app = createApp({ prismaClient });
    const response = await request(app).post('/api/food-ops/price-book').send({
      data: { stockProducts: [{ key: 'flour', name: 'Flour', dimension: 'mass' }] },
    });
    expect(response.status).toBe(200);
    expect(response.body.applied).toBe(false);
    expect(response.body.plan.stockProducts.create).toBe(1);
    expect(prismaClient.$transaction).not.toHaveBeenCalled();
  });

  it('returns 404 when no production batch exists', async () => {
    const prismaClient = { mealPrepProductionBatch: { findFirst: vi.fn().mockResolvedValue(null) } };
    const response = await request(createApp({ prismaClient })).get('/api/food-ops/production/c1/requirements');
    expect(response.status).toBe(404);
  });

  describe('receipt scope', () => {
    const observation = (overrides) => ({
      id: 'o0',
      vendorItemId: 'v0',
      source: 'receipt_wedge',
      sourceKey: 'gmail:abc:0',
      observedAt: new Date('2026-05-02T00:00:00.000Z'),
      packCostCents: 500,
      quantity: null,
      lineTotalCents: null,
      scope: null,
      scopeSource: null,
      vendorItem: { vendorName: 'Test Co-op', description: 'Milk', defaultScope: null },
      ...overrides,
    });

    it('requires admin authentication on the scope routes', async () => {
      const app = createApp({ authorized: false });
      expect((await request(app).get('/api/food-ops/receipts')).status).toBe(401);
      expect((await request(app).post('/api/food-ops/receipts/scope').send({})).status).toBe(401);
      expect((await request(app).post('/api/food-ops/receipts/accept-suggestions').send({})).status).toBe(401);
      expect((await request(app).post('/api/food-ops/vendor-items/v0/default-scope').send({ scope: 'business' })).status).toBe(401);
    });

    it('lists receipts with effective scope and totals', async () => {
      const prismaClient = {
        costObservation: {
          findMany: vi.fn().mockResolvedValue([observation({ scope: 'business', scopeSource: 'owner' }), observation({ id: 'o1', sourceKey: 'gmail:abc:1', packCostCents: 250 })]),
          groupBy: vi.fn().mockResolvedValue([]),
        },
      };
      const response = await request(createApp({ prismaClient })).get('/api/food-ops/receipts?source=receipt_wedge&scope=unassigned');
      expect(response.status).toBe(200);
      expect(response.body.receipts).toHaveLength(1);
      expect(response.body.receipts[0]).toMatchObject({ receiptKey: 'gmail:abc', date: '2026-05-02', vendor: 'Test Co-op', totalCents: 750, lineCount: 2, status: 'partial' });
      expect(response.body.receipts[0].lines.map((line) => line.scope)).toEqual(['business', null]);
      expect(response.body.totals).toMatchObject({ businessCents: 500, unassignedCents: 250 });
    });

    it('rejects an invalid filter with 400', async () => {
      const response = await request(createApp()).get('/api/food-ops/receipts?scope=everything');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('food-ops-request-invalid');
    });

    it('records a receipt decision and returns the refreshed receipt', async () => {
      const rows = [observation(), observation({ id: 'o1', sourceKey: 'gmail:abc:1' })];
      const prismaClient = {
        costObservation: {
          findMany: vi.fn().mockResolvedValue(rows),
          groupBy: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        $transaction: vi.fn().mockResolvedValue([]),
      };
      const response = await request(createApp({ prismaClient })).post('/api/food-ops/receipts/scope').send({ source: 'receipt_wedge', receiptKey: 'gmail:abc', scope: 'personal' });
      expect(response.status).toBe(200);
      expect(response.body.result).toMatchObject({ updated: 2, receiptKey: 'gmail:abc' });
      expect(prismaClient.costObservation.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['o0', 'o1'] } },
        data: expect.objectContaining({ scope: 'personal', scopeSource: 'owner' }),
      });
    });

    it('answers 422 for a line outside the receipt and 404 for an unknown receipt', async () => {
      const prismaClient = { costObservation: { findMany: vi.fn().mockResolvedValue([observation()]), groupBy: vi.fn().mockResolvedValue([]), updateMany: vi.fn() }, $transaction: vi.fn() };
      const app = createApp({ prismaClient });
      const foreign = await request(app).post('/api/food-ops/receipts/scope').send({ source: 'receipt_wedge', receiptKey: 'gmail:abc', lines: [{ observationId: 'other', scope: 'business' }] });
      expect(foreign.status).toBe(422);
      prismaClient.costObservation.findMany.mockResolvedValue([]);
      const missing = await request(app).post('/api/food-ops/receipts/scope').send({ source: 'receipt_wedge', receiptKey: 'gmail:none', scope: 'business' });
      expect(missing.status).toBe(404);
      expect(prismaClient.costObservation.updateMany).not.toHaveBeenCalled();
    });

    it('accepts suggestions for one receipt and returns it refreshed, touching only unassigned rows', async () => {
      const decided = observation({ id: 'o0', scope: 'personal', scopeSource: 'owner' });
      const open = observation({ id: 'o1', sourceKey: 'gmail:abc:1' });
      const prismaClient = {
        costObservation: {
          findMany: vi.fn().mockResolvedValue([decided, open]),
          groupBy: vi.fn().mockResolvedValue([{ vendorItemId: 'v0', scope: 'business', _count: { _all: 3 } }]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      const response = await request(createApp({ prismaClient })).post('/api/food-ops/receipts/accept-suggestions').send({ source: 'receipt_wedge', receiptKey: 'gmail:abc' });
      expect(response.status).toBe(200);
      expect(response.body.result).toEqual({ accepted: 1, business: 1, personal: 0 });
      expect(prismaClient.costObservation.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['o1'] }, scope: null },
        data: expect.objectContaining({ scope: 'business', scopeSource: 'rule' }),
      });
      expect(response.body.receipt.receiptKey).toBe('gmail:abc');
    });

    it('sets a default scope and validates it', async () => {
      const prismaClient = {
        vendorItem: {
          findUnique: vi.fn().mockResolvedValue({ id: 'v0' }),
          update: vi.fn().mockResolvedValue({ id: 'v0', description: 'Milk', defaultScope: 'business' }),
        },
      };
      const app = createApp({ prismaClient });
      const ok = await request(app).post('/api/food-ops/vendor-items/v0/default-scope').send({ scope: 'business' });
      expect(ok.status).toBe(200);
      expect(ok.body.vendorItem.defaultScope).toBe('business');
      expect(prismaClient.vendorItem.update).toHaveBeenCalledWith(expect.objectContaining({ data: { defaultScope: 'business' } }));
      expect((await request(app).post('/api/food-ops/vendor-items/v0/default-scope').send({ scope: 'sometimes' })).status).toBe(400);
    });
  });

  describe('usage analytics', () => {
    const observation = (id, date, total) => ({
      source: 'vendor_invoice',
      sourceKey: `inv|${date}|${id}`,
      observedAt: new Date(`${date}T15:00:00.000Z`),
      packCostCents: total,
      quantity: 1,
      lineTotalCents: total,
      scope: 'business',
      vendorItem: {
        vendorKey: 'acme',
        vendorName: 'Acme',
        description: 'Flour',
        status: 'mapped',
        packBaseQuantity: 1000,
        packDimension: 'mass',
        defaultScope: null,
        stockProduct: { key: 'flour-ap', name: 'Flour', dimension: 'mass', aliases: [] },
      },
    });
    const prismaClient = () => ({
      costObservation: { findMany: vi.fn().mockResolvedValue([observation('1', '2026-01-04', 7000), observation('2', '2026-01-18', 500), observation('3', '2026-02-01', 500)]) },
      commercialOrder: { findMany: vi.fn().mockResolvedValue([]) },
    });

    it('requires admin authentication', async () => {
      const app = createApp({ authorized: false });
      expect((await request(app).get('/api/food-ops/usage/intervals')).status).toBe(401);
    });

    it('returns intervals, spend and coverage reads without writing anything', async () => {
      const client = prismaClient();
      const localBudgetClient = {
        fetchCashflowMonths: vi.fn().mockResolvedValue({
          months: [{ month: '2026-01', complete: true, incomeCents: 100000, inventoryCents: 10000, unclassifiedCents: 0 }],
        }),
      };
      const app = createApp({ prismaClient: client, localBudgetClient });
      const intervals = await request(app).get('/api/food-ops/usage/intervals?stock=flour-ap');
      expect(intervals.status).toBe(200);
      expect(intervals.body.stocks[0]).toMatchObject({ stockKey: 'flour-ap', purchases: 3, status: 'ok' });
      const spend = await request(app).get('/api/food-ops/usage/spend?by=month');
      expect(spend.body.buckets.map((b) => [b.key, b.spendCents])).toEqual([['2026-01', 7500], ['2026-02', 500]]);
      const coverage = await request(app).get('/api/food-ops/usage/coverage?minCoverage=0.5');
      expect(coverage.body.months[0]).toMatchObject({ month: '2026-01', status: 'ok' });
    });

    it('rejects unknown reports and bad parameters with 400', async () => {
      const app = createApp({ prismaClient: prismaClient() });
      expect((await request(app).get('/api/food-ops/usage/nope')).status).toBe(400);
      expect((await request(app).get('/api/food-ops/usage/spend?scope=everything')).status).toBe(400);
    });
  });
});
