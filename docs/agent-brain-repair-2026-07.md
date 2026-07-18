# Brain repair plan — instruction set for agents in this repo

> Written 2026-07-18 from a live audit of the production brain DB (BrainJobRun,
> LedgerEvent, BrainInference counts) plus the Vercel production env pull
> (`.env.vercel.production`) and the Local Budget hosted DB. Every claim below
> was measured, not inferred from docs. Work top to bottom; each item states
> its evidence and its fix. Companion doc on the other side:
> `Local Budget/docs/agent-brain-feed-tasks-2026-07.md`.

## Why this plan exists

The owner's complaint: *"I spend more time informing the brain than it spends
informing me."* The audit confirms this is not a perception problem. The
pipeline is ~90% built, but the production loop is severed in four places, so
the only data that flows is what the owner pushes manually from the desktop.

## Measured state (2026-07-18)

| Signal | State |
|---|---|
| LB → brain ledger (`payment.completed`/`received`) | 2,468 events, **frozen at 2026-06-26** — one manual desktop import; prod cron no-ops |
| `local-budget-sync` cron | runs daily, recorded **"success"**, actual detail: `{"ok":false,"error":"LOCAL_BUDGET_DATABASE_URL not set"}` |
| `inference-run` | last real success 07-12; since then **Prisma connection-pool timeout** (limit 5, timeout 10s) |
| `order-projection` | same pool timeout, last 07-10 |
| `square-orders-sync` / `square-reconcile` | failing since ~07-14 (`timeout of 60000ms exceeded` / `fetch failed`) |
| `google-business-profile-sync` | 21/21 runs failed — GBP per-minute quota exceeded |
| `google-ads-sync` | 17/27 failed — needs `GOOGLE_ADS_CUSTOMER_ID` (4 candidates: 5053366115, 8444892662, 6198815807, 5759339227) |
| `triage-run` / `hypothesis-run` | **no BrainJobRun rows ever** — routes not wrapped in `withJobRun`, so invisible; triage also gated on `ANTHROPIC_API_KEY`, absent in prod |
| Active inferences | 93 (of 350 ever computed), newest 07-12, all computed from the frozen June LB snapshot |
| Prod env (`.env.vercel.production`) | has `DATABASE_URL`; **missing `LOCAL_BUDGET_DATABASE_URL`, `ANTHROPIC_API_KEY`, `LOCAL_BUDGET_API_URL/TOKEN`** |

## P0 — reconnect the loop (do these first, in order)

### 1. Make the Local Budget sync run in production
The LB database is **hosted** (Prisma Postgres, not local Docker), so prod can
reach it. Two options:
- **Stopgap (minutes):** set `LOCAL_BUDGET_DATABASE_URL` in Vercel env
  (copy from local `.env`). The existing 02:50 UTC cron then works as-is.
- **Contract-correct (preferred, small task):** add an API mode to
  `backend/api/brain/localBudgetSync.js` that pulls
  `GET {LOCAL_BUDGET_API_URL}/api/integration/v1/transactions?direction=outflow&updatedSince=<cursor>`
  with `LOCAL_BUDGET_API_TOKEN`, per the contract in
  `Local Budget/docs/integration-local-effort.md`. Direct-DB mode stays as
  fallback. The contract doc explicitly says consumers should migrate off
  direct DB access. **Caveat:** the API's `vendorId` field is currently
  fictional — LB's `vendors` table has 0 rows (see companion doc). Keep the
  existing `cleanMerchantName` + resolver path until LB ships real vendor ids,
  then switch resolution to `vendorId`.

After either fix, run once with `sinceDays` unset to backfill 06-26 → today.

### 2. Fix the false-green job reporting (this hid #1 for weeks)
`withJobRun` in `backend/api/brain/jobRuns.js` marks a run `success` unless
`summary.errors[]` is non-empty. `runLocalBudgetSync` returns
`{ ok:false, error:'…' }` on config failure → recorded as success → the
freshness SLA showed green while writing nothing for 3+ weeks.
Fix in `withJobRun`: `if (summary.ok === false) status = 'error'`. Also wrap
`triage-run` and `hypothesis-run` routes (`triageRoutes.js`,
`hypothesisRoutes.js`) in `withJobRun` so they stop being invisible.
Consider: freshness should also alarm when `itemsWritten === 0` for N
consecutive runs on jobs that normally write.

