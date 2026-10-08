import { describe, expect, it, vi } from 'vitest';
import usage from '../usage';

const {
  categoryOfStock,
  coverageReport,
  driverTotals,
  intervalReport,
  ratioReport,
  rollupSpend,
  runUsage,
  toPurchaseLine,
  weekStartOf,
} = usage;

const flour = { key: 'flour-ap', name: 'Flour, AP', dimension: 'mass', aliases: [] };
const milk = { key: 'whole-milk', name: 'Whole milk', dimension: 'volume', aliases: [], densityGPerMl: '1.03' };

function observation({ id = 'o', date, stock = flour, vendor = 'acme', status = 'mapped', pack = 1000, packDimension = stock?.dimension || 'mass', quantity = 1, total = 1000, scope = null, defaultScope = null, source = 'vendor_invoice', receipt = date }) {
  return {
    source,
    sourceKey: `inv|${receipt}|${id}`,
    observedAt: new Date(`${date}T15:00:00.000Z`),
    packCostCents: total,
    quantity,
    lineTotalCents: total,
    scope,
    vendorItem: {
      vendorKey: vendor,
      vendorName: vendor.toUpperCase(),
      description: `${vendor} item`,
      status,
      packBaseQuantity: pack,
      packDimension,
      defaultScope,
      stockProduct: status === 'mapped' ? stock : null,
    },
  };
}

const lines = (observations) => observations.map(toPurchaseLine);
const biz = (o) => observation({ scope: 'business', ...o });

describe('purchase lines', () => {
  it('converts quantity through the pack and flags lines that cannot be converted', () => {
    expect(toPurchaseLine(observation({ date: '2026-01-05', pack: 5000, quantity: 3 })).baseQuantity).toBe(15000);
    const noPack = toPurchaseLine(observation({ date: '2026-01-05', pack: null }));
    expect(noPack.baseQuantity).toBeNull();
    expect(noPack.unconvertedReason).toBe('no_pack');
    const unmapped = toPurchaseLine(observation({ date: '2026-01-05', status: 'unmapped' }));
    expect(unmapped.unconvertedReason).toBe('unmapped');
    const ignored = toPurchaseLine(observation({ date: '2026-01-05', status: 'ignored' }));
    expect(ignored.ignored).toBe(true);
    expect(ignored.unconvertedReason).toBeNull();
  });

  it('converts across dimensions only with a density, otherwise refuses', () => {
    const volumePackOfMass = observation({ date: '2026-01-05', stock: milk, pack: 1000, packDimension: 'mass', quantity: 2 });
    expect(toPurchaseLine(volumePackOfMass).baseQuantity).toBeCloseTo(2000 / 1.03);
    const noDensity = observation({ date: '2026-01-05', stock: { ...milk, densityGPerMl: null }, packDimension: 'mass' });
    expect(toPurchaseLine(noDensity).unconvertedReason).toBe('dimension_mismatch');
  });

  it('puts a stock product without a keyword match in uncategorized and finds categories in the key', () => {
    expect(categoryOfStock({ key: 'unsalted-butter', name: 'Butter', aliases: [] })).toBe('dairy_eggs');
    expect(categoryOfStock({ key: 'peanut-butter', name: 'Peanut butter', aliases: [] })).toBe('pantry');
    expect(categoryOfStock({ key: 'xyzzy', name: 'Xyzzy', aliases: [] })).toBe('uncategorized');
    expect(categoryOfStock({ key: 'xyzzy', name: 'Xyzzy', aliases: ['carrots'] })).toBe('produce');
    expect(categoryOfStock(null)).toBe('unmapped');
  });
});

