import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import catalog from '../../catalog';
import units from '../../units';
import wedge from '../wedgeReceipt';

const { planVendorLines } = catalog;
const { parsePackText } = units;
const { DEFAULT_EXCLUDED_DEPARTMENTS, parseWedgeReceipt, toVendorLines, toVendorLinesDetailed } = wedge;

const FIXTURES = path.join(__dirname, 'fixtures', 'wedge');
const fixture = (name) => fs.readFileSync(path.join(FIXTURES, name), 'utf8');
const EMPTY_STATE = { stockProducts: [], vendorItems: [], observationKeys: new Set() };

// Minimal valid receipt around caller-supplied item rows: [{ row, cents }...] (row = raw text rows).
function receiptHtml(items, { dept = '01 PACKAGED GROCERY' } = {}) {
  const money = (cents) => (cents / 100).toFixed(2);
  const pad = (left, right) => left + ' '.repeat(Math.max(1, 36 - left.length - right.length)) + right;
  const rows = ['', '            Wedge Linden Hills', '7/09/26    9:41 AM     Receipt #:   777001', ' ', `           ${dept}`];
  let sum = 0;
  for (const item of items) {
    sum += item.cents;
    rows.push(pad(`${item.code.padEnd(13)}${item.desc}`, `${money(item.cents)}F`));
    for (const extra of item.extra || []) rows.push(extra);
  }
  rows.push(' ', pad('              SUBTOTAL', money(sum)), pad('              TOTAL', money(sum)), pad('              Debit', money(sum)),
    pad('              TOTAL TENDERED', money(sum)), pad('              Change', '0.00'));
  const cell = (text) => `<tr><td>${text.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;')}</td></tr>`;
  return `<table>${rows.map(cell).join('')}</table>`;
}

const packFor = (description, department = '01 PACKAGED GROCERY') => {
  const [code, ...words] = ['100000000001', ...description.split(' ')];
  const receipt = parseWedgeReceipt({ messageId: 'p', html: receiptHtml([{ code, desc: words.join(' '), cents: 199 }], { dept: department }) });
  expect(receipt.parseState).toBe('parsed');
  return toVendorLinesDetailed(receipt);
};

describe('parseWedgeReceipt on a synthetic full receipt', () => {
  const receipt = parseWedgeReceipt({ messageId: 'abc123', html: fixture('full.html') });
  const byDescription = (text) => receipt.lines.find((line) => line.description.startsWith(text));

  it('reconciles exactly to the cent and is parsed', () => {
    expect(receipt.parseState).toBe('parsed');
    expect(receipt.reasons).toEqual([]);
    const sum = receipt.lines.reduce((total, line) => total + line.lineTotalCents, 0);
    expect(sum).toBe(receipt.subtotalCents);
    expect(receipt.subtotalCents + receipt.taxCents).toBe(receipt.totalCents);
    expect(receipt).toMatchObject({ receiptSourceKey: 'gmail:abc123', purchasedAt: '2026-07-09', receiptNumber: '123456', merchant: 'Wedge Linden Hills' });
  });

  it('parses every row variant', () => {
    expect(byDescription('Cucumber.O')).toMatchObject({ code: '94062', codeKind: 'plu', weighed: true, unit: 'lb', quantity: 1.53, unitPriceCents: 299, lineTotalCents: 457, kind: 'merchandise' });
    expect(byDescription('SPEC Chickpeas')).toMatchObject({ code: '100000000042', codeKind: 'upc', quantity: 2, unitPriceCents: 399, lineTotalCents: 798, weighed: false });
    expect(byDescription('Cilantro Bunch.O')).toMatchObject({ codeKind: 'plu', quantity: 2, unitPriceCents: 299, lineTotalCents: 598 });
    expect(byDescription('SPEC Mayonnaise')).toMatchObject({ quantity: 1, unitPriceCents: 599, lineTotalCents: 599, discountCents: 300, description: 'SPEC Mayonnaise 16oz' });
    expect(byDescription('BOGA Brown Bttr').description).toBe('BOGA Brown Bttr Brioche Doughnut');
  });

  it('classifies discounts, coupons, fees, deposits and equity as non-merchandise and keeps them in the sum', () => {
    const kinds = Object.fromEntries(receipt.lines.filter((line) => line.kind !== 'merchandise').map((line) => [line.description, [line.kind, line.lineTotalCents]]));
    expect(kinds).toEqual({
      "Ben & Jerry's BOGO": ['discount', -699],
      'BOTTLE DEPOSIT': ['deposit', 200],
      'Bag Charge $0.05': ['fee', 5],
      'Mfr. Coupon': ['coupon', -100],
      'Bag Fee': ['fee', 5],
      'Paid In - DONATIONS': ['fee', 90],
      'MEMBERSHIP EQUITY PAYMENT': ['equity', 2000],
    });
  });

  it('carries no PII from the header or footer', () => {
    const json = JSON.stringify(receipt);
    for (const secret of ['999111', '4242', '555777', 'Testperson', 'Owner', 'Approval', 'CARD', '000-000-0000', 'Register']) {
      expect(json).not.toContain(secret);
    }
  });
});

