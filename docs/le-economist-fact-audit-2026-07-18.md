# Local Effort economist fact audit

Date: 2026-07-18

Purpose: compare the proposed `le-economist` skill, `business-model.md`, and
`decisions-log.md` with the live Company Brain and the read-only Local Budget
database. This is an evidence audit, not legal, tax, accounting, or investment
advice.

## Source posture

Use the following precedence for economic analysis:

1. Current Local Budget posted transactions for cash actuals, subject to split
   reconciliation and classification-quality checks.
2. Current Square, Hub, and operational-system facts for orders, customers,
   commitments, and capacity.
3. Brain ledger events with primary-source provenance.
4. Confirmed Brain assertions whose source event supports the claim.
5. Founder-reported facts in a dated reference document.
6. Brain inferences and manually seeded graph entities, clearly labeled as
   derived or provisional in substance even when the database flag is false.
7. Public-site copy for current offers and positioning, not internal financial
   truth.

Do not equate graph confidence with factual verification. Several records have
confidence `0.9` or `1.0` while their own properties say `TBD`, `unverified`, or
`needs counsel review`.

## Current source inventory

The live Brain query returned:

- 3,238 active entities;
- 4,353 current, unretracted assertions;
- 8,203 ledger events;
- 110 active inferences;
- zero assertions flagged provisional.

That zero-provisional result is not evidence that all graph facts are settled.
The Renee equity records, for example, are stored as non-provisional assertions
while the underlying entity says the issuance is conditionally issuable and
requires founder and counsel review.

Current source dates relevant to this audit:

- Local Budget direct database: posted transactions through 2026-07-18;
- Brain Local Budget mirror: events through 2026-07-12;
- Square/Hub orders: through 2026-07-13;
- GA4: through 2026-07-16;
- Gmail extraction: through 2026-04-26, not current;
- Brain business inferences: recomputed 2026-07-18, but some have no
  `computedFrom` IDs and therefore need independent validation.

## Current Local Budget reconciliation

Split-aware posted results through 2026-07-18:

| Measure | Current direct result | Prior reference claim | Assessment |
| --- | ---: | ---: | --- |
| COGS | $19,691.09 | $22,286.67 through Jul 12 | Changed materially; likely reclassification/backfill, not merely six new days |
| Operating expense | $32,876.61 | $29,528.98 through Jul 12 | Changed materially |
| Unresolved Labor category | $3,164.00 | $2,450 transaction-level / $2,626 split-aware | Current total supersedes both, but remains unclassified |
| Business income classification | $48,620.57 | approximately $120K annual gross | Owner confirms the $120K figure was invented; delete it from the reference set |
| Investment-classified income | $8,740.00 | not separated in the skill | Exclude from operating revenue unless the decision explicitly concerns financing |
| PERSONAL expense since Apr 1 | $6,189.49 | query described as still open | Query is now closed through Jul 18, subject to owner review of classification policy |

The owner cannot identify a source or calculation for the claimed 20% EBITDA.
Retire that figure completely; do not downgrade it to an estimate or use it as a
baseline.

Between July 13 and July 18, the direct database added, among other items,
$1,290.23 of INCOME, $615.17 of COGS, $136.88 of operating expense, $344.00 of
unresolved Labor, and $91.68 of PERSONAL expense. Transfers and unresolved
income are much larger than the operating additions and must not be treated as
revenue or expense.

Under the owner-stated deferred-compensation policy:

- accrual through 2026-06-30: $40,000.00;
- PERSONAL expense from 2026-04-01 through 2026-06-30: $5,820.19;
- implied balance at the June 30 month-end assessment: $34,179.81;
- July PERSONAL expense through July 18: $369.30;
- PERSONAL expense from 2026-04-01 through 2026-07-18: $6,189.49.

The owner confirmed that compensation is assessed at month end. The July balance
therefore remains open until July 31 PERSONAL spending is complete. If no more
July draws occur, the month-end balance would be $47,143.84. An accountant must
determine the correct accounting and tax treatment.

## Discrepancies and required corrections

### 1. The reported 16-day Brain gap is stale

`decisions-log.md` says the Brain mirror stopped on June 26. It now contains
Local Budget events through July 12. The remaining direct-source gap is six
days, July 13-18. Replace the fixed statement with a rule to check source maximum
dates at analysis time.

