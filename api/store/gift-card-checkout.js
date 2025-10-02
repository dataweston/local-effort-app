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
const formatUsd = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
const mapAddress = (address = {}) => ({
  line1: (address.line1 || '').trim(),
  line2: (address.line2 || '').trim(),
  city: (address.city || '').trim(),
  state: (address.state || '').trim(),
  postal: (address.postal || '').trim(),
});
const { buildRecipientHtml, buildRecipientText, buildBuyerText, buildTeamText } = require('./gift-card-email');

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

const giftCardCheckout = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!sq) return res.status(500).json({ error: 'Square not configured' });
  if (!LOCATION_ID) return res.status(500).json({ error: 'Square location missing' });

  try {
    const { amount, token, buyer = {}, recipient = {}, note = '', deliveryTarget = 'recipient', cardType = 'digital', shipping = null, sendOn = null } = req.body || {};
    const amountCents = toCents(amount);
    const buyerName = (buyer.name || '').trim();
    const buyerEmail = (buyer.email || '').trim();
    const buyerPhone = (buyer.phone || '').trim();
    const recipientName = (recipient.name || '').trim();
    const recipientEmail = (recipient.email || '').trim();
    const recipientPhone = (recipient.phone || '').trim();
    const isDigital = cardType !== 'physical';
    const sendOnDate = sendOn ? new Date(sendOn) : null;
    if (sendOn && Number.isNaN(sendOnDate?.getTime())) {
      return res.status(400).json({ error: 'Invalid send date' });
    }

    if (!token) return res.status(400).json({ error: 'Missing payment token' });
    if (!amountCents || amountCents < 5000) return res.status(400).json({ error: 'Amount must be at least $50' });
    if (!buyerName || !buyerEmail) return res.status(400).json({ error: 'Buyer name and email required' });
    if (deliveryTarget === 'recipient' && !recipientEmail) {
      return res.status(400).json({ error: 'Recipient email required when delivering to recipient' });
    }
    const wantsPhysical = cardType === 'physical';
    if (sendOnDate && wantsPhysical) {
      return res.status(400).json({ error: 'Scheduled delivery is only available for digital gift cards' });
    }
    if (sendOnDate) {
      const now = Date.now();
      const minDelay = 5 * 60 * 1000; // 5 minutes buffer for scheduled delivery
      if (sendOnDate.getTime() <= now + minDelay) {
        return res.status(400).json({ error: 'Send date must be at least 5 minutes in the future' });
      }
    }
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
      sendOn: sendOnDate ? sendOnDate.toISOString() : null,
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
        sendOn: sendOnDate ? sendOnDate.toISOString() : null,
      });
      const recipientText = buildRecipientText({ amountLabel, recipientName, buyerName, code, instructions, note, cardType: payload.cardType, physicalDetails, sendOn: sendOnDate ? sendOnDate.toISOString() : null });

      const buyerText = buildBuyerText({ amountLabel, buyerName, recipientName, code, cardType: payload.cardType, shippingSummary: physicalDetails, sendOn: sendOnDate ? sendOnDate.toISOString() : null, deliveryTarget });

      const teamText = buildTeamText({ amountLabel, buyer, recipient, note, deliveryTarget, cardType: payload.cardType, shipping: payload.shipping, paymentId, giftCardId: giftCard.id, code, sendOn: sendOnDate ? sendOnDate.toISOString() : null });

      // Send to recipient/buyer target
      if (deliveryEmail) {
        try {
          const scheduledAt = sendOnDate && isDigital && deliveryTarget === 'recipient' ? sendOnDate.toISOString() : null;
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              to: [{ email: deliveryEmail, name: deliveryTarget === 'recipient' ? recipientName || buyerName : buyerName || recipientName }],
              sender: { email: SENDER_EMAIL, name: 'Local Effort' },
              subject: `${buyerName || 'A friend'} sent you a Local Effort gift card`,
              htmlContent: recipientHtml,
              textContent: recipientText,
              ...(scheduledAt ? { scheduledAt } : {}),
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

    return res.status(200).json({ ok: true, code, amount: amountCents, paymentId, giftCardId: giftCard.id, cardType: wantsPhysical ? 'physical' : 'digital', sendOn: sendOnDate ? sendOnDate.toISOString() : null });
  } catch (err) {
    const details = err?.errors ? JSON.stringify(err.errors) : err?.message || 'Gift card checkout failed';
    if (process.env.NODE_ENV !== 'production') {
      console.error('[gift-card] error', err);
    }
    return res.status(500).json({ error: details });
  }
};

module.exports = giftCardCheckout;
