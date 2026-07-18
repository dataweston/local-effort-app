// Read-only brain health check: freshness report + recent BrainJobRun rows.
// Usage: node scripts/brain-verify.js
require('dotenv').config();
const { getPrisma } = require('../backend/api/utils/prisma');
const { jobFreshness } = require('../backend/api/brain/jobRuns');

(async () => {
  const prisma = getPrisma();

  console.log('=== job freshness ===');
  const fresh = await jobFreshness(prisma);
  for (const j of fresh.jobs) {
    console.log(
      `${j.jobName.padEnd(30)} lastRun=${j.lastRunStatus.padEnd(8)} ` +
      `lastSuccessAge=${j.lastSuccessAgeHours ?? 'never'}h stale=${j.stale} written=${j.itemsWritten ?? '-'}`
    );
  }
  console.log(`stale: ${fresh.staleCount}/${fresh.jobs.length}`);

  console.log('\n=== last 15 BrainJobRun rows ===');
  const runs = await prisma.brainJobRun.findMany({
    orderBy: { startedAt: 'desc' }, take: 15,
    select: { jobName: true, status: true, startedAt: true, itemsWritten: true, errorCount: true, detail: true },
  });
  for (const r of runs) {
    const err = r.status === 'error' && r.detail?.error ? ` :: ${String(r.detail.error).slice(0, 80)}` : '';
    console.log(`${r.startedAt.toISOString()} ${r.jobName.padEnd(30)} ${r.status.padEnd(8)} written=${r.itemsWritten ?? '-'} errors=${r.errorCount}${err}`);
  }

  const [{ max_occurred }] = await prisma.$queryRawUnsafe(
    `SELECT max("occurredAt") AS max_occurred FROM "LedgerEvent" WHERE source='local_budget'`
  );
  console.log(`\nnewest local_budget LedgerEvent: ${max_occurred?.toISOString?.() ?? max_occurred}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
