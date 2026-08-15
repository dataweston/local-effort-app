const crypto = require('crypto');
const { Client, Environment } = require('square');
const { prisma } = require('../_lib/prisma');
const {
  markPaymentAttemptFailed,
  markPaymentAttemptSucceeded,
} = require('../../backend/api/finance/paymentAttempts');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = process.env.SQUARE_ENVIRONMENT || 'Production';
const sanitizeIdempotencyKey = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 45);
};

let squareClient = null;
try {
  if (ACCESS_TOKEN) {
    const env = Environment && Environment[ENV_NAME] ? Environment[ENV_NAME] : Environment.Production;
    squareClient = new Client({ accessToken: ACCESS_TOKEN, environment: env });
  }
} catch (_err) {
  squareClient = null;
}


const summarizeCounts = (items) => items.reduce(
  (acc, item) => {
    const qty = Number(item.quantity) || 0;
    if (item.isAddon) acc.addOns += qty;
    else acc.entrees += qty;
    acc.total += qty;
    const slug = item.sectionSlug || (item.isAddon ? 'add-ons' : 'entrees');
    acc.bySection[slug] = (acc.bySection[slug] || 0) + qty;
    return acc;
  },
  { entrees: 0, addOns: 0, total: 0, bySection: {} }
);

const normalizeSectionRules = (rawRules) => {
  if (!rawRules) return {};
  const rules = {};
  if (Array.isArray(rawRules)) {
    rawRules.forEach((entry) => {
      if (!entry?.slug) return;
      rules[entry.slug] = {
        min: Number(entry.min) || 0,
        max: Number(entry.max) || 0,
        label: entry.label || entry.slug,
      };
    });
    return rules;
  }
  if (typeof rawRules === 'object') {
    Object.entries(rawRules).forEach(([slug, entry]) => {
      if (!slug) return;
      rules[slug] = {
        min: Number(entry?.min) || 0,
        max: Number(entry?.max) || 0,
        label: entry?.label || slug,
      };
    });
  }
  return rules;
};

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
  // Payment integrity is fail-closed: a durable order and pending attempt must
  // exist before Square is allowed to move money.
  if (!prisma) {
    return res.status(503).json({ error: 'Ordering database unavailable. No payment was taken.' });
  }

  const {
    menuWeekId,
    customerId,
    customerSlug,
    tier,
    rules,
    items = [],
    paymentToken,
    verificationToken,
    checkoutAttemptId,
    basePriceCents,
    deliveryFeeCents,
    userEmail,
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

  let resolvedItems = items.map((item) => ({
    ...item,
    sectionSlug: item.sectionSlug || (item.isAddon ? 'add-ons' : 'entrees'),
  }));

  let resolvedPlan = {
    basePriceCents: Number(basePriceCents) || 0,
    deliveryFeeCents: Number(deliveryFeeCents) || 0,
  };

  let resolvedRules = rules || {};

  if (prisma) {
    const dishIds = items.map((item) => item.dishId).filter(Boolean);
    const [menuWeek, customer, menuWeekItems, priceRows, overrideRows, planRow] = await Promise.all([
      prisma.menuWeek.findUnique({ where: { id: menuWeekId } }),
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.menuWeekItem.findMany({
        where: { menuWeekId, dishId: { in: dishIds } },
        include: { section: true },
      }),
      prisma.dishPrice.findMany({
        where: { menuWeekId, dishId: { in: dishIds } },
      }),
      prisma.customerPriceOverride.findMany({
        where: { menuWeekId, customerId, dishId: { in: dishIds } },
      }),
      prisma.customerPlan.findFirst({
        where: { menuWeekId, customerId },
      }),
    ]);

    if (!menuWeek) {
      return res.status(400).json({ error: 'Menu week not found' });
    }
    if (menuWeek.cutoffAt && new Date(menuWeek.cutoffAt) < new Date()) {
      return res.status(400).json({ error: 'Ordering is closed for this week' });
    }

    if (customer?.planRulesJson) {
      resolvedRules = customer.planRulesJson;
    }

    if (planRow) {
      resolvedPlan = {
        basePriceCents: planRow.basePriceCents || 0,
        deliveryFeeCents: planRow.deliveryFeeCents || 0,
      };
    }

    const priceMap = new Map();
    priceRows.forEach((row) => {
      priceMap.set(`${row.dishId}-${row.tier}`, row.priceCents);
    });
    const overrideMap = new Map();
    overrideRows.forEach((row) => {
      overrideMap.set(row.dishId, row.priceCents);
    });

    let userOverrideMap = new Map();
    if (userEmail) {
      const user = await prisma.user.findFirst({ where: { email: userEmail.toLowerCase() } });
      if (user) {
        const userOverrides = await prisma.userPriceOverride.findMany({
          where: { menuWeekId, userId: user.id, dishId: { in: dishIds } },
        });
        userOverrideMap = new Map(userOverrides.map((row) => [row.dishId, row.priceCents]));
      }
    }

    const menuItemMap = new Map(menuWeekItems.map((item) => [item.dishId, item]));

    resolvedItems = items.map((item) => {
      const menuItem = menuItemMap.get(item.dishId);
      const includedInPlan = menuItem?.includedInPlan ?? item.includedInPlan;
      const isAddon = menuItem?.isAddon ?? item.isAddon;
      const sectionSlug = menuItem?.section?.slug || item.sectionSlug || (isAddon ? 'add-ons' : 'entrees');
      const override = userOverrideMap.has(item.dishId)
        ? userOverrideMap.get(item.dishId)
        : overrideMap.get(item.dishId);
      const basePrice = priceMap.get(`${item.dishId}-${tier}`);
      const unitPriceCents = includedInPlan ? 0 : (Number.isFinite(override) ? override : basePrice ?? 0);
      return {
        ...item,
        isAddon,
        includedInPlan: Boolean(includedInPlan),
        sectionSlug,
        unitPriceCents,
      };
    });
  }

  const counts = summarizeCounts(resolvedItems);
  const requiredEntrees = Number(resolvedRules?.requiredEntrees ?? 0);
  const addOnMax = Number(resolvedRules?.addOnMax ?? 0);
  const maxTotalItems = Number(resolvedRules?.maxTotalItems ?? 0);
  const sectionRules = normalizeSectionRules(resolvedRules?.sectionRules);

  if (Object.keys(sectionRules).length) {
    for (const [slug, rule] of Object.entries(sectionRules)) {
      const count = counts.bySection[slug] || 0;
      const min = Number(rule.min) || 0;
      const max = Number(rule.max) || 0;
      if (min && count < min) {
        return res.status(400).json({ error: `Section requirement not met: ${slug}` });
      }
      if (max && count > max) {
        return res.status(400).json({ error: `Section limit exceeded: ${slug}` });
      }
    }
  } else if (requiredEntrees && counts.entrees < requiredEntrees) {
    return res.status(400).json({ error: 'Entree requirement not met' });
  }

  if (addOnMax && counts.addOns > addOnMax) {
    return res.status(400).json({ error: 'Add-on limit exceeded' });
  }
  if (maxTotalItems && counts.total > maxTotalItems) {
    return res.status(400).json({ error: 'Item limit exceeded' });
  }

  const computedItemsTotal = resolvedItems.reduce(
    (sum, item) => sum + (Number(item.unitPriceCents) || 0) * (Number(item.quantity) || 0),
    0
  );
  const computedTotal = computedItemsTotal + (resolvedPlan.basePriceCents || 0) + (resolvedPlan.deliveryFeeCents || 0);
  const amountCents = computedTotal;
  if (!amountCents || amountCents <= 0) {
    return res.status(400).json({ error: 'Invalid total amount' });
  }

  const idempotencyKey = sanitizeIdempotencyKey(checkoutAttemptId) || crypto.randomUUID();

  try {
    let paymentAttempt = await prisma.financePaymentAttempt.findUnique({
      where: { provider_idempotencyKey: { provider: 'square', idempotencyKey } },
      include: { weeklyOrder: true },
    });

    if (paymentAttempt && paymentAttempt.requestedCents !== Math.round(amountCents)) {
      return res.status(409).json({ error: 'Checkout attempt amount changed. Please start checkout again.' });
    }
    if (paymentAttempt?.status === 'succeeded' && paymentAttempt.externalPaymentId) {
      return res.status(200).json({
        ok: true,
        paymentId: paymentAttempt.externalPaymentId,
        orderId: paymentAttempt.weeklyOrderId,
        dbRecorded: true,
        idempotentReplay: true,
      });
    }
    if (paymentAttempt?.status === 'failed') {
      return res.status(409).json({ error: 'This checkout attempt failed. Please try again.' });
    }

    if (!paymentAttempt) {
      try {
        const pendingOrder = await prisma.order.create({
          data: {
            menuWeekId,
            customerId,
            status: 'payment_pending',
            totalsCents: Math.round(amountCents),
            basePriceCents: resolvedPlan.basePriceCents || 0,
            deliveryFeeCents: resolvedPlan.deliveryFeeCents || 0,
            tier: tier || null,
            items: {
              createMany: {
                data: resolvedItems.map((item) => ({
                  dishId: item.dishId,
                  quantity: Math.round(Number(item.quantity) || 0),
                  unitPriceCents: Math.round(Number(item.unitPriceCents) || 0),
                  isAddon: Boolean(item.isAddon),
                  includedInPlan: Boolean(item.includedInPlan),
                })),
              },
            },
            paymentAttempts: {
              create: {
                provider: 'square',
                idempotencyKey,
                status: 'pending',
                requestedCents: Math.round(amountCents),
                currency: 'USD',
                metadata: {
                  channel: 'weekly_order',
                  menuWeekId,
                  customerId,
                },
              },
            },
          },
          include: { paymentAttempts: true },
        });
        paymentAttempt = pendingOrder.paymentAttempts[0];
      } catch (error) {
        // A concurrent replay can win the unique idempotency-key insert. Load
        // its durable attempt instead of creating another order.
        if (error?.code !== 'P2002') throw error;
        paymentAttempt = await prisma.financePaymentAttempt.findUnique({
          where: { provider_idempotencyKey: { provider: 'square', idempotencyKey } },
          include: { weeklyOrder: true },
        });
        if (!paymentAttempt) throw error;
      }
    }

    const orderId = paymentAttempt.weeklyOrderId;
    const paymentBody = {
      sourceId: paymentToken,
      idempotencyKey,
      amountMoney: { amount: Math.round(amountCents), currency: 'USD' },
      locationId: LOCATION_ID,
      autocomplete: true,
      note: `Weekly order (${tier || 'member'}) - ${customerSlug || customerId}`,
      referenceId: orderId,
    };
    if (verificationToken) {
      paymentBody.verificationToken = verificationToken;
    }

    let paymentResp;
    try {
      paymentResp = await squareClient.paymentsApi.createPayment(paymentBody);
    } catch (paymentError) {
      try {
        await markPaymentAttemptFailed({ prisma, attemptId: paymentAttempt.id, error: paymentError });
      } catch (stateError) {
        console.error('[weekly-order] failed to persist payment failure', stateError?.message || stateError);
      }
      throw paymentError;
    }
    const payment = paymentResp.result.payment;
    const paymentId = payment?.id || null;

    try {
      await markPaymentAttemptSucceeded({
        prisma,
        attemptId: paymentAttempt.id,
        provider: 'square',
        payment,
        amountCents,
      });
    } catch (stateError) {
      // The pre-existing pending attempt is the recovery anchor. Do not tell a
      // customer a captured payment failed merely because the state transition
      // needs webhook/reconciliation repair.
      console.error('[weekly-order] payment captured; state reconciliation pending', {
        orderId,
        paymentId,
        error: stateError?.message || stateError,
      });
      return res.status(200).json({
        ok: true,
        paymentId,
        orderId,
        dbRecorded: true,
        reconciliationPending: true,
      });
    }

    return res.status(200).json({
      ok: true,
      paymentId,
      orderId,
      dbRecorded: true,
    });
  } catch (err) {
    const msg = err?.errors ? JSON.stringify(err.errors) : err?.message || 'Checkout failed';
    console.error('[weekly-order] checkout error', msg);
    return res.status(500).json({ error: msg });
  }
};
