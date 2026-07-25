# Current Local Effort facts

As of 2026-07-23. Recheck by 2026-08-27 (asOf + 35 days): after that date, re-verify these facts with the owner before relying on them for raise or other material work. Recheck live sources before any material decision regardless.

## Maintenance rules

- The Retired claims list below is append-only. Removing an entry requires an owner-approved row in `decisions-log.md`.
- When the Renee 2%/$6,000 transfer mechanics or any of the four open settlement items change state, update this file and `decisions-log.md` in the same commit.

## Owner-confirmed policy and structure

- Founder compensation policy effective 2026-04-01: Weston Smith and Catherine Olsen **each $65,000 annual, deferred**; assessed at month end. Revised down from the earlier $90,000/$70,000 split by the owner on 2026-07-23 (see decisions-log; the old split is superseded, not evidentiarily retired). Combined $130,000/year = $10,833.33/month. In the meantime the company covers the founders' living expenses; those post to Local Budget as **PERSONAL**, and every PERSONAL transaction dated 2026-04-01 or later counts as an owner draw against the deferred salary (owner-confirmed 2026-07-23). Accountant treatment of the draw-vs-accrual offset is still to be finalized.
- Fully diluted accepted ownership: Weston 45.5%, Catherine 47.5%, Sarah Olsen 5%, Renee Owens 2%. Renee paid $6,000 for 2% transferred from Weston.
- Maria Beck is an active chef paid through Square Payroll at $35/hour. She has been offered an additional 1% from Weston but has not accepted; exclude it from the cap table.
- Current kitchen cash price: $40/hour for the first 20 hours in a month, $35/hour thereafter, plus $200 monthly storage.
- Local-first is a loose 75–85% inventory target plus substantial contributions to aesthetics, branding, menu design, and other proprietary details.
- A Wefunder/SMBX raise is operationally ready to go, but no accepted financial model or final raise terms exist.
- The managerial business-line taxonomy has not been chosen by the owner. The line model uses a configurable working taxonomy.

### Deferred-compensation and equity-to-treasury policy

Two ends of one mechanism, owner-clarified 2026-07-23:

- **Today:** equity is offered **directly by the founders to new staff** out of their personal holdings — this is how Renee's 2% (paid $6,000) and Maria's unaccepted 1% offer originated. There is no funded treasury yet.
- **Target:** a **cooperative treasury dispenses equity** to future hires and investors instead of it coming off the founders' personal cap-table stakes.
- **Bridge that builds the treasury:** founders **exchange their own equity for settlement of their accrued deferred salary** — founder shares move into treasury and, in exchange, the related-party deferred-comp liability is extinguished. This is executed **only when the company is financially capable** of it, not on a fixed date. Founder ownership—not a new outside-investor issuance—supplies the shares; later issuance from treasury may have its own dilution effects.

The intended economic purposes are to settle the related-party liability, make founder dilution bear the settlement, and create a treasury pool for future hires or investors.

This is owner policy, not an executed or legally validated mechanism. Four items remain open:

1. **Pricing peg:** use the most recent arm's-length round price or another independently supportable method; do not use an undocumented related-party price.
2. **Minnesota 308B share class:** cooperative and securities counsel must confirm the permissible treasury, employee, member, and non-member instrument mechanics.
3. **Milestone subordination:** subordinate settlement to a disclosed revenue, profitability, or liquidity milestone so financing proceeds visibly fund growth before founder repayment.
4. **Disclosure order:** disclose the accrued liability first, then the proposed settlement mechanism, then the milestone and governance conditions. Accountant and counsel review are required before offering materials or execution.

## Current evidence cautions

- Local Budget is the authority for cash money; Square is the **primary revenue input** and Brain order events provide product attribution — they do not replace cash reconciliation.
- **Do not assert "Square only measures ~51% of cash revenue" as a fact.** That figure is the `squareToCashRevenueRatio` coverage *diagnostic* from the Apr–Jun run, not a measured revenue leak. The owner disputes it (2026-07-23). Before citing any Square-coverage number in either direction, research it for and against and decompose the cash-minus-Square residual into: (a) Square order-date vs cash-settlement-date timing lag; (b) genuinely non-Square receipts that Local Budget records as INCOME through other channels; (c) pre-Square back-history (Square has only ~1 year of use). Several revenue *outputs* are measured in Local Budget and should be reported to the Brain; confirm whether that pipeline is complete before treating the gap as missing revenue. See [[square-cash-coverage-open-question-2026-07-23]].
- Square Payroll detail is not directly accessible. Supplied paystubs and Local Budget Labor are different evidence sets and do not fully reconcile.
- Founder labor hours are not time-logged, but the owner supplied per-line labor estimates on 2026-07-23 (see "Owner-reported operating parameters" below) — use those as `owner-reported empirical` inputs, not as measured time.
- **The Local Budget COGS bucket is cash inventory PURCHASES, not cost-of-goods-sold.** Dividing it by revenue overstates food cost (~38–39% blended Jan–Jun) because it includes inventory building (91 restock trips to Eastside Co-op, 35 to Linden Hills, bulk flour/cheese) and **~$1,680 of misclassified non-food** (a U.S. Post Office money-order line, a Wings Financial credit-union entry). The monthly ratio swings 28% (July, steady) to 53% (May, stock-up). **True food cost is the owner-measured ~25–28% (July actual 28.1%); use ~27% for unit economics and forward margin**, not the trailing purchase ratio. Verified 2026-07-23.
- **Eastside Food Co-op is a paying customer** (~$600/mo recurring, W9 + Square invoice on file), not only a COGS vendor — its INCOME is operating revenue. The current kitchen is **Neon Collective Kitchens** (Food Corridor, pay-per-hour, expensive); the owner is moving to **MSP Kitchenery, Hopkins** (long-term, cheaper, ~unlimited capacity). The June 2026 $2,110 "investment" inflow was a **Square Capital loan** (11% of daily sales repayment), i.e. debt, not equity — excluded from operating revenue either way.
- Current Brain seasonality says October is 2.37 times baseline and August is 0.86 times baseline. Do not use the older assertion that August is a peak.
- Post Office and Walmart descriptors can be money-order purchase locations for rent. Trust reviewed Local Budget Rent classification over descriptor inference.

