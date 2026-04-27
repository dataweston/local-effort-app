/**
 * GET /api/weekly-order/upcoming
 *
 * Returns upcoming or current-week dishes for the authenticated customer,
 * filtered by DishVisibility. Includes any feedback the user has already
 * left so the UI can show pre-filled ratings.
 *
 * Query params:
 *   customerSlug — optional, admin can request another customer's view
 *
 * Response shape mirrors history.js for easy reuse of DishFeedbackRow:
 * {
 *   menuWeek: { id, weekStart, cutoffAt, status },
 *   items: [{ dishId, title, description, tags, allergens, feedback }]
 * }
 */

const { PrismaClient } = require('@prisma/client');
const { resolveAuthorizedCustomer } = require('./_auth');

let prisma = null;
try { prisma = new PrismaClient(); } catch (_) { prisma = null; }

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveAuthorizedCustomer(req, prisma, { requireCustomer: true });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { dbUser, customer } = auth;

  // Find the nearest upcoming (or current) menu week — draft or published
  const now = new Date();
  let menuWeek = await prisma.menuWeek.findFirst({
    where: {
      status: { in: ['draft', 'published'] },
      weekStart: { gte: now },
    },
    orderBy: { weekStart: 'asc' },
  });

  // Fall back to the most recent published week if nothing upcoming
  if (!menuWeek) {
    menuWeek = await prisma.menuWeek.findFirst({
      where: { status: 'published' },
      orderBy: { weekStart: 'desc' },
    });
  }

  if (!menuWeek) {
    return res.status(200).json({ menuWeek: null, items: [] });
  }

  // Load all menu items for this week
  const menuItems = await prisma.menuWeekItem.findMany({
    where: { menuWeekId: menuWeek.id, isVisible: true },
    include: {
      dish: { select: { id: true, title: true, description: true, tags: true, allergens: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  // Load DishVisibility for this customer so we can filter to their dishes
  const visibilityRows = await prisma.dishVisibility.findMany({
    where: { menuWeekId: menuWeek.id, customerId: customer.id },
    select: { dishId: true, canView: true },
  });
  const visibilityMap = new Map(visibilityRows.map(v => [v.dishId, v.canView]));

  // If no visibility rows exist for this customer, treat all items as visible
  // (visibility rows are only created when specific per-client assignment is used)
  const hasVisibilityConfig = visibilityRows.length > 0;

  const visibleItems = menuItems.filter(item => {
    if (!hasVisibilityConfig) return true;
    return visibilityMap.get(item.dishId) !== false;
  });

  // Load any existing feedback this user has left for this week
  const feedbackRows = dbUser
    ? await prisma.dishFeedback.findMany({
        where: { userId: dbUser.id, menuWeekId: menuWeek.id },
        select: { dishId: true, thumbsUp: true, notes: true },
      })
    : [];
  const feedbackMap = new Map(feedbackRows.map(f => [f.dishId, { thumbsUp: f.thumbsUp, notes: f.notes }]));

  // Aggregate feedback across all users for each dish (for the social tally)
  const allFeedbackRows = await prisma.dishFeedback.findMany({
    where: { menuWeekId: menuWeek.id },
    select: { dishId: true, thumbsUp: true, notes: true },
  });
  const aggMap = new Map();
  for (const f of allFeedbackRows) {
    if (!aggMap.has(f.dishId)) aggMap.set(f.dishId, { up: 0, down: 0, notes: [] });
    const agg = aggMap.get(f.dishId);
    if (f.thumbsUp) agg.up++; else agg.down++;
    if (f.notes) agg.notes.push(f.notes);
  }

  const items = visibleItems.map(item => ({
    dishId: item.dishId,
    title: item.dish?.title || '',
    description: item.dish?.description || '',
    tags: item.dish?.tags || [],
    allergens: item.dish?.allergens || [],
    isAddon: item.isAddon,
    includedInPlan: item.includedInPlan,
    feedback: feedbackMap.get(item.dishId) || null,
    allFeedback: aggMap.get(item.dishId) || { up: 0, down: 0, notes: [] },
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
