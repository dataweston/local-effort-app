import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { createCrowdfundingRouter } from '../crowdfunding';

describe('crowdfunding router', () => {
  const createApp = (overrides = {}) => {
    const router = createCrowdfundingRouter({
      db: overrides.db || null,
      squareClient: overrides.squareClient || null,
      logger: overrides.logger || { error: vi.fn(), warn: vi.fn() },
    });
    const app = express();
    app.use(express.json());
    app.use('/crowdfund', router);
    return app;
  };

  it('returns fallback status when the database is unavailable', async () => {
    const warn = vi.fn();
    const app = createApp({ logger: { warn, error: vi.fn() } });

    const res = await request(app).get('/crowdfund/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      goal: 1000,
      pizzasSold: 0,
      funders: [],
      source: 'fallback',
    });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('rejects empty carts', async () => {
    const app = createApp();
    const res = await request(app).post('/crowdfund/contribute').send({ items: [] });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Cart is empty.' });
  });

  it('creates a payment link via Square', async () => {
    const createPaymentLink = vi.fn().mockResolvedValue({
      result: { paymentLink: { url: 'https://square.test/link' } },
    });
    const squareClient = { checkoutApi: { createPaymentLink } };
    const app = createApp({ squareClient });

    const res = await request(app)
      .post('/crowdfund/contribute')
      .send({ items: [{ name: 'Pizza', price: 10, quantity: 2 }] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ url: 'https://square.test/link' });
    expect(createPaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({
          lineItems: [
            expect.objectContaining({ name: 'Pizza', quantity: '2' }),
          ],
        }),
      })
    );
  });

  it('creates the crowdfund status document if missing during confirm-payment', async () => {
    let stored = null;
    const docRef = {
      get: vi.fn(async () => {
        if (!stored) return { exists: false, data: () => ({}) };
        return { exists: true, data: () => stored };
      }),
    };
    const db = {
      collection: () => ({
        doc: () => docRef,
      }),
      runTransaction: async (fn) => {
        await fn({
          get: async () => (!stored ? { exists: false, data: () => ({}) } : { exists: true, data: () => stored }),
          update: (_, data) => {
            stored = { ...(stored || {}), ...data };
          },
          set: (_, data) => {
            stored = data;
          },
        });
      },
    };

    const app = createApp({ db });
    const res = await request(app)
      .post('/crowdfund/confirm-payment')
      .send({ items: [{ type: 'pizza', pizzaCount: 2 }], funderName: 'Tester' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, newTotal: 2 });
    expect(stored?.pizzasSold).toBe(2);
    expect(stored?.funders).toHaveLength(1);
    expect(stored?.funders?.[0]?.name).toBe('Tester');
  });

  it('stores and retrieves pizza feedback entries', async () => {
    const stored = [];
    const feedbackCollection = {
      add: vi.fn(async (data) => {
        const entry = { ...data, id: `doc-${stored.length + 1}` };
        stored.push(entry);
        return { id: entry.id };
      }),
      orderBy: vi.fn(() => ({
        limit: (limitVal) => ({
          get: async () => ({
            docs: stored
              .slice()
              .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
              .slice(0, limitVal)
              .map((item) => ({ id: item.id, data: () => ({ ...item }) })),
          }),
        }),
      })),
    };

    const db = {
      collection: (name) => {
        if (name === 'crowdfund_feedback') {
          return feedbackCollection;
        }
        return {
          doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }) }),
        };
      },
    };

    const app = createApp({ db });

    const postRes = await request(app)
      .post('/crowdfund/pizza-feedback')
      .send({ name: 'Casey', message: 'Loved the basil and char.', rating: 5 });

    expect(postRes.status).toBe(200);
    expect(postRes.body.entry).toMatchObject({
      name: 'Casey',
      comment: 'Loved the basil and char.',
      rating: 5,
    });
    expect(feedbackCollection.add).toHaveBeenCalledTimes(1);

    const getRes = await request(app).get('/crowdfund/pizza-feedback?limit=5');
    expect(getRes.status).toBe(200);
    expect(getRes.body.entries).toHaveLength(1);
    expect(getRes.body.entries[0]).toMatchObject({
      name: 'Casey',
      comment: 'Loved the basil and char.',
    });
    expect(feedbackCollection.orderBy).toHaveBeenCalledWith('createdAtMs', 'desc');
  });

  it('rejects pizza feedback submissions without a message', async () => {
    const feedbackCollection = {
      add: vi.fn(),
      orderBy: vi.fn(() => ({
        limit: () => ({ get: async () => ({ docs: [] }) }),
      })),
    };

    const db = {
      collection: (name) => {
        if (name === 'crowdfund_feedback') return feedbackCollection;
        return {
          doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }) }),
        };
      },
    };

    const app = createApp({ db });
    const res = await request(app).post('/crowdfund/pizza-feedback').send({ name: 'Casey' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(feedbackCollection.add).not.toHaveBeenCalled();
  });
});
