/**
 * Gmail OAuth + sync routes - registered in index.js.
 *
 * GET  /api/brain/gmail/auth        -> redirect to Google OAuth (Bearer/admin-key clients)
 * POST /api/brain/gmail/auth        -> return OAuth URL to authenticated browser UI
 * GET  /api/brain/gmail/callback    -> receive OAuth code, store tokens
 * POST /api/brain/gmail/sync        -> run bounded recent + archive ingestion
 * POST /api/brain/gmail/push        -> authenticated Gmail Pub/Sub notification
 * GET  /api/brain/gmail/sync/status -> cursor, backlog, and watch health
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
  renewGmailWatch,
  processGmailHistoryNotification,
  verifyGmailPubSubRequest,
  decodeGmailPushEnvelope,
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
    renewGmailWatch: renewWatch = renewGmailWatch,
    processGmailHistoryNotification: processHistory = processGmailHistoryNotification,
    verifyGmailPubSubRequest: verifyPush = verifyGmailPubSubRequest,
    decodeGmailPushEnvelope: decodePush = decodeGmailPushEnvelope,
    withJobRun: runWithJob,
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

  // Keep the newest mail hot on every cron while reserving at least one
  // bounded batch for the one-time full archive. The request stays alive until
  // durable cursor and job-run writes complete.
  const runThreadSync = async (req, res) => {
    try {
      const isAdmin = await verifyAdmin(req);
      const keyOk = hasBrainAdminHeader(req);
      const isCron = req.headers['x-vercel-cron'] === '1'
        || String(req.headers['user-agent'] || '').startsWith('vercel-cron');
      if (!isAdmin && !keyOk && !isCron) return res.status(403).json({ error: 'admin only' });

      const input = { ...(req.query || {}), ...(req.body || {}) };
      const executeWithJob = runWithJob || require('./jobRuns').withJobRun;
      const result = await executeWithJob('gmail-sync', async () => {
        const sync = await runThreadSyncPass({
          batchSize: input.batchSize,
          maxBatches: input.maxBatches ?? (isCron ? 4 : undefined),
          timeBudgetMs: input.timeBudgetMs,
          refreshRecent: isCron
            || input.refreshRecent === true
            || input.refreshRecent === 'true',
          recentDays: input.recentDays ?? (isCron ? 30 : undefined),
          yumAddress: input.yumAddress,
          logger,
        });

        const shouldRenewWatch = isCron
          || input.renewWatch === true
          || input.renewWatch === 'true';
        let watch = null;
        let watchErrors = 0;
        if (shouldRenewWatch && process.env.GMAIL_PUBSUB_TOPIC) {
          try {
            watch = await renewWatch({ logger });
          } catch (error) {
            watchErrors = 1;
            watch = {
              ok: false,
              configured: true,
              mode: 'polling-fallback',
              error: error?.message || String(error),
            };
            logger?.error({ err: error }, 'brain/gmail watch renewal error');
          }
        } else if (shouldRenewWatch) {
          watch = {
            ok: true,
            configured: false,
            mode: 'polling',
            reason: 'GMAIL_PUBSUB_TOPIC not configured',
          };
        }
        return {
          ...sync,
          errors: Number(sync.errors || 0) + watchErrors,
          errorCount: Number(sync.errors || 0) + watchErrors,
          watch,
        };
      });
      return res.json({ ok: true, ...result });
    } catch (err) {
      const message = err?.message || 'sync-failed';
      logger?.error({ err }, 'brain/gmail sync error');
      if (/not authorized|login required|invalid credentials/i.test(message)) {
        return res.status(401).json({ error: message, authUrl: '/api/brain/gmail/auth' });
      }
      return res.status(500).json({ error: message });
    }
  };
  app.post('/api/brain/gmail/sync', runThreadSync);
  app.get('/api/brain/gmail/sync', runThreadSync);

  // Pub/Sub supplies a Google-signed OIDC bearer token. Never accept admin
  // keys here: this public callback has one narrowly authenticated caller.
  app.post('/api/brain/gmail/push', async (req, res) => {
    try {
      await verifyPush(req);
      const notification = decodePush(req.body);
      const executeWithJob = runWithJob || require('./jobRuns').withJobRun;
      const result = await executeWithJob(
        'gmail-sync',
        () => processHistory(notification, { logger })
      );
      return res.json({ ok: true, ...result });
    } catch (error) {
      const status = Number(error?.statusCode) || 500;
      logger?.error({ err: error }, 'brain/gmail push error');
      return res.status(status).json({ error: error?.message || 'gmail-push-failed' });
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
