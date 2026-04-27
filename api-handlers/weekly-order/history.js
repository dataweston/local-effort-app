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

  const auth = await resolveAuthorizedCustomer(req, prisma);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { dbUser: user, customer } = auth;

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

  const feedback = user ? await prisma.dishFeedback.findMany({
    where: { userId: user.id },
    select: { dishId: true, menuWeekId: true, thumbsUp: true, notes: true },
  }) : [];
  const feedbackMap = {};
  feedback.forEach((f) => {
    feedbackMap[`${f.dishId}-${f.menuWeekId}`] = { thumbsUp: f.thumbsUp, notes: f.notes };
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
      feedback: feedbackMap[`${item.dishId}-${order.menuWeek.id}`] || null,
    })),
  }));

  return res.status(200).json({ weeks });
};
