# Company Brain / Operator Cockpit — Architecture Handoff

**Status:** Architecture decided (Pattern B). Schema and build order drafted. Several decisions deferred to the repo agent who has filesystem access.

**Audience:** The Claude Code agent working inside `local-effort-app`. This doc consolidates an architecture conversation held outside the repo so you can pick up execution without re-deriving the reasoning.

---

## 1. The founder's brief (in their own words, distilled)

- Single-operator food business. Founder is the only user of the brain.
- ADHD-aware — the system must tolerate fragmented multi-surface capture (iPhone, desktop, voice, photo, Apple Watch) landing in one place. Low friction is mandatory.
- Goal phrase: "build on a thing that is building itself." Wants a context graph that compounds — decisions, relationships, obligations, people, vendors, SKUs, customers as typed entities with explicit relationships.
- Wants to "utterly rely on an external mechanical task capture and execution flywheel" to offload working memory.
- Wants an operator cockpit: what to do today, what's waiting on whom, what's overdue.
- AI-native substrate. Claude (via MCP) should be able to read and reason over the graph.
- Delegation is **outbound only** — tasks leave the brain via SMS / shared sheets / work orders / the employee's own app and return completion signals back. Employees do not write into the brain.
- The existing monorepo is the spine. The brain must reference existing modules (transaction tracker, planner) as systems of record rather than duplicate their data.

## 2. The four jobs of the capture side (source philosophy)

Reference for how the capture/triage layer should behave, from the source doc the founder brought in:

1. Catch commitments before they disappear
2. Prevent duplicate mental load
3. Convert vague obligations into next actions
4. Route work into the actual operating system

Intake format (enforced by the capture pipeline): `verb + object + context + deadline`.

Triage cadence: twice daily, empty the inbox, route each item to one of — Tasks / Calendar / Waiting / Reference / Someday / Delete. Weekly review on Sunday.

Projects ≠ tasks. Anything with more than one step is a project and must be decomposed into visible next actions.

The founder has explicitly named the real enemy: not forgetting, but **re-deciding**. The system's job is to let the founder decide once (what it is, where it lives, when it comes back, who owns it) and release the brain from retention duty.

## 3. Architectural decision: Pattern B

Two independent research passes (one in this monorepo, one in the separate transaction-tracker repo) converged on the same recommendation:

**Build the brain as a module in this monorepo.** Typed entity/relationship schema in Postgres + pgvector, with a custom MCP server on top. Not Tana. Not Obsidian. Not Notion. Not Sanity (though see §7 for why that question is still open).

Reasoning:
- The monorepo already has the API, the auth layer, the Postgres instance, and — via the transaction tracker — canonical vendor data.
- External PKM tools (Tana, Anytype, Obsidian, Capacities, etc.) either lock schema into a vendor (Tana), require a desktop app running for API access (Anytype), or have weak typed-structure primitives (Obsidian). All of them would require *more* integration work with the existing monorepo than building natively.
- Entity count is low thousands. Postgres is the correct primitive at this scale — Neo4j, Memgraph, SurrealDB, Dgraph are all overkill or immature.
- MCP has matured to the point that exposing a custom Postgres schema to Claude is a 1–2 day task, not a research project.

Patterns considered and rejected:
- **Pattern A** (external PKM tool as primary): rejected due to integration cost with existing monorepo and lock-in on schema
- **Pattern D** (Claude Projects as brain): rejected — not a graph, no persistent writes, no traversal
- **Pattern C** (hybrid external hub + backend sync): deferred — only revisit if a human-facing UX need emerges that the in-monorepo cockpit can't serve

## 4. Proposed schema

Starting point. Both research passes landed on this shape independently; it should be adjusted based on what's already in `prisma/schema.prisma` and how the existing transaction tracker and planner model their domains.

```prisma
// Typed entities — the nodes of the graph
model Entity {
  id          String   @id @default(uuid())
  entityType  String   // "Person" | "Vendor" | "Customer" | "Project"
                       // | "Decision" | "SKU" | "Meeting" | "Renewal"
                       // | "Obligation" | "Task" | "Note" — grow as needed
  name        String
  properties  Json?    // type-specific fields live here
  embedding   Unsupported("vector(1536)")?  // pgvector for semantic search

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Optional FKs into existing modules — preferred over duplicating data
  vendorId       String?  // → transaction tracker's Vendor
  plannerEventId String?  // → planner's calendar event
  // ... add as the schema grows

  outgoingRels Relationship[] @relation("src")
  incomingRels Relationship[] @relation("dst")

  @@index([entityType])
  @@index([vendorId])
}

// Typed relationships — the edges of the graph, with temporal validity
model Relationship {
  id         String    @id @default(uuid())
  srcId      String
  dstId      String
  relType    String    // "OWNS" | "SUPPLIES" | "DECIDED_BY" | "DEPENDS_ON"
                       // | "MEMBER_OF" | "BLOCKS" | "SUPERSEDES" — grow
  metadata   Json?
  validFrom  DateTime  @default(now())
  validUntil DateTime? // null = currently valid (bitemporal pattern)

  src Entity @relation("src", fields: [srcId], references: [id])
  dst Entity @relation("dst", fields: [dstId], references: [id])

  @@index([srcId, relType])
  @@index([dstId, relType])
  @@index([relType])
}

// The single capture inbox. Everything inbound lands here first.
model InboxItem {
  id           String   @id @default(uuid())
  rawContent   String
  source       String   // "drafts" | "shortcut_photo" | "voice" | "email" | "manual"
  attachments  Json?    // array of file refs
  capturedAt   DateTime @default(now())

  status       String   @default("pending")
                        // "pending" | "processed" | "trashed"
  processedAt  DateTime?
  resultEntityId String? // set when triage creates/updates an Entity
}
```

