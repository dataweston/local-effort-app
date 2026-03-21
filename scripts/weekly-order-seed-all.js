/**
 * Seed script: sets up all 4 weekly-order subscribers with profiles,
 * creates a past menu week, and populates their orders with last week's dishes.
 *
 * Usage:
 *   node scripts/weekly-order-seed-all.js
 *
 * Requires DATABASE_URL in env (Prisma).
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Week of March 10–16, 2026 (last week relative to March 21)
const LAST_WEEK_START = new Date('2026-03-10T00:00:00Z');
const LAST_WEEK_CUTOFF = new Date('2026-03-08T20:00:00Z');

const CUSTOMERS = [
  {
    slug: 'levy-family',
    name: 'David & Allison',
    emails: ['davelevy3@gmail.com', 'allisonlevy627@gmail.com'],
    planRules: {
      requiredEntrees: 0,
      addOnMax: 6,
      maxTotalItems: 12,
      allowDuplicates: true,
      sectionRules: {
        'family-dinners': { min: 3, max: 3, label: 'Family Dinners' },
        'kids-food': { min: 3, max: 5, label: 'Kids Food' },
      },
    },
    profile: {
      householdSize: '2 adults, 2 kids',
    },
    sections: [
      { slug: 'family-dinners', title: 'Family Dinners', sortOrder: 0 },
      { slug: 'kids-food', title: 'Kids Food', sortOrder: 1 },
    ],
    dishes: [
      { section: 'family-dinners', title: 'Meatballs, Beet Salad with Labneh', qty: 1 },
      { section: 'family-dinners', title: 'Lamb Stew — carrots, beans, rice', qty: 1 },
      { section: 'family-dinners', title: 'Roasted Pork Shoulder, polenta, turnips/greens', qty: 1 },
      { section: 'kids-food', title: 'Kids servings (10 total)', qty: 10 },
    ],
  },
  {
    slug: 'tyler-cooper',
    name: 'Tyler',
    emails: ['tcooper@hey.com'],
    planRules: {
      requiredEntrees: 0,
      addOnMax: 0,
      maxTotalItems: 20,
      allowDuplicates: true,
      sectionRules: {
        breakfast: { min: 0, max: 8, label: 'Breakfast' },
        lunch: { min: 0, max: 6, label: 'Lunch' },
        dinner: { min: 0, max: 3, label: 'Dinner' },
      },
    },
    profile: {
      householdSize: '2 adults',
    },
    sections: [
      { slug: 'breakfast', title: 'Breakfast', sortOrder: 0 },
      { slug: 'lunch', title: 'Lunch', sortOrder: 1 },
      { slug: 'dinner', title: 'Dinner', sortOrder: 2 },
    ],
    dishes: [
      { section: 'breakfast', title: 'Breakfast Burrito', qty: 2 },
      { section: 'breakfast', title: 'Smoothie', qty: 2 },
      { section: 'breakfast', title: 'Chia Pudding', qty: 4 },
      { section: 'lunch', title: 'Tofu Spring Rolls, Noodle Salad', qty: 2 },
      { section: 'lunch', title: 'Meatballs, Beet Salad with Labneh', qty: 2 },
      { section: 'lunch', title: 'Spinach Barley Quinoa Salad, Egg, Avo', qty: 2 },
      { section: 'dinner', title: 'Braised Lamb — carrots, cranberry beans', qty: 1 },
      { section: 'dinner', title: 'Roasted Pork Shoulder, polenta, turnips/greens', qty: 1 },
      { section: 'dinner', title: 'Beef Cabbage Rolls, Mashed Potato', qty: 1 },
    ],
  },
  {
    slug: 'kara-alex',
    name: 'Kara & Alex',
    emails: ['karamellingson@gmail.com'],
    planRules: {
      requiredEntrees: 0,
      addOnMax: 4,
      maxTotalItems: 12,
      allowDuplicates: true,
      sectionRules: {
        dinner: { min: 3, max: 3, label: 'Dinner' },
        lunch: { min: 3, max: 3, label: 'Lunch' },
        snacks: { min: 0, max: 4, label: 'Snacks' },
      },
    },
    profile: {
      householdSize: '2 adults',
      phone: '9522708314',
      address: '4412 Philbrook Lane, Edina, MN 55424',
      deliveryNotes: 'You can text me to see if I\'m at home! 952-270-8314. Otherwise, a drop off works great.',
      intakeSurvey: {
        dueDate: '2026-03-05',
        firstDelivery: '2026-03-09',
        karaProteinsSelected: ['Chicken', 'Beef', 'Pork', 'Fish/Seafood', 'Tofu/Tempeh', 'Eggs', 'Beans/Legumes'],
        karaProteinsEveryday: ['Chicken', 'Tofu/Tempeh', 'Eggs', 'Beans/Legumes'],
        karaAllergies: 'I have historically been gluten intolerant, but have had success eating wheat while pregnant. TBD!',
        karaDislikes: 'Not that I can think of at this time!',
        karaFavorites: '—',
        dadProteinsSelected: ['Chicken', 'Beef', 'Pork', 'Lamb', 'Fish/Seafood', 'Tofu/Tempeh', 'Eggs', 'Beans/Legumes'],
        dadProteinsEveryday: ['Chicken', 'Fish/Seafood', 'Eggs'],
        dadAllergies: 'N/A',
        breastfeeding: 'Yes, exclusively',
        postpartumPriorities: ['High protein for healing', 'Lactation support', 'Anti-inflammatory'],
        lunchesTogether: 'Separately (different meals)',
        dinnersTogether: 'Together (same meal)',
        lunchSettings: 'Varies',
        dinnerSettings: 'At home (sit-down)',
        cuisinePreferences: 'Surprise us',
        spiceLevel: 'Mild',
        breakfastInterest: 'No thanks',
        snacksInterest: 'Snacks only',
        snackRequests: 'Lactation cookies or other breastfeeding supportive foods.',
        mondayDelivery: 'Yes, Monday works',
        billingPreference: 'Monthly billing (saves 10%)',
        anythingElse: 'Thank you! :)',
      },
    },
    sections: [
      { slug: 'dinner', title: 'Dinner', sortOrder: 0 },
      { slug: 'lunch', title: 'Lunch', sortOrder: 1 },
      { slug: 'snacks', title: 'Snacks', sortOrder: 2 },
    ],
    dishes: [
      { section: 'dinner', title: 'Lamb Stew — carrots, potatoes, rice', qty: 1 },
      { section: 'dinner', title: 'Fish Stew — Cioppino', qty: 1 },
      { section: 'dinner', title: 'Hainanese Chicken and Rice', qty: 1 },
      { section: 'lunch', title: 'Beef Biryani, Carrot Salad with Nuts', qty: 1 },
      { section: 'lunch', title: 'Meatballs, Beet Salad with Labneh', qty: 1 },
      { section: 'lunch', title: 'Tofu Spring Rolls, Fried Rice', qty: 1 },
      { section: 'snacks', title: 'Seeded Crackers "Lactation" with Carrot Pesto', qty: 1 },
    ],
  },
  {
    slug: 'sanjay-roy',
    name: 'Sanjay',
    emails: ['sanjayroy1309@gmail.com'],
    planRules: {
      requiredEntrees: 0,
      addOnMax: 0,
      maxTotalItems: 10,
      allowDuplicates: true,
      sectionRules: {
        dinner: { min: 5, max: 5, label: 'Dinner' },
      },
    },
    profile: {
      householdSize: '1 adult',
    },
    sections: [
      { slug: 'dinner', title: 'Dinner', sortOrder: 0 },
    ],
    dishes: [
      { section: 'dinner', title: 'Meatballs, Beet Salad with Labneh', qty: 1 },
      { section: 'dinner', title: 'Lamb Stew — carrots, beans, rice', qty: 1 },
      { section: 'dinner', title: 'Roasted Pork Shoulder, polenta, turnips/greens', qty: 1 },
      { section: 'dinner', title: 'Beef Biryani, Carrot Salad with Nuts', qty: 1 },
      { section: 'dinner', title: 'Beef Cabbage Rolls, Mashed Potato', qty: 1 },
    ],
  },
];

async function main() {
  // 1. Create/upsert menu week for last week
  const menuWeek = await prisma.menuWeek.upsert({
    where: { id: 'menu-2026-03-10' },
    update: { status: 'published' },
    create: {
      id: 'menu-2026-03-10',
      weekStart: LAST_WEEK_START,
      cutoffAt: LAST_WEEK_CUTOFF,
      status: 'published',
    },
  });
  console.log(`✅ Menu week: ${menuWeek.id}`);

  // Collect all unique dish titles across all customers
  const allDishTitles = new Set();
  CUSTOMERS.forEach((c) => c.dishes.forEach((d) => allDishTitles.add(d.title)));

  // 2. Upsert dishes
  const dishMap = new Map();
  for (const title of allDishTitles) {
    let dish = await prisma.dish.findFirst({ where: { title } });
    if (!dish) {
      dish = await prisma.dish.create({
        data: { title, status: 'approved' },
      });
    }
    dishMap.set(title, dish);
  }
  console.log(`✅ ${dishMap.size} dishes upserted`);

  for (const cust of CUSTOMERS) {
    // 3. Upsert customer
    const customer = await prisma.customer.upsert({
      where: { slug: cust.slug },
      update: {
        name: cust.name,
        planRulesJson: cust.planRules,
        priceTierDefault: 'subscriber',
      },
      create: {
        slug: cust.slug,
        name: cust.name,
        planRulesJson: cust.planRules,
        priceTierDefault: 'subscriber',
      },
    });

    // 4. Upsert users
    const userRecords = [];
    for (const email of cust.emails) {
      const user = await prisma.user.upsert({
        where: { email },
        update: { role: 'subscriber', customerId: customer.id },
        create: { email, role: 'subscriber', customerId: customer.id },
      });
      userRecords.push(user);
    }

    // 5. Upsert customer profile
    if (cust.profile) {
      await prisma.customerProfile.upsert({
        where: { customerId: customer.id },
        update: { ...cust.profile },
        create: { customerId: customer.id, ...cust.profile },
      });
    }

    // 6. Create sections for the menu week
    const sectionMap = new Map();
    for (const sec of cust.sections || []) {
      const section = await prisma.menuWeekSection.upsert({
        where: { menuWeekId_slug: { menuWeekId: menuWeek.id, slug: sec.slug } },
        update: { title: sec.title, sortOrder: sec.sortOrder },
        create: {
          menuWeekId: menuWeek.id,
          slug: sec.slug,
          title: sec.title,
          sortOrder: sec.sortOrder,
        },
      });
      sectionMap.set(sec.slug, section);
    }

    // 7. Create menu week items (link dishes to sections)
    for (const dishEntry of cust.dishes) {
      const dish = dishMap.get(dishEntry.title);
      const section = sectionMap.get(dishEntry.section);
      try {
        await prisma.menuWeekItem.upsert({
          where: { menuWeekId_dishId: { menuWeekId: menuWeek.id, dishId: dish.id } },
          update: { sectionId: section?.id || null, isVisible: true },
          create: {
            menuWeekId: menuWeek.id,
            dishId: dish.id,
            sectionId: section?.id || null,
            isVisible: true,
            isAddon: false,
            includedInPlan: true,
          },
        });
      } catch (e) {
        // If the same dish appears in different sections (shared dishes), skip dupe
        if (!e.message.includes('Unique constraint')) throw e;
      }
    }

    // 8. Create a "submitted" order for last week with the dishes as items
    const existingOrder = await prisma.order.findFirst({
      where: { menuWeekId: menuWeek.id, customerId: customer.id, status: 'submitted' },
    });
    if (!existingOrder) {
      const order = await prisma.order.create({
        data: {
          menuWeekId: menuWeek.id,
          customerId: customer.id,
          userId: userRecords[0]?.id || null,
          status: 'submitted',
          submittedAt: LAST_WEEK_CUTOFF,
          totalsCents: 0,
          tier: 'subscriber',
          items: {
            create: cust.dishes.map((dishEntry) => {
              const dish = dishMap.get(dishEntry.title);
              return {
                dishId: dish.id,
                quantity: dishEntry.qty,
                unitPriceCents: 0,
                isAddon: false,
                includedInPlan: true,
              };
            }),
          },
        },
      });
      console.log(`  ✅ ${cust.name} — order ${order.id} with ${cust.dishes.length} items`);
    } else {
      console.log(`  ⏭ ${cust.name} — order already exists`);
    }

    console.log(`✅ ${cust.name} (${cust.slug}) configured`);
  }

  console.log('\n🎉 All subscribers seeded!');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
