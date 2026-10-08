# Research prompt: overhaul the review system (Brain / knowledge graph and every agent-to-owner queue)

Owner: Local Effort Cooperative owner. Evidence snapshot: 2026-10-08 (production DB, read-only counts; repo `local-effort-app`, branch `min`). Review by: 2026-11-08 or when the research deliverable lands, whichever is first. Counts below are a snapshot; re-query before relying on them. This file is a request for **research and a design recommendation only**. Do not implement, migrate, or write to production.

You are a fresh research agent. This document is self-contained. You may read the repository (`backend/`, `src/`, `docs/`, `scripts/`, `prisma/schema.prisma`) and run **read-only** Prisma queries from scratch scripts under the gitignored `/.tmp/` (delete them before you finish). File:line pointers refer to the repo at the snapshot date; confirm them before citing.

---

## 1. Background and the owner's problem

Local Effort Cooperative is a Twin Cities personal chef / catering business. The owner runs it with a large fleet of AI agents that ingest email, receipts, invoices, payments and orders into a "Brain" (a ledger plus knowledge graph in Postgres via Prisma) and into operational tables (Food Operations Core: stock products, vendor items, cost observations).

The owner's problem, in their words (paraphrased faithfully):

- The review system in the Brain / knowledge graph **has never been useful**.
- **Nearly every day an agent hands the owner a list of things that need a human to parse.**
- The need for a human to parse **should decrease over time** if the system is well designed and smart. Today it does not: the queue only grows, and each new agent invents its own list format.
- The owner wants a *complete overhaul*, not a tweak: rethink what a "review" is, who asks, who answers, and how answers compound.

North-star: **human-minutes per week spent resolving agent-raised questions, with a target that falls month over month** while data quality (precision of automated decisions) stays at or above an agreed floor.

---

## 2. Current-state evidence

Everything here was observed read-only. `[INFERENCE]` marks conclusions not directly verified.

### 2.1 There is no single "review" concept; there are at least eight

| # | Surface | Store | Producer | Consumer / UI |
|---|---|---|---|---|
| 1 | Brain inbox | `BrainInboxItem` (`prisma/schema.prisma:1815`) | Gmail thread sync (`backend/api/brain/gmailSync.js:1180-1191`), capture API (`inboxRoutes.js:80`), triage cron | `GET /api/brain/inbox` (`inboxRoutes.js:124`), `POST /api/brain/inbox/:id/triage` (`:182`), `src/pages/InboxPage.jsx`, `src/components/brain/BrainInboxDrawer.jsx`, MCP `backend/mcp/brainTools.js:296` |
| 2 | Provisional assertions | `BrainAssertion.provisional` (`schema.prisma:1669`) | ingest/projectors | counted in `cockpitRoutes.js:34` |
| 3 | Partner / vendor review | `PartnerReviewDecision`, `PartnerLearnedRule` (`schema.prisma:1768-1809`) | `partnerReviewRoutes.js` (`/api/brain/partners/review`, `/batch-review` at `:188`) | admin UI via those routes |
| 4 | Identity/seed merge review | `BrainSeedReview` (`schema.prisma:1894`) | unknown (see 2.3) | unknown |
| 5 | Recommendations / actions | `BrainAction` (`schema.prisma:1931`) | `actionRoutes.js` | cockpit (`cockpitRoutes.js:61`) |
| 6 | Hypotheses / inferences | `BrainEntity` type `Hypothesis`, `BrainInference` (`schema.prisma:1718`) | `hypothesisEngine.js` (cron 03:30), `inferenceEngine.js` | cockpit/insights panels |
| 7 | Owner interview | `BrainOwnerInterviewSession/Answer` (`schema.prisma:1843-1892`), `HubOwnerInterviewView.jsx` | designed questionnaire | Hub |
| 8 | Food-ops mapping questions | **plain JSON files** `review[]` in `.tmp/mapping/*.json`; schema in `scripts/food-ops.cjs:20-21` | LLM/agent mapping proposals | the owner, via chat; answers come back as edited mapping files applied by `food-ops.cjs apply-mapping` |
| 9 | Food-ops receipt scope | `CostObservation.scope/scopeSource/scopeAt`, `VendorItem.defaultScope` (`schema.prisma:~2140-2171`), `backend/api/foodOps/receiptScope.js`, routes at `backend/api/routes/foodOps.js:90+` | receipt parsers | owner assigns personal/business (new, in progress) |
| 10 | Parse failures | `parseState: 'review_required'` + stable reason codes in `receipts/wedgeReceipt.js:312`, `receipts/eastsideReceipt.js:393`, `vendorInvoices/htmlOrders.js:243`, `vendorInvoices/pdfInvoices.js:207` | parsers (exact-to-the-cent reconciliation) | CLI output only [INFERENCE: not persisted as a queue] |
| 11 | Agent-authored markdown | `docs/agent-requests/*.md`, `docs/financial-accuracy-handoff.md`, `docs/handoff-planner-schedule-revenue-2026-07-19.md`, local `/.tmp/ACTIVE_HANDOFF.md` (per `AGENTS.md:41-47`), `.tmp/vendor-discovery.md` | any agent | the owner reads prose |
| 12 | Hub "routing" notifications | `routeToHub` in `triageEngine.js:25-58` posts a message for each deferred item | triage cron | Hub spaces |