## Owner-reported operating parameters and taxonomy (2026-07-23)

Owner-stated; label `owner-reported empirical`. These exist to be corroborated and refined against Gmail/Square/Local Budget/Brain evidence — not to be treated as measured. The owner's standing directive: the discovery tools give near-unlimited reach (Gmail parses to sales↔transaction matches with the menus and service types discussed; Square is the revenue spine; Local Budget carries inventory and outputs; the Brain holds much that is not yet connected). Prefer inferring the real picture from those joins over reporting a line "blocked."

**Lines.** The working taxonomy narrows to three lines that deserve unit-economics, logistics/warehousing, and market scrutiny, whose *balance* is the owner's long-run stability strategy in a challenging market:

1. **Weekly Meal Subscription (meal prep).** Pricing is explicit in this repo — `src/pages/MealPrepIntakePage.jsx`: Dinner $18/adult family rate (3+ adults), $24 solo, $45 for a family of two; Breakfast $13.50/person; Lunch $18/person; kids age-scaled off the $18 rate ($11 flat ages 1–4, 50% of $14.50 base ages 5–9, 75% ages 10–12, adult 13+); weekly delivery $10.
2. **Private Dinners & Events.** Small-event price band **$35/person (buffet, dropped off) to $150/person (plated multi-course experience)**.
3. **Partner Wholesale** (Happy Monday is the anchor). The Happy Monday ledger separates **pizzas from sandwiches**, enabling per-product measurement.

**Farmers Market is not a line at this time** (removed from the model config 2026-07-23).

**Pizza is a distributed product, not a standalone Square line.** It is mainly sold to Happy Monday (wholesale), incorporated into events and meal prep, sold at some events directly, and — when capacity allows — sold as **frozen pizzas direct to consumer**. Frozen-pizza DTC is the growth line, to expand to internet and retail as labor is added. Unit cost, owner-stated, for a 12-inch cheese pizza: **$0.75 dough + $0.17 sauce + $1.00 cheese = $1.92 ingredients**; price point **$7–$11**. Corroborate via Local Budget flour costs (existing evidence: Baker's Field ~$1.29–1.50/lb blended, consistent with ~$0.75 dough) and the owner's Gmail about **Grande mozzarella**. Make rate: ~40 pizzas/hour with 2 people (roll, stretch, cook, cool, top, wrap).

**Labor (owner-reported weekly, current client load; almost all owner hours except where noted):**
- Meal prep core prep + package: ~12 hours/week involving 3 workers, plus some remainder (confirm whether "12 hours" is wall-clock or person-hours before deriving per-order labor).
- Happy Monday: 2–3 hours, 3×/week (≈6–9 hrs/week).
- Focaccia + pizza dough combined: ~8 hours/week.
- Maria Beck: ~15 hours/week (paid $35/hr via Square Payroll).
- Deliveries: mostly the owner. Local Budget's **delivery category** captures Uber + Accell spend (mostly deliveries, some other transportation — not yet split). If Uber exposes trip-level API data, adopt it; otherwise add the distinction in Local Budget later.

**June operating-cost spike is real and somewhat permanent** (resolves the earlier "one-time vs structural" question toward structural — see the Local Budget pricing review). The kitchen is very expensive; the owner's response is to scale up quickly: cut the kitchen hourly by ~$10 and add staff to make production times denser. Model this as a structural cost the current price level must cover, with the hourly reduction and density gains as the offsetting levers.

## Retired claims

Never use these as assumptions or downgrade them into estimates:

- approximately $120,000 annual gross revenue;
- approximately 20% EBITDA margin;
- flat $1,850 monthly kitchen rent;
- PropCo/OpCo as the current strategy;
- SBA 504 or C-PACE as current financing assumptions.

Retirement is evidentiary, not a prediction that the number must be false. If a future measured, seasonally reconstructed annual revenue figure lands near $120,000, record that as a calibration result: the measured estimate stands on its own method, while the unsupported historical claim remains invalid as a prior input.
