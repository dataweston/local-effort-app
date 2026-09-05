import { describe, expect, it } from 'vitest';

import receivables from '../../backend/api/finance/receivables.js';
import happyMonday from '../../backend/api/finance/happyMondayProjection.js';
import smallEvents from '../../backend/api/finance/smallEventsProjection.js';
import localist from '../../backend/api/finance/localistProjection.js';

const { applyPaymentFifo, fifoOrder } = receivables;

/**
 * In-memory stand-in for the allocation/invoice tables. Enough of Prisma's
 * surface to exercise the real FIFO and settlement logic, including the
 * aggregate filters those functions rely on.
 */
function makeLedger(invoiceSeeds) {
  const invoices = new Map(invoiceSeeds.map((invoice) => [invoice.id, {
    status: 'issued',
    paidAt: null,
    outstandingCents: invoice.totalCents,
    ...invoice,
  }]));
  const allocations = [];

  const matches = (row, where) => {
    if (where.invoiceId && row.invoiceId !== where.invoiceId) return false;
    if (where.transactionId && row.transactionId !== where.transactionId) return false;
    if (where.targetType && row.targetType !== where.targetType) return false;
    if (where.targetId && row.targetId !== where.targetId) return false;
    if (where.NOT?.transactionId && row.transactionId === where.NOT.transactionId) return false;
    return true;
  };

  const client = {
    financePaymentAllocation: {
      aggregate: async ({ where }) => ({
        _sum: {
          amountCents: allocations
            .filter((row) => matches(row, where))
            .reduce((sum, row) => sum + row.amountCents, 0),
        },
      }),
      upsert: async ({ where, update, create }) => {
        const key = where.transactionId_targetType_targetId;
        const existing = allocations.find((row) => matches(row, key));
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = { id: `alloc-${allocations.length + 1}`, ...create };
        allocations.push(row);
        return row;
      },
      deleteMany: async ({ where }) => {
        for (let index = allocations.length - 1; index >= 0; index -= 1) {
          if (matches(allocations[index], where)) allocations.splice(index, 1);
        }
        return { count: 0 };
      },
    },
    commercialInvoice: {
      findUnique: async ({ where }) => invoices.get(where.id) || null,
      update: async ({ where, data }) => {
        const invoice = invoices.get(where.id);
        Object.assign(invoice, data);
        return invoice;
      },
    },
  };

  return { client, allocations, invoices };
}

const twoInvoices = [
  { id: 'inv-old', totalCents: 10000, issuedAt: new Date('2026-06-01') },
  { id: 'inv-new', totalCents: 5000, issuedAt: new Date('2026-07-01') },
];

