const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createRequire } = require('node:module');
const { createHostedPaymentLink } = require('../backend/api/finance/hostedPaymentLinks');

const root = path.resolve(__dirname, '..');
const env = { SQUARE_ACCESS_TOKEN: 'fake', SQUARE_LOCATION_ID: 'fixture-location', SENDER_EMAIL: 'sender@example.com', TEAM_INBOX_EMAIL: 'owner@example.com' };
function load(relative, overrides = {}) {
  const filename = path.join(root, relative);
  const nativeRequire = createRequire(filename);
  const sandbox = { module: { exports: {} }, process: { env }, console, require: name => Object.hasOwn(overrides, name) ? overrides[name] : nativeRequire(name) };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
  return sandbox.module.exports;
}
function fixture() {
  const orders = [];
  const attempts = [];
  const requests = [];
  let rejectLink = true;
  const prisma = {
    commercialOrder: { async create({ data }) {
      const order = { ...data, id: 'commercial-1', lines: data.lines?.createMany?.data || [] };
      const attempt = { ...data.paymentAttempts.create, id: 'attempt-1', commercialOrderId: order.id, commercialOrder: order };
      order.paymentAttempts = [attempt]; orders.push(order); attempts.push(attempt); return order;
    } },
    financePaymentAttempt: {
      async findUnique({ where }) { return attempts.find(a => a.provider === where.provider_idempotencyKey.provider && a.idempotencyKey === where.provider_idempotencyKey.idempotencyKey) || null; },
      async update({ where, data }) { const a = attempts.find(a => a.id === where.id); Object.assign(a, data); return a; },
    },
  };
  const squareClient = { checkoutApi: { async createPaymentLink(request) {
    assert.equal(orders[0].status, 'payment_pending');
    assert.equal(attempts[0].metadata.linkIdempotencyKey, request.idempotencyKey);
    assert.equal(request.order.referenceId, orders[0].id);
    requests.push(request);
    if (rejectLink) throw Error('simulated provider unavailable');
    return { result: { paymentLink: { url: 'https://fixture.invalid/checkout', orderId: 'square-order-1' } } };
  } } };
  const helpers = { createHostedPaymentLink };
  const februaryBuilder = load('api-handlers/february/confirmation-facts.js');
  const winterBuilder = load('api-handlers/winter-dinner/confirmation-facts.js');
  const february = load('api-handlers/february/payment-link.js', {
    '../_lib/prisma': { prisma }, '../../backend/api/finance/hostedPaymentLinks': helpers,
    './confirmation-facts': februaryBuilder, '../_lib/squareClient': { getSquareClient: () => ({ client: squareClient, locationId: env.SQUARE_LOCATION_ID }) },
  });
  const winter = load('api-handlers/winter-dinner/payment-link.js', {
    '../_lib/prisma': { prisma }, '../../backend/api/finance/hostedPaymentLinks': helpers,
    './confirmation-facts': winterBuilder, square: { Client: function () { return squareClient; }, Environment: { Production: 'fixture' } },
  });
  const routes = new Map();
  const router = { get() {}, post(route, handler) { routes.set(route, handler); } };
  load('backend/api/routes/crowdfunding.js', {
    express: { Router: () => router }, '../utils/prisma': { prisma }, '../finance/hostedPaymentLinks': helpers,
  }).createCrowdfundingRouter({ squareClient });
  return { handlers: { february, 'winter-dinner': winter, crowdfunding: routes.get('/contribute') }, orders, attempts, requests, allowLinks: () => { rejectLink = false; } };
}
async function invoke(handler, body) {
  const res = { statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method: 'POST', body }, res);
  return res;
}
const bodies = {
  february: { date: '2026-02-05', guestCount: 6, preferredTime: '18:30', dietaryNotes: 'No nuts', notes: 'Doorbell', address: { line1: 'Fixture street', city: 'Minneapolis', state: 'MN', postal: '55401' } },
  'winter-dinner': { amount: 15000, quantity: 2, drinkMenu: 'wine', dietaryRestrictions: 'No nuts' },
  crowdfunding: { items: [{ name: 'Pizza credit', price: 25, quantity: 2 }] },
};
for (const flow of Object.keys(bodies)) {
  test(`${flow}: failed hosted link retries one durable attempt and completed Square payment recovers both receipts`, async () => {
    const f = fixture();
    const handler = f.handlers[flow];
    const body = { ...bodies[flow], checkoutAttemptId: 'retry-fixture' };
    assert.equal((await invoke(handler, body)).statusCode, 500);
    assert.equal(f.orders.length, 1);
    assert.equal(f.attempts[0].metadata.saleConfirmationFacts.flow, flow);
    assert.equal(f.attempts[0].metadata.squareOrderId, undefined);
    f.allowLinks();
    assert.equal((await invoke(handler, body)).body.url, 'https://fixture.invalid/checkout');
    assert.equal(f.orders.length, 1);
    assert.equal(f.attempts.length, 1);
    assert.equal(f.requests[0].idempotencyKey, f.requests[1].idempotencyKey);
    assert.equal(f.attempts[0].metadata.squareOrderId, 'square-order-1');
    assert.equal((await invoke(handler, body)).statusCode, 200);
    assert.equal(f.requests.length, 2);
    const { recoverSaleConfirmations } = load('api-handlers/store/sale-confirmation-outbox.js');
    const jobs = new Map();
    const args = { attempt: f.attempts[0], order: f.orders[0], payment: { id: 'square-payment-1', status: 'COMPLETED', orderId: 'square-order-1', buyerEmailAddress: 'square-buyer@example.com' }, emailOutboxService: { async enqueue(job) { jobs.set(job.idempotencyKey, job); } } };
    await recoverSaleConfirmations(args);
    await recoverSaleConfirmations(args);
    assert.equal(jobs.size, 2);
    const customer = [...jobs.values()].find(j => j.context.role === 'customer');
    assert.equal(customer.payload.to[0].email, 'square-buyer@example.com');
    assert.match(customer.payload.textContent, /square-payment-1/);
    assert.doesNotMatch(customer.payload.textContent, /\{\{/);
    if (flow === 'february') {
      assert.match(customer.payload.textContent, /Preferred time: 18:30/);
      assert.match(customer.payload.textContent, /Guest count: 6/);
      assert.match(customer.payload.textContent, /We will follow up within 24 hours/);
    } else if (flow === 'winter-dinner') {
      assert.match(customer.payload.textContent, /December 21, 2025/);
      assert.match(customer.payload.textContent, /Quantity: 2/);
      assert.match(customer.payload.textContent, /curated wine pairings\./);
    } else {
      assert.match(customer.payload.textContent, /Amount: \$50\.00/);
      assert.match(customer.payload.textContent, /2 × Pizza credit/);
      assert.doesNotMatch(customer.payload.textContent, /December|Address:|shipping/i);
    }
  });
  test(`${flow}: supplied buyer email wins over Square buyer email`, async () => {
    const f = fixture(); f.allowLinks();
    await invoke(f.handlers[flow], { ...bodies[flow], customer: { email: 'supplied@example.com', name: 'Buyer', phone: 'fixture' } });
    const jobs = [];
    await load('api-handlers/store/sale-confirmation-outbox.js').recoverSaleConfirmations({
      attempt: f.attempts[0], order: f.orders[0], payment: { id: 'p', status: 'COMPLETED', buyer_email_address: 'square@example.com' },
      emailOutboxService: { async enqueue(job) { jobs.push(job); } },
    });
    assert.equal(jobs.find(j => j.context.role === 'customer').payload.to[0].email, 'supplied@example.com');
  });
}
