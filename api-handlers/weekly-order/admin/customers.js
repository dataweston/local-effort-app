const { prisma } = require('../../_lib/prisma');
const { requireWeeklyOrderAdmin } = require('./_auth');


module.exports = async (req, res) => {
  if (!prisma) {
    return res.status(500).json({ error: 'Database not configured' });
  }
  const admin = await requireWeeklyOrderAdmin(req, res);
  if (!admin) return;

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
