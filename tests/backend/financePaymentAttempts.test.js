import { describe, expect, it, vi } from 'vitest';

import paymentAttemptModule from '../../backend/api/finance/paymentAttempts.js';

const {
  failureDetails,
  markPaymentAttemptFailed,
  markPaymentAttemptSucceeded,
  paymentEvidence,
} = paymentAttemptModule;

function prismaWithTransaction(tx) {
  return {
    $transaction: vi.fn(async (callback) => callback(tx)),
  };
}

describe('Finance Core payment-attempt transitions', () => {
  it('records one provider-neutral transaction and advances the weekly order', async () => {
    const attempt = {
      id: 'attempt-1',
      currency: 'USD',
      weeklyOrderId: 'weekly-order-1',
      commercialOrderId: null,
    };
    const tx = {
      financePaymentAttempt: { update: vi.fn().mockResolvedValue(attempt) },
      financePaymentTransaction: { upsert: vi.fn().mockResolvedValue({ id: 'txn-1' }) },
      order: { update: vi.fn().mockResolvedValue({ id: 'weekly-order-1' }) },
      commercialOrder: { update: vi.fn() },
    };
    const prisma = prismaWithTransaction(tx);

    const result = await markPaymentAttemptSucceeded({
      prisma,
      attemptId: 'attempt-1',
      provider: 'square',
      amountCents: 12500,
      payment: {
        id: 'square-payment-1',
        status: 'COMPLETED',
        createdAt: '2026-08-15T12:00:00.000Z',
        receiptUrl: 'https://square.example/receipt',
      },
    });

    expect(result.externalPaymentId).toBe('square-payment-1');
    expect(tx.financePaymentTransaction.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        provider_externalPaymentId: {
          provider: 'square',
          externalPaymentId: 'square-payment-1',
        },
      },
    }));
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'weekly-order-1' },
      data: expect.objectContaining({ status: 'paid', squarePaymentId: 'square-payment-1' }),
    });
    expect(tx.commercialOrder.update).not.toHaveBeenCalled();
  });

  it('allocates an invoice-bound payment and settles the invoice from allocations', async () => {
    const attempt = {
      id: 'attempt-3',
      currency: 'USD',
      weeklyOrderId: null,
      commercialOrderId: 'commercial-order-3',
      invoiceId: 'invoice-3',
    };
    const tx = {
      financePaymentAttempt: { update: vi.fn().mockResolvedValue(attempt) },
      financePaymentTransaction: { upsert: vi.fn().mockResolvedValue({ id: 'txn-3' }) },
      order: { update: vi.fn() },
      commercialOrder: { update: vi.fn().mockResolvedValue({ id: 'commercial-order-3' }) },
      financePaymentAllocation: {
        upsert: vi.fn().mockResolvedValue({ id: 'alloc-3' }),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: 25000 } }),
      },
      commercialInvoice: {
        findUnique: vi.fn().mockResolvedValue({ id: 'invoice-3', totalCents: 25000, status: 'issued', paidAt: null }),
        update: vi.fn().mockResolvedValue({ id: 'invoice-3' }),
      },
    };

    await markPaymentAttemptSucceeded({
      prisma: prismaWithTransaction(tx),
      attemptId: 'attempt-3',
      provider: 'square',
      amountCents: 25000,
      payment: { id: 'square-payment-3', status: 'COMPLETED' },
    });

    // The invoice is the obligation being settled, so the allocation targets it
    // rather than the order it came from.
    expect(tx.financePaymentAllocation.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        targetType: 'invoice',
        targetId: 'invoice-3',
        orderId: 'commercial-order-3',
        amountCents: 25000,
      }),
    }));
    expect(tx.commercialInvoice.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ outstandingCents: 0, status: 'paid' }),
    }));
  });

  it('leaves a weekly order unallocated: it has no commercial record yet', async () => {
    const tx = {
      financePaymentAttempt: {
        update: vi.fn().mockResolvedValue({
          id: 'attempt-4',
          currency: 'USD',
          weeklyOrderId: 'weekly-order-4',
          commercialOrderId: null,
          invoiceId: null,
        }),
      },
      financePaymentTransaction: { upsert: vi.fn().mockResolvedValue({ id: 'txn-4' }) },
      order: { update: vi.fn() },
      commercialOrder: { update: vi.fn() },
      financePaymentAllocation: { upsert: vi.fn() },
    };

    await markPaymentAttemptSucceeded({
      prisma: prismaWithTransaction(tx),
      attemptId: 'attempt-4',
      provider: 'square',
      amountCents: 8000,
      payment: { id: 'square-payment-4', status: 'COMPLETED' },
    });

    expect(tx.financePaymentAllocation.upsert).not.toHaveBeenCalled();
  });

  it('preserves a failed attempt and advances its native order to payment_failed', async () => {
    const tx = {
      financePaymentAttempt: {
        update: vi.fn().mockResolvedValue({
          id: 'attempt-2',
          weeklyOrderId: 'weekly-order-2',
          commercialOrderId: null,
        }),
      },
      order: { update: vi.fn() },
      commercialOrder: { update: vi.fn() },
    };

    await markPaymentAttemptFailed({
      prisma: prismaWithTransaction(tx),
      attemptId: 'attempt-2',
      error: { errors: [{ code: 'CARD_DECLINED', detail: 'Card declined' }] },
    });

    expect(tx.financePaymentAttempt.update).toHaveBeenCalledWith({
      where: { id: 'attempt-2' },
      data: expect.objectContaining({
        status: 'failed',
        failureCode: 'CARD_DECLINED',
        failureMessage: 'Card declined',
      }),
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'weekly-order-2' },
      data: { status: 'payment_failed' },
    });
  });

  it('keeps only bounded, non-card provider evidence', () => {
    expect(paymentEvidence({
      receipt_url: 'https://square.example/r/1',
      order_id: 'square-order-1',
      customer_id: 'square-customer-1',
      location_id: 'location-1',
      cardDetails: { card: { last4: '4242' } },
    })).toEqual({
      receiptUrl: 'https://square.example/r/1',
      orderId: 'square-order-1',
      customerId: 'square-customer-1',
      locationId: 'location-1',
    });

    expect(failureDetails(new Error('network unavailable'))).toMatchObject({
      failureCode: 'payment_failed',
      failureMessage: 'network unavailable',
    });
  });
});
