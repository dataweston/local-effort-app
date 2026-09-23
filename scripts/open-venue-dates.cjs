#!/usr/bin/env node
/**
 * Open a run of nights for booking at one of the venues.
 *
 * The venue pages are fail-closed: /api/venues/:slug/availability only reports
 * a night as `open` when a SmallEventAvailability row says so, and
 * POST /:slug/book refuses to take a deposit against anything else. That is
 * deliberate — an empty calendar must never read as "every night is free" —
 * but it also means a freshly deployed venue page cannot sell a single date
 * until somebody opens some. This is that somebody.
 *
 *   node scripts/open-venue-dates.cjs --venue=firehouse --from=2026-10-01 --to=2026-12-31
 *   node scripts/open-venue-dates.cjs --venue=firehouse --from=... --to=... --dry
 *
 * Idempotent: rows are upserted on the (date, type, venue) unique key, so
 * re-running is safe. It will re-open a date an admin had CLOSED, though, so
 * prefer a narrow range over blanket re-runs. Existing holds and imported
 * feed blocks are untouched and still outrank an open row when the calendar is
 * assembled (see loadVenueCalendar in backend/api/routes/venues.js).
 */

const path = require('path');
const fs = require('fs');

// Load DATABASE_URL the way the rest of the repo's scripts do, without adding
// a dotenv dependency for one variable.
for (const file of ['.env.local', '.env']) {
  const full = path.join(__dirname, '..', file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (value && !process.env[match[1]]) process.env[match[1]] = value;
  }
}

const venues = require('../src/config/venues.json');

const arg = (name, fallback = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const eachDay = (from, to) => {
  const out = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

async function main() {
  const slug = arg('venue');
  const from = arg('from');
  const to = arg('to');
  // The availability table is keyed on (date, type, venue). The venue pages no
  // longer ask what kind of party it is — the booking panel asks how it is
  // served instead — so a single row per night is enough, and `dinner` is the
  // type the existing admin tooling already understands.
  const type = arg('type', 'dinner');
  const dry = flag('dry');

  if (!slug || !ISO.test(from || '') || !ISO.test(to || '')) {
    console.error('usage: --venue=<slug> --from=YYYY-MM-DD --to=YYYY-MM-DD [--type=dinner] [--dry]');
    process.exit(2);
  }
  if (!venues.venues.some((v) => v.slug === slug)) {
    console.error(`unknown venue "${slug}". Known: ${venues.venues.map((v) => v.slug).join(', ')}`);
    process.exit(2);
  }
  if (to < from) {
    console.error('--to is before --from');
    process.exit(2);
  }

  const days = eachDay(from, to);
  console.log(`${slug}: ${days.length} nights, ${from} → ${to} (type=${type})`);

  if (dry) {
    console.log('dry run — nothing written.');
    console.log(`first: ${days[0]}   last: ${days[days.length - 1]}`);
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set; nothing written.');
    process.exit(1);
  }

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  let opened = 0;
  let already = 0;
  try {
    for (const date of days) {
      const existing = await prisma.smallEventAvailability.findUnique({
        where: { date_type_venue: { date, type, venue: slug } },
      });
      if (existing?.status === 'open') {
        already += 1;
        continue;
      }
      await prisma.smallEventAvailability.upsert({
        where: { date_type_venue: { date, type, venue: slug } },
        update: { status: 'open', source: 'bulk-open' },
        create: { date, type, venue: slug, status: 'open', source: 'bulk-open' },
      });
      opened += 1;
    }
    console.log(`opened ${opened}, already open ${already}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