There is no shared item type, no shared lifecycle, no shared priority, no cross-surface dedupe, and no shared record of "what the owner decided and what it taught us."

### 2.2 Queue size, age, resolution (production, read-only, 2026-10-08)

`BrainInboxItem` (6,377 rows; earliest 2026-04-23):

- `pending` **5,309**, `triaged` 1,061, `processed` 7.
- Pending by source: **gmail 5,304**, hub_localist_order 5. Triaged by source: gmail 1,057, admin_ux 4.
- Pending age: median **21.7 days**; 5,286 older than 7 days; 233 older than 30; 5 older than 90.
- Pending by week of capture: 5,023 in the week of 2026-09-14 (a one-off Gmail thread backfill burst), 228 in the week of 2026-08-31, then 2-27 per week.
- Resolved items: median capture-to-processed **1.8 hours** (these were effectively auto-triaged, not human-reviewed).
- **Only 1 item was triaged in the last 30 days** despite the triage cron reporting `success` 22 times in 30 days.
- Pending items by `triageHint` shape: **5,076 carry only `{ledgerEventId}`** (never classified); 228 carry a full classifier hint (225 `vendor_price` / `ingredient-unresolved`, 2 `task` / `low-confidence`, 1 `event` / `planner-unavailable`); 5 are Localist order payloads.

Why 5,076 items are stuck (code evidence): `runTriagePass` selects only `status: 'pending', triageHint: { equals: Prisma.AnyNull }` (`backend/api/brain/triageEngine.js:64`). Gmail sync creates inbox items **with** `triageHint = {ledgerEventId}` (`gmailSync.js:1181-1190`; the same field is read at `inboxRoutes.js:257`). So Gmail-synced items are excluded from the triage selector and can only be cleared by a human clicking one at a time. `[INFERENCE]` this is an unintended interaction between two features, not a policy; confirm by tracing `createInbox`.

Other tables:

- `BrainAction` (the "decisions" layer): **0 rows**. `docs/brain-superpower-plan.md:54-58` states layer 5 (outcomes) is not populated; the data confirms nothing is recorded as proposed, accepted, completed or dismissed.
- `BrainSeedReview`: **8 rows, all `pending`, median age 173 days, `resolvedBy` never set**. A repo-wide search of `backend/ scripts/ src/` found no `prisma.brainSeedReview` reader or writer: orphaned `[INFERENCE]` (could be written via raw SQL elsewhere).
- Provisional assertions: 0 of 12,782 current assertions (the provisional workflow is not producing review work).
- `BrainInference`: 764 rows, **0 active, all 764 stale** (103 explicitly retired as "type no longer computed", others "not-recomputed"). The `inference-run` job recorded **20 `error` runs and 0 `success` runs in the last 30 days** (errors observed: Prisma connection-pool timeouts and "can't reach database" on `ledgerEvent.count()`).
- Hypotheses: 3 entities, all `collecting`; none confirmed or rejected.
- Owner interview answers: 0 rows.
- Operational job failures (30 days) that also land on the owner's plate as noise: `google-business-profile-sync` error 30/30 (Google quota), `local-budget-sync` error 14, `local-budget-items-sync` error 2. These are alerts, not reviews, but there is no separation between "needs a decision" and "needs a fix".

### 2.3 The one closed loop that exists is tiny and mostly write-only

`PartnerReviewDecision` has 54 rows (28 batch approvals, 16 field approvals, 6 relationship approvals, 3 rejections, 1 merge), **0 reverted**. Each stores `proposedValue`, `chosenValue`, `featureSnapshot`, `ruleVersion`, `supersedesId`, `revertedAt`, which is a good audit shape.

