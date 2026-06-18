#!/usr/bin/env node
/**
 * Brain cleanup — reverses the gmail-extractor pollution documented in
 * docs/brain-data-audit.md §1.2. ARCHIVE-ONLY and DRY-RUN by default: nothing
 * is hard-deleted, every change is reversible (status -> 'archived',
 * tombstonedAt set; assertions only retracted, never deleted).
 *
 * Passes:
 *   1. fragments  — Dish/Ingredient/Menu names that are sentence fragments
 *                   (foodNameValidator.isFoodFragment) -> tombstone entity.
 *   2. self       — Customer/Vendor/Person nodes that are the business's own
 *                   identity (selfIdentity.checkSelfIdentity) -> tombstone.
 *   3. selfloops  — ORDERED / PAYMENT_RECEIVED assertions where src === dst
 *                   (no graph value; the founder's own invoices) -> retract.
 *   4. menusubjects (opt-in: --only=menusubjects) — Menu entities that look like
 *                   gmail subject lines ("Rent is PAST DUE"). LOWER confidence,
 *                   not in the default sweep — review before applying.
 *   5. occasions  (opt-in: --only=occasions) — retract MENTIONED_OCCASION
 *                   assertions whose source text has no keyword matching the
 *                   assigned occasion (audit: flour pickup tagged "Holiday
 *                   Gathering"). Conservative; keeps grounded ones.
 *
 * It deliberately does NOT touch:
 *   - Vendors with zero assertions (local-budget seeds; legit, just unenriched)
 *   - PRICED_AT / GAVE_FEEDBACK self-loops (those are by design)
 *
 * Usage:
 *   node scripts/brain-cleanup.cjs                 # dry run, all passes
 *   node scripts/brain-cleanup.cjs --apply         # actually write
 *   node scripts/brain-cleanup.cjs --only=fragments --apply
 *   node scripts/brain-cleanup.cjs --limit=20      # cap entities per pass (sampling)
 */

require('dotenv').config();

const { getPrisma, ensureDatabaseUrl } = require('../backend/api/utils/prisma');
const { isFoodFragment, looksLikeEmailSubject, FOOD_ENTITY_TYPES } = require('../backend/api/brain/foodNameValidator');
const { checkSelfIdentity } = require('../backend/api/brain/selfIdentity');

function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const onlyArg = argv.find((a) => a.startsWith('--only='));
  const limitArg = argv.find((a) => a.startsWith('--limit='));
  // menusubjects is opt-in (lower confidence) — not in the default sweep.
  const only = onlyArg ? onlyArg.split('=')[1].split(',') : ['fragments', 'self', 'selfloops'];
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
  return { apply, only, limit };
}

function preview(rows, n = 12) {
  for (const r of rows.slice(0, n)) console.log('   - ' + r);
  if (rows.length > n) console.log(`   … and ${rows.length - n} more`);
}

async function passFragments(prisma, { apply, limit }) {
  const candidates = await prisma.brainEntity.findMany({
    where: { entityType: { in: [...FOOD_ENTITY_TYPES] }, tombstonedAt: null },
    select: { id: true, name: true, entityType: true },
  });
  let hits = candidates.filter((e) => isFoodFragment(e.name, e.entityType));
  if (limit) hits = hits.slice(0, limit);

  console.log(`\n[fragments] ${hits.length} fragment food entities`);
  preview(hits.map((e) => `${e.entityType}: ${JSON.stringify(e.name).slice(0, 80)}`));

  if (apply && hits.length) {
    const { count } = await prisma.brainEntity.updateMany({
      where: { id: { in: hits.map((e) => e.id) } },
      data: { tombstonedAt: new Date(), status: 'archived', tombstoneReason: 'cleanup:food_fragment' },
    });
    console.log(`[fragments] archived ${count}`);
  }
  return hits.length;
}

async function passSelf(prisma, { apply, limit }) {
  const roleEntities = await prisma.brainEntity.findMany({
    where: { entityType: { in: ['Customer', 'Vendor', 'Supplier', 'Person'] }, tombstonedAt: null },
    select: { id: true, name: true, entityType: true },
  });
  let hits = roleEntities
    .map((e) => ({ ...e, check: checkSelfIdentity(e.entityType, e.name) }))
    .filter((e) => e.check.blocked);
  if (limit) hits = hits.slice(0, limit);

  console.log(`\n[self] ${hits.length} own-business identity nodes`);
  preview(hits.map((e) => `${e.entityType}: ${e.name}  (${e.check.reason})`));

  if (apply && hits.length) {
    const { count } = await prisma.brainEntity.updateMany({
      where: { id: { in: hits.map((e) => e.id) } },
      data: { tombstonedAt: new Date(), status: 'archived', tombstoneReason: 'cleanup:self_identity' },
    });
    console.log(`[self] archived ${count}`);
  }
  return hits.length;
}

async function passSelfLoops(prisma, { apply, limit }) {
  // ORDERED / PAYMENT_RECEIVED self-loops carry no graph value (audit §1.2).
  // PRICED_AT and GAVE_FEEDBACK self-loops are by design — excluded here.
  const where = {
    srcId: { equals: prisma.brainAssertion.fields.dstId },
    relType: { in: ['ORDERED', 'PAYMENT_RECEIVED'] },
    retractedAt: null,
  };
  let loops = await prisma.brainAssertion.findMany({
    where,
    select: { id: true, relType: true, src: { select: { name: true, entityType: true } } },
    ...(limit ? { take: limit } : {}),
  });

  console.log(`\n[selfloops] ${loops.length} ORDERED/PAYMENT_RECEIVED self-loops`);
  preview(loops.map((a) => `${a.relType}: ${a.src?.entityType}:${a.src?.name} -> itself`));

  if (apply && loops.length) {
    const { count } = await prisma.brainAssertion.updateMany({
      where: { id: { in: loops.map((a) => a.id) } },
      data: { retractedAt: new Date(), retractedBy: 'script:cleanup', retractedReason: 'self_loop_no_value' },
    });
    console.log(`[selfloops] retracted ${count}`);
  }
  return loops.length;
}

