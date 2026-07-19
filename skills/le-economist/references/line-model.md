# Line model guide

## Working lines

The default configuration contains Weekly Meal Subscription, Private Dinners & Events, Local Effort Pizza, Wholesale & Bread, Farmers Market, and Unallocated. This is a management scaffold, not an owner-approved taxonomy.

Edit `line-model-config.json` only when evidence supports a mapping or assumption. Regular expressions are tested in order. `Custom Amount`, empty labels, and `unnamed` are protected from automatic mapping.

## Data grain

- Local Budget contributes period cash totals and classifications.
- Company Brain `order.placed` events contribute Square order and line-item attribution.
- The model reports the Square-to-cash ratio only as a coverage diagnostic. The residual is not automatically a business line because order and settlement timing differ.

## Scenario inputs

Each line requires monthly orders, average revenue per order, ingredient cost per order, paid labor hours and hourly rate, kitchen hours, packaging/delivery cost, other variable cost, founder hours and economic hourly rate, and monthly capacity.

Hourly kitchen cost is calculated at the portfolio level using the current tiered price and allocated by modeled kitchen hours. The $200 storage charge remains fixed portfolio overhead. Do not include either amount again in another overhead input.

Cash contribution can become ready before economic contribution. Economic contribution remains blocked until founder hours and cost are supplied. A raise recommendation remains blocked until line contribution, capacity, target mix, and uses of funds are usable.

## Mapping changes

Before mapping an unfamiliar label:

1. inspect the source order and customer/event context;
2. document the supporting evidence;
3. prefer an exact anchored pattern;
4. rerun the same period and review movement out of Unallocated;
5. confirm total observed Square line revenue remains unchanged.