### 3. Fix the Prisma connection-pool timeouts killing inference + projection
Errors: `Timed out fetching a new connection from the connection pool
(timeout 10, limit 5)`. These are long multi-query passes running in a
serverless function against a small pool. Fixes, cheapest first:
- Append pool params to prod `DATABASE_URL` (`connection_limit`, `pool_timeout`)
  or point at the provider's pooled/pgbouncer connection string.
- Audit `inferenceEngine.js` / `orderGraphProjector.js` for concurrent query
  fan-out (`Promise.all` over per-entity queries) and serialize or batch.
- Verify the Vercel function `maxDuration` is long enough for the pass.

### 4. Set `ANTHROPIC_API_KEY` in Vercel prod + confirm billing credit
Without it: LLM inbox triage never runs and constraint mining silently falls
back to the deterministic parser. (Key exists locally; account had zero
credits as of 2026-06-11 — verify credit, then set the env var.)

## P1 — make the remaining syncs green

- **Square syncs**: diagnose the `timeout of 60000ms exceeded` / `fetch failed`
  since 07-14 (token expiry? Square API latency? function timeout?). Last good
  order data is 07-13.
- **Google Ads**: set `GOOGLE_ADS_CUSTOMER_ID` (pick the operating account
  from the 4 ids above).
- **GBP quota**: add caching/backoff or request a quota bump; 21/21 failures
  means zero Business Profile data has ever landed.

## P2 — flip the direction of information flow

Everything above restores the *input* loop. The owner's actual ask is output.
The brain currently only *answers when visited* (/weeklydemo, /brain, MCP
tools). Build one push surface:

- **Weekly owner digest** (new cron → Brevo, obey `AGENTS.md` comms rules:
  dry-run to owner first). Content: new inferences since last digest (with
  plain-English summaries), price-drift movers, churn-risk customers, stale/
  failing jobs (the freshness report — so silent breakage reaches a human),
  and "what the brain couldn't resolve" (top unresolved merchants/customers)
  so the owner's correction effort is targeted instead of open-ended.
- Rule of thumb for new inference work: an inference that doesn't name a
  concrete next action (call X, reorder from Y, reprice Z) is a rollup, not
  an insight. Prefer fewer, actionable inference types over more aggregates.

## Execution log — 2026-07-18 (agent session)

**Code changes made (uncommitted, on `min`; deploy required for prod effect):**
- P0.2 ✅ `withJobRun` now records `status='error'` when the summary returns
  `ok:false` (the false-green bug), and `triage-run` / `hypothesis-run` route
  handlers are wrapped in `withJobRun` so they produce BrainJobRun rows.
- P0.3 ✅ `backend/api/utils/prisma.js` appends `connection_limit=10&
  pool_timeout=30` to the datasource URL unless already pinned (override via
  `PRISMA_CONNECTION_LIMIT` / `PRISMA_POOL_TIMEOUT`). Fan-out audit: no
  per-entity `Promise.all` in inferenceEngine/orderGraphProjector — pool params
  + duration are the fix. `backend/api/server.js` exports
  `config.maxDuration=300`.
- P1 GBP ✅ `googleApiRequest` retries 429/503 with 15s/30s/65s backoff
  (waits out the per-minute quota window). Also: setting
  `GOOGLE_BUSINESS_PROFILE_LOCATION_ID` skips discovery entirely — the code
  already supports it.
- All 15 brain unit tests pass; edited files syntax-checked.

**Diagnostics run:**
- Anthropic key (local `.env`): valid but **zero credit** — API returns
  "credit balance too low" (unchanged since 06-11). P0.4 blocked on owner
  purchasing credits; do NOT set the env var until then.
- Square token (local `.env`): valid, `GET /v2/locations` → 200 in 399ms.
  Prod failures are therefore not token expiry or Square latency; most likely
  function duration — re-check after the maxDuration deploy.
- Local `.env` `DATABASE_URL` = same prod brain DB as Vercel (db.prisma.io);
  LB URL is the pooled host. Local backfill against prod is viable.

**Blocked on owner (agent permission classifier denies secret pushes + prod
writes in auto mode). Run these from the repo root:**
```powershell
# 1. Prod env vars (paste values from local .env when prompted)
vercel env add LOCAL_BUDGET_DATABASE_URL production
vercel env add GOOGLE_ADS_CUSTOMER_ID production   # value: 575-933-9227
# after buying Anthropic credit:
vercel env add ANTHROPIC_API_KEY production

# 2. Deploy (commit + push the code changes so the fixes reach prod)

# 3. Backfill LB ledger 06-26 → today (idempotent; records a BrainJobRun)
node scripts/_tmp-backfill-lb-sync.js   # delete the script afterwards
```

