# Local Budget Integration (pointer)

The contract lives in the Local Budget repo:
`Local Budget/docs/integration-local-effort.md`.

Summary for this repo:

- Local Budget is the source of truth for transactions, vendors, Square
  payments, and P&L. The **brain** is the primary consumer here. The
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
