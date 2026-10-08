#!/usr/bin/env node
/**
 * Food Operations Core usage analytics CLI (docs/architecture/food-operations-core-plan.md, 4d).
 * READ-ONLY: nothing here writes to the database or to Local Budget. Add --json for machine output.
 *
 *   node scripts/food-ops-usage.cjs intervals [--stock key] [--min-purchases 3] [--vendor] [--limit 40] [--scope business|business+unassigned|all]
 *   node scripts/food-ops-usage.cjs spend     [--by month|week|vendor|stock|category] [--scope ...] [--limit 40]
 *   node scripts/food-ops-usage.cjs coverage  [--scope ...] [--min-coverage 0.6]
 *   node scripts/food-ops-usage.cjs ratios    [--driver revenue|customers|meals|events] [--scope ...] [--min-coverage 0.6] [--min-driver-share 0.6]
 *
 * Common: --from YYYY-MM-DD --to YYYY-MM-DD (purchase window), --as-of YYYY-MM-DD.
 * Default scope is `business`; receipts are unassigned until the owner assigns scope, so use
 * `--scope business+unassigned` to explore before then (unassigned dollars are always shown separately).
 * Money is shown in dollars; quantities are in the stock product's base unit (g, ml or each).
 */
require('dotenv').config();

const fs = require('fs');
const usage = require('../backend/api/foodOps/usage');
const localBudget = require('../backend/api/foodOps/localBudgetClient');

const command = process.argv[2];
const args = process.argv.slice(3);
const has = (flag) => args.includes(flag);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

