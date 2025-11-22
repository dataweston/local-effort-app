/**
 * Email templates for Happy Monday invoice notifications
 */

const escapeHtml = (str = '') => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeZone: 'America/Chicago',
    }).format(date);
  } catch (err) {
    return '';
  }
};

const formatCurrency = (cents) => {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
};

/**
 * Build HTML email for invoice notification
 */
const buildInvoiceHtml = ({
  orderNumber,
  orderDate,
  items,
  totalCents,
  notes,
  clientName,
  currentBalance,
}) => {
  const safeOrderNumber = escapeHtml(orderNumber);
  const safeDate = escapeHtml(formatDate(orderDate));
  const safeNotes = notes ? escapeHtml(notes).replace(/\n/g, '<br />') : '';
  const safeClientName = escapeHtml(clientName || 'Happy Monday');

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:12px; border-bottom:1px solid #e2e8f0;">
        <strong>${escapeHtml(item.name)}</strong>
        <div style="font-size:13px; color:#64748b; margin-top:2px;">${escapeHtml(item.category)}</div>
      </td>
      <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:center;">${item.quantity}</td>
      <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:right;">${formatCurrency(item.price * 100)}</td>
      <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:600;">${formatCurrency(item.price * item.quantity * 100)}</td>
    </tr>
  `).join('');

  const notesBlock = safeNotes ? `
    <div style="margin-top:20px; padding:16px; background:#fef3c7; border-left:4px solid #f59e0b; border-radius:8px;">
      <strong style="display:block; margin-bottom:8px; color:#92400e;">Special Instructions:</strong>
      <p style="margin:0; color:#78350f; font-size:14px;">${safeNotes}</p>
    </div>
  ` : '';

  const balanceColor = currentBalance < 0 ? '#10b981' : '#ef4444';
  const balanceLabel = currentBalance < 0 ? 'Credit Available' : 'Balance Due';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>New Order from ${safeClientName}</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:'Helvetica Neue', Arial, sans-serif; color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc; padding:40px 16px;">
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding:32px; text-align:center;">
              <h1 style="margin:0; font-size:28px; color:#ffffff; font-weight:700;">Local Effort ↔ Happy Monday</h1>
              <p style="margin:8px 0 0; font-size:15px; color:#dbeafe;">Trade Order System</p>
            </td>
          </tr>

          <!-- Order Info -->
          <tr>
            <td style="padding:32px;">
              <div style="text-align:center; margin-bottom:24px;">
                <div style="display:inline-block; background:#eff6ff; padding:12px 24px; border-radius:8px;">
                  <p style="margin:0; font-size:13px; color:#1e40af; text-transform:uppercase; letter-spacing:0.05em;">Order Number</p>
                  <p style="margin:4px 0 0; font-size:24px; font-weight:700; color:#1e3a8a;">${safeOrderNumber}</p>
                </div>
              </div>

              <div style="background:#f8fafc; padding:16px; border-radius:8px; margin-bottom:24px;">
                <table width="100%">
                  <tr>
                    <td style="padding:4px 0;">
                      <strong style="color:#475569;">Date:</strong> ${safeDate}
                    </td>
                    <td style="padding:4px 0; text-align:right;">
                      <strong style="color:#475569;">Client:</strong> ${safeClientName}
                    </td>
                  </tr>
                </table>
              </div>

              <h2 style="margin:0 0 16px; font-size:18px; color:#0f172a; border-bottom:2px solid #e2e8f0; padding-bottom:8px;">Order Items</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                <thead>
                  <tr style="background:#f1f5f9;">
                    <th style="padding:12px; text-align:left; font-size:13px; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Item</th>
                    <th style="padding:12px; text-align:center; font-size:13px; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Qty</th>
                    <th style="padding:12px; text-align:right; font-size:13px; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Price</th>
                    <th style="padding:12px; text-align:right; font-size:13px; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
                <tfoot>
                  <tr style="background:#f8fafc;">
                    <td colspan="3" style="padding:16px; text-align:right; font-size:18px; font-weight:700; color:#0f172a;">Order Total:</td>
                    <td style="padding:16px; text-align:right; font-size:20px; font-weight:700; color:#2563eb;">${formatCurrency(totalCents)}</td>
                  </tr>
                </tfoot>
              </table>

              ${notesBlock}

              <div style="margin-top:24px; padding:20px; background:${currentBalance < 0 ? '#ecfdf5' : '#fef2f2'}; border-radius:12px; border:2px solid ${balanceColor};">
                <table width="100%">
                  <tr>
                    <td>
                      <p style="margin:0; font-size:14px; color:${balanceColor}; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">${balanceLabel}</p>
                      <p style="margin:4px 0 0; font-size:28px; font-weight:700; color:${balanceColor};">${formatCurrency(Math.abs(currentBalance))}</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a; padding:24px; text-align:center; color:#cbd5e1;">
              <p style="margin:0; font-size:14px;">Questions? Reply to this email or contact us at <a href="mailto:hello@localeffortfood.com" style="color:#60a5fa; text-decoration:none;">hello@localeffortfood.com</a></p>
              <p style="margin:12px 0 0; font-size:12px; color:#94a3b8;">This is an automated notification from the Local Effort trade order system.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Build plain text version of invoice email
 */
const buildInvoiceText = ({
  orderNumber,
  orderDate,
  items,
  totalCents,
  notes,
  clientName,
  currentBalance,
}) => {
  const itemLines = items.map(item =>
    `${item.name} (${item.category}) x${item.quantity} @ ${formatCurrency(item.price * 100)} = ${formatCurrency(item.price * item.quantity * 100)}`
  ).join('\n');

  const notesSection = notes ? `\n\nSpecial Instructions:\n${notes}` : '';
  const balanceLabel = currentBalance < 0 ? 'Credit Available' : 'Balance Due';

  return `LOCAL EFFORT ↔ HAPPY MONDAY
Trade Order System

ORDER NUMBER: ${orderNumber}
Date: ${formatDate(orderDate)}
Client: ${clientName || 'Happy Monday'}

ORDER ITEMS:
${itemLines}

ORDER TOTAL: ${formatCurrency(totalCents)}
${notesSection}

${balanceLabel}: ${formatCurrency(Math.abs(currentBalance))}

Questions? Reply to this email or contact hello@localeffortfood.com

This is an automated notification from the Local Effort trade order system.`;
};

/**
 * Send invoice notification email via Brevo
 */
async function sendInvoiceNotification({
  orderNumber,
  orderDate,
  items,
  totalCents,
  notes,
  clientName,
  currentBalance,
  recipientEmails,
}) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const SENDER_EMAIL = process.env.SENDER_EMAIL || 'hello@localeffortfood.com';

  if (!BREVO_API_KEY) {
    console.warn('[HappyMonday] BREVO_API_KEY not configured - skipping email');
    return { skipped: true, reason: 'No API key' };
  }

  if (!recipientEmails || recipientEmails.length === 0) {
    console.warn('[HappyMonday] No recipient emails provided');
    return { skipped: true, reason: 'No recipients' };
  }

  const htmlContent = buildInvoiceHtml({
    orderNumber,
    orderDate,
    items,
    totalCents,
    notes,
    clientName,
    currentBalance,
  });

  const textContent = buildInvoiceText({
    orderNumber,
    orderDate,
    items,
    totalCents,
    notes,
    clientName,
    currentBalance,
  });

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        to: recipientEmails.map(email => ({ email })),
        sender: { email: SENDER_EMAIL, name: 'Local Effort' },
        subject: `New Order ${orderNumber} from ${clientName || 'Happy Monday'}`,
        htmlContent,
        textContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Brevo API error: ${data.message || response.statusText}`);
    }

    console.log(`[HappyMonday] ✅ Invoice email sent to ${recipientEmails.join(', ')}`);
    return { success: true, messageId: data.messageId };

  } catch (error) {
    console.error('[HappyMonday] Failed to send invoice email:', error.message);
    throw error;
  }
}

module.exports = {
  buildInvoiceHtml,
  buildInvoiceText,
  sendInvoiceNotification,
};