### 2. Trust the reviewed Rent classification over payment descriptors

Local Budget reports $17,576.08 of posted Rent expense through July 18. Some
merchant descriptions name U.S. Post Office or Walmart because those locations
were used to obtain money orders; they are payment instruments, not the economic
counterparty. Do not override Local Budget's reviewed category from a bank
descriptor alone.

Use the $17,576.08 total as the current rent cash actual. The owner corrected the
current kitchen arrangement: $40 per hour for the first 20 hours in a month, $35
per hour thereafter, plus $200 monthly storage. It is not a flat $1,850 lease.
Model the monthly commitment as:

`$200 + $40 × min(hours, 20) + $35 × max(hours - 20, 0)`

Detailed transaction forensics are unnecessary unless the category fails
reconciliation or the owner requests them.

### 3. COGS and operating totals have changed

The July 14 reference totals should not remain standing facts. COGS fell by
about $2,596 while operating expense rose by about $3,348 in the current direct
query. Six days of activity do not explain COGS falling; classifications or
splits changed. Any decision memo must save an as-of date and method version.

### 4. Staffing statements conflict

The references say both:

- a third chef was added around May 2026; and
- Weston and Catherine remain the full production function.

The owner confirmed on 2026-07-18 that Maria Beck is the third chef and is paid
through Square Payroll. Brain correction event
`5bbbbe3a-8374-4bc4-82da-ded95f099381` now records her as active, documents work
by 2026-05-31 without asserting an exact start date, and preserves the $35/hour
rate. Her separate 1% worker-equity offer is explicitly unaccepted, unvested,
and excluded from the cap table. This environment does not have direct Square
Payroll detail. Use Local Budget's Labor cash movements as the accessible cash
proxy and request a Square Payroll report when gross wages, employer taxes,
payroll period, or hours are material to the decision.

### 5. Labor totals and labor economics are different facts

Local Budget currently contains $3,164 in an unresolved Labor category. This is
cash activity, not total economic labor.

Four supplied Square Payroll stubs establish:

- Maria Beck: 44 documented hours at $35/hour and $1,540 gross through the
  2026-06-15 period;
- Zachary Hurdle: $910 YTD gross through the 2026-06-24 period; the supplied
  current-period stubs show $560, so the YTD field implies an earlier $350 not
  included in the supplied PDFs;
- combined exact YTD gross through June 24: $2,450, matching the earlier
  transaction-level audit;
- owner-reported additional Maria pay missing from the supplied PDFs:
  approximately $500;
- approximate gross wages after that missing Maria amount: $2,950;
- unexplained difference to the current Local Budget Labor total: approximately
  $214. Do not label this as employer tax, fees, or additional wages without the
  Square Payroll detail.

The supplied stubs show deposits equal to gross pay and do not expose enough
employer-side detail to allocate payroll taxes or fees. Use Local Budget for the
current cash total and the stubs for employee, hours, rate, and gross-wage
detail. Founder labor hours remain unmeasured, and the proposed $160K annual
founder-compensation basis is an owner policy, not an observed market-rate
calculation. Always show:

- as-paid cash labor;
- founder draws/personal expenses;
- accrued founder compensation under the stated policy;
- fully loaded economic labor based on measured hours or an explicit salary
  allocation method.

### 6. Use the Brain seasonality result

`business-model.md` says volume spikes in July-August and October-November. The
current Brain inference identifies October as the peak at 2.37 times baseline
and August at 0.86 times baseline. The owner directed the advisor to trust the
Brain over the unsupported assertion. Remove the July-August spike claim and use
the Brain result with its as-of date.

### 7. Business-line taxonomy is inconsistent

The Brain currently defines five operating lines plus the parent Local Effort
node:

- Weekly Meal Subscription;
- Private Dinners & Events;
- Local Effort Pizza;
- Wholesale & Bread;
- Farmers Market.

The reference document instead separates catering from private events,
separates bread/pie from wholesale, and omits farmers markets, Localist
membership, office catering, and sale/preorder commerce. The owner has not
selected a managerial P&L taxonomy. Do not hard-code one in the skill. For each
analysis, state the working taxonomy and prefer production model over marketing
page unless the decision requires a different grain.

### 8. Capitalization is economically reconciled; legal mechanics remain open