`PartnerLearnedRule` has 8 rows, all enabled, **`lastAppliedAt` never set (0 applications recorded)**. The only read site is the vendor-identity lookup `backend/api/brain/ledger.js:175-178`. The 7 `partner_field` rules written at `partnerReviewRoutes.js:296-299` have no reader I could find (`[INFERENCE]` write-only), and every rule is created with `confidence: 1` and unconditional support/success increments (`:246`, `:254`, `:298`), i.e. confidence is a constant, not a measured quantity. No undo or revert UI was found despite `revertedAt`.

Net effect: the owner answered 54 questions; the system has demonstrably reused those answers 0 times by its own accounting.

### 2.4 The classifier gate exists but is not feeding on decisions

`backend/api/brain/ingest/engine.js:42-45,78-102` defines per-intent auto-apply thresholds and `computeNeedsConfirm` reasons (`medical-always-confirm`, `customer-unresolved`, `ingredient-unresolved`, `event-always-confirm`, `low-confidence`); `triageEngine.js:17` uses `AUTO_ACT_THRESHOLD = 0.85`. When the engine does not apply, it leaves the item pending with a `triageHint`. There is **no measurement** of how often the owner agrees with the engine's proposal, no recalibration, and no path from "owner confirmed X" to "next similar item auto-resolves". 225 of the 228 classified-but-pending items are one repeating class (`vendor_price` with an unresolved ingredient), the exact kind of thing a single owner decision on the vendor item (or ingredient alias) would resolve for every future instance. Ingredient identity now lives in Food Ops (`VendorItem`/`StockProduct`), so these two queues overlap `[INFERENCE]`.

### 2.5 Case-study evidence: food-ops mapping review questions

State of `VendorItem`: **652 mapped, 368 ignored, 351 unmapped** (Food Operations Core, `docs/architecture/food-operations-core-plan.md` sections 4a/4b).

Mapping proposal files in `.tmp/mapping/` carry `review[]` rows of `{identityKey, description, question}`: **364 rows across 5 files** (eastside 302, wedge 23, vendors1 16, units-vendors 12, vendors2 11), with duplicates across files (the plan test at `backend/api/foodOps/__tests__/mappingPlan.test.js:209-213` counts distinct review items). Keyword-classified `[INFERENCE]`, question types:

- ~255 pack size / unit ("pack size? (suggested stock ...)": 76 near-identical templates, "bag weight?", "no bottle size stated", "coffee beans", "peanut butter").
- ~90 bunch/each weight for produce priced per bunch/each with no weight.
- ~10 ambiguous product identity, ~9 other.

Properties of this data that a good design must exploit:

- Questions are **highly templated** and mostly answerable from **other evidence the system already has**: the same product's pack text on another vendor's invoice; the vendor's own site/price list (previously found in Gmail price-list emails; owner noted the stored price lists are the same ones in Gmail and mostly clutter); price-per-unit sanity ranges; USDA-style default bunch weights for produce; density and dimension from the matched `StockProduct`.
- One owner answer should generalise: "a bunch of cilantro = N oz" applies to every cilantro-bunch item at every vendor.
- Answers are expensive for the owner to *produce* (needs a physical-world fact) but cheap to *confirm* (pick from 3 ranked candidates).
- Today `review[]` is **not persisted as a queue**. It lives in ignorable scratch JSON. The apply path (`scripts/food-ops.cjs apply-mapping`, `backend/api/foodOps/mappingPlan.js`) never overwrites an existing owner decision and skips rows that fail pack/dimension validation, which is the right safety property to keep.
- The same unmapped items matter at different dollar values: receipts are indicative retail, vendor invoices are wholesale pack costs (`food-operations-core-plan.md:~149-162`). Ranking by spend and recency should shrink the list the owner ever needs to see.

### 2.6 Case-study evidence: personal vs business receipt scope

Built in `backend/api/foodOps/receiptScope.js` (SCOPES at `:19`, `SUGGESTION_MIN_EVIDENCE = 2` at `:21`, `effectiveScope` precedence tested at `__tests__/receiptScope.test.js:110-125`): observation-level owner decision beats item default beats suggestion; a suggestion needs at least 2 owner decisions that all agree for that vendor item; `setDefaultScope` at `:344` stores "always business/personal for this item". Scope never alters price evidence (reporting only).

