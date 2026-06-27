/**
 * Hub "This Week" for a customer — the Hub-native replacement for the old
 * Subscriber Portal "This Week" + "Past Menus / Dish Feedback" tabs.
 *
 * GET  /api/hub/customer-week          → this week's menu for the signed-in
 *      customer (filtered by their DishVisibility), each dish carrying the
 *      customer's own thumbs/notes. Self-scoped via resolveHubViewer.
 *
 * POST /api/hub/customer-week          → save dish feedback
 *      body: { dishId, menuWeekId, thumbsUp:boolean, notes? }
 *
 * Reuses the Prisma model the Subscriber Portal used (MenuWeek / MenuWeekItem /
 * DishVisibility / DishFeedback) so existing menu data and feedback carry over
 * unchanged — only the auth + surface move to the Hub.
 */

const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, cleanString } = require('./_http');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

async function loadThisWeek(customerId, userId) {
  const now = new Date();
  let menuWeek = await prisma.menuWeek.findFirst({
    where: { status: { in: ['draft', 'published'] }, weekStart: { gte: now } },
    orderBy: { weekStart: 'asc' },
  });
  if (!menuWeek) {
    menuWeek = await prisma.menuWeek.findFirst({ where: { status: 'published' }, orderBy: { weekStart: 'desc' } });
  }
  if (!menuWeek) return { menuWeek: null, items: [] };

  const menuItems = await prisma.menuWeekItem.findMany({
    where: { menuWeekId: menuWeek.id, isVisible: true },
    include: { dish: { select: { id: true, title: true, description: true, tags: true, allergens: true } } },
    orderBy: { sortOrder: 'asc' },
  });

  // Per-customer visibility: if any rows configured, hide dishes marked canView=false.
  const visibilityRows = await prisma.dishVisibility.findMany({
    where: { menuWeekId: menuWeek.id, customerId },
    select: { dishId: true, canView: true },
  });
  const visibilityMap = new Map(visibilityRows.map((r) => [r.dishId, r.canView]));
  const hasVisibilityConfig = visibilityRows.length > 0;
  const visibleItems = menuItems.filter((item) =>
    !hasVisibilityConfig ? true : visibilityMap.get(item.dishId) !== false);

  const myFeedback = userId
    ? await prisma.dishFeedback.findMany({
        where: { userId, menuWeekId: menuWeek.id },
        select: { dishId: true, thumbsUp: true, notes: true },
      })
    : [];
  const feedbackMap = new Map(myFeedback.map((r) => [r.dishId, { thumbsUp: r.thumbsUp, notes: r.notes }]));

  return {
    menuWeek: { id: menuWeek.id, weekStart: menuWeek.weekStart, status: menuWeek.status },
    items: visibleItems.map((item) => ({
      dishId: item.dishId,
      title: item.dish?.title || '',
      description: item.dish?.description || '',
      tags: item.dish?.tags || [],
      allergens: item.dish?.allergens || [],
      feedback: feedbackMap.get(item.dishId) || null,
    })),
  };
}

async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: true });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const denied = requireHubAccess(auth, { allowedAccess: ['customer', 'staff', 'privileged'] });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const customerId = auth.customer.id;
  const userId = auth.viewer.userId;

  try {
    if (req.method === 'GET') {
      const data = await loadThisWeek(customerId, userId);
      return res.status(200).json({ ok: true, ...data });
    }

    // POST — save this customer's dish feedback.
    if (!userId) return res.status(400).json({ error: 'No user account linked to this customer' });
    const dishId = cleanString(req.body?.dishId, 64);
    const menuWeekId = cleanString(req.body?.menuWeekId, 64);
    const thumbsUp = req.body?.thumbsUp;
    const notes = req.body?.notes !== undefined ? cleanString(req.body.notes, 2000) : null;
    if (!dishId || !menuWeekId || typeof thumbsUp !== 'boolean') {
      return res.status(400).json({ error: 'dishId, menuWeekId, and thumbsUp (boolean) are required' });
    }
    const feedback = await prisma.dishFeedback.upsert({
      where: { userId_dishId_menuWeekId: { userId, dishId, menuWeekId } },
      update: { thumbsUp, notes },
      create: { userId, dishId, menuWeekId, thumbsUp, notes },
    });
    return res.status(200).json({ ok: true, feedback });
  } catch (err) {
    console.error('[hub/customer-week] error', err);
    return res.status(500).json({ error: 'Unable to load or save this week' });
  }
}

module.exports = handler;
