# Company Brain — Architecture Spec v3

> Status: Implementation in progress. Step 0 complete.
> Last updated: 2026-04-18

---

## What changed from v2 and why

Eight structural changes, in priority order:

1. **Bi-temporal is now real** — `knownFrom/knownUntil` added alongside `validFrom/validUntil` on assertions and inferences. Without both, auditing "what did the brain believe on March 15" is impossible.
2. **Retraction distinct from supersession** — price changes are supersession; "was never true" is retraction. Downstream inferences get a `staleAt` timestamp when any source is retracted.
3. **Constraint severity with hard-fail on broadcast** — `preference | avoid | medical`. Medical blocks `brain.menu.broadcast` entirely. Avoid requires logged override. This is a liability issue, not a UX issue.
4. **Identity resolution plan for seeding** — explicit merge rules, `BrainEntityAlias` model, founder review queue before seed is considered done.
5. **Ledger schema registry** — `LedgerEventSchema` model so payload shapes are versioned. Cheap now, irreversible if skipped.
6. **MCP agent trust model** — Claude writes create provisional assertions (confidence 0.5, flagged for review) rather than direct assertions. The founder confirms or retracts. Claude cannot assert medical constraints.
7. **Hypothesis predicate structure** — machine-checkable, not just a sentence in a Note.
8. **GDPR tombstoning + inference cost tiers** — defined policy, not a retrofit problem.

---

## The four layers

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 4 — INTERFACE                                    │
│  MCP tools · cockpit (/weeklydemo) · customer portal   │
│  public share · Obsidian sync                          │
└──────────────────────┬──────────────────────────────────┘
                       │ reads from all layers
┌──────────────────────▼──────────────────────────────────┐
│  LAYER 3 — INFERENCE                                    │
│  Computed on schedule or on-demand from the graph.      │
│  Confidence-scored, decaying, regeneratable.            │
│  CustomerPreference · DishPerformance · VendorReliability│
│  MarginTrend · DetectedPattern · HypothesisValidation   │
└──────────────────────┬──────────────────────────────────┘
                       │ derived from
┌──────────────────────▼──────────────────────────────────┐
│  LAYER 2 — GRAPH                                        │
│  Entities + Assertions. Bi-temporal.                    │
│  Hard facts with provenance. Contradiction-detected.    │
└──────────────────────┬──────────────────────────────────┘
                       │ derived from
┌──────────────────────▼──────────────────────────────────┐
│  LAYER 1 — LEDGER                                       │
│  Immutable, append-only. Everything that happened.      │
│  Orders · Transactions · EmailThreads · FeedbackEvents  │
│  InboxCaptures · Decisions · PlannerCards               │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 1 — Ledger

Immutable, append-only. Never updated in place. Canonical truth.

```prisma
model LedgerEventSchema {
  eventType  String
  version    Int
  schema     Json
  createdAt  DateTime @default(now())

  @@id([eventType, version])
}

model LedgerEvent {
  id            String   @id @default(uuid())
  eventType     String
  schemaVersion Int      @default(1)
  occurredAt    DateTime
  source        String   // local-effort | local-budget | square | gmail
                         // drafts | shortcut_photo | obsidian | admin_ux | mcp
  sourceId      String?
  actorType     String?  // founder | customer | vendor | system | mcp:claude
  actorId       String?
  payload       Json
  createdAt     DateTime @default(now())
  tombstonedAt  DateTime?
  tombstoneReason String?

  assertions    BrainAssertion[]

  @@index([eventType, occurredAt])
  @@index([source, sourceId])
  @@index([occurredAt])
  @@index([tombstonedAt])
}
```

Event types (v1 schema registered at migration time):
- `order.placed` — from local-effort Order
- `feedback.submitted` — from DishFeedback
- `transaction.posted` — from Local Budget Transaction
- `vendor.invoice` — from Local Budget Receipt
- `email.thread` — from Gmail sync
- `inbox.captured` — from any capture surface
- `decision.made` — from admin UX / MCP
- `planner.card` — from PlannerCard sync
- `menu.published` — from Menu entity broadcast
- `assertion.retracted` — provenance event for retractions
- `inference.stale` — when staleness is detected

