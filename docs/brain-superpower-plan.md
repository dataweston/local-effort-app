# Brain / Knowledge Graph: Superpower Plan

**Review snapshot:** live repository and database review, 2026-10-06

## Executive verdict

The Brain has a strong technical foundation but is not yet a dependable business asset. It is currently best described as a **lossless business-memory and extraction platform with an early operational cockpit**, not a trusted operations driver.

The architecture is directionally right:

1. exact source corpus and provenance,
2. append-only ledger facts,
3. entity/assertion graph,
4. derived inferences,
5. admin UI, planner surfaces, and MCP access.

The missing layer is the closed loop from **evidence → reliable current state → decision → action → measured outcome**. The immediate risk is not lack of features. It is that stale integrations, stale inferences, ambiguous lifecycle semantics, and weak source precedence make the output less trustworthy than the underlying raw data.

The goal should be a business operating system for Local Effort: every important recommendation must be current, evidence-linked, uncertainty-aware, assigned to an owner, and measurable after the decision is made.

## Current scorecard

| Capability | Current state | Verdict |
|---|---|---|
| Preserve business memory | Gmail is captured losslessly; raw source bytes, hashes, extraction status, ledger events, and provenance exist. | Strong foundation |
| Represent business relationships | The Prisma graph, aliases, FK anchors, controlled relation dictionary, and lifecycle fields are substantial. | Good, but noisy |
| Retrieve and explain | `businessMemory` consolidates corpus, ledger, graph, inferences, inbox, and owner evidence; MCP exposes the system. | Useful, keyword retrieval with an evaluation harness |
| Keep itself current | Gmail, Square orders, GA4, Merchant, and COGS are currently running; eight SLA-tracked jobs are stale. | Freshness is now semantically visible, but operations still need recovery |
| Generate business insight | Inference families exist, but the live inference run has been failing since 2026-08-15 and active inference rows are stale. | Not trustworthy yet |
| Drive operations | Inbox/triage, planner event capture, cockpit panels, operational actions, and MCP writes exist. | Early; current actions are now durable |
| Close the loop | `BrainAction` persists recommendations, decisions, completion, and outcome payloads. | Foundation added; measured recommendations are still to be populated |

## Evidence snapshot

The live audit found:

- **3,294 active entities** and **4,407 current assertions** out of 13,475 historical assertion rows. The historical volume is expected for a versioned graph, but the application needs one consistently defined “current assertion” view.
- **3,912 of 4,407 current assertions** are sourced from `python_extractor` (roughly 89%). Operationally authoritative sources are present, but extracted email assertions dominate the current graph.
- **5,062 Gmail source documents** are captured with no capture gaps. **4,008** have complete extraction and **1,054** remain partial. This is a good raw archive, but not yet complete usable business knowledge.
- The quality audit found **no same-type duplicate cluster** and no duplicate ledger source IDs, but did find cross-type name collisions such as customers/dishes/products sharing canonical names. It also found approximately **658 active entities without a current assertion**; some are valid standalone nodes, but the rate is high enough to require stewardship rather than being ignored.
- Current provisional assertions are **zero**. That means the review queue is clean, not that extraction precision is proven. A zero-provisional state can also result from auto-confirmation, retraction, or missing review instrumentation.
- Active inference rows were stale in the live audit; most families last computed on 2026-08-15, with `PREFERS` last updated 2026-09-02. The scheduled `inference-run` is failing on database reachability.
- The latest job freshness report had **eight stale jobs**, including inference, hypothesis, order projection, Google graph projection, Local Budget sync, Square reconciliation, vendor-payment reconciliation, and GBP sync. Separately, the Local Budget items sync had a malformed authorization header.
- The last recorded Square reconciliation reported **1,291 unmatched** and **3 ambiguous** records. The last Google graph projection reported **42 unmapped landing paths** and **62 unmatched search terms**; it has not been refreshed since 2026-09-10.

These figures make the priority clear: restore freshness and source trust before adding more agents, connectors, or embeddings.

## Design target

The Brain should evolve into five explicit layers:

