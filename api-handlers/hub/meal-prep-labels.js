/**
 * Hub meal-prep labels — turn one week's prep breakdown into Brother QL-series
 * labels, in-repo. One *package* gets one label — so a row of qty 3 expands into
 * 3 identical labels (each physical container needs its own sticker).
 *
 * Each label carries: customer · dish (canonical) · meal · diet · day. That's the
 * bag/packout sticker the kitchen sticks on a container.
 *
 * Source: the same per-week line items the rollup reads (via meal-prep-rollup's
 * buildLineItems) — a saved prep-breakdown (per-customer) when present, else the
 * flat menu.
 *
 * Output shapes, selected by `?format=`:
 *   - csv (default): one row per physical label, for Brother P-touch Editor
 *     mail-merge (import as a database onto a DK-1209 template). Header row +
 *     data rows: customer,dish,meal,diet,day,copy,of,week
 *   - structured: JSON label objects → render in-repo (preview/print)
 *   - text: legacy block format (lines per label, blank line between)
 *   - dk: a render-ready spec per label sized for DK-1209 die-cut address labels
 *     (29mm × 62mm), consumable by an in-repo renderer
 *
 * Staff-only.
 *
 *   GET /api/hub/meal-prep-labels?weekStart=YYYY-MM-DD&format=csv|structured|text|dk
 */

const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, cleanString } = require('./_http');
// Reuse the rollup's line-item construction so labels and the rollup never drift.
const rollup = require('./meal-prep-rollup');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const NOTE_SOURCE = 'drafts';

// Brother DK-1209 small die-cut address labels: 29mm tall × 62mm wide, fixed
// size (not continuous), 800 per roll. Printed on a QL-series printer. We render
// landscape: 62mm wide × 29mm tall, a compact 3-line stub.
const DK_LABEL = { media: 'DK-1209', widthMm: 62, heightMm: 29 };

function addDaysIso(iso, days) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekStartForDate(dateIso) {
  const day = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(day.getTime())) return null;
  return addDaysIso(dateIso, -day.getDay());
}

function menuSourceId(weekStart) {
  return `weekly-meal-prep:week-${weekStart}`;
}

// Load the week's menu notepad body (Weekly Meal Prep tab) — same source the
// rollup reads. NOT the Food Inputs sheet (that's per-customer notes).
async function loadMenuBody(weekStart) {
  const doc = await prisma.hubDocument.findUnique({
    where: { source_sourceId: { source: NOTE_SOURCE, sourceId: menuSourceId(weekStart) } },
  });
  return doc?.body || '';
}

// Expand resolved line items (qty N) into N individual labels.
function buildLabels(items, weekStart) {
  const labels = [];
  for (const item of items) {
    const base = {
      customer: item.client,
      dish: item.canonicalName,
      meal: item.meal,
      diet: item.diet || '',
      day: item.day && item.day !== 'Unassigned' ? item.day : '',
      dishEntityId: item.dishEntityId || null,
      weekStart,
    };
    const n = Math.max(1, item.qty || 1);
    for (let i = 0; i < n; i++) {
      labels.push({ ...base, copy: i + 1, of: n });
    }
  }
  // Stable kitchen-friendly order: by customer, then meal, then dish.
  return labels.sort((a, b) =>
    a.customer.localeCompare(b.customer) || a.meal.localeCompare(b.meal) || a.dish.localeCompare(b.dish));
}

// Human label lines for a single sticker.
function labelLines(label) {
  const line1 = label.customer;
  const meal = label.meal && label.meal !== 'other' ? label.meal : '';
  const line2 = [label.dish, meal ? `(${meal})` : ''].filter(Boolean).join(' ');
  const metaParts = [];
  if (label.diet) metaParts.push(label.diet);
  if (label.day) metaParts.push(label.day);
  if (label.of > 1) metaParts.push(`${label.copy}/${label.of}`);
  const line3 = metaParts.join(' · ');
  return [line1, line2, line3].filter(Boolean);
}

// Legacy block format: lines per label, blank line between.
function buildStickerText(labels) {
  return labels.map((l) => labelLines(l).join('\n')).join('\n\n');
}

// CSV for Brother P-touch Editor mail-merge. One row per PHYSICAL label so a
// qty-3 row already became 3 rows upstream. Import this as a database in P-touch
// and drop the fields onto a DK-1209 template. RFC-4180 quoting.
const CSV_COLUMNS = ['customer', 'dish', 'meal', 'diet', 'day', 'copy', 'of', 'week'];
function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function buildCsv(labels) {
  const rows = [CSV_COLUMNS.join(',')];
  for (const l of labels) {
    rows.push([
      l.customer,
      l.dish,
      l.meal && l.meal !== 'other' ? l.meal : '',
      l.diet || '',
      l.day || '',
      l.copy,
      l.of,
      l.weekStart,
    ].map(csvCell).join(','));
  }
  // CRLF line endings: Excel/P-touch on Windows are happiest with these.
  return rows.join('\r\n');
}

// Render-ready DK-1209 spec: one entry per physical label (62mm × 29mm die-cut).
function buildDkSpec(labels) {
  return {
    printer: 'Brother QL series',
    media: DK_LABEL.media,
    widthMm: DK_LABEL.widthMm,
    heightMm: DK_LABEL.heightMm,
    count: labels.length,
    labels: labels.map((l) => ({
      widthMm: DK_LABEL.widthMm,
      heightMm: DK_LABEL.heightMm,
      lines: labelLines(l),
      meta: { customer: l.customer, dish: l.dish, meal: l.meal, diet: l.diet, day: l.day, copy: l.copy, of: l.of },
    })),
  };
}

async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { allowedAccess: ['staff', 'privileged'] });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const weekParam = cleanString(req.query?.weekStart, 10);
  const weekStart = weekParam
    ? weekStartForDate(weekParam)
    : weekStartForDate(new Date().toISOString().slice(0, 10));
  if (!weekStart) return res.status(400).json({ error: 'Invalid weekStart (expected YYYY-MM-DD)' });

  const format = (cleanString(req.query?.format, 16) || 'csv').toLowerCase();

  try {
    const body = await loadMenuBody(weekStart);
    // buildLineItems is exported on the rollup's _internals and resolves dishes.
    // Pass weekStart so it prefers the saved per-customer prep-breakdown.
    const items = await rollup._internals.buildLineItems({ weekStart, body });
    const labels = buildLabels(items, weekStart);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="meal-prep-labels-${weekStart}.csv"`);
      return res.status(200).send(buildCsv(labels));
    }
    if (format === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(buildStickerText(labels));
    }
    if (format === 'dk') {
      return res.status(200).json({ ok: true, weekStart, ...buildDkSpec(labels) });
    }
    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      weekStart,
      count: labels.length,
      labels,
    });
  } catch (err) {
    console.error('[hub/meal-prep-labels] error', err);
    return res.status(500).json({ error: 'Unable to build meal prep labels' });
  }
}

module.exports = handler;
module.exports._internals = { buildLabels, labelLines, buildStickerText, buildCsv, buildDkSpec, weekStartForDate, CSV_COLUMNS };
