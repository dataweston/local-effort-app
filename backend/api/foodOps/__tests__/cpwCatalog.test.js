import { describe, expect, it } from 'vitest';
import cpwModule from '../cpwCatalog';

const { buildCatalog, indexCatalog, matchVendorItem, parseCountSize, parseCpwCsv, parseCsv, upcKey } = cpwModule;

const MODERN_HEADER = 'C,CAT,UPC,PRO #,Description,Mark/variety,origin,BRAND,COUNT/SIZE,PRICE,CHANGE';
const modernList = (...rows) => [MODERN_HEADER, ...rows].join('\n');

const LEGACY = [
  'CO-OP PARTNERS WAREHOUSE,,,,,,',
  'PRO #,"PRODUCT\nDESCRIPTION",,BRAND,COUNT/SIZE,ORIGIN,PRICE',
  ',OG FRUIT,,,,,',
  '2230,LIMES OG SPLIT CASE,,,5 LB,,$18.40',
  'PRO #,PRODUCT DESCRIPTION,,BRAND,COUNT/SIZE,ORIGIN,PRICE',
  '9001,SYRUP MAPLE DARK,,SAMPLE MAPLE,12/32 OZ,MN,$188.25',
].join('\n');

const lists = (...groups) => groups.map(([observedAt, csv]) => ({ observedAt, rows: parseCpwCsv(csv, { observedAt }) }));
const matcher = (...groups) => (item) => matchVendorItem(item, indexCatalog(buildCatalog(lists(...groups))));

describe('parseCsv', () => {
  it('keeps embedded newlines, escaped quotes and commas inside quoted fields, and strips a BOM', () => {
    expect(parseCsv('\uFEFFa,"b\nc","d ""e"", f"\r\n1,2,3\r\n')).toEqual([['a', 'b\nc', 'd "e", f'], ['1', '2', '3']]);
  });
});

describe('parseCountSize', () => {
  it('reduces a case pack to the single retail unit, never the case', () => {
    expect(parseCountSize('12/16 OZ')).toMatchObject({ caseCount: 12, packText: '16 oz', dimension: 'mass' });
    expect(parseCountSize('6/32 OZ')).toMatchObject({ caseCount: 6, packText: '32 oz' });
    expect(parseCountSize('18/1 LB')).toMatchObject({ caseCount: 18, packText: '1 lb' });
    expect(parseCountSize('3/.5 OZ')).toMatchObject({ caseCount: 3, packText: '0.5 oz' });
    expect(parseCountSize('28 LB')).toMatchObject({ caseCount: 1, packText: '28 lb' });
    expect(parseCountSize('15/1 DZ')).toMatchObject({ caseCount: 15, packText: '1 dozen' });
  });

  it('refuses sizes that do not name one unit', () => {
    expect(parseCountSize('90-100 CT')).toMatchObject({ ranged: true, packText: null });
    expect(parseCountSize('12/4/3.2 O')).toMatchObject({ nested: true, caseCount: 12, packText: null });
    expect(parseCountSize('KEG RECYCL').packText).toBeNull();
    expect(parseCountSize('').packText).toBeNull();
  });
});

describe('upcKey', () => {
  it('compares UPCs without hyphens or leading zeros and ignores placeholders', () => {
    expect(upcKey('0-14601-61400-9')).toBe(upcKey('014601614009'));
    expect(upcKey('014601614009')).toBe('14601614009');
    expect(upcKey(' ')).toBeNull();
    expect(upcKey('1555')).toBeNull();
  });
});

describe('parseCpwCsv', () => {
  it('reads the modern layout by header labels', () => {
    const [row] = parseCpwCsv(modernList('7,OG DAIRY,857423002148,1555,CHEESE OG,CHEDDAR MILD WHT,WI,ROCHDALE FARMS,12/8 OZ,43.95,'));
    expect(row).toMatchObject({ proNumber: '1555', brand: 'ROCHDALE FARMS', description: 'CHEESE OG', variety: 'CHEDDAR MILD WHT', upc: '857423002148', priceCents: 4395 });
    expect(row.size).toMatchObject({ caseCount: 12, packText: '8 oz' });
  });

  it('reads the legacy layout: preamble, multiline header, category rows, repeated headers and $ prices', () => {
    const rows = parseCpwCsv(LEGACY);
    expect(rows.map((row) => row.proNumber)).toEqual(['2230', '9001']);
    expect(rows[0]).toMatchObject({ description: 'LIMES OG SPLIT CASE', category: 'OG FRUIT', priceCents: 1840, upc: null });
    expect(rows[0].size.packText).toBe('5 lb');
    expect(rows[1]).toMatchObject({ brand: 'SAMPLE MAPLE', priceCents: 18825 });
  });
});

