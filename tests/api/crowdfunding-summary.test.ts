import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore } from '../support/fakeFirestore';

vi.mock('../../packages/lib/firebaseAdmin', () => {
  let currentDb: FakeFirestore | null = null;
  return {
    get db() {
      return currentDb;
    },
    __setDb(value: FakeFirestore | null) {
      currentDb = value;
    },
  };
});

describe('crowdfunding summary api', () => {
  let app: express.Express;
  let handler: (req: express.Request, res: express.Response) => Promise<void>;
  let fakeDb: FakeFirestore;

  beforeEach(async () => {
    vi.resetModules();

    fakeDb = new FakeFirestore();
    const firebaseAdmin = await import('../../packages/lib/firebaseAdmin');
    firebaseAdmin.__setDb(fakeDb);

    const module = await import('../../api-handlers/crowdfunding/summary');
    handler = module.default;

    app = express();
    app.all('/api/crowdfunding/summary', (req, res) => {
      handler(req, res);
    });
  });

  afterEach(async () => {
    const firebaseAdmin = await import('../../packages/lib/firebaseAdmin');
    firebaseAdmin.__setDb(null);
    vi.resetModules();
  });

  it('returns the aggregate crowdfunding totals and disables caching', async () => {
    const updatedAt = new Date('2024-02-01T12:00:00Z');
    const aggRef = fakeDb.collection('aggregates').doc('crowdfunding');
    aggRef.set({ pizzas: 42, backers: 17, goal: 500, updatedAt });
    aggRef.set({ pizzas: 42, backers: 17, updatedAt });

    const res = await request(app).get('/api/crowdfunding/summary');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({
      pizzas: 42,
      backers: 17,
      goal: 500,
      updatedAt: updatedAt.toISOString(),
    });
  });

  it('coerces missing aggregate data to defaults', async () => {
    const res = await request(app).get('/api/crowdfunding/summary');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pizzas: 0, backers: 0, goal: null, updatedAt: null });
  });

  it('falls back to the legacy crowdfund/status document when aggregates are missing', async () => {
    const statusRef = fakeDb.collection('crowdfund').doc('status');
    statusRef.set({
      pizzasSold: 87,
      goal: 900,
      funders: [
        { name: 'A', date: '2024-02-10T15:00:00Z' },
        { name: 'B', date: '2024-02-10T16:00:00Z' },
      ],
    });

    const res = await request(app).get('/api/crowdfunding/summary');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      pizzas: 87,
      backers: 2,
      goal: 900,
      updatedAt: '2024-02-10T16:00:00.000Z',
    });
    expect(res.body).toEqual({ pizzas: 0, backers: 0, updatedAt: null });
  });

  it('rejects non-GET methods', async () => {
    const res = await request(app).post('/api/crowdfunding/summary');

    expect(res.status).toBe(405);
    expect(res.body).toEqual({ ok: false, error: 'method-not-allowed' });
  });
});

