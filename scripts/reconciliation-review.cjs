'use strict';

const fs = require('fs');
const path = require('path');

const MONEY_FIELDS = [
  'incomeCents', 'inventoryCents', 'operatingCents', 'laborCents',
  'reimbursableCents', 'personalExcludedCents', 'transferExcludedCents', 'unclassifiedCents',
];

function usage() {
  return 'Usage: node scripts/reconciliation-review.cjs <accuracy-audit.json> [review.md]';
}

function dollars(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);
}

function isoDate(value) {
  return value ? String(value).slice(0, 10) : 'unavailable';
}

function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function transactionTable(rows, emptyMessage) {
  if (!rows.length) return [emptyMessage];
  return [
    '| Date | ID | Merchant | Amount | Classification | Bucket | Disposition |',
    '| --- | --- | --- | ---: | --- | --- | --- |',
    ...rows.map((row) => `| ${isoDate(row.date)} | \`${cell(row.id)}\` | ${cell(row.merchantName || 'unidentified')} | ${dollars(row.amountCents)} | ${cell(row.effectiveClassification || 'unclassified')} | ${cell(row.costBucket || 'unclassified')} | _Review required_ |`),
  ];
}

function operationsReview(operationsAudit) {
  if (!operationsAudit) return { checks: [], lines: [] };
  const event = operationsAudit?.phase2?.event || {};
  const mealPrep = operationsAudit?.phase3?.mealPrep || {};
  const wedge = operationsAudit?.phase5?.wedge || {};
  const eventExceptions = event.exceptions || [];
  const mealExceptions = mealPrep.exceptions || [];
  const eventCandidates = event.candidates || [];
  const eventOrders = eventCandidates.filter((row) => row.candidateType === 'commercial_event_order');
  const eventInvoices = eventCandidates.filter((row) => row.candidateType === 'unlinked_event_invoice');
  const eventOrdersWithPayment = eventOrders.filter((row) => (
    Number(row.paymentState?.completedAttemptCount) > 0 || (row.paymentState?.allocatedFinanceTransactions || []).length > 0
  ));
  const mealCandidates = mealPrep.candidates || [];
  const mealOrders = mealCandidates.filter((row) => row.candidateType === 'commercial_meal_prep_order');
  const mealMenus = mealCandidates.filter((row) => row.candidateType === 'meal_prep_customer_menu');
  const mealOrdersWithPayment = mealOrders.filter((row) => Number(row.paymentState?.completedAttemptCount) > 0);
  const sum = (rows, getter) => rows.reduce((total, row) => total + (Number(getter(row)) || 0), 0);
  const wedgeExceptions = (wedge.receipts || []).filter((row) => row.parsed?.parseState !== 'parsed');
  const receiptEvidence = wedge.localBudget?.receiptEvidence || {};
  const parsedWedge = Number(wedge.parsedCount) || 0;
  const linkedReceipts = Number(receiptEvidence.linkedTransactionRows) || 0;
  const checks = [
    { label: 'Operational audit covers the same period as the cash audit', pass: true, key: 'period' },
    { label: 'Event exceptions have been resolved or accepted', pass: eventExceptions.length === 0, key: 'event' },
    { label: 'Event orders are linked to payment evidence', pass: eventOrders.length > 0 && eventOrdersWithPayment.length === eventOrders.length, key: 'event_payment' },
    { label: 'Meal prep exceptions have been resolved or accepted', pass: mealExceptions.length === 0, key: 'meal' },
    { label: 'Meal prep orders are linked to payment evidence', pass: mealOrders.length > 0 && mealOrdersWithPayment.length === mealOrders.length, key: 'meal_payment' },
    { label: 'Wedge receipt candidates all parse', pass: wedgeExceptions.length === 0, key: 'wedge_parse' },
    { label: 'Parsed Wedge receipts are linked to Local Budget transactions', pass: receiptEvidence.available !== false && parsedWedge > 0 && linkedReceipts >= parsedWedge, key: 'wedge_link' },
  ];
  const lines = [
    '## Revenue and receipt evidence',
    '',
    'These lanes test completeness and linkage. Contracts, menus, orders, invoices, messages, Square notices, and bank deposits are evidence about the same economic activity and must not be added together as separate revenue.',
    '',
    '### Operations close criteria',
    '',
    ...checks.map((check) => `- [${check.pass ? 'x' : ' '}] ${check.label}`),
    '',
    '### Event revenue evidence',
    '',
    `- Commercial orders: ${Number(event.commercialOrders) || 0}`,
    `- Estimates: ${Number(event.estimates) || 0}`,
    `- Estimate payment rows: ${Number(event.paymentRows) || 0}`,
    `- Invoices: ${Number(event.invoices) || 0}`,
    `- Finance transactions: ${Number(event.financeTransactions) || 0}`,
    `- Core revenue candidates: ${eventCandidates.length}`,
    `- Gmail event-like message candidates: ${(event.gmailCandidates || []).length} (messages, not distinct events or clients)`,
    `- Exceptions: ${eventExceptions.length}`,
    `- Orders with a stated amount: ${eventOrders.filter((row) => row.amountCents !== null).length} of ${eventOrders.length}; candidate total ${dollars(sum(eventOrders, (row) => row.amountCents))}`,
    `- Orders with a linked customer identity: ${eventOrders.filter((row) => row.customerOrderIdentity?.customerId || row.customerOrderIdentity?.customerNameHash).length} of ${eventOrders.length}`,
    `- Orders with allocated or completed payment evidence: ${eventOrdersWithPayment.length} of ${eventOrders.length}; allocated ${dollars(sum(eventOrders, (row) => sum(row.paymentState?.allocatedFinanceTransactions || [], (transaction) => transaction.allocatedCents)))}`,
    `- Unlinked event invoices: ${eventInvoices.length}; stated total ${dollars(sum(eventInvoices, (row) => row.amountCents))}; allocated payment ${dollars(sum(eventInvoices, (row) => sum(row.paymentState?.allocatedFinanceTransactions || [], (transaction) => transaction.allocatedCents)))}`,
    '',
    ...(eventCandidates.length ? [
      '| Service date | Record | Candidate amount | Customer linked | Payment evidence | Reasons | Disposition |',
      '| --- | --- | ---: | --- | ---: | --- | --- |',
      ...eventCandidates.map((row) => {
        const allocated = sum(row.paymentState?.allocatedFinanceTransactions || [], (transaction) => transaction.allocatedCents);
        const customerLinked = Boolean(row.customerOrderIdentity?.customerId || row.customerOrderIdentity?.customerNameHash || row.customerOrderIdentity?.customerEmailHash);
        return `| ${cell(row.serviceDate || 'unknown')} | \`${cell(row.sourceRecord?.id || '')}\` | ${row.amountCents === null ? 'missing' : dollars(row.amountCents)} | ${customerLinked ? 'yes' : 'no'} | ${dollars(allocated)} | ${cell((row.reasons || []).join(', '))} | _Review required_ |`;
      }),
    ] : ['No event candidates.']),
    '',
    'The event lane is not revenue-complete merely because seven invoices exist. Each real event order needs one linked payment conclusion: paid cash, legitimate receivable, cancelled/no revenue, or accepted exception.',
    '',
    '### Meal prep revenue evidence',
    '',
    `- Customer menus: ${Number(mealPrep.customerMenus) || 0}`,
    `- Weekly orders: ${Number(mealPrep.weeklyOrders) || 0}`,
    `- Agreements: ${Number(mealPrep.agreements) || 0}`,
    `- Subscriptions: ${Number(mealPrep.subscriptions) || 0}`,
    `- Core evidence candidates: ${mealCandidates.length}`,
    `- Gmail meal prep message candidates: ${(mealPrep.gmailCandidates || []).length} (messages, not distinct clients or orders)`,
    `- Exceptions: ${mealExceptions.length}`,
    `- Commercial meal prep orders: ${mealOrders.length}; stated total ${dollars(sum(mealOrders, (row) => row.amountCents))}; customer linked ${mealOrders.filter((row) => row.customerOrderIdentity?.customerId || row.customerOrderIdentity?.customerNameHash).length}; payment linked ${mealOrdersWithPayment.length}`,
    `- Customer menu candidates: ${mealMenus.length}; stated total ${dollars(sum(mealMenus, (row) => row.amountCents))}; linked to paid order ${mealMenus.filter((row) => row.paymentState?.linkedPaidOrderId).length}`,
    '',
    ...(mealExceptions.length ? [
      '| Service date | Record | Stated amount | Reason | Disposition |',
      '| --- | --- | ---: | --- | --- |',
      ...mealExceptions.map((row) => `| ${cell(row.serviceDate || 'unknown')} | \`${cell(row.customerMenuId || row.orderId || '')}\` | ${dollars(row.revenueCents ?? row.totalCents ?? 0)} | ${cell((row.reasons || [row.reason]).filter(Boolean).join(', '))} | _Review required_ |`),
    ] : ['No meal prep exceptions.']),
    '',
    '| Service date | Revenue evidence | Record | Stated amount | Payment linked | Reasons |',
    '| --- | --- | --- | ---: | --- | --- |',
    ...[...mealOrders, ...mealMenus].map((row) => `| ${cell(row.serviceDate || 'unknown')} | ${cell(row.candidateType)} | \`${cell(row.sourceRecord?.id || '')}\` | ${row.amountCents === null ? 'missing' : dollars(row.amountCents)} | ${Number(row.paymentState?.completedAttemptCount) > 0 || Boolean(row.paymentState?.linkedPaidOrderId) ? 'yes' : 'no'} | ${cell((row.reasons || []).join(', '))} |`),
    '',
    'A committed menu or submitted weekly order is not recognized cash revenue without completed payment evidence. Zero-dollar submitted orders remain operational exceptions rather than revenue.',
    '',
    '### Wedge receipt evidence',
    '',
    `- Gmail receipt candidates: ${Number(wedge.candidateCount) || 0}`,
    `- Parsed candidates: ${parsedWedge}`,
    `- Parse review required: ${Number(wedge.reviewRequiredCount) || 0}`,
    `- Local Budget receipt evidence available: ${receiptEvidence.available === false ? 'no' : 'yes'}`,
    `- Local Budget linked receipt rows: ${linkedReceipts}`,
    '',
    ...(wedgeExceptions.length ? [
      '| Source ID | Date | Amount | Parse state | Disposition |',
      '| --- | --- | ---: | --- | --- |',
      ...wedgeExceptions.map((row) => `| \`${cell(row.sourceId)}\` | ${cell(row.parsed?.date || 'missing')} | ${dollars(row.parsed?.amountCents || 0)} | ${cell(row.parsed?.parseState || 'missing')} | _Review required_ |`),
    ] : ['No Wedge parse exceptions.']),
    '',
    'Parsing proves only that an email yielded a plausible date and total. A receipt affects the financial review only after it is linked to one Local Budget transaction or explicitly documented as an accepted missing/duplicate/nonbusiness exception.',
    '',
  ];
  return { checks, lines };
}

