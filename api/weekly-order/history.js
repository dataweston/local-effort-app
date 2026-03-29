const { PrismaClient } = require('@prisma/client');
const { verifySupabaseToken } = require('./_auth');

let prisma = null;
try { prisma = new PrismaClient(); } catch (_) { prisma = null; }

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const supabaseUser = await verifySupabaseToken(req);
  if (!supabaseUser) return res.status(401).json({ error: 'Unauthorized' });

  // Try resolving customer by slug first, then fall back to email lookup
  const slug = req.query?.customerSlug;
  let user = null;
  let customer = null;

  if (slug) {
    customer = await prisma.customer.findFirst({ where: { slug } });
  }
  if (!customer) {
    user = await prisma.user.findFirst({
      where: { email: supabaseUser.email },
      include: { customer: true },
    });
    customer = user?.customer || null;
  }
  if (!customer) return res.status(404).json({ error: 'No customer found' });

  // Resolve the user if not already found (for feedback lookup)
  if (!user) {
    user = await prisma.user.findFirst({
      where: { email: supabaseUser.email },
    });
  }

  const limit = Math.min(parseInt(req.query?.limit, 10) || 20, 50);

  const orders = await prisma.order.findMany({
    where: {
      customerId: customer.id,
      status: { in: ['paid', 'submitted'] },
    },
    include: {
      items: { include: { dish: { select: { id: true, title: true, description: true, tags: true, allergens: true } } } },
      menuWeek: { select: { id: true, weekStart: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const menuWeekIds = [...new Set(orders.map((o) => o.menuWeek.id))];

  // Current user's own feedback
  const myFeedback = user ? await prisma.dishFeedback.findMany({
    where: { userId: user.id },
    select: { dishId: true, menuWeekId: true, thumbsUp: true, notes: true },
  }) : [];
  const myFeedbackMap = {};
  myFeedback.forEach((f) => {
    myFeedbackMap[`${f.dishId}-${f.menuWeekId}`] = { thumbsUp: f.thumbsUp, notes: f.notes };
  });

  // All users' feedback for the same menu weeks
  const allFeedback = menuWeekIds.length ? await prisma.dishFeedback.findMany({
    where: { menuWeekId: { in: menuWeekIds } },
    select: { dishId: true, menuWeekId: true, thumbsUp: true, notes: true },
  }) : [];
  // Aggregate: { [dishId-menuWeekId]: { up: n, down: n, notes: string[] } }
  const allFeedbackMap = {};
  allFeedback.forEach((f) => {
    const key = `${f.dishId}-${f.menuWeekId}`;
    if (!allFeedbackMap[key]) allFeedbackMap[key] = { up: 0, down: 0, notes: [] };
    if (f.thumbsUp) allFeedbackMap[key].up++;
    else allFeedbackMap[key].down++;
    if (f.notes) allFeedbackMap[key].notes.push(f.notes);
  });

  const weeks = orders.map((order) => ({
    orderId: order.id,
    weekStart: order.menuWeek.weekStart,
    menuWeekId: order.menuWeek.id,
    status: order.status,
    totalCents: order.totalsCents,
    submittedAt: order.submittedAt,
    items: order.items.map((item) => ({
      dishId: item.dishId,
      title: item.dish?.title || 'Unknown',
      description: item.dish?.description || '',
      tags: item.dish?.tags || [],
      allergens: item.dish?.allergens || [],
      quantity: item.quantity,
      isAddon: item.isAddon,
      feedback: myFeedbackMap[`${item.dishId}-${order.menuWeek.id}`] || null,
      allFeedback: allFeedbackMap[`${item.dishId}-${order.menuWeek.id}`] || null,
    })),
  }));

  return res.status(200).json({ weeks });
};
