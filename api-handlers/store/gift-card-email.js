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
  const redemptionHref = `mailto:hello@localeffortfood.com?subject=${encodeURIComponent('Redeem my Local Effort gift card')}&body=${encodeURIComponent(`Hello Local Effort,\n\nI'd like to use my gift card (${code || 'Pending'}).\n\nHere's what I have in mind: `)}`;
  const shippingBlock = physicalDetails ? `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #b8ad9f;font-size:14px;line-height:22px;"><strong>Your leather keepsake</strong><br />${escapeHtml(physicalDetails)}</p>` : '';
  const noteBlock = safeNote ? `<div style="margin:24px 0;padding:18px 20px;border-left:3px solid #7a846e;background:#e4e4d8;"><p style="margin:0 0 8px;font:12px Arial,sans-serif;color:#5a6350;">A note from ${safeBuyer}</p><p style="margin:0;font-size:18px;line-height:27px;">${safeNote}</p></div>` : '';
  const scheduledLine = sendOn ? `<p style="margin:16px 0 0;font:13px Arial,sans-serif;color:#5a6350;">Delivery date: ${escapeHtml(formatSchedule(sendOn) || sendOn)}</p>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your Local Effort Gift Card</title>
</head>
<body style="margin:0;padding:0;background:#e4e4d8;color:#3a2e3f;font-family:Georgia,'Times New Roman',serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${safeBuyer} sent you ${escapeHtml(amountLabel)} toward a Local Effort experience.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e4e4d8;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#f3ebe5;border:4px double #3a2e3f;">
        <tr><td style="padding:24px 24px 18px;border-bottom:1px solid #3a2e3f;">
          <p style="margin:0;font:13px Arial,sans-serif;color:#8f3031;">Local Effort Cooperative / gift certificate</p>
          <h1 style="margin:12px 0 0;font-size:34px;font-weight:400;line-height:1.1;">Something good is waiting.</h1>
        </td></tr>
        <tr><td style="padding:20px 24px 0;">
          <img src="https://iiif.micr.io/XcYvw/full/900,/0/default.jpg" alt="Study sheet of fruit, plants and flowers by Theo Nieuwenhuis" width="544" style="display:block;width:100%;max-width:544px;height:auto;border:0;" />
          <p style="margin:8px 0 0;font:11px Arial,sans-serif;color:#5a6350;">Theo Nieuwenhuis · fruit, plants &amp; flowers · 1876–1951<br />Rijksmuseum, RP-T-1969-185(R)</p>
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="margin:0;font-size:18px;line-height:27px;">For ${safeRecipient}, from ${safeBuyer}.</p>
          <p style="margin:12px 0 0;font-size:16px;line-height:25px;">A dinner at home, a pizza party, weekly meals, or something we plan together. Your ${escapeHtml(cardType === 'physical' ? 'gift card and leather keepsake' : 'digital gift card')} starts here.</p>
          ${noteBlock}
          <div style="margin:24px 0;padding:22px 12px;border-top:1px solid #3a2e3f;border-bottom:1px solid #3a2e3f;text-align:center;">
            <p style="margin:0;font-size:48px;line-height:1.1;">${escapeHtml(amountLabel)}</p>
            <p style="margin:10px 0 0;font:12px Arial,sans-serif;color:#5a6350;">Your gift card code</p>
            <p style="margin:8px 0 0;font:18px 'Courier New',monospace;overflow-wrap:anywhere;word-break:break-all;">${safeCode}</p>
          </div>
          <h2 style="margin:0 0 12px;font-size:23px;font-weight:400;">Make a plan.</h2>
          <ol style="margin:0 0 22px;padding-left:20px;font-size:15px;line-height:24px;">${safeInstructions}</ol>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#3a2e3f" style="border:1px solid #3a2e3f;"><a href="${escapeHtml(redemptionHref)}" style="display:inline-block;padding:14px 20px;color:#fffaf2;font:15px Arial,sans-serif;text-decoration:none;">Plan your experience →</a></td></tr></table>
          ${scheduledLine}${shippingBlock}
          <p style="margin:24px 0 0;font:13px Arial,sans-serif;line-height:21px;color:#5a6350;">${deliveryTarget === 'recipient' ? 'You received this email because someone purchased a Local Effort gift card for you.' : 'You chose to receive this gift card yourself. Forward it or print it for your recipient.'} Keep this email and code for redemption.</p>
        </td></tr>
        <tr><td style="padding:18px 24px;border-top:1px solid #3a2e3f;font:13px Arial,sans-serif;line-height:22px;">
          Local Effort · Minneapolis–St. Paul<br />Questions or ready to book? <a href="mailto:hello@localeffortfood.com" style="color:#3a2e3f;">hello@localeffortfood.com</a><br />
          <a href="https://www.localeffortfood.com/gift-cards" style="color:#5a6350;">Local Effort gift cards</a>
        </td></tr>
      </table>
    </td></tr>
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
