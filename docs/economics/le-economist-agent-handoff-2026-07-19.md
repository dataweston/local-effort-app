# LE Economist and line-model agent handoff

Handoff date: 2026-07-19  
Repository: `C:\Users\user\local-effort-app`  
Branch at handoff: `min`  
HEAD at handoff: `ab542e21a`  
Audience: a new engineering/economics agent continuing this work

## Technical summary

The LE Economist now exists as both a repo-owned skill and an active Codex skill. Its governing design is a merger of two systems:

1. an evidence spine that reconciles Local Budget, Company Brain, Square, Gmail, payroll documents, and owner statements without inventing missing facts; and
2. an applied-economics reasoning layer covering unit economics, relevant costing, constrained-resource contribution, working capital, CAC/LTV, peak-load pricing, price discrimination, small-business finance, real options, and base rates.

The executable line model runs successfully for 2026-04-01 through 2026-06-30. It reconciles company-level cash actuals, attributes 99.95% of observed Square revenue to working business lines, exposes partial cost evidence, keeps observed and modeled economics separate, and supports a modeled kitchen-allocation sensitivity. It does **not** yet support a defensible raise point estimate because job-level cost, labor, capacity, target-mix, ramp, and uses-of-funds inputs remain incomplete.

The production Hub reported `503` for `/api/hub/economics-model`. The local fix makes JSON model dependencies statically traceable by Vercel and adds source-specific safe error codes. Local source execution, dependency tracing, syntax, ESLint, allocation reconciliation, skill validation, and the frontend production bundle passed. These changes are still uncommitted at handoff; do not describe the production endpoint as fixed until a deployment is completed and an authenticated production request returns `200`.

## Start here

Read these files in order before changing anything:

1. `AGENTS.md`
2. `skills/le-economist/SKILL.md`
3. `skills/le-economist/references/current-facts.md`
4. `skills/le-economist/references/evidence-and-modeling.md`
5. `skills/le-economist/references/decisions-log.md`
6. `skills/le-economist/references/line-model.md`
7. `skills/le-economist/references/line-model-config.json`
8. `docs/economics/le-economist-line-model.md`
9. `docs/le-economist-fact-audit-2026-07-18.md`
10. `skills/le-economist/scripts/build-line-model.cjs`
11. `api-handlers/hub/economics-model.js`
12. `src/components/hub/EconomicsModelView.jsx`

Do not start from `docs/archive/`, the original business plan, or the retired v1 claims.

## Non-negotiable model invariants

- Local Budget posted, split-aware classifications control cash actuals.
- Company Brain/Square order events support product and customer attribution but do not replace cash reconciliation.
- Owner statements control policy, intent, definitions, decision status, and acceptance. Owner recollections of empirical amounts, dates, or events remain labeled empirical evidence when corroboration matters.
- Preserve `Unallocated` and unresolved values. Never force a match to make totals look complete.
- Keep observed results separate from modeled allocations.
- Never call ingredient-only food margin contribution margin.
- Always separate as-paid cash operations, PERSONAL founder draws, deferred founder compensation, fully loaded economics, and financing/transfers.
- Never count the founder salary policy and a founder-hour opportunity cost twice.
- Rank alternatives by contribution per genuinely binding resource, not revenue alone.
- Every recommendation requires a steelman, reversal variable, measurable kill/pause/review condition, and smallest reversible next step.
- Append material recommendations and outcomes to the decisions log when the task authorizes logging; calibrate reasoning separately from luck.

## Business facts that control the current model

As of the dated fact set, subject to live-source recheck:

- Founder compensation policy from 2026-04-01: Weston Smith `$90,000/year`; Catherine Olsen `$70,000/year`; assessed at month end.
- Qualifying Local Budget `PERSONAL` transactions offset that accrual only after owner review and accountant treatment.
- Accepted economic cap table: Weston `45.5%`, Catherine `47.5%`, Sarah Olsen `5%`, Renee Owens `2%`. Renee paid `$6,000` for 2% transferred from Weston.
- Maria Beck is an active chef paid through Square Payroll at `$35/hour`. Her additional 1% offer from Weston is unaccepted and excluded from the cap table.
- Kitchen price: `$40/hour` for the first 20 monthly hours, `$35/hour` thereafter, plus `$200/month` storage.
- Local-first means a loose `75–85%` inventory target plus material aesthetic, branding, menu-design, and proprietary contributions. It is a portfolio/brand constraint, not a universal 100% sourcing rule.
- Current Brain seasonality: October `2.37x` baseline; August `0.86x`. Do not revive the unsupported August-peak claim.
- Wefunder/SMBX execution is owner-described as operationally ready, but no accepted reproducible raise model or final terms are in this evidence set.
- Post Office and Walmart descriptors may be money-order purchase locations for rent. Trust reviewed Local Budget Rent classification; do not spend time re-investigating those descriptors unless reconciliation fails or the owner asks.
- The working line taxonomy is not an owner-ratified managerial P&L taxonomy.

