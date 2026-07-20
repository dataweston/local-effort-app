# Line model guide

## Working lines

The default configuration contains Weekly Meal Subscription, Private Dinners & Events, Local Effort Pizza, Partner Wholesale, Farmers Market, and Unallocated. This is a management scaffold, not an owner-approved taxonomy.

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

Each line requires monthly orders, average revenue per order, ingredient cost per order, paid labor hours and hourly rate, kitchen hours, packaging/delivery cost, other variable cost, founder hours and economic hourly rate, and monthly capacity.

Hourly kitchen cost is calculated at the portfolio level using the current tiered price and allocated by modeled kitchen hours. The $200 storage charge remains fixed portfolio overhead. Do not include either amount again in another overhead input.

Cash contribution can become ready before economic contribution. Economic contribution remains blocked until founder hours and cost are supplied. A raise recommendation remains blocked until line contribution, capacity, target mix, and uses of funds are usable.

## Sanctioned deadline fallback

Observed contribution remains blank until direct joins support it. When a real decision deadline arrives first, the scenario layer may produce a provisional number under the policy in `line-model-config.json`:

1. allocate shared kitchen cash cost by modeled kitchen hours;
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
