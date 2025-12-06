const BREVO_API_KEY = process.env.BREVO_API_KEY;
const TEAM_EMAIL = process.env.TEAM_INBOX_EMAIL || 'dataweston@gmail.com';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'hello@localeffortfood.com';

/**
 * Handle customer feedback submissions from Happy Monday page
 * Sends email notification to team
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!BREVO_API_KEY) {
    console.warn('[Messages] BREVO_API_KEY not configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const { name, email, subject, message, type, category } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const fromInfo = [];
    if (name) fromInfo.push(`Name: ${name}`);
    if (email) fromInfo.push(`Email: ${email}`);
    const fromText = fromInfo.length > 0 ? fromInfo.join(' | ') : 'Anonymous';

    const categoryLabel = category ? category.charAt(0).toUpperCase() + category.slice(1) : 'General';
    const emailSubject = subject || `Happy Monday Feedback (${categoryLabel})`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${emailSubject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:'Helvetica Neue', Arial, sans-serif; color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc; padding:40px 16px;">
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background:#3b82f6; padding:24px; text-align:center;">
              <h1 style="margin:0; font-size:24px; color:#ffffff;">${emailSubject}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="margin-bottom:20px; padding:12px; background:#eff6ff; border-left:4px solid #3b82f6; border-radius:8px;">
                <p style="margin:0; font-size:14px; color:#1e40af;"><strong>From:</strong> ${fromText}</p>
                ${category ? `<p style="margin:8px 0 0; font-size:14px; color:#1e40af;"><strong>Category:</strong> ${categoryLabel}</p>` : ''}
              </div>
              <div style="margin-top:20px; padding:16px; background:#f1f5f9; border-radius:8px;">
                <strong style="display:block; margin-bottom:8px; color:#0f172a;">Message:</strong>
                <p style="margin:0; color:#334155; font-size:14px; white-space:pre-wrap; line-height:1.6;">${message}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#0f172a; padding:20px; text-align:center; color:#cbd5e1;">
              <p style="margin:0; font-size:12px;">This is an automated notification from the Local Effort Happy Monday feedback form.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textContent = `${emailSubject}

From: ${fromText}
${category ? `Category: ${categoryLabel}` : ''}

Message:
${message}

---
This is an automated notification from the Local Effort Happy Monday feedback form.`;

    // Send email via Brevo
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email: TEAM_EMAIL }],
        sender: { email: SENDER_EMAIL, name: 'Local Effort' },
        replyTo: email ? { email, name: name || email } : undefined,
        subject: emailSubject,
        htmlContent,
        textContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Brevo API error: ${data.message || response.statusText}`);
    }

    console.log(`[Messages] ✅ Feedback email sent from ${fromText}`);

    return res.status(200).json({ success: true, message: 'Feedback submitted successfully' });

  } catch (error) {
    console.error('[Messages] Error sending feedback:', error);
    return res.status(500).json({
      error: 'Failed to send feedback',
      message: error.message,
    });
  }
};
