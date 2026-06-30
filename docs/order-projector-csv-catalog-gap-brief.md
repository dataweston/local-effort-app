# Brief: Order projector misses the CSV/catalog ingest path (systemic revenue undercount)

**Repo:** local-effort-app (the brain). **File:** `backend/api/brain/orderGraphProjector.js`.
**Status:** investigated + root-caused 2026-06-30; Happy Monday fixed manually as a one-off. The systemic fix below is NOT done.

## The problem in one line
The order projector only reads `order.placed` events, so every sale that arrived through the CSV/catalog import path is invisible as revenue — it sits as inert `PRICED_AT` price-refs on per-string Product entities instead of `Customer -[ORDERED]-> Dish/Product` edges.

## Evidence (live, 2026-06-30)
- Three Square ingest event streams exist: `order.placed` (305 events, source `square` — the ONLY one the projector reads), `extraction.square_catalog` (456 events), `extraction.square_csv` (36 events).
- The csv/catalog path created Product entities like `"INVOICE - Happy Monday"`, `"INVOICE Happy Monday 4/4"`, `"Happy Monday Invoice"` with **PRICED_AT self-loops** carrying `metadata.unitPriceCents` / `metadata.unitPriceDollars` / `metadata.source:'square_order'`. 1,436 active PRICED_AT edges exist; these are graph-invisible to demand/revenue.
- Worst case: **Happy Monday** showed $3,520 in the brain vs **$17,120 actual** (verified from 14 Square payments by the customer). ~80% undercount. $5,150 of that was sitting in 5 PRICED_AT entries. See `memory/happy-monday-revenue-undercount-2026-06-30.md` and `customer-merge-gap-and-hm-substantiation-2026-06-30.md`.
- This is a CLASS, not an HM quirk: any customer whose sales came via csv/catalog is undercounted the same way.

## What the projector does today (for reference)
`runOrderGraphProjection()` queries `ledgerEvent` where `eventType:'order.placed', source:'square'`, then per line item calls:
- `resolveCustomer(prisma, payload, cache)` → multi-signal (squareCustomerId → email → phone → card fingerprint → walk-in placeholder). Returns `{customer, matchedBy}`.
- `resolveSaleable(prisma, name, cache)` → exact `canonicalName` match to an existing Product/Dish; **never mints** (founder rule). Unmatched line items are logged to the `unmatchedReport`, never created.
Edges are idempotent on `(srcId, dstId, sourceId=ledgerEventId, metadata.lineItemName)`, tagged `sourceType:'order_projection'`.

## The fix
Extend the projector (or add a sibling projector that shares the same resolve helpers) to ALSO consume the csv/catalog path and emit ORDERED edges:

1. **Read the second source.** In addition to `order.placed/square`, read `extraction.square_csv` and `extraction.square_catalog` events. Confirm their payload shape first (the PRICED_AT metadata shows `unitPriceCents`, `source:'square_order'`; inspect a sample of each event type's full payload before coding — do NOT assume it matches `order.placed`'s `lineItems[]` shape).

2. **Resolve the buyer, not a product.** These line items are invoice/custom-amount strings that belong to a Customer, not catalog products. For each, attempt customer resolution using the SAME identity signals the order projector uses (squareCustomerId, buyer email, etc., via the existing `resolveCustomer` logic). When the event carries no customer signal, fall to the labeled walk-in placeholder — same honest behavior as today.

3. **Write ORDERED, retire the PRICED_AT mis-shape.** When a csv/catalog sale resolves to a customer, write `Customer -[ORDERED]-> Dish/Product` (reuse the exact edge shape + idempotency key). For the PRICED_AT self-loops that represented the same money, retract them with a clear reason (`reshaped_to_ordered`) so revenue isn't double-counted and the price-ref noise clears.

4. **Don't mint product fragments.** Keep the founder rule: unmatched saleable names go to the `unmatchedReport` worklist, never minted. Invoice-string "products" (`INVOICE - X`, `Custom Amount`, `advance for pizza`) should resolve to the customer's wholesale Dish, not become Products. Consider a small allowlist/heuristic: line items whose name matches `/invoice|custom amount|advance|deposit/i` are payment lines, not catalog items — attribute the dollar amount to the customer, attach no product.

5. **Idempotent + reversible + tagged.** New edges keyed on the source event id; tag `sourceType` so a single query can reverse them. Add a stat block (csvCatalogSeen, reshaped, edgesWritten) and write a `*.projection.run` ledger event like the existing one.

## Guardrails
- **No double-count.** A given sale must become exactly one ORDERED edge whether it came via order.placed OR csv/catalog. If the same Square payment/order appears in both streams, dedupe on the Square order/payment id before writing.
- **Money source of truth is unchanged.** This only adds attribution/structure (WHO bought WHAT). Revenue totals still reconcile to Local Budget (`payment.received`); never write a `payment.received` from here.
- Cross-check against Happy Monday after the run: the manual fix (Dish "Happy Monday (wholesale)", 14 ORDERED edges, $17,120.75, `sourceType:'hm_substantiation'`) should be reproduced/superseded by the automatic path — make sure you don't double it. Reconcile, don't add.

## Acceptance
- A customer whose sales came via csv/catalog shows correct ORDERED revenue (validate on a 2nd customer beyond HM).
- `PRICED_AT` self-loop count drops materially; reshaped ones carry a retraction reason.
- Re-running the projector writes 0 new edges (idempotent).
