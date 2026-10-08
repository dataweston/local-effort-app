import { describe, expect, it } from 'vitest';

const { VENDORS, parseOrderEmail, toVendorLines, toVendorLinesDetailed } = require('../htmlOrders');
const catalog = require('../../catalog');

// Synthetic documents (invented shops, people and addresses) in the shape of each vendor's e-mail.
const html = (...cells) => `<html><head><style>.x{color:red}</style></head><body>${cells.map((cell) => `<div>${cell}</div>`).join('')}</body></html>`;

const meadowlark = ({ orderId = '1001', items, shipping = '$10.00', tax = '$0.00', subtotal, total, head } = {}) =>
  html(
    head || `Your Order #${orderId} Has Been Placed`,
    'Your order from Prairie Test Mill is confirmed.',
    'Order Summary',
    `Order #${orderId}`,
    'Placed on March 3, 2024 at 6:51 PM CST',
    'Create an account to manage your orders.',
    ...items.flatMap(([name, lineTotal, sku, variant, qty, unit]) => [name, lineTotal, sku, ...variant, `Qty: ${qty}`, `${unit} / Item`]),
    'Subtotal',
    subtotal,
    'Shipping',
    shipping,
    'Sales Tax',
    tax,
    'Total',
    total,
    'Paid with Visa ending in 0000',
    'Jane Example, 1 Sample Rd, Nowhere, MN 55000',
  );

const MEADOWLARK_ITEMS = [
  ['Test Black Beans', '$12.00', 'TB-5', ['Size: 5 lb'], 1, '$12.00'],
  ['Test Flour', '$45.00', 'TF-15', ['Type: Bolted', 'Weight: 15 lbs'], 2, '$22.50'],
];

const olive = ({ items, subtotal, total }) =>
  html(
    'Order Confirmation',
    'Order SPR1000000001',
    'March 27, 2026',
    'View Order Status >',
    ...items.flatMap(([name, qty, price]) => [name, `x ${qty}`, price]),
    'Subtotal',
    subtotal,
    'Total',
    total,
    'Payment Info',
  );

const goose = ({ items, subtotal, shipping, taxes = '$0.00', total, saved }) =>
  html(
    'Thank you for your order!',
    'Order #9001',
    'Order summary',
    ...items.flat(),
    'Subtotal',
    subtotal,
    'Shipping',
    shipping,
    'Taxes',
    taxes,
    'Total',
    `${total} USD`,
    ...(saved ? ['You saved', saved] : []),
  );