Brain correction event `5bbbbe3a-8374-4bc4-82da-ded95f099381` supersedes the
stale $3,000/1% Renee record. The current fully diluted ownership assertions are:

- Weston Smith: 45.5%;
- Catherine Olsen: 47.5%;
- Sarah Olsen: 5%;
- Renee Owens: 2%, purchased from Weston Smith for $6,000.

They total 100%. Maria Beck's unaccepted 1% offer is not included. The graph's
underlying legal records still say:

- the instrument is conditionally issuable;
- activation is unclear;
- governing approvals and paperwork remain open;
- the equity-class label and exemption analysis need counsel review.

Use this corrected cap table for economic analysis. Preserve the graph's legal
and governance warnings until counsel confirms formal issuance and exemption
mechanics.

### 9. The Wefunder and SMBX raise is ready, but not modeled here

No current graph entity or ledger event substantiates the Wefunder $350K
valuation, <=5% amount, $40K SMBX bond, 14% rate, term, interest-only period, or
decision status. The owner confirms the raise is ready to go, but no reproducible
financial model is available. Treat the stated terms and status as founder-
reported. Do not claim that DSCR, downside capacity, or post-raise fixed-cost
coverage has been demonstrated.

### 10. Retire the prior DSCR hold recommendation

The reference gives monthly bond-service figures and a 1.25x kill condition but
does not preserve the modeled cash available for debt service, tax treatment,
existing debt service, current hourly kitchen arrangement, or calculation sheet.
The owner does not have the model and says the raise is ready to go. Remove the
invented claim that DSCR was previously checked and remove the derived HOLD
recommendation from standing memory. Any future DSCR conclusion must be rebuilt
from current terms and cashflow.

### 11. Cashflow and COGS inferences are overconfident

The current Brain says average net cashflow was positive by $18,931 per month
and food cost was 18% of revenue. Both inferences have confidence 1.0 but empty
`computedFrom` arrays. Local Budget contains large transfers, reimbursements,
unresolved classifications, investments, and mixed personal/business expenses.
Do not cite these summaries until their calculation inputs are exposed and
reconciled.

### 12. The geographic description needs one convention

The public manifest says headquarters are in Roseville. Other public copy says
Minneapolis-based. Use “Twin Cities cooperative, headquartered in Roseville and
serving Minneapolis-St. Paul” unless the owner prefers a different factual
distinction between legal address, kitchen, and market identity.

### 13. Local-first is a portfolio and brand constraint

Prepared-food copy repeatedly promises Minnesota/Midwest sourcing, while the
active Psyche product is Greek olive oil. The owner defines local-first loosely
as 75-85% of inventory, plus substantial contributions to aesthetics, branding,
menu design, and other branded or proprietary details. Treat the inventory share
as a measured target/range and the non-inventory contributions as separately
described brand assets. Do not impose a universal 100% sourcing constraint.

### 14. Retention remains unmeasured

The Brain contains a target metric above 80%, not an observed retention rate.
Nine `REPEAT_CUSTOMER` inferences average only 0.41 confidence. Do not use the
target or those inferences as an LTV input. Build cohorts from normalized paid
orders and stable customer identity.

### 15. Happy Monday evidence is partial

The Brain supports $17,120.75 of substantiated Happy Monday revenue from 14
payments and confirms that identity/revenue projection previously undercounted
it. It does not verify the costing worksheet, payment terms, current credit
balance, or whether Happy Monday should be modeled as wholesale, partnership,
customer, vendor, or several roles. Preserve those as separate roles rather
than merging the economics into one label.

### 16. Retire PropCo/OpCo from standing strategy

The owner identifies the PropCo/OpCo restaurant concept as an artifact of a past
business plan. Remove it, SBA 504, and C-PACE from current ground truth. Revisit
them only if the owner opens a new real-estate or restaurant decision.

## Questions for the owner

1. When did Maria Beck start, and what is her current workload? Obtain a Square
   Payroll report only when payroll detail is material.
2. Are all PERSONAL transactions since April valid founder draws under the
   compensation policy?
3. Is Renee's 2% formally issued, or does legal/governance paperwork remain?
4. What are the final executable Wefunder and SMBX term documents? No DSCR or
   downside model currently exists in the evidence set.
