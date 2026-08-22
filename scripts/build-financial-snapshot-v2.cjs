const fs = require('fs');
const path = require('path');

const LOCAL_BUDGET_ROOT = 'C:\\Users\\user\\Local Budget';
const { PrismaClient } = require(path.join(LOCAL_BUDGET_ROOT, 'node_modules', '@prisma', 'client'));

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals < 1) continue;
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(path.join(LOCAL_BUDGET_ROOT, '.env.local'));
loadEnv(path.join(LOCAL_BUDGET_ROOT, '.env'));

const db = new PrismaClient();
const LABOR_CATEGORY = /(?:^|\b)(labor|payroll|wages?|contractors?|staff)(?:\b|$)/i;
const PAYROLL_MERCHANT = /(?:square|block)[\s-]*payroll/i;
const SQUARE_REPAYMENT = /square\s+(?:loan|capital).*(?:repay|payment)|(?:repay|payment).*square\s+(?:loan|capital)/i;
const CARMAX_FINANCE = /car\s*max|carmax/i;
const FINANCING_TYPES = new Set(['SQUARE_CAPITAL_PAYMENT', 'SQUARE_CAPITAL_REVERSED_PAYMENT']);

const cents = (value) => Math.round(Math.abs(Number(value || 0)) * 100);
const signedCents = (value) => Math.round(Number(value || 0) * 100);
const monthKey = (date) => date.toISOString().slice(0, 7);

