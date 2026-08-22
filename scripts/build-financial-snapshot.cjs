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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(path.join(LOCAL_BUDGET_ROOT, '.env.local'));
loadEnv(path.join(LOCAL_BUDGET_ROOT, '.env'));

const db = new PrismaClient();
const LABOR_CATEGORY = /(?:^|\b)(labor|payroll|wages?|contractors?|staff)(?:\b|$)/i;
const PAYROLL_MERCHANT = /(?:square|block)[\s-]*payroll/i;

function cents(value) {
  return Math.round(Math.abs(Number(value || 0)) * 100);
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

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
  return line.classification ?? line.category?.defaultClassification ??
    parent?.classification ?? parent?.category?.defaultClassification ?? null;
}

function bucketFor({ classification, categoryName, merchantName, description }) {
  const evidence = `${categoryName || ''} ${merchantName || ''} ${description || ''}`;
  if (LABOR_CATEGORY.test(categoryName || '') || PAYROLL_MERCHANT.test(evidence)) return 'labor';
  if (classification === 'COGS') return 'inventory';
  if (classification === 'OPERATING') return 'operating';
  if (classification === 'REIMBURSABLE') return 'reimbursable';
  if (classification === 'PERSONAL' || classification === 'TRANSFER' || classification === 'INCOME' || classification === 'REIMBURSEMENT') return 'excluded';
  return 'unclassified';
}

function blankMonth(month) {
  return {
    month,
    revenueCents: 0,
    refundCents: 0,
    inventoryCents: 0,
    laborCents: 0,
    operatingCents: 0,
    reimbursableCents: 0,
    founderDrawsCents: 0,
    unclassifiedCents: 0,
    debtServiceCents: 0,
    transactionCount: 0,
    pendingTransactionCount: 0,
    splitMismatchCount: 0,
  };
}

function transactionEffect(tx) {
  if (tx.type === 'INCOME') return Number(tx.amount);
  if (tx.type === 'EXPENSE') return -Number(tx.amount);
  if (tx.type === 'TRANSFER') {
    const direction = tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
      ? tx.metadata.transferDirection
      : null;
    if (direction === 'inflow') return Number(tx.amount);
    if (direction === 'outflow') return -Number(tx.amount);
  }
  return 0;
}

