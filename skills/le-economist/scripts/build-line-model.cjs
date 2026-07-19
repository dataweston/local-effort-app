#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('=');
    if (at < 1) continue;
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = { repo: process.cwd(), start: '2026-04-01', end: '2026-06-30' };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--help') args.help = true;
    else if (['--repo', '--start', '--end', '--config'].includes(key)) args[key.slice(2)] = argv[++i];
    else throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

function isoDay(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error(`${label} must be YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is not a valid date`);
  return date;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function completeCalendarMonths(start, end) {
  const nextDay = addDays(end, 1);
  const isFirst = start.getUTCDate() === 1;
  const isLast = nextDay.getUTCDate() === 1;
  if (!isFirst || !isLast) return null;
  return (nextDay.getUTCFullYear() - start.getUTCFullYear()) * 12
    + nextDay.getUTCMonth() - start.getUTCMonth();
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function mapLine(name, config) {
  const normalized = normalizeName(name);
  if (!normalized) return config.unallocatedLine;
  if ((config.unallocatedLine.neverAutoMapPatterns || []).some((p) => new RegExp(p, 'i').test(normalized))) {
    return config.unallocatedLine;
  }
  for (const line of config.lines) {
    if ((line.squareNamePatterns || []).some((p) => new RegExp(p, 'i').test(normalized))) return line;
  }
  return config.unallocatedLine;
}

function blankLineResult(line) {
  return {
    id: line.id,
    name: line.name,
    observedSquareRevenue: 0,
    observedOrders: new Set(),
    observedUnits: 0,
    itemLabels: new Map(),
  };
}

function finalizeLine(line, squareRevenue) {
  const orderCount = line.observedOrders.size;
  return {
    id: line.id,
    name: line.name,
    observedSquareRevenue: roundMoney(line.observedSquareRevenue),
    observedOrderCount: orderCount,
    observedUnits: roundMoney(line.observedUnits),
    averageObservedRevenuePerOrder: orderCount ? roundMoney(line.observedSquareRevenue / orderCount) : null,
    shareOfObservedSquareRevenue: squareRevenue ? Math.round(line.observedSquareRevenue / squareRevenue * 10000) / 10000 : null,
    observedItemLabels: [...line.itemLabels.entries()]
      .map(([name, amount]) => ({ name, revenue: roundMoney(amount) }))
      .sort((a, b) => b.revenue - a.revenue),
    contributionMarginStatus: 'blocked_missing_line_cost_drivers',
  };
}

function kitchenHourlyCost(hours, policy) {
  if (!Number.isFinite(hours) || hours < 0) return null;
  return roundMoney(
    Math.min(hours, policy.firstTierHoursPerMonth) * policy.firstTierHourlyRate
      + Math.max(hours - policy.firstTierHoursPerMonth, 0) * policy.remainingHourlyRate
  );
}

function buildScenario(config) {
  const requiredCash = [
    'monthlyOrders', 'averageRevenuePerOrder', 'ingredientCostPerOrder',
    'paidLaborHoursPerOrder', 'paidLaborHourlyRate', 'kitchenHoursPerOrder',
    'packagingDeliveryPerOrder', 'otherVariableCostPerOrder',
  ];
  const prepared = config.lines.map((line) => {
    const inputs = line.scenarioInputs || {};
    return { line, inputs, missingCash: requiredCash.filter((key) => !Number.isFinite(inputs[key])) };
  });
  const portfolioCashReady = prepared.every((item) => item.missingCash.length === 0);
  const totalKitchenHours = portfolioCashReady
    ? prepared.reduce((sum, { inputs }) => sum + inputs.monthlyOrders * inputs.kitchenHoursPerOrder, 0)
    : null;
  const hourlyKitchenCost = portfolioCashReady ? kitchenHourlyCost(totalKitchenHours, config.kitchen) : null;
  const results = prepared.map(({ line, inputs, missingCash }) => {
    const missingEconomic = ['founderLaborHoursPerOrder', 'founderLaborHourlyRate']
      .filter((key) => !Number.isFinite(inputs[key]));
    if (missingCash.length) {
      return { id: line.id, name: line.name, status: 'blocked', missingCashInputs: missingCash, missingEconomicInputs: missingEconomic };
    }
    const monthlyRevenue = inputs.monthlyOrders * inputs.averageRevenuePerOrder;
    const lineKitchenHours = inputs.monthlyOrders * inputs.kitchenHoursPerOrder;
    const allocatedHourlyKitchen = totalKitchenHours > 0 ? hourlyKitchenCost * lineKitchenHours / totalKitchenHours : 0;
    const cashVariableCosts = inputs.monthlyOrders * (
      inputs.ingredientCostPerOrder
      + inputs.paidLaborHoursPerOrder * inputs.paidLaborHourlyRate
      + inputs.packagingDeliveryPerOrder
      + inputs.otherVariableCostPerOrder
    ) + allocatedHourlyKitchen;
    const cashContribution = monthlyRevenue - cashVariableCosts;
    const founderLaborCost = missingEconomic.length
      ? null
      : inputs.monthlyOrders * inputs.founderLaborHoursPerOrder * inputs.founderLaborHourlyRate;
    return {
      id: line.id,
      name: line.name,
      status: missingEconomic.length ? 'cash_ready_economic_blocked' : 'ready',
      monthlyOrders: inputs.monthlyOrders,
      monthlyOrderCapacity: inputs.monthlyOrderCapacity,
      capacityUtilization: Number.isFinite(inputs.monthlyOrderCapacity) && inputs.monthlyOrderCapacity > 0
        ? Math.round(inputs.monthlyOrders / inputs.monthlyOrderCapacity * 10000) / 10000 : null,
      monthlyRevenue: roundMoney(monthlyRevenue),
      monthlyKitchenHours: roundMoney(lineKitchenHours),
      allocatedHourlyKitchenCost: roundMoney(allocatedHourlyKitchen),
      cashVariableCosts: roundMoney(cashVariableCosts),
      cashContributionBeforeStorageAndFixedOverhead: roundMoney(cashContribution),
      cashContributionMargin: monthlyRevenue ? Math.round(cashContribution / monthlyRevenue * 10000) / 10000 : null,
      founderLaborCost: founderLaborCost == null ? null : roundMoney(founderLaborCost),
      economicContributionBeforeStorageAndFixedOverhead: founderLaborCost == null ? null : roundMoney(cashContribution - founderLaborCost),
      missingEconomicInputs: missingEconomic,
    };
  });
  const ready = results.every((line) => line.status !== 'blocked');
  return {
    status: ready ? 'cash_ready' : 'blocked',
    totalKitchenHours: totalKitchenHours == null ? null : roundMoney(totalKitchenHours),
    hourlyKitchenCost,
    monthlyStorageFixedOverhead: config.kitchen.monthlyStorage,
    lines: results,
    note: 'Hourly kitchen cost is allocated by modeled kitchen hours. Storage remains portfolio fixed overhead. Do not also include these amounts in another overhead line.',
  };
}

function classifyPosting(row) {
  const category = String(row.category || '');
  const classification = String(row.classification || '').toUpperCase();
  // Local Budget's reviewed effective classification owns the P&L bucket.
  // Direction alone is insufficient: investment and reimbursement receipts can
  // also have an INCOME transaction direction.
  if (row.type === 'TRANSFER' || classification === 'TRANSFER') return 'transfer';
  if (classification === 'INCOME') return 'revenue';
  if (classification === 'REIMBURSEMENT') return 'reimbursementIncome';
  if (classification === 'REIMBURSABLE') return 'reimbursableExpense';
  if (/labor|payroll|wage|contractor|staff/i.test(category)) return 'paidLabor';
  if (classification === 'COGS') return 'cogs';
  if (classification === 'OPERATING') return 'operatingExLabor';
  if (classification === 'PERSONAL') return 'personalFounderDraws';
  if (row.type === 'INCOME') return 'excludedOrUnresolvedIncome';
  return 'unknownOrUnresolved';
}

async function localBudgetActuals(repo, startText, endExclusiveText) {
  const url = String(process.env.LOCAL_BUDGET_DATABASE_URL || '').trim()
    .replace(/^["']|["']$/g, '').replace(/^[A-Z_]+=/, '').replace(/^["']|["']$/g, '');
  if (!url) throw new Error('LOCAL_BUDGET_DATABASE_URL is required for authoritative cash actuals');
  const clientModule = require(require.resolve('@prisma/client', { paths: [repo] }));
  const prisma = new clientModule.PrismaClient({ datasources: { db: { url } } });
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        t.id,
        t.date,
        t.type::text AS type,
        COALESCE(sc.name, c.name, 'Uncategorized') AS category,
        COALESCE(
          s.classification::text,
          sc."defaultClassification"::text,
          t.classification::text,
          c."defaultClassification"::text,
          CASE WHEN t.type::text = 'TRANSFER' THEN 'TRANSFER'
               ELSE 'UNKNOWN' END
        ) AS classification,
        ABS(CASE WHEN s.id IS NULL THEN t.amount ELSE s.amount END) AS amount
      FROM transactions t
      LEFT JOIN categories c ON c.id = t."categoryId"
      LEFT JOIN transaction_splits s ON s."transactionId" = t.id
      LEFT JOIN categories sc ON sc.id = s."categoryId"
      WHERE t.date >= $1::date AND t.date < $2::date
        AND t.status::text = 'POSTED'
      ORDER BY t.date, t.id
    `, startText, endExclusiveText);
    const freshness = await prisma.$queryRawUnsafe(`
      SELECT MAX(date) AS "lastTransactionDate"
      FROM transactions WHERE status::text = 'POSTED'
    `);
    const totals = {
      revenue: 0, cogs: 0, paidLabor: 0, operatingExLabor: 0,
      personalFounderDraws: 0, reimbursementIncome: 0,
      reimbursableExpense: 0, excludedOrUnresolvedIncome: 0,
      unknownOrUnresolved: 0, transfer: 0,
    };
    for (const row of rows) {
      const bucket = classifyPosting(row);
      totals[bucket] += Number(row.amount || 0);
    }
    for (const key of Object.keys(totals)) totals[key] = roundMoney(totals[key]);
    return {
      source: 'local_budget_read_only_database',
      lastTransactionDate: freshness[0]?.lastTransactionDate?.toISOString?.().slice(0, 10) || null,
      postingCount: rows.length,
      totals,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function squareAttribution(repo, start, endExclusive, config) {
  const clientModule = require(require.resolve('@prisma/client', { paths: [repo] }));
  const prisma = new clientModule.PrismaClient();
  try {
    const events = await prisma.ledgerEvent.findMany({
      where: {
        eventType: 'order.placed', source: 'square', tombstonedAt: null,
        occurredAt: { gte: start, lt: endExclusive },
      },
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
    });
    const latestByOrder = new Map();
    for (const event of events) latestByOrder.set(event.sourceId || event.id, event);
    const deduped = [...latestByOrder.values()];
    const allDefs = [...config.lines, config.unallocatedLine];
    const byLine = new Map(allDefs.map((line) => [line.id, blankLineResult(line)]));
    let orderRevenue = 0;
    let lineRevenue = 0;
    for (const event of deduped) {
      const payload = event.payload || {};
      orderRevenue += Number(payload.totalCents || 0) / 100;
      for (const item of payload.lineItems || []) {
        const amount = Number(item.totalCents || 0) / 100;
        const lineDef = mapLine(item.name, config);
        const result = byLine.get(lineDef.id);
        result.observedSquareRevenue += amount;
        result.observedOrders.add(event.sourceId || event.id);
        result.observedUnits += Number(item.quantity || 0);
        const label = normalizeName(item.name) || 'unnamed';
        result.itemLabels.set(label, (result.itemLabels.get(label) || 0) + amount);
        lineRevenue += amount;
      }
    }
    const maxOccurred = deduped.reduce((max, e) => !max || e.occurredAt > max ? e.occurredAt : max, null);
    return {
      source: 'company_brain_square_order_events',
      orderCount: deduped.length,
      observedOrderRevenue: roundMoney(orderRevenue),
      observedLineItemRevenue: roundMoney(lineRevenue),
      latestOrderDate: maxOccurred?.toISOString?.().slice(0, 10) || null,
      lines: [...byLine.values()].map((line) => finalizeLine(line, lineRevenue)),
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function buildLineModel({ repo: repoInput, start: startText, end: endText, configPath: configInput, scenarioInputs = [] }) {
  const repo = path.resolve(repoInput || process.cwd());
  for (const name of ['.env', '.env.local', '.env.vercel.production']) loadEnv(path.join(repo, name));
  const configPath = path.resolve(configInput || path.join(__dirname, '..', 'references', 'line-model-config.json'));
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const overrides = new Map((Array.isArray(scenarioInputs) ? scenarioInputs : []).map((line) => [line.id, line]));
  config.lines = config.lines.map((line) => ({
    ...line,
    scenarioInputs: { ...line.scenarioInputs, ...(overrides.get(line.id) || {}) },
  }));
  const start = isoDay(startText, 'start');
  const end = isoDay(endText, 'end');
  if (end < start) throw new Error('--end must be on or after --start');
  const endExclusive = addDays(end, 1);
  const endExclusiveText = endExclusive.toISOString().slice(0, 10);
  const [cash, square] = await Promise.all([
    localBudgetActuals(repo, startText, endExclusiveText),
    squareAttribution(repo, start, endExclusive, config),
  ]);
  const months = completeCalendarMonths(start, end);
  const annualFounderPolicy = config.founderCompensation.westonAnnual + config.founderCompensation.catherineAnnual;
  const founderPolicyCompensation = months == null ? null : roundMoney(annualFounderPolicy / 12 * months);
  const t = cash.totals;
  const cashContributionBeforeFounderDraws = roundMoney(
    t.revenue - t.cogs - t.paidLabor - t.operatingExLabor - t.reimbursableExpense
  );
  const cashContributionAfterUnresolvedExpense = roundMoney(
    cashContributionBeforeFounderDraws - t.unknownOrUnresolved
  );
  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    period: { start: startText, end: endText, completeCalendarMonths: months },
    taxonomy: {
      status: config.modelStatus,
      lines: config.lines.map(({ id, name }) => ({ id, name })).concat([config.unallocatedLine]),
    },
    sources: {
      cashActuals: { source: cash.source, lastTransactionDate: cash.lastTransactionDate, postingCount: cash.postingCount },
      revenueAttribution: { source: square.source, latestOrderDate: square.latestOrderDate, orderCount: square.orderCount },
    },
    companyBridge: {
      cashRevenue: t.revenue,
      cogs: t.cogs,
      paidNonfounderLabor: t.paidLabor,
      operatingExpenseExLabor: t.operatingExLabor,
      unknownOrUnresolvedExpense: t.unknownOrUnresolved,
      reimbursementIncomeExcludedFromOperatingRevenue: t.reimbursementIncome,
      excludedOrUnresolvedIncome: t.excludedOrUnresolvedIncome,
      reimbursableExpense: t.reimbursableExpense,
      cashContributionBeforeFounderDraws,
      cashContributionAfterUnresolvedExpense,
      personalTransactionsTreatedAsFounderDraws: t.personalFounderDraws,
      cashAfterFounderDraws: roundMoney(cashContributionBeforeFounderDraws - t.personalFounderDraws),
      cashAfterFounderDrawsAndUnresolvedExpense: roundMoney(cashContributionAfterUnresolvedExpense - t.personalFounderDraws),
      founderCompensationPolicyExpense: founderPolicyCompensation,
      fullyLoadedOperatingResult: founderPolicyCompensation == null ? null : roundMoney(cashContributionBeforeFounderDraws - founderPolicyCompensation),
      fullyLoadedOperatingResultAfterUnresolvedExpense: founderPolicyCompensation == null
        ? null : roundMoney(cashContributionAfterUnresolvedExpense - founderPolicyCompensation),
      deferredFounderCompensationIncrease: founderPolicyCompensation == null ? null : roundMoney(founderPolicyCompensation - t.personalFounderDraws),
      caveat: 'PERSONAL offsets founder compensation only if owner review confirms those transactions are valid draws.',
    },
    revenueAttribution: {
      observedSquareOrderRevenue: square.observedOrderRevenue,
      observedSquareLineItemRevenue: square.observedLineItemRevenue,
      squareToCashRevenueRatio: t.revenue ? Math.round(square.observedOrderRevenue / t.revenue * 10000) / 10000 : null,
      cashLessObservedSquareOrders: roundMoney(t.revenue - square.observedOrderRevenue),
      reconciliationCaveat: 'This difference is not automatically unallocated line revenue: order dates and cash settlement dates differ, and non-Square receipts may exist.',
    },
    lineActuals: square.lines,
    scenarioInputs: config.lines.map((line) => ({ id: line.id, name: line.name, ...line.scenarioInputs })),
    scenario: buildScenario(config),
    kitchenCostPolicy: config.kitchen,
    dataQuality: {
      cashActuals: 'usable_subject_to_classification_review',
      lineRevenue: 'partial_square_attribution_only',
      lineContributionMargins: 'blocked',
      raiseSizingFromLineModel: 'blocked',
      missingRequiredEvidence: [
        'transaction-level mapping for Custom Amount, unnamed, and unfamiliar Square labels',
        'line-specific ingredient cost per order or event',
        'line-specific paid labor hours and payroll burden',
        'line-specific founder labor hours and chosen economic hourly cost',
        'line-specific kitchen hours and shared-facility allocation rule',
        'packaging, delivery, and other variable costs by line',
        'monthly capacity and demand assumptions by line'
      ],
    },
  };
  return result;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('Usage: node build-line-model.cjs [--repo PATH] [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--config PATH]');
    return;
  }
  const result = await buildLineModel({
    repo: args.repo,
    start: args.start,
    end: args.end,
    configPath: args.config,
  });
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { buildLineModel, buildScenario, kitchenHourlyCost };

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
