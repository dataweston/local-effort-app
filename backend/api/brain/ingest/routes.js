/**
 * Routes for the unified ingest engine.
 *
 *   POST /api/brain/capture
 *     body: { text, customerId?, source?, commit?, force? }
 *     commit:false (default) -> preview only (classify+resolve, no writes)
 *     commit:true            -> apply per verification policy, else capture to inbox
 *     force:true             -> operator confirm: apply a needsConfirm result
 *
 *   GET  /api/brain/capture/recent  -> recent ingest.applied + inbox.captured for the Hub feed
 *
 * Admin-gated (founder + staff via admin JWT). Staff access is the point — this
 * is the shared Hub capture surface.
 */

const { createAdminVerifier } = require('../../utils/adminVerifier');
const { getPrisma } = require('../../utils/prisma');
const { process: ingestProcess } = require('./engine');

const verifyAdminRequest = createAdminVerifier();

function registerIngestRoutes(app, { logger } = {}) {
  app.post('/api/brain/capture', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { text, customerId = null, customerName = null, source = 'hub_capture', commit = false, force = false } = req.body || {};
      if (!text || !String(text).trim()) return res.status(400).json({ ok: false, error: 'text is required' });

      const result = await ingestProcess(String(text), { customerId, customerName, source, force }, { commit: !!commit });
      return res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error({ err }, 'brain/capture: error');
      return res.status(500).json({ ok: false, error: err?.message || 'internal-error' });
    }
  });

  app.get('/api/brain/capture/recent', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });
      const prisma = getPrisma();
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const events = await prisma.ledgerEvent.findMany({
        where: { eventType: { in: ['ingest.applied', 'inbox.captured'] }, tombstonedAt: null },
        orderBy: { occurredAt: 'desc' },
        take: limit,
        select: { id: true, eventType: true, occurredAt: true, source: true, payload: true },
      });
      return res.json({ ok: true, events });
    } catch (err) {
      logger?.error({ err }, 'brain/capture-recent: error');
      return res.status(500).json({ ok: false, error: 'internal-error' });
    }
  });
}

module.exports = { registerIngestRoutes };
