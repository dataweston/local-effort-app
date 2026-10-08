# Food Operations Core: plan

**Owner:** Local Effort owner · **As of:** 2026-10-07 · **Review by:** 2026-11-07, or when Phase 1 closes, whichever is first
**Status:** Phases 0–3 implemented on `min` (2026-10-07); migration `20261007000100_food_ops_catalog_recipes` **applied to production at owner request** (tables empty; no seed or import applied). Receipt bootstrap built as dry run only (see Section 4a). Phase 4+ is gated (Section 5) and not built. · **System of record for this work:** `local-effort-app`
**Operate:** `node scripts/food-ops.cjs` (dry run until `--apply`; see file header) or admin API `/api/food-ops/*` (`backend/api/routes/foodOps.js`). Receipts: `scripts/food-ops-wedge-receipts.cjs`, `scripts/food-ops-eastside-receipts.cjs`. Tests: `backend/api/foodOps/__tests__/`, `backend/api/foodOps/receipts/__tests__/`, `backend/api/routes/__tests__/foodOps.test.js`.
**Goal loop:** `vendor item → stock product → recipe → requirement → purchase/receipt → stock → production → finished goods → fulfillment → theoretical vs actual usage → material cost`

This plan is the verified successor to an outside analysis (Odoo and MarginEdge comparison). Section 1 records what held up and what did not. The rest is the build plan.

## 1. Verdict on the outside analysis

Each claim was checked against the code and docs on `min`, Local Budget (LB), and the control-plane registry.

| Idea | Verdict | Reason |
| --- | --- | --- |
| Build the ops layer in `local-effort-app`, not in LB | **Adopt** | Matches `finance-core-staged-plan.md`. LB docs say LB does not own invoices, AR/AP, or inventory valuation. |
| `StockProduct` separate from `CommercialProduct` | **Adopt** | Flour is stock, not a sellable. Link them through a join table. |
| `VendorItem` mapping (MarginEdge vendor item → product) | **Adopt, and it is the first build** | LB has no item aliases, SKU, or pack size. No mapping exists anywhere (`LB Item` is a find-or-create by name). |
| Versioned recipes as nested BOMs | **Adopt** | No BOM model exists. Supabase `meal_recipes` is a consumer nutrition library; do not build on it. |
| Keep `MealPrepProductionBatch`; derive from it | **Adopt, as a read-only projection** | It is servings-level, deterministic, hash-versioned. Requirements are computed from it and never written back into it. |
| Immutable `StockMovement` ledger, on-hand = sum | **Adopt the structure; change the input discipline** | A kitchen will not log every consumption. Counts plus purchases drive truth; recipe-derived consumption is labeled `derived`. |
| Locations and internal transfers carry no revenue | **Adopt** | Names in the analysis (Smith Kitchen, Commissary, Smith Pickup) are stale. The facility roster changed 2026-09-15 (`CURRENT_WORK.md`). Locations are owner-supplied data, not code constants. |
| `local-office` as the operator UI | **Reject for now** | It is an unwired, undeployed workspace with its own Prisma schema for a different corporate-ordering product. Staff UI lives in the existing React SPA. |
| PO → receipt → vendor invoice three-way match | **Defer** | LB has zero `Receipt` rows and 184 line items, none receipt-linked. MarginEdge is invoice-driven, not PO-driven. Receive from invoice lines; add POs only on a trigger (Phase 8). |
| `VendorBill`/AP and inventory valuation in LB | **Reject** | Both repos' docs put AR/AP and valuation outside LB. This repo already has `FinanceCostObligation`/`FinanceCostPayment`. Valuation stays deferred until a CPA decision and measured count accuracy. |
| Lots, expiry, recall | **Defer behind a trigger** | Add when frozen-pizza distribution or a regulator needs lot codes. The ledger is append-only, so adding `lotId` later is additive. |
| Close the loop with LB actual margin | **Blocked, partly** | LB does not accept `commercialOrderId` or `businessLineKey` yet. This repo emits modeled material cost with join keys; the LB-side join is a separate LB task. |
| Brain observes, never authoritative | **Adopt** | Matches `finance-core-staged-plan.md`. |
| No generic Odoo scope (routings, HRIS, workflow designer) | **Adopt** | |

