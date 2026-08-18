# Local Budget Integration (pointer)

The contract lives in the Local Budget repo:
`Local Budget/docs/integration-local-effort.md`.

Summary for this repo:

- Local Budget is the source of truth for bank transactions, reviewed cash
  classifications, vendors, Square settlements, and its cash-basis management
  P&L. It does not establish when revenue was earned. The **brain** is the
  primary consumer here. The
  WeeklyDemo planner forecast also reads the versioned cashflow API directly
  for its six-complete-month actual-cost baseline; it does not read the Local
  Budget database or use the Brain mirror as a financial fallback.
- Local Budget now exposes a bearer-token API that replaces reading its
  `.env`/database directly:
  - `GET /api/integration/v1/transactions` (json/csv, cursor-paged)
  - `GET /api/integration/v1/vendors` (spend rollups — what seed-brain needs)
  - `GET /api/integration/v1/pnl?year=YYYY` (same numbers as
    `scripts/generate-local-budget-pnl.cjs`)
  - `GET /api/integration/v1/cashflow-actuals?from=YYYY-MM-DD&to=YYYY-MM-DD&grain=month`
    (planner baseline; cents, source freshness, and data-quality metadata)
  - `GET /api/integration/v1/recurring-revenue?asOf=YYYY-MM-DD`
    (authoritative recurring invoice series; do not substitute Square
    subscription records)
  - `GET /api/integration/v1/items?from&to&lineType&source&limit&cursor`
    (one row per Local Budget `LineItem` — the per-unit price and quantity
    stream, for both purchased receipt lines and sold Square order lines.
    Consumed by `backend/api/brain/localBudgetItemsSync.js`)
  - `GET /api/integration/v1/price-drift` (Local Budget's own per-item unit-price
    trend. **Not consumed here yet** — the brain currently computes its own drift
    from the `/items` stream in `inferenceEngine.js`. If both are kept, one must
    be declared authoritative)

### Square is recorded twice on purpose — count it once

Local Budget mirrors Square's books: a Square-linked account holds the **gross
capture** of each sale at payment time, and the **bank deposit** of that same
money (net of fees) arrives days later on a real account. Both rows are wanted —
the pair is what makes processor fees visible — and only the deposit is cash.

Local Budget keeps its own totals right by scoping them to accounts where
`squareConnectionId IS NULL` (its `src/lib/processor-ledger.ts`). **Any consumer
here that sums Local Budget income must apply the same filter.**
`localBudgetSync.js` does: bank income becomes `payment.received` (cash, summed by
`businessInferences.js`), while processor-ledger rows become `payment.captured`,
flagged `cashEvent: false` and never summed. Capture rows exist for one reason —
they carry the payer, resolved by Local Budget from Square's payment-level
`customer_id`, which is the brain's own `squareCustomerId` Customer FK anchor.
- Env vars to use here: `LOCAL_BUDGET_API_URL`, `LOCAL_BUDGET_API_TOKEN`
  (`Authorization: Bearer <token>`).
- Consumers to migrate off direct DB access:
  `brain-sidecar/jobs/extract_vendor_crossref.py`, `prisma/seed-brain.js`,
  `scripts/generate-local-budget-pnl.cjs`.
- The planner retains its own speculative commitments and scheduled labor. It
  combines those projections with Local Budget cashflow actuals but never
  writes classifications or accounting data back.
- Before the planner can use recurring-revenue for forecast totals, the API
  must expose stable Square invoice instance IDs covered by each recurring
  series. Without membership data, local code cannot safely exclude a
  scheduled recurring invoice while retaining genuine one-off invoices.
