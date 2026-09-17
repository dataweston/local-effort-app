# Line model guide

## Working lines

The default configuration contains Weekly Meal Subscription, Private Dinners & Events, Partner Wholesale, Local Effort Pizza, and Unallocated. This is a working management scaffold. As of 2026-07-23 the owner narrowed strategic focus to three lines — **Weekly Meal Subscription (meal prep), Private Dinners & Events, and Partner Wholesale** — whose *balance* is the long-run stability strategy; give those three the most unit-economics, logistics/warehousing, and market scrutiny.

- **Farmers Market was removed as a line** (owner, 2026-07-23) and is no longer in the config.
- **Pizza is a distributed product, not a standalone Square line.** It flows through wholesale (Happy Monday, whose ledger separates pizzas from sandwiches), events, and meal prep, with **frozen direct-to-consumer** as the growth line as labor is added. Keep the `local_effort_pizza` id only as a cost/attribution anchor, not as a primary revenue line to size on its own.

See `current-facts.md` for owner-stated pizza unit cost, small-event price bands, in-repo meal-prep pricing, per-line labor hours, and the June structural-cost thesis.

Edit `line-model-config.json` only when evidence supports a mapping or assumption. Regular expressions are tested in order. `Custom Amount`, empty labels, and `unnamed` are protected from automatic mapping.

## Data grain

- Local Budget contributes period cash totals, classifications, merchant-level candidate cost pools, and transaction dates.
- Company Brain `order.placed` events contribute Square order, line-item, and customer-identity attribution.
- Dated Gmail/Brain evidence contributes measured unit prices, quantity reports, event quotes, supplied inputs, service load, and exact order matches.
- The model reports the Square-to-cash ratio only as a coverage diagnostic. The residual is not automatically a business line because order and settlement timing differ.

## Partial economics

Do not collapse incomplete evidence into either a fabricated margin or a generic block. Preserve the strongest supported layer:

1. exact revenue attribution by item label, customer identity, or cross-source order match;
2. measured unit price and quantity evidence;
3. directly matched variable cost;
4. candidate direct cost awaiting date/job confirmation;
5. shared COGS or operating spend relevant to a line but not allocated;
6. fully loaded contribution only after the required cost and labor joins exist.

The UI may show a real shared pool on several relevant lines, but it must never deduct that pool from more than one line or present it as an allocated cost. Revenue less directly matched cost is an incomplete component subtotal, not contribution margin.

## Scenario inputs

Each line requires monthly orders, average revenue per order, ingredient cost per order, paid labor hours and hourly rate, kitchen hours, packaging/delivery cost, other variable cost, founder hours and founder economic rate. Missing inputs stay null with provenance rather than being backfilled from an unmarked assumption.

Beginning 2026-10-01, Foodist is a fixed $1,800 monthly facility cost with unlimited included hours and small-event space. Marginal facility cash cost is therefore zero within the included access. For managerial line reporting, the scenario shows contribution before facility cost separately, then allocates the fixed portfolio cost by modeled kitchen hours with order-count and revenue-share sensitivities. Do not describe the allocation as hourly pricing.

Hopkins remains a reserve kitchen for overflow, larger events, and frozen-pizza CPG production, at an owner-stated $150/month from October 2026. Its cost is observable in Local Budget on the SoFi Checking account: $830.90 in August 2026, of which $154.90 is still unclassified. The approximately $350 September 2026 bill is an estimate only, because the transaction source stops at 2026-09-02. Reserve cost stays a transition cost outside the $1,800 steady-state base; do not silently set it to zero or roll the September estimate forward without an invoice.

Cash contribution can become ready before economic contribution. Economic contribution remains blocked until founder hours and cost are supplied. A raise recommendation remains blocked until line contribution, capacity, target mix, and uses of funds are usable.

## Sanctioned deadline fallback

Observed contribution remains blank until direct joins support it. When a real decision deadline arrives first, the scenario layer may produce a provisional number under the policy in `line-model-config.json`:

1. allocate the fixed shared facility cost by modeled kitchen hours;
2. allocate another shared production pool by modeled direct production labor hours only when the pool's eligible lines and period are documented;
3. keep costs outside that documented pool Unallocated;
4. label every result `modeled_interim_allocation`, never observed;
5. show the answer under order-count and revenue-share allocations as required sensitivities;
6. report the range and whether the ranking or recommendation reverses.

The fallback is decision support, not a shortcut to a historical margin. Do not use revenue share as the primary allocation. Do not allocate channel acquisition spend, financing, transfers, founder draws, fixed storage, or unrelated overhead through this policy. Replace the fallback when production-lot, recipe, payroll, kitchen-booking, or job-level joins become available.

## Mapping changes

Before mapping an unfamiliar label or opaque amount:

1. inspect the source order and customer/event context;
2. document the supporting evidence;
3. prefer an exact order ID, customer identity, or anchored pattern, in that order;
4. rerun the same period and review movement out of Unallocated;
5. confirm total observed Square line revenue remains unchanged.
