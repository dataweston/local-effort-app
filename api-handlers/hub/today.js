const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { toIsoDate, endOfLocalDay, getWeekEnd } = require('./_dates');
const { plannerCardObjectType } = require('./_planner');


function asIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatWeekRange(weekStart) {
  if (!weekStart) return 'Weekly menu';
  const start = new Date(weekStart);
  const end = getWeekEnd(start);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function publicCustomer(customer) {
  if (!customer) return null;
  return {
    id: customer.id,
    slug: customer.slug,
    name: customer.name || null,
  };
}

function statusFromOrder(order) {
  if (!order) return 'open';
  if (order.status === 'paid' || order.status === 'submitted') return 'done';
  if (order.status === 'draft') return 'open';
  return 'pending_review';
}

async function resolveMenuWeek() {
  const now = new Date();
  const upcoming = await prisma.menuWeek.findFirst({
    where: {
      status: 'published',
      cutoffAt: { gte: now },
    },
    orderBy: { weekStart: 'asc' },
  });
  if (upcoming) return upcoming;
  return prisma.menuWeek.findFirst({
    where: { status: 'published' },
    orderBy: { weekStart: 'desc' },
  });
}

async function buildMenuSlice({ customer, dbUser }) {
  if (!customer) return { actions: [], objects: [], threads: [] };

  const menuWeek = await resolveMenuWeek();
  if (!menuWeek) return { actions: [], objects: [], threads: [] };

  const [items, visibilityRows, currentOrders, feedbackRows, legacyNotes] = await Promise.all([
    prisma.menuWeekItem.findMany({
      where: { menuWeekId: menuWeek.id, isVisible: true },
      include: {
        dish: { select: { id: true, title: true, description: true, tags: true, allergens: true } },
        section: { select: { slug: true, title: true, sortOrder: true } },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.dishVisibility.findMany({
      where: { menuWeekId: menuWeek.id, customerId: customer.id },
      select: { dishId: true, canView: true },
    }),
    prisma.order.findMany({
      where: {
        menuWeekId: menuWeek.id,
        customerId: customer.id,
        ...(dbUser ? { userId: dbUser.id } : {}),
      },
      include: { items: { select: { dishId: true, quantity: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    dbUser
      ? prisma.dishFeedback.findMany({
          where: { userId: dbUser.id, menuWeekId: menuWeek.id },
          select: { dishId: true, thumbsUp: true, notes: true },
        })
      : Promise.resolve([]),
    prisma.chefNote.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 1,
    }),
  ]);

  const visibility = new Map(visibilityRows.map((row) => [row.dishId, row.canView]));
  const hasVisibilityConfig = visibilityRows.length > 0;
  const visibleItems = items.filter((item) => !hasVisibilityConfig || visibility.get(item.dishId) !== false);
  const feedbackDishIds = new Set(feedbackRows.map((row) => row.dishId));
  const currentOrder =
    currentOrders.find((order) => order.status === 'paid' || order.status === 'submitted') ||
    currentOrders.find((order) => order.status === 'draft') ||
    null;
  const cutoffPassed = new Date(menuWeek.cutoffAt) < new Date();

  const actions = [];
  actions.push({
    id: `menu-week:${menuWeek.id}:order`,
    title: cutoffPassed ? 'Review this week menu' : 'Choose this week menu',
    objectType: 'menu_week',
    objectId: menuWeek.id,
    dueAt: asIso(menuWeek.cutoffAt),
    status: cutoffPassed || statusFromOrder(currentOrder) === 'done' ? statusFromOrder(currentOrder) : 'open',
    visibility: 'customer',
    source: 'weekly_order',
    metadata: {
      cutoffPassed,
      itemCount: visibleItems.length,
      orderId: currentOrder?.id || null,
      orderStatus: currentOrder?.status || null,
    },
  });

  const orderedDishIds = new Set((currentOrder?.items || []).map((item) => item.dishId));
  const feedbackDue = visibleItems
    .filter((item) => orderedDishIds.size === 0 || orderedDishIds.has(item.dishId))
    .filter((item) => !feedbackDishIds.has(item.dishId))
    .slice(0, 4);

  feedbackDue.forEach((item) => {
    actions.push({
      id: `dish:${item.dishId}:feedback:${menuWeek.id}`,
      title: `Rate ${item.dish?.title || 'dish'}`,
      objectType: 'menu_week',
      objectId: menuWeek.id,
      dueAt: null,
      status: 'open',
      visibility: 'customer',
      source: 'weekly_order_feedback',
      metadata: {
        dishId: item.dishId,
        dishTitle: item.dish?.title || null,
      },
    });
  });

  const objects = [{
    id: `menu_week:${menuWeek.id}`,
    type: 'menu_week',
    title: `Weekly menu: ${formatWeekRange(menuWeek.weekStart)}`,
    subtitle: `${visibleItems.length} visible dishes`,
    horizon: cutoffPassed ? 'week' : 'today',
    visibility: 'customer',
    scheduleStatus: cutoffPassed ? 'planned' : 'time_blocked',
    source: 'subscriber_portal',
    startsAt: asIso(menuWeek.weekStart),
    endsAt: asIso(menuWeek.cutoffAt),
    objectId: menuWeek.id,
    metadata: {
      status: menuWeek.status,
      cutoffPassed,
      dishes: visibleItems.slice(0, 8).map((item) => ({
        id: item.dishId,
        title: item.dish?.title || '',
        tags: item.dish?.tags || [],
        allergens: item.dish?.allergens || [],
        section: item.section?.title || null,
      })),
    },
  }];

  const threads = legacyNotes.length
    ? [{
        id: `legacy-chef-note:${legacyNotes[0].id}`,
        objectType: 'menu_week',
        objectId: menuWeek.id,
        title: 'Chef note',
        visibility: 'customer',
        unreadCount: 0,
        lastMessageAt: asIso(legacyNotes[0].createdAt),
        preview: legacyNotes[0].message,
      }]
    : [];

  return { actions, objects, threads };
}

async function buildPlannerSlice({ supabaseUid }) {
  const today = new Date();
  const todayDate = toIsoDate(today);
  const tomorrowDate = toIsoDate(endOfLocalDay(today));
  if (!todayDate) return { actions: [], objects: [] };

  const cards = await prisma.plannerCard.findMany({
    where: {
      supabaseUid,
      date: { gte: todayDate, lte: tomorrowDate || todayDate },
      enabled: true,
      objectType: { not: 'revenue' },
    },
    orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }],
    take: 25,
  });

  const objects = cards.map((card) => ({
    id: `planner_card:${card.id}`,
    type: plannerCardObjectType(card),
    title: card.title,
    subtitle: card.people?.length ? card.people.join(', ') : null,
    horizon: card.date === todayDate ? 'today' : 'week',
    visibility: 'staff',
    scheduleStatus: card.startTime ? 'time_blocked' : 'planned',
    source: 'weekly_planner',
    startsAt: card.startTime ? `${card.date}T${card.startTime}:00` : null,
    endsAt: card.endTime ? `${card.date}T${card.endTime}:00` : null,
    objectId: card.id,
    metadata: {
      date: card.date,
      dayOfWeek: card.dayOfWeek,
      people: card.people || [],
      optional: card.optional,
      effectType: card.effectType,
    },
  }));

  const actions = cards
    .filter((card) => card.optional)
    .slice(0, 5)
    .map((card) => ({
      id: `planner_card:${card.id}:plan`,
      title: `Decide on ${card.title}`,
      objectType: plannerCardObjectType(card),
      objectId: card.id,
      dueAt: card.startTime ? `${card.date}T${card.startTime}:00` : null,
      status: 'open',
      visibility: 'staff',
      source: 'weekly_planner',
      metadata: { cardId: card.id },
    }));

  return { actions, objects };
}

async function buildSpaces({ customer, isAdmin, roles }) {
  const spaces = [];

  if (customer) {
    spaces.push({
      id: `customer:${customer.id}`,
      title: customer.name || customer.slug,
      role: roles.includes('subscriber') ? 'subscriber' : 'member',
      visibility: 'household',
      unreadCount: 0,
      objectCount: 1,
    });
  }

  if (isAdmin) {
    spaces.push({
      id: 'admin:operations',
      title: 'Operations',
      role: 'admin',
      visibility: 'admin',
      unreadCount: 0,
      objectCount: 0,
    });
  }

  return spaces;
}

function objectThreadWhere(auth, menuObjectIds) {
  if (auth.isStaff) {
    const objectFilters = menuObjectIds.map((id) => ({ objectType: 'menu_week', objectId: id }));
    if (!objectFilters.length) return null;
    return {
      OR: objectFilters,
      visibility: {
        in: auth.isPrivileged
          ? ['customer', 'household', 'staff', 'vendor', 'volunteer', 'guest', 'admin']
          : ['staff'],
      },
    };
  }

  if (!auth.customer?.id) return null;
  return {
    OR: [
      { objectType: 'customer', objectId: auth.customer.id },
      { objectType: 'household', objectId: auth.customer.id },
    ],
    visibility: { in: ['customer', 'household'] },
  };
}

async function buildObjectThreads({ auth, menuObjectIds }) {
  if (!prisma.objectThread?.findMany) return [];
  const where = objectThreadWhere(auth, menuObjectIds);
  if (!where) return [];

  const threads = await prisma.objectThread.findMany({
    where,
    include: {
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  return threads.map((thread) => ({
    id: thread.id,
    objectType: thread.objectType,
    objectId: thread.objectId,
    title: thread.title,
    visibility: thread.visibility,
    unreadCount: 0,
    lastMessageAt: asIso(thread.messages?.[0]?.createdAt || thread.updatedAt),
    preview: thread.messages?.[0]?.body || null,
  }));
}

async function countAdminInbox({ isAdmin }) {
  if (!isAdmin) return undefined;
  return prisma.brainInboxItem.count({ where: { status: 'pending' } }).catch(() => 0);
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, {
    allowedAccess: ['localist', 'customer', 'staff', 'privileged'],
  });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  try {
    const [menuSlice, plannerSlice, inboxCount] = await Promise.all([
      buildMenuSlice({ customer: auth.customer, dbUser: auth.dbUser }),
      auth.isStaff
        ? buildPlannerSlice({ supabaseUid: auth.supabaseUser.id })
        : Promise.resolve({ actions: [], objects: [] }),
      countAdminInbox({ isAdmin: auth.isPrivileged }),
    ]);

    const menuObjectIds = menuSlice.objects
      .filter((object) => object.type === 'menu_week' && object.objectId)
      .map((object) => object.objectId);

    const [spaces, objectThreads] = await Promise.all([
      buildSpaces({ customer: auth.customer, isAdmin: auth.isPrivileged, roles: auth.roles }),
      buildObjectThreads({ auth, menuObjectIds }),
    ]);

    const threads = [...objectThreads, ...menuSlice.threads];
    const actions = [...menuSlice.actions, ...plannerSlice.actions]
      .sort((a, b) => String(a.dueAt || '').localeCompare(String(b.dueAt || '')))
      .slice(0, 30);
    const objects = [...menuSlice.objects, ...plannerSlice.objects].slice(0, 40);
    const dueActionCount = actions.filter((action) => action.status === 'open').length;
    const unreadThreadCount = threads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0);

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      viewer: auth.viewer,
      customer: publicCustomer(auth.customer),
      summary: {
        criticalChangeCount: 0,
        dueActionCount,
        unreadThreadCount,
        ...(inboxCount !== undefined ? { inboxCount } : {}),
      },
      actions,
      objects,
      spaces,
      threads,
    });
  } catch (err) {
    console.error('[hub/today] error', err);
    return res.status(500).json({ error: 'Unable to load hub today' });
  }
};

module.exports.buildObjectThreads = buildObjectThreads;
module.exports.objectThreadWhere = objectThreadWhere;
