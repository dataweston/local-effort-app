/**
 * Gmail OAuth + sync routes — registered in index.js.
 *
 * GET  /api/brain/gmail/auth     → redirect to Google OAuth (admin only)
 * GET  /api/brain/gmail/callback → receive OAuth code, store tokens
 * POST /api/brain/gmail/sync     → run sync (admin only, or cron)
 */

const { createAdminVerifier } = require('../utils/adminVerifier');
const verifyAdminRequest = createAdminVerifier();
const { getAuthUrl, exchangeCodeForTokens, storeGmailTokens, syncGmailThreads } = require('./gmailSync');

function registerGmailRoutes(app, { logger } = {}) {
  // Auth redirect — admin only
  app.get('/api/brain/gmail/auth', async (req, res) => {
    try {
      const isAdmin = await verifyAdminRequest(req);
      if (!isAdmin) return res.status(403).json({ error: 'admin only' });

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

  // OAuth callback — receives code from Google
  app.get('/api/brain/gmail/callback', async (req, res) => {
    try {
      const { code, error } = req.query;
      if (error) return res.status(400).send(`OAuth error: ${error}`);
      if (!code) return res.status(400).send('Missing code');

      const tokens = await exchangeCodeForTokens(code);
      await storeGmailTokens(tokens);

      logger?.info('brain/gmail: tokens stored successfully');
      return res.send('<html><body><h2>Gmail connected.</h2><p>You can close this tab.</p></body></html>');
    } catch (err) {
      logger?.error({ err }, 'brain/gmail callback error');
      return res.status(500).send('Token exchange failed');
    }
  });

  // Manual or cron-triggered sync
  app.post('/api/brain/gmail/sync', async (req, res) => {
    try {
      const isAdmin = await verifyAdminRequest(req);
      if (!isAdmin) return res.status(403).json({ error: 'admin only' });

      const { maxThreads = 20, daysBack = 7 } = req.body || {};
      const result = await syncGmailThreads({ maxThreads, daysBack, logger });

      return res.json({ ok: true, ...result });
    } catch (err) {
      const message = err?.message || 'sync-failed';
      logger?.error({ err }, 'brain/gmail sync error');
      // Not-authorized is a user-fixable error
      if (message.includes('not authorized')) {
        return res.status(401).json({ error: message, authUrl: '/api/brain/gmail/auth' });
      }
      return res.status(500).json({ error: message });
    }
  });
}

module.exports = { registerGmailRoutes };
