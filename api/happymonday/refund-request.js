const BREVO_API_KEY = process.env.BREVO_API_KEY;
const TEAM_EMAIL = process.env.TEAM_INBOX_EMAIL || 'dataweston@gmail.com';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'hello@localeffortfood.com';

/**
 * Handle refund/credit requests from clients
 * Sends email notification to admin
 */
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
    const { orderId, orderNumber, reason, userEmail } = req.body;

    if (!orderId || !reason || !userEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Refund Request - Happy Monday</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:'Helvetica Neue', Arial, sans-serif; color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc; padding:40px 16px;">
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background:#dc2626; padding:24px; text-align:center;">
              <h1 style="margin:0; font-size:24px; color:#ffffff;">Refund Request</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px; font-size:18px; color:#0f172a;">Order: ${orderNumber || orderId}</h2>
              <p style="margin:0 0 8px; font-size:14px; color:#475569;">From: ${userEmail}</p>
              <div style="margin-top:20px; padding:16px; background:#fef2f2; border-left:4px solid #dc2626; border-radius:8px;">
                <strong style="display:block; margin-bottom:8px; color:#7f1d1d;">Reason for refund/credit request:</strong>
                <p style="margin:0; color:#991b1b; font-size:14px; white-space:pre-wrap;">${reason}</p>
              </div>
              <p style="margin-top:24px; font-size:14px; color:#475569;">Please review this request and take appropriate action in the Happy Monday portal.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#0f172a; padding:20px; text-align:center; color:#cbd5e1;">
              <p style="margin:0; font-size:12px;">This is an automated notification from the Local Effort trade order system.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textContent = `REFUND REQUEST - HAPPY MONDAY

Order: ${orderNumber || orderId}
From: ${userEmail}

Reason for refund/credit request:
${reason}

Please review this request and take appropriate action in the Happy Monday portal.`;

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
        subject: `Refund Request: ${orderNumber || orderId} from ${userEmail}`,
        htmlContent,
        textContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Brevo API error: ${data.message || response.statusText}`);
    }

    console.log(`[HappyMonday] ✅ Refund request email sent for order ${orderNumber || orderId}`);

    return res.status(200).json({ success: true, message: 'Refund request submitted' });

  } catch (error) {
    console.error('[HappyMonday] Error sending refund request:', error);
    return res.status(500).json({
      error: 'Failed to send refund request',
    });
  }
};