describe('order intervals', () => {
  const series = (dates, extra = {}) => dates.map((date, i) => biz({ id: String(i), date, quantity: 2, ...extra }));

  it('computes median, mean, CV and a consumption band from the quantity bought at the start of each interval', () => {
    // Orders on days 0, 7, 21, 28: intervals 7, 14, 7. Each buys 2 x 1000 g.
    const report = intervalReport(lines(series(['2026-01-01', '2026-01-08', '2026-01-22', '2026-01-29'])), { scope: 'business', asOf: '2026-02-05' });
    const flourRow = report.stocks[0];
    expect(flourRow.status).toBe('ok');
    expect(flourRow.purchases).toBe(4);
    expect(flourRow.intervalDays).toMatchObject({ median: 7, mean: 9.3, min: 7, max: 14 });
    expect(flourRow.regularity.cv).toBeCloseTo(0.433, 2); // sd 4.04 / mean 9.33
    expect(flourRow.regularity.label).toBe('variable');
    expect(flourRow.lastPurchase).toBe('2026-01-29');
    expect(flourRow.daysSinceLast).toBe(7);
    expect(flourRow.sinceLastRatio).toBe(1);
    // rates: 2000/7, 2000/14, 2000/7 -> sorted 142.86, 285.71, 285.71
    expect(flourRow.consumptionPerDay.median).toBeCloseTo(285.7143, 3);
    expect(flourRow.consumptionPerDay.low).toBeCloseTo(214.2857, 3);
    expect(flourRow.consumptionPerDay.high).toBeCloseTo(285.7143, 3);
    expect(flourRow.totalQuantity).toBe(8000);
    expect(report.assumption).toMatch(/run down/);
  });

  it('flags fewer than the minimum purchases as insufficient and gives no statistics', () => {
    const report = intervalReport(lines(series(['2026-01-01', '2026-02-01'])), { scope: 'business', asOf: '2026-03-01' });
    expect(report.stocks[0]).toMatchObject({ status: 'insufficient', purchases: 2 });
    expect(report.stocks[0].intervalDays).toBeUndefined();
    expect(report.summary).toEqual({ stockProducts: 1, withEnoughHistory: 0, insufficient: 1 });
    const loose = intervalReport(lines(series(['2026-01-01', '2026-02-01'])), { scope: 'business', minPurchases: 2 });
    expect(loose.stocks[0].status).toBe('ok');
  });

  it('collapses same-day lines and two receipts on one day into one purchase event', () => {
    const obs = [
      biz({ id: 'a', date: '2026-01-01', receipt: 'r1' }),
      biz({ id: 'b', date: '2026-01-01', receipt: 'r1' }),
      biz({ id: 'c', date: '2026-01-01', receipt: 'r2' }),
      biz({ id: 'd', date: '2026-01-11' }),
      biz({ id: 'e', date: '2026-01-21' }),
    ];
    const row = intervalReport(lines(obs), { scope: 'business' }).stocks[0];
    expect(row.purchases).toBe(3);
    expect(row.intervalDays.median).toBe(10);
    expect(row.intervals[0].quantity).toBe(3000);
  });

  it('keeps vendors separate in the vendor x stock view while the stock view combines them', () => {
    const obs = [
      biz({ id: '1', date: '2026-01-01', vendor: 'a' }),
      biz({ id: '2', date: '2026-01-05', vendor: 'b' }),
      biz({ id: '3', date: '2026-01-09', vendor: 'a' }),
      biz({ id: '4', date: '2026-01-13', vendor: 'b' }),
      biz({ id: '5', date: '2026-01-17', vendor: 'a' }),
    ];
    const report = intervalReport(lines(obs), { scope: 'business' });
    expect(report.stocks[0]).toMatchObject({ purchases: 5, status: 'ok' });
    expect(report.stocks[0].intervalDays.median).toBe(4);
    const byVendor = Object.fromEntries(report.vendorStocks.map((row) => [row.vendorKey, row]));
    expect(byVendor.a.purchases).toBe(3);
    expect(byVendor.a.intervalDays.median).toBe(8);
    expect(byVendor.b.status).toBe('insufficient');
  });

  it('excludes personal and unassigned purchases by default and counts them as excluded', () => {
    const obs = [
      biz({ id: '1', date: '2026-01-01' }),
      observation({ id: '2', date: '2026-01-08' }), // unassigned
      observation({ id: '3', date: '2026-01-15', scope: 'personal' }),
      biz({ id: '4', date: '2026-01-22' }),
    ];
    const business = intervalReport(lines(obs), { scope: 'business' });
    expect(business.stocks[0].purchases).toBe(2);
    expect(business.excluded).toEqual({ personalLines: 1, unassignedLines: 1 });
    expect(intervalReport(lines(obs), { scope: 'business+unassigned' }).stocks[0].purchases).toBe(3);
    expect(intervalReport(lines(obs), { scope: 'all' }).stocks[0].purchases).toBe(4);
  });

  it('reports unconverted spend explicitly instead of dropping it, and skips ignored lines', () => {
    const obs = [
      biz({ id: '1', date: '2026-01-01', total: 500 }),
      biz({ id: '2', date: '2026-01-02', pack: null, total: 700 }),
      biz({ id: '3', date: '2026-01-03', status: 'unmapped', total: 300 }),
      biz({ id: '4', date: '2026-01-04', status: 'ignored', total: 9999 }),
    ];
    const report = intervalReport(lines(obs), { scope: 'business' });
    expect(report.unconverted).toEqual({ lines: 2, spendCents: 1000, byReason: { no_pack: 700, unmapped: 300 } });
    const row = report.stocks.find((s) => s.stockKey === 'flour-ap');
    expect(row.unconvertedLines).toBe(1);
  });
});

