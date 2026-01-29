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
  const file = fileIndex !== -1 ? args[fileIndex + 1] : null;
  if (!file) {
    console.error('Usage: node scripts/weekly-order-import.js --file data/weekly-order.json');
    process.exit(1);
  }

  const data = loadJson(file);
  const dishes = data.dishes || [];
  let created = 0;
  let updated = 0;

  for (const dish of dishes) {
    const existing = await findDishByTitle(dish.title);
    const payload = {
      title: dish.title,
      description: dish.description || null,
      tags: dish.tags || [],
      categories: dish.categories || [],
      allergens: dish.allergens || [],
      status: dish.status || 'approved',
    };
    if (existing) {
      await prisma.dish.update({ where: { id: existing.id }, data: payload });
      updated += 1;
    } else {
      await prisma.dish.create({ data: payload });
      created += 1;
    }
  }

  console.log(`Imported dishes. Created: ${created}, Updated: ${updated}`);
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
