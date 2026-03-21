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

  const user = await prisma.user.findFirst({ where: { email: supabaseUser.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { customerSlug, message } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const customer = customerSlug
    ? await prisma.customer.findFirst({ where: { slug: customerSlug } })
    : null;

  const note = await prisma.chefNote.create({
    data: {
      userId: user.id,
      customerId: customer?.id || null,
      message: message.trim(),
    },
  });

  // Send email via Brevo
  if (BREVO_API_KEY) {
    const subject = `Chef Note from ${supabaseUser.email}`;
    const htmlContent = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;">
  <h2 style="color:#1f2937;">📝 Note to Chef</h2>
  <p><strong>From:</strong> ${supabaseUser.email}</p>
  ${customer ? `<p><strong>Customer:</strong> ${customer.name || customerSlug}</p>` : ''}
  <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin-top:12px;">
    <p style="white-space:pre-wrap;">${message.trim()}</p>
  </div>
</div>`;
    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          to: [{ email: ADMIN_EMAIL }],
          sender: { email: SENDER_EMAIL, name: 'Local Effort' },
          subject,
          htmlContent,
        }),
      });
    } catch (err) {
      console.error('[chef-note] email notification failed', err);
    }
  }

  return res.status(200).json({ note });
};
