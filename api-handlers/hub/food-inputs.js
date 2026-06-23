/**
 * Hub Food Inputs — a shared, two-way collaboration log between the kitchen
 * (Weston / staff / privileged) and the customer (David & Allison / Levy Family).
 * The purpose is to trade notes and track dishes, questions, ingredients, and
 * quality inputs in one plain place, week by week.
 *
 * Unlike Weekly Meal Prep — where customers are read-only — Food Inputs is
 * editable by customers too, because the whole point is a conversation.
 *
 * Each week tab carries TWO documents that the customer toggles between:
 *   - a free-form markdown notepad (`food-inputs:md:<weekStart>`)
 *   - a spreadsheet grid stored as JSON (`food-inputs:sheet:<weekStart>`)
 * Both are backed by HubDocument rows (source='drafts'), so no schema change.
 *
 *   GET  /api/hub/food-inputs                  → { ok, mode, weeks: [{ id, title, weekStart, markdown, sheet }] }
 *   POST /api/hub/food-inputs                  → { ok, week }
 *       body: { tabId, view: 'markdown'|'sheet', markdown?, sheet? }
 */

const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString } = require('./_http');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const NOTE_SOURCE = 'drafts';
const NOTE_TIMEZONE = 'America/Chicago';
const FUTURE_WEEK_COUNT = 6;
const PAST_WEEK_COUNT = 2;
const SHEET_SOURCE_PREFIX = 'food-inputs:sheet:week-';
const MD_SOURCE_PREFIX = 'food-inputs:md:week-';

// A starter grid so a fresh sheet view is not blank. Headers the customer and
// kitchen can rename; rows are added as needed.
const DEFAULT_SHEET = {
  columns: ['Dish', 'Ingredients', 'Questions', 'Quality notes'],
  rows: [
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
  ],
};

const MARKDOWN_PLACEHOLDER = [
  '#dishes#',
  '- ',
  '',
  '#ingredients#',
  '- ',
  '',
  '#questions#',
  '- ',
  '',
  '#quality notes#',
  '- ',
  '',
].join('\n');

function localToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: NOTE_TIMEZONE });
}

function addDaysIso(iso, days) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function pairTitle(sundayIso) {
  const sunday = new Date(`${sundayIso}T00:00:00`);
  const monday = new Date(`${sundayIso}T00:00:00`);
  monday.setDate(monday.getDate() + 1);
  const sundayLabel = sunday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const mondayLabel = monday.getMonth() === sunday.getMonth()
    ? String(monday.getDate())
    : monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return `${sundayLabel}/${mondayLabel}`;
}

// The Sunday that starts the Sun/Mon prep pair containing `dateIso`.
function weekStartForDate(dateIso) {
  const day = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(day.getTime())) return null;
  const dayOfWeek = day.getDay(); // 0 = Sunday
  return addDaysIso(dateIso, -dayOfWeek);
}

function weekTab(sunday) {
  return { id: `week-${sunday}`, title: pairTitle(sunday), weekStart: sunday };
}

// The current prep week's Sunday: today's Sunday, but rolled forward once the
// pair's Monday has passed (tabs fall off on Tuesday).
function currentWeekStart() {
  const today = localToday();
  let sunday = weekStartForDate(today);
  if (today > addDaysIso(sunday, 1)) sunday = addDaysIso(sunday, 7);
  return sunday;
}

function currentWeekTab() {
  return weekTab(currentWeekStart());
}

// Default rolling window of week-pair tabs, lined up with the kitchen's prep
// rhythm: a couple of past weeks for reference plus several upcoming weeks.
function defaultWeekTabs() {
  const start = addDaysIso(currentWeekStart(), -7 * PAST_WEEK_COUNT);
  const tabs = [];
  let sunday = start;
  for (let i = 0; i < PAST_WEEK_COUNT + FUTURE_WEEK_COUNT; i += 1) {
    tabs.push(weekTab(sunday));
    sunday = addDaysIso(sunday, 7);
  }
  return tabs;
}

// Back-compat alias used by the POST path / internals.
function activeWeekTabs() {
  return defaultWeekTabs();
}

function markdownSourceId(tabId) {
  return `food-inputs:md:${tabId}`;
}

function sheetSourceId(tabId) {
  return `food-inputs:sheet:${tabId}`;
}

function parseSheet(body) {
  if (!body) return DEFAULT_SHEET;
  try {
    const parsed = JSON.parse(body);
    const columns = Array.isArray(parsed?.columns) && parsed.columns.length
      ? parsed.columns.map((value) => String(value ?? ''))
      : DEFAULT_SHEET.columns;
    const rows = Array.isArray(parsed?.rows)
      ? parsed.rows.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : []))
      : DEFAULT_SHEET.rows;
    return { columns, rows };
  } catch (_err) {
    return DEFAULT_SHEET;
  }
}

// Bound the saved grid so a customer cannot post an unbounded payload.
function sanitizeSheet(value) {
  const columns = (Array.isArray(value?.columns) ? value.columns : DEFAULT_SHEET.columns)
    .slice(0, 12)
    .map((cell) => String(cell ?? '').slice(0, 120));
  const width = columns.length;
  const rows = (Array.isArray(value?.rows) ? value.rows : [])
    .slice(0, 200)
    .map((row) => {
      const cells = Array.isArray(row) ? row : [];
      const trimmed = cells.slice(0, width).map((cell) => String(cell ?? '').slice(0, 2000));
      while (trimmed.length < width) trimmed.push('');
      return trimmed;
    });
  return { columns, rows: rows.length ? rows : DEFAULT_SHEET.rows.map((row) => row.slice(0, width)) };
}