describe('spend rollups', () => {
  const obs = [
    biz({ id: '1', date: '2026-01-04', total: 1000, vendor: 'a' }), // Sunday
    biz({ id: '2', date: '2026-01-10', total: 2000, vendor: 'b' }), // Saturday, same Sunday week
    biz({ id: '3', date: '2026-01-11', total: 400, vendor: 'a' }), // next week
    observation({ id: '4', date: '2026-02-01', total: 700, vendor: 'a' }), // unassigned
    observation({ id: '5', date: '2026-02-02', total: 5000, scope: 'personal' }),
    biz({ id: '6', date: '2026-02-03', total: 800, status: 'ignored' }),
    biz({ id: '7', date: '2026-02-03', total: 250, status: 'unmapped' }),
  ];

  it('starts weeks on Sunday', () => {
    expect(weekStartOf('2026-01-04')).toBe('2026-01-04');
    expect(weekStartOf('2026-01-10')).toBe('2026-01-04');
    expect(weekStartOf('2026-01-11')).toBe('2026-01-11');
  });

  it('counts business only by default, shows unassigned and personal beside it, and never mixes them in', () => {
    const month = rollupSpend(lines(obs), { by: 'month', scope: 'business' });
    expect(month.buckets.map((b) => [b.key, b.spendCents, b.unassignedCents, b.personalCents])).toEqual([
      ['2026-01', 3400, 0, 0],
      ['2026-02', 250, 700, 5000],
    ]);
    expect(month.totals.ignoredCents).toBe(800);
    expect(month.totals.unconvertedCents).toBe(250);
  });

  it('adds unassigned for business+unassigned and everything for all', () => {
    expect(rollupSpend(lines(obs), { by: 'month', scope: 'business+unassigned' }).totals.spendCents).toBe(3400 + 250 + 700);
    expect(rollupSpend(lines(obs), { by: 'month', scope: 'all' }).totals.spendCents).toBe(3400 + 250 + 700 + 5000);
  });

  it('rolls up by week, vendor, stock and category', () => {
    const weeks = rollupSpend(lines(obs), { by: 'week', scope: 'business' }).buckets;
    expect(weeks.slice(0, 2).map((b) => [b.key, b.spendCents])).toEqual([['2026-01-04', 3000], ['2026-01-11', 400]]);
    const vendors = rollupSpend(lines(obs), { by: 'vendor', scope: 'business' }).buckets;
    expect(vendors.map((b) => [b.key, b.spendCents])).toEqual([['B', 2000], ['A', 1400], ['ACME', 250]]);
    const stocks = rollupSpend(lines(obs), { by: 'stock', scope: 'business' }).buckets;
    expect(stocks.find((b) => b.key === 'flour-ap').spendCents).toBe(3400);
    const categories = rollupSpend(lines(obs), { by: 'category', scope: 'business' }).buckets;
    expect(categories.find((b) => b.key === 'dry_goods').spendCents).toBe(3400);
    expect(categories.find((b) => b.key === 'unmapped').spendCents).toBe(250);
  });

  it('lets a per-line scope override the vendor default', () => {
    const rows = lines([
      observation({ id: '1', date: '2026-03-01', defaultScope: 'personal', total: 100 }),
      observation({ id: '2', date: '2026-03-01', defaultScope: 'personal', scope: 'business', total: 200 }),
    ]);
    const month = rollupSpend(rows, { by: 'month', scope: 'business' });
    expect(month.totals.spendCents).toBe(200);
    expect(month.totals.personalCents).toBe(100);
  });
});

