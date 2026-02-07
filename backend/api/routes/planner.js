const express = require('express');
const { prisma } = require('../utils/prisma');
const { getSupabase } = require('../supabaseClient');

const router = express.Router();

// --- Auth helper: verify Supabase JWT and return user ---
async function verifySupabaseToken(req) {
  const supabase = getSupabase();
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !supabase) return null;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

// Auth middleware for all planner routes
async function requireAuth(req, res, next) {
  if (!prisma) return res.status(500).json({ error: 'Database not configured' });
  const user = await verifySupabaseToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.plannerUid = user.id;
  next();
}

router.use(requireAuth);

// ─── CARDS ───────────────────────────────────────────────

router.get('/cards', async (req, res) => {
  try {
    const uid = req.plannerUid;
    const { weekStart, month } = req.query;
    let where = { supabaseUid: uid };

    if (weekStart) {
      const d = new Date(weekStart + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + 6);
      const end = d.toISOString().slice(0, 10);
      where.date = { gte: weekStart, lte: end };
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
});

router.post('/cards', async (req, res) => {
  const uid = req.plannerUid;
  const { action, cards: bulkCards, card, cardId, templateId, date, mode } = req.body || {};

  if (action === 'save-all' && Array.isArray(bulkCards)) {
    try {
      // Collect the IDs the client is sending so we can detect deletions
      const clientIds = new Set(bulkCards.map((c) => c.id).filter(Boolean));

      await prisma.$transaction(async (tx) => {
        // Fetch all existing card IDs for this user
        const existing = await tx.plannerCard.findMany({
          where: { supabaseUid: uid },
          select: { id: true },
        });

        // Delete cards that the client no longer has (user deleted them)
        const toDelete = existing.filter((e) => !clientIds.has(e.id)).map((e) => e.id);
        if (toDelete.length > 0) {
          await tx.plannerCard.deleteMany({ where: { id: { in: toDelete }, supabaseUid: uid } });
        }

        // Upsert each card from the client
        for (const c of bulkCards) {
          const data = {
            supabaseUid: uid,
            templateId: c.templateId ?? null,
            title: c.title || 'Untitled',
            date: c.date || '',
            dayOfWeek: c.dayOfWeek || '',
            zone: c.zone || 'timed',
            people: c.people || [],
            startTime: c.startTime ?? null,
            endTime: c.endTime ?? null,
            revenue: c.revenue ?? 0,
            cost: c.cost ?? 0,
            costPerHour: c.costPerHour ?? null,
            optional: c.optional ?? false,
            enabled: c.enabled ?? true,
            effectTarget: c.effectTarget ?? null,
            effectType: c.effectType ?? null,
            sortOrder: c.order ?? c.sortOrder ?? 0,
          };
          await tx.plannerCard.upsert({
            where: { id: c.id || '' },
            update: data,
            create: { id: c.id || undefined, ...data },
          });
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
        where: { supabaseUid: uid, templateId: card.templateId, date: { gte: card.date } },
        data: {
          title: card.title,
          zone: card.zone,
          people: card.people || [],
          startTime: card.startTime ?? null,
          endTime: card.endTime ?? null,
          revenue: card.revenue ?? 0,
          cost: card.cost ?? 0,
          costPerHour: card.costPerHour ?? null,
          optional: card.optional ?? false,
          enabled: card.enabled ?? true,
          effectType: card.effectType ?? null,
          effectTarget: card.effectTarget ?? null,
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
        where: { supabaseUid: uid, templateId, date: { gte: date } },
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
});

// ─── OVERHEAD ────────────────────────────────────────────

router.get('/overhead', async (req, res) => {
  try {
    const items = await prisma.plannerOverhead.findMany({
      where: { supabaseUid: req.plannerUid },
      orderBy: { createdAt: 'asc' },
    });
    return res.status(200).json({ items });
  } catch (err) {
    console.error('GET /api/planner/overhead error:', err);
    return res.status(500).json({ error: 'Failed to load overhead' });
  }
});

router.post('/overhead', async (req, res) => {
  const uid = req.plannerUid;
  const { action, item, id } = req.body || {};

  if (action === 'upsert' && item) {
    try {
      if (item.id) {
        const updated = await prisma.plannerOverhead.upsert({
          where: { id: item.id },
          update: { name: item.name, monthlyCost: item.monthlyCost || 0 },
          create: { supabaseUid: uid, name: item.name || 'Expense', monthlyCost: item.monthlyCost || 0 },
        });
        return res.status(200).json({ ok: true, item: updated });
      }
      const created = await prisma.plannerOverhead.create({
        data: { supabaseUid: uid, name: item.name || 'Expense', monthlyCost: item.monthlyCost || 0 },
      });
      return res.status(200).json({ ok: true, item: created });
    } catch (err) {
      console.error('POST overhead upsert error:', err);
      return res.status(500).json({ error: 'Failed to save overhead' });
    }
  }

  if (action === 'delete' && id) {
    try {
      await prisma.plannerOverhead.deleteMany({ where: { id, supabaseUid: uid } });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('POST overhead delete error:', err);
      return res.status(500).json({ error: 'Failed to delete overhead' });
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
});

// ─── COGS ────────────────────────────────────────────────

router.get('/cogs', async (req, res) => {
  try {
    const uid = req.plannerUid;
    const { weekStart, month } = req.query;
    let where = { supabaseUid: uid };

    if (weekStart) {
      where.weekStart = weekStart;
    } else if (month) {
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
});

router.post('/cogs', async (req, res) => {
  const uid = req.plannerUid;
  const { action, item, id } = req.body || {};

  if (action === 'upsert' && item) {
    try {
      if (item.id) {
        const updated = await prisma.plannerCOGS.upsert({
          where: { id: item.id },
          update: { name: item.name, amount: item.amount || 0, weekStart: item.weekStart },
          create: { supabaseUid: uid, weekStart: item.weekStart || '', name: item.name || 'Expense', amount: item.amount || 0 },
        });
        return res.status(200).json({ ok: true, item: updated });
      }
      const created = await prisma.plannerCOGS.create({
        data: { supabaseUid: uid, weekStart: item.weekStart || '', name: item.name || 'Expense', amount: item.amount || 0 },
      });
      return res.status(200).json({ ok: true, item: created });
    } catch (err) {
      console.error('POST cogs upsert error:', err);
      return res.status(500).json({ error: 'Failed to save COGS' });
    }
  }

  if (action === 'delete' && id) {
    try {
      await prisma.plannerCOGS.deleteMany({ where: { id, supabaseUid: uid } });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('POST cogs delete error:', err);
      return res.status(500).json({ error: 'Failed to delete COGS' });
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
});

// ─── GOOGLE SYNC ─────────────────────────────────────────

router.post('/google-sync', async (req, res) => {
  // Placeholder — requires Google API credentials to function
  return res.status(501).json({ error: 'Google Calendar sync not yet configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.' });
});

function createPlannerRouter() {
  return router;
}

module.exports = { createPlannerRouter };
