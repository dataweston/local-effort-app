import { beforeEach, describe, expect, it, vi } from 'vitest';

import commercialOrders from '../../backend/api/finance/commercialOrders.js';
import businessLines from '../../backend/api/finance/businessLines.js';

const { CommercialCheckoutConflictError, normalizeLines, startCommercialCheckout } = commercialOrders;
const { businessLineForStore, isBusinessLineKey } = businessLines;

function makePrisma({ existingAttempt = null, createImpl } = {}) {
  const findUnique = vi.fn().mockResolvedValue(existingAttempt);
  const create = vi.fn(createImpl || (async ({ data }) => ({
    id: 'commercial-order-1',
    ...data,
    lines: data.lines?.createMany?.data || [],
    paymentAttempts: [{ id: 'attempt-1', ...data.paymentAttempts.create }],
  })));
  return {
    financePaymentAttempt: { findUnique },
    commercialOrder: { create },
  };
}

const baseArgs = {
  idempotencyKey: 'attempt-key-1',
  sourceSystem: 'store',
  sourceId: 'attempt-key-1',
  channel: 'store',
  businessLineKey: 'store',
  totalCents: 4200,
};

describe('startCommercialCheckout', () => {
  let prisma;

  beforeEach(() => {
    prisma = makePrisma();
  });

  it('books the order, its lines, and one pending attempt in a single write', async () => {
    const result = await startCommercialCheckout({
      ...baseArgs,
      prisma,
      subtotalCents: 3700,
      customerEmail: 'Buyer@Example.com',
      lines: [
        { name: 'Focaccia', sku: 'product-1', quantity: 2, unitPriceCents: 1850 },
        { name: 'Local delivery', lineType: 'fee', unitPriceCents: 500 },
      ],
    });

    expect(result.replay).toBe(null);
    const { data } = prisma.commercialOrder.create.mock.calls[0][0];
    expect(data).toMatchObject({
      channel: 'store',
      businessLineKey: 'store',
      status: 'payment_pending',
      subtotalCents: 3700,
      totalCents: 4200,
      sourceSystem: 'store',
      sourceId: 'attempt-key-1',
      customerEmail: 'buyer@example.com',
    });
    expect(data.paymentAttempts.create).toMatchObject({
      provider: 'square',
      idempotencyKey: 'attempt-key-1',
      status: 'pending',
      requestedCents: 4200,
    });
    expect(data.lines.createMany.data).toEqual([
      expect.objectContaining({ name: 'Focaccia', quantity: 2, unitPriceCents: 1850, totalCents: 3700 }),
      expect.objectContaining({ lineType: 'fee', quantity: 1, totalCents: 500 }),
    ]);
  });

  it('returns the earlier capture instead of charging a replayed attempt again', async () => {
    prisma = makePrisma({
      existingAttempt: {
        id: 'attempt-1',
        status: 'succeeded',
        requestedCents: 4200,
        externalPaymentId: 'square-payment-1',
        commercialOrder: { id: 'commercial-order-1' },
      },
    });

    const result = await startCommercialCheckout({ ...baseArgs, prisma });

    expect(result.replay).toBe('succeeded');
    expect(result.attempt.externalPaymentId).toBe('square-payment-1');
    expect(prisma.commercialOrder.create).not.toHaveBeenCalled();
  });

  it('recovers an unfinished attempt rather than booking the order twice', async () => {
    prisma = makePrisma({
      existingAttempt: {
        id: 'attempt-1',
        status: 'pending',
        requestedCents: 4200,
        commercialOrder: { id: 'commercial-order-1' },
      },
    });

    const result = await startCommercialCheckout({ ...baseArgs, prisma });

    expect(result.replay).toBe('pending');
    expect(result.order.id).toBe('commercial-order-1');
    expect(prisma.commercialOrder.create).not.toHaveBeenCalled();
  });

  it('refuses a reused attempt id whose basket total changed', async () => {
    prisma = makePrisma({
      existingAttempt: { id: 'attempt-1', status: 'pending', requestedCents: 9900 },
    });

    await expect(startCommercialCheckout({ ...baseArgs, prisma }))
      .rejects.toMatchObject({ code: 'attempt-amount-changed', statusCode: 409 });
    expect(prisma.commercialOrder.create).not.toHaveBeenCalled();
  });

  it('refuses to retry an attempt the provider already failed', async () => {
    prisma = makePrisma({
      existingAttempt: { id: 'attempt-1', status: 'failed', requestedCents: 4200 },
    });

    await expect(startCommercialCheckout({ ...baseArgs, prisma }))
      .rejects.toBeInstanceOf(CommercialCheckoutConflictError);
  });

  it('resolves a concurrent insert race to the winner attempt', async () => {
    const raced = {
      id: 'attempt-winner',
      status: 'pending',
      requestedCents: 4200,
      commercialOrder: { id: 'commercial-order-winner' },
    };
    prisma = makePrisma({
      createImpl: async () => {
        throw Object.assign(new Error('unique constraint'), { code: 'P2002' });
      },
    });
    prisma.financePaymentAttempt.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(raced);

    const result = await startCommercialCheckout({ ...baseArgs, prisma });

    expect(result.replay).toBe('pending');
    expect(result.attempt.id).toBe('attempt-winner');
  });

  it('refuses when a source id collides without a matching attempt', async () => {
    prisma = makePrisma({
      createImpl: async () => {
        throw Object.assign(new Error('unique constraint'), { code: 'P2002' });
      },
    });

    await expect(startCommercialCheckout({ ...baseArgs, prisma }))
      .rejects.toMatchObject({ code: 'source-id-conflict' });
  });

  it('never charges when the pre-charge write fails for any other reason', async () => {
    prisma = makePrisma({
      createImpl: async () => {
        throw new Error('connection terminated');
      },
    });

    await expect(startCommercialCheckout({ ...baseArgs, prisma })).rejects.toThrow('connection terminated');
  });
});

describe('commercial line normalisation', () => {
  it('derives line totals and keeps quantities whole and positive', () => {
    expect(normalizeLines([{ name: 'Pizza', quantity: 3, unitPriceCents: 1200 }])[0]).toMatchObject({
      quantity: 3,
      totalCents: 3600,
    });
    expect(normalizeLines([{ name: 'Deposit', quantity: 0, unitPriceCents: 5000 }])[0].quantity).toBe(1);
  });

  it('honours an explicit line total over the computed one', () => {
    expect(normalizeLines([
      { name: 'Discounted tray', quantity: 2, unitPriceCents: 1000, totalCents: 1500 },
    ])[0].totalCents).toBe(1500);
  });
});

describe('business line keys', () => {
  it('separates pizza from retail preorders inside the general store', () => {
    expect(businessLineForStore('pizza-party')).toBe('pizza');
    expect(businessLineForStore('chez-garage')).toBe('store');
    expect(businessLineForStore('unknown-popup')).toBe('store');
  });

  it('only accepts keys the margin contract knows', () => {
    expect(isBusinessLineKey('wholesale')).toBe(true);
    expect(isBusinessLineKey('Wholesale & Bread')).toBe(false);
  });
});
