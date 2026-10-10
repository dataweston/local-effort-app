import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { queueSaleConfirmations } = require('../../../../api-handlers/store/sale-confirmation-outbox');

describe('store sale confirmation outbox', () => {
  it('queues roles transactionally with stable Square-payment-and-role idempotency', async () => {
    const enqueue = vi.fn().mockResolvedValue({ id: 'queued' });
    const confirmations = [
      { role: 'customer', payload: { to: [{ email: 'buyer@example.test' }], subject: 'Receipt' } },
      { role: 'owner', payload: { to: [{ email: 'owner@example.test' }], subject: 'New sale' } },
    ];
    const input = {
      emailOutboxService: { enqueue },
      payment: { status: 'COMPLETED' },
      paymentId: 'sq-payment-123',
      confirmations,
    };
    const result = await queueSaleConfirmations(input);
    await queueSaleConfirmations(input);

    expect(result).toEqual({ queued: 2 });
    expect(enqueue.mock.calls.slice(0, 2).map(([entry]) => entry)).toEqual([
      expect.objectContaining({
        idempotencyKey: 'square-payment-sq-payment-123-sale-confirmation-customer',
        category: 'transactional',
        source: 'sale-confirmation',
        context: { paymentId: 'sq-payment-123', role: 'customer', tags: ['sale-confirmation'] },
        payload: expect.objectContaining({ to: [{ email: 'buyer@example.test' }] }),
      }),
      expect.objectContaining({
        idempotencyKey: 'square-payment-sq-payment-123-sale-confirmation-owner',
        category: 'transactional',
        source: 'sale-confirmation',
        context: { paymentId: 'sq-payment-123', role: 'owner', tags: ['sale-confirmation'] },
        payload: expect.objectContaining({ to: [{ email: 'owner@example.test' }] }),
      }),
    ]);
    expect(enqueue.mock.calls.map(([entry]) => entry.idempotencyKey)).toEqual([
      'square-payment-sq-payment-123-sale-confirmation-customer',
      'square-payment-sq-payment-123-sale-confirmation-owner',
      'square-payment-sq-payment-123-sale-confirmation-customer',
      'square-payment-sq-payment-123-sale-confirmation-owner',
    ]);
  });

  it('does not enqueue unless Square reports COMPLETED', async () => {
    const enqueue = vi.fn();
    const result = await queueSaleConfirmations({
      emailOutboxService: { enqueue },
      payment: { status: 'APPROVED' },
      paymentId: 'sq-payment-123',
      confirmations: [{ role: 'buyer', payload: { to: [{ email: 'buyer@example.test' }] } }],
    });

    expect(result).toEqual({ queued: 0, skipped: 'payment-not-completed' });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('rejects a completed payment when the durable outbox is unavailable', async () => {
    await expect(queueSaleConfirmations({
      payment: { status: 'COMPLETED' },
      paymentId: 'sq-payment-123',
      confirmations: [{ role: 'buyer', payload: { to: [{ email: 'buyer@example.test' }] } }],
    })).rejects.toThrow('Sale confirmation outbox is unavailable');
  });
});
