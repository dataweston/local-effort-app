const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, cleanString } = require('./_http');


module.exports = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const q = cleanString(req.query?.q, 120);
  const objectId = cleanString(req.query?.objectId, 120);

  try {
    const suggestions = [];

    if (objectId) {
      suggestions.push({
        id: objectId,
        type: 'object',
        title: 'Current object',
        subtitle: 'Use the screen context for this capture',
        confidence: 0.95,
        source: 'object_context',
      });
    }

    if (q) {
      const entities = await prisma.brainEntity.findMany({
        where: {
          tombstonedAt: null,
          name: { contains: q, mode: 'insensitive' },
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }).catch(() => []);

      entities.forEach((entity) => {
        suggestions.push({
          id: entity.id,
          type: entity.entityType,
          title: entity.name,
          subtitle: entity.status,
          confidence: 0.72,
          source: 'brain_entity_search',
        });
      });
    }

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      suggestions: suggestions.slice(0, 10),
    });
  } catch (err) {
    console.error('[hub/capture-suggestions] error', err);
    return res.status(500).json({ error: 'Unable to load capture suggestions' });
  }
};
