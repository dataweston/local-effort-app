'use strict';

/**
 * Private Company Brain retrieval routes. All surfaces use businessMemory.js so
 * API clients and MCP agents receive the same evidence, provenance, and
 * reconciliation behavior.
 */

const { createAdminVerifier } = require('../utils/adminVerifier');
const { getPrisma } = require('../utils/prisma');
const {
  searchBusinessMemory,
  buildBusinessContext,
  getBusinessMemorySource,
  businessMemoryCoverage,
} = require('./businessMemory');
const { jobFreshness } = require('./jobRuns');
const { getThreadSyncStatus } = require('./gmailSync');

const verifyAdminRequest = createAdminVerifier();

function requestErrorStatus(error) {
  return /required|500 characters|unknown memory kind/i.test(error?.message || '') ? 400 : 500;
}

function registerSearchRoutes(app, { logger } = {}) {
  const prisma = getPrisma();

  app.post('/api/brain/search', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });
      const { query, limit = 8, table, kinds } = req.body || {};
      const result = await searchBusinessMemory(query, {
        limit,
        table,
        kinds,
        prismaClient: prisma,
      });
      return res.json({ ok: true, ...result });
    } catch (error) {
      logger?.error({ err: error }, 'brain/search error');
      return res.status(requestErrorStatus(error)).json({ error: error?.message || 'internal-error' });
    }
  });

  app.post('/api/brain/context', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });
      const { query, limit = 12, kinds, synthesize = true } = req.body || {};
      const result = await buildBusinessContext(query, {
        limit,
        kinds,
        synthesize: synthesize !== false,
        prismaClient: prisma,
      });
      return res.json({ ok: true, ...result });
    } catch (error) {
      logger?.error({ err: error }, 'brain/context error');
      return res.status(requestErrorStatus(error)).json({ error: error?.message || 'internal-error' });
    }
  });

  app.get('/api/brain/source/:id', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });
      const document = await getBusinessMemorySource(
        { id: req.params.id },
        {
          includeRaw: req.query.includeRaw === 'true',
          prismaClient: prisma,
        }
      );
      if (!document) return res.status(404).json({ error: 'source document not found' });
      return res.json({ ok: true, document });
    } catch (error) {
      logger?.error({ err: error }, 'brain/source error');
      return res.status(requestErrorStatus(error)).json({ error: error?.message || 'internal-error' });
    }
  });

  app.get('/api/brain/coverage', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });
      const [corpus, jobs, gmail] = await Promise.all([
        businessMemoryCoverage(prisma),
        jobFreshness(prisma),
        getThreadSyncStatus(prisma),
      ]);
      return res.json({ ok: true, corpus, jobs, gmail });
    } catch (error) {
      logger?.error({ err: error }, 'brain/coverage error');
      return res.status(500).json({ error: error?.message || 'internal-error' });
    }
  });
}

module.exports = { registerSearchRoutes };
