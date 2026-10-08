'use strict';

/**
 * Recipe-free usage and cost analytics from purchase history
 * (docs/architecture/food-operations-core-plan.md, 4d). Read-only: nothing here writes.
 *
 * Purchases are `CostObservation` rows (receipts, vendor invoices, LB lines). From them this module
 * derives: purchase events per stock product, order intervals and an estimated consumption rate,
 * spend rollups, purchase coverage against Local Budget (LB), and cost ratios against activity drivers.
 *
 * ## Sources and date coverage of every input (checked 2026-10-08, production, read-only)
 *
 * Purchases - `CostObservation` (3,594 rows):
 *   receipt_eastside 2023-07..2026-0x (retail; ~half of Eastside spend has no emailed receipt),
 *   receipt_wedge 2026-07-03..2026-10-05 (retail), vendor_invoice 267 lines (wholesale/direct, sparse months).
 *   LB `lb_line` rows: only 6 purchased item lines exist in LB (2025-09..2026-02), so LB cannot serve as
 *   a line-level purchase source; it is used only as the monthly spend denominator below.
 *
 * Spend denominator - LB `GET /integration/v1/cashflow-actuals` contract 2 (`fetchCashflowMonths`):
 *   `inventoryCents` (LB's inventory/COGS bucket) per COMPLETE month, 2022-09..2026-09 at the check date.
 *   It is a floor: months carry `unclassifiedCents`, and 2022-09..2023-12 have `inventoryCents = 0`, so such months are
 *   reported as 'lb inventory empty' instead of getting a coverage figure. Months whose unclassified outflow
 *   exceeds `maxLbUnclassified` (default 0.5) x the inventory bucket are 'lb unclassified' (in 2024 LB shows
 *   ~$0.2-1k inventory beside ~$6-57k unclassified, so a "good" percentage there would be a coincidence).
 *
 * Drivers (per month and per week) - reliable ones only:
 *   - revenue: LB `incomeCents` (same endpoint; month grain only, 2023-01..2026-09). All classified income,
 *     not just food sales; there is NO weekly revenue source, so revenue ratios are monthly only.
 *   - customers, meals, events: `CommercialOrder` (Finance Core) with `status` in booked|paid|fulfilled|completed,
 *     bucketed by `serviceStartAt` (America/Chicago date), only through `asOf`. Coverage 2025-11 onward:
 *       customers = distinct `customerId` (else normalised `customerName`); named in no output, counts only.
 *       meals     = sum of `lineType = 'item'` line quantity (Happy Monday wholesale deliveries). Planner
 *                   meal-prep orders carry `recurring_service` lines with no portion count, so they add 0.
 *       events    = orders with `businessLineKey = 'events'` (planner events, 2026-07 onward).
 *     Each driver reports `coveredRevenueCents`: the order revenue that actually contributes to it. A driver
 *     is used for a month only when covered revenue / LB income >= `minDriverShare` (default 60%); otherwise
 *     the ratio is refused rather than computed from a driver that describes a minority of the business.
 *   - NOT used: Square orders sync / weekly orders (`Order`, 4 rows all 2026-03; LB `/items` sold lines are
 *     Square lines but start 2025-09 and carry no customer/portion field), Planner `revenue` (a forecast and
 *     billing-template number, not sales), `MealPrepProductionBatch` servings (1 blocked cycle, 2026-09).
 *
 * ## Assumptions that apply to every number below
 *   - Consumption rate per interval = quantity bought at the start of the interval / days until the next
 *     purchase (stock assumed roughly run down between orders; no carry-over, waste or off-record buying).
 *   - Spend is purchase spend, not usage; it is compared to LB spend only as a coverage check.
 *   - Scope: personal is excluded unless scope=all; unassigned is excluded from scope=business and always
 *     reported separately (never silently counted as business).
 *   - Lines whose vendor item is `ignored` are non-ingredients: excluded from spend, coverage and intervals,
 *     reported as `ignoredCents`.
 */

const { z } = require('zod');
const { effectiveScope, lineTotalCents, receiptKeyOf } = require('./receiptScope');

const SCOPE_MODES = ['business', 'business+unassigned', 'all'];
const SPEND_GROUPINGS = ['week', 'month', 'vendor', 'stock', 'category'];
const DRIVERS = ['revenue', 'customers', 'meals', 'events'];
const MIN_PURCHASES = 3;
const TIMEZONE = 'America/Chicago';
const DAY_MS = 86_400_000;
const ORDER_STATUSES = new Set(['booked', 'paid', 'fulfilled', 'completed']);
const ROLLING_WEEKS = 4;
const INTERVAL_ASSUMPTION =
  'Consumption per interval = quantity bought at the start of the interval / days until the next purchase. '
  + 'Assumes stock is roughly run down between orders: buying ahead, waste, stockpiles and purchases that are not '
  + 'in the data all distort it (buying ahead overstates use of that interval, missing purchases understate it). '
  + 'Low/high are the 25th/75th percentile of the per-interval rates.';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const fraction = (min, max, fallback) => z.coerce.number().min(min).max(max).default(fallback);

