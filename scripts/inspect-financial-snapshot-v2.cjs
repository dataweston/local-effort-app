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
const start = new Date('2025-02-01T00:00:00.000Z');
const end = new Date('2026-08-01T00:00:00.000Z');
const toNumber = (value) => value == null ? null : Number(value);

async function main() {
  const [accounts, settlementEntries, settlementStatus, carRows, debtRows, pending, postedCount, postedMax, recentSnapshots] = await Promise.all([
    db.financialAccount.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, currentBalance: true, availableBalance: true, entity: { select: { name: true } }, squareConnectionId: true, lastSyncedAt: true },
    }),
    db.processorSettlementEntry.findMany({
      where: { isCurrent: true, settlement: { effectiveAt: { gte: start, lt: end } } },
      orderBy: [{ effectiveAt: 'asc' }, { createdAt: 'asc' }],
      select: { type: true, effectiveAt: true, grossAmount: true, feeAmount: true, netAmount: true, settlement: { select: { effectiveAt: true, amount: true, reconciliationStatus: true, account: { select: { name: true } } } } },
    }),
    db.processorSettlement.groupBy({
      by: ['reconciliationStatus'],
      where: { effectiveAt: { gte: start, lt: end } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    db.transaction.findMany({
      where: { status: 'POSTED', date: { gte: start, lt: end }, OR: [
        { description: { contains: 'car', mode: 'insensitive' } },
        { description: { contains: 'auto', mode: 'insensitive' } },
        { merchantName: { contains: 'car', mode: 'insensitive' } },
        { merchantName: { contains: 'auto', mode: 'insensitive' } },
        { category: { name: { contains: 'Debt', mode: 'insensitive' } } },
      ] },
      orderBy: { date: 'asc' },
      select: { id: true, date: true, amount: true, type: true, description: true, merchantName: true, classification: true, category: { select: { name: true, defaultClassification: true } }, incurredBy: { select: { name: true } }, account: { select: { name: true, squareConnectionId: true } }, splits: { select: { amount: true, classification: true, category: { select: { name: true, defaultClassification: true } } } } },
    }),
    db.transaction.findMany({
      where: { status: 'POSTED', date: { gte: start, lt: end }, OR: [
        { description: { contains: 'loan', mode: 'insensitive' } },
        { description: { contains: 'capital', mode: 'insensitive' } },
        { category: { name: { contains: 'Debt', mode: 'insensitive' } } },
      ] },
      orderBy: { date: 'asc' },
      select: { id: true, date: true, amount: true, type: true, description: true, merchantName: true, classification: true, category: { select: { name: true, defaultClassification: true } }, incurredBy: { select: { name: true } }, account: { select: { name: true, squareConnectionId: true } } },
    }),
    db.transaction.groupBy({ by: ['status'], where: { date: { gte: start, lt: end } }, _count: { _all: true }, _sum: { amount: true } }),
    db.transaction.count({ where: { status: 'POSTED', date: { gte: start, lt: end } } }),
    db.transaction.aggregate({ where: { status: 'POSTED' }, _max: { date: true, updatedAt: true } }),
    db.accountBalanceSnapshot.findMany({ orderBy: { effectiveAt: 'desc' }, take: 12, select: { account: { select: { name: true } }, balance: true, availableBalance: true, effectiveAt: true, source: true } }),
  ]);

  const month = (entry) => (entry.effectiveAt || entry.settlement.effectiveAt).toISOString().slice(0, 7);
  const settlementByMonth = {};
  const settlementByType = {};
  for (const entry of settlementEntries) {
    const m = month(entry);
    const values = { gross: toNumber(entry.grossAmount), fees: toNumber(entry.feeAmount), net: toNumber(entry.netAmount), count: 1 };
    for (const bucket of [settlementByMonth, settlementByType]) {
      const key = bucket === settlementByMonth ? m : entry.type;
      bucket[key] ||= { gross: 0, fees: 0, net: 0, count: 0 };
      bucket[key].gross += values.gross;
      bucket[key].fees += values.fees;
      bucket[key].net += values.net;
      bucket[key].count += 1;
    }
  }

  const clean = (row) => JSON.parse(JSON.stringify(row, (_, value) => {
    if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') return Number(value);
    return value;
  }));
  const output = {
    generatedAt: new Date().toISOString(),
    range: { from: start.toISOString(), toExclusive: end.toISOString() },
    accounts: accounts.map(clean),
    settlementByMonth,
    settlementByType,
    settlementStatus: settlementStatus.map(clean),
    carRows: carRows.map(clean),
    debtRows: debtRows.map(clean),
    transactionStatus: pending.map(clean),
    postedCount,
    postedMax: clean(postedMax),
    recentSnapshots: recentSnapshots.map(clean),
  };
  const outputPath = path.resolve('artifacts/financial-snapshot-v2/diagnostic.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputPath, accounts: output.accounts, settlementByMonth, settlementByType, settlementStatus: output.settlementStatus, carRows: output.carRows, debtRows: output.debtRows, transactionStatus: output.transactionStatus, postedMax: output.postedMax }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