Context: the Wedge Gmail receipts run 2026-07-03 to 2026-10-05 (59 receipts, 653 lines, 255 items); Eastside receipts are `.eml` files (476 receipts, 2,674 lines, 925 items; about half of Eastside spend has no emailed receipt). Owner policy: **from April onward** personal and business purchases at the same stores need separating.

Gaps: learned defaults key only on `vendorItemId`, so a new item is always unassigned even though features such as department (e.g. household, personal care, beer/wine), vendor, tender, basket composition, day/time, or sibling lines would predict well. Suggestions have no measured precision. Owner decisions are at line level with receipt-level shortcuts only partially in place. `[INFERENCE]` The reporting use-case (spend and usage per business scope) tolerates a small error rate on small-dollar lines; a value-weighted threshold is therefore appropriate.

### 2.7 Case-study evidence: email / knowledge-graph triage lists

Described in 2.2: 5,304 pending Gmail items, 99%+ unclassified because of the selector bug; the 228 that were classified are one repeating class. The Gmail sync also feeds ledger events, source documents and vendor-document extractors (`gmailVendorDocumentSync.js`, `vendorInvoiceExtractor.js`) that already know a message is, e.g., a vendor invoice, a receipt, a marketing email or a known sender. `[INFERENCE]` most of the 5,076 never needed a human: they are newsletters, notifications and already-ingested documents whose ledger events exist.

### 2.8 Other producers of "things the owner must parse" (found)

- `docs/agent-requests/` (`README.md` says: execution blockers and required owner inputs): `2026-08-capital-growth-requests.md`, `2026-08-15-hub-next-session.md`. Prose lists with no machine-readable status.
- Handoff docs listed in 2.1 row 11; `AGENTS.md:8-12` already requires `As of` / `Review by` metadata and retirement of stale plans, which is a manual, human-run substitute for auto-expiry.
- Owner decision candidates in architecture docs (e.g. location roster, top ingredient list, vendors that email invoices, weekly count cadence: `food-operations-core-plan.md:~81`).
- Receipt/invoice `review_required` parse failures (2.1 row 10; 5 of 476 Eastside receipts did not reconcile).
- Hub notification routing per deferred inbox item (`triageEngine.js:25-58`).
- Customer-facing review events (`review.thumbtack`, 8 ledger events) are *customer reviews*, a different meaning of "review"; keep out of scope but disambiguate naming.
- Job-failure noise (2.2).

### 2.9 Failure modes summarised

1. **Fragmentation**: 12 surfaces, no shared item model or ranking.
2. **Accumulation without expiry**: 5,309 pending, median 21.7 days, 173-day-old seed reviews, 764 inferences all stale; nothing closes itself when facts change.
3. **Selector/pipeline bugs go unseen**: the triage cron reports `success` while draining ~0 items; no metric flags "queue size not falling".
4. **Decisions are not reused**: 54 decisions, 8 rules, 0 recorded applications; confidence is hard-coded to 1.
5. **No outcomes**: 0 `BrainAction` rows, 0 interview answers; no way to tell whether a recommendation or review mattered.
6. **Questions are worded per-instance, not per-class**: 364 mapping questions collapse into a handful of templates.
7. **Value-blind ordering**: nothing is ranked by dollars at stake, risk, or time sensitivity; a 9-cent line and a vendor merge look alike.
8. **Human interface is one-at-a-time** (inbox drawer; mapping answers pasted in chat), except partner batch review.
9. **Agent output as prose** (docs/handoffs) cannot be deduped, ranked, expired or measured.
10. **Privacy and side-effect hazards**: inbox items hold raw email bodies; a review UI must never expand PII exposure or trigger outbound messages.

---

## 3. Design principles to evaluate

Treat these as hypotheses to test against the evidence, not decisions. For each, state adopt / adapt / reject and why.

