# Brain review-system overhaul — research and recommendation

As of: 2026-10-08 (read-only aggregate query and source review). Prompt: [`docs/agent-requests/brain-review-system-overhaul-research-prompt.md`](../agent-requests/brain-review-system-overhaul-research-prompt.md). This is a design recommendation, not an implementation authorization. No production writes were made.

## 1. Recommendation

Build one **owner-decision queue contract** with a thin, domain-owned adapter per decision class. Do **not** migrate all existing records into one polymorphic database object, buy a hosted labeling platform, or introduce a classifier/LLM as the decision authority. Reuse the existing Prisma store, admin authentication, audit patterns, Food Ops guards, and Brain evidence IDs. Persist a small canonical request/member/decision/rule/audit layer; leave facts, financial records, actions, interviews, inferences, job failures, and parser execution in their owning systems.

The first two deliverables should be hygiene, not AI: fix the inbox selector/health signal and replace disposable mapping `review[]` files with persisted class-level questions. Next, expose receipt-scope decisions through that same queue contract without changing `CostObservation` precedence. Only then migrate inbox triage and other producers. A review item can recommend a write; only its domain adapter may perform the validated, idempotent write. Each write defaults to dry-run, never overwrites a newer owner decision, records an audit event, and offers an undo/compensation path where reversal is safe.

**30/90/180-day workload expectation:** there is no measured human-minutes baseline, no answer-duration instrumentation, and no replay corpus adequate to forecast minutes saved. Do not claim a forecast. Set provisional, falsifiable *targets* after measuring baseline `B` as the median weekly owner-minutes over the first 2 instrumented weeks: day 30 ≤ `0.90B`, day 90 ≤ `0.70B`, day 180 ≤ `0.50B`. These are `[INFERENCE — proposed targets, not forecasts]`; revise only after the first four weeks of observed time and precision. A class does not graduate to auto-resolution merely to hit these targets.

### Current evidence (live aggregate snapshot)

Read-only Prisma aggregates were queried at 2026-10-08 20:46 UTC; counts below are `n` where applicable. Raw content and personal identifiers were not selected or reported.

- Brain inbox: 6,377 rows total; 5,309 pending (`n=5,304` Gmail, `n=5` hub_localist_order), median pending age 21.7 days; 5,286 older than 7 days and 233 older than 30. Of pending items, 5,076 hints have only `ledgerEventId`, 228 have classifier hints, and 5 have order-shaped hints. The selector defect is independently confirmed in code: triage selects only pending items with a null hint (`backend/api/brain/triageEngine.js:60-69`), while Gmail sync creates `ledgerEventId` hints (`gmailSync.js:1178-1191`).
- Partner review: 54 `PartnerReviewDecision` rows (`28` batch approvals, `16` field approvals, `6` relationship approvals, `3` rejections, `1` merge); 0 reverted. Eight enabled `PartnerLearnedRule` rows, all support count 1, all never applied (`lastAppliedAt=null`). The rule lookup exists for vendor identity (`ledger.js:174-195`), but no broad learned-rule replay is supported by these data.
- `BrainSeedReview`: 8 pending. `BrainAction`: 0. Owner interview answers: 0. `BrainInference`: 764, all with `staleAt` set. Three Hypothesis entities are currently `active` by the entity status field; the prompt’s older “collecting” description is not how the current aggregate query represents their status. Counts do not establish whether an inference should be shown to a person.
- In the last 30 days, `triage-run` has 22 successful runs with `errorCount=0`; `inference-run` has 20 error-status runs with `errorCount=20`. This is an operational failure signal distinct from owner review; investigate and fix the job rather than converting each failure into a decision card.
- Food Ops: `VendorItem` status counts are 691 mapped, 317 unmapped, 368 ignored. `CostObservation` has 3,600 rows; all 3,600 have null observation-level `scope` and `scopeSource`. Effective scope precedence yields 14 business via item default and 3,586 unassigned. This means there are no persisted owner-scoped observation labels to replay as a truth set. The prompt snapshot’s 364 temporary mapping questions across five proposal files was not re-counted from scratch; treat it as the prompt’s dated count, not a new measurement.

### Explicitly reject

- Auto-closing the 5,309 pending items solely to make the queue look smaller. Close only after classifying/validating each member and preserving a reversible tombstone/audit event.
- A single `ReviewItem` table that embeds raw email, invoice, receipt, or financial payloads; a central ML classifier with global confidence; silent defaults for business/personal or money-affecting decisions; and model-generated rules without owner-confirmed examples.
- Reusing Brain review to collect customer-facing feedback. Customer reviews are a different product and must not enter this owner queue.
- Hosted third-party review/labeling services for production records: they create a second data store, increase privacy/synchronization work, and do not solve source-of-truth writes.

## 2. Data model

Treat the canonical record as a **decision request**, not a copy of the thing under review. The following Prisma-style sketch is intentionally minimal; JSON is limited to versioned, validated class-specific fields, not arbitrary agent payloads.

