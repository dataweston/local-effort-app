/**
 * POST /api/digest/meal-feedback
 *
 * Nightly cron endpoint: collects all DishFeedback records from the past 24 hours
 * and sends a single summary email to the admin instead of one email per rating.
 *
 * Secured by CRON_SECRET header (set in Vercel env → CRON_SECRET).
 * Vercel cron config: see vercel.json → crons
 */

const { PrismaClient } = require('@prisma/client');

let prisma = null;
try { prisma = new PrismaClient(); } catch (_) { prisma = null; }

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const ADMIN_EMAIL = process.env.WEEKLY_ORDER_ADMIN_EMAIL || 'yum@localeffortfood.com';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'hello@localeffortfood.com';
const CRON_SECRET = process.env.CRON_SECRET;

module.exports = async (req, res) => {
  // Only allow POST (Vercel cron uses GET, but POST from manual trigger too)
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  const authHeader = req.headers['authorization'] || '';
  const secret = authHeader.replace(/^Bearer\s+/, '') || req.headers['x-cron-secret'];
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });
  if (!BREVO_API_KEY) return res.status(200).json({ skipped: true, reason: 'No BREVO_API_KEY' });

  // Fetch feedback from the past 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const records = await prisma.dishFeedback.findMany({
    where: { createdAt: { gte: since } },
    include: {
      dish: { select: { title: true } },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (records.length === 0) {
    return res.status(200).json({ sent: false, reason: 'No feedback in last 24h' });
  }

  const thumbsUp = records.filter((r) => r.thumbsUp);
  const thumbsDown = records.filter((r) => !r.thumbsUp);

  const formatRow = (r) => {
    const time = new Date(r.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });
    const note = r.notes ? ` — <em>${r.notes}</em>` : '';
    return `<tr>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;">${r.dish?.title ?? 'Unknown'}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;">${r.user?.email ?? '—'}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;">${time}${note}</td>
    </tr>`;
  };

  const tableStyle = 'width:100%;border-collapse:collapse;font-size:0.875rem;';
  const thStyle = 'padding:6px 8px;background:#f3f4f6;text-align:left;font-weight:600;';

  const htmlContent = `
<div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#111;">
  <h2 style="margin-top:0;">Dish Feedback Digest</h2>
  <p style="color:#6b7280;">${records.length} rating${records.length !== 1 ? 's' : ''} in the last 24 hours (${thumbsUp.length} 👍 / ${thumbsDown.length} 👎)</p>

  ${thumbsUp.length > 0 ? `
  <h3 style="color:#166534;">👍 Thumbs Up (${thumbsUp.length})</h3>
  <table style="${tableStyle}">
    <thead><tr>
      <th style="${thStyle}">Dish</th>
      <th style="${thStyle}">Customer</th>
      <th style="${thStyle}">Time / Notes</th>
    </tr></thead>
    <tbody>${thumbsUp.map(formatRow).join('')}</tbody>
  </table>` : ''}

  ${thumbsDown.length > 0 ? `
  <h3 style="color:#991b1b;margin-top:1.5rem;">👎 Thumbs Down (${thumbsDown.length})</h3>
  <table style="${tableStyle}">
    <thead><tr>
      <th style="${thStyle}">Dish</th>
      <th style="${thStyle}">Customer</th>
      <th style="${thStyle}">Time / Notes</th>
    </tr></thead>
    <tbody>${thumbsDown.map(formatRow).join('')}</tbody>
  </table>` : ''}
</div>`;

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
  const subject = `Dish Feedback Digest — ${dateLabel} (${records.length} rating${records.length !== 1 ? 's' : ''})`;

  try {
    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        to: [{ email: ADMIN_EMAIL }],
        sender: { email: SENDER_EMAIL, name: 'Local Effort' },
        subject,
        htmlContent,
      }),
    });
    if (!emailRes.ok) {
      const text = await emailRes.text();
      console.error('[digest] Brevo send failed:', emailRes.status, text);
      return res.status(502).json({ error: 'Email send failed', detail: text });
    }
    return res.status(200).json({ sent: true, count: records.length });
  } catch (err) {
    console.error('[digest] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
