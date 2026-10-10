import { createRequire } from 'node:module';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const originalAccessToken = process.env.SQUARE_ACCESS_TOKEN;
  const originalLocationId = process.env.SQUARE_LOCATION_ID;
  process.env.SQUARE_ACCESS_TOKEN = 'test-token';
  process.env.SQUARE_LOCATION_ID = 'test-location';
  return { prisma: {}, square: {}, originalAccessToken, originalLocationId };
});

const cjsRequire = createRequire(import.meta.url);
const originalModules = new Map();
const freshModules = new Set();

function mockCommonJs(specifier, exports) {
  const id = cjsRequire.resolve(specifier);
  if (!originalModules.has(id)) originalModules.set(id, cjsRequire.cache[id]);
  cjsRequire.cache[id] = { id, filename: id, loaded: true, children: [], paths: [], exports };
}

function loadFreshCommonJs(specifier) {
  const id = cjsRequire.resolve(specifier);
  delete cjsRequire.cache[id];
  freshModules.add(id);
  return cjsRequire(id);
}


afterAll(() => {
  if (mocks.originalAccessToken === undefined) delete process.env.SQUARE_ACCESS_TOKEN;
  else process.env.SQUARE_ACCESS_TOKEN = mocks.originalAccessToken;
  if (mocks.originalLocationId === undefined) delete process.env.SQUARE_LOCATION_ID;
  else process.env.SQUARE_LOCATION_ID = mocks.originalLocationId;
  for (const id of freshModules) delete cjsRequire.cache[id];
  for (const [id, original] of originalModules) {
    if (original) cjsRequire.cache[id] = original;
    else delete cjsRequire.cache[id];
  }
});

