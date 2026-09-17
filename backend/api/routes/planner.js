const express = require('express');
const { prisma } = require('../utils/prisma');
const { getSupabase } = require('../supabaseClient');
const { isAdminEmail, isReadOnlyAdminEmail, isReadOnlyMethod } = require('../utils/adminVerifier');
const { postBotMessage } = require('../../../api-handlers/hub/_bot');
const { buildPlannerForecast } = require('../planner/forecast');
const { plannerUidForUser } = require('../planner/identity');
const { reconcilePlannerWorkBlocks } = require('../planner/workBlocks');
const { syncPlannerWorkBlocks } = require('../planner/googleCalendarSync');
const { runPlannerCardLifecycle } = require('../planner/lifecycle');
const { buildPlannerLedger } = require('../planner/ledgerView');
const { projectPlannerCogs } = require('../planner/commercialLedger');

const router = express.Router();
const PLANNER_OBJECT_TYPES = new Set(['shift', 'event', 'prep_task', 'revenue']);

function plannerObjectType(value) {
  return PLANNER_OBJECT_TYPES.has(value) ? value : null;
}

class PlannerCardOwnershipError extends Error {
  constructor(cardId) {
    super(`Planner card ${cardId} belongs to another planner`);
    this.name = 'PlannerCardOwnershipError';
  }
}

function plannerCardRow(card, uid) {
  return {
    id: card.id,
    supabaseUid: uid,
    templateId: card.templateId ?? null,
    title: card.title || 'Untitled',
    date: card.date || '',
    dayOfWeek: card.dayOfWeek || '',
    zone: card.zone || 'timed',
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
    financialMetadata: card.financialMetadata === undefined ? undefined : card.financialMetadata,
    notes: card.notes ?? null,
    optional: card.optional ?? false,
    enabled: card.enabled ?? true,
    effectTarget: card.effectTarget ?? null,
    effectType: card.effectType ?? null,
    sortOrder: card.order ?? card.sortOrder ?? 0,
    status: card.status ?? 'todo',
    projectId: card.projectId ?? null,
    assigneeId: card.assigneeId ?? null,
    priority: card.priority ?? 0,
    dueDate: card.dueDate ?? null,
  };
}

async function applyPlannerCardChanges(prismaClient, uid, cards = [], deleteIds = []) {
  const rowMap = new Map();
  for (const card of cards) {
    if (!card?.id) throw new Error('Every planner card change requires an id');
    rowMap.set(String(card.id), plannerCardRow({ ...card, id: String(card.id) }, uid));
  }
  const rows = [...rowMap.values()];
  const idsToDelete = [...new Set(deleteIds.map(String))].filter((id) => !rowMap.has(id));

  return prismaClient.$transaction(
    async (tx) => {
      const changedIds = rows.map((row) => row.id);
      const affectedIds = [...new Set([...changedIds, ...idsToDelete])];
      const existing = affectedIds.length
        ? await tx.plannerCard.findMany({
            where: { id: { in: affectedIds } },
          })
        : [];
      const changedIdSet = new Set(changedIds);
      const foreign = existing.find(
        (card) => changedIdSet.has(card.id) && card.supabaseUid !== uid
      );
      if (foreign) throw new PlannerCardOwnershipError(foreign.id);

      const deletedIdSet = new Set(idsToDelete);
      const deletedCards = existing.filter(
        (card) => deletedIdSet.has(card.id) && card.supabaseUid === uid
      );
      const deleted = idsToDelete.length
        ? await tx.plannerCard.deleteMany({
            where: { supabaseUid: uid, id: { in: idsToDelete } },
          })
        : { count: 0 };

      const savedCards = [];
      for (const row of rows) {
        const { id, supabaseUid, ...update } = row;
        const saved = await tx.plannerCard.upsert({
          where: { id },
          update,
          create: { id, supabaseUid, ...update },
        });
        savedCards.push(saved?.id ? saved : row);
      }

      await reconcilePlannerWorkBlocks(tx, uid, savedCards, deletedCards);
      return { upserted: rows.length, deleted: deleted.count };
    },
    { timeout: 30000 }
  );
}