describe('parseOrderEmail: Shopify-style order confirmations', () => {
  it('parses Meadowlark lines, pack text from Size/Weight, and reconciles subtotal + shipping + tax to the total', () => {
    const order = parseOrderEmail({
      vendorKey: 'meadowlark',
      messageId: 'm1',
      html: meadowlark({ items: MEADOWLARK_ITEMS, subtotal: '$57.00', total: '$67.00' }),
    });
    expect(order.parseState).toBe('parsed');
    expect(order.orderId).toBe('1001');
    expect(order.purchasedAt).toBe('2024-03-03');
    expect(order.lines.map((line) => [line.sku, line.packText, line.quantity, line.unitPriceCents, line.lineTotalCents])).toEqual([
      ['TB-5', '5 lb', 1, 1200, 1200],
      ['TF-15', '15 lb', 2, 2250, 4500],
    ]);
    expect(order.reconciliation).toMatchObject({ linesCents: 5700, expectedTotalCents: 6700, totalCents: 6700, exact: true });
  });

  it('never keeps buyer text: names, addresses and card digits are not in the parsed order', () => {
    const order = parseOrderEmail({
      vendorKey: 'meadowlark',
      messageId: 'm1',
      html: meadowlark({ items: MEADOWLARK_ITEMS, subtotal: '$57.00', total: '$67.00' }),
    });
    expect(JSON.stringify(order)).not.toMatch(/Jane Example|Sample Rd|0000/);
  });

  it('is review_required (no lines emitted) when the total is off by one cent', () => {
    const order = parseOrderEmail({
      vendorKey: 'meadowlark',
      messageId: 'm2',
      html: meadowlark({ items: MEADOWLARK_ITEMS, subtotal: '$57.00', total: '$67.01' }),
    });
    expect(order.parseState).toBe('review_required');
    expect(order.reasons).toEqual(['total_mismatch']);
    expect(toVendorLines(order)).toEqual([]);
  });

  it('is review_required when the lines do not add up to the printed subtotal', () => {
    const order = parseOrderEmail({
      vendorKey: 'meadowlark',
      messageId: 'm3',
      html: meadowlark({ items: MEADOWLARK_ITEMS, subtotal: '$58.00', total: '$68.00' }),
    });
    expect(order.parseState).toBe('review_required');
    expect(order.reasons).toEqual(['lines_subtotal_mismatch']);
  });

  it('is review_required when a line total is not quantity x the printed unit price', () => {
    const items = [['Test Flour', '$44.00', 'TF-15', ['Weight: 15 lbs'], 2, '$22.50']];
    const order = parseOrderEmail({ vendorKey: 'meadowlark', messageId: 'm4', html: meadowlark({ items, subtotal: '$44.00', total: '$54.00' }) });
    expect(order.parseState).toBe('review_required');
    expect(order.reasons).toContain('line_math_mismatch');
  });

  it('parses Olive Oil Lovers: $0 samples are counted not emitted, pack comes from the name, no pack stays null', () => {
    const order = parseOrderEmail({
      vendorKey: 'olive_oil_lovers',
      messageId: 'o1',
      html: olive({
        items: [
          ['Test Estate Arbequina 5L 2024 Harvest', 2, '$246.80'],
          ['Test Organic Picual', 1, '$32.95'],
          ['Free Sample (100 ml / 3.38 fl oz)', 1, '$0.00'],
        ],
        subtotal: '$279.75',
        total: '$279.75',
      }),
    });
    expect(order.parseState).toBe('parsed');
    expect(order.orderId).toBe('SPR1000000001');
    expect(order.purchasedAt).toBe('2026-03-27');
    const detail = toVendorLinesDetailed(order);
    expect(detail).toMatchObject({ freeSamples: 1, nonFood: 0, noPack: 1 });
    expect(detail.lines.map((line) => [line.packText, line.quantity, line.unitPriceCents, line.lineTotalCents])).toEqual([
      ['5 l', 2, 12340, 24680],
      [null, 1, 3295, 3295],
    ]);
  });

  it('is review_required when a multi-quantity line total is not a whole number of cents per unit', () => {
    const order = parseOrderEmail({
      vendorKey: 'olive_oil_lovers',
      messageId: 'o2',
      html: olive({ items: [['Test Oil 3L', 3, '$100.00']], subtotal: '$100.00', total: '$100.00' }),
    });
    expect(order.parseState).toBe('review_required');
    expect(order.reasons).toEqual(['unit_price_inexact']);
  });

  it('treats a Smoking Goose "You saved" shipping discount as part of the reconciliation', () => {
    const order = parseOrderEmail({
      vendorKey: 'smoking_goose',
      messageId: 'g1',
      date: 'Tue, 03 Feb 2026 15:04:05 +0000',
      html: goose({
        items: [
          ['Salame Cotto - Salame Cotto: Whole × 3', '$115.50'],
          ['Free Sample Request × 1', 'Free'],
        ],
        subtotal: '$115.50',
        shipping: '$36.86',
        total: '$115.50',
        saved: '$36.86',
      }),
    });
    expect(order.parseState).toBe('parsed');
    expect(order.purchasedAt).toBe('2026-02-03');
    const detail = toVendorLinesDetailed(order);
    expect(detail.freeSamples).toBe(1);
    expect(detail.lines).toHaveLength(1);
    expect(detail.lines[0]).toMatchObject({ description: 'Salame Cotto: Whole', unitPriceCents: 3850, quantity: 3, lineTotalCents: 11550, packText: null });
  });

  it('adds paid shipping to the Smoking Goose total, and flags an unexplained difference', () => {
    const base = { items: [['Test Salami - Whole × 1', '$30.00']], subtotal: '$30.00', shipping: '$12.00' };
    expect(parseOrderEmail({ vendorKey: 'smoking_goose', messageId: 'g2', date: '2026-03-28', html: goose({ ...base, total: '$42.00' }) }).parseState).toBe('parsed');
    const off = parseOrderEmail({ vendorKey: 'smoking_goose', messageId: 'g3', date: '2026-03-28', html: goose({ ...base, total: '$41.00' }) });
    expect(off.parseState).toBe('review_required');
    expect(off.reasons).toEqual(['total_mismatch']);
  });

  it('prices Browne Trading at the discount-adjusted amount actually paid, with the pack from the variant', () => {
    const order = parseOrderEmail({
      vendorKey: 'browne_trading',
      messageId: 'b1',
      date: new Date('2026-04-06T12:00:00Z'),
      html: html(
        'Thank you for your purchase!',
        'Order #21000',
        'Order summary',
        'Test White Shrimp × 3',
        'Frozen - 1 pound',
        'WELCOME-TESTCODE',
        '(-$9.90)',
        '$66.00',
        '$56.10',
        'Test Tuna Loin × 2',
        '$153.00',
        'Subtotal',
        '$209.10',
        'Shipping',
        '$0.00',
        'Taxes',
        '$0.00',
        'Total',
        '$209.10 USD',
        'You saved',
        '$9.90',
      ),
    });
    expect(order.parseState).toBe('parsed');
    expect(toVendorLines(order).map((line) => [line.description, line.packText, line.quantity, line.unitPriceCents, line.lineTotalCents])).toEqual([
      ['Test White Shrimp (Frozen - 1 pound)', '1 lb', 3, 1870, 5610],
      ['Test Tuna Loin', null, 2, 7650, 15300],
    ]);
  });

  it('is review_required when a line discount is not explained by the list and paid prices', () => {
    const order = parseOrderEmail({
      vendorKey: 'browne_trading',
      messageId: 'b2',
      date: '2026-04-06',
      html: html(
        'Thank you for your purchase!', 'Order #21001', 'Order summary',
        'Test Shrimp × 1', '(-$9.90)', '$66.00', '$55.00',
        'Subtotal', '$55.00', 'Shipping', '$0.00', 'Taxes', '$0.00', 'Total', '$55.00 USD', 'You saved', '$9.90',
      ),
    });
    expect(order.parseState).toBe('review_required');
    expect(order.reasons).toContain('discount_math_mismatch');
  });
});