const WEEK_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Parse the `pin` query/body param: a comma-separated list of dates (any day),
// each resolved to its Sun/Mon week start. Lets the customer open any date and
// have it become a tab even when the week is empty and outside the default window.
function parsePinnedWeeks(value) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const starts = raw
    .map((entry) => String(entry || '').trim())
    .filter((entry) => WEEK_DATE_RE.test(entry))
    .map((entry) => weekStartForDate(entry))
    .filter(Boolean);
  return [...new Set(starts)];
}

// Discover any week (past or future, inside or outside the default window) that
// already has a saved Food Inputs doc, so saved history never disappears from
// the tab strip.
async function savedWeekStarts() {
  const docs = await prisma.hubDocument.findMany({
    where: {
      source: NOTE_SOURCE,
      status: 'published',
      OR: [
        { sourceId: { startsWith: MD_SOURCE_PREFIX } },
        { sourceId: { startsWith: SHEET_SOURCE_PREFIX } },
      ],
    },
    select: { sourceId: true },
  });
  const starts = docs
    .map((doc) => /week-(\d{4}-\d{2}-\d{2})$/.exec(doc.sourceId)?.[1])
    .filter(Boolean);
  return [...new Set(starts)];
}

async function loadWeeks(pinnedWeeks = []) {
  const starts = new Set([
    ...defaultWeekTabs().map((tab) => tab.weekStart),
    ...pinnedWeeks,
    ...(await savedWeekStarts()),
  ]);
  const tabs = [...starts].sort().map(weekTab);

  const sourceIds = tabs.flatMap((tab) => [markdownSourceId(tab.id), sheetSourceId(tab.id)]);
  const docs = await prisma.hubDocument.findMany({
    where: { source: NOTE_SOURCE, sourceId: { in: sourceIds }, status: 'published' },
  });
  const bySourceId = new Map(docs.map((doc) => [doc.sourceId, doc]));
  return tabs.map((tab) => {
    const md = bySourceId.get(markdownSourceId(tab.id));
    const sheet = bySourceId.get(sheetSourceId(tab.id));
    return {
      ...tab,
      markdown: md?.body || '',
      markdownUpdatedAt: asIso(md?.updatedAt) || null,
      sheet: parseSheet(sheet?.body),
      sheetUpdatedAt: asIso(sheet?.updatedAt) || null,
    };
  });
}

async function upsertDoc({ source, sourceId, title, body, summary, userId }) {
  const payload = {
    title,
    body,
    summary,
    visibility: 'staff',
    category: 'food-inputs',
    tags: ['food-inputs', 'drafts'],
    createdByUserId: userId || null,
  };
  return prisma.hubDocument.upsert({
    where: { source_sourceId: { source, sourceId } },
    update: payload,
    create: { ...payload, source, sourceId },
  });
}

async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  // Staff, privileged, AND customers can read and write — this is a shared log.
  const denied = requireHubAccess(auth, { allowedAccess: ['staff', 'privileged', 'customer'] });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  try {
    if (req.method === 'POST') {
      const tabId = cleanString(req.body?.tabId, 40) || currentWeekTab().id;
      // Accept any valid Sun/Mon week-start tab id, so a customer can write to a
      // week they reached via the calendar even if it's outside the default window.
      const weekMatch = /^week-(\d{4}-\d{2}-\d{2})$/.exec(tabId);
      if (!weekMatch || weekStartForDate(weekMatch[1]) !== weekMatch[1]) {
        return res.status(400).json({ error: 'Unknown or non-aligned week tab' });
      }
      const tab = weekTab(weekMatch[1]);
      const view = req.body?.view === 'sheet' ? 'sheet' : 'markdown';
      const userId = auth.viewer.userId || null;

      if (view === 'sheet') {
        const sheet = sanitizeSheet(req.body?.sheet);
        await upsertDoc({
          source: NOTE_SOURCE,
          sourceId: sheetSourceId(tab.id),
          title: `Food Inputs (sheet) — ${tab.title}`,
          body: JSON.stringify(sheet),
          summary: 'Shared food-inputs spreadsheet between the kitchen and the customer.',
          userId,
        });
      } else {
        const markdown = typeof req.body?.markdown === 'string' ? req.body.markdown.slice(0, 40_000) : '';
        await upsertDoc({
          source: NOTE_SOURCE,
          sourceId: markdownSourceId(tab.id),
          title: `Food Inputs — ${tab.title}`,
          body: markdown,
          summary: 'Shared food-inputs notes between the kitchen and the customer.',
          userId,
        });
      }

      const weeks = await loadWeeks([tab.weekStart]);
      const week = weeks.find((entry) => entry.id === tab.id) || null;
      return res.status(200).json({ ok: true, week });
    }

    const pinned = parsePinnedWeeks(req.query?.pin);
    const weeks = await loadWeeks(pinned);
    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      mode: auth.isCustomer && !auth.isPrivileged ? 'customer' : auth.isPrivileged ? 'privileged' : 'staff',
      weeks,
    });
  } catch (err) {
    console.error('[hub/food-inputs] error', err);
    return res.status(500).json({ error: 'Unable to load food inputs' });
  }
}

module.exports = handler;
module.exports._internals = {
  activeWeekTabs,
  defaultWeekTabs,
  weekStartForDate,
  weekTab,
  currentWeekStart,
  parsePinnedWeeks,
  loadWeeks,
  pairTitle,
  sanitizeSheet,
  parseSheet,
  DEFAULT_SHEET,
  MARKDOWN_PLACEHOLDER,
};