describe('FIFO payment allocation', () => {
  it('settles the oldest invoice first and part-pays the next', async () => {
    const ledger = makeLedger(twoInvoices);

    const result = await applyPaymentFifo({
      tx: ledger.client,
      transactionId: 'txn-1',
      amountCents: 12000,
      invoices: twoInvoices,
    });

    expect(result.allocated).toBe(12000);
    expect(result.unappliedCents).toBe(0);
    expect(ledger.allocations.map((row) => [row.invoiceId, row.amountCents])).toEqual([
      ['inv-old', 10000],
      ['inv-new', 2000],
    ]);
    expect(ledger.invoices.get('inv-old')).toMatchObject({ outstandingCents: 0, status: 'paid' });
    expect(ledger.invoices.get('inv-new')).toMatchObject({ outstandingCents: 3000, status: 'partially_paid' });
  });

  it('reports money that outruns the open invoices instead of absorbing it', async () => {
    const ledger = makeLedger(twoInvoices);

    const result = await applyPaymentFifo({
      tx: ledger.client,
      transactionId: 'txn-1',
      amountCents: 20000,
      invoices: twoInvoices,
    });

    expect(result.allocated).toBe(15000);
    expect(result.unappliedCents).toBe(5000);
  });

  it('is idempotent: re-running the same payment does not double-apply', async () => {
    const ledger = makeLedger(twoInvoices);
    const args = { tx: ledger.client, transactionId: 'txn-1', amountCents: 12000, invoices: twoInvoices };

    await applyPaymentFifo(args);
    const second = await applyPaymentFifo(args);

    expect(second.allocated).toBe(12000);
    expect(ledger.allocations).toHaveLength(2);
    expect(ledger.invoices.get('inv-new').outstandingCents).toBe(3000);
  });

  it('stacks a second payment behind the first without overpaying an invoice', async () => {
    const ledger = makeLedger(twoInvoices);

    await applyPaymentFifo({ tx: ledger.client, transactionId: 'txn-1', amountCents: 10000, invoices: twoInvoices });
    const second = await applyPaymentFifo({ tx: ledger.client, transactionId: 'txn-2', amountCents: 8000, invoices: twoInvoices });

    expect(second.allocated).toBe(5000);
    expect(second.unappliedCents).toBe(3000);
    expect(ledger.invoices.get('inv-old')).toMatchObject({ outstandingCents: 0 });
    expect(ledger.invoices.get('inv-new')).toMatchObject({ outstandingCents: 0, status: 'paid' });
  });

  it('orders undated invoices behind dated ones by creation', () => {
    const ordered = fifoOrder([
      { id: 'c', createdAt: new Date('2026-08-01') },
      { id: 'a', issuedAt: new Date('2026-01-01') },
      { id: 'b', dueAt: new Date('2026-04-01') },
    ]);
    expect(ordered.map((invoice) => invoice.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('Happy Monday projection', () => {
  it('names the gap when repo prices cannot reproduce the portal total', () => {
    const lines = happyMonday.buildLines({
      id: 'order-1',
      items: { 1: 2 }, // Egg Salad Sandwich @ $5.85
      total_cents: 1400,
    });

    expect(lines[0]).toMatchObject({ sku: 'hm-item-1', quantity: 2, totalCents: 1170 });
    expect(lines[1]).toMatchObject({ lineType: 'reconciliation', totalCents: 230 });
  });

  it('carries credit adjustments as their own negative line', () => {
    const lines = happyMonday.buildLines({
      id: 'order-2',
      items: { 1: 1 },
      adjustments: [{ amount_cents: -100, description: 'Short delivery' }],
      total_cents: 485,
    });

    expect(lines.find((line) => line.lineType === 'adjustment')).toMatchObject({
      name: 'Short delivery',
      totalCents: -100,
    });
    expect(lines.some((line) => line.lineType === 'reconciliation')).toBe(false);
  });

  it('maps portal statuses without contradicting invoice balances', () => {
    expect(happyMonday.orderStatus('paid')).toBe('paid');
    expect(happyMonday.orderStatus('partial')).toBe('partially_paid');
    expect(happyMonday.orderStatus('unpaid')).toBe('booked');
    expect(happyMonday.invoiceSettlement({
      status: 'paid',
      totalCents: 10000,
      allocatedCents: 0,
    })).toEqual({ status: 'paid', outstandingCents: 0 });
    expect(happyMonday.invoiceSettlement({
      status: 'unpaid',
      totalCents: 10000,
      allocatedCents: 2500,
    })).toEqual({ status: 'partially_paid', outstandingCents: 7500 });
    expect(happyMonday.invoiceSettlement({
      status: 'unpaid',
      totalCents: 10000,
      allocatedCents: 0,
    })).toEqual({ status: 'issued', outstandingCents: 10000 });
    expect(happyMonday.invoiceSettlement({
      status: 'refunded',
      totalCents: 10000,
      allocatedCents: 10000,
    })).toEqual({ status: 'void', outstandingCents: 0 });
  });
});

describe('small events projection', () => {
  it('treats an unconfirmed estimate as pipeline, not booked work', () => {
    expect(smallEvents.orderStatus({ status: 'draft' })).toBe('quoted');
    expect(smallEvents.orderStatus({ status: 'confirmed' })).toBe('booked');
    expect(smallEvents.orderStatus({ status: 'expired' })).toBe('expired');
  });

  it('prices the event line from the estimate subtotal', () => {
    const lines = smallEvents.buildLines({
      id: 'estimate-1',
      type: 'dinner',
      guestCount: 8,
      subtotalCents: 120000,
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ totalCents: 120000, name: 'dinner — 8 guests' });
  });
});

describe('localist membership terms', () => {
  it('keeps dues terms provider-neutral and waived members at zero', () => {
    expect(localist.TIER_TERMS.monthly).toMatchObject({ cadence: 'monthly', recurringBaseCents: 4500 });
    expect(localist.TIER_TERMS.annual).toMatchObject({ cadence: 'annual', recurringBaseCents: 37500 });
    expect(localist.TIER_TERMS.waived).toMatchObject({ cadence: 'none', recurringBaseCents: 0 });
  });

  it('maps roster states onto subscription lifecycle states', () => {
    expect(localist.subscriptionStatus('checkout_started')).toBe('pending');
    expect(localist.subscriptionStatus('active')).toBe('active');
    expect(localist.subscriptionStatus('cancelled')).toBe('canceled');
  });
});
