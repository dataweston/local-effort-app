import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import gmailRoutesModule from '../gmailRoutes';

const { registerGmailRoutes } = gmailRoutesModule;

function buildApp(overrides = {}) {
  const app = express();
  app.use(express.json());
  registerGmailRoutes(app, {
    verifyAdminRequest: async (req) =>
      req.headers.authorization === 'Bearer valid-admin-token' ? { id: 'admin-1' } : null,
    getAuthUrl: () =>
      'https://accounts.google.com/o/oauth2/v2/auth?state=signed',
    withJobRun: async (_jobName, operation) => operation(),
    ...overrides,
  });
  return app;
}

describe('Gmail OAuth browser handoff', () => {
  const originalClientId = process.env.GMAIL_CLIENT_ID;
  const originalClientSecret = process.env.GMAIL_CLIENT_SECRET;

  beforeEach(() => {
    process.env.GMAIL_CLIENT_ID = 'test-client';
    process.env.GMAIL_CLIENT_SECRET = 'test-secret';
  });

  afterEach(() => {
    if (originalClientId === undefined) delete process.env.GMAIL_CLIENT_ID;
    else process.env.GMAIL_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined) delete process.env.GMAIL_CLIENT_SECRET;
    else process.env.GMAIL_CLIENT_SECRET = originalClientSecret;
  });

  it('explains why a direct browser GET cannot use the local Supabase session', async () => {
    const response = await request(buildApp()).get('/api/brain/gmail/auth');
    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'admin only',
      action: 'Open the Brain Partners view and use Connect Gmail.',
    });
  });

  it('returns the Google URL after an authenticated browser POST', async () => {
    const response = await request(buildApp())
      .post('/api/brain/gmail/auth')
      .set('Authorization', 'Bearer valid-admin-token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=signed',
    });
  });
});

describe('Gmail thread sync route', () => {
  it('refuses an unauthenticated sync before touching Gmail', async () => {
    const syncGmailThreads = vi.fn();
    const response = await request(buildApp({ syncGmailThreads })).post('/api/brain/gmail/sync').send({});
    expect(response.status).toBe(403);
    expect(syncGmailThreads).not.toHaveBeenCalled();
  });

  it('answers with measured counts, not a started flag', async () => {
    const syncGmailThreads = vi.fn().mockResolvedValue({
      complete: false,
      stoppedBy: 'batchCeiling',
      batches: 1,
      processed: 7,
      skipped: 93,
      errors: 0,
      elapsedMs: 1200,
    });

    const response = await request(buildApp({ syncGmailThreads }))
      .post('/api/brain/gmail/sync')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({ batchSize: 100, maxBatches: 1 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      complete: false,
      stoppedBy: 'batchCeiling',
      processed: 7,
      skipped: 93,
    });
    expect(response.body).not.toHaveProperty('started');
    expect(syncGmailThreads).toHaveBeenCalledWith(
      expect.objectContaining({ batchSize: 100, maxBatches: 1 })
    );
  });

  it('reports a revoked grant as 401 with the reconnect path', async () => {
    const syncGmailThreads = vi
      .fn()
      .mockRejectedValue(new Error('Gmail not authorized — visit /api/brain/gmail/auth to connect'));

    const response = await request(buildApp({ syncGmailThreads }))
      .post('/api/brain/gmail/sync')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.authUrl).toBe('/api/brain/gmail/auth');
  });

  it('lets the Vercel cron refresh recent mail and reserve archive progress', async () => {
    const syncGmailThreads = vi.fn().mockResolvedValue({
      complete: false,
      stoppedBy: 'batchCeiling',
      batches: 4,
      processed: 2,
      skipped: 48,
      errors: 0,
      elapsedMs: 400,
    });
    const originalTopic = process.env.GMAIL_PUBSUB_TOPIC;
    delete process.env.GMAIL_PUBSUB_TOPIC;

    try {
      const response = await request(buildApp({ syncGmailThreads }))
        .get('/api/brain/gmail/sync')
        .set('x-vercel-cron', '1');

      expect(response.status).toBe(200);
      expect(response.body.status).not.toBe('started');
      expect(response.body.watch).toMatchObject({ configured: false, mode: 'polling' });
      expect(syncGmailThreads).toHaveBeenCalledWith(expect.objectContaining({
        refreshRecent: true,
        recentDays: 30,
        maxBatches: 4,
      }));
    } finally {
      if (originalTopic === undefined) delete process.env.GMAIL_PUBSUB_TOPIC;
      else process.env.GMAIL_PUBSUB_TOPIC = originalTopic;
    }
  });

  it('surfaces a watch-renewal failure without discarding the polling sync', async () => {
    const syncGmailThreads = vi.fn().mockResolvedValue({
      complete: false,
      batches: 1,
      processed: 4,
      skipped: 0,
      errors: 0,
    });
    const renewGmailWatch = vi.fn().mockRejectedValue(new Error('watch topic rejected'));
    const originalTopic = process.env.GMAIL_PUBSUB_TOPIC;
    process.env.GMAIL_PUBSUB_TOPIC = 'projects/example/topics/gmail';

    try {
      const response = await request(buildApp({ syncGmailThreads, renewGmailWatch }))
        .post('/api/brain/gmail/sync')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ renewWatch: true });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        processed: 4,
        errors: 1,
        errorCount: 1,
        watch: {
          ok: false,
          configured: true,
          mode: 'polling-fallback',
          error: 'watch topic rejected',
        },
      });
    } finally {
      if (originalTopic === undefined) delete process.env.GMAIL_PUBSUB_TOPIC;
      else process.env.GMAIL_PUBSUB_TOPIC = originalTopic;
    }
  });
});

describe('Gmail Pub/Sub route', () => {
  it('rejects a push without a verified OIDC bearer token', async () => {
    const verifyGmailPubSubRequest = vi.fn().mockRejectedValue(
      Object.assign(new Error('Pub/Sub bearer token required'), { statusCode: 401 })
    );
    const processGmailHistoryNotification = vi.fn();

    const response = await request(buildApp({
      verifyGmailPubSubRequest,
      processGmailHistoryNotification,
    }))
      .post('/api/brain/gmail/push')
      .send({});

    expect(response.status).toBe(401);
    expect(processGmailHistoryNotification).not.toHaveBeenCalled();
  });

  it('awaits and records history processing before acknowledging Pub/Sub', async () => {
    const verifyGmailPubSubRequest = vi.fn().mockResolvedValue({
      serviceAccount: 'gmail-push@example.test',
    });
    const processGmailHistoryNotification = vi.fn().mockResolvedValue({
      mode: 'push',
      historyChanges: 3,
      processed: 2,
      errors: 0,
    });
    const withJobRun = vi.fn(async (_jobName, operation) => operation());
    const data = Buffer.from(JSON.stringify({
      emailAddress: 'owner@example.test',
      historyId: '9876543210123456789',
    })).toString('base64');

    const response = await request(buildApp({
      verifyGmailPubSubRequest,
      processGmailHistoryNotification,
      withJobRun,
    }))
      .post('/api/brain/gmail/push')
      .set('Authorization', 'Bearer signed-google-token')
      .send({ message: { messageId: 'pubsub-1', data } });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      mode: 'push',
      historyChanges: 3,
      processed: 2,
    });
    expect(withJobRun).toHaveBeenCalledWith('gmail-sync', expect.any(Function));
    expect(processGmailHistoryNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        historyId: '9876543210123456789',
        messageId: 'pubsub-1',
      }),
      expect.any(Object)
    );
  });
});