### What the analysis missed

1. **The cost corpus is empty.** `backend/api/brain/cogsRollup.js:4-6` says per-ingredient costing is blocked (`items=0`, line items are non-food). LB docs (as of 2026-08-22) show zero `Receipt` rows. Gmail invoice ingestion is blocked on OAuth. Anything downstream of "supplier invoice" has no data until invoices flow. Phase 1 therefore starts with a manual, provenance-tagged price book.
2. **Two repos disagree on ledger ownership.** LB's remediation plan calls LB the sole accounting authority. `finance-core-staged-plan.md:61` says a CPA decides. This plan does not touch the ledger; Phase 8 valuation is gated on that disagreement being resolved.
3. **Existing kill conditions apply.** `finance-core-staged-plan.md:118` pauses rollout if operators enter the same fact in more than one place. `projects.json` ranks `local-budget-close` first; this plan must not need LB code changes in Phases 1-5.
4. **The checkout stock gate already exists.** Sanity `product.manualQty` with optimistic-lock reserve/release (`api-handlers/store/_manualInventory.js`) guards oversell. The ledger must not replace it in this plan.
5. **Naming collision.** `InventoryResource`/`InventoryReservation` (quote-time capacity, `schema.prisma:788,807`) already exist. New stock models use `Stock*` names, never `Inventory*`.

## 2. Boundaries

| Domain | Owner |
| --- | --- |
| Customers, agreements, orders, invoices, payments | `local-effort-app` Finance Core (unchanged) |
| Stock products, vendor items, recipes, locations, counts, movements, production orders | `local-effort-app` Food Ops (new) |
| Vendor payables (`FinanceCostObligation`) | `local-effort-app` (extend only if Phase 8 needs it) |
| Invoice documents, OCR, line items, bank/Square/Stripe cash, reviewed classification, journal | Local Budget |
| Margin, cash contribution | Local Budget (this repo emits join keys and modeled material cost only) |
| Brain | Observes; never writes stock or cost truth |

Rules:
- Read LB through its bearer-token integration API (`LOCAL_BUDGET_API_URL`, `LOCAL_BUDGET_API_TOKEN`). Never read LB's database. Never use the Brain mirror as a fallback (`docs/local-budget-integration.md`).
- Theoretical material cost is labeled `modeled`, carries a method version, and is never called margin.
- Nothing in this plan sends email, SMS, or notifications.

## 3. Target data model

Additive Prisma models, one migration per phase. Money is integer cents. Quantities are `Decimal(18,6)` in the product's base unit.

**Units.** Three dimensions, one base unit each: mass → gram, volume → millilitre, count → each. Conversion code lives in `backend/api/foodOps/units.js` as a constant table. Cross-dimension conversion is rejected unless the `StockProduct` has `densityGPerMl`. Cost per base unit is computed from pack cost ÷ base quantity per pack in Decimal, never stored as integer cents (salt is about 0.02¢/g).

| Phase | Models |
| --- | --- |
| 1 | `StockProduct` (kind: raw/prep/packaging/finished), `VendorItem`, `CostObservation` (append-only) |
| 2 | `Recipe`, `RecipeVersion` (immutable once active), `RecipeComponent` (stock product or sub-recipe) |
| 4 | `StockLocation`, `StockMovement` (append-only), `StockCount`, `StockCountLine` |
| 5 | `ProductionOrder` (+ optional per-component overrides) |
| 6 | `StockTransfer` (header; two paired movements), `CommercialProductStock` (join to `CommercialProduct`) |

