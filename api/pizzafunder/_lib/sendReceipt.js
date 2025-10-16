/**
 * Pizzafunder Receipt Email Service
 * 
 * Sends transactional emails via Brevo after successful pizza pledges:
 * - Customer confirmation email with pledge details
 * - Admin notification email for order tracking
 * 
 * Follows the same pattern as:
 * - /api/crowdfund/_lib/sendReceipt.js
 * - /api/store/checkout.js
 * - /api/paikka/finalize.js
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/**
 * Fetch wrapper that works in Node and browser environments
 */
const fetchFn = (...args) => {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch(...args);
  }
  return import('node-fetch').then(({ default: fetch }) => fetch(...args));
};

/**
 * Sanitize and truncate string values
 */
const sanitize = (value, limit) => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (typeof limit === 'number' && limit > 0) {
    return trimmed.slice(0, limit);
  }
  return trimmed;
};

/**
 * Format cents to USD currency string
 */
const formatCurrency = (cents) => {
  const normalized = Number.isFinite(cents) ? Number(cents) : 0;
  return `$${(Math.max(0, Math.round(normalized)) / 100).toFixed(2)}`;
};

/**
 * Post email to Brevo API
 */
const postBrevoEmail = async (headers, payload) => {
  try {
    const response = await fetchFn(BREVO_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Brevo API error ${response.status}: ${text}`);
    }

    return await response.json();
  } catch (err) {
    console.error('[pizzafunder.receipts] Brevo send failed:', err?.message || err);
    throw err;
  }
};

/**
 * Build customer confirmation email HTML
 */
const buildCustomerEmailHtml = (pledgeData) => {
  const {
    funderName,
    pizzaCount,
    totalCents,
    rewardPreference,
    discountCode,
    discountLabel,
    paymentId,
    isComplimentary,
  } = pledgeData;

  const totalLabel = formatCurrency(totalCents);
  const pizzaLabel = pizzaCount === 1 ? 'pizza' : 'pizzas';
  const discountInfo = discountLabel || (discountCode ? `Discount code: ${discountCode}` : '');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">🍕 Thank You!</h1>
        <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 18px;">Your pledge is confirmed</p>
      </div>
      
      <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <p style="font-size: 18px; margin-top: 0; color: #374151;">Hi ${funderName || 'there'}!</p>
        
        <p style="font-size: 16px; color: #4b5563;">Thank you for backing <strong>Local Effort Pizza Funder</strong>! Your contribution means the world to us and helps keep our community kitchen thriving.</p>
        
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 24px; margin: 30px 0;">
          <h2 style="margin-top: 0; color: #92400e; font-size: 22px;">Your Pledge Summary</h2>
          <div style="font-size: 16px; color: #78350f;">
            <p style="margin: 8px 0;"><strong>Pizza Count:</strong> ${pizzaCount} ${pizzaLabel}</p>
            <p style="margin: 8px 0;"><strong>Total Amount:</strong> ${totalLabel}${isComplimentary ? ' <span style="color: #059669;">(Complimentary)</span>' : ''}</p>
            ${rewardPreference ? `<p style="margin: 8px 0;"><strong>Reward Preference:</strong> ${rewardPreference}</p>` : ''}
            ${discountInfo ? `<p style="margin: 8px 0;"><strong>Discount Applied:</strong> ${discountInfo}</p>` : ''}
            <p style="margin: 8px 0; font-size: 14px; color: #92400e;"><strong>Reference ID:</strong> <code style="background: rgba(255, 255, 255, 0.5); padding: 2px 6px; border-radius: 3px; font-family: monospace;">${paymentId}</code></p>
          </div>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 30px 0;">
          <h3 style="margin-top: 0; color: #065f46; font-size: 18px;">🎁 What's Next?</h3>
          <ul style="margin: 10px 0; padding-left: 20px; color: #047857;">
            <li style="margin: 8px 0;">We'll send you updates about reward fulfillment</li>
            <li style="margin: 8px 0;">Keep an eye on your inbox for pickup/delivery details</li>
            <li style="margin: 8px 0;">Follow us for behind-the-scenes updates</li>
          </ul>
        </div>

        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Your support helps us create community connections through food.</p>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;"><strong>Thank you for being part of Local Effort!</strong></p>
        </div>

        <p style="margin-top: 30px; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Questions or need to update your pledge? Just reply to this email and we'll get back to you right away.
        </p>
      </div>
      
      <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 5px 0;">Local Effort &middot; Community-Powered Food</p>
        <p style="margin: 5px 0;">Minneapolis & St. Paul, MN</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Build customer confirmation email plain text
 */
const buildCustomerEmailText = (pledgeData) => {
  const {
    funderName,
    pizzaCount,
    totalCents,
    rewardPreference,
    discountCode,
    discountLabel,
    paymentId,
    isComplimentary,
  } = pledgeData;

  const totalLabel = formatCurrency(totalCents);
  const pizzaLabel = pizzaCount === 1 ? 'pizza' : 'pizzas';
  const greetingName = funderName || 'there';

  const lines = [
    `Hi ${greetingName}!`,
    '',
    "Thank you for backing Local Effort Pizza Funder! Your contribution means the world to us and helps keep our community kitchen thriving.",
    '',
    '🍕 YOUR PLEDGE SUMMARY',
    '━━━━━━━━━━━━━━━━━━━━',
    `Pizza Count: ${pizzaCount} ${pizzaLabel}`,
    `Total Amount: ${totalLabel}${isComplimentary ? ' (Complimentary)' : ''}`,
  ];

  if (rewardPreference) {
    lines.push(`Reward Preference: ${rewardPreference}`);
  }

  if (discountLabel) {
    lines.push(`Discount Applied: ${discountLabel}`);
  } else if (discountCode) {
    lines.push(`Discount Code Used: ${discountCode}`);
  }

  lines.push(`Reference ID: ${paymentId}`);
  lines.push('');
  lines.push('🎁 WHAT\'S NEXT?');
  lines.push('• We\'ll send you updates about reward fulfillment');
  lines.push('• Keep an eye on your inbox for pickup/delivery details');
  lines.push('• Follow us for behind-the-scenes updates');
  lines.push('');
  lines.push('Your support helps us create community connections through food.');
  lines.push('Thank you for being part of Local Effort!');
  lines.push('');
  lines.push('Questions? Just reply to this email and we\'ll get back to you right away.');
  lines.push('');
  lines.push('— Local Effort');
  lines.push('Minneapolis & St. Paul, MN');

  return lines.join('\n');
};

/**
 * Build admin notification email HTML
 */
const buildAdminEmailHtml = (pledgeData) => {
  const {
    funderName,
    email,
    phone,
    pizzaCount,
    totalCents,
    rewardPreference,
    notes,
    discountCode,
    discountLabel,
    paymentId,
    isComplimentary,
    pledgeId,
    timestamp,
  } = pledgeData;

  const totalLabel = formatCurrency(totalCents);
  const pizzaLabel = pizzaCount === 1 ? 'pizza' : 'pizzas';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 24px 30px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🍕 New Pizza Funder Pledge</h1>
        <p style="color: rgba(255, 255, 255, 0.8); margin: 8px 0 0 0; font-size: 14px;">${timestamp ? new Date(timestamp).toLocaleString('en-US', { timeZone: 'America/Chicago' }) : 'Just now'} CT</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #92400e;">
            ${pizzaCount} ${pizzaLabel} &middot; ${totalLabel}${isComplimentary ? ' (Complimentary)' : ''}
          </p>
        </div>

        <h2 style="margin-top: 0; color: #dc2626; font-size: 20px; border-bottom: 2px solid #fecaca; padding-bottom: 8px;">Customer Details</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 140px;"><strong>Name:</strong></td>
            <td style="padding: 8px 0; color: #111827;">${funderName || 'Anonymous'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Email:</strong></td>
            <td style="padding: 8px 0; color: #111827;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></td>
          </tr>
          ${phone ? `<tr><td style="padding: 8px 0; color: #6b7280;"><strong>Phone:</strong></td><td style="padding: 8px 0; color: #111827;"><a href="tel:${phone}" style="color: #2563eb; text-decoration: none;">${phone}</a></td></tr>` : ''}
        </table>

        <h2 style="margin-top: 30px; color: #dc2626; font-size: 20px; border-bottom: 2px solid #fecaca; padding-bottom: 8px;">Pledge Information</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 140px;"><strong>Pizza Count:</strong></td>
            <td style="padding: 8px 0; color: #111827;">${pizzaCount} ${pizzaLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Amount:</strong></td>
            <td style="padding: 8px 0; color: #111827; font-weight: bold;">${totalLabel}${isComplimentary ? ' <span style="color: #059669;">(Complimentary)</span>' : ''}</td>
          </tr>
          ${rewardPreference ? `<tr><td style="padding: 8px 0; color: #6b7280;"><strong>Reward:</strong></td><td style="padding: 8px 0; color: #111827;">${rewardPreference}</td></tr>` : ''}
          ${discountLabel ? `<tr><td style="padding: 8px 0; color: #6b7280;"><strong>Discount:</strong></td><td style="padding: 8px 0; color: #059669;">${discountLabel}</td></tr>` : ''}
          ${discountCode && !discountLabel ? `<tr><td style="padding: 8px 0; color: #6b7280;"><strong>Discount Code:</strong></td><td style="padding: 8px 0; color: #059669;">${discountCode}</td></tr>` : ''}
        </table>

        ${notes ? `
        <h2 style="margin-top: 30px; color: #dc2626; font-size: 20px; border-bottom: 2px solid #fecaca; padding-bottom: 8px;">Customer Notes</h2>
        <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <p style="margin: 0; color: #374151; white-space: pre-wrap;">${notes}</p>
        </div>
        ` : ''}

        <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 30px 0;">
          <p style="margin: 0; font-size: 13px; color: #6b7280;">
            <strong>Payment ID:</strong> <code style="background: white; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${paymentId}</code>
          </p>
          ${pledgeId ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #6b7280;"><strong>Pledge ID:</strong> ${pledgeId}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Build admin notification email plain text
 */
const buildAdminEmailText = (pledgeData) => {
  const {
    funderName,
    email,
    phone,
    pizzaCount,
    totalCents,
    rewardPreference,
    notes,
    discountCode,
    discountLabel,
    paymentId,
    isComplimentary,
    pledgeId,
    timestamp,
  } = pledgeData;

  const totalLabel = formatCurrency(totalCents);
  const pizzaLabel = pizzaCount === 1 ? 'pizza' : 'pizzas';
  const timestampStr = timestamp ? new Date(timestamp).toLocaleString('en-US', { timeZone: 'America/Chicago' }) : 'Just now';

  const lines = [
    '🍕 NEW PIZZA FUNDER PLEDGE',
    '═══════════════════════════',
    `Time: ${timestampStr} CT`,
    '',
    `${pizzaCount} ${pizzaLabel} • ${totalLabel}${isComplimentary ? ' (Complimentary)' : ''}`,
    '',
    'CUSTOMER DETAILS',
    '─────────────────',
    `Name: ${funderName || 'Anonymous'}`,
    `Email: ${email}`,
  ];

  if (phone) {
    lines.push(`Phone: ${phone}`);
  }

  lines.push('');
  lines.push('PLEDGE INFORMATION');
  lines.push('──────────────────');
  lines.push(`Pizza Count: ${pizzaCount} ${pizzaLabel}`);
  lines.push(`Amount: ${totalLabel}${isComplimentary ? ' (Complimentary)' : ''}`);

  if (rewardPreference) {
    lines.push(`Reward Preference: ${rewardPreference}`);
  }

  if (discountLabel) {
    lines.push(`Discount Applied: ${discountLabel}`);
  } else if (discountCode) {
    lines.push(`Discount Code: ${discountCode}`);
  }

  if (notes) {
    lines.push('');
    lines.push('CUSTOMER NOTES');
    lines.push('──────────────');
    lines.push(notes);
  }

  lines.push('');
  lines.push('REFERENCE');
  lines.push('─────────');
  lines.push(`Payment ID: ${paymentId}`);

  if (pledgeId) {
    lines.push(`Pledge ID: ${pledgeId}`);
  }

  return lines.join('\n');
};

/**
 * Send pizzafunder receipt emails to customer and admin
 * 
 * @param {Object} options - Email options
 * @param {string} options.funderName - Customer name
 * @param {string} options.email - Customer email
 * @param {string} options.phone - Customer phone (optional)
 * @param {number} options.pizzaCount - Number of pizzas pledged
 * @param {number} options.totalCents - Total amount in cents
 * @param {string} options.rewardPreference - Reward preference (optional)
 * @param {string} options.notes - Customer notes (optional)
 * @param {string} options.discountCode - Discount code used (optional)
 * @param {string} options.discountLabel - Discount label (optional)
 * @param {string} options.paymentId - Payment reference ID
 * @param {boolean} options.isComplimentary - Whether pledge is complimentary
 * @param {number} options.pledgeId - Database pledge ID (optional)
 * @param {string} options.timestamp - Pledge timestamp (optional)
 * @returns {Promise<Object>} Email send results
 */
async function sendPizzafunderReceipts(options = {}) {
  const apiKey = process.env.BREVO_API_KEY;
  const adminEmail =
    process.env.PIZZAFUNDER_ADMIN_EMAIL ||
    process.env.CROWDFUND_RECEIPT_EMAIL ||
    process.env.SUPPORT_INBOX_EMAIL ||
    process.env.TEAM_INBOX_EMAIL ||
    process.env.SENDER_EMAIL;
  const senderEmail = process.env.PIZZAFUNDER_SENDER_EMAIL || process.env.SENDER_EMAIL || adminEmail;
  const senderName = process.env.PIZZAFUNDER_SENDER_NAME || 'Local Effort Pizza Funder';

  // Validate configuration
  if (!apiKey) {
    console.warn('[pizzafunder.receipts] BREVO_API_KEY not configured - skipping email send');
    return { skipped: true, reason: 'No Brevo API key' };
  }

  if (!adminEmail || !senderEmail) {
    console.warn('[pizzafunder.receipts] Email addresses not configured - skipping email send');
    return { skipped: true, reason: 'Email addresses not configured' };
  }

  // Sanitize and prepare data
  const pledgeData = {
    funderName: sanitize(options.funderName, 200),
    email: sanitize(options.email, 120),
    phone: sanitize(options.phone, 50),
    pizzaCount: Number(options.pizzaCount) || 0,
    totalCents: Number(options.totalCents) || 0,
    rewardPreference: sanitize(options.rewardPreference, 120),
    notes: sanitize(options.notes, 1000),
    discountCode: sanitize(options.discountCode, 60),
    discountLabel: sanitize(options.discountLabel, 120),
    paymentId: sanitize(options.paymentId, 80),
    isComplimentary: Boolean(options.isComplimentary) || (Number(options.totalCents) || 0) <= 0,
    pledgeId: options.pledgeId,
    timestamp: options.timestamp,
  };

  const headers = {
    'api-key': apiKey,
    'content-type': 'application/json',
    accept: 'application/json',
  };

  const results = {
    customer: { sent: false },
    admin: { sent: false },
  };

  // Send admin notification email
  try {
    const adminSubject = `🍕 New Pledge: ${pledgeData.funderName || 'Anonymous'} - ${formatCurrency(pledgeData.totalCents)}`;
    
    await postBrevoEmail(headers, {
      to: [{ email: adminEmail }],
      sender: { email: senderEmail, name: senderName },
      subject: adminSubject,
      textContent: buildAdminEmailText(pledgeData),
      htmlContent: buildAdminEmailHtml(pledgeData),
    });

    results.admin.sent = true;
    console.log(`[pizzafunder.receipts] ✅ Admin email sent to ${adminEmail}`);
  } catch (error) {
    console.error('[pizzafunder.receipts] Failed to send admin email:', error.message);
    results.admin.error = error.message;
    // Don't throw - continue to try sending customer email
  }

  // Send customer confirmation email (if email provided)
  if (pledgeData.email) {
    try {
      const customerSubject = '🍕 Thank You for Your Pizza Funder Pledge!';
      
      await postBrevoEmail(headers, {
        to: [{ email: pledgeData.email, name: pledgeData.funderName || undefined }],
        sender: { email: senderEmail, name: senderName },
        subject: customerSubject,
        textContent: buildCustomerEmailText(pledgeData),
        htmlContent: buildCustomerEmailHtml(pledgeData),
      });

      results.customer.sent = true;
      console.log(`[pizzafunder.receipts] ✅ Customer email sent to ${pledgeData.email}`);
    } catch (error) {
      console.error('[pizzafunder.receipts] Failed to send customer email:', error.message);
      results.customer.error = error.message;
    }
  } else {
    console.log('[pizzafunder.receipts] No customer email provided - skipping customer receipt');
    results.customer.skipped = true;
  }

  return results;
}

module.exports = { sendPizzafunderReceipts };
