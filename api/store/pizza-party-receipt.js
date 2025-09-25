// POST /api/store/pizza-party-receipt
// Body: { paymentId, date, email, addOnGuests, name, phone, address, mealTime, pizzaRequests }
// Sends a confirmation/receipt email via Brevo (SendinBlue). Returns { ok: true } or { error }.

const fetch = require('node-fetch');

const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
const FROM_EMAIL = process.env.RECEIPTS_FROM_EMAIL || process.env.SUPPORT_INBOX_EMAIL || 'no-reply@localeffort.app';
const FROM_NAME = process.env.RECEIPTS_FROM_NAME || 'Local Effort';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { paymentId, date, email, addOnGuests = 0, name, phone, address, mealTime, pizzaRequests } = req.body || {};
  if (!paymentId || !email || !date) return res.status(400).json({ error: 'Missing required fields' });
  if (!BREVO_API_KEY) {
    // Soft fail if no API key: log and return ok so frontend UX is smooth.
    console.warn('BREVO_API_KEY not set; skipping email send.');
    return res.status(200).json({ ok: true, skipped: true });
  }
  try {
    const addrHtml = address && address.line1 ? `<p><strong>Address</strong>: ${address.line1}${address.line2?(', '+address.line2):''}, ${address.city || ''} ${address.state || ''} ${address.postal || ''}</p>` : '';
    const metaHtml = `
      ${name ? `<p><strong>Name:</strong> ${name}</p>`:''}
      ${phone ? `<p><strong>Phone:</strong> ${phone}</p>`:''}
      ${mealTime ? `<p><strong>Preferred Mealtime:</strong> ${mealTime}</p>`:''}
      ${pizzaRequests ? `<p><strong>Pizza Requests:</strong> ${pizzaRequests.replace(/</g,'&lt;')}</p>`:''}
      ${addrHtml}
    `;
    const html = `<p>Thanks for booking your <strong>Local Effort Pizza Party</strong> on <strong>${date}</strong>.</p>
<p>Payment ID: <code>${paymentId}</code></p>
<p>${addOnGuests > 0 ? `${addOnGuests} guest add-on(s) included.` : 'No add-on items selected.'}</p>${metaHtml}
<p>We will follow up shortly to confirm logistics. Reply to this email with any questions.</p>`;

    const payload = {
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email }],
      subject: `Your Pizza Party Booking (${date})`,
      htmlContent: html
    };

    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Brevo send error', resp.status, text);
      // Still return ok to avoid breaking UX; include marker
      return res.status(200).json({ ok: true, emailError: true });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Brevo send exception', e);
    return res.status(200).json({ ok: true, emailError: true });
  }
};
