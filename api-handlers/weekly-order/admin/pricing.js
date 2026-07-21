const { prisma } = require('../../_lib/prisma');
const { requireWeeklyOrderAdmin } = require('./_auth');


module.exports = async (req, res) => {
  if (!prisma) {
    return res.status(500).json({ error: 'Database not configured' });
  }
  const admin = await requireWeeklyOrderAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    const menuWeekId = req.query?.menuWeekId;
    if (!menuWeekId) return res.status(400).json({ error: 'Missing menuWeekId' });
    const menuItems = await prisma.menuWeekItem.findMany({
      where: { menuWeekId },
      include: { dish: true },
      orderBy: { sortOrder: 'asc' },
    });
    const priceRows = await prisma.dishPrice.findMany({
      where: { menuWeekId },
    });
    const priceMap = new Map();
    priceRows.forEach((row) => {
      const key = `${row.dishId}-${row.tier}`;
      priceMap.set(key, row);
    });
    const items = menuItems.map((item) => ({
      ...item,
      prices: {
        subscriber: priceMap.get(`${item.dishId}-subscriber`)?.priceCents ?? null,
        member: priceMap.get(`${item.dishId}-member`)?.priceCents ?? null,
      },
    }));
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const { menuWeekId, dishId, tier, priceCents } = req.body || {};
    if (!menuWeekId || !dishId || !tier) {
      return res.status(400).json({ error: 'Missing menuWeekId, dishId, or tier' });
    }
    const item = await prisma.dishPrice.upsert({
      where: { menuWeekId_dishId_tier: { menuWeekId, dishId, tier } },
      update: { priceCents: Number(priceCents) || 0 },
      create: {
        menuWeekId,
        dishId,
        tier,
        priceCents: Number(priceCents) || 0,
      },
    });
    return res.status(200).json({ item });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
