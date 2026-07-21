const { prisma } = require('../_lib/prisma');
const { resolveHubViewer } = require('./_auth');
const { methodNotAllowed, asIso, cleanString } = require('./_http');
const { cardToObject, plannerCardObjectType } = require('./_planner');


function splitObjectId(rawId, queryType) {
  const id = cleanString(rawId, 160);
  const type = cleanString(queryType, 80);
  if (!id) return { type, id: null };
  const sep = id.indexOf(':');
  if (sep > 0) {
    return { type: id.slice(0, sep), id: id.slice(sep + 1) };
  }
  return { type, id };
}

async function buildMenuWeekDetail(auth, id) {
  if (!auth.customer) return null;
  const menuWeek = await prisma.menuWeek.findUnique({ where: { id } });
  if (!menuWeek) return null;

  const [items, visibilityRows, order, feedbackRows, legacyNotes] = await Promise.all([
    prisma.menuWeekItem.findMany({
      where: { menuWeekId: id, isVisible: true },
      include: {
        dish: true,
        section: { select: { slug: true, title: true, sortOrder: true } },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.dishVisibility.findMany({
      where: { menuWeekId: id, customerId: auth.customer.id },
      select: { dishId: true, canView: true },
    }),
    prisma.order.findFirst({
      where: {
        menuWeekId: id,
        customerId: auth.customer.id,
        ...(auth.viewer.userId ? { userId: auth.viewer.userId } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }),
    auth.viewer.userId
      ? prisma.dishFeedback.findMany({
          where: { userId: auth.viewer.userId, menuWeekId: id },
          select: { dishId: true, thumbsUp: true, notes: true, createdAt: true },
        })
      : Promise.resolve([]),
    prisma.chefNote.findMany({
      where: { customerId: auth.customer.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const visibility = new Map(visibilityRows.map((row) => [row.dishId, row.canView]));
  const hasVisibilityConfig = visibilityRows.length > 0;
  const visibleItems = items.filter((item) => !hasVisibilityConfig || visibility.get(item.dishId) !== false);
  const feedbackByDish = new Map(feedbackRows.map((row) => [row.dishId, row]));

  const object = {
    id: `menu_week:${menuWeek.id}`,
    type: 'menu_week',
    title: 'Weekly menu',
    subtitle: auth.customer.name || auth.customer.slug,
    horizon: 'week',
    visibility: 'customer',
    scheduleStatus: new Date(menuWeek.cutoffAt) < new Date() ? 'planned' : 'time_blocked',
    source: 'subscriber_portal',
    startsAt: asIso(menuWeek.weekStart),
    endsAt: asIso(menuWeek.cutoffAt),
    objectId: menuWeek.id,
    metadata: {
      status: menuWeek.status,
      cutoffAt: asIso(menuWeek.cutoffAt),
    },
    detail: {
      customer: {
        id: auth.customer.id,
        slug: auth.customer.slug,
        name: auth.customer.name || null,
      },
      dishes: visibleItems.map((item) => ({
        id: item.dishId,
        title: item.dish?.title || '',
        description: item.dish?.description || '',
        tags: item.dish?.tags || [],
        allergens: item.dish?.allergens || [],
        isAddon: item.isAddon,
        includedInPlan: item.includedInPlan,
        section: item.section || null,
        feedback: feedbackByDish.get(item.dishId) || null,
      })),
      order: order
        ? {
            id: order.id,
            status: order.status,
            totalsCents: order.totalsCents,
            submittedAt: asIso(order.submittedAt),
            items: order.items,
          }
        : null,
      legacyChefNotes: legacyNotes.map((note) => ({
        id: note.id,
        message: note.message,
        createdAt: asIso(note.createdAt),
      })),
    },
  };

  const actions = visibleItems
    .filter((item) => !feedbackByDish.has(item.dishId))
    .slice(0, 6)
    .map((item) => ({
      id: `dish:${item.dishId}:feedback:${menuWeek.id}`,
      title: `Rate ${item.dish?.title || 'dish'}`,
      objectType: 'menu_week',
      objectId: menuWeek.id,
      dueAt: null,
      status: 'open',
      visibility: 'customer',
      source: 'weekly_order_feedback',
      metadata: { dishId: item.dishId },
    }));

  const threads = legacyNotes.slice(0, 1).map((note) => ({
    id: `legacy-chef-note:${note.id}`,
    objectType: 'menu_week',
    objectId: menuWeek.id,
    title: 'Chef note',
    visibility: 'customer',
    unreadCount: 0,
    lastMessageAt: asIso(note.createdAt),
    preview: note.message,
  }));

  return { object, actions, threads };
}

async function buildPlannerCardDetail(auth, id) {
  const card = await prisma.plannerCard.findFirst({
    where: {
      id,
      ...(auth.isAdmin ? {} : { supabaseUid: auth.viewer.supabaseUid }),
    },
  });
  if (!card || card.objectType === 'revenue') return null;
  const {
    revenue: _revenue,
    revenueCents: _revenueCents,
    cashReceivedCents: _cashReceivedCents,
    cost: _cost,
    costCents: _costCents,
    costPerHour: _costPerHour,
    costPerHourCents: _costPerHourCents,
    financialStatus: _financialStatus,
    financialSource: _financialSource,
    financialMetadata: _financialMetadata,
    ...publicPlannerCard
  } = card;
  return {
    object: {
      ...cardToObject(card),
      detail: {
        plannerCard: publicPlannerCard,
      },
    },
    actions: card.optional
      ? [{
          id: `planner_card:${card.id}:plan`,
          title: `Decide on ${card.title}`,
          objectType: plannerCardObjectType(card),
          objectId: card.id,
          dueAt: card.startTime ? `${card.date}T${card.startTime}:00` : null,
          status: 'open',
          visibility: 'staff',
          source: 'weekly_planner',
          metadata: { cardId: card.id },
        }]
      : [],
    threads: [],
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const parsed = splitObjectId(req.params?.id || req.query?.id, req.query?.type);
  if (!parsed.id) return res.status(400).json({ error: 'object id is required' });

  try {
    let detail = null;
    if (parsed.type === 'menu_week') {
      detail = await buildMenuWeekDetail(auth, parsed.id);
    } else if (parsed.type === 'planner_card' || parsed.type === 'shift' || parsed.type === 'prep_task') {
      detail = await buildPlannerCardDetail(auth, parsed.id);
    }

    if (!detail) return res.status(404).json({ error: 'Object not found' });

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      ...detail,
    });
  } catch (err) {
    console.error('[hub/objects] error', err);
    return res.status(500).json({ error: 'Unable to load hub object' });
  }
};
