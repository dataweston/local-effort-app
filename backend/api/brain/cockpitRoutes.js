/**
 * Brain cockpit route — one call powering the "brain pulse" panel in the
 * weekly planner (/weeklydemo). Surfaces what the brain computed so the
 * founder actually sees it: active inferences, inbox + review queue counts,
 * and freshness per ingestion source.
 *
 * GET /api/brain/cockpit (admin only)
 */

const { getPrisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');

const verifyAdminRequest = createAdminVerifier();

function registerCockpitRoutes(app, { logger } = {}) {
  const prisma = getPrisma();

  app.get('/api/brain/cockpit', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const [inferences, inboxPending, provisionalPending, sourceFreshness, recentCaptures] = await Promise.all([
        prisma.brainInference.findMany({
          where: { knownUntil: null, supersededBy: null },
          orderBy: { computedAt: 'desc' },
          take: 12,
          include: { src: { select: { id: true, name: true, entityType: true } } },
        }),
        prisma.brainInboxItem.count({ where: { status: 'pending' } }),
        prisma.brainAssertion.count({ where: { provisional: true, retractedAt: null, knownUntil: null } }),
        prisma.$queryRaw`
          SELECT source, MAX("occurredAt") AS "lastEventAt", COUNT(*)::int AS "totalEvents"
          FROM "LedgerEvent"
          WHERE "tombstonedAt" IS NULL
          GROUP BY source
          ORDER BY MAX("occurredAt") DESC
        `,
        prisma.brainInboxItem.findMany({
          where: { status: 'pending' },
          orderBy: { capturedAt: 'desc' },
          take: 5,
          select: { id: true, rawContent: true, source: true, capturedAt: true, triageHint: true },
        }),
      ]);

      return res.json({
        ok: true,
        inferences: inferences.map((inf) => ({
          id: inf.id,
          type: inf.inferenceType,
          confidence: inf.confidence,
          summary: inf.summary,
          computedAt: inf.computedAt,
          stale: !!(inf.staleAt && new Date(inf.staleAt) < new Date()),
          entity: inf.src,
        })),
        counts: {
          inboxPending,
          provisionalPending,
        },
        sources: sourceFreshness.map((s) => ({
          source: s.source,
          lastEventAt: s.lastEventAt,
          totalEvents: Number(s.totalEvents || 0),
        })),
        recentCaptures,
      });
    } catch (err) {
      logger?.error({ err }, 'brain/cockpit error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });
}

module.exports = { registerCockpitRoutes };