1. **Decisions become reusable rules and priors.** Every owner answer is stored with its features and scope so it can generalise (item -> product family -> vendor -> category). Rules carry measured support, success/failure counts, calibrated confidence, provenance, version, and an owner-visible "why".
2. **Confidence-gated auto-resolution with audit and undo.** Auto-apply only above a calibrated threshold, per class and per dollar bucket; every automated resolution is logged, sampled for spot-check, reversible, and counted against precision.
3. **One canonical review item type.** A single table/service (working name `ReviewItem`) with: `kind`, `subject` reference (polymorphic), `question` (structured, templated), candidate answers with scores, evidence refs, `class_key` (for ask-once-apply-to-class), source agent, dedupe key, value-at-stake, urgency, state machine, expiry, resolution record (who/what/when/how: human, rule, auto, expired, superseded), and links to downstream changes. All current surfaces become producers or views.
4. **Dedupe and merge across agents.** The same question raised by two agents, or the same class raised 76 times, becomes one item with a member list; an answer fans out.
5. **Value-ranked queue.** Score = expected dollars at stake x probability the default is wrong x time sensitivity, minus cost-to-answer. Items below a floor are never shown; they take the safest default and are logged.
6. **Expiry and auto-close when facts change.** If the subject was mapped by another path, the vendor item became ignored, the email was ingested, the parse was superseded, or a newer observation resolves ambiguity, the item closes with reason `superseded` and no human time.
7. **Batch / swipe UX and "ask once, apply to a class."** The default view is a short stack of class-level cards (accept / change / skip) with preview of everything the answer would affect; keyboard/swipe on mobile; "always do this" creates a rule.
8. **Active learning.** Choose which questions to ask by expected information gain (uncertainty sampling, disagreement among candidate sources, coverage of unlabeled classes), not by arrival order. Ask the question that resolves the most future questions.
9. **North-star metric: human-minutes per week** (plus time-to-resolve, items per decision, auto-resolution rate, auto-resolution precision on audited samples, undo rate, queue age, repeat-question rate), with a target that falls and a precision floor that holds.
10. **Escalation versus silent defaults.** Define, per class, whether the safe action is "proceed with default and log", "proceed and flag in a weekly digest", or "block until answered". Blocking should be rare and explicitly tied to money, customer safety (allergen / medical constraints are always confirm in `ingest/engine.js:82-84`), or irreversible writes.
11. **Source-of-truth ownership.** Every item says which system owns the fact (e.g. Food Ops for ingredient identity, Local Budget for financial facts, Square for orders, Brain ledger for evidence). The review system routes answers into the owner system through its existing write path; it does not become a second source of truth.
12. **Privacy and no-outbound constraints** (see section 8). Items reference evidence by id, never copy raw bodies; no review step may send mail/SMS/notifications to anyone but the owner through approved channels.
13. **Agents ask better questions over time.** Agent-raising APIs should force structure (class, candidates, evidence, default, stakes) so freeform prose cannot be raised; prose handoffs are rendered *from* items, not the reverse.

---

## 4. Case studies the research must solve end to end

For each, produce: the item schema instance, the evidence and features used, the candidate-generation method, the auto-resolution policy and threshold, the owner UX (mock in words or ASCII), the rule/prior that gets written, the audit/undo path, the expected before/after human-minutes, and an offline replay result (section 6).

### 4a. Food-ops vendor-item mapping review (~350 unmapped items, 364 questions)

Goal: reduce what the owner must answer from hundreds of per-item questions to a short list of class-level decisions, then to near zero for new items.

Must address: pack-size and "bag weight" ambiguity (use sibling vendor evidence, unit-price plausibility, `parsePackText` output in `backend/api/foodOps/units.js`, stock product dimension/density); bunch/each produce weights (default weight tables with provenance, per-product family priors, owner override that applies to a class, uncertainty when unit price is wildly off); identity ambiguity (same product on two vendors, brand variants); ignore-versus-map decisions (non-ingredient packaging, personal items); the interplay with `mapping[].confidence` (`high|medium`) already present in proposal files; owner decisions are never overwritten (`mappingPlan.js`). Keep the apply path (`food-ops.cjs apply-mapping --data <file> [--apply]`, dry run default) as the only production write route, or propose its replacement with equivalent guards. Treat price lists already in the Brain and discovered in Gmail as *evidence for units*, not as review items themselves (the owner said they mostly clutter the Brain; recommend what to archive or collapse into evidence).

Also address how downstream value is used: order intervals and inventory use over interval need correct units, so rank unmapped items by how much they limit those analyses (spend share, purchase frequency), not by arrival order.

### 4b. Personal vs business receipt scope with learned defaults

Goal: the owner assigns scope once per *pattern*, not per line. Evaluate features (vendor, department, SKU/item, price band, tender, day/time, basket composition, sibling lines, historical owner decisions, household/personal-care categories already treated as excluded by default in `receipts/wedgeReceipt.js:~36-49`), model options (frequency table with Bayesian shrinkage, decision lists, small logistic model, kNN on item embeddings), calibration, value-weighted thresholds, receipt-level versus line-level assignment, and how mixed receipts present. Define the "April onward" boundary handling and how backfill from Eastside `.eml` and Local Budget evidence (Amazon / Costco line items, if present there; Local Budget is READ-ONLY) can supply labels. Replay against existing owner decisions in `CostObservation.scope` to estimate precision per threshold.

