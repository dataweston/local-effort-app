const { PrismaClient } = require('@prisma/client');
const { verifySupabaseToken } = require('./_auth');

let prisma = null;
try { prisma = new PrismaClient(); } catch (_) { prisma = null; }

// Email notifications moved to nightly digest: api/digest/meal-feedback.js

module.exports = async (req, res) => {
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const supabaseUser = await verifySupabaseToken(req);
  if (!supabaseUser) return res.status(401).json({ error: 'Unauthorized' });

  // Find or create a user record for this email
  let user = await prisma.user.findFirst({ where: { email: supabaseUser.email } });
  if (!user) {
    // Try to resolve a customer from the request for linking
    const slug = req.body?.customerSlug || req.query?.customerSlug;
    let customerId = null;
    if (slug) {
      const cust = await prisma.customer.findFirst({ where: { slug } });
      customerId = cust?.id || null;
    }
    user = await prisma.user.create({
      data: { email: supabaseUser.email, role: 'subscriber', ...(customerId ? { customerId } : {}) },
    });
  }

  if (req.method === 'POST') {
    const { dishId, menuWeekId, thumbsUp, notes } = req.body || {};
    if (!dishId || !menuWeekId || typeof thumbsUp !== 'boolean') {
      return res.status(400).json({ error: 'dishId, menuWeekId, and thumbsUp (boolean) are required' });
    }

    const feedback = await prisma.dishFeedback.upsert({
      where: { userId_dishId_menuWeekId: { userId: user.id, dishId, menuWeekId } },
      update: { thumbsUp, notes: notes || null },
      create: { userId: user.id, dishId, menuWeekId, thumbsUp, notes: notes || null },
    });

    // Per-feedback emails replaced by nightly digest: api/digest/meal-feedback.js

    return res.status(200).json({ feedback });
  }

  if (req.method === 'GET') {
    const feedback = await prisma.dishFeedback.findMany({
      where: { userId: user.id },
      select: { dishId: true, menuWeekId: true, thumbsUp: true, notes: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ feedback });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
