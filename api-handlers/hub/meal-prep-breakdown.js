/**
 * Hub meal-prep breakdown — the per-customer prep plan for one week. This is the
 * missing middle between the flat weekly menu and the kitchen's working lists.
 *
 * The Weekly Meal Prep menu (#dinners# #lunches# #breakfasts# #kids meals#) is a
 * FLAT dish list with no per-customer counts, stations, chefs, or days. The
 * breakdown adds those dimensions: one row per (customer × dish × qty) with
 * station/chef/day tags. Once saved, the rollup and labels read THIS doc instead
 * of the flat menu, so cook lists / bag lists / stickers become per-customer.
 *
 * Storage: HubDocument source='drafts', sourceId='prep-breakdown:week-<sunday>',
 * body = JSON { weekStart, lines: [...], updatedAt }. Same draft surface the menu
 * notepad uses, so it rolls off / archives the same way.
 *
 * SCAFFOLD: when no breakdown is saved yet, GET returns a scaffold built from each
 * active customer's planRulesJson.sections (qty + menuCategory) — one line per
 * plan section, with dish left blank for staff to fill from that week's menu. The
 * staff then edit qty/dish/station/chef/day in the grid and POST to save.
 *
 * Staff-only.
 *
 *   GET  /api/hub/meal-prep-breakdown?weekStart=YYYY-MM-DD
 *        → { ok, weekStart, saved:boolean, lines, menu, customers, stations, chefs, days }
 *   POST /api/hub/meal-prep-breakdown { weekStart, lines }
 *        → { ok, weekStart, saved:true, lineCount }
 */

const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, cleanString } = require('./_http');
const { resolveDishNames } = require('../../backend/api/brain/dishResolver');
const { sectionsFromNotepad } = require('./_notepadParse');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const NOTE_SOURCE = 'drafts';

// Seed tag dimensions (see memory meal-prep-pipeline-surfaces). A line can take
// any one of each; the UI offers these plus free entry.
const STATIONS = ['Meat', 'Stove', 'Sauce and Salad', 'Baked Goods'];
const CHEFS = ['Weston', 'Catherine', 'Maria'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Active weekly meal-prep customers (table rows). Mirrors weekly-meal-prep.js.
const TARGET_CUSTOMER_SLUGS = ['levy-family', 'samantha-bailey'];

// Menu meal categories (mirrors master-menu.js / meal-prep-rollup.js).
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

function breakdownSourceId(weekStart) {
  return `prep-breakdown:week-${weekStart}`;
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return fallback;
  }
}

// Load the week's menu notepad body (the flat #dinners# … dish list).
async function loadMenuBody(weekStart) {
  const doc = await prisma.hubDocument.findUnique({
    where: { source_sourceId: { source: NOTE_SOURCE, sourceId: menuSourceId(weekStart) } },
  });
  return doc?.body || '';
}

// Parse the menu into dishes tagged with their meal category.
function menuDishesFromBody(body) {
  const dishes = [];
  for (const { section, items } of sectionsFromNotepad(body)) {
    const meal = mealForSection(section);
    if (!meal) continue;
    for (const text of items) dishes.push({ text, meal });
  }
  return dishes;
}

// The active customers whose plans drive the scaffold. Returns slug, name, and
// the plan sections (qty + menuCategory) we allocate against the menu.
async function loadPlanCustomers() {
  const customers = await prisma.customer.findMany({
    where: { slug: { in: TARGET_CUSTOMER_SLUGS } },
    select: { id: true, slug: true, name: true, planRulesJson: true },
    orderBy: { name: 'asc' },
  });
  return customers.map((c) => {
    const rules = parseJson(c.planRulesJson, {}) || {};
    const sections = rules.sections && typeof rules.sections === 'object' ? rules.sections : {};
    const planSections = Object.entries(sections).map(([key, sec]) => ({
      key,
      label: sec?.label || key,
      qty: sec?.qty ?? null,
      open: !!sec?.open,
      menuCategory: sec?.menuCategory || null,
      style: sec?.style || null,
    }));
    return { id: c.id, slug: c.slug, name: c.name || c.slug, planSections };
  });
}

let lineSeq = 0;
function newLineId() {
  lineSeq += 1;
  return `bl-${Date.now().toString(36)}-${lineSeq}`;
}

// Build a starter breakdown from the customers' plans. One line per plan section,
// qty pulled from the plan, dish blank (staff picks from the week's menu in that
// category). Open sections (no fixed qty) seed a single qty-1 line as a prompt.
function scaffoldLines(customers) {
  const lines = [];
  for (const customer of customers) {
    for (const section of customer.planSections) {
      lines.push({
        id: newLineId(),
        client: customer.name,
        customerSlug: customer.slug,
        menuCategory: section.menuCategory || 'dinner',
        planSection: section.label,
        dish: '',
        qty: section.open ? 1 : (section.qty || 1),
        diet: '',
        station: '',
        chef: '',
        day: '',
        notes: section.open ? 'open / as needed' : '',
      });
    }
  }
  return lines;
}

