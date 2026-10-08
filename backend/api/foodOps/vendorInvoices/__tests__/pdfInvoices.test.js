import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { classifyDocument, dedupeInvoices, parseDocument, processVendor, toVendorLines, VENDORS, flattenPages } = require('../pdfInvoices');
const { parsePackText } = require('../../units');

// Synthetic documents in the text shape pdfToTextLines produces (invented names, addresses, amounts).

const GREAT_CIAO = [
  'Cheese Importers Co.',
  '100 Example Way, Testville, ZZ 00000',
  'Invoice Number  900001',
  'Invoice Date',
  '5/11/23',
  'Quant. Unit  Item  Description  Price  Total',
  '3.00 EACH  1CF1TESTBRIE200  TEST BRIE, TRIPLE CREAM COW, FRANCE, 6 X 200 G  13.20  39.60',
  '3.95 LB  1CI2TESTPEC  PECORINO TEST, SHEEP, ITALY, 2 KG  17.95  70.90',
  '16.00EACH  1BWTEST1LB  TEST BUTTER UNSALTED, WISCONSIN, 36 X 1 LB  5.20  83.20',
  '1.00 4/CS  1CATESTRIC3  TEST RICOTTA, TINS, 4 X 3 LB  46.84  46.84',
  '1.00 3/CS  1CF1TESTSAVLINCETBRILLAT SAVARIN, COW, 3 X 500 G  54.39  54.39',
  '4.00 <Each>  DISCOUNT  PROMOTION DISCOUNT  4.32  -17.28',
  'LB  1MSTESTCOP  TEST COPPA, INDIANA, 3 LB  23.80',
  '1.00 EACH  1SPTEST  SPREAD TEST, SPAIN,  8.00  8.00',
  '800 G',
  'Invoice total...  $  285.26',
  '5/12/23 12:21 PM',
];
// 39.60 + 70.90 + 83.20 + 46.84 + 54.39 + 8.00 - 17.28 = 285.65 ... keep the fixture exact below.
GREAT_CIAO[GREAT_CIAO.indexOf('Invoice total...  $  285.26')] = 'Invoice total...  $  285.65';

const BAKERS_FIELD = [
  'Invoice',
  "Baker's Field Flour & Bread",
  '1 Mill Road, Exampleton, ZZ 00000',
  'Date  Invoice #',
  '5/19/2025  70001',
  'Description  Qty  Rate  Amount',
  'Red Fife Sifted Flour  25  1.90  47.50',
  'Rye Flour Whole  0  1.60  0.00',
  'Spelt Flour  50  1.20  60.00',
  'Shipping (Regular)  10.00  10.00',
  'Credit Card Service Fee for Invoice Totals $100-$250  6.00  6.00',
  'Total  $123.50',
  'Payments/Credits  $0.00',
  'Balance Due  $123.50',
];

const GOOD_ACRE_ACTIVITY = [
  'The Good Acre',
  '1 Farm Rd',
  'INVOICE',
  'BILL TO  INVOICE # 5001',
  'Sample Grocer  DATE 11/07/2022',
  'DUE DATE 11/27/2022',
  'ACTIVITY  QTY  RATE  AMOUNT',
  'Wholesale:Wholesale LFM:Vegetables Organic  1  31.46  31.46',
  'carrots',
  'Wholesale:Wholesale LFM:Vegetables Organic  2  10.00  20.00',
  'onions',
  'BALANCE DUE',
  '$51.46',
];

const GOOD_ACRE_ITEM = [
  'Invoice #INV900',
  'Date: 8/28/2024',
  'Terms: Net 15  USD 63.00',
  'Item  Description  Qty  Rate  Amount',
  'Beet, Red  1  37.58  37.58',
  'Eggs, Shell, 1 Dozen, Large  2  5.45  10.90',
  'Squash, Summer, Zucchini,',
  '1  14.52  14.52',
  'Green',
  'Subtotal 63.00',
  'Tax 0.00',
  'Total USD 63.00',
];

const GOOD_ACRE_OPENING_BALANCE = [
  'Invoice #27000',
  'Date: 4/30/2024',
  'Terms: Net 30  USD 162.43',
  'Item  Description  Qty  Rate  Amount',
  '2 -Beet, Red, OG',
  'Opening Balance Item AR  1  162.43  162.43',
  'Total USD 162.43',
];

