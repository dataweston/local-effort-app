# Staged Finance Core and sales-layer boundary

**Decision date:** 2026-08-15  
**Status:** all six migration steps implemented (2026-08-17); coverage not yet measured against live data  
**Primary flow:** `Lead -> Opportunity -> Agreement/Subscription -> Order -> Fulfillment -> Invoice -> Payment -> Reorder`

## Decision

Build a thin commercial and payment evidence spine in `local-effort-app` now. Keep Square as the current payment and operating provider, keep Local Budget authoritative for bank cash, reviewed classifications, and developing margin tools, and defer a general ledger and finance-grade inventory valuation until the commercial spine has measured coverage.

The binding constraint is reliable commercial provenance: the system must be able to start with an opportunity or customer commitment and trace it through fulfillment, billing, collection, and cash reconciliation without depending on a processor-specific identifier as the business identity.

## Truth boundaries

| Domain | Authority | This repo's responsibility |
| --- | --- | --- |
| Leads, opportunities, relationships | Sales layer across Brain, Hub, and Planner | Stable links to the agreement, order, invoice, and reorder outcome |
| Agreements and subscriptions | Finance Core commercial models | Terms, period, status, counterparty, billing cadence, and source evidence |
| Orders and fulfillment | Native operational workflow plus Finance Core projection | What was promised, priced, and delivered; no cash or margin inference |
| Invoices and receivables | Finance Core | Billed and outstanding amounts, due dates, allocations, and aging inputs |
| Payment execution | Square today; provider adapter over time | Pending attempts before external calls, provider IDs, outcomes, refunds, and allocations |
| Bank cash and classifications | Local Budget | Posted cash, transfers, payroll, COGS/operating classification, source freshness, and reconciliation |
| Margin | Local Budget margin tools | Consume stable commercial order/line/business-line IDs; return measured or explicitly modeled margin without this repo duplicating cost allocation |
| Brain | Evidence and inference layer | Observe facts and relationships; never act as the accounting ledger |

Local Budget may produce cash-basis management views. `local-effort-app` must not label a bank deposit as earned revenue merely because it was collected or settled.

## Finance Core: now

The additive `now` schema is deliberately smaller than an ERP:

- `CommercialAgreement`: signed contract, accepted recurring arrangement, membership agreement, or other durable commitment, with a document/source reference rather than document storage.
- `CommercialSubscription`: recurring commercial terms and lifecycle independent of a specific provider's subscription object.
- `CommercialOrder` and `CommercialOrderLine`: provider-neutral booked work and sales-line evidence, including `businessLineKey` for the Local Budget margin join.
- `CommercialInvoice`: billed amount, due date, paid date, outstanding amount, and source identity for AR aging.
- `FinancePaymentAttempt`: a durable pending record created before an external processor call.
- `FinancePaymentTransaction`: the provider-reported financial outcome.
- `FinancePaymentAllocation`: the explicit application of a payment to an invoice or order.

The existing channel-native models remain in place. They migrate one vertical slice at a time; there is no flag-day rewrite or historical-column rename.

### Required lifecycle invariants

1. Create the native order/obligation and `FinancePaymentAttempt(status=pending)` atomically before charging.
2. Give the provider the internal order ID as its reference and a stable client-attempt ID as its idempotency key.
3. A completed provider payment writes one `FinancePaymentTransaction` and advances the native/commercial order state idempotently.
4. A failed call preserves the order and attempt with failure state; it does not erase evidence.
5. A database failure before the external call means no charge.
6. A database failure after capture leaves a pending attempt that a webhook or reconciliation job can recover.
7. Provider IDs are mappings, never the primary business identity.

## Finance Core: later

Add these only after the `now` spine has reliable coverage and an accountable owner:

- transactional sellable inventory and reservations, followed by receipt/lot/movement/expiry evidence;
- processor settlement and payout-entry models when the existing Square-to-Local-Budget reconciliation is replaced rather than duplicated;
- refunds, disputes, credit memos, and dunning automation as normalized cross-channel workflows;
- fulfillment-derived revenue schedules and contract-liability projections after accountant-approved recognition policies exist;
- finance-grade inventory valuation and borrowing-base snapshots after physical-count accuracy, material balances, and lender eligibility are measured;
- double-entry journal projections, closed periods, and financial statements only after a CPA/bookkeeper chooses whether this repo or an accounting product owns the official ledger.

`InventoryLot`, `InventoryMovement`, valuation, and borrowing-base work are strategically plausible. They are later because Local Budget's margin work should first establish the cost evidence and join contract. The operational inventory system may advance sooner for availability, food safety, and waste measurement without claiming GAAP valuation.

