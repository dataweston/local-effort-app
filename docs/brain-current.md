# Company Brain — Current State

> Core architecture last audited: 2026-06-12. Exact source-corpus and Gmail
> status updated: 2026-09-17. This supersedes `company-brain.md` and
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
| 02:20 daily | `/api/brain/gmail/sync` | Resumable recent/archive Gmail thread sync → exact `BrainSourceDocument` corpus + searchable ledger projection (`gmailSync.js`) |
| 02:30 daily | `/api/brain/square-orders/sync` | Square COMPLETED orders → `order.placed` ledger events (`squareOrdersSync.js`) |
| 02:52 daily | `/api/brain/local-budget/items-sync` | Local Budget `/integration/v1/items` → `line_item.recorded` (`localBudgetItemsSync.js`): per-unit price + quantity for purchased receipt lines (Vendor resolved by LB vendor id) and sold Square lines (Dish/Product matched, never minted) |
| 03:00 daily | `/api/brain/inference/run` | PREFERS/AVOIDS/CHURNING/REPEAT_CUSTOMER/PRICE_DRIFT + CHANNEL_TRAFFIC_TREND/WEB_CONVERSION (web-funnel) pass. PRICE_DRIFT prefers per-unit line-item evidence and falls back to average payment size |
| 03:30 daily | `/api/brain/hypothesis/run` | Hypothesis predicate evaluation |
| 04:00 daily | `/api/brain/ga4/sync` | GA4 landing-page + acquisition performance → `web.traffic.daily` |
| 04:15 daily | `/api/brain/google-business-profile/sync` | Business Profile listing, Search/Maps metrics, and discovery keywords |
| 04:30 daily | `/api/brain/google-merchant/sync` | Merchant Center account and product diagnostics |
| 04:45 daily | `/api/brain/google-ads/sync` | Google Ads campaign and search-term performance |
| 05:00 daily | `/api/brain/search-console/sync` | Search Console daily query + page performance (`searchConsoleSync.js`; needs `webmasters.readonly` on the shared grant) |
| 05:15 daily | `/api/brain/google-projection/run` | Google ledger events → graph (`googleGraphProjector.js`): `Web: <group>` Channel entities with traffic rollups, Offer/BusinessLine `USES_CHANNEL` Website edges from mapped landing pages, `DEMAND_SIGNAL_FOR` edges from search terms/keywords/queries, Campaign entities from Ads data |
| 11:00 + 23:00 | `/api/brain/triage/run` | LLM inbox triage (`triageEngine.js`; Anthropic primary, OpenAI fallback) — auto-trash / auto-create safe entities / hint everything else |

Recurring jobs accept Vercel-cron GETs, admin JWT, or `x-brain-admin-key`.
**The triage and constraint LLM paths need at least one funded provider:**
`ANTHROPIC_API_KEY` (primary) or `OPENAI_API_KEY` (fallback). Optional
`BRAIN_OPENAI_MODEL` overrides the OpenAI model and `BRAIN_LLM_TIMEOUT_MS`
controls the per-provider timeout.

## Exact source corpus and Gmail

`BrainSourceDocument` is the canonical private source layer. It stores exact
source bytes as gzip, a SHA-256 hash of the uncompressed bytes, searchable
text/HTML derivatives, attachment metadata, capture/extraction status, and
provenance. Search and MCP return metadata and derived text by default; an
explicit source read can return raw bytes and verifies the hash while
decompressing them.

Gmail requests `format=raw`, commits the source document and ledger projection
atomically, and advances resumable recent/archive cursors only after every
message in a page settles. Run `node scripts/gmail.cjs status` for auth,
freshness, cursor, and corpus coverage; run `node scripts/gmail.cjs sync` to
drain it manually.

On 2026-09-17 all four sent/yum recent/archive streams completed with zero
remaining backlog: 5,015 unique exact messages, newest 2026-09-16, and zero
capture gaps. The 1,048 partial extraction statuses are explicit attachment
work, not lost email bytes: all are messages with binary attachments, totaling
2,491 unextracted attachments. The raw messages remain replayable. The largest
classes are JPEG/PNG images and PDFs; extract them only through a bounded,
provenance-preserving attachment pass rather than weakening capture status.

The shared Google OAuth client is still in Testing mode. Publish its consent
screen before the seven-day refresh-token lifetime elapses; reconnect through
Brain → Partners if the grant expires.

## Dietary constraints

`backend/api/brain/constraintMiner.js` turns meal-prep intake answers into
`Customer --AVOIDS/PREFERS/MEDICAL_CONSTRAINT--> Ingredient|Constraint`
assertions with `metadata.severity` (`medical | avoid | preference`) — the
exact shape `menuRoutes.checkConstraints` enforces at menu broadcast
(medical blocks, avoid needs override). Runs automatically on each intake
submission (hooked in `mealPrepIntakeIngest.js`) and on demand via
`POST /api/brain/constraints/mine` (`{force:true}` re-mines). Falls back to a
deterministic parser of the structured fields when both LLM providers are
unavailable; rows are tagged `metadata.extractor: claude|openai|deterministic|manual`.

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

- Anthropic API account had **no credits** as of 2026-06-11. The Brain now
  falls through to OpenAI when `OPENAI_API_KEY` is configured, then to its
  deterministic parser if neither provider succeeds.
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