```prisma
model OwnerReviewRequest {
  id              String   @id @default(uuid())
  domain          String   // food_ops | brain | operations
  classKey        String   // versioned canonical decision class
  questionKey     String   // stable template key, not free-form identity
  status          String   // proposed|queued|answered|auto_resolved|superseded|expired|escalated
  priorityBand    String   // safety|money|time|routine; policy-produced
  question        Json     // schema-validated prompt/options/version; no source body
  candidateSet    Json?    // values + evidence refs + source quality, schema-versioned
  safeDisposition String   // hold|leave_unassigned|ignore_candidate|none
  raisedBy        String
  idempotencyKey  String
  sourceVersion   String?  // revision/hash of premise; never raw evidence
  dueAt           DateTime?
  resolvedAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  members         OwnerReviewMember[]
  decisions       OwnerReviewDecision[]
  @@unique([domain, idempotencyKey])
  @@index([status, priorityBand, dueAt, createdAt])
  @@index([domain, classKey, status])
}

model OwnerReviewMember {
  id           String   @id @default(uuid())
  requestId    String
  subjectType  String   // allowlisted adapter type
  subjectId    String   // source-system row ID, not copied content
  evidenceRefs String[] // opaque source IDs only
  valueCents   Int?     // only when source adapter supplies a documented value
  state        String   // open|applied|skipped|stale|conflict
  createdAt    DateTime @default(now())
  request      OwnerReviewRequest @relation(fields: [requestId], references: [id], onDelete: Restrict)
  @@unique([requestId, subjectType, subjectId])
  @@index([subjectType, subjectId])
}

model OwnerReviewDecision {
  id                 String   @id @default(uuid())
  requestId          String
  revision           Int
  actorType          String   // owner|rule|system
  answer             Json     // validated class-specific answer
  reason             String?
  featureSnapshot    Json?    // minimized allowlisted features, versioned
  ruleId             String?
  adapter            String?
  applyState         String   // not_requested|dry_run|applied|failed|compensated
  idempotencyKey     String
  supersedesDecision String?
  reversedAt         DateTime?
  createdAt          DateTime @default(now())
  request            OwnerReviewRequest @relation(fields: [requestId], references: [id], onDelete: Restrict)
  @@unique([requestId, revision])
  @@unique([idempotencyKey])
  @@index([ruleId, createdAt])
}

model OwnerReviewRule {
  id                String   @id @default(uuid())
  domain            String
  classKey          String
  scopeKey          String   // exact scope first; hierarchy explicit and versioned
  featureSchema     Int
  conditions        Json
  outcome           Json
  supportCount      Int      @default(0)
  correctCount      Int      @default(0)
  errorCount        Int      @default(0)
  calibration       Json?    // method, n, interval, cohort window; never a bare confidence
  mode              String   // observe|suggest|auto
  enabled           Boolean  @default(false)
  version           Int
  lastAppliedAt     DateTime?
  disabledAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  @@unique([domain, classKey, scopeKey, version])
  @@index([domain, classKey, enabled, mode])
}

model OwnerReviewAudit {
  id             String   @id @default(uuid())
  requestId      String?
  memberId       String?
  decisionId     String?
  eventType      String   // raised|merged|answered|applied|undone|expired|superseded|conflict
  actorType      String
  beforeRef      Json?    // IDs/status/version only
  afterRef       Json?
  reasonCode     String?
  createdAt      DateTime @default(now())
  @@index([requestId, createdAt])
  @@index([memberId, createdAt])
}
```

Add a separate aggregate metric/event stream only if the existing `BrainJobRun`/audit patterns cannot represent it. It needs event names `queue_opened`, `decision_started`, `decision_submitted`, `decision_skipped`, `undo`, `auto_applied`, `precision_sampled`, with timestamp, request/class IDs, elapsed active seconds (idle gaps capped), and coarse outcome only. Never store raw question text, email body, recipient address, or arbitrary feature maps in metrics.

### Minimal lifecycle and authority

`proposed → queued` only after schema validation, dedupe, source-version check, and policy classification. Human: `queued → answered`, `expired`, `superseded`, or `escalated`; rules may move `queued → auto_resolved` only through an enabled class rule + successful domain adapter. Agents may propose/attach evidence, but cannot answer or apply. Any answered/auto-resolved decision can acquire a compensating reversal event; the original event is immutable. A source change invalidating the premises supersedes the open request and disables the affected rule pending review. A failed adapter leaves the request open/escalated and records the failure; it never reports success on a no-op.

### Class keys and confidence

Use namespaced, schema-versioned keys such as `food_ops.pack_size.mass.ingredient_family.v1`, `food_ops.receipt_scope.vendor_item.v1`, `brain.gmail.disposition.sender_thread_class.v1`, `brain.vendor_identity.normalized_descriptor.v1`, `brain.parse_failure.vendor_reason_shape.v1`. Generalize only along declared levels (exact item → exact normalized product → controlled category); no implicit string/embedding similarity promotion. Dried herbs and fresh cilantro must have different category/scope keys. Rules include the exact feature schema, source freshness, exclusions, and a conflict policy. Owner reversals decrement observed success/record an error and disable the rule until recalibration; never rewrite historical counters as though no error occurred.

