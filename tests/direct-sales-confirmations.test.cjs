const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildDirectSaleConfirmations, queueSaleConfirmations, recoverSaleConfirmations } = require('../api-handlers/store/sale-confirmation-outbox');

function outboxFixture() {
  const jobs = [];
  return {
    jobs,
    async enqueue(job) { jobs.push(job); return { id: `job-${jobs.length}` }; },
  };
}

test('direct-sale confirmations require COMPLETED and are idempotent by payment and recipient role', async () => {
  const outbox = outboxFixture();
  const confirmations = [
    { role: 'customer', payload: { to: [{ email: 'buyer@example.com' }], subject: 'Receipt' } },
    { role: 'admin', payload: { to: [{ email: 'team@example.com' }], subject: 'Sale' } },
  ];

  const skipped = await queueSaleConfirmations({
    emailOutboxService: outbox,
    payment: { id: 'payment-pending', status: 'APPROVED' },
    paymentId: 'payment-pending',
    confirmations,
  });
  assert.deepEqual(skipped, { queued: 0, skipped: 'payment-not-completed' });
  assert.equal(outbox.jobs.length, 0);

  const result = await queueSaleConfirmations({
    emailOutboxService: outbox,
    payment: { id: 'payment-complete', status: 'COMPLETED' },
    paymentId: 'payment-complete',
    confirmations,
  });
  assert.deepEqual(result, { queued: 2 });
  assert.deepEqual(outbox.jobs.map(({ idempotencyKey }) => idempotencyKey), [
    'square-payment-payment-complete-sale-confirmation-customer',
    'square-payment-payment-complete-sale-confirmation-admin',
  ]);
  assert.deepEqual(outbox.jobs.map(({ category, source, context }) => ({ category, source, context })), [
    {
      category: 'transactional',
      source: 'sale-confirmation',
      context: { paymentId: 'payment-complete', role: 'customer', tags: ['sale-confirmation'] },
    },
    {
      category: 'transactional',
      source: 'sale-confirmation',
      context: { paymentId: 'payment-complete', role: 'admin', tags: ['sale-confirmation'] },
    },
  ]);
});

test('missing payment status never queues a sale confirmation', async () => {
  const outbox = outboxFixture();
  const result = await queueSaleConfirmations({
    emailOutboxService: outbox,
    payment: { id: 'payment-unknown' },
    paymentId: 'payment-unknown',
    confirmations: [{ role: 'customer', payload: { to: [{ email: 'buyer@example.com' }] } }],
  });
  assert.deepEqual(result, { queued: 0, skipped: 'payment-not-completed' });
  assert.equal(outbox.jobs.length, 0);
});
test('direct confirmation builders address each supported purchase flow from persisted facts', () => {
  for (const flow of ['store', 'gift-card', 'winter-dinner', 'february', 'july-dinner', 'psyche']) {
    const facts = {
      flow,
      paymentId: `payment-${flow}`,
      amountCents: 12500,
      customer: { name: 'Buyer', email: 'buyer@example.com' },
      buyer: { name: 'Buyer', email: 'buyer@example.com' },
      recipient: { name: 'Recipient', email: 'recipient@example.com' },
      deliveryTarget: 'recipient',
      title: flow,
      confirmationTemplates: [
        {
          role: flow === 'gift-card' ? 'buyer' : 'customer',
          payload: { to: [{ email: 'buyer@example.com' }], textContent: 'Payment ID: {{paymentId}}' },
        },
        ...(flow === 'gift-card' ? [{
          role: 'recipient',
          payload: { to: [{ email: 'recipient@example.com' }], textContent: 'Payment ID: {{paymentId}}' },
        }] : []),
        {
          role: 'owner',
          payload: { to: [{ email: 'owner@example.com' }], textContent: 'Payment ID: {{paymentId}}' },
        },
      ],
    };
    const confirmations = buildDirectSaleConfirmations(flow, facts, { ownerEmail: 'owner@example.com' });
    const roles = confirmations.map(({ role }) => role);
    assert.deepEqual(roles, flow === 'gift-card' ? ['buyer', 'recipient', 'owner'] : ['customer', 'owner']);
    assert.equal(confirmations[0].payload.to[0].email, 'buyer@example.com');
    if (flow === 'gift-card') assert.equal(confirmations[1].payload.to[0].email, 'recipient@example.com');
    assert.ok(confirmations.every(({ payload }) => payload.textContent === `Payment ID: payment-${flow}`));
  }
});

