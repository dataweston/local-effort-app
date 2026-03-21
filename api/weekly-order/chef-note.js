const { PrismaClient } = require('@prisma/client');
const { verifySupabaseToken } = require('./_auth');

let prisma = null;
try { prisma = new PrismaClient(); } catch (_) { prisma = null; }

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const ADMIN_EMAIL = process.env.WEEKLY_ORDER_ADMIN_EMAIL || 'yum@localeffortfood.com';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'hello@localeffortfood.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const supabaseUser = await verifySupabaseToken(req);
  if (!supabaseUser) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findFirst({
    where: { email: supabaseUser.email },
    include: { customer: true },
  });
  if (!user?.customer) return res.status(404).json({ error: 'No customer found' });

  const { message } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const note = await prisma.chefNote.create({
    data: {
      userId: user.id,
      customerId: user.customer.id,
      message: message.trim(),
    },
  });

  // Send email via Brevo
  if (BREVO_API_KEY) {
    const customerName = user.customer.name || user.customer.slug;
    const subject = `📝 Note from ${customerName} — ${user.email}`;
    const htmlContent = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;">
  <h2 style="color:#1f2937;">📝 Note to the Chef</h2>
  <p><strong>From:</strong> ${customerName} (${user.email})</p>
  <div style="margin:16px 0;padding:16px;background:#f1f5f9;border-radius:8px;border-left:4px solid #3b82f6;">
    <p style="margin:0;white-space:pre-wrap;color:#334155;">${message.trim()}</p>
  </div>
  <p style="color:#94a3b8;font-size:12px;">Sent from the Weekly Order portal</p>
</div>`;
    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          to: [{ email: ADMIN_EMAIL }],
          sender: { email: SENDER_EMAIL, name: 'Local Effort' },
          replyTo: { email: user.email, name: customerName },
          subject,
          htmlContent,
        }),
      });
    } catch (err) {
      console.error('[chef-note] email send failed', err);
    }
  }

  return res.status(200).json({ success: true, note });
};
