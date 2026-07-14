const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function bucketFor(row) {
  const name = String(row.name || '').toLowerCase();
  if (/labor|payroll|wage|contractor|staff/.test(name)) return 'labor';
  if (/inventory|food|ingredient|grocery|produce|meat|dairy|packaging|paper|supplies/.test(name)) return 'inventory';
  if (row.classification === 'OPERATING') return 'operating';
  if (row.classification === 'COGS') return 'inventory';
  return 'other';
}

async function main() {
  loadEnv(path.resolve(__dirname, '..', '.env'));
  const baseUrl = String(process.env.LOCAL_BUDGET_API_URL || '').replace(/\/+$/, '');
  const token = process.env.LOCAL_BUDGET_API_TOKEN;
  const year = Number(process.argv[2]) || new Date().getFullYear();
  let report;
  let source;

  if (baseUrl && token) {
    const response = await fetch(`${baseUrl}/api/integration/v1/pnl?year=${year}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Local Budget API returned ${response.status}`);
    const payload = await response.json();
    report = payload.report || payload;
    source = 'integration_api';
  } else if (process.env.LOCAL_BUDGET_DATABASE_URL) {
    const { PrismaClient } = require('@prisma/client');
    const databaseUrl = process.env.LOCAL_BUDGET_DATABASE_URL
      .trim().replace(/^["']|["']$/g, '').replace(/^[A-Z_]+=/, '').replace(/^["']|["']$/g, '');
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    const rows = await prisma.$queryRawUnsafe(`
      WITH cost_lines AS (
        SELECT
          t.id,
          t.date,
          COALESCE(sc.name, c.name, 'Uncategorized') AS name,
          COALESCE(
            s.classification::text,
            sc."defaultClassification"::text,
            t.classification::text,
            c."defaultClassification"::text,
            CASE WHEN t.type::text = 'INCOME' THEN 'INCOME'
                 WHEN t.type::text = 'TRANSFER' THEN 'TRANSFER'
                 ELSE 'PERSONAL' END
          ) AS classification,
          ABS(CASE WHEN s.id IS NULL THEN t.amount ELSE s.amount END) AS amount
        FROM transactions t
        LEFT JOIN categories c ON c.id = t."categoryId"
        LEFT JOIN transaction_splits s ON s."transactionId" = t.id
        LEFT JOIN categories sc ON sc.id = s."categoryId"
        WHERE t.date >= $1::date AND t.date < $2::date
          AND t.status::text = 'POSTED'
      )
      SELECT name, classification, SUM(amount) AS amount, COUNT(*)::int AS "transactionCount"
      FROM cost_lines
      WHERE classification IN ('COGS', 'OPERATING')
      GROUP BY name, classification
      ORDER BY SUM(amount) DESC
    `, `${year}-01-01`, `${year + 1}-01-01`);
    const freshness = await prisma.$queryRawUnsafe(`
      SELECT MIN(date) AS "startDate", MAX(date) AS "lastTransactionDate", COUNT(*)::int AS count
      FROM transactions
      WHERE date >= $1::date AND date < $2::date AND status::text = 'POSTED'
    `, `${year}-01-01`, `${year + 1}-01-01`);
    const candidates = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(NULLIF(t."merchantName", ''), 'Unknown merchant') AS merchant,
        COALESCE(t.classification::text, c."defaultClassification"::text, 'UNCLASSIFIED') AS classification,
        COALESCE(c.name, 'Uncategorized') AS category,
        t.type::text AS direction,
        SUM(ABS(t.amount)) AS amount,
        COUNT(*)::int AS "transactionCount",
        MAX(t.date) AS "lastSeen"
      FROM transactions t
      LEFT JOIN categories c ON c.id = t."categoryId"
      WHERE t.date >= $1::date AND t.date < $2::date
        AND t.status::text = 'POSTED'
        AND (
          COALESCE(t."merchantName", '') ~* '(alan|payroll|wage|contractor|square|block[ .]*inc)'
          OR COALESCE(t.description, '') ~* '(alan|payroll|wage|contractor|square payroll|block[ .]*inc)'
          OR COALESCE(t."userDescription", '') ~* '(alan|payroll|wage|contractor|square payroll|block[ .]*inc)'
          OR COALESCE(t."merchantName", '') ~* '(amazon|costco)'
        )
      GROUP BY
        COALESCE(NULLIF(t."merchantName", ''), 'Unknown merchant'),
        COALESCE(t.classification::text, c."defaultClassification"::text, 'UNCLASSIFIED'),
        COALESCE(c.name, 'Uncategorized'),
        t.type::text
      ORDER BY SUM(ABS(t.amount)) DESC
    `, `${year}-01-01`, `${year + 1}-01-01`);
    await prisma.$disconnect();
    report = {
      startDate: freshness[0]?.startDate,
      endDate: freshness[0]?.lastTransactionDate,
      totalTransactionsInPeriod: freshness[0]?.count,
      byCategory: rows,
      cogs: rows.filter((row) => row.classification === 'COGS').reduce((sum, row) => sum + Number(row.amount), 0),
      operatingExpenses: rows.filter((row) => row.classification === 'OPERATING').reduce((sum, row) => sum + Number(row.amount), 0),
      candidates,
    };
    source = 'read_only_database';
  } else {
    throw new Error('Local Budget integration is not configured');
  }
  const categories = (report.byCategory || [])
    .filter((row) => ['COGS', 'OPERATING'].includes(row.classification))
    .map((row) => ({
      name: row.name || 'Uncategorized',
      classification: row.classification,
      amount: Number(row.amount || 0),
      transactionCount: Number(row.transactionCount || 0),
      suggestedBucket: bucketFor(row),
    }))
    .sort((a, b) => b.amount - a.amount);

  const buckets = categories.reduce((result, row) => {
    result[row.suggestedBucket] = (result[row.suggestedBucket] || 0) + row.amount;
    return result;
  }, {});

  console.log(JSON.stringify({
    source,
    year,
    startDate: report.startDate || null,
    endDate: report.endDate || null,
    totalTransactionsInPeriod: report.totalTransactionsInPeriod || null,
    reportedCogs: Number(report.cogs || 0),
    reportedOperating: Number(report.operatingExpenses || 0),
    suggestedBuckets: buckets,
    categories,
    candidateMerchants: (report.candidates || []).map((row) => ({
      merchant: row.merchant,
      classification: row.classification,
      category: row.category,
      direction: row.direction,
      amount: Number(row.amount || 0),
      transactionCount: Number(row.transactionCount || 0),
      lastSeen: row.lastSeen || null,
    })),
    note: 'Suggested buckets are name-based diagnostics only; Local Budget remains authoritative.',
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
