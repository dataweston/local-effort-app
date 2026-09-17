/* throwaway: column introspection + row counts */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
function withReadOnlyPoolParams(v){ if(!/^postgres(ql)?:/i.test(v||''))return v; try{const p=new URL(v);p.searchParams.set('connection_limit','1');p.searchParams.set('pool_timeout','30');return p.toString();}catch{return v;} }
function getLbClient(){ let url=(process.env.LOCAL_BUDGET_DATABASE_URL||'').trim(); url=url.replace(/^["']|["']$/g,'').replace(/^[A-Z_]+=/,'').replace(/^["']|["']$/g,''); return new PrismaClient({datasources:{db:{url:withReadOnlyPoolParams(url)}}}); }

const WANT = ['transactions','financial_accounts','financial_account_owners','categories','chart_accounts','journal_entries','journal_lines','entities','vendors','line_items','transaction_splits','accounting_periods','account_balance_snapshots','processor_settlements','source_events','transaction_links','close_runs'];

(async () => {
  const lb = getLbClient();
  try {
    for (const t of WANT) {
      const cols = await lb.$queryRawUnsafe(
        `SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, t);
      const cnt = await lb.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${t}"`);
      console.log(`\n== ${t} (rows=${cnt[0].n})`);
      console.log('   ' + cols.map(c => `${c.column_name}:${c.udt_name}`).join(', '));
    }
  } finally { await lb.$disconnect(); }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
