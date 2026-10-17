/**
 * Links a committed weekly meal-prep menu (the hub notepad, parsed by master-menu) to the menu
 * library: every line resolves to a library `Dish` (created as an internal draft when new), and
 * the week is saved as a `meal_prep_week` LibraryMenu keyed by week, so re-committing the same
 * week replaces its items instead of duplicating it. Visibility is never overwritten on update,
 * so a week the owner shared with clients stays shared.
 */

const COURSE_FOR_MEAL = { dinner: 'main', lunch: 'main', kids: 'main', breakfast: 'breakfast', snack: 'snack' };

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'dish';

async function findOrCreateDish(prisma, title, meal) {
  const slug = slugify(title);
  const existing = await prisma.dish.findFirst({
    where: { inLibrary: true, OR: [{ slug }, { title: { equals: title, mode: 'insensitive' } }] },
    select: { id: true, courses: true },
  });
  if (existing) return { dish: existing, created: false };
  let candidate = slug;
  for (let n = 2; await prisma.dish.findUnique({ where: { slug: candidate }, select: { id: true } }); n++) candidate = `${slug}-${n}`;
  const dish = await prisma.dish.create({
    data: {
      title, slug: candidate, inLibrary: true, status: 'draft', libraryVisibility: 'internal',
      courses: [COURSE_FOR_MEAL[meal] || 'main'], programs: ['meal-prep'],
    },
    select: { id: true, courses: true },
  });
  return { dish, created: true };
}

async function linkWeekToLibrary({ prisma, weekStart, lines }) {
  const items = [];
  let created = 0;
  const seen = new Set();
  for (const line of lines) {
    const title = String(line.canonicalName || line.text || '').trim();
    if (!title) continue;
    const { dish, created: made } = await findOrCreateDish(prisma, title, line.meal);
    if (made) created += 1;
    if (seen.has(dish.id)) continue;
    seen.add(dish.id);
    const wording = line.description ? `${line.text} — ${line.description}` : line.text;
    items.push({ dishId: dish.id, course: COURSE_FOR_MEAL[line.meal] || dish.courses?.[0] || 'main', wording, position: items.length });
  }

  const sourceKey = `meal-prep-week:${weekStart}`;
  const occurredAt = new Date(`${weekStart}T12:00:00.000Z`);
  const menu = await prisma.$transaction(async (tx) => {
    const found = await tx.libraryMenu.findUnique({ where: { sourceKey }, select: { id: true } });
    if (found) {
      await tx.libraryMenuItem.deleteMany({ where: { menuId: found.id } });
      return tx.libraryMenu.update({ where: { id: found.id }, data: { occurredAt, items: { create: items } }, select: { id: true } });
    }
    return tx.libraryMenu.create({
      data: {
        slug: `meal-prep-week-${weekStart}`, sourceKey, title: `Meal prep, week of ${weekStart}`,
        kind: 'meal_prep_week', program: 'meal-prep', visibility: 'internal', occurredAt, items: { create: items },
      },
      select: { id: true },
    });
  });
  return { menuId: menu.id, items: items.length, dishesCreated: created };
}

module.exports = { linkWeekToLibrary };
