# Local Budget improvements that would help the Company Brain

> Audience: an agent working **inside the Local Budget repo**.
> Written 2026-06-27 from the Company Brain side, after connecting read-only to
> the LB Postgres and ingesting the first transactions. These are prioritized by
> how much they unblock brain analytics, with the evidence that motivated each.
> None require breaking changes; most are data-quality or small additive fields.

## Context: how the brain uses LB

The brain reads LB transactions read-only (consumer-only; it never migrates/writes
LB) and projects them into its knowledge graph:
- `EXPENSE` where `classification IN (COGS, OPERATING)` → vendor-spend signal
  (drives reliable-supplier / churned-vendor / price-drift inferences).
- `INCOME` → revenue signal (counterparty currently unknown — see #3).
- `merchantName` → resolved to a brain Vendor entity (with alias learning).

So **classification accuracy and merchant/counterparty identity are the two
things that most affect brain quality.**

## P0 — highest leverage

### 1. Classification accuracy (the brain trusts it completely)
The brain does NOT second-guess LB's `classification`; it filters purely on it.
So a mis-classified row goes straight into the wrong analysis. Found live:
- `"Direct Payment Zelle® Payment to Alan"` is classified **OPERATING** ($4,786,
  3 txns) but the founder says this is **personal**. It will be ingested as
  business vendor spend until reclassified in LB.
- More broadly: 1,303 transactions have **null classification**. Those are
  invisible to the brain today. A pass to classify (or rules to auto-classify)
  them would surface real business spend the brain currently can't see.

**Ask:** tighten classification on transfers-to-people and the null bucket. The
`classification_rules` table (71 rules already) is the right mechanism. Even a
periodic "review unclassified > $X" prompt would help.

### 2. Stable merchant normalization (you have the raw bank descriptors)
LB stores both clean names ("Eastside Food Cooperative") AND raw bank descriptors
("Debit Card EASTSIDE FOOD COOPERATI", "Debit Card COSTCO WHSE #0652"). The brain
strips descriptor noise to resolve them to one vendor, but it's guessing. LB
already has the `vendors` table (currently **0 rows**) + `Vendor.aliases[]` +
`normalizedName` designed for exactly this.

**Ask:** populate the `vendors` table and link `line_items.vendorId` /
attach a normalized vendor to each transaction. If LB exposes a stable
`vendorId` per transaction, the brain can resolve by id instead of fuzzy name
matching — eliminating the duplicate-vendor problem at the source. This is the
single biggest data-quality win for the brain's vendor graph.

### 3. Income counterparty (the reason LB beats Square)
LB income rows have **no `merchantName`/payer** — all blank (415 INCOME rows).
The founder's point: LB is the source of truth *because* it has income sources
beyond Square. But without a payer, the brain can record the amount and not who
paid. Today the brain tags these `squareMatchPending` for a later join.

**Ask:** capture a payer/source on income where available — even a free-text
source ("Farmers Market", "Catering deposit — Henry & Son", a Square payout id,
a Zelle sender name). The `payerId`/`incurredById` entity fields and
`description` already exist; populating payer on income would let the brain
attribute revenue to customers/channels (repeat-customer, channel-mix analytics).

## P1 — meaningful additions

### 4. Receipts with line items + units (recipe costing keystone)
`receipts` = 0 rows, `line_items` = 6 rows. The brain's recipe/margin subsystem
needs per-ingredient **price + unit** (e.g. "Carrots, 25 lb, $X"), which the LB
`Receipt` + `LineItem` (with `quantity`, `unitPrice`, `unitOfMeasure`) models are
built for. Until receipts are processed (OCR → line items with units), the brain
cannot compute real food cost.

**Ask:** prioritize Eastside/CPW receipt ingestion with per-line unit + price.
Even partial coverage of the top-spend food vendors unlocks ingredient costing.

### 5. A stable, documented "since" cursor for incremental sync
The brain currently re-reads with a `sinceDays` window. A reliable
`updatedAt`/`createdAt` (both exist) or a monotonic change cursor lets the brain
sync incrementally and cheaply. Confirm `updatedAt` is bumped on edits
(reclassification, merchant correction) so the brain re-reads corrected rows.

### 6. Expose `categoryId` → category name
The brain sees `categoryId` (an opaque id) but not the category name without
joining `categories`. A denormalized category label on the transaction, or a
documented stable category list, would let the brain use LB's category taxonomy
(28 categories) directly for finer spend analytics.

## What NOT to change
- Don't break the current schema/columns the brain already reads
  (`transactions`: id, externalId, date, merchantName, amount, type,
  classification, description; `line_items`: quantity, unitPrice, totalPrice,
  vendorId, itemId). The brain depends on these names.
- Don't expose write access to the brain — keep it consumer-only.

## Summary for the LB agent
1. Fix mis-classified business/personal rows (Zelle-to-Alan example) + classify the 1,303 nulls.
2. Populate `vendors` + per-transaction vendor id (kills the brain's duplicate-vendor guessing).
3. Capture income payer/source (unlocks revenue attribution beyond Square).
4. Process receipts → line items with unit + price (unlocks recipe costing).
5. Guarantee `updatedAt` bumps on edits (incremental, corrected-row re-sync).
6. Surface category names alongside `categoryId`.
