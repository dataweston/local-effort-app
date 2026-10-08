# Financial accuracy handoff

Prepared October 6, 2026 for the next agent improving the annual report data.
Status: Active
Owner: Next agent assigned to the financial-accuracy audit
As of: 2026-10-06
Review by: Completion of the acceptance criteria below
Authority: `westonsmithxyz/ops/control-plane/projects.json` → `evidence-ingestion`; read-only Local Budget integration API

## Delivered

- Replaced the stale January–September manual P&L in `src/pages/AnnualReportPage.jsx` with a January–September 2026 cashflow report for the complete calendar window: **2026-01-01 through 2026-09-30**.
- Updated `docs/design/ANNUAL-REPORT.md` so the design contract describes the January–September cashflow report.
- The page is intentionally an **internal working draft**, not a closed annual statement. It shows nine complete calendar months with no partial-month buckets.
- The page uses Local Budget cashflow actuals rather than inventing gross revenue, refunds, rent, materials, channel, or food-kind figures that the verified source does not provide.

## Verified source and audit

The source was the read-only Local Budget integration API, using the audit command:

```text
corepack pnpm audit:accuracy -- --from 2026-01-01 --to 2026-10-01 --no-gmail --output .tmp/accuracy-audit/accuracy-audit-january-through-september.json
```

The successful audit artifact is local-only and ignored by git:

```text
.tmp/accuracy-audit/accuracy-audit-january-through-september.json
```

The cashflow contract reported `contractVersion: 2` and method `cashflow-actuals-v2.1`. The complete January–September audit returned without truncation, with 3,303 transaction-lineage rows across 17 pages and lineage version `transaction-lineage-v1`. The report consumer gate remains false.

### Gmail-enabled follow-up (October 6, 2026)

The bounded Gmail-enabled audit was also run for the same January–September
window, with Jev disabled:

```text
corepack pnpm audit:accuracy -- --from 2026-01-01 --to 2026-10-01 --output .tmp/accuracy-audit/accuracy-audit-january-through-september-gmail.json
```

The ignored artifact contains 862 deduplicated message records: 40 Wedge
receipts, 382 Square notices, 129 meal-prep agreements, 153 event candidates,
and 10 menu candidates, among other classifications. The Wedge parser marked
39 of 40 receipts parsed and one for review; parsed means only that its current
date-and-total checks passed, not that the receipt is reconciled. Event and
meal-prep exception counts remain 18 and 6. The event and meal-prep keyword
queries now include inbound and outbound messages; retries are deduplicated by
Gmail message ID.

This run's Local Budget requests returned HTTP 500, so it does not replace the
successful no-Gmail cashflow audit above. `annualReportReady` remains false.
The run made no production writes, and no Gmail message body or customer
contact field is retained in the artifact.

## Report totals

These values are from the exact January–September audit and are expressed in USD:

- Posted income: **$111,047.73**
- Inventory: **$30,334.59**
- Labor: **$6,277.00**
- Operating costs: **$38,983.06**
- Operating remainder before unresolved outflows and founder draws: **$35,453.08**
- Unclassified outflow: **$2,367.67** across 89 posted transactions
- Founder draws: **$20,871.23**
- Tracked cash remainder after unresolved outflows and founder draws: **$12,214.18**
- Reimbursable: **$0.00**
- Transfers excluded from business cash: **$232,549.52**
- Cashflow transaction count: **2,749**
- Pending transactions: **18**

Do not rename `operating remainder` to `profit`: this is cashflow actuals, not an accrual P&L. Do not subtract transfers from business operating cash; they are explicitly excluded by the Local Budget contract.

## Data-content improvement priorities

The January–September page currently uses Local Budget cashflow actuals because
the source-content lanes are not reconciled well enough to add inferred income.
The next pass should improve parsing and linkage in these four areas before
changing the report totals.

### 1. Meal-prep and event income

The January–September read-only audit used the existing local corpus and found:

- **Events:** 0 estimates, 0 payment rows, 18 commercial event orders, 7
  invoices, and 3 Finance Core transactions. All 18 commercial event orders
  currently surface `estimate_missing`; the parser needs to connect event
  estimates, deposits, balances, invoices, and Finance Core transactions.
