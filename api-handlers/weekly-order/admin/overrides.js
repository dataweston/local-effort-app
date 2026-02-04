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
    const customerId = req.query?.customerId;
    const where = {};
    if (menuWeekId) where.menuWeekId = menuWeekId;
    if (customerId) where.customerId = customerId;
    const items = await prisma.customerPriceOverride.findMany({
      where,
      include: { dish: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const { customerId, menuWeekId, dishId, priceCents } = req.body || {};
    if (!customerId || !menuWeekId || !dishId) {
      return res.status(400).json({ error: 'Missing customerId, menuWeekId, or dishId' });
    }
    const item = await prisma.customerPriceOverride.upsert({
      where: { customerId_menuWeekId_dishId: { customerId, menuWeekId, dishId } },
      update: { priceCents: Number(priceCents) || 0 },
      create: {
        customerId,
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
    await prisma.customerPriceOverride.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