const MAD_ROSE_DIRECT = [
  'Mad Rose Specialty Foods',
  'INVOICE #:  F90001',
  'DATE:  12/23/2022',
  'Item  Description  Qty  List Price  Disc  Rate  Amt',
  'Sciappa 1L 2021  Test Olive Oil "Olio Test"  2  $20.75  0%  $20.75  $41.50',
  'IT-ARM-01-',
  '211L  2021 Armato 1L [12/cs]',
  'Lot: 05022024',
  'Spaghettoni 500gr  Test Pasta  1  $8.20  10%  $7.38  $7.38',
  'IT-CEN-04  Pasta 500gr [24/cs]',
  'Bee Pollen 500gr  Test Pollen  2  $8.847  0%  $8.847  $17.69',
  'IT-BNC-14-22  Polline 500gr [6/cs]',
  'Ancient Grain Flour  Test Flour  1  $10.00  0%  $10.00  $10.00',
  'IT-BEA-12K  Flour 1kg [1/cs]',
  'Honey Mixed  Test Honey  1  $9.00  0%  $9.00  $9.00',
  'IT-BNC-02  Honey [6/cs]',
  '6',
  'SUBTOTAL  $85.57',
  'SHIPPING  $12.00',
  'TOTAL  $97.57',
  'PAYMENTS',
  'BALANCE',
];

const MAD_ROSE_SALES_ORDER = ['Mad Rose Specialty Foods', 'Sales Order  SO-186', 'Item  Description  Qty  Rate  Amount'];

const HAFA = [
  'Example Farmers Cooperative',
  'Invoice',
  'INVOICE #  DATE  TOTAL DUE  DUE DATE  TERMS  ENCLOSED',
  '20260101  07/24/2026  $49.50  08/23/2026  Net 30',
  'DATE  ACTIVITY  QTY  RATE  AMOUNT',
  '07/24/2026  Cabbage, Green, lbs  15  1.30  19.50',
  '07/24/2026  Cucumber, Pickle, #  10  2.00  20.00',
  '07/24/2026  Herbs, Cilantro, BC  5  2.00  10.00',
  '5 bunches in 1/2 box',
  'SUBTOTAL  49.50',
  'TAX  0.00',
  'TOTAL  49.50',
  'BALANCE DUE',
  '$49.50',
];

describe('Great Ciao', () => {
  const doc = parseDocument('greatciao', GREAT_CIAO);

  it('reconciles exactly including the DISCOUNT row, skipping rows with no total', () => {
    expect(doc).toMatchObject({ parseState: 'parsed', invoiceNumber: '900001', invoiceDate: '2023-05-11', totalCents: 28565, skipped: { noQuantity: 1 } });
    expect(doc.adjustments).toEqual([{ kind: 'discount', cents: -1728 }]);
    expect(doc.itemsCents + doc.adjustmentsCents).toBe(doc.totalCents);
  });

  it('prices EACH rows per inner unit, /CS rows per case and weighed rows per lb', () => {
    const lines = toVendorLines(doc);
    const byKey = Object.fromEntries(lines.map((line) => [line.sourceKey, line]));
    expect(byKey['greatciao|900001|1']).toMatchObject({ sku: '1CF1TESTBRIE200', packText: '200 g', quantity: 3, unitPriceCents: 1320, lineTotalCents: 3960 });
    expect(byKey['greatciao|900001|2']).toMatchObject({ packText: '1 lb', quantity: 3.95, unitPriceCents: 1795, lineTotalCents: 7090 });
    expect(byKey['greatciao|900001|3']).toMatchObject({ packText: '1 lb', quantity: 16, unitPriceCents: 520 });
    expect(byKey['greatciao|900001|4']).toMatchObject({ packText: '4 x 3 lb', quantity: 1, unitPriceCents: 4684 });
    expect(byKey['greatciao|900001|5']).toMatchObject({ packText: '3 x 500 g' });
    expect(byKey['greatciao|900001|6']).toMatchObject({ packText: '800 g', description: expect.stringContaining('SPREAD TEST') });
    for (const line of lines) {
      expect(line).toMatchObject({ source: 'vendor_invoice', vendor: VENDORS.greatciao.name, observedAt: '2023-05-11' });
      expect(parsePackText(line.packText)).not.toBeNull();
    }
  });

  it('keeps the case pack for case units', () => {
    const caseDoc = parseDocument('greatciao', GREAT_CIAO.map((line) => line.replace('3.00 EACH', '3.00 6/CS')));
    expect(toVendorLines(caseDoc)[0].packText).toBe('6 x 200 g');
  });

  it('needs the printed total to match', () => {
    const bad = parseDocument('greatciao', GREAT_CIAO.map((line) => line.replace('285.65', '285.66')));
    expect(bad).toMatchObject({ parseState: 'review_required', reasons: ['total_mismatch'] });
    expect(toVendorLines(bad)).toEqual([]);
  });

  it('flags a row whose quantity x price disagrees with its total', () => {
    const bad = parseDocument('greatciao', GREAT_CIAO.map((line) => line.replace('13.20  39.60', '13.20  39.00')));
    expect(bad.reasons).toContain('line_math_mismatch');
  });

  it('classifies quotes and statements as non-invoices', () => {
    expect(classifyDocument('greatciao', ['Quote Number:  406', 'Quant. Unit  Item  Description  Price  Total', 'x'.repeat(60)], 'Quote # 406.PDF')).toBe('quote');
    expect(classifyDocument('greatciao', ['Great Ciao', 'Statement', 'x'.repeat(60)], 'abc.pdf')).toBe('statement');
    expect(classifyDocument('greatciao', GREAT_CIAO, 'Invoice # 900001.PDF')).toBe('invoice');
  });
});