A displayed score is not a calibrated probability. Start with deterministic exact-match rules and shadow logging. For eligible low-risk classes, evaluate class-level empirical precision with a one-sided 95% exact binomial lower confidence bound and temporal holdout; use beta-binomial shrinkage only for ranking/prioritization, not as safety proof. Example: with zero errors, approximately 299 independent correct examples are needed for a one-sided lower bound above 99%; 54 heterogeneous partner decisions cannot establish that guarantee. Auto-resolution is disabled when samples are dependent, labels drift, a rule has no independent held-out set, or a premise is stale. Medical/allergen, customer identity, receipt scope, payroll/tax, reconciliation, and any ambiguous financial or safety decision remain human-confirmed; zero tolerance is a policy, not a statistically inferred confidence.

## 3. Service and API design

- `backend/api/ownerReview/` owns request validation, idempotent merge, state transitions, score policy, rule versioning, audit, and undo orchestration. It does not own domain data or call an LLM to write records.
- Producer contract `raiseReview({domain, classKey, questionKey, subjectRef, evidenceRefs, candidateSet, safeDisposition, valueCents?, sourceVersion, idempotencyKey})`. Reject unknown fields, raw content, invalid evidence references, unsupported class keys, over-limit members, and duplicate idempotency keys. Return the request/member IDs and whether a duplicate merged. Per-domain schema registry supplies allowed features/options.
- `POST /api/admin/reviews/raise` is admin/service-authenticated only; no public endpoint. `GET /api/admin/reviews` returns ranked cards with minimal evidence previews. `POST /api/admin/reviews/:id/answer` validates an answer and previews affected members before applying. `POST /api/admin/reviews/:id/apply` executes only a dry-run-created, version-bound plan behind admin auth and explicit apply. `POST /api/admin/reviews/:id/undo` uses the adapter’s compensation contract. `GET /api/admin/reviews/metrics` returns weekly aggregates.
- Domain adapters: `foodOpsMappingAdapter` delegates to `mappingPlan.js`; `foodOpsScopeAdapter` delegates to `receiptScope.js`; `brainInboxAdapter` invokes the existing ingest engine on one source item after correcting selection and exposes its structured result; `partnerIdentityAdapter` uses existing partner review/ledger APIs. Adapters must re-read current state inside the write transaction and reject owner-version conflicts. Never mutate Local Budget or send messages; finance stays owned by Local Budget.
- Worker/cron: separate raising/dedupe from applying. The worker uses bounded batches and records candidate/processed/applied/deferred/errors. A successful no-work pass is `no_new_data`; nonzero eligible backlog with zero progress across two consecutive runs triggers an admin-only health alert. No outbound notification: surface in the admin queue. Retries are idempotent and bounded; failed records remain visible.

### Queue priority

First apply hard safety classes, then rank within a band by expected avoidable loss: `priority = (documented value at risk × estimated error risk × time sensitivity) + class coverage gain − owner answer cost`. Unknown values are “unknown,” never zero. For a class card, sum member expected loss with a cap and show the top contributors; individual low-value lines remain expandable. Never ask if the request is stale/duplicate/answered, if expected avoidable harm is lower than the answer cost and the safe disposition is valid, or if the source record already has an authoritative value. If blocked by unresolved high-risk ambiguity, show it regardless of dollar amount.

## 4. UX design

Desktop queue: tabs `Needs decision`, `Applied in shadow`, `History`; fixed counts for oldest, safety/money, and conflicts. Each class card shows one templated question, top 3 candidates with source and freshness, `n` members, represented dollars only when known, safe fallback, and the exact effects of “apply to all.” Controls: **Accept class**, **Edit**, **Apply to selected**, **Skip**, **Escalate**. Never default the button to Apply. A preview lists member IDs/descriptions and current→proposed values, with stale/owner-overridden rows excluded and counted.

Mobile: one card at a time, large explicit answer buttons, expandable evidence references (opens source in existing authenticated surface), and preview count before commit. No swipe-to-apply. Keyboard shortcuts only on desktop and only after focus/context display. A batch requires a final explicit apply confirmation with member count and high-level impact; immediate undo is available from toast and history. Undo shows which records can be compensated; non-reversible items are clearly labeled before commit.

Weekly in-app digest: one summary card on the admin home with new high-risk decisions, stale cards, failed applies, auto-resolution audit sample, and human-minutes trend against the two-week baseline. No push/email/SMS. Do not route one hub notification per inbox member; aggregate by class and expose only to the owner.

Text wireframe:

```text
Owner decisions                         Week: 12 min (baseline 18)  [History]
Needs decision 7 | Conflicts 1 | Shadow 42

[Money / high impact]  Food Ops · pack size · 18 items
Question: Are these matching vendor packs 5 lb each?
Evidence: 3 sibling invoices agree; 2 product-page sizes differ (freshness shown)
Potential impact: $1,280 observed spend · 7 items block interval-rate analysis
Safe if unsure: leave unmapped
[Accept for 13] [Review 5] [Skip] [Preview]

Preview: 13 writes; 5 remain open; 0 existing owner values overwritten.
[Cancel] [Apply 13 changes]                     [Undo last action]
```

