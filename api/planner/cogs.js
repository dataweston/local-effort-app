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
      const { weekStart, month } = req.query;
      let where = { supabaseUid: uid };

      if (weekStart) {
        where.weekStart = weekStart;
      } else if (month) {
        // Fetch all COGS for weeks that overlap this month
        const [y, m] = month.split('-').map(Number);
        const start = `${y}-${String(m).padStart(2, '0')}-01`;
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        where.weekStart = { gte: start, lte: end };
      }

      const items = await prisma.plannerCOGS.findMany({
        where,
        orderBy: [{ weekStart: 'asc' }, { createdAt: 'asc' }],
      });
      return res.status(200).json({ items });
    } catch (err) {
      console.error('GET /api/planner/cogs error:', err);
      return res.status(500).json({ error: 'Failed to load COGS' });
    }
  }

  if (req.method === 'POST') {
    const { action, item, id } = req.body || {};

    if (action === 'upsert' && item) {
      try {
        if (item.id) {
          const updated = await prisma.plannerCOGS.upsert({
            where: { id: item.id },
            update: { name: item.name, amount: item.amount || 0, weekStart: item.weekStart },
            create: {
              supabaseUid: uid,
              weekStart: item.weekStart || '',
              name: item.name || 'Expense',
              amount: item.amount || 0,
            },
          });
          return res.status(200).json({ ok: true, item: updated });
        }
        const created = await prisma.plannerCOGS.create({
          data: {
            supabaseUid: uid,
            weekStart: item.weekStart || '',
            name: item.name || 'Expense',
            amount: item.amount || 0,
          },
        });
        return res.status(200).json({ ok: true, item: created });
      } catch (err) {
        console.error('POST cogs upsert error:', err);
        return res.status(500).json({ error: 'Failed to save COGS' });
      }
    }

    if (action === 'delete' && id) {
      try {
        await prisma.plannerCOGS.deleteMany({
          where: { id, supabaseUid: uid },
        });
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('POST cogs delete error:', err);
        return res.status(500).json({ error: 'Failed to delete COGS' });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
