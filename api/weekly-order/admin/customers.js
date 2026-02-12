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
    const items = await prisma.customer.findMany({
      orderBy: { slug: 'asc' },
      include: { users: true },
    });
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const { id, slug, name, planRulesJson, priceTierDefault } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const item = await prisma.customer.update({
      where: { id },
      data: {
        slug: slug ?? undefined,
        name: name ?? undefined,
        planRulesJson: planRulesJson ?? undefined,
        priceTierDefault: priceTierDefault ?? undefined,
      },
    });
    return res.status(200).json({ item });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
