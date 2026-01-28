const crypto = require('crypto');
const { Client, Environment } = require('square');
const { PrismaClient } = require('@prisma/client');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = process.env.SQUARE_ENVIRONMENT || 'Production';

let squareClient = null;
try {
  if (ACCESS_TOKEN) {
    const env = Environment && Environment[ENV_NAME] ? Environment[ENV_NAME] : Environment.Production;
    squareClient = new Client({ accessToken: ACCESS_TOKEN, environment: env });
  }
} catch (_err) {
  squareClient = null;
}

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const summarizeCounts = (items) => items.reduce(
  (acc, item) => {
    const qty = Number(item.quantity) || 0;
    if (item.isAddon) acc.addOns += qty;
    else acc.entrees += qty;
    acc.total += qty;
    return acc;
  },
  { entrees: 0, addOns: 0, total: 0 }
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!squareClient) {
    return res.status(500).json({ error: 'Square not configured' });
  }
  if (!LOCATION_ID) {
    return res.status(500).json({ error: 'Square location not configured' });
  }

  const {
    menuWeekId,
    customerId,
    customerSlug,
    tier,
    rules,
    items = [],
    totalsCents,
    paymentToken,
  } = req.body || {};

  if (!menuWeekId || !customerId) {
    return res.status(400).json({ error: 'Missing menuWeekId or customerId' });
  }

  if (!paymentToken) {
    return res.status(400).json({ error: 'Missing payment token' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items submitted' });
  }

  const counts = summarizeCounts(items);
  const requiredEntrees = Number(rules?.requiredEntrees ?? 0);
  const addOnMax = Number(rules?.addOnMax ?? 0);
  const maxTotalItems = Number(rules?.maxTotalItems ?? 0);

  if (requiredEntrees && counts.entrees < requiredEntrees) {
    return res.status(400).json({ error: 'Entree requirement not met' });
  }
  if (addOnMax && counts.addOns > addOnMax) {
    return res.status(400).json({ error: 'Add-on limit exceeded' });
  }
  if (maxTotalItems && counts.total > maxTotalItems) {
    return res.status(400).json({ error: 'Item limit exceeded' });
  }

  const computedTotal = items.reduce(
    (sum, item) => sum + (Number(item.unitPriceCents) || 0) * (Number(item.quantity) || 0),
    0
  );
  const amountCents = Number.isFinite(totalsCents) && totalsCents > 0 ? totalsCents : computedTotal;
  if (!amountCents || amountCents <= 0) {
    return res.status(400).json({ error: 'Invalid total amount' });
  }

  const idempotencyKey = crypto.randomUUID();

  try {
    const paymentBody = {
      sourceId: paymentToken,
      idempotencyKey,
      amountMoney: { amount: Math.round(amountCents), currency: 'USD' },
      locationId: LOCATION_ID,
      autocomplete: true,
      note: `Weekly order (${tier || 'member'}) - ${customerSlug || customerId}`,
      referenceId: `weekly-order-${menuWeekId}`,
    };

    const paymentResp = await squareClient.paymentsApi.createPayment(paymentBody);
    const paymentId = paymentResp.result.payment?.id || null;

    let dbRecorded = false;
    let orderId = null;
    if (prisma && prisma.order && prisma.orderItem) {
      try {
        const order = await prisma.order.create({
          data: {
            menuWeekId,
            customerId,
            submittedAt: new Date(),
            status: 'paid',
            squarePaymentId: paymentId,
            totalsCents: Math.round(amountCents),
            tier: tier || null,
            items: {
              createMany: {
                data: items.map((item) => ({
                  dishId: item.dishId,
                  quantity: Math.round(Number(item.quantity) || 0),
                  unitPriceCents: Math.round(Number(item.unitPriceCents) || 0),
                  isAddon: Boolean(item.isAddon),
                })),
              },
            },
          },
        });
        dbRecorded = true;
        orderId = order?.id || null;
      } catch (err) {
        console.warn('[weekly-order] prisma insert failed', err?.message || err);
      }
    }

    return res.status(200).json({
      ok: true,
      paymentId,
      orderId,
      dbRecorded,
    });
  } catch (err) {
    const msg = err?.errors ? JSON.stringify(err.errors) : err?.message || 'Checkout failed';
    console.error('[weekly-order] checkout error', msg);
    return res.status(500).json({ error: msg });
  }
};
