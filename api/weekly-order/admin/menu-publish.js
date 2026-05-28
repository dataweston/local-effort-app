/**
 * POST /api/weekly-order/admin/menu-publish
 *
 * Takes approved dishes from menu-ingest review and commits them:
 *   - Upserts each Dish (match by id if provided, else match by normalized title, else create)
 *   - Finds or creates a MenuWeek for weekStart
 *   - Creates MenuWeekItem rows for each dish
 *   - Creates DishVisibility rows so each client sees only their assigned dishes
 *   - Returns menuWeekId, dish results, and ready-to-use input.txt content for make_stickers.py
 *
 * Body (JSON):
 * {
 *   weekStart: "2026-04-28",          // ISO date string, Monday of the week
 *   cutoffAt:  "2026-04-26T20:00:00", // optional, defaults to Saturday 8pm before weekStart
 *   dishes: [
 *     {
 *       title: "Chicken Tikka Masala",
 *       description: "basmati rice, naan, cilantro",
 *       tags: ["dinner"],
 *       allergens: ["dairy", "wheat"],
 *       notes: "",
 *       matchedDishId: "uuid-or-null",  // if set, update existing dish
 *       clientSlugs: ["kara", "alex"],  // which clients see this dish
 *     }
 *   ],
 *   menuWeekStatus: "draft",  // optional, default "draft"; use "published" to go live immediately
 * }
 */

const { PrismaClient } = require('@prisma/client');
const { requireWeeklyOrderAdmin } = require('../../../api-handlers/weekly-order/admin/_auth');

let prisma = null;
try { prisma = new PrismaClient(); } catch (_) { prisma = null; }

const normalize = (s) =>
  (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

// Default cutoff: Saturday 8pm local (2 days before Monday weekStart)
function defaultCutoff(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() - 2);
  d.setHours(20, 0, 0, 0);
  return d;
}

