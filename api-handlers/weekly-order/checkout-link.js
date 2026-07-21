const crypto = require('crypto');
const { Client, Environment } = require('square');
const { prisma } = require('../_lib/prisma');

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


const createKey = () => (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));

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

  const {
    menuWeekId,
    customerId,
    customerSlug,
    tier,
    rules,
    items = [],
    basePriceCents,
    deliveryFeeCents,
    userEmail,
  } = req.body || {};

  if (!menuWeekId || !customerId) {
    return res.status(400).json({ error: 'Missing menuWeekId or customerId' });
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

  try {
    const response = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: createKey(),
      order: {
        locationId: LOCATION_ID,
        lineItems: [
          {
            name: `Weekly order (${tier || 'member'})`,
            quantity: '1',
            basePriceMoney: { amount: Math.round(amountCents), currency: 'USD' },
          },
        ],
        note: `Weekly order (${tier || 'member'}) - ${customerSlug || customerId}`.slice(0, 500),
      },
      checkoutOptions: {
        redirectUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/weekly-order` : undefined,
      },
    });

    const url = response?.result?.paymentLink?.url;
    if (!url) return res.status(500).json({ error: 'Failed to create payment link' });
    return res.status(200).json({ url });
  } catch (err) {
    const msg = err?.errors ? JSON.stringify(err.errors) : err?.message || 'Checkout link failed';
    return res.status(500).json({ error: msg });
  }
};
