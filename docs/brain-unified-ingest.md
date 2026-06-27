# Unified Ingest Engine — design

> Goal (founder, 2026-06-27): ONE ingest engine, no drift. Every capture path —
> Hub panel (me + staff), Drafts, gmail/square feeds, MCP — flows through the
> same classify→resolve→apply core. Deterministic-first with Claude fallback.
> Surface results in Brain and Hub. Make it easy to parse + apply with *less*
> verification (not none). Especially: simple updates to customer needs.

## The problem with today's ingest

There are **three** overlapping implementations, which is the drift risk:

1. `triageEngine.js` — Claude classifier (`new_entity|append_entity|new_task|trash|needs_human`) + auto-act, runs async on a 2×/day cron.
2. `inboxRoutes.js` `POST /inbox/:id/triage` — re-implements the *apply* logic for `new_entity|append_entity|new_task|trash` (manual founder action).
3. `constraintCorrection.js` — separate parser + apply for the dietary lane.

Classification lives in one place, apply lives in two places, and the dietary
intent lives in a third. Adding an intent means touching all of them.

## The single engine

One module, `backend/api/brain/ingest/` with three pure stages and one orchestrator.
Every entry point calls the orchestrator; nothing re-implements a stage.

```
            ┌───────────── ingestEngine.process(text, ctx) ─────────────┐
 entry      │                                                            │
 points  →  │  1. CLASSIFY  → intent + structured fields + confidence    │ → result
 (below)    │     deterministic rules first; Claude fallback on miss     │   {intent, fields,
            │  2. RESOLVE   → bind to existing entities (customer,        │    resolved, confidence,
            │     vendor, ingredient…) — never mint silently             │    needsConfirm, preview}
            │  3. APPLY     → one switch over intents → the canonical     │
            │     write helpers (shared with everything else)            │
            └────────────────────────────────────────────────────────────┘
```

### Stage 1 — CLASSIFY (deterministic-first, Claude fallback)
- A `classifiers[]` list of cheap deterministic matchers, each returns
  `{intent, fields, confidence}` or null. Order = priority. Light optional tags
  (`diet:`, `price:`, `task:`, `vendor:`, `note:`, `#avoid`/`#medical`) boost a
  matcher to high confidence; plain language still matches at lower confidence.
- If the best deterministic confidence < threshold (e.g. 0.6) AND
  `ANTHROPIC_API_KEY` is set → call Claude with ONE schema that is the union of
  all intents (extends the current TRIAGE_SCHEMA with `constraint_correction`
  and `vendor_price`). Claude returns the same `{intent, fields, confidence}`.
- If no key and deterministic missed → intent `needs_human`.

Intents (v1): `constraint_correction`, `vendor_price`, `task`, `new_entity`,
`append_note`, `trash`, `needs_human`.

### Stage 2 — RESOLVE
- Resolve named refs to existing entities: customer (by name/email/alias/picker),
  vendor, ingredient. Uses the existing `findOrCreateEntity` self-identity guard;
  reads use exact/alias match. A provided `customerId` (from the Hub picker) skips
  customer resolution entirely — the highest-precision, lowest-verification path.
- Resolution confidence feeds `needsConfirm`.

### Stage 3 — APPLY (the canonical write helpers — the ONLY copies)
| intent | apply helper (single source of truth) |
|---|---|
| constraint_correction | `applyConstraintCorrection()` (already built + tested) |
| vendor_price | `setPricing()` in ontologyHelpers (PRICED_AT) |
| task | create Task entity (+ optional ASSIGNED_TO) |
| new_entity | `findOrCreateEntity()` (provisional for low confidence) |
| append_note | Note entity + ABOUT assertion |
| trash | mark inbox item trashed |
| needs_human | leave as pending inbox item with the parse as triageHint |

`inboxRoutes.js` and `triageEngine.js` are refactored to CALL these helpers
instead of re-implementing them. One apply path, period.

## Verification policy (less, not none)
A per-intent `autoApplyThreshold` + severity gate:
- **Auto-apply on confirm-less submit** when `confidence ≥ threshold` AND not
  medical AND customer is resolved (e.g. picker used). Most "no cilantro for
  Katie" notes land here → one tap, done.
- **Require a confirm tap** when confidence is mid, or customer was guessed.
- **Always confirm** medical-severity dietary items (allergy) — the one place
  we never reduce verification.
- Nothing is ever applied with no record: every apply writes a ledger event;
  low-confidence auto-applies are still reversible (provisional / retractable).

## Entry points (all call the same engine)
1. **Hub QuickCapture panel** (me + staff) — textarea + optional customer picker.
   `POST /api/brain/capture` with `{text, customerId?, commit?}`.
   - `commit:false` → returns the preview (classify+resolve, no write).
   - `commit:true` → applies per the verification policy; returns what it did.
   The picker is the streamlining lever: pick the customer, type "no legumes
   this month", submit → applied, no further verification.
2. **Drafts (iPhone)** — a template that POSTs to the same `/capture` (or to
   `/inbox` which the engine drains). Title line picks the lane via a tag.
3. **Existing feeds** (gmail, square, inbox cron) — the triage cron calls
   `ingestEngine.process` per pending item instead of its own classifier.
4. **MCP** — can call the engine too (later).

## Surfacing (Brain + Hub)
- Every capture → `inbox.captured`/`*.applied` ledger event (Brain).
- Applied results show on the entity in Brain Browser.
- Hub: a lightweight feed of recent captures in the QuickCapture panel +
  the existing `routeToHub` ops-alert threads for noteworthy items.

## Migration (no big-bang)
1. Build `ingest/` engine with the deterministic classifiers + Claude fallback +
   the apply switch (wrapping existing helpers — no logic moved yet, just called).
2. Add `POST /api/brain/capture` (preview + commit) → Hub panel uses it.
3. Point `triageEngine` cron at `ingestEngine.process` (delete its private
   classifier/apply once parity verified).
4. Point `inboxRoutes /:id/triage` apply at the engine's APPLY stage.
5. `constraintCorrection.applyConstraintCorrection` stays as the dietary apply
   helper, now called by the engine instead of its own route.

End state: 1 classifier, 1 apply switch, N entry points. Adding an intent =
one deterministic matcher + one schema field + one apply case, in one file.
```
