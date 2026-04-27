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
    const q = (req.query?.q || '').toString().toLowerCase();
    const items = await prisma.dish.findMany({
      orderBy: { title: 'asc' },
      where: q
        ? {
            title: { contains: q, mode: 'insensitive' },
          }
        : undefined,
    });
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const { id, title, description, tags = [], categories = [], allergens = [], status } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: 'Missing title' });
    }
    const data = {
      title,
      description: description || null,
      tags,
      categories,
      allergens,
      status: status || 'approved',
    };
    const item = id
      ? await prisma.dish.update({ where: { id }, data })
      : await prisma.dish.create({ data });
    return res.status(200).json({ item });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
