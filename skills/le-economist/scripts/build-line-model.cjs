#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
// Static imports are intentional. Vercel's serverless dependency tracer cannot
// reliably discover JSON loaded only through computed fs paths.
const defaultLineModelConfig = require('../references/line-model-config.json');
const defaultObservedLineEvidence = require('../references/observed-line-evidence.json');

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function sourceError(code, message, cause) {
  const error = new Error(message, { cause });
  error.code = code;
  return error;
}

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

function mapOrderIdentity(payload, sourceId, config) {
  const signals = payload?.identitySignals || {};
  const customerIds = new Set([
    signals.orderCustomerId,
    ...(signals.paymentCustomerIds || []),
  ].filter(Boolean).map(String));
  for (const line of config.lines) {
    if ((line.squareOrderIds || []).map(String).includes(String(payload?.orderId || sourceId || ''))) {
      return { line, method: 'square_order_id_cross_source_match' };
    }
    if ((line.squareCustomerIds || []).some((id) => customerIds.has(String(id)))) {
      return { line, method: 'square_customer_identity' };
    }
  }
  return null;
}

function blankLineResult(line) {
  return {
    id: line.id,
    name: line.name,
    observedSquareRevenue: 0,
    observedOrders: new Set(),
    observedUnits: 0,
    itemLabels: new Map(),
    attributionMethods: new Map(),
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
    attributionMethods: [...line.attributionMethods.entries()]
      .map(([method, amount]) => ({ method, revenue: roundMoney(amount) }))
      .sort((a, b) => b.revenue - a.revenue),
    contributionMarginStatus: 'partial_components_observed_full_margin_incomplete',
  };
}

function matchesVendorRule(row, rule) {
  if (rule.classifications?.length && !rule.classifications.includes(String(row.classification || '').toUpperCase())) return false;
  const haystack = `${row.merchant || ''} ${row.description || ''}`;
  return (rule.merchantPatterns || []).some((pattern) => new RegExp(pattern, 'i').test(haystack));
}

function buildVendorEvidence(rows, rules = []) {
  return rules.map((rule) => {
    const matches = rows.filter((row) => matchesVendorRule(row, rule));
    return {
      id: rule.id,
      name: rule.name,
      kind: rule.kind,
      lineIds: rule.lineIds || [],
      amount: roundMoney(matches.reduce((sum, row) => sum + Number(row.amount || 0), 0)),
      postingCount: matches.length,
      dates: [...new Set(matches.map((row) => row.date?.toISOString?.().slice(0, 10) || String(row.date).slice(0, 10)))],
      transactionIds: [...new Set(matches.map((row) => row.id))],
      note: rule.note,
      source: 'local_budget_transaction_and_split_rows',
    };
  }).filter((item) => item.postingCount > 0);
}

