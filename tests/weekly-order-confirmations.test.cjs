const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildWeeklyOrderConfirmations,
  queueWeeklyOrderConfirmations,
} = require('../backend/api/services/weeklyOrderConfirmations');

const order = {
  id: 'order-123',
  totalsCents: 5350,
  basePriceCents: 3000,
  deliveryFeeCents: 500,
  menuWeek: { weekStart: new Date('2026-11-02T00:00:00.000Z') },
  customer: {
    name: '<script>Buyer</script>',
    users: [{ email: 'buyer@example.com' }],
  },
  items: [{
    dishId: 'dish-1',
    quantity: 2,
    unitPriceCents: 925,
    isAddon: false,
    includedInPlan: false,
    dish: { title: '<b>Roast squash</b>' },
  }],
};

function outboxFixture() {
  const jobs = new Map();
  let processed = 0;
  return {
    jobs,
    processed: () => processed,
    service: {
      async enqueue(job) {
        if (!jobs.has(job.idempotencyKey)) jobs.set(job.idempotencyKey, { ...job, id: `outbox-${jobs.size + 1}` });
        return { id: jobs.get(job.idempotencyKey).id, deduped: jobs.has(job.idempotencyKey) };
      },
      async processBatch({ ids }) {
        processed += ids.length;
        return { sent: ids.length };
      },
    },
  };
}

test('weekly confirmations enqueue distinct transactional buyer and owner jobs from persisted order details', async () => {
  const f = outboxFixture();
  const queued = await queueWeeklyOrderConfirmations({ order, paymentId: 'square-payment-9', paidCents: 5350, emailOutboxService: f.service });
  assert.equal(queued.queued, 2);
  assert.deepEqual([...f.jobs.keys()].sort(), [
    'weekly-order-confirmation:square-payment-9:customer:v1',
    'weekly-order-confirmation:square-payment-9:owner:v1',
  ]);
  const customer = [...f.jobs.values()].find((job) => job.context.role === 'customer');
  const owner = [...f.jobs.values()].find((job) => job.context.role === 'owner');
  assert.equal(customer.category, 'transactional');
  assert.equal(owner.category, 'transactional');
  assert.deepEqual(customer.payload.to, [{ email: 'buyer@example.com' }]);
  assert.match(customer.payload.textContent, /Week of November 2, 2026/);
  assert.match(customer.payload.textContent, /<b>Roast squash<\/b> × 2: \$18\.50/);
  assert.match(customer.payload.textContent, /Total paid: \$53\.50/);
  assert.match(customer.payload.htmlContent, /&lt;script&gt;Buyer&lt;\/script&gt;/);
  assert.match(customer.payload.htmlContent, /&lt;b&gt;Roast squash&lt;\/b&gt;/);
  assert.deepEqual(owner.payload.to, [{ email: 'yum@localeffortfood.com' }]);
  assert.equal(f.processed(), 2);
});

test('replaying a successful payment dedupes each role without sending to browser-supplied email', async () => {
  const f = outboxFixture();
  const noSavedEmail = { ...order, customer: { ...order.customer, users: [] } };
  const first = await queueWeeklyOrderConfirmations({ order: noSavedEmail, paymentId: 'square-payment-replay', paidCents: 5350, emailOutboxService: f.service });
  const replay = await queueWeeklyOrderConfirmations({ order: noSavedEmail, paymentId: 'square-payment-replay', paidCents: 5350, emailOutboxService: f.service });
  assert.equal(first.buyerEmailAvailable, false);
  assert.equal(replay.buyerEmailAvailable, false);
  assert.equal(f.jobs.size, 1);
  assert.deepEqual([...f.jobs.values()][0].payload.to, [{ email: 'yum@localeffortfood.com' }]);
  assert.equal(f.processed(), 2);
});

test('buyer and owner enqueue failures are reported while preserving successful sibling enqueue', async () => {
  const jobs = [];
  const outbox = {
    async enqueue(job) {
      if (job.context.role === 'customer') throw new Error('buyer queue unavailable');
      jobs.push(job);
      return { id: 'owner-job' };
    },
    async processBatch() { throw new Error('must not process incomplete pair'); },
  };
  await assert.rejects(
    queueWeeklyOrderConfirmations({ order, paymentId: 'square-payment-failure', paidCents: 5350, emailOutboxService: outbox }),
    /weekly-order-confirmation-enqueue-failed:1/,
  );
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].context.role, 'owner');
});

test('missing outbox fails explicitly and missing saved buyer email never uses an arbitrary request address', async () => {
  await assert.rejects(queueWeeklyOrderConfirmations({ order, paymentId: 'p' }), /outbox-required/);
  const [owner] = buildWeeklyOrderConfirmations({
    order: { ...order, customer: { name: 'Buyer', users: [] } },
    paymentId: 'p',
  });
  assert.equal(owner.role, 'owner');
  assert.deepEqual(owner.payload.to, [{ email: 'yum@localeffortfood.com' }]);
});