## 5. Case studies

### 5a. Food Ops vendor-item mapping

**Live base:** 317 unmapped, 691 mapped, 368 ignored (`n=1,376` VendorItems); prompt snapshot reported 364 questions in temporary `review[]` files. Current code keeps proposals in JSON and `apply-mapping` requires explicit `--apply`; the plan skips bad/owner-decided rows and blocks contradictory whole-file inputs (`mappingPlan.js:10-13,25-41,120-130`; `scripts/food-ops.cjs`). Keep those controls.

**Request instance:** `domain=food_ops`, `classKey=food_ops.pack_size.mass.ingredient_family.v1`, `questionKey=confirm_pack_conversion`, members reference vendor-item IDs, candidates carry `stockKey`, normalized pack quantity/unit, cited sibling/vendor-list source refs, parser interpretation, and conversion; source version is vendor item update/version. Do not place raw invoice/email text in the item. Candidate generator order: same exact SKU/pack from independent invoice → exact UPC/product list match → `parsePackText` deterministic result → dimensional plausibility check (mass/volume/each must match stock product; density only if explicitly defined) → cited web/vendor evidence as an untrusted candidate. LLM may normalize candidate text but cannot establish missing physical pack size. If sources conflict, preserve candidates and ask.

Group questions by controlled stock product + dimension + pack statement, not word similarity. Ask once when the evidence can transfer; keep vendor-specific conversion when products/pack labels differ. A class answer preview is split into applicable member groups and excludes any owner-mapped item. Rank by observed spend, number of months/events blocked, unit uncertainty, and recurrence; 76 identical boilerplate questions should not create 76 cards. Do not estimate bunch/each weight without owner confirmation or reliable explicit evidence.

**Policy / UX:** mapping only auto-applies when exact deterministic evidence agrees across independent source records and an existing controlled conversion, after shadow evaluation; otherwise show three candidates plus `leave unmapped`. No automatic mapping based solely on spend or model score. Adapter calls the existing guarded plan, then explicit apply. Undo restores previous mapping only if the current value/version still equals the applied value; otherwise it escalates rather than clobbering later owner work.

**Replay:** no valid temporal precision/coverage replay is available. The 364 prompt-snapshot questions are scratch proposal data, not a dated decision/outcome corpus; current mapping status is not ground truth for the correct pack. Required to close gap: preserve class key, candidate set, source IDs/freshness, owner choice, timestamp, and before/after pack conversion for every future decision; construct a de-identified historical adjudication set with owner-confirmed truth before trying to replay. Report current 317 unmapped as the reachable queue size, not “questions saved.”

### 5b. Personal vs business receipt scope

**Live base:** 3,600 observations: `n=14` effectively business via explicit vendor-item default; `n=3,586` unassigned. All 3,600 observation-level scopes are null. Existing precedence is observation decision → item default → unassigned; suggestions use at least two consistent owner-scoped observations, and rule-written scopes do not count as owner evidence (`receiptScope.js:75-103,203-220`). Keep this precedence and do not broaden current exact-item defaults silently.

**Request instance:** `classKey=food_ops.receipt_scope.vendor_item.v1`, one member per vendor item or explicitly selected receipt basket, with receipt observation IDs as members and evidence refs only. Features may include vendor, stable SKU/item identity, controlled department, price band, time bucket, tender class, basket siblings and owner-confirmed history; prohibit inferred household identity, raw receipt bodies, or broad “all groceries are business” correlations. Unknown tender/basket evidence abstains.

**Candidate generation and UX:** explicit previous owner decision for the *same* item/default first; then repeated exact-item owner decisions; then an owner-selectable class pattern (department/vendor/price band) shown as a suggestion only. The current 14 business defaults are owner-configured policy, not training labels. Display business/personal/unassigned, source, `n`, sample receipts, mixed/contradictory votes, and effect on reports before apply. A receipt-level answer may affect only currently unassigned lines and must preview exceptions; changing a default never rewrites observation-level owner decisions.

**Auto policy:** retain exact, owner-set `VendorItem.defaultScope`; no model-based auto-classification of new items or mixed basket lines. A new class rule remains suggestion-only until reviewed and its exact feature scope is explicit. Undo clears/compensates only values still owned by that decision; conflicting later decisions are preserved. Household-sensitive items remain unassigned until owner decides.

**Replay:** impossible from current rows because there are zero observation-level scope labels (`n=3,600` null); defaults label only 14 effective rows and are current policy, not a historical sample. Start shadow logging after each owner action, with source-versioned feature snapshots and owner labels. Do not report a precision or workload-saving number from today’s 14 defaults.

### 5c. Email / knowledge-graph triage

**Live base:** 5,309 pending items, including 5,304 Gmail. 5,076 have only `ledgerEventId` in `triageHint`; 228 carry structured hints. `runTriagePass` selects only pending items where `triageHint` is database null. Gmail sync uses a ledger event ID hint for thread idempotency. When triage defers an item it writes a non-null structured hint, so it will not be retried by this selector. `withJobRun` considers a zero-error empty pass successful; the persisted job-run model already tracks items processed/written, so health can include eligible backlog and zero progress.