describe('buildCatalog', () => {
  it('keeps the newest listing per product number and fills its blanks from older ones', () => {
    const catalog = buildCatalog(lists(
      ['2024-05-24', modernList('7,OG DAIRY, ,1555,CHEESE OG,CHEDDAR MILD,WI,ROCHDALE FARMS,12/8 OZ,45.00,')],
      ['2023-11-03', modernList('7,OG DAIRY,857423002148,1555,CHEESE OG,CHEDDAR MILD,WI,ROCHDALE FARMS,12/8 OZ,40.00,')],
    ));
    expect(catalog).toHaveLength(1);
    expect(catalog[0]).toMatchObject({ priceCents: 4500, upc: '857423002148', lastSeen: '2024-05-24', firstSeen: '2023-11-03', listings: 2 });
  });
});

describe('matchVendorItem', () => {
  const CHEDDAR = ['2024-05-24', modernList('7,OG DAIRY,857423002148,1555,CHEESE OG,CHEDDAR MILD WHT,WI,ROCHDALE FARMS,12/8 OZ,43.95,')];

  it('matches on UPC and returns the single-unit size', () => {
    const result = matcher(CHEDDAR)({ identityKey: 'eastside|sku:857423002148', description: 'Mild White Cheddar', lastPackCostCents: 599 });
    expect(result).toMatchObject({ status: 'matched', via: 'upc', confidence: 'high', packText: '8 oz', caseText: '12/8 OZ' });
  });

  it('matches without a UPC on brand + product tokens, at medium confidence, using the abbreviation-expanded name', () => {
    const result = matcher(CHEDDAR)({ identityKey: 'wedge|desc:x', description: 'Rochdale Farms Mild White Cheddar 8 oz' });
    expect(result).toMatchObject({ status: 'matched', via: 'text', confidence: 'medium', packText: '8 oz' });
  });

  it('does not match a brand-less generic name', () => {
    expect(matcher(CHEDDAR)({ identityKey: 'eastside|sku:1', description: 'Mild White Cheddar' }).status).toBe('none');
  });

  it('rejects a printed size that disagrees with CPW, listing the candidate', () => {
    const result = matcher(CHEDDAR)({ identityKey: 'wedge|desc:x', description: 'Rochdale Farms Mild White Cheddar 16 oz' });
    expect(result.status).toBe('ambiguous');
    expect(result.candidates).toHaveLength(1);
  });

  it('stays ambiguous when CPW lists the same product in different unit sizes', () => {
    const result = matcher(['2024-05-24', modernList(
      '5,OG GROCERY,,610,SWEETENERS PKGD OG,DARK ROBUST,MN,TAPPERS MAPLE SYRUP,12/32 OZ,188.25,',
      '5,OG GROCERY,,611,SWEETENERS PKGD OG,DARK ROBUST,MN,TAPPERS MAPLE SYRUP,12/12 OZ,98.00,',
    )])({ identityKey: 'wedge|desc:y', description: "Tapper's Maple Syrup Dark Robust" });
    expect(result.status).toBe('ambiguous');
    expect(result.candidates.map((candidate) => candidate.packText).sort()).toEqual(['12 oz', '32 oz']);
  });

  it('stays ambiguous for a nested case pack, because the each size is not stated', () => {
    const result = matcher(['2024-05-24', modernList('6,CV GROCERY,860007727771,4105,DIPS,HUMMUS RSTD GARLIC,MN,UBU HIKERS,12/4/3.2 O,64.2,')])({ identityKey: 'e|sku:860007727771', description: 'Roasted Garlic Hummus' });
    expect(result.status).toBe('ambiguous');
  });

  it('treats a UPC hit with an unrelated name as a conflict, not a match', () => {
    const result = matcher(CHEDDAR)({ identityKey: 'eastside|sku:857423002148', description: 'Laundry Detergent' });
    expect(result.status).toBe('ambiguous');
    expect(result.reason).toMatch(/different name/);
  });

  it('rejects a UPC match whose paid price is implausible for the CPW size', () => {
    const result = matcher(CHEDDAR)({ identityKey: 'eastside|sku:857423002148', description: 'Mild White Cheddar', lastPackCostCents: 9999 });
    expect(result.status).toBe('ambiguous');
    expect(result.reason).toMatch(/price/);
  });
});