`VendorItem`: LB vendor id (soft ref), vendor SKU, description, pack quantity and unit, base quantity per pack, mapped `stockProductId`, status (`unmapped`/`mapped`/`ignored`), last pack cost, last purchased date, optional LB item id.
`StockMovement`: product, from/to location, quantity, movement type (receipt, consumption, output, transfer, waste, count_adjustment, fulfillment, reversal), `derived` flag, `sourceType`/`sourceId`/`lineKey` (unique, so every projection is idempotent), `occurredAt`, `reversesId`. Corrections are reversal movements. A database trigger in the migration blocks `UPDATE` and `DELETE`, as LB does for `SourceEvent`.

## 4. Phases

Every phase ships behind admin auth (`createAdminVerifier`, `guarded()` pattern in `routes/productPricing.js`), has colocated vitest tests that use an injected prisma client, and ends with a smoke run of the changed path. Applying a migration or a seed to production needs explicit owner approval. Seeds and imports run through `scripts/food-ops.cjs`, which is a dry run until `--apply`, like `planner.cjs`.

Code layout: pure logic in `backend/api/foodOps/` (`units.js`, `recipeCost.js`, `requirements.js`, `stockLedger.js`, `localBudgetClient.js`); one router `backend/api/routes/foodOps.js` mounted at `/api/food-ops` in `backend/api/index.js` next to `/api/finance` and `/api/sales`; UI at a new internal SPA route `/ops`, which must be registered in `vercel.json` noindex headers, `robots.txt`, and `INTERNAL_ROUTES` in `src/config/routes.js` together.

### Phase 0: Register and align (no feature code)
- Add a `food-ops-core` project to `westonsmithxyz/ops/control-plane/projects.json`: lane `operations`, `systemOfRecord: local-effort-app`, ranked below `local-budget-close`, with the kill condition from Section 5. Validate with `node validate-projects.mjs`.
- Amend `finance-core-staged-plan.md` "later" section to point here and record that the owner has authorized operational inventory (AP and valuation remain deferred).
- Collect owner inputs: location roster, the top ingredient and packaging list, vendors that email invoices, weekly count cadence.
- **Acceptance:** registry validates; plan and finance plan agree on boundaries.

### Phase 1: Catalog, units, vendor items, cost evidence
- Models: `StockProduct`, `VendorItem`, `CostObservation`. `units.js` with pack parsing (`4/5LB`, `50 LB`, `12 CT`) and dimension rules.
- Cold start: `food-ops.cjs seed-price-book --data file.json` loads the owner's current pack costs with `source: manual`. LB lines replace them as they arrive (`source: lb_line`, `lbLineItemId` for idempotency).
- LB pull: `localBudgetClient.js` reads `/api/integration/v1/items` (purchase lines only), proposes mappings by normalized description, and never auto-maps. An operator confirms.
- UI: Catalog tab with an exception-first unmapped queue (map to product, set pack conversion).
- Coverage metric: share of purchase spend (by vendor, from LB COGS spend) that has a mapped vendor item.
- **Tests:** pack parsing, cross-dimension rejection, density conversion, cost-per-base in Decimal, idempotent observation import.
- **Acceptance:** top-N owner ingredients mapped; a product returns last cost with provenance and date.

### Phase 2: Recipes as BOMs, theoretical cost
- Models: `Recipe` (kind prep/menu/retail; output `StockProduct`; optional `dishEntityId` and `commercialProductId`), `RecipeVersion` (yield, effective-from, content hash), `RecipeComponent` (quantity, unit, waste %).
- Rules: reject cycles on save; versions are immutable once active; a missing component cost makes the result `incomplete` with the missing list, never zero.
- Cost explosion with memoization for nested recipes. Result is `modeled`, method-versioned (`last-paid-v1`).
- One-time CLI import of recipes from JSON/CSV. No runtime dependency on Supabase `meal_recipes` or the cookbook repo (the latter is a historical archive with empty ingredient lists).
- **Tests:** dough → pizza nested cost against hand calculation; cycle rejection; activating v2 leaves v1 cost unchanged.
- **Acceptance:** cost per yield and per serving for the active menu recipes, with incomplete ones listed.

