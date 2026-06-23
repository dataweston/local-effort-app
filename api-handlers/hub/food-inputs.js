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
const FUTURE_WEEK_COUNT = 3;

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

// Same rolling Sunday/Monday week pairs as Weekly Meal Prep so the tabs line up
// with the kitchen's prep rhythm. A week's tab stays through its Monday and
// falls off on Tuesday; there are always FUTURE_WEEK_COUNT tabs.
function activeWeekTabs() {
  const today = localToday();
  const dayOfWeek = new Date(`${today}T00:00:00`).getDay(); // 0 = Sunday
  let sunday = addDaysIso(today, -dayOfWeek);
  if (today > addDaysIso(sunday, 1)) sunday = addDaysIso(sunday, 7);
  const tabs = [];
  for (let i = 0; i < FUTURE_WEEK_COUNT; i += 1) {
    tabs.push({ id: `week-${sunday}`, title: pairTitle(sunday), weekStart: sunday });
    sunday = addDaysIso(sunday, 7);
  }
  return tabs;
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

async function loadWeeks() {
  const tabs = activeWeekTabs();
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
      const tabs = activeWeekTabs();
      const tabId = cleanString(req.body?.tabId, 40) || tabs[0].id;
      const tab = tabs.find((entry) => entry.id === tabId);
      if (!tab) return res.status(400).json({ error: 'Unknown week tab' });
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

      const weeks = await loadWeeks();
      const week = weeks.find((entry) => entry.id === tab.id) || null;
      return res.status(200).json({ ok: true, week });
    }

    const weeks = await loadWeeks();
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
module.exports._internals = { activeWeekTabs, loadWeeks, pairTitle, sanitizeSheet, parseSheet, DEFAULT_SHEET, MARKDOWN_PLACEHOLDER };