---

## Layer 2 — Graph

### Entity ontology

```
// Operational
Person        — a human: customer, vendor contact, employee
Vendor        — a business the founder buys from
Customer      — a household or account that orders
Dish          — a menu item as sold (SKU)
Ingredient    — what a dish is made of; comes from a Vendor
Recipe        — versioned formula: Dish → Recipe versions
Batch         — a production run: when made, how much, actual cost
Menu          — a weekly menu publication: contains Dishes

// Temporal period nodes
Week          — ISO week: 2026-W15
Season        — named season: "Summer 2026"
MenuCycle     — a run of menus with shared theme/constraints

// Commitments
Task          — next action, assigned, with deadline
Obligation    — multi-step (has child Tasks)
Meeting       — an encounter: planned or recorded
Decision      — structured with expected vs actual outcome
Renewal       — a recurring obligation with a due date

// Knowledge
Note          — freeform text, linked to entities
Constraint    — a rule: "Customer X: no cilantro ever"
Pattern       — a detected regularity
Hypothesis    — a theory the founder wants to track and validate
```

### Prisma models

```prisma
model BrainEntity {
  id          String    @id @default(uuid())
  entityType  String
  name        String
  properties  Json?
  status      String    @default("active") // active | archived | snoozed | tombstoned
  snoozeUntil DateTime?
  visibility  String    @default("private") // private | shared
  shareToken  String?   @unique
  tombstonedAt    DateTime?
  tombstoneReason String?

  // FK anchors — reference, never duplicate
  localEffortCustomerId String?
  localEffortDishId     String?
  localBudgetVendorId   String?
  squareCustomerId      String?
  plannerCardId         String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  aliases       BrainEntityAlias[]
  srcAssertions BrainAssertion[]   @relation("assertionSrc")
  dstAssertions BrainAssertion[]   @relation("assertionDst")
  srcInferences BrainInference[]   @relation("inferenceSrc")
  dstInferences BrainInference[]   @relation("inferenceDst")
  inboxItems    BrainInboxItem[]

  @@index([entityType])
  @@index([status])
  @@index([shareToken])
}

model BrainEntityAlias {
  id        String      @id @default(uuid())
  entityId  String
  alias     String
  source    String      // local-budget | square | manual | seed
  createdAt DateTime    @default(now())
  entity    BrainEntity @relation(fields: [entityId], references: [id])

  @@unique([entityId, alias])
  @@index([alias])
}

model BrainAssertion {
  id       String @id @default(uuid())
  srcId    String
  dstId    String
  relType  String  // SUPPLIES | CONTAINS | ORDERED | DECIDED_BY | MEMBER_OF
                   // HAS_CONSTRAINT | SUPERSEDES | REALIZED_IN | PRICED_AT
                   // BOOKED | GENERATED | ASSIGNED_TO

  metadata Json?

  // Valid time — when true in the world
  validFrom  DateTime  @default(now())
  validUntil DateTime?

  // Transaction time — when system learned it
  knownFrom  DateTime  @default(now())
  knownUntil DateTime?

  // Provenance — mandatory
  confidence  Float   @default(1.0)
  sourceType  String  // ledger_event | manual | mcp:provisional | seed
  sourceId    String?
  createdBy   String  // founder | system | mcp:claude

  // Supersession — was true, now different
  supersededBy     String?
  supersededAt     DateTime?
  supersededReason String?

  // Retraction — was never true
  retractedAt        DateTime?
  retractedBy        String?
  retractedReason    String?
  retractionSourceId String?

  // MCP provisional
  provisional Boolean   @default(false)
  confirmedAt DateTime?
  confirmedBy String?

  createdAt DateTime @default(now())

  src         BrainEntity  @relation("assertionSrc", fields: [srcId], references: [id])
  dst         BrainEntity  @relation("assertionDst", fields: [dstId], references: [id])
  ledgerEvent LedgerEvent? @relation(fields: [sourceId], references: [id])

  @@index([srcId, relType])
  @@index([dstId, relType])
  @@index([validUntil])
  @@index([knownUntil])
  @@index([provisional])
  @@index([retractedAt])
}

model BrainInference {
  id            String   @id @default(uuid())
  srcId         String
  dstId         String
  inferenceType String   // PREFERS | AVOIDS | CHURNING | PRICE_DRIFT
                         // DISH_FATIGUE | RELIABLE_SUPPLIER
                         // VALIDATES_HYPOTHESIS | SEASONAL_PATTERN

  confidence  Float
  decayRate   String   // daily | weekly | monthly | none

  // Transaction time
  knownFrom  DateTime  @default(now())
  knownUntil DateTime?

  computedAt   DateTime
  computedFrom String[] // LedgerEvent ids

  summary String  // plain-language narrative

  staleAt     DateTime?
  staleReason String?
  supersededBy String?

  src BrainEntity @relation("inferenceSrc", fields: [srcId], references: [id])
  dst BrainEntity @relation("inferenceDst", fields: [dstId], references: [id])

  @@index([srcId, inferenceType])
  @@index([confidence])
  @@index([staleAt])
  @@index([knownUntil])
}

model BrainInboxItem {
  id             String      @id @default(uuid())
  rawContent     String
  source         String      // drafts | shortcut_photo | admin_ux | gmail | obsidian | voice | square
  attachments    Json?       // [{ url, mimeType, label }]
  capturedAt     DateTime    @default(now())
  status         String      @default("pending") // pending | triaged | trashed
  processedAt    DateTime?
  resultEntityId String?
  resultEntity   BrainEntity? @relation(fields: [resultEntityId], references: [id])

  @@index([status, capturedAt])
}

model BrainApiToken {
  id         String    @id @default(uuid())
  label      String    // "iPhone Drafts" | "Obsidian vault"
  tokenHash  String    @unique
  scopes     String[]  // ["brain:write"]
  lastUsedAt DateTime?
  createdAt  DateTime  @default(now())
}

// Seeding scaffolding — dropped after seed complete
model BrainSeedReview {
  id          String    @id @default(uuid())
  entityAId   String
  entityBId   String
  matchScore  Float
  matchReason String    // name_fuzzy | email_exact | alias_match
  status      String    @default("pending") // pending | merged | kept_separate | deleted
  resolvedAt  DateTime?
  resolvedBy  String?
  createdAt   DateTime  @default(now())
}
```

