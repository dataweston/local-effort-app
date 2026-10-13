import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';

const { createSalesRouter } = require('../../backend/api/routes/sales');
const { buildPizzaCustomerConfirmationHtml } = require('../../api-handlers/store/_confirmation-email');
const { buildDirectSaleConfirmations } = require('../../api-handlers/store/sale-confirmation-outbox');

describe('Pizza on Smith customer confirmation email', () => {
  it('renders the order image, paid amount, fulfillment details, and reply contact safely', () => {
    const html = buildPizzaCustomerConfirmationHtml({
      imageUrl: 'https://res.cloudinary.com/dokyhfvyd/image/upload/f_jpg,q_85,w_900,c_limit/v1769659841/b4eqpmf6wiusuziyxaly.heic',
      customerName: 'A <Buyer>',
      items: [{ title: 'Cheese pizza · 3 pack', optionSummary: 'classic & local', qty: 1, unitPrice: 3400 }],
      subtotal: 3400,
      feeLabel: 'Delivery',
      fee: 500,
      total: 3900,
      fulfillment: 'STORE: PIZZA ON SMITH\nMETRO DELIVERY:\n122 Smith Ave',
    });

    expect(html).toContain('src="https://res.cloudinary.com/dokyhfvyd/image/upload/f_jpg,q_85,w_900,c_limit/v1769659841/b4eqpmf6wiusuziyxaly.heic"');
    expect(html).toContain('A &lt;Buyer&gt;');
    expect(html).toContain('Cheese pizza · 3 pack (classic &amp; local) × 1');
    expect(html).toContain('$34.00 each');
    expect(html).toContain('$5.00');
    expect(html).toContain('$39.00');
    expect(html).toContain('METRO DELIVERY:\n122 Smith Ave');
    expect(html).toContain('mailto:yum@localeffortfood.com');
    expect(html).toContain('https://www.instagram.com/localeffortfood/');
  });
  it('resolves the completed payment reference in both persisted customer formats', () => {
    const htmlContent = buildPizzaCustomerConfirmationHtml({
      imageUrl: 'https://res.cloudinary.com/dokyhfvyd/image/upload/f_jpg,q_85,w_900,c_limit/v1769659841/b4eqpmf6wiusuziyxaly.heic',
      customerName: 'Buyer',
      items: [{ title: 'Cheese pizza · 3 pack', qty: 1, unitPrice: 3400 }],
      subtotal: 3400,
      feeLabel: 'Delivery',
      fee: 0,
      total: 3400,
      fulfillment: 'METRO DELIVERY:\n122 Smith Ave',
    });
    const [confirmation] = buildDirectSaleConfirmations('store', {
      flow: 'store',
      paymentId: 'square-payment-123',
      customer: { email: 'buyer@example.test' },
      confirmationTemplates: [{
        role: 'customer',
        payload: {
          to: [{ email: 'buyer@example.test' }],
          textContent: 'Payment reference: {{paymentId}}',
          htmlContent,
        },
      }],
    });

    expect(confirmation.payload.textContent).toBe('Payment reference: square-payment-123');
    expect(confirmation.payload.htmlContent).toContain('Payment reference: square-payment-123');
    expect(confirmation.payload.htmlContent).not.toContain('{{paymentId}}');
  });
});


