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

const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, cleanString } = require('./_http');
const { resolveDishNames, resolveOrCreateDishes } = require('../../backend/api/brain/dishResolver');
const { parseMealMenu } = require('./_mealMenuParse');
const {
  NOTE_SOURCE,
  menuSourceId,
  resolveWeekStart,
  syncMealPrepWeek,
} = require('../../backend/api/planner/mealPrepProduction');



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
    // Parse the menu in the format Weston writes: permanent category headings
    // (Dinners/Lunches/Breakfasts/Kids/Snacks), each dish a NAME line (main
    // component) followed by prose description/side lines. The dish NAME is what
    // resolves to a canonical Dish; the description is carried for context.
    const parsed = parseMealMenu(body);

    const names = parsed.map((d) => d.name);
    const resolutions = commit
      ? await resolveOrCreateDishes(names, { prisma, createdBy: auth.viewer.email || 'staff', menuContext: { weekStart } })
      : await resolveDishNames(names, { prisma });

    const dishes = parsed.map((line, i) => {
      const r = resolutions[i] || {};
      return {
        text: line.name,
        description: line.description || '',
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
    const production = commit
      ? await syncMealPrepWeek({
        prisma,
        weekStart,
        supabaseUid: process.env.HUB_MASTER_SUPABASE_UID || auth.viewer.supabaseUid,
        apply: true,
        createdBy: auth.viewer.email || 'staff',
        // The canonical dishes were created immediately above; resolve them
        // read-only while promoting the same note into production records.
        createMissingDishes: false,
      })
      : null;

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      weekStart,
      committed: commit,
      dishes,
      summary: { total: dishes.length, resolved, unresolved: dishes.length - resolved, created, byMeal },
      production: production
        ? {
          cycleId: production.cycle.id,
          batchId: production.batch.id,
          batchVersion: production.batch.version,
          batchReused: production.reused,
          readiness: production.sheet.readiness,
          plannerDiff: production.plannerDiff,
          blockers: production.blockers,
        }
        : null,
    });
  } catch (err) {
    console.error('[hub/master-menu] error', err);
    return res.status(500).json({ error: 'Unable to formalize meal-prep menu' });
  }
}

module.exports = handler;
module.exports._internals = { mealForSection, resolveWeekStart, menuSourceId, MEAL_SUBHEADINGS };