- **Meal prep:** 1 cycle, 4 customer menus, 4 weekly orders, 5 agreements,
  and 0 subscriptions. Two committed menus contain revenue ($267.00 and
  $1,405.00) but have no customer link. Four submitted orders have no
  completed payment attempt.

Improve the source parsing and joins so every event or meal-prep revenue
candidate has a source document, service date, customer/order identity, amount,
payment state, and an explicit confidence or review state. Distinguish
`estimate_missing`, `customer_unlinked`, `revenue_missing`, and
`no_completed_payment_attempt`; do not collapse them into one missing-data
bucket.

### 2. Wedge receipt parsing

The no-Gmail audit intentionally returned **0 Wedge candidates and 0 parsed
receipts**, so it does not prove that the Gmail receipt corpus is empty. The
existing `parseWedgeReceipt()` implementation in `scripts/audit-accuracy.cjs`
only extracts a date, receipt/transaction number, and the last matching total.

Run the Gmail-enabled inventory against the retrieved Wedge messages, then
improve parsing for the actual receipt variants: merchant, purchase date,
receipt number, subtotal, tax, total, payment method, line items, and
classification clues. Preserve the source-document hash/ID and use
`review_required` when fields are ambiguous. Deduplicate message/thread
retries before counting or importing anything into Local Budget.

### 3. All menus collected in Gmail

The existing menu parser is only a line-level food-word heuristic
(`extractMenuCandidates()`). The no-Gmail artifact reports zero Gmail
candidates, zero recipe ingests, zero dish drafts, and zero source links, so
the current database coverage cannot stand in for a Gmail menu inventory.

Inventory inbound and outbound Gmail menu threads, not only `from:me`
messages. Parse menu title, service date, event or meal-prep context, customer
or order linkage, dish names, and source message/thread IDs. Normalize and
deduplicate repeated menu versions, retain the original source provenance,
and distinguish a proposed menu from a final/confirmed menu. Unlinked menus
should remain review candidates rather than becoming revenue or dish facts.

### Acceptance criteria for the next data pass

1. A bounded report lists every parsed event, meal-prep, Wedge, and menu
   candidate with provenance, normalized fields, linkage state, and reason for
   review.
2. Parsed income is reconciled against Local Budget and Finance Core without
   double-counting deposits, settlements, refunds, or transfers.
3. Menu and receipt parsing has deterministic fixtures for the real Gmail
   formats, including malformed/partial messages and duplicate threads.
4. AnnualReport remains conservative: no candidate becomes a financial total
   until its source, amount, date, and linkage are reviewed.

## Remaining readiness blockers

The audit passed its read-only API checks, but `annualReportReady` remains
false. Receipt evidence returned zero rows from the Local Budget endpoint, and
the event, meal-prep, Wedge, and Gmail-menu evidence lanes still need the
content work above.

The authoritative snapshot command was also attempted for `2025-10` through
`2026-09` and failed because the local Prisma database reported
`relation "transactions" does not exist`. Repair that path before treating its
output as a second authority.

## Next-agent work

1. Improve event and meal-prep parsing/linkage, then Wedge receipt parsing,
   then the full Gmail menu inventory in separate reviewable passes.
2. Add deterministic fixtures and compare parsed amounts to Local Budget,
   Finance Core, and source-document totals before updating AnnualReport.
3. Retry the Local Budget read after the HTTP 500 and refresh the Gmail-enabled
   audit after parser work; do not use `--run-jev` unless the explicit privacy
   approval requirements are met.
4. Run the targeted annual report smoke check and a production build. Do not
   send any customer/staff communication as part of this work.

## Changed files

- `src/pages/AnnualReportPage.jsx` — January–September cashflow report and visible quality gates.
- `docs/design/ANNUAL-REPORT.md` — updated page purpose and image description.
- `scripts/audit-accuracy.cjs` — read-only Local Budget audit support added earlier in this work.
- `docs/accuracy-audit.md` — audit contract and limitations.
- `docs/local-budget-integration.md` — integration routes and lineage rules.
- `package.json` — `audit:accuracy` command.

No production records were written and no messages were sent.