async function findPlannerWorkBlocks(prismaClient, uid, cardIds) {
  const ids = [...new Set((cardIds || []).filter(Boolean).map(String))];
  if (!ids.length) return [];
  return prismaClient.plannerWorkBlock.findMany({
    where: { supabaseUid: uid, plannerCardId: { in: ids } },
    orderBy: [{ date: 'asc' }, { blockType: 'asc' }],
  });
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
  if (isReadOnlyAdminEmail(user.email) && !isReadOnlyMethod(req.method)) {
    return res.status(403).json({ error: 'Read-only admin access' });
  }
  req.plannerUid = plannerUidForUser(user);
  req.plannerUser = user;
  next();
}

router.use(requireAuth);

router.get('/forecast', async (req, res) => {
  if (!isAdminEmail(req.plannerUser?.email)) return res.status(403).json({ error: 'admin only' });
  try {
    const forecast = await buildPlannerForecast({ prisma, plannerUid: req.plannerUid });
    return res.status(200).json(forecast);
  } catch (err) {
    console.error('GET /api/planner/forecast error:', err);
    return res.status(500).json({ error: 'Failed to build forecast' });
  }
});

router.get('/ledger', async (req, res) => {
  if (!isAdminEmail(req.plannerUser?.email)) return res.status(403).json({ error: 'admin only' });
  const { from = null, to = null } = req.query;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (
    (from && !datePattern.test(from)) ||
    (to && !datePattern.test(to)) ||
    (from && to && from > to)
  ) {
    return res.status(400).json({ error: 'from and to must be an ordered YYYY-MM-DD range' });
  }
  try {
    const ledger = await buildPlannerLedger({
      prisma,
      plannerUid: req.plannerUid,
      from,
      to,
      refresh: !isReadOnlyAdminEmail(req.plannerUser?.email),
    });
    return res.status(200).json(ledger);
  } catch (err) {
    console.error('GET /api/planner/ledger error:', err);
    return res.status(500).json({ error: 'Failed to build planner ledger' });
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
    const workBlocks = cards.length
      ? await prisma.plannerWorkBlock.findMany({
          where: {
            supabaseUid: uid,
            plannerCardId: { in: cards.map((plannerCard) => plannerCard.id) },
          },
          orderBy: [{ date: 'asc' }, { blockType: 'asc' }],
        })
      : [];

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

    return res.status(200).json({ cards: mapped, workBlocks });
  } catch (err) {
    console.error('GET /api/planner/cards error:', err);
    return res.status(500).json({ error: 'Failed to load cards' });
  }
});

