import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { createCrowdfundingRouter } from '../crowdfunding';

describe('crowdfunding router', () => {
  const createApp = (overrides = {}) => {
    const router = createCrowdfundingRouter({
      db: overrides.db || null,
      squareClient: overrides.squareClient || null,
      logger: overrides.logger || { error: vi.fn() },
    });
    const app = express();
    app.use(express.json());
    app.use('/crowdfund', router);
    return app;
  };

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
});