### Phase 3: Requirements and shopping list from production
- `requirements.js` reads a `MealPrepProductionBatch` operator sheet and the active recipes. It returns raw requirements per `StockProduct`, prep quantities per sub-recipe, and a list of dishes with no active recipe. It is computed on read, pinned to the batch `sourceHash` plus recipe version ids, and writes nothing.
- Shopping list groups by preferred vendor item and rounds up to whole packs. Netting against on-hand turns on after Phase 4.
- Before coding: read `backend/api/planner/mealPrepProduction.js` to confirm the sheet shape. It was not inspected for this plan.
- **Acceptance:** the already-applied week of 2026-09-20 computes; two runs are byte-identical; recipe coverage (% of served servings with an active recipe) is reported.
- **Gate to enter Phase 4:** recipe coverage and weekly count commitment per Section 5.

### Phase 4: Locations, counts, movements, receiving
- Models: `StockLocation`, `StockMovement` with trigger, `StockCount`/`StockCountLine`.
- Receiving is invoice-driven: a mapped vendor-invoice line creates a `receipt` movement, idempotent on (`vendor_invoice_line`, line id). Manual quick-receive is allowed with `source: manual`, so an operator keys a photo of an invoice; reconcile against the LB line later by vendor, date, and total.
- Counts: phone-first, blind, per location, entered in packs or base units. Posting a count writes `count_adjustment` movements equal to counted minus ledger on-hand at `countedAt`. Backdated counts do not disturb later movements.
- Reports: on-hand by location; actual usage (begin + receipts − end) vs theoretical; negative-stock flags. Negative stock is flagged, not blocked.
- Staff count entry uses the existing Hub staff-privileged pattern; confirm at implementation.
- **Tests:** replay idempotency, reversal, backdated count, on-hand equals sum of movements.
- **Smoke (needs a real Postgres, since vitest is DB-less):** apply the migration to a scratch database, then show `UPDATE`/`DELETE` on `StockMovement` fail.
- **Acceptance:** one full count cycle produces an actual-vs-theoretical variance table.

### Phase 5: Production orders and finished goods
- `ProductionOrder`: pinned `recipeVersionId`, location, planned/actual/waste quantity, source (`meal_prep_batch` + batch id + `sourceHash`, or a manual frozen-pizza run).
- Completion writes consumption (derived from the pinned recipe, optional operator overrides) and output movements idempotently, and snapshots theoretical material cost with its method version.
- Frozen pizza is the first non-meal-prep user. `MealPrepProductionBatch` is unchanged.
- **Tests:** planned 200 / actual 194 / waste 6 yields the right consumption and output; double completion is a no-op.
- **Acceptance:** one real production run end to end.

### Phase 6: Transfers, fulfillment, finished-goods bridge
- `StockTransfer` writes two paired movements and carries no revenue. Wholesale shipment is a `CommercialOrder` fulfillment from a location, not a transfer.
- `CommercialProductStock` links sellables to stock products (quantity per unit).
- Discovery first: confirm which event marks a `CommercialOrder` fulfilled before writing `fulfillment` movements. This was not verified.
- Sanity `manualQty` stays the checkout gate. Add a nightly read-only report comparing ledger finished-goods on-hand with `manualQty`. No authority change.
- **Acceptance:** a transfer conserves quantity; the reconciliation report runs against real data.

### Phase 7: Local Budget contract
- `GET /api/food-ops/cost-lines?from&to`: per `commercialOrderLineId` and `businessLineKey`, modeled material cost with method and contract versions and source freshness. No margin and no `cashContribution` here.
- Tie-out control: ERP purchase value in a period vs LB COGS spend for the same period. This is the coverage check for the whole system.
- Document the contract in `docs/local-budget-integration.md` and LB's `docs/integration-local-effort.md`.
- **LB-side tasks (queued in LB, not done here, must not displace `local-budget-close`):** persist unit, SKU, `invoiceNumber`, `dueDate`, `poNumber` on receipt lines; expose them in `/items` and `/receipt-evidence` as a new contract version; accept the join keys; fix invoice ingestion (Gmail OAuth, or forward invoices to its inbound-email endpoint).
- **Acceptance:** tie-out report for one closed month; LB can read cost lines.