### Constraint severity (enforced at MCP boundary)

Constraints are `BrainAssertion` rows with `relType: HAS_CONSTRAINT`. The `metadata` field conforms to:

```typescript
{
  description: string,
  severity: "preference" | "avoid" | "medical",
  tags: string[],           // ingredient or dish tags
  verifiedAt: string,       // ISO date
  verifiedBy: string,       // customer_direct | founder_observation | mcp:provisional
  expiresAt?: string,
}
```

`brain.menu.broadcast` enforcement:
- `preference` → surfaces in cockpit only
- `avoid` → blocks, requires `{ override: true, overrideReason }`, logs LedgerEvent
- `medical` → blocks, no MCP override possible, requires founder in admin UX

MCP **cannot** create a constraint with `severity: "medical"`.

### Decision properties (Zod-enforced at MCP boundary)

```typescript
{
  context: string,
  options: Array<{ label, considered, chosen, rejectedReason? }>,
  rationale: string,
  expectedOutcome: string,
  reviewDate: string,        // ISO date
  actualOutcome?: string,
  outcomeRecordedAt?: string,
  supersedes?: string,       // prior Decision entity id
}
```

### Hypothesis properties (machine-checkable)

```typescript
{
  statement: string,
  predicate: {
    subject: string,         // "Customer"
    condition: string,       // "orderCount(first_30_days) >= 2"
    prediction: string,      // "orderCount(days_60_to_90) >= 4"
    evidenceWindow: string,  // "90 days"
    minSampleSize: number,
  },
  status: "collecting" | "confirmed" | "rejected" | "inconclusive",
  confidence: number,        // 0.0–1.0
  sampleSize: number,
  confirmedCount: number,
  rejectedCount: number,
  lastEvaluatedAt?: string,
}
```

