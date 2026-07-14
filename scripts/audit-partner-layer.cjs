const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const vendors = await prisma.brainEntity.groupBy({
    by: ['entityType'], where: { entityType: { in: ['Vendor', 'Supplier'] }, tombstonedAt: null }, _count: { _all: true },
  });
  const rows = await prisma.brainEntity.findMany({
    where: { entityType: { in: ['Vendor', 'Supplier'] }, tombstonedAt: null },
    select: { id: true, name: true, properties: true, aliases: { select: { alias: true } }, _count: { select: { srcAssertions: true, dstAssertions: true } } },
  });
  const assertions = await prisma.brainAssertion.groupBy({
    by: ['relType', 'sourceType', 'provisional'],
    where: { OR: [{ src: { entityType: { in: ['Vendor', 'Supplier'] } } }, { dst: { entityType: { in: ['Vendor', 'Supplier'] } } }], retractedAt: null, knownUntil: null },
    _count: { _all: true },
  });
  const cursors = await prisma.brainSyncCursor.findMany({ select: { status: true, processedCount: true, errorCount: true, windowStart: true, windowEnd: true }, orderBy: { windowEnd: 'desc' } });
  console.log(JSON.stringify({
    vendors,
    reviewed: rows.filter(row => row.properties?.partnerReviewedAt).length,
    publicApproved: rows.filter(row => row.properties?.publicEligible === true).length,
    zeroAssertionVendors: rows.filter(row => row._count.srcAssertions + row._count.dstAssertions === 0).length,
    clusters: {
      meta: rows.filter(row => /facebook|meta platforms|meta pay|fbads|facebk/i.test([row.name, ...row.aliases.map(a => a.alias)].join(' '))).map(row => ({ id: row.id, name: row.name })),
      fuel: rows.filter(row => /shell|speedway|holiday station|kwik trip|exxon|\bmobil\b|marathon|circle k|superamerica|fuel|gas station/i.test([row.name, ...row.aliases.map(a => a.alias)].join(' '))).map(row => ({ id: row.id, name: row.name })),
    },
    decisions: await prisma.partnerReviewDecision.count(),
    assertions: assertions.sort((a, b) => b._count._all - a._count._all),
    cursors,
  }, null, 2));
}
run().finally(() => prisma.$disconnect());