describe('coverage against Local Budget', () => {
  const lb = {
    available: true,
    months: [
      { month: '2026-01', complete: true, incomeCents: 100000, inventoryCents: 10000, unclassifiedCents: 0 },
      { month: '2026-02', complete: true, incomeCents: 100000, inventoryCents: 10000, unclassifiedCents: 0 },
      { month: '2026-03', complete: true, incomeCents: 100000, inventoryCents: 0, unclassifiedCents: 500 },
      { month: '2026-04', complete: true, incomeCents: 100000, inventoryCents: 1000, unclassifiedCents: 0 },
    ],
  };
  const obs = [
    biz({ id: '1', date: '2026-01-10', total: 7000 }), // 70%
    biz({ id: '2', date: '2026-02-10', total: 4000 }), // 40%
    biz({ id: '3', date: '2026-03-10', total: 4000 }),
    biz({ id: '4', date: '2026-04-10', total: 9000 }), // 900%
    biz({ id: '5', date: '2026-06-10', total: 100 }),
  ];

  it('gives coverage per month and refuses below the threshold, over-coverage, empty LB and missing months', () => {
    const report = coverageReport(lines(obs), lb, { scope: 'business', minCoverage: 0.6 });
    const byMonth = Object.fromEntries(report.months.map((m) => [m.month, m]));
    expect(byMonth['2026-01']).toMatchObject({ coverage: 0.7, status: 'ok' });
    expect(byMonth['2026-02']).toMatchObject({ coverage: 0.4, status: 'low coverage' });
    expect(byMonth['2026-03'].status).toBe('lb inventory empty');
    expect(byMonth['2026-04'].status).toBe('exceeds lb');
    expect(byMonth['2026-05']).toMatchObject({ observedCents: 0, status: 'no lb data' });
    expect(byMonth['2026-06'].status).toBe('no lb data');
  });

  it('refuses months where LB unclassified outflow dwarfs its inventory bucket, however good the percentage looks', () => {
    const noisy = { available: true, months: [{ month: '2026-01', complete: true, incomeCents: 100000, inventoryCents: 10000, unclassifiedCents: 600000 }] };
    const row = coverageReport(lines([biz({ id: '1', date: '2026-01-10', total: 9000 })]), noisy, { scope: 'business' }).months[0];
    expect(row).toMatchObject({ coverage: 0.9, status: 'lb unclassified' });
    const tolerant = coverageReport(lines([biz({ id: '1', date: '2026-01-10', total: 9000 })]), noisy, { scope: 'business', maxLbUnclassified: 100 }).months[0];
    expect(tolerant.status).toBe('ok');
  });

  it('honours a different minimum coverage and reports observed windows per source and vendor', () => {
    const report = coverageReport(lines(obs), lb, { scope: 'business', minCoverage: 0.3 });
    expect(report.months.find((m) => m.month === '2026-02').status).toBe('ok');
    const source = report.windows.bySource[0];
    expect(source).toMatchObject({ key: 'vendor_invoice', firstPurchase: '2026-01-10', lastPurchase: '2026-06-10', monthsWithData: 5, monthsInSpan: 6, gapMonths: 1 });
  });

  it('says unavailable instead of inventing coverage when Local Budget cannot be reached', () => {
    const report = coverageReport(lines(obs), { available: false, error: 'down', months: [] }, {});
    expect(report.lb).toMatchObject({ available: false, error: 'down' });
    expect(report.months.every((m) => m.coverage === null && m.status === 'no lb data')).toBe(true);
  });

  it('treats unassigned spend as outside business coverage but visible', () => {
    const report = coverageReport(lines([observation({ id: '1', date: '2026-01-10', total: 9000 })]), lb, { scope: 'business' });
    expect(report.months[0]).toMatchObject({ observedCents: 0, unassignedCents: 9000, status: 'low coverage' });
    expect(coverageReport(lines([observation({ id: '1', date: '2026-01-10', total: 9000 })]), lb, { scope: 'business+unassigned' }).months[0].status).toBe('ok');
  });
});