**Plan:** first fix selection by separating sync idempotency/source identity from classifier result (for example, dedicated nullable ledger-event/source key or a typed hint state) and add a migration/read path that classifies old `ledgerEventId`-only hints as untriaged. Deferred results need explicit retryable vs human-needed status; do not re-run repeatedly with unchanged evidence. Generate class-level cards for known sender+thread type and dedupe by source document/thread ID. Candidate classes: already-ingested vendor invoice/receipt (link existing record, not duplicate import), marketing/low-value noise (trash only under existing high-confidence policy), owner/customer/contract content (human review or preserve as inbox), unsupported/changed document (parser-shape class), and unknown (leave open). Do not expose `rawContent` on queue cards; store inbox IDs and show safe summaries/reference only.

**Auto policy:** existing ingest intent thresholds are intent-specific and medical/identity confirmation is guarded (`ingest/engine.js:80+`); reuse them, but never treat classifier confidence alone as calibrated precision. Old message disposal requires exact class policy plus sampled audit; customer, money, legal, health, and ambiguous messages stay human-reviewed. One class-level resolution may update duplicate queue members only after verifying each source still matches and no newer owner action exists.

**Replay:** the current aggregate provides queue/hint shapes, not adjudicated outcomes for the pending 5,309. The 228 classifier-hinted items are not a labeled test set, and previously triaged/processed status is not proof of correctness. Run offline replay only after joining `BrainInboxItem` to stable ledger/source IDs, decisions/outcomes, and time-stamped features; blind-sample a human-labeled set stratified by class before calibrating precision. The implementation defect itself is already proven from the selector and hint-writing paths; it requires no ML study to fix.

### 5d. Other decision-like work

- **Seed/identity merge:** 8 `BrainSeedReview` rows are pending, and current source review found no application reader/writer beyond seed creation (prompt points to `prisma/seed-brain.js`). Keep identity merge separate from ordinary classification; show both entities and evidence links, exact affected references, and transaction preview. Do not auto-merge. Extend partner decision reuse only after measuring rule applications, errors, and reversals; current 8 rules have support 1 and 0 applications. Rollback via inverse graph/reference updates only when no later references conflict; otherwise escalate.
- **Stale inference/hypotheses:** all 764 inferences have `staleAt`; three hypotheses are `active`. These are computed signals, not owner decisions, so keep in the insights/freshness surface. Recompute when source dependencies are fresh; retire stale results when their computation family is removed; expose a queue item only for a specific owner choice, not “inference stale.” Prompt snapshot reported inference job errors; current data query confirms stale rows but does not establish current run error counts. `BrainJobRun` is the source to inspect for that. Do not ask the owner to repair infrastructure.
- **Parser `review_required`:** parser returns stable reason codes and suppresses lines on hard validation failure (e.g. Wedge subtotal/total/tender checks; `wedgeReceipt.js:289-321`; HTML/PDF parsers have similar checks and tests). Preserve a durable parse-attempt event keyed by source document ID + parser version + reason shape. Group same-shape failures; close/supersede when a newer parser version succeeds. Raw receipt/invoice content stays in its source store. Separate “needs parser fix” from “needs owner decision”; owner sees only unresolved item identity, reason, and safe preview. Owner cannot fix a parser bug by approving questionable math.
- **Agent handoffs/requests:** require `requestId`, structured class, `As of`, `Review by`, owner-input schema, and expiration policy. Convert only explicit owner-blocking fields into a review request; links to docs remain evidence references. Expired snapshots auto-close as expired, never silently convert stale prose into a current decision. Keep work plans/history outside queue.
- **Owner interview:** separate product for authored business knowledge, not a queue item. Link a submitted answer to a review class only by explicit owner action; preserve its version/revision and applicability as current schema does.
- **Provisional assertions:** keep these as explicit, expiring hypothesis/evidence records. Promote to a review request only when a named owner decision is needed; do not silently treat an unconfirmed assertion as settled policy or mix it with customer-facing reviews.
- **Job failures:** keep as operational incidents with owner/admin responsibility and remediation, not decisions. Show pipeline alarms separately; only raise a review request if a human business choice is actually needed.

## 6. Options compared

Scores: 1=poor, 5=strong. Time is an `[INFERENCE]` engineering estimate for a usable first slice, not a commitment. No software purchase/build should precede the selector fix.

