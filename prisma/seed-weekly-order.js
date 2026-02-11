const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // --- Customer ---
  const customer = await prisma.customer.upsert({
    where: { slug: 'weekly-order' },
    update: {},
    create: {
      slug: 'weekly-order',
      name: 'Local Effort Weekly',
      priceTierDefault: 'subscriber',
      planRulesJson: {
        requiredEntrees: 5,
        addOnMax: 4,
        maxTotalItems: 12,
        allowDuplicates: true,
      },
    },
  });
  console.log('Customer:', customer.id, customer.slug);

  // --- Dishes ---
  const dishData = [
    // Dinners
    { title: 'Braised Short Ribs', description: 'Red wine braised beef short ribs with root vegetables, creamy polenta', tags: ['comfort', 'beef'], categories: ['dinner'], allergens: ['dairy'] },
    { title: 'Pan-Seared Salmon', description: 'Wild salmon with lemon-dill beurre blanc, roasted asparagus, jasmine rice', tags: ['seafood', 'healthy'], categories: ['dinner'], allergens: ['fish', 'dairy'] },
    { title: 'Chicken Marsala', description: 'Seared chicken thighs in marsala mushroom sauce, garlic mashed potatoes', tags: ['comfort', 'chicken'], categories: ['dinner'], allergens: ['dairy', 'gluten'] },
    { title: 'Eggplant Parmesan', description: 'Crispy breaded eggplant, house marinara, melted mozzarella, fresh basil', tags: ['vegetarian', 'italian'], categories: ['dinner'], allergens: ['dairy', 'gluten'] },
    { title: 'Lamb Tagine', description: 'Slow-braised lamb shoulder with apricots, chickpeas, couscous', tags: ['moroccan', 'lamb'], categories: ['dinner'], allergens: ['gluten'] },
    { title: 'Miso-Glazed Cod', description: 'White miso marinated cod, bok choy, sticky rice, sesame', tags: ['seafood', 'asian'], categories: ['dinner'], allergens: ['fish', 'soy', 'sesame'] },
    // Lunches
    { title: 'Caesar Salad', description: 'Romaine, house croutons, shaved parmesan, anchovy-garlic dressing', tags: ['salad', 'classic'], categories: ['lunch'], allergens: ['dairy', 'gluten', 'fish'] },
    { title: 'Turkey Club Wrap', description: 'Roasted turkey, bacon, avocado, tomato, mixed greens in flour tortilla', tags: ['sandwich', 'turkey'], categories: ['lunch'], allergens: ['gluten'] },
    { title: 'Mediterranean Bowl', description: 'Falafel, hummus, tabbouleh, pickled onion, tahini over mixed greens', tags: ['vegetarian', 'mediterranean'], categories: ['lunch'], allergens: ['sesame', 'gluten'] },
    { title: 'Chicken Tortilla Soup', description: 'Roasted tomato broth, shredded chicken, black beans, tortilla strips, lime crema', tags: ['soup', 'mexican'], categories: ['lunch'], allergens: ['dairy'] },
    // Add-ons
    { title: 'Garlic Bread', description: 'House-baked sourdough, roasted garlic butter, herbs', tags: ['side', 'bread'], categories: ['add-on'], allergens: ['gluten', 'dairy'] },
    { title: 'Mixed Berry Crumble', description: 'Seasonal berries, oat-almond crumble, vanilla whipped cream', tags: ['dessert'], categories: ['add-on'], allergens: ['gluten', 'dairy', 'tree-nuts'] },
    { title: 'Kale & Grain Salad', description: 'Tuscan kale, farro, dried cranberries, pepitas, lemon vinaigrette', tags: ['salad', 'healthy'], categories: ['add-on'], allergens: ['gluten'] },
    { title: 'Mac & Cheese', description: 'Sharp cheddar, gruyère, panko crust, truffle oil drizzle', tags: ['comfort', 'side'], categories: ['add-on'], allergens: ['gluten', 'dairy'] },
  ];

  const dishes = [];
  for (const d of dishData) {
    const dish = await prisma.dish.create({
      data: { ...d, status: 'approved' },
    });
    dishes.push(dish);
    console.log('  Dish:', dish.title);
  }

  // --- MenuWeek (next Monday, cutoff Saturday 8pm) ---
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() + daysUntilMonday);
  weekStart.setHours(0, 0, 0, 0);

  const cutoff = new Date(weekStart);
  cutoff.setDate(cutoff.getDate() - 2); // Saturday
  cutoff.setHours(20, 0, 0, 0);

  const menuWeek = await prisma.menuWeek.create({
    data: {
      weekStart,
      cutoffAt: cutoff,
      status: 'published',
    },
  });
  console.log('MenuWeek:', menuWeek.id, 'starts', weekStart.toISOString().slice(0, 10));

  // --- Sections ---
  const dinnerSection = await prisma.menuWeekSection.create({
    data: { menuWeekId: menuWeek.id, title: 'Dinners', slug: 'dinners', sortOrder: 1 },
  });
  const lunchSection = await prisma.menuWeekSection.create({
    data: { menuWeekId: menuWeek.id, title: 'Lunches', slug: 'lunches', sortOrder: 2 },
  });
  const addOnSection = await prisma.menuWeekSection.create({
    data: { menuWeekId: menuWeek.id, title: 'Add-Ons', slug: 'add-ons', sortOrder: 3 },
  });
  console.log('Sections created:', dinnerSection.id, lunchSection.id, addOnSection.id);

  // --- MenuWeekItems + DishPrices ---
  for (let i = 0; i < dishes.length; i++) {
    const dish = dishes[i];
    const cat = dishData[i].categories[0];
    const isAddon = cat === 'add-on';
    const sectionId = cat === 'dinner' ? dinnerSection.id : cat === 'lunch' ? lunchSection.id : addOnSection.id;

    await prisma.menuWeekItem.create({
      data: {
        menuWeekId: menuWeek.id,
        dishId: dish.id,
        sectionId,
        isVisible: true,
        isAddon,
        includedInPlan: !isAddon, // entrees/lunches included in plan
        sortOrder: i,
        capacityLimit: isAddon ? null : 20, // entrees have 20-serving limit
      },
    });

    // Subscriber prices (lower)
    const subscriberCents = isAddon ? 500 + (i * 50) : 0; // add-ons $5–$7, plan items free
    // Member prices (higher)
    const memberCents = isAddon ? 700 + (i * 50) : 1200 + (i * 100); // members pay $12–$22 per entree

    await prisma.dishPrice.create({
      data: { menuWeekId: menuWeek.id, dishId: dish.id, tier: 'subscriber', priceCents: subscriberCents },
    });
    await prisma.dishPrice.create({
      data: { menuWeekId: menuWeek.id, dishId: dish.id, tier: 'member', priceCents: memberCents },
    });
  }
  console.log('MenuWeekItems and prices created');

  // --- CustomerPlan ---
  await prisma.customerPlan.create({
    data: {
      customerId: customer.id,
      menuWeekId: menuWeek.id,
      basePriceCents: 8500, // $85 weekly base
      deliveryFeeCents: 1000, // $10 delivery
      notes: 'Includes 5 entrees. Add-ons priced individually.',
    },
  });
  console.log('CustomerPlan created');

  console.log('\n--- Done! ---');
  console.log('Visit /weekly-order to see the menu.');
  console.log('Use ?tier=subscriber or ?tier=member to test pricing.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
