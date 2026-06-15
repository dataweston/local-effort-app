# Brief for a Local Budget agent — payment export to the Company Brain

> Audience: an agent working **inside the Local Budget repo**, not this one.
> Written 2026-06-14 from the local-effort-app side. Companion to
> `docs/local-budget-integration.md` (the integration contract) and
> `docs/brain-data-audit.md` (why this matters).

## Why you're being asked to do this

The Company Brain (in `local-effort-app`) has an inference engine
(`backend/api/brain/inferenceEngine.js`) with four nightly jobs:

| Job | Reads | Status today |
|---|---|---|
| PREFERS | `payment.completed` ledger events | **dead — 0 source events** |
| AVOIDS | `payment.completed` | **dead — 0 source events** |
| PRICE_DRIFT | `payment.completed` | **dead — 0 source events** |
| CHURNING | `order.placed` (Square) or `payment.completed` | live (299 orders, runs nightly) |

Three of four jobs produce nothing because **no `payment.completed` events have
ever been ingested**. The brain deliberately delegated transactions/vendors/P&L
to Local Budget (it's the source of truth, and it also touches bank accounts
Square never sees). So the payment stream the inference engine needs must come
**from Local Budget**, via the bearer-token API already described in
`docs/local-budget-integration.md`:

- `GET /api/integration/v1/transactions` (json/csv, cursor-paged)
- `GET /api/integration/v1/vendors` (spend rollups)

Confirm those endpoints exist and return vendor-attributed payment rows. If they
don't yet, that's the first task.

## The decision that needs a human (Weston): Square + bank double-counting

This is the crux and the reason it was excluded originally. Square transactions
are **already accounted for inside Local Budget** (Local Budget reconciles
Square payouts against the bank). Square *also* flows into the brain directly as
`order.placed` events (the 02:30 UTC `squareOrdersSync.js` job). So if Local
Budget exports *all* its transactions as `payment.completed`, a Square sale
could land in the brain **twice**: once as `order.placed` (Square direct) and
once as `payment.completed` (Local Budget, which includes the same Square sale).

There are three clean ways to resolve this. **Do not pick one yourself — surface
it to Weston.** Recommended order:

**Option A (recommended): Local Budget exports VENDOR/EXPENSE payments only —
money going *out*. Square direct stays the source for revenue/orders.**
- `payment.completed` = "we paid a vendor $X" (the outflows: produce, flour,
  QuickBooks, payroll, rent). This is exactly what PREFERS / AVOIDS /
  PRICE_DRIFT want — they're all *vendor* inferences (`entityType: 'Vendor'`).
- Revenue/customer side stays on Square's `order.placed` (already live, feeds
  CHURNING and future repeat-customer inferences).
- **No double-counting**, because outflows (Local Budget) and inflows (Square
  orders) are disjoint sets. This is the cleanest fit for what the inference
  engine actually consumes today, and it's the least code.

**Option B: Local Budget is the single source for ALL money (in and out), and
the brain's direct Square `order.placed` sync is turned OFF.**
- One source of truth, no overlap — but you lose Square's per-line-item order
  detail (Local Budget has the payment total, not the dish-level breakdown the
  brain wants for demand ranking). Heavier, and degrades order analytics.

**Option C: Export everything from Local Budget but tag provenance, and dedupe
in the brain on a shared key.**
- Most flexible, most work, most fragile. Requires a stable cross-system id
  (e.g. Square payment id present in both). Only worth it if Weston wants both
  the Local Budget reconciliation view *and* Square line items unified.

**My recommendation is A.** It maps 1:1 to what the dead inference jobs need
(vendor outflows), needs no dedupe logic, and leaves the working Square order
pipeline untouched. B and C only become worth it if Weston wants Local Budget to
own the revenue picture too.

## The `payment.completed` event shape the brain expects

Whatever you export, write it in the shape the inference engine already reads
(`inferenceEngine.js` — `computePrefers`/`computeAvoids`/`computePriceDrift`):

```jsonc
// one LedgerEvent per payment
{
  "eventType": "payment.completed",
  "source": "local_budget",          // string the brain filters on
  "sourceId": "<stable Local Budget transaction id>",  // for idempotency/dedupe
  "occurredAt": "<ISO date of the payment>",
  "payload": {
    "merchantName": "Co-op Partners Warehouse",  // REQUIRED — bucketed by
                                                 // merchantName.toLowerCase().trim()
                                                 // and matched to a Vendor entity
                                                 // via its aliases
    "amountCents": 14230,            // integer cents — PRICE_DRIFT averages this
    "direction": "outflow",          // if you adopt Option A, tag it
    "localBudgetVendorId": "<id>",   // lets the brain link to the Vendor FK anchor
    "bankAccount": "<optional>"
  }
}
```

Critical details, learned from the audit:

1. **`merchantName` must match an existing Vendor entity's alias.** The brain
   resolves `payload.merchantName` → Vendor by
   `aliases: { some: { alias: <lowercased name> } }`. There are already 149
   Vendor entities (103 seeded from Local Budget as `vendor.seeded`). If your
   merchant names don't match their aliases, the inference silently finds no
   entity and writes nothing. **Before bulk export, reconcile your vendor names
   against the brain's Vendor aliases** (the `/api/integration/v1/vendors`
   rollup is the right basis). Adding aliases on the brain side is cheap; this
   is the #1 thing that will make inferences appear vs. stay empty.

2. **Idempotency is on `(eventType, source, sourceId)`** — the brain's
   `writeLedgerEvent` dedupes on those three. Use a stable Local Budget
   transaction id as `sourceId` so re-runs don't double-write.

3. **The brain crons are GET requests** and run **once daily** (Vercel plan
   limit). The ingest endpoint on the brain side will be registered for GET.

## How to deliver the data (two options)

- **Push (simpler for the brain):** Local Budget POSTs batches to a new brain
  endpoint, e.g. `POST /api/brain/payments/ingest` with `x-brain-admin-key`.
  The brain loops `writeLedgerEvent({ eventType:'payment.completed', ... })`.
  *This endpoint does not exist yet on the brain side — coordinate so it's built
  to match your payload.*
- **Pull (less coupling):** Local Budget just exposes
  `GET /api/integration/v1/transactions?since=<cursor>&direction=outflow`
  returning the payload above, and a brain-side nightly job pulls + writes. This
  reuses the existing contract in `docs/local-budget-integration.md` and is the
  better fit — the brain already planned to consume that endpoint.

Prefer **pull**: it keeps Local Budget a clean data source and puts the
ledger-write logic where it belongs (the brain).

## Acceptance check (how the brain side will know it worked)

After ingest, on the brain side run the inference pass and look at the
diagnostics block now emitted by `runInferencePass` (added 2026-06-14):

```
brain/inference: pass complete { ..., diagnostics: { payments: <N>, orders: 299 } }
```

`payments` must be > 0, and PREFERS/AVOIDS/PRICE_DRIFT should stop logging
"its source ledger events do not exist". A vendor paid ≥3× in 90 days should
appear as a PREFERS inference on `/weeklydemo` (BrainPulsePanel) and in the
brain Explore tab.

## What NOT to do

- Don't export Square *revenue* as `payment.completed` if Option A is chosen —
  that's the double-count.
- Don't invent new merchant names; reconcile to the 149 existing Vendor
  entities first.
- Don't assume sub-daily delivery — the brain consumes once a day.
