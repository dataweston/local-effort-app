/**
 * Intake Form Submission API
 * POST /api/intake/submit
 * 
 * Sends intake form responses to admin email
 */

const BREVO_API_BASE = 'https://api.brevo.com/v3';
const ADMIN_EMAIL = 'dataweston@gmail.com';

/**
 * Format form answers into a readable email body
 */
function formatAnswersForEmail(answers) {
  const lines = [];
  
  for (const [key, value] of Object.entries(answers)) {
    if (value === undefined || value === null || value === '') continue;
    
    // Format the key into a readable label
    const label = key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase());
    
    // Format the value
    let formattedValue;
    if (Array.isArray(value)) {
      formattedValue = value.length > 0 ? value.join(', ') : '(none selected)';
    } else if (typeof value === 'object') {
      formattedValue = JSON.stringify(value, null, 2);
    } else {
      formattedValue = String(value);
    }
    
    lines.push(`<strong>${label}:</strong> ${formattedValue}`);
  }
  
  return lines.join('<br><br>');
}

/**
 * Build HTML email template
 */
function buildEmailHtml(answers) {
  const formattedAnswers = formatAnswersForEmail(answers);
  const submittedAt = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
    }
    .meta {
      font-size: 14px;
      color: #666;
      margin-bottom: 20px;
    }
    .content {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
    }
    strong {
      color: #1a1a1a;
    }
  </style>
</head>
<body>
  <h1>🍽️ New Meal Plan Intake: Kara</h1>
  <p class="meta">Submitted: ${submittedAt}</p>
  <div class="content">
    ${formattedAnswers}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send email via Brevo
 */
async function sendEmailViaBrevo({ to, subject, htmlContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  
  if (!apiKey) {
    throw new Error('BREVO_API_KEY not configured');
  }

  const payload = {
    sender: {
      name: 'Local Effort',
      email: 'hello@localeffortfood.com',
    },
    to: [{ email: to }],
    subject,
    htmlContent,
  };

  const response = await fetch(`${BREVO_API_BASE}/smtp/email`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Brevo API error: ${errorData.message || response.statusText}`);
  }

  return response.json();
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { answers } = req.body;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Invalid request: answers object required' });
    }

    // Build and send email
    const htmlContent = buildEmailHtml(answers);
    const subject = `Meal Plan Intake: Kara - ${new Date().toLocaleDateString()}`;

    await sendEmailViaBrevo({
      to: ADMIN_EMAIL,
      subject,
      htmlContent,
    });

    console.log(`[Intake] ✅ Form submitted and emailed to ${ADMIN_EMAIL}`);

    return res.status(200).json({
      success: true,
      message: 'Form submitted successfully',
    });

  } catch (error) {
    console.error('[Intake] ❌ Submission failed:', error.message);
    
    return res.status(500).json({
      error: 'Failed to submit form',
      message: error.message,
    });
  }
}