describe('parseOrderEmail: other vendor formats', () => {
  it('parses Chocolate Alchemy (HTML or hard-wrapped text): equipment and shipping are not food lines, the message id is the document id', () => {
    const body = [
      'This email is to confirm your recent order.',
      'Date 04/12/2024',
      'Shipping address',
      'Jane Example',
      '1x Test Cocoa Butter - 8 oz for $ 15.75 each',
      '2x Test Nibs / Roasted / 5 lb for $ 20.00 each',
      '1x Center Nylon Cone Assembly for Test Melanger for $ 25.00 each',
      'Subtotal : $ 80.75 USD',
      'Shipping : $ 14.25 USD',
      'Total : $ 95.00 USD',
    ];
    const fromHtml = parseOrderEmail({ vendorKey: 'chocolate_alchemy', messageId: 'c1', html: html(...body) });
    expect(fromHtml.parseState).toBe('parsed');
    expect(fromHtml.orderId).toBe('c1');
    expect(fromHtml.purchasedAt).toBe('2024-04-12');
    const detail = toVendorLinesDetailed(fromHtml);
    expect(detail.nonFood).toBe(1);
    expect(detail.lines.map((line) => [line.packText, line.quantity, line.unitPriceCents, line.lineTotalCents])).toEqual([
      ['8 oz', 1, 1575, 1575],
      ['5 lb', 2, 2000, 4000],
    ]);

    const wrapped = body.map((line) => (line.startsWith('1x Test Cocoa') ? '* 1x Test Cocoa Butter - 8 oz for $\n15.75 each' : line)).join('\n');
    const fromText = parseOrderEmail({ vendorKey: 'chocolate_alchemy', messageId: 'c2', text: wrapped });
    expect(fromText.parseState).toBe('parsed');
    expect(fromText.lines).toHaveLength(3);
  });

  const verns = ({ total, items }) =>
    html(
      'Thank you. We have received your order.',
      '[Order #17000] (April 16, 2025)',
      'Product',
      'Quantity',
      'Price',
      ...items.flat(),
      'Subtotal:',
      '$80.00',
      'Shipping:',
      '$28.52 via 2nd Day Air (UPS)',
      'Payment method:',
      'Credit card',
      'Total:',
      total,
    );

  it("parses Vern's: pack from the name, unit = line total / quantity, cooler is non-food but part of the subtotal", () => {
    const items = [
      ['Test Shredded Mozzarella 5lb', '2', '$58.90'],
      ['Test Curds 8oz', '×1', '$10.10'],
      ['Cooler and Ice Packs', '1', '$11.00'],
    ];
    const order = parseOrderEmail({ vendorKey: 'verns_cheese', messageId: 'v1', html: verns({ items, total: '$108.52' }) });
    expect(order.parseState).toBe('parsed');
    expect(order.purchasedAt).toBe('2025-04-16');
    const detail = toVendorLinesDetailed(order);
    expect(detail.nonFood).toBe(1);
    expect(detail.lines.map((line) => [line.packText, line.quantity, line.unitPriceCents, line.lineTotalCents])).toEqual([
      ['5 lb', 2, 2945, 5890],
      ['8 oz', 1, 1010, 1010],
    ]);
    expect(order.reconciliation.exact).toBe(true);
    const off = parseOrderEmail({ vendorKey: 'verns_cheese', messageId: 'v2', html: verns({ items, total: '$108.00' }) });
    expect(off.parseState).toBe('review_required');
  });

  const goodAcre = (total) =>
    html(
      'Thank you for your order, this is for delivery on Monday.',
      '**Please note: This is NOT a final invoice.**',
      'Invoice# 30001',
      'Order Date: 7/17/2024',
      'Delivery Date: Monday, July 22, 2024',
      'Order Detail',
      'Item Name', 'Producer', 'Unit', 'Price', 'Qty', 'Total',
      'Test Cherries', 'Test Orchard', '20lb Case', '$100.60', '1', '$100.60',
      'Test Chicken, Whole', 'Test Farm - Co-op', '8 Whole Birds / 30lb Case Average', '$123.63', '2', '$247.26',
      'Order Total:',
      total,
      'Payments and Credits',
    );

  it('parses The Good Acre confirmations: case units are the pack, producer cells are ignored', () => {
    const order = parseOrderEmail({ vendorKey: 'good_acre', messageId: 'a1', html: goodAcre('$347.86') });
    expect(order.parseState).toBe('parsed');
    expect(order.orderId).toBe('30001');
    expect(order.purchasedAt).toBe('2024-07-17');
    expect(toVendorLines(order).map((line) => [line.packText, line.quantity, line.unitPriceCents, line.lineTotalCents])).toEqual([
      ['20 lb', 1, 10060, 10060],
      ['30 lb', 2, 12363, 24726],
    ]);
    expect(parseOrderEmail({ vendorKey: 'good_acre', messageId: 'a2', html: goodAcre('$347.85') }).parseState).toBe('review_required');
  });

  const alemar = (total, amount = '7.74') =>
    html(
      'Here is your invoice!',
      'Alemar Cheese Company',
      'Invoice',
      'Invoice #:',
      '2999',
      'Invoice Date:',
      '09/21/2022',
      'Date', 'Description', 'Quantity', 'Rate', 'Amount',
      '09/21/2022', 'WHOLESALE Test Bent', '4.54', '14.94', '67.83',
      '09/21/2022', 'WHOLESALE Cheese Test PRICE PER PIECE', '2', '3.872', amount,
      '09/21/2022', 'WHOLESALE Test Boom EACH', '2', '6.667', '13.33',
      'Total:',
      total,
    );

  it('parses Alemar invoices: weights are priced per lb, per-piece rows have no pack, 3-place rates round but totals stay exact', () => {
    const order = parseOrderEmail({ vendorKey: 'alemar', messageId: 'l1', html: alemar('$88.90') });
    expect(order.parseState).toBe('parsed');
    expect(order.orderId).toBe('2999');
    expect(order.purchasedAt).toBe('2022-09-21');
    expect(toVendorLines(order).map((line) => [line.packText, line.quantity, line.unitPriceCents, line.lineTotalCents])).toEqual([
      ['1 lb', 4.54, 1494, 6783],
      [null, 2, 387, 774],
      [null, 2, 667, 1333],
    ]);
    expect(parseOrderEmail({ vendorKey: 'alemar', messageId: 'l2', html: alemar('$88.90', '7.75') }).reasons).toContain('line_math_mismatch');
  });
});

