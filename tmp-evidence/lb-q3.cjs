/* throwaway: compact tabular sweeps */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
function ro(v){ try{const p=new URL(v);p.searchParams.set('connection_limit','1');p.searchParams.set('pool_timeout','30');return p.toString();}catch{return v;} }
const url=(process.env.LOCAL_BUDGET_DATABASE_URL||'').trim().replace(/^["']|["']$/g,'').replace(/^[A-Z_]+=/,'').replace(/^["']|["']$/g,'');
const lb=new PrismaClient({datasources:{db:{url:ro(url)}}});
const SEL=`t.date::date::text AS d,t.type::text AS ty,t.status::text AS st,t.amount::text AS amt,
  left(coalesce(t."merchantName",''),38) AS merchant, left(coalesce(t.description,''),46) AS descr,
  c.name AS cat,t.classification::text AS cls,a.name AS acct,a."custodyRole"::text AS custody,
  coalesce(e.name,'-') AS acct_entity, left(coalesce(t.notes,''),40) AS notes, t.id`;
const FROM=`FROM transactions t LEFT JOIN categories c ON c.id=t."categoryId"
  LEFT JOIN financial_accounts a ON a.id=t."accountId" LEFT JOIN entities e ON e.id=a."entityId"`;
function tab(rows){ if(!rows.length){console.log('  (none)');return;} const keys=Object.keys(rows[0]);
  const w={}; for(const k of keys) w[k]=Math.max(k.length,...rows.map(r=>String(r[k]??'').length));
  console.log('  '+keys.map(k=>k.padEnd(w[k])).join(' | '));
  for(const r of rows) console.log('  '+keys.map(k=>String(r[k]??'').padEnd(w[k])).join(' | ')); }
(async()=>{try{
  console.log('=== ALL Debt-category rows');
  tab(await lb.$queryRawUnsafe(`SELECT ${SEL} ${FROM} WHERE c.name='Debt' ORDER BY t.date`));

  console.log('\n=== Square loan / capital rows (merchant or desc)');
  tab(await lb.$queryRawUnsafe(`SELECT ${SEL} ${FROM} WHERE lower(coalesce(t."merchantName",'')||' '||coalesce(t.description,'')) ~ '(square loan|square capital|loan repay|installment)' ORDER BY t.date`));

  console.log('\n=== Lange rows (any field)');
  tab(await lb.$queryRawUnsafe(`SELECT ${SEL} ${FROM} WHERE lower(coalesce(t."merchantName",'')||' '||coalesce(t.description,'')||' '||coalesce(t.notes,'')||' '||coalesce(t."userDescription",'')) LIKE '%lange%' ORDER BY t.date`));

  console.log('\n=== tax keyword rows');
  tab(await lb.$queryRawUnsafe(`SELECT ${SEL} ${FROM} WHERE lower(coalesce(t."merchantName",'')||' '||coalesce(t.description,'')||' '||coalesce(t.notes,'')||' '||coalesce(t."userDescription",'')) ~ '(tax|irs|revenue dept|mn dept|dept of revenue|withhold|941|sales tax|unemploy|futa|suta)' ORDER BY t.date`));
}finally{await lb.$disconnect();}})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