// Build input.txt content in the format expected by make_stickers.py
function buildStickerInput(dishes) {
  return dishes
    .map(({ title, description, tags = [], notes }) => {
      const line1 = title;
      const line2 = description || '';
      const metaParts = [];
      const meal = ['breakfast', 'lunch', 'dinner'].find(m => tags.includes(m));
      if (meal) metaParts.push(meal);
      if (tags.includes('kids')) metaParts.push('kids');
      if (notes && notes.trim()) metaParts.push(notes.trim());
      const line3 = metaParts.join(' ');
      return line3 ? `${line1}\n${line2}\n${line3}` : `${line1}\n${line2}`;
    })
    .join('\n\n');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const admin = await requireWeeklyOrderAdmin(req, res);
  if (!admin) return;
  if (!prisma) return res.status(500).json({ error: 'Database not configured' });

  const {
    weekStart,
    cutoffAt,
    dishes,
    menuWeekStatus = 'published',
  } = req.body || {};

  if (!weekStart) return res.status(400).json({ error: 'weekStart required (ISO date string)' });
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return res.status(400).json({ error: 'dishes array required' });
  }

  const weekStartDate = new Date(weekStart);
  if (isNaN(weekStartDate.getTime())) {
    return res.status(400).json({ error: 'weekStart must be a valid date' });
  }
  const cutoffDate = cutoffAt ? new Date(cutoffAt) : defaultCutoff(weekStartDate);
  const normalizedMenuWeekStatus = menuWeekStatus === 'draft' ? 'draft' : 'published';

  // Resolve all clientSlugs mentioned across all dishes upfront
  const allSlugs = [...new Set(dishes.flatMap(d => d.clientSlugs || []))];
  const customerMap = new Map(); // slug → customer id
  if (allSlugs.length > 0) {
    const customers = await prisma.customer.findMany({
      where: { slug: { in: allSlugs } },
      select: { id: true, slug: true },
    });
    customers.forEach(c => customerMap.set(c.slug, c.id));
    const missing = allSlugs.filter(s => !customerMap.has(s));
    if (missing.length > 0) {
      return res.status(400).json({ error: `Unknown customer slugs: ${missing.join(', ')}` });
    }
  }

  // Find or create MenuWeek
  let menuWeek = await prisma.menuWeek.findFirst({
    where: { weekStart: weekStartDate },
  });
  if (!menuWeek) {
    menuWeek = await prisma.menuWeek.create({
      data: {
        weekStart: weekStartDate,
        cutoffAt: cutoffDate,
        status: normalizedMenuWeekStatus,
      },
    });
  } else {
    menuWeek = await prisma.menuWeek.update({
      where: { id: menuWeek.id },
      data: {
        cutoffAt: cutoffAt ? cutoffDate : undefined,
        status: normalizedMenuWeekStatus,
      },
    });
  }

  const results = [];

  for (let i = 0; i < dishes.length; i++) {
    const d = dishes[i];
    const title = (d.title || '').trim();
    if (!title) {
      results.push({ index: i, title: '', skipped: true, reason: 'empty title' });
      continue;
    }

    let dishId;
    let action;

    if (d.matchedDishId) {
      // Update existing dish
      await prisma.dish.update({
        where: { id: d.matchedDishId },
        data: {
          title,
          description: d.description || null,
          tags: d.tags || [],
          allergens: d.allergens || [],
          categories: d.tags || [],
          status: 'approved',
        },
      });
      dishId = d.matchedDishId;
      action = 'updated';
    } else {
      // Try to find by normalized title
      const existing = await prisma.dish.findFirst({
        where: { title: { equals: title, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existing) {
        dishId = existing.id;
        action = 'matched';
      } else {
        // Create new dish
        const created = await prisma.dish.create({
          data: {
            title,
            description: d.description || null,
            tags: d.tags || [],
            allergens: d.allergens || [],
            categories: d.tags || [],
            status: 'approved',
          },
        });
        dishId = created.id;
        action = 'created';
      }
    }

    // Add to MenuWeek (upsert so re-publishing is safe)
    await prisma.menuWeekItem.upsert({
      where: { menuWeekId_dishId: { menuWeekId: menuWeek.id, dishId } },
      update: { isVisible: true, sortOrder: i },
      create: {
        menuWeekId: menuWeek.id,
        dishId,
        isVisible: true,
        isAddon: false,
        includedInPlan: false,
        sortOrder: i,
      },
    });

    // Set per-client visibility
    const clientSlugs = d.clientSlugs || [];
    for (const slug of clientSlugs) {
      const customerId = customerMap.get(slug);
      if (!customerId) continue;
      await prisma.dishVisibility.upsert({
        where: { menuWeekId_dishId_customerId: { menuWeekId: menuWeek.id, dishId, customerId } },
        update: { canView: true },
        create: { menuWeekId: menuWeek.id, dishId, customerId, canView: true },
      });
    }

    results.push({ index: i, title, dishId, action, clientSlugs });
  }

  const committed = results.filter(r => !r.skipped);
  const committedDishIds = committed.map((row) => row.dishId).filter(Boolean);
  const priceRows = committedDishIds.length
    ? await prisma.dishPrice.findMany({
        where: {
          menuWeekId: menuWeek.id,
          dishId: { in: committedDishIds },
          tier: { in: ['subscriber', 'member'] },
        },
        select: { dishId: true, tier: true },
      })
    : [];

  const priceCoverage = new Set(priceRows.map((row) => `${row.dishId}-${row.tier}`));
  const missingPricing = committed
    .map((row) => {
      const missingTiers = ['subscriber', 'member'].filter((tier) => !priceCoverage.has(`${row.dishId}-${tier}`));
      if (!missingTiers.length) return null;
      return {
        dishId: row.dishId,
        title: row.title,
        missingTiers,
      };
    })
    .filter(Boolean);

  const stickerInput = buildStickerInput(
    committed.map(r => dishes[r.index])
  );

  return res.status(200).json({
    ok: true,
    menuWeekId: menuWeek.id,
    weekStart: menuWeek.weekStart,
    status: menuWeek.status,
    dishes: results,
    missingPricing,
    stickerInput,
  });
};
