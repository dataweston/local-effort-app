import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createThumbtackRouter } from '../thumbtack';

const USERNAME = 'local-effort';
const PASSWORD = 'test:password';

function createApp(overrides = {}) {
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
  const writeLedgerEventFn = vi.fn().mockResolvedValue({ id: 'ledger-event-1' });
  const app = express();
  app.use(express.json());
  app.use('/api', createThumbtackRouter({
    logger,
    writeLedgerEventFn,
    username: USERNAME,
    password: PASSWORD,
    ...overrides,
  }));
  return { app, logger, writeLedgerEventFn };
}

function postWebhook(app, payload, username = USERNAME, password = PASSWORD) {
  return request(app)
    .post('/api/webhooks/thumbtack')
    .auth(username, password)
    .send(payload);
}

describe('thumbtack webhook router', () => {
  it('rejects requests when webhook credentials are not configured', async () => {
    const { app, writeLedgerEventFn } = createApp({ username: '', password: '' });

    const res = await postWebhook(app, {});

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('webhook-not-configured');
    expect(writeLedgerEventFn).not.toHaveBeenCalled();
  });

  it('rejects invalid basic authentication', async () => {
    const { app, writeLedgerEventFn } = createApp();

    const res = await postWebhook(app, {}, USERNAME, 'wrong-password');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
    expect(writeLedgerEventFn).not.toHaveBeenCalled();
  });

  it.each([
    {
      providerEventType: 'NegotiationCreatedV4',
      data: {
        negotiationID: 'lead-1',
        createdAt: '2026-08-22T12:00:00Z',
        customer: { customerID: 'customer-1' },
      },
      expected: {
        eventType: 'lead.created',
        sourceId: 'lead-1',
        occurredAt: '2026-08-22T12:00:00Z',
        actorType: 'customer',
        actorId: 'customer-1',
      },
    },
    {
      providerEventType: 'MessageCreatedV4',
      data: {
        messageID: 'message-1',
        negotiationID: 'lead-1',
        sentAt: '2026-08-22T12:01:00Z',
        from: 'Customer',
        customer: { customerID: 'customer-1' },
        text: 'Are you available?',
      },
      expected: {
        eventType: 'lead.message.created',
        sourceId: 'message-1',
        occurredAt: '2026-08-22T12:01:00Z',
        actorType: 'customer',
        actorId: 'customer-1',
      },
    },
    {
      providerEventType: 'ReviewCreatedV4',
      data: {
        reviewID: 'review-1',
        createTime: '2026-08-22T12:02:00Z',
        rating: 5,
      },
      expected: {
        eventType: 'review.created',
        sourceId: 'review-1',
        occurredAt: '2026-08-22T12:02:00Z',
        actorType: 'customer',
        actorId: null,
      },
    },
  ])('stores $providerEventType events in the ledger', async ({ providerEventType, data, expected }) => {
    const { app, writeLedgerEventFn } = createApp();
    const payload = {
      event: {
        eventType: providerEventType,
        webhookID: 'webhook-1',
        triggeredAt: '2026-08-22T12:03:00Z',
      },
      data,
    };

    const res = await postWebhook(app, payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, stored: true, deduped: false });
    expect(writeLedgerEventFn).toHaveBeenCalledWith({
      ...expected,
      source: 'thumbtack',
      payload,
    });
  });

  it('acknowledges duplicate deliveries without creating another event', async () => {
    const writeLedgerEventFn = vi.fn().mockResolvedValue({ id: 'ledger-event-1', _existing: true });
    const { app } = createApp({ writeLedgerEventFn });

    const res = await postWebhook(app, {
      event: { eventType: 'MessageCreatedV4', webhookID: 'webhook-1', triggeredAt: '2026-08-22T12:03:00Z' },
      data: { messageID: 'message-1', negotiationID: 'lead-1', sentAt: '2026-08-22T12:01:00Z', from: 'Customer', text: 'Hello' },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, stored: false, deduped: true });
  });

  it('rejects supported events that do not include their provider ID', async () => {
    const { app, writeLedgerEventFn } = createApp();

    const res = await postWebhook(app, {
      event: { eventType: 'NegotiationCreatedV4', webhookID: 'webhook-1', triggeredAt: '2026-08-22T12:03:00Z' },
      data: { createdAt: '2026-08-22T12:00:00Z' },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('missing-event-id');
    expect(writeLedgerEventFn).not.toHaveBeenCalled();
  });

  it('acknowledges unsupported event types without storing them', async () => {
    const { app, writeLedgerEventFn } = createApp();

    const res = await postWebhook(app, {
      event: { eventType: 'FutureThumbtackEventV4', webhookID: 'webhook-1', triggeredAt: '2026-08-22T12:03:00Z' },
      data: { id: 'future-1' },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, ignored: true });
    expect(writeLedgerEventFn).not.toHaveBeenCalled();
  });
});
