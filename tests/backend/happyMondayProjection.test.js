import { describe, expect, it } from 'vitest';

import happyMondayProjection from '../../backend/api/finance/happyMondayProjection.js';

const {
  isCreditMovement,
  isSettlingPayment,
  paymentCents,
  projectPayment,
  runHappyMondayProjection,
} = happyMondayProjection;

// The portal stores two unrelated things in `happymonday_payments`: money a
// customer paid, and movements of a standing credit balance recorded as
// `credit_adjustment`. A credit application is negative and a credit grant is
// positive, so classifying by sign posts the grant as a customer payment and
// allocates it against invoices, inventing a receipt that never existed. The
// production table holds exactly that shape: twenty negative applications and
// one positive "standing credit top-up".
function makeSupabase({ orders, payments }) {
  return {
    from: (table) => {
      const rows = table === 'happymonday_orders' ? orders : payments;
      const builder = {
        select: () => builder,
        order: async () => ({ data: rows, error: null }),
        then: (resolve) => resolve({ data: rows, error: null }),
      };
      return builder;
    },
  };
}

const orders = [
  { id: 'o1', order_number: 'HM-1', total_cents: 1_000_00, items: [], adjustments: [] },
  { id: 'o2', order_number: 'HM-2', total_cents: 500_00, items: [], adjustments: [] },
];

const credits = [
  { id: 'p1', amount_cents: -230_40, payment_type: 'credit_adjustment', notes: 'Credit applied to order HM-1' },
  { id: 'p2', amount_cents: -59_20, payment_type: 'credit_adjustment', notes: 'Credit applied to order HM-2' },
  { id: 'p3', amount_cents: 1_500_00, payment_type: 'credit_adjustment', notes: 'Standing credit top-up' },
];

describe('portal payment classification', () => {
  it('treats every credit movement as non-cash regardless of sign', () => {
    expect(isCreditMovement({ payment_type: 'credit_adjustment' })).toBe(true);
    expect(isCreditMovement({ payment_type: 'CREDIT_ADJUSTMENT' })).toBe(true);
    expect(isCreditMovement({ payment_type: 'square' })).toBe(false);
    expect(isCreditMovement({})).toBe(false);

    expect(isSettlingPayment({ amount_cents: 150000, payment_type: 'credit_adjustment' })).toBe(false);
    expect(isSettlingPayment({ amount_cents: 150000, payment_type: 'square' })).toBe(true);
    expect(isSettlingPayment({ amount_cents: 0, payment_type: 'square' })).toBe(false);
    expect(isSettlingPayment({ amount_cents: -23040, payment_type: 'square' })).toBe(false);
    expect(isSettlingPayment({})).toBe(false);

    expect(paymentCents({ amount_cents: '2500' })).toBe(2500);
    expect(paymentCents({ amount_cents: 12.6 })).toBe(13);
  });

  it('never records a payment transaction for a credit application', async () => {
    const result = await projectPayment({
      prisma: {},
      payment: { id: 'p1', amount_cents: -23040, payment_type: 'credit_adjustment' },
      invoices: [],
    });
    expect(result).toEqual({ skipped: 'credit-movement-not-cash' });
  });

  it('never records a payment transaction for a positive credit grant', async () => {
    const result = await projectPayment({
      prisma: {},
      payment: { id: 'p3', amount_cents: 150000, payment_type: 'credit_adjustment' },
      invoices: [],
    });
    expect(result).toEqual({ skipped: 'credit-movement-not-cash' });
  });

  it('still refuses a zero or negative non-credit row', async () => {
    const result = await projectPayment({
      prisma: {},
      payment: { id: 'p9', amount_cents: 0, payment_type: 'square' },
      invoices: [],
    });
    expect(result).toEqual({ skipped: 'non-positive-amount' });
  });
});

describe('happy monday dry-run estimate', () => {
  it('reports billed money and no collected money when only credits exist', async () => {
    const summary = await runHappyMondayProjection({
      prisma: {},
      supabase: makeSupabase({ orders, payments: credits }),
      dryRun: true,
    });

    expect(summary.dryRun).toBe(true);
    expect(summary.billedCents).toBe(1_500_00);
    expect(summary.collectedCents).toBe(0);
    expect(summary.settlingPayments).toBe(0);
    expect(summary.creditMovements).toBe(3);
    expect(summary.creditMovementCents).toBe(1_210_40);
    expect(summary.unusablePayments).toBe(0);
    expect(summary.payments).toBe(3);
  });

  it('estimates collected from settling payments only', async () => {
    const summary = await runHappyMondayProjection({
      prisma: {},
      supabase: makeSupabase({
        orders,
        payments: [
          ...credits,
          { id: 'p4', amount_cents: 400_00, payment_type: 'square', square_payment_id: 'sq-1' },
          { id: 'p5', amount_cents: 0, payment_type: 'square' },
        ],
      }),
      dryRun: true,
    });

    expect(summary.collectedCents).toBe(400_00);
    expect(summary.settlingPayments).toBe(1);
    expect(summary.creditMovements).toBe(3);
    expect(summary.unusablePayments).toBe(1);
  });
});

