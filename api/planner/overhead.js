const { PrismaClient } = require('@prisma/client');
const { verifySupabaseToken } = require('./_auth');

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

  const user = await verifySupabaseToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const uid = user.id;

  if (req.method === 'GET') {
    try {
      const items = await prisma.plannerOverhead.findMany({
        where: { supabaseUid: uid },
        orderBy: { createdAt: 'asc' },
      });
      return res.status(200).json({ items });
    } catch (err) {
      console.error('GET /api/planner/overhead error:', err);
      return res.status(500).json({ error: 'Failed to load overhead' });
    }
  }

  if (req.method === 'POST') {
    const { action, item, id } = req.body || {};

    if (action === 'upsert' && item) {
      try {
        if (item.id) {
          const updated = await prisma.plannerOverhead.upsert({
            where: { id: item.id },
            update: { name: item.name, monthlyCost: item.monthlyCost || 0 },
            create: {
              supabaseUid: uid,
              name: item.name || 'Expense',
              monthlyCost: item.monthlyCost || 0,
            },
          });
          return res.status(200).json({ ok: true, item: updated });
        }
        const created = await prisma.plannerOverhead.create({
          data: {
            supabaseUid: uid,
            name: item.name || 'Expense',
            monthlyCost: item.monthlyCost || 0,
          },
        });
        return res.status(200).json({ ok: true, item: created });
      } catch (err) {
        console.error('POST overhead upsert error:', err);
        return res.status(500).json({ error: 'Failed to save overhead' });
      }
    }

    if (action === 'delete' && id) {
      try {
        await prisma.plannerOverhead.deleteMany({
          where: { id, supabaseUid: uid },
        });
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('POST overhead delete error:', err);
        return res.status(500).json({ error: 'Failed to delete overhead' });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
