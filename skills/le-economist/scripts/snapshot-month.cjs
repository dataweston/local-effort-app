#!/usr/bin/env node
'use strict';

// Owner-run monthly snapshot writer.
//
// Runs build-line-model.cjs for one complete calendar month and writes the
// result to references/runs/YYYY-MM.json so zero-secret sessions can consume
// a versioned model run. This is deliberately NOT a Vercel cron: a serverless
// function cannot commit files to git, and the privacy gate below requires a
// human in the loop anyway.
//
// PRIVACY GATE: this repository is public. references/runs/ stays gitignored
// until the owner records a snapshot-privacy decision in
// references/decisions-log.md (approve publishing aggregates, or move runs to
// a private data repo). Do not force-add run files before that decision.

const fs = require('fs');
const path = require('path');
const { buildLineModel } = require('./build-line-model.cjs');

function parseArgs(argv) {
  const args = { repo: path.resolve(__dirname, '..', '..', '..') };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--help') args.help = true;
    else if (key === '--allow-incomplete') args.allowIncomplete = true;
    else if (['--repo', '--month'].includes(key)) args[key.slice(2)] = argv[++i];
    else throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

function previousCompleteMonth(now = new Date()) {
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthRange(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('--month must be YYYY-MM');
  const [year, monthNumber] = month.split('-').map(Number);
  const start = `${month}-01`;
  const end = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  return { start, end };
}

// Consult Local Budget's own complete-month flag when the integration API is
// configured. Returns true/false, or null when the API is unreachable.
async function localBudgetMonthComplete(month) {
  const baseUrl = String(process.env.LOCAL_BUDGET_API_URL || '').trim().replace(/\/+$/, '');
  const token = String(process.env.LOCAL_BUDGET_API_TOKEN || '').trim();
  if (!baseUrl || !token) return { complete: null, source: 'local_budget_api_not_configured' };
  const { start } = monthRange(month);
  const nextMonthFirst = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1))
    .toISOString().slice(0, 10);
  try {
    const url = new URL(`${baseUrl}/api/integration/v1/cashflow-actuals`);
    url.searchParams.set('from', start);
    url.searchParams.set('to', nextMonthFirst);
    url.searchParams.set('grain', 'month');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Local Budget API ${response.status}`);
    const payload = await response.json();
    const row = (payload.months || []).find((entry) => entry?.month === month);
    return { complete: row ? row.complete === true : false, source: 'local_budget_api' };
  } catch (error) {
    return { complete: null, source: 'local_budget_api_unreachable', error: error.message };
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('Usage: node snapshot-month.cjs [--repo PATH] [--month YYYY-MM] [--allow-incomplete]');
    console.log('Defaults to the previous calendar month. Writes references/runs/YYYY-MM.json.');
    return;
  }
  const month = args.month || previousCompleteMonth();
  const { start, end } = monthRange(month);
  const run = await buildLineModel({ repo: args.repo, start, end });
  const completeness = await localBudgetMonthComplete(month);
  if (completeness.complete === false && !args.allowIncomplete) {
    throw new Error(
      `Local Budget reports ${month} is not a complete month yet. ` +
      'Wait for it to close, or rerun with --allow-incomplete to snapshot anyway.'
    );
  }

  const runsDir = path.join(__dirname, '..', 'references', 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const outPath = path.join(runsDir, `${month}.json`);
  const snapshot = {
    snapshotVersion: 1,
    month,
    writtenAt: new Date().toISOString(),
    localBudgetMonthComplete: completeness,
    run,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.error(`Wrote ${outPath}`);
  console.error(
    'Reminder: references/runs/ is gitignored until the snapshot-privacy decision in '
    + 'references/decisions-log.md is resolved by the owner. Do not force-add.'
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = { previousCompleteMonth, monthRange };