### 4c. Email / Knowledge-graph triage lists

Goal: clear the 5,309-item inbox without the owner opening them and prevent regrowth. Decompose by class (known sender and thread type, already-ingested vendor document, receipt, marketing, customer inquiry, unknown). Fix or explain the selector interaction at `triageEngine.js:64` vs `gmailSync.js:1181-1190`. Specify bulk "archive class" decisions with preview, the sender/thread-type priors that make auto-close safe, the rule for "has a ledger event and extractor handled it", which items truly need a human (customer messages, anything with a date or money obligation), and the digest format. Cover `vendor_price` / `ingredient-unresolved` (225) as a Food Ops handoff. Do not propose labelling, archiving, replying to, or modifying any Gmail message; any Gmail interaction in the future system is read-only through the repo's existing client.

### 4d. Other classes you must also cover (found in this audit; add any more you find)

- Seed/identity merge reviews (`BrainSeedReview`, partner `identity_merge`) and `PartnerLearnedRule` reuse (make the 8 rules measurable and effective).
- Stale inference and hypothesis lifecycle (764 stale, 3 collecting): should a human ever see these? Define auto-retire, auto-recompute and escalation criteria; fix or explain `inference-run` failing 20/20.
- Receipt/invoice `review_required` parse failures: persisted, deduped by reason code, auto-closed when a corrected parser re-runs; owner sees only genuinely new document shapes.
- Agent handoff / request markdown (`docs/agent-requests/`, `docs/*handoff*`): a structured "owner input needed" feed that replaces prose lists, with `As of` / `Review by` becoming enforced expiry (`AGENTS.md:9`).
- Owner interview questions (0 answers so far): are these a review type or a different product?
- Job-failure and sync-error noise: separate "needs a decision" from "needs a fix" so the queue contains only decisions.

---

## 5. Research questions

Answer each with evidence and a recommendation:

1. What is the minimal canonical `ReviewItem` model that covers all 12 surfaces without becoming a god object? Which surfaces fold in, which stay separate (and why)?
2. What is the lifecycle state machine (proposed, queued, answered, auto-resolved, superseded, expired, reverted, escalated) and which transitions are legal for humans, rules and agents?
3. How do we define a **class key** so one answer generalises correctly, and how do we avoid over-generalisation (a rule that is right for cilantro but wrong for dried herbs)?
4. How should rule confidence be computed and calibrated from owner decisions (beta posterior, isotonic/Platt calibration, conformal prediction)? What minimum support makes auto-resolution safe at each dollar level?
5. What value/risk/time score ranks the queue, and what is the "never ask" floor? How is the value of a *class* computed (sum of members) versus an item?
6. Which questions should an active-learning loop choose next to minimise total future questions? Is uncertainty sampling enough, or do we need class coverage or expected-model-change criteria?
7. Where should candidates come from (deterministic parsers, historical decisions, vendor price lists, LLM suggestions with cited evidence, reference tables), and how do we keep an LLM suggestion from being treated as ground truth? Rank cost, accuracy, and auditability.
8. What is the right owner UX for class-level batch answers on phone and desktop (swipe cards, bulk table, keyboard triage, voice)? How do we show impact preview and one-tap undo? How do we keep the owner's session under N minutes?
9. How do answers write into the system of record safely (per-domain write adapters, dry-run default, idempotency, never overwrite an owner decision, audit to ledger)?
10. How are conflicts handled (two rules disagree, owner reverses a prior decision, upstream data changes the premise)? How are rules versioned, disabled, and retroactively re-applied (with preview)?
11. How do we measure human-minutes per week? Instrumentation (open, dwell, answer, undo timing), sampling of auto-resolutions for precision, and detection of "silent queue" failures like the triage selector bug.
12. How should agents be constrained to raise structured items (SDK/helper, schema validation, rate limits, dedupe at ingest) and how are existing prose-based handoffs migrated or retired?
13. What digest/notification cadence respects the owner's attention (one daily or weekly digest, only on threshold breach), delivered only through channels permitted by section 8?
14. What is the retention and privacy model for evidence references and decision features?

---

## 6. Options to compare

Compare at least these, scoring each on: fit to owner's problem, build/maintenance cost, correctness controls, explainability, privacy, time-to-first-value (days), and risk of a second parallel system.

