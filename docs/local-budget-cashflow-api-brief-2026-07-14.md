# Implementation brief for the Local Budget agent: cashflow API inputs

> Audience: an agent working inside `C:\Users\user\Local Budget`.
> Owner decision recorded 2026-07-14.
> This brief supersedes the direct-database recommendation in
> `docs/local-budget-shared-db-brief.md` for production cashflow and forecasting.
> Direct read-only database access may remain temporarily for diagnostics, but
> `local-effort-app` must consume a versioned API contract in production.

## Outcome

Make Local Budget the authoritative API source for actual business cashflow so
`local-effort-app` can build a six-month operating forecast without guessing,
reading Local Budget's schema directly, or silently dropping unclassified costs.

The ownership boundary should be:

- **Local Budget owns actual money:** bank transactions, Square settlements,
  payroll withdrawals, COGS/inventory, operating costs, splits, classification,
  reconciliation, and source freshness.
- **Square owns invoice facts:** issued/paid/scheduled invoices. Local Budget may
  ingest or proxy these, but recurring invoices must not be modeled as Square
  Subscriptions; these are Dashboard recurring invoice series.
- **local-effort-app owns operating commitments:** Hub customer lifecycle,
  committed events, and scheduled staff shifts. It combines those commitments
  with Local Budget actuals; it must not write accounting classifications back.

Do not build another speculative forecast inside Local Budget. Expose clean
actuals, recurring commitments, and quality metadata; the consumer owns forecast
presentation.

## Why this is needed now

Live checks on 2026-07-14 found:

- Local Budget was current through 2026-07-12, while the Brain mirror stopped at
  2026-06-26. A forecast based on the mirror was stale by 16 days.
- The Local Budget API credentials were not configured in `local-effort-app`, so
  diagnostics fell back to `LOCAL_BUDGET_DATABASE_URL` and raw SQL.
- 2026 posted costs through July 12 contained about $22,286.67 classified as
  COGS and $29,528.98 as operating expense.
- A `Labor` category had no effective classification. A transaction-level audit
  found $2,450 while a split-aware Jan-June rollup found $2,626. This mismatch is
  itself a blocker: splits and category inheritance are not represented
  consistently enough for a cashflow consumer.
- Amazon was grouped almost entirely as operating expense ($2,759.95 YTD), while
  Costco appeared mainly as Materials/COGS ($1,115.05). Neither is granular
  enough to distinguish food, paper goods, durable equipment, and personal spend.
- Four observed Square recurring invoice series total $3,574/month. They are
  recurring invoices, not Subscriptions. A consumer that only checks scheduled
  invoices sees an incomplete total.

## P0: ship a stable monthly actuals endpoint

Add:

```text
GET /api/integration/v1/cashflow-actuals
  ?from=2026-01-01
  &to=2026-07-01
  &grain=month
```

Authentication stays bearer-token based. Return integer cents only:

```json
{
  "contractVersion": 1,
  "methodVersion": "cashflow-actuals-v1",
  "currency": "USD",
  "timezone": "America/Chicago",
  "generatedAt": "2026-07-14T18:00:00.000Z",
  "sourceMaxDate": "2026-07-12",
  "range": {
    "from": "2026-01-01",
    "toExclusive": "2026-07-01",
    "completeMonthsOnly": true
  },
  "months": [
    {
      "month": "2026-01",
      "incomeCents": 0,
      "inventoryCents": 0,
      "operatingCents": 0,
      "laborCents": 0,
      "reimbursableCents": 0,
      "personalExcludedCents": 0,
      "transferExcludedCents": 0,
      "unclassifiedCents": 0,
      "transactionCount": 0,
      "splitLineCount": 0,
      "complete": true
    }
  ],
  "quality": {
    "unclassifiedTransactionCount": 0,
    "unclassifiedCents": 0,
    "splitMismatchCount": 0,
    "pendingTransactionCount": 0,
    "latestBankSyncAt": "2026-07-14T17:30:00.000Z",
    "warnings": []
  }
}
```

### Required calculation rules

1. Use posted transactions only by default. Make pending amounts explicit; never
   mix them silently into actuals.
