import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { classify, parseCostcoReceipt, toVendorLinesDetailed } = require('../costcoReceipts');

// Synthetic register tape (invented store, numbers and ids).
const HEAD = ['SAMPLE WAREHOUSE #901', '1 TEST WAY', 'TESTVILLE, XX 00000', '10090100100012601021200', 'Member', '900000000001'];
const TAIL = (subtotal, tax, total, extra = []) => [
  `SUBTOTAL  ${subtotal}`,
  `TAX  ${tax}`,
  `****  TOTAL  ${total}`,
  'CHIP',
  'APPROVED - PURCHASE',
  `AMOUNT: $${total}`,
  '01/02/2026 12:00 901 4 55 14',
  'TOTAL NUMBER OF ITEMS SOLD = 5',
  'INSTANT SAVINGS  $2.00',
  ...extra,
];
const BODY = [
  '3 @ 2.50',
  'E  200100 ORG. TEST OATS  7.50 N',
  '300200 TEST STORAGE BIN  12.00 Y',
  '600500  #300200  2.00-',
  'ORG ROLLED',
  'E  500400  5.50 N',
  'OATS 2LB',
];
const receipt = (body = BODY, tail = TAIL('23.00', '0.95', '23.95')) => [[...HEAD, ...body, ...tail]];

describe('parseCostcoReceipt', () => {
  it('parses items, quantity rows, wrapped descriptions and instant savings, reconciling to the cent', () => {
    const parsed = parseCostcoReceipt(receipt());
    expect(parsed).toMatchObject({
      parseState: 'parsed',
      receiptId: '10090100100012601021200',
      storeNumber: '901',
      purchasedAt: '2026-01-02',
      reasons: [],
      summary: { subtotalCents: 2300, taxCents: 95, totalCents: 2395, savingsCents: 200, itemsSold: 5 },
      reconciliation: { itemsCents: 2300, exact: true },
    });
    expect(parsed.items.map((i) => [i.index, i.sku, i.description, i.quantity, i.unitPriceCents, i.lineTotalCents])).toEqual([
      [1, '200100', 'ORG. TEST OATS', 3, 250, 750],
      [2, '300200', 'TEST STORAGE BIN', 1, 1000, 1000], // 12.00 less the 2.00 coupon
      [3, '500400', 'ORG ROLLED OATS 2LB', 1, 550, 550],
    ]);
  });

  it('classifies food by the E marker and names, and keeps non-food out of the catalog lines but counts it', () => {
    const parsed = parseCostcoReceipt(receipt());
    expect(parsed.items.map((i) => i.kind)).toEqual(['merchandise', 'non_food', 'merchandise']);
    const { lines, excluded, noPack } = toVendorLinesDetailed(parsed);
    expect(lines).toEqual([
      { sourceKey: 'costco|10090100100012601021200|1', source: 'vendor_invoice', vendor: 'Costco', sku: '200100', description: 'ORG. TEST OATS', packText: null, observedAt: '2026-01-02', unitPriceCents: 250, quantity: 3, lineTotalCents: 750 },
      { sourceKey: 'costco|10090100100012601021200|3', source: 'vendor_invoice', vendor: 'Costco', sku: '500400', description: 'ORG ROLLED OATS 2LB', packText: '2 lb', observedAt: '2026-01-02', unitPriceCents: 550, quantity: 1, lineTotalCents: 550 },
    ]);
    expect(excluded).toEqual({ count: 1, cents: 1000, descriptions: ['TEST STORAGE BIN'] });
    expect(noPack).toBe(1);
    expect(toVendorLinesDetailed(parsed, { includeNonFood: true }).lines.map((l) => l.sourceKey.split('|')[2])).toEqual(['1', '2', '3']);
  });

  it('refuses to emit lines when the items do not reconcile to the printed subtotal', () => {
    const parsed = parseCostcoReceipt(receipt(BODY, TAIL('23.10', '0.95', '24.05')));
    expect(parsed.parseState).toBe('review_required');
    expect(parsed.reasons).toContain('subtotal_mismatch');
    expect(toVendorLinesDetailed(parsed).lines).toEqual([]);
  });

  it('flags an item quantity row that does not multiply to the printed amount, and a total that is not subtotal + tax', () => {
    const bad = parseCostcoReceipt(receipt(['3 @ 2.40', ...BODY.slice(1)]));
    expect(bad.reasons).toContain('quantity_mismatch:1');
    const total = parseCostcoReceipt(receipt(BODY, TAIL('23.00', '0.95', '23.96')));
    expect(total.reasons).toEqual(['total_mismatch']);
  });

  it('flags a coupon that references no item on the receipt', () => {
    const parsed = parseCostcoReceipt(receipt(BODY.map((row) => (row.includes('#300200') ? '600500  #999999  2.00-' : row))));
    expect(parsed.reasons).toContain('orphan_savings:999999');
  });

  it('returns skipped for text that is not a receipt', () => {
    expect(parseCostcoReceipt([['Orders & Purchases', 'Thank you for shopping']]).parseState).toBe('skipped');
  });

  it('accepts a flat row array and derives the receipt id from the transaction line when no barcode prints', () => {
    const head = HEAD.filter((row) => !/^\d{18,}$/.test(row));
    const rows = [...head, ...BODY, ...TAIL('23.00', '0.95', '23.95', ['Whse: 901  Trm: 4  Trn: 55  OPT: 14'])];
    expect(parseCostcoReceipt(rows).receiptId).toBe('901-4-55-20260102');
  });
});

describe('classify', () => {
  it('trusts the E marker, then names, and never guesses on an unrecognised row', () => {
    expect(classify('MYSTERY ITEM', true)).toEqual({ food: true, reason: 'ebt_eligible' });
    expect(classify('NITRILE MED', false).food).toBe(false);
    expect(classify('KS OLIVE OIL 2L', false).food).toBe(true);
    expect(classify('8QT ROUND', false)).toEqual({ food: false, reason: 'unrecognised' });
  });
});
