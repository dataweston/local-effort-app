import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import catalog from '../../catalog';
import eastside from '../eastsideReceipt';

const { planVendorLines } = catalog;
const { DEFAULT_EXCLUDED_DEPARTMENTS, buildVendorLines, parseEastsideReceipt, toVendorLines } = eastside;

// Synthetic reconstruction of the register markup: one <td> per monospace line, bold department headers.
const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'eastside', 'variants.html'), 'utf8');
const parse = (source = html) => parseEastsideReceipt({ html: source });
// Replace one register row's text (the fixture stores spaces as &nbsp;); fails loudly if the row is not found.
function edit(source, from, to) {
  const nb = (text) => text.replace(/ /g, '&nbsp;');
  if (!source.includes(nb(from))) throw new Error(`fixture row not found: ${from}`);
  return source.replace(nb(from), nb(to));
}
const byDescription = (receipt, description) => receipt.lines.find((line) => line.description === description);

describe('Eastside receipt parser', () => {
  it('ties merchandise plus discount rows to SUBTOTAL, and SUBTOTAL plus tax to TOTAL, exactly', () => {
    const receipt = parse();
    expect(receipt.parseState).toBe('parsed');
    expect(receipt.reasons).toEqual([]);
    expect(receipt.receiptSourceKey).toBe('eml:2024-06-03:123456');
    expect(receipt.purchasedAt).toBe('2024-06-03');
    expect(receipt.receiptNumber).toBe('123456');
    expect(receipt.lines.reduce((sum, line) => sum + line.lineTotalCents, 0)).toBe(receipt.subtotalCents);
    expect(receipt.subtotalCents + receipt.taxCents).toBe(receipt.totalCents);
  });

  it('parses each row variant: plu/upc, glued price, weighed, N @ P, N @ M/$P, wrapped names and wrapped departments', () => {
    const receipt = parse();
    expect(byDescription(receipt, 'Rolled Oats 5lb')).toMatchObject({ code: '12345', codeKind: 'plu', lineTotalCents: 799, department: 'Grocery' });
    expect(byDescription(receipt, 'Olive Oil Extra Virgin')).toMatchObject({ code: '052159123456', codeKind: 'upc', lineTotalCents: 1199 });
    expect(byDescription(receipt, 'BANANA ORGANIC')).toMatchObject({ weighed: true, unit: 'lb', quantity: 1.79, unitPriceCents: 99, lineTotalCents: 177 });
    expect(byDescription(receipt, 'Kale Green')).toMatchObject({ code: '726', quantity: 1 });
    expect(byDescription(receipt, 'Lime')).toMatchObject({ quantity: 2, unitPriceCents: 50, lineTotalCents: 100 });
    expect(byDescription(receipt, 'Yogurt Plain')).toMatchObject({ quantity: 4, lineTotalCents: 500 });
    expect(byDescription(receipt, 'Hot Soup 8 oz').department).toBe('Prepared Foods');
    expect(byDescription(receipt, 'Almond Butter Creamy')).toMatchObject({ department: 'Refrigerated', code: '1234567890123' });
  });

  it('classifies coupons, receipt-level discounts (including a one-decimal wrapped amount) and fees; none are merchandise', () => {
    const receipt = parse();
    const nonMerchandise = receipt.lines.filter((line) => line.kind !== 'merchandise');
    expect(nonMerchandise.map((line) => [line.description, line.kind, line.lineTotalCents])).toEqual([
      ['Paper Bag', 'fee', 10],
      ['Mfr. Coupon', 'coupon', -100],
      ['20% Employee', 'discount', -185],
      ['20% Employee Cpn', 'discount', -197],
    ]);
    // the employee discount is never allocated onto items
    expect(byDescription(receipt, 'Rolled Oats 5lb').discountCents).toBe(0);
    expect(byDescription(receipt, 'Rolled Oats 5lb').unitPriceCents).toBe(799);
  });

  it('keeps the SUBTOTAL tie when a REMOVED row follows an item the register still charged', () => {
    const receipt = parse();
    expect(receipt.lines.filter((line) => line.description === 'Kale Green')).toHaveLength(1);
    expect(receipt.parseState).toBe('parsed');
  });

  it('marks a one-cent SUBTOTAL difference review_required and emits zero lines', () => {
    const off = edit(html, 'SUBTOTAL $46.99', 'SUBTOTAL $47.00');
    const receipt = parse(off);
    expect(receipt.parseState).toBe('review_required');
    expect(receipt.reasons).toContain('subtotal_mismatch');
    expect(toVendorLines(receipt)).toEqual([]);
  });

  it.each([
    ['total_mismatch', (source) => edit(source, '>TOTAL $50.14', '>TOTAL $50.15')],
    ['unrecognized_rows', (source) => edit(source, '2 @ $0.50', '2 @ $0.50 each @ $0.50')],
    ['invalid_date', (source) => edit(source, '6/3/24', '13/45/24')],
    ['missing_receipt_number', (source) => edit(source, 'Receipt #:  123456', 'Receipt #:  ')],
    ['missing_subtotal', (source) => edit(source, 'SUBTOTAL $46.99', 'SUB TOTAL $46.99')],
  ])('refuses to import a receipt with %s', (reason, mutate) => {
    const receipt = parse(mutate(html));
    expect(receipt.parseState).toBe('review_required');
    expect(receipt.reasons).toContain(reason);
    expect(toVendorLines(receipt)).toEqual([]);
  });

  it('falls back to a content-hash source key when date or number is unreadable', () => {
    const receipt = parse(edit(html, '6/3/24', '13/45/24'));
    expect(receipt.receiptSourceKey).toMatch(/^eml:sha256:[0-9a-f]{16}$/);
  });

  it('records qty * unit price mismatches as a warning without failing the receipt', () => {
    const receipt = parse(edit(html, '2 @ $0.50', '2 @ $0.30'));
    expect(receipt.parseState).toBe('parsed');
    expect(receipt.reasons.some((reason) => reason.startsWith('warning:qty_price_mismatch'))).toBe(true);
  });
});

