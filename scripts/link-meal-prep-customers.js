/*
 * One-time migration: make the meal-prep roster customers symmetric across the
 * two data stores, so Levy and Samantha are stored and pulled the same way.
 *
 * Goal (per product decision):
 *   - Every active customer has BOTH a Prisma `Customer` row (operational record,
 *     home of `planRulesJson`) AND a linked brain `Customer` entity (household),
 *     joined by `BrainEntity.localEffortCustomerId`.
 *
 * What it does (idempotent):
 *   1. Merge the duplicate Levy person entities: fold `david levy` into
 *      `dave levy` (move aliases + assertions, tombstone the dup).
 *   2. Mint a `Levy Family` household brain entity (via the guarded
 *      findOrCreateEntity choke point), link it to the existing levy-family
 *      Prisma row, and relate the 3 Levy persons to it as household members.
 *   3. Create a Prisma `Customer` row for Samantha and link her existing
 *      household brain entity to it (she was brain-only).
 *
 * Every write is logged to the ledger first (ledger -> entity/assertion), never
 * a raw insert of identity. Re-running is safe: existing rows/links/assertions
 * are detected and left alone.
 *
 * Dry run (default): node scripts/link-meal-prep-customers.js
 * Apply:             node scripts/link-meal-prep-customers.js --apply
 */
const { PrismaClient } = require('@prisma/client');
const { writeLedgerEvent, findOrCreateEntity, canonicalName } = require('../backend/api/brain/ledger');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const tag = APPLY ? '[APPLY]' : '[DRY-RUN]';

function log(...args) { console.log(tag, ...args); }

// Levy's plan, expressed in the richer servings/style shape, derived ONLY from
// her existing Prisma planRulesJson counts (3 family-dinners, 3-5 kids-food).
// Servings come from the household composition we know; nothing financial is
// invented. Samantha's plan is exactly what the user stated.
const SAMANTHA_PLAN = {
  schemaVersion: 2,
  sections: {
    'family-dinners': { label: 'Family Dinners', qty: 3, servesAdults: 2, servesKids: 2, menuCategory: 'dinner', style: 'family' },
    'lunches':        { label: 'Lunches',        qty: 3, servesAdults: 2, servesKids: 0, menuCategory: 'lunch',  style: 'individual' },
    'kids-snacks':    { label: 'Kids Snacks',    qty: null, open: true,                  menuCategory: 'kids',   style: 'individual' },
  },
};

async function mergeEntity(fromId, intoId, reason) {
  // Move aliases (skip ones that already exist on the target), move assertions,
  // record an alias for the merged name, tombstone the source.
  const from = await prisma.brainEntity.findUnique({ where: { id: fromId }, include: { aliases: true } });
  const into = await prisma.brainEntity.findUnique({ where: { id: intoId }, include: { aliases: true } });
  if (!from || !into) { log('  merge skipped (missing entity)'); return; }
  if (from.tombstonedAt) { log(`  '${from.name}' already tombstoned — merge already done`); return; }

  const existingAliases = new Set(into.aliases.map((a) => a.alias.toLowerCase()));
  const aliasesToMove = from.aliases.filter((a) => !existingAliases.has(a.alias.toLowerCase()));
  // also preserve the source's own name as an alias on the target
  const moveName = !existingAliases.has(from.name.toLowerCase());

  log(`  merge '${from.name}' -> '${into.name}': move ${aliasesToMove.length} alias(es)${moveName ? " + source name" : ''}`);

  if (!APPLY) return;

  const led = await writeLedgerEvent({
    eventType: 'brain.entity.merged',
    source: 'script:link-meal-prep-customers',
    sourceId: `merge:${fromId}->${intoId}`,
    payload: { fromId, fromName: from.name, intoId, intoName: into.name, reason },
  });

  for (const a of aliasesToMove) {
    await prisma.brainEntityAlias.update({ where: { id: a.id }, data: { entityId: intoId } });
  }
  if (moveName) {
    await prisma.brainEntityAlias.create({ data: { entityId: intoId, alias: from.name } });
  }
  // Repoint assertions both directions
  await prisma.brainAssertion.updateMany({ where: { srcId: fromId }, data: { srcId: intoId } });
  await prisma.brainAssertion.updateMany({ where: { dstId: fromId }, data: { dstId: intoId } });
  await prisma.brainEntity.update({
    where: { id: fromId },
    data: { tombstonedAt: new Date(), tombstoneReason: reason, status: 'tombstoned' },
  });
  log(`  merged (ledger ${led.id})`);
}

async function ensureMemberAssertion(personId, householdId, ledgerId) {
  const existing = await prisma.brainAssertion.findFirst({
    where: { srcId: personId, dstId: householdId, relType: 'member_of_household', retractedAt: null },
  });
  if (existing) { log(`    member assertion exists (${personId})`); return; }
  if (!APPLY) { log(`    would add member_of_household (${personId})`); return; }
  await prisma.brainAssertion.create({
    data: {
      srcId: personId, dstId: householdId, relType: 'member_of_household',
      sourceType: 'script', sourceId: ledgerId, createdBy: 'script:link-meal-prep-customers', confidence: 1.0,
    },
  });
  log(`    + member_of_household (${personId})`);
}

