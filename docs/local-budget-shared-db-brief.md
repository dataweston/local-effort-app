# Brief for the Local Budget agent — shared-DB integration with the Company Brain

> Audience: an agent working **inside the Local Budget repo**.
> Written 2026-06-27 from the local-effort-app (Company Brain) side.
> **Supersedes the API-export approach** in `docs/local-budget-payment-export-brief.md`
> for the connection method — Weston has chosen **shared database access**, not a
> push/pull HTTP API. The *event shapes* and *vendor-name reconciliation* guidance
> in that older brief still apply and are referenced below.

## TL;DR — what the Brain needs from you

Weston has decided the Brain will read Local Budget's Postgres **directly, read-only**.
Local Budget uses Prisma ORM + PostgreSQL. Your job is to make that database safe and
legible for an external read-only consumer. Three deliverables, in priority order:

1. **A read-only role** scoped to the tables below (so the Brain can never write/alter).
2. **A documented, stable schema** for two data shapes the Brain depends on:
   - **Outflow payments** (money paid to vendors) — revives 3 dead inference jobs.
   - **Receipts with per-line price + unit** (esp. Eastside) — the keystone for recipe costing.
3. **Square customer IDs** carried on transactions/customers, if you have them — they
   close the Brain's order-attribution gap (see "Bonus" below).

You do **not** need to build an export job or an HTTP API. The Brain owns the read
side. Keep Local Budget the source of truth; just expose it cleanly.

---

## 1. The read-only role (do this first)

Create a dedicated `SELECT`-only Postgres role. Run against the Local Budget DB
(psql, the provider console, or `npx prisma db execute --file`):

```sql
CREATE ROLE brain_reader WITH LOGIN PASSWORD 'STRONG-RANDOM';
GRANT CONNECT ON DATABASE <db_name> TO brain_reader;     -- often "postgres"
GRANT USAGE ON SCHEMA public TO brain_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO brain_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT TO brain_reader;
```

If Local Budget is on **Prisma Postgres (`db.prisma.io`)** and the console blocks
`CREATE ROLE`, say so — Weston will fall back to a scoped connection string from the
Prisma Data Platform dashboard. Otherwise the role is strongly preferred.

The Brain will consume the resulting connection string as env var
`LOCAL_BUDGET_DATABASE_URL` (Weston sets it on the Brain side; you don't).

## 2. The two data shapes the Brain depends on

### 2a. Outflow payments → Brain `payment.completed` ledger events

The Brain's inference engine (`backend/api/brain/inferenceEngine.js`) has three jobs
(PREFERS / AVOIDS / PRICE_DRIFT) that are **dead because zero payment events exist**.
They are all *vendor outflow* inferences. The Brain will read your payments and project
them. For that to work, tell the Brain (in your schema doc) **which table/columns** map to:

| Brain needs | Your column (document it) |
|---|---|
| stable transaction id (idempotency key) | `?` |
| payment date (`occurredAt`) | `?` |
| **merchant/vendor name** (REQUIRED) | `?` |
| amount in **integer cents** | `?` (note if you store dollars/decimal) |
| direction (inflow vs **outflow**) | `?` — the Brain wants **outflows only** |
| your vendor id (for FK linking) | `?` (maps to Brain `localBudgetVendorId`) |

**Avoiding Square double-counting (the original reason this was excluded):** Square
*sales* already flow into the Brain directly as `order.placed` events. So the Brain will
read **only outflow/expense payments** from Local Budget (produce, flour, QuickBooks,
payroll, rent). Inflows stay on Square. If your payments table mixes inflow + outflow,
**expose a reliable direction/sign column** so the Brain can filter to outflows. This is
"Option A" from the older brief and remains the plan.

**Vendor-name reconciliation is the #1 success factor.** The Brain matches
`merchantName.toLowerCase().trim()` against existing **Vendor entity aliases** (146
Vendors exist; 103 were seeded from Local Budget). If your merchant names don't match,
inferences silently produce nothing. Please provide a **distinct list of merchant names**
as they appear in your payments table so the Brain side can add matching aliases. (Detail
in the older brief §"Critical details" #1.)

### 2b. Receipts with per-line price + unit (the recipe-costing keystone)

This is **new vs. the old brief** and is high-value. Weston confirmed Local Budget has
**Eastside receipts that record pricing alongside unit** (e.g. "Carrots, 25 lb, $X"). The
Brain's recipe/margin subsystem is currently empty (`recipeCount: 0`) and **cannot be
built without per-unit ingredient cost**. Receipts-with-units is the real source.

Document, for the receipts data:

| Brain needs | Your column (document it) |
|---|---|
| receipt id + line id (stable) | `?` |
| vendor/merchant | `?` |
| date | `?` |
| **line item name** (the ingredient as written) | `?` |
| **quantity** | `?` |
| **unit** (lb, each, case, etc.) | `?` |
| **line total** (cents) and/or **unit price** | `?` |

Even partial coverage is useful. The Brain will derive per-unit cost
(`unitPrice = lineTotal / quantity`) where unit price isn't stored directly. Flag any
vendors where units are unreliable so the Brain doesn't trust those for costing.

## 3. Bonus — Square customer IDs (closes an attribution gap)

The Brain just shipped an order projector that links Square orders to customers, but
**only 31 of 299 orders carry a Square customer id** (the rest land on an "unattributed"
placeholder). If Local Budget stores **Square customer ids** on its transactions or a
customer table — and maps them to real people/households — exposing that mapping lets the
Brain attribute far more orders. Document any `squareCustomerId`-equivalent column and how
it joins to a customer/household record.

---

## What to deliver back to the Brain side

A short **schema map doc** in the Local Budget repo (and/or pasted to Weston) covering:
1. Read-only role created (or why a scoped connection string is used instead).
2. The exact table + column names for 2a (payments), 2b (receipts), and 3 (Square ids),
   filling in the `?` cells above.
3. The distinct merchant-name list from the payments table (for vendor-alias reconciliation).
4. Any caveats: dollars-vs-cents, mixed inflow/outflow, unreliable units, stale tables.

The Brain side will then: connect via `LOCAL_BUDGET_DATABASE_URL` (read-only), build a
nightly sync that writes `payment.completed` (outflows) + receipt ledger events into the
Brain ledger keyed on your stable ids (idempotent), reconcile vendor aliases, and revive
the PREFERS/AVOIDS/PRICE_DRIFT inferences — then use the receipt unit-costs to start the
recipe/margin foundation.

## What NOT to do

- Don't grant write access; read-only role only.
- Don't build an HTTP export API — the Brain reads the DB directly now.
- Don't export Square *revenue* as outflow payments (that's the double-count).
- Don't invent merchant names; give the Brain your real distinct list so it can map them.
- Don't assume sub-daily freshness; the Brain syncs once a day.
```
