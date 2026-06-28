# Entity resolution & inference — needs assessment

> 2026-06-27. Triggered by an external agent's claim: "suggestive inferences are
> impossible until ingest resolves entities." This doc tests that claim against
> the live graph, separates the two problems it conflates, and specifies the
> resolver layer that fixes the mechanism.

## The claim is right — here's the measured mechanism

Resolution is broken at three layers, all measured live (`scripts`/audit 2026-06-27):

### 1. The inference surfaces don't agree on how entities are keyed
- `inferenceEngine.js` buckets by raw `payload.merchantName` / `payload.customerId` (string match against aliases / squareCustomerId).
- `hypothesisEngine.js` reads `payload.vendorEntityId` and `payload.customerEntityId`.
- **0 ledger events contain `vendorEntityId` or `customerEntityId`.** The hypothesis engine resolves to nothing, every run. The two engines can never agree because one reads a key that is never written.

### 2. Entities exist but lack the keys to be matched
| | count | resolvable signal |
|---|---:|---|
| Vendors total | 146 | — |
| …with any alias | **14** | a payment `merchantName` can only match 14/146 vendors |
| …orphans (no assertions) | 99 | bulk-seeded, never enriched |
| Customers total | 388 | — |
| …with squareCustomerId | 149 | |
| …with localEffortCustomerId | **2** | app-DB ↔ brain link never happened |

### 3. Where keys EXIST, resolution already works (proof the mechanism is sound)
- Order line items → Dish/Product: **82 of 95 named (86%) resolve** by canonical name.
- Order customerId → Customer: **8 of 9 distinct ids (89%) resolve** by squareCustomerId.
- The resolver isn't the ceiling where keys are present — the *absence of keys* is.

## Two problems, not one (the agent conflated them)

| | Problem | Owner | Fixable now? |
|---|---|---|---|
| **A. Resolution mechanism** | entities lack keys/aliases; engines disagree on keying; no `entityId` written back onto events | this repo | **yes — fully in our control** |
| **B. Source coverage** | signal missing/anonymous at origin: 0 payments, 89% of orders anonymous, 207/302 line items unnamed | Square/Local Budget | partly external |

Inference needs BOTH. But **A is the correct first move**: it's entirely ours, and
every future source (payments included) is wasted until the resolver can bind it.
Resolve-first means the day payments arrive, they land on the right vendor.

## The resolver layer (what to build)

A single `resolveEntity()` the ingest engine, projectors, and future syncs all call.
It does match + **backfill** (the backfill is what compounds — each resolution makes
the next one cheaper and writes the shared key the engines need).

```
resolveEntity({ type, name?, squareId?, localEffortId?, aliases? }) ->
  { entity, matchedBy, created }

match precedence (highest-confidence first):
  1. FK anchor   — squareCustomerId / localEffortCustomerId / localBudgetVendorId
  2. exact alias — BrainEntityAlias.alias (case-insensitive)
  3. canonicalName — normalized name
  4. (optional) create provisional when explicitly allowed; else null

backfill on every successful match:
  - if a stable id (squareId/localEffortId) was provided and the entity lacks it -> set the FK anchor
  - if the incoming name differs from entity.name and isn't already an alias -> add alias
  - this turns a fuzzy name-match into a cheap id-match next time
```

Then: a one-time **backfill pass** that writes the resolved `entityId` onto existing
ledger event payloads (`vendorEntityId` / `customerEntityId`), so BOTH engines read
one key. After that, the inference + hypothesis engines are changed to read the
resolved entityId rather than re-deriving from strings.

## What each fix unblocks
- Resolver + alias backfill → vendor coverage 14→~146 ⇒ PREFERS/AVOIDS/PRICE_DRIFT can fire the moment payments exist.
- entityId-on-payload backfill → hypothesis engine stops resolving to 0; both engines agree.
- Resolver in ingest → every Hub/Drafts capture binds to the canonical entity (no new duplicates; the 49 cross-type identity collisions stop growing).

## Sequence
1. **Resolver layer** (`resolveEntity` + backfill) — shared module. ✅ DONE
2. Wire into ingest engine `resolve()`. ✅ DONE (projector skipped — it only sees customerId, which is already resolver step 1)
3. ~~Alias-enrichment pass for the 132 alias-less vendors~~ → **REFRAMED.** Analysis (2026-06-27) showed the *useful* vendor aliases are bank-statement descriptors ("Debit Card EASTSIDE FOOD COOPERATI", "Debit Card WAL-MART #3404") that originally came from Local Budget. A blind "add canonical name as alias" pass is redundant — the resolver already matches canonicalName. The real enrichment = **derive aliases from Local Budget `transactions.merchantName`**, which folds into Track B (LB data not yet imported). Deferred to Track B, not a standalone pass.
4. **entityId-on-payload backfill** + point both inference engines at the resolved key. ✅ DONE — `scripts/backfill-entity-ids.cjs` wrote customerEntityId onto 31 events + vendorEntityId onto 25; inferenceEngine + hypothesisEngine now both read the resolved id (added `bucketVendorEvents`/`resolveVendor` helpers; CHURNING/REPEAT_CUSTOMER prefer customerEntityId). Hypothesis engine no longer resolves to 0.
5. (source coverage / Track B) is the separate, partly-external half — LB schema connected, data import pending.
