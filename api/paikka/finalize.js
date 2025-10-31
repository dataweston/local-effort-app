const QRCode = require('qrcode');
const { decodeCheckoutState } = require('../../src/features/paikka/utils');
const { MENU_LOOKUP, formatCurrency } = require('../../src/features/paikka/menu');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'dataweston@gmail.com';
const SUPPORT_EMAIL = process.env.SUPPORT_INBOX_EMAIL || 'dataweston@gmail.com';

const parseBody = (req) => {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (req.body && typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (_) {
      return null;
    }
  }
  return null;
};

const resolvePaymentReference = (value) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const candidate = value.find((entry) => typeof entry === 'string' && entry.trim());
    if (candidate) return candidate.trim();
  }
  return undefined;
};

const generateQRCode = async (data) => {
  try {
    // Generate QR code as data URL (base64)
    return await QRCode.toDataURL(JSON.stringify(data), {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 300,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[paikka/finalize] QR code generation failed:', err);
    return null;
  }
};

const sendBrevoEmail = async (payload) => {
  if (!BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY not configured');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'accept': 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Brevo API error ${response.status}: ${text}`);
  }

  return response.json();
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    // eslint-disable-next-line no-console
    console.log('[paikka/finalize] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = parseBody(req);
  if (!payload || typeof payload !== 'object') {
    // eslint-disable-next-line no-console
    console.log('[paikka/finalize] Invalid request body:', payload);
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  try {
    const stateParam = typeof payload.state === 'string' ? payload.state : undefined;
    if (!stateParam) {
      // eslint-disable-next-line no-console
      console.log('[paikka/finalize] Missing checkout state');
      throw new Error('Missing checkout state.');
    }

    const checkoutState = decodeCheckoutState(stateParam);
    if (!checkoutState.items.length) {
      // eslint-disable-next-line no-console
      console.log('[paikka/finalize] No items in checkout');
      throw new Error('No items found in checkout.');
    }

    const paymentReference =
      resolvePaymentReference(payload.paymentReference) ||
      resolvePaymentReference(payload.payment_reference) ||
      resolvePaymentReference(payload.transactionId) ||
      resolvePaymentReference(payload.paymentId) ||
      resolvePaymentReference(payload.checkoutId) ||
      resolvePaymentReference(payload.orderId);

    if (!paymentReference) {
      throw new Error('Missing payment reference from Square.');
    }

    // Calculate order totals
    const items = checkoutState.items.map(({ sku, qty }) => {
      const menuItem = MENU_LOOKUP.get(sku);
      if (!menuItem) {
        throw new Error(`Unknown SKU: ${sku}`);
      }
      return {
        sku,
        qty,
        title: menuItem.summaryTitle || menuItem.title,
        isDairyFree: menuItem.isDairyFree || false,
        price: menuItem.presalePriceCents,
        subtotal: qty * menuItem.presalePriceCents,
      };
    });

    const subtotalCents = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tipCents = checkoutState.tipCents || 0;
    const totalCents = subtotalCents + tipCents;

    // Generate QR code data
    const qrData = {
      paymentReference,
      email: checkoutState.email,
      firstName: checkoutState.firstName,
      lastName: checkoutState.lastName,
      totalCents,
      timestamp: new Date().toISOString(),
    };

    const qrCodeDataUrl = await generateQRCode(qrData);

    // Build order summary HTML
    const itemsHtml = items
      .map(
        (item) => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
              ${item.qty}x ${item.title}${item.isDairyFree ? ' (Dairy-Free)' : ''}
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">
              ${formatCurrency(item.subtotal)}
            </td>
          </tr>
        `
      )
      .join('');

    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Paikka Presale Confirmed!</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 18px; margin-top: 0;">Hi ${checkoutState.firstName}!</p>
          
          <p>Thank you for ordering from the <strong>Local Effort x Paikka</strong> presale. Your order is confirmed and ready for pickup!</p>
          
          <div style="background: #f9fafb; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #f97316; font-size: 20px;">Your QR Code</h2>
            <p>Show this QR code at pickup to skip the line:</p>
            ${
              qrCodeDataUrl
                ? `<div style="text-align: center; margin: 20px 0;">
                     <img src="${qrCodeDataUrl}" alt="QR Code" style="max-width: 300px; border-radius: 8px; border: 2px solid #eee;" />
                   </div>`
                : '<p style="color: #dc2626;">QR code generation failed. Please show your confirmation email.</p>'
            }
          </div>
          
          <h3 style="color: #374151; margin-top: 30px;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px 0; text-align: left; border-bottom: 2px solid #eee;">Item</th>
                <th style="padding: 12px 0; text-align: right; border-bottom: 2px solid #eee;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              ${
                tipCents > 0
                  ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;">Tip</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(tipCents)}</td></tr>`
                  : ''
              }
              <tr style="font-weight: bold; font-size: 16px;">
                <td style="padding: 12px 0; border-top: 2px solid #374151;">Total</td>
                <td style="padding: 12px 0; text-align: right; border-top: 2px solid #374151;">${formatCurrency(totalCents)}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #92400e;">Pickup Instructions</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Location: <strong>Paikka</strong>, St. Paul</li>
              <li>Show your QR code to skip the line</li>
              <li>Have your order ready on your phone</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            Payment Reference: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">${paymentReference}</code>
          </p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            Questions? Reply to this email or contact us at ${SUPPORT_EMAIL}
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>Local Effort &middot; Community Food &middot; St. Paul, MN</p>
        </div>
      </body>
      </html>
    `;

    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1f2937; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 New Paikka Order</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="margin-top: 0; color: #f97316;">Customer Details</h2>
          <p>
            <strong>Name:</strong> ${checkoutState.firstName} ${checkoutState.lastName || ''}<br>
            <strong>Email:</strong> ${checkoutState.email}<br>
            <strong>Payment ID:</strong> ${paymentReference}
          </p>
          
          <h3 style="color: #374151; margin-top: 30px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #eee;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #eee;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #eee;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item) => `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.title}${item.isDairyFree ? ' (DF)' : ''}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.qty}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.subtotal)}</td>
                </tr>
              `
                )
                .join('')}
              <tr>
                <td colspan="2" style="padding: 12px; border-bottom: 1px solid #eee;">Subtotal</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(subtotalCents)}</td>
              </tr>
              ${
                tipCents > 0
                  ? `<tr><td colspan="2" style="padding: 12px; border-bottom: 1px solid #eee;">Tip</td><td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(tipCents)}</td></tr>`
                  : ''
              }
              <tr style="font-weight: bold; font-size: 16px;">
                <td colspan="2" style="padding: 12px; border-top: 2px solid #374151;">Total</td>
                <td style="padding: 12px; text-align: right; border-top: 2px solid #374151;">${formatCurrency(totalCents)}</td>
              </tr>
            </tbody>
          </table>
          
          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            Order received at ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT
          </p>
        </div>
      </body>
      </html>
    `;

    // Send emails via Brevo
    try {
      if (!BREVO_API_KEY) {
        throw new Error('BREVO_API_KEY not configured in environment');
      }

      // eslint-disable-next-line no-console
      console.log('[paikka/finalize] Sending customer email to:', checkoutState.email);

      // Send to customer
      await sendBrevoEmail({
        sender: { name: 'Local Effort', email: SENDER_EMAIL },
        to: [{ email: checkoutState.email, name: `${checkoutState.firstName} ${checkoutState.lastName || ''}`.trim() }],
        subject: '🎉 Your Paikka Presale Order is Confirmed!',
        htmlContent: customerEmailHtml,
      });

      // eslint-disable-next-line no-console
      console.log('[paikka/finalize] Customer email sent successfully');

      // Send to admin
      await sendBrevoEmail({
        sender: { name: 'Paikka Orders', email: SENDER_EMAIL },
        to: [{ email: SUPPORT_EMAIL }],
        subject: `New Paikka Order: ${checkoutState.firstName} ${checkoutState.lastName || ''} - ${formatCurrency(totalCents)}`,
        htmlContent: adminEmailHtml,
      });

      // eslint-disable-next-line no-console
      console.log('[paikka/finalize] Admin email sent successfully');
    } catch (emailError) {
      // eslint-disable-next-line no-console
      console.error('[paikka/finalize] Email sending failed:', emailError);
      console.error('[paikka/finalize] Email error details:', {
        hasBrevoKey: !!BREVO_API_KEY,
        senderEmail: SENDER_EMAIL,
        supportEmail: SUPPORT_EMAIL,
      });
      // Don't fail the request if email fails - order is still valid
    }

    // Generate a simple JWT-like token for resend functionality
    const jwt = Buffer.from(
      JSON.stringify({
        paymentReference,
        email: checkoutState.email,
        timestamp: new Date().toISOString(),
      })
    ).toString('base64');

    const response = {
      success: true,
      paymentReference,
      qrCode: qrCodeDataUrl,
      jwt,
      order: {
        oid: paymentReference,
        jti: paymentReference.slice(-8).toUpperCase(),
        email: checkoutState.email,
        firstName: checkoutState.firstName,
        lastName: checkoutState.lastName,
        items,
        subtotalCents,
        tipCents,
        totalCents,
      },
    };

    // eslint-disable-next-line no-console
    console.log('[paikka/finalize] Success response:', {
      paymentReference,
      email: checkoutState.email,
      hasQR: !!qrCodeDataUrl,
      itemCount: items.length,
    });

    return res.status(200).json(response);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[paikka/finalize] Error:', err);
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to finalize order.' });
  }
};
