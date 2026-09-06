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
});