const paramsSchema = z.object({
  scope: z.enum(SCOPE_MODES).default('business'),
  by: z.enum(SPEND_GROUPINGS).default('month'),
  stock: z.string().min(1).optional(),
  minPurchases: z.coerce.number().int().min(2).max(50).default(MIN_PURCHASES),
  minCoverage: fraction(0, 1, 0.6),
  maxCoverage: fraction(1, 10, 1.5),
  maxLbUnclassified: fraction(0, 100, 0.5),
  minDriverShare: fraction(0, 1, 0.6),
  driver: z.enum([...DRIVERS, 'all']).default('all'),
  from: dateString.optional(),
  to: dateString.optional(),
  asOf: dateString.optional(),
});

// ---------------------------------------------------------------------------
// Dates and small statistics
// ---------------------------------------------------------------------------

const isoDate = (value) => (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
const dayNumber = (iso) => Math.floor(Date.parse(`${iso}T00:00:00.000Z`) / DAY_MS);
const fromDayNumber = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10);
const addDays = (iso, days) => fromDayNumber(dayNumber(iso) + days);
const monthOf = (iso) => iso.slice(0, 7);
const chicagoDate = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: TIMEZONE });

/** Week = Sunday..Saturday, matching the weekly meal-prep cycle (`mealPrepProduction.js`). Returns the Sunday. */
function weekStartOf(iso) {
  const dow = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
  return addDays(iso, -dow);
}

