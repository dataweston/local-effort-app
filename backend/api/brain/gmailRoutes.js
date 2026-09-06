/**
 * Gmail OAuth + sync routes - registered in index.js.
 *
 * GET  /api/brain/gmail/auth     -> redirect to Google OAuth (Bearer/admin-key clients)
 * POST /api/brain/gmail/auth     -> return OAuth URL to authenticated browser UI
 * GET  /api/brain/gmail/callback -> receive OAuth code, store tokens
 * POST /api/brain/gmail/sync     -> run one bounded, resumable thread pass
 * GET  /api/brain/gmail/sync/status -> per-stream cursor progress
 */

const crypto = require('crypto');
const { createAdminVerifier } = require('../utils/adminVerifier');
const verifyAdminRequest = createAdminVerifier();
const {
  getAuthUrl,
  exchangeCodeForTokens,
  storeGmailTokens,
  syncGmailThreads,
  getThreadSyncStatus,
  verifyOAuthState,
} = require('./gmailSync');
const {
  runNextVendorDocumentBatch,
  getVendorDocumentSyncStatus,
} = require('./gmailVendorDocumentSync');

function hasBrainAdminHeader(req) {
  const provided = String(req.headers['x-brain-admin-key'] || '');
  const expected = process.env.BRAIN_ADMIN_KEY || '';
  if (!provided || !expected || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

function registerGmailRoutes(
  app,
  {
    logger,
    verifyAdminRequest: verifyAdmin = verifyAdminRequest,
    getAuthUrl: authUrlFor = getAuthUrl,
    syncGmailThreads: runThreadSyncPass = syncGmailThreads,
  } = {}
) {
  // Supabase browser sessions are stored in browser storage, not an HTTP
  // cookie. A direct address-bar GET therefore has no Bearer token even when
  // the operator is logged in. The Brain UI uses this POST to authenticate
  // first, then navigates to the returned Google URL.
  app.post('/api/brain/gmail/auth', async (req, res) => {
    try {
      const isAdmin = await verifyAdmin(req);
      const keyOk = hasBrainAdminHeader(req);
      if (!isAdmin && !keyOk) return res.status(403).json({ error: 'admin only' });

      if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
        return res.status(500).json({
          error: 'Gmail OAuth not configured',
          required: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REDIRECT_URI'],
        });
      }

      return res.json({ ok: true, authUrl: authUrlFor() });
    } catch (err) {
      logger?.error({ err }, 'brain/gmail auth-url error');
      return res.status(500).json({ error: 'auth-error' });
    }
  });

  app.get('/api/brain/gmail/auth', async (req, res) => {
    try {
      const isAdmin = await verifyAdmin(req);
      const keyOk = hasBrainAdminHeader(req);
      if (!isAdmin && !keyOk) {
        return res.status(403).json({
          error: 'admin only',
          action: 'Open the Brain Partners view and use Connect Gmail.',
        });
      }

      if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
        return res.status(500).json({
          error: 'Gmail OAuth not configured',
          required: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REDIRECT_URI'],
        });
      }

      const url = authUrlFor();
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

  // Process one bounded page per call and answer with the real counts. Work
  // detached after the response used to be killed with the serverless
  // instance mid-loop, which reported success and ingested a partial mailbox.
  app.post('/api/brain/gmail/sync', async (req, res) => {
    try {
      const isAdmin = await verifyAdmin(req);
      const keyOk = hasBrainAdminHeader(req);
      if (!isAdmin && !keyOk) return res.status(403).json({ error: 'admin only' });

      const { batchSize, maxBatches, timeBudgetMs, restart, daysBack, yumAddress } = req.body || {};
      const result = await runThreadSyncPass({
        batchSize,
        maxBatches,
        timeBudgetMs,
        restart,
        daysBack,
        yumAddress,
        logger,
      });
      return res.json({ ok: true, ...result });
    } catch (err) {
      const message = err?.message || 'sync-failed';
      logger?.error({ err }, 'brain/gmail sync error');
      if (message.includes('not authorized')) {
        return res.status(401).json({ error: message, authUrl: '/api/brain/gmail/auth' });
      }
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/brain/gmail/sync/status', async (req, res) => {
    try {
      const isAdmin = await verifyAdmin(req);
      const keyOk = hasBrainAdminHeader(req);
      if (!isAdmin && !keyOk) return res.status(403).json({ error: 'admin only' });
      return res.json({ ok: true, ...(await getThreadSyncStatus()) });
    } catch (err) {
      logger?.error({ err }, 'brain/gmail sync status error');
      return res.status(500).json({ error: err?.message || 'sync-status-failed' });
    }
  });

  // Process exactly one bounded page of likely vendor documents. Repeated calls
  // resume from BrainSyncCursor and work newest-to-oldest over three years.
  app.post('/api/brain/gmail/vendor-documents/batch', async (req, res) => {
    try {
      const isAdmin = await verifyAdmin(req);
      const keyOk = hasBrainAdminHeader(req);
      if (!isAdmin && !keyOk) {
        return res.status(403).json({
          error: 'admin only',
          action: 'Open the Brain Partners view and use Connect Gmail.',
        });
      }

      const { batchSize = 50, monthsBack = 36 } = req.body || {};
      const result = await runNextVendorDocumentBatch({ batchSize, monthsBack, logger });
      return res.json({ ok: true, ...result });
    } catch (err) {
      const message = err?.message || 'vendor-document-sync-failed';
      logger?.error({ err }, 'brain/gmail vendor-document batch error');
      if (message.includes('not authorized')) {
        return res.status(401).json({ error: message, authUrl: '/api/brain/gmail/auth' });
      }
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/brain/gmail/vendor-documents/status', async (req, res) => {
    try {
      const isAdmin = await verifyAdmin(req);
      const keyOk = hasBrainAdminHeader(req);
      if (!isAdmin && !keyOk) return res.status(403).json({ error: 'admin only' });
      return res.json({ ok: true, ...(await getVendorDocumentSyncStatus()) });
    } catch (err) {
      logger?.error({ err }, 'brain/gmail vendor-document status error');
      return res.status(500).json({ error: err?.message || 'vendor-document-status-failed' });
    }
  });
}

module.exports = { registerGmailRoutes };
