const { PrismaClient } = require('@prisma/client');
const { findUserByEmail, resolveAuthorizedCustomer } = require('./_auth');

let prisma = null;
try { prisma = new PrismaClient(); } catch (_) { prisma = null; }

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const ADMIN_EMAIL = process.env.WEEKLY_ORDER_ADMIN_EMAIL || 'yum@localeffortfood.com';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'hello@localeffortfood.com';

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

async function notifyAdmin(userEmail, dish, feedback) {
  if (!BREVO_API_KEY) return;
  const label = feedback.thumbsUp ? 'Thumbs Up' : 'Thumbs Down';
  const subject = `Dish Feedback: ${dish.title} - ${userEmail}`;
  const htmlContent = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;">
  <h2 style="color:#1f2937;">Dish Feedback</h2>
  <p><strong>Dish:</strong> ${escapeHtml(dish.title)}</p>
  <p><strong>From:</strong> ${escapeHtml(userEmail)}</p>
  <p><strong>Rating:</strong> ${label}</p>
  ${feedback.notes ? `<p><strong>Notes:</strong> ${escapeHtml(feedback.notes).replace(/\n/g, '<br />')}</p>` : ''}
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

  const auth = await resolveAuthorizedCustomer(req, prisma, { requireCustomer: req.method !== 'GET' });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { supabaseUser, customer, isAdmin } = auth;

  const user = auth.dbUser || await findUserByEmail(prisma, supabaseUser.email);
  if (!user) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'POST') {
    const { dishId, menuWeekId, thumbsUp, notes } = req.body || {};
    if (!dishId || !menuWeekId || typeof thumbsUp !== 'boolean') {
      return res.status(400).json({ error: 'dishId, menuWeekId, and thumbsUp (boolean) are required' });
    }

    const dish = await prisma.dish.findUnique({ where: { id: dishId }, select: { title: true } });
    if (!dish) return res.status(404).json({ error: 'Dish not found' });

    if (!isAdmin) {
      const matchingOrder = await prisma.order.findFirst({
        where: {
          customerId: customer.id,
          menuWeekId,
          status: { in: ['paid', 'submitted'] },
          items: { some: { dishId } },
        },
        select: { id: true },
      });
      if (!matchingOrder) return res.status(403).json({ error: 'Forbidden' });
    }

    const cleanNotes = typeof notes === 'string' ? notes.trim().slice(0, 2000) : '';
    const feedback = await prisma.dishFeedback.upsert({
      where: { userId_dishId_menuWeekId: { userId: user.id, dishId, menuWeekId } },
      update: { thumbsUp, notes: cleanNotes || null },
      create: { userId: user.id, dishId, menuWeekId, thumbsUp, notes: cleanNotes || null },
    });

    notifyAdmin(supabaseUser.email, dish, { thumbsUp, notes: cleanNotes });

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
