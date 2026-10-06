'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildMenuReport,
  buildWedgeReport,
  buildGmailRevenueCandidates,
  parseMenuMessage,
  parseWedgeReceipt,
} = require('../audit-accuracy.cjs');

const wedgeReceipt = `Wedge Co-op receipt
Merchant: Wedge Co-op Lyndale
Purchase Date: 09/12/2026
Receipt Number: WDG-260912-0042
2 x Organic carrots  $5.98
Local apples         $8.00
Subtotal: $13.98
Sales Tax: $0.00
Grand Total: $13.98
Payment Method: Visa ending 1122`;

test('parses a complete Wedge receipt and preserves all extracted fields', () => {
  assert.deepEqual(parseWedgeReceipt(wedgeReceipt), {
    merchant: 'Wedge Co-op Lyndale',
    date: '2026-09-12',
    receiptNumber: 'WDG-260912-0042',
    subtotalCents: 1398,
    taxCents: 0,
    amountCents: 1398,
    paymentMethod: 'Visa ending 1122',
    lineItems: [
      { description: 'Organic carrots', quantity: 2, amountCents: 598 },
      { description: 'Local apples', quantity: 1, amountCents: 800 },
    ],
    classificationClues: ['organic', 'local'],
    parseState: 'parsed',
    reasons: [],
  });
});

test('flags malformed, partial, and conflicting receipt totals for review', () => {
  const partial = parseWedgeReceipt('Wedge receipt\nTotal: $18.00');
  assert.equal(partial.parseState, 'review_required');
  assert.ok(partial.reasons.includes('purchase_date_missing_or_ambiguous'));
  assert.ok(partial.reasons.includes('merchant_missing'));
  assert.ok(partial.reasons.includes('receipt_number_missing'));

  const conflicting = parseWedgeReceipt(`${wedgeReceipt}\nTotal Paid: $14.10`);
  assert.equal(conflicting.amountCents, null);
  assert.ok(conflicting.reasons.includes('multiple_distinct_totals'));

  assert.equal(parseWedgeReceipt(wedgeReceipt.replace('09/12/2026', '02/31/2026')).date, null);
});

test('menu parsing distinguishes final and proposed versions and keeps date/context', () => {
  const final = parseMenuMessage('Final menu for event 10/10/2026', 'Service Date: 10/10/2026\n- Roast chicken with local vegetables');
  assert.equal(final[0].serviceDate, '2026-10-10');
  assert.equal(final[0].context, 'event');
  assert.equal(final[0].finality, 'final_or_confirmed');
  assert.deepEqual(final[0].dishCandidates, ['Roast chicken with local vegetables']);

  const proposed = parseMenuMessage('Proposed weekly meal prep menu', 'Week of date: 09/14/2026\n- Beef and rice bowls');
  assert.equal(proposed[0].context, 'meal_prep');
  assert.equal(proposed[0].finality, 'proposed_or_unconfirmed');
  assert.equal(proposed[0].serviceDate, '2026-09-14');
});

test('menu report retains provenance and groups repeated normalized versions', () => {
  const parsedMenu = parseMenuMessage('Final menu for event 10/10/2026', 'Service Date: 10/10/2026\n- Roast chicken with local vegetables')[0];
  const records = ['gmail-1', 'gmail-2'].map((sourceId) => ({
    sourceId,
    threadId: 'thread-1',
    subjectHash: `hash-${sourceId}`,
    customerIdentityHash: 'customer-hash',
    deterministic: { category: 'event_candidate' },
    menuCandidates: [parsedMenu],
    source: { sourceDocumentId: `doc-${sourceId}`, contentHash: `body-${sourceId}` },
  }));
  const report = buildMenuReport({ records }, { menu: { normalizedDishes: [], coverage: {} } });
  assert.equal(report.candidateCount, 1);
  assert.equal(report.sourceMessageCount, 2);
  assert.equal(report.normalizedVersionCount, 1);
  assert.deepEqual(report.normalizedVersions[0].sourceIds, ['gmail-1', 'gmail-2']);
  assert.equal(report.candidates[0].sourceDocumentId, 'doc-gmail-1');
  assert.equal(report.candidates[0].customerIdentityHash, 'customer-hash');
});

test('Wedge report collapses repeated Gmail message IDs before import counting', () => {
  const row = {
    sourceId: 'gmail-receipt-1',
    occurredAt: '2026-09-12T18:00:00.000Z',
    source: { sourceDocumentId: 'doc-1', contentHash: 'hash-1' },
    wedge: parseWedgeReceipt(wedgeReceipt),
    deterministic: { category: 'wedge_receipt' },
  };
  const report = buildWedgeReport({ records: [row, row] }, { available: false });
  assert.equal(report.candidateCount, 1);
  assert.equal(report.receipts[0].importShape.sourceDocumentHash, 'hash-1');
  assert.equal(report.receipts[0].importShape.posted, false);
});

test('Gmail revenue candidates stay review-only when identity or source linkage is incomplete', () => {
  const row = {
    sourceId: 'gmail-event-1',
    threadId: 'thread-event-1',
    subjectHash: 'subject-hash',
    customerIdentityHash: 'identity-hash',
    explicitServiceDate: '2026-09-12',
    deterministic: { category: 'event_candidate' },
    source: { sourceDocumentId: 'source-doc-1', contentHash: 'body-hash' },
  };
  Object.defineProperty(row, '_auditText', { value: 'Catering estimate total: $900.00; deposit requested.' });
  const [candidate] = buildGmailRevenueCandidates({ records: [row] }, 'event');
  assert.equal(candidate.amountCents, 90000);
  assert.equal(candidate.serviceDate, '2026-09-12');
  assert.equal(candidate.paymentState, 'payment_context_unverified');
  assert.equal(candidate.reviewState, 'review_required');
  assert.ok(candidate.reasons.includes('customer_or_order_link_not_verified'));
  assert.ok(candidate.reasons.includes('source_amount_not_reconciled'));
  assert.equal(candidate.provenance.sourceDocumentId, 'source-doc-1');
});
