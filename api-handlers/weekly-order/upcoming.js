const { PrismaClient } = require('@prisma/client');
const { resolveAuthorizedCustomer } = require('./_auth');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveAuthorizedCustomer(req, prisma, { requireCustomer: true });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { dbUser, customer } = auth;

  const now = new Date();
  let menuWeek = await prisma.menuWeek.findFirst({
    where: {
      status: { in: ['draft', 'published'] },
      weekStart: { gte: now },
    },
    orderBy: { weekStart: 'asc' },
  });

  if (!menuWeek) {
    menuWeek = await prisma.menuWeek.findFirst({
      where: { status: 'published' },
      orderBy: { weekStart: 'desc' },
    });
  }

  if (!menuWeek) {
    return res.status(200).json({ menuWeek: null, items: [] });
  }

  const menuItems = await prisma.menuWeekItem.findMany({
    where: { menuWeekId: menuWeek.id, isVisible: true },
    include: {
      dish: { select: { id: true, title: true, description: true, tags: true, allergens: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const visibilityRows = await prisma.dishVisibility.findMany({
    where: { menuWeekId: menuWeek.id, customerId: customer.id },
    select: { dishId: true, canView: true },
  });

  const visibilityMap = new Map(visibilityRows.map((row) => [row.dishId, row.canView]));
  const hasVisibilityConfig = visibilityRows.length > 0;

  const visibleItems = menuItems.filter((item) => {
    if (!hasVisibilityConfig) return true;
    return visibilityMap.get(item.dishId) !== false;
  });

  const feedbackRows = dbUser
    ? await prisma.dishFeedback.findMany({
        where: { userId: dbUser.id, menuWeekId: menuWeek.id },
        select: { dishId: true, thumbsUp: true, notes: true },
      })
    : [];
  const feedbackMap = new Map(feedbackRows.map((row) => [row.dishId, { thumbsUp: row.thumbsUp, notes: row.notes }]));

  const allFeedbackRows = await prisma.dishFeedback.findMany({
    where: { menuWeekId: menuWeek.id },
    select: { dishId: true, thumbsUp: true, notes: true },
  });

  const aggregateMap = new Map();
  for (const row of allFeedbackRows) {
    if (!aggregateMap.has(row.dishId)) {
      aggregateMap.set(row.dishId, { up: 0, down: 0, notes: [] });
    }
    const current = aggregateMap.get(row.dishId);
    if (row.thumbsUp) current.up += 1;
    else current.down += 1;
    if (row.notes) current.notes.push(row.notes);
  }

  const items = visibleItems.map((item) => ({
    dishId: item.dishId,
    title: item.dish?.title || '',
    description: item.dish?.description || '',
    tags: item.dish?.tags || [],
    allergens: item.dish?.allergens || [],
    isAddon: item.isAddon,
    includedInPlan: item.includedInPlan,
    feedback: feedbackMap.get(item.dishId) || null,
    allFeedback: aggregateMap.get(item.dishId) || { up: 0, down: 0, notes: [] },
  }));

  return res.status(200).json({
    menuWeek: {
      id: menuWeek.id,
      weekStart: menuWeek.weekStart,
      cutoffAt: menuWeek.cutoffAt,
      status: menuWeek.status,
    },
    items,
  });
};
