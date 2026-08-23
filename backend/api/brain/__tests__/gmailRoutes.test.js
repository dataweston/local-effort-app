import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import gmailRoutesModule from '../gmailRoutes';

const { registerGmailRoutes } = gmailRoutesModule;

function buildApp() {
  const app = express();
  app.use(express.json());
  registerGmailRoutes(app, {
    verifyAdminRequestForAuth: async (req) =>
      req.headers.authorization === 'Bearer valid-admin-token' ? { id: 'admin-1' } : null,
    getAuthUrlForAuth: () =>
      'https://accounts.google.com/o/oauth2/v2/auth?state=signed',
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
