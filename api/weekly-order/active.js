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
      priceOverrides: {
        'dish-4': 1100,
      },
    },
    menuItems: [
      {
        id: 'mwi-1',
        dishId: 'dish-1',
        isVisible: true,
        isAddon: false,
        sortOrder: 1,
        capacityLimit: 24,
        remaining: 8,
        canView: true,
        dish: {
          title: 'Miso-roasted salmon',
          description: 'Ginger glaze, broccolini, sesame brown rice.',
          tags: ['high protein', 'gluten-free'],
          allergens: ['fish', 'soy', 'sesame'],
          status: 'approved',
        },
        prices: { subscriber: 1600, member: 1850 },
      },
      {
        id: 'mwi-2',
        dishId: 'dish-2',
        isVisible: true,
        isAddon: false,
        sortOrder: 2,
        capacityLimit: 30,
        remaining: 12,
        canView: true,
        dish: {
          title: 'Harissa chicken bowl',
          description: 'Roasted chicken thighs, lemon couscous, charred carrots.',
          tags: ['medium spice'],
          allergens: ['wheat'],
          status: 'approved',
        },
        prices: { subscriber: 1450, member: 1700 },
      },
      {
        id: 'mwi-3',
        dishId: 'dish-3',
        isVisible: true,
        isAddon: false,
        sortOrder: 3,
        capacityLimit: 20,
        remaining: 2,
        canView: true,
        dish: {
          title: 'Mushroom ragu rigatoni',
          description: 'Wild mushrooms, parmesan, fresh herbs.',
          tags: ['vegetarian'],
          allergens: ['dairy', 'wheat'],
          status: 'approved',
        },
        prices: { subscriber: 1350, member: 1600 },
      },
      {
        id: 'mwi-4',
        dishId: 'dish-4',
        isVisible: true,
        isAddon: false,
        sortOrder: 4,
        capacityLimit: 16,
        remaining: 0,
        canView: true,
        dish: {
          title: 'Tamarind short rib',
          description: 'Sticky glazed short rib, jasmine rice, bok choy.',
          tags: ['chef favorite'],
          allergens: ['soy'],
          status: 'approved',
        },
        prices: { subscriber: 1750, member: 2100 },
      },
      {
        id: 'mwi-5',
        dishId: 'dish-5',
        isVisible: true,
        isAddon: true,
        sortOrder: 6,
        capacityLimit: 40,
        remaining: 26,
        canView: true,
        dish: {
          title: 'Citrus kale crunch',
          description: 'Kale, mandarins, pumpkin seeds, lemon vinaigrette.',
          tags: ['vegan', 'gluten-free'],
          allergens: ['seed'],
          status: 'approved',
        },
        prices: { subscriber: 700, member: 850 },
      },
      {
        id: 'mwi-6',
        dishId: 'dish-6',
        isVisible: true,
        isAddon: true,
        sortOrder: 7,
        capacityLimit: 32,
        remaining: 18,
        canView: true,
        dish: {
          title: 'Coconut chia pudding',
          description: 'Overnight chia, maple, toasted coconut.',
          tags: ['breakfast', 'gluten-free'],
          allergens: ['coconut'],
          status: 'approved',
        },
        prices: { subscriber: 550, member: 700 },
      },
    ],
    orderHistory: [],
    currentOrder: null,
  };
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const slug = req.query?.customerSlug || 'weekly-order';
  return res.status(200).json(buildSampleWeeklyOrder(slug));
};
