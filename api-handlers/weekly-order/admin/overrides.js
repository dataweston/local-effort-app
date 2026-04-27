const { PrismaClient } = require('@prisma/client');
const { requireWeeklyOrderAdmin } = require('./_auth');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

module.exports = async (req, res) => {
  if (!prisma) {
    return res.status(500).json({ error: 'Database not configured' });
  }
  const admin = await requireWeeklyOrderAdmin(req, res);
  if (!admin) return;

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
