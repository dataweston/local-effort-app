/**
 * POST /api/pizzafunder/pledge
 * 
 * Handles pizza pledge payments via Square
 * Simplified from crowdfund/confirm-payment - follows SalePage pattern
 * 
 * ENHANCED: Includes QR code generation and Brevo email notifications
 * Pattern: Mirrors api/paikka/finalize.js email implementation
 */

const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');
const QRCode = require('qrcode');

// Import Square Client (defensive: handle varying export shapes)
let Client, Environment;
try {
  const squarePkg = require('square');
  Client = squarePkg.Client || (squarePkg.default && squarePkg.default.Client);
  Environment = squarePkg.Environment || (squarePkg.default && squarePkg.default.Environment) || null;
} catch (err) {
  console.warn('Square SDK not available:', err && err.message);
}

// =====================================================
// BREVO EMAIL UTILITY
// =====================================================

/**
 * Send email via Brevo API
 */
async function sendBrevoEmail({ to, subject, htmlContent }) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || 'noreply@localeffort.org';

  if (!brevoApiKey) {
    console.warn('⚠️  BREVO_API_KEY not set. Email not sent.');
    return { success: false, error: 'Missing API key' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: 'Local Effort' },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Brevo email failed:', data);
      return { success: false, error: data.message || 'Email send failed' };
    }

    console.log(`✅ Email sent to ${to}: ${data.messageId || 'OK'}`);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('❌ Brevo email error:', error);
    return { success: false, error: error.message };
  }
}