Retired inputs remain retired: approximately `$120K` annual revenue, approximately `20% EBITDA`, flat `$1,850` rent, PropCo/OpCo as current strategy, SBA 504, and C-PACE. If a new measured annual reconstruction lands near `$120K`, that validates the reconstruction—not the unsupported old claim.

## Deferred-compensation treasury mechanism

Owner policy proposes settling accrued founder compensation for cash while founders exchange shares into cooperative treasury. The intended structure makes founder ownership supply the settlement shares and creates a treasury pool for future hires or investors. It is not executed or legally validated.

Four gates remain open:

1. pricing peg based on an arm's-length round or independently supportable method;
2. Minnesota 308B share-class and treasury mechanics;
3. revenue/profitability/liquidity milestone subordinating settlement to growth financing;
4. disclosure order: liability, proposed mechanism, then milestone/governance conditions.

Require accountant and cooperative/securities counsel review before execution or offering disclosure. Later treasury issuance may create dilution even if the founder settlement itself does not issue new outside-investor shares.

## System architecture

```text
Privileged Hub user
  -> /hub/economics
  -> src/components/hub/EconomicsModelView.jsx
  -> GET/POST /api/hub/economics-model
  -> backend/api/index.js route
  -> api-handlers/hub/economics-model.js
  -> skills/le-economist/scripts/build-line-model.cjs
       -> Local Budget read-only database (cash actuals and candidate pools)
       -> Company Brain Prisma database (Square order ledger events)
       -> static line-model config and recovered-evidence JSON
  -> private, no-store JSON response
```

The API requires privileged Hub authentication. GET loads actuals and configured scenario inputs. POST accepts up to 12 sanitized line-input objects and recalculates the scenario. The UI is available only to privileged users.

### Source contracts

| Source | Current use | Authority | Important limitation |
| --- | --- | --- | --- |
| Local Budget database | Cash bridge, classifications, merchant/date cost pools | Cash actuals | Direct DB is currently used by the script; repo architecture says production should eventually consume Local Budget's versioned API contract. |
| Company Brain `ledgerEvent` | Square `order.placed` events and payload identity | Order/product attribution | Order date is not settlement date. |
| Gmail/Brain recovered evidence JSON | Exact order matches, prices, quotes, purchase evidence | Dated supporting evidence | Gmail extraction freshness is not equivalent to current mailbox coverage. |
| Square Payroll PDFs/owner report | Maria hours/rate and partial payroll detail | Native documents plus owner-reported gap | Direct Square Payroll access is unavailable; do not infer payroll burden from deposits. |
| Owner statements | Policies, definitions, intent, acceptance, decision status | Authoritative in those domains | Empirical amounts/dates still need labels and material corroboration. |

Production configuration previously showed `LOCAL_BUDGET_DATABASE_URL` present, while `LOCAL_BUDGET_API_URL` and `LOCAL_BUDGET_API_TOKEN` were absent. Do not expose any value. Recheck Vercel before relying on this statement. The longer-term preferred integration is the versioned Local Budget API described in `docs/local-budget-cashflow-api-brief-2026-07-14.md`.

## Current April–June baseline

Last read-only run: 2026-07-19. Model period: 2026-04-01 through 2026-06-30, three complete calendar months.

### Source health

- Local Budget maximum posted date: `2026-07-19`
- Period transaction/split rows returned: `987`
- Latest Brain/Square order in model window: `2026-06-27`
- Deduplicated Square orders: `22`
- Recovered-evidence file as-of date: `2026-07-18`

### Company bridge

| Measure | Amount |
| --- | ---: |
| Classified operating revenue | `$29,245.68` |
| COGS | `$10,231.81` |
| Paid nonfounder labor | `$2,626.00` |
| Operating expense excluding labor | `$13,375.27` |
| Unknown/unresolved expense | `$968.51` |
| Cash contribution before founder draws | `$3,012.60` |
| Cash contribution after unresolved expense | `$2,044.09` |
| PERSONAL treated provisionally as founder draws | `$6,873.09` |
| Cash after founder draws | `-$3,860.49` |
| Founder policy compensation | `$40,000.00` |
| Fully loaded operating result | `-$36,987.40` |
| Deferred founder compensation increase | `$33,126.91` |

These are model outputs, not accounting entries. PERSONAL treatment remains subject to owner review and accountant treatment.

### Square attribution

| Working line | Observed Square revenue | Observed orders |
| --- | ---: | ---: |
| Weekly Meal Subscription | `$9,860.00` | `12` |
| Partner Wholesale | `$4,346.80` | `3` |
| Private Dinners & Events | `$750.00` | `1` |
| Local Effort Pizza | `$0.00` | `0` |
| Farmers Market | `$0.00` | `0` |
| Unallocated | `$8.00` | `1` |

