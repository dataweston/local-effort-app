import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMessagesRouter } from '../messages';

describe('messages router', () => {
  const logger = { error: vi.fn(), warn: vi.fn() };
  let sendEmail;
  let upsertContact;
  let getSanityClient;

  const buildApp = () => {
    const brevoService = {
      sendEmail,
      upsertContact,
      getHeaders: vi.fn().mockReturnValue({}),
    };
    const router = createMessagesRouter({
      logger,
      brevoService,
      getSanityClient,
      db: null,
    });
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    return app;
  };

  beforeEach(() => {
    process.env.SENDER_EMAIL = 'noreply@example.com';
    process.env.TEAM_INBOX_EMAIL = 'team@example.com';
    sendEmail = vi.fn().mockResolvedValue({});
    upsertContact = vi.fn().mockResolvedValue();
    getSanityClient = vi.fn(() => ({
      create: vi.fn().mockResolvedValue({ _id: 'sanity-1' }),
    }));
  });

  it('sends outbound messages via Brevo', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/messages/send')
      .send({ to: ['team@example.com'], subject: 'Test', text: 'Hello' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: [{ email: 'team@example.com' }],
        subject: 'Test',
      })
    );
    expect(getSanityClient).toHaveBeenCalled();
  });

  it('returns 500 when email service is unavailable', async () => {
    sendEmail = vi.fn().mockRejectedValue(Object.assign(new Error('no service'), { code: 'EMAIL_NOT_CONFIGURED' }));
    const app = buildApp();
    const res = await request(app)
      .post('/api/messages/send')
      .send({ to: ['team@example.com'], subject: 'Test', text: 'Hello' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Email service not configured');
  });

  it('subscribes email to Brevo list and notifies admin inbox', async () => {
    process.env.BREVO_LIST_IDS = '13, bad,42';
    const app = buildApp();
    const res = await request(app)
      .post('/api/subscribe')
      .send({ email: 'newsubscriber@example.com', name: 'Jane Doe', source: 'home-about' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(upsertContact).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newsubscriber@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        listIds: [13, 42],
      })
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: [{ email: 'team@example.com' }],
        subject: 'New newsletter subscription',
        tags: ['newsletter', 'subscribe'],
      })
    );
  });
});
