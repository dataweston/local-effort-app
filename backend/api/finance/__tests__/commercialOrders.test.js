import { describe, expect, it, vi } from 'vitest';
import commercialOrders from '../commercialOrders';

const { startCommercialCheckout } = commercialOrders;

function prismaWithAttempt(attempt) {
  return {
    financePaymentAttempt: { findUnique: vi.fn().mockResolvedValue(attempt) },
  };
}

describe('commercial checkout replay identity', () => {
  it('rejects a different same-total basket on the same attempt key', async () => {
    const basket = { store: 'sale', lines: [{ productId: 'a', qty: 1, unitPriceCents: 2500 }] };
    const attempt = { requestedCents: 2500, status: 'pending', metadata: { basketFingerprint: commercialOrders.basketFingerprint(basket) }, commercialOrder: { lines: [] } };
    const prisma = prismaWithAttempt(attempt);

    await expect(startCommercialCheckout({
      prisma,
      idempotencyKey: 'attempt-1',
      sourceSystem: 'store',
      sourceId: 'attempt-1',
      channel: 'store',
      totalCents: 2500,
      basket: { store: 'sale', lines: [{ productId: 'b', qty: 1, unitPriceCents: 2500 }] },
      lines: [{ name: 'Other item', quantity: 1, unitPriceCents: 2500 }],
    })).rejects.toMatchObject({ code: 'attempt-basket-changed', statusCode: 409 });
  });

  it('recovers an identical basket replay', async () => {
    const basket = { store: 'sale', lines: [{ productId: 'a', qty: 1, unitPriceCents: 2500 }] };
    const attempt = { requestedCents: 2500, status: 'pending', metadata: { basketFingerprint: commercialOrders.basketFingerprint(basket) }, commercialOrder: { id: 'order-1', lines: [] } };
    const result = await startCommercialCheckout({
      prisma: prismaWithAttempt(attempt),
      idempotencyKey: 'attempt-1',
      sourceSystem: 'store',
      sourceId: 'attempt-1',
      channel: 'store',
      totalCents: 2500,
      basket,
      lines: [{ name: 'Item', quantity: 1, unitPriceCents: 2500 }],
    });
    expect(result).toMatchObject({ replay: 'pending', order: { id: 'order-1' } });
  });
});
