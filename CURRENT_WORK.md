# CURRENT_WORK.md — Local Effort execution checkpoint

**Updated:** 2026-08-14  
**Scope:** Aug–Oct 2026 capital, revenue, founder-platform, speaking, RFP, and execution work.  
**Read first:** `AGENTS.md`, then this file.

This is an execution handoff, not a financial source of truth. The repository is public. Do **not** copy customer PII, private email bodies, bank/account details, or the full capital record into this file.

## Canonical sources

1. **Repo behavior / architecture:** `AGENTS.md` and current `min` branch.
2. **Financing facts:** local-only `local_effort_capital_master_record_v2_3.docx`, dated Aug. 14, 2026. Request/mount it if it is not available. It supersedes older master-record versions and conversation summaries.
3. **Cash actuals:** Local Budget, per the evidence hierarchy in the capital master record.
4. **Operational evidence:** Company Brain, Square/native systems, and accepted owner policy as defined in the master record.
5. **External correspondence:** retrieve the relevant Gmail thread at execution time; do not reproduce private correspondence in the public repo.

## Important current-state corrections

- Capital Master Record **v2.3** is canonical for cap table, founder compensation, founder-draw reconciliation, revenue history, Hopkins facility economics, and diligence gaps.
- The owner is building the **actual use-of-funds list**. Agents must not invent or silently preserve the preliminary allocation from an older record as final.
- The Wefunder target remains **$65,000**, but the security is **not final**. Master Record v2.3 still carries a 6% cumulative-return concept; subsequent strategy work explored an **8% accruing convertible note** for a cooperative, potentially converting only into a nonvoting investor/preferred cooperative class. Treat this as an unresolved decision requiring owner + securities counsel/Wefunder confirmation before publication.
- The next authoritative financial artifact remains the **13-month capital cash model** using Master Record v2.3 inputs and owner-authored uses of funds.
- Keep **speaking** separate from cultural PR/representation work.

## Strategy: five active workstreams

### 1. Capital

Goal: make Local Effort financeable without depending on one source.

Active lanes:
- Wefunder $65k Community Round.
- Shared Capital Cooperative application path.
- Groove Capital invitation/application.
- MCCD shared-ownership/public-capital discussion.
- Grants / lower-cost complementary capital where useful.

Sequence:
1. owner use of funds;
2. refresh actuals, debt, cash, AP/AR/taxes;
3. 13-month cash model;
4. choose Wefunder security;
5. data room + campaign materials;
6. anchor/soft-launch investor work;
7. public campaign only after evidence and initial momentum are credible.

### 2. Revenue / sales operating system

Goal: turn Brain + Hub + Planner + commerce into a repeatable sales workflow rather than replacing Square prematurely.

MVP questions:
- Who should we contact today?
- Which opportunities are closest to conversion?
- Who bought recently and should reorder?
- Which channels produce contribution margin?
- What revenue is expected in 7 / 30 / 90 days?

Target flow: `Lead → Opportunity → Transaction → Customer → Reorder`.

**Finance/sales spine update — 2026-08-17:** all six migration steps in
`docs/architecture/finance-core-staged-plan.md` are implemented. Weekly ordering
(step 1, 2026-08-15) plus the general store, Chez Garage at-home deposits, and
pizza-party bookings now create a durable order and pending payment attempt
before Square can charge. Happy Monday requires an authenticated caller and
projects portal orders into agreement/order/invoice records with payments
allocated oldest-invoice-first. Localist dues project into provider-neutral
agreements and subscriptions, kept strictly apart from food orders. Small-event
estimates become commercial orders with deposit and balance invoices. Read-only
sales views live at `/api/sales/{pipeline,expected,collections,reorders,channels,coverage}`.

**Deployment prerequisites:** apply `20260815000200_finance_core_now` before
deploying, and note that the store, Chez Garage at-home, pizza-party, and Happy
Monday payment paths are now **fail-closed** — they return 503 and take no
payment if the database is unreachable. The Happy Monday portal must ship with
its updated client: payments now require a Supabase bearer token.

**Still open:** coverage has not been measured against live data. Run
`/api/finance/reconcile-payments` and `/api/sales/coverage` after a week of real
traffic to get the plan's kill-condition number (95% of captured payments linked
to one commercial record). Local Budget remains the authority for cash
classifications and margin; join its margin output to stable commercial
order/line and business-line IDs.

### 3. Founder platform

Goal: build a founder-facing surface that supports press, speaking, publishing, collaborations, film/TV, food styling, and fundraising credibility.

Minimum site:
- bio;
- selected work/gallery;
- Local Effort context;
- writing;
- speaking/media contact.

Cultural PR targets remain the previously approved boutique list. Do not merge this lane with speaking research.

### 4. Speaking

Goal: paid/nominal-fee engagements about local ingredients, small food business, cooperatives, Midwest food systems, and chef/operator work.

**Hard/current deadlines:**
- Marbleseed 2027 proposal — **Aug. 28, 2026**.
- California Small Farm Conference 2027 workshop proposal — **Sep. 15, 2026**.

