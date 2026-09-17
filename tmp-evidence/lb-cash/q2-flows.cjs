/* THROWAWAY read-only. LBCashLiquidity slice 2: activity, staleness, flows. SELECT only. */
require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
function ro(v){ if(!/^postgres(ql)?:/i.test(v||''))return v; try{const p=new URL(v);p.searchParams.set('connection_limit','1');p.searchParams.set('pool_timeout','30');return p.toString();}catch{return v;} }
let url=(process.env.LOCAL_BUDGET_DATABASE_URL||'').trim().replace(/^["']|["']$/g,'').replace(/^[A-Z_]+=/,'').replace(/^["']|["']$/g,'');
const lb = new PrismaClient({ datasources: { db: { url: ro(url) } } });
const out = {};
const J = (x) => JSON.stringify(x, (k,v) => typeof v === 'bigint' ? Number(v) : v, 2);
const ANCHOR = '2026-09-01'; // latest POSTED transaction date in LB

(async () => {
  // per-account activity + staleness
  out.activity = await lb.$queryRawUnsafe(
    `SELECT a.name, a."custodyRole"::text AS custody, a."entityId", e.name AS entity_name,
            count(t.id)::int AS tx_rows,
            count(t.id) FILTER (WHERE t.status::text='POSTED')::int AS posted_rows,
            min(t.date) AS first_tx, max(t.date) AS last_tx,
            max(t.date) FILTER (WHERE t.status::text='POSTED') AS last_posted,
            (DATE '2026-09-13' - max(t.date) FILTER (WHERE t.status::text='POSTED')::date) AS days_since_posted
       FROM financial_accounts a
       LEFT JOIN transactions t ON t."accountId" = a.id
       LEFT JOIN entities e ON e.id = a."entityId"
       GROUP BY a.name, a."custodyRole", a."entityId", e.name
       ORDER BY a.name`);

  // per-account signed sums, POSTED only, by type
  out.sumsByType = await lb.$queryRawUnsafe(
    `SELECT a.name, t.type::text AS type, count(*)::int AS n, sum(t.amount) AS total
       FROM transactions t JOIN financial_accounts a ON a.id=t."accountId"
      WHERE t.status::text='POSTED'
      GROUP BY 1,2 ORDER BY 1,2`);

  // trailing windows anchored on latest posted date, all accounts
  out.windows = await lb.$queryRawUnsafe(
    `WITH w AS (
       SELECT a.name, a."custodyRole"::text AS custody,
              CASE WHEN t.date > DATE '${ANCHOR}' - 30 THEN 1 ELSE 0 END AS w30,
              CASE WHEN t.date > DATE '${ANCHOR}' - 60 THEN 1 ELSE 0 END AS w60,
              CASE WHEN t.date > DATE '${ANCHOR}' - 90 THEN 1 ELSE 0 END AS w90,
              CASE t.type::text WHEN 'INCOME' THEN t.amount WHEN 'EXPENSE' THEN -t.amount ELSE 0 END AS signed_amt,
              CASE WHEN t.type::text='INCOME' THEN t.amount ELSE 0 END AS inflow,
              CASE WHEN t.type::text='EXPENSE' THEN t.amount ELSE 0 END AS outflow,
              CASE WHEN t.type::text='TRANSFER' THEN t.amount ELSE 0 END AS xfer
         FROM transactions t JOIN financial_accounts a ON a.id=t."accountId"
        WHERE t.status::text='POSTED' AND t.date > DATE '${ANCHOR}' - 90 AND t.date <= DATE '${ANCHOR}'
     )
     SELECT name, custody,
            sum(w30*inflow) AS in30, sum(w30*outflow) AS out30, sum(w30*signed_amt) AS net30, sum(w30*xfer) AS xfer30, sum(w30)::int AS n30,
            sum(w60*inflow) AS in60, sum(w60*outflow) AS out60, sum(w60*signed_amt) AS net60, sum(w60*xfer) AS xfer60, sum(w60)::int AS n60,
            sum(w90*inflow) AS in90, sum(w90*outflow) AS out90, sum(w90*signed_amt) AS net90, sum(w90*xfer) AS xfer90, sum(w90)::int AS n90
       FROM w GROUP BY 1,2 ORDER BY 1`);

  // top inflows / outflows last 90 days, non-processor accounts
  out.topIn = await lb.$queryRawUnsafe(
    `SELECT a.name AS account, a."custodyRole"::text AS custody, t.date, t.amount,
            t."merchantName", t.description, t.classification::text AS classification, c.name AS category
       FROM transactions t JOIN financial_accounts a ON a.id=t."accountId"
       LEFT JOIN categories c ON c.id=t."categoryId"
      WHERE t.status::text='POSTED' AND t.type::text='INCOME'
        AND t.date > DATE '${ANCHOR}' - 90 AND t.date <= DATE '${ANCHOR}'
        AND a."custodyRole"::text <> 'PROCESSOR'
      ORDER BY t.amount DESC LIMIT 15`);

  out.topOut = await lb.$queryRawUnsafe(
    `SELECT a.name AS account, a."custodyRole"::text AS custody, t.date, t.amount,
            t."merchantName", t.description, t.classification::text AS classification, c.name AS category
       FROM transactions t JOIN financial_accounts a ON a.id=t."accountId"
       LEFT JOIN categories c ON c.id=t."categoryId"
      WHERE t.status::text='POSTED' AND t.type::text='EXPENSE'
        AND t.date > DATE '${ANCHOR}' - 90 AND t.date <= DATE '${ANCHOR}'
        AND a."custodyRole"::text <> 'PROCESSOR'
      ORDER BY t.amount DESC LIMIT 15`);

  // Local Pizza (only BUSINESS account) detail: 90d rows
  out.pizza90 = await lb.$queryRawUnsafe(
    `SELECT t.date, t.type::text AS type, t.amount, t."merchantName", t.description,
            t.classification::text AS classification, t.status::text AS status
       FROM transactions t JOIN financial_accounts a ON a.id=t."accountId"
      WHERE a.name='Local Pizza' AND t.date > DATE '${ANCHOR}' - 120
      ORDER BY t.date DESC`);

  // transfer direction investigation: link types
  out.linkTypes = await lb.$queryRawUnsafe(
    `SELECT "linkType", count(*)::int AS n FROM transaction_links GROUP BY 1 ORDER BY 2 DESC`);
  out.xferSample = await lb.$queryRawUnsafe(
    `SELECT a.name AS account, t.date, t.amount, t."merchantName", t.description, t.id
       FROM transactions t JOIN financial_accounts a ON a.id=t."accountId"
      WHERE t.type::text='TRANSFER' AND t.status::text='POSTED'
      ORDER BY t.date DESC LIMIT 25`);

  // PERSONAL classification outflow since 2026-04-01 (owner draw context) per account
  out.personalDraw = await lb.$queryRawUnsafe(
    `SELECT a.name, a."custodyRole"::text AS custody, count(*)::int AS n, sum(t.amount) AS total
       FROM transactions t JOIN financial_accounts a ON a.id=t."accountId"
      WHERE t.status::text='POSTED' AND t.type::text='EXPENSE'
        AND t.classification::text='PERSONAL' AND t.date >= DATE '2026-04-01'
      GROUP BY 1,2 ORDER BY 4 DESC NULLS LAST`);

  fs.writeFileSync('tmp-evidence/lb-cash/out2.json', J(out));
  console.log('activity=%d sums=%d windows=%d topIn=%d topOut=%d pizza=%d links=%d xfer=%d draw=%d',
    out.activity.length,out.sumsByType.length,out.windows.length,out.topIn.length,out.topOut.length,out.pizza90.length,out.linkTypes.length,out.xferSample.length,out.personalDraw.length);
  await lb.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
