import crypto from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

class FakeDocumentSnapshot {
  constructor(private readonly _id: string, private readonly _data?: Record<string, unknown>) {}

  get id() {
    return this._id;
  }

  get exists() {
    return this._data !== undefined;
  }

  data() {
    return this._data ? clone(this._data) : undefined;
  }
}

class FakeDocumentReference {
  constructor(private readonly store: FakeFirestore, private readonly collectionName: string, private readonly docId: string) {}

  async get() {
    const data = this.store._getCollection(this.collectionName).get(this.docId);
    return new FakeDocumentSnapshot(this.docId, data ? clone(data) : undefined);
  }

  set(data: Record<string, unknown>, options?: { merge?: boolean }) {
    const collection = this.store._getCollection(this.collectionName);
    const existing = collection.get(this.docId);
    if (options?.merge && existing) {
      collection.set(this.docId, { ...existing, ...clone(data) });
    } else {
      collection.set(this.docId, clone(data));
    }
  }

  update(data: Record<string, unknown>) {
    const collection = this.store._getCollection(this.collectionName);
    const existing = collection.get(this.docId);
    if (!existing) {
      throw new Error('not-found');
    }
    collection.set(this.docId, { ...existing, ...clone(data) });
  }
}

class FakeCollectionReference {
  constructor(private readonly store: FakeFirestore, private readonly name: string) {}

  doc(id: string) {
    if (!id) {
      throw new Error('doc id required');
    }
    return new FakeDocumentReference(this.store, this.name, id);
  }
}

class FakeTransaction {
  constructor(private readonly store: FakeFirestore) {}

  async get(ref: FakeDocumentReference) {
    return ref.get();
  }

  set(ref: FakeDocumentReference, data: Record<string, unknown>, options?: { merge?: boolean }) {
    ref.set(data, options);
  }

  update(ref: FakeDocumentReference, data: Record<string, unknown>) {
    ref.update(data);
  }
}

class FakeFirestore {
  private readonly collections = new Map<string, Map<string, Record<string, unknown>>>();

  _getCollection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name)!;
  }

  collection(name: string) {
    return new FakeCollectionReference(this, name);
  }

  async runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T> | T) {
    const tx = new FakeTransaction(this);
    return fn(tx);
  }

  getDoc(collection: string, id: string) {
    const data = this._getCollection(collection).get(id);
    return data ? clone(data) : undefined;
  }
}

function clone<T>(value: T): T {
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = clone(val);
    }
    return result as T;
  }
  return value;
}

vi.mock('../../packages/lib/firebaseAdmin', () => {
  let currentDb: FakeFirestore | null = null;
  return {
    get db() {
      return currentDb;
    },
    __setDb(value: FakeFirestore) {
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

    const module = await import('../../api/square/webhook');
    handler = module.default;

    app = express();
    app.post('/api/square/webhook', express.raw({ type: '*/*' }), (req, res) => {
      handler(req, res);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
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
