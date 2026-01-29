const { PrismaClient } = require('@prisma/client');

const ADMIN_TOKEN = process.env.WEEKLY_ORDER_ADMIN_TOKEN || '';

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const checkAdmin = (req) => {
  if (!ADMIN_TOKEN) return true;
  const header = req.headers['x-admin-token'] || '';
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return header === ADMIN_TOKEN || bearer === ADMIN_TOKEN;
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!prisma) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  if (!checkAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