describe('review_required receipts', () => {
  it('flags a subtotal that is off by one cent and emits no lines', () => {
    const receipt = parseWedgeReceipt({ messageId: 'm1', html: fixture('subtotal-off-by-a-cent.html') });
    expect(receipt.parseState).toBe('review_required');
    expect(receipt.reasons.some((reason) => reason.startsWith('subtotal_mismatch'))).toBe(true);
    expect(receipt.reasons.some((reason) => reason.startsWith('total_mismatch'))).toBe(true);
    expect(toVendorLines(receipt)).toEqual([]);
  });

  it('flags an unrecognized row instead of dropping it', () => {
    const receipt = parseWedgeReceipt({ messageId: 'm2', html: fixture('unrecognized-row.html') });
    expect(receipt.parseState).toBe('review_required');
    expect(receipt.reasons).toContain('unrecognized_rows:1');
    expect(toVendorLines(receipt)).toEqual([]);
    // The reason names the row shape, never its text.
    expect(receipt.reasons.join('|')).not.toContain('mystery');
  });

  it('flags an impossible date and a missing receipt number', () => {
    const badDate = parseWedgeReceipt({ messageId: 'm3', html: fixture('full.html').replace('7/09/26', '2/30/26') });
    expect(badDate.parseState).toBe('review_required');
    expect(badDate.reasons).toContain('invalid_date');
    const noNumber = parseWedgeReceipt({ messageId: 'm4', html: fixture('full.html').replace(/Receipt&nbsp;#:(?:&nbsp;)+123456/, 'Receipt&nbsp;#:') });
    expect(noNumber.parseState).toBe('review_required');
    expect(noNumber.reasons.some((reason) => reason.includes('receipt_number') || reason === 'missing_header')).toBe(true);
  });

  it('flags a tender total that does not cover the receipt total', () => {
    const receipt = parseWedgeReceipt({ messageId: 'm5', html: fixture('full.html').replace('100.00', '99.00').replace('100.00', '99.00') });
    expect(receipt.parseState).toBe('review_required');
    expect(receipt.reasons.some((reason) => reason.startsWith('tender_mismatch'))).toBe(true);
  });

  it('review_required on an empty or non-receipt body', () => {
    expect(parseWedgeReceipt({ messageId: 'm6', html: '' }).parseState).toBe('review_required');
    expect(parseWedgeReceipt({ messageId: 'm7', html: '<p>hello</p>' }).parseState).toBe('review_required');
  });

  it('keeps a per-line qty x price disagreement as a soft warning only', () => {
    const html = receiptHtml([{ code: '21671', desc: 'MANC Bucatini Pasta', cents: 245, extra: ['              0.55 lb @ $4.99/lb'] }], { dept: '05 BULK' });
    const receipt = parseWedgeReceipt({ messageId: 'w', html });
    expect(receipt.parseState).toBe('parsed');
    expect(receipt.reasons).toEqual(['warning:line_math:0']);
  });
});

describe('toVendorLines', () => {
  const receipt = parseWedgeReceipt({ messageId: 'abc123', html: fixture('full.html') });
  const detailed = toVendorLinesDetailed(receipt);
  const bySku = (sku) => detailed.lines.find((line) => line.sku === sku);

  it('emits only merchandise outside the excluded departments, in the planVendorLines shape', () => {
    expect(detailed.lines.map((line) => line.sku)).toEqual([
      '022506002357', '100000000042', '100000000059', '100000000011', '100000000035', '94062', '4889', '736547010492', '50203',
    ]);
    expect(detailed.excludedByDepartment).toEqual({ 'HOUSEHOLD & PET': 1 });
    expect(bySku('022506002357')).toEqual({
      sourceKey: 'gmail:abc123:0',
      source: 'receipt_wedge',
      vendor: 'Wedge Linden Hills Co-op',
      sku: '022506002357',
      description: 'SPEC Mayonnaise 16oz',
      packText: '16oz',
      observedAt: '2026-07-09',
      unitPriceCents: 599,
      quantity: 1,
      lineTotalCents: 599,
    });
  });

  it('prices a weighed line per pound with a 1 lb pack', () => {
    expect(bySku('94062')).toMatchObject({ packText: '1 lb', unitPriceCents: 299, quantity: 1.53, lineTotalCents: 457 });
    expect(parsePackText(bySku('94062').packText)).toMatchObject({ dimension: 'mass', baseQuantity: 453.59237 });
  });

  it('prices `N @ P` lines per unit with the pack parsed from the description', () => {
    expect(bySku('736547010492')).toMatchObject({ packText: '6oz', unitPriceCents: 699, quantity: 2, lineTotalCents: 1398 });
    expect(bySku('100000000042')).toMatchObject({ packText: '15.5oz', unitPriceCents: 399, quantity: 2 });
  });

  it('emits a null pack (never a guess) for ambiguous tokens and counts them', () => {
    expect(bySku('100000000035').packText).toBeNull(); // 5# bag of ice
    expect(bySku('100000000059').packText).toBeNull(); // 9pk multipack
    expect(bySku('4889').packText).toBeNull(); // bunch: no pack token at all
    expect(detailed.ambiguousPack).toBe(2);
    expect(detailed.noPack).toBe(2);
  });

  it('reads fluid-ounce tokens on liquid nouns as volume, not mass', () => {
    expect(bySku('100000000011').packText).toBe('128 fl oz');
    expect(parsePackText('128 fl oz').dimension).toBe('volume');
  });

  it('honours a caller-supplied excluded department list', () => {
    const lines = toVendorLines(receipt, { excludeDepartments: ['PRODUCE'] });
    expect(lines.map((line) => line.sku)).not.toContain('94062');
    expect(lines.map((line) => line.sku)).toContain('100000000066'); // household no longer excluded
  });

  it('lists the non-food departments excluded by default', () => {
    for (const name of ['HOUSEHOLD & PET', 'PERSONAL CARE', 'BAG FEE', 'STOCK PURCHASE']) {
      expect(toVendorLines(receipt).length).toBeGreaterThan(0);
      expect(DEFAULT_EXCLUDED_DEPARTMENTS.some((entry) => name.includes(entry))).toBe(true);
    }
    expect(DEFAULT_EXCLUDED_DEPARTMENTS.some((entry) => 'DELI'.includes(entry))).toBe(false);
  });

  it('keeps prepared/deli lines', () => {
    expect(bySku('50203')).toMatchObject({ description: 'BOGA Brown Bttr Brioche Doughnut', packText: null });
  });

  it('produces stable, idempotent source keys across two runs', () => {
    const again = toVendorLines(parseWedgeReceipt({ messageId: 'abc123', html: fixture('full.html') }));
    expect(again).toEqual(detailed.lines);
    expect(new Set(again.map((line) => line.sourceKey)).size).toBe(again.length);
    const first = planVendorLines(detailed.lines, EMPTY_STATE);
    const state = {
      stockProducts: [],
      vendorItems: first.vendorItems.create.map((row) => ({ ...row, id: row.identityKey })),
      observationKeys: new Set(first.observations.create.map((row) => `${row.source}|${row.sourceKey}`)),
    };
    const second = planVendorLines(again, state);
    expect(second.observations.create).toEqual([]);
    expect(second.observations.existing).toBe(first.observations.create.length);
  });

  it('is accepted by planVendorLines with no errors and unmapped items', () => {
    const plan = planVendorLines(detailed.lines, EMPTY_STATE);
    expect(plan.errors).toEqual([]);
    expect(plan.observations.create).toHaveLength(detailed.lines.length);
    expect(plan.vendorItems.create.find((row) => row.vendorSku === '94062')).toMatchObject({ packText: '1 lb', packDimension: 'mass' });
    // null pack stays null: the plan must not re-read the description ("5# Bag of Ice").
    expect(plan.vendorItems.create.find((row) => row.vendorSku === '100000000035')).toMatchObject({ packText: null, packDimension: null });
  });
});

describe('pack derivation guards', () => {
  const pack = (description, department) => packFor(description, department).lines[0].packText;

  it('treats ounces as mass by default but never guesses for beverages, oils or ice cream', () => {
    expect(pack('SPEC Mayonnaise 16oz')).toBe('16oz');
    expect(pack('STON 2% Milk 128oz')).toBe('128 fl oz');
    expect(pack('STON Half & Half 32oz')).toBe('32 fl oz');
    expect(pack('GT Trilogy Kombucha 48oz')).toBe('48 fl oz');
    expect(pack('UNCL Lemonade.O 52oz')).toBe('52 fl oz');
    expect(pack('YERB Mint Yerba Mate.O 15.5oz')).toBe('15.5 fl oz');
    expect(pack('TILL Choc PB Ice Cream 48oz')).toBeNull();
    expect(pack('BALI Anchovies Snflwr Oil 2.82oz')).toBeNull();
    expect(pack('PEAC Morning Glory Coffee 12oz')).toBeNull();
  });

  it('accepts unambiguous metric and count tokens', () => {
    expect(pack('ZOE Extra Virgin Olive Oil 1L')).toBe('1L');
    expect(pack('ROSE Baguette Traditional 315g')).toBe('315g');
    expect(pack('PLEA Non-GMO Eggs 12ct')).toBe('12ct');
    expect(pack('KING Unbleached Bread Flour 5lb')).toBe('5lb');
  });

  it('refuses sizes, hash weights, multipacks, truncated tokens and dry/liquid pints', () => {
    for (const description of [
      'ACE 5# Bag of Ice',
      'FRON Vegetarian Capsules Size 00',
      'MGUA Sparkling Water 9pk',
      'LEIS Lem Electrolyte Refresh 16o',
      'Sungold Cherry Tomatoes.O 1pint',
      'SMUD Microwave Popcorn 3ct 12oz',
    ]) {
      const result = packFor(description);
      expect(result.lines[0].packText, description).toBeNull();
      expect(result.ambiguousPack, description).toBe(1);
    }
  });

  it('counts a description without any pack token as noPack, not ambiguous', () => {
    const result = packFor('Dill Bunch.O', '07 PRODUCE');
    expect(result.lines[0].packText).toBeNull();
    expect(result).toMatchObject({ noPack: 1, ambiguousPack: 0 });
  });
});