function monthKeys(start, end) {
  const result = [];
  const cursor = new Date(`${start}-01T00:00:00.000Z`);
  const finish = new Date(`${end}-01T00:00:00.000Z`);
  while (cursor <= finish) {
    result.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

function effectiveClassification(line, parent) {
  const explicit = line.classification ?? line.category?.defaultClassification ??
    parent?.classification ?? parent?.category?.defaultClassification ?? null;
  if (explicit) return explicit;
  const type = parent?.type ?? line.type;
  if (type === 'INCOME') return 'INCOME';
  if (type === 'TRANSFER') return 'TRANSFER';
  return 'UNCLASSIFIED';
}

function blankMonth(month) {
  return {
    month,
    revenueCents: 0,
    refundCents: 0,
    inventoryCents: 0,
    laborCents: 0,
    operatingCents: 0,
    squareFeeCents: 0,
    settlementFeeCents: 0,
    effectiveSquareFeeCents: 0,
    reimbursableCents: 0,
    founderDrawsCents: 0,
    founderCarPaymentsCents: 0,
    unclassifiedCents: 0,
    debtServiceCents: 0,
    debtPaymentGrossCents: 0,
    debtPaymentReversalCents: 0,
    financingProceedsCents: 0,
    supersededRepaymentRowsCents: 0,
    transactionCount: 0,
    pendingTransactionCount: 0,
    pendingAmountCents: 0,
    splitMismatchCount: 0,
    unresolvedLineCount: 0,
  };
}

function isSquareRepayment(tx, categoryName, classification) {
  const evidence = `${categoryName || ''} ${tx.description || ''} ${tx.merchantName || ''}`;
  return SQUARE_REPAYMENT.test(evidence) || (categoryName === 'Debt' && classification === 'OPERATING');
}

function isFounderCarPayment(tx, categoryName) {
  const evidence = `${tx.description || ''} ${tx.merchantName || ''}`;
  return categoryName === 'Car' && CARMAX_FINANCE.test(evidence);
}

async function main() {
  const startMonth = process.argv[2] || '2025-02';
  const endMonth = process.argv[3] || '2026-07';
  const outputPath = process.argv[4] || path.resolve('artifacts/financial-snapshot-v2/calculations.json');
  const keys = monthKeys(startMonth, endMonth);
  const start = new Date(`${startMonth}-01T00:00:00.000Z`);
  const [endYear, endMonthNumber] = endMonth.split('-').map(Number);
  const endExclusive = new Date(Date.UTC(endYear, endMonthNumber, 1));

  const operatingScope = {
    status: 'POSTED',
    allocations: { none: { isCurrent: true, role: 'BANK_SETTLEMENT' } },
  };

  const [transactions, pending, source, settlementEntries, settlementStatus, localPizza, duplicateGroups] = await Promise.all([
    db.transaction.findMany({
      where: { ...operatingScope, date: { gte: start, lt: endExclusive } },
      select: {
        id: true, accountId: true, date: true, amount: true, type: true, status: true,
        description: true, merchantName: true, classification: true, metadata: true,
        category: { select: { id: true, name: true, defaultClassification: true } },
        incurredBy: { select: { name: true } },
        account: { select: { name: true, squareConnectionId: true } },
        splits: { select: { id: true, amount: true, classification: true, category: { select: { id: true, name: true, defaultClassification: true } } } },
      },
      orderBy: { date: 'asc' },
    }),
    db.transaction.findMany({
      where: { status: 'PENDING', date: { gte: start, lt: endExclusive } },
      select: { date: true, amount: true },
    }),
    db.transaction.aggregate({ where: { status: 'POSTED' }, _max: { date: true, updatedAt: true } }),
    db.processorSettlementEntry.findMany({
      where: { isCurrent: true, settlement: { effectiveAt: { gte: start, lt: endExclusive } } },
      select: { type: true, effectiveAt: true, grossAmount: true, feeAmount: true, settlement: { select: { effectiveAt: true } } },
    }),
    db.processorSettlement.groupBy({
      by: ['reconciliationStatus'],
      where: { effectiveAt: { gte: start, lt: endExclusive } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    db.financialAccount.findFirst({
      where: { isActive: true, name: { equals: 'Local Pizza', mode: 'insensitive' } },
      select: { name: true, type: true, currentBalance: true, availableBalance: true, lastSyncedAt: true, entity: { select: { name: true } }, balanceSnapshots: { orderBy: { effectiveAt: 'desc' }, take: 1, select: { balance: true, availableBalance: true, effectiveAt: true, source: true } } },
    }),
    db.$queryRaw`
      SELECT COUNT(*)::int AS "groupCount", COALESCE(SUM(c - 1), 0)::int AS "excessRows"
      FROM (
        SELECT COUNT(*)::int AS c
        FROM transactions
        WHERE status = 'POSTED' AND date >= ${start} AND date < ${endExclusive}
        GROUP BY "accountId", date, amount, type, COALESCE("merchantName", ''), COALESCE(description, '')
        HAVING COUNT(*) > 1
      ) d
    `,
  ]);

  const months = new Map(keys.map((key) => [key, blankMonth(key)]));
  for (const row of pending) {
    const month = months.get(monthKey(row.date));
    month.pendingTransactionCount += 1;
    month.pendingAmountCents += cents(row.amount);
  }

  for (const tx of transactions) {
    const month = months.get(monthKey(tx.date));
    if (!month) continue;
    month.transactionCount += 1;
    const lines = tx.splits.length ? tx.splits : [tx];
    if (tx.splits.length) {
      const splitTotal = tx.splits.reduce((sum, split) => sum + cents(split.amount), 0);
      if (Math.abs(splitTotal - cents(tx.amount)) > 1) month.splitMismatchCount += 1;
    }
    for (const line of lines) {
      const classification = effectiveClassification(line, tx);
      const categoryName = line.category?.name ?? tx.category?.name ?? null;
      const amount = cents(line.amount);
      const evidence = `${categoryName || ''} ${tx.merchantName || ''} ${tx.description || ''}`;

      if (isFounderCarPayment(tx, categoryName)) {
        month.founderCarPaymentsCents += amount;
        month.founderDrawsCents += amount;
        continue;
      }
      if (isSquareRepayment(tx, categoryName, classification) && tx.type === 'EXPENSE') {
        month.supersededRepaymentRowsCents += amount;
        continue;
      }
      if (categoryName === 'Investments' && /square\s+loan|square\s+capital/i.test(evidence) && tx.type === 'INCOME') {
        month.financingProceedsCents += amount;
        continue;
      }
      if (classification === 'INCOME' && tx.type === 'INCOME') month.revenueCents += amount;
      else if (classification === 'INCOME' && tx.type === 'EXPENSE') month.refundCents += amount;
      else if (classification === 'COGS') month.inventoryCents += amount;
      else if (LABOR_CATEGORY.test(categoryName || '') || PAYROLL_MERCHANT.test(evidence)) month.laborCents += amount;
      else if (classification === 'OPERATING') {
        month.operatingCents += amount;
        if (/square\s+(?:processing\s+)?fees?/i.test(evidence)) month.squareFeeCents += amount;
      } else if (classification === 'REIMBURSABLE') month.reimbursableCents += amount;
      else if (classification === 'PERSONAL' && tx.type === 'EXPENSE') month.founderDrawsCents += amount;
      else if ((classification == null || classification === 'UNCLASSIFIED') && tx.type === 'EXPENSE') {
        month.unclassifiedCents += amount;
        month.unresolvedLineCount += 1;
      }
    }
  }

  for (const entry of settlementEntries) {
    const key = monthKey(entry.effectiveAt || entry.settlement.effectiveAt);
    const month = months.get(key);
    if (!month) continue;
    month.settlementFeeCents += cents(entry.feeAmount);
    if (entry.type === 'SQUARE_CAPITAL_PAYMENT') {
      month.debtPaymentGrossCents += -signedCents(entry.grossAmount);
      month.debtServiceCents += -signedCents(entry.grossAmount);
    } else if (entry.type === 'SQUARE_CAPITAL_REVERSED_PAYMENT') {
      month.debtPaymentReversalCents += signedCents(entry.grossAmount);
      month.debtServiceCents -= signedCents(entry.grossAmount);
    }
  }

  for (const month of months.values()) {
    // The settlement fee report is authoritative once payout entries exist.
    // Before coverage begins, retain the older per-payment fee transactions.
    month.effectiveSquareFeeCents = month.settlementFeeCents > 0 ? month.settlementFeeCents : month.squareFeeCents;
    month.operatingCents += month.effectiveSquareFeeCents - month.squareFeeCents;
  }

  const sourceMaxDate = source._max.date?.toISOString().slice(0, 10) ?? null;
  const completedMonths = [...months.values()].map((month) => {
    const [year, monthNumber] = month.month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
    return { ...month, isCompleteMonth: sourceMaxDate >= lastDay && month.pendingTransactionCount === 0 };
  });

  const sumFields = ['revenueCents','refundCents','inventoryCents','laborCents','operatingCents','squareFeeCents','settlementFeeCents','effectiveSquareFeeCents','reimbursableCents','founderDrawsCents','founderCarPaymentsCents','unclassifiedCents','debtServiceCents','debtPaymentGrossCents','debtPaymentReversalCents','financingProceedsCents','supersededRepaymentRowsCents'];
  const totals = completedMonths.reduce((acc, month) => {
    for (const field of sumFields) acc[field] += month[field];
    return acc;
  }, Object.fromEntries(sumFields.map((field) => [field, 0])));

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'Local Budget production database; operatingReportScope; posted, split-aware; Square settlement financing added separately',
    period: { from: `${startMonth}-01`, toExclusive: endExclusive.toISOString().slice(0, 10), months: keys.length },
    sourceMaxDate,
    sourceMaxUpdatedAt: source._max.updatedAt?.toISOString() ?? null,
    months: completedMonths,
    totals,
    squareSettlementReconciliation: settlementStatus.map((row) => ({ status: row.reconciliationStatus, count: row._count._all, amountCents: cents(row._sum.amount) })),
    duplicateEvidence: duplicateGroups[0] || { groupCount: 0, excessRows: 0 },
    currentBusinessCash: localPizza ? {
      accountName: localPizza.name,
      ownerEntity: localPizza.entity?.name ?? null,
      currentBalanceCents: cents(localPizza.currentBalance),
      availableBalanceCents: localPizza.availableBalance == null ? null : cents(localPizza.availableBalance),
      lastSyncedAt: localPizza.lastSyncedAt?.toISOString() ?? null,
      latestSnapshot: localPizza.balanceSnapshots[0] ? {
        balanceCents: cents(localPizza.balanceSnapshots[0].balance),
        availableBalanceCents: localPizza.balanceSnapshots[0].availableBalance == null ? null : cents(localPizza.balanceSnapshots[0].availableBalance),
        effectiveAt: localPizza.balanceSnapshots[0].effectiveAt.toISOString(),
        source: localPizza.balanceSnapshots[0].source,
      } : null,
    } : null,
    ownerInputs: {
      primaryBusinessAccount: 'Local Pizza',
      vehicleDebtOwner: 'Weston',
      vehicleDebtBalanceApproxCents: 1300000,
      vehicleScheduledPaymentCents: 55000,
      vehicleMileageApprox: 80000,
      taxesIncluded: false,
    },
    methodNotes: [
      'Matched bank settlement postings are excluded; originating Square activity remains.',
      'Square processing fees remain operating expense where represented by Square fee transactions.',
      'Where settlement entries exist for a month, their fee total replaces the older fee-transaction subtotal; pre-settlement months retain transaction fees.',
      'Square Capital debt service comes only from current processor settlement entries, net of reversed payments.',
      'Operating Debt-category cash rows are superseded by exact Square settlement remittances and excluded to prevent double counting.',
      'Square loan proceeds are financing, not operating revenue.',
      'CarMax finance payments are reclassified from operating cost to Weston founder draws based on the owner statement.',
    ],
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputPath, period: output.period, sourceMaxDate, totals, currentBusinessCash: output.currentBusinessCash, squareSettlementReconciliation: output.squareSettlementReconciliation, duplicateEvidence: output.duplicateEvidence }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
