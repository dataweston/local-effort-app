import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { parseConfirmationEmail, toVendorLinesDetailed } = require('../amazonOrders');

// Invented order identifiers, products, seller names, and prices; no customer/order evidence.
const confirmation = ({ orderTotal = '$18.50' } = {}) => [
  'TOTAL', '$18.50',
  'Order Confirmation',
  'Order #', '999-1234567-1234567',
  'Order 1 of 1',
  'View or manage order',
  'Organic Cane Sugar 5 lb', 'Grocery', '$4.25', 'Qty: 2', '$8.50',
  'Kitchen Storage Bin', 'Home & Kitchen', '$10.00', 'Qty: 1', '$10.00',
  'Order Total:', orderTotal,
  'To learn more about ordering',
];

describe('Amazon order confirmations', () => {
  it('parses confirmed food and nonfood lines, quantity pricing, pack size, and exact reconciliation', () => {
    const parsed = parseConfirmationEmail(confirmation(), { date: '2026-01-02' });

    expect(parsed.orders).toHaveLength(1);
    const [order] = parsed.orders;
    expect(order).toMatchObject({
      orderId: '999-1234567-1234567',
      purchasedAt: '2026-01-02',
      parseState: 'parsed',
      priced: true,
      reconciliation: {
        linesCents: 1850,
        orderTotalCents: 1850,
        taxShippingCents: 0,
        state: 'exact',
        exact: true,
      },
    });
    expect(order.items.map(({ title, kind, quantity, unitPriceCents, lineTotalCents }) => ({ title, kind, quantity, unitPriceCents, lineTotalCents }))).toEqual([
      { title: 'Organic Cane Sugar 5 lb', kind: 'food', quantity: 2, unitPriceCents: 425, lineTotalCents: 850 },
      { title: 'Kitchen Storage Bin', kind: 'other', quantity: 1, unitPriceCents: 1000, lineTotalCents: 1000 },
    ]);

    const detail = toVendorLinesDetailed(order);
    expect(detail).toMatchObject({ excluded: { count: 1, cents: 1000 }, unpriced: { count: 0 }, noPack: 0 });
    expect(detail.lines).toHaveLength(1);
    expect(detail.lines[0]).toMatchObject({
      description: 'Organic Cane Sugar 5 lb',
      packText: '5 lb',
      quantity: 2,
      unitPriceCents: 425,
      lineTotalCents: 850,
    });
  });

  it('requires review and emits no candidate lines when the printed order total materially disagrees', () => {
    const [order] = parseConfirmationEmail(confirmation({ orderTotal: '$30.00' })).orders;

    expect(order).toMatchObject({
      parseState: 'review_required',
      reasons: ['order_total_mismatch'],
      reconciliation: { linesCents: 1850, orderTotalCents: 3000, state: 'mismatch', exact: false },
    });
    expect(toVendorLinesDetailed(order).lines).toEqual([]);
  });
});
