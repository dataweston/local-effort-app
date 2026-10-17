const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function load(relative, overrides = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const native = createRequire(filename);
  const sandbox = { module: { exports: {} }, require: key => Object.hasOwn(overrides, key) ? overrides[key] : native(key), console: { error() {}, warn() {} }, process: { env: {} }, Intl, Date, URL };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
  return sandbox.module.exports;
}
const memberActor = { id: 'member-uid', email: 'member@example.test', email_confirmed_at: '2026-01-01T00:00:00Z' };
const ownerActor = { id: 'owner-uid', email: 'owner@example.test', email_confirmed_at: '2026-01-01T00:00:00Z' };
const access = load('api-handlers/hub/_chefAccess.js', {
  '../_lib/prisma': { prisma: null },
  '../weekly-order/_auth': { verifySupabaseToken: async req => req.actor, isReadOnlyAdminEmail: value => value === 'readonly@example.test' },
  './_auth': { resolveHubViewer: async req => ({ supabaseUser: req.actor, isReadOnlyAdmin: req.actor?.email === 'readonly@example.test' }), requireHubAccess: auth => [ownerActor.email, 'readonly@example.test'].includes(auth.supabaseUser?.email) ? null : { status: 403, error: 'Owner only' }, isExplicitHubAdminEmail: value => value === ownerActor.email },
  './_publicRateLimit': { enforcePublicRateLimit: async () => true },
});
const domain = load('api-handlers/hub/_chefDues.js', { '../_lib/prisma': { prisma: null }, './_chefAccess': access, '../_lib/squareClient': { getSquareClient: () => ({}) } });
function membership() {
  return { id: 'membership-1', applicationId: 'application-1', policyId: 'policy-1', version: 3, status: 'active', acceptedAt: new Date('2026-10-15T14:00:00Z'), acceptedName: 'Chef <Fixture>', admittedAt: new Date('2026-10-15T15:00:00Z'), offeredAt: new Date('2026-10-14T15:00:00Z'),
    application: { id: 'application-1', supabaseUid: memberActor.id, status: 'reviewed', name: 'Chef <Fixture>', email: memberActor.email, phone: '5551234567', contactPreference: 'phone' },
    policy: { id: 'policy-1', adoptedAt: new Date('2026-10-14T15:00:00Z'), snapshot: { version: 'adopted-fixture', agreementText: 'Adopted agreement <fixture>', acceptanceText: 'I accept this exact fixture', approvalReference: 'governing-approval-1', replyEmail: 'reply@example.test', dues: { amountCents: 4321, currency: 'USD', billingText: 'Owner-adopted fixture billing', refundText: 'Owner-adopted fixture refund', cancellationText: 'Owner-adopted fixture cancellation', waiverText: 'Owner-adopted fixture waiver' } } } };
}
const assessmentBody = { action: 'assess', membershipId: 'membership-1', membershipVersion: 3, period: '2026-11', payableCents: 4000, adjustmentReason: 'Approved confidential reduction', dueAt: '2026-11-01T09:00:00-06:00', confirmed: true, reason: 'Authorized period assessment' };
function fixture() {
  const member = membership();
  const memberships = [member];
  let state = { assessments: [], invoices: [], orders: [], attempts: [], events: [], transactions: [], allocations: [] };
  let inTransaction = false;
  let providerFails = false;
  let refund = null;
  let payment = null;
  let rejectOwnerQueue = false;
  const requests = [];
  const jobs = new Map();
  const clone = value => structuredClone(value);
  function full(id) {
    const row = state.assessments.find(r => r.id === id);
    if (!row) return null;
    const invoice = state.invoices.find(i => i.id === row.invoiceId);
    return clone({ ...row, membership: memberships.find(m => m.id === row.membershipId), invoice: { ...invoice, allocations: state.allocations.filter(a => a.invoiceId === invoice.id).map(a => ({ ...a, transaction: state.transactions.find(t => t.id === a.transactionId) })), paymentAttempts: state.attempts.filter(a => a.invoiceId === invoice.id) }, events: state.events.filter(e => e.assessmentId === row.id).sort((a, b) => b.version - a.version) });
  }
  const db = {
    async $transaction(run) { const saved = clone(state); inTransaction = true; try { const value = await run(db); inTransaction = false; return value; } catch (err) { state = saved; inTransaction = false; throw err; } },
    chefApplication: { async findUnique({ where }) { return where.supabaseUid === 'other-uid' ? { ...clone(member.application), id: 'other-application', supabaseUid: 'other-uid' } : where.supabaseUid === member.application.supabaseUid ? clone(member.application) : null; } },
    chefMembership: {
      async findUnique({ where }) { return clone(memberships.find(m => m.id === where.id) || null); },
      async findFirst({ where }) {
        if (where.applicationId === 'other-application') return { ...clone(member), id: 'other-membership', applicationId: 'other-application' };
        return clone(memberships.filter(m => m.applicationId === where.applicationId && (!where.status || where.status === m.status)).sort((a, b) => b.offeredAt - a.offeredAt || b.id.localeCompare(a.id))[0] || null);
      },
      async findMany() { return clone(memberships); },
    },
    chefDuesAssessment: {
      async findUnique({ where }) { return full(where.id); },
      async findFirst({ where }) { const row = full(where.id); return row && row.membership.applicationId === where.membership.applicationId ? row : null; },
      async findMany({ where }) { return state.assessments.map(r => full(r.id)).filter(r => !where.membership || where.membership.applicationId === r.membership.applicationId); },
      async create({ data }) { if (state.assessments.some(r => r.membershipId === data.membershipId && r.period === data.period)) throw Object.assign(Error('duplicate'), { code: 'P2002' }); const { events, ...row } = data; row.id = `assessment-${state.assessments.length + 1}`; row.version = 1; row.frozenAt = null; row.confirmationFacts = null; state.assessments.push(clone(row)); state.events.push({ ...clone(events.create), id: `event-${state.events.length + 1}`, assessmentId: row.id, createdAt: new Date() }); return full(row.id); },
      async updateMany({ where, data }) { const row = state.assessments.find(r => r.id === where.id && r.version === where.version); if (!row) return { count: 0 }; Object.assign(row, clone(data)); return { count: 1 }; },
    },
    chefDuesEvent: { async create({ data }) { const event = { ...clone(data), id: `event-${state.events.length + 1}`, createdAt: new Date() }; state.events.push(event); return clone(event); }, async update({ where, data }) { const event = state.events.find(e => e.id === where.id); Object.assign(event, data); return clone(event); } },
    commercialInvoice: { async create({ data }) { const row = { ...clone(data), id: `invoice-${state.invoices.length + 1}` }; state.invoices.push(row); return clone(row); }, async update({ where, data }) { const row = state.invoices.find(i => i.id === where.id); Object.assign(row, clone(data)); return clone(row); }, async findUnique({ where }) { return clone(state.invoices.find(i => i.id === where.id)); } },
    commercialOrder: { async create({ data }) { const { paymentAttempts, ...values } = data; const order = { ...clone(values), id: `order-${state.orders.length + 1}` }; state.orders.push(order); const attempt = { ...clone(paymentAttempts.create), id: `attempt-${state.attempts.length + 1}`, commercialOrderId: order.id, startedAt: new Date(), externalPaymentId: null }; state.attempts.push(attempt); return { ...clone(order), paymentAttempts: [clone(attempt)] }; }, async update({ where, data }) { const row = state.orders.find(o => o.id === where.id); Object.assign(row, clone(data)); return clone(row); } },
    financePaymentAttempt: {
      async findUnique({ where }) { const a = where.id ? state.attempts.find(a => a.id === where.id) : state.attempts.find(a => a.provider === where.provider_idempotencyKey.provider && a.idempotencyKey === where.provider_idempotencyKey.idempotencyKey); return a ? { ...clone(a), commercialOrder: clone(state.orders.find(o => o.id === a.commercialOrderId)) } : null; },
      async update({ where, data }) { const a = state.attempts.find(a => a.id === where.id); Object.assign(a, clone(data)); return clone(a); },
      async updateMany({ where, data }) { const a = state.attempts.find(a => a.id === where.id && where.OR.some(condition => condition.externalPaymentId === a.externalPaymentId)); if (!a) return { count: 0 }; Object.assign(a, clone(data)); return { count: 1 }; },
    },
    financePaymentTransaction: { async upsert({ where, create, update }) { const key = where.provider_externalPaymentId; let row = state.transactions.find(t => t.provider === key.provider && t.externalPaymentId === key.externalPaymentId); if (row) Object.assign(row, clone(update)); else { row = { ...clone(create), id: `transaction-${state.transactions.length + 1}` }; state.transactions.push(row); } return clone(row); } },
    financePaymentAllocation: { async upsert({ where, create, update }) { const key = where.transactionId_targetType_targetId; let row = state.allocations.find(a => a.transactionId === key.transactionId && a.targetType === key.targetType && a.targetId === key.targetId); if (row) Object.assign(row, clone(update)); else { row = { ...clone(create), id: `allocation-${state.allocations.length + 1}` }; state.allocations.push(row); } return clone(row); }, async aggregate({ where }) { return { _sum: { amountCents: state.allocations.filter(a => a.invoiceId === where.invoiceId).reduce((sum, a) => sum + a.amountCents, 0) } }; } },
  };
  const outbox = { async enqueue(job) { if (job.context.role === 'owner' && rejectOwnerQueue) throw Error('outbox unavailable'); if (!jobs.has(job.idempotencyKey)) jobs.set(job.idempotencyKey, clone(job)); return { id: job.idempotencyKey }; }, async requeue(key) { return { requeued: false, status: jobs.has(key) ? 'queued' : null }; } };
  const square = { checkoutApi: { async createPaymentLink(request) {
    assert.equal(inTransaction, false, 'owned payment facts must commit before provider calls');
    const attempt = state.attempts.find(a => a.metadata.linkIdempotencyKey === request.idempotencyKey);
    const assessment = state.assessments.find(a => a.invoiceId === attempt.invoiceId);
    assert.equal(assessment.confirmationFacts.confirmationTemplates.length, 2);
    assert.ok(state.invoices.some(invoice => invoice.id === attempt.invoiceId));
    requests.push(clone(request)); if (providerFails) throw Error('provider unavailable');
    return { result: { paymentLink: { url: 'https://fixture.invalid/pay', orderId: 'square-order-fixture' } } };
  } }, paymentsApi: { async getPayment() { return { result: { payment: clone(payment) } }; } }, ordersApi: { async retrieveOrder() { return { result: { order: { id: 'square-order-fixture', referenceId: state.attempts[0].commercialOrderId, locationId: 'location-fixture', totalMoney: { amount: state.attempts[0].requestedCents, currency: 'USD' } } } }; } }, refundsApi: { async getPaymentRefund() { return { result: { refund: clone(refund) } }; } } };
  const handlers = domain.createChefDuesHandlers({ prismaClient: db, emailOutboxService: outbox, square: () => ({ client: square, locationId: 'location-fixture' }), ownerEmail: ownerActor.email, senderEmail: 'sender@example.test', now: () => new Date('2026-10-16T12:00:00Z') });
  async function invoke(handler, method, body, actor = ownerActor, query = {}) { const res = { statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; await handlers[handler]({ method, body, actor, query }, res); return res; }
  async function assess(body = {}) { return invoke('admin', 'POST', { ...assessmentBody, ...body }); }
  async function checkout() { const row = state.assessments[0]; return invoke('self', 'POST', { action: 'checkout', id: row.id, expectedVersion: row.version }, memberActor); }
  async function act(action, data = {}) { const row = state.assessments[0]; return invoke('admin', action === 'revise' ? 'PATCH' : 'POST', { action, id: row.id, expectedVersion: row.version, confirmed: true, reason: 'Owner fixture recovery reason', ...data }); }
  return { member, memberships, get state() { return state; }, requests, jobs, invoke, assess, checkout, act, full, setProviderFailure(value) { providerFails = value; }, setQueueFailure(value) { rejectOwnerQueue = value; }, setPayment(value) { payment = value; }, setRefund(value) { refund = value; } };
}
function completedPayment() { return { id: 'payment-fixture', status: 'COMPLETED', amountMoney: { amount: 4000, currency: 'USD' }, locationId: 'location-fixture', orderId: 'square-order-fixture', createdAt: '2026-11-01T15:00:00Z' }; }

test('assessment requires active admission, adopted structured terms and accepted agreement; no inferred proposal amount', async () => {
  for (const mutate of [m => { m.status = 'accepted'; }, m => { m.acceptedAt = null; }, m => { m.policy.adoptedAt = null; }, m => { delete m.policy.snapshot.dues; }, m => { m.application.status = 'withdrawn'; }]) {
    const f = fixture(); mutate(f.member); assert.equal((await f.assess()).statusCode, 409); assert.equal(f.state.invoices.length, 0);
  }
  const f = fixture(); assert.equal((await f.assess()).statusCode, 201); assert.equal(f.state.assessments[0].assessedCents, 4321);
  assert.equal((await f.assess()).statusCode, 409); assert.equal(f.state.invoices.length, 1);
});

test('reductions need a reason; zero is a waiver and cannot create a provider checkout', async () => {
  const f = fixture(); assert.equal((await f.assess({ payableCents: 0, adjustmentReason: '' })).statusCode, 400);
  assert.equal((await f.assess({ payableCents: 0 })).body.assessment.status, 'waived');
  assert.equal((await f.checkout()).statusCode, 409); assert.equal(f.requests.length, 0); assert.equal(f.state.attempts.length, 0); assert.equal(f.jobs.size, 0);
});

test('service months use Central DST boundaries and admission cannot be back-billed', () => {
  const march = domain.monthBounds('2026-03'); assert.equal(march.serviceStartAt.toISOString(), '2026-03-01T06:00:00.000Z'); assert.equal(march.serviceEndAt.toISOString(), '2026-04-01T05:00:00.000Z');
  const m = membership(); assert.throws(() => domain.assessmentInput({ ...assessmentBody, period: '2026-09' }, m), /before admission/);
  const admitted = domain.assessmentInput({ ...assessmentBody, period: '2026-10' }, m); assert.equal(admitted.serviceStartAt.toISOString(), m.admittedAt.toISOString());
});

test('failed hosted link commits recoverable exact facts, freezes the amount and retries the original provider identity', async () => {
  const f = fixture(); await f.assess(); f.setProviderFailure(true);
  assert.equal((await f.checkout()).statusCode, 503); assert.equal(f.state.attempts.length, 1);
  const facts = f.state.assessments[0].confirmationFacts;
  assert.equal(facts.customer.email, memberActor.email); assert.equal(facts.details['Contact preference'], 'phone');
  assert.match(facts.confirmationTemplates[1].payload.htmlContent, /Chef &lt;Fixture&gt;/); assert.doesNotMatch(facts.confirmationTemplates[1].payload.htmlContent, /Chef <Fixture>/);
  assert.equal((await f.act('revise', { period: assessmentBody.period, payableCents: 2000, adjustmentReason: 'New reduction', dueAt: assessmentBody.dueAt })).statusCode, 409);
  f.setProviderFailure(false); assert.equal((await f.checkout()).body.url, 'https://fixture.invalid/pay'); assert.equal(f.state.attempts.length, 1); assert.equal(f.state.orders.length, 1);
  assert.equal(f.requests[0].idempotencyKey, f.requests[1].idempotencyKey); assert.equal(f.state.attempts[0].metadata.squareOrderId, 'square-order-fixture'); assert.equal(f.jobs.size, 0);
});

test('member cannot open another application assessment; read-only owner cannot assess', async () => {
  const f = fixture(); await f.assess();
  assert.equal((await f.invoke('self', 'POST', { action: 'checkout', id: f.state.assessments[0].id, expectedVersion: 1 }, { ...memberActor, id: 'other-uid' })).statusCode, 404); assert.equal(f.requests.length, 0);
  const readonly = { ...ownerActor, email: 'readonly@example.test' };
  assert.equal((await f.invoke('admin', 'POST', assessmentBody, readonly)).statusCode, 403);
});

test('provider evidence, not payment-return input, controls settlement; partial enqueue failure repairs stable customer and owner keys', async () => {
  const f = fixture(); await f.assess(); await f.checkout();
  f.setPayment({ ...completedPayment(), status: 'PENDING' }); assert.equal((await f.act('recover-payment', { paymentId: 'payment-fixture' })).statusCode, 409); assert.equal(f.state.allocations.length, 0); assert.equal(f.jobs.size, 0);
  f.setPayment({ ...completedPayment(), orderId: 'unowned-order' }); assert.equal((await f.act('recover-payment', { paymentId: 'payment-fixture' })).statusCode, 409);
  f.setPayment(completedPayment()); f.setQueueFailure(true);
  assert.equal((await f.act('recover-payment', { paymentId: 'payment-fixture' })).statusCode, 503);
  assert.equal(f.state.allocations.length, 1); assert.equal(f.state.invoices[0].outstandingCents, 0); assert.equal(f.jobs.size, 1);
  f.setQueueFailure(false); assert.equal((await f.act('repair-confirmations')).statusCode, 200); assert.equal((await f.act('repair-confirmations')).statusCode, 200); assert.equal(f.jobs.size, 2);
  assert.equal(f.jobs.get('square-payment-payment-fixture-sale-confirmation-customer').payload.to[0].email, memberActor.email);
  assert.equal(f.jobs.get('square-payment-payment-fixture-sale-confirmation-owner').payload.to[0].email, ownerActor.email);
  assert.match(f.jobs.get('square-payment-payment-fixture-sale-confirmation-customer').payload.textContent, /payment-fixture/);
  assert.equal((await f.checkout()).statusCode, 409); assert.equal(f.requests.length, 1);
});

test('refund notes never change balances; completed owned refund evidence records one negative allocation and prevents recollection', async () => {
  const f = fixture(); await f.assess(); await f.checkout(); f.setPayment(completedPayment()); await f.act('recover-payment', { paymentId: 'payment-fixture' });
  const refund = { id: 'refund-fixture', paymentId: 'payment-fixture', locationId: 'location-fixture', status: 'PENDING', amountMoney: { amount: 1500, currency: 'USD' }, updatedAt: '2026-11-02T15:00:00Z' };
  f.setRefund(refund); assert.equal((await f.act('verify-refund', { refundId: refund.id, reason: 'Refund requested in notes' })).statusCode, 409); assert.equal(f.state.allocations.length, 1);
  f.setRefund({ ...refund, status: 'COMPLETED', paymentId: 'another-payment' }); assert.equal((await f.act('verify-refund', { refundId: refund.id })).statusCode, 409);
  f.setRefund({ ...refund, status: 'COMPLETED' }); const recorded = await f.act('verify-refund', { refundId: refund.id }); assert.equal(recorded.statusCode, 200); assert.equal(recorded.body.assessment.invoice.refundedCents, 1500); assert.equal(recorded.body.assessment.invoice.outstandingCents, 1500);
  assert.equal((await f.act('verify-refund', { refundId: refund.id })).statusCode, 200); assert.equal(f.state.allocations.length, 2);
  assert.equal((await f.checkout()).statusCode, 409); assert.equal(f.requests.length, 1);
  const visible = (await f.invoke('self', 'GET', undefined, memberActor)).body.assessments[0]; assert.equal(visible.confirmationFacts, undefined); assert.equal(visible.applicant, undefined); assert.equal(visible.history[0].actorUid, undefined);
});

test('captured payment recovery verifies a lost hosted order after membership ends without creating another checkout', async () => {
  const f = fixture(); await f.assess(); await f.checkout();
  delete f.state.attempts[0].metadata.squareOrderId;
  f.member.status = 'ended';
  f.setPayment({ ...completedPayment(), orderId: 'unowned-order' });
  assert.equal((await f.act('recover-payment', { paymentId: 'payment-fixture' })).statusCode, 409);
  assert.equal(f.state.allocations.length, 0); assert.equal(f.jobs.size, 0);
  f.setPayment(completedPayment());
  const result = await f.act('recover-payment', { paymentId: 'payment-fixture' });
  assert.equal(result.statusCode, 200); assert.equal(result.body.assessment.invoice.outstandingCents, 0);
  assert.equal(f.state.attempts[0].metadata.squareOrderId, 'square-order-fixture');
  assert.equal(f.requests.length, 1); assert.equal(f.jobs.size, 2);
});

test('a payment identity reserved before finance repair blocks another hosted payment even while attempt status is pending', async () => {
  const f = fixture(); await f.assess(); await f.checkout();
  f.state.attempts[0].externalPaymentId = 'captured-awaiting-repair';
  assert.equal((await f.checkout()).statusCode, 409); assert.equal(f.requests.length, 1);
});

test('full completed refunds reopen persisted invoices coherently and replay never recollects', async () => {
  for (const amounts of [[4000], [1500, 2500]]) {
    const f = fixture(); await f.assess(); await f.checkout();
    f.setPayment(completedPayment());
    assert.equal((await f.act('recover-payment', { paymentId: 'payment-fixture' })).statusCode, 200);
    assert.equal(f.state.invoices[0].status, 'paid');
    assert.ok(f.state.invoices[0].paidAt);
    let refunded = 0;
    for (const [index, amount] of amounts.entries()) {
      const refund = { id: `refund-${index}`, paymentId: 'payment-fixture', locationId: 'location-fixture', status: 'COMPLETED', amountMoney: { amount, currency: 'USD' }, updatedAt: '2026-11-02T15:00:00Z' };
      f.setRefund(refund);
      refunded += amount;
      for (let replay = 0; replay < 2; replay += 1) {
        const result = await f.act('verify-refund', { refundId: refund.id });
        assert.equal(result.statusCode, 200);
        assert.equal(result.body.assessment.status, refunded === 4000 ? 'refunded' : 'partially_refunded');
        assert.equal(result.body.assessment.invoice.outstandingCents, refunded);
        assert.equal(f.state.invoices[0].outstandingCents, refunded);
        assert.equal(f.state.invoices[0].status, refunded === 4000 ? 'issued' : 'partially_paid');
        assert.equal(f.state.invoices[0].paidAt, null);
        assert.equal(f.state.allocations.length, index + 2);
      }
    }
    const refunds = f.state.allocations.filter(a => f.state.transactions.find(t => t.id === a.transactionId).transactionType === 'refund');
    assert.deepEqual(refunds.map(a => a.amountCents), amounts.map(amount => -amount));
    const visible = (await f.invoke('self', 'GET', undefined, memberActor)).body.assessments[0];
    assert.equal(visible.canPay, false);
    assert.equal((await f.checkout()).statusCode, 409);
    assert.equal(f.requests.length, 1);
    assert.equal(f.state.attempts.length, 1);
  }
});

test('readmitted members retain historical assessments but checkout belongs only to the current active membership', async () => {
  const f = fixture(); await f.assess(); f.member.status = 'ended';
  const current = { ...membership(), id: 'membership-2', offeredAt: new Date('2026-11-01T15:00:00Z'), admittedAt: new Date('2026-11-02T15:00:00Z') };
  f.memberships.push(current);
  assert.equal((await f.assess({ membershipId: current.id })).statusCode, 201);
  const list = await f.invoke('self', 'GET', undefined, memberActor);
  assert.equal(list.statusCode, 200);
  assert.deepEqual(Array.from(list.body.assessments, a => [a.membershipId, a.canPay]), [['membership-1', false], ['membership-2', true]]);
  assert.equal((await f.checkout()).statusCode, 409);
  assert.equal(f.state.assessments[0].frozenAt, null);
  assert.equal(f.requests.length, 0);
  assert.equal(f.state.attempts.length, 0);
  // Even an incorrectly retained active historical membership is not the current one.
  f.member.status = 'active';
  assert.equal((await f.invoke('self', 'GET', undefined, memberActor)).body.assessments[0].canPay, false);
  assert.equal((await f.checkout()).statusCode, 409);
  const row = f.state.assessments[1];
  const paid = await f.invoke('self', 'POST', { action: 'checkout', id: row.id, expectedVersion: row.version }, memberActor);
  assert.equal(paid.statusCode, 200);
  assert.equal(paid.body.url, 'https://fixture.invalid/pay');
  assert.equal(f.state.attempts[0].invoiceId, row.invoiceId);
  assert.equal(f.requests.length, 1);
});

test('assessment checkout eligibility tracks accepted active terms, waived balances and captured identities', async () => {
  for (const mutate of [
    f => { f.member.status = 'ended'; },
    f => { f.member.acceptedAt = null; },
    f => { f.member.admittedAt = null; },
    f => { f.member.policy.adoptedAt = null; },
    f => { delete f.member.policy.snapshot.dues; },
    f => { f.member.policyId = 'changed-policy'; },
    f => { f.member.application.status = 'withdrawn'; },
    f => { f.state.assessments[0].payableCents = 0; },
    f => { f.state.attempts.push({ invoiceId: f.state.assessments[0].invoiceId, status: 'pending', externalPaymentId: 'captured-awaiting-repair' }); },
  ]) {
    const f = fixture(); await f.assess();
    assert.equal((await f.invoke('self', 'GET', undefined, memberActor)).body.assessments[0].canPay, true);
    mutate(f);
    assert.equal((await f.invoke('self', 'GET', undefined, memberActor)).body.assessments[0].canPay, false);
    assert.ok([403, 409].includes((await f.checkout()).statusCode));
    assert.equal(f.requests.length, 0);
  }
});
