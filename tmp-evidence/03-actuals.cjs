#!/usr/bin/env node
'use strict';
// THROWAWAY: monthly operating actuals 2026-01..2026-09 from Local Budget prod (READ ONLY).
// Methodology parity with skills/le-economist/scripts/build-line-model.cjs localBudgetActuals().
require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

function url() {
  let u = String(process.env.LOCAL_BUDGET_DATABASE_URL || '').trim()
    .replace(/^["']|["']$/g, '').replace(/^[A-Z_]+=/, '').replace(/^["']|["']$/g, '');
  const parsed = new URL(u);
  parsed.searchParams.set('connection_limit', '1');
  parsed.searchParams.set('pool_timeout', '30');
  return parsed.toString();
}
const r2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

// verbatim copy of build-line-model.cjs:424-441
function classifyPosting(row) {
  const category = String(row.category || '');
  const classification = String(row.classification || '').toUpperCase();
  if (row.type === 'TRANSFER' || classification === 'TRANSFER') return 'transfer';
  if (classification === 'INCOME' && row.type === 'EXPENSE') return 'refunds';
  if (classification === 'INCOME') return 'revenue';
  if (classification === 'REIMBURSEMENT') return 'reimbursementIncome';
  if (classification === 'REIMBURSABLE') return 'reimbursableExpense';
  if (classification === 'COGS') return 'cogs';
  if (classification === 'OPERATING' && /labor|payroll|wage|contractor|staff/i.test(category)) return 'paidLabor';
  if (classification === 'OPERATING') return 'operatingExLabor';
  if (classification === 'PERSONAL') return 'personalFounderDraws';
  if (row.type === 'INCOME') return 'excludedOrUnresolvedIncome';
  return 'unknownOrUnresolved';
}

const BUCKETS = ['revenue', 'refunds', 'cogs', 'paidLabor', 'operatingExLabor',
  'personalFounderDraws', 'reimbursementIncome', 'reimbursableExpense',
  'excludedOrUnresolvedIncome', 'unknownOrUnresolved', 'transfer'];

(async () => {
  const p = new PrismaClient({ datasources: { db: { url: url() } } });
  const out = {};
  try {
    const rows = await p.$queryRawUnsafe(`
      SELECT
        to_char(t.date, 'YYYY-MM') AS month,
        t.id,
        t.date,
        t.type::text AS type,
        COALESCE(NULLIF(t."merchantName", ''), 'Unknown merchant') AS merchant,
        COALESCE(NULLIF(t."userDescription", ''), NULLIF(t.description, ''), '') AS description,
        COALESCE(sc.name, c.name, 'Uncategorized') AS category,
        COALESCE(
          s.classification::text, sc."defaultClassification"::text,
          t.classification::text, c."defaultClassification"::text,
          CASE WHEN t.type::text = 'INCOME' THEN 'INCOME'
               WHEN t.type::text = 'TRANSFER' THEN 'TRANSFER'
               ELSE 'UNCLASSIFIED' END
        ) AS classification,
        ABS(CASE WHEN s.id IS NULL THEN t.amount ELSE s.amount END) AS amount,
        COALESCE(a.name, 'no account') AS account,
        COALESCE(a."custodyRole"::text, 'NULL') AS custody,
        (a."squareConnectionId" IS NULL) AS non_square_account
      FROM transactions t
      LEFT JOIN categories c ON c.id = t."categoryId"
      LEFT JOIN transaction_splits s ON s."transactionId" = t.id
      LEFT JOIN categories sc ON sc.id = s."categoryId"
      LEFT JOIN financial_accounts a ON a.id = t."accountId"
      WHERE t.date >= '2026-01-01'::date AND t.date < '2026-10-01'::date
        AND t.status::text = 'POSTED'
        AND NOT EXISTS (
          SELECT 1 FROM reconciliation_allocations ra
          WHERE ra."transactionId" = t.id AND ra."isCurrent" = true AND ra.role = 'BANK_SETTLEMENT'
        )
      ORDER BY t.date, t.id
    `);
    out.postingRowCount = rows.length;
    out.distinctTxIds = new Set(rows.map((x) => x.id)).size;

    const months = {};
    const catByMonth = {};       // month -> bucket -> category -> amount
    const revByCustody = {};     // month -> custody|square-linked -> amount
    for (const row of rows) {
      const m = row.month;
      months[m] = months[m] || Object.fromEntries(BUCKETS.map((b) => [b, 0]).concat([['rows', 0]]));
      const bucket = classifyPosting(row);
      const amt = Number(row.amount || 0);
      months[m][bucket] += amt;
      months[m].rows += 1;
      catByMonth[m] = catByMonth[m] || {};
      catByMonth[m][bucket] = catByMonth[m][bucket] || {};
      catByMonth[m][bucket][row.category] = r2((catByMonth[m][bucket][row.category] || 0) + amt);
      if (bucket === 'revenue') {
        revByCustody[m] = revByCustody[m] || {};
        const key = `${row.custody}/${row.non_square_account ? 'nonSquareAcct' : 'squareLinkedAcct'}`;
        revByCustody[m][key] = r2((revByCustody[m][key] || 0) + amt);
      }
    }
    for (const m of Object.keys(months)) for (const b of BUCKETS) months[m][b] = r2(months[m][b]);
    out.months = months;
    out.categoriesByMonth = catByMonth;
    out.revenueByCustody = revByCustody;

    // freshness / cutoff
    const fresh = await p.$queryRawUnsafe(`
      SELECT MAX(date) AS last_posted FROM transactions WHERE status::text='POSTED'
    `);
    const sept = await p.$queryRawUnsafe(`
      SELECT MAX(date) AS last_posted_sept, COUNT(*)::int AS n
      FROM transactions WHERE status::text='POSTED'
        AND date >= '2026-09-01'::date AND date < '2026-10-01'::date
    `);
    const pending = await p.$queryRawUnsafe(`
      SELECT status::text AS status, COUNT(*)::int AS n, ROUND(SUM(amount)::numeric,2) AS total
      FROM transactions WHERE date >= '2026-01-01'::date AND date < '2026-10-01'::date
      GROUP BY 1 ORDER BY 1
    `);
    out.freshness = { lastPosted: fresh[0]?.last_posted, sept: sept[0], statusMix: pending };

    // Brain payment.received measure (localBudgetSync.js:213-221 predicate, no POSTED /
    // settlement filter) vs the economist P&L revenue bucket.
    const brainIncome = await p.$queryRawUnsafe(`
      SELECT to_char(t.date,'YYYY-MM') AS month, COUNT(*)::int AS n,
             ROUND(SUM(t.amount)::numeric,2) AS total
      FROM transactions t
      JOIN financial_accounts a ON a.id = t."accountId"
      WHERE t.type::text='INCOME' AND a."squareConnectionId" IS NULL
        AND t.date >= '2026-01-01'::date AND t.date < '2026-10-01'::date
      GROUP BY 1 ORDER BY 1
    `);
    const brainCapture = await p.$queryRawUnsafe(`
      SELECT to_char(t.date,'YYYY-MM') AS month, COUNT(*)::int AS n,
             ROUND(SUM(t.amount)::numeric,2) AS total
      FROM transactions t
      JOIN financial_accounts a ON a.id = t."accountId"
      WHERE t.type::text='INCOME' AND a."squareConnectionId" IS NOT NULL
        AND t.date >= '2026-01-01'::date AND t.date < '2026-10-01'::date
      GROUP BY 1 ORDER BY 1
    `);
    out.brainIncomeStream = brainIncome;
    out.brainCaptureStream = brainCapture;

    // Accounts + custody map, and which accounts carry INCOME transactions at all.
    out.accounts = await p.$queryRawUnsafe(`
      SELECT a.id, a.name, a.type::text AS type, a."custodyRole"::text AS custody,
             (a."squareConnectionId" IS NOT NULL) AS square_linked, a."isInternal",
             COUNT(t.id)::int AS tx_rows,
             COUNT(CASE WHEN t.type::text='INCOME' THEN 1 END)::int AS income_rows
      FROM financial_accounts a
      LEFT JOIN transactions t ON t."accountId" = a.id
      GROUP BY a.id, a.name, a.type, a."custodyRole", a."squareConnectionId", a."isInternal"
      ORDER BY tx_rows DESC
    `);

    // Classification of INCOME rows on non-Square accounts: what the Brain stream would
    // call cash revenue but the P&L would not.
    out.brainIncomeByClassification = await p.$queryRawUnsafe(`
      SELECT to_char(t.date,'YYYY-MM') AS month,
             COALESCE(t.classification::text, c."defaultClassification"::text, 'NULL') AS classification,
             t.status::text AS status,
             COUNT(*)::int AS n, ROUND(SUM(t.amount)::numeric,2) AS total
      FROM transactions t
      JOIN financial_accounts a ON a.id = t."accountId"
      LEFT JOIN categories c ON c.id = t."categoryId"
      WHERE t.type::text='INCOME' AND a."squareConnectionId" IS NULL
        AND t.date >= '2026-01-01'::date AND t.date < '2026-10-01'::date
      GROUP BY 1,2,3 ORDER BY 1,2,3
    `);

    fs.writeFileSync('tmp-evidence/actuals.json', JSON.stringify(out, null, 2));
    console.log('rows', out.postingRowCount, 'distinctTx', out.distinctTxIds);
    console.log('freshness', JSON.stringify(out.freshness));
    console.log('\nMONTH  revenue refunds cogs paidLabor opExLabor personal reimbInc reimbExp exclInc unknown transfer rows');
    for (const m of Object.keys(months).sort()) {
      const x = months[m];
      console.log([m, x.revenue, x.refunds, x.cogs, x.paidLabor, x.operatingExLabor,
        x.personalFounderDraws, x.reimbursementIncome, x.reimbursableExpense,
        x.excludedOrUnresolvedIncome, x.unknownOrUnresolved, x.transfer, x.rows].join(' '));
    }
    console.log('\nbrain payment.received candidate rows (squareConnectionId IS NULL, all statuses):');
    for (const b of brainIncome) console.log(' ', b.month, b.n, String(b.total));
    console.log('brain payment.captured candidate rows (square-linked accounts):');
    for (const b of brainCapture) console.log(' ', b.month, b.n, String(b.total));
  } finally { await p.$disconnect(); }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