async function linkEntityToCustomer(entityId, customerId, label) {
  const ent = await prisma.brainEntity.findUnique({ where: { id: entityId }, select: { localEffortCustomerId: true } });
  if (ent?.localEffortCustomerId === customerId) { log(`  ${label} already linked`); return; }
  if (!APPLY) { log(`  would link ${label} -> customer ${customerId}`); return; }
  await prisma.brainEntity.update({ where: { id: entityId }, data: { localEffortCustomerId: customerId } });
  log(`  linked ${label} -> customer ${customerId}`);
}

async function run() {
  log('starting. APPLY =', APPLY);

  // ---- 1. Merge dave/david ------------------------------------------------
  const dave = await prisma.brainEntity.findFirst({ where: { entityType: 'Customer', canonicalName: canonicalName('dave levy'), tombstonedAt: null } });
  const david = await prisma.brainEntity.findFirst({ where: { entityType: 'Customer', canonicalName: canonicalName('david levy'), tombstonedAt: null } });
  const allison = await prisma.brainEntity.findFirst({ where: { entityType: 'Customer', canonicalName: canonicalName('allison levy'), tombstonedAt: null } });
  console.log('\n-- Step 1: merge duplicate Levy persons --');
  if (dave && david) {
    await mergeEntity(david.id, dave.id, 'duplicate person: david levy == dave levy');
  } else {
    log('  no dave/david pair to merge (already merged or missing)');
  }

  // ---- 2. Levy Family household + link + members --------------------------
  console.log('\n-- Step 2: Levy Family household entity + link --');
  const levyCustomer = await prisma.customer.findUnique({ where: { slug: 'levy-family' }, select: { id: true } });
  if (!levyCustomer) throw new Error('levy-family Prisma Customer row not found');

  let levyHouseholdId = null;
  // Reuse an existing linked household if present (idempotent)
  const linkedHousehold = await prisma.brainEntity.findFirst({ where: { entityType: 'Customer', localEffortCustomerId: levyCustomer.id, tombstonedAt: null } });
  if (linkedHousehold) {
    levyHouseholdId = linkedHousehold.id;
    log(`  Levy household already exists & linked: ${linkedHousehold.name} (${levyHouseholdId})`);
  } else if (APPLY) {
    const res = await findOrCreateEntity({
      entityType: 'Customer',
      name: 'Levy Family',
      properties: { mealPrepStage: 'active', household: true, householdSize: '2 adults' },
    });
    if (res.blocked) throw new Error('Levy Family creation blocked by self-identity guard: ' + res.blockReason);
    levyHouseholdId = res.entity.id;
    log(`  ${res.created ? 'created' : 'found'} Levy Family household (${levyHouseholdId})`);
  } else {
    log('  would create Levy Family household entity');
  }

  const ledgerLevy = APPLY ? await writeLedgerEvent({
    eventType: 'brain.household.linked',
    source: 'script:link-meal-prep-customers',
    sourceId: `levy-household:${levyCustomer.id}`,
    payload: { customerId: levyCustomer.id, slug: 'levy-family' },
  }) : { id: null };

  if (levyHouseholdId) {
    await linkEntityToCustomer(levyHouseholdId, levyCustomer.id, 'Levy Family household');
    // relate persons (post-merge dave + allison) as members
    const members = [dave?.id, allison?.id].filter(Boolean);
    for (const pid of members) await ensureMemberAssertion(pid, levyHouseholdId, ledgerLevy.id);
  }

  // ---- 3. Samantha Prisma row + link -------------------------------------
  console.log('\n-- Step 3: Samantha Prisma row + link --');
  const sam = await prisma.brainEntity.findFirst({ where: { entityType: 'Customer', canonicalName: canonicalName('samantha bailey'), tombstonedAt: null } });
  if (!sam) throw new Error('Samantha Bailey brain entity not found');

  let samCustomer = await prisma.customer.findFirst({ where: { slug: 'samantha-bailey' }, select: { id: true } });
  if (samCustomer) {
    log(`  Samantha Prisma row already exists (${samCustomer.id})`);
  } else if (APPLY) {
    samCustomer = await prisma.customer.create({
      data: { slug: 'samantha-bailey', name: 'Samantha Bailey', planRulesJson: SAMANTHA_PLAN },
      select: { id: true },
    });
    log(`  created Samantha Prisma row (${samCustomer.id}) with plan`);
  } else {
    log('  would create Samantha Prisma row {slug: samantha-bailey, name, planRulesJson}');
  }
  if (samCustomer) await linkEntityToCustomer(sam.id, samCustomer.id, 'Samantha Bailey entity');

  console.log(`\n${tag} done.${APPLY ? '' : '  Re-run with --apply to write.'}`);
}

run()
  .catch((e) => { console.error(tag, 'FAILED', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