---

## Layer 3 — Inference

### Inference types

| Type | Source events | Decay | Example |
|------|---------------|-------|---------|
| `PREFERS` | feedback.submitted + order.placed | weekly | "Jane prefers chicken" (0.74, 6 orders) |
| `AVOIDS` | feedback.submitted thumbs-down | monthly | "Mark hasn't ordered seafood in 8 weeks" |
| `CHURNING` | order.placed absence | weekly | "Weekly customer, skipped 3 weeks" |
| `PRICE_DRIFT` | transaction.posted same vendor+item | none | "Egg supplier: +12% over 90 days" |
| `RELIABLE_SUPPLIER` | vendor on-time, no disputes | monthly | "Farm Fresh: 94% on-time, 8 months" |
| `DISH_FATIGUE` | order frequency decline | weekly | "Chicken tagine: -40% over 4 weeks" |
| `VALIDATES_HYPOTHESIS` | events matching predicate | none | "3/5 double-month customers went weekly" |

### Inference cost tiers

| Tier | Runs | Examples |
|------|------|---------|
| On-write | Per LedgerEvent | CHURNING signal, new price assertion |
| Nightly | Daily, SQL only | PREFERS, AVOIDS, DISH_FATIGUE, PRICE_DRIFT, hypothesis eval |
| Weekly | Sunday, may use LLM | SEASONAL_PATTERN, RELIABLE_SUPPLIER, narrative summaries |
| On-demand | MCP tool call | ingredient_margin, batch_vs_plan, embedding similarity |

### Staleness propagation

When a `LedgerEvent` is tombstoned or `BrainAssertion` is retracted:
1. Find all `BrainInference` rows where `computedFrom` contains the affected ID
2. Set `staleAt = now()`, `staleReason = "source_retracted"`
3. Queue for recomputation in next nightly cycle

---

## Layer 4 — Interface

### MCP agent trust model

| Action | Result |
|--------|--------|
| Any read tool | Immediate |
| `brain.inbox.capture` | Immediate — safe, just capture |
| `brain.entity.create` | `sourceType: mcp:provisional`, lands in inbox |
| `brain.assertion.create` | `provisional: true`, `confidence: 0.5`, flagged for review |
| `brain.decision.log` | Provisional; requires founder confirmation |
| `brain.menu.broadcast` | Runs constraint check; blocks on avoid/medical violations |
| Assert `severity: medical` | **Refused** — returns error |
| Retract assertion | **Refused** — requires founder in admin UX |
| Tombstone entity | **Refused** — requires founder in admin UX |

Every provisional write creates a `LedgerEvent` with `actorType: "mcp:claude"`.

### Cockpit queries — all 15 named MCP tools

```
brain.cockpit.today()
brain.cockpit.lapsing_customers(weeks?)
brain.cockpit.dish_fatigue(weeks?, threshold?)
brain.cockpit.vendor_price_drift(days?, threshold?)
brain.cockpit.pending_decisions()
brain.cockpit.unmatched_commitments()
brain.cockpit.hypothesis_status()
brain.cockpit.ingredient_margin(menuEntityId)
brain.cockpit.customer_preferences(customerId)
brain.cockpit.weekly_summary(weekId)
brain.cockpit.constraint_conflicts(menuEntityId)
brain.cockpit.vendor_reliability()
brain.cockpit.batch_vs_plan(batchId)
brain.cockpit.recipe_history(dishId)
brain.cockpit.decisions_log(limit?)
```

