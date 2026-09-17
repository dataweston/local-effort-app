#!/usr/bin/env node
'use strict';
// THROWAWAY read-only introspection of the Local Budget production DB.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

function url() {
  let u = String(process.env.LOCAL_BUDGET_DATABASE_URL || '').trim()
    .replace(/^["']|["']$/g, '').replace(/^[A-Z_]+=/, '').replace(/^["']|["']$/g, '');
  if (!u) throw new Error('LOCAL_BUDGET_DATABASE_URL missing');
  const parsed = new URL(u);
  parsed.searchParams.set('connection_limit', '1');
  parsed.searchParams.set('pool_timeout', '30');
  return parsed.toString();
}

(async () => {
  const p = new PrismaClient({ datasources: { db: { url: url() } } });
  try {
    const tables = await p.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`
    );
    console.log('TABLES(' + tables.length + '):');
    console.log(tables.map((t) => t.table_name).join(', '));

    const cols = await p.$queryRawUnsafe(
      `SELECT table_name, column_name, data_type, udt_name
       FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name IN ('transactions','categories','transaction_splits',
                            'reconciliation_allocations','financial_accounts','square_customers')
       ORDER BY table_name, ordinal_position`
    );
    let cur = null;
    for (const c of cols) {
      if (c.table_name !== cur) { cur = c.table_name; console.log('\n-- ' + cur); }
      process.stdout.write(`${c.column_name}:${c.udt_name} `);
    }
    console.log('\n');

    const enums = await p.$queryRawUnsafe(
      `SELECT t.typname, string_agg(e.enumlabel, '|' ORDER BY e.enumsortorder) AS labels
       FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
       JOIN pg_namespace n ON n.oid = t.typnamespace AND n.nspname='public'
       GROUP BY t.typname ORDER BY t.typname`
    );
    console.log('ENUMS:');
    for (const e of enums) console.log(`  ${e.typname} = ${e.labels}`);
  } finally {
    await p.$disconnect();
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