Notes:
- `entityType` and `relType` are strings, not enums, deliberately — adding a new type shouldn't require a migration. Enforce the vocabulary in TypeScript/Zod at the MCP boundary, not at the DB.
- `properties JSONB` holds type-specific fields. Validate shape per-type in the MCP tools.
- `validFrom/validUntil` gives bitemporal history — critical for a food business that changes suppliers, prices, and customers over time. "What did we know about Vendor X in Q2 2026?" is a real question the brain should answer.
- FKs into existing modules are explicit fields, not a generic polymorphic pattern. Add them as concrete columns as the brain grows into new domains.

## 5. MCP server shape

TypeScript + `@modelcontextprotocol/sdk` + Zod, running in the monorepo alongside the API. Reference pattern: `anyproto/anytype-mcp` — exposes semantic operations, not raw SQL.

Tools to expose (starting set):

- `create_entity(type, name, properties)` — with per-type Zod validation
- `update_entity(id, patch)`
- `get_entity(id)` — includes incoming and outgoing relationships one hop out
- `search_entities(type?, query?, semantic?)` — semantic uses pgvector
- `create_relationship(src_id, dst_id, rel_type, metadata?)`
- `query_related(entity_id, rel_type?, depth?)` — multi-hop via recursive CTE
- `log_decision(title, rationale, affected_entities[])` — composite op that creates a Decision entity and links it
- `list_inbox(status?)` / `process_inbox_item(id, action, payload)`
- `list_upcoming_obligations(horizon_days)` — for the operator cockpit
- `list_waiting(owner?)` — delegated items awaiting return signal

Transport: Streamable HTTP (superseded SSE in the MCP spec, mid-2025). Use the current SDK default.

Security: the MCP server must be behind Supabase auth. Default to read-only in production mode with explicit write tools gated behind approval — follow the pattern `crystaldba/postgres-mcp` uses for its dev/prod mode split.

## 6. Delegation-out (outbound with return signals)

Pattern: **Inngest + whatever the existing outbound channel already is**. Do not default-add Twilio if Brevo already sends SMS in this stack — check existing code first.

Flow:
1. User marks an Entity (or Task) as delegated, selecting recipient and channel
2. Inngest workflow fires `OutboundTask` event
3. Workflow step: send via chosen channel (SMS, sheet row, email, work order print)
4. Workflow calls `waitForEvent("TaskCompleted", { match: { task_id } })`
5. Inbound webhook (SMS reply, sheet webhook, manual check-off UI) fires the `TaskCompleted` event
6. Workflow resumes, updates the Entity state, logs the completion with timestamp

Start with **one channel only**. Don't pre-build five. The second channel is much cheaper once the first state machine exists.

Zapier + Twilio is a legitimate shortcut if Inngest feels heavy for the first version. The Inngest version is the right target; the Zapier version is an acceptable week-one stand-in.

## 7. Deferred decisions — needs the repo agent's read

These are the open questions the founder (correctly) got tired of bridging between agents. Answer them from inside the repo with real file access, not from description:

### 7a. Sanity's role in the brain

The first research pass argued Sanity could be the knowledge/narrative layer (first-party MCP server at `mcp.sanity.io`, GROQ for relationship traversal, TypeScript schema-as-code, already in the stack, zero new infrastructure). The second research pass didn't address Sanity.

**Question for the repo agent:** Given what Sanity is actually doing in this codebase today, does it make sense to use Sanity's Content Lake for the narrative/decision layer (with Postgres holding structured operational entities), or is Sanity tangential to this brain and should be left alone?

The answer depends on how active Sanity is, what schemas already exist there, and whether the founder is actively writing to it. The repo agent can see this; the outside agents could not.

### 7b. Brevo's role and whether it's the outbound channel