describe('normalised ratios', () => {
  const lb = {
    available: true,
    months: [
      { month: '2026-01', complete: true, incomeCents: 100000, inventoryCents: 10000, unclassifiedCents: 0 },
      { month: '2026-02', complete: true, incomeCents: 100000, inventoryCents: 10000, unclassifiedCents: 0 },
    ],
  };
  const order = (date, extra = {}) => ({ status: 'paid', businessLineKey: 'wholesale', date, totalCents: 40000, customerKey: 'id:c1', itemQuantity: 100, ...extra });
  const orders = [
    order('2026-01-10'),
    order('2026-01-20', { customerKey: 'id:c2', totalCents: 40000 }),
    order('2026-01-25', { businessLineKey: 'events', itemQuantity: 0, customerKey: 'id:c3', totalCents: 30000 }),
    order('2026-02-10', { status: 'cancelled' }),
    order('2026-02-12', { totalCents: 5000 }),
  ];

  it('counts only active orders inside the window and covers revenue per driver', () => {
    const totals = driverTotals(orders, '2026-01-01', '2026-01-31');
    expect(totals.customers).toEqual({ value: 3, coveredRevenueCents: 110000 });
    expect(totals.meals).toEqual({ value: 200, coveredRevenueCents: 80000 });
    expect(totals.events).toEqual({ value: 1, coveredRevenueCents: 30000 });
    expect(driverTotals(orders, '2026-02-01', '2026-02-28').customers.value).toBe(1);
  });

  it('computes ratios only for qualifying months and refuses the rest', () => {
    const obs = [biz({ id: '1', date: '2026-01-10', total: 8000 }), biz({ id: '2', date: '2026-02-10', total: 2000 })];
    const report = ratioReport(lines(obs), lb, orders, { scope: 'business', asOf: '2026-03-01' });
    const [jan, feb] = report.monthly;
    expect(jan.status).toBe('ok');
    expect(jan.foodCostPctOfRevenue).toBe(8);
    expect(jan.costPer.customer).toBe(Math.round(8000 / 3));
    expect(jan.costPer.meal).toBe(40);
    // Events carry 30% of January revenue, below the 60% driver share: refused, not computed.
    expect(jan.drivers.events).toMatchObject({ value: 1, usable: false });
    expect(jan.costPer.event).toBeNull();
    // February: 20% coverage -> no ratios at all.
    expect(feb.status).toBe('low coverage');
    expect(feb.foodCostPctOfRevenue).toBeNull();
    expect(feb.costPer).toEqual({});
    expect(report.summary).toMatchObject({ months: 2, qualifying: 1, refused: 1 });
  });

  it('refuses a per-unit driver that covers too little of revenue', () => {
    const obs = [biz({ id: '1', date: '2026-01-10', total: 8000 })];
    const thin = [order('2026-01-10', { totalCents: 1000 })];
    const report = ratioReport(lines(obs), lb, thin, { scope: 'business', asOf: '2026-03-01' });
    const jan = report.monthly[0];
    expect(jan.foodCostPctOfRevenue).toBe(8);
    expect(jan.drivers.meals).toMatchObject({ usable: false, reason: 'driver covers too little of revenue' });
    expect(jan.costPer.meal).toBeNull();
  });

  it('builds rolling 4-week figures from past Sunday weeks and refuses them across non-qualifying months', () => {
    const obs = [
      biz({ id: '1', date: '2026-01-04', total: 1000 }),
      biz({ id: '2', date: '2026-01-11', total: 1000 }),
      biz({ id: '3', date: '2026-01-18', total: 1000 }),
      biz({ id: '4', date: '2026-01-25', total: 1000 }),
      biz({ id: '5', date: '2026-02-01', total: 1000 }),
    ];
    const lowFeb = { ...lb, months: [lb.months[0], { ...lb.months[1], inventoryCents: 1000000 }] };
    const report = ratioReport(lines(obs), lowFeb, orders, { scope: 'business+unassigned', minCoverage: 0.3, asOf: '2026-02-20' });
    expect(report.rolling4w[0]).toMatchObject({ start: '2026-01-04', end: '2026-01-31', spendCents: 4000, status: 'ok' });
    // Windows ending on 2026-02-07 touch February, which is not covered.
    expect(report.rolling4w.find((w) => w.start === '2026-01-11')).toMatchObject({ status: 'low coverage' });
    expect(report.rolling4w.at(-1).end <= '2026-02-14').toBe(true);
  });
});

