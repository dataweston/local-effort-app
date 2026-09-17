/* throwaway: entities, accounts, categories */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
function ro(v){ try{const p=new URL(v);p.searchParams.set('connection_limit','1');p.searchParams.set('pool_timeout','30');return p.toString();}catch{return v;} }
const url=(process.env.LOCAL_BUDGET_DATABASE_URL||'').trim().replace(/^["']|["']$/g,'').replace(/^[A-Z_]+=/,'').replace(/^["']|["']$/g,'');
const lb=new PrismaClient({datasources:{db:{url:ro(url)}}});
const J=(x)=>JSON.stringify(x,(k,v)=>typeof v==='bigint'?Number(v):v);
(async()=>{try{
  console.log('--- entities');
  for(const r of await lb.$queryRawUnsafe(`SELECT id,type::text,name,description,"isDefault",metadata FROM entities ORDER BY name`)) console.log(J(r));

  console.log('\n--- financial_accounts');
  for(const r of await lb.$queryRawUnsafe(
    `SELECT a.id,a.name,a.type::text AS acct_type,a.institution,a."custodyRole"::text AS custody,a."entityId",e.name AS entity_name,
            a."currentBalance",a."isActive",a."isInternal",a."squareConnectionId" IS NOT NULL AS is_processor,
            a."openingBalance",a."openingBalanceDate"
     FROM financial_accounts a LEFT JOIN entities e ON e.id=a."entityId" ORDER BY a.name`)) console.log(J(r));

  console.log('\n--- financial_account_owners');
  for(const r of await lb.$queryRawUnsafe(
    `SELECT o.id,a.name AS account,e.name AS owner,e.type::text AS owner_type,o.role::text AS role,o."effectiveFrom",o."effectiveTo",o."sourceRef",o."confirmedAt"
     FROM financial_account_owners o JOIN financial_accounts a ON a.id=o."accountId" LEFT JOIN entities e ON e.id=o."entityId" ORDER BY a.name,e.name`)) console.log(J(r));

  console.log('\n--- categories');
  for(const r of await lb.$queryRawUnsafe(
    `SELECT c.id,c.name,c."defaultClassification"::text AS cls,c."parentId",p.name AS parent,c."isSystem",
            (SELECT count(*)::int FROM transactions t WHERE t."categoryId"=c.id) AS tx_count
     FROM categories c LEFT JOIN categories p ON p.id=c."parentId" ORDER BY c.name`)) console.log(J(r));
}finally{await lb.$disconnect();}})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
