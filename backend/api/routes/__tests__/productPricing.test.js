import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createProductPricingRouter } from '../productPricing';

function createApp({ authorized = true } = {}) {
  const quoteService = {
    createMealPrepQuote: vi.fn().mockResolvedValue({ id: 'quote-1', currentRevisionNumber: 1 }),
    reviseMealPrepQuote: vi.fn().mockResolvedValue({ id: 'quote-1', currentRevisionNumber: 2 }),
  };
  const app = express();
  app.use(express.json());
  app.use('/api/product-pricing', createProductPricingRouter({
    prismaClient: {},
    verifyAdminRequest: vi.fn().mockResolvedValue(authorized ? { id: 'admin-1', email: 'owner@example.com' } : null),
    quoteService,
  }));
  return { app, quoteService };
}

const validInput = {
  billingCadence: 'four_week',
  fulfillment: 'delivery',
  membership: { status: 'active_paid' },
  items: [{ category: 'dinner', pricingMode: 'family_flat', mealsPerWeek: 5, households: 1 }],
};

describe('product pricing routes', () => {
  it('requires admin authentication', async () => {
    const { app } = createApp({ authorized: false });
    const response = await request(app)
      .post('/api/product-pricing/meal-prep/quotes')
      .send({ input: validInput });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('pricing-admin-unauthorized');
  });

  it('creates a validated meal-prep quote', async () => {
    const { app, quoteService } = createApp();
    const response = await request(app)
      .post('/api/product-pricing/meal-prep/quotes')
      .send({ input: validInput });

    expect(response.status).toBe(201);
    expect(response.body.quote.currentRevisionNumber).toBe(1);
    expect(quoteService.createMealPrepQuote).toHaveBeenCalledWith(expect.objectContaining({
      input: validInput,
      actor: 'owner@example.com',
      adjustments: [],
    }));
  });

  it('requires a change summary for negotiated revisions', async () => {
    const { app, quoteService } = createApp();
    const response = await request(app)
      .post('/api/product-pricing/meal-prep/quotes/quote-1/revisions')
      .send({ input: validInput, adjustments: [] });

    expect(response.status).toBe(400);
    expect(quoteService.reviseMealPrepQuote).not.toHaveBeenCalled();
  });
});
