const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const normalize = (value) => (value || '').toLowerCase().trim();

const findDishByTitle = async (title) => {
  const items = await prisma.dish.findMany({
    where: { title: { contains: title, mode: 'insensitive' } },
    take: 5,
  });
  const normalized = normalize(title);
  return items.find((item) => normalize(item.title) === normalized) || null;
};

const loadJson = (filePath) => {
  const fullPath = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
};

const main = async () => {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');
  const weekIndex = args.indexOf('--week');
  const file = fileIndex !== -1 ? args[fileIndex + 1] : null;
  const weekStart = weekIndex !== -1 ? args[weekIndex + 1] : null;

  if (!file || !weekStart) {
    console.error('Usage: node scripts/weekly-order-prices.js --file data/weekly-order.json --week 2026-02-03');
    process.exit(1);
  }

  const data = loadJson(file);
  const menuWeek = await prisma.menuWeek.findFirst({
    where: { weekStart: new Date(weekStart) },
  });
  if (!menuWeek) {
    console.error('MenuWeek not found for', weekStart);
    process.exit(1);
  }

  const dishes = data.dishes || [];
  let updated = 0;

  for (const dish of dishes) {
    if (!dish.prices) continue;
    const dishRecord = await findDishByTitle(dish.title);
    if (!dishRecord) continue;

    for (const [tier, priceCents] of Object.entries(dish.prices)) {
      await prisma.dishPrice.upsert({
        where: {
          menuWeekId_dishId_tier: {
            menuWeekId: menuWeek.id,
            dishId: dishRecord.id,
            tier,
          },
        },
        update: { priceCents: Number(priceCents) || 0 },
        create: {
          menuWeekId: menuWeek.id,
          dishId: dishRecord.id,
          tier,
          priceCents: Number(priceCents) || 0,
        },
      });
      updated += 1;
    }
  }

  console.log(`Upserted ${updated} price rows.`);
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
