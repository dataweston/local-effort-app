const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(crashStep) {
  let attempt;
  let crash = true;
  let captured;
  let cardsCreated = 0;
  let activationsCreated = 0;
  const cards = new Map();
  const activations = new Map();
  const jobs = new Map();
  let chargeCalls = 0;
  const payment = { id: 'captured-payment', status: 'COMPLETED' };
  const database = {
    financePaymentAttempt: {
      async upsert({ create }) { attempt ||= { id: 'gift-attempt', ...structuredClone(create) }; return structuredClone(attempt); },
      async update({ data }) { attempt = { ...attempt, ...structuredClone(data) }; return structuredClone(attempt); },
    },
  };
  const square = {
    ordersApi: { async createOrder() { return { result: { order: { id: 'gift-order', lineItems: [{ uid: 'gift-card' }] } } }; } },
    paymentsApi: {
      async createPayment() {
        assert.equal(attempt.metadata.saleConfirmationFacts.orderId, 'gift-order');
        assert.equal(attempt.metadata.saleConfirmationFacts.sourcePayload.buyer.phone, '555-0100');
        chargeCalls += 1;
        captured = payment;
        return { result: { payment } };
      },
    },
    giftCardsApi: {
      async createGiftCard({ idempotencyKey }) {
        if (!cards.has(idempotencyKey)) { cardsCreated += 1; cards.set(idempotencyKey, { id: 'gift-card-id', gan: 'test-redeemable-code' }); }
        if (crash && crashStep === 'card') { crash = false; throw new Error('lost card response after capture'); }
        return { result: { giftCard: cards.get(idempotencyKey) } };
      },
    },
    giftCardActivitiesApi: {
      async createGiftCardActivity({ idempotencyKey, giftCardActivity }) {
        assert.equal(giftCardActivity.activateActivityDetails.orderId, 'gift-order');
        if (!activations.has(idempotencyKey)) { activationsCreated += 1; activations.set(idempotencyKey, { id: 'activation-id' }); }
        if (crash && crashStep === 'activate') { crash = false; throw new Error('lost activation response'); }
        return { result: { giftCardActivity: activations.get(idempotencyKey) } };
      },
    },
  };
  const env = {
    NODE_ENV: 'production', SQUARE_ACCESS_TOKEN: 'test-only', SQUARE_LOCATION_ID: 'gift-location',
    BREVO_API_KEY: 'test-only', GIFTCARD_TEAM_EMAIL: 'team@example.com', SENDER_EMAIL: 'sender@example.com',
  };
  let handler;
  let outbox;
  const base = path.resolve(__dirname, '../api-handlers/store');
  function load(filename, resolve) {
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(base, filename), 'utf8'), {
      module, exports: module.exports, require: resolve, process: { env }, console: { error() {}, warn() {} },
      fetch: async () => ({ status: 201 }),
    }, { filename });
    return module.exports;
  }
  outbox = load('sale-confirmation-outbox.js', (id) => {
    if (id === './gift-card-checkout') return handler;
    throw new Error(`Unexpected recovery dependency ${id}`);
  });
  handler = load('gift-card-checkout.js', (id) => {
    if (id === 'square') return { Client: function () { return square; }, Environment: { Production: 'production' } };
    if (id === '../_lib/prisma') return { prisma: database };
    if (id === '../../backend/api/finance/paymentAttempts') return {
      async markPaymentAttemptSucceeded() { attempt.status = 'succeeded'; attempt.externalPaymentId = payment.id; },
    };
    if (id === './sale-confirmation-outbox') return outbox;
    if (id === './gift-card-email') return require(path.join(base, 'gift-card-email'));
    return require(id);
  });
  const emailOutboxService = { async enqueue(job) { jobs.set(job.idempotencyKey, structuredClone(job)); } };
  return {
    handler, outbox, emailOutboxService, database, jobs,
    get attempt() { return structuredClone(attempt); },
    get payment() { return captured; },
    counts() { return { chargeCalls, cardsCreated, activationsCreated }; },
  };
}

