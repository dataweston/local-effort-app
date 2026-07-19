# LE Economist line-level model

Status: active working model, generated against sources current through 2026-07-18. The business-line taxonomy is configurable and has not been canonically chosen by the owner.

## What is implemented

The executable model lives at `skills/le-economist/scripts/build-line-model.cjs`; its mappings and assumptions live at `skills/le-economist/references/line-model-config.json`.

It combines Local Budget cash actuals with Company Brain Square line items, maintains an Unallocated line, separates cash and fully loaded founder compensation, and conditionally calculates line contribution and capacity. Unsupported cost allocations stay blocked.

Run the closed-month baseline with:

```powershell
node skills\le-economist\scripts\build-line-model.cjs --repo . --start 2026-04-01 --end 2026-06-30
```

## April–June baseline

Local Budget classified operating revenue is approximately $29.25K. The Brain contains $14.96K of Square orders in the comparable order-date window, or about 51.2% of classified cash revenue. This ratio is a coverage diagnostic, not a reconciliation match.

Of observed Square line-item revenue:

| Working line | Observed revenue | Share of observed Square revenue | Status |
| --- | ---: | ---: | --- |
| Weekly Meal Subscription | $9,655.00 | 64.5% | attributed |
| Unallocated | $5,309.80 | 35.5% | unresolved |
| Other working lines | $0.00 | 0.0% | not evidenced in this window |

Unallocated consists mainly of Custom Amount ($2,975.50) and `may 11 - june 5` ($2,326.30). Neither is auto-mapped.

The founder policy accrued $40,000 for the three closed months. Confirmed PERSONAL draws were $5,820.19, producing a $34,179.81 deferred-compensation increase. The model does not treat unpaid founder compensation as profit.

## Decision boundary

The model does not yet support a defensible raise point estimate. Line contribution margins remain blocked on transaction-level label resolution plus ingredient cost, paid labor, founder time, kitchen hours, delivery/packaging, capacity, and target volume by line. Filling those fields turns the same artifact into a scenario model without changing the evidence rules.