2. Respect transaction splits. If splits exist, use split amounts instead of the
   unsplit parent amount. Assert that absolute split totals reconcile to the
   parent within one cent.
3. Effective classification precedence:
   `split.classification -> split category default -> transaction.classification
   -> transaction category default -> unresolved`.
4. Derive a stable business `costBucket` independently from the accounting enum:
   `INVENTORY`, `OPERATING`, `LABOR`, or `EXCLUDED`. A category named Labor,
   Payroll, Wages, Contractor, or Staff must enter `LABOR` even if its accounting
   classification is currently null.
5. Never force unresolved money into operating costs. Return it as
   `unclassifiedCents` so the UI can warn the owner.
6. Treat the `to` boundary as exclusive and label partial months. Forecast code
   will normally request six complete calendar months.
7. Edited classifications and splits must update the API result immediately and
   must bump a stable `updatedAt`/change cursor.

## P0: repair labor coverage

Cashflow labor means cash paid for labor, not only scheduled hours.

1. Confirm the bank account debited by Square Payroll is connected and current.
2. Normalize Square Payroll/Block payroll withdrawals and payroll-tax debits to
   `costBucket=LABOR` using maintainable classification rules.
3. Include contractor/manual-check/Zelle labor when it is genuinely business
   labor. Do not infer every transfer to a person as labor.
4. Preserve the distinction between gross wages, employer taxes, reimbursements,
   contractor pay, and unknown labor when source detail supports it:

```json
{
  "costBucket": "LABOR",
  "costSubcategory": "GROSS_WAGES|EMPLOYER_TAX|REIMBURSEMENT|CONTRACTOR|UNKNOWN"
}
```

5. Add a reconciliation view/test comparing total labor-category cash outflow to
   known payroll withdrawals. Do not require a manual Square Payroll CSV for the
   routine forecast path; bank cash movement is the minimum sustainable source.
6. Fix and backfill the current `Labor` category so transaction-level and
   split-aware totals agree exactly.

## P0: recurring invoice facts, not Subscription API guesses

Add an additive endpoint:

```text
GET /api/integration/v1/recurring-revenue?asOf=2026-07-14
```

Return one row per recurring **invoice series**:

```json
{
  "contractVersion": 1,
  "asOf": "2026-07-14",
  "monthlyCommittedCents": 357400,
  "series": [
    {
      "seriesId": "stable-non-pii-id",
      "squareCustomerId": "optional-stable-id",
      "cadence": "MONTHLY",
      "cadenceDaysObserved": 28,
      "currentInvoiceAmountCents": 0,
      "status": "ACTIVE",
      "firstInvoiceDate": "2025-01-01",
      "lastInvoiceDate": "2026-07-01",
      "nextExpectedDate": "2026-08-01",
      "evidenceInvoiceCount": 0,
      "lastInvoiceStatus": "PAID"
    }
  ],
  "quality": {
    "seriesWithoutCustomerId": 0,
    "ambiguousSeriesCount": 0,
    "warnings": []
  }
}
```

Requirements:

- Do not read `subscriptionId` as the definition of recurrence. These series are
  Square recurring invoices created in Dashboard.
- Prefer an explicit Square recurrence/series identifier if available internally.
  Otherwise use a documented deterministic identity and expose the observed
  cadence/evidence count.
- Do not count a future scheduled invoice again when it belongs to an already
  included recurring series.
- Keep one-off scheduled invoices separate.
- Carry stable Square customer identity so Hub meal-prep activation and cashflow
  can refer to the same customer without using names or fuzzy matching.
- Do not infer cancellation solely because the latest invoice was refunded;
  expose status evidence and let the owner correct the series state.

## P1: improve the existing transaction API

For every row from `GET /api/integration/v1/transactions`, add or guarantee:

```json
{
  "id": "stable-id",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "direction": "outflow",
  "amountCents": 12345,
  "effectiveClassification": "COGS",
  "costBucket": "INVENTORY",
  "costSubcategory": "FOOD",
  "category": { "id": "id", "name": "Inventory" },
  "vendor": { "id": "stable-id", "name": "Costco" },
  "squareCustomerId": null,
  "splits": []
}
```

