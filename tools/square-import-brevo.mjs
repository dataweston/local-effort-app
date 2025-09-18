#!/usr/bin/env node
/* eslint-disable no-console, no-constant-condition */

// Simple Square → Brevo import runner that hits the backend endpoint
// POST /api/square/customers/import with { upsertBrevo: true, cursor }
// Loops through all pages until cursor is null.

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

async function run({ once = false } = {}) {
  let cursor = null;
  let totalImported = 0;
  let totalErrors = 0;
  let page = 0;
  for (;;) {
    page += 1;
    const body = { upsertBrevo: true };
    if (cursor) body.cursor = cursor;
    const res = await fetch(`${API_BASE}/api/square/customers/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`Request failed ${res.status}: ${txt}`);
      process.exit(1);
    }
    const data = await res.json();
    const imp = Number(data.imported || 0);
    const err = Number(data.errors || 0);
    totalImported += imp;
    totalErrors += err;
    console.log(`[square-import] page=${page} imported=${imp} errors=${err} cursor=${data.cursor || 'null'}`);
    cursor = data.cursor || null;
    if (once || !cursor) break;
  }
  console.log(`[square-import] done totalImported=${totalImported} totalErrors=${totalErrors}`);
  if (totalErrors > 0) process.exitCode = 1;
}

function usage() {
  console.log(`\nUsage: node tools/square-import-brevo.mjs [--once]\nEnv:\n  API_BASE: Backend base URL (default http://localhost:3001)\nNotes:\n  - Backend must be running with SQUARE_ACCESS_TOKEN and BREVO_API_KEY set.\n  - This will upsert Square customers into Brevo directly.\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return usage();
  const once = args.includes('--once');
  await run({ once });
}

main().catch((e) => {
  console.error('[square-import] fatal:', e && e.message);
  process.exit(1);
});
