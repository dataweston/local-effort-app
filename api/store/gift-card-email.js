const escapeHtml = (str = '') => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatSchedule = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Chicago',
    }).format(date);
  } catch (err) {
    return '';
  }
};

const buildRecipientHtml = ({
  amountLabel,
  recipientName,
  buyerName,
  code,
  note,
  deliveryTarget,
  cardType,
  instructions,
  physicalDetails,
  sendOn,
}) => {
  const safeRecipient = escapeHtml(recipientName || 'friend');
  const safeBuyer = escapeHtml(buyerName || 'someone who loves you');
  const safeCode = escapeHtml(code || 'Pending');
  const safeNote = note ? escapeHtml(note).replace(/\n/g, '<br />') : '';
  const safeInstructions = (instructions || []).map((step) => `<li style="margin:6px 0;">${escapeHtml(step)}</li>`).join('');
  const shippingBlock = physicalDetails ? `<div style="margin-top:16px; padding:16px; background:#fef3c7; border-radius:12px; color:#92400e;">
      <strong style="display:block; font-size:15px; margin-bottom:6px;">Physical card is on the way</strong>
      <span style="font-size:14px; line-height:20px;">${escapeHtml(physicalDetails)}</span>
    </div>` : '';
  const noteBlock = safeNote ? `<div style="margin-top:16px; padding:16px; background:#f8fafc; border-radius:12px;">
      <p style="margin:0; font-size:14px; color:#334155;">${safeNote}</p>
    </div>` : '';
  const scheduledLine = sendOn ? `<p style="margin:12px 0 0; font-size:13px; color:#2563eb;">Scheduled delivery: ${escapeHtml(formatSchedule(sendOn) || sendOn)}</p>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Your Local Effort Gift Card</title>
</head>
<body style="margin:0; padding:0; background-color:#fff8f1; font-family:'Helvetica Neue', Arial, sans-serif; color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fb923c,#f97316,#facc15); padding:0;">
    <tr>
      <td style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:rgba(255,255,255,0.95); border-radius:20px; overflow:hidden; box-shadow:0 20px 45px rgba(249,115,22,0.25);">
          <tr>
            <td style="background:#0f172a; padding:28px; text-align:center;">
              <img src="https://res.cloudinary.com/dokyhfvyd/image/upload/f_auto,q_auto,w_96/site/partners/logo_sticker" alt="Local Effort" width="80" height="80" style="display:inline-block; border-radius:20px; border:3px solid rgba(255,255,255,0.35);" />
              <h1 style="margin:16px 0 0; font-size:28px; color:#f8fafc;">Local Effort Gift Card</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0; font-size:16px;">Hey ${safeRecipient},</p>
              <p style="font-size:16px; line-height:24px; margin:12px 0 0;">${safeBuyer} just sent you a ${escapeHtml(cardType === 'physical' ? 'Local Effort gift card (with a leather keepsake on the way!)' : 'Local Effort gift card')} worth <strong>${escapeHtml(amountLabel)}</strong>.</p>
              ${scheduledLine}
              ${noteBlock}
              <div style="margin-top:20px; padding:20px; background:#ecfeff; border:2px dashed #06b6d4; border-radius:16px; text-align:center;">
                <p style="margin:0; font-size:14px; color:#0369a1; letter-spacing:0.08em; text-transform:uppercase;">Your gift card code</p>
                <p style="margin:12px 0 0; font-size:28px; font-weight:700; color:#0f172a; letter-spacing:0.18em;">${safeCode}</p>
              </div>
              <div style="margin-top:24px;">
                <p style="margin:0 0 8px; font-weight:600; color:#dc2626; text-transform:uppercase; letter-spacing:0.06em;">How to redeem</p>
                <ul style="margin:0; padding-left:20px; font-size:15px; color:#1f2937; list-style:circle;">
                  ${safeInstructions}
                </ul>
              </div>
              ${shippingBlock}
              <p style="margin:24px 0 0; font-size:14px; color:#475569;">This email was sent to ${escapeHtml(deliveryTarget === 'recipient' ? 'you directly' : 'the buyer')} so we can make sure your delicious plans go smoothly.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#0f172a; padding:20px 28px; text-align:center; color:#e2e8f0;">
              <p style="margin:0; font-size:14px;">Need to schedule your experience? Email <a href="mailto:hello@localeffortfood.com" style="color:#facc15; text-decoration:none; font-weight:600;">hello@localeffortfood.com</a> and we'll craft a menu together.</p>
              <div style="margin-top:14px;">
                <img src="https://res.cloudinary.com/dokyhfvyd/image/upload/f_auto,q_auto,w_120/vjuesai2mxfavpq9d2df" alt="Local Effort feast" width="120" style="border-radius:12px; box-shadow:0 5px 18px rgba(15,23,42,0.45);" />
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const buildRecipientText = ({ amountLabel, recipientName, buyerName, code, instructions, note, cardType, physicalDetails, sendOn }) => {
  const intro = `Hey ${recipientName || 'there'},\n\n${buyerName || 'A friend'} just sent you a ${cardType === 'physical' ? 'Local Effort gift card (with a leather keepsake headed your way)' : 'Local Effort gift card'} worth ${amountLabel}.`;
  const noteSection = note ? `\n\nTheir note: ${note}` : '';
  const steps = (instructions || []).map((step, idx) => `${idx + 1}. ${step}`).join('\n');
  const shipping = physicalDetails ? `\n\nShipping update: ${physicalDetails}` : '';
  const schedule = sendOn ? `\n\nScheduled delivery: ${formatSchedule(sendOn) || sendOn}` : '';
  return `${intro}${noteSection}${schedule}\n\nGift card code: ${code || 'Pending'}\n\nHow to redeem:\n${steps}${shipping}\n\nQuestions? Email hello@localeffortfood.com.`;
};

const buildBuyerText = ({ amountLabel, buyerName, recipientName, code, cardType, shippingSummary, sendOn, deliveryTarget }) => {
  const schedule = sendOn && cardType !== 'physical'
    ? `\nScheduled delivery: ${formatSchedule(sendOn) || sendOn} (${deliveryTarget === 'recipient' ? 'recipient email' : 'buyer email'})`
    : '';
  return `Hi ${buyerName || 'there'},\n\nThanks for purchasing a Local Effort gift card for ${recipientName || 'your guest'}!\n\nDetails:\nAmount: ${amountLabel}\nType: ${cardType === 'physical' ? 'Physical card with leather holder' : 'Digital'}${schedule}\nGift card code: ${code || 'Pending'}${shippingSummary ? `\nShipping: ${shippingSummary}` : ''}\n\nWe'll follow up if we need anything else. Thanks for supporting local food!`;
};