describe("Baker's Field", () => {
  const doc = parseDocument('bakersfield', BAKERS_FIELD);

  it('counts shipping and card fees in the reconciliation and skips $0 rows', () => {
    expect(doc).toMatchObject({ parseState: 'parsed', invoiceNumber: '70001', invoiceDate: '2025-05-19', totalCents: 12350 });
    expect(doc.adjustments).toEqual([{ kind: 'shipping', cents: 1000 }, { kind: 'fee', cents: 600 }]);
    expect(doc.items.filter((item) => item.kind === 'free_sample')).toHaveLength(1);
  });

  it('emits per-lb lines whose index counts the skipped row', () => {
    const lines = toVendorLines(doc);
    expect(lines).toEqual([
      expect.objectContaining({ sourceKey: 'bakersfield|70001|1', description: 'Red Fife Sifted Flour', packText: '1 lb', quantity: 25, unitPriceCents: 190, lineTotalCents: 4750, observedAt: '2025-05-19' }),
      expect.objectContaining({ sourceKey: 'bakersfield|70001|3', description: 'Spelt Flour', packText: '1 lb', quantity: 50, unitPriceCents: 120, lineTotalCents: 6000 }),
    ]);
  });

  it('sends a total that does not reconcile to review', () => {
    const bad = parseDocument('bakersfield', BAKERS_FIELD.map((line) => line.replace('Total  $123.50', 'Total  $133.50')));
    expect(bad).toMatchObject({ parseState: 'review_required', reasons: ['total_mismatch'] });
  });

  it("recognises another vendor's invoice by layout and brand, not by file name alone", () => {
    const other = ['Invoice', 'Red Table Meat Co, LLC', 'Date  Invoice #', '1/1/2025  1', 'Description  Qty  Rate  Amount'];
    expect(classifyDocument('bakersfield', [...other, 'x'.repeat(60)], 'Inv_1_from_Red_Table_Meat_Co_LLC.pdf')).toBe('other_vendor');
    expect(classifyDocument('bakersfield', BAKERS_FIELD, 'Inv_70001_from_Bakers_Field_Flour__Bread.pdf')).toBe('invoice');
  });
});

describe('The Good Acre', () => {
  it('reads the QuickBooks activity layout: product name on the line after each amount row', () => {
    const doc = parseDocument('goodacre', GOOD_ACRE_ACTIVITY);
    expect(doc).toMatchObject({ parseState: 'parsed', invoiceNumber: '5001', invoiceDate: '2022-11-07', totalCents: 5146 });
    expect(doc.items.map((item) => [item.description, item.quantity, item.unitPriceCents, item.packText])).toEqual([
      ['carrots', 1, 3146, null],
      ['onions', 2, 1000, null],
    ]);
  });

  it('reads the item layout with wrapped item names, pack text from "1 Dozen" and the printed subtotal', () => {
    const doc = parseDocument('goodacre', GOOD_ACRE_ITEM);
    expect(doc).toMatchObject({ parseState: 'parsed', invoiceNumber: 'INV900', invoiceDate: '2024-08-28', totalCents: 6300, subtotalCents: 6300 });
    expect(doc.items.map((item) => [item.description, item.packText])).toEqual([
      ['Beet, Red', null],
      ['Eggs, Shell, 1 Dozen, Large', '1 dozen'],
      ['Squash, Summer, Zucchini, Green', null],
    ]);
  });

  it('halves the item name the newer layout prints twice', () => {
    const doc = parseDocument('goodacre', [
      '#INV901',
      'PO Number  Invoice Date  Terms  Due Date',
      '3/11/2025  Net 15  3/26/2025',
      'Item  Description  Qty  Rate  Amount',
      'Beet, Red Beet, Red  1  $37.58  $37.58',
      'Total  $37.58',
    ]);
    expect(doc).toMatchObject({ parseState: 'parsed', invoiceDate: '2025-03-11', totalCents: 3758 });
    expect(doc.items[0].description).toBe('Beet, Red');
  });

  it('refuses an AR carry-over whose food lines carry no amounts', () => {
    const doc = parseDocument('goodacre', GOOD_ACRE_OPENING_BALANCE);
    expect(doc).toMatchObject({ parseState: 'review_required', reasons: ['opening_balance_unpriced_lines'] });
    expect(toVendorLines(doc)).toEqual([]);
  });

  it('classifies statements and sales orders as non-invoices', () => {
    expect(classifyDocument('goodacre', ['Statement', 'x'.repeat(60)], '213 Local Effort.pdf')).toBe('statement');
    expect(classifyDocument('goodacre', ['Sales Order', 'SO1960', 'x'.repeat(60)], 'Sales Order_SO1960_x.pdf')).toBe('sales_order');
    expect(classifyDocument('goodacre', GOOD_ACRE_ITEM, 'Invoice_INV900_x.pdf')).toBe('invoice');
  });
});