function response() {
  return {
    statusCode: 200,
    body: null,
    setHeader: vi.fn(),
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('hosted checkout confirmation anchors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCommonJs('../../api-handlers/_lib/prisma', {
      get prisma() { return mocks.prisma; },
    });
    mockCommonJs('square', {
      Environment: { Production: 'Production' },
      Client: class {
        constructor() { return mocks.square; }
      },
    });
    const pizzaOrder = { id: 'commercial-order-1' };
    const weeklyAttempt = { id: 'attempt-1', weeklyOrderId: 'weekly-order-1' };
    Object.assign(mocks.prisma, {
      commercialOrder: { upsert: vi.fn().mockResolvedValue(pizzaOrder) },
      financePaymentAttempt: {
        upsert: vi.fn().mockResolvedValue({ id: 'pizza-attempt-1' }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
      },
      menuWeek: { findUnique: vi.fn().mockResolvedValue({ id: 'week-1', cutoffAt: null }) },
      menuWeekItem: {
        findMany: vi.fn().mockResolvedValue([{
          dishId: 'dish-1',
          includedInPlan: true,
          isAddon: false,
          section: { slug: 'entrees' },
        }]),
      },
      dishPrice: { findMany: vi.fn().mockResolvedValue([]) },
      customerPriceOverride: { findMany: vi.fn().mockResolvedValue([]) },
      customerPlan: { findFirst: vi.fn().mockResolvedValue(null) },
      customer: { findUnique: vi.fn().mockResolvedValue(null) },
      order: { create: vi.fn().mockResolvedValue({ paymentAttempts: [weeklyAttempt] }) },
    });
    Object.assign(mocks.square, {
      ordersApi: { createOrder: vi.fn().mockResolvedValue({ result: { order: { id: 'square-order-1' } } }) },
      checkoutApi: { createPaymentLink: vi.fn().mockResolvedValue({ result: { paymentLink: { url: 'https://square.example/link', orderId: 'square-order-1' } } }) },
    });
  });

  it('persists Pizza Party facts and attempt before creating a stable Square link', async () => {
    const pizzaPartyLink = loadFreshCommonJs('../../api-handlers/store/pizza-party-link');
    const firstResponse = response();
    const request = { method: 'GET', query: { date: 'Oct 2', email: 'buyer@example.com', addOnGuests: '10' } };
    await pizzaPartyLink(request, firstResponse);
    const secondResponse = response();
    await pizzaPartyLink(request, secondResponse);
    expect(firstResponse.body).toEqual({ ok: true, url: 'https://square.example/link' });
    expect(firstResponse.statusCode).toBe(200);

    expect(mocks.prisma.commercialOrder.upsert).toHaveBeenCalledTimes(2);
    const orderCreate = mocks.prisma.commercialOrder.upsert.mock.calls[0][0].create;
    expect(orderCreate).toMatchObject({
      totalCents: 39000,
      customerEmail: 'buyer@example.com',
      sourceSystem: 'store',
      channel: 'store',
      businessLineKey: 'pizza',
      metadata: { offer: 'pizza-party', requestedDate: 'Oct 2', addOnGuests: 10, contactEmail: 'buyer@example.com', amountCents: 39000 },
    });
    expect(orderCreate.lines.createMany.data).toEqual([
      { name: 'In-Home Pizza Party (Up to 15 Guests)', quantity: 1, unitPriceCents: 30000, totalCents: 30000 },
      { name: 'Salads & Dessert Add-On', quantity: 10, unitPriceCents: 900, totalCents: 9000 },
    ]);
    expect(mocks.prisma.financePaymentAttempt.upsert.mock.calls[0][0].create).toMatchObject({
      requestedCents: 39000,
      commercialOrderId: 'commercial-order-1',
      status: 'pending',
    });
    expect(mocks.square.checkoutApi.createPaymentLink.mock.calls[0][0]).toMatchObject({ orderId: 'square-order-1' });
    expect(mocks.square.checkoutApi.createPaymentLink.mock.calls[1][0].idempotencyKey)
      .toBe(mocks.square.checkoutApi.createPaymentLink.mock.calls[0][0].idempotencyKey);
    expect(mocks.prisma.financePaymentAttempt.upsert.mock.calls[1][0].where.provider_idempotencyKey.idempotencyKey)
      .toBe(mocks.prisma.financePaymentAttempt.upsert.mock.calls[0][0].where.provider_idempotencyKey.idempotencyKey);
    expect(mocks.prisma.commercialOrder.upsert.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.prisma.financePaymentAttempt.upsert.mock.invocationCallOrder[0]);
    expect(mocks.prisma.financePaymentAttempt.upsert.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.square.ordersApi.createOrder.mock.invocationCallOrder[0]);
    expect(mocks.square.ordersApi.createOrder.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.square.checkoutApi.createPaymentLink.mock.invocationCallOrder[0]);
    expect(mocks.prisma.financePaymentAttempt.update).toHaveBeenCalledWith({
      where: { id: 'pizza-attempt-1' },
      data: { metadata: { squareOrderId: 'square-order-1' } },
    });
  });

  it('persists weekly order items and attempt and uses the weekly order as Square reference', async () => {
    const weeklyOrderLink = loadFreshCommonJs('../../api-handlers/weekly-order/checkout-link');
    const weeklyAttempt = { id: 'attempt-1', weeklyOrderId: 'weekly-order-1', requestedCents: 10500 };
    mocks.prisma.order.create.mockResolvedValue({ paymentAttempts: [weeklyAttempt] });
    mocks.prisma.financePaymentAttempt.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(weeklyAttempt);
    const request = {
      method: 'POST',
      body: {
        menuWeekId: 'week-1', customerId: 'customer-1', customerSlug: 'buyer', tier: 'member',
        items: [{ dishId: 'dish-1', quantity: 1 }], basePriceCents: 10000, deliveryFeeCents: 500,
      },
    };
    const firstResponse = response();
    await weeklyOrderLink(request, firstResponse);
    const retryResponse = response();
    await weeklyOrderLink(request, retryResponse);
    expect(firstResponse.statusCode).toBe(200);
    expect(retryResponse.statusCode).toBe(200);
    expect(mocks.prisma.order.create).toHaveBeenCalledTimes(1);

    const persistedOrder = mocks.prisma.order.create.mock.calls[0][0];
    expect(persistedOrder.data).toMatchObject({
      status: 'payment_pending',
      totalsCents: 10500,
      menuWeekId: 'week-1',
      customerId: 'customer-1',
      items: { createMany: { data: [expect.objectContaining({ dishId: 'dish-1', quantity: 1 })] } },
    });
    expect(persistedOrder.data.paymentAttempts.create).toMatchObject({
      provider: 'square',
      status: 'pending',
      requestedCents: 10500,
    });
    expect(mocks.square.checkoutApi.createPaymentLink.mock.calls[0][0].order.referenceId).toBe('weekly-order-1');
    expect(mocks.square.checkoutApi.createPaymentLink.mock.calls[1][0].idempotencyKey)
      .toBe(mocks.square.checkoutApi.createPaymentLink.mock.calls[0][0].idempotencyKey);
    expect(mocks.prisma.financePaymentAttempt.update).toHaveBeenCalledWith({
      where: { id: 'attempt-1' },
      data: { metadata: { squareOrderId: 'square-order-1' } },
    });
  });
});