for (const crashStep of ['card', 'activate']) {
  test(`captured gift card recovers a lost ${crashStep} response without another charge or activation`, async () => {
    const f = fixture(crashStep);
    const response = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await f.handler({ method: 'POST', body: {
      token: 'test-token', checkoutAttemptId: 'same-gift-attempt', amount: 50,
      buyer: { name: 'Buyer', email: 'buyer@example.com', phone: '555-0100' },
      recipient: { name: 'Recipient', email: 'recipient@example.com', phone: '555-0101' },
      note: 'A personal gift',
    } }, response, { emailOutboxService: f.emailOutboxService });
    assert.equal(response.code, 500);
    assert.equal(f.attempt.metadata.saleConfirmationFacts.confirmationReady, false);
    assert.equal(f.jobs.size, 0);
    await f.outbox.recoverSaleConfirmations({ attempt: f.attempt, payment: f.payment, prisma: f.database, emailOutboxService: f.emailOutboxService });
    assert.deepEqual(f.counts(), { chargeCalls: 1, cardsCreated: 1, activationsCreated: 1 });
    assert.equal(f.jobs.size, 3);
    const facts = f.attempt.metadata.saleConfirmationFacts;
    assert.equal(facts.confirmationReady, true);
    assert.equal(facts.code, 'test-redeemable-code');
    const owner = [...f.jobs.values()].find((job) => job.context.role === 'owner');
    assert.equal(owner.payload.to[0].email, 'team@example.com');
    assert.match(owner.payload.textContent, /555-0100/);
    assert.match(owner.payload.textContent, /555-0101/);
    assert.match(owner.payload.textContent, /A personal gift/);
    const beforeReplay = [...f.jobs.values()];
    await f.outbox.recoverSaleConfirmations({ attempt: f.attempt, payment: f.payment, prisma: f.database, emailOutboxService: f.emailOutboxService });
    assert.deepEqual(f.counts(), { chargeCalls: 1, cardsCreated: 1, activationsCreated: 1 });
    assert.deepEqual([...f.jobs.values()], beforeReplay);
  });
}

test('a non-completed webhook cannot activate a succeeded attempt', async () => {
  const f = fixture('card');
  const response = { setHeader() {}, status() { return this; }, json() { return this; } };
  await f.handler({ method: 'POST', body: {
    token: 'test-token', checkoutAttemptId: 'same-gift-attempt', amount: 50,
    buyer: { name: 'Buyer', email: 'buyer@example.com', phone: '555-0100' },
    recipient: { name: 'Recipient', email: 'recipient@example.com' },
  } }, response, { emailOutboxService: f.emailOutboxService });
  const result = await f.outbox.recoverSaleConfirmations({ attempt: f.attempt,
    payment: { id: 'captured-payment', status: 'APPROVED' }, prisma: f.database, emailOutboxService: f.emailOutboxService });
  assert.equal(result.skipped, 'payment-not-completed');
  assert.equal(f.jobs.size, 0);
  assert.deepEqual(f.counts(), { chargeCalls: 1, cardsCreated: 1, activationsCreated: 0 });
});

test('gift fulfillment keeps activated facts when enqueue fails and retries the same purchase', async () => {
  const f = fixture('activate');
  const response = { setHeader() {}, status() { return this; }, json() { return this; } };
  await f.handler({ method: 'POST', body: {
    token: 'test-token', checkoutAttemptId: 'same-gift-attempt', amount: 50,
    buyer: { name: 'Buyer', email: 'buyer@example.com', phone: '555-0100' },
    recipient: { name: 'Recipient', email: 'recipient@example.com' },
  } }, response, { emailOutboxService: f.emailOutboxService });
  const enqueue = f.emailOutboxService.enqueue;
  f.emailOutboxService.enqueue = async () => { throw new Error('outbox unavailable'); };
  await assert.rejects(f.outbox.recoverSaleConfirmations({
    attempt: f.attempt, payment: f.payment, prisma: f.database, emailOutboxService: f.emailOutboxService,
  }), /outbox unavailable/);
  assert.equal(f.attempt.metadata.saleConfirmationFacts.confirmationReady, true);
  f.emailOutboxService.enqueue = enqueue;
  await f.outbox.recoverSaleConfirmations({
    attempt: f.attempt, payment: f.payment, prisma: f.database, emailOutboxService: f.emailOutboxService,
  });
  assert.deepEqual(f.counts(), { chargeCalls: 1, cardsCreated: 1, activationsCreated: 1 });
  assert.equal(f.jobs.size, 3);
});