describe('Mad Rose Specialty Foods', () => {
  const doc = parseDocument('madrose', MAD_ROSE_DIRECT);

  it('reconciles subtotal + shipping and reads SKUs split over two lines', () => {
    expect(doc).toMatchObject({ parseState: 'parsed', invoiceNumber: 'F90001', invoiceDate: '2022-12-23', subtotalCents: 8557, totalCents: 9757 });
    expect(doc.adjustments).toEqual([{ kind: 'shipping', cents: 1200 }]);
    expect(doc.items[0].sku).toBe('IT-ARM-01-211L');
  });

  it('takes the bottle size as the ordered unit, ignoring the [N/cs] case count, with gr -> g', () => {
    const lines = toVendorLines(doc);
    expect(lines.map((line) => line.packText)).toEqual(['1 l', '500 g', '500 g', '1 kg', null]);
    expect(lines.every((line) => line.packText === null || parsePackText(line.packText))).toBe(true);
  });

  it('keeps a three-decimal rate as printed and reconciles on the line amount', () => {
    const pollen = toVendorLines(doc).find((line) => line.sku === 'IT-BNC-14-22');
    expect(pollen).toMatchObject({ unitPriceCents: 885, quantity: 2, lineTotalCents: 1769 });
  });

  it('reads the Melio copy with T-suffixed amounts and a TAX row', () => {
    const copy = parseDocument('madrose', [
      'BILL TO  SHIP TO  SHIP DATE  01/27/2023  INVOICE  F90002',
      'Sample Shop  DATE  01/27/2023',
      'ACTIVITY  DESCRIPTION  QTY  RATE  AMOUNT',
      'Sciappa 1L 2021  Test Olive Oil  3  20.75  62.25T',
      'IT-ARM-01-211L  2021 Armato 1L [12/cs]',
      'SUBTOTAL  62.25',
      'TAX (0)  0.00',
      'SHIPPING  8.00',
      'TOTAL  70.25',
      'BALANCE DUE  USD 70.25',
    ]);
    expect(copy).toMatchObject({ parseState: 'parsed', invoiceNumber: 'F90002', invoiceDate: '2023-01-27', totalCents: 7025 });
  });

  it('does not treat a Sales Order as an invoice', () => {
    expect(classifyDocument('madrose', [...MAD_ROSE_SALES_ORDER, 'x'.repeat(60)], 'Sales Order SO-186.pdf')).toBe('sales_order');
  });

  it('reports a missing printed total as review', () => {
    const truncated = parseDocument('madrose', MAD_ROSE_DIRECT.filter((line) => !line.startsWith('TOTAL')));
    expect(truncated).toMatchObject({ parseState: 'review_required', reasons: ['missing_total'] });
  });
});

