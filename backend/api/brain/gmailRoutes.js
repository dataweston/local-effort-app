/**
 * Gmail OAuth + sync routes - registered in index.js.
 *
 * GET  /api/brain/gmail/auth     -> redirect to Google OAuth (admin only)
 * GET  /api/brain/gmail/callback -> receive OAuth code, store tokens
 * POST /api/brain/gmail/sync     -> run sync (admin only, or cron)
 */

const crypto = require('crypto');
const { createAdminVerifier } = require('../utils/adminVerifier');
const verifyAdminRequest = createAdminVerifier();
const {
  getAuthUrl,
  exchangeCodeForTokens,
  storeGmailTokens,
  syncGmailThreads,
  verifyOAuthState,
} = require('./gmailSync');

function hasBrainAdminHeader(req) {
  const provided = String(req.headers['x-brain-admin-key'] || '');
  const expected = process.env.BRAIN_ADMIN_KEY || '';
  if (!provided || !expected || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

function registerGmailRoutes(app, { logger } = {}) {
  app.get('/api/brain/gmail/auth', async (req, res) => {
    try {
      const isAdmin = await verifyAdminRequest(req);
      const keyOk = hasBrainAdminHeader(req);
      if (!isAdmin && !keyOk) return res.status(403).json({ error: 'admin only' });

      if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
        return res.status(500).json({
          error: 'Gmail OAuth not configured',
          required: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REDIRECT_URI'],
        });
      }

      const url = getAuthUrl();
      return res.redirect(url);
    } catch (err) {
      logger?.error({ err }, 'brain/gmail auth error');
      return res.status(500).json({ error: 'auth-error' });
    }
  });

  app.get('/api/brain/gmail/callback', async (req, res) => {
    try {
      const { code, error, state } = req.query;
      if (error) return res.status(400).send(`OAuth error: ${error}`);
      if (!code) return res.status(400).send('Missing code');
      if (!verifyOAuthState(state)) return res.status(400).send('Invalid OAuth state');

      const tokens = await exchangeCodeForTokens(code);
      await storeGmailTokens(tokens);

      logger?.info('brain/gmail: tokens stored successfully');
      return res.send('<html><body><h2>Gmail connected.</h2><p>You can close this tab.</p></body></html>');
    } catch (err) {
      logger?.error({ err }, 'brain/gmail callback error');
      return res.status(500).send('Token exchange failed');
    }
  });

  app.post('/api/brain/gmail/sync', async (req, res) => {
    try {
      const isAdmin = await verifyAdminRequest(req);
      const keyOk = hasBrainAdminHeader(req);
      if (!isAdmin && !keyOk) return res.status(403).json({ error: 'admin only' });

      const { daysBack = 730, maxPerQuery = 5000, yumAddress = 'yum@localeffortfood.com' } = req.body || {};

      // Respond immediately — the sync can take many minutes for a 2-year backfill.
      // Running it inside the HTTP response would hit serverless timeouts and DB
      // connection limits. The job logs its own progress and errors.
      res.json({ ok: true, started: true, message: 'Gmail sync started in background' });

      syncGmailThreads({ daysBack, maxPerQuery, yumAddress, logger })
        .then(result => {
          logger?.info(result, 'brain/gmail: sync complete');
        })
        .catch(err => {
          logger?.error({ err }, 'brain/gmail: sync failed');
        });
    } catch (err) {
      const message = err?.message || 'sync-failed';
      logger?.error({ err }, 'brain/gmail sync error');
      if (message.includes('not authorized')) {
        return res.status(401).json({ error: message, authUrl: '/api/brain/gmail/auth' });
      }
      return res.status(500).json({ error: message });
    }
  });
}

module.exports = { registerGmailRoutes };
