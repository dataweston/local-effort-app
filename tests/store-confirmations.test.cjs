const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPizzaPartyConfirmations,
  buildChezGarageConfirmations,
  queuePizzaPartyConfirmations,
  queueChezGarageConfirmations,
} = require('../backend/api/services/storeConfirmations');
const retiredReceiptHandler = require('../api-handlers/store/pizza-party-receipt');

const pizza = {
  paymentId: 'square-pizza-1', date: 'Nov 14, 2026', email: 'buyer@example.com', name: '<script>buyer</script>',
  phone: '612-555-0100', address: { line1: '<img src=x>', city: 'Minneapolis', state: 'MN', postal: '55401' },
  mealTime: 'Dinner', pizzaRequests: '<b>no olives</b>', addOnGuests: 2, amountCents: 9300,
};
const chez = {
  paymentId: 'square-chez-1', date: '2026-11-14', email: 'buyer@example.com', name: 'Buyer', phone: '612-555-0100',
  address: { line1: '123 Main St', city: 'Minneapolis', state: 'MN', postal: '55401' },
  guestCount: '20', notes: 'Vegetarian menu', amountCents: 20000,
};

function outboxFixture() {
  const jobs = new Map();
  const processed = [];
  return {
    jobs,
    processed,
    async enqueue(job) {
      if (!jobs.has(job.idempotencyKey)) jobs.set(job.idempotencyKey, job);
      return { id: job.idempotencyKey };
    },
    async processBatch(input) { processed.push(input); },
  };
}

test('Pizza Party confirmations distinguish roles and escape customer-supplied HTML', () => {
  const confirmations = buildPizzaPartyConfirmations(pizza);
  assert.deepEqual(confirmations.map(({ role }) => role), ['customer', 'owner']);
  assert.equal(confirmations[0].payload.to[0].email, pizza.email);
  assert.notEqual(confirmations[1].payload.to[0].email, pizza.email);
  assert.match(confirmations[0].payload.htmlContent, /&lt;script&gt;buyer&lt;\/script&gt;/);
  assert.match(confirmations[0].payload.htmlContent, /&lt;img src=x&gt;/);
  assert.doesNotMatch(confirmations[0].payload.htmlContent, /<script>|<img src=x>/);
  assert.match(confirmations[1].payload.textContent, /square-pizza-1/);
  assert.match(confirmations[0].payload.textContent, /\$93\.00/);
});

test('Chez Garage confirmations include booking, amount, reference, and next steps', () => {
  const confirmations = buildChezGarageConfirmations(chez);
  assert.deepEqual(confirmations.map(({ role }) => role), ['customer', 'owner']);
  assert.match(confirmations[0].payload.textContent, /date-hold deposit is confirmed/);
  assert.match(confirmations[0].payload.textContent, /Event address: 123 Main St, Minneapolis MN 55401/);
  assert.match(confirmations[1].payload.textContent, /Customer email: buyer@example.com/);
  assert.match(confirmations[1].payload.textContent, /\$200\.00/);
  assert.match(confirmations[1].payload.textContent, /square-chez-1/);
});

test('same verified payment replay uses the same separate customer and owner idempotency keys', async () => {
  const f = outboxFixture();
  await queuePizzaPartyConfirmations({ ...pizza, emailOutboxService: f });
  await queuePizzaPartyConfirmations({ ...pizza, emailOutboxService: f });
  assert.deepEqual([...f.jobs.keys()], [
    'pizza-party-confirmation:square-pizza-1:customer:v1',
    'pizza-party-confirmation:square-pizza-1:owner:v1',
  ]);
  assert.equal(f.jobs.size, 2);
  assert.equal(f.processed.length, 2);
  const g = outboxFixture();
  await queueChezGarageConfirmations({ ...chez, emailOutboxService: g });
  await queueChezGarageConfirmations({ ...chez, emailOutboxService: g });
  assert.deepEqual([...g.jobs.keys()], [
    'chez-garage-at-home-confirmation:square-chez-1:customer:v1',
    'chez-garage-at-home-confirmation:square-chez-1:owner:v1',
  ]);
  assert.equal(g.jobs.size, 2);
});

test('retired browser receipt endpoint cannot send a duplicate receipt', async () => {
  let status;
  let json;
  const res = {
    setHeader() {},
    status(value) { status = value; return this; },
    json(value) { json = value; return this; },
  };
  await retiredReceiptHandler({ method: 'POST', body: { paymentId: 'square-pizza-1' } }, res);
  assert.equal(status, 410);
  assert.match(json.error, /retired/);
});