### Phase 8: Gated options (each needs its own trigger and approval)
| Option | Trigger |
| --- | --- |
| Lots, expiry, recall | Frozen-pizza distribution or a regulator requires lot codes |
| Purchase orders and three-way match | A billing dispute, or enough weekly invoiced vendors that manual match costs real time |
| Inventory valuation | LB/CPA ledger-ownership decision, plus measured count accuracy, plus a lender or CPA ask |
| Par levels and reorder suggestions | Four or more consecutive weekly counts |
| `local-office` as UI | It is wired to this API and non-owner staff need accounts |

### 4a. Receipt bootstrap (applied)

Retail receipts seed vendor items and cost observations with sources `receipt_wedge` / `receipt_eastside`. Prices are **indicative retail**, often sale prices, not wholesale pack costs. Items arrive unmapped; mapping to stock products stays an owner decision. Parsers are pure modules in `backend/api/foodOps/receipts/`. A receipt that does not reconcile to the cent (lines plus adjustments = subtotal; subtotal + tax = total) is `review_required` and emits no lines. `packText: null` in a vendor line means "no usable pack", with no fallback to the description.

- **Wedge** (Gmail `from:wedge.coop`, 2026-07-03 to 2026-10-05): 59/59 reconcile; 653 lines, 255 items; 529 lines have a convertible pack.
- **Eastside** (`.eml` files in Downloads; **not in Local Budget**, which holds no Eastside line items): 476 unique receipts, 471 reconcile; 2,674 lines, 925 items. A receipt-level 20% Employee discount is not allocated per item, so line prices are full retail. About half of Eastside spend has no emailed receipt.

**Applied 2026-10-07 at owner request** (migration `20261007000200_food_ops_receipt_sources` widened the `CostObservation.source` check first): 1,180 unmapped vendor items, 653 `receipt_wedge` and 2,674 `receipt_eastside` observations. Re-running either CLI plans zero creates. Next: owner maps the high-spend items to stock products.

### 4b. Mapping and vendor invoices (applied 2026-10-07)

**Mapping** (`food-ops.cjs apply-mapping --data <mapping.json>`, dry run until `--apply`; `backend/api/foodOps/mappingPlan.js`). Mapping files are `{stockProducts, mappings, ignore, review}` proposals. Rows that fail pack/dimension validation are skipped, never block the file, and an existing owner decision is never overwritten. Applied: Wedge + Eastside receipts (489 mapped, 366 ignored as non-ingredients, 325 left in review: mostly Eastside items with no stated pack, and bunch/each produce with no weight), plus the vendor items below. Medium-confidence mappings are inferred (flour types, deli, generic cheese). The proposals live under the gitignored `.tmp/mapping/`; the `review` arrays are the owner's question list.

**Vendor invoices** (source `vendor_invoice`, migration `20261007000300_food_ops_vendor_invoice_source`; wholesale or direct pack prices, higher quality than receipts):

