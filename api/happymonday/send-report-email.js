const BREVO_API_KEY = process.env.BREVO_API_KEY;
const TEAM_EMAIL = process.env.TEAM_INBOX_EMAIL || 'dataweston@gmail.com';
const CLIENT_EMAIL = process.env.HAPPY_MONDAY_CLIENT_EMAIL || 'hello@happymonday.company';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'hello@localeffortfood.com';

const formatCurrency = (value = 0) => {
  const amount = Number(value) || 0;
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}$${Math.abs(amount).toFixed(2)}`;
};

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const describeRange = (filters = {}) => {
  const start = formatDate(filters.startDate);
  const end = formatDate(filters.endDate);
  if (start && end) return `${start} to ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Through ${end}`;
  return 'All Dates';
};

const ALLOWED_ORIGINS = ['https://localeffortfood.com', 'https://www.localeffortfood.com'];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!BREVO_API_KEY) {
    console.warn('[HappyMonday] BREVO_API_KEY not configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const {
      htmlContent,
      filters = {},
      totals = {},
      lineItemCount = 0,
      invoiceCount = 0,
      requestedBy = null,
    } = req.body || {};

    if (!htmlContent) {
      return res.status(400).json({ error: 'Report HTML content is required' });
    }

    const recipients = new Set([TEAM_EMAIL, CLIENT_EMAIL]);
    if (requestedBy) recipients.add(requestedBy);
    const to = Array.from(recipients).filter(Boolean).map((email) => ({ email }));

    if (!to.length) {
      return res.status(400).json({ error: 'No recipients available' });
    }

    const rangeLabel = describeRange(filters);
    const statusLabel = filters.status && filters.status !== 'all' ? filters.status : 'All statuses';
    const categoryLabel = filters.category && filters.category !== 'all' ? filters.category : 'All categories';
    const searchLabel = filters.searchText ? filters.searchText : 'None';

    const textContent = `Happy Monday custom report
Range: ${rangeLabel}
Status: ${statusLabel}
Category: ${categoryLabel}
Search: ${searchLabel}
Invoices matched: ${invoiceCount}
Line items: ${lineItemCount}

Net sales: ${formatCurrency(totals.revenue)}
Units moved: ${totals.quantity || 0}
Pizza sales: ${formatCurrency(totals.pizzaRevenue)}
Credits/adjustments: ${formatCurrency(totals.creditIssued)}

Requested by: ${requestedBy || 'Happy Monday user'}
Generated via partners portal.`;

    const subject = `Happy Monday report (${rangeLabel})`;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        to,
        sender: { email: SENDER_EMAIL, name: 'Local Effort' },
        subject,
        htmlContent,
        textContent,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.message || response.statusText);
    }

    console.log(`[HappyMonday] ✅ Report email requested by ${requestedBy || 'unknown user'} sent to ${to.map((t) => t.email).join(', ')}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[HappyMonday] Error emailing report:', error);
    return res.status(500).json({ error: 'Failed to send report email' });
  }
};