### Capture surfaces

| Surface | Mechanism |
|---------|-----------|
| Drafts (iPhone) | HTTP POST `/api/brain/inbox` with `BrainApiToken` |
| iOS Shortcut (photo) | Upload to Supabase Storage → POST inbox |
| Admin UX quick-capture | Persistent bar in `/weeklydemo` |
| Gmail | Periodic sync → LedgerEvent → BrainInboxItem |
| Square | Webhook → LedgerEvent → BrainAssertion on Vendor |
| Obsidian | `#brain`-tagged notes → POST inbox |
| Voice | Deferred (same inbox endpoint when ready) |

### Routes (in existing Vite app)

| Route | Purpose |
|-------|---------|
| `/weeklydemo` | Cockpit — existing page + inbox drawer + brain context |
| `/brain/graph` | Entity browser + relationship explorer |
| `/brain/decisions` | Decision log |
| `/brain/vendors` | Vendor entities + purchase history |
| `/brain/share/:token` | Public read-only portal |
| `/portal/:customerId` | Customer-facing menu portal + feedback |
| `/brain/seed-review` | Seeding identity resolution queue (temporary) |

---

## Identity resolution for seeding

Three-phase process. Seed is not done until founder review queue is empty.

**Phase 1 — Extract and normalize**
Pull Vendors (Local Budget), Customers (local-effort-app), Dishes (local-effort-app), Transactions (Local Budget). Normalize names: lowercase, strip punctuation.

**Phase 2 — Merge rules** (apply in order, stop at first match)
1. Email exact match → merge
2. Normalized name exact match + same entityType → merge, flag for review
3. Normalized name fuzzy match (>0.85) + same entityType → alias candidate, hold for review
4. No match → new entity

**Phase 3 — Founder review**
`/brain/seed-review` shows all alias candidates and ambiguous merges.
Actions per item: merge | keep separate | delete duplicate.

---

## GDPR / tombstoning

1. Set entity `status: tombstoned`, blank PII in `properties`
2. Set `tombstonedAt` on associated `LedgerEvent` rows, scrub PII from `payload` (replace with `"[redacted]"`)
3. Delete alias rows
4. Mark all related inferences `staleAt = now()`
5. Nightly job: hash email addresses in ledger payloads older than 90 days

---

## Embedding strategy

Three targets, three query patterns:

1. **Entity embeddings** — `name + entityType + properties summary` → deduplication, entity similarity
2. **Note/inbox content embeddings** — full text → semantic search over captured information
3. **Assertion embeddings** — `src.name + relType + dst.name + metadata summary` → "find decisions that rhyme with this one"

Supabase tables: `brain_entity_embeddings`, `brain_assertion_embeddings`, `brain_note_embeddings` (all `vector(1536)`).

Re-embedding trigger: entity `name` or `properties` change → background job queues re-embed.

Hybrid query: pgvector similarity + graph traversal combined (semantic similarity AND within N hops).

---

## Build sequence

| Step | What | Usable after? |
|------|------|---------------|
| 0 | Landscape read — count entities, confirm DB access | — |
| 1 | Schema + migration — 9 models + Supabase tables | — |
| 2 | Seeder — cross-repo, 3-phase identity resolution | — |
| 3 | Inbox API + BrainApiToken + Drafts wire-up | First capture |
| 4 | Inbox drawer in WeeklyDemoPage | **Daily use** |
| 5 | Inference engine — nightly, first-pass inferences | First insights |
| 6 | MCP brain tools — full set, 15 cockpit queries | Claude integration |
| 7 | Menu workflow — broadcast, customer portal, feedback | **First closed loop** |
| 8 | Ingredient/Recipe/Batch ontology | Margin analysis |
| 9 | Gmail + Square ingestion | Self-populating |
| 10 | Embedding pipeline | Semantic search |
| 11 | Hypothesis engine | **Transformational** |
| 12 | Obsidian sync | Private writing surface |