1. **Facts** — immutable source documents and ledger events.
2. **State** — canonical entities and time-valid assertions with source precedence.
3. **Signals** — reproducible metrics and inferences with evidence, sample size, time window, uncertainty, and freshness.
4. **Decisions** — recommendations, alerts, tasks, and owner decisions with status and rationale.
5. **Outcomes** — whether the action was accepted, completed, and economically useful, written back as ledger facts.

The current system is strong through layers 1–2, partial in layer 3, has a first durable layer-4 action record, and still lacks a populated layer-5 outcome loop.

## Prioritized roadmap

### P0 — Restore trust in the substrate

**Objective:** make the existing graph safe to consult every morning.

1. Repair the failing integrations rather than adding new ones:
   - Local Budget API configuration and items authentication.
   - Prisma connection/pooling failures affecting inference, projection, and Local Budget jobs.
   - GBP quota handling with backoff and bounded requests.
   - Search Console permissions and Ads/GBP account configuration.
   - Square reconciliation and vendor-payment reconciliation coverage.
2. Backfill safely using existing cursors and idempotent writers. Every replay must report rows seen, rows written, skipped rows, errors, and unresolved identities.
3. Make freshness semantically honest in `backend/api/brain/jobRuns.js`:
   - distinguish `success`, `partial`, `blocked`, `error`, and `no_new_data`;
   - do not treat a permission-error or materially incomplete partial run as healthy;
   - include Local Budget items in the SLA registry;
   - show upstream dependency failures in the cockpit.
4. Add one admin health endpoint and one cockpit view that answer: what is stale, why, what data is affected, and what the owner can do next.

**Exit criteria:** seven consecutive days with every critical source within SLA; no critical job can be “green” while blocked; inference and projection timestamps are visible beside every derived claim; replay results are auditable.

### P0 — Make graph state and quality unambiguous

1. Add a shared current-assertion predicate/helper and use it in quality, cockpit, explore, graph, MCP, and memory retrieval. It must consistently exclude retracted, superseded, and time-expired assertions.
2. Separate historical quality metrics from current-state quality metrics. The existing quality queries can otherwise turn valid historical rows into apparent self-edge/orphan defects.
3. Define source precedence by domain. For example, Local Budget should be authoritative for cash-basis transactions; Square is authoritative for order/payment capture; planner is authoritative for scheduled work; owner corrections override extracted guesses but remain explicitly attributed.
4. Add graph quality metrics: duplicate rate, cross-type collision rate, orphan rate, self-edge rate, assertion provenance coverage, resolution confidence, extraction completeness, and unresolved-source count.
5. Keep all raw evidence and make every derived assertion explainable back to source IDs and source spans where available.

**Exit criteria:** every UI/API surface agrees on current counts; a quality report can distinguish a genuine defect from historical lineage; no new self-identity edges are admitted; source precedence is testable.

### P1 — Finish the canonical ingest and identity layer

The unified engine in `backend/api/brain/ingest/engine.js` is now real and triage/inbox paths use it. Constraint correction routes now delegate through the same classify → resolve → apply path; direct domain projectors remain explicit source-specific writers.

1. Route every capture path through one classify → resolve → apply pipeline, or explicitly retire the bypass routes. Keep preview/commit separate.
2. Make `resolveEntity` the only resolver for customers, vendors, dishes, ingredients, products, menus, and planner objects. Record match method and confidence, not just the resulting ID.
3. Normalize order line items and menu names at ingestion. Preserve the original string, attach aliases, and never mint a new canonical entity merely because a spelling changed.
4. Create a small ontology registry for entity types, relation types, cardinality, allowed self-edges, time semantics, and required provenance. The relationship dictionary should enforce these rules, not only warn.
5. Quarantine low-confidence extracted assertions instead of allowing a zero-provisional queue to imply correctness.

**Exit criteria:** deterministic replay is idempotent; stable external IDs resolve above an agreed threshold; every new entity/assertion has provenance and resolution telemetry; manual corrections improve future resolution.

### P1 — Repair and enrich the business content

Prioritize content that can change decisions, in this order:

