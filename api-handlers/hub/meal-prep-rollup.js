/**
 * Hub meal-prep rollup — render packaging, cook, and bag lists from the
 * canonical production records for a week.
 *
 * Hub notes and planner cards are source evidence. `meal-prep:production`
 * promotes them into MealPrepMenuCycle / MealPrepCustomerMenu records; chef
 * assignments live on MealPrepCustomerMenuItem and survive every regeneration.
 * This endpoint deliberately emits no placeholder "Unassigned" menu rows: an
 * unassigned dish is a production blocker, not a printable label.
 *
 * Staff-only.
 *
 *   GET /api/hub/meal-prep-rollup?weekStart=YYYY-MM-DD
 */

const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, cleanString } = require('./_http');
const {
  loadCanonicalWeek,
  resolveWeekStart,
} = require('../../backend/api/planner/mealPrepProduction');

// Build the human packaging label, e.g. "chicken tikka dinner". Skip the meal
// suffix when the dish name already carries it ("Chicken Dinner" + dinner). Qty
// is prefixed only when more than one container is assigned.
function packagingLabel({ name, meal, diet, qty }) {
  const lowerName = name.toLowerCase();
  const includeMeal = meal && meal !== 'other' && !new RegExp(`\\b${meal}\\b`).test(lowerName);
  const parts = [qty > 1 ? String(qty) : '', diet ? diet.toLowerCase() : '', lowerName, includeMeal ? meal : '']
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ');
}

// Build production line items only from explicit per-customer chef assignments.
// Master-menu entries alone are not quantities and must never become labels.
function lineItemsFromCycle(cycle) {
  if (!cycle) return [];
  return cycle.customerMenus.flatMap((menu) =>
    menu.items.map((item) => ({
      id: item.id,
      customerMenuId: menu.id,
      menuCycleItemId: item.menuCycleItemId || null,
      dishText: item.dishName,
      client: menu.customerName,
      meal: item.meal,
      qty: item.quantity,
      diet: item.diet || '',
      station: item.station || 'Unassigned',
      chef: item.chef || 'Unassigned',
      day: item.prepDay || 'Unassigned',
      notes: item.notes || '',
      dishEntityId: item.dishEntityId || item.menuCycleItem?.dishEntityId || null,
      dishKey: item.dishEntityId || item.menuCycleItem?.dishEntityId || item.dishName.toLowerCase(),
      canonicalName: item.dishName,
      matchConfidence: item.dishEntityId || item.menuCycleItem?.dishEntityId ? 1 : 0,
      matchMethod: item.dishEntityId || item.menuCycleItem?.dishEntityId ? 'canonical' : 'none',
      candidates: [],
    })),
  );
}

async function buildLineItems({ weekStart, prismaClient = prisma }) {
  const { cycle } = await loadCanonicalWeek(prismaClient, weekStart);
  return lineItemsFromCycle(cycle);
}

function buildPackaging(items) {
  const groups = new Map();
  for (const item of items) {
    const key = `${item.dishKey}|${item.meal}|${item.diet.toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, {
        dishEntityId: item.dishEntityId,
        name: item.canonicalName,
        meal: item.meal,
        diet: item.diet,
        qty: 0,
        resolved: !!item.dishEntityId,
      });
    }
    groups.get(key).qty += item.qty;
  }
  return [...groups.values()]
    .map((g) => ({ ...g, label: packagingLabel(g) }))
    .sort((a, b) => a.meal.localeCompare(b.meal) || b.qty - a.qty || a.name.localeCompare(b.name));
}

function buildCookLists(items) {
  const byChef = new Map();
  for (const item of items) {
    if (!byChef.has(item.chef)) byChef.set(item.chef, new Map());
    const byDay = byChef.get(item.chef);
    if (!byDay.has(item.day)) byDay.set(item.day, new Map());
    const byStation = byDay.get(item.day);
    if (!byStation.has(item.station)) byStation.set(item.station, new Map());
    const dishes = byStation.get(item.station);
    const key = `${item.dishKey}|${item.meal}|${item.diet.toLowerCase()}`;
    if (!dishes.has(key)) {
      dishes.set(key, { name: item.canonicalName, meal: item.meal, diet: item.diet, qty: 0 });
    }
    dishes.get(key).qty += item.qty;
  }
  return [...byChef.entries()].map(([chef, byDay]) => ({
    chef,
    days: [...byDay.entries()].map(([day, byStation]) => ({
      day,
      stations: [...byStation.entries()].map(([station, dishes]) => ({
        station,
        dishes: [...dishes.values()].sort((a, b) => a.name.localeCompare(b.name)),
      })),
    })),
  }));
}

function buildBagLists(items) {
  const byClient = new Map();
  for (const item of items) {
    if (!byClient.has(item.client)) byClient.set(item.client, []);
    byClient.get(item.client).push({
      name: item.canonicalName,
      meal: item.meal,
      diet: item.diet,
      qty: item.qty,
      notes: item.notes,
    });
  }
  return [...byClient.entries()]
    .map(([client, dishes]) => ({
      client,
      itemCount: dishes.reduce((sum, d) => sum + d.qty, 0),
      dishes: dishes.sort((a, b) => a.meal.localeCompare(b.meal) || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.client.localeCompare(b.client));
}

async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { allowedAccess: ['staff', 'privileged'] });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const weekParam = cleanString(req.query?.weekStart, 10);
  const weekStart = resolveWeekStart(weekParam || undefined);
  if (!weekStart) return res.status(400).json({ error: 'Invalid weekStart (expected YYYY-MM-DD)' });

  try {
    const loaded = await loadCanonicalWeek(prisma, weekStart);
    const cycle = loaded.cycle;
    const items = lineItemsFromCycle(cycle);
    const unresolved = items
      .filter((item) => !item.dishEntityId)
      .map((item) => ({ dishText: item.dishText, client: item.client }));
    const latestBatch = cycle?.productionBatches?.[0] || null;

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      weekStart,
      cycleId: cycle?.id || null,
      status: cycle?.status || 'missing',
      batch: latestBatch
        ? { id: latestBatch.id, version: latestBatch.version, status: latestBatch.status, generatedAt: latestBatch.generatedAt }
        : null,
      readiness: latestBatch?.operatorSheet?.readiness || {
        status: 'blocked',
        blockerCount: 1,
        commitmentCount: 0,
        assignedLineCount: 0,
        plannerCardsExact: false,
      },
      blockers: latestBatch?.blockers || [{ code: 'canonical_cycle_missing', message: `Run meal-prep:production for ${weekStart}.` }],
      plannerDiff: latestBatch?.plannerDiff || null,
      lineCount: items.length,
      packaging: buildPackaging(items),
      cookLists: buildCookLists(items),
      bagLists: buildBagLists(items),
      unresolved,
    });
  } catch (err) {
    console.error('[hub/meal-prep-rollup] error', err);
    return res.status(500).json({ error: 'Unable to build meal prep rollup' });
  }
}

module.exports = handler;
module.exports._internals = {
  packagingLabel,
  buildPackaging,
  buildCookLists,
  buildBagLists,
  lineItemsFromCycle,
  buildLineItems,
  weekStartForDate: (dateIso) => resolveWeekStart(dateIso),
};
