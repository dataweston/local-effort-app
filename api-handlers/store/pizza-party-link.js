// GET /api/store/pizza-party-link?date=Oct%202&email=test@example.com&addOnGuests=10
// Returns a Square payment link (or error) for the $300 Pizza Party event specifying the selected date in the note.
// Optionally adds salads + dessert add-on at $9 per guest when addOnGuests provided (>0).

const crypto = require('crypto');
const { Client, Environment } = require('square');
const { prisma } = require('../_lib/prisma');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = process.env.SQUARE_ENVIRONMENT || 'Production';

let sq = null;
try {
  if (ACCESS_TOKEN) {
    const env = (Environment && Environment[ENV_NAME]) ? Environment[ENV_NAME] : Environment.Production;
    sq = new Client({ accessToken: ACCESS_TOKEN, environment: env });
  }
} catch (e) {
  // ignore; will be handled at runtime
}

const identityPart = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 40);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!sq) return res.status(500).json({ error: 'Square not configured' });
  if (!prisma) return res.status(503).json({ error: 'Payment records unavailable' });

  const { date, email, addOnGuests } = req.query || {};
  if (!date) return res.status(400).json({ error: 'Missing date' });

  try {
    const parsedGuests = parseInt(addOnGuests, 10);
    const includedGuests = !Number.isNaN(parsedGuests) && parsedGuests > 0 ? parsedGuests : 0;
    const amountCents = 30000 + includedGuests * 900;
    const normalizedEmail = String(email || '').trim();
    const identity = JSON.stringify([String(date), normalizedEmail.toLowerCase(), includedGuests]);
    const digest = identityPart(identity);
    const idempotencyKey = `pp-${digest}`;
    const orderIdempotencyKey = `ppo-${digest}`;
    const linkIdempotencyKey = `ppl-${digest}`;
    const metadata = {
      offer: 'pizza-party',
      requestedDate: String(date),
      addOnGuests: includedGuests,
      contactEmail: normalizedEmail,
      amountCents,
    };
    const sourceId = `pizza-party-link:${digest}`;

    // Create the confirmation source of truth before asking Square for a link.
    const order = await prisma.commercialOrder.upsert({
      where: { sourceSystem_sourceId: { sourceSystem: 'store', sourceId } },
      create: {
        channel: 'store',
        businessLineKey: 'pizza',
        status: 'payment_pending',
        currency: 'USD',
        subtotalCents: amountCents,
        totalCents: amountCents,
        sourceSystem: 'store',
        sourceId,
        customerEmail: normalizedEmail || null,
        metadata,
        lines: {
          createMany: {
            data: [
              {
                name: 'In-Home Pizza Party (Up to 15 Guests)',
                quantity: 1,
                unitPriceCents: 30000,
                totalCents: 30000,
              },
              ...(includedGuests > 0 ? [{
                name: 'Salads & Dessert Add-On',
                quantity: includedGuests,
                unitPriceCents: 900,
                totalCents: includedGuests * 900,
              }] : []),
            ],
          },
        },
      },
      update: {},
    });
    const attempt = await prisma.financePaymentAttempt.upsert({
      where: { provider_idempotencyKey: { provider: 'square', idempotencyKey } },
      create: {
        provider: 'square',
        idempotencyKey,
        status: 'pending',
        requestedCents: amountCents,
        currency: 'USD',
        commercialOrderId: order.id,
        metadata: { channel: 'pizza_party_hosted_link', offer: 'pizza-party' },
      },
      update: {},
    });

    const lineItems = [
      {
        name: 'In-Home Pizza Party (Up to 15 Guests)',
        quantity: '1',
        basePriceMoney: { amount: 30000, currency: 'USD' }, // $300
        note: `Selected date: ${date}`,
      },
    ];
    if (includedGuests > 0) {
      lineItems.push({
        name: 'Salads & Dessert Add-On',
        quantity: String(includedGuests),
        basePriceMoney: { amount: 900, currency: 'USD' }, // $9 per person
        note: `${includedGuests} guests`,
      });
    }

    const orderResp = await sq.ordersApi.createOrder({
      order: {
        locationId: LOCATION_ID,
        lineItems,
        state: 'OPEN',
        metadata: {
          pizza_party_date: String(date),
          add_on_guests: String(includedGuests),
          commercialOrderId: String(order.id),
        },
        referenceId: order.id,
      },
      idempotencyKey: orderIdempotencyKey,
    });
    const squareOrderId = orderResp.result.order?.id;
    if (!squareOrderId) throw new Error('Order creation failed');
    await prisma.financePaymentAttempt.update({
      where: { id: attempt.id },
      data: { metadata: { ...(attempt.metadata || {}), squareOrderId } },
    });

    const linkResp = await sq.checkoutApi.createPaymentLink({
      idempotencyKey: linkIdempotencyKey,
      orderId: squareOrderId,
      checkoutOptions: {
        merchantSupportEmail: process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL,
        askForShippingAddress: false,
        redirectUrl: `${process.env.PUBLIC_BASE_URL || ''}/pizza-party?booked=${encodeURIComponent(date)}`,
        enableTipping: false,
        prePopulateBuyerEmail: normalizedEmail || undefined,
      },
    });
    const url = linkResp.result.paymentLink?.url;

    return res.status(200).json({ ok: true, url });
  } catch (e) {
    const msg = (e?.errors && JSON.stringify(e.errors)) || e?.message || 'Failed to create payment link';
    return res.status(500).json({ error: msg });
  }
};
