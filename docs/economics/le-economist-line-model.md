# LE Economist line-level model

Status: active working model, generated against sources current through 2026-07-18. The business-line taxonomy is configurable and has not been canonically chosen by the owner.

## What is implemented

The executable model lives at `skills/le-economist/scripts/build-line-model.cjs`; its mappings and assumptions live at `skills/le-economist/references/line-model-config.json`.

It combines Local Budget cash actuals with Company Brain Square line items, then uses exact customer/order identities and dated Gmail/Brain evidence to recover otherwise opaque transactions. It maintains an Unallocated line, separates cash and fully loaded founder compensation, and conditionally calculates line contribution and capacity. Real but incompletely matched costs remain visible as candidate or shared pools instead of disappearing behind a binary block.

Run the closed-month baseline with:

```sh
node "skills/le-economist/scripts/build-line-model.cjs" --repo . --start 2026-04-01 --end 2026-06-30
```

## April–June baseline

Local Budget classified operating revenue is approximately $29.25K. The Brain contains $14.96K of Square orders in the comparable order-date window, or about 51.2% of classified cash revenue. This ratio is a coverage diagnostic, not a reconciliation match.

Of observed Square line-item revenue:

| Working line | Observed revenue | Share of observed Square revenue | Status |
| --- | ---: | ---: | --- |
| Weekly Meal Subscription | $9,860.00 | 65.9% | attributed; includes $205 cross-source match |
| Partner Wholesale | $4,346.80 | 29.1% | attributed by Happy Monday Square identity |
| Private Dinners & Events | $750.00 | 5.0% | attributed to completed Haus of Well event |
| Unallocated | $8.00 | <0.1% | unresolved |
| Other working lines | $0.00 | 0.0% | no standalone Square revenue evidenced in this window |

The model now assigns 99.95% of observed Square revenue. It recovers three Happy Monday payments totaling $4,346.80 through the exact Square customer identity, a $205 weekly-meal pilot payment through its Gmail quote/order match, and a $750 event payment through its Gmail event thread. The only remaining Square residual is an unnamed $8 transaction.

Cost and operating evidence is also partially recovered:

- Local Budget contains $468.75 of Baker's Field COGS in the period. One 150-pound order matches a $193.50 invoice and payment, implying a $1.29/lb blended invoice cost. This differs from the Brain's older $1.50/lb working flour cost and remains an explicit discrepancy until SKU-level detail resolves it.
- Happy Monday partner reports establish measured wholesale prices and volume: egg salad $5.10, turkey $6.10, yogurt/granola $3.85, 4-inch pizzas $3.60, and 12-inch pizzas $7.10-$8.10.
- Local Budget contains $351.92 of Thumbtack acquisition spend. Brain/Gmail ties at least one current-period dinner quote to a Thumbtack lead, but the spend is channel/CAC evidence rather than food contribution cost.
- Event threads expose guest counts, quote changes, supplied ingredients, service load, kitchen changes, and exact payments. They do not yet establish complete final consideration or job-level cost.

The founder policy accrued $40,000 for the three closed months. Confirmed PERSONAL draws were $5,820.19, producing a $34,179.81 deferred-compensation increase. The model does not treat unpaid founder compensation as profit.

## Decision boundary

The model does not yet support a defensible raise point estimate, but line economics are no longer treated as wholly blocked. It reports measured revenue, unit prices, purchase lots, quote/service facts, acquisition spend, and candidate/shared cost pools at their supported confidence. It deliberately leaves the observed full contribution-margin field blank until COGS receipts and lots are joined to recipes or jobs, payroll and founder time are matched to production, courier/kitchen/packaging costs are matched to work, and capacity and target mix are measured.

For a deadline decision, the scenario layer provides the sanctioned fallback rather than refusing to calculate: shared kitchen cash cost is allocated by modeled kitchen hours, while another documented shared production pool may be allocated by modeled direct production labor hours. Every fallback result is labeled modeled and paired with order-count and revenue-share sensitivities. The decision must report the range and whether the line ranking or recommendation reverses. Direct joins replace—not validate—the fallback when they arrive.

One calibration point should remain visible: April-June operating revenue of approximately $29.25K, adjusted with measured seasonality including October at 2.37 times baseline, may ultimately imply an annual figure near the retired $120K claim. The claim was retired because it lacked provenance, not because proximity was impossible; a later nearby reconstruction would demonstrate the evidence system working.