function buildReview(audit, artifactPath, operationsAudit = null, operationsArtifactPath = null) {
  const localBudget = audit?.phase6?.cashActuals;
  if (!localBudget) throw new Error('Artifact does not contain phase6.cashActuals');

  const cashActuals = localBudget.cashActuals || {};
  const transactions = localBudget.transactions || {};
  const months = cashActuals.months || [];
  const quality = cashActuals.quality || {};
  const evidence = transactions.reviewEvidence || {};
  const unclassified = evidence.unclassified || [];
  const pending = evidence.pending || [];
  const trace = localBudget.squareReconciliationTrace || {};
  const reconciliationExceptions = localBudget.reconciliationExceptions || { available: false, rows: [] };
  const allReconciliationRows = reconciliationExceptions.rows || [];
  const reconciliationRows = allReconciliationRows.filter((row) => row.isCashPosting === true);
  const processorExceptionRows = allReconciliationRows.length - reconciliationRows.length;
  const settlementExceptions = reconciliationRows.filter((row) => (
    row.reconciliationStatus === 'PARTIAL'
    || row.settlementProvider === 'SQUARE'
    || (row.allocationSystems || []).includes('SQUARE')
    || (row.allocationRoles || []).includes('BANK_SETTLEMENT')
  ));
  const categorizedCents = months.reduce((total, month) => (
    total + MONEY_FIELDS.reduce((monthTotal, field) => monthTotal + (Number(month[field]) || 0), 0)
  ), 0);
  const lineageCents = Number(transactions.cashPostingPostedCents) || 0;
  const differenceCents = lineageCents - categorizedCents;
  const incompleteMonths = months.filter((month) => month.isCompleteMonth === false);
  const warnings = quality.warnings || [];
  const traceChecks = Object.values(trace.checks || {});

  const coverageChecks = [
    { label: 'Local Budget endpoints were available', pass: localBudget.available === true },
    { label: 'Transaction paging completed without truncation', pass: transactions.truncated === false },
    { label: 'The requested period returned monthly cashflow rows', pass: months.length > 0 },
    { label: 'Cashflow buckets equal posted cash-lineage dollars', pass: differenceCents === 0 },
    { label: 'No split mismatches remain', pass: Number(quality.splitMismatchCount || 0) === 0 },
  ];
  const reviewChecks = [
    { label: 'Every month is complete', pass: months.length > 0 && incompleteMonths.length === 0 },
    { label: 'Bank sync was current when extracted', pass: !warnings.some((warning) => /sync|fresh/i.test(warning)) },
    { label: 'No pending cash postings remain', pass: Number(quality.pendingTransactionCount || 0) === 0 },
    { label: 'No unclassified cash remains', pass: Number(quality.unclassifiedTransactionCount || 0) === 0 },
    { label: 'No partial or Square-linked settlement exceptions remain', pass: reconciliationExceptions.available === true && reconciliationExceptions.truncated === false && settlementExceptions.length === 0 },
    { label: 'Square payout trace is complete and amount-matched', pass: trace.available === true && traceChecks.length > 0 && traceChecks.every(Boolean) },
  ];
  const coveragePass = coverageChecks.every((check) => check.pass);
  const cashReadyToClose = coveragePass && reviewChecks.every((check) => check.pass);
  const operations = operationsReview(operationsAudit);
  if (operationsAudit) {
    const samePeriod = operationsAudit?.period?.from === audit?.period?.from
      && operationsAudit?.period?.toExclusive === audit?.period?.toExclusive;
    const periodCheck = operations.checks.find((check) => check.key === 'period');
    if (periodCheck) periodCheck.pass = samePeriod;
  }
  const readyToClose = cashReadyToClose && (!operationsAudit || operations.checks.every((check) => check.pass));
  const lineageKinds = Object.entries(transactions.byLineageKind || {}).sort((a, b) => b[1] - a[1]);
  const categoryTotals = MONEY_FIELDS.map((field) => ({
    field,
    cents: months.reduce((sum, month) => sum + (Number(month[field]) || 0), 0),
  }));
  const outsideUnresolved = audit?.phase6?.unresolved || [];
  const unresolvedByLane = Object.entries(outsideUnresolved.reduce((counts, item) => {
    counts[item.lane || 'unknown'] = (counts[item.lane || 'unknown'] || 0) + 1;
    return counts;
  }, {}));

  const lines = [
    '# Cash reconciliation review',
    '',
    '## Decision',
    '',
    `**Status: ${readyToClose ? 'READY TO CLOSE' : 'OPEN'}**`,
    '',
    `Decision being supported: whether the stated period's ${operationsAudit ? 'cash, event revenue, meal prep revenue, and receipt evidence are' : 'Local Budget cash actuals are'} sufficiently reconciled for use in the Annual Report.`,
    '',
    `- Audit generated: ${audit.generatedAt || 'unknown'}`,
    `- Review generated: ${new Date().toISOString()}`,
    `- Period: ${audit?.period?.from || 'unknown'} through ${audit?.period?.toExclusive || 'unknown'} (exclusive)`,
    `- Local Budget source maximum date: ${cashActuals.sourceMaxDate || 'unavailable'}`,
    `- Latest bank sync: ${quality.latestBankSyncAt || 'unavailable'}`,
    `- Audit artifact: \`${artifactPath}\``,
    ...(operationsAudit ? [`- Operations artifact: \`${operationsArtifactPath}\``] : []),
    '',
    `## Coverage result: ${coveragePass ? 'PASS' : 'FAIL'}`,
    '',
    ...coverageChecks.map((check) => `- [${check.pass ? 'x' : ' '}] ${check.label}`),
    '',
    'Coverage means the two Local Budget representations contain the same posted cash dollars for the same period. It does not establish that every classification or reconciliation decision is complete.',
    '',
    '## Close criteria',
    '',
    ...reviewChecks.map((check) => `- [${check.pass ? 'x' : ' '}] ${check.label}`),
    '',
    'The review stays OPEN while any close criterion is unchecked. Resolve an exception in Local Budget and regenerate this file, or document an accepted exception below with its transaction ID, reason, amount, and effect on the report.',
    '',
    '## Dollar bridge',
    '',
    '| Measure | Amount |',
    '| --- | ---: |',
    ...categoryTotals.map((row) => `| ${row.field.replace(/Cents$/, '')} | ${dollars(row.cents)} |`),
    `| **Cashflow bucket total** | **${dollars(categorizedCents)}** |`,
    `| **Posted cash-lineage total** | **${dollars(lineageCents)}** |`,
    `| **Unexplained coverage difference** | **${dollars(differenceCents)}** |`,
    '',
    'This bridge includes excluded transfers and personal activity solely to prove complete coverage of posted cash. Those buckets remain excluded from operating revenue and expense.',
    '',
    '## Period completeness and freshness',
    '',
    ...(incompleteMonths.length
      ? incompleteMonths.map((month) => `- ${month.month}: incomplete; ${Number(month.pendingTransactionCount) || 0} pending transaction(s).`)
      : ['- All requested months are complete.']),
    ...(warnings.length ? warnings.map((warning) => `- Warning: ${warning}`) : ['- No source warnings reported.']),
    '',
    `## Unclassified cash: ${dollars(quality.unclassifiedCents)} across ${Number(quality.unclassifiedTransactionCount) || 0} transaction(s)`,
    '',
    ...transactionTable(unclassified, 'No unclassified cash transactions.'),
    '',
    `## Pending cash postings: ${Number(quality.pendingTransactionCount) || 0}`,
    '',
    ...transactionTable(pending, 'No pending cash postings.'),
    '',
    `## Reconciliation exception inventory: ${reconciliationRows.length}`,
    '',
    ...(reconciliationExceptions.available !== true ? ['Reconciliation exception feed unavailable.']
      : !reconciliationRows.length ? ['No unmatched or partially matched postings in the period.'] : [
        `- Total unexplained magnitude: ${dollars(reconciliationRows.reduce((total, row) => total + (Number(row.unexplainedCents) || 0), 0))}`,
        `- Partial or Square-linked settlement exceptions that block close: ${settlementExceptions.length}`,
        `- Other unmatched legacy postings: ${reconciliationRows.length - settlementExceptions.length}`,
        `- Processor-ledger exceptions excluded from the cash close: ${processorExceptionRows}`,
        '',
        'An unmatched legacy posting means no external-object allocation has been accepted. It does not by itself mean the cash amount or classification is wrong. The close blocker is limited to partial and Square-linked settlement rows; the larger legacy inventory remains visible for data-quality cleanup.',
        '',
        '### Blocking settlement exceptions',
        '',
        ...(settlementExceptions.length ? [
        '| Date | ID | Merchant | Amount | Matched | Unexplained | Status | Disposition |',
        '| --- | --- | --- | ---: | ---: | ---: | --- | --- |',
        ...settlementExceptions.map((row) => `| ${isoDate(row.date)} | \`${cell(row.id)}\` | ${cell(row.merchantName || 'unidentified')} | ${dollars(row.amountCents)} | ${dollars(row.matchedCents)} | ${dollars(row.unexplainedCents)} | ${cell(row.reconciliationStatus || 'unknown')} | _Review required_ |`),
        ] : ['No blocking settlement exceptions.']),
        '',
        '### Largest other unmatched postings (top 25)',
        '',
        '| Date | ID | Merchant | Amount | Status |',
        '| --- | --- | --- | ---: | --- |',
        ...reconciliationRows.filter((row) => !settlementExceptions.includes(row)).slice(0, 25).map((row) => `| ${isoDate(row.date)} | \`${cell(row.id)}\` | ${cell(row.merchantName || 'unidentified')} | ${dollars(row.amountCents)} | ${cell(row.reconciliationStatus || 'unknown')} |`),
      ]),
    '',
    '## Square payout trace',
    '',
  ];

  if (!trace.available) {
    lines.push(`Trace unavailable: ${trace.reason || 'no trace evidence in artifact'}.`, '');
  } else {
    lines.push(
      `Bank posting: \`${trace.bankPosting.transactionId}\`, ${isoDate(trace.bankPosting.date)}, ${dollars(trace.bankPosting.amountCents)}.`,
      '',
      '| Payout ID | Payout transaction | Payout amount | Entry gross | Entry fees | Entry net | Detail |',
      '| --- | --- | ---: | ---: | ---: | ---: | --- |',
      ...trace.payouts.map((payout) => `| \`${cell(payout.payoutId)}\` | \`${cell(payout.transactionId)}\` | ${dollars(payout.amountCents)} | ${dollars(payout.entryGrossCents)} | ${dollars(payout.entryFeeCents)} | ${dollars(payout.entryNetCents)} | ${payout.detailAvailable ? 'available' : 'missing'} |`),
      '',
      '| Entry type | Provider entry | Gross magnitude | Fee magnitude | Signed net | Sign basis |',
      '| --- | --- | ---: | ---: | ---: | --- |',
      ...trace.payouts.flatMap((payout) => payout.entries.map((entry) => `| ${cell(entry.type)} | \`${cell(entry.providerEntryId)}\` | ${dollars(entry.grossAmountCents)} | ${dollars(entry.feeAmountCents)} | ${entry.signedNetAmountCents === null ? 'unknown' : dollars(entry.signedNetAmountCents)} | ${cell(entry.signBasis)} |`)),
      '',
      ...Object.entries(trace.checks || {}).map(([label, pass]) => `- [${pass ? 'x' : ' '}] ${label}`),
      '',
      'This trace follows one accepted Square payout from processor settlement entries to one bank cash posting. Square Capital payments and refunds reduce the signed net; reversed Capital payments increase it. The Local Budget detail endpoint currently exposes these entry amounts as unsigned magnitudes, so this review restores sign only for known entry types and fails the trace when an unknown type appears.',
      '',
      'This is a control sample; it does not replace review of unmatched or partially matched postings.',
      '',
    );
  }

  lines.push(...operations.lines);

  lines.push(
    '## Lineage inventory',
    '',
    ...(lineageKinds.length ? lineageKinds.map(([kind, count]) => `- ${kind}: ${count}`) : ['- No lineage kinds returned.']),
    '',
    '## Other Annual Report gates outside this cash review',
    '',
    ...(unresolvedByLane.length ? unresolvedByLane.map(([lane, count]) => `- ${lane}: ${count} unresolved item(s)`) : ['- None reported in the audit artifact.']),
    '',
    '## Reviewer disposition',
    '',
    '- [ ] I confirmed the period and source dates above.',
    '- [ ] I reviewed or resolved every unclassified and pending exception.',
    '- [ ] I confirmed the Square trace and any unmatched settlement exceptions.',
    '- [ ] I confirmed transfers, processor captures, payouts, and bank deposits are not double-counted as revenue.',
    ...(operationsAudit ? [
      '- [ ] I assigned one payment conclusion to every in-period event revenue candidate.',
      '- [ ] I assigned one payment conclusion to every in-period meal prep revenue candidate.',
      '- [ ] I linked every Wedge receipt to one Local Budget transaction or documented an accepted exception.',
    ] : []),
    '',
    'Decision: **OPEN / ACCEPTED WITH EXCEPTIONS / CLOSED**',
    '',
    'Reviewer: ____________________  Date: ____________________',
    '',
    'Accepted exceptions (transaction ID, reason, amount, report effect):',
    '',
  );

  return {
    markdown: `${lines.join('\n')}\n`,
    summary: { automatedPass: coveragePass, coveragePass, readyToClose, categorizedCents, lineageCents, differenceCents },
  };
}

function main() {
  const argv = process.argv.slice(2).filter((arg) => arg !== '--');
  const operationsIndex = argv.indexOf('--operations');
  const operationsPath = operationsIndex >= 0 ? argv[operationsIndex + 1] : null;
  if (operationsIndex >= 0) argv.splice(operationsIndex, 2);
  const input = argv[0];
  if (!input || input === '--help' || input === '-h') {
    console.log(usage());
    process.exitCode = input ? 0 : 1;
    return;
  }
  const output = argv[1] || path.resolve('.tmp', 'reconciliation-review.md');
  const audit = JSON.parse(fs.readFileSync(input, 'utf8'));
  const operationsAudit = operationsPath ? JSON.parse(fs.readFileSync(operationsPath, 'utf8')) : null;
  const review = buildReview(audit, input, operationsAudit, operationsPath);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, review.markdown, 'utf8');
  console.log(JSON.stringify({ output, ...review.summary }, null, 2));
}

if (require.main === module) main();

module.exports = { buildReview };
