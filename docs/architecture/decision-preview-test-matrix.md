# Decision Preview Test Matrix

Use this matrix in `/admin/decision-preview` to validate the current rules-driven recommendation layer before any public rollout.

## How to use it

- Sign in at `/admin/decision-preview`
- Run each row twice:
  - `Assigned variant`
  - `Force rules`
- Only use `Force control` as a baseline comparison
- After any Sanity edit, rerun the affected rows immediately

## Core Matrix

| ID | Path | Page Type | Acquisition Source | Returning | Cart | Variant | Expected Priority | Expected Strategy | What to verify |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M1 | `/` | `home` | blank | `false` | `0` | `rules` | `home-small-events` | `orient` | Welcome should route planners into small-events intake without sounding generic |
| M2 | `/sale` | `sale` | blank | `false` | `0` | `rules` | `sale-catalog-guidance` | `promote` | Copy should move a shopper directly into the active sale path |
| M3 | `/weekly-order` | `commerce` | blank | `true` | `0` | `rules` | `weekly-order-retention` | `reassure` | Returning customer should feel confirmed and moved toward ordering quickly |
| M4 | `/weekly-order` | `commerce` | blank | `true` | `2` | `rules` | `weekly-order-retention` | `reassure` | Cart state should reinforce reassurance, not switch to promotion |
| M5 | `/pizza-party` | `service` | blank | `false` | `0` | `rules` | `pizza-party-booking` | `promote` | Copy should drive booking readiness, dates, and deposit intent |
| M6 | `/psyche` | `product` | blank | `false` | `0` | `rules` | `psyche-product-education` | `reassure` | Product visitor should get clarity and confidence, not hard-sell copy |
| M7 | `/product/test-product` | `product` | blank | `false` | `0` | `rules` | `psyche-product-education` | `reassure` | Product prefix matching should still trigger the product education priority |

## Control Baseline

| ID | Path | Page Type | Variant | Expected Result |
| --- | --- | --- | --- | --- |
| C1 | `/` | `home` | `control` | Generic orientation copy, no selected business priorities |
| C2 | `/sale` | `sale` | `control` | Generic orientation copy, no promotion-specific priority |

## Mismatch Diagnostics

Use these rows to make sure the engine fails cleanly and the priority inspector explains why.

| ID | Path | Page Type | Acquisition Source | Returning | Cart | Variant | Expected Result | What to verify |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | `/unknown-path` | `page` | blank | `false` | `0` | `rules` | No matched priority or a clearly fallback-safe result | Unmatched priorities should show path mismatch clearly |
| D2 | `/sale` | `sale` | `google` | `false` | `0` | `rules` | `sale-catalog-guidance` still wins | Acquisition source should not incorrectly suppress the sale priority |
| D3 | `/pizza-party` | `service` | `newsletter` | `true` | `0` | `rules` | `pizza-party-booking` still wins | Returning state should not override service-fit routing |

## Review Standard

A row passes only if all of these are true:

- The matched priority is the one the business actually wants for that entry path
- The selected strategy feels correct for the visitor state
- The welcome text is short, specific, and commercially useful
- The reason codes are intelligible
- The unmatched priorities fail for understandable reasons

## Adjustment Guide

If a row fails, change only one thing at a time in Sanity:

- `weight`: when the right priority is present but losing
- `strategy`: when the selected tone is wrong
- `messageFacts`: when the logic is right but the copy is weak
- `match.pageTypes`: when page classification is right but matching is too narrow
- `match.pathPrefixes`: when route coverage is wrong
- `match.acquisitionSources`: when campaign-specific targeting is needed

## Operator Log Template

Keep a simple log while tuning:

| Row | Before | Change Made | After | Notes |
| --- | --- | --- | --- | --- |
| M1 |  |  |  |  |
| M2 |  |  |  |  |
| M3 |  |  |  |  |
| M4 |  |  |  |  |
| M5 |  |  |  |  |
| M6 |  |  |  |  |
| M7 |  |  |  |  |
