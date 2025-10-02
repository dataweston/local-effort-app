const { Client, Environment } = require('square');
const crypto = require('crypto');

let db = null;
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp();
  db = admin.firestore();
} catch (_) {
  db = null;
}

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = ((process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase() === 'sandbox') ? 'Sandbox' : 'Production';

let sq = null;
try {
  if (ACCESS_TOKEN) {
    const env = Environment[ENV_NAME] || Environment.Production;
    sq = new Client({ accessToken: ACCESS_TOKEN, environment: env });
  }
} catch (_) {
  sq = null;
}

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_GIFTCARD_LIST_ID ? Number(process.env.BREVO_GIFTCARD_LIST_ID) : null;
const TEAM_EMAIL = process.env.GIFTCARD_TEAM_EMAIL || process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
const SENDER_EMAIL = process.env.SENDER_EMAIL || TEAM_EMAIL;

const createKey = () => (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
const toCents = (value) => {
  const num = typeof value === 'string' ? Number(value.replace(/[^0-9.]/g, '')) : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
};
const escapeHtml = (str = '') => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
const formatUsd = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
const mapAddress = (address = {}) => ({
  line1: (address.line1 || '').trim(),
  line2: (address.line2 || '').trim(),
  city: (address.city || '').trim(),
  state: (address.state || '').trim(),
  postal: (address.postal || '').trim(),
});

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

const buildRecipientText = ({ amountLabel, recipientName, buyerName, code, instructions, note, cardType, physicalDetails }) => {
  const intro = `Hey ${recipientName || 'there'},\n\n${buyerName || 'A friend'} just sent you a ${cardType === 'physical' ? 'Local Effort gift card (with a leather keepsake headed your way)' : 'Local Effort gift card'} worth ${amountLabel}.`;
  const noteSection = note ? `\n\nTheir note: ${note}` : '';
  const steps = (instructions || []).map((step, idx) => `${idx + 1}. ${step}`).join('\n');
  const shipping = physicalDetails ? `\n\nShipping update: ${physicalDetails}` : '';
  return `${intro}${noteSection}\n\nGift card code: ${code || 'Pending'}\n\nHow to redeem:\n${steps}${shipping}\n\nQuestions? Email hello@localeffortfood.com.`;
};

const buildBuyerText = ({ amountLabel, buyerName, recipientName, code, cardType, shippingSummary }) => {
  return `Hi ${buyerName || 'there'},\n\nThanks for purchasing a Local Effort gift card for ${recipientName || 'your guest'}!\n\nDetails:\nAmount: ${amountLabel}\nType: ${cardType === 'physical' ? 'Physical card with leather holder' : 'Digital'}\nGift card code: ${code || 'Pending'}${shippingSummary ? `\nShipping: ${shippingSummary}` : ''}\n\nWe'll follow up if we need anything else. Thanks for supporting local food!`;
};

const buildTeamText = ({ amountLabel, buyer, recipient, note, deliveryTarget, cardType, shipping, paymentId, giftCardId, code }) => {
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

const upsertBrevoContact = async ({ email, attributes }) => {
  if (!BREVO_API_KEY || !email) return;
  const headers = { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' };
  const body = { email, attributes };
  if (BREVO_LIST_ID && Number.isFinite(BREVO_LIST_ID)) body.listIds = [BREVO_LIST_ID];
  try {
    const resp = await fetch('https://api.brevo.com/v3/contacts', { method: 'POST', headers, body: JSON.stringify(body) });
    if (resp.status === 201) return;
    if (resp.status === 400) {
      const updateResp = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, { method: 'PUT', headers, body: JSON.stringify(body) });
      if (!updateResp.ok && process.env.NODE_ENV !== 'production') {
        console.warn('[gift-card] Brevo update failed', await updateResp.text());
      }
    } else if (!resp.ok && process.env.NODE_ENV !== 'production') {
      console.warn('[gift-card] Brevo create failed', await resp.text());
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[gift-card] Brevo request error', err?.message);
    }
  }
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!sq) return res.status(500).json({ error: 'Square not configured' });
  if (!LOCATION_ID) return res.status(500).json({ error: 'Square location missing' });

  try {
    const { amount, token, buyer = {}, recipient = {}, note = '', deliveryTarget = 'recipient', cardType = 'digital', shipping = null } = req.body || {};
    const amountCents = toCents(amount);
    const buyerName = (buyer.name || '').trim();
    const buyerEmail = (buyer.email || '').trim();
    const buyerPhone = (buyer.phone || '').trim();
    const recipientName = (recipient.name || '').trim();
    const recipientEmail = (recipient.email || '').trim();
    const recipientPhone = (recipient.phone || '').trim();

    if (!token) return res.status(400).json({ error: 'Missing payment token' });
    if (!amountCents || amountCents < 5000) return res.status(400).json({ error: 'Amount must be at least $50' });
    if (!buyerName || !buyerEmail) return res.status(400).json({ error: 'Buyer name and email required' });
    if (deliveryTarget === 'recipient' && !recipientEmail) {
      return res.status(400).json({ error: 'Recipient email required when delivering to recipient' });
    }
    const wantsPhysical = cardType === 'physical';
    if (wantsPhysical && amountCents < 25000) {
      return res.status(400).json({ error: 'Physical gift cards require $250 or more' });
    }

    const shippingAddress = wantsPhysical && shipping && shipping.address ? mapAddress(shipping.address) : null;
    const shipTo = wantsPhysical && shipping ? (shipping.shipTo === 'recipient' ? 'recipient' : 'buyer') : null;
    if (wantsPhysical && (!shippingAddress || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postal)) {
      return res.status(400).json({ error: 'Shipping address required for physical cards' });
    }

    const amountLabel = formatUsd(amountCents);

    // Capture payment first
    const paymentResp = await sq.paymentsApi.createPayment({
      sourceId: token,
      idempotencyKey: createKey(),
      amountMoney: { amount: amountCents, currency: 'USD' },
      locationId: LOCATION_ID,
      buyerEmailAddress: buyerEmail,
      note: `Gift card for ${recipientName || 'recipient'} (${amountLabel})`.slice(0, 60),
      metadata: {
        gift_card_amount_cents: String(amountCents),
        gift_card_buyer_name: buyerName.slice(0, 60),
        gift_card_recipient_name: (recipientName || '').slice(0, 60),
        gift_card_delivery: deliveryTarget,
        gift_card_physical: wantsPhysical ? 'true' : 'false',
      },
    });
    const paymentId = paymentResp?.result?.payment?.id;
    if (!paymentId) throw new Error('Payment processing failed');

    // Create digital gift card (always digital; physical option triggers fulfillment later)
    const giftCardResp = await sq.giftCardsApi.createGiftCard({
      idempotencyKey: createKey(),
      locationId: LOCATION_ID,
      giftCard: { type: 'DIGITAL' },
    });
    const giftCard = giftCardResp?.result?.giftCard;
    if (!giftCard?.id) throw new Error('Failed to create gift card');

    await sq.giftCardActivitiesApi.createGiftCardActivity({
      idempotencyKey: createKey(),
      locationId: LOCATION_ID,
      giftCardId: giftCard.id,
      type: 'LOAD',
      loadActivityDetails: { amountMoney: { amount: amountCents, currency: 'USD' } },
    });

    const code = giftCard.gan || 'Generated';

    const instructions = [
      'Reach out to hello@localeffortfood.com or reply to this email to book your experience.',
      'Share this gift card code so we can apply it when we send your Square invoice.',
      'Enjoy a seasonal menu crafted just for you and your crew.',
    ];

    const physicalDetails = wantsPhysical
      ? `We will mail the leather gift card package to ${shipTo === 'recipient' ? 'the recipient' : 'you'} at ${shippingAddress.line1}${shippingAddress.line2 ? ', ' + shippingAddress.line2 : ''}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal}.`
      : null;

    const deliveryEmail = deliveryTarget === 'recipient' ? recipientEmail : buyerEmail;

    const payload = {
      amountLabel,
      buyerName,
      buyerEmail,
      buyerPhone,
      recipientName,
      recipientEmail,
      recipientPhone,
      deliveryTarget,
      cardType: wantsPhysical ? 'physical' : 'digital',
      shipping: wantsPhysical ? { shipTo, address: shippingAddress } : null,
      note,
      paymentId,
      giftCardId: giftCard.id,
      code,
    };

    if (db) {
      try {
        await db.collection('giftCardPurchases').doc(paymentId).set({
          ...payload,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[gift-card] Firestore save failed', err?.message);
        }
      }
    }

    if (BREVO_API_KEY && SENDER_EMAIL && TEAM_EMAIL) {
      const headers = { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' };

      const recipientHtml = buildRecipientHtml({
        amountLabel,
        recipientName,
        buyerName,
        code,
        note,
        deliveryTarget,
        cardType: payload.cardType,
        instructions,
        physicalDetails,
      });
      const recipientText = buildRecipientText({ amountLabel, recipientName, buyerName, code, instructions, note, cardType: payload.cardType, physicalDetails });

      const buyerText = buildBuyerText({ amountLabel, buyerName, recipientName, code, cardType: payload.cardType, shippingSummary: physicalDetails });

      const teamText = buildTeamText({ amountLabel, buyer, recipient, note, deliveryTarget, cardType: payload.cardType, shipping: payload.shipping, paymentId, giftCardId: giftCard.id, code });

      // Send to recipient/buyer target
      if (deliveryEmail) {
        try {
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              to: [{ email: deliveryEmail, name: deliveryTarget === 'recipient' ? recipientName || buyerName : buyerName || recipientName }],
              sender: { email: SENDER_EMAIL, name: 'Local Effort' },
              subject: `${buyerName || 'A friend'} sent you a Local Effort gift card`,
              htmlContent: recipientHtml,
              textContent: recipientText,
            }),
          });
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[gift-card] recipient email failed', err?.message);
          }
        }
      }

      // Send receipt/summary to buyer
      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            to: [{ email: buyerEmail, name: buyerName }],
            sender: { email: SENDER_EMAIL, name: 'Local Effort' },
            subject: 'Thanks for gifting Local Effort',
            textContent: buyerText,
          }),
        });
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[gift-card] buyer email failed', err?.message);
        }
      }

      // Team notification
      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            to: [{ email: TEAM_EMAIL }],
            sender: { email: SENDER_EMAIL, name: 'Local Effort Gift Cards' },
            subject: `Gift card purchase ${amountLabel}`,
            textContent: teamText,
          }),
        });
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[gift-card] team email failed', err?.message);
        }
      }

      await upsertBrevoContact({
        email: buyerEmail,
        attributes: {
          FIRSTNAME: buyerName.split(' ')[0] || buyerName,
          LASTNAME: buyerName.split(' ').slice(1).join(' ') || '',
          PHONE: buyerPhone || '',
          LASTGIFTAMOUNT: amountLabel,
        },
      });

      if (deliveryTarget === 'recipient' && recipientEmail) {
        await upsertBrevoContact({
          email: recipientEmail,
          attributes: {
            FIRSTNAME: recipientName.split(' ')[0] || recipientName,
            LASTNAME: recipientName.split(' ').slice(1).join(' ') || '',
            PHONE: recipientPhone || '',
            LASTGIFTAMOUNT: amountLabel,
            GIFTBUYER: buyerName,
          },
        });
      }
    }

    return res.status(200).json({ ok: true, code, amount: amountCents, paymentId, giftCardId: giftCard.id, cardType: wantsPhysical ? 'physical' : 'digital' });
  } catch (err) {
    const details = err?.errors ? JSON.stringify(err.errors) : err?.message || 'Gift card checkout failed';
    if (process.env.NODE_ENV !== 'production') {
      console.error('[gift-card] error', err);
    }
    return res.status(500).json({ error: details });
  }
};
