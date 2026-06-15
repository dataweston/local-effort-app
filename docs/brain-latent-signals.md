# Company Brain — Latent Signals Inventory

> Date: 2026-06-14. What the brain's data *could* surface but currently doesn't.
> Every number here was queried live from production Postgres. Companion to
> `docs/brain-data-audit.md` (data quality) and `docs/brain-current.md`
> (architecture). Motivated by the question: "attach prices to menus based on
> transactions — show what a database like this should be able to show if data
> is properly ingested."

## TL;DR

The signals split into two distinct failure modes:

- **Mis-shaped extraction (the menu-pricing case):** the data is present in the
  graph but on the wrong edges / wrong entity types. Event quote prices exist as
  loose `amounts`/`guestCounts` metadata on `DISCUSSED_OFFER`/`USES_WORDING`
  edges, and `Menu` entities are largely email subject lines. Fix = a targeted
  re-extraction into a proper `QUOTED/CHARGED → Menu @ price` edge + tighter
  Menu minting. **This is the founder's actual ask and the most tractable.**
- **Missing/weak source data (ingredient cost):** recipe-level ingredient
  pricing is genuinely weak. The CPW catalog is now `PriceReference` (pro-forma
  only); receipts lack units (COGS, not recipe cost). The real path is Happy
  Monday's costing data + Bakers Field purchase-order unit costs extrapolated
  through written recipes — a data-sourcing task, not a linking pass.

Un-normalized identity (line-item strings, Dish↔Product twins) is still a real
secondary issue for demand ranking — see Signal 3.

## Signal 1 — Event menu pricing (the actual ask)

**Business reality (founder):** for events, Local Effort sends the guest a menu
in natural-language text (email) and then charges them. The price is explicit in
BOTH the email body AND the resulting transaction. So "what did we quote/charge
for this event menu" should be answerable. It mostly isn't.

**The data IS present — but mis-shaped, not missing.** ~**203 of ~1,500**
non-null-metadata assertions carry `amounts` and/or `guestCounts` in their
metadata (e.g. `DISCUSSED_OFFER Kylie Weber → Pizza Pop-Up  amounts:["$600"]
guests:[30]` — a real 30-guest, $600 event quote). The pricing signal exists.

**Two problems block it from becoming "menu pricing":**

1. **No relType means "this menu was quoted/charged at $X for N guests."** The
   price/guest data is scattered as loose metadata on edges that mean something
   else — `DISCUSSED_OFFER`, `USES_WORDING`, `MENTIONED_OCCASION`,
   `EVIDENCES`. There is no `Customer/Event —QUOTED/CHARGED→ Menu @ price`
   edge, so the amount never attaches to a menu.

2. **`Menu` entities are mostly email subject lines, not menus.** Of 76 Menu
   entities, many are gmail threads typed as Menu because the body said "menu":
   `"Rent is PAST DUE"`, `"Following up"`, `"🍕 New Pledge: Anna Haack - $45.00"`,
   `"Lol yes I am so sorry…"`. One literal example in the graph:
   `APPEARS_ON  Water Bill (Aug–Oct) → Menu:"Rent…"  amounts:["$1,850.00",…]`
   — a utility bill attached to a "Menu". The real event-menu text (dishes +
   per-guest price) lives in the email body and was never parsed into a
   structured Menu→Dish→price.

The Square-catalog `MENU_SNAPSHOT` rows that DO carry clean prices
(`Smoked Turkey Sandwich: 84 units / $512.40`) are from the `xlsx_model` opening-
menu seed, not from event quotes — so they don't answer the event question.

**Unblock (this is an extraction problem, not entity-resolution):**
1. A targeted parse of the ~52 gmail events with `$amount` + menu/course/guest
   language → emit a real `QUOTED`/`CHARGED` assertion: `Customer → Menu`, with
   `metadata.priceCents`, `guestCount`, `perGuestCents`, and the dish list from
   the body. The `amounts`/`guestCounts` already extracted are the seed.
2. Join the quote to the **transaction** (order.placed / future payment) for the
   same customer+date to get *quoted vs actually charged*.
3. Stop minting `Menu` from email subjects (tighten the extractor; the
   self-identity/fragment guards are the model for this).

This is more tractable than the ingredient signals below: the data is explicit
and already partly extracted — it just needs the right edge shape.

## Signal 2 — Dish food cost & margin (real, but NOT via the CPW catalog)

**What it should show:** each Dish's food cost (Σ cost of its ingredients) and
margin (sale price − food cost).

**Founder corrections on the data sources (important — my first pass was wrong):**

- **CPW price list is now `PriceReference`, not `Ingredient`** — deliberately
  moved out because it's not in active use. It's suited to pro-forma / research,
  and is only useful here if **units are preserved** and the system can
  extrapolate from a written recipe. Do NOT treat it as live ingredient cost.
- **Receipts are real but lack per-unit info** — better for measuring *actual
  COGS* (what we spent) than for *recipe costing* (cost per dish). Don't force
  them into recipe math.
- **Recipe-level ingredient pricing is genuinely weak** today. The 443
  `Dish —CONTAINS→ Ingredient` edges exist, but the contained ingredients
  (free-text from gmail recipes) have almost no reliable cost attached.

**The viable path to real ingredient cost (founder-identified):**

1. **Happy Monday ledger** — has an ingredient-costing tab and probably some DB
   material (unverified). If it carries per-unit ingredient costs, that's a
   legitimate source to wire in for ingredient pricing. **Check this first.**