- Amount must be integer cents. Keep any decimal-dollar field only for backward
  compatibility.
- Cursor on `(updatedAt,id)`, not transaction date, so reclassification and
  split corrections are replayed.
- Include source/account freshness without exposing credentials or full account
  numbers.
- Keep response fields additive within `/v1`; make a `/v2` only for breaking
  semantic changes.

## P1: Amazon and Costco allocation groundwork

The eventual goal is to predict consumables such as paper goods separately from
food inventory.

1. Ingest order/receipt line items when available. Email receipts, Amazon order
   exports/APIs, and Costco receipt data are acceptable source adapters.
2. Preserve source item description, quantity, unit price, line total, order id,
   transaction id, and vendor id.
3. Add a reviewed item allocation taxonomy:
   `FOOD`, `PAPER_GOODS`, `PACKAGING`, `CLEANING`, `DURABLE_EQUIPMENT`,
   `PERSONAL`, `UNKNOWN`.
4. Allocations must reconcile to the transaction total. Shipping, tax, discounts,
   and unmatched residuals must be explicit lines rather than disappearing.
5. Learn mappings only after owner review; retain provenance and allow reversal.
6. Until line-item coverage is adequate, keep Amazon/Costco at their Local Budget
   category and expose the `UNKNOWN` share. Do not guess paper-goods usage from a
   merchant-level total.

## P1: lifecycle/cashflow identity bridge

Hub now records an idempotent `meal_prep.subscription.activated` fact after a
completed Square payment is matched to a meal-prep intake. Local Budget should
not own or mutate that operational lifecycle. It should make the corresponding
Square customer/invoice identity available so both systems reconcile to the same
fact.

Coordinate an authenticated, read-only commitment exchange:

- Local Budget exposes actuals and recurring invoice facts as described above.
- `local-effort-app` exposes active meal-prep/customer commitments and scheduled
  labor separately.
- Each side uses stable Square customer/invoice ids and source event ids.
- No revenue is added merely because an intake exists. A paid invoice/order is
  required.
- No revenue is counted twice when an active meal-prep customer is already
  represented by a recurring Square invoice series.

## Automated quality checks

Add tests or monitored assertions for:

1. Posted transaction and split primary-key uniqueness.
2. Split sums reconcile to parent transactions within one cent.
3. Every posted business outflow resolves to exactly one of inventory,
   operating, labor, or explicitly unclassified/excluded.
4. `sourceMaxDate` and bank sync freshness remain within the expected ingest
   interval; stale sources produce warnings.
5. Monthly API totals reconcile exactly to Local Budget's P&L for the same closed
   interval and method version.
6. Labor category rows cannot disappear because classification is null.
7. Recurring series are not double-counted with scheduled invoice instances.
8. Corrected historical transactions appear through the update cursor.
9. Currency is explicit and all API monetary fields are integer cents.
10. API responses contain no secrets, bank account numbers, or unnecessary
    employee/customer PII.

## Acceptance criteria

This work is complete when:

- `local-effort-app` can calculate a six-month cost baseline using only Local
  Budget API responses; `LOCAL_BUDGET_DATABASE_URL` is unnecessary in production.
- The endpoint returns six complete months plus current freshness and quality
  metadata in one request.
- Labor is nonzero when payroll cash actually left the business and reconciles
  between split and transaction grains.
- Inventory, operating, labor, excluded, and unclassified subtotals reconcile to
  the source transactions.
- The recurring revenue endpoint identifies the current invoice-series total
  without using Square Subscriptions or double-counting scheduled instances.
- Classification edits are visible through the API without a full historical
  reload.
- Contract tests and a short schema/semantics document live in the Local Budget
  repo.

## Deliver back to the local-effort agent

Return:

1. endpoint URLs and example responses;
2. authentication/env variable names;
3. method and contract versions;
4. cursor semantics;
5. the labor backfill/reconciliation result;
6. freshness SLA and current source dates;
7. known unclassified and split-mismatch counts;
8. test commands and results;
9. any migration or backfill that must run before the API is trustworthy.