describe('Eastside vendor lines', () => {
  it('emits weighed lines as a 1 lb pack at the per-lb price with pounds as quantity', () => {
    const banana = toVendorLines(parse()).find((line) => line.description === 'BANANA ORGANIC');
    expect(banana).toMatchObject({ packText: '1 lb', unitPriceCents: 99, quantity: 1.79, lineTotalCents: 177, sku: '4011' });
  });

  it('uses one-unit price for N @ P lines and a derived unit for N @ M/$P', () => {
    const lines = toVendorLines(parse());
    expect(lines.find((line) => line.description === 'Lime')).toMatchObject({ unitPriceCents: 50, quantity: 2, lineTotalCents: 100 });
    expect(lines.find((line) => line.description === 'Yogurt Plain')).toMatchObject({ unitPriceCents: 125, quantity: 4, lineTotalCents: 500 });
    expect(lines.find((line) => line.description === 'Almond Butter Creamy')).toMatchObject({ unitPriceCents: 849, quantity: 1 });
  });

  it('states a pack only when unambiguous: lb token yes, ounces / # / sizes null', () => {
    const lines = toVendorLines(parse());
    expect(lines.find((line) => line.description === 'Rolled Oats 5lb').packText).toBe('5 lb');
    expect(lines.find((line) => line.description === 'Hot Soup 8 oz').packText).toBeNull();

    const make = (description) => ({
      receiptSourceKey: 'eml:2024-01-01:000001',
      purchasedAt: '2024-01-01',
      parseState: 'parsed',
      lines: [{ index: 0, department: 'Grocery', code: '123', codeKind: 'plu', description, quantity: 1, unit: 'each', unitPriceCents: 500, lineTotalCents: 500, weighed: false, discountCents: 0, kind: 'merchandise' }],
    });
    for (const description of ['Whole Milk 128oz', 'Carrot 2# Bag', 'Size 5 Diapers']) {
      const built = buildVendorLines(make(description));
      expect(built.lines[0].packText).toBeNull();
      expect(built.stats.ambiguousPack).toBe(1);
      // null must stay "no pack" in the catalog, not fall back to reading the description
      expect(planVendorLines(built.lines, { stockProducts: [], vendorItems: [], observationKeys: new Set() }).vendorItems.create[0].packBaseQuantity).toBeNull();
    }
    expect(buildVendorLines(make('Plain Yogurt')).stats.ambiguousPack).toBe(0);
  });

  it('never emits fees, coupons, discounts, or non-food departments, and reports the exclusions', () => {
    const built = buildVendorLines(parse());
    const descriptions = built.lines.map((line) => line.description);
    expect(descriptions).not.toContain('Paper Bag');
    expect(descriptions).not.toContain('Mfr. Coupon');
    expect(descriptions).not.toContain('Rasp Drink Mix');
    expect(descriptions).toContain('Hot Soup 8 oz'); // prepared food is kept
    expect(built.stats.excludedByDepartment).toEqual({ HBC: 1 });
    expect(built.stats.preparedLines).toBe(1);
    expect(DEFAULT_EXCLUDED_DEPARTMENTS).toContain('HBC');
    expect(toVendorLines(parse(), { excludeDepartments: [] }).map((line) => line.description)).toContain('Rasp Drink Mix');
  });

  it('produces stable, unique source keys across two runs', () => {
    const first = toVendorLines(parse()).map((line) => line.sourceKey);
    const second = toVendorLines(parse()).map((line) => line.sourceKey);
    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(first.length);
    expect(first[0]).toBe('eml:2024-06-03:123456:0');
  });

  it('carries no personal data fields', () => {
    const receipt = parse();
    const text = JSON.stringify({ receipt, lines: toVendorLines(receipt) });
    expect(text).not.toMatch(/clerk|member|owner|account|balance|card|Test Clerk|Example Street|555-0100/i);
    for (const line of toVendorLines(receipt)) {
      expect(Object.keys(line).sort()).toEqual(['description', 'lineTotalCents', 'observedAt', 'packText', 'quantity', 'sku', 'source', 'sourceKey', 'unitPriceCents', 'vendor']);
    }
  });

  it('is accepted by planVendorLines without errors and is idempotent against its own result', () => {
    const lines = toVendorLines(parse());
    const plan = planVendorLines(lines, { stockProducts: [], vendorItems: [], observationKeys: new Set() });
    expect(plan.errors).toEqual([]);
    expect(plan.observations.create).toHaveLength(lines.length);
    expect(plan.observations.create.every((row) => row.source === 'receipt_eastside')).toBe(true);
    const keys = new Set(plan.observations.create.map((row) => `${row.source}|${row.sourceKey}`));
    const vendorItems = plan.vendorItems.create.map(({ stockKey, ...row }) => ({ id: `v-${row.identityKey}`, ...row, status: 'unmapped', stockProduct: null }));
    const again = planVendorLines(lines, { stockProducts: [], vendorItems, observationKeys: keys });
    expect(again.errors).toEqual([]);
    expect(again.observations.create).toEqual([]);
    expect(again.observations.existing).toBe(lines.length);
  });
});