- Observed Square order revenue: `$14,964.80`
- Attributed Square revenue: `$14,956.80`
- Attribution coverage: `99.95%`
- Square-to-cash revenue ratio: `51.17%`
- Cash less observed Square orders: `$14,280.88`

Do not label the `$14,280.88` difference Unallocated line revenue. It includes settlement timing and likely non-Square receipts.

### Partial recovered costs

- Baker's Field flour: `$468.75`, three postings, shared COGS pool; not observed line contribution.
- Thumbtack: `$351.92`, four postings, events-channel CAC evidence; not food contribution cost by default.
- The remaining full contribution margins are incomplete.

## What has been implemented locally

### LE Economist skill

- Restored the ten-frame analytical doctrine alongside the evidence rules.
- Added domain-specific owner authority.
- Restored mandatory steelman, kill condition, and quarterly calibration.
- Added the owner-designed treasury settlement and four open gates.
- Added an append-only decisions/calibration log seeded with the July 18 audit.
- Made runner examples cross-platform.
- Synced the repo skill to `C:\Users\user\.codex\skills\le-economist`.
- Backed up the previous installed copy at `C:\tmp\le-economist-before-feedback-2026-07-19`.

### Line model

- Company-level cash bridge with financing/reimbursements/transfers excluded from operating revenue.
- Square line-item attribution with exact order/customer cross-source matches.
- Partial evidence layers for direct, candidate, shared, and channel costs.
- Configurable working taxonomy and scenario inputs.
- Founder cash-draw and fully loaded bridges.
- Tiered kitchen-cost calculation.
- Sanctioned modeled fallback: kitchen cost by modeled kitchen hours, with order-count and revenue-share sensitivities.
- Configured policy for other shared production pools to use modeled direct production labor hours when an eligible pool and period are documented.
- UI shows the kitchen-allocation contribution range.

### Production 503 hardening

- Default JSON config and recovered evidence now use static imports so Vercel dependency tracing includes them.
- Local Budget, Company Brain, and config failures receive distinct safe error codes.
- API responses expose only the safe code; detailed cause stays in server logs.
- UI displays the safe code when a request fails.

## Worktree state at handoff

The worktree was not committed. Existing changes are intentional and belong to this body of work:

- `api-handlers/hub/economics-model.js`
- `docs/economics/le-economist-line-model.md`
- `docs/le-economist-fact-audit-2026-07-18.md`
- `skills/le-economist/SKILL.md`
- `skills/le-economist/agents/openai.yaml`
- `skills/le-economist/references/current-facts.md`
- `skills/le-economist/references/decisions-log.md` (new)
- `skills/le-economist/references/evidence-and-modeling.md`
- `skills/le-economist/references/line-model-config.json`
- `skills/le-economist/references/line-model.md`
- `skills/le-economist/scripts/build-line-model.cjs`
- `src/components/hub/EconomicsModelView.jsx`
- this handoff document (new)

Do not discard or overwrite these changes. Inspect the diff before adding unrelated work.

## Validation already completed

- `node --check api-handlers/hub/economics-model.js` — passed
- `node --check skills/le-economist/scripts/build-line-model.cjs` — passed
- LE Economist repo skill validation — passed
- Active installed skill validation — passed
- Repo and active skill file hashes — matched at synchronization time
- Deterministic allocation test — all three methods reconciled to the same `$1,605` test kitchen-cost pool
- Live April–June model against configured read-only sources — passed
- Vercel node-file tracer — included the model script and both static JSON dependencies
- `pnpm exec eslint src/components/hub/EconomicsModelView.jsx` — passed
- `pnpm exec vite build` — passed
- Full `pnpm build` before the latest documentation/model sensitivity edits — passed
- `git diff --check` — passed

The Vite build still emits pre-existing warnings about CSS `@import` placement, client directives, and large chunks. They did not fail the build and were not introduced by this work.

## Known limitations and risks

