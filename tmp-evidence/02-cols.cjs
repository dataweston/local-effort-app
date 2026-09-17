#!/usr/bin/env node
'use strict';
// THROWAWAY: full column list for the tables that matter, one per line.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
function url() {
  let u = String(process.env.LOCAL_BUDGET_DATABASE_URL || '').trim()
    .replace(/^["']|["']$/g, '').replace(/^[A-Z_]+=/, '').replace(/^["']|["']$/g, '');
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
    for (const t of tables) console.log('T ' + t.table_name);
    for (const tbl of ['transactions', 'financial_accounts', 'reconciliation_allocations']) {
      const cols = await p.$queryRawUnsafe(
        `SELECT column_name, udt_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, tbl
      );
      for (const c of cols) console.log(`C ${tbl}.${c.column_name} ${c.udt_name}`);
    }
  } finally { await p.$disconnect(); }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
