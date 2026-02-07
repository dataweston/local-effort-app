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

  // GET — fetch cards, optionally filtered by date range
  if (req.method === 'GET') {
    try {
      const { weekStart, month } = req.query;
      let where = { supabaseUid: uid };

      if (weekStart) {
        const start = weekStart;
        const d = new Date(start + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() + 6);
        const end = d.toISOString().slice(0, 10);
        where.date = { gte: start, lte: end };
      } else if (month) {
        const [y, m] = month.split('-').map(Number);
        const start = `${y}-${String(m).padStart(2, '0')}-01`;
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        where.date = { gte: start, lte: end };
      }

      const cards = await prisma.plannerCard.findMany({
        where,
        orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }],
      });

      const mapped = cards.map((c) => ({
        id: c.id,
        templateId: c.templateId,
        title: c.title,
        date: c.date,
        dayOfWeek: c.dayOfWeek,
        zone: c.zone,
        people: c.people || [],
        startTime: c.startTime,
        endTime: c.endTime,
        revenue: c.revenue,
        cost: c.cost,
        costPerHour: c.costPerHour,
        optional: c.optional,
        enabled: c.enabled,
        effectTarget: c.effectTarget,
        effectType: c.effectType,
        order: c.sortOrder,
      }));

      return res.status(200).json({ cards: mapped });
    } catch (err) {
      console.error('GET /api/planner/cards error:', err);
      return res.status(500).json({ error: 'Failed to load cards' });
    }
  }

  // POST — save/upsert/delete/recurring operations
  if (req.method === 'POST') {
    const { action, cards: bulkCards, card, cardId, templateId, date, mode } = req.body || {};

    if (action === 'save-all' && Array.isArray(bulkCards)) {
      try {
        const idMap = {};

        await prisma.$transaction(async (tx) => {
          await tx.plannerCard.deleteMany({ where: { supabaseUid: uid } });

          for (const c of bulkCards) {
            const oldId = c.id;
            const created = await tx.plannerCard.create({
              data: {
                supabaseUid: uid,
                templateId: c.templateId || null,
                title: c.title || 'Untitled',
                date: c.date || '',
                dayOfWeek: c.dayOfWeek || '',
                zone: c.zone || 'timed',
                people: c.people || [],
                startTime: c.startTime || null,
                endTime: c.endTime || null,
                revenue: c.revenue || 0,
                cost: c.cost || 0,
                costPerHour: c.costPerHour || null,
                optional: c.optional || false,
                enabled: c.enabled !== false,
                effectTarget: c.effectTarget || null,
                effectType: c.effectType || null,
                sortOrder: c.order ?? c.sortOrder ?? 0,
              },
            });
            idMap[oldId] = created.id;
          }

          for (const c of bulkCards) {
            if (c.effectTarget && idMap[c.effectTarget] && idMap[c.id]) {
              await tx.plannerCard.update({
                where: { id: idMap[c.id] },
                data: { effectTarget: idMap[c.effectTarget] },
              });
            }
          }
        });

        return res.status(200).json({ ok: true, count: bulkCards.length });
      } catch (err) {
        console.error('POST save-all error:', err);
        return res.status(500).json({ error: 'Failed to save cards' });
      }
    }

    if (action === 'update-recurring' && card && mode === 'future') {
      try {
        await prisma.plannerCard.updateMany({
          where: {
            supabaseUid: uid,
            templateId: card.templateId,
            date: { gte: card.date },
          },
          data: {
            title: card.title,
            zone: card.zone,
            people: card.people || [],
            startTime: card.startTime || null,
            endTime: card.endTime || null,
            revenue: card.revenue || 0,
            cost: card.cost || 0,
            costPerHour: card.costPerHour || null,
            optional: card.optional || false,
            enabled: card.enabled !== false,
            effectType: card.effectType || null,
          },
        });
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('POST update-recurring error:', err);
        return res.status(500).json({ error: 'Failed to update recurring cards' });
      }
    }

    if (action === 'delete-recurring' && templateId && date && mode === 'future') {
      try {
        await prisma.plannerCard.deleteMany({
          where: {
            supabaseUid: uid,
            templateId,
            date: { gte: date },
          },
        });
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('POST delete-recurring error:', err);
        return res.status(500).json({ error: 'Failed to delete recurring cards' });
      }
    }

    if (action === 'delete' && (cardId || card?.id)) {
      try {
        await prisma.plannerCard.deleteMany({
          where: { id: cardId || card.id, supabaseUid: uid },
        });
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('POST delete error:', err);
        return res.status(500).json({ error: 'Failed to delete card' });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