describe('runUsage', () => {
  it('loads purchases, queries LB across complete months only, and returns the requested report', async () => {
    const prisma = {
      costObservation: { findMany: vi.fn().mockResolvedValue([biz({ id: '1', date: '2026-01-10', total: 7000 })]) },
      commercialOrder: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const localBudgetClient = {
      fetchCashflowMonths: vi.fn().mockResolvedValue({
        months: [{ month: '2026-01', complete: true, incomeCents: 100000, inventoryCents: 10000, unclassifiedCents: 0 }],
      }),
    };
    const coverage = await runUsage(prisma, 'coverage', {}, { localBudgetClient, now: new Date('2026-02-15T18:00:00Z') });
    expect(localBudgetClient.fetchCashflowMonths).toHaveBeenCalledWith({ from: '2026-01-01', toExclusive: '2026-02-01' });
    expect(coverage.months[0]).toMatchObject({ month: '2026-01', coverage: 0.7, status: 'ok' });
    const ratios = await runUsage(prisma, 'ratios', { driver: 'revenue' }, { localBudgetClient, now: new Date('2026-02-15T18:00:00Z') });
    expect(ratios.monthly[0].foodCostPctOfRevenue).toBe(7);
  });

  it('degrades to unavailable when Local Budget fails and rejects bad parameters', async () => {
    const prisma = { costObservation: { findMany: vi.fn().mockResolvedValue([biz({ id: '1', date: '2026-01-10' })]) } };
    const localBudgetClient = { fetchCashflowMonths: vi.fn().mockRejectedValue(new Error('boom')) };
    const coverage = await runUsage(prisma, 'coverage', {}, { localBudgetClient, now: new Date('2026-03-01T12:00:00Z') });
    expect(coverage.lb).toMatchObject({ available: false, error: 'boom' });
    await expect(runUsage(prisma, 'spend', { scope: 'everything' })).rejects.toThrow();
    await expect(runUsage(prisma, 'nope', {})).rejects.toThrow(/unknown usage report/);
  });
});