describe('non-purchase documents', () => {
  it('skips refunds, cancellations and non-confirmation mail without emitting lines', () => {
    const refund = parseOrderEmail({ vendorKey: 'meadowlark', messageId: 'r1', html: html('Your refund for Order #1001 has been issued', 'Refund total $12.00') });
    expect(refund).toMatchObject({ parseState: 'skipped', skipReason: 'refund' });
    const cancelled = parseOrderEmail({ vendorKey: 'smoking_goose', messageId: 'r2', html: html('Your order #9001 has been cancelled', 'Order summary') });
    expect(cancelled).toMatchObject({ parseState: 'skipped', skipReason: 'cancelled' });
    const shipping = parseOrderEmail({ vendorKey: 'verns_cheese', messageId: 'r3', html: html('Your order has shipped', 'Tracking: 1Z') });
    expect(shipping).toMatchObject({ parseState: 'skipped', skipReason: 'not_order_confirmation' });
    for (const order of [refund, cancelled, shipping]) expect(toVendorLines(order)).toEqual([]);
  });

  it('rejects an unknown vendor key', () => {
    expect(() => parseOrderEmail({ vendorKey: 'nope', html: '' })).toThrow(/unknown vendor/);
  });
});

describe('candidate vendor lines', () => {
  const lines = () => [
    ...toVendorLines(parseOrderEmail({ vendorKey: 'meadowlark', messageId: 'm1', html: meadowlark({ items: MEADOWLARK_ITEMS, subtotal: '$57.00', total: '$67.00' }) })),
    ...toVendorLines(parseOrderEmail({ vendorKey: 'good_acre', messageId: 'a1', html: html(
      'Invoice# 1001', 'Order Date: 7/17/2024', 'Item Name', 'Producer', 'Unit', 'Price', 'Qty', 'Total',
      'Test Beets', 'Test Farm', '25 lb Case', '$37.58', '1', '$37.58', 'Order Total:', '$37.58',
    ) })),
  ];

  it('emits stable sourceKeys that do not collide across vendors even with the same order number', () => {
    const emitted = lines();
    expect(emitted.map((line) => line.sourceKey)).toEqual(['meadowlark|1001|1', 'meadowlark|1001|2', 'good-acre-confirmation|1001|1']);
    expect(new Set(emitted.map((line) => line.sourceKey)).size).toBe(emitted.length);
    expect(emitted.every((line) => line.source === 'vendor_invoice' && /^\d{4}-\d{2}-\d{2}$/.test(line.observedAt))).toBe(true);
    expect(emitted.map((line) => line.vendor)).toEqual(['Meadowlark Organics', 'Meadowlark Organics', 'The Good Acre']);
  });

  it('plans creates once and nothing on re-run (idempotent on source|sourceKey)', () => {
    const empty = { stockProducts: [], vendorItems: [], observationKeys: new Set() };
    const first = catalog.planVendorLines(lines(), empty);
    expect(first.errors).toEqual([]);
    expect(catalog.summarizePlan(first).observations).toEqual({ create: 3, existing: 0 });
    const again = catalog.planVendorLines(lines(), { ...empty, observationKeys: new Set(lines().map((line) => `${line.source}|${line.sourceKey}`)) });
    expect(catalog.summarizePlan(again).observations).toEqual({ create: 0, existing: 3 });
  });

  it('registers every vendor with a Gmail query and a canonical name', () => {
    for (const [key, vendor] of Object.entries(VENDORS)) {
      expect(vendor.key).toBe(key);
      expect(vendor.name).toMatch(/\S/);
      expect(vendor.gmailQuery).toMatch(/\S/);
    }
  });
});
