const { PrismaClient } = require('@prisma/client');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getNextMonday = (anchor = new Date()) => {
  const day = anchor.getDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  return addDays(anchor, daysUntilMonday);
};

const buildSampleWeeklyOrder = (slug) => {
  const weekStart = getNextMonday();
  const cutoffAt = new Date(weekStart);
  cutoffAt.setDate(cutoffAt.getDate() - 2);
  cutoffAt.setHours(20, 0, 0, 0);
  const weekStartIso = weekStart.toISOString().slice(0, 10);
  return {
    menuWeek: {
      id: `menu-${weekStartIso}`,
      weekStart: weekStartIso,
      cutoffAt: cutoffAt.toISOString(),
      status: 'published',
    },
    customer: {
      id: 'customer-sample',
      slug: slug || 'weekly-order',
      name: 'Local Effort Weekly',
      priceTierDefault: 'subscriber',
      planRulesJson: {
        requiredEntrees: 5,
        addOnMax: 4,
        maxTotalItems: 12,
        allowDuplicates: true,
      },
    },
    plan: {
      basePriceCents: 0,
      deliveryFeeCents: 0,
    },
    menuItems: [],
    sections: [],
    orderHistory: [],
    currentOrder: null,
  };
};

const resolveMenuWeek = async () => {
  const now = new Date();
  const upcoming = await prisma.menuWeek.findFirst({
    where: {
      status: 'published',
      cutoffAt: { gte: now },
    },
    orderBy: { weekStart: 'asc' },
    include: {
      sections: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (upcoming) return upcoming;
  return prisma.menuWeek.findFirst({
    where: { status: 'published' },
    orderBy: { weekStart: 'desc' },
    include: {
      sections: { orderBy: { sortOrder: 'asc' } },
    },
  });
};

const buildPriceMap = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    map.set(`${row.dishId}-${row.tier}`, row.priceCents);
  });
  return map;
};

const buildOverrideMap = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    map.set(row.dishId, row.priceCents);
  });
  return map;
};

const buildVisibilityMap = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    map.set(row.dishId, row.canView);
  });
  return map;
};

const buildSections = (sectionRows, menuItems) => {
  const sectionMap = new Map();
  sectionRows.forEach((section) => {
    sectionMap.set(section.id, { ...section, items: [] });
  });
  const unassigned = [];
  menuItems.forEach((item) => {
    if (item.sectionId && sectionMap.has(item.sectionId)) {
      sectionMap.get(item.sectionId).items.push(item);
    } else {
      unassigned.push(item);
    }
  });
  const sections = Array.from(sectionMap.values());
  if (unassigned.length) {
    sections.push({
      id: 'unassigned',
      slug: 'unassigned',
      title: 'More dishes',
      sortOrder: 999,
      items: unassigned,
    });
  }
  return sections;
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const slug = (req.query?.customerSlug || 'weekly-order').toString();
  const tier = (req.query?.tier || 'member').toString().toLowerCase();
  // User-specific overrides require authentication — never trust query params for identity
  const userEmail = null;

  if (!prisma) {
    return res.status(200).json(buildSampleWeeklyOrder(slug));
  }

  try {
    const menuWeek = await resolveMenuWeek();
    if (!menuWeek) {
      return res.status(200).json(buildSampleWeeklyOrder(slug));
    }

    const customer = await prisma.customer.findUnique({
      where: { slug },
    });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const user = userEmail
      ? await prisma.user.findFirst({ where: { email: userEmail } })
      : null;

    const menuItems = await prisma.menuWeekItem.findMany({
      where: { menuWeekId: menuWeek.id },
      include: { dish: true, section: true },
      orderBy: { sortOrder: 'asc' },
    });

    const [priceRows, overrideRows, visibilityRows, planRow, userOverrideRows] = await Promise.all([
      prisma.dishPrice.findMany({ where: { menuWeekId: menuWeek.id } }),
      prisma.customerPriceOverride.findMany({
        where: { menuWeekId: menuWeek.id, customerId: customer.id },
      }),
      prisma.dishVisibility.findMany({
        where: { menuWeekId: menuWeek.id, customerId: customer.id },
      }),
      prisma.customerPlan.findFirst({
        where: { menuWeekId: menuWeek.id, customerId: customer.id },
      }),
      user
        ? prisma.userPriceOverride.findMany({
            where: { menuWeekId: menuWeek.id, userId: user.id },
          })
        : Promise.resolve([]),
    ]);

    const priceMap = buildPriceMap(priceRows);
    const overrideMap = buildOverrideMap(overrideRows);
    const userOverrideMap = buildOverrideMap(userOverrideRows);
    const visibilityMap = buildVisibilityMap(visibilityRows);

    const enrichedItems = menuItems.map((item) => {
      const override = userOverrideMap.has(item.dishId)
        ? userOverrideMap.get(item.dishId)
        : overrideMap.get(item.dishId);
      const basePrice = priceMap.get(`${item.dishId}-${tier}`);
      const priceCents = item.includedInPlan ? 0 : (Number.isFinite(override) ? override : basePrice ?? null);
      const canView = visibilityMap.has(item.dishId) ? visibilityMap.get(item.dishId) : true;
      return {
        id: item.id,
        dishId: item.dishId,
        isVisible: item.isVisible,
        isAddon: item.isAddon,
        includedInPlan: item.includedInPlan,
        sortOrder: item.sortOrder,
        capacityLimit: item.capacityLimit,
        section: item.section
          ? { id: item.section.id, slug: item.section.slug, title: item.section.title, sortOrder: item.section.sortOrder }
          : null,
        sectionId: item.sectionId,
        canView,
        prices: {
          subscriber: priceMap.get(`${item.dishId}-subscriber`) ?? null,
          member: priceMap.get(`${item.dishId}-member`) ?? null,
        },
        priceCents,
        dish: item.dish,
      };
    });

    const sections = buildSections(menuWeek.sections || [], enrichedItems);

    return res.status(200).json({
      menuWeek: {
        id: menuWeek.id,
        weekStart: menuWeek.weekStart,
        cutoffAt: menuWeek.cutoffAt,
        status: menuWeek.status,
      },
      customer: {
        id: customer.id,
        slug: customer.slug,
        name: customer.name,
        priceTierDefault: customer.priceTierDefault,
        planRulesJson: customer.planRulesJson,
      },
      plan: {
        basePriceCents: planRow?.basePriceCents ?? 0,
        deliveryFeeCents: planRow?.deliveryFeeCents ?? 0,
        notes: planRow?.notes || null,
      },
      menuItems: enrichedItems,
      sections,
      orderHistory: [],
      currentOrder: null,
    });
  } catch (err) {
    console.error('[weekly-order] active error', err);
    return res.status(500).json({ error: 'Unable to load weekly menu' });
  }
};