Brevo was originally adopted for customer-service inboxes; that use case didn't materialize. It's unclear what Brevo does in the codebase today.

**Question for the repo agent:** Is Brevo currently sending transactional email or SMS? If yes, use it as the delegation-out channel rather than adding Twilio. If it's dormant, ignore it and use Twilio when the time comes.

### 7c. Voice capture priority

If the founder wants to dictate "talked to the egg supplier, pricing up 8% Q3, switching to alternate" and have it become `Meeting + Vendor + Decision + PriceChange` entities automatically, then Graphiti (github.com/getzep/graphiti) as an LLM-driven extraction layer becomes Tier 1, not deferred.

If voice is a nice-to-have, Graphiti stays in Tier 3 and the MVP ingestion is human-triaged from the inbox.

**Question for the founder** (the repo agent should ask): is voice capture with automatic entity extraction a week-one requirement, or can triage stay manual for the first version?

### 7d. Cockpit instinct

When the founder imagines this working in a year, do they open *their own app* to see the cockpit, or do they open an external tool?

Pattern B assumes in-monorepo cockpit. If the founder's gut says "external," we need to revisit Pattern C. The repo agent should confirm this with the founder before building the cockpit UI — it's a one-question check and it prevents building the wrong surface.

## 8. Build order

Revised to account for the repo agent having real filesystem access. Not a Gantt chart — a sequence with a stopping point after each step where the system is usable.

**Step 1: Read the landscape.** Before writing any new code, read `package.json`, `prisma/schema.prisma`, the transaction tracker's models, the planner's models, any existing MCP or AI integration code, and whatever Sanity/Brevo integrations exist. Produce a short reply to the founder confirming: stack as assumed? existing entity shapes that the brain schema should FK into? Sanity and Brevo current roles (resolve §7a and §7b)?

**Step 2: Schema.** Add the `Entity`, `Relationship`, and `InboxItem` models to Prisma. Enable pgvector on Supabase (one SQL extension). Migrate. Keep it minimal — don't add fields you don't yet have a use for.

**Step 3: MCP server.** Stand up a TypeScript MCP server in the monorepo exposing the tools in §5. Get Claude Desktop (or Claude Code) connected to it. Test: create a Vendor entity, link it to a Decision, query related. Stop here and verify it works end-to-end before continuing.

**Step 4: Capture pipeline.** One endpoint, `POST /inbox`, that accepts text + optional attachments and creates an `InboxItem`. Wire Drafts on the founder's iPhone to this endpoint (Drafts action with an HTTP step). Wire an iOS Shortcut for photo/receipt capture. Desktop hotkey via the monorepo's existing UI.

**Step 5: Triage UI.** Minimal. An inbox view in the founder's cockpit that shows pending items and lets them, for each item, route to: new Entity, append to existing Entity, new Task, trash. Enforce the intake format (`verb + object + context + deadline`) on Task creation. This is the surface the founder uses twice daily.

**Step 6: Outbound delegation (one channel).** Pick the channel based on §7b. Inngest workflow, one recipient type, `waitForEvent` for completion. One concrete delegation (e.g., "text the prep lead this task") working end-to-end.

**Step 7: Operator cockpit.** The daily dashboard. Live queries: today's tasks, this week's obligations, waiting items, recent decisions, upcoming renewals (joining entity data with the planner's calendar and the transaction tracker's vendor data via the FKs). This is where the founder feels the system compound.

**Step 8+ (deferred):** Graphiti-style ingestion (contingent on §7c), additional delegation channels, weekly review automation, semantic search UI, any external hub (Pattern C) if §7d pulls that direction.

The system should be usable and delivering value after Step 5, before outbound delegation and cockpit polish. If the founder stops using it at Step 5, the later steps don't matter — and that's useful signal.

## 9. Principles to hold to (from the source doc, worth restating)

- **One front door.** Every capture surface streams into one inbox. No parallel capture systems.
- **Aggressively boring.** Optimize for compliance, not elegance. No complicated tags, priority flags, custom fields the founder won't maintain.
- **Capture ≠ task management.** Three levels: capture (raw), clarify (what is this?), commit (when does it come back, who owns it). The middle step is where ADHD founders fail — the schema and UI must enforce it.
- **Projects must decompose into next actions.** The UI should make it awkward to leave a project undecomposed.
- **The weekly review is where the system becomes a business tool.** Build a Sunday template early (Step 7-ish), not late.

## 10. Ongoing questions the repo agent should keep in mind

- Every time a new entity type or relationship type gets added, is it earning its place, or is it premature structure? The schema should grow from real use, not speculative modeling.
- Every time a capture surface or delegation channel gets added, does the founder actually use it? If not, remove it. More surfaces = more leakage if they're not used.
- When does the brain start paying for itself? The founder's test is whether they've stopped re-deciding the same things. That's the real KPI.