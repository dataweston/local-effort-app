/**
 * Hub meal-prep rollup — derive the kitchen's working lists from the week's
 * menu, so nothing gets re-typed between "menu decided" and "bags out".
 *
 * SOURCE: the Weekly Meal Prep notepad for the week (HubDocument,
 * source='drafts', sourceId='weekly-meal-prep:week-<sunday>') — the SAME menu
 * Weston writes every Thursday under meal-category subheadings:
 *
 *     #dinners#  #lunches#  #breakfasts#  #kids meals#
 *
 * A dish's MEAL CATEGORY is the subheading it sits under (parsed via the shared
 * _notepadParse). Each dish line resolves to a canonical brain Dish entity so
 * two spellings collapse into one packaging count. From the menu we emit:
 *
 *   1. packaging — group by (dish identity + meal), one per dish line
 *        → "chicken tikka dinner", "nicoise salad lunch"
 *   2. cookLists — group by Chef → Day → Station (see caveat below)
 *   3. bagLists  — group by Client (see caveat below)
 *
 * CAVEAT — menu-bridge stage: the Weekly Meal Prep menu is a FLAT dish list. It
 * has NO per-customer Client, Qty, Diet, Station, Chef, or Day — those are the
 * job of the prep-breakdown stage (prep-breakdown:week-<sunday>), which isn't
 * built yet. Until it is, cookLists/bagLists collapse under "Unassigned" and
 * packaging counts are per menu line (qty 1). `buildLineItems` is the single
 * function that swaps to read the structured breakdown doc once it exists; the
 * three view-builders and the resolver do not change.
 *
 * Do NOT read the Food Inputs sheet here — that is the per-customer notes space,
 * never a menu/prep source. See memory meal-prep-pipeline-surfaces.
 *
 * Staff-only.
 *
 *   GET /api/hub/meal-prep-rollup?weekStart=YYYY-MM-DD   → { ok, weekStart, lineCount, packaging, cookLists, bagLists, unresolved }
 *     weekStart may be any day in the prep week; it's snapped to the Sun/Mon pair.
 */

const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, cleanString } = require('./_http');
const { resolveDishNames } = require('../../backend/api/brain/dishResolver');
const { sectionsFromNotepad } = require('./_notepadParse');


const NOTE_SOURCE = 'drafts';

// Map a menu subheading to a canonical meal category (mirrors master-menu.js).
const MEAL_SECTIONS = [
  { meal: 'dinner', re: /^dinners?$/i },
  { meal: 'lunch', re: /^lunch(es)?$/i },
  { meal: 'breakfast', re: /^breakfasts?$/i },
  { meal: 'kids', re: /^kids?(\s+meals?)?$/i },
];

function mealForSection(section) {
  const name = String(section || '').trim();
  const hit = MEAL_SECTIONS.find((entry) => entry.re.test(name));
  return hit ? hit.meal : null;
}

function addDaysIso(iso, days) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

// Snap any date to the Sunday that starts its Sun/Mon prep pair.
function weekStartForDate(dateIso) {
  const day = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(day.getTime())) return null;
  return addDaysIso(dateIso, -day.getDay());
}

function menuSourceId(weekStart) {
  return `weekly-meal-prep:week-${weekStart}`;
}

// Build the human packaging label, e.g. "chicken tikka dinner". Skip the meal
// suffix when the dish name already carries it ("Chicken Dinner" + dinner). Qty
// is prefixed only when > 1 (the menu bridge has no per-line qty, so it's 1).
function packagingLabel({ name, meal, diet, qty }) {
  const lowerName = name.toLowerCase();
  const includeMeal = meal && meal !== 'other' && !new RegExp(`\\b${meal}\\b`).test(lowerName);
  const parts = [qty > 1 ? String(qty) : '', diet ? diet.toLowerCase() : '', lowerName, includeMeal ? meal : '']
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ');
}

// Load the week's menu notepad body (Weekly Meal Prep tab).
async function loadMenuBody(weekStart) {
  const doc = await prisma.hubDocument.findUnique({
    where: { source_sourceId: { source: NOTE_SOURCE, sourceId: menuSourceId(weekStart) } },
  });
  return doc?.body || '';
}

// Turn the menu notepad into dish-resolved line items. Each dish line under a
// recognized meal subheading (#dinners# etc.) becomes one line, tagged with the
// meal from its subheading. Client/Qty/Diet/Station/Chef/Day don't exist on the
// menu yet (prep-breakdown stage) — they default to Unassigned / 1 / ''.
async function buildLineItems({ body }) {
  const raw = [];
  for (const { section, items } of sectionsFromNotepad(body)) {
    const meal = mealForSection(section);
    if (!meal) continue; // ignore non-menu subheadings
    for (const text of items) {
      raw.push({
        dishText: text,
        client: 'Unassigned',
        meal,
        qty: 1,
        diet: '',
        station: 'Unassigned',
        chef: 'Unassigned',
        day: 'Unassigned',
        notes: '',
      });
    }
  }

  // Resolve every dish name once, in a batch, then attach identity to each line.
  const resolutions = await resolveDishNames(raw.map((item) => item.dishText), { prisma });
  return raw.map((item, i) => {
    const res = resolutions[i] || {};
    return {
      ...item,
      dishEntityId: res.dishEntityId || null,
      // Stable grouping key: canonical entity id when resolved, else lowercased
      // text so unresolved-but-identical names still collapse together.
      dishKey: res.dishEntityId || item.dishText.toLowerCase(),
      canonicalName: res.name || item.dishText,
      matchConfidence: res.confidence ?? 0,
      matchMethod: res.method || 'none',
      candidates: res.candidates || [],
    };
  });
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
    const key = item.dishKey;
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
  const weekStart = weekParam ? weekStartForDate(weekParam) : weekStartForDate(new Date().toISOString().slice(0, 10));
  if (!weekStart) return res.status(400).json({ error: 'Invalid weekStart (expected YYYY-MM-DD)' });

  try {
    const body = await loadMenuBody(weekStart);
    const items = await buildLineItems({ body });
    const unresolved = items
      .filter((item) => !item.dishEntityId)
      .map((item) => ({ dishText: item.dishText, candidates: item.candidates, confidence: item.matchConfidence }));

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      weekStart,
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
  mealForSection, packagingLabel,
  buildPackaging, buildCookLists, buildBagLists, buildLineItems, weekStartForDate,
};
