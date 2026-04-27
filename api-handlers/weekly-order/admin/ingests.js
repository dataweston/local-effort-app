const { PrismaClient } = require('@prisma/client');
const { requireWeeklyOrderAdmin } = require('./_auth');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!prisma) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const admin = await requireWeeklyOrderAdmin(req, res);
  if (!admin) return;

  const limit = Math.min(200, parseInt(req.query?.limit, 10) || 50);
  const ingests = await prisma.recipeIngest.findMany({
    orderBy: { receivedAt: 'desc' },
    take: limit,
    include: {
      _count: { select: { drafts: true } },
    },
  });

  return res.status(200).json({ items: ingests });
};
