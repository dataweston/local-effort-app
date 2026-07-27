/**
 * Apply supabase-localist-members-setup.sql to the Supabase Postgres.
 *
 * The `localist_members` table has never existed in production. Both
 * api-handlers/localist/subscribe.js (write) and api-handlers/hub/membership.js
 * (read) treat its absence as a non-fatal error, so signups recorded a Brevo
 * contact and nothing else, and every member's tier degraded to an untiered
 * "Localist" on /hub/membership.
 *
 *   node scripts/apply-localist-members-table.js          # show SQL + current state
 *   node scripts/apply-localist-members-table.js --apply  # execute
 *
 * Run from the repo root.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const SQL_FILE = path.join(__dirname, '..', 'supabase-localist-members-setup.sql');

// IMPORTANT: this repo talks to two different Postgres databases. DATABASE_URL /
// POSTGRES_URL are the Prisma one (db.prisma.io) and do NOT have the Supabase
// `authenticated` role — running this SQL there fails on the RLS policy, and
// would put the table in the wrong database if it didn't. The Supabase pooler
// is DIRECT_DATABASE_URL.
function resolveConnectionString() {
  const direct = process.env.DIRECT_DATABASE_URL || '';
  if (direct.includes('supabase')) return direct;

  const envPath = path.join(__dirname, '..', '.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  const matches = [...raw.matchAll(/^[A-Z_]*(?:DATABASE|POSTGRES)_URL\s*=\s*"?([^"\n\r]+)"?/gm)]
    .map((m) => m[1])
    .filter((u) => u.includes('supabase'));
  if (!matches.length) {
    throw new Error(
      'No Supabase Postgres connection string found. Expected DIRECT_DATABASE_URL ' +
        '(aws-*.pooler.supabase.com). Do not fall back to DATABASE_URL — that is the Prisma database.'
    );
  }
  return matches[0];
}

async function main() {
  const apply = process.argv.includes('--apply');
  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  const connectionString = resolveConnectionString();
  if (!connectionString) throw new Error('No DATABASE_URL found.');

  const host = connectionString.replace(/\/\/[^@]*@/, '//***@');
  console.log(`target: ${host}\n`);

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const before = await client.query(
      "SELECT to_regclass('public.localist_members') AS tbl"
    );
    console.log(`localist_members before: ${before.rows[0].tbl || 'DOES NOT EXIST'}`);

    if (!apply) {
      console.log('\nDry run. Re-run with --apply to execute the SQL below:\n');
      console.log(sql);
      return;
    }

    await client.query(sql);
    console.log('\napplied.');

    const cols = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'localist_members'
       ORDER BY ordinal_position`
    );
    console.log(`\nlocalist_members now has ${cols.rowCount} columns:`);
    for (const c of cols.rows) console.log(`  ${c.column_name}  ${c.data_type}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('FAILED:', err?.message || err);
  process.exit(1);
});
