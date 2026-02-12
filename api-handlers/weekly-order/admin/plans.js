const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const ADMIN_TOKEN = process.env.WEEKLY_ORDER_ADMIN_TOKEN || '';

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const safeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

const checkAdmin = (req) => {
  if (!ADMIN_TOKEN) return false;
  const header = req.headers['x-admin-token'] || '';
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return safeEqual(header, ADMIN_TOKEN) || safeEqual(bearer, ADMIN_TOKEN);
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
    if (!menuWeekId) return res.status(400).json({ error: 'Missing menuWeekId' });
    const where = { menuWeekId };
    if (customerId) where.customerId = customerId;
    const items = await prisma.customerPlan.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const { customerId, menuWeekId, basePriceCents, deliveryFeeCents, notes } = req.body || {};
    if (!customerId || !menuWeekId) {
      return res.status(400).json({ error: 'Missing customerId or menuWeekId' });
    }
    const item = await prisma.customerPlan.upsert({
      where: { customerId_menuWeekId: { customerId, menuWeekId } },
      update: {
        basePriceCents: Number(basePriceCents) || 0,
        deliveryFeeCents: Number(deliveryFeeCents) || 0,
        notes: notes ?? null,
      },
      create: {
        customerId,
        menuWeekId,
        basePriceCents: Number(basePriceCents) || 0,
        deliveryFeeCents: Number(deliveryFeeCents) || 0,
        notes: notes ?? null,
      },
    });
    return res.status(200).json({ item });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await prisma.customerPlan.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
