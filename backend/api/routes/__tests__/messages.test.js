import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMessagesRouter } from '../messages';

describe('messages router', () => {
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
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
    const mockPatchCommit = vi.fn().mockResolvedValue({});
    const mockPatchSet = vi.fn().mockReturnValue({ commit: mockPatchCommit });
    const mockPatch = vi.fn().mockReturnValue({ set: mockPatchSet });
    getSanityClient = vi.fn(() => ({
      create: vi.fn().mockResolvedValue({ _id: 'sanity-1' }),
      fetch: vi.fn().mockResolvedValue(null),
      createIfNotExists: vi.fn().mockResolvedValue({}),
      patch: mockPatch,
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
    expect(res.body.status).toBe('pending_confirmation');
    expect(upsertContact).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const subjects = sendEmail.mock.calls.map(([payload]) => payload.subject);
    expect(subjects).toContain('Confirm your Local Effort newsletter subscription');
    expect(subjects).toContain('Newsletter subscription pending confirmation');
  });

  it('rejects feedback submissions without a valid email', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/messages/submit')
      .send({ type: 'feedback', message: 'Love the menu and quality.' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Feedback requires a valid email');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('suppresses submissions when honeypot field is filled', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/messages/submit')
      .send({
        type: 'feedback',
        name: 'Spam Bot',
        email: 'spam@example.com',
        message: 'This should never be delivered',
        website: 'https://spam.example',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.suppressed).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(upsertContact).not.toHaveBeenCalled();
  });

  it('requires structured meal-prep waitlist fields', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/messages/submit')
      .send({
        type: 'meal-prep-waitlist',
        name: 'Alex Cook',
        email: 'alex@example.com',
        phone: '555-555-5555',
        message: 'Weekly Meal Prep Waitlist signup',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Waitlist requires family size, days per week, and meals per day');
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
