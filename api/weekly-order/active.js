const { PrismaClient } = require('@prisma/client');
const { verifySupabaseToken } = require('./_auth');

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

  // Only use authenticated user email — never trust query params for identity
  const supabaseUser = await verifySupabaseToken(req);
  const userEmail = supabaseUser?.email || null;

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

    // Compute capacity remaining from paid/submitted orders
    const orderItemCounts = await prisma.orderItem.groupBy({
      by: ['dishId'],
      where: {
        order: {
          menuWeekId: menuWeek.id,
          status: { in: ['paid', 'submitted'] },
        },
      },
      _sum: { quantity: true },
    });
    const capacityUsed = new Map(
      orderItemCounts.map((row) => [row.dishId, row._sum.quantity || 0])
    );

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
      const used = capacityUsed.get(item.dishId) || 0;
      const remaining = Number.isFinite(item.capacityLimit) ? Math.max(0, item.capacityLimit - used) : null;
      return {
        id: item.id,
        dishId: item.dishId,
        isVisible: item.isVisible,
        isAddon: item.isAddon,
        includedInPlan: item.includedInPlan,
        sortOrder: item.sortOrder,
        capacityLimit: item.capacityLimit,
        remaining,
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

    // Resolve current order and order history scoped by user when available
    const orderWhere = { menuWeekId: menuWeek.id, customerId: customer.id };
    if (user) orderWhere.userId = user.id;

    const currentWeekOrders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        items: { include: { dish: { select: { title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const historyOrders = await prisma.order.findMany({
      where: {
        customerId: customer.id,
        ...(user ? { userId: user.id } : {}),
        status: { in: ['paid', 'submitted'] },
        menuWeekId: { not: menuWeek.id },
      },
      include: {
        items: { include: { dish: { select: { title: true } } } },
        menuWeek: { select: { weekStart: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const currentOrder =
      currentWeekOrders.find((o) => o.status === 'paid' || o.status === 'submitted') ||
      currentWeekOrders.find((o) => o.status === 'draft') ||
      null;

    const orderHistory = historyOrders.map((o) => ({
      id: o.id,
      weekStart: o.menuWeek.weekStart,
      status: o.status,
      totalCents: o.totalsCents,
      submittedAt: o.submittedAt,
      items: o.items.map((item) => ({
        dish: item.dish?.title || 'Unknown',
        quantity: item.quantity,
      })),
    }));

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
      orderHistory,
      currentOrder: currentOrder ? {
        id: currentOrder.id,
        status: currentOrder.status,
        items: currentOrder.items.map((item) => ({
          dishId: item.dishId,
          dish: item.dish?.title,
          quantity: item.quantity,
        })),
      } : null,
    });
  } catch (err) {
    console.error('[weekly-order] active error', err);
    return res.status(500).json({ error: 'Unable to load weekly menu' });
  }
};
