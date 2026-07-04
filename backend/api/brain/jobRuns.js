/**
 * Durable job-run tracking + freshness SLA.
 *
 * The recurring brain crons previously kept only process-local state, so a job
 * that silently stopped firing (e.g. the inference pass that went 2 months
 * without a run) was invisible. `recordJobRun` writes one BrainJobRun row per
 * run; `jobFreshness` reports, per job, when it last succeeded and whether that
 * is within its expected cadence.
 *
 * Wrap a job body with `withJobRun(name, expectedIntervalHours, fn)` — it times
 * the run, captures counts/errors from the returned summary, and records status.
 */

const { getPrisma } = require('../utils/prisma');

// Expected cadence per job (hours). A successful run must land within this
// window or the job is flagged stale by jobFreshness().
const JOB_SLA = {
  'ga4-sync': 24,
  'google-business-profile-sync': 24,
  'google-merchant-sync': 24,
  'google-ads-sync': 24,
  'square-orders-sync': 24,
  'order-projection': 24,
  'local-budget-sync': 24,
  'cogs-rollup': 24,
  'square-reconcile': 24,
  'inference-run': 24,
  'hypothesis-run': 24,
  'triage-run': 24, // runs twice daily; 24h window tolerates one miss
};

async function recordJobRun(prisma, { jobName, status, startedAt, summary = {}, error = null }) {
  const finishedAt = new Date();
  try {
    return await prisma.brainJobRun.create({
      data: {
        jobName,
        status,
        startedAt,
        finishedAt,
        durationMs: startedAt ? finishedAt.getTime() - startedAt.getTime() : null,
        itemsProcessed: numberOrNull(
          summary.itemsProcessed
          ?? summary.rowsSeen
          ?? summary.ordersSeen
          ?? summary.processed
          ?? summary.lineItemsSeen
        ),
        itemsWritten: numberOrNull(summary.itemsWritten ?? summary.eventsWritten ?? summary.written ?? summary.edgesWritten),
        errorCount: Array.isArray(summary.errors) ? summary.errors.length : (error ? 1 : 0),
        expectedIntervalHours: JOB_SLA[jobName] ?? null,
        detail: clampDetail({ ...summary, ...(error ? { error: String(error).slice(0, 500) } : {}) }),
      },
    });
  } catch (err) {
    // Never let bookkeeping break the job itself.
    return null;
  }
}

function numberOrNull(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function clampDetail(obj) {
  try {
    const json = JSON.stringify(obj);
    if (json.length <= 8000) return obj;
    return { truncated: true, keys: Object.keys(obj) };
  } catch {
    return null;
  }
}

/**
 * Wrap a job function so every invocation is recorded.
 * @param {string} jobName
 * @param {() => Promise<object>} fn — returns a summary object (errors[], counts...)
 */
async function withJobRun(jobName, fn) {
  const prisma = getPrisma();
  const startedAt = new Date();
  try {
    const summary = (await fn()) || {};
    const hasErrors = Array.isArray(summary.errors) && summary.errors.length > 0;
    await recordJobRun(prisma, { jobName, status: hasErrors ? 'partial' : 'success', startedAt, summary });
    return summary;
  } catch (error) {
    await recordJobRun(prisma, { jobName, status: 'error', startedAt, error: error?.message || String(error) });
    throw error;
  }
}

/**
 * Freshness report: for each known job, the last successful run and whether it
 * is within SLA. `stale` jobs are the alarm surface.
 */
async function jobFreshness(prisma) {
  const now = Date.now();
  const jobs = Object.keys(JOB_SLA);
  const rows = [];
  for (const jobName of jobs) {
    const lastSuccess = await prisma.brainJobRun.findFirst({
      where: { jobName, status: { in: ['success', 'partial'] } },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true, status: true, itemsWritten: true, errorCount: true },
    });
    const lastAny = await prisma.brainJobRun.findFirst({
      where: { jobName },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true, status: true },
    });
    const slaHours = JOB_SLA[jobName];
    const ageHours = lastSuccess ? (now - new Date(lastSuccess.startedAt).getTime()) / 3_600_000 : null;
    const stale = ageHours === null || ageHours > slaHours;
    rows.push({
      jobName,
      expectedIntervalHours: slaHours,
      lastSuccessAt: lastSuccess?.startedAt || null,
      lastSuccessAgeHours: ageHours === null ? null : Math.round(ageHours * 10) / 10,
      lastRunAt: lastAny?.startedAt || null,
      lastRunStatus: lastAny?.status || 'never',
      itemsWritten: lastSuccess?.itemsWritten ?? null,
      stale,
    });
  }
  return { jobs: rows, staleCount: rows.filter(r => r.stale).length, checkedAt: new Date().toISOString() };
}

module.exports = { recordJobRun, withJobRun, jobFreshness, JOB_SLA };