test('recovered completed attempts enqueue persisted facts with stable per-payment roles', async () => {
  const outbox = outboxFixture();
  const attempt = {
    status: 'succeeded',
    externalPaymentId: 'payment-recovered',
    metadata: {
      saleConfirmationFacts: {
        flow: 'store',
        totalCents: 5000,
        customer: { name: 'Buyer', email: 'buyer@example.com' },
      },
    },
  };
  await recoverSaleConfirmations({
    attempt,
    emailOutboxService: outbox,
    ownerEmail: 'owner@example.com',
  });
  assert.deepEqual(outbox.jobs.map(({ idempotencyKey }) => idempotencyKey), [
    'square-payment-payment-recovered-sale-confirmation-customer',
    'square-payment-payment-recovered-sale-confirmation-owner',
  ]);
});
test('recovered completed order metadata builds direct-sale confirmations', async () => {
  const outbox = outboxFixture();
  await recoverSaleConfirmations({
    order: {
      paymentId: 'payment-order-recovered',
      metadata: {
        saleConfirmationFacts: {
          flow: 'february',
          title: 'February dinner',
          amountCents: 30000,
          customer: { name: 'Customer', email: 'customer@example.com' },
          details: { Date: 'February 14' },
        },
      },
    },
    payment: { id: 'payment-order-recovered', status: 'COMPLETED' },
    emailOutboxService: outbox,
    ownerEmail: 'owner@example.com',
  });
  assert.deepEqual(outbox.jobs.map(({ idempotencyKey }) => idempotencyKey), [
    'square-payment-payment-order-recovered-sale-confirmation-customer',
    'square-payment-payment-order-recovered-sale-confirmation-owner',
  ]);
  assert.match(outbox.jobs[0].payload.textContent, /Date: February 14/);
});

test('hosted confirmation resolves the verified buyer email only when saved email is absent', async () => {
  for (const savedEmail of ['', 'saved@example.com']) {
    const outbox = outboxFixture();
    await recoverSaleConfirmations({
      attempt: {
        metadata: { saleConfirmationFacts: {
          flow: 'february',
          customer: { email: savedEmail },
          confirmationTemplates: [{
            role: 'customer',
            payload: { to: [{ email: '{{customerEmail}}' }], textContent: 'Customer: {{customerEmail}}\nPayment: {{paymentId}}' },
          }],
        } },
      },
      payment: { id: 'hosted-paid', status: 'COMPLETED', buyer_email_address: 'square@example.com' },
      emailOutboxService: outbox,
    });
    const expectedEmail = savedEmail || 'square@example.com';
    assert.equal(outbox.jobs[0].payload.to[0].email, expectedEmail);
    assert.equal(outbox.jobs[0].payload.textContent, `Customer: ${expectedEmail}\nPayment: hosted-paid`);
  }
});

test('missing hosted buyer email remains retryable instead of sending the unresolved recipient', async () => {
  const outbox = outboxFixture();
  await assert.rejects(recoverSaleConfirmations({
    attempt: { metadata: { saleConfirmationFacts: {
      flow: 'winter-dinner',
      confirmationTemplates: [{ role: 'customer', payload: { to: [{ email: '{{customerEmail}}' }] } }],
    } } },
    payment: { id: 'hosted-no-email', status: 'COMPLETED' },
    emailOutboxService: outbox,
  }), /sale-confirmation-customer-email-not-found/);
  assert.equal(outbox.jobs.length, 0);
});

test('crowdfunding receipt requires verified buyer email before enqueueing either role', async () => {
  const outbox = outboxFixture();
  const attempt = { metadata: { saleConfirmationFacts: {
    flow: 'crowdfunding', amountCents: 7500,
    details: { Items: 'Dinner contribution x1' },
  } } };
  await assert.rejects(recoverSaleConfirmations({
    attempt, payment: { id: 'contribution-paid', status: 'COMPLETED' },
    emailOutboxService: outbox, ownerEmail: 'owner@example.com',
  }), /sale-confirmation-customer-email-not-found/);
  assert.equal(outbox.jobs.length, 0);
  await recoverSaleConfirmations({
    attempt, payment: { id: 'contribution-paid', status: 'COMPLETED', buyerEmailAddress: 'buyer@example.com' },
    emailOutboxService: outbox, ownerEmail: 'owner@example.com',
  });
  assert.deepEqual(outbox.jobs.map(({ payload }) => payload.to[0].email), ['buyer@example.com', 'owner@example.com']);
});
