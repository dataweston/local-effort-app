/* throwaway: read-only introspection of Local Budget DB */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

function withReadOnlyPoolParams(value) {
  if (!/^postgres(ql)?:/i.test(value || '')) return value;
  try {
    const parsed = new URL(value);
    parsed.searchParams.set('connection_limit', '1');
    parsed.searchParams.set('pool_timeout', '30');
    return parsed.toString();
  } catch { return value; }
}
function getLbClient() {
  let url = (process.env.LOCAL_BUDGET_DATABASE_URL || '').trim();
  url = url.replace(/^["']|["']$/g, '').replace(/^[A-Z_]+=/, '').replace(/^["']|["']$/g, '');
  if (!url) throw new Error('LOCAL_BUDGET_DATABASE_URL not set');
  return new PrismaClient({ datasources: { db: { url: withReadOnlyPoolParams(url) } } });
}

(async () => {
  const lb = getLbClient();
  try {
    const tables = await lb.$queryRawUnsafe(
      `SELECT table_name, (SELECT count(*) FROM information_schema.columns c WHERE c.table_name=t.table_name AND c.table_schema='public') AS cols
       FROM information_schema.tables t
       WHERE table_schema='public' AND table_type='BASE TABLE'
       ORDER BY table_name`
    );
    console.log('TABLES (' + tables.length + '):');
    for (const t of tables) console.log('  ' + t.table_name + ' [' + t.cols + ' cols]');

    const enums = await lb.$queryRawUnsafe(
      `SELECT t.typname, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS labels
       FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
       JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'
       GROUP BY t.typname ORDER BY t.typname`
    );
    console.log('\nENUMS:');
    for (const e of enums) console.log('  ' + e.typname + ' = ' + e.labels);
  } finally { await lb.$disconnect(); }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
