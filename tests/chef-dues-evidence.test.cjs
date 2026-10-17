const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(flow = 'chef-dues') {
  let claimedPaymentId = null;
  const successes = [];
  const attempt = { id: 'attempt-fixture', provider: 'square', invoiceId: 'invoice-fixture', commercialOrderId: 'order-fixture', requestedCents: 4000, currency: 'USD', externalPaymentId: null, metadata: { squareOrderId: 'square-order-fixture', saleConfirmationFacts: { flow } } };
  const db = { financePaymentAttempt: {
    async findFirst({ where }) { if (where.externalPaymentId) return claimedPaymentId === where.externalPaymentId ? { ...attempt, externalPaymentId: claimedPaymentId } : null; return { ...attempt, externalPaymentId: claimedPaymentId }; },
    async updateMany({ where, data }) { if (!where.OR.some(condition => condition.externalPaymentId === claimedPaymentId)) return { count: 0 }; claimedPaymentId = data.externalPaymentId; return { count: 1 }; },
  } };
  const filename = path.resolve(__dirname, '../backend/api/finance/squarePaymentEvidence.js');
  const sandbox = { module: { exports: {} }, process: { env: { SQUARE_LOCATION_ID: 'location-fixture' } }, require(name) {
    if (name === './paymentAttempts') return { async markPaymentAttemptSucceeded(args) { successes.push(args); }, paymentEvidence: () => ({}), paymentOccurredAt: () => new Date() };
    if (name === './receivables') return { async recordPaymentTransaction() { throw Error('Unexpected orphan write'); } };
    throw Error(`Unexpected dependency ${name}`);
  } };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
  const payment = { id: 'payment-fixture', status: 'COMPLETED', amountMoney: { amount: 4000, currency: 'USD' }, locationId: 'location-fixture', orderId: 'square-order-fixture' };
  return { db, attempt, payment, successes, evidence: sandbox.module.exports, get claimedPaymentId() { return claimedPaymentId; } };
}

test('authenticated mismatched dues capture never records finance success', async () => {
  for (const mutate of [p => { p.amountMoney.amount = 3999; }, p => { p.amountMoney.amount = 0; }, p => { p.amountMoney.currency = 'CAD'; }, p => { p.locationId = 'other-location'; }, p => { p.orderId = 'other-order'; p.referenceId = 'order-fixture'; }, p => { p.referenceId = 'unowned-reference'; }]) {
    const f = fixture(); mutate(f.payment);
    const result = await f.evidence.recordSquarePaymentEvidence(f.payment, { prisma: f.db });
    assert.equal(result.outcome, 'error'); assert.equal(f.successes.length, 0); assert.equal(f.claimedPaymentId, null);
  }
});

test('missing configured location or invoice anchor fails closed; owned reference can repair a lost hosted-order write', () => {
  const f = fixture();
  assert.throws(() => f.evidence.assertChefDuesPaymentEvidence(f.payment, f.attempt, ''), /does not match/);
  assert.throws(() => f.evidence.assertChefDuesPaymentEvidence(f.payment, { ...f.attempt, invoiceId: null }, 'location-fixture'), /does not match/);
  const attempt = { ...f.attempt, metadata: { saleConfirmationFacts: { flow: 'chef-dues' } } };
  f.evidence.assertChefDuesPaymentEvidence({ ...f.payment, referenceId: attempt.commercialOrderId }, attempt, 'location-fixture');
  assert.throws(() => f.evidence.assertChefDuesPaymentEvidence(f.payment, attempt, 'location-fixture'), /does not match/);
});

test('concurrent completed dues events cannot replace the first verified payment identity; same-payment replay remains recoverable', async () => {
  const f = fixture();
  const results = await Promise.allSettled([
    f.evidence.claimChefDuesPaymentEvidence(f.db, f.payment, f.attempt, 'location-fixture'),
    f.evidence.claimChefDuesPaymentEvidence(f.db, { ...f.payment, id: 'second-payment' }, f.attempt, 'location-fixture'),
  ]);
  assert.equal(results[0].status, 'fulfilled'); assert.equal(results[1].status, 'rejected'); assert.equal(f.claimedPaymentId, 'payment-fixture');
  assert.equal((await f.evidence.recordSquarePaymentEvidence(f.payment, { prisma: f.db })).outcome, 'linked');
  assert.equal((await f.evidence.recordSquarePaymentEvidence({ ...f.payment, id: 'second-payment' }, { prisma: f.db })).outcome, 'error');
  assert.equal(f.successes.length, 1); assert.equal(f.successes[0].payment.id, 'payment-fixture');
});

test('existing non-dues flow evidence behavior is unchanged', async () => {
  const f = fixture('winter-dinner');
  const result = await f.evidence.recordSquarePaymentEvidence({ ...f.payment, amountMoney: { amount: 1200, currency: 'USD' }, locationId: 'other-existing-flow-location' }, { prisma: f.db });
  assert.equal(result.outcome, 'linked'); assert.equal(f.successes[0].amountCents, 1200); assert.equal(f.claimedPaymentId, null);
});