// Occasion keyword → canonical Occasion entity name. Used to validate that a
// MENTIONED_OCCASION assertion is actually grounded in the source text.
const OCCASION_KEYWORDS = {
  wedding: 'Wedding Reception', reception: 'Wedding Reception',
  birthday: 'Birthday Dinner',
  anniversary: 'Anniversary Celebration',
  holiday: 'Holiday Gathering', christmas: 'Holiday Gathering', thanksgiving: 'Holiday Gathering',
  hanukkah: 'Holiday Gathering', 'new year': 'Holiday Gathering',
  corporate: 'Corporate Team Lunch', office: 'Corporate Team Lunch', company: 'Corporate Team Lunch',
  graduation: 'Graduation', retirement: 'Retirement Party', shower: 'Shower', bachelorette: 'Bachelorette',
};

async function passOccasions(prisma, { apply, limit }) {
  // Retract MENTIONED_OCCASION assertions whose source text contains NO keyword
  // matching the assigned occasion (audit §1.2: a flour pickup tagged "Holiday
  // Gathering"). Conservative: only retracts when source text exists AND lacks
  // any supporting keyword — keeps the 66/79 that are grounded.
  const rows = await prisma.brainAssertion.findMany({
    where: { relType: 'MENTIONED_OCCASION', retractedAt: null },
    include: { dst: { select: { name: true } }, src: { select: { name: true } }, ledgerEvent: { select: { payload: true } } },
  });
  let hits = [];
  for (const x of rows) {
    const pl = x.ledgerEvent?.payload || {};
    const t = `${pl.sentBodyPreview || ''} ${pl.snippet || ''} ${pl.subject || ''}`.toLowerCase();
    if (!t.trim()) continue; // no source text → can't judge, leave it
    const occ = x.dst?.name;
    const supported = Object.entries(OCCASION_KEYWORDS).some(([kw, o]) => o === occ && t.includes(kw));
    if (!supported) hits.push({ id: x.id, occ, src: x.src?.name, span: t.slice(0, 70) });
  }
  if (limit) hits = hits.slice(0, limit);

  console.log(`\n[occasions] ${hits.length} MENTIONED_OCCASION with no supporting keyword in source`);
  preview(hits.map((h) => `[${h.occ}] <- ${h.src}: ${h.span}`));

  if (apply && hits.length) {
    const { count } = await prisma.brainAssertion.updateMany({
      where: { id: { in: hits.map((h) => h.id) } },
      data: { retractedAt: new Date(), retractedBy: 'script:cleanup', retractedReason: 'occasion_not_grounded_in_source' },
    });
    console.log(`[occasions] retracted ${count}`);
  }
  return hits.length;
}

async function passMenuSubjects(prisma, { apply, limit }) {
  const menus = await prisma.brainEntity.findMany({
    where: { entityType: 'Menu', tombstonedAt: null },
    select: { id: true, name: true },
  });
  // Exclude ones already covered by the fragment pass; flag email-subject smell.
  let hits = menus.filter((e) => !isFoodFragment(e.name, 'Menu') && looksLikeEmailSubject(e.name));
  if (limit) hits = hits.slice(0, limit);

  console.log(`\n[menusubjects] ${hits.length} Menu entities that look like email subjects (LOWER confidence — review!)`);
  preview(hits.map((e) => e.name));

  if (apply && hits.length) {
    const { count } = await prisma.brainEntity.updateMany({
      where: { id: { in: hits.map((e) => e.id) } },
      data: { tombstonedAt: new Date(), status: 'archived', tombstoneReason: 'cleanup:email_subject_menu' },
    });
    console.log(`[menusubjects] archived ${count}`);
  }
  return hits.length;
}

async function main() {
  ensureDatabaseUrl();
  const { apply, only, limit } = parseArgs(process.argv.slice(2));
  const prisma = getPrisma();

  console.log(`Brain cleanup — ${apply ? 'APPLY (writing)' : 'DRY RUN (no writes)'}`);
  console.log(`Passes: ${only.join(', ')}${limit ? `  (limit ${limit}/pass)` : ''}`);

  const totals = {};
  if (only.includes('fragments')) totals.fragments = await passFragments(prisma, { apply, limit });
  if (only.includes('self')) totals.self = await passSelf(prisma, { apply, limit });
  if (only.includes('selfloops')) totals.selfloops = await passSelfLoops(prisma, { apply, limit });
  if (only.includes('menusubjects')) totals.menusubjects = await passMenuSubjects(prisma, { apply, limit });
  if (only.includes('occasions')) totals.occasions = await passOccasions(prisma, { apply, limit });

  console.log('\n──────────────');
  console.log('Summary:', JSON.stringify(totals));
  if (!apply) console.log('Dry run only. Re-run with --apply to write. All changes are reversible (archive/retract).');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('brain-cleanup failed:', err);
  process.exit(1);
});
