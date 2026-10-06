# Accuracy audit

`pnpm audit:accuracy` runs the read-only evidence pass for the six accuracy
lanes:

1. Gmail candidate inventory and lossless source-corpus coverage for events,
   meal prep, Square notices, menus, and Wedge receipts.
2. Event estimate/payment/Finance Core reconciliation candidates.
3. Meal-prep agreement, customer-menu, weekly-order, and payment coverage.
4. Menu candidates plus review-only dish-link candidates.
5. Wedge receipt parse candidates and a non-posting Local Budget import shape.
6. An aggregates-first reporting snapshot with explicit unresolved items and
   AnnualReport readiness gates.

The report is written under `.tmp/accuracy-audit/`. It is read-only with
respect to Finance Core and Local Budget: no financial record, classification,
invoice, receipt, or ledger event is created or changed. The report deliberately
omits message bodies and customer contact fields.

When configured, the Local Budget pass reads:

- `GET /api/integration/v1/cashflow-actuals` with `contract=2`. Its documented
  method versions are `-v1.1` and `-v2.1`, not `-v1` and `-v2`.
- `GET /api/integration/v1/receipt-evidence`, including unlinked receipts.
- Cursor-paged `GET /api/integration/v1/transactions`.

The transactions request deliberately omits classification and direction filters
because their combination can skip rows during paging. The adapter follows
every returned opaque cursor and summarizes only `POSTED` rows whose
`lineage.isCashPosting: true`. Processor captures, fees, refunds, and payouts
are therefore not added to cash postings. Receipt evidence is summarized
without copying its restricted fields into the audit artifact.

The Local Budget section is available only when the root environment contains
`LOCAL_BUDGET_API_URL` and `LOCAL_BUDGET_API_TOKEN`. The script uses the
versioned bearer-token API; it does not read the Local Budget database.

## Jev

Jev is a bounded, review-only classifier. It is not an accounting authority and
cannot post or mutate records. To opt into sending bounded Gmail fields and a
4,000-character body snippet to the TypeSafe System One endpoint, an operator
must explicitly pass `--run-jev` and set
`ACCURACY_JEV_PRIVACY_APPROVED=true` in the local server-side environment, with
`TYPESAFE_API_KEY` configured. The script caps classification at 50 messages and
records only the model answers/provenance, never the message body in the audit
artifact. Without both opt-ins it reports the exact reason Jev was not run.

AnnualReport is intentionally not switched to this snapshot until the phase 6
gates in the generated report are green. This avoids replacing the current
report with partial or unreviewed evidence.

## Quick reconciliation review

After generating an accuracy-audit artifact, create a short, local review sheet.
Run these commands from the repository root, using the syntax for your shell.

**PowerShell**

```powershell
corepack pnpm run audit:accuracy -- --from 2026-01-01 --to 2026-10-01 --no-gmail --output .tmp/accuracy-audit/accuracy-audit-january-through-september.json
npm run review:reconciliation -- .tmp/accuracy-audit/accuracy-audit-january-through-september.json .tmp/reconciliation-review.md
```

**Bash**

```bash
corepack pnpm run audit:accuracy -- --from 2026-01-01 --to 2026-10-01 --no-gmail --output .tmp/accuracy-audit/accuracy-audit-january-through-september.json
npm run review:reconciliation -- .tmp/accuracy-audit/accuracy-audit-january-through-september.json .tmp/reconciliation-review.md
```

Use `npm run review:reconciliation -- <input.json> <output.md>` to generate the
review sheet in an npm environment. Do not prefix npm with `corepack`: this
repository's `packageManager` field selects pnpm, so `corepack npm` reports a
package-manager mismatch. The `--` separates npm's options from the script's
file path arguments. `--no-gmail` skips Gmail; remove it when the audit should
include Gmail evidence and the local Gmail connection is configured.

The command compares the cashflow category total (including explicitly excluded
transfers) with posted cash-lineage dollars, checks API availability, paging and
split mismatches, and lists the lineage mix. It then provides a five-minute owner
checklist for tracing one Square capture through payout/settlement to exactly one
bank cash posting. The generated review remains under `.tmp/`, starts with an
`OPEN` decision, and never changes `annualReportReady`; the reviewer must explain
any difference and record a decision separately. Processor captures, fees,
refunds, payouts, and bank settlements must never be added together as revenue.

## Candidate fields and limits

Event and meal-prep source rows expose one review-only candidate per estimate, commercial order, invoice, customer menu, weekly order, agreement, or subscription. Each row carries source-record identity, any linked source document ID/hash, service date, pseudonymous customer identity or order ID, amount and amount basis, payment-state evidence, confidence, and separate review reasons. Planned menus, contracts, invoices, orders, attempts, and settlements are linked evidence and must not be added together as income. Candidate amounts are not reconciled revenue and do not change AnnualReport.

Gmail menu searches are sender-direction agnostic. Menu versions are grouped by normalized title, service date, context, and dish list while retaining each message/thread ID and source-document hash. Wedge messages are deduplicated by Gmail message ID before counting or forming the non-posting import shape. Raw email text is held only in memory during parsing and is omitted from the JSON report.

The deterministic parser fixtures run with:

```sh
corepack pnpm exec node --test scripts/__tests__/audit-accuracy.test.cjs
```

Those fixtures cover representative and malformed receipt/menu shapes. They do not substitute for checking the current Gmail corpus; if the Finance Core database cannot be reached, the Gmail-enabled audit exits before retrieving tokens or running Local Budget reads.
