/**
 * Brain triage routes.
 *
 * POST /api/brain/triage/run — run the LLM inbox triage pass.
 *   Auth: Supabase admin JWT, Vercel cron header, or BRAIN_ADMIN_KEY.
 */

const crypto = require('crypto');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { runTriagePass } = require('./triageEngine');
const { runConstraintMiner } = require('./constraintMiner');

const verifyAdminRequest = createAdminVerifier();

function hasBrainAdminHeader(req) {
  const provided = String(req.headers['x-brain-admin-key'] || '');
  const expected = process.env.BRAIN_ADMIN_KEY || '';
  if (!provided || !expected || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

let running = false;
let lastRun = null;

function registerTriageRoutes(app, { logger } = {}) {
  const runHandler = async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      const isCron = req.headers['x-vercel-cron'] === '1'
        || String(req.headers['user-agent'] || '').startsWith('vercel-cron');
      if (!admin && !isCron && !hasBrainAdminHeader(req)) {
        return res.status(403).json({ error: 'admin only' });
      }

      if (running) return res.status(409).json({ error: 'triage already running', lastRun });

      running = true;
      runTriagePass({ logger, limit: parseInt(req.body?.limit) || 30 })
        .then((result) => {
          lastRun = { completedAt: new Date().toISOString(), ...result };
          logger?.info(lastRun, 'brain/triage: run finished');
        })
        .catch((err) => logger?.error({ err }, 'brain/triage: run error'))
        .finally(() => { running = false; });

      return res.json({ ok: true, status: 'started', lastRun });
    } catch (err) {
      logger?.error({ err }, 'brain/triage: trigger error');
      return res.status(500).json({ error: 'internal-error' });
    }
  };
  app.post('/api/brain/triage/run', runHandler);
  app.get('/api/brain/triage/run', runHandler);

  // POST /api/brain/constraints/mine — extract dietary constraints from
  // meal-prep intake ledger events. Idempotent; pass { force: true } to re-mine.
  app.post('/api/brain/constraints/mine', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin && !hasBrainAdminHeader(req)) return res.status(403).json({ error: 'admin only' });

      const result = await runConstraintMiner({ logger, force: req.body?.force === true });
      return res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error({ err }, 'brain/constraints: mine trigger error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });
}

module.exports = { registerTriageRoutes };
