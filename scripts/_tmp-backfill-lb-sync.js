// One-shot: backfill Local Budget -> brain ledger (06-26 -> today) against the
// prod brain DB, recorded as a real BrainJobRun via withJobRun.
require('dotenv').config();
const { withJobRun } = require('../backend/api/brain/jobRuns');
const { runLocalBudgetSync } = require('../backend/api/brain/localBudgetSync');

(async () => {
  const summary = await withJobRun('local-budget-sync', () =>
    runLocalBudgetSync({ logger: console, sinceDays: null })
  );
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.ok === false ? 1 : 0);
})().catch((err) => {
  console.error('backfill failed:', err);
  process.exit(1);
});
