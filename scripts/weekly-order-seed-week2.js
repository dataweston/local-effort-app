/**
 * Seed script: adds a second past-menu week (March 16, 2026) for all 4 subscribers.
 *
 * Usage:
 *   node scripts/weekly-order-seed-week2.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WEEK_START = new Date('2026-03-16T00:00:00Z');
const WEEK_CUTOFF = new Date('2026-03-14T20:00:00Z');
const MENU_WEEK_ID = 'menu-2026-03-16';

// Customer slugs → their userId (first email) mapped from DB
// We'll look these up dynamically

const ORDERS = [
  {
    slug: 'tyler-cooper',
    dishes: [
      { title: 'Breakfast Ice Cream', qty: 1 },
      { title: 'Breakfast Burritos — sweet potato, bacon', qty: 1 },
      { title: 'Breakfast Overnight Oats', qty: 1 },
      { title: 'Breakfast Chia Pudding', qty: 1 },
      { title: 'Smoked Brisket, German Potato Salad', qty: 1 },
      { title: 'Turkey Pot Pie', qty: 1 },
      { title: 'Lamb Chili', qty: 1 },
      { title: 'Cornbread', qty: 1 },
      { title: 'Greek Salad with Chicken', qty: 1 },
      { title: 'Cheese Pizza or Pepperoni Pizza', qty: 1 },
      { title: 'Lentil Bowl — sweet potato, spinach, cauliflower', qty: 1 },
    ],
  },
  {
    slug: 'levy-family',
    dishes: [
      { title: 'Date Ice Cream', qty: 1 },
      { title: 'Cheese Pizza or Pepperoni Pizza', qty: 1 },
      { title: 'Greek Salad or Cabbage Slaw', qty: 1 },
      { title: 'Lamb Chili', qty: 1 },
      { title: 'Cornbread', qty: 1 },
      { title: 'Breakfast Overnight Oats', qty: 1 },
    ],
  },
  {
    slug: 'sanjay-roy',
    dishes: [
      { title: 'Date Ice Cream', qty: 1 },
      { title: 'Greek Salad with Chicken', qty: 1 },
      { title: 'Lamb Chili', qty: 1 },
      { title: 'Cornbread', qty: 1 },
      { title: 'Tofu Noodle Salad', qty: 1 },
      { title: 'Turkey Pot Pie', qty: 1 },
    ],
  },
  {
    slug: 'kara-alex',
    dishes: [
      { title: 'Date Ice Cream', qty: 1 },
      { title: 'Cheese Pizza or Pepperoni Pizza', qty: 1 },
      { title: 'Greek Salad', qty: 1 },
      { title: 'Beef Broth', qty: 1 },
      { title: 'Smoked Brisket', qty: 1 },
      { title: 'Cornbread', qty: 1 },
      { title: 'Turkey Pot Pie', qty: 1 },
      { title: 'Lamb Chili', qty: 1 },
      { title: 'Tofu Noodle Salad', qty: 1 },
      { title: 'Lentil Bowl — sweet potato, spinach, cauliflower', qty: 1 },
    ],
  },
];

async function main() {
  // 1. Create the menu week
  const menuWeek = await prisma.menuWeek.upsert({
    where: { id: MENU_WEEK_ID },
    update: { status: 'published' },
    create: {
      id: MENU_WEEK_ID,
      weekStart: WEEK_START,
      cutoffAt: WEEK_CUTOFF,
      status: 'published',
    },
  });
  console.log(`✅ Menu week: ${menuWeek.id} (${WEEK_START.toISOString().slice(0, 10)})`);

  // 2. Collect all unique dish titles and upsert them
  const allTitles = new Set();
  ORDERS.forEach((o) => o.dishes.forEach((d) => allTitles.add(d.title)));

  const dishMap = new Map();
  for (const title of allTitles) {
    let dish = await prisma.dish.findFirst({ where: { title } });
    if (!dish) {
      dish = await prisma.dish.create({ data: { title, status: 'approved' } });
      console.log(`  🍽  Created dish: ${title}`);
    }
    dishMap.set(title, dish);
  }
  console.log(`✅ ${dishMap.size} dishes ready`);

  // 3. Create MenuWeekItems so dishes are linked to this week
  for (const dish of dishMap.values()) {
    await prisma.menuWeekItem.upsert({
      where: { menuWeekId_dishId: { menuWeekId: MENU_WEEK_ID, dishId: dish.id } },
      update: { isVisible: true },
      create: {
        menuWeekId: MENU_WEEK_ID,
        dishId: dish.id,
        isVisible: true,
        isAddon: false,
        includedInPlan: true,
      },
    });
  }
  console.log(`✅ Menu week items linked`);

  // 4. Create orders for each customer
  for (const entry of ORDERS) {
    const customer = await prisma.customer.findFirst({ where: { slug: entry.slug } });
    if (!customer) {
      console.error(`  ❌ Customer not found: ${entry.slug}`);
      continue;
    }

    const user = await prisma.user.findFirst({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'asc' },
    });

    // Check for existing order this week
    const existing = await prisma.order.findFirst({
      where: { menuWeekId: MENU_WEEK_ID, customerId: customer.id, status: 'submitted' },
    });
    if (existing) {
      console.log(`  ⏭  ${customer.name} — order already exists for this week`);
      continue;
    }

    const order = await prisma.order.create({
      data: {
        menuWeekId: MENU_WEEK_ID,
        customerId: customer.id,
        userId: user?.id || null,
        status: 'submitted',
        submittedAt: WEEK_CUTOFF,
        totalsCents: 0,
        tier: 'subscriber',
        items: {
          create: entry.dishes.map((d) => {
            const dish = dishMap.get(d.title);
            return {
              dishId: dish.id,
              quantity: d.qty,
              unitPriceCents: 0,
              isAddon: false,
              includedInPlan: true,
            };
          }),
        },
      },
    });
    console.log(`  ✅ ${customer.name} — order ${order.id} with ${entry.dishes.length} items`);
  }

  console.log('\n🎉 Week 2 (March 16) seeded for all subscribers!');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
