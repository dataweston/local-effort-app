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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const { customerSlug, message } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const auth = await resolveAuthorizedCustomer(req, prisma);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { supabaseUser, customer } = auth;

  const dbUser = auth.dbUser || await findUserByEmail(prisma, supabaseUser.email);
  if (!dbUser) return res.status(403).json({ error: 'Forbidden' });

  const note = await prisma.chefNote.create({
    data: {
      userId: dbUser.id,
      customerId: customer.id,
      message: message.trim(),
    },
  });

  if (BREVO_API_KEY) {
    const customerName = customer.name || customerSlug || 'Subscriber';
    const subject = `Note from ${customerName} - ${supabaseUser.email}`;
    const safeCustomerName = escapeHtml(customerName);
    const safeUserEmail = escapeHtml(supabaseUser.email);
    const safeMessage = escapeHtml(message.trim()).replace(/\n/g, '<br />');
    const htmlContent = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;">
  <h2 style="color:#1f2937;">Note to the Chef</h2>
  <p><strong>From:</strong> ${safeCustomerName} (${safeUserEmail})</p>
  <div style="margin:16px 0;padding:16px;background:#f1f5f9;border-radius:8px;border-left:4px solid #3b82f6;">
    <p style="margin:0;white-space:pre-wrap;color:#334155;">${safeMessage}</p>
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
          replyTo: { email: supabaseUser.email, name: customerName },
          subject,
          htmlContent,
        }),
      });
    } catch (err) {
      console.error('[chef-note] email notification failed', err);
    }
  }

  return res.status(200).json({ success: true, note });
};