A. **Extend what exists**: generalise `PartnerReviewDecision` / `PartnerLearnedRule` (already has proposed/chosen value, feature snapshot, rule version, revert fields, support/success counters) into the canonical store; add class keys, calibration, expiry, value ranking.
B. **New `ReviewItem` + `ReviewDecision` + `ReviewRule` service** with thin adapters per domain; migrate producers one at a time.
C. **Adopt a labeling / human-in-the-loop queue pattern** (e.g. Label Studio style task queues, Prodigy-style binary accept/reject streams, Argilla): evaluate as UX pattern and as hosted tooling against the no-outbound, no-PII-exfiltration constraints (default: pattern only, self-hosted only).
D. **Rules engine** (decision tables / json-rules-engine style, or SQL views): deterministic, auditable, weaker at generalising from few examples.
E. **Statistical/ML classifier per class** with calibration (frequency + shrinkage, logistic regression, gradient boosting on tabular features) and conformal abstention; LLM-assisted candidate generation with citation requirements.
F. **Active-learning and weak-supervision frameworks** (uncertainty sampling, query-by-committee, Snorkel-style labeling functions combining vendor-price-list evidence, parser outputs and priors).
G. **Do less**: auto-expire and bulk-close with defaults only, no learning; establish the lower bound on what is gained by pure hygiene.
H. **Workflow/orchestration tools** (Temporal-like human tasks, BPMN approvals): evaluate and likely reject as over-built, but state why.

For each, give a concrete sketch for case 4a and 4b so the comparison is not abstract.

---

## 7. Evaluation plan (offline replay first)

No change reaches production until replay evidence exists. All replay is read-only against historical data and runs from `/.tmp/` scripts (deleted afterwards), reporting aggregates only.

1. **Decision corpus**: extract historical owner decisions with features and timestamps from `PartnerReviewDecision` (54), `CostObservation.scope`/`scopeSource` (receipt scope decisions), mapped/ignored `VendorItem` status with `mapping` provenance (652 mapped, 368 ignored), inbox `triaged` outcomes (1,061), and any `apply-mapping` history in the ledger. Report corpus size per class; where the corpus is too small, say so and estimate with cross-validation or synthetic stress tests, not assertions.
2. **Temporal replay**: for each class, train/derive rules using only decisions before time t and predict decisions after t (rolling origin). Report precision, recall (coverage), calibration curve (ECE), and value-weighted error at several thresholds.
3. **Counterfactual workload**: given the replayed policy, how many of the 364 mapping questions, N receipt lines, and 5,309 inbox items would have reached the owner? Convert to human-minutes using an explicit, stated per-item time model (seconds per single question, per class card), flagged `[INFERENCE]` unless measured.
4. **Error budget**: define a precision floor per class and dollar bucket (e.g. receipt-scope errors under $X per month tolerated; allergen/medical zero tolerance). Show the threshold that meets the budget and the resulting auto-resolution rate.
5. **Online shadow phase**: propose a shadow mode (system computes the auto-decision, human still answers, compare) with a precise promotion rule (N consecutive agreements, precision lower bound above floor at stated confidence) and demotion rule (any budget breach, undo rate above R).
6. **Sanity tests for the pipeline itself**: invariant checks that would have caught the triage-selector problem (queue not draining while cron says `success`, rule created but never applied, class with 0 applications after 30 days).
7. **Report uncertainty**: every number carries n, interval, or an explicit `[INFERENCE]` tag. Do not present a replay on 54 decisions as a precision guarantee.

---

## 8. Constraints (from `AGENTS.md` and owner rules)

