const express = require('express');
const { prisma } = require('../utils/prisma');
const { getSupabase } = require('../supabaseClient');
const { isAdminEmail } = require('../utils/adminVerifier');
const { postBotMessage } = require('../../../api-handlers/hub/_bot');
const { buildPlannerForecast } = require('../planner/forecast');

const router = express.Router();
const PLANNER_OBJECT_TYPES = new Set(['shift', 'event', 'prep_task', 'revenue']);

function plannerObjectType(value) {
  return PLANNER_OBJECT_TYPES.has(value) ? value : null;
}

async function saveAllPlannerCards(prismaClient, uid, bulkCards) {
  const rows = bulkCards.map((c) => ({
    id: c.id,
    supabaseUid: uid,
    templateId: c.templateId ?? null,
    title: c.title || 'Untitled',
    date: c.date || '',
    dayOfWeek: c.dayOfWeek || '',
    zone: c.zone || 'timed',
    objectType: plannerObjectType(c.objectType),
    people: c.people || [],
    startTime: c.startTime ?? null,
    endTime: c.endTime ?? null,
    revenue: c.revenue ?? 0,
    revenueCents: c.revenueCents ?? null,
    cashReceivedCents: c.cashReceivedCents ?? 0,
    cost: c.cost ?? 0,
    costCents: c.costCents ?? null,
    costPerHour: c.costPerHour ?? null,
    costPerHourCents: c.costPerHourCents ?? null,
    financialStatus: c.financialStatus ?? null,
    financialSource: c.financialSource ?? null,
    financialMetadata: c.financialMetadata ?? undefined,
    notes: c.notes ?? null,
    optional: c.optional ?? false,
    enabled: c.enabled ?? true,
    effectTarget: c.effectTarget ?? null,
    effectType: c.effectType ?? null,
    sortOrder: c.order ?? c.sortOrder ?? 0,
    status: c.status ?? 'todo',
    projectId: c.projectId ?? null,
    assigneeId: c.assigneeId ?? null,
    priority: c.priority ?? 0,
    dueDate: c.dueDate ?? null,
  }));
  const rowIds = [...new Set(rows.map((row) => row.id).filter(Boolean))];

  await prismaClient.$transaction(async (tx) => {
    if (rowIds.length === 0) {
      await tx.plannerCard.deleteMany({ where: { supabaseUid: uid } });
      return;
    }

    await tx.plannerCard.deleteMany({
      where: { supabaseUid: uid, id: { notIn: rowIds } },
    });

    for (const row of rows) {
      await tx.plannerCard.upsert({
        where: { id: row.id },
        update: {
          supabaseUid: uid,
          templateId: row.templateId,
          title: row.title,
          date: row.date,
          dayOfWeek: row.dayOfWeek,
          zone: row.zone,
          objectType: row.objectType,
          people: row.people,
          startTime: row.startTime,
          endTime: row.endTime,
          revenue: row.revenue,
          revenueCents: row.revenueCents,
          cashReceivedCents: row.cashReceivedCents,
          cost: row.cost,
          costCents: row.costCents,
          costPerHour: row.costPerHour,
          costPerHourCents: row.costPerHourCents,
          financialStatus: row.financialStatus,
          financialSource: row.financialSource,
          financialMetadata: row.financialMetadata,
          notes: row.notes,
          optional: row.optional,
          enabled: row.enabled,
          effectTarget: row.effectTarget,
          effectType: row.effectType,
          sortOrder: row.sortOrder,
          status: row.status,
          projectId: row.projectId,
          assigneeId: row.assigneeId,
          priority: row.priority,
          dueDate: row.dueDate,
        },
        create: row,
      });
    }
  }, { timeout: 30000 });

  return rows.length;
}

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
  req.plannerUser = user;
  next();
}

router.use(requireAuth);

