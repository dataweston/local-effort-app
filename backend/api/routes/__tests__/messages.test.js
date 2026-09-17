import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMessagesRouter } from '../messages';

describe('messages router', () => {
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
  let sendEmail;
  let upsertContact;
  let getSanityClient;
  let waitlistInsert;
  let getSupabase;

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
      getSupabase,
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
    process.env.ADMIN_EMAILS = 'team@localeffortfood.com';
    waitlistInsert = vi.fn().mockResolvedValue({ error: null });
    getSupabase = vi.fn(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'team@localeffortfood.com' } },
          error: null,
        }),
      },
      from: vi.fn(() => ({ insert: waitlistInsert })),
    }));
  });

  it('sends outbound messages via Brevo', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/messages/send')
      .set('Authorization', 'Bearer team-token')
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
      .set('Authorization', 'Bearer team-token')
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

  it('accepts a meal-prep waitlist signup with only an email', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/messages/submit')
      .send({ type: 'meal-prep-waitlist', email: 'alex@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const teamEmail = sendEmail.mock.calls[0][0];
    expect(teamEmail.htmlContent).toContain('alex@example.com');
    expect(teamEmail.htmlContent).toContain('Name: (not provided)');
    // Legacy name/phone columns are NOT NULL on the live table, so an
    // email-only lead must still produce a stored row.
    expect(waitlistInsert).toHaveBeenCalledWith([
      expect.objectContaining({ email: 'alex@example.com', name: '', phone: '', status: 'pending' }),
    ]);
  });

  it('rejects a meal-prep waitlist signup without a usable email', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/messages/submit')
      .send({ type: 'meal-prep-waitlist', name: 'Alex Cook', phone: '555-555-5555' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Waitlist requires a valid email');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('reports only known meal interests to the team inbox', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/messages/submit')
      .send({
        type: 'meal-prep-waitlist',
        email: 'alex@example.com',
        familySize: '2 adults + 1 kid',
        mealsInterested: ['dinner', 'kids-food', 'lobster'],
      });

    expect(res.status).toBe(200);
    const teamEmail = sendEmail.mock.calls[0][0];
    expect(teamEmail.htmlContent).toContain('Most interested in:</strong> dinner, kids food');
    expect(teamEmail.htmlContent).not.toContain('lobster');
    expect(teamEmail.htmlContent).toContain('2 adults + 1 kid');
  });
});