function buildEvidenceRecovery(config, squareLines, vendorEvidence, referenceEvidence) {
  const squareByLine = new Map(squareLines.map((line) => [line.id, line]));
  const referenceItems = referenceEvidence?.items || [];
  const lines = config.lines.map((line) => {
    const actual = squareByLine.get(line.id);
    const references = referenceItems.filter((item) => (item.lineIds || []).includes(line.id));
    const costs = vendorEvidence.filter((item) => item.lineIds.includes(line.id));
    const directMatched = costs.filter((item) => item.kind === 'direct_variable_cost')
      .reduce((sum, item) => sum + item.amount, 0);
    const candidateDirect = costs.filter((item) => item.kind === 'candidate_direct_variable_cost')
      .reduce((sum, item) => sum + item.amount, 0);
    const shared = costs.filter((item) => item.kind === 'shared_cogs_pool')
      .reduce((sum, item) => sum + item.amount, 0);
    const lineRelatedOperating = costs.filter((item) => item.kind === 'line_related_operating_spend')
      .reduce((sum, item) => sum + item.amount, 0);
    const observedRevenue = Number(actual?.observedSquareRevenue || 0);
    let status = 'unresolved';
    if (observedRevenue && references.length) status = 'revenue_and_operating_components_observed';
    else if (observedRevenue) status = 'revenue_observed_cost_incomplete';
    else if (references.length || costs.length) status = 'reference_or_cost_evidence_only';
    return {
      id: line.id,
      name: line.name,
      status,
      observedRevenue: roundMoney(observedRevenue),
      directlyMatchedVariableCost: roundMoney(directMatched),
      candidateDirectVariableCost: roundMoney(candidateDirect),
      sharedCogsPoolRelevantToLine: roundMoney(shared),
      lineRelatedOperatingSpend: roundMoney(lineRelatedOperating),
      revenueLessDirectlyMatchedVariableCost: observedRevenue ? roundMoney(observedRevenue - directMatched) : null,
      fullContributionMargin: null,
      costPools: costs,
      referenceEvidence: references,
      caveat: 'Shared and candidate costs are surfaced, not deducted. Revenue less directly matched cost is an incomplete component subtotal, not contribution margin.',
    };
  });
  const observedRevenue = squareLines.reduce((sum, line) => sum + Number(line.observedSquareRevenue || 0), 0);
  const unallocated = Number(squareByLine.get(config.unallocatedLine.id)?.observedSquareRevenue || 0);
  return {
    status: 'partial_line_economics_available',
    attributedSquareRevenue: roundMoney(observedRevenue - unallocated),
    unallocatedSquareRevenue: roundMoney(unallocated),
    squareRevenueAttributionCoverage: observedRevenue ? Math.round((observedRevenue - unallocated) / observedRevenue * 10000) / 10000 : null,
    vendorCostPools: vendorEvidence,
    lines,
    note: 'Exact transaction identities, measured unit prices, quote/service facts, and candidate cost pools are retained separately so partial knowledge can improve decisions without fabricating a full margin.',
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
  const totalMonthlyOrders = portfolioCashReady
    ? prepared.reduce((sum, { inputs }) => sum + inputs.monthlyOrders, 0)
    : null;
  const totalMonthlyRevenue = portfolioCashReady
    ? prepared.reduce((sum, { inputs }) => sum + inputs.monthlyOrders * inputs.averageRevenuePerOrder, 0)
    : null;
  const results = prepared.map(({ line, inputs, missingCash }) => {
    const missingEconomic = ['founderLaborHoursPerOrder', 'founderLaborHourlyRate']
      .filter((key) => !Number.isFinite(inputs[key]));
    if (missingCash.length) {
      return { id: line.id, name: line.name, status: 'blocked', missingCashInputs: missingCash, missingEconomicInputs: missingEconomic };
    }
    const monthlyRevenue = inputs.monthlyOrders * inputs.averageRevenuePerOrder;
    const lineKitchenHours = inputs.monthlyOrders * inputs.kitchenHoursPerOrder;
    const kitchenAllocations = {
      modeledKitchenHours: totalKitchenHours > 0 ? hourlyKitchenCost * lineKitchenHours / totalKitchenHours : 0,
      modeledOrderCount: totalMonthlyOrders > 0 ? hourlyKitchenCost * inputs.monthlyOrders / totalMonthlyOrders : 0,
      modeledRevenueShare: totalMonthlyRevenue > 0 ? hourlyKitchenCost * monthlyRevenue / totalMonthlyRevenue : 0,
    };
    const allocatedHourlyKitchen = kitchenAllocations.modeledKitchenHours;
    const cashVariableCostsBeforeKitchen = inputs.monthlyOrders * (
      inputs.ingredientCostPerOrder
      + inputs.paidLaborHoursPerOrder * inputs.paidLaborHourlyRate
      + inputs.packagingDeliveryPerOrder
      + inputs.otherVariableCostPerOrder
    );
    const cashVariableCosts = cashVariableCostsBeforeKitchen + allocatedHourlyKitchen;
    const cashContribution = monthlyRevenue - cashVariableCosts;
    const contributionByAllocation = Object.fromEntries(Object.entries(kitchenAllocations)
      .map(([method, allocation]) => [method, roundMoney(monthlyRevenue - cashVariableCostsBeforeKitchen - allocation)]));
    const contributionRangeValues = Object.values(contributionByAllocation);
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
      allocatedKitchenCostByMethod: Object.fromEntries(Object.entries(kitchenAllocations)
        .map(([method, allocation]) => [method, roundMoney(allocation)])),
      cashVariableCosts: roundMoney(cashVariableCosts),
      cashContributionBeforeStorageAndFixedOverhead: roundMoney(cashContribution),
      cashContributionMargin: monthlyRevenue ? Math.round(cashContribution / monthlyRevenue * 10000) / 10000 : null,
      cashContributionSensitivity: {
        classification: 'modeled_interim_allocation_not_observed',
        byKitchenAllocationMethod: contributionByAllocation,
        range: {
          low: roundMoney(Math.min(...contributionRangeValues)),
          high: roundMoney(Math.max(...contributionRangeValues)),
        },
      },
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
    interimAllocationPolicy: config.interimAllocationPolicy,
    lines: results,
    note: 'Primary kitchen allocation uses modeled kitchen hours. Order-count and revenue-share allocations are required sensitivities. All are modeled, not observed. Storage remains portfolio fixed overhead.',
  };
}

function buildMethodVersion(configRawBytes, configHashSource) {
  let scriptGitSha = null;
  try {
    const sha = execSync('git rev-parse --short=12 HEAD', {
      cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    const dirty = execSync('git status --porcelain -- .', {
      cwd: path.join(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim() !== '';
    scriptGitSha = dirty ? `${sha}-dirty` : sha;
  } catch {
    // Deployed bundles have no git checkout; consumers must cite configSha256 alone.
  }
  return {
    scriptGitSha,
    configSha256: crypto.createHash('sha256').update(configRawBytes).digest('hex'),
    configHashSource,
  };
}

function buildBlockedFields(scenario, evidenceRecovery) {
  const blocked = [];
  for (const line of evidenceRecovery.lines) {
    if (line.fullContributionMargin == null) {
      blocked.push({
        lineId: line.id,
        field: 'observed.fullContributionMargin',
        reason: 'missing_direct_cost_joins',
        missingInputs: [
          'recipe/production-lot join for shared COGS pools',
          'paid labor hours matched to production runs',
          'kitchen booking hours matched to jobs',
          'packaging/delivery invoices matched to jobs',
        ],
      });
    }
  }
  for (const line of scenario.lines) {
    if (line.status === 'blocked') {
      blocked.push({
        lineId: line.id,
        field: 'scenario.cashContributionBeforeStorageAndFixedOverhead',
        reason: 'missing_scenario_inputs',
        missingInputs: line.missingCashInputs,
      });
    }
    if ((line.missingEconomicInputs || []).length) {
      blocked.push({
        lineId: line.id,
        field: 'scenario.economicContributionBeforeStorageAndFixedOverhead',
        reason: 'missing_scenario_inputs',
        missingInputs: line.missingEconomicInputs,
      });
    }
  }
  return blocked;
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

async function localBudgetApiActuals(startText, endExclusiveText) {
  const baseUrl = String(process.env.LOCAL_BUDGET_API_URL || '').trim().replace(/\/+$/, '');
  const token = String(process.env.LOCAL_BUDGET_API_TOKEN || '').trim();
  if (!baseUrl || !token) return null;

  const url = new URL(`${baseUrl}/api/integration/v1/cashflow-actuals`);
  url.searchParams.set('from', startText);
  url.searchParams.set('to', endExclusiveText);
  url.searchParams.set('grain', 'month');
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Local Budget API ${response.status}: ${body.slice(0, 240)}`);
    }
    const payload = await response.json();
    if (payload?.contractVersion !== 1 || !Array.isArray(payload.months)) {
      throw new Error('Local Budget API returned an unsupported cashflow contract');
    }
    const cents = (month, key) => Number(month?.[key] || 0);
    const totals = {
      revenue: 0, cogs: 0, paidLabor: 0, operatingExLabor: 0,
      personalFounderDraws: 0, reimbursementIncome: 0,
      reimbursableExpense: 0, excludedOrUnresolvedIncome: 0,
      unknownOrUnresolved: 0, transfer: 0,
    };
    let postingCount = 0;
    for (const month of payload.months) {
      totals.revenue += cents(month, 'incomeCents');
      totals.cogs += cents(month, 'inventoryCents');
      totals.paidLabor += cents(month, 'laborCents');
      totals.operatingExLabor += cents(month, 'operatingCents');
      totals.reimbursableExpense += cents(month, 'reimbursableCents');
      totals.personalFounderDraws += cents(month, 'personalExcludedCents');
      totals.transfer += cents(month, 'transferExcludedCents');
      totals.unknownOrUnresolved += cents(month, 'unclassifiedCents');
      postingCount += Number(month.transactionCount || 0);
    }
    for (const key of Object.keys(totals)) totals[key] = roundMoney(totals[key] / 100);
    return {
      source: 'local_budget_cashflow_api',
      lastTransactionDate: payload.sourceMaxDate || null,
      postingCount,
      totals,
      // The monthly cashflow contract intentionally contains no merchant rows.
      vendorEvidence: [],
    };
  } catch (error) {
    throw sourceError(
      'LOCAL_BUDGET_SOURCE_UNAVAILABLE',
      'Local Budget cash actuals are unavailable',
      error,
    );
  }
}

async function localBudgetActuals(repo, startText, endExclusiveText, vendorEvidenceRules = []) {
  const apiActuals = await localBudgetApiActuals(startText, endExclusiveText);
  if (apiActuals) return apiActuals;
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
        COALESCE(NULLIF(t."merchantName", ''), 'Unknown merchant') AS merchant,
        COALESCE(NULLIF(t."userDescription", ''), NULLIF(t.description, ''), '') AS description,
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
      vendorEvidence: buildVendorEvidence(rows, vendorEvidenceRules),
    };
  } catch (error) {
    throw sourceError(
      'LOCAL_BUDGET_SOURCE_UNAVAILABLE',
      'Local Budget cash actuals are unavailable',
      error,
    );
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
      const identityMatch = mapOrderIdentity(payload, event.sourceId || event.id, config);
      orderRevenue += Number(payload.totalCents || 0) / 100;
      for (const item of payload.lineItems || []) {
        const amount = Number(item.totalCents || 0) / 100;
        const lineDef = identityMatch?.line || mapLine(item.name, config);
        const attributionMethod = identityMatch?.method || (lineDef.id === config.unallocatedLine.id ? 'unallocated_label' : 'square_item_label');
        const result = byLine.get(lineDef.id);
        result.observedSquareRevenue += amount;
        result.observedOrders.add(event.sourceId || event.id);
        result.observedUnits += Number(item.quantity || 0);
        const label = normalizeName(item.name) || 'unnamed';
        result.itemLabels.set(label, (result.itemLabels.get(label) || 0) + amount);
        result.attributionMethods.set(attributionMethod, (result.attributionMethods.get(attributionMethod) || 0) + amount);
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
  } catch (error) {
    throw sourceError(
      'COMPANY_BRAIN_SOURCE_UNAVAILABLE',
      'Company Brain Square order evidence is unavailable',
      error,
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function buildLineModel({ repo: repoInput, start: startText, end: endText, configPath: configInput, scenarioInputs = [] }) {
  const repo = path.resolve(repoInput || process.cwd());
  for (const name of ['.env', '.env.local', '.env.vercel.production']) loadEnv(path.join(repo, name));
  let config;
  let observedEvidence;
  let configRawBytes;
  let configHashSource;
  try {
    if (configInput) {
      const configPath = path.resolve(configInput);
      configRawBytes = fs.readFileSync(configPath);
      configHashSource = 'file_bytes';
      config = JSON.parse(configRawBytes.toString('utf8'));
      const observedEvidencePath = path.join(path.dirname(configPath), 'observed-line-evidence.json');
      observedEvidence = fs.existsSync(observedEvidencePath)
        ? JSON.parse(fs.readFileSync(observedEvidencePath, 'utf8'))
        : { schemaVersion: 1, asOf: null, items: [] };
    } else {
      config = cloneJson(defaultLineModelConfig);
      observedEvidence = cloneJson(defaultObservedLineEvidence);
      try {
        configRawBytes = fs.readFileSync(path.join(__dirname, '..', 'references', 'line-model-config.json'));
        configHashSource = 'file_bytes';
      } catch {
        // Bundled deployments may not carry the raw file; hash the parsed default instead.
        configRawBytes = Buffer.from(JSON.stringify(defaultLineModelConfig));
        configHashSource = 'normalized_json';
      }
    }
  } catch (error) {
    throw sourceError(
      'ECONOMICS_MODEL_CONFIG_UNAVAILABLE',
      'Economics model configuration is unavailable',
      error,
    );
  }
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
    localBudgetActuals(repo, startText, endExclusiveText, config.vendorEvidenceRules),
    squareAttribution(repo, start, endExclusive, config),
  ]);
  const evidenceRecovery = buildEvidenceRecovery(config, square.lines, cash.vendorEvidence, observedEvidence);
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
  const scenario = buildScenario(config);
  const result = {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    methodVersion: buildMethodVersion(configRawBytes, configHashSource),
    period: { start: startText, end: endText, completeCalendarMonths: months },
    taxonomy: {
      status: config.modelStatus,
      lines: config.lines.map(({ id, name }) => ({ id, name })).concat([config.unallocatedLine]),
    },
    sources: {
      cashActuals: { source: cash.source, lastTransactionDate: cash.lastTransactionDate, postingCount: cash.postingCount },
      revenueAttribution: { source: square.source, latestOrderDate: square.latestOrderDate, orderCount: square.orderCount },
      recoveredEvidence: { source: 'gmail_company_brain_and_local_budget_cross_source_matches', asOf: observedEvidence.asOf },
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
      attributedSquareRevenue: evidenceRecovery.attributedSquareRevenue,
      unallocatedSquareRevenue: evidenceRecovery.unallocatedSquareRevenue,
      squareRevenueAttributionCoverage: evidenceRecovery.squareRevenueAttributionCoverage,
      reconciliationCaveat: 'This difference is not automatically unallocated line revenue: order dates and cash settlement dates differ, and non-Square receipts may exist.',
    },
    lineActuals: square.lines,
    evidenceRecovery,
    scenarioInputs: config.lines.map((line) => ({
      id: line.id,
      name: line.name,
      ...line.scenarioInputs,
      provenance: line.scenarioInputProvenance || {},
    })),
    scenario,
    blockedFields: buildBlockedFields(scenario, evidenceRecovery),
    kitchenCostPolicy: config.kitchen,
    dataQuality: {
      cashActuals: 'usable_subject_to_classification_review',
      lineRevenue: 'near_complete_for_observed_square_orders_cross_source_identity_matches_applied',
      lineContributionMargins: 'partial_components_available_full_margins_incomplete',
      raiseSizingFromLineModel: 'blocked',
      missingRequiredEvidence: [
        'resolve the remaining Square residual and reconcile non-Square receipts to business lines',
        'join COGS receipts and purchase lots to recipes, production runs, customers, or events',
        'match paid labor hours and payroll burden to production runs and events',
        'measure founder labor hours and choose the economic hourly cost policy',
        'match kitchen bookings, courier invoices, packaging, and delivery costs to jobs',
        'value trade consideration and close final invoices for events with mixed cash and in-kind terms',
        'measure monthly capacity, target mix, ramp timing, and uses of funds before sizing a raise'
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

module.exports = { buildLineModel, buildScenario, kitchenHourlyCost, buildBlockedFields, buildMethodVersion };

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
