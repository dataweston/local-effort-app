/* throwaway: AP/AR schema probe, Neon, Investments, transaction_links, accrual probe */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
function ro(v){ try{const p=new URL(v);p.searchParams.set('connection_limit','1');p.searchParams.set('pool_timeout','30');return p.toString();}catch{return v;} }
const url=(process.env.LOCAL_BUDGET_DATABASE_URL||'').trim().replace(/^["']|["']$/g,'').replace(/^[A-Z_]+=/,'').replace(/^["']|["']$/g,'');
const lb=new PrismaClient({datasources:{db:{url:ro(url)}}});
const SEL=`t.date::date::text AS d,t.type::text AS ty,t.amount::text AS amt,
  left(coalesce(t."merchantName",''),34) AS merchant, left(coalesce(t.description,''),44) AS descr,
  coalesce(c.name,'-') AS cat,coalesce(t.classification::text,'-') AS cls,a.name AS acct,a."custodyRole"::text AS custody, t.id`;
const FROM=`FROM transactions t LEFT JOIN categories c ON c.id=t."categoryId"
  LEFT JOIN financial_accounts a ON a.id=t."accountId"`;
function tab(rows){ if(!rows.length){console.log('  (none)');return;} const keys=Object.keys(rows[0]);
  const w={}; for(const k of keys) w[k]=Math.max(k.length,...rows.map(r=>String(r[k]??'').length));
  console.log('  '+keys.map(k=>k.padEnd(w[k])).join(' | '));
  for(const r of rows) console.log('  '+keys.map(k=>String(r[k]??'').padEnd(w[k])).join(' | ')); }
(async()=>{try{
  console.log('=== schema probe: AP/AR/accrual-ish columns');
  tab(await lb.$queryRawUnsafe(`SELECT table_name,column_name,udt_name FROM information_schema.columns
    WHERE table_schema='public' AND (column_name ~* '(due|invoice|bill|payable|receivable|outstanding|accru|principal|interest|term|maturity|apr|rate)')
    ORDER BY table_name,column_name`));

  console.log('\n=== schema probe: tables matching ap/ar/invoice/loan/tax');
  tab(await lb.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'
    AND table_name ~* '(invoice|payable|receivable|loan|debt|tax|bill|liab|accru|payroll|draw|distribution|equity)' ORDER BY table_name`));

  console.log('\n=== Investments category (all rows)');
  tab(await lb.$queryRawUnsafe(`SELECT ${SEL} ${FROM} WHERE c.name='Investments' ORDER BY t.date`));

  console.log('\n=== Neon / kitchen / rent-vendor rows');
  tab(await lb.$queryRawUnsafe(`SELECT ${SEL} ${FROM} WHERE lower(coalesce(t."merchantName",'')||' '||coalesce(t.description,'')||' '||coalesce(t.notes,'')) ~ '(neon|kitchen|commissary)' ORDER BY t.date`));

  console.log('\n=== Rent category rows (all)');
  tab(await lb.$queryRawUnsafe(`SELECT ${SEL} ${FROM} WHERE c.name='Rent' ORDER BY t.date`));

  console.log('\n=== transaction_links linkType counts');
  tab(await lb.$queryRawUnsafe(`SELECT "linkType", count(*)::int AS n, sum(amount)::text AS total FROM transaction_links GROUP BY 1 ORDER BY 2 DESC`));

  console.log('\n=== vendors: loan/tax/kitchen-ish');
  tab(await lb.$queryRawUnsafe(`SELECT id,name,"normalizedName",array_to_string(aliases,';') AS aliases,"defaultClassification"::text AS cls FROM vendors
    WHERE lower(name) ~ '(lange|neon|square loan|tax|irs|revenue|payroll|gusto|adp)' ORDER BY name`));
}finally{await lb.$disconnect();}})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