const sanitizeName = (value) => {
  const str = String(value || '').trim();
  return str ? str.slice(0, 120) : 'Anonymous Backer';
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firestore } = getFirebaseAdmin();
  
  if (!firestore) {
    return res.status(503).json({ error: 'Database not available' });
  }

  if (!Client) {
    return res.status(503).json({ error: 'Payment processing unavailable' });
  }

  const {
    pizzaCount = 1,
    funderName,
    email,
    phone,
    notes,
    rewardPreference,
    sourceId, // Square payment token from tokenize()
    totalCents,
  } = req.body || {};

  const sanitizedName = sanitizeName(funderName);
  const safeEmail = typeof email === 'string' ? email.trim().slice(0, 120) : '';
  const safePhone = typeof phone === 'string' ? phone.trim().slice(0, 30) : '';
  const safeNotes = typeof notes === 'string' ? notes.trim().slice(0, 500) : '';
  const safeRewardPref = typeof rewardPreference === 'string' ? rewardPreference.trim().slice(0, 120) : '';
  
  const pizzas = Math.max(1, parseInt(pizzaCount, 10) || 1);
  const amount = Math.max(0, parseInt(totalCents, 10) || 0);

  if (!sourceId) {
    return res.status(400).json({ error: 'Payment token required' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    // Initialize Square client
    const envName = process.env.SQUARE_ENVIRONMENT || 'Sandbox';
    let resolvedEnv = null;
    if (Environment && Environment[envName]) {
      resolvedEnv = Environment[envName];
    } else if (Environment && Environment.Sandbox) {
      resolvedEnv = Environment.Sandbox;
    } else {
      resolvedEnv = envName;
    }

    const squareClient = new Client({
      environment: resolvedEnv,
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
    });

    // Process payment via Square
    const paymentResponse = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: `pledge-${Date.now()}-${Math.random().toString(36)}`,
      amountMoney: {
        amount: BigInt(amount),
        currency: 'USD',
      },
      note: `Pizza Pledge: ${pizzas} pizza${pizzas > 1 ? 's' : ''}`,
      buyerEmailAddress: safeEmail || undefined,
    });

    if (!paymentResponse.result.payment) {
      throw new Error('Payment failed');
    }

    const payment = paymentResponse.result.payment;

    // Record the pledge in Firestore
    const pledgeRef = await firestore
      .collection('crowdfund_pledges')
      .add({
        funderName: sanitizedName,
        email: safeEmail,
        phone: safePhone,
        notes: safeNotes,
        rewardPreference: safeRewardPref,
        pizzaCount: pizzas,
        amountCents: amount,
        paymentId: payment.id,
        status: payment.status || 'COMPLETED',
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now(),
      });

    // Update aggregates (atomic increment)
    const aggregateRef = firestore.collection('aggregates').doc('crowdfunding');
    
    await firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(aggregateRef);
      
      const currentPizzas = doc.exists ? (Number(doc.data().pizzas) || 0) : 0;
      const currentBackers = doc.exists ? (Number(doc.data().backers) || 0) : 0;
      const goal = doc.exists ? (Number(doc.data().goal) || 1000) : 1000;

      transaction.set(aggregateRef, {
        pizzas: currentPizzas + pizzas,
        backers: currentBackers + 1,
        goal,
        lastUpdated: new Date().toISOString(),
      }, { merge: true });
    });

    // =====================================================
    // QR CODE GENERATION
    // =====================================================
    const pledgeId = pledgeRef.id;
    const timestamp = new Date().toISOString();
    
    const qrData = {
      pledgeReference: pledgeId,
      email: safeEmail,
      funderName: sanitizedName,
      pizzaCount: pizzas,
      amountCents: amount,
      timestamp,
    };

    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 2,
      });
    } catch (qrError) {
      console.warn('⚠️  QR code generation failed:', qrError.message);
      // Non-blocking: continue without QR code
    }

    // =====================================================
    // EMAIL NOTIFICATIONS
    // =====================================================
    
    // Customer Email Template
    const customerEmailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Your Pizza Pledge!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🍕 Pizza Pledge Confirmed!</h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">Thank you for supporting our pizza fundraiser</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi <strong>${sanitizedName}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Your pledge has been successfully processed! Thank you for backing <strong>${pizzas} pizza${pizzas > 1 ? 's' : ''}</strong> 
                in our fundraising campaign. Your support means the world to us! 🎉
              </p>

              <!-- Pledge Summary Table -->
              <table width="100%" cellpadding="12" cellspacing="0" style="margin: 30px 0; border: 1px solid #e0e0e0; border-radius: 6px;">
                <tr style="background-color: #f9f9f9;">
                  <td colspan="2" style="padding: 15px; border-bottom: 1px solid #e0e0e0;">
                    <strong style="color: #333333; font-size: 18px;">Pledge Summary</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; color: #666666; border-bottom: 1px solid #f0f0f0;">Pledge Reference:</td>
                  <td style="padding: 12px 15px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;"><code style="background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-size: 13px;">${pledgeId}</code></td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; color: #666666; border-bottom: 1px solid #f0f0f0;">Pizza Count:</td>
                  <td style="padding: 12px 15px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;">${pizzas} pizza${pizzas > 1 ? 's' : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; color: #666666; border-bottom: 1px solid #f0f0f0;">Amount:</td>
                  <td style="padding: 12px 15px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;">$${(amount / 100).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; color: #666666; border-bottom: 1px solid #f0f0f0;">Payment ID:</td>
                  <td style="padding: 12px 15px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;"><code style="background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${payment.id}</code></td>
                </tr>
                ${safeRewardPref ? `
                <tr>
                  <td style="padding: 12px 15px; color: #666666; border-bottom: 1px solid #f0f0f0;">Reward Preference:</td>
                  <td style="padding: 12px 15px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;">${safeRewardPref}</td>
                </tr>
                ` : ''}
                ${safeNotes ? `
                <tr>
                  <td style="padding: 12px 15px; color: #666666;">Notes:</td>
                  <td style="padding: 12px 15px; color: #333333; font-weight: 600;">${safeNotes}</td>
                </tr>
                ` : ''}
              </table>

              ${qrCodeDataUrl ? `
              <!-- QR Code -->
              <div style="text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 15px; color: #666666; font-size: 14px;">Your Pledge QR Code:</p>
                <img src="${qrCodeDataUrl}" alt="Pledge QR Code" style="width: 200px; height: 200px; border: 2px solid #e0e0e0; border-radius: 8px;" />
                <p style="margin: 15px 0 0; color: #999999; font-size: 12px;">Show this code for verification</p>
              </div>
              ` : ''}

              <!-- What's Next -->
              <div style="margin: 30px 0; padding: 20px; background-color: #fff8e1; border-left: 4px solid #ffc107; border-radius: 4px;">
                <h3 style="margin: 0 0 10px; color: #333333; font-size: 16px;">📬 What's Next?</h3>
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  We'll keep you updated on the campaign progress and let you know when your pizzas are ready! 
                  If you have any questions, feel free to reply to this email.
                </p>
              </div>

              <p style="margin: 30px 0 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Thank you for being part of our community! 🙏
              </p>
              <p style="margin: 10px 0 0; color: #333333; font-size: 16px; line-height: 1.6;">
                — The Local Effort Team
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9f9f9; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This is an automated confirmation email for your pizza pledge.
              </p>
              <p style="margin: 10px 0 0; color: #999999; font-size: 12px;">
                Local Effort | Pizza Fundraiser | <a href="https://localeffort.org" style="color: #ff6b6b; text-decoration: none;">localeffort.org</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Admin Email Template
    const adminEmailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Pizza Pledge Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #2c3e50; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🍕 New Pizza Pledge</h1>
              <p style="margin: 10px 0 0; color: #ecf0f1; font-size: 14px;">PizzaFunder Campaign</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px;">
                A new pizza pledge has been received and processed successfully!
              </p>

              <!-- Pledge Details Table -->
              <table width="100%" cellpadding="10" cellspacing="0" style="margin: 20px 0; border: 1px solid #e0e0e0; border-radius: 6px;">
                <tr style="background-color: #f9f9f9;">
                  <td colspan="2" style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
                    <strong style="color: #333333; font-size: 16px;">Customer Information</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #666666; width: 40%; border-bottom: 1px solid #f0f0f0;">Name:</td>
                  <td style="padding: 10px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;">${sanitizedName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #666666; border-bottom: 1px solid #f0f0f0;">Email:</td>
                  <td style="padding: 10px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;"><a href="mailto:${safeEmail}" style="color: #3498db; text-decoration: none;">${safeEmail}</a></td>
                </tr>
                ${safePhone ? `
                <tr>
                  <td style="padding: 10px; color: #666666; border-bottom: 1px solid #f0f0f0;">Phone:</td>
                  <td style="padding: 10px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;">${safePhone}</td>
                </tr>
                ` : ''}
              </table>

              <!-- Pledge Details Table -->
              <table width="100%" cellpadding="10" cellspacing="0" style="margin: 20px 0; border: 1px solid #e0e0e0; border-radius: 6px;">
                <tr style="background-color: #f9f9f9;">
                  <td colspan="2" style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
                    <strong style="color: #333333; font-size: 16px;">Pledge Details</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #666666; width: 40%; border-bottom: 1px solid #f0f0f0;">Pledge ID:</td>
                  <td style="padding: 10px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;"><code style="background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${pledgeId}</code></td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #666666; border-bottom: 1px solid #f0f0f0;">Pizza Count:</td>
                  <td style="padding: 10px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;"><span style="color: #e74c3c; font-size: 18px;">${pizzas}</span> pizza${pizzas > 1 ? 's' : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #666666; border-bottom: 1px solid #f0f0f0;">Amount:</td>
                  <td style="padding: 10px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;"><span style="color: #27ae60; font-size: 18px;">$${(amount / 100).toFixed(2)}</span></td>
                </tr>
                ${safeRewardPref ? `
                <tr>
                  <td style="padding: 10px; color: #666666; border-bottom: 1px solid #f0f0f0;">Reward Preference:</td>
                  <td style="padding: 10px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;">${safeRewardPref}</td>
                </tr>
                ` : ''}
                ${safeNotes ? `
                <tr>
                  <td style="padding: 10px; color: #666666; border-bottom: 1px solid #f0f0f0;">Notes:</td>
                  <td style="padding: 10px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;">${safeNotes}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 10px; color: #666666; border-bottom: 1px solid #f0f0f0;">Payment ID:</td>
                  <td style="padding: 10px; color: #333333; font-weight: 600; border-bottom: 1px solid #f0f0f0;"><code style="background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${payment.id}</code></td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #666666;">Timestamp:</td>
                  <td style="padding: 10px; color: #333333; font-weight: 600;">${new Date(timestamp).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</td>
                </tr>
              </table>

              ${qrCodeDataUrl ? `
              <!-- QR Code Preview -->
              <div style="text-align: center; margin: 20px 0;">
                <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">Customer QR Code:</p>
                <img src="${qrCodeDataUrl}" alt="Pledge QR Code" style="width: 150px; height: 150px; border: 2px solid #e0e0e0; border-radius: 8px;" />
              </div>
              ` : ''}

              <!-- Action Required -->
              <div style="margin: 20px 0; padding: 15px; background-color: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px;">
                <p style="margin: 0; color: #2e7d32; font-size: 14px; font-weight: 600;">
                  ✅ Payment processed successfully via Square
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; background-color: #f9f9f9; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Automated notification from PizzaFunder Campaign
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send Customer Email (non-blocking)
    if (safeEmail) {
      sendBrevoEmail({
        to: safeEmail,
        subject: `🍕 Thank You for Your Pizza Pledge! (${pizzas} pizza${pizzas > 1 ? 's' : ''})`,
        htmlContent: customerEmailHtml,
      }).catch(err => {
        console.warn('⚠️  Customer email failed (non-blocking):', err.message);
      });
    }

    // Send Admin Email (non-blocking)
    const adminEmail = process.env.SUPPORT_INBOX_EMAIL || process.env.ADMIN_EMAIL;
    if (adminEmail) {
      sendBrevoEmail({
        to: adminEmail,
        subject: `🍕 New Pizza Pledge: ${pizzas} pizza${pizzas > 1 ? 's' : ''} from ${sanitizedName}`,
        htmlContent: adminEmailHtml,
      }).catch(err => {
        console.warn('⚠️  Admin email failed (non-blocking):', err.message);
      });
    }

    // =====================================================
    // RETURN SUCCESS
    // =====================================================

    return res.status(200).json({
      success: true,
      pledgeId: pledgeRef.id,
      pizzas,
      message: `Thank you for backing ${pizzas} pizza${pizzas > 1 ? 's' : ''}!`,
    });
  } catch (error) {
    console.error('[pizzafunder.pledge] Error:', error.message);
    return res.status(500).json({ 
      error: error.message || 'Failed to process pledge',
    });
  }
};
