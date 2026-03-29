const express = require('express');
const { searchSupport } = require('../utils/supportSearchService');
const { createSupportIngestService } = require('../services/supportIngest');

function createSupportRouter({
  logger,
  searchSupportFn = searchSupport,
  supportIngestService = createSupportIngestService({ logger }),
} = {}) {
  const router = express.Router();

  router.get('/support/search', async (req, res) => {
    try {
      const q = (req.query.q || '').toString();
      if (!q) return res.status(400).json({ error: 'missing q' });
      const results = await searchSupportFn(q);
      return res.json(results);
    } catch (err) {
      logger?.error?.({ err }, 'support search error');
      if (err?.code === 'search-not-configured') {
        return res.status(500).json({ error: 'search-not-configured' });
      }
      if (err?.code === 'missing-query') {
        return res.status(400).json({ error: 'missing q' });
      }
      return res.status(500).json({ error: 'search-failed' });
    }
  });

  router.post('/support/sync', async (req, res) => {
    try {
      if (!supportIngestService.authorize(req)) {
        return res.status(401).json({ error: 'unauthorized' });
      }
      const result = await supportIngestService.runIngest();
      return res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error?.({ err }, 'support sync error');
      return res.status(500).json({ error: 'sync-failed' });
    }
  });

  router.post('/support/webhook', async (req, res) => {
    try {
      if (!supportIngestService.authorize(req)) {
        return res.status(401).json({ error: 'unauthorized' });
      }
      const result = await supportIngestService.runIngest();
      return res.json({ ok: true, ...result });
    } catch (err) {
      logger?.error?.({ err }, 'support webhook error');
      return res.status(500).json({ error: 'webhook-failed' });
    }
  });

  return router;
}

module.exports = { createSupportRouter };