function nextMonth(month) {
  const [year, mon] = month.split('-').map(Number);
  return mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, '0')}`;
}

function monthRange(first, last) {
  const months = [];
  for (let m = first; m <= last; m = nextMonth(m)) months.push(m);
  return months;
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

const mean = (values) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null);

/** Sample standard deviation over the mean; null with fewer than 2 values or a zero mean. */
function coefficientOfVariation(values) {
  if (values.length < 2) return null;
  const m = mean(values);
  if (!m) return null;
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance) / m;
}

const round = (value, digits = 4) => (value === null || value === undefined ? null : Number(value.toFixed(digits)));

// ---------------------------------------------------------------------------
// Category (heuristic: stock products have `kind` raw|prep|... but no food category field)
// ---------------------------------------------------------------------------

function singular(token) {
  if (token.length > 3 && /ies$/.test(token)) return `${token.slice(0, -3)}y`;
  if (/(ch|sh|x|ss|o)es$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && /s$/.test(token) && !/ss$/.test(token)) return token.slice(0, -1);
  return token;
}

const words = (text) => String(text || '').toLowerCase().split(/[^a-z]+/).filter(Boolean).map(singular);
const keywordSet = (list) => new Set(list.split(/\s+/).map(singular));

// Order matters: first category with a matching word wins.
const CATEGORY_RULES = [
  ['bakery_prepared', keywordSet('bread bagel baguette bun roll tortilla pita croissant crust focaccia naan cracker')],
  ['meat_seafood', keywordSet('chicken duck turkey lamb beef pork bacon sausage bratwurst salami salame prosciutto ham jowl anchovy salmon fish shrimp tuna steak brisket venison goose trout cod crab oyster mussel scallop lobster mortadella chorizo pepperoni bologna')],
  ['dairy_eggs', keywordSet('milk cheese butter cream yogurt egg feta parmesan cheddar mozzarella gruyere pecorino ricotta kefir brie gouda havarti provolone mascarpone burrata idiazabal ghee curd camembert manchego gorgonzola cotija paneer halloumi fontina swiss asiago taleggio nectaire')],
  ['pantry', keywordSet('oil vinegar sauce canned preserve jam jelly salt pickle kimchi mustard ketchup mayo mayonnaise honey syrup molasses spice paprika cumin cinnamon extract vanilla stock broth paste sriracha tahini hummus olive caper peppercorn')],
  ['dry_goods', keywordSet('flour rice farro rye semolina durum pasta casarecce spaghetti noodle penne macaroni bean lentil chickpea oat grain wheat barley quinoa cornmeal polenta grit sugar yeast baking cacao chocolate cocoa almond cashew pecan pistachio walnut peanut hazelnut nut seed sesame dried raisin cereal granola couscous bulgur millet')],
  ['beverages', keywordSet('coffee tea juice soda wine beer water kombucha cider seltzer lemonade')],
  ['produce', keywordSet('apple pepper carrot cauliflower celery celeriac kale lettuce green arugula onion shallot garlic potato squash zucchini eggplant tomato avocado lemon lime orange peach pineapple kiwi kumquat fig mushroom shiitake fennel parsnip escarole pea herb basil parsley cilantro mint dill chive thyme rosemary sage beet radish cabbage broccoli spinach cucumber ginger strawberry blueberry raspberry blackberry pear plum grape mango papaya cherry melon corn asparagus leek turnip rutabaga kohlrabi chard collard sprout jalapeno habanero anaheim poblano banana apricot grapefruit pomegranate persimmon pumpkin fingerling yukon salad microgreen sunchoke radicchio endive frisee watercress artichoke okra tomatillo cress scallion ramp rhubarb currant')],
];
const NUT_WORDS = keywordSet('almond peanut cashew sunflower nut cocoa');

function categoryOfWords(tokens) {
  if (tokens.includes('butter') && tokens.some((t) => NUT_WORDS.has(t))) return 'pantry';
  if (tokens.includes('green') && tokens.includes('bean')) return 'produce';
  for (const [category, keywords] of CATEGORY_RULES) {
    if (tokens.some((t) => keywords.has(t))) return category;
  }
  return null;
}

/**
 * Keyword category from the stock product key/name, falling back to its aliases. Heuristic:
 * `uncategorized` means no keyword matched, not "not food".
 */
function categoryOfStock(stock) {
  if (!stock) return 'unmapped';
  return categoryOfWords(words(`${stock.key} ${stock.name || ''}`))
    || categoryOfWords(words((stock.aliases || []).join(' ')))
    || 'uncategorized';
}

// ---------------------------------------------------------------------------
// Purchase lines
// ---------------------------------------------------------------------------

/**
 * Convert one observation's quantity into base units of the stock product's dimension via the vendor
 * item's pack. Returns `{ baseQuantity }` or `{ reason }` (never throws, never guesses).
 */
function convertQuantity(observation, vendorItem, stock) {
  if (vendorItem.status === 'ignored') return { reason: 'ignored' };
  if (vendorItem.status !== 'mapped' || !stock) return { reason: 'unmapped' };
  const pack = Number(vendorItem.packBaseQuantity);
  if (!(pack > 0) || !vendorItem.packDimension) return { reason: 'no_pack' };
  const packs = observation.quantity === null || observation.quantity === undefined ? 1 : Number(observation.quantity);
  if (!(packs > 0)) return { reason: 'bad_quantity' };
  let baseQuantity = packs * pack;
  if (vendorItem.packDimension !== stock.dimension) {
    const density = Number(stock.densityGPerMl);
    if (!(density > 0)) return { reason: 'dimension_mismatch' };
    if (vendorItem.packDimension === 'volume' && stock.dimension === 'mass') baseQuantity *= density;
    else if (vendorItem.packDimension === 'mass' && stock.dimension === 'volume') baseQuantity /= density;
    else return { reason: 'dimension_mismatch' };
  }
  return { baseQuantity };
}

/**
 * Observation (with `vendorItem` and `vendorItem.stockProduct`) -> flat purchase line.
 * `unconvertedReason` is set when spend cannot be tied to a quantity in a stock product's dimension.
 */
function toPurchaseLine(observation) {
  const vendorItem = observation.vendorItem || {};
  const stock = vendorItem.stockProduct || null;
  const converted = convertQuantity(observation, vendorItem, stock);
  const spendCents = lineTotalCents(observation);
  const resolved = effectiveScope(observation, vendorItem);
  return {
    source: observation.source,
    sourceKey: observation.sourceKey,
    receiptKey: `${observation.source}:${receiptKeyOf(observation.sourceKey)}`,
    date: isoDate(observation.observedAt),
    vendorKey: vendorItem.vendorKey || vendorItem.vendorName || 'unknown',
    vendorName: vendorItem.vendorName || vendorItem.vendorKey || 'unknown',
    description: vendorItem.description || '',
    stockKey: stock ? stock.key : null,
    stockName: stock ? stock.name : null,
    dimension: stock ? stock.dimension : null,
    category: vendorItem.status === 'ignored' ? 'non_ingredient' : categoryOfStock(stock),
    scope: resolved.scope || 'unassigned',
    spendCents,
    unpriced: !(spendCents > 0),
    ignored: vendorItem.status === 'ignored',
    baseQuantity: converted.baseQuantity ?? null,
    unconvertedReason: converted.baseQuantity === undefined && converted.reason !== 'ignored' ? converted.reason : null,
  };
}

function inScope(line, scope) {
  if (line.scope === 'personal') return scope === 'all';
  if (line.scope === 'business') return true;
  return scope !== 'business';
}

// ---------------------------------------------------------------------------
// Purchase events and order intervals
// ---------------------------------------------------------------------------

/**
 * Group lines into purchase events: one per (series key, calendar day). Lines of the same
 * receipt/order or the same day collapse into one event, so an extra pack scanned on a second
 * receipt the same day is not an interval. Quantity sums only converted lines.
 */
function buildPurchaseEvents(lines, keyOf) {
  const series = new Map();
  for (const line of lines) {
    const key = keyOf(line);
    if (!series.has(key)) series.set(key, new Map());
    const days = series.get(key);
    const event = days.get(line.date) || { date: line.date, baseQuantity: null, spendCents: 0, lines: 0, receipts: new Set(), unconvertedLines: 0, unpricedLines: 0 };
    event.lines += 1;
    event.spendCents += line.spendCents;
    event.receipts.add(line.receiptKey);
    if (line.baseQuantity === null) event.unconvertedLines += 1;
    else event.baseQuantity = (event.baseQuantity || 0) + line.baseQuantity;
    if (line.unpriced) event.unpricedLines += 1;
    days.set(line.date, event);
  }
  return new Map([...series].map(([key, days]) => [key, [...days.values()].sort((a, b) => a.date.localeCompare(b.date))]));
}

function regularityLabel(cv) {
  if (cv === null) return null;
  if (cv < 0.35) return 'regular';
  if (cv < 0.75) return 'variable';
  return 'irregular';
}

/** Interval statistics for one sorted event series. Fewer than `minPurchases` events -> 'insufficient', no stats. */
function summarizeSeries(events, { asOf, minPurchases = MIN_PURCHASES } = {}) {
  const last = events[events.length - 1];
  const base = {
    purchases: events.length,
    firstPurchase: events[0].date,
    lastPurchase: last.date,
    daysSinceLast: asOf ? dayNumber(asOf) - dayNumber(last.date) : null,
    spendCents: events.reduce((sum, e) => sum + e.spendCents, 0),
    totalQuantity: events.reduce((sum, e) => sum + (e.baseQuantity || 0), 0),
    status: events.length < minPurchases ? 'insufficient' : 'ok',
  };
  if (base.status === 'insufficient') return base;

  const intervals = [];
  for (let i = 0; i < events.length - 1; i += 1) {
    const days = dayNumber(events[i + 1].date) - dayNumber(events[i].date);
    const quantity = events[i].baseQuantity;
    intervals.push({
      from: events[i].date,
      to: events[i + 1].date,
      days,
      quantity,
      ratePerDay: quantity !== null && days > 0 ? quantity / days : null,
    });
  }
  const days = intervals.map((i) => i.days);
  const sortedDays = [...days].sort((a, b) => a - b);
  const rates = intervals.map((i) => i.ratePerDay).filter((r) => r !== null).sort((a, b) => a - b);
  const cv = coefficientOfVariation(days);
  const medianInterval = percentile(sortedDays, 0.5);
  return {
    ...base,
    intervalsCount: intervals.length,
    intervalDays: { median: round(medianInterval, 1), mean: round(mean(days), 1), min: sortedDays[0], max: sortedDays[sortedDays.length - 1] },
    regularity: { cv: round(cv, 3), label: regularityLabel(cv) },
    sinceLastRatio: medianInterval && base.daysSinceLast !== null ? round(base.daysSinceLast / medianInterval, 2) : null,
    consumptionPerDay: rates.length
      ? { median: round(percentile(rates, 0.5)), low: round(percentile(rates, 0.25)), high: round(percentile(rates, 0.75)), samples: rates.length }
      : null,
    intervals,
  };
}

/**
 * Order intervals and estimated consumption per stock product, and per vendor x stock product.
 * Only in-scope, non-ignored lines tied to a stock product; the rest is reported, not dropped silently.
 */
function intervalReport(lines, { scope = 'business', stock = null, minPurchases = MIN_PURCHASES, asOf = null } = {}) {
  const candidates = lines.filter((l) => !l.ignored && l.stockKey && (!stock || l.stockKey === stock));
  const eligible = candidates.filter((l) => inScope(l, scope));
  const excluded = { personalLines: 0, unassignedLines: 0 };
  for (const line of candidates) {
    if (inScope(line, scope)) continue;
    if (line.scope === 'personal') excluded.personalLines += 1;
    else excluded.unassignedLines += 1;
  }

  const describe = (key, events, extra) => ({
    ...extra,
    dimension: eligible.find((l) => l.stockKey === (extra.stockKey))?.dimension || null,
    unconvertedLines: events.reduce((sum, e) => sum + e.unconvertedLines, 0),
    unpricedLines: events.reduce((sum, e) => sum + e.unpricedLines, 0),
    ...summarizeSeries(events, { asOf, minPurchases }),
  });
  const order = (a, b) => (a.status === b.status ? b.purchases - a.purchases || a.stockKey.localeCompare(b.stockKey) : a.status === 'ok' ? -1 : 1);

  const stocks = [...buildPurchaseEvents(eligible, (l) => l.stockKey)]
    .map(([key, events]) => describe(key, events, { stockKey: key }))
    .sort(order);
  const vendorStocks = [...buildPurchaseEvents(eligible, (l) => `${l.vendorKey}\u0000${l.stockKey}`)]
    .map(([key, events]) => {
      const [vendorKey, stockKey] = key.split('\u0000');
      return describe(key, events, { vendorKey, stockKey });
    })
    .sort(order);

  const unconverted = lines
    .filter((l) => !l.ignored && l.unconvertedReason && inScope(l, scope) && (!stock || l.stockKey === stock))
    .reduce((acc, l) => {
      acc.lines += 1;
      acc.spendCents += l.spendCents;
      acc.byReason[l.unconvertedReason] = (acc.byReason[l.unconvertedReason] || 0) + l.spendCents;
      return acc;
    }, { lines: 0, spendCents: 0, byReason: {} });

  return {
    scope,
    asOf,
    minPurchases,
    assumption: INTERVAL_ASSUMPTION,
    summary: {
      stockProducts: stocks.length,
      withEnoughHistory: stocks.filter((s) => s.status === 'ok').length,
      insufficient: stocks.filter((s) => s.status === 'insufficient').length,
    },
    stocks,
    vendorStocks,
    unconverted,
    excluded,
  };
}

// ---------------------------------------------------------------------------
// Spend rollups
// ---------------------------------------------------------------------------

function groupKey(line, by) {
  if (by === 'week') return weekStartOf(line.date);
  if (by === 'month') return monthOf(line.date);
  if (by === 'vendor') return line.vendorName;
  if (by === 'category') return line.category;
  return line.stockKey || `(unmapped) ${line.description}`;
}

const emptyBucket = (key) => ({
  key,
  spendCents: 0,
  businessCents: 0,
  unassignedCents: 0,
  personalCents: 0,
  unconvertedCents: 0,
  lines: 0,
});

/**
 * Spend rollup. `spendCents` is what the chosen scope counts; `businessCents`, `unassignedCents` and
 * `personalCents` are the raw scope splits of the same bucket (every non-ignored line, whatever the scope),
 * so unassigned money is always visible and never part of a business figure unless scope says so.
 * `unconvertedCents` is in-scope spend with no usable quantity (unmapped, no pack, bad quantity).
 */
function rollupSpend(lines, { by = 'month', scope = 'business' } = {}) {
  const buckets = new Map();
  const totals = { ...emptyBucket('total'), ignoredCents: 0, unconvertedByReason: {}, unpricedLines: 0 };
  for (const line of lines) {
    if (line.ignored) {
      if (inScope(line, scope)) totals.ignoredCents += line.spendCents;
      continue;
    }
    const key = groupKey(line, by);
    if (!buckets.has(key)) buckets.set(key, emptyBucket(key));
    for (const target of [buckets.get(key), totals]) {
      if (line.scope === 'business') target.businessCents += line.spendCents;
      else if (line.scope === 'personal') target.personalCents += line.spendCents;
      else target.unassignedCents += line.spendCents;
      if (!inScope(line, scope)) continue;
      target.spendCents += line.spendCents;
      target.lines += 1;
      if (line.unconvertedReason) target.unconvertedCents += line.spendCents;
    }
    if (inScope(line, scope)) {
      if (line.unpriced) totals.unpricedLines += 1;
      if (line.unconvertedReason) totals.unconvertedByReason[line.unconvertedReason] = (totals.unconvertedByReason[line.unconvertedReason] || 0) + line.spendCents;
    }
  }
  const timeBased = by === 'week' || by === 'month';
  const rows = [...buckets.values()].sort((a, b) => (timeBased ? a.key.localeCompare(b.key) : b.spendCents - a.spendCents || a.key.localeCompare(b.key)));
  return { by, scope, weekStartsOn: by === 'week' ? 'Sunday' : undefined, buckets: rows, totals };
}

// ---------------------------------------------------------------------------
// Coverage against Local Budget
// ---------------------------------------------------------------------------

/** First/last purchase and months with data per source and per vendor (all scopes; ignored lines excluded). */
function observedWindows(lines) {
  const build = (keyOf) => {
    const groups = new Map();
    for (const line of lines) {
      if (line.ignored) continue;
      const key = keyOf(line);
      const group = groups.get(key) || { key, firstPurchase: line.date, lastPurchase: line.date, months: new Set(), lines: 0, spendCents: 0 };
      if (line.date < group.firstPurchase) group.firstPurchase = line.date;
      if (line.date > group.lastPurchase) group.lastPurchase = line.date;
      group.months.add(monthOf(line.date));
      group.lines += 1;
      group.spendCents += line.spendCents;
      groups.set(key, group);
    }
    return [...groups.values()]
      .map((g) => {
        const span = monthRange(monthOf(g.firstPurchase), monthOf(g.lastPurchase)).length;
        return { key: g.key, firstPurchase: g.firstPurchase, lastPurchase: g.lastPurchase, monthsWithData: g.months.size, monthsInSpan: span, gapMonths: span - g.months.size, lines: g.lines, spendCents: g.spendCents };
      })
      .sort((a, b) => b.spendCents - a.spendCents || a.key.localeCompare(b.key));
  };
  return { bySource: build((l) => l.source), byVendor: build((l) => l.vendorName) };
}

const NO_LB = { available: false, error: 'Local Budget not queried', months: [] };

/**
 * Per-month purchase coverage against LB's inventory/COGS bucket:
 * coverage = in-scope ingredient purchase spend / LB `inventoryCents`.
 * status: 'ok' (>= minCoverage and <= maxCoverage), 'low coverage', 'exceeds lb' (> maxCoverage: the LB
 * bucket is too incomplete to be a denominator), 'lb unclassified' (LB's unclassified outflow for the month
 * exceeds `maxLbUnclassified` x its inventory bucket, so the bucket could be several times larger than shown
 * and any coverage figure would be a coincidence), 'lb inventory empty', 'no lb data'.
 */
function coverageReport(lines, lb = NO_LB, { scope = 'business', minCoverage = 0.6, maxCoverage = 1.5, maxLbUnclassified = 0.5 } = {}) {
  const spend = rollupSpend(lines, { by: 'month', scope });
  const bySpendMonth = new Map(spend.buckets.map((b) => [b.key, b]));
  const lbMonths = new Map((lb.months || []).filter((m) => m.complete).map((m) => [m.month, m]));
  const purchaseMonths = spend.buckets.map((b) => b.key);
  const lbKeys = [...lbMonths.keys()].sort();
  const first = purchaseMonths[0];
  const last = [purchaseMonths[purchaseMonths.length - 1], lbKeys[lbKeys.length - 1]].filter(Boolean).sort().pop();

  const months = first ? monthRange(first, last).map((month) => {
    const bucket = bySpendMonth.get(month) || emptyBucket(month);
    const lbRow = lbMonths.get(month) || null;
    let status;
    let coverage = null;
    if (!lb.available || !lbRow) status = 'no lb data';
    else if (!(lbRow.inventoryCents > 0)) status = 'lb inventory empty';
    else {
      coverage = bucket.spendCents / lbRow.inventoryCents;
      if ((lbRow.unclassifiedCents || 0) > maxLbUnclassified * lbRow.inventoryCents) status = 'lb unclassified';
      else status = coverage > maxCoverage ? 'exceeds lb' : coverage >= minCoverage ? 'ok' : 'low coverage';
    }
    return {
      month,
      observedCents: bucket.spendCents,
      unassignedCents: bucket.unassignedCents,
      personalCents: bucket.personalCents,
      lbInventoryCents: lbRow ? lbRow.inventoryCents : null,
      lbIncomeCents: lbRow ? lbRow.incomeCents : null,
      lbUnclassifiedCents: lbRow ? lbRow.unclassifiedCents : null,
      coverage: round(coverage, 3),
      status,
    };
  }) : [];

  return {
    scope,
    minCoverage,
    maxCoverage,
    maxLbUnclassified,
    basis: 'coverage = in-scope ingredient purchase spend / Local Budget inventory (COGS) bucket for the same complete month; LB inventory is a floor (see lbUnclassifiedCents)',
    lb: { available: Boolean(lb.available), error: lb.error || null, methodVersion: lb.methodVersion || null, sourceMaxDate: lb.sourceMaxDate || null, warnings: lb.warnings || [] },
    months,
    windows: observedWindows(lines),
  };
}

// ---------------------------------------------------------------------------
// Drivers and normalised ratios
// ---------------------------------------------------------------------------

/**
 * Orders (already dated and anonymised by `loadDriverOrders`) -> driver values for the window [start, end].
 * `coveredRevenueCents` is the revenue of the orders that can contribute to each driver.
 */
function driverTotals(orders, start, end) {
  const customers = new Set();
  const out = {
    orders: 0,
    orderRevenueCents: 0,
    customers: { value: 0, coveredRevenueCents: 0 },
    meals: { value: 0, coveredRevenueCents: 0 },
    events: { value: 0, coveredRevenueCents: 0 },
  };
  for (const order of orders) {
    if (!ORDER_STATUSES.has(order.status) || order.date < start || order.date > end) continue;
    out.orders += 1;
    out.orderRevenueCents += order.totalCents;
    if (order.customerKey) {
      customers.add(order.customerKey);
      out.customers.coveredRevenueCents += order.totalCents;
    }
    if (order.itemQuantity > 0) {
      out.meals.value += order.itemQuantity;
      out.meals.coveredRevenueCents += order.totalCents;
    }
    if (order.businessLineKey === 'events') {
      out.events.value += 1;
      out.events.coveredRevenueCents += order.totalCents;
    }
  }
  out.customers.value = customers.size;
  return out;
}

const monthBounds = (month) => ({ start: `${month}-01`, end: addDays(`${nextMonth(month)}-01`, -1) });

function usableDriver(driver, incomeCents, minDriverShare) {
  const share = incomeCents > 0 ? driver.coveredRevenueCents / incomeCents : null;
  if (!(driver.value > 0)) return { value: driver.value, shareOfRevenue: round(share, 3), usable: false, reason: 'no activity recorded' };
  if (share === null) return { value: driver.value, shareOfRevenue: null, usable: false, reason: 'no revenue to compare with' };
  if (share < minDriverShare) return { value: driver.value, shareOfRevenue: round(share, 3), usable: false, reason: 'driver covers too little of revenue' };
  return { value: driver.value, shareOfRevenue: round(share, 3), usable: true, reason: null };
}

const perUnit = (spendCents, value) => (value > 0 ? Math.round(spendCents / value) : null);

/**
 * Cost ratios for months whose purchase coverage qualifies (status 'ok'); other months are listed with
 * their status and no ratios. Drivers other than revenue are used only when `minDriverShare` of the
 * month's LB income is covered by orders that carry that driver. The rolling 4-week series (Sunday weeks)
 * has no revenue ratio (LB revenue is monthly) and qualifies only when every month it touches does.
 */
function ratioReport(lines, lb, orders, { scope = 'business', minCoverage = 0.6, maxCoverage = 1.5, maxLbUnclassified = 0.5, minDriverShare = 0.6, driver = 'all', asOf = null } = {}) {
  const coverage = coverageReport(lines, lb, { scope, minCoverage, maxCoverage, maxLbUnclassified });
  const wanted = (name) => driver === 'all' || driver === name;
  const lbMonths = new Map((lb.months || []).filter((m) => m.complete).map((m) => [m.month, m]));

  const monthly = coverage.months.map((row) => {
    const out = { month: row.month, spendCents: row.observedCents, unassignedCents: row.unassignedCents, coverage: row.coverage, status: row.status, revenueCents: row.lbIncomeCents, drivers: {}, foodCostPctOfRevenue: null, costPer: {} };
    if (row.status !== 'ok') return out;
    const { start, end } = monthBounds(row.month);
    const totals = driverTotals(orders, start, end);
    if (wanted('revenue')) out.foodCostPctOfRevenue = row.lbIncomeCents > 0 ? round((row.observedCents / row.lbIncomeCents) * 100, 1) : null;
    for (const [name, label] of [['customers', 'customer'], ['meals', 'meal'], ['events', 'event']]) {
      if (!wanted(name)) continue;
      out.drivers[name] = usableDriver(totals[name], row.lbIncomeCents, minDriverShare);
      out.costPer[label] = out.drivers[name].usable ? perUnit(row.observedCents, totals[name].value) : null;
    }
    return out;
  });
  const monthlyByKey = new Map(monthly.map((m) => [m.month, m]));

  // Rolling windows over Sunday weeks that are fully in the past.
  const rolling = [];
  const spendWeeks = rollupSpend(lines, { by: 'week', scope }).buckets;
  if (spendWeeks.length && asOf) {
    const spendByWeek = new Map(spendWeeks.map((w) => [w.key, w.spendCents]));
    const lastWeek = addDays(weekStartOf(asOf), -7);
    for (let startWeek = spendWeeks[0].key; addDays(startWeek, 7 * (ROLLING_WEEKS - 1)) <= lastWeek; startWeek = addDays(startWeek, 7)) {
      const end = addDays(startWeek, 7 * ROLLING_WEEKS - 1);
      let spendCents = 0;
      for (let i = 0; i < ROLLING_WEEKS; i += 1) spendCents += spendByWeek.get(addDays(startWeek, 7 * i)) || 0;
      const touched = [...new Set([monthOf(startWeek), monthOf(end)])];
      const touchedRows = touched.map((m) => monthlyByKey.get(m));
      const row = { start: startWeek, end, spendCents, status: 'ok', drivers: {}, costPer: {} };
      const bad = touchedRows.find((m) => !m || m.status !== 'ok');
      if (bad !== undefined || touchedRows.some((m) => !m)) {
        row.status = touchedRows.find((m) => m && m.status !== 'ok')?.status || 'no lb data';
        rolling.push(row);
        continue;
      }
      const totals = driverTotals(orders, startWeek, end);
      for (const [name, label] of [['customers', 'customer'], ['meals', 'meal'], ['events', 'event']]) {
        if (!wanted(name)) continue;
        const usable = touchedRows.every((m) => m.drivers[name]?.usable);
        row.drivers[name] = { value: totals[name].value, usable };
        row.costPer[label] = usable && totals[name].value > 0 ? perUnit(spendCents, totals[name].value) : null;
      }
      rolling.push(row);
    }
  }

  const qualifying = monthly.filter((m) => m.status === 'ok');
  return {
    scope,
    minCoverage,
    maxCoverage,
    minDriverShare,
    driver,
    asOf,
    lb: coverage.lb,
    driverSources: {
      revenue: 'Local Budget cashflow-actuals incomeCents, month grain, complete months only (all classified income, not food sales only)',
      customers: 'distinct customers on CommercialOrder (booked|paid|fulfilled|completed) by service date',
      meals: 'sum of item-line quantity on CommercialOrder (wholesale deliveries only; meal-prep plans carry no portion count)',
      events: 'CommercialOrder with businessLineKey=events by service date',
    },
    summary: { months: monthly.length, qualifying: qualifying.length, refused: monthly.length - qualifying.length, lbMonths: lbMonths.size },
    monthly,
    rolling4w: rolling,
  };
}

// ---------------------------------------------------------------------------
// Loaders (thin Prisma wrappers) and the shared entry point for the router and CLI
// ---------------------------------------------------------------------------

const dayStart = (iso) => new Date(`${iso}T00:00:00.000Z`);
const dayEnd = (iso) => new Date(`${iso}T23:59:59.999Z`);

async function loadPurchaseLines(prisma, { from, to } = {}) {
  const observations = await prisma.costObservation.findMany({
    where: from || to ? { observedAt: { ...(from ? { gte: dayStart(from) } : {}), ...(to ? { lte: dayEnd(to) } : {}) } } : undefined,
    orderBy: { observedAt: 'asc' },
    select: {
      source: true,
      sourceKey: true,
      observedAt: true,
      packCostCents: true,
      quantity: true,
      lineTotalCents: true,
      scope: true,
      scopeSource: true,
      vendorItemId: true,
      vendorItem: {
        select: {
          vendorKey: true,
          vendorName: true,
          description: true,
          status: true,
          packBaseQuantity: true,
          packDimension: true,
          defaultScope: true,
          stockProduct: { select: { key: true, name: true, kind: true, dimension: true, densityGPerMl: true, aliases: true } },
        },
      },
    },
  });
  return observations.map(toPurchaseLine);
}

/** Dated, anonymised commercial orders for driver counting. Customer identity never leaves this function. */
async function loadDriverOrders(prisma, { from, to } = {}) {
  const rows = await prisma.commercialOrder.findMany({
    where: { serviceStartAt: { not: null, ...(from ? { gte: dayStart(from) } : {}), ...(to ? { lte: dayEnd(to) } : {}) } },
    select: {
      status: true,
      businessLineKey: true,
      serviceStartAt: true,
      totalCents: true,
      customerId: true,
      customerName: true,
      lines: { select: { lineType: true, quantity: true } },
    },
  });
  return rows.map((row) => ({
    status: row.status,
    businessLineKey: row.businessLineKey,
    date: chicagoDate(row.serviceStartAt),
    totalCents: row.totalCents,
    customerKey: row.customerId ? `id:${row.customerId}` : row.customerName ? `name:${String(row.customerName).trim().toLowerCase()}` : null,
    itemQuantity: row.lines.filter((l) => l.lineType === 'item').reduce((sum, l) => sum + Number(l.quantity || 0), 0),
  }));
}

/** Complete months from the first purchase month to the month before `asOf`. Never throws; failure is reported. */
async function loadLocalBudgetMonths(client, lines, asOf) {
  if (!lines.length) return { ...NO_LB, error: 'no purchases to compare' };
  if (!client || typeof client.fetchCashflowMonths !== 'function') return NO_LB;
  const first = lines.reduce((min, l) => (l.date < min ? l.date : min), lines[0].date);
  const from = `${monthOf(first)}-01`;
  const toExclusive = `${monthOf(asOf)}-01`;
  if (toExclusive <= from) return { ...NO_LB, error: 'no complete month in range' };
  try {
    return { available: true, error: null, ...(await client.fetchCashflowMonths({ from, toExclusive })) };
  } catch (error) {
    return { available: false, error: String(error?.message || error).slice(0, 200), months: [] };
  }
}

const KINDS = ['intervals', 'spend', 'coverage', 'ratios'];

/** One entry point for the router and the CLI: validates params, loads, and returns the report. */
async function runUsage(prisma, kind, rawParams = {}, { localBudgetClient = null, now = new Date() } = {}) {
  if (!KINDS.includes(kind)) throw new Error(`unknown usage report: ${kind}`);
  const params = paramsSchema.parse(rawParams);
  const asOf = params.asOf || chicagoDate(now);
  const lines = await loadPurchaseLines(prisma, params);
  if (kind === 'intervals') return intervalReport(lines, { scope: params.scope, stock: params.stock || null, minPurchases: params.minPurchases, asOf });
  if (kind === 'spend') return rollupSpend(lines, { by: params.by, scope: params.scope });
  const lb = await loadLocalBudgetMonths(localBudgetClient, lines, asOf);
  if (kind === 'coverage') return coverageReport(lines, lb, params);
  const first = lines.length ? lines.reduce((min, l) => (l.date < min ? l.date : min), lines[0].date) : asOf;
  const orders = await loadDriverOrders(prisma, { from: addDays(first, -7), to: asOf });
  return ratioReport(lines, lb, orders, { ...params, asOf });
}

module.exports = {
  DRIVERS,
  INTERVAL_ASSUMPTION,
  KINDS,
  MIN_PURCHASES,
  SCOPE_MODES,
  SPEND_GROUPINGS,
  buildPurchaseEvents,
  categoryOfStock,
  coverageReport,
  driverTotals,
  intervalReport,
  loadDriverOrders,
  loadLocalBudgetMonths,
  loadPurchaseLines,
  observedWindows,
  paramsSchema,
  ratioReport,
  rollupSpend,
  runUsage,
  summarizeSeries,
  toPurchaseLine,
  weekStartOf,
};