| Option | Fit | Cost | Controls | Explainability | Privacy | First value | Parallel-system risk | Case 4a sketch | Case 4b sketch |
|---|---:|---:|---:|---:|---:|---|---|---|---|
| A. Extend `PartnerReviewDecision` / `PartnerLearnedRule` | 3 | 3 | 3 | 4 | 5 | ~5–10d | Low initially; schema overloaded | Store mapping answers as partner decisions and reuse rules; awkwardly vendor-centric and cannot hold member lifecycle/expiry cleanly. | Add scope task type/rules there; still couples food receipt state to vendor review. |
| B. New request/decision/rule service | 5 | 2 | 5 | 5 | 5 | ~10–20d | Medium unless old writes migrate by adapter | Class-level requests + `mappingPlan` adapter; canonical history and explicit members. | Use receipt scope adapter while preserving observation/default precedence. **Recommended with narrow scope.** |
| C. Labeling tool pattern (Label Studio / Argilla / Prodigy) | 4 | 3 | 3 | 4 | 2 | ~3–10d for UX prototype | High if deployed as second data store | Borrow class cards, candidate choices, batch review; keep mapping writes in this app. | Borrow item-level annotation UX but not export/store receipt data externally. |
| D. Deterministic rules/decision tables | 4 | 2 | 5 | 5 | 5 | ~2–5d | Low | Enforce dimensional compatibility, exact SKU evidence, and “leave unmapped”; cannot infer unlabeled pack sizes. | Keep explicit owner defaults and precedence; do not classify mixed receipts by broad rules. |
| E. Per-class statistical ML + calibration | 2 | 5 | 2 today | 2 | 4 local | >30d | Medium | A future candidate ranker after adjudicated temporal corpus; current 54 heterogeneous decisions are inadequate. | No trained classifier with zero observation-level scope labels; reject now. |
| F. Active learning / weak supervision | 3 | 4 | 3 | 3 | 4 local | ~15–30d | Medium | Rank uncertainty/disagreement among price-list and parser sources; owner still confirms pack truth. | Identify repeated ambiguous patterns; never learn policy from its own suggestions. |
| G. Hygiene only | 4 | 1 | 3 | 4 | 5 | ~1–3d | Low | Expire stale proposal files after preserving counts; does not resolve physical pack facts. | Leave unassigned or clear obsolete suggestions; cannot learn personal/business patterns. |
| H. Workflow orchestration (Temporal/BPMN) | 1 | 5 | 4 | 4 | 3 | >30d | High | Overbuilt for a review card + idempotent adapter. | Overbuilt; no cross-system long-running workflow is required. |

Adopt B as the durable narrow service, D as the initial decision policy, G for reversible hygiene, and C only as a UX reference. A is useful as a migration source/audit shape, not as the canonical store. E/F are later candidate-generation/ranking techniques, not prerequisites or authorities. H is rejected.

## 7. Metrics and offline evaluation

### Metrics

- **North star:** owner human-minutes/week spent resolving agent-raised questions. Measure active time from `decision_started` to submission, cap idle gaps at 60 seconds, exclude page-background time; ask for one weekly total as a cross-check. Report median and p90 over rolling 4 weeks, with `n` sessions and missing-time share. Never call item-count reduction “time saved.”
- **Queue health:** eligible backlog at start/end, oldest age, arrivals/resolutions/expiries, duplicate-member ratio, and processed/applied/deferred/error counts per run. Alarm when a job reports success and has eligible backlog but zero progress twice, or when incoming > resolved for 7 days. Existing `BrainJobRun` can carry progress counts; its current success function treats an empty zero-error summary as `success` (`jobRuns.js:38-51`).
- **Decision quality:** per-class coverage, precision and one-sided 95% lower bound on an independently labeled temporal holdout; rule applications, sampled audits, corrections/undo, conflicts, source freshness, and abstention reason. Always include `n`. No overall pooled precision across unlike classes.
- **Efficiency:** members per owner answer, duplicate questions avoided, median answer time, repeat-question rate within 30/90 days, and class coverage gained per answer. Report high-risk classes separately.
- **Safety:** writes blocked due to version mismatch, owner decision preserved, audit completeness, undo success/failure, evidence reference access failures, and any PII exposure incident. Any privacy leak is an immediate kill condition.

### Offline replay and numerical blockers

The only broadly reusable answer corpus confirmed is 54 partner decisions with 8 rules; the 54 decisions are heterogeneous types and the 8 rules have support 1, zero recorded application, and no reversals. This cannot support a per-class temporal replay or precision claim. Scope has 0 observation-level labels among 3,600 observations. Mapping proposal questions are not persisted with owner answers/timestamps/source snapshots. Inbox has no established truth labels for the 5,309 pending items. Therefore **valid offline precision/recall, calibration curves, saved-question count, or counterfactual minutes are currently `n/a`, not zero and not estimated**.

Replay plan once labels exist: split strictly by time (rolling origin), train rule/candidate ranking on prior owner decisions only, evaluate on later owner-labeled records; report per-class confusion matrix, coverage, abstention, precision lower bound, calibration/reliability plot, and sample size. For dependent repeats (same vendor/item/thread), group by class/entity/source so siblings cannot leak across train/test. Compare against three baselines: current behavior, deterministic exact-match-only, and hygiene-only. Run a counterfactual only over eligible members with observed answer durations; compute minutes from measured human action time, not assumed minutes per row. Synthetic fixtures verify gates and edge cases only; they are not evidence of production precision.

### Promotion / shadow gates