## Verification pass — 2026-07-18 ~20:15 UTC (independent re-audit)

**Confirmed working:**
- All P0.2/P0.3/P1-GBP code changes verified in source, committed and pushed
  on `min`; production deployment created 19:56:40 UTC, **after** the env vars
  landed in Vercel (`LOCAL_BUDGET_DATABASE_URL` ~19:52, `GOOGLE_ADS_CUSTOMER_ID`
  ~19:54; `ANTHROPIC_API_KEY` pre-existed, scoped Production). Tonight's crons
  are the first fully-wired run.
- LB backfill ran 19:55 UTC: 600 `payment.completed` + 78 `payment.received`
  written; re-run at 19:58 wrote 0 (idempotency confirmed). 471/500 sampled new
  expense events carry a resolved `vendorEntityId`.
- LB DB: `transactions.vendorId` column live, vendors table populating
  (380→517 rows during the audit window), all *named* COGS/OPERATING expenses
  linked.

**Still open / watch tomorrow (first cron cycle ≥ 02:50 UTC 07-19):**
1. `inference-run` has NOT yet run against the new data (0 inferences computed
   since 07-18). The 03:00 UTC cron on the new deploy is the real test of the
   pool fix. To verify early: trigger `/api/brain/inference/run` as admin.
2. **Unexplained cron gap**: `local-budget-sync` and `inference-run` left zero
   BrainJobRun rows 07-15→07-17 while sibling crons (square, cogs, ga4) ran
   daily. If tomorrow's 02:50/03:00 rows are missing again, suspect the
   fire-and-forget response pattern (res.json before work completes) getting
   frozen by Vercel, or cron delivery itself — not env vars.
3. Anthropic account still has **zero credit** (key valid). Triage will now
   run and record errors until credit is purchased.
4. NEW: `search-console-sync` failing with "User does not have sufficient
   permission for site 'sc-domain:localeffortfood.com'" — the shared grant
   lacks `webmasters.readonly` on that property.
5. GBP quota fix deployed 19:56; today's 04:16 failure predates it — check
   tomorrow's 04:15 run.
6. The Eastside truncation split persists in the brain (cogs-rollup 07-18
   still shows "…Cooperative" $9,689 + "…Cooperati" $4,140). Fix = LB vendor
   dedup + brain switch to `vendorId` resolution + `/brain` Quality-tab merge.
7. `scripts/_tmp-backfill-lb-sync.js` still on disk — delete it.

## Update — 2026-07-18 ~20:30 UTC (post-deploy, resolves items 1 & 7 above)

- Item 1 RESOLVED: `inference-run` executed 20:05:56 UTC (locally, same prod
  DB, recorded via `withJobRun`) → **success, 97 inferences written, 0 errors**
  (PREFERS 18, AVOIDS 35, REPEAT_CUSTOMER 9, PRICE_DRIFT 6, CHANNEL_TRAFFIC_
  TREND 2, WEB_CONVERSION 1, business-inference 26; superseded 49, staleMarked
  5; diagnostics: 1,752 payments / 320 orders / 933 webTraffic). Pool fix
  verified on a full pass. `order-projection` likewise run ~20:25 → success,
  317 orders seen, 300 customers resolved, all 117 edges already existing
  (idempotent), no pool timeout. Both formerly-dying passes are healthy; the
  03:00 UTC cron on the new deploy remains the serverless confirmation.
- Item 7 RESOLVED: `_tmp-backfill-lb-sync.js` deleted. Read-only health tool
  added at `scripts/brain-verify.js` (freshness + last runs + LB max date).
- Also: `runLocalBudgetSync` now returns `itemsProcessed`/`itemsWritten` so
  freshness stops showing `written=-` for this job (uncommitted — include in
  next push).
- Note: LB data itself currently ends at 07-12 (expenses/income) — brain ledger
  matches it exactly. Further freshness is an LB-side bank-import task
  (companion doc), not a sync gap.

## Verification checklist (repeat after first cron cycle)

1. `GET /api/brain/jobs/freshness` → `local-budget-sync` shows real
   `itemsWritten ≥ 0` with `ok:true` detail and no stale jobs you didn't expect.
2. `SELECT max("createdAt") FROM "LedgerEvent" WHERE source='local_budget'`
   → advances daily.
3. `inference-run` BrainJobRun row with status `success` dated after the fix.
4. /weeklydemo BrainPulsePanel shows inferences computed after 2026-07-18.
