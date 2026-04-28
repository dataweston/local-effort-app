# Brain Fact Modeling

This graph has three different things that should not be collapsed into one shape:

1. Source events: what happened or what was observed.
2. Entities: durable things worth navigating to.
3. Assertions: typed facts connecting durable things.

The ledger keeps source events. The graph keeps the current useful shape.

## Self-Edges

A self-edge is an assertion where `srcId = dstId`.

Use self-edges only when the assertion is a compact snapshot about the entity itself and there is no useful second node to navigate to.

Good self-edges:

- `Menu -> MENU_SNAPSHOT -> Menu`
- `Entity -> STATUS_SNAPSHOT -> Entity` if added later

Avoid self-edges for transactions, emails, orders, invoices, prices, feedback, and reconciliations. Those usually have at least two meaningful participants or an event artifact.

Bad self-edge:

```text
Vendor: Eastside Food Co-op -> PAYMENT_SENT -> Vendor: Eastside Food Co-op
```

Better:

```text
Payment: Eastside 2026-04-12 $87.32 -> PAID_TO -> Vendor: Eastside Food Co-op
Payment: Eastside 2026-04-12 $87.32 -> EVIDENCED_BY -> Receipt: Eastside receipt 2026-04-12
Payment: Eastside 2026-04-12 $87.32 -> RECONCILED_WITH -> LedgerTransaction: local-budget txn abc123
```

Admin API example:

```json
POST /api/brain/facts/promote
{
  "entityType": "Payment",
  "name": "Eastside payment 2026-04-12 $87.32",
  "properties": {
    "amountDollars": 87.32,
    "paidAt": "2026-04-12",
    "processor": "local_budget"
  },
  "links": [
    { "relType": "PAID_TO", "dstId": "vendor-entity-id" },
    { "relType": "RECONCILED_WITH", "dstId": "ledger-transaction-entity-id" }
  ]
}
```

## When To Promote A Fact Into A Node

Keep a fact as an assertion when it is simple, stable, and directly connects two durable entities.

```text
Vendor -> SUPPLIES -> Ingredient
Dish -> CONTAINS -> Ingredient
Offer -> SERVES_SEGMENT -> CustomerSegment
Offer -> CONSTRAINED_BY -> Constraint
```

Promote to a node when the fact has its own lifecycle, line items, reconciliation, status, or multiple relationships.

Promote these:

- Invoice: number, due date, payment status, line items
- Payment: amount, payer, payee, processor id, reconciliation state
- Order: customer, menu, line items, fulfillment status
- EmailThread: participants, subject, outbound/inbound direction, source spans
- Receipt: store, date, line items, total, matched transaction
- Feedback: text, rating, dish/menu/customer, follow-up state
- Decision: options, rationale, expected outcome, review date
- PriceQuote: ingredient, vendor, unit, effective date, source artifact

## Relationship Dictionary

The controlled relationship dictionary lives in:

- `backend/api/brain/relationshipDictionary.js`

Every new `BrainAssertion.relType` should be added there with:

- allowed source entity types
- allowed destination entity types
- whether self-edges are allowed
- inverse label
- promotion guidance
- short description

Unknown relationship types are still allowed as warnings for now, because the existing graph contains legacy relations. New write paths should treat warnings as review signals.

## Practical Promotion Examples

### Price

Raw ledger event:

```json
{
  "eventType": "vendor.price_quote",
  "source": "cpw",
  "payload": {
    "vendor": "Co-op Partners Warehouse",
    "item": "Organic carrots",
    "unit": "case",
    "pricePerUnit": 38.5,
    "effectiveDate": "2026-04-12"
  }
}
```

Simple assertion:

```text
Ingredient: Organic carrots -> PRICED_AT -> Vendor: Co-op Partners Warehouse
metadata: { unit: "case", pricePerUnit: 38.5, effectiveDate: "2026-04-12" }
```

Promote to `PriceQuote` when there are competing vendor quotes, expirations, or line-item evidence.

### Invoice

Do not model an invoice as:

```text
Vendor -> INVOICED -> Vendor
```

Use:

```text
Invoice: CPW INV-1234 -> ISSUED_BY -> Vendor: Co-op Partners Warehouse
Invoice: CPW INV-1234 -> BILLED_TO -> BusinessLine: Weekly Meal Subscription
Invoice: CPW INV-1234 -> INCLUDES -> Ingredient: Organic carrots
Invoice: CPW INV-1234 -> RECONCILED_WITH -> Payment: CPW payment 2026-04-20
```

### Email Thread

Use direct `EMAILED` assertions for lightweight relationship signals.

Promote to `EmailThread` when the thread contains:

- a menu proposal
- a negotiated price
- a decision
- a commitment
- an event inquiry
- source wording worth preserving
