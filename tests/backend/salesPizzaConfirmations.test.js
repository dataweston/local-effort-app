import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';

const { createSalesRouter } = require('../../backend/api/routes/sales');
const { createEmailOutboxService } = require('../../backend/api/services/emailOutbox');
const { buildDirectSaleConfirmations } = require('../../api-handlers/store/sale-confirmation-outbox');

const path = '/api/sales/pizza-on-smith/orders/pizza-paid/confirmations';
const clone = (value) => structuredClone(value);

// In-memory persistence implements the revision precondition used by the real
// shared outbox. Only the provider transport is replaced; no external sends.
function setup({ configured = true } = {}) {
  const docs = new Map();
  let revision = 0;
  const sc = {
    beforeCommit: null,
    getDocument: vi.fn(async (id) => clone(docs.get(id) || null)),
    createIfNotExists: vi.fn(async (doc) => {
      if (!docs.has(doc._id)) docs.set(doc._id, { ...clone(doc), _rev: String(++revision) });
      return clone(docs.get(doc._id));
    }),
    fetch: vi.fn(async (query, params) => {
      if (query.includes('emailSubscriber')) return [];
      let rows = [...docs.values()].filter((doc) => doc._type === 'emailOutbox');
      if (params.ids && !params.all) rows = rows.filter((doc) => params.ids.includes(doc._id));
      if (query.includes('$anySource')) {
        rows = rows.filter((doc) => params.anySource || doc.source === params.source);
        rows = rows.filter((doc) => (
          ['queued', 'retry'].includes(doc.status) && (!doc.nextAttemptAt || doc.nextAttemptAt <= params.now)
        ) || (doc.status === 'processing' && doc.processingStartedAt < params.staleBefore));
      }
      return clone(rows);
    }),
    patch: vi.fn((id) => {
      let expectedRevision;
      const updates = {};
      const removals = [];
      const patch = {
        ifRevisionId(value) { expectedRevision = value; return patch; },
        set(value) { Object.assign(updates, value); return patch; },
        unset(value) { removals.push(...value); return patch; },
        async commit() {
          if (sc.beforeCommit) await sc.beforeCommit({ id, updates, expectedRevision });
          const doc = docs.get(id);
          if (!doc || (expectedRevision && doc._rev !== expectedRevision)) {
            throw Object.assign(new Error('revision-conflict'), { statusCode: 409 });
          }
          const next = { ...doc, ...clone(updates), _rev: String(++revision) };
          for (const field of removals) delete next[field];
          docs.set(id, next);
          return clone(next);
        },
      };
      return patch;
    }),
  };
  const brevoService = {
    sendEmail: vi.fn(async () => ({ json: async () => ({ messageId: 'provider-accepted-1' }) })),
  };
  const outbox = createEmailOutboxService({ getSanityClient: () => sc, brevoService });
  const templates = ['customer', 'owner'].map((role) => ({
    role,
    payload: {
      to: [{ email: role === 'customer' ? 'buyer@example.test' : 'owner@example.test', name: role }],
      sender: { email: 'sender@example.test', name: 'Local Effort' },
      replyTo: { email: 'reply@example.test', name: 'Pizza on Smith' },
      subject: `${role} original sale confirmation`,
      textContent: `${role}: 3 pizzas, $63.00. Pickup October 17, 4–6 PM America/Chicago at original CMS address. Reference {{paymentId}}. Reply reply@example.test.`,
      htmlContent: `<p>${role}: original fulfillment and reference {{paymentId}}</p>`,
    },
  }));
  const order = {
    id: 'pizza-paid', status: 'paid', sourceSystem: 'store', sourceId: 'not-a-payment-id',
    totalCents: 6300, currency: 'USD', customerEmail: 'buyer@example.test',
    metadata: {
      store: 'pizza-on-smith',
      saleConfirmationFacts: {
        flow: 'store', store: 'pizza-on-smith', totalCents: 6300,
        customer: { email: 'buyer@example.test' }, confirmationTemplates: templates,
      },
    },
    paymentAttempts: [{
      commercialOrderId: 'pizza-paid', provider: 'square', status: 'succeeded',
      externalPaymentId: 'payment-63', requestedCents: 6300, currency: 'USD',
    }],
  };
  const prismaClient = {
    commercialOrder: {
      findFirst: vi.fn(async ({ where, select }) => {
        if (order.id !== where.id || order.status !== where.status || order.sourceSystem !== where.sourceSystem
          || order.metadata.store !== where.metadata.equals) return null;
        const result = clone(order);
        const filter = select.paymentAttempts.where;
        result.paymentAttempts = result.paymentAttempts.filter((attempt) =>
          attempt.status === filter.status && attempt.provider === filter.provider).slice(0, select.paymentAttempts.take);
        return result;
      }),
    },
  };
  const app = express();
  app.use(express.json());
  app.use('/api/sales', createSalesRouter({
    prismaClient,
    emailOutboxService: configured ? outbox : null,
    verifyAdminRequestImpl: async (req) => req.headers.authorization === 'Bearer owner' ? { email: 'owner@example.test' } : null,
  }));
  const get = () => request(app).get(path).set('Authorization', 'Bearer owner');
  const send = (body = { role: 'customer' }) => request(app).post(`${path}/send`).set('Authorization', 'Bearer owner').send(body);
  const key = (role) => `square-payment-payment-63-sale-confirmation-${role}`;
  const id = (role) => outbox.stableOutboxId(key(role));
  const seed = async (role, status = 'queued', overrides = {}) => {
    const confirmation = buildDirectSaleConfirmations('store', {
      ...order.metadata.saleConfirmationFacts, paymentId: 'payment-63',
    }).find((entry) => entry.role === role);
    await outbox.enqueue({
      idempotencyKey: key(role), source: 'sale-confirmation',
      context: { paymentId: 'payment-63', role, tags: ['sale-confirmation'] },
      payload: confirmation.payload,
    });
    docs.set(id(role), { ...docs.get(id(role)), status, ...clone(overrides) });
    return clone(confirmation.payload);
  };
  return { app, docs, sc, outbox, brevoService, order, prismaClient, get, send, seed, id, key };
}

