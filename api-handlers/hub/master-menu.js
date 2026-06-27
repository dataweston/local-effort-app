/**
 * Hub master menu — parse the weekly menu and formalize its dishes against the
 * knowledge graph.
 *
 * SOURCE OF TRUTH: the Weekly Meal Prep tab's per-week notepad (HubDocument
 * source='drafts', sourceId='weekly-meal-prep:week-<sunday>'). Weston writes the
 * menu there every Thursday under meal-category subheadings:
 *
 *     #dinners#    #lunches#    #breakfasts#    #kids meals#
 *
 * A dish's MEAL CATEGORY is the subheading it sits under — no per-line tagging.
 * Each dish line is resolved to a canonical brain `Dish` entity. That formalized
 * menu is what later feeds per-customer hubs and label printing.
 *
 * This is scoped to "parse menu + formalize canonical dishes". It does NOT assign
 * counts, stations, or chefs — that prep-breakdown step comes after.
 *
 * Distinct from: the Today-tab House Notepad `#in season#` (in-stock OPTIONS
 * palette, see /api/hub/house-notepad-canon) and Food Inputs (customer notes).
 *
 *   GET  /api/hub/master-menu?weekStart=YYYY-MM-DD   → read-only parse + match
 *   POST /api/hub/master-menu  { weekStart }          → parse + CREATE missing dishes
 *     weekStart may be any day in the prep week; it's snapped to the Sun/Mon pair.
 *     Omitted → the current prep week.
 *
 *   dishes[]: { text, meal, dishEntityId, canonicalName, confidence, method, resolved, created, candidates }
 *   summary:  { total, resolved, unresolved, created, byMeal: { dinner: n, ... } }
 */

const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, cleanString } = require('./_http');
const { resolveDishNames, resolveOrCreateDishes } = require('../../backend/api/brain/dishResolver');
const { sectionsFromNotepad } = require('./_notepadParse');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const NOTE_SOURCE = 'drafts';
const NOTE_TIMEZONE = 'America/Chicago';

// Map a subheading to a canonical meal category. Tolerates singular/plural and
// "kids meals" / "kids" / "kid". Unknown subheadings → null (lines ignored for
// the menu, since the menu is defined by these categories).
const MEAL_SUBHEADINGS = [
  { meal: 'dinner', re: /^dinners?$/i },
  { meal: 'lunch', re: /^lunch(es)?$/i },
  { meal: 'breakfast', re: /^breakfasts?$/i },
  { meal: 'kids', re: /^kids?(\s+meals?)?$/i },
];

function mealForSection(sectionName) {
  const name = String(sectionName || '').trim();
  const hit = MEAL_SUBHEADINGS.find((entry) => entry.re.test(name));
  return hit ? hit.meal : null;
}

function addDaysIso(iso, days) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function localToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: NOTE_TIMEZONE });
}

// Snap any date to the Sunday starting its Sun/Mon prep pair; with no date, use
// the current prep week (rolled forward once its Monday has passed, like the tab).
function resolveWeekStart(dateIso) {
  const base = dateIso || localToday();
  const day = new Date(`${base}T00:00:00`);
  if (Number.isNaN(day.getTime())) return null;
  let sunday = addDaysIso(base, -day.getDay());
  if (!dateIso && base > addDaysIso(sunday, 1)) sunday = addDaysIso(sunday, 7);
  return sunday;
}

function menuSourceId(weekStart) {
  return `weekly-meal-prep:week-${weekStart}`;
}

async function loadMenuBody(weekStart) {
  const doc = await prisma.hubDocument.findUnique({
    where: { source_sourceId: { source: NOTE_SOURCE, sourceId: menuSourceId(weekStart) } },
  });
  return doc?.body || '';
}

async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  // Menu authoring + brain resolution are staff-only.
  const denied = requireHubAccess(auth, { allowedAccess: ['staff', 'privileged'] });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  // POST = commit (create missing canonical dishes). GET = read-only parse.
  const commit = req.method === 'POST';
  const weekParam = cleanString(commit ? req.body?.weekStart : req.query?.weekStart, 10);
  const weekStart = resolveWeekStart(weekParam);
  if (!weekStart) return res.status(400).json({ error: 'Invalid weekStart (expected YYYY-MM-DD)' });

  try {
    const body = await loadMenuBody(weekStart);
    const sections = sectionsFromNotepad(body);

    // Flatten lines under recognized meal subheadings, tagging each with its meal.
    const lines = [];
    for (const { section, items } of sections) {
      const meal = mealForSection(section);
      if (!meal) continue;
      for (const text of items) lines.push({ text, meal });
    }

    const names = lines.map((l) => l.text);
    const resolutions = commit
      ? await resolveOrCreateDishes(names, { prisma, createdBy: auth.viewer.email || 'staff', menuContext: { weekStart } })
      : await resolveDishNames(names, { prisma });

    const dishes = lines.map((line, i) => {
      const r = resolutions[i] || {};
      return {
        text: line.text,
        meal: line.meal,
        dishEntityId: r.dishEntityId || null,
        canonicalName: r.name || null,
        confidence: r.confidence ?? 0,
        method: r.method || 'none',
        resolved: !!r.dishEntityId,
        created: !!r.created,
        candidates: r.candidates || [],
      };
    });

    const resolved = dishes.filter((d) => d.resolved).length;
    const created = dishes.filter((d) => d.created).length;
    const byMeal = dishes.reduce((acc, d) => {
      acc[d.meal] = (acc[d.meal] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      weekStart,
      committed: commit,
      dishes,
      summary: { total: dishes.length, resolved, unresolved: dishes.length - resolved, created, byMeal },
    });
  } catch (err) {
    console.error('[hub/master-menu] error', err);
    return res.status(500).json({ error: 'Unable to parse menu' });
  }
}

module.exports = handler;
module.exports._internals = { mealForSection, resolveWeekStart, menuSourceId, MEAL_SUBHEADINGS };