// Normalize and resolve saved/scaffold lines so the UI always gets dishEntityId +
// canonicalName where a dish text resolves.
async function decorateLines(lines) {
  const texts = lines.map((l) => l.dish || '');
  const resolutions = await resolveDishNames(texts, { prisma });
  return lines.map((line, i) => {
    const r = resolutions[i] || {};
    return {
      ...line,
      dishEntityId: line.dish ? (r.dishEntityId || null) : null,
      canonicalName: line.dish ? (r.name || line.dish) : '',
      matchConfidence: line.dish ? (r.confidence ?? 0) : 0,
      candidates: line.dish ? (r.candidates || []) : [],
    };
  });
}

// Coerce one POSTed line into the stored shape (defensive; the grid sends these).
function sanitizeLine(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const qty = Number(raw.qty);
  return {
    id: cleanString(raw.id, 64) || newLineId(),
    client: cleanString(raw.client, 120) || 'Unassigned',
    customerSlug: cleanString(raw.customerSlug, 120) || '',
    menuCategory: cleanString(raw.menuCategory, 24) || 'dinner',
    planSection: cleanString(raw.planSection, 120) || '',
    dish: cleanString(raw.dish, 200) || '',
    qty: Number.isFinite(qty) && qty > 0 ? Math.min(Math.floor(qty), 999) : 1,
    diet: cleanString(raw.diet, 60) || '',
    station: cleanString(raw.station, 60) || '',
    chef: cleanString(raw.chef, 60) || '',
    day: cleanString(raw.day, 12) || '',
    notes: cleanString(raw.notes, 500) || '',
  };
}

// Read the saved breakdown doc; returns { lines } or null when none saved.
async function loadSavedBreakdown(weekStart) {
  const doc = await prisma.hubDocument.findUnique({
    where: { source_sourceId: { source: NOTE_SOURCE, sourceId: breakdownSourceId(weekStart) } },
  });
  if (!doc) return null;
  const parsed = parseJson(doc.body, null);
  if (!parsed || !Array.isArray(parsed.lines)) return null;
  return { lines: parsed.lines, updatedAt: parsed.updatedAt || null };
}

async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { allowedAccess: ['staff', 'privileged'] });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const commit = req.method === 'POST';
  const weekParam = cleanString(commit ? req.body?.weekStart : req.query?.weekStart, 10);
  const weekStart = weekParam
    ? weekStartForDate(weekParam)
    : weekStartForDate(new Date().toISOString().slice(0, 10));
  if (!weekStart) return res.status(400).json({ error: 'Invalid weekStart (expected YYYY-MM-DD)' });

  try {
    if (commit) {
      const rawLines = Array.isArray(req.body?.lines) ? req.body.lines : [];
      const lines = rawLines.map(sanitizeLine).filter(Boolean);
      const payload = JSON.stringify({ weekStart, lines, updatedAt: new Date().toISOString() });
      await prisma.hubDocument.upsert({
        where: { source_sourceId: { source: NOTE_SOURCE, sourceId: breakdownSourceId(weekStart) } },
        update: {
          title: `Prep Breakdown — week of ${weekStart}`,
          body: payload,
          summary: 'Per-customer meal-prep breakdown: counts, stations, chefs, days.',
          visibility: 'staff',
          category: 'prep-breakdown',
          tags: ['prep-breakdown', 'drafts'],
        },
        create: {
          source: NOTE_SOURCE,
          sourceId: breakdownSourceId(weekStart),
          title: `Prep Breakdown — week of ${weekStart}`,
          body: payload,
          summary: 'Per-customer meal-prep breakdown: counts, stations, chefs, days.',
          visibility: 'staff',
          category: 'prep-breakdown',
          tags: ['prep-breakdown', 'drafts'],
          createdByUserId: auth.viewer.userId || null,
        },
      });
      return res.status(200).json({ ok: true, weekStart, saved: true, lineCount: lines.length });
    }

    // GET — saved breakdown if present, else a scaffold from the plans.
    const [saved, menuBody, customers] = await Promise.all([
      loadSavedBreakdown(weekStart),
      loadMenuBody(weekStart),
      loadPlanCustomers(),
    ]);
    const rawLines = saved ? saved.lines.map(sanitizeLine).filter(Boolean) : scaffoldLines(customers);
    const lines = await decorateLines(rawLines);
    const menu = menuDishesFromBody(menuBody);

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      weekStart,
      saved: !!saved,
      savedAt: saved?.updatedAt || null,
      lines,
      menu, // [{ text, meal }] — the dish options to assign per line
      customers: customers.map((c) => ({ slug: c.slug, name: c.name, planSections: c.planSections })),
      stations: STATIONS,
      chefs: CHEFS,
      days: DAYS,
    });
  } catch (err) {
    console.error('[hub/meal-prep-breakdown] error', err);
    return res.status(500).json({ error: 'Unable to load or save prep breakdown' });
  }
}

module.exports = handler;
module.exports._internals = {
  weekStartForDate,
  breakdownSourceId,
  menuSourceId,
  scaffoldLines,
  sanitizeLine,
  loadSavedBreakdown,
  menuDishesFromBody,
  mealForSection,
  STATIONS,
  CHEFS,
  DAYS,
  TARGET_CUSTOMER_SLUGS,
};
