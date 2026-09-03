#!/usr/bin/env node
/**
 * Planner CLI — add and inspect Hub planner cards without hand-writing JSON.
 *
 *   node scripts/planner.cjs list [--from 2026-09-01] [--to 2026-09-30]
 *   node scripts/planner.cjs add --date fri --title "Rad — pizza dinner" [--apply]
 *   node scripts/planner.cjs show <cardId>
 *
 * add flags:
 *   --date      YYYY-MM-DD | today | tomorrow | fri | "sep 25" | 9/25   (required)
 *   --title     card title                                              (required)
 *   --type      event | prep_task            (default: event)
 *   --time      HH:MM  (sets zone=timed)     --end HH:MM
 *   --revenue   dollars (e.g. 1250)          --cash dollars received
 *   --status    financialStatus              --source financialSource
 *   --notes     free text                    --people "Ann,Bo"
 *   --meta      inline JSON merged into financialMetadata
 *   --id        override the derived deterministic id
 *   --apply     actually write (default is a dry run)
 *
 * Writes go to HUB_MASTER_SUPABASE_UID and refuse to touch another planner's cards.
 */
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
}
const has = (flag) => process.argv.includes(flag);

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Resolve a human date to YYYY-MM-DD. Bare weekdays and month/day resolve
 * FORWARD from today, which is what "this friday" means when scheduling.
 */
function parseDate(input, today = new Date()) {
  if (!input) throw new Error('--date is required');
  const raw = String(input).trim().toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (raw === 'today') return iso(base);
  if (raw === 'tomorrow') { base.setDate(base.getDate() + 1); return iso(base); }

  if (/^[a-z]+$/.test(raw) && raw.length >= 3) {
    const dowIndex = DOW.findIndex((d) => d.toLowerCase().startsWith(raw.slice(0, 3)));
    if (dowIndex !== -1) {
      let delta = (dowIndex - base.getDay() + 7) % 7;
      if (delta === 0) delta = 7; // "friday" on a Friday means the next one
      base.setDate(base.getDate() + delta);
      return iso(base);
    }
  }

  const named = raw.match(/^([a-z]{3,9})\.?\s+(\d{1,2})$/);
  if (named) {
    const m = MONTHS.findIndex((x) => named[1].startsWith(x));
    if (m !== -1) {
      const day = Number(named[2]);
      let year = base.getFullYear();
      if (new Date(year, m, day) < base) year += 1;
      return iso(new Date(year, m, day));
    }
  }

  const numeric = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (numeric) {
    const year = numeric[3]
      ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
      : base.getFullYear();
    const candidate = new Date(year, Number(numeric[1]) - 1, Number(numeric[2]));
    if (!numeric[3] && candidate < base) candidate.setFullYear(year + 1);
    return iso(candidate);
  }

  throw new Error(`Could not parse --date "${input}" (use YYYY-MM-DD, a weekday, "sep 25", or 9/25)`);
}

function slug(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const money = (cents) => `$${((cents || 0) / 100).toFixed(0)}`;

async function cmdList() {
  const from = arg('--from', iso(new Date()));
  const to = arg('--to', arg('--from') || '2099-12-31');
  const rows = await prisma.plannerCard.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }],
  });
  console.log(`${rows.length} card(s) ${from} .. ${to}\n`);
  for (const r of rows) {
    console.log(
      `${r.date} ${String(r.dayOfWeek || '').slice(0, 3).padEnd(3)} | ${String(r.objectType || '').padEnd(10)}`
      + ` | ${(r.startTime || '--').padStart(5)} | ${money(r.revenueCents).padStart(6)}`
      + ` | ${(r.financialStatus || '-').padEnd(28)} | ${r.title}`
    );
  }
}

async function cmdShow(id) {
  const card = await prisma.plannerCard.findUnique({ where: { id } });
  if (!card) { console.error(`No card ${id}`); process.exitCode = 1; return; }
  console.log(JSON.stringify(card, null, 2));
}

async function cmdAdd() {
  const supabaseUid = process.env.HUB_MASTER_SUPABASE_UID || process.env.VITE_HUB_MASTER_SUPABASE_UID;
  if (!supabaseUid) throw new Error('HUB_MASTER_SUPABASE_UID is required');

  const title = arg('--title');
  if (!title) throw new Error('--title is required');
  const date = parseDate(arg('--date'));
  const dayOfWeek = DOW[new Date(`${date}T12:00:00`).getDay()];
  const objectType = arg('--type', 'event');
  const startTime = arg('--time') || null;
  const id = arg('--id') || `${objectType === 'event' ? 'event' : 'task'}-${date}-${slug(title)}`;

  const revenueCents = arg('--revenue') ? Math.round(Number(arg('--revenue')) * 100) : 0;
  const cashReceivedCents = arg('--cash') ? Math.round(Number(arg('--cash')) * 100) : 0;
  const financialMetadata = arg('--meta') ? JSON.parse(arg('--meta')) : {};

  const data = {
    supabaseUid,
    title,
    date,
    dayOfWeek,
    zone: startTime ? 'timed' : 'untimed',
    objectType,
    people: arg('--people') ? arg('--people').split(',').map((s) => s.trim()).filter(Boolean) : [],
    startTime,
    endTime: arg('--end') || null,
    revenue: Math.round(revenueCents / 100),
    revenueCents,
    cashReceivedCents,
    financialStatus: arg('--status', startTime ? 'scheduled' : 'scheduled_time_tbd'),
    financialSource: arg('--source') || null,
    financialMetadata,
    notes: arg('--notes') || null,
    sortOrder: Number(arg('--sort', 10)),
    priority: Number(arg('--priority', 2)),
  };

  const existing = await prisma.plannerCard.findUnique({ where: { id } });
  if (existing && existing.supabaseUid !== supabaseUid) {
    throw new Error(`Refusing to overwrite card ${id} owned by another planner`);
  }

  // Same-day cards are usually a capacity signal worth seeing before writing.
  const sameDay = await prisma.plannerCard.findMany({
    where: { date, supabaseUid },
    select: { title: true, objectType: true, startTime: true },
  });

  console.log(JSON.stringify({ mode: has('--apply') ? 'applied' : 'dry-run', id, ...data }, null, 2));
  if (sameDay.length) {
    console.log(`\nAlready on ${date} (${dayOfWeek}):`);
    for (const c of sameDay) console.log(`  - [${c.objectType}] ${c.startTime || '--'} ${c.title}`);
  }
  if (existing) console.log(`\nNOTE: card ${id} exists and will be UPDATED.`);

  if (!has('--apply')) {
    console.log('\nDry run. Re-run with --apply to write.');
    return;
  }

  await prisma.plannerCard.upsert({ where: { id }, update: data, create: { id, ...data } });
  const saved = await prisma.plannerCard.findUnique({
    where: { id },
    select: { id: true, title: true, date: true },
  });
  if (!saved) throw new Error('Post-write verification failed: card not found after upsert');
  console.log(`\nWrote ${saved.id}`);
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'list') return cmdList();
  if (cmd === 'add') return cmdAdd();
  if (cmd === 'show') return cmdShow(process.argv[3]);
  const usage = require('fs').readFileSync(__filename, 'utf8').split('*/')[0].split('\n').slice(2);
  console.log(usage.map((l) => l.replace(/^ \* ?/, '')).join('\n'));
  process.exitCode = 1;
}

// Exported for tests; the CLI only runs when invoked directly.
module.exports = { parseDate, slug, iso, DOW };

if (require.main === module) {
  main()
    .catch((err) => { console.error(`ERROR: ${err.message}`); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
} else {
  prisma.$disconnect();
}