1. Shadow mode logs proposed outcome and evidence; owner still answers. No write; sample random accepted and abstained items, stratified by class and value.
2. Keep a class in shadow until its holdout’s one-sided 95% precision lower bound clears the class floor (initial low-risk floor 99%; `n≈299` independent all-correct cases are needed for that bound) and at least 30 consecutive shadow decisions agree. The 30 streak is a stability check, not a substitute for the bound.
3. Start `suggest` mode; owner explicitly accepts/rejects. Only then consider `auto` for reversible low-risk exact deterministic classes. For any safety/financial/scope class, remain human-confirmed. Revert to shadow on floor breach, source drift, one serious harm, unexpected undo spike, or two consecutive no-progress queue-health alarms.
4. For 4a, no physical pack conversion auto-apply unless exact independent evidence and dimensional checks agree. For 4b, preserve owner-set exact-item defaults only. For 4c, existing high-confidence trash behavior must be audited separately; no broad auto-disposition on the basis of the 228 hinted items.

## 8. Phased migration

| Phase | Work and likely files | Acceptance | Rollback / kill |
|---|---|---|---|
| 0. Contain & measure (1–3 days `[INFERENCE]`) | Fix triage eligibility/idempotency in `backend/api/brain/triageEngine.js`, `gmailSync.js`; make empty pass report `no_new_data`/blocked if backlog exists; add invariant coverage in Brain tests. No bulk close. | Repeated pass progresses eligible items or emits explicit per-item deferral; pending/hint counts visible; no outbound messages. | Revert selector only if duplicate ingest occurs; stop triage writes and retain queue if invariant fails. |
| 1. Canonical queue foundation (~1–2 weeks `[INFERENCE]`) | Prisma request/member/decision/rule/audit models; `backend/api/ownerReview/`; admin-only routes and UI; internal metrics. | Idempotent raise/merge; legal transitions; dry-run/apply/undo; PII-free metric test; all writes version-checked. | Feature flag off leaves old surfaces operational; no data migration yet. |
| 2. Mapping adapter (~1 week `[INFERENCE]`) | `mappingPlan.js`, `scripts/food-ops.cjs`, current mapping file importer. Import proposed rows with hashes/IDs; retain current guard against owner overwrite. | Existing dry-run plans match; contradiction/conflict/skip preserved; mapping class cards group templates; no invented pack conversions. | Disable adapter; proposals remain in original JSON, no existing VendorItem changes are rolled back automatically. |
| 3. Receipt-scope adapter (~1 week `[INFERENCE]`) | `receiptScope.js`, `backend/api/routes/foodOps.js`, `AdminFoodOpsReceiptsPage.jsx`. | Existing precedence/tests unchanged; scope decisions and defaults previewed; suggestions never count as owner evidence; `3,586` unassigned visible without auto-assignment. | Stop queue adapter; existing explicit owner scope fields remain source of truth. |
| 4. Brain producer migration (2–4 weeks `[INFERENCE]`) | Partner routes/rules, inbox/gmail sync, seed reviews, action links; preserve current source stores. | Decision ledger shows adapter result/reversal; seed review can be resolved; inbox no-progress invariant holds; no raw email bodies in new tables. | Route each producer back to existing endpoint; keep canonical decisions/audit append-only. |
| 5. Remaining decision requests (after owners validate) | Parser failure references, agent-request forms, controlled decision-only handoff adapter. Keep inference/job/interview surfaces separate. | Only actual owner decisions enter queue; parse failures close on newer parser success; request expiry is enforced. | Disable each producer independently. |
| 6. Shadow and selective promotion (after replay corpus) | Class-specific rules, temporal replay CLI under `scripts/`, audit sampling dashboard. | Each class clears its published lower-bound gate and rollback works; publish n/coverage/undo results. | Turn class back to shadow; disable rule version, preserve prior owner decisions. |

Do not migrate all historical raw inbox or financial payloads. Import only stable IDs, statuses, and safe class references required for active work; old surfaces remain read-only history until each new adapter has passed acceptance. Schema migrations use the repo’s controlled Prisma migration process; this research authorizes none.

## 9. Risks and kill conditions

- Any privacy leak, outbound message, or non-admin access to owner review data: disable the surface immediately and investigate before re-enable.
- Any rule’s audited precision lower bound falls below its class floor, any material business/personal misclassification, identity merge, or parser write corrupts source facts: disable that class/version immediately and return to human review. Two consecutive weekly floor breaches kill automation for that class until fresh replay and shadow approval.
- Any stale premise, source version mismatch, unresolved duplicate, or newer owner decision: block apply; never “last writer wins.”
- If an inbox cron says success twice with eligible backlog and zero progress, page the owner in-app as pipeline health, not as 5,000 review questions. If the queue grows for 2 weeks after phase 0, stop adding producers and fix throughput/eligibility.
- If human-minutes do not fall below the two-week baseline by day 90, stop model/active-learning work and interview the owner about UX/class correctness; do not compensate by lowering confidence thresholds.
- If owner minutes trend upward for 4 weeks, or skip/undo rates rise, revert class batch behavior and inspect over-broad dedupe.
- If reversals cannot safely compensate a write, keep that adapter dry-run/human-only. No data model may promise one-tap undo where the system of record cannot honor it.

