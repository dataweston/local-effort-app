/* throwaway: full column lists, one per line */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
function ro(v){ try{const p=new URL(v);p.searchParams.set('connection_limit','1');p.searchParams.set('pool_timeout','30');return p.toString();}catch{return v;} }
const url=(process.env.LOCAL_BUDGET_DATABASE_URL||'').trim().replace(/^["']|["']$/g,'').replace(/^[A-Z_]+=/,'').replace(/^["']|["']$/g,'');
const lb=new PrismaClient({datasources:{db:{url:ro(url)}}});
const WANT=['transactions','financial_accounts','entities','source_events','transaction_links','processor_settlements','reconciliation_allocations'];
(async()=>{try{
 for(const t of WANT){
   const cols=await lb.$queryRawUnsafe(`SELECT column_name,udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,t);
   console.log('== '+t);
   for(const c of cols) console.log('   '+c.column_name+' : '+c.udt_name);
 }
}finally{await lb.$disconnect();}})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