function setup() {
  const orders = [
    {
      id: 'pizza-paid', sourceId: 'square-order-1', customerName: 'A Buyer', customerEmail: 'buyer@example.test',
      totalCents: 4200, currency: 'USD', createdAt: new Date('2026-10-13T12:00:00Z'), bookedAt: new Date('2026-10-13T12:00:00Z'),
      serviceStartAt: new Date('2026-10-15T00:00:00Z'), metadata: {
        store: 'pizza-on-smith', fulfillment: 'pickup', saleConfirmationFacts: {
          fulfillment: 'pickup', pickup: { name: 'Smith Street' }, details: { Fulfillment: 'Pickup at Smith Street' },
        },
      },
      lines: [{ id: 'line-1', name: 'Cheese Pizza', quantity: 2, unitPriceCents: 2100, totalCents: 4200 }],
      paymentAttempts: [{ externalPaymentId: 'payment-1', updatedAt: new Date() }],
    },
  ];
  const prismaClient = {
    commercialOrder: {
      findMany: vi.fn(async ({ where }) => {
        expect(where).toEqual({ status: 'paid', sourceSystem: 'store', metadata: { path: ['store'], equals: 'pizza-on-smith' } });
        return orders;
      }),
      findFirst: vi.fn(async ({ where }) => {
        expect(where).toEqual({
          status: 'paid', sourceSystem: 'store',
          metadata: { path: ['store'], equals: 'pizza-on-smith' },
          id: 'pizza-paid',
        });
        return orders[0];
      }),
      update: vi.fn(async ({ data }) => { orders[0].metadata = data.metadata; return orders[0]; }),
    },
  };
  const jobs = new Map();
  let delivered = false;
  const emailOutboxService = {
    enqueue: vi.fn(async (job) => {
      if (jobs.has(job.idempotencyKey)) return { id: jobs.get(job.idempotencyKey).id, deduped: true, status: delivered ? 'sent' : 'queued' };
      const queued = { id: `outbox-${jobs.size + 1}`, ...job };
      jobs.set(job.idempotencyKey, queued);
      return { id: queued.id, deduped: false, status: 'queued' };
    }),
    processBatch: vi.fn(async ({ ids }) => {
      if (delivered) return { picked: 0, sent: 0, retried: 0, deadLetter: 0, skippedSuppressed: 0, ids };
      delivered = true;
      return { picked: 1, sent: 1, retried: 0, deadLetter: 0, skippedSuppressed: 0, ids };
    }),
  };
  const app = express();
  app.use(express.json());
  app.use('/api/sales', createSalesRouter({
    prismaClient,
    emailOutboxService,
    verifyAdminRequestImpl: async (req) => req.headers.authorization === 'Bearer owner' ? { email: 'owner@example.test' } : null,
  }));
  return { app, orders, prismaClient, emailOutboxService, jobs };
}

describe('Pizza on Smith owner sales report and ready email', () => {
  it('requires authenticated admin access for report and ready action', async () => {
    const { app, prismaClient } = setup();
    await request(app).get('/api/sales/pizza-on-smith/report').expect(403);
    await request(app).post('/api/sales/pizza-on-smith/orders/pizza-paid/ready').send({}).expect(403);
    expect(prismaClient.commercialOrder.findMany).not.toHaveBeenCalled();
    expect(prismaClient.commercialOrder.findFirst).not.toHaveBeenCalled();
  });

  it('aggregates paid Pizza on Smith orders by date and product', async () => {
    const { app } = setup();
    const response = await request(app).get('/api/sales/pizza-on-smith/report').set('Authorization', 'Bearer owner').expect(200);
    expect(response.body.totals).toEqual({ grossSalesCents: 4200, orderCount: 1, units: 2 });
    expect(response.body.daily).toEqual([{ date: '2026-10-13', grossSalesCents: 4200, orderCount: 1, units: 2 }]);
    expect(response.body.products).toEqual([{ name: 'Cheese Pizza', units: 2, grossSalesCents: 4200, orderCount: 1 }]);
    expect(response.body.orders[0]).toMatchObject({ id: 'pizza-paid', ready: false, fulfillment: 'pickup' });
  });

  it('queues one durable customer ready email with order details and attempts delivery', async () => {
    const { app, orders, emailOutboxService, jobs } = setup();
    const sendReady = () => request(app).post('/api/sales/pizza-on-smith/orders/pizza-paid/ready').set('Authorization', 'Bearer owner').send({});
    const first = await sendReady().expect(200);
    const second = await sendReady().expect(200);
    expect(first.body.delivery.sent).toBe(1);
    expect(second.body.deduped).toBe(true);
    expect(second.body.delivery.sent).toBe(0);
    expect(jobs.size).toBe(1);
    expect(emailOutboxService.enqueue).toHaveBeenCalledTimes(2);
    const job = [...jobs.values()][0];
    expect(job.idempotencyKey).toBe('square-payment-payment-1-pizza-on-smith-ready');
    expect(job.payload.to).toEqual([{ email: 'buyer@example.test', name: 'A Buyer' }]);
    expect(job.payload.replyTo.email).toBe('yum@localeffortfood.com');
    expect(job.payload.textContent).toContain('Your Pizza on Smith order is now ready');
    expect(job.payload.textContent).toContain('2 × Cheese Pizza — $42.00');
    expect(job.payload.textContent).toContain('Fulfillment date: 10/15/2026');
    expect(emailOutboxService.processBatch).toHaveBeenCalledTimes(2);
    expect(orders[0].metadata.pizzaOnSmithReady).toMatchObject({ status: 'sent', outboxId: 'outbox-1' });
  });
});