| Vendor group | CLI | Applied |
|---|---|---|
| Meadowlark, Olive Oil Lovers, Chocolate Alchemy, Vern's, Smoking Goose, Browne Trading, The Good Acre confirmations, Alemar (Gmail HTML/text) | `scripts/food-ops-vendor-orders.cjs --vendor all` | 30 orders, 110 lines, every order reconciled to the cent |
| Great Ciao, Baker's Field, The Good Acre invoices, Mad Rose, HAFA (Gmail PDF attachments, `pdfjs-dist` devDependency) | `scripts/food-ops-vendor-pdf-invoices.cjs --vendor all` | 26 invoices, 157 lines, reconciled to the cent; 1 Good Acre opening-balance invoice held for review |
| Amazon confirmations (Gmail, targeted `auto-confirm@amazon.com`) | `scripts/food-ops-amazon-orders.cjs --source gmail` | 4 messages, 4 orders; 2 food/consumable lines applied (2025-11-06..21); 3 excluded; 1 non-order message skipped |
| Costco warehouse receipt PDFs (owner's Downloads) | `scripts/food-ops-costco-receipts.cjs --dir <folder>` | 5 receipts, 4 food lines ($43.96) applied, exact reconciliation; 23 non-food lines ($445.15) excluded |

Not yet ingestible (owner help needed): Faire brands (line names only as image alt text), Red's Best (case contents not itemised), Burlap & Barrel (image-only PDF), Costco/Amazon line-item history beyond the small sets above, and Walmart (no line-item data found). CPW weekly price lists are list prices, not purchases, and are not ingested. The vendor survey is in `.tmp/vendor-discovery.md` (local, redacted).

### 4c. Personal vs business scope (applied 2026-10-08; migration `20261007000400_food_ops_observation_scope`)

Retail receipts from Wedge after April 2026 mix household and business purchases. **Scope never changes price evidence**: every observation keeps feeding unit costs whichever way it is tagged. Scope only decides what counts as business spend and usage in later reporting (order intervals, cost per customer or sale); unassigned lines must be reported as unassigned, never silently counted as business.

- **Data.** `CostObservation.scope` (`business|personal`), `scopeSource` (`owner|rule`), `scopeAt`, all null or all set (DB CHECK). `VendorItem.defaultScope` is an optional "always business/personal for this item" rule. Index `(source, observedAt)` serves the receipt list.
- **Resolution.** Effective scope = the observation's own decision, else the item's `defaultScope`, else unassigned. A receipt is the observations that share `sourceKey` minus its trailing line index (`gmail:<id>`, `eml:<date>:<id>`, `<prefix>|<orderId>`), so the same code serves Wedge, Eastside and vendor invoices.
- **Decisions.** One tap on a receipt sets every line (lines that follow an item default are held back and reported as `heldByDefault`); explicit per-line overrides always win; `scope: null` clears. Owner clicks are stored as `scopeSource=owner`.
- **Suggestions (computed on read, not stored).** An unassigned line with no item default gets a suggestion when the owner has made at least 2 decisions on that same vendor item and they all agree. Accepting stores `scopeSource=rule`, only on lines that are still unassigned (`WHERE scope IS NULL`), and `rule` rows never count as owner evidence, so suggestions cannot reinforce themselves. This is the mechanism by which the number of manual decisions should fall over time.
- **API** (admin, `backend/api/routes/foodOps.js`, logic in `backend/api/foodOps/receiptScope.js`): `GET /api/food-ops/receipts?source&scope=unassigned|business|personal|all&from&to&limit`, `POST /receipts/scope {source, receiptKey, scope?, lines?}`, `POST /receipts/accept-suggestions {source?, receiptKey?, from?, to?}`, `POST /vendor-items/:id/default-scope {scope}`.
- **UI.** `/admin/food-ops/receipts` (`src/pages/AdminFoodOpsReceiptsPage.jsx`, phone-first, under the noindexed `/admin/` prefix): Business / Personal buttons per receipt, split by line, "always for this item", progress and dollar totals, accept suggestions per receipt or for the whole window.
- **CLI.** `node scripts/food-ops.cjs scope-summary [--source receipt_wedge]` (read-only): lines and dollars by source and effective scope.

### 4d. Recipe-free usage and cost analytics (read-only; verified 2026-10-08)

`backend/api/foodOps/usage.js` derives purchase intervals, spend rollups, Local Budget (LB) coverage, and guarded cost ratios from `CostObservation`. The admin API is `GET /api/food-ops/usage/:report`; the matching read-only CLI is `node scripts/food-ops-usage.cjs {intervals|spend|coverage|ratios}`. Reports accept scope and date/window options; `--json` emits machine-readable output. No writes are performed.

- **Input and scope.** Effective scope is the observation decision, then the vendor-item default, else unassigned. At this verification, 14 of 3,600 observations resolve to business (the Wedge rotisserie item, explicitly identified as customer use); the other 3,586 remain unassigned. Thus the default `business` interval/spend reports contain only `chicken-rotisserie`; use `--scope business+unassigned` to analyze business plus unresolved purchases, with unassigned values visible separately. Personal spend is excluded unless explicitly asking for `all`. Ignored vendor items are excluded from ingredient spend and intervals.
- **Interval arithmetic.** Mapped quantities are converted through the vendor pack to stock-product base units; same-product same-day lines collapse into a purchase event. Each interval's estimated daily use is the converted quantity at its start divided by elapsed days until the next event. This assumes stock is roughly run down between purchases and is not inventory accounting; buying ahead, waste, stockpiles, and missing purchases distort it. The 2026-10-08 hand-check for `bread-flour`: 2,267.96185 g bought on 2022-11-12, next event on 2023-02-16 (96 days later), gives 2,267.96185 / 96 = 23.6246 g/day for that interval.
- **Purchase coverage.** The denominator is LB `cashflow-actuals` `inventoryCents` (inventory/COGS), not total cash outflow; classified purchase spend is the numerator. It is a conservative floor where LB has unclassified outflow. The read-only CLI found $28,081.53 of non-ignored spend over 2,679 `business+unassigned` lines ($209.86 business-assigned, $27,871.67 unassigned); $5,980.31 has no usable mapped quantity. Business-only scope contains 14 lines/$209.86. Combined-scope coverage returned 50 months, none passing the configured gate: 16 have empty LB inventory, 12 are refused for excessive unclassified outflow, 21 have low coverage, and 2026-10 has no LB month. No reliable purchase-coverage comparison can be claimed.
- **Drivers and ratio gates.** The `revenue` driver is LB monthly `incomeCents` (all classified income, not food-specific revenue). Revenue is available for 49 complete LB months in the report window, but the ratios command had 0/50 qualifying purchase-coverage months; it correctly emitted no food-cost/revenue percentages. Therefore no valid food-cost ratio can be claimed from this snapshot. Unit drivers are only reported when their source orders cover at least the configured share of LB income; absent/thin drivers are refused, not estimated.
- **Current observed windows.** Non-ignored source coverage: Eastside receipts 1,927 lines across 33/34 months (2023-07-13..2026-04-22); vendor invoices 270 lines across 36/50 months (2022-09-21..2026-10-02); Wedge receipts 482 lines across 4/4 months (2026-07-03..2026-10-05). Amazon: 2 lines ($31.23), 2025-11-06..2025-11-21; Costco: 4 lines ($43.96), 2025-11-05..2026-05-12. These observed windows are not proof that purchasing records are complete.


## 5. Gates and kill condition

Thresholds are proposals for the owner to adjust (assumed, not measured).

| Gate | Threshold | Applies to |
| --- | --- | --- |
| Recipe coverage of served meal-prep servings | at least 80% | enter Phase 4 |
| Owner commits to a weekly count, finishing in under 30 minutes | yes | enter Phase 4 |
| Mapped share of purchase spend | at least 70% | trust cost reports; enter Phase 7 |
| ERP purchase value vs LB COGS spend, closed month | within 10%, differences explained | exit Phase 7 |

**Pause condition:** pause new phases if operators must enter the same fact in more than one system, if counts are skipped for three consecutive weeks, or if reports are not used to change a purchasing or pricing decision after three cycles. Record the pause in `projects.json`.

## 6. Out of scope
Generalized workflow designer, maintenance, routings, HRIS, payroll, CRM replacement, MRP optimization, multi-step warehouses, double-entry posting, accounting valuation, and any outbound customer or staff messaging.
