/*
 * One-time reconciliation: connect every meal-prep customer's Square
 * transactions to a single clean brain entity, and merge duplicates.
 *
 * Transactions link to a customer when the customer's brain entity carries the
 * Square customerId that the `order.placed` ledger event's actorId holds —
 * either as `squareCustomerId`, `properties.squareCustomerId`, OR an ALIAS equal
 * to the id (see inferenceEngine.js resolution). We use aliases for *secondary*
 * Square ids so an entity can own orders from more than one Square record.
 *
 * Actions (idempotent):
 *   LEVY  — copy Dave Levy's Square id (NS50…) onto the Levy Family household so
 *           the household (the roster + Prisma-linked entity) owns the 8 orders,
 *           and assert Dave --pays_for--> Levy Family.
 *   TYLER — merge 'Tyler' (ZYXH…) into 'Tyler Cooper' (468V…); keep 468V… as the
 *           scalar id and add ZYXH… as an alias so BOTH ids' orders resolve.
 *   KARA  — merge 'karamellingson@gmail.com' (no id) into 'Kara Ellingson'.
 *
 * Every identity write goes through a ledger event first. Re-running is safe.
 *
 * Dry run (default): node scripts/reconcile-meal-prep-customers.js
 * Apply:             node scripts/reconcile-meal-prep-customers.js --apply
 */
const { PrismaClient } = require('@prisma/client');
const { writeLedgerEvent, canonicalName } = require('../backend/api/brain/ledger');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const tag = APPLY ? '[APPLY]' : '[DRY-RUN]';
const log = (...a) => console.log(tag, ...a);

async function findCustomer(name) {
  return prisma.brainEntity.findFirst({
    where: { entityType: 'Customer', canonicalName: canonicalName(name), tombstonedAt: null },
    include: { aliases: true },
  });
}

const ALIAS_SOURCE = 'script:reconcile-meal-prep-customers';

// Merge `from` into `into`: move aliases (+ source name + source square id as
// aliases), repoint assertions, tombstone source.
async function mergeEntity(from, into, reason) {
  if (!from || !into) { log('  merge skipped (missing entity)'); return; }
  if (from.tombstonedAt) { log(`  '${from.name}' already tombstoned`); return; }
  log(`  merge '${from.name}' -> '${into.name}'`);
  if (!APPLY) {
    if (from.squareCustomerId && from.squareCustomerId !== into.squareCustomerId) log(`    would add square id alias '${from.squareCustomerId}'`);
    log(`    would move ${from.aliases.length} alias(es) + name, repoint assertions, tombstone`);
    return;
  }
  const led = await writeLedgerEvent({
    eventType: 'brain.entity.merged',
    source: 'script:reconcile-meal-prep-customers',
    sourceId: `merge:${from.id}->${into.id}`,
    payload: { fromId: from.id, fromName: from.name, intoId: into.id, intoName: into.name, reason },
  });
  const have = new Set(into.aliases.map((a) => a.alias.toLowerCase()));
  const addAlias = async (val) => {
    if (!val || have.has(val.toLowerCase())) return;
    await prisma.brainEntityAlias.create({ data: { entityId: into.id, alias: val, source: ALIAS_SOURCE } });
    have.add(val.toLowerCase());
    log(`    + alias '${val}'`);
  };
  for (const a of from.aliases) await addAlias(a.alias);
  await addAlias(from.name);
  // Preserve the source's Square id as an alias so its orders still resolve.
  if (from.squareCustomerId) await addAlias(from.squareCustomerId);
  await prisma.brainAssertion.updateMany({ where: { srcId: from.id }, data: { srcId: into.id } });
  await prisma.brainAssertion.updateMany({ where: { dstId: from.id }, data: { dstId: into.id } });
  await prisma.brainEntity.update({ where: { id: from.id }, data: { tombstonedAt: new Date(), tombstoneReason: reason, status: 'tombstoned' } });
  log(`    merged (ledger ${led.id})`);
}

async function ensureAssertion(srcId, dstId, relType, ledgerId) {
  const existing = await prisma.brainAssertion.findFirst({ where: { srcId, dstId, relType, retractedAt: null } });
  if (existing) { log(`    assertion ${relType} exists`); return; }
  if (!APPLY) { log(`    would assert ${relType}`); return; }
  await prisma.brainAssertion.create({
    data: { srcId, dstId, relType, sourceType: 'script', sourceId: ledgerId, createdBy: 'script:reconcile-meal-prep-customers', confidence: 1.0 },
  });
  log(`    + ${relType}`);
}

async function run() {
  log('starting. APPLY =', APPLY);

  // ---- LEVY ---------------------------------------------------------------
  console.log('\n-- LEVY: connect household to Dave\'s Square id --');
  const dave = await findCustomer('dave levy');
  const household = await prisma.brainEntity.findFirst({ where: { entityType: 'Customer', canonicalName: canonicalName('levy family'), tombstonedAt: null }, include: { aliases: true } });
  if (!dave) log('  Dave Levy not found');
  if (!household) log('  Levy Family household not found');
  if (dave && household) {
    log(`  Dave square id: ${dave.squareCustomerId}; household square id: ${household.squareCustomerId || '(none)'}`);
    if (dave.squareCustomerId && household.squareCustomerId !== dave.squareCustomerId) {
      if (APPLY) { await prisma.brainEntity.update({ where: { id: household.id }, data: { squareCustomerId: dave.squareCustomerId } }); log(`    set household.squareCustomerId = ${dave.squareCustomerId}`); }
      else log(`    would set household.squareCustomerId = ${dave.squareCustomerId}`);
    } else log('    household already carries the square id');
    const led = APPLY ? await writeLedgerEvent({ eventType: 'brain.household.billing_linked', source: 'script:reconcile-meal-prep-customers', sourceId: `levy-billing:${household.id}`, payload: { household: household.id, payer: dave.id } }) : { id: null };
    await ensureAssertion(dave.id, household.id, 'pays_for', led.id);
  }

  // ---- TYLER --------------------------------------------------------------
  console.log('\n-- TYLER: merge Tyler -> Tyler Cooper (keep both square ids) --');
  const tylerBare = await findCustomer('tyler');
  const tylerCooper = await findCustomer('tyler cooper');
  await mergeEntity(tylerBare, tylerCooper, 'duplicate: Tyler == Tyler Cooper (second Square record)');

  // ---- KARA ---------------------------------------------------------------
  console.log('\n-- KARA: merge email-dup -> Kara Ellingson --');
  const karaDup = await findCustomer('karamellingson@gmail.com');
  const kara = await findCustomer('kara ellingson');
  await mergeEntity(karaDup, kara, 'duplicate: email-named entity == Kara Ellingson');

  console.log(`\n${tag} done.${APPLY ? '' : '  Re-run with --apply to write.'}`);
}

run().catch((e) => { console.error(tag, 'FAILED', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