const buildTeamText = ({ amountLabel, buyer, recipient, note, deliveryTarget, cardType, shipping, paymentId, giftCardId, code, sendOn }) => {
  const lines = [
    `Amount: ${amountLabel}`,
    `Payment ID: ${paymentId || 'n/a'}`,
    `Gift Card ID: ${giftCardId || 'n/a'}`,
    `Gift Card Code: ${code || 'n/a'}`,
    `Card Type: ${cardType}`,
    `Delivery Target: ${deliveryTarget}`,
    '',
    'Buyer:',
    `  Name: ${buyer?.name || ''}`,
    `  Email: ${buyer?.email || ''}`,
    `  Phone: ${buyer?.phone || ''}`,
    '',
    'Recipient:',
    `  Name: ${recipient?.name || ''}`,
    `  Email: ${recipient?.email || ''}`,
    `  Phone: ${recipient?.phone || ''}`,
  ];
  if (sendOn && cardType !== 'physical') {
    lines.push(`Scheduled Send: ${formatSchedule(sendOn) || sendOn}`);
  }
  if (shipping && shipping.address) {
    const addr = shipping.address;
    lines.push('', 'Shipping Address:');
    lines.push(`  ${addr.line1}`);
    if (addr.line2) lines.push(`  ${addr.line2}`);
    lines.push(`  ${addr.city}, ${addr.state} ${addr.postal}`);
    lines.push(`  Ship To: ${shipping.shipTo}`);
  }
  if (note) {
    lines.push('', 'Recipient note:', note);
  }
  return lines.join('\n');
};

module.exports = {
  escapeHtml,
  formatSchedule,
  buildRecipientHtml,
  buildRecipientText,
  buildBuyerText,
  buildTeamText,
};
