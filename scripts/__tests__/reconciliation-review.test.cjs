'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReview } = require('../reconciliation-review.cjs');

function auditFixture(lineageCents = 3600) {
  return {
    period: { from: '2026-01-01', toExclusive: '2026-02-01' },
    phase6: { cashActuals: {
      available: true,
      cashActuals: {
        months: [{ incomeCents: 2000, inventoryCents: 500, operatingCents: 400, laborCents: 300, reimbursableCents: 0, personalExcludedCents: 100, transferExcludedCents: 200, unclassifiedCents: 100 }],
        quality: { splitMismatchCount: 0, unclassifiedCents: 100, unclassifiedTransactionCount: 1, pendingTransactionCount: 0 },
      },
      transactions: { cashPostingPostedCents: lineageCents, truncated: false, byLineageKind: { BANK_TRANSACTION: 4, SQUARE_CAPTURE: 2 } },
    } },
  };
}

test('passes when categorized cashflow exactly covers posted cash lineage', () => {
  const review = buildReview(auditFixture(), 'audit.json');
  assert.equal(review.summary.automatedPass, true);
  assert.equal(review.summary.differenceCents, 0);
  assert.match(review.markdown, /Automated result: PASS/);
  assert.match(review.markdown, /Decision: \*\*OPEN\*\*/);
});

test('keeps a nonzero bridge difference open for review', () => {
  const review = buildReview(auditFixture(3700), 'audit.json');
  assert.equal(review.summary.automatedPass, false);
  assert.equal(review.summary.differenceCents, 100);
  assert.match(review.markdown, /Difference requiring explanation: \*\*\$1\.00\*\*/);
  assert.match(review.markdown, /REVIEW REQUIRED/);
});