router.post('/cards', async (req, res) => {
  const uid = req.plannerUid;
  const { action, upserts, deleteIds, card, cardId } = req.body || {};

  if (action === 'apply-changes' && Array.isArray(upserts) && Array.isArray(deleteIds)) {
    try {
      const changedCardIds = [...upserts.map((item) => item.id), ...deleteIds];
      const result = await applyPlannerCardChanges(prisma, uid, upserts, deleteIds);
      const lifecycle = await runPlannerCardLifecycle({
        prismaClient: prisma,
        plannerUid: uid,
        cardIds: changedCardIds,
        syncCalendar: isAdminEmail(req.plannerUser?.email),
      });
      const workBlocks = await findPlannerWorkBlocks(prisma, uid, changedCardIds);
      return res.status(200).json({ ok: true, ...result, lifecycle, workBlocks });
    } catch (err) {
      if (err instanceof PlannerCardOwnershipError) {
        return res.status(409).json({ error: 'A changed card belongs to another planner' });
      }
      console.error('POST apply-changes error:', err);
      return res.status(500).json({ error: 'Failed to save card changes' });
    }
  }

  if (action === 'patch-status' && (cardId || card?.id) && card?.status !== undefined) {
    try {
      const id = cardId || card.id;
      const existing = await prisma.plannerCard.findFirst({
        where: { id, supabaseUid: uid },
      });
      if (!existing) return res.status(404).json({ error: 'Planner card not found' });
      await applyPlannerCardChanges(prisma, uid, [{ ...existing, status: card.status }], []);
      const lifecycle = await runPlannerCardLifecycle({
        prismaClient: prisma,
        plannerUid: uid,
        cardIds: [id],
        syncCalendar: isAdminEmail(req.plannerUser?.email),
      });
      const workBlocks = await findPlannerWorkBlocks(prisma, uid, [id]);
      if (card.status === 'done' && card.title) {
        postBotMessage(prisma, {
          objectType: 'planner_card',
          objectId: String(id),
          visibility: 'staff',
          title: card.title,
          body: `✓ ${card.title} marked done`,
        }).catch(() => {});
      }
      return res.status(200).json({ ok: true, lifecycle, workBlocks });
    } catch (err) {
      console.error('POST patch-status error:', err);
      return res.status(500).json({ error: 'Failed to update status' });
    }
  }

  if (action === 'delete' && (cardId || card?.id)) {
    try {
      const result = await applyPlannerCardChanges(prisma, uid, [], [cardId || card.id]);
      const lifecycle = await runPlannerCardLifecycle({
        prismaClient: prisma,
        plannerUid: uid,
        cardIds: [cardId || card.id],
        syncCalendar: isAdminEmail(req.plannerUser?.email),
      });
      const workBlocks = await findPlannerWorkBlocks(prisma, uid, [cardId || card.id]);
      return res.status(200).json({ ok: true, ...result, lifecycle, workBlocks });
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
        const existing = await prisma.plannerCOGS.findUnique({
          where: { id: item.id },
          select: { supabaseUid: true },
        });
        if (existing && existing.supabaseUid !== uid) {
          return res.status(409).json({ error: 'COGS item belongs to another planner' });
        }
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
        const projection = await projectPlannerCogs({
          prisma,
          plannerUid: uid,
          items: [updated],
        });
        return res.status(200).json({ ok: true, item: updated, projection });
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
      const projection = await projectPlannerCogs({
        prisma,
        plannerUid: uid,
        items: [created],
      });
      return res.status(200).json({ ok: true, item: created, projection });
    } catch (err) {
      console.error('POST cogs upsert error:', err);
      return res.status(500).json({ error: 'Failed to save COGS' });
    }
  }

  if (action === 'delete' && id) {
    try {
      const deleted = await prisma.plannerCOGS.deleteMany({ where: { id, supabaseUid: uid } });
      if (deleted.count) {
        await prisma.financeCostObligation.updateMany({
          where: { sourceSystem: 'planner_cogs', sourceId: id },
          data: { status: 'void', outstandingCents: 0 },
        });
      }
      return res.status(200).json({ ok: true, deleted: deleted.count });
    } catch (err) {
      console.error('POST cogs delete error:', err);
      return res.status(500).json({ error: 'Failed to delete COGS' });
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
});

// ─── GOOGLE SYNC ─────────────────────────────────────────

router.post('/google-sync', async (req, res) => {
  if (!isAdminEmail(req.plannerUser?.email)) return res.status(403).json({ error: 'admin only' });
  const {
    cardIds = [],
    weekStart = null,
    from: requestedFrom = null,
    to: requestedTo = null,
    force = false,
  } = req.body || {};
  if (!Array.isArray(cardIds) || cardIds.length > 100) {
    return res.status(400).json({ error: 'cardIds must be an array of at most 100 ids' });
  }
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  let from = requestedFrom;
  let to = requestedTo;
  if (weekStart) {
    if (!datePattern.test(weekStart))
      return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
    const end = new Date(`${weekStart}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 6);
    from = weekStart;
    to = end.toISOString().slice(0, 10);
  }
  if ((from && !datePattern.test(from)) || (to && !datePattern.test(to))) {
    return res.status(400).json({ error: 'from and to must be YYYY-MM-DD' });
  }

  try {
    const result = await syncPlannerWorkBlocks({
      prismaClient: prisma,
      plannerUid: req.plannerUid,
      cardIds,
      from,
      to,
      force: Boolean(force),
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('POST google-sync error:', err);
    return res.status(503).json({ error: err.message || 'Google Calendar sync unavailable' });
  }
});

// ─── PROJECTS ────────────────────────────────────────────

const CANONICAL_PROJECTS = [
  {
    slug: 'weekly-ops',
    title: 'Weekly Ops',
    color: '#6b7c3f',
    sortOrder: 0,
    description: 'Menu cycles, dish assignments, weekly prep',
  },
  {
    slug: 'subscriber-fulfillment',
    title: 'Subscriber Fulfillment',
    color: '#4a7c9e',
    sortOrder: 1,
    description: 'Order processing, deliveries, subscriber issues',
  },
  {
    slug: 'vendor-relations',
    title: 'Vendor Relations',
    color: '#b07d3a',
    sortOrder: 2,
    description: 'Purchase orders, price changes, delivery issues',
  },
  {
    slug: 'kitchen-staffing',
    title: 'Kitchen Staffing',
    color: '#9e4a4a',
    sortOrder: 3,
    description: 'Shifts, labor targets, training',
  },
  {
    slug: 'happy-monday',
    title: 'Happy Monday / Partners',
    color: '#7c4a9e',
    sortOrder: 4,
    description: 'Wholesale order pipeline, partner management',
  },
  {
    slug: 'brain-systems',
    title: 'Brain / Systems',
    color: '#4a5568',
    sortOrder: 5,
    description: 'Feature backlog and development work',
  },
];

const CANONICAL_SPACES = [
  { key: 'all-hands', title: 'All Hands', visibility: 'staff' },
  { key: 'kitchen', title: 'Kitchen', visibility: 'staff' },
  { key: 'admin', title: 'Admin', visibility: 'admin' },
  { key: 'ops-alerts', title: 'Ops Alerts', visibility: 'admin' },
  { key: 'menu-announcements', title: 'Menu Announcements', visibility: 'customer' },
  { key: 'chef-notes', title: 'Chef Notes', visibility: 'customer' },
  { key: 'partner-announcements', title: 'Partner Announcements', visibility: 'staff' },
];

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapProject(p) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    color: p.color,
    spaceKey: p.spaceKey,
    targetDate: p.targetDate,
    sortOrder: p.sortOrder,
  };
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
          update: {
            title: p.title,
            color: p.color,
            description: p.description,
            sortOrder: p.sortOrder,
          },
          create: { supabaseUid: uid, ...p },
        });
      }

      let org = await prisma.hubOrganization.findFirst({ where: { slug: 'local-effort' } });
      if (!org) {
        org = await prisma.hubOrganization.create({
          data: { name: 'Local Effort', slug: 'local-effort' },
        });
      }
      for (const s of CANONICAL_SPACES) {
        const exists = await prisma.hubSpace.findFirst({
          where: { organizationId: org.id, key: s.key },
        });
        if (!exists) {
          await prisma.hubSpace.create({
            data: { organizationId: org.id, key: s.key, title: s.title, visibility: s.visibility },
          });
        }
      }

      const projects = await prisma.plannerProject.findMany({
        where: { supabaseUid: uid },
        orderBy: { sortOrder: 'asc' },
      });
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
        data: {
          supabaseUid: uid,
          slug,
          title: project.title,
          description: project.description ?? null,
          color: project.color ?? null,
          spaceKey: project.spaceKey ?? null,
          targetDate: project.targetDate ?? null,
          sortOrder: project.sortOrder ?? 0,
        },
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

module.exports = {
  createPlannerRouter,
  __internals: {
    plannerObjectType,
    plannerUidForUser,
    applyPlannerCardChanges,
    PlannerCardOwnershipError,
  },
};