## Local Budget margin integration contract

The systems should exchange identifiers and evidence, not competing totals.

Finance Core will eventually expose, per completed order line:

- `commercialOrderId` and `commercialOrderLineId`;
- `businessLineKey`;
- source system and immutable source ID;
- SKU/item identity, quantity, price, discounts, fulfillment date, and customer/account identity where appropriate;
- invoice/payment/settlement references without treating settlement date as earned date.

Local Budget should return or expose:

- contract and method versions;
- source maximum date and quality warnings;
- directly matched ingredient, packaging, transaction/delivery, and paid-labor costs where supported;
- shared or unresolved pools kept separate;
- `cashContribution` and any modeled allocations labeled distinctly;
- no silent revenue-share allocation represented as observed margin.

The sales layer can then answer “which channels produce contribution margin?” by joining its opportunity/channel evidence to Local Budget's versioned margin result through stable Finance Core IDs.

## Migration order

1. **Done (2026-08-15).** Weekly meal checkout: native `Order` plus payment attempt before Square.
2. **Done (2026-08-17).** General store: `CommercialOrder` before Square; retain Firestore only as a temporary downstream mirror. Covers `/api/store/checkout`, the Chez Garage at-home deposit, and pizza-party bookings — the last two previously charged with no durable order at all, and the pizza booking used the Square payment id as its Firestore key.
3. **Done (2026-08-17).** Happy Monday: authenticate the caller, promote accepted work to agreement/order/invoice, and allocate payments to invoices. Portal orders project through `backend/api/finance/happyMondayProjection.js`; `process-payment` and `payment-link` now require a Supabase bearer token and resolve the paying account from it.
4. **Done (2026-08-17).** Localist: project the existing roster and Square identifiers into provider-neutral agreement/subscription/payment records without mixing dues with food orders. Only the roster's own `square_order_id` counts as a dues payment.
5. **Done (2026-08-17).** Small events and deposits: map the existing estimate/hold/payment pattern into commercial order/invoice/payment records. The balance invoice is withheld until an estimate is confirmed so quotes never inflate AR.
6. **Done (2026-08-17).** Read-only sales-layer views at `/api/sales/*`: pipeline, expected 7/30/90-day value, collections aging, reorder outcomes, channel revenue with margin join keys, and payment coverage.

### Supporting work these steps required

- `backend/api/finance/commercialOrders.js` — one pre-charge primitive enforcing invariants 1, 2, 5, 6, and 7 per channel, including replay and race resolution.
- `backend/api/finance/receivables.js` — invoices settled by recomputation from allocations, and oldest-first allocation for accounts that pay a running balance rather than a chosen invoice.
- `backend/api/finance/squarePaymentEvidence.js` — the webhook writes provider-neutral evidence for every completed capture (orphans included), and `/api/finance/reconcile-payments` recovers attempts stranded between capture and commit. This is the recovery path invariant 6 assumed and the codebase did not have.
- Projections and reconciliation run nightly by Vercel cron; each is idempotent and re-runnable.

### Not yet done

- Coverage has not been measured against live data: the migration ran against schema and tests, not against a production month. `/api/sales/coverage` and `/api/finance/reconcile-payments` report the kill-condition numbers once real traffic flows.
- Weekly orders still carry no `CommercialOrder`, only the native `Order` plus attempt. They are absent from `/api/sales/*` revenue views for that reason.
- Gift cards (`/api/store/gift-card-checkout`) and the one-off dinner checkouts (february, june, july-dinner, winter-dinner, psyche, pizzafunder) still charge without commercial records.

## Steelman, kill condition, and calibration

**Strongest case against this plan:** a custom commercial subledger can become another incomplete database, increase operator burden, and still fail to produce lender-usable records. Square, Local Budget, and an established accounting package may cover most needs with less engineering.

**Decisive assumption:** stable IDs and pre-payment records will materially improve checkout recovery, sales attribution, margin joins, and AR evidence without requiring duplicate manual entry.

**Most likely reversal fact:** fewer than 95% of in-scope captured payments can be linked automatically to one native/commercial order after two migrated channels operate for a complete month.

**Pause/kill condition:** pause additional model rollout if reconciliation creates routine manual work, checkout error rate increases materially, or operators must enter the same commercial fact in more than one system. Preserve the provider-neutral payment evidence already captured and use an external accounting/CRM integration instead.

**Calibration loop:** review monthly coverage for `booked -> billed -> fulfilled -> collected -> settled`, orphan captures, duplicate attempts, unresolved Local Budget margin joins, AR aging completeness, and operator corrections. Advance inventory valuation or journal work only when the preceding layer meets its coverage target for two consecutive closes.