- **Production write controls**: this research is read-only. Any proposed write path must go through repo services/CLIs with a dry-run default and an explicit apply step performed by the orchestrating human/agent (e.g. `food-ops.cjs apply-mapping ... [--apply]`); never reuse embedded production commands or credentials as standing authorization (`AGENTS.md:7-8`, `:35`).
- **No outbound messaging of any kind**: no email, SMS, push, Gmail drafting/labelling/modification, Supabase auth mail. Any notification channel in the proposed design must be owner-only and compatible with `AGENTS.md:95-103` (Brevo-only outbound, dry-run to the owner first, messages must orient the recipient, no unvetted auto-send). Recommend digest *surfaces* (Hub/in-app) before any push channel and state them as requiring owner approval.
- **Service-first** (`AGENTS.md:22-37`): design for the owner's completed outcome; small reversible steps; no broad audits "just in case"; narrow, scoped searches (`backend/ src/ docs/ scripts/`, never repo-root globs, which hang).
- **Local Budget (`C:/Users/user/Local Budget`) is READ-ONLY** and the source of truth for financial facts; the Brain must not duplicate it (`docs/agent-requests/README.md`).
- **No secrets, no PII in the deliverable or in tracked files.** Do not read `.env*` or token files. Evidence is referenced by id; counts and class names only. Test fixtures, if proposed, are synthetic. Remove scratch scripts from `/.tmp/` when done; never commit probes (`AGENTS.md:32`).
- **Do not read `.tmp/ACTIVE_HANDOFF.md`**; it is a local checkpoint, not evidence.
- **Honor schema conventions**: Prisma migrations applied through the repo's controlled process; never `prisma format`; CommonJS backend; React SPA; routes are admin-only unless stated; crons are GET requests defined in `vercel.json`.
- **Do not revive retired surfaces or legacy stores** (Firebase; `api/` legacy handlers).
- **Internal tools must never leak into the public index** (`AGENTS.md:20`).
- Treat dated handoffs as snapshots; confirm in code or the named system of record before relying on them (`AGENTS.md:8`).

---

## 9. Required deliverable

One markdown report, under ~500 lines, no PII, no secrets, with these sections:

1. **Recommendation** (one page): chosen option(s) from section 6, the target end state, and what is explicitly rejected. State the expected reduction in human-minutes per week at 30, 90 and 180 days with ranges and assumptions.
2. **Data model**: tables/columns/indexes (Prisma-style sketch) for the canonical item, decision, rule, member/dedupe link, audit/undo log, class key, evidence reference, and metrics; the state machine; how existing tables (`BrainInboxItem`, `BrainSeedReview`, `PartnerReviewDecision`, `PartnerLearnedRule`, `BrainAction`, food-ops `review[]`, receipt scope columns) map or are retired. Explicit cutover per surface (no long-lived dual systems or compatibility shims).
3. **Service and API design**: producer SDK/helper contract for agents (structured raise), resolver engine (rules + models + thresholds), write adapters per domain, undo, cron/worker needs, admin routes, and where each lives (`backend/api/...`).
4. **UX design**: queue ranking, class cards, batch actions, impact preview, undo, mobile flow, digest; wireframes in text.
5. **Case-study solutions**: 4a, 4b, 4c, 4d each end to end with replay results or the exact blocking evidence gap and how to close it.
6. **Metrics and instrumentation**: north-star (human-minutes per week) and supporting metrics with definitions, collection points, targets by phase, and alarm conditions (including pipeline-health invariants from section 7.6).
7. **Phased migration plan**: Phase 0 hygiene (safe expiry/bulk-close of stale classes, fix the draining bug) through Phase N; per phase: scope, files/services touched, acceptance criteria, rollback, expected human-minutes. Each phase must deliver owner-visible value on its own.
8. **Risks and kill conditions**: explicit stop rules, e.g. auto-resolution precision below floor for two consecutive weeks demotes the class to human review; human-minutes not below baseline after phase 2 means stop and reconsider; any rule that cannot be explained to the owner in one sentence is disabled; any evidence of PII exposure or an outbound-message path halts the work.
9. **Open owner decisions** (max 5, ranked by value; each with a recommended default so the owner can say "go with default"). Do not exceed 5. This list is itself an instance of the problem being solved: keep it short.
10. **Appendix**: queries used (aggregate only), corpus sizes, replay methodology, assumptions tagged `[INFERENCE]`, sources consulted (link external research; prefer primary sources, e.g. active learning surveys, calibration/conformal prediction literature, HITL labeling tool docs).

Format requirements: concrete file/table names; numbers with n; explicit `[INFERENCE]` tags; no hand-waving about "AI will learn". A recommendation without a replay number, a rollback path, or a kill condition is incomplete.

---

## 10. What "good" looks like (acceptance for the research)

- A reader can see exactly how the 5,309 pending inbox items, the 364 mapping questions, and the personal/business receipt lines each reach a small number of class-level owner decisions, and what the system does by default for everything else.
- The design shows how one owner answer today lowers the number of questions next month, with a number and a mechanism.
- The owner can undo any automated decision in one action, and can see the weekly human-minutes trend on one screen.
- Nothing in the design requires outbound messages, new secrets, copying PII, or direct production writes outside the repo's controlled apply path.
- Existing assets (`PartnerReviewDecision` audit shape, `PartnerLearnedRule`, receipt-scope precedence, `mappingPlan.js` guards, `ingest/engine.js` gates) are reused or explicitly retired with reasons.
