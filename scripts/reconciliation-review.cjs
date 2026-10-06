'use strict';

const fs = require('fs');
const path = require('path');

const MONEY_FIELDS = [
  'incomeCents',
  'inventoryCents',
  'operatingCents',
  'laborCents',
  'reimbursableCents',
  'personalExcludedCents',
  'transferExcludedCents',
  'unclassifiedCents',
];

function usage() {
  return 'Usage: node scripts/reconciliation-review.cjs <accuracy-audit.json> [review.md]';
}

function dollars(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function buildReview(audit, artifactPath) {
  const localBudget = audit?.phase6?.cashActuals;
  if (!localBudget) throw new Error('Artifact does not contain phase6.cashActuals');

  const cashActuals = localBudget.cashActuals;
  const transactions = localBudget.transactions;
  const months = cashActuals?.months || [];
  const categorizedCents = months.reduce((total, month) => (
    total + MONEY_FIELDS.reduce((monthTotal, field) => monthTotal + (Number(month[field]) || 0), 0)
  ), 0);
  const lineageCents = Number(transactions?.cashPostingPostedCents) || 0;
  const differenceCents = lineageCents - categorizedCents;
  const quality = cashActuals?.quality || {};
  const checks = [
    { label: 'Local Budget endpoints were available', pass: localBudget.available === true },
    { label: 'Transaction paging completed without truncation', pass: transactions?.truncated === false },
    { label: 'The requested period returned monthly cashflow rows', pass: months.length > 0 },
    { label: 'Cashflow categories cover posted cash-lineage dollars exactly', pass: differenceCents === 0 },
    { label: 'No split mismatches remain', pass: Number(quality.splitMismatchCount || 0) === 0 },
  ];
  const automatedPass = checks.every((check) => check.pass);
  const lineageKinds = Object.entries(transactions?.byLineageKind || {}).sort((a, b) => b[1] - a[1]);

  const lines = [
    '# Reconciliation review',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Audit artifact: \`${artifactPath}\``,
    `Period: ${audit?.period?.from || 'unknown'} through ${audit?.period?.toExclusive || 'unknown'} (exclusive)`,
    '',
    `## Automated result: ${automatedPass ? 'PASS' : 'REVIEW REQUIRED'}`,
    '',
    ...checks.map((check) => `- [${check.pass ? 'x' : ' '}] ${check.label}`),
    '',
    '## Dollar bridge',
    '',
    `- Cashflow category total, including excluded transfers: **${dollars(categorizedCents)}**`,
    `- Posted cash-lineage total: **${dollars(lineageCents)}**`,
    `- Difference requiring explanation: **${dollars(differenceCents)}**`,
    `- Unclassified: **${dollars(Number(quality.unclassifiedCents) || 0)}** across **${Number(quality.unclassifiedTransactionCount) || 0}** transactions`,
    `- Pending transactions: **${Number(quality.pendingTransactionCount) || 0}**`,
    '',
    'The bridge is a coverage check, not permission to add processor rows to cash revenue. Captures, fees, refunds, payouts, and bank settlements can coexist in the lineage feed; count only posted rows marked as cash postings.',
    '',
    '## Lineage mix',
    '',
    ...(lineageKinds.length ? lineageKinds.map(([kind, count]) => `- ${kind}: ${count}`) : ['- No lineage kinds returned.']),
    '',
    '## Five-minute owner review',
    '',
    '- [ ] Confirm the period matches the report being reviewed.',
    '- [ ] Explain the dollar difference above; attach transaction IDs in a separate private note if needed.',
    '- [ ] Spot-check one Square payout: capture → payout/settlement → one bank cash posting.',
    '- [ ] Confirm transfers are excluded and no capture/payout is added to bank income.',
    '- [ ] Record the decision below. Do not mark the annual report ready from this file alone.',
    '',
    'Decision: **OPEN**',
    '',
    'Reviewer: ____________________  Date: ____________________',
    '',
    'Notes:',
    '',
  ];

  return { markdown: `${lines.join('\n')}\n`, summary: { automatedPass, categorizedCents, lineageCents, differenceCents } };
}

function main() {
  const input = process.argv[2];
  if (!input || input === '--help' || input === '-h') {
    console.log(usage());
    process.exitCode = input ? 0 : 1;
    return;
  }
  const output = process.argv[3] || path.resolve('.tmp', 'reconciliation-review.md');
  const audit = JSON.parse(fs.readFileSync(input, 'utf8'));
  const review = buildReview(audit, input);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, review.markdown, 'utf8');
  console.log(JSON.stringify({ output, ...review.summary }, null, 2));
}

if (require.main === module) main();

module.exports = { buildReview };