describe('HAFA', () => {
  const doc = parseDocument('hafa', HAFA);

  it('reconciles subtotal + tax and prices pound lines per lb', () => {
    expect(doc).toMatchObject({ parseState: 'parsed', invoiceNumber: '20260101', invoiceDate: '2026-07-24', totalCents: 4950, subtotalCents: 4950 });
    const lines = toVendorLines(doc);
    expect(lines.map((line) => [line.description, line.packText, line.quantity, line.unitPriceCents])).toEqual([
      ['Cabbage, Green, lb', '1 lb', 15, 130],
      ['Cucumber, Pickle, lb', '1 lb', 10, 200],
      ['Herbs, Cilantro, bunch', null, 5, 200],
    ]);
  });

  it('flags the bunch line as having no inferable pack', () => {
    const { report } = processVendor('hafa', [{ lines: HAFA }]);
    expect(report.packNotInferred).toEqual([{ invoice: '20260101', index: 3, status: 'none', description: 'Herbs, Cilantro, bunch' }]);
  });
});

describe('processVendor', () => {
  it('collapses copies of one invoice number and reports counts only', () => {
    const { lines, report } = processVendor('bakersfield', [
      { lines: BAKERS_FIELD, filename: 'Inv_70001_a.pdf', date: '2025-05-19' },
      { lines: BAKERS_FIELD, filename: 'Inv_70001_b.pdf', date: '2025-05-26' },
      { lines: ['Wholesale Policies', 'Invoice', 'x'.repeat(60)], filename: 'Wholesale Policies.pdf' },
    ]);
    expect(report).toMatchObject({ documentsFound: 3, invoicesParsedFromPdfs: 2, duplicatesDeduped: 1, invoices: 1, parsed: 1, reviewRequired: [] });
    expect(report.skippedDocuments.other).toBe(1);
    expect(report.reconciliation).toEqual([{ invoice: '70001', date: '2025-05-19', totalCents: 12350, itemsCents: 10750, adjustments: { shipping: 1000, fee: 600 }, exact: true }]);
    expect(report.lines).toMatchObject({ emitted: 2, freeSamplesSkipped: 1, nonFoodAdjustments: 2 });
    expect(lines).toHaveLength(2);
    expect(new Set(lines.map((line) => line.sourceKey)).size).toBe(2);
  });

  it('does not let identical invoice numbers from two vendors collide', () => {
    const a = toVendorLines(parseDocument('bakersfield', BAKERS_FIELD));
    const b = toVendorLines(parseDocument('hafa', HAFA.map((line) => line.replace('20260101', '70001'))));
    const keys = [...a, ...b].map((line) => line.sourceKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('reports parsed copies that disagree instead of choosing one', () => {
    const changed = BAKERS_FIELD.map((line) => line.replace('Spelt Flour  50  1.20  60.00', 'Spelt Flour  50  1.20  60.00').replace('Total  $123.50', 'Total  $123.50')).map((line) => line.replace('25  1.90  47.50', '25  2.30  57.50').replace('Total  $123.50', 'Total  $133.50'));
    const { lines, report } = processVendor('bakersfield', [{ lines: BAKERS_FIELD }, { lines: changed }]);
    expect(report.reviewRequired).toEqual([expect.objectContaining({ invoice: '70001', reasons: ['conflicting_copies'] })]);
    expect(lines).toEqual([]);
  });

  it('prefers the copy that reconciles over a truncated one', () => {
    const truncated = BAKERS_FIELD.filter((line) => !line.startsWith('Total'));
    const { report } = processVendor('bakersfield', [{ lines: truncated }, { lines: BAKERS_FIELD }]);
    expect(report).toMatchObject({ parsed: 1, reviewRequired: [], duplicatesDeduped: 1 });
  });

  it('counts image-only invoice PDFs as needing OCR without any content', () => {
    const { report } = processVendor('greatciao', [{ lines: [[]], filename: 'Invoice # 700000.PDF', date: '2024-01-02' }, { lines: [[]], filename: 'specials.pdf' }]);
    expect(report.needsOcr).toEqual([{ vendor: 'Great Ciao', date: '2024-01-02' }]);
    expect(report.skippedDocuments.other).toBe(1);
  });

  it('skips credit documents and zero-total invoices', () => {
    const credit = BAKERS_FIELD.map((line) => line.replace(/^Invoice$/, 'Credit Memo'));
    // the credit header no longer carries the Invoice marker, so the layout is not an invoice
    expect(classifyDocument('bakersfield', credit, 'Inv_70002.pdf')).not.toBe('invoice');
  });

  it('flattens page arrays and drops blank lines', () => {
    expect(flattenPages([['a ', ''], ['b']])).toEqual(['a', 'b']);
  });

  it('dedupeInvoices keeps unnumbered documents apart', () => {
    const doc = { invoiceNumber: null, parseState: 'review_required', items: [], adjustments: [], reasons: ['missing_invoice_number'] };
    expect(dedupeInvoices([doc, { ...doc }]).invoices).toHaveLength(2);
  });
});
