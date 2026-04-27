/**
 * GET  /api/weekly-order/admin/menu-preplist?menuWeekId=uuid
 * POST /api/weekly-order/admin/menu-preplist  { menuWeekId }
 *
 * Returns a structured prep list for a published menu week.
 * Groups dishes by meal type (breakfast / lunch / dinner / other),
 * then by dish with their ingredients and relevant metadata.
 *
 * This endpoint returns JSON — no print template yet.
 * The response shape is designed to be easy to render into
 * any future template (print PDF, checklist UI, etc.).
 *
 * Response:
 * {
 *   menuWeekId, weekStart, weekLabel,
 *   generatedAt,
 *   summary: { totalDishes, totalClients, byMealType: { dinner: 4, lunch: 2, ... } },
 *   groups: [
 *     {
 *       mealType: "dinner",
 *       dishes: [
 *         {
 *           title: "Chicken Tikka Masala",
 *           description: "basmati rice, naan, cilantro",
 *           ingredients: ["basmati rice", "naan", "cilantro"],
 *           tags: ["dinner"],
 *           allergens: ["dairy"],
 *           clientCount: 3,        // how many clients are getting this dish
 *           clientSlugs: ["kara", "alex", "sam"],
 *         }
 *       ]
 *     }
 *   ],
 *   allIngredients: ["basmati rice", "naan", ...],  // flat deduped list for shopping
 * }
 */

const { PrismaClient } = require('@prisma/client');
const { requireWeeklyOrderAdmin } = require('../../../api-handlers/weekly-order/admin/_auth');

let prisma = null;
try { prisma = new PrismaClient(); } catch (_) { prisma = null; }

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack', 'kids', 'other'];

function parseMealType(tags = []) {
  for (const meal of ['breakfast', 'lunch', 'dinner', 'snack', 'kids']) {
    if (tags.includes(meal)) return meal;
  }
  return 'other';
}

function parseIngredients(description = '') {
  if (!description) return [];
  // Split on commas, strip parentheticals for the ingredient name,
  // but keep the full text in the ingredients array
  return description
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function formatDateShort(d) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const admin = await requireWeeklyOrderAdmin(req, res);
  if (!admin) return;
  if (!prisma) return res.status(500).json({ error: 'Database not configured' });

  const menuWeekId = req.method === 'GET'
    ? req.query?.menuWeekId
    : req.body?.menuWeekId;

  if (!menuWeekId) return res.status(400).json({ error: 'menuWeekId required' });

  const menuWeek = await prisma.menuWeek.findUnique({
    where: { id: menuWeekId },
    include: {
      items: {
        where: { isVisible: true },
        include: {
          dish: { select: { id: true, title: true, description: true, tags: true, allergens: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!menuWeek) return res.status(404).json({ error: 'MenuWeek not found' });

  // Load visibility to know which clients get each dish
  const visibilityRows = await prisma.dishVisibility.findMany({
    where: { menuWeekId },
    include: { customer: { select: { slug: true, name: true } } },
  });

  // Build map: dishId → [{ slug, name }]
  const dishClientMap = new Map();
  for (const v of visibilityRows) {
    if (!v.canView) continue;
    if (!dishClientMap.has(v.dishId)) dishClientMap.set(v.dishId, []);
    dishClientMap.get(v.dishId).push({ slug: v.customer.slug, name: v.customer.name });
  }

  // Count distinct clients across the week for summary
  const allClientSlugs = new Set(visibilityRows.map(v => v.customer.slug));

  // Deduplicate dishes
  const seen = new Set();
  const dishes = menuWeek.items
    .map(item => item.dish)
    .filter(dish => {
      if (!dish || seen.has(dish.id)) return false;
      seen.add(dish.id);
      return true;
    });

  // Build dish prep entries
  const prepDishes = dishes.map(dish => {
    const clients = dishClientMap.get(dish.id) || [];
    const ingredients = parseIngredients(dish.description);
    const mealType = parseMealType(dish.tags || []);
    return {
      id: dish.id,
      title: dish.title,
      description: dish.description || '',
      ingredients,
      tags: dish.tags || [],
      allergens: dish.allergens || [],
      mealType,
      clientCount: clients.length,
      clientSlugs: clients.map(c => c.slug),
      clientNames: clients.map(c => c.name || c.slug),
    };
  });

  // Group by meal type in defined order
  const grouped = new Map();
  for (const meal of MEAL_ORDER) grouped.set(meal, []);
  for (const dish of prepDishes) {
    grouped.get(dish.mealType).push(dish);
  }

  const groups = MEAL_ORDER
    .filter(meal => grouped.get(meal).length > 0)
    .map(meal => ({
      mealType: meal,
      dishes: grouped.get(meal),
    }));

  // Flat deduplicated ingredient list for shopping
  const allIngredients = [
    ...new Set(
      prepDishes.flatMap(d => d.ingredients.map(i =>
        i.replace(/\(.*?\)/g, '').trim().toLowerCase()
      ))
    ),
  ].sort();

  // Summary by meal type
  const byMealType = {};
  for (const meal of MEAL_ORDER) {
    const count = grouped.get(meal).length;
    if (count > 0) byMealType[meal] = count;
  }

  return res.status(200).json({
    ok: true,
    menuWeekId,
    weekStart: menuWeek.weekStart,
    weekLabel: formatDateShort(menuWeek.weekStart),
    generatedAt: new Date().toISOString(),
    summary: {
      totalDishes: dishes.length,
      totalClients: allClientSlugs.size,
      byMealType,
    },
    groups,
    allIngredients,
  });
};