let prismaInstance = null;
function prisma() {
  if (!prismaInstance) {
    const { PrismaClient } = require('@prisma/client');
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

const params = () => {
  const out = {};
  const map = { '--scope': 'scope', '--by': 'by', '--stock': 'stock', '--min-purchases': 'minPurchases', '--min-coverage': 'minCoverage', '--max-lb-unclassified': 'maxLbUnclassified', '--min-driver-share': 'minDriverShare', '--driver': 'driver', '--from': 'from', '--to': 'to', '--as-of': 'asOf' };
  for (const [flag, key] of Object.entries(map)) if (value(flag) !== undefined) out[key] = value(flag);
  return out;
};

const limit = () => (value('--limit') ? Number(value('--limit')) : 40);
const usd = (cents) => (cents === null || cents === undefined ? '-' : `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
const pct = (fraction) => (fraction === null || fraction === undefined ? '-' : `${Math.round(fraction * 100)}%`);
const num = (v, digits = 1) => (v === null || v === undefined ? '-' : Number(v).toLocaleString('en-US', { maximumFractionDigits: digits }));

function table(rows, columns) {
  const widths = columns.map(([header, pick]) => Math.max(header.length, ...rows.map((row) => String(pick(row)).length)));
  const line = (cells) => cells.map((cell, i) => (i === 0 ? String(cell).padEnd(widths[i]) : String(cell).padStart(widths[i]))).join('  ');
  return [line(columns.map(([header]) => header)), line(widths.map((w) => '-'.repeat(w))), ...rows.map((row) => line(columns.map(([, pick]) => pick(row))))].join('\n');
}

const UNIT = { mass: 'g', volume: 'ml', count: 'ea' };

function printIntervals(report) {
  const rows = has('--vendor') ? report.vendorStocks : report.stocks;
  const shown = rows.slice(0, limit());
  console.log(`Scope: ${report.scope}. ${report.summary.stockProducts} stock products, ${report.summary.withEnoughHistory} with >= ${report.minPurchases} purchases, ${report.summary.insufficient} insufficient.`);
  console.log(`Unconverted spend (no usable quantity): ${usd(report.unconverted.spendCents)} on ${report.unconverted.lines} lines ${JSON.stringify(report.unconverted.byReason)}`);
  console.log(`Excluded by scope: ${report.excluded.unassignedLines} unassigned lines, ${report.excluded.personalLines} personal lines.`);
  console.log(`Assumption: ${report.assumption}\n`);
  const columns = [
    [has('--vendor') ? 'vendor / stock' : 'stock', (r) => (has('--vendor') ? `${r.vendorKey} / ${r.stockKey}` : r.stockKey)],
    ['buys', (r) => r.purchases],
    ['first', (r) => r.firstPurchase],
    ['last', (r) => r.lastPurchase],
    ['since', (r) => (r.daysSinceLast === null ? '-' : `${r.daysSinceLast}d`)],
    ['med d', (r) => num(r.intervalDays?.median)],
    ['mean d', (r) => num(r.intervalDays?.mean)],
    ['cv', (r) => num(r.regularity?.cv, 2)],
    ['use/day low', (r) => num(r.consumptionPerDay?.low, 1)],
    ['med', (r) => num(r.consumptionPerDay?.median, 1)],
    ['high', (r) => num(r.consumptionPerDay?.high, 1)],
    ['unit', (r) => UNIT[r.dimension] || ''],
    ['spend', (r) => usd(r.spendCents)],
    ['status', (r) => r.status],
  ];
  console.log(table(shown, columns));
  if (rows.length > shown.length) console.log(`... ${rows.length - shown.length} more (use --limit)`);
}

function printSpend(report) {
  const timeBased = report.by === 'week' || report.by === 'month';
  const rows = timeBased ? report.buckets : report.buckets.slice(0, limit());
  console.log(`Spend by ${report.by}, scope: ${report.scope}${report.by === 'week' ? ' (weeks start Sunday)' : ''}. Ignored (non-ingredient) lines excluded.\n`);
  console.log(table(rows, [
    [report.by, (r) => r.key],
    ['counted', (r) => usd(r.spendCents)],
    ['business', (r) => usd(r.businessCents)],
    ['unassigned', (r) => usd(r.unassignedCents)],
    ['personal', (r) => usd(r.personalCents)],
    ['unconverted', (r) => usd(r.unconvertedCents)],
    ['lines', (r) => r.lines],
  ]));
  const t = report.totals;
  console.log(`\nTotal counted ${usd(t.spendCents)} | business ${usd(t.businessCents)} | unassigned ${usd(t.unassignedCents)} | personal ${usd(t.personalCents)} | unconverted ${usd(t.unconvertedCents)} | ignored non-ingredient ${usd(t.ignoredCents)}`);
  if (!timeBased && report.buckets.length > rows.length) console.log(`... ${report.buckets.length - rows.length} more (use --limit)`);
}

function printWindows(windows) {
  const cols = (label) => [
    [label, (r) => r.key],
    ['first', (r) => r.firstPurchase],
    ['last', (r) => r.lastPurchase],
    ['months', (r) => `${r.monthsWithData}/${r.monthsInSpan}`],
    ['lines', (r) => r.lines],
    ['spend', (r) => usd(r.spendCents)],
  ];
  console.log('\nObserved window by source (months with data / months in span):');
  console.log(table(windows.bySource, cols('source')));
  console.log(`\nObserved window by vendor (top ${Math.min(limit(), windows.byVendor.length)} by spend):`);
  console.log(table(windows.byVendor.slice(0, limit()), cols('vendor')));
}

function printLb(lb) {
  if (!lb.available) console.log(`Local Budget UNAVAILABLE: ${lb.error}. No coverage or ratios can be computed.`);
  else console.log(`Local Budget ${lb.methodVersion}, source max date ${lb.sourceMaxDate}. ${lb.warnings.join(' | ')}`);
}

function printCoverage(report) {
  console.log(`Scope: ${report.scope}. ${report.basis}`);
  console.log(`Qualifies at coverage ${pct(report.minCoverage)}..${pct(report.maxCoverage)}.`);
  printLb(report.lb);
  console.log();
  console.log(table(report.months, [
    ['month', (r) => r.month],
    ['observed', (r) => usd(r.observedCents)],
    ['unassigned', (r) => usd(r.unassignedCents)],
    ['lb inventory', (r) => usd(r.lbInventoryCents)],
    ['lb unclass.', (r) => usd(r.lbUnclassifiedCents)],
    ['coverage', (r) => pct(r.coverage)],
    ['status', (r) => r.status],
  ]));
  printWindows(report.windows);
}

function printRatios(report) {
  console.log(`Scope: ${report.scope}. Ratios only for months with coverage in ${pct(report.minCoverage)}..${pct(report.maxCoverage)}; per-unit drivers need >= ${pct(report.minDriverShare)} of LB income.`);
  printLb(report.lb);
  console.log(`${report.summary.qualifying} of ${report.summary.months} months qualify (${report.summary.refused} refused).\n`);
  const driverCell = (name) => (r) => {
    const d = r.drivers[name];
    if (!d) return r.status === 'ok' ? 'n/a' : 'refused';
    return d.usable ? `${num(d.value, 0)} (${pct(d.shareOfRevenue)})` : `x ${d.reason === 'no activity recorded' ? 'none' : pct(d.shareOfRevenue)}`;
  };
  console.log(table(report.monthly, [
    ['month', (r) => r.month],
    ['status', (r) => r.status],
    ['coverage', (r) => pct(r.coverage)],
    ['spend', (r) => usd(r.spendCents)],
    ['revenue', (r) => usd(r.revenueCents)],
    ['food cost %', (r) => (r.foodCostPctOfRevenue === null ? '-' : `${r.foodCostPctOfRevenue}%`)],
    ['customers', driverCell('customers')],
    ['$/customer', (r) => usd(r.costPer.customer)],
    ['meals', driverCell('meals')],
    ['$/meal', (r) => (r.costPer.meal === null || r.costPer.meal === undefined ? '-' : `$${(r.costPer.meal / 100).toFixed(2)}`)],
    ['events', driverCell('events')],
    ['$/event', (r) => usd(r.costPer.event)],
  ]));
  console.log('\nDriver cells: value (share of LB income carried by orders that feed the driver); "x" = refused (driver too thin or absent).');
  const usable = report.rolling4w.filter((w) => w.status === 'ok');
  console.log(`\nRolling 4-week windows: ${usable.length} of ${report.rolling4w.length} qualify.`);
  console.log(table(report.rolling4w.slice(-12), [
    ['window', (r) => `${r.start}..${r.end}`],
    ['spend', (r) => usd(r.spendCents)],
    ['status', (r) => r.status],
    ['$/customer', (r) => usd(r.costPer.customer)],
    ['$/meal', (r) => (r.costPer.meal === null || r.costPer.meal === undefined ? '-' : `$${(r.costPer.meal / 100).toFixed(2)}`)],
    ['$/event', (r) => usd(r.costPer.event)],
  ]));
  console.log('\nDriver sources:');
  for (const [name, text] of Object.entries(report.driverSources)) console.log(`  ${name}: ${text}`);
}

const PRINTERS = { intervals: printIntervals, spend: printSpend, coverage: printCoverage, ratios: printRatios };

(async () => {
  if (!PRINTERS[command]) {
    const text = fs.readFileSync(__filename, 'utf8').split('*/')[0].split('\n').slice(2);
    console.log(text.map((line) => line.replace(/^ \* ?/, '')).join('\n'));
    process.exitCode = 1;
    return;
  }
  try {
    const report = await usage.runUsage(prisma(), command, params(), { localBudgetClient: localBudget });
    if (has('--json')) console.log(JSON.stringify(report, null, 2));
    else PRINTERS[command](report);
  } catch (error) {
    console.error(error.name === 'ZodError' ? JSON.stringify(error.issues, null, 2) : '', error.message);
    process.exitCode = 1;
  } finally {
    if (prismaInstance) await prismaInstance.$disconnect();
  }
})();
