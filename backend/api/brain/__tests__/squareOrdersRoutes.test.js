import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import squareOrdersModule from '../squareOrdersSync';

const { registerSquareOrdersRoutes } = squareOrdersModule;

function buildApp(overrides = {}) {
  const app = express();
  app.use(express.json());
  registerSquareOrdersRoutes(app, {
    verifyAdminRequest: async () => null,
    ...overrides,
  });
  return app;
}

describe('Square order sync route', () => {
  it('refuses an unauthenticated trigger before touching Square', async () => {
    const runSquareOrdersSync = vi.fn();
    const response = await request(buildApp({ runSquareOrdersSync }))
      .post('/api/brain/square-orders/sync')
      .send({ daysBack: 30 });

    expect(response.status).toBe(403);
    expect(runSquareOrdersSync).not.toHaveBeenCalled();
  });

  it('waits for ingestion and returns measured completion', async () => {
    const runSquareOrdersSync = vi.fn().mockResolvedValue({
      fetched: 14,
      written: 12,
      skipped: 2,
      errors: 0,
    });
    const withJobRun = vi.fn(async (_jobName, operation) => operation());

    const response = await request(buildApp({ runSquareOrdersSync, withJobRun }))
      .get('/api/brain/square-orders/sync?daysBack=90')
      .set('x-vercel-cron', '1');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      status: 'completed',
      daysBack: 90,
      fetched: 14,
      written: 12,
    });
    expect(response.body).not.toHaveProperty('started');
    expect(runSquareOrdersSync).toHaveBeenCalledWith(expect.objectContaining({ daysBack: 90 }));
    expect(withJobRun).toHaveBeenCalledOnce();
  });
});