## 10. Open owner decisions (defaults recommended)

1. **What classes may ever auto-resolve?** Default: only low-risk deterministic, reversible, exact-match classes; never receipt scope, identity merge, medical/allergen, or finance decisions.
2. **Should historical pending Gmail be bulk-closed?** Default: no. Repair selector/idempotency, classify by dedupe class, and close only individually verified safe classes with a reversible audit.
3. **What weekly-minute reduction is acceptable?** Default: instrument baseline first; use provisional targets 10%/30%/50% by days 30/90/180 and do not trade off the class precision floors.
4. **Should successful review writes always require a second Apply click?** Default: yes for batch changes; single-item low-risk deterministic acceptance may apply immediately only after an impact preview and explicit owner click.
5. **Where should the queue live?** Default: admin-only Local Effort SPA, no hosted annotation service and no outbound digest.

## Implementation status in the worktree

The following is implementation progress, not a production deployment or a fresh live-data audit. The migrations have not been applied.

- Brain inbox triage now separates classification from drain eligibility and reports blocked/partial runs distinctly. The migration and regression coverage are in the worktree; verify before release.
- The canonical owner-review schema/service/API and admin queue exist locally. Vendor mapping requests can be queued in bounded batches; an owner-confirmed select/ignore applies through Food Ops’ source-version-guarded catalog helpers in the same transaction as the audited decision. Due queued requests have an admin-guarded expiry endpoint that transitions open members and records an audit event. Cost observations remain unchanged.
- No vendor mapping or invoice-price writes were warranted by the recorded dry runs: proposal files contained no new supported matches, and invoice candidates already had cost observations. Unmapped catalog items require owner review; do not infer mappings from name similarity.
- Rule storage defaults to disabled. No class has replay evidence that supports auto-resolution, and no evaluator is enabled. Existing partner-review writes are not yet migrated; retain them as the current source of truth until a compatible adapter and migration are verified.
- The receipt-scope decision surface remains on its existing guarded Food Ops path; canonical request/decision integration and producer migration remain open.

## Appendix: evidence, limitations, and sources

### Aggregate query and current code consulted

The live aggregate was obtained with a temporary read-only Prisma script selecting counts, timestamps, JSON key shapes, scope fields/defaults, and decision counters only. The temporary script was removed after the query. The reproducible queries should be formalized only if the implementation phase is authorized. Primary code references:

- Inbox and selector: `backend/api/brain/triageEngine.js:60-110`; Gmail idempotency/hint: `backend/api/brain/gmailSync.js:1178-1191`; job status: `backend/api/brain/jobRuns.js:38-51,54-75`; job run indexes/count fields: `prisma/schema.prisma:1910-1925`.
- Partner decisions/rules: `prisma/schema.prisma:1768-1809`; lookup `backend/api/brain/ledger.js:174-195`; review writes/merge `backend/api/brain/partnerReviewRoutes.js:118-175,188-222,224-258`.
- Seed, interview, action, inference: `prisma/schema.prisma:1843-1904,1931-1953`; actions API `backend/api/brain/actionRoutes.js:5-6,42-90`; interview answers remain separately versioned; inference route filters current assertions by known/superseded state `backend/api/brain/inferenceRoutes.js:63-90`.
- Food Ops: mapping guards `backend/api/foodOps/mappingPlan.js:10-13,25-41,120-130` and `scripts/food-ops.cjs`; scope precedence/suggestions `backend/api/foodOps/receiptScope.js:75-103,203-220`; parser hard-fail behavior `backend/api/foodOps/receipts/wedgeReceipt.js:289-321`; schema `prisma/schema.prisma:2129-2180`.
- Existing system direction: `docs/brain-superpower-plan.md:48-58` (facts/state/signals/decisions/outcomes separation).

### Limits

- Snapshot time is 2026-10-08; counts are not a trend. BrainAction and review records are sparse; no broad precision confidence can be inferred.
- The 30-day job-run aggregate reflects current stored `BrainJobRun` rows at the snapshot time, not a full reliability history or proof of root cause.
- Mapping proposal count and precise class distribution are carried forward from the prompt snapshot; no item-level mapping/receipt content is reproduced here.
- No replay could responsibly estimate a reduction in human minutes. Values in §1/§7 are targets and gate definitions, not observed results or predictions.

### External references

- Label Studio task and annotation workflow docs: <https://labelstud.io/guide/tasks.html>, <https://labelstud.io/guide/labeling.html> (UX/task-queue pattern only; not recommended as production storage).
- Argilla feedback data workflow: <https://docs.argilla.io/> (human-feedback workflow reference only).
- Snorkel weak-supervision/active-learning concepts: <https://docs.snorkel.ai/docs/25.4/user-guide/intro/active-learning-weak-supervision> (candidate combination/ranking, not source of truth).
- Selective calibration research: <https://arxiv.org/abs/2208.12084>; risk-control framing: <https://arxiv.org/abs/2512.12844>. These motivate explicit abstention and uncertainty bounds; they do not validate Local Effort’s rules or corpus.
