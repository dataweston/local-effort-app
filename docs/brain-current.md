# Company Brain — Current State

> Last updated: 2026-06-12. This supersedes `company-brain.md` and
> `company-brain-spec-v3.md` (root) as the description of what actually
> exists. Those documents are the original architecture vision; large parts
> were built differently or not at all. The data audit that motivated the
> June 2026 overhaul is in `docs/brain-data-audit.md`.

## What it is

A four-layer knowledge system for the business, in Postgres via Prisma
(models in `prisma/schema.prisma`, "COMPANY BRAIN" sections):

1. **Ledger** — `LedgerEvent`, append-only facts (`order.placed`,
   `menu.feedback`, `intake.meal_prep.submitted`, `inbox.captured`, …).
   `writeLedgerEvent` (backend/api/brain/ledger.js) dedupes on
   (eventType, source, sourceId).
2. **Graph** — `BrainEntity` + `BrainAssertion` (provisional → confirm/retract
   lifecycle). Controlled relTypes in
   `backend/api/brain/relationshipDictionary.js`.
3. **Inference** — `BrainInference`, computed by
   `backend/api/brain/inferenceEngine.js` (nightly cron).
4. **Interface** — surfaces below, plus MCP read tools
   (`backend/mcp/brainTools.js`) at `/.well-known/mcp`.

## Surfaces

| Surface | Role |
|---|---|
| `/weeklydemo` | Operator cockpit. `BrainPulsePanel` (inferences, inbox/review counts, source freshness), inbox drawer with AI triage hints + Send-to-Hub, quick-capture bar. |
| `/brain` | Maintenance bench. Table (entities + provisional review), Graph (nodes **and** edges via `/api/brain/graph`), Explore (self-serve query builder → `/api/brain/query`, CSV export), Quality (duplicate clusters + one-click merge). |
| `/portal/:shareToken` | Customer menu feedback portal (ratings + dislike notes → ledger). |

## Recurring jobs (Vercel crons — note: cron requests are GET)

| Cron (UTC) | Path | What |
|---|---|---|
| 02:30 daily | `/api/brain/square-orders/sync` | Square COMPLETED orders → `order.placed` ledger events (`squareOrdersSync.js`) |
| 03:00 daily | `/api/brain/inference/run` | PREFERS/AVOIDS/CHURNING/PRICE_DRIFT pass |
| 03:30 daily | `/api/brain/hypothesis/run` | Hypothesis predicate evaluation |
| 04:00 daily | `/api/brain/ga4/sync` | GA4 landing-page + acquisition performance → `web.traffic.daily` |
| 04:15 daily | `/api/brain/google-business-profile/sync` | Business Profile listing, Search/Maps metrics, and discovery keywords |
| 04:30 daily | `/api/brain/google-merchant/sync` | Merchant Center account and product diagnostics |
| 04:45 daily | `/api/brain/google-ads/sync` | Google Ads campaign and search-term performance |
| 11:00 + 23:00 | `/api/brain/triage/run` | LLM inbox triage (`triageEngine.js`, Claude via `@anthropic-ai/sdk`, model `claude-opus-4-8`) — auto-trash / auto-create safe entities / hint everything else |

Recurring jobs accept Vercel-cron GETs, admin JWT, or `x-brain-admin-key`.
**The triage and constraint LLM paths need `ANTHROPIC_API_KEY` with credit.**

## Dietary constraints

`backend/api/brain/constraintMiner.js` turns meal-prep intake answers into
`Customer --AVOIDS/PREFERS/MEDICAL_CONSTRAINT--> Ingredient|Constraint`
assertions with `metadata.severity` (`medical | avoid | preference`) — the
exact shape `menuRoutes.checkConstraints` enforces at menu broadcast
(medical blocks, avoid needs override). Runs automatically on each intake
submission (hooked in `mealPrepIntakeIngest.js`) and on demand via
`POST /api/brain/constraints/mine` (`{force:true}` re-mines). Falls back to a
deterministic parser of the structured fields when the Anthropic API is
unavailable; rows are tagged `metadata.extractor: llm|deterministic|manual`.

## Entity merge

`POST /api/brain/entities/:id/merge-into/:targetId` repoints assertions,
inferences, inbox refs, and aliases onto the survivor, fills missing FK
anchors/properties, retracts self-edges created by the merge, tombstones the
duplicate, and writes an `entity.merged` ledger event. UI: the Quality tab on
`/brain` (cluster merge with survivor picker) and "Merge…" in the entity
detail panel.

## Python sidecar (`brain-sidecar/`)

Desktop-only (hardcoded Windows Python path). Its jobs were mostly one-time
seeds (CSV/XLSX imports, gmail harvest, ontology seed). The recurring loop no
longer depends on it; trigger manually with `python run.py <job>` or
`POST /api/brain/sidecar/run` when running the Express server locally.
LanceDB vector search only works on the desktop; production semantic search
falls back to keyword. (pgvector migration is the open item if semantic
search in prod matters.)

## Known gaps / next candidates

- Anthropic API account had **no credits** as of 2026-06-11 — LLM triage and
  LLM constraint extraction silently degrade until topped up.
- Inference types are vendor-payment-centric; with `order.placed` data now
  flowing, customer/seasonal inferences (repeat-customer, seasonality —
  order volume spikes Jul–Aug and Oct–Nov) are the natural additions.
- 829 gmail-derived provisional assertions still need review (Smart Review
  panel on /brain).
- Google business ingestion code exists for GA4, Business Profile performance,
  Merchant diagnostics, and Ads; production data remains gated on OAuth,
  property/account IDs, GBP API quota, and an Ads developer token. Setup:
  `docs/google-business-integrations.md`.
- Recommended next sources: Google Search Console, Open-Meteo weather, and
  Google Business Profile reviews.
