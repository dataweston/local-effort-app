/**
 * Entity browser routes.
 *
 * GET  /api/brain/entities        — list entities with assertion counts (admin only)
 * GET  /api/brain/entities/:id    — entity detail with recent assertions
 * POST /api/brain/entities/:id/tombstone — soft-delete an entity
 */

const { getPrisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');

const verifyAdminRequest = createAdminVerifier();

const VALID_TYPES = ['Vendor', 'Customer', 'Menu', 'Dish', 'Ingredient', 'Task', 'Note', 'Event'];
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
            SELECT DISTINCT ON (a."srcId") a."srcId" AS id, a."createdAt" AS "lastSignalAt"
            FROM "BrainAssertion" a
            WHERE a."srcId" = ANY(${ids})
            ORDER BY a."srcId", a."createdAt" DESC
          `
        : [];

      const lastSignalMap = Object.fromEntries(lastSignals.map(r => [r.id, r.lastSignalAt]));

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

      const entity = await prisma.brainEntity.findUnique({
        where: { id: req.params.id },
        include: {
          srcAssertions: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              dst: { select: { id: true, name: true, entityType: true } },
            },
          },
          dstAssertions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
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
}

module.exports = { registerEntityRoutes };
