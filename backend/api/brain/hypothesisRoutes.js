/**
 * Hypothesis routes.
 *
 * POST /api/brain/hypothesis           — create a hypothesis entity (admin)
 * GET  /api/brain/hypothesis           — list all hypotheses with status (admin)
 * GET  /api/brain/hypothesis/:id       — get one with full evaluation history (admin)
 * POST /api/brain/hypothesis/run       — trigger evaluation pass manually (admin/cron)
 */

const { getPrisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { runHypothesisPass } = require('./hypothesisEngine');
const { writeLedgerEvent } = require('./ledger');

const verifyAdminRequest = createAdminVerifier();

function hasBrainAdminHeader(req) {
  const provided = String(req.headers['x-brain-admin-key'] || '');
  const expected = process.env.BRAIN_ADMIN_KEY || '';
  if (!provided || !expected || provided.length !== expected.length) return false;
  return require('crypto').timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

let running = false;
let lastRun = null;

function registerHypothesisRoutes(app, { logger } = {}) {
  const prisma = getPrisma();

  // POST /api/brain/hypothesis
  app.post('/api/brain/hypothesis', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { name, statement, predicate, subjectEntityId, notes } = req.body || {};
      if (!name || !statement) return res.status(400).json({ error: 'name and statement required' });
      if (!predicate?.condition || !predicate?.prediction) {
        return res.status(400).json({ error: 'predicate.condition and predicate.prediction required' });
      }

      const entity = await prisma.brainEntity.create({
        data: {
          entityType: 'Hypothesis',
          name,
          status: 'active',
          properties: {
            statement,
            predicate: {
              condition: predicate.condition,
              prediction: predicate.prediction,
              evidenceWindow: predicate.evidenceWindow || '90 days',
              minSampleSize: predicate.minSampleSize || 3,
            },
            subjectEntityId: subjectEntityId || null,
            notes: notes || null,
            status: 'collecting',
            confidence: null,
            sampleSize: 0,
            confirmedCount: 0,
            rejectedCount: 0,
            lastEvaluatedAt: null,
          },
        },
      });

      await writeLedgerEvent({
        eventType: 'hypothesis.created',
        source: 'admin_ux',
        actorType: 'founder',
        payload: { hypothesisId: entity.id, name, statement },
      });

      logger?.info({ id: entity.id, name }, 'brain: hypothesis created');
      return res.status(201).json({ ok: true, id: entity.id });
    } catch (err) {
      logger?.error({ err }, 'brain: hypothesis create error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/hypothesis
  app.get('/api/brain/hypothesis', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { status } = req.query;
      const hypotheses = await prisma.brainEntity.findMany({
        where: {
          entityType: 'Hypothesis',
          tombstonedAt: null,
          ...(status ? {} : { status: { not: 'archived' } }),
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ ok: true, hypotheses, runStatus: { running, lastRun } });
    } catch (err) {
      logger?.error({ err }, 'brain: hypothesis list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/hypothesis/:id
  app.get('/api/brain/hypothesis/:id', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const entity = await prisma.brainEntity.findUnique({
        where: { id: req.params.id },
      });
      if (!entity || entity.entityType !== 'Hypothesis') {
        return res.status(404).json({ error: 'not found' });
      }

      const inferences = await prisma.brainInference.findMany({
        where: { srcId: entity.id, inferenceType: 'VALIDATES_HYPOTHESIS' },
        orderBy: { computedAt: 'desc' },
        take: 20,
      });

      return res.json({ ok: true, hypothesis: entity, inferences });
    } catch (err) {
      logger?.error({ err }, 'brain: hypothesis get error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/hypothesis/run
  app.post('/api/brain/hypothesis/run', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      const isCron = req.headers['x-vercel-cron'] === '1';
      const keyOk = hasBrainAdminHeader(req);
      if (!admin && !isCron && !keyOk) return res.status(403).json({ error: 'admin only' });

      if (running) return res.status(409).json({ error: 'already running', lastRun });

      running = true;
      runHypothesisPass({ logger })
        .then(result => { lastRun = { completedAt: new Date().toISOString(), ...result }; })
        .catch(err => { logger?.error({ err }, 'brain/hypothesis: pass error'); })
        .finally(() => { running = false; });

      return res.json({ ok: true, status: 'started', lastRun });
    } catch (err) {
      logger?.error({ err }, 'brain: hypothesis run error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });
}

module.exports = { registerHypothesisRoutes };
