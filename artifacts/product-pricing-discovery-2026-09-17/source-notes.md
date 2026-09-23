# Source and QA notes

## Decision and audience

- Decision: how Local Effort should implement one manageable product, pricing, reservation, transaction, and inventory layer across meal prep, small events, pizza, and later offers.
- Audience: owner/operator and product implementer.
- Evidence window: current owner policy supplied in this conversation; Square read-only observations through September 17, 2026; repo operational snapshots through September 15, 2026; Capital Master Record 2.4 dated September 16, 2026.

## Source precedence used

1. Direct owner instructions in the current conversation control current commercial policy and supersede conflicting product prices in older artifacts.
2. Paid/current Square invoice evidence controls observed recurring charges and billing status when available.
3. Owner-confirmed repo snapshots supply plan composition and non-Square amounts, with their original as-of dates preserved.
4. Capital Master Record 2.4 supplies financing and operating context. It is not treated as the commercial price-book source because its meal and event prices conflict with later owner instructions.
5. Seed/setup files are used only for plan composition and are labeled provisional when they may be stale.

## Data-quality findings

- High: sources mix invoice, weekly-plan, household, and portion grain. A charge cannot be explained until the system records the pricing mode and quantity grain.
- High: current status is not uniformly observable. Catherine Squires has paused/unpaid/canceled signals; Sanjay Roy is outside Square and could not be refreshed from Local Budget.
- Medium: Tyler Cooper's current invoice amount is fresh, but the available composition is older. The comparison is a scenario, not a verified itemization.
- Medium: Levy Family includes kids meals and snacks for which the new policy has no prices. The displayed comparison is only a discount-rate sensitivity.
- Medium: Gmail's required health probe did not return; it was stopped without reading messages. iMessage is unavailable by user statement.
- Low: a duplicate unpaid Gabriella Scarpa invoice was excluded; paid/scheduled current amounts were used.

## Calculation conventions

- Four-week billing is treated as a 28-day cycle.
- The 8% monthly discount is modeled on eligible food lines only; delivery and membership dues are excluded.
- Store credit is excluded from quoted price and treated as a later tender/liability event.
- Scenario ranges preserve unresolved classification instead of averaging incompatible interpretations.

## Visual and detail plan

- The report uses a compact six-client numeric list, while the companion notebook preserves the full comparison table and calculation basis.
- A meal-prep variance chart was intentionally omitted: the policy ranges reflect different unresolved pricing modes, so plotting them as directly comparable customer variance would imply false precision.
- The required report visual is a horizontal bar chart of the four comparable event-deposit examples. It answers how the 20% hold amount changes with venue/package scope and uses the owner-policy calculation dataset.

## Report structure mapping

- Title: first markdown block.
- Executive Summary: second markdown block.
- Key findings: current-client evidence summary, source-of-truth finding, architecture, and UX sections.
- Recommended next steps: phased implementation section.
- Further questions: missing product decisions section.
- Caveats and assumptions: final section plus visible partial-data access notice.

## Calibration loop

- Meal prep: review after eight fulfilled weeks; revise the model if more than 10% of active plans require an unexplained manual override.
- Events: review after the first 20 confirmed events; revise the estimator if median absolute estimate-to-confirmed variance exceeds 15% or more than 10% of deposits require a refund/credit because the hold estimate was too high.
- Architecture: revisit the shared kernel if two product families still require bespoke transaction logic after three offers are live, or if publishing a price change still requires an engineer.