1. **Production is not verified.** The authenticated endpoint must be tested after deployment. A public unauthenticated request cannot exercise the model path.
2. **Direct database coupling remains.** `build-line-model.cjs` requires `LOCAL_BUDGET_DATABASE_URL`; the documented production architecture prefers `LOCAL_BUDGET_API_URL` plus token and a versioned API contract.
3. **Square covers only 51.17% of classified cash revenue in the period.** This is a reconciliation gap, not a line-allocation license.
4. **Historical contribution margins remain incomplete.** Shared COGS, labor, kitchen, delivery, packaging, and founder time are not joined to jobs or production lots.
5. **Scenario fallback is modeled.** Kitchen sensitivities are implemented; generic shared-production labor-hour allocation is documented/configured but not yet calculated from an explicit selected cost pool in the script.
6. **Founder hours are unmeasured.** Fully loaded line economics cannot be observed until time or an accepted allocation method exists.
7. **Payroll is incomplete.** Square Payroll source detail is unavailable; supplied stubs and Local Budget Labor do not fully reconcile.
8. **Raise terms/model are incomplete.** Operational readiness is not evidence for a raise amount, DSCR, dilution, runway, or fixed-cost capacity.
9. **Taxonomy is provisional.** Marketing surfaces and operating lines should not be silently conflated.
10. **Installed-skill drift is possible.** After repo skill edits, explicitly resynchronize and validate the active copy.

## Recommended next-work queue

### P0 — ship and verify the 503 fix

1. Review the current diff and preserve the existing edits.
2. Run the full production build.
3. Commit and deploy only with user authorization and the repository's normal publishing workflow.
4. From an authenticated privileged Hub session, request:

   `GET /api/hub/economics-model?start=2026-04-01&end=2026-06-30`

5. Success condition: HTTP `200`, model JSON returned, UI renders actuals/evidence/scenario.
6. If it still returns `503`, record the safe response code and inspect the matching Vercel server log. Do not guess whether Brain or Local Budget failed.

Kill condition: if the production bundle still omits model files or cannot connect to the configured source, stop deployment iteration and fix that source boundary before changing economic calculations.

### P1 — close the highest-value line-economics joins

Work in this order because each item most directly improves decision quality:

1. reconcile non-Square cash receipts to stable customers/orders/business lines;
2. join Baker's Field invoices and purchase lots to recipes and production runs;
3. match paid payroll hours and burden to production runs/events;
4. begin founder time measurement or ratify a temporary founder-hour allocation;
5. join kitchen bookings, courier invoices, packaging, and delivery to jobs;
6. close mixed cash/in-kind event consideration and final invoices;
7. measure monthly capacity by binding resource and target line mix.

For every new join, preserve source ID, source date, extraction date, matching rule, confidence, and residual. Rerun the same period and confirm total cash and total Square revenue do not change merely because attribution improved.

### P2 — implement generic shared-pool fallback

The policy exists but only kitchen sensitivity is executable. Add an explicit scenario request structure that identifies:

- the cost pool and period;
- eligible line IDs;
- primary direct-production-labor-hours weights;
- order-count and revenue-share alternative weights;
- residual/unallocatable amount;
- the line ranking and whether it reverses across methods.

Never apply the policy automatically to all COGS. Never allocate financing, transfers, founder draws, channel CAC, fixed storage, or unrelated overhead through it.

### P3 — build the raise model

Do not start with a desired raise amount. Build monthly base/downside/upside cases from:

- line-level cash and economic contribution;
- binding-resource capacity and target mix;
- seasonality and ramp timing;
- working-capital timing;
- founder cash compensation and deferred-comp settlement policy;
- hires, equipment, marketing, reserve, financing cost, and contingency;
- current executable financing terms.

Output a conditional range if sensitivities distinguish viable from non-viable cases. Every recommendation needs a steelman, reversal variable, kill condition, and professional-review gate.

### P4 — maintain calibration

When a recommendation is issued or an outcome arrives, append a row to `references/decisions-log.md` if authorized. At quarterly review, score reasoning separately from outcome and update priors explicitly.

## Useful commands

Run the baseline model:

```sh
node "skills/le-economist/scripts/build-line-model.cjs" --repo . --start 2026-04-01 --end 2026-06-30
```

Validate syntax and UI:

```sh
node --check api-handlers/hub/economics-model.js
node --check skills/le-economist/scripts/build-line-model.cjs
pnpm exec eslint src/components/hub/EconomicsModelView.jsx
pnpm exec vite build
```

Validate the repo skill:

```sh
python "C:/Users/user/.codex/skills/.system/skill-creator/scripts/quick_validate.py" "skills/le-economist"
```

Inspect scope before committing:

```sh
git status --short
git diff --check
git diff -- api-handlers/hub/economics-model.js skills/le-economist src/components/hub/EconomicsModelView.jsx docs/economics docs/le-economist-fact-audit-2026-07-18.md
```

## Definition of done for the next agent

The immediate handoff is complete when:

- the current changes are preserved and reviewed;
- the full build passes;
- the production endpoint returns `200` for an authenticated privileged user;
- the April–June totals and attribution coverage remain reconciled;
- any source failure identifies Local Budget, Company Brain, or configuration without leaking secrets;
- the active installed skill matches the committed repo skill;
- the deployment or decision is recorded with date and outcome.

Do not claim the broader economist model is complete until historical line contribution, constrained-resource capacity, working capital, target mix, and raise uses of funds are decision-usable.
