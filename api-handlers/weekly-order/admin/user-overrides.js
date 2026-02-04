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
  if (!prisma) {
    return res.status(500).json({ error: 'Database not configured' });
  }
  if (!checkAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const menuWeekId = req.query?.menuWeekId;
    const userId = req.query?.userId;
    const customerId = req.query?.customerId;
    const where = {};
    if (menuWeekId) where.menuWeekId = menuWeekId;
    if (userId) where.userId = userId;
    if (customerId) {
      where.user = { customerId };
    }
    const items = await prisma.userPriceOverride.findMany({
      where,
      include: { dish: true, user: true, menuWeek: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const { userId, menuWeekId, dishId, priceCents } = req.body || {};
    if (!userId || !menuWeekId || !dishId) {
      return res.status(400).json({ error: 'Missing userId, menuWeekId, or dishId' });
    }
    const item = await prisma.userPriceOverride.upsert({
      where: { userId_menuWeekId_dishId: { userId, menuWeekId, dishId } },
      update: { priceCents: Number(priceCents) || 0 },
      create: {
        userId,
        menuWeekId,
        dishId,
        priceCents: Number(priceCents) || 0,
      },
    });
    return res.status(200).json({ item });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await prisma.userPriceOverride.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
