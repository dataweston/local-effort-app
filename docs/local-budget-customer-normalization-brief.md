# Brief for the Local Budget agent: extend vendor-merge to CUSTOMERS

**Repo:** Local Budget (`C:\Users\user\Local Budget`). **Audience:** the LB agent.
**Origin:** local-effort-app brain investigation 2026-06-30. The brain consumes LB read-only via `LOCAL_BUDGET_DATABASE_URL`; this brief asks LB to fix data at its source.

## Context: you already built this for vendors
You recently shipped vendor normalization + merge:
- `src/lib/normalization/vendors.ts` — `normalizeVendorName()` (lowercase, strip `#storenum`/`-locnum`/`inc|llc|ltd|corp|co`, then `VENDOR_ALIASES` map → canonical), `findSimilarVendors()` (Jaccard on char bigrams, 0.8 threshold), `extractVendorFromDescription()`.
- `src/server/api/routers/vendors.ts` — `list`/`getByName`/`findDuplicates`/`merge`/`spendingTrend`. `merge` rewrites `transaction.merchantName` to a target across matched rows. Vendors are DERIVED from `merchantName`; there is no vendors table.

**There is no customer equivalent.** No `normalization/customers.ts`, no customers router, no payer normalization. INCOME transactions carry a `merchantName` (the payer), but it is never normalized or merged. That is the gap.

## Why it matters (evidence from the brain side)
- The brain's inference layer attributes customer revenue by resolving the payer. When LB income rows carry no normalized payer, the brain can't link a deposit to a customer — income lands payer-less and gets matched to Square payouts only by amount/date (lossy).
- Concrete failure: **Happy Monday** true revenue is **$17,120** (14 Square payments) but appeared as $3,520 in the brain. Part of the cause is that HM's payments in LB are generic Square-ACH deposits with no payer, so they can't be grouped to one customer.
- **Critical nuance — keep customer and vendor identities SEPARATE.** Happy Monday is BOTH: Local Effort sells wholesale TO Happy Monday (income/customer), AND the founder buys coffee AT Happy Monday's café (expense/vendor, ~$1,328 across 28 PERSONAL rows). These must NOT be merged into one entity. A customer-normalization layer that blindly reused vendor canonicalization would collapse them. Normalize payers on INCOME rows; normalize merchants on EXPENSE rows; never cross the two.

## What to build (mirror the vendor pattern)
1. **`src/lib/normalization/customers.ts`** — `normalizeCustomerName()`, `findSimilarCustomers()`, optionally a `CUSTOMER_ALIASES` map. You can share the generic bigram `similarity()` helper, but customer canonicalization rules differ from vendors (people/business names, not retail-chain suffixes). Do NOT strip `co`/`inc` aggressively — "Happy Monday & Co" is a real distinct name from the customer "Happy Monday".

2. **Customers router** (`src/server/api/routers/customers.ts`) — `list`/`getByName`/`findDuplicates`/`merge` over INCOME transactions' payer name. `merge` rewrites the payer field to a canonical target, same shape as the vendor merge. Scope strictly to `type='INCOME'` (and exclude TRANSFER), so expense merchants are never touched.

3. **Square ACH payer enrichment.** HM-style income arrives as Square deposits with empty `merchantName`. Where the Square sync can recover the payer (customer_id / buyer email on the underlying Square payment or invoice), populate the income row's payer field so it becomes normalizable. (See `src/app/api/square/sync/route.ts` / `src/lib/square.ts`.) If the payer truly can't be recovered at deposit time, leave it null — the brain reconciles those via Square payouts.

## Guardrails
- Income payer normalization and expense merchant normalization are SEPARATE pipelines. Same person/business can be a customer AND a vendor; keep both.
- Don't migrate the brain's DB or write to it — LB is the source; the brain reads you. Just fix the payer data + expose the merge tools, same as vendors.
- `merge` should be founder-driven (manual confirm), like the vendor merge — not automatic, to avoid wrong collapses.

## Acceptance
- A customers tab/tool lists income payers with normalized names + duplicate detection, mirroring vendors.
- Happy Monday's income deposits carry a recoverable/normalized payer and group to one customer — WITHOUT touching the "Happy Monday & Co" café expense rows.
- The brain's next local-budget sync sees normalized payers and can attribute income to customers (it already has `resolveEntity` FK→alias→canonical ready to consume them).
