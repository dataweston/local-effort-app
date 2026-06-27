/**
 * Brain inference routes.
 *
 * POST /api/brain/inference/run   — trigger a pass manually (admin only)
 * GET  /api/brain/inference       — list recent inferences (admin only)
 */

const { createAdminVerifier } = require('../utils/adminVerifier');
const { runInferencePass } = require('./inferenceEngine');
const { getPrisma } = require('../utils/prisma');

const verifyAdminRequest = createAdminVerifier();

function hasBrainAdminHeader(req) {
  const provided = String(req.headers['x-brain-admin-key'] || '');
  const expected = process.env.BRAIN_ADMIN_KEY || '';
  if (!provided || !expected || provided.length !== expected.length) return false;
  return require('crypto').timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

// Track last run in memory to prevent double-runs
let running = false;
let lastRun = null;

function registerInferenceRoutes(app, { logger } = {}) {
  const prisma = getPrisma();

  // POST (manual) or GET (Vercel cron) /api/brain/inference/run
  const runHandler = async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      const isCron = req.headers['x-vercel-cron'] === '1'
        || String(req.headers['user-agent'] || '').startsWith('vercel-cron');
      const keyOk = hasBrainAdminHeader(req);
      if (!admin && !isCron && !keyOk) return res.status(403).json({ error: 'admin only' });

      if (running) {
        return res.status(409).json({ error: 'inference already running', lastRun });
      }

      running = true;
      const { withJobRun } = require('./jobRuns');
      // Run async so the HTTP response returns immediately
      withJobRun('inference-run', () => runInferencePass({ logger }))
        .then(result => {
          lastRun = { completedAt: new Date().toISOString(), ...result };
          logger?.info(lastRun, 'brain/inference: pass finished');
        })
        .catch(err => {
          logger?.error({ err }, 'brain/inference: pass error');
        })
        .finally(() => { running = false; });

      return res.json({ ok: true, status: 'started', lastRun });
    } catch (err) {
      logger?.error({ err }, 'brain/inference: run trigger error');
      return res.status(500).json({ error: 'internal-error' });
    }
  };
  app.post('/api/brain/inference/run', runHandler);
  app.get('/api/brain/inference/run', runHandler);

  // GET /api/brain/inference
  app.get('/api/brain/inference', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { inferenceType, entityId, limit = '50' } = req.query;
      const where = {
        knownUntil: null,
        supersededBy: null,
      };
      if (inferenceType) where.inferenceType = inferenceType;
      if (entityId) where.srcId = entityId;

      const inferences = await prisma.brainInference.findMany({
        where,
        orderBy: { computedAt: 'desc' },
        take: Math.min(parseInt(limit) || 50, 200),
        include: {
          src: { select: { id: true, name: true, entityType: true } },
        },
      });

      return res.json({
        ok: true,
        inferences,
        runStatus: { running, lastRun },
      });
    } catch (err) {
      logger?.error({ err }, 'brain/inference: list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });
}

module.exports = { registerInferenceRoutes };