describe('manual Pizza on Smith original sale confirmations', () => {
  it('requires the owner verifier for reads and sends, including service-key requests', async () => {
    const { app, prismaClient, brevoService } = setup();
    await request(app).get(path).set('x-brain-admin-key', 'not-an-owner-session').expect(403);
    await request(app).post(`${path}/send`).send({ role: 'customer' }).expect(403);
    expect(prismaClient.commercialOrder.findFirst).not.toHaveBeenCalled();
    expect(brevoService.sendEmail).not.toHaveBeenCalled();
  });

  it('previews the actual queued payload and the original missing snapshot without writes', async () => {
    const { get, seed, docs, id, sc, brevoService } = setup();
    const original = await seed('customer');
    const queuedText = `${original.textContent}\nOriginal queued handling detail.`;
    docs.get(id('customer')).payload.textContent = queuedText;
    const before = clone([...docs]);
    sc.createIfNotExists.mockClear();
    const response = await get().expect(200);
    expect(response.body.confirmations).toEqual([
      expect.objectContaining({ role: 'customer', textContent: queuedText, status: 'queued', attempts: 0 }),
      expect.objectContaining({ role: 'owner', status: 'missing', attempts: 0, sentAt: null, providerMessageId: null }),
    ]);
    expect([...docs]).toEqual(before);
    expect(sc.createIfNotExists).not.toHaveBeenCalled();
    expect(sc.patch).not.toHaveBeenCalled();
    expect(brevoService.sendEmail).not.toHaveBeenCalled();
  });

  it.each([
    ['unpaid', (order) => { order.status = 'payment_pending'; }, 'paid-pizza-order-required'],
    ['another store', (order) => { order.metadata.store = 'other-store'; }, 'paid-pizza-order-required'],
    ['pending attempt', (order) => { order.paymentAttempts[0].status = 'pending'; }, 'verified-square-payment-required'],
    ['another provider', (order) => { order.paymentAttempts[0].provider = 'other'; }, 'verified-square-payment-required'],
    ['missing payment ID', (order) => { order.paymentAttempts[0].externalPaymentId = null; }, 'verified-square-payment-required'],
    ['foreign attempt', (order) => { order.paymentAttempts[0].commercialOrderId = 'another-order'; }, 'verified-square-payment-required'],
    ['amount mismatch', (order) => { order.paymentAttempts[0].requestedCents = 6200; }, 'payment-amount-mismatch'],
    ['snapshot amount mismatch', (order) => { order.metadata.saleConfirmationFacts.totalCents = 6400; }, 'payment-amount-mismatch'],
    ['missing facts', (order) => { delete order.metadata.saleConfirmationFacts; }, 'original-confirmation-facts-required'],
    ['missing owner template', (order) => { order.metadata.saleConfirmationFacts.confirmationTemplates.pop(); }, 'original-confirmation-templates-required'],
    ['incomplete template', (order) => { delete order.metadata.saleConfirmationFacts.confirmationTemplates[0].payload.textContent; }, 'original-confirmation-template-incomplete'],
  ])('rejects %s without sending or repairing jobs', async (_label, mutate, error) => {
    const { order, get, send, docs, brevoService } = setup();
    mutate(order);
    expect((await get().expect(409)).body.error).toBe(error);
    expect((await send().expect(409)).body.error).toBe(error);
    expect([...docs]).toEqual([]);
    expect(brevoService.sendEmail).not.toHaveBeenCalled();
  });

  it.each([{ role: 'other' }, { role: 'customer', to: [{ email: 'attacker@example.test' }] }, {}])(
    'rejects role or recipient overrides: %j', async (body) => {
      const { send, docs, brevoService } = setup();
      expect((await send(body).expect(409)).body.error).toBe('confirmation-role-required');
      expect([...docs]).toEqual([]);
      expect(brevoService.sendEmail).not.toHaveBeenCalled();
    }
  );

  it.each(['customer', 'owner'])('repairs only the selected missing %s job with its original payload', async (role) => {
    const { send, docs, id, order, brevoService, outbox } = setup();
    const unrelated = await outbox.enqueue({
      idempotencyKey: 'unrelated-sale', source: 'sale-confirmation',
      payload: { to: [{ email: 'unrelated@example.test' }] },
    });
    const expected = buildDirectSaleConfirmations('store', {
      ...order.metadata.saleConfirmationFacts, paymentId: 'payment-63',
    }).find((entry) => entry.role === role).payload;
    const response = await send({ role }).expect(200);
    expect(response.body.result).toMatchObject({ role, status: 'sent', attempts: 1, providerMessageId: 'provider-accepted-1' });
    expect(docs.get(id(role)).payload).toEqual(expected);
    expect(docs.get(id(role === 'customer' ? 'owner' : 'customer'))).toBeUndefined();
    expect(docs.get(unrelated.id).status).toBe('queued');
    expect(brevoService.sendEmail.mock.calls.map(([payload]) => payload)).toEqual([
      { ...expected, headers: { 'Idempotency-Key': id(role) } },
    ]);
  });

  it('sends an existing queued payload unchanged and never processes the other role', async () => {
    const { seed, docs, id, send, brevoService } = setup();
    await seed('customer');
    await seed('owner');
    docs.get(id('customer')).payload.textContent += '\nPersisted instruction.';
    const payload = clone(docs.get(id('customer')).payload);
    const response = await send().expect(200);
    expect(response.body.confirmations.find((row) => row.role === 'owner').status).toBe('queued');
    expect(brevoService.sendEmail.mock.calls[0][0]).toEqual({ ...payload, headers: { 'Idempotency-Key': id('customer') } });
    expect(docs.get(id('customer')).payload).toEqual(payload);
  });

  it('rejects an existing job outside the original recipient/source scope', async () => {
    const { seed, docs, id, get, send, brevoService } = setup();
    await seed('customer');
    docs.get(id('customer')).payload.to = [{ email: 'other@example.test' }];
    expect((await get().expect(409)).body.error).toBe('original-confirmation-job-mismatch');
    await send().expect(409);
    docs.get(id('customer')).payload.to = [{ email: 'buyer@example.test' }];
    docs.get(id('customer')).source = 'newsletter';
    await send().expect(409);
    expect(brevoService.sendEmail).not.toHaveBeenCalled();
  });

  it('returns persisted provider failure evidence and explicitly retries without losing content', async () => {
    const { send, docs, id, brevoService } = setup();
    brevoService.sendEmail.mockRejectedValueOnce(new Error('provider-unavailable'));
    const failed = await send().expect(200);
    expect(failed.body.result).toMatchObject({ status: 'retry', attempts: 1, lastError: 'provider-unavailable', sentAt: null, providerMessageId: null });
    const payload = clone(docs.get(id('customer')).payload);
    const retried = await send().expect(200);
    expect(retried.body.result).toMatchObject({ status: 'sent', requeued: true, attempts: 1, lastError: null });
    expect(docs.get(id('customer')).payload).toEqual(payload);
    expect(brevoService.sendEmail.mock.calls.map(([message]) => message.headers['Idempotency-Key']))
      .toEqual([id('customer'), id('customer')]);
  });

  it('requeues a dead letter only on explicit send and skips already sent replays', async () => {
    const { seed, get, send, docs, id, brevoService } = setup();
    await seed('owner', 'dead_letter', { attempts: 5, lastError: 'previous-provider-error' });
    const preview = await get().expect(200);
    expect(preview.body.confirmations.find((row) => row.role === 'owner')).toMatchObject({ status: 'dead_letter', attempts: 5 });
    expect(brevoService.sendEmail).not.toHaveBeenCalled();
    const sent = await send({ role: 'owner' }).expect(200);
    const persisted = clone(docs.get(id('owner')));
    const replay = await send({ role: 'owner' }).expect(200);
    expect(sent.body.result).toMatchObject({ status: 'sent', requeued: true });
    expect(replay.body.result).toMatchObject({ status: 'sent', skipped: true, providerMessageId: 'provider-accepted-1' });
    expect(docs.get(id('owner'))).toEqual(persisted);
    expect(brevoService.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('retains a concurrently sent job when manual requeue loses its revision race', async () => {
    const { seed, sc, outbox, docs, id, key, brevoService } = setup();
    await seed('customer', 'retry', { attempts: 2 });
    sc.beforeCommit = async ({ id: target, updates }) => {
      if (target === id('customer') && updates.status === 'queued') {
        sc.beforeCommit = null;
        docs.set(target, { ...docs.get(target), _rev: 'concurrent-sent', status: 'sent', attempts: 3, providerMessageId: 'existing-receipt' });
      }
    };
    expect(await outbox.requeue(key('customer'))).toMatchObject({ requeued: false, status: 'sent' });
    expect(docs.get(id('customer'))).toMatchObject({ status: 'sent', attempts: 3, providerMessageId: 'existing-receipt' });
    expect(brevoService.sendEmail).not.toHaveBeenCalled();
  });

  it('uses the shared lock when two manual requests overlap', async () => {
    const { seed, send, brevoService } = setup();
    await seed('customer');
    let release;
    let started;
    const gate = new Promise((resolve) => { release = resolve; });
    const providerStarted = new Promise((resolve) => { started = resolve; });
    brevoService.sendEmail.mockImplementationOnce(async () => {
      started();
      await gate;
      return { json: async () => ({ messageId: 'concurrent-provider-receipt' }) };
    });
    const first = send().then((response) => response);
    await providerStarted;
    try {
      const second = await send().expect(200);
      expect(second.body.result.status).toBe('processing');
    } finally {
      release();
    }
    const accepted = await first;
    expect(accepted.body.result).toMatchObject({ status: 'sent', providerMessageId: 'concurrent-provider-receipt' });
    expect(brevoService.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('reports unavailable email configuration without sending', async () => {
    const { get, send, brevoService } = setup({ configured: false });
    expect((await get().expect(503)).body.error).toBe('email-service-unavailable');
    expect((await send().expect(503)).body.error).toBe('email-service-unavailable');
    expect(brevoService.sendEmail).not.toHaveBeenCalled();
  });
});