router.get('/forecast', async (req, res) => {
  if (!isAdminEmail(req.plannerUser?.email)) return res.status(403).json({ error: 'admin only' });
  try {
    const plannerUid = process.env.HUB_MASTER_SUPABASE_UID
      || process.env.VITE_HUB_MASTER_SUPABASE_UID
      || req.plannerUid;
    const forecast = await buildPlannerForecast({ prisma, plannerUid });
    return res.status(200).json(forecast);
  } catch (err) {
    console.error('GET /api/planner/forecast error:', err);
    return res.status(500).json({ error: 'Failed to build forecast' });
  }
});

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
      objectType: c.objectType ?? null,
      people: c.people || [],
      startTime: c.startTime,
      endTime: c.endTime,
      revenue: c.revenue,
      revenueCents: c.revenueCents,
      cashReceivedCents: c.cashReceivedCents,
      cost: c.cost,
      costCents: c.costCents,
      costPerHour: c.costPerHour,
      costPerHourCents: c.costPerHourCents,
      financialStatus: c.financialStatus,
      financialSource: c.financialSource,
      financialMetadata: c.financialMetadata,
      notes: c.notes,
      optional: c.optional,
      enabled: c.enabled,
      effectTarget: c.effectTarget,
      effectType: c.effectType,
      order: c.sortOrder,
      status: c.status ?? 'todo',
      projectId: c.projectId ?? null,
      assigneeId: c.assigneeId ?? null,
      priority: c.priority ?? 0,
      dueDate: c.dueDate ?? null,
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
      const count = await saveAllPlannerCards(prisma, uid, bulkCards);
      return res.status(200).json({ ok: true, count });
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
          objectType: plannerObjectType(card.objectType),
          people: card.people || [],
          startTime: card.startTime ?? null,
          endTime: card.endTime ?? null,
          revenue: card.revenue ?? 0,
          revenueCents: card.revenueCents ?? null,
          cashReceivedCents: card.cashReceivedCents ?? 0,
          cost: card.cost ?? 0,
          costCents: card.costCents ?? null,
          costPerHour: card.costPerHour ?? null,
          costPerHourCents: card.costPerHourCents ?? null,
          financialStatus: card.financialStatus ?? null,
          financialSource: card.financialSource ?? null,
          financialMetadata: card.financialMetadata ?? undefined,
          notes: card.notes ?? null,
          optional: card.optional ?? false,
          enabled: card.enabled ?? true,
          effectType: card.effectType ?? null,
          effectTarget: card.effectTarget ?? null,
          status: card.status ?? 'todo',
          projectId: card.projectId ?? null,
          assigneeId: card.assigneeId ?? null,
          priority: card.priority ?? 0,
          dueDate: card.dueDate ?? null,
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

  if (action === 'patch-status' && (cardId || card?.id) && card?.status !== undefined) {
    try {
      const id = cardId || card.id;
      await prisma.plannerCard.updateMany({
        where: { id, supabaseUid: uid },
        data: { status: card.status },
      });
      if (card.status === 'done' && card.title) {
        postBotMessage(prisma, {
          objectType: 'planner_card',
          objectId: String(id),
          visibility: 'staff',
          title: card.title,
          body: `✓ ${card.title} marked done`,
        }).catch(() => {});
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('POST patch-status error:', err);
      return res.status(500).json({ error: 'Failed to update status' });
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
          update: {
            name: item.name,
            amount: item.amount || 0,
            amountCents: item.amountCents ?? null,
            weekStart: item.weekStart,
            status: item.status || 'projected',
            source: item.source || null,
            notes: item.notes || null,
          },
          create: {
            supabaseUid: uid,
            weekStart: item.weekStart || '',
            name: item.name || 'Expense',
            amount: item.amount || 0,
            amountCents: item.amountCents ?? null,
            status: item.status || 'projected',
            source: item.source || null,
            notes: item.notes || null,
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
          amountCents: item.amountCents ?? null,
          status: item.status || 'projected',
          source: item.source || null,
          notes: item.notes || null,
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

// ─── PROJECTS ────────────────────────────────────────────

const CANONICAL_PROJECTS = [
  { slug: 'weekly-ops',             title: 'Weekly Ops',              color: '#6b7c3f', sortOrder: 0, description: 'Menu cycles, dish assignments, weekly prep' },
  { slug: 'subscriber-fulfillment', title: 'Subscriber Fulfillment',  color: '#4a7c9e', sortOrder: 1, description: 'Order processing, deliveries, subscriber issues' },
  { slug: 'vendor-relations',       title: 'Vendor Relations',        color: '#b07d3a', sortOrder: 2, description: 'Purchase orders, price changes, delivery issues' },
  { slug: 'kitchen-staffing',       title: 'Kitchen Staffing',        color: '#9e4a4a', sortOrder: 3, description: 'Shifts, labor targets, training' },
  { slug: 'happy-monday',           title: 'Happy Monday / Partners', color: '#7c4a9e', sortOrder: 4, description: 'Wholesale order pipeline, partner management' },
  { slug: 'brain-systems',          title: 'Brain / Systems',         color: '#4a5568', sortOrder: 5, description: 'Feature backlog and development work' },
];

const CANONICAL_SPACES = [
  { key: 'all-hands',              title: 'All Hands',             visibility: 'staff' },
  { key: 'kitchen',               title: 'Kitchen',               visibility: 'staff' },
  { key: 'admin',                 title: 'Admin',                 visibility: 'admin' },
  { key: 'ops-alerts',            title: 'Ops Alerts',            visibility: 'admin' },
  { key: 'menu-announcements',    title: 'Menu Announcements',    visibility: 'customer' },
  { key: 'chef-notes',            title: 'Chef Notes',            visibility: 'customer' },
  { key: 'partner-announcements', title: 'Partner Announcements', visibility: 'staff' },
];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function mapProject(p) {
  return { id: p.id, slug: p.slug, title: p.title, description: p.description, color: p.color, spaceKey: p.spaceKey, targetDate: p.targetDate, sortOrder: p.sortOrder };
}

router.get('/projects', async (req, res) => {
  try {
    const projects = await prisma.plannerProject.findMany({
      where: { supabaseUid: req.plannerUid },
      orderBy: { sortOrder: 'asc' },
    });
    return res.status(200).json({ projects: projects.map(mapProject) });
  } catch (err) {
    console.error('GET /api/planner/projects error:', err);
    return res.status(500).json({ error: 'Failed to load projects' });
  }
});

router.post('/projects', async (req, res) => {
  const uid = req.plannerUid;
  const { action, project, projectId } = req.body || {};

  if (action === 'seed-defaults') {
    try {
      for (const p of CANONICAL_PROJECTS) {
        await prisma.plannerProject.upsert({
          where: { supabaseUid_slug: { supabaseUid: uid, slug: p.slug } },
          update: { title: p.title, color: p.color, description: p.description, sortOrder: p.sortOrder },
          create: { supabaseUid: uid, ...p },
        });
      }

      let org = await prisma.hubOrganization.findFirst({ where: { slug: 'local-effort' } });
      if (!org) {
        org = await prisma.hubOrganization.create({ data: { name: 'Local Effort', slug: 'local-effort' } });
      }
      for (const s of CANONICAL_SPACES) {
        const exists = await prisma.hubSpace.findFirst({ where: { organizationId: org.id, key: s.key } });
        if (!exists) {
          await prisma.hubSpace.create({ data: { organizationId: org.id, key: s.key, title: s.title, visibility: s.visibility } });
        }
      }

      const projects = await prisma.plannerProject.findMany({ where: { supabaseUid: uid }, orderBy: { sortOrder: 'asc' } });
      return res.status(200).json({ ok: true, projects: projects.map(mapProject) });
    } catch (err) {
      console.error('POST /api/planner/projects seed-defaults error:', err);
      return res.status(500).json({ error: 'Failed to seed defaults' });
    }
  }

  if (action === 'create' && project?.title) {
    try {
      const slug = project.slug || slugify(project.title);
      const created = await prisma.plannerProject.create({
        data: { supabaseUid: uid, slug, title: project.title, description: project.description ?? null, color: project.color ?? null, spaceKey: project.spaceKey ?? null, targetDate: project.targetDate ?? null, sortOrder: project.sortOrder ?? 0 },
      });
      return res.status(201).json({ ok: true, project: mapProject(created) });
    } catch (err) {
      console.error('POST /api/planner/projects create error:', err);
      return res.status(500).json({ error: 'Failed to create project' });
    }
  }

  if (action === 'update' && projectId && project) {
    try {
      await prisma.plannerProject.updateMany({
        where: { id: projectId, supabaseUid: uid },
        data: {
          ...(project.title !== undefined && { title: project.title }),
          ...(project.description !== undefined && { description: project.description }),
          ...(project.color !== undefined && { color: project.color }),
          ...(project.spaceKey !== undefined && { spaceKey: project.spaceKey }),
          ...(project.targetDate !== undefined && { targetDate: project.targetDate }),
          ...(project.sortOrder !== undefined && { sortOrder: project.sortOrder }),
        },
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('POST /api/planner/projects update error:', err);
      return res.status(500).json({ error: 'Failed to update project' });
    }
  }

  if (action === 'delete' && projectId) {
    try {
      await prisma.plannerProject.deleteMany({ where: { id: projectId, supabaseUid: uid } });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('POST /api/planner/projects delete error:', err);
      return res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
});

function createPlannerRouter() {
  return router;
}

module.exports = { createPlannerRouter, __internals: { plannerObjectType, saveAllPlannerCards } };
