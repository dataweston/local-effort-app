// Reclassify CPW (Co-op Partners Warehouse) wholesale price-list items from the
// Ingredient entity type to the distinct PriceReference type.
//
// Why: the CPW weekly price list was ingested as a broad wholesale pricing
// resource for pro-forma / COGS estimation — not as recipe ingredients. As
// Ingredient entities they clutter the brain's ingredient list. PriceReference
// keeps the data (and its PRICED_AT assertions) queryable without mixing it in
// with real recipe ingredients.
//
// Selection criterion (conservative): an Ingredient is reclassified only if
//   1. it has at least one PRICED_AT assertion whose metadata.source = 'cpw_price_list', AND
//   2. it is NOT used in recipe building — no CONTAINS / USES_INGREDIENT assertions, AND
//   3. every one of its assertions is CPW-sourced (so a real ingredient that merely
//      also has a CPW price is left untouched).
//
// Usage:
//   node scripts/reclassify-cpw-price-references.js          # dry run
//   node scripts/reclassify-cpw-price-references.js --apply  # write changes

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const CPW_SOURCE = 'cpw_price_list';
const RECIPE_REL_TYPES = new Set(['CONTAINS', 'USES_INGREDIENT', 'USED_IN']);

function isCpwAssertion(assertion) {
  return (assertion.metadata || {}).source === CPW_SOURCE;
}

async function main() {
  // Pull all live Ingredient entities that have at least one CPW PRICED_AT assertion.
  const candidates = await prisma.brainEntity.findMany({
    where: {
      entityType: 'Ingredient',
      tombstonedAt: null,
      srcAssertions: {
        some: {
          relType: 'PRICED_AT',
          retractedAt: null,
        },
      },
    },
    include: {
      srcAssertions: { where: { retractedAt: null }, select: { relType: true, metadata: true } },
      dstAssertions: { where: { retractedAt: null }, select: { relType: true, metadata: true } },
    },
  });

  const toReclassify = [];
  const skipped = [];

  for (const entity of candidates) {
    const allAssertions = [...entity.srcAssertions, ...entity.dstAssertions];
    const hasCpwPrice = entity.srcAssertions.some(
      (a) => a.relType === 'PRICED_AT' && isCpwAssertion(a),
    );
    if (!hasCpwPrice) continue;

    const usedInRecipe = allAssertions.some((a) => RECIPE_REL_TYPES.has(a.relType));
    const allCpw = allAssertions.every(isCpwAssertion);

    if (usedInRecipe) {
      skipped.push({ name: entity.name, reason: 'used in recipe building' });
      continue;
    }
    if (!allCpw) {
      skipped.push({ name: entity.name, reason: 'has non-CPW assertions' });
      continue;
    }
    toReclassify.push(entity);
  }

  console.log(`Candidates with CPW pricing: ${candidates.length}`);
  console.log(`Will reclassify to PriceReference: ${toReclassify.length}`);
  console.log(`Skipped (kept as Ingredient): ${skipped.length}`);
  if (skipped.length) {
    for (const s of skipped.slice(0, 25)) console.log(`  - ${s.name} (${s.reason})`);
    if (skipped.length > 25) console.log(`  ... +${skipped.length - 25} more`);
  }

  if (!apply) {
    console.log('\nDry run — re-run with --apply to write changes.');
    for (const e of toReclassify.slice(0, 25)) console.log(`  → ${e.name}`);
    if (toReclassify.length > 25) console.log(`  ... +${toReclassify.length - 25} more`);
    return;
  }

  let updated = 0;
  // Batch the updates so a large list doesn't open thousands of round-trips.
  const ids = toReclassify.map((e) => e.id);
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const res = await prisma.brainEntity.updateMany({
      where: { id: { in: batch } },
      data: { entityType: 'PriceReference' },
    });
    updated += res.count;
  }

  console.log(`\nReclassified ${updated} entities to PriceReference.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
