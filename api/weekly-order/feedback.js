const { PrismaClient } = require('@prisma/client');
const { verifySupabaseToken } = require('./_auth');

let prisma = null;
try { prisma = new PrismaClient(); } catch (_) { prisma = null; }

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const ADMIN_EMAIL = process.env.WEEKLY_ORDER_ADMIN_EMAIL || 'yum@localeffortfood.com';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'hello@localeffortfood.com';

async function notifyAdmin(userEmail, dish, feedback) {
  if (!BREVO_API_KEY) return;
  const emoji = feedback.thumbsUp ? '👍' : '👎';
  const subject = `${emoji} Dish Feedback: ${dish.title} — ${userEmail}`;
  const htmlContent = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;">
  <h2 style="color:#1f2937;">${emoji} Dish Feedback</h2>
  <p><strong>Dish:</strong> ${dish.title}</p>
  <p><strong>From:</strong> ${userEmail}</p>
  <p><strong>Rating:</strong> ${feedback.thumbsUp ? 'Thumbs Up' : 'Thumbs Down'}</p>
  ${feedback.notes ? `<p><strong>Notes:</strong> ${feedback.notes}</p>` : ''}
</div>`;
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        to: [{ email: ADMIN_EMAIL }],
        sender: { email: SENDER_EMAIL, name: 'Local Effort' },
        replyTo: { email: userEmail },
        subject,
        htmlContent,
      }),
    });
  } catch (err) {
    console.error('[feedback] email notification failed', err);
  }
}

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

    const dish = await prisma.dish.findUnique({ where: { id: dishId }, select: { title: true } });

    const feedback = await prisma.dishFeedback.upsert({
      where: { userId_dishId_menuWeekId: { userId: user.id, dishId, menuWeekId } },
      update: { thumbsUp, notes: notes || null },
      create: { userId: user.id, dishId, menuWeekId, thumbsUp, notes: notes || null },
    });

    notifyAdmin(supabaseUser.email, dish || { title: 'Unknown dish' }, { thumbsUp, notes });

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
