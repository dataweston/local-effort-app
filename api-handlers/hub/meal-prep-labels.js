/**
 * Hub meal-prep labels — turn one week's prep breakdown into Brother QL800 / DK
 * labels, in-repo, so there's no copy-paste into an external Python script.
 *
 * Source: the same per-week prep rows the rollup reads (via meal-prep-rollup's
 * line-item builder). One *package* gets one label — so a row of qty 3 expands
 * into 3 identical labels (each physical container needs its own sticker).
 *
 * Each label carries: customer · dish (canonical) · meal · diet · day. That's
 * the bag/packout sticker the kitchen sticks on a container.
 *
 * Three output shapes from one source, selected by `?format=`:
 *   - structured (default): JSON label objects → render in-repo (PDF/preview/print)
 *   - text: the legacy `input.txt` block format that make_stickers.py consumes,
 *     so the existing QL800 DK pipeline still works unchanged if you want it
 *   - dk: a render-ready spec per label sized for the DK tape (mm + lines),
 *     consumable by an in-repo QL800 renderer
 *
 * Staff-only.
 *
 *   GET /api/hub/meal-prep-labels?weekStart=YYYY-MM-DD&format=structured|text|dk
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

// Brother QL800 with DK-22205 continuous 62mm tape: usable print width ~59mm.
// Length is variable on continuous tape; we target a compact 3-4 line stub.
const DK_LABEL = { tapeWidthMm: 62, printWidthMm: 59, defaultLengthMm: 40 };

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

// Legacy make_stickers.py block format: lines per label, blank line between.
function buildStickerText(labels) {
  return labels.map((l) => labelLines(l).join('\n')).join('\n\n');
}

// Render-ready DK spec: one entry per physical label.
function buildDkSpec(labels) {
  return {
    printer: 'Brother QL800',
    media: 'DK-22205',
    tapeWidthMm: DK_LABEL.tapeWidthMm,
    printWidthMm: DK_LABEL.printWidthMm,
    count: labels.length,
    labels: labels.map((l) => ({
      lengthMm: DK_LABEL.defaultLengthMm,
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

  const format = (cleanString(req.query?.format, 16) || 'structured').toLowerCase();

  try {
    const body = await loadMenuBody(weekStart);
    // buildLineItems is exported on the rollup's _internals and resolves dishes.
    const items = await rollup._internals.buildLineItems({ body });
    const labels = buildLabels(items, weekStart);

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
module.exports._internals = { buildLabels, labelLines, buildStickerText, buildDkSpec, weekStartForDate };
