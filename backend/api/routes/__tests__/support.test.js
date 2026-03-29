import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createSupportRouter } from '../support';

function createApp(overrides = {}) {
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
  const app = express();
  app.use(express.json());
  app.use('/api', createSupportRouter({ logger, ...overrides }));
  return { app, logger };
}

describe('support router', () => {
  it('returns search results from the support service', async () => {
    const searchSupportFn = vi.fn().mockResolvedValue({ cached: false, results: [{ id: '1' }] });
    const { app } = createApp({ searchSupportFn });

    const res = await request(app).get('/api/support/search?q=meal%20prep');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cached: false, results: [{ id: '1' }] });
    expect(searchSupportFn).toHaveBeenCalledWith('meal prep');
  });

  it('rejects missing support search queries', async () => {
    const { app } = createApp();

    const res = await request(app).get('/api/support/search');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('missing q');
  });

  it('runs support ingest when authorized', async () => {
    const supportIngestService = {
      authorize: vi.fn().mockReturnValue(true),
      runIngest: vi.fn().mockResolvedValue({ faqs: 2, pages: 1, localDocs: 3 }),
    };
    const { app } = createApp({ supportIngestService });

    const res = await request(app)
      .post('/api/support/sync')
      .set('X-Admin-Token', 'secret')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, faqs: 2, pages: 1, localDocs: 3 });
    expect(supportIngestService.authorize).toHaveBeenCalledTimes(1);
    expect(supportIngestService.runIngest).toHaveBeenCalledTimes(1);
  });

  it('rejects unauthorized ingest requests', async () => {
    const supportIngestService = {
      authorize: vi.fn().mockReturnValue(false),
      runIngest: vi.fn(),
    };
    const { app } = createApp({ supportIngestService });

    const res = await request(app).post('/api/support/webhook').send({});

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
    expect(supportIngestService.runIngest).not.toHaveBeenCalled();
  });
});
