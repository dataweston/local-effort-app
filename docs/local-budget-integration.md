# Local Budget Integration (pointer)

The contract lives in the Local Budget repo:
`Local Budget/docs/integration-local-effort.md`.

Summary for this repo:

- Local Budget is the source of truth for transactions, vendors, Square
  payments, and P&L. The **brain** is the primary consumer here; anything that
  reaches WeeklyDemoPage goes through the brain first.
- Local Budget now exposes a bearer-token API that replaces reading its
  `.env`/database directly:
  - `GET /api/integration/v1/transactions` (json/csv, cursor-paged)
  - `GET /api/integration/v1/vendors` (spend rollups — what seed-brain needs)
  - `GET /api/integration/v1/pnl?year=YYYY` (same numbers as
    `scripts/generate-local-budget-pnl.cjs`)
- Env vars to use here: `LOCAL_BUDGET_API_URL`, `LOCAL_BUDGET_API_TOKEN`
  (`Authorization: Bearer <token>`).
- Consumers to migrate off direct DB access:
  `brain-sidecar/jobs/extract_vendor_crossref.py`, `prisma/seed-brain.js`,
  `scripts/generate-local-budget-pnl.cjs`.
- The WeeklyDemoPage planner financials remain a speculative planning tool
  with their own storage; they are intentionally not fed from Local Budget
  actuals.
