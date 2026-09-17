/* THROWAWAY read-only. LBCashLiquidity slice. SELECT only, no DDL/DML. */
require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
function ro(v){ if(!/^postgres(ql)?:/i.test(v||''))return v; try{const p=new URL(v);p.searchParams.set('connection_limit','1');p.searchParams.set('pool_timeout','30');return p.toString();}catch{return v;} }
let url=(process.env.LOCAL_BUDGET_DATABASE_URL||'').trim().replace(/^["']|["']$/g,'').replace(/^[A-Z_]+=/,'').replace(/^["']|["']$/g,'');
const lb = new PrismaClient({ datasources: { db: { url: ro(url) } } });
const out = {};
const J = (x) => JSON.stringify(x, (k,v) => typeof v === 'bigint' ? Number(v) : v, 2);

(async () => {
  // does any table carry economicScope / legalOwner style columns?
  out.scopeCols = await lb.$queryRawUnsafe(
    `SELECT table_name, column_name, udt_name FROM information_schema.columns
      WHERE table_schema='public'
        AND (column_name ILIKE '%scope%' OR column_name ILIKE '%custody%' OR column_name ILIKE '%legalOwner%' OR column_name ILIKE '%restrict%')
      ORDER BY table_name, column_name`);

  out.accounts = await lb.$queryRawUnsafe(
    `SELECT a.id, a.name, a.type::text AS type, a.institution, a.currency,
            a."isActive", a."isInternal", a."custodyRole"::text AS custody_role,
            a."currentBalance", a."availableBalance",
            a."openingBalance", a."openingBalanceDate",
            a."squareConnectionId" IS NOT NULL AS square_linked,
            a."plaidAccountId" IS NOT NULL AS plaid_linked,
            a."lastSyncedAt", a."entityId", e.name AS entity_name, e.type::text AS entity_type,
            a."createdAt"
       FROM financial_accounts a
       LEFT JOIN entities e ON e.id = a."entityId"
       ORDER BY a.name`);

  out.owners = await lb.$queryRawUnsafe(
    `SELECT o.id, o."accountId", a.name AS account_name, a."custodyRole"::text AS custody_role,
            o."entityId", e.name AS owner_name, e.type::text AS owner_type,
            o.role::text AS role, o."effectiveFrom", o."effectiveTo",
            o."sourceRef", o."confirmedAt"
       FROM financial_account_owners o
       LEFT JOIN financial_accounts a ON a.id = o."accountId"
       LEFT JOIN entities e ON e.id = o."entityId"
       ORDER BY a.name, o.role`);

  out.entities = await lb.$queryRawUnsafe(
    `SELECT id, type::text AS type, name, description, "isDefault", metadata FROM entities ORDER BY name`);

  out.entityCount = await lb.$queryRawUnsafe(`SELECT count(*)::int n FROM entities`);
  out.accountCount = await lb.$queryRawUnsafe(`SELECT count(*)::int n FROM financial_accounts`);
  out.ownerCount = await lb.$queryRawUnsafe(`SELECT count(*)::int n FROM financial_account_owners`);

  // sign convention check: are amounts ever negative? per type
  out.signByType = await lb.$queryRawUnsafe(
    `SELECT type::text AS type, status::text AS status, count(*)::int AS n,
            min(amount) AS min_amt, max(amount) AS max_amt,
            sum(CASE WHEN amount < 0 THEN 1 ELSE 0 END)::int AS neg_rows
       FROM transactions GROUP BY 1,2 ORDER BY 1,2`);

  out.txTotals = await lb.$queryRawUnsafe(
    `SELECT count(*)::int AS n, min(date) AS min_date, max(date) AS max_date FROM transactions`);

  out.txPostedTotals = await lb.$queryRawUnsafe(
    `SELECT count(*)::int AS n, min(date) AS min_date, max(date) AS max_date
       FROM transactions WHERE status::text='POSTED'`);

  // latest balance snapshot per account
  out.snapshots = await lb.$queryRawUnsafe(
    `SELECT s."accountId", a.name AS account_name, s.balance, s."availableBalance",
            s.currency, s."effectiveAt", s.source, s."externalSnapshotId", s."createdAt"
       FROM account_balance_snapshots s
       LEFT JOIN financial_accounts a ON a.id = s."accountId"
       ORDER BY a.name, s."effectiveAt" DESC`);
  out.snapshotCount = await lb.$queryRawUnsafe(`SELECT count(*)::int n FROM account_balance_snapshots`);

  fs.writeFileSync('tmp-evidence/lb-cash/out1.json', J(out));
  console.log('rows: accounts=%d owners=%d entities=%d snapshots=%d scopeCols=%d',
    out.accounts.length, out.owners.length, out.entities.length, out.snapshots.length, out.scopeCols.length);
  await lb.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
