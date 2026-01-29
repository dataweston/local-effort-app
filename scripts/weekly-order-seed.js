const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const normalize = (value) => (value || '').toLowerCase().trim();
const slugify = (value) => (value || '')
  .toString()
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

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
  const dryRun = args.includes('--dry-run');
  const file = fileIndex !== -1 ? args[fileIndex + 1] : null;
  const overrideWeek = weekIndex !== -1 ? args[weekIndex + 1] : null;
  if (!file) {
    console.error('Usage: node scripts/weekly-order-seed.js --file data/weekly-order.json [--dry-run]');
    process.exit(1);
  }

  const data = loadJson(file);
  const weekStart = overrideWeek || data.weekStart;
  const cutoffAt = data.cutoffAt;
  if (!weekStart || !cutoffAt) {
    console.error('Missing weekStart or cutoffAt in data file.');
    process.exit(1);
  }

  const dishes = data.dishes || [];
  const menuWeekPayload = {
    weekStart: new Date(weekStart),
    cutoffAt: new Date(cutoffAt),
    status: data.status || 'draft',
  };

  if (dryRun) {
    console.log('[dry-run] MenuWeek payload', menuWeekPayload);
  }

  const menuWeek = dryRun
    ? { id: 'dry-run' }
    : await prisma.menuWeek.create({ data: menuWeekPayload });

  const sectionMap = new Map();
  const sections = data.sections || [];
  if (!dryRun && sections.length) {
    for (const section of sections) {
      const slug = section.slug || slugify(section.title);
      const record = await prisma.menuWeekSection.create({
        data: {
          menuWeekId: menuWeek.id,
          title: section.title,
          slug,
          sortOrder: section.sortOrder ?? 0,
        },
      });
      sectionMap.set(slug, record.id);
    }
  } else if (dryRun && sections.length) {
    sections.forEach((section) => {
      const slug = section.slug || slugify(section.title);
      sectionMap.set(slug, slug);
    });
  }

  for (const dish of dishes) {
    const existing = await findDishByTitle(dish.title);
    const dishPayload = {
      title: dish.title,
      description: dish.description || null,
      tags: dish.tags || [],
      categories: dish.categories || [],
      allergens: dish.allergens || [],
      status: dish.status || 'approved',
    };

    const dishRecord = existing
      ? await prisma.dish.update({ where: { id: existing.id }, data: dishPayload })
      : await prisma.dish.create({ data: dishPayload });

    if (!dryRun) {
      await prisma.menuWeekItem.upsert({
        where: { menuWeekId_dishId: { menuWeekId: menuWeek.id, dishId: dishRecord.id } },
        update: {
          isVisible: dish.isVisible ?? true,
          isAddon: dish.isAddon ?? false,
          includedInPlan: dish.includedInPlan ?? false,
          sectionId: dish.sectionSlug ? sectionMap.get(dish.sectionSlug) || null : null,
          sortOrder: dish.sortOrder ?? 0,
          capacityLimit: dish.capacityLimit ?? null,
        },
        create: {
          menuWeekId: menuWeek.id,
          dishId: dishRecord.id,
          isVisible: dish.isVisible ?? true,
          isAddon: dish.isAddon ?? false,
          includedInPlan: dish.includedInPlan ?? false,
          sectionId: dish.sectionSlug ? sectionMap.get(dish.sectionSlug) || null : null,
          sortOrder: dish.sortOrder ?? 0,
          capacityLimit: dish.capacityLimit ?? null,
        },
      });
    }
  }

  if (!dryRun) {
    console.log(`Seeded menu week ${menuWeek.id} with ${dishes.length} items.`);
  }
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