2. **Bakers Field purchase orders → unit-cost extrapolation.** Concrete example:
   from Bakers Field flour orders the brain can derive a flour unit price, and —
   *if the founder writes the recipe* — extrapolate the cost of pizza dough or
   bread. This is the genuinely useful version: real purchase prices + a recipe
   yield = derived sub-ingredient cost. Needs (a) Bakers Field order ingestion
   with units, (b) a recipe with quantities, (c) a yield/extrapolation step.

**Unblock:** verify Happy Monday costing data; if usable, ingest it as the
ingredient cost source. Separately, ingest Bakers Field POs with units and add a
recipe-yield model for flour→dough/bread. This is a data-sourcing + recipe-model
task, NOT the CPW entity-resolution pass I first proposed (that was based on a
wrong read of where the catalog lives).

## Signal 3 — Demand ranking (what actually sells)

**What it should show:** Dishes/Products ranked by revenue and units, per
business line, over time.

**Partially available now:** `order.placed` line items carry name + totalCents.
Live top sellers by revenue:

| Revenue (12mo) | Line item |
|---|---|
| $7,553 | Weekly meals |
| $4,896 | weeklymeals |
| $3,400 | Monthly billing for weekly meals |
| $2,326 | may 11 – june 5 |
| $1,728 | Shelley Craig Weekly Meals |

**Why it's weak:** line-item names are **free-text and un-normalized** —
"Weekly meals" / "weeklymeals" / "Shelley Craig Weekly Meals" / "Monthly billing
for weekly meals" are all the same product, split across 4 strings. They're not
linked to Dish/Product entities at all, so the brain can't roll them up or join
them to margin.

**Unblock:** map `lineItems[].name` → Dish/Product entity at ingest time
(`squareOrdersSync.js`), or a normalization pass with an alias table. Then
`Dish —ORDERED` demand ranking + a "top sellers by margin" join with Signal 2.

## Signal 4 — Seasonality / occasion demand

**What it should show:** which occasions (holidays, weddings, summer dinners)
drive inquiries and orders, and when — so the founder can staff and buy ahead.

**Available now:** 87 occasion edges (`MENTIONED_OCCASION` /
`TRIGGERED_BY_OCCASION`) plus `order.placed` timestamps. The audit already noted
order volume spikes Jul–Aug and Oct–Nov.

**Why it's untapped:** no inference correlates occasion edges or order timestamps
into a seasonal curve. This is a pure compute job over existing data — no new
ingestion needed. Pairs naturally with the (recommended, not-yet-built) weather
correlation from the data-source audit.

**Unblock:** a `SEASONAL_DEMAND` inference bucketing orders by month/occasion.

## Signal 5 — Dish/menu feedback sentiment

**What it should show:** which dishes and menus customers actually liked, from
the portal ratings and dislike notes.

**Available now:** 176 `GAVE_FEEDBACK` edges. Constraint mining already turns
intake into PREFERS/AVOIDS.

**Why it's untapped:** feedback isn't aggregated per Dish/Menu into a score, and
isn't joined to demand (Signal 3) or margin (Signal 2) — the interesting view is
"high-margin + high-rating + high-demand" dishes to push vs.
"low-margin + low-rating" dishes to cut.

**Unblock:** a feedback-rollup inference per Dish/Menu; then a combined
"menu engineering" quadrant view (the classic popularity×profitability matrix).

## Signal 6 — Vendor concentration / supply risk

**What it should show:** how dependent the business is on each vendor (share of
ingredient spend), so a vendor going silent (the AVOIDS inference) is weighted
by how much it matters.

**Available now:** 20 vendors carry supply/price edges; `PRICED_AT → Vendor`
(966) is the spend basis. The dead PREFERS/AVOIDS/PRICE_DRIFT jobs (see the
Local Budget brief) would light this up once payment data flows.

**Unblock:** Local Budget payment export (separate brief) +
a vendor-concentration inference.

## Recommended order

Grouped by failure mode, easiest/highest-value first:

1. **Event menu pricing (Signal 1) — extraction fix, do first.** The data is
   present (203 assertions with amounts/guests) but on the wrong edges. Re-parse
   the ~52 priced event emails into a `QUOTED/CHARGED → Menu @ price` edge and
   stop minting Menus from email subjects. This is the founder's actual ask and
   needs no new data source.
2. **Pure-compute inferences (Signals 4 & 5).** Seasonality and feedback rollup
   need no new ingestion or linking — just compute jobs over data already in the
   graph (87 occasion edges, 176 feedback edges, order timestamps).
3. **Demand ranking (Signal 3) — normalization.** Map line-item name strings →
   Dish/Product (alias table) so "Weekly meals"/"weeklymeals" roll up.
4. **Ingredient cost (Signal 2) — data sourcing.** Verify Happy Monday costing
   data; ingest Bakers Field POs with units + a recipe-yield model. NOT a CPW
   linking pass (CPW is now `PriceReference`, pro-forma only).
5. **Vendor concentration (Signal 6).** Blocked on the Local Budget payment
   export (separate brief).

Key correction from the first draft of this doc: menu pricing is an
**extraction / edge-shape** problem (data present, wrong shape), not the
entity-resolution problem I first assumed. Ingredient cost is a **data-sourcing**
problem (the catalog I pointed at is pro-forma-only). Only demand ranking is
genuinely an identity-normalization issue.
