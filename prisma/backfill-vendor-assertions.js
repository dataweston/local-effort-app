/**
 * One-time backfill: convert vendor entity property snapshots into proper
 * BrainInference rows so spend data is queryable through the graph layer
 * and doesn't silently drift in properties JSON.
 *
 * Creates one BrainInference (RELIABLE_SUPPLIER or PREFERS) per vendor
 * based on their seeded totalSpend / txCount / firstSeen / lastSeen.
 *
 * Run: node prisma/backfill-vendor-assertions.js
 * Dry:  node prisma/backfill-vendor-assertions.js --dry-run
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const vendors = await prisma.brainEntity.findMany({
    where: { entityType: 'Vendor', tombstonedAt: null },
    select: { id: true, name: true, properties: true },
  });

  console.log(`Found ${vendors.length} vendors. dry_run=${DRY_RUN}`);

  let written = 0;
  let skipped = 0;

  for (const vendor of vendors) {
    const props = vendor.properties || {};
    const totalSpend = props.totalSpend || 0;
    const txCount = props.txCount || 0;
    const firstSeen = props.firstSeen ? new Date(props.firstSeen) : null;
    const lastSeen = props.lastSeen ? new Date(props.lastSeen) : null;

    if (!txCount || !firstSeen) { skipped++; continue; }

    // Check if inference already exists
    const existing = await prisma.brainInference.findFirst({
      where: {
        srcId: vendor.id,
        dstId: vendor.id,
        inferenceType: 'RELIABLE_SUPPLIER',
        supersededBy: null,
        knownUntil: null,
      },
    });

    if (existing) { skipped++; continue; }

    // Confidence based on transaction count: 3 txns = 0.5, 12+ = 0.95
    const conf = Math.min(0.95, 0.5 + (txCount / 20) * 0.45);

    const daysSinceLastSeen = lastSeen
      ? Math.floor((Date.now() - lastSeen.getTime()) / 86_400_000)
      : null;

    const summary = [
      `${txCount} transactions totalling $${(totalSpend / 100).toFixed(0)} since ${firstSeen.toISOString().slice(0, 7)}`,
      daysSinceLastSeen !== null ? `last seen ${daysSinceLastSeen}d ago` : null,
      props.primaryClassification ? `(${props.primaryClassification})` : null,
    ].filter(Boolean).join(', ');

    if (DRY_RUN) {
      console.log(`  [DRY] ${vendor.name}: ${summary} conf=${conf.toFixed(2)}`);
      written++;
      continue;
    }

    await prisma.brainInference.create({
      data: {
        srcId: vendor.id,
        dstId: vendor.id,
        inferenceType: 'RELIABLE_SUPPLIER',
        confidence: conf,
        decayRate: 'slow',
        knownFrom: new Date(),
        computedAt: new Date(),
        computedFrom: [],
        summary,
        staleAt: new Date(Date.now() + 90 * 86_400_000),
      },
    });
    written++;
  }

  console.log(`Done: ${written} inferences written, ${skipped} skipped.`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