1. **Event pricing and margin:** parse quote/charge evidence into structured `Menu`, `Offer`, `Event`, price, guest count, per-person price, payment, and close status. Stop treating email subjects as menus.
2. **Demand normalization:** map free-text order line items to canonical Dish/Product entities and distinguish anonymous demand from resolved-customer demand.
3. **Food cost and menu engineering:** connect recipes/yields, ingredient prices, COGS, volume, feedback, and selling price so the system can show contribution margin, not just price references.
4. **Feedback rollups:** connect feedback to dish/menu/event where evidence supports it; expose repeat complaints, favorites, and menu-engineering signals with sample sizes.
5. **Vendor and payment truth:** repair vendor aliases, split-name duplicates, and Square-to-bank reconciliation; use Local Budget’s authoritative cash-basis model for financial conclusions.
6. **Attachment extraction:** prioritize invoices, menus, purchase orders, and other decision-bearing attachments among the 1,054 partial Gmail documents. Preserve raw files and extraction version/status.

**Exit criteria:** the owner can answer, with citations, “what sold, at what margin, to whom, from which vendor, and what should change next?” for a recent operating period.

### P1 — Turn inferences into decisions and actions

Replace generic stale inference cards with versioned, operational signals. Each signal needs:

- question and business domain;
- as-of date and data window;
- sample size and denominator;
- source coverage and freshness;
- confidence/uncertainty;
- evidence IDs;
- expected impact;
- recommended action;
- owner, status, due date, and outcome.

First decision products should be:

- cash and COGS exceptions;
- vendor price drift and concentration risk;
- event quote close rate and margin risk;
- dish demand × profitability × feedback;
- lead follow-up and conversion aging;
- customer retention and dietary-safe repeat service;
- planner capacity and prep bottlenecks.

Introduce a first-class `BrainAction` recommendation/action/outcome record. It is now exposed through `/api/brain/actions` and included in the cockpit; accepted, deferred, in-progress, completed, and dismissed states are persisted, with evidence, owner, due date, and outcome fields. Automatic recommendation generation and outcome measurement remain follow-on work.

### P2 — Improve retrieval and agent leverage after quality is fixed

Only after P0/P1 quality and freshness are green:

1. Add hybrid retrieval: PostgreSQL full-text plus embeddings/pgvector, filtered by source permissions, entity, time, and business domain.
2. Keep `businessMemory` as the single retrieval contract for API and MCP. LLM synthesis must cite retrieved evidence and be unable to invent unsupported facts.
3. Add MCP tools for `ask`, `why`, `what changed`, `recommend`, and `record decision`, with explicit read/write scopes and provenance in every response.
4. Build a small golden evaluation set of real business questions. Score answer correctness, citation correctness, freshness, conflict handling, and PII leakage before expanding agent autonomy.

Do not make semantic search or an autonomous agent the first investment. Better retrieval over unreliable state only makes wrong answers faster.

## Operating metrics

Track these weekly in the Brain itself:

- source freshness by critical feed;
- capture completeness and extraction completeness;
- entity-resolution success and manual-correction rate;
- current assertion provenance coverage;
- duplicate, orphan, self-edge, and cross-type collision rates;
- inference freshness and blocked-signal rate;
- recommendations created, accepted, completed, and producing measured outcomes;
- owner time saved and unanswered high-value questions.

The north-star metric is not entity count or assertion count. It is **the percentage of important operating decisions that the Brain can support with current evidence and then measure afterward**.

### Implemented measurement semantics

- A current assertion has no retraction, supersession, or `knownUntil`, has started (`validFrom <= now`), and has not expired (`validUntil` is null or in the future). Quality, cockpit, explore, and business-memory retrieval use this same predicate.
- A job is healthy only when its final status is `success` or `no_new_data`; `partial`, `blocked`, and `error` remain visible and cannot satisfy an SLA.
- Resolver telemetry is persisted in job detail under `resolutionMethods` for Local Budget vendors/customers and item-sync vendors. Ontology telemetry is exposed by the graph quality response.
- Retrieval evaluation reports case hit rate, reciprocal rank, and precision at the expected result count. It is intentionally separate from live corpus search so owner-curated cases can be run without mutating production data.

## Explicit sequencing rule

For the next cycle, fix freshness, lifecycle semantics, source precedence, and identity resolution before adding connectors or agent autonomy. The raw corpus and schema are already sufficient to produce materially more value; the bottleneck is converting the existing information into current, trusted, owned decisions.
