#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { fetchLocalBudget, loadEnv } = require('./audit-accuracy.cjs');

function usage() {
  return [
    'Usage: node scripts/reconciliation-audit.cjs --from YYYY-MM-DD --to YYYY-MM-DD [--output PATH]',
    '',
    '`--to` is exclusive. The command is read-only and queries Local Budget only.',
  ].join('\n');
}

function parseArgs(argv) {
  const args = { from: null, to: null, output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--from') args.from = argv[++index];
    else if (arg === '--to') args.to = argv[++index];
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.help) return args;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(args.to || '')) {
    throw new Error('--from and --to are required in YYYY-MM-DD format');
  }
  const start = new Date(`${args.from}T00:00:00.000Z`);
  const end = new Date(`${args.to}T00:00:00.000Z`);
  if (start >= end) throw new Error('--from must be before the exclusive --to date');
  return { ...args, start, end };
}

async function main() {
  const repo = path.resolve(__dirname, '..');
  for (const name of ['.env', '.env.local', '.env.vercel.production']) loadEnv(path.join(repo, name));
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const localBudget = await fetchLocalBudget({ start: args.start, end: args.end }, { includeReceipts: false });
  if (!localBudget.available) {
    throw new Error(`Local Budget reconciliation evidence unavailable: ${localBudget.reason || 'unknown error'}`);
  }

  const report = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    readOnly: true,
    scope: 'local_budget_cash_reconciliation',
    period: { from: args.from, toExclusive: args.to },
    phase6: { cashActuals: localBudget, unresolved: [] },
  };
  const output = args.output || path.join(repo, '.tmp', 'reconciliation-audit.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    output,
    readOnly: true,
    period: report.period,
    postedCashCents: localBudget.transactions.cashPostingPostedCents,
    unclassifiedTransactions: localBudget.cashActuals.quality.unclassifiedTransactionCount,
    pendingTransactions: localBudget.cashActuals.quality.pendingTransactionCount,
    squareTraceAvailable: localBudget.squareReconciliationTrace.available,
  }, null, 2));
}

if (require.main === module) main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

module.exports = { parseArgs };
