import crypto from 'node:crypto';
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

describe('square webhook handler', () => {
  let app: express.Express;
  let fakeDb: FakeFirestore;
  let handler: (req: express.Request, res: express.Response) => Promise<void>;
  const notificationUrl = 'https://example.com/api/square/webhook';
  const secret = 'test-secret';

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL = notificationUrl;
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = secret;

    fakeDb = new FakeFirestore();
    const firebaseAdmin = await import('../../packages/lib/firebaseAdmin');
    firebaseAdmin.__setDb(fakeDb);

    const module = await import('../../api-handlers/square/webhook');
    handler = module.default;

    app = express();
    app.post('/api/square/webhook', express.raw({ type: '*/*' }), (req, res) => {
      handler(req, res);
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    const firebaseAdmin = await import('../../packages/lib/firebaseAdmin');
    firebaseAdmin.__setDb(null);
    vi.resetModules();
    delete process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
    delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  });

  it('persists completed pizza payments once', async () => {
    const body = {
      type: 'payment.updated',
      data: {
        object: {
          payment: {
            id: 'PAYMENT-1',
            status: 'COMPLETED',
            customer_id: 'CUSTOMER-1',
            amount_money: { amount: 4200 },
            order: {
              line_items: [
                { name: 'Community Pizza', quantity: '2' },
                { name: 'T-Shirt', quantity: '1' },
              ],
            },
          },
        },
      },
    };

    const payload = JSON.stringify(body);
    const signature = crypto.createHmac('sha256', secret)
      .update(notificationUrl + payload)
      .digest('base64');

    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const first = await request(app)
      .post('/api/square/webhook')
      .set('x-square-hmacsha256-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(first.status).toBe(200);
    expect(first.body).toEqual({ ok: true });

    const orderDoc = fakeDb.getDoc('orders', 'PAYMENT-1');
    expect(orderDoc).toMatchObject({
      squarePaymentId: 'PAYMENT-1',
      qty: 2,
      amount: 4200,
      status: 'PAID',
      source: 'square',
    });

    const backerDoc = fakeDb.getDoc('backers', 'CUSTOMER-1');
    expect(backerDoc).toMatchObject({
      ordersCount: 1,
      amountTotal: 4200,
    });

    const aggregate = fakeDb.getDoc('aggregates', 'crowdfunding');
    expect(aggregate?.pizzas).toBe(2);
    expect(aggregate?.backers).toBe(1);
    expect(aggregate?.updatedAt).toBeInstanceOf(Date);

    const firstUpdatedAt = aggregate?.updatedAt as Date;

    vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
    const second = await request(app)
      .post('/api/square/webhook')
      .set('x-square-hmacsha256-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(second.status).toBe(200);
    expect(second.body).toEqual({ ok: true });

    const aggregateAfter = fakeDb.getDoc('aggregates', 'crowdfunding');
    expect(aggregateAfter?.pizzas).toBe(2);
    expect(aggregateAfter?.backers).toBe(1);
    expect((aggregateAfter?.updatedAt as Date).getTime()).toBe(firstUpdatedAt.getTime());
  });
});
