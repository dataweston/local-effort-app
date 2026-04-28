/**
 * Entity browser routes.
 *
 * GET  /api/brain/entities        — list entities with assertion counts (admin only)
 * GET  /api/brain/entities/:id    — entity detail with recent assertions
 * POST /api/brain/entities/:id/tombstone — soft-delete an entity
 */

const { getPrisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { RELATIONSHIPS } = require('./relationshipDictionary');
const { canonicalName: canonicalEntityName } = require('./ledger');

const verifyAdminRequest = createAdminVerifier();

const VALID_TYPES = [
  // Core operational
  'Vendor', 'Customer', 'Menu', 'Dish', 'Ingredient', 'Task', 'Note', 'Event',
  'Invoice', 'Payment', 'Order', 'Receipt', 'EmailThread', 'Feedback', 'Decision',
  'PriceQuote', 'LedgerTransaction',
  // Business model
  'BusinessLine', 'Offer', 'Occasion', 'Channel', 'CustomerSegment',
  // Operations
  'ProcessStep', 'Constraint', 'Asset',
  // Strategy
  'Opportunity', 'Risk', 'Metric', 'NarrativeTheme',
  // Supply
  'Supplier', 'Product',
];
const VALID_SORT = ['name', 'assertionCount', 'updatedAt', 'createdAt'];

function registerEntityRoutes(app, { logger } = {}) {
  const prisma = getPrisma();

  // GET /api/brain/entities
  app.get('/api/brain/entities', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const {
        type,
        q,
        sort = 'updatedAt',
        order = 'desc',
        limit = '50',
        offset = '0',
        includeArchived = 'false',
        provisionalOnly = 'false',
        relType,
      } = req.query;

      const take = Math.min(parseInt(limit) || 50, 200);
      const skip = parseInt(offset) || 0;
      const sortField = VALID_SORT.includes(sort) ? sort : 'updatedAt';
      const sortDir = order === 'asc' ? 'asc' : 'desc';

      const where = {};
      if (!JSON.parse(includeArchived)) {
        where.tombstonedAt = null;
      }
      if (type && VALID_TYPES.includes(type)) {
        where.entityType = type;
      }
      if (q && q.trim()) {
        where.name = { contains: q.trim(), mode: 'insensitive' };
      }
      if (JSON.parse(provisionalOnly)) {
        where.OR = [
          { srcAssertions: { some: { provisional: true, retractedAt: null, knownUntil: null } } },
          { dstAssertions: { some: { provisional: true, retractedAt: null, knownUntil: null } } },
        ];
      }
      if (relType && String(relType).trim()) {
        const normalizedRel = String(relType).trim().toUpperCase();
        where.OR = [
          ...(where.OR || []),
          { srcAssertions: { some: { relType: normalizedRel, retractedAt: null, knownUntil: null } } },
          { dstAssertions: { some: { relType: normalizedRel, retractedAt: null, knownUntil: null } } },
        ];
      }

      const orderBy = sortField === 'assertionCount'
        ? { srcAssertions: { _count: sortDir } }
        : { [sortField]: sortDir };

      const [entities, total] = await Promise.all([
        prisma.brainEntity.findMany({
          where,
          orderBy,
          take,
          skip,
          select: {
            id: true,
            entityType: true,
            name: true,
            status: true,
            properties: true,
            createdAt: true,
            updatedAt: true,
            tombstonedAt: true,
            _count: { select: { srcAssertions: true, dstAssertions: true } },
          },
        }),
        prisma.brainEntity.count({ where }),
      ]);

      // Attach last signal date (most recent assertion involving this entity)
      const ids = entities.map(e => e.id);
      const lastSignals = ids.length > 0
        ? await prisma.$queryRaw`
            SELECT DISTINCT ON (x.id) x.id, x."lastSignalAt"
            FROM (
              SELECT a."srcId" AS id, a."createdAt" AS "lastSignalAt"
              FROM "BrainAssertion" a
              WHERE a."srcId" = ANY(${ids})
                AND a."retractedAt" IS NULL
              UNION ALL
              SELECT a."dstId" AS id, a."createdAt" AS "lastSignalAt"
              FROM "BrainAssertion" a
              WHERE a."dstId" = ANY(${ids})
                AND a."retractedAt" IS NULL
            ) x
            ORDER BY x.id, x."lastSignalAt" DESC
          `
        : [];

      const provisionalCounts = ids.length > 0
        ? await prisma.$queryRaw`
            SELECT id, COUNT(*)::int AS "provisionalCount"
            FROM (
              SELECT a."srcId" AS id
              FROM "BrainAssertion" a
              WHERE a."srcId" = ANY(${ids})
                AND a.provisional = true
                AND a."retractedAt" IS NULL
              UNION ALL
              SELECT a."dstId" AS id
              FROM "BrainAssertion" a
              WHERE a."dstId" = ANY(${ids})
                AND a.provisional = true
                AND a."retractedAt" IS NULL
            ) x
            GROUP BY id
          `
        : [];

      const lastSignalMap = Object.fromEntries(lastSignals.map(r => [r.id, r.lastSignalAt]));
      const provisionalMap = Object.fromEntries(provisionalCounts.map(r => [r.id, Number(r.provisionalCount || 0)]));

      const enriched = entities.map(e => ({
        id: e.id,
        entityType: e.entityType,
        name: e.name,
        status: e.status,
        properties: e.properties,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        tombstonedAt: e.tombstonedAt,
        assertionCount: (e._count.srcAssertions || 0) + (e._count.dstAssertions || 0),
        lastSignalAt: lastSignalMap[e.id] || null,
        provisionalCount: provisionalMap[e.id] || 0,
      }));

      return res.json({ ok: true, entities: enriched, total });
    } catch (err) {
      logger?.error({ err }, 'brain: entities list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/entities/:id
  app.get('/api/brain/entities/:id', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const provisionalOnly = String(req.query.provisionalOnly || 'false') === 'true';
      const assertionWhere = provisionalOnly ? { provisional: true, retractedAt: null } : {};
      const entity = await prisma.brainEntity.findUnique({
        where: { id: req.params.id },
        include: {
          srcAssertions: {
            where: assertionWhere,
            orderBy: [{ provisional: 'desc' }, { createdAt: 'desc' }],
            take: provisionalOnly ? 100 : 40,
            include: {
              dst: { select: { id: true, name: true, entityType: true } },
            },
          },
          dstAssertions: {
            where: assertionWhere,
            orderBy: [{ provisional: 'desc' }, { createdAt: 'desc' }],
            take: provisionalOnly ? 100 : 30,
            include: {
              src: { select: { id: true, name: true, entityType: true } },
            },
          },
        },
      });

      if (!entity) return res.status(404).json({ error: 'not found' });

      return res.json({ ok: true, entity });
    } catch (err) {
      logger?.error({ err }, 'brain: entity detail error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/entities/:id/tombstone
  app.post('/api/brain/entities/:id/tombstone', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const entity = await prisma.brainEntity.findUnique({ where: { id: req.params.id } });
      if (!entity) return res.status(404).json({ error: 'not found' });

      await prisma.brainEntity.update({
        where: { id: req.params.id },
        data: { tombstonedAt: new Date(), status: 'archived' },
      });

      logger?.info({ id: req.params.id, name: entity.name }, 'brain: entity tombstoned');
      return res.json({ ok: true });
    } catch (err) {
      logger?.error({ err }, 'brain: entity tombstone error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // PATCH /api/brain/entities/:id — edit name, status, or properties
  app.patch('/api/brain/entities/:id', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const entity = await prisma.brainEntity.findUnique({ where: { id: req.params.id } });
      if (!entity) return res.status(404).json({ error: 'not found' });

      const { name, status, properties } = req.body || {};
      const data = {};
      if (name && typeof name === 'string') {
        data.name = name.trim();
        data.canonicalName = canonicalEntityName(data.name);
      }
      if (status && typeof status === 'string') data.status = status;
      if (properties && typeof properties === 'object') {
        data.properties = { ...(entity.properties || {}), ...properties };
      }
      if (!Object.keys(data).length) return res.status(400).json({ error: 'nothing to update' });

      const updated = await prisma.brainEntity.update({ where: { id: req.params.id }, data });
      logger?.info({ id: req.params.id, data }, 'brain: entity updated');
      return res.json({ ok: true, entity: updated });
    } catch (err) {
      logger?.error({ err }, 'brain: entity update error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/assertions/:id/confirm — confirm a provisional assertion
  app.post('/api/brain/assertions/:id/confirm', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const assertion = await prisma.brainAssertion.findUnique({ where: { id: req.params.id } });
      if (!assertion) return res.status(404).json({ error: 'not found' });

      await prisma.brainAssertion.update({
        where: { id: req.params.id },
        data: { provisional: false, confirmedAt: new Date(), confirmedBy: 'admin' },
      });

      return res.json({ ok: true });
    } catch (err) {
      logger?.error({ err }, 'brain: assertion confirm error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/assertions/:id/retract — retract (soft-delete) an assertion
  app.post('/api/brain/assertions/:id/retract', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const assertion = await prisma.brainAssertion.findUnique({ where: { id: req.params.id } });
      if (!assertion) return res.status(404).json({ error: 'not found' });

      await prisma.brainAssertion.update({
        where: { id: req.params.id },
        data: {
          retractedAt: new Date(),
          retractedBy: 'admin',
          retractedReason: req.body?.reason || 'admin_retraction',
        },
      });

      return res.json({ ok: true });
    } catch (err) {
      logger?.error({ err }, 'brain: assertion retract error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/assertions/provisional — review queue
  app.get('/api/brain/assertions/provisional', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { limit = '100', relType } = req.query;
      const assertions = await prisma.brainAssertion.findMany({
        where: {
          provisional: true,
          retractedAt: null,
          knownUntil: null,
          ...(relType ? { relType: String(relType).trim().toUpperCase() } : {}),
        },
        orderBy: [{ confidence: 'asc' }, { createdAt: 'desc' }],
        take: Math.min(parseInt(limit) || 100, 250),
        include: {
          src: { select: { id: true, entityType: true, name: true } },
          dst: { select: { id: true, entityType: true, name: true } },
          ledgerEvent: { select: { eventType: true, source: true, sourceId: true, occurredAt: true, payload: true } },
        },
      });
      return res.json({ ok: true, assertions, count: assertions.length });
    } catch (err) {
      logger?.error({ err }, 'brain: provisional assertions list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/quality — compact graph cleanup dashboard data.
  app.get('/api/brain/quality', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const [
        duplicateEntities,
        duplicateSourceIds,
        selfEdges,
        provisional,
        orphaned,
      ] = await Promise.all([
        prisma.$queryRaw`
          SELECT "entityType",
                 COALESCE("canonicalName", lower(name)) AS canonical,
                 COUNT(*)::int AS n,
                 ARRAY_AGG(name ORDER BY "createdAt") AS names
          FROM "BrainEntity"
          WHERE "tombstonedAt" IS NULL
          GROUP BY 1, 2
          HAVING COUNT(*) > 1
          ORDER BY n DESC
          LIMIT 50
        `,
        prisma.$queryRaw`
          SELECT "eventType", source, "sourceId", COUNT(*)::int AS n
          FROM "LedgerEvent"
          WHERE "sourceId" IS NOT NULL AND "tombstonedAt" IS NULL
          GROUP BY 1, 2, 3
          HAVING COUNT(*) > 1
          ORDER BY n DESC
          LIMIT 50
        `,
        prisma.$queryRaw`
          SELECT a."relType", e."entityType", COUNT(*)::int AS n
          FROM "BrainAssertion" a
          JOIN "BrainEntity" e ON e.id = a."srcId"
          WHERE a."srcId" = a."dstId" AND a."retractedAt" IS NULL
          GROUP BY 1, 2
          ORDER BY n DESC
          LIMIT 50
        `,
        prisma.brainAssertion.count({ where: { provisional: true, retractedAt: null } }),
        prisma.$queryRaw`
          SELECT e."entityType", COUNT(*)::int AS n
          FROM "BrainEntity" e
          WHERE e."tombstonedAt" IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM "BrainAssertion" a
              WHERE (a."srcId" = e.id OR a."dstId" = e.id)
                AND a."retractedAt" IS NULL
            )
          GROUP BY 1
          ORDER BY n DESC
          LIMIT 50
        `,
      ]);

      return res.json({
        ok: true,
        duplicateEntities,
        duplicateSourceIds,
        selfEdges,
        provisionalAssertions: provisional,
        orphanedEntitiesByType: orphaned,
      });
    } catch (err) {
      logger?.error({ err }, 'brain: quality report error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.get('/api/brain/relationships', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });
      return res.json({ ok: true, relationships: RELATIONSHIPS });
    } catch (err) {
      return res.status(500).json({ error: 'internal-error' });
    }
  });
}

module.exports = { registerEntityRoutes };