**Late/direct-pitch or monitor:**
- Pasa Sustainable Agriculture Conference 2027 — formal deadline passed; direct late pitch may still be considered case-by-case.
- Minnesota Organic Conference 2027 — late/direct pitch.
- Sustainable Farming Association Annual Conference — Feb. 6, 2027; monitor/pitch when programming opens.
- Minnesota Cooperative Summit 2027 — monitor programming.
- Minnesota Farmers Union / Minnesota Cooks — ongoing relationship/pitch lane.
- Up & Coming Food Co-op Conference — monitor 2027 programming.
- National Farmers Union College Conference on Cooperatives — monitor 2027 programming.
- Oregon State Small Farms Conference — monitor 2027 speaker/CFP opening.
- Business Impact NW Food & Farm programming — direct trainer/panel pitch; Portland/Oregon relevant.
- NOFA-NY / New York food-system conference opportunities — reverify current 2027 programming before pitching.
- NYC culinary/business education and food-system panel opportunities previously identified — direct outreach lane; no invented deadline.
- Northwest Food Show / Portland food-business programming — monitor/direct pitch.
- Previously preserved Moreno Valley/Southern California speaking lead needs **re-verification** before calendaring a hard deadline; do not carry an unverified prior “GROW” deadline forward as fact.

### 5. RFP + booked operating work

- **The Marsh café RFP:** site visits/questions through **Aug. 21**; proposal due **Aug. 31**; expected operator selection **Sep. 18**. Use the actual RFP attachment as source.
- A confirmed **Aug. 28 private event** exists in Gmail. It belongs in Planner as a real event with prep/logistics cards, but customer details must be pulled from Gmail/internal systems at execution time rather than hardcoded into this public repo.

## Dated operator queue

### Aug. 14–18
- Owner: produce actual use-of-funds list and amounts.
- Send MCCD several meeting options **after the third week of September**; do not wait until September to respond.
- Assemble Shared Capital prerequisites from its “Next Steps” email.
- Submit Groove application or use office hours if a material application question remains; acknowledge the invitation.
- Reconcile current Planner state before seeding anything; preserve completed work.

### By Aug. 21
- The Marsh: complete site visit / submit all questions.
- Refresh current cash, Square Capital payoff, AP, AR, tax status, and current-period actuals for the capital model.

### Aug. 20–25
- Build the 13-month cash/capital model from Master Record v2.3 + owner uses of funds.
- Resolve a working Wefunder instrument recommendation for owner/counsel review.
- Build capital data-room checklist and missing-document queue.

### Aug. 24–31
- Build Wefunder campaign narrative, financial highlights, risk/FAQ, founder video/storyboard, and initial investor list.
- Marbleseed submission by Aug. 28.
- Execute confirmed Aug. 28 private event from internal customer record.
- Submit The Marsh proposal by Aug. 31.
- Direct late pitch to Pasa and Minnesota Organic Conference if still appropriate.

### September
- Sep. 15: California Small Farm Conference proposal deadline.
- Sep. 18: The Marsh expected selection date; founder-site MVP target / speaking-pipeline review.
- After Sep. 21: MCCD meeting window.
- Continue Shared Capital / Groove diligence.
- Soft-launch Wefunder only when campaign evidence is ready and there is a credible path to meaningful initial investment; do not assume anonymous Wefunder traffic will fund the round from zero.
- Launch approved cultural-PR outreach after the founder materials are coherent enough to support it.

### October
- Public Wefunder push / oversubscription work if launch gates are met.
- Expand founder publishing/media outreach.
- Continue regional + NY/CA/OR speaking pipeline.
- Capital deployment remains gated by actual liquidity, production capacity, and revenue—not by a desire to spend the round quickly.

## Planner implementation status

A prior branch, `agent/aug-oct-operating-plan`, contains an **unmerged, unapplied seed script**. It did **not** prove that production Planner cards were created. Do not infer Planner state from that branch.

The current plan should be represented as persistent Planner projects/cards with stable IDs and idempotent seeding. Before apply:
1. inspect existing production Planner cards/projects;
2. match equivalent existing tasks rather than duplicate them;
3. preserve `done` status;
4. keep customer PII out of repo source;
5. run a dry-run first;
6. apply only with the master Planner UID and database configured.

## Owner / agent request queue

### Owner input required
- Final use-of-funds list and amounts.
- Final Wefunder security preference after comparing the co-op-compatible options.
- Approval of any external communications before send, per `AGENTS.md`.

### Agent should obtain, not guess
- Current unrestricted cash.
- Current Square Capital payoff balance.
- Complete debt/AP/AR/tax position.
- Fresh Local Budget actuals.
- Final founder draw/deferred-comp reconciliation.
- Exact lender/application requirements from current Gmail threads.
- Current external-program deadlines before submission.

## New-agent quick start

Use this exact instruction:

> Work only from `dataweston/local-effort-app` and the `min` branch unless explicitly told otherwise. Read `AGENTS.md` and `CURRENT_WORK.md` first. Treat the locally supplied `local_effort_capital_master_record_v2_3.docx` as the canonical financing source of truth and do not substitute older conversation figures. Reconcile current Planner state before adding tasks. Continue the Aug–Oct execution plan from the earliest incomplete dated item. Do not invent use-of-funds amounts, final Wefunder terms, or missing accounting facts. Keep speaking work separate from cultural PR. For Gmail-derived tasks, retrieve the live thread rather than relying on copied private correspondence. Report what is done, blocked, and next.

## Handoff discipline going forward

At the end of any substantial strategy/operations session, update this file with only:
- decisions that changed;
- tasks completed;
- new hard deadlines;
- blockers/owner requests;
- the next 3–5 operator actions.

Do not turn this file into a second master record. Financial truth stays in the current Capital Master Record / Local Budget; this file exists to preserve **execution state and momentum**.
