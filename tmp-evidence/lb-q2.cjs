/* throwaway: debt category, Lange search, keyword sweeps */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
function ro(v){ try{const p=new URL(v);p.searchParams.set('connection_limit','1');p.searchParams.set('pool_timeout','30');return p.toString();}catch{return v;} }
const url=(process.env.LOCAL_BUDGET_DATABASE_URL||'').trim().replace(/^["']|["']$/g,'').replace(/^[A-Z_]+=/,'').replace(/^["']|["']$/g,'');
const lb=new PrismaClient({datasources:{db:{url:ro(url)}}});
const J=(x)=>JSON.stringify(x,(k,v)=>typeof v==='bigint'?Number(v):v);
const SEL=`t.id,t.date::date::text AS d,t.type::text AS ty,t.status::text AS st,t.amount,
  t."merchantName" AS merchant,t.description,t."userDescription" AS udesc,t.notes,
  c.name AS cat,t.classification::text AS cls,a.name AS acct,a."custodyRole"::text AS custody,
  e.name AS acct_entity,t."externalId" AS ext,t.metadata`;
const FROM=`FROM transactions t LEFT JOIN categories c ON c.id=t."categoryId"
  LEFT JOIN financial_accounts a ON a.id=t."accountId" LEFT JOIN entities e ON e.id=a."entityId"`;
(async()=>{try{
  console.log('--- Debt category (all)');
  for(const r of await lb.$queryRawUnsafe(`SELECT ${SEL} ${FROM} WHERE c.name='Debt' ORDER BY t.date`)) console.log(J(r));

  const kw=['lange','loan','promissory','note payable','capital','advance','sba','interest','repay'];
  for(const k of kw){
    const rows=await lb.$queryRawUnsafe(
      `SELECT ${SEL} ${FROM} WHERE (lower(coalesce(t."merchantName",'')) LIKE $1 OR lower(coalesce(t.description,'')) LIKE $1
        OR lower(coalesce(t."userDescription",'')) LIKE $1 OR lower(coalesce(t.notes,'')) LIKE $1) ORDER BY t.date`, '%'+k+'%');
    console.log(`\n--- kw "${k}" n=${rows.length}`);
    for(const r of rows.slice(0,40)) console.log(J(r));
  }
}finally{await lb.$disconnect();}})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