async function main() {
  const startMonth = process.argv[2] || '2025-02';
  const endMonth = process.argv[3] || '2026-07';
  const outputPath = process.argv[4] || path.resolve('artifacts/financial-snapshot/calculations.json');
  const keys = monthKeys(startMonth, endMonth);
  const start = new Date(`${startMonth}-01T00:00:00.000Z`);
  const [endYear, endMonthNumber] = endMonth.split('-').map(Number);
  const endExclusive = new Date(Date.UTC(endYear, endMonthNumber, 1));
  const asOf = new Date();

  const processorAccounts = await db.financialAccount.findMany({
    where: { squareConnectionId: { not: null } },
    select: { id: true },
  });
  const processorIds = processorAccounts.map((account) => account.id);
  const accountFilter = processorIds.length ? { accountId: { notIn: processorIds } } : {};

  const [transactions, pending, source, accounts] = await Promise.all([
    db.transaction.findMany({
      where: { status: 'POSTED', date: { gte: start, lt: endExclusive }, ...accountFilter },
      select: {
        id: true, accountId: true, date: true, amount: true, type: true, status: true,
        description: true, merchantName: true, classification: true, metadata: true,
        category: { select: { id: true, name: true, defaultClassification: true } },
        incurredBy: { select: { name: true } },
        splits: {
          select: {
            id: true, amount: true, classification: true,
            category: { select: { id: true, name: true, defaultClassification: true } },
          },
        },
      },
      orderBy: { date: 'asc' },
    }),
    db.transaction.findMany({
      where: { status: 'PENDING', date: { gte: start, lt: endExclusive }, ...accountFilter },
      select: { date: true },
    }),
    db.transaction.aggregate({ where: { status: 'POSTED', ...accountFilter }, _max: { date: true } }),
    db.financialAccount.findMany({
      where: { isActive: true, squareConnectionId: null },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, type: true, currency: true, currentBalance: true,
        availableBalance: true, lastSyncedAt: true, openingBalance: true, openingBalanceDate: true,
        balanceSnapshots: {
          where: { effectiveAt: { lte: asOf } }, orderBy: { effectiveAt: 'desc' }, take: 1,
          select: { balance: true, effectiveAt: true, source: true },
        },
      },
    }),
  ]);

  const months = new Map(keys.map((key) => [key, blankMonth(key)]));
  for (const row of pending) months.get(monthKey(row.date)).pendingTransactionCount += 1;

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
      if (classification === 'INCOME' && tx.type === 'INCOME') month.revenueCents += amount;
      if (classification === 'INCOME' && tx.type === 'EXPENSE') month.refundCents += amount;
      if (classification === 'PERSONAL' && tx.type === 'EXPENSE') month.founderDrawsCents += amount;
      const bucket = bucketFor({ classification, categoryName, merchantName: tx.merchantName, description: tx.description });
      if (bucket === 'inventory') month.inventoryCents += amount;
      else if (bucket === 'labor') month.laborCents += amount;
      else if (bucket === 'operating') month.operatingCents += amount;
      else if (bucket === 'reimbursable') month.reimbursableCents += amount;
      else if (bucket === 'unclassified' && tx.type === 'EXPENSE') month.unclassifiedCents += amount;
      if (classification === 'OPERATING' && /debt|loan|capital repayment/i.test(`${categoryName || ''} ${tx.description || ''} ${tx.merchantName || ''}`)) {
        month.debtServiceCents += amount;
      }
    }
  }

  const sourceMaxDate = source._max.date?.toISOString().slice(0, 10) ?? null;
  const completedMonths = [...months.values()].map((month) => {
    const [year, monthNumber] = month.month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
    return { ...month, isCompleteMonth: sourceMaxDate >= lastDay && month.pendingTransactionCount === 0 };
  });

  const accountPositions = [];
  for (const account of accounts) {
    const snapshot = account.balanceSnapshots[0] || null;
    const anchor = snapshot
      ? { balance: Number(snapshot.balance), effectiveAt: snapshot.effectiveAt, source: snapshot.source }
      : account.openingBalance !== null && account.openingBalanceDate !== null && account.openingBalanceDate <= asOf
        ? { balance: Number(account.openingBalance), effectiveAt: account.openingBalanceDate, source: 'OPENING_BALANCE' }
        : null;
    if (!anchor) {
      accountPositions.push({ name: account.name, type: account.type, balanceCents: null, unresolved: true, warning: 'No dated balance snapshot or opening balance exists' });
      continue;
    }
    const [postings, backdatedChanges] = await Promise.all([
      db.transaction.findMany({
        where: { accountId: account.id, status: 'POSTED', date: { gt: anchor.effectiveAt, lte: asOf } },
        select: { amount: true, type: true, metadata: true },
      }),
      db.transaction.count({
        where: { accountId: account.id, date: { lte: anchor.effectiveAt }, updatedAt: { gt: anchor.effectiveAt, lte: asOf } },
      }),
    ]);
    const ambiguousTransfer = postings.some((posting) => posting.type === 'TRANSFER' &&
      (!posting.metadata || typeof posting.metadata !== 'object' || Array.isArray(posting.metadata) || !('transferDirection' in posting.metadata)));
    const warning = backdatedChanges
      ? `${backdatedChanges} backdated change(s) occurred after the balance anchor`
      : ambiguousTransfer ? 'One or more transfer postings lack an explicit direction' : null;
    const effect = postings.reduce((sum, posting) => sum + transactionEffect(posting), 0);
    accountPositions.push({
      name: account.name,
      type: account.type,
      balanceCents: warning ? null : Math.round((anchor.balance + effect) * 100),
      currentBalanceCents: Math.round(Number(account.currentBalance) * 100),
      availableBalanceCents: account.availableBalance === null ? null : Math.round(Number(account.availableBalance) * 100),
      lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
      anchor: { balanceCents: Math.round(anchor.balance * 100), effectiveAt: anchor.effectiveAt.toISOString(), source: anchor.source },
      postingCount: postings.length,
      unresolved: Boolean(warning),
      warning,
    });
  }

  const liquidTypes = new Set(['CHECKING', 'SAVINGS', 'CASH']);
  const resolvedLiquid = accountPositions.filter((account) => liquidTypes.has(account.type) && account.balanceCents !== null);
  const totals = completedMonths.reduce((acc, month) => {
    for (const field of ['revenueCents','refundCents','inventoryCents','laborCents','operatingCents','reimbursableCents','founderDrawsCents','unclassifiedCents','debtServiceCents']) {
      acc[field] += month[field];
    }
    return acc;
  }, { revenueCents:0, refundCents:0, inventoryCents:0, laborCents:0, operatingCents:0, reimbursableCents:0, founderDrawsCents:0, unclassifiedCents:0, debtServiceCents:0 });

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'Local Budget production database, posted and split-aware, processor-ledger accounts excluded',
    period: { from: `${startMonth}-01`, toExclusive: endExclusive.toISOString().slice(0, 10), months: keys.length },
    sourceMaxDate,
    processorLedgerAccountCountExcluded: processorIds.length,
    months: completedMonths,
    totals,
    cashPosition: {
      asOf: asOf.toISOString(),
      totalResolvedLiquidCents: resolvedLiquid.reduce((sum, account) => sum + account.balanceCents, 0),
      unresolvedLiquidAccountCount: accountPositions.filter((account) => liquidTypes.has(account.type) && account.balanceCents === null).length,
      accounts: accountPositions,
    },
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputPath, period: output.period, sourceMaxDate, processorLedgerAccountCountExcluded: processorIds.length, totals, cashPosition: output.cashPosition }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
