# Company Brain — Data Audit & Data Source Recommendations

Date: 2026-06-10. All counts queried live from the production Postgres (`DATABASE_URL`) via read-only Prisma scripts (since deleted).

> **Remediation log (2026-06-11/12):** Several findings below have since been
> addressed — Square Orders are now ingested (`order.placed`, 299 orders
> backfilled 730 days, daily cron at 02:30 UTC); dietary constraints were
> mined from the intake events (28 assertions across 3 customers, miner now
> runs on every new intake); an entity-merge endpoint + Quality UI exists for
> the duplicate clusters; the inference/hypothesis crons were repaired
> (Vercel sends GET, routes were POST-only); and LLM inbox triage runs as a
> Node cron. Current system state: `docs/brain-current.md`. Still open:
> gmail provisional review backlog, Anthropic API credits, weather/GBP reviews.
>
> **2026-07-03 update:** read-only Brain integrations now exist for GA4,
> Google Business Profile performance, Merchant Center diagnostics, and Google
> Ads performance. Production authorization/account configuration is still
> required; see `docs/google-business-integrations.md`.

---

## Section 1 — Data Audit

### 1.1 Volume

**LedgerEvent — 3,408 total, by eventType/source (top rows):**

| eventType | source | count |
|---|---|---:|
| email.thread | gmail | 1,061 |
| extraction.planner | extract_planner | 500 |
| extraction.square_catalog | extract_square_catalog | 456 |
| extraction.xlsx_model | extract_xlsx_model | 347 |
| extraction.brevo | extract_brevo | 187 |
| extraction.gmail_sent_deterministic | gmail_sent_harvest | 150 |
| extraction.square_customer | extract_square_customers | 149 |
| ontology.seed | seed_ontology | 117 |
| vendor.seeded | local-budget | 103 |
| localist.* (menu/window/cart/checkout/link) | hub_localist | 97 |
| extraction.receipts | extract_receipts | 43 |
| extraction.vendor_crossref | extract_vendor_crossref | 39 |
| extraction.square_csv | extract_square_csv | 36 |
| extraction.unified_customer_csv | extract_unified_customers_csv | 35 |
| extraction.email | python_extractor | 32 |
| intake.meal_prep.submitted | meal_prep_intake | 7 |
| everything else (static, sanity, january, codex_seed, cpw, admin_ux, audit) | — | 49 |

Notable: **zero `payment.completed` events**. Live Square webhook → brain ingestion is gated off (`BRAIN_INGEST_SQUARE_PAYMENTS` not set; `backend/api/brain/squareIngest.js` returns early), so the brain has no live transaction stream — only one-shot catalog/customer/CSV extracts.

**BrainEntity — 2,863 active (2,895 incl. archived):**

| entityType | active | notes |
|---|---:|---|
| Ingredient | 1,298 | +5 archived |
| Dish | 495 | +17 archived |
| Customer | 394 | |
| Note | 251 | |
| Vendor | 149 | +1 archived |
| Menu | 76 | Product 75, Person 36 |
| Ontology types (Constraint, Occasion, Offer, Channel, ProcessStep, Metric, Segment, BusinessLine, etc.) | ~70 | seeded |
| Equity/legal types (EquityGrant, Trust, VestingTerm, …) | ~15 | codex_seed |

**BrainAssertion — ~4,700 total. Top relTypes, split provisional / confirmed / retracted:**

| relType | total | provisional | confirmed | retracted |
|---|---:|---:|---:|---:|
| PRICED_AT | 1,481 | 7 | 1,472 | 2 |
| APPEARS_ON | 645 | 0 | 304 | 341 |
| CONTAINS | 445 | 0 | 443 | 2 |
| MENU_SNAPSHOT | 287 | 0 | 182 | 105 |
| EMAILED | 236 | 191 | 45 | 0 |
| ABOUT | 234 | 0 | 234 | 0 |
| EVIDENCES | 219 | 218 | 1 | 0 |
| USES_CHANNEL | 191 | 0 | 191 | 0 |
| GAVE_FEEDBACK | 176 | 0 | 176 | 0 |
| DISCUSSED_OFFER | 169 | 160 | 9 | 0 |
| USES_WORDING | 138 | 138 | 0 | 0 |
| MENTIONED_OCCASION | 83 | 78 | 1 | 4 |
| PAYMENT_RECEIVED | 59 | 24 | 32 | 3 |
| ORDERED / PAYMENT_SENT | 43 / 43 | 13 / 0 | 22 / 43 | 8 / 0 |
| ~30 long-tail relTypes (equity, ontology, USDA_VERIFIED…) | ~160 | 0 | ~155 | 2 |

**829 provisional assertions are unreviewed** — 785 from `gmail_sent_harvest`, 44 from `python_extractor` (gmail inbox classifier). Almost nothing gmail-derived has been confirmed.

**BrainInference:** exactly one type — `RELIABLE_SUPPLIER`, 103 rows, all computed in a single 11-second run on 2026-04-19, **all 103 flagged stale**, all with `knownUntil = null`. The inference layer ran once and has never refreshed.

**BrainInboxItem:** 1,059 items — 1,057 from gmail + 2 from admin_ux — **all status `triaged`, zero pending**. No backlog (oldest 2026-04-23, newest 2026-04-27).

### 1.2 Gmail extraction quality (the priority)

Gmail enters the brain via three pipelines:

1. **`email.thread` (1,061 events)** — thread *metadata only* (from/to/subject/participants; `snippet` is empty in every sampled row). By sender-pattern matching, **298 / 1,061 (28%) are automated or marketing senders**. Top sender domains tell the story: weddingpro.com (80), reply.narvar.com (61), eq.intuit.com (52), matchmaker.fm (52), em1.turbotax.intuit.com (48), faire.com (63 across subdomains), mailchimpapp (22). The remaining ~70% are plausibly real correspondence (gmail.com 317, mccdmn.org 43, real vendor/customer domains).

2. **`extraction.email` / `python_extractor` (32 events → 44 provisional assertions)** — a gpt-4o classifier over inbox threads. The good news: it *ignores* junk domains well (sampled payloads: `"ignored: ignored domain: weddingpro.com"`, `uber.com`, `"ignored subject pattern"`). The bad news is what it kept (see junk examples below).

3. **`extraction.gmail_sent_deterministic` / `gmail_sent_harvest` (150 events → 785 provisional assertions, 95% of all provisional)** — deterministic harvest of sent threads with rich metadata (subject, sourceSpan quotes, amounts, dates, guest counts, gmail deep link).

**Sample verdict (30 provisional assertions + 36 ledger events read in full):** roughly **60–70% are grounded in a real business fact** (a genuine inquiry, order, invoice, or event thread — the `sourceSpan` quotes are authentic), but **~30–40% of the graph edges built on top of them are wrong**: wrong entity type, wrong offer mapping, or self-referential noise.

**Verbatim GOOD extractions:**

- `EMAILED` Weston Smith → Customer "Youa Vang" (conf 0.92), subject "Farm-to-Table Dinner Inquiry - 7/25/2026", guestCounts `[100]`, sourceSpan: *"We are hosting another farm-to-table dinner on 7/25/2026 at Gibbs Farm… We plan to have 100 people for this dinner."* — a real $-bearing catering lead with date, venue, and headcount.
- `DISCUSSED_OFFER` Customer "forrest Mainville" → Offer "Pizza Pop-Up", sourceSpan: *"How can I order a pepperoni pizza? I'd like 1 cheese and 1 pepperoni to pickup tonight."*
- `EVIDENCES` Note "Sent thread: pizza party at Henry and Son" → Customer "Henry & Son", amounts `["$650"]`, guestCounts `[16]`: *"Budget for Dec 12 will be $650 or so if we sell out. Looking for 3-4 selections for 6 courses and 16 people."*
- `EVIDENCES` → Customer "Tessa Gudmestad": *"I just tried ordering twice and used two different cards and the checkout failed both times?"* — real product-bug feedback captured incidentally.
- `USES_WORDING` Masters Dinner thread: 25+ phrase candidates of the founder's actual sales voice ("$125 @ 14 guests", wagyu vs tri-tip upsell language) — works as designed.

**Verbatim JUNK extractions:**

- `ORDERED` Vendor "Local Effort" → Vendor "Local Effort" (self-loop). Rationale: *"Email subject explicitly states 'INVOICE' from LOCAL EFFORT… indicating an invoice was received."* — the classifier read the founder's own outbound invoice as a vendor billing the business.
- `PAYMENT_RECEIVED` Vendor "Intuit QuickBooks" → itself (multiple copies, provisional): a QuickBooks *subscription charge* recorded as revenue-shaped signal. Same pattern for "Intuit", "Local Effort", "Bakers' Field Flour & Bread LLC".
- `EMAILED` Weston → **Customer "Local Effort"** — the business's own Brevo notification address (`dataweston@9846241.brevosend.com`) was minted as a Customer. "Local Effort", "Local Effort Pizza Funder", and "Weston Smith" all exist as Customer entities.
- `DISCUSSED_OFFER` Customer "Brittney Olson" (15-guest Edina holiday party, $45–75/pp) → Offer **"Wholesale Bread Supply"** — clearly a Private Dinner lead mapped to the wrong offer. Same wrong-offer mapping for "MN_MDA_FFSD Licensing" (the MN Dept of Agriculture, minted as a *Customer*) and a wedding inquiry tagged `MENTIONED_OCCASION → "Holiday Gathering"`.
- Junk entity "Askus" (Customer) created from a salutation fragment; Dish entities minted from mid-sentence fragments: `"start of a personal portal, including your"`, `"from you. Jan 10th Saturday evening the"`, `"dish. i could do a tenderloin or"`, `"with 100% locally sourced ingredients. We offer"`, `"average daily café revenue crosses a second food exec role"`.

**Junk quantified:**

| Pattern | Count |
|---|---:|
| Customer entities whose name is a raw email address | 76 / 394 (19%) — many are *press* contacts (`tips@bringmethenews.com`, `jfleming@pioneerpress.com`, `sue.campbell@startribune.com`) typed as Customer |
| Entities starting lowercase (fragment smell) | 432 / 2,863 (15%) — Dish 163, Ingredient 154, Customer 87 |
| Dish names that are sentence fragments (pronouns/verbs or >9 words) | 95 / 495 active Dishes (19%) |
| Entities with zero assertions (orphans) | 111, of which **99 / 149 Vendors (66%)** |
| Assertions where src = dst (self-loops) | 1,262 (some by design — PRICED_AT 513, GAVE_FEEDBACK 176 — but ORDERED 31 / PAYMENT_RECEIVED 24 self-loops carry no graph value) |
| Names with newsletter-footer text / URLs | 0 (the harvest avoids the classic footer junk) |

### 1.3 Coverage gaps

**Date range per source (min → max occurredAt):**

| Source | n | First | Last | Status |
|---|---:|---|---|---|
| hub_localist | 97 | 2026-06-09 | 2026-06-10 | LIVE |
| meal_prep_intake | 7 | 2026-06-03 | 2026-06-08 | LIVE |
| python_extractor | 32 | 2026-05-28 | 2026-05-28 | one-shot |
| extract_vendor_crossref | 39 | 2026-05-19 | 2026-05-19 | one-shot |
| extract_brevo | 187 | 2025-09-04 | 2026-05-06 | stale 5 wks |
| extract_square_customers | 149 | 2025-09-18 | 2026-04-30 | stale 6 wks |
| **gmail** | 1,061 | 2022-10-19 | **2026-04-26** | **stale 6+ wks** |
| gmail_sent_harvest | 150 | 2025-10-30 | 2026-04-27 | stale 6+ wks |
| extract_square_catalog | 456 | 2025-04-07 | 2026-04-23 | stale |
| extract_planner / static / xlsx / sanity / january | ~880 | — | 2026-04-23 | one-shot batch day |
| local-budget (vendor.seeded) | 103 | 2024-01-11 | 2026-04-17 | stale 8 wks |
| extract_cpw_prices | 1 | 2026-04-20 | 2026-04-20 | one-off |
| extract_receipts / square_csv / unified_customers_csv | 114 | 2024 | 2025 | historical backfills |

Essentially everything except the Localist hub and meal-prep intake was a one-time April/May 2026 ingestion sprint. **There is no recurring sync for gmail, Square, or Brevo.**

**Other gaps:**

- **0 of 394 Customer entities have any PREFERS/AVOIDS/allergy/dietary constraint assertion.** All 19 `CONSTRAINED_BY` edges are ontology-level (Offer/ProcessStep → "Oven Capacity", "Labor Hours", etc.). For a meal-prep business this is the single most valuable missing edge type — and 7 `intake.meal_prep.submitted` events are sitting in the ledger un-mined.
- **12 of 149 Vendors (8%) have any payment history**; 99 vendors (66%) have no assertions at all (bulk-seeded from local-budget, never enriched).
- Inbox: zero stuck pending items (1,059/1,059 triaged) — capture/triage loop is healthy.
- Inference layer: one type, one run, 100% stale (see 1.1).
- 149 / 394 Customers carry a `squareCustomerId`; 0 carry `localEffortCustomerId` — app-DB ↔ brain customer linking never happened.

### 1.4 Duplicate clusters (what a merge feature must handle)

Exact same-type `canonicalName` duplicates are nearly gone (an `audit_graph` merge ran 2026-04-28); only 2 clusters remain, both from the live meal-prep intake writing a new Note per submission:

| entityType | canonicalName | n |
|---|---|---:|
| Note | meal prep intake new meal prep customer 2026 06 03 | 3 |
| Note | meal prep intake new meal prep customer 2026 06 08 | 2 |

The real duplication problem is **cross-entityType**, which name-merge by (type, canonicalName) can't see. Top 20 lower(name) groups spanning multiple types:

| name | types | examples |
|---|---:|---|
| local effort | 4 | BusinessLine + Customer + Product + Vendor |
| justin bloom / mark theobald / josiah evensen / weston smith | 3 each | Customer + Person + Vendor (same human, three nodes) |
| happy monday | 3 | Customer + Product + Vendor |
| catherine olsen, clare holte, alyssa andes | 2 | Customer + Person |
| americano, cappuccino, croque monsieur, 12" premium, egg and cheese sandwich (+bacon variant), egg salad sandwich, bacon add-on, chocolate chip cookie | 2 | **Dish + Product** — the Square-catalog extract created Product twins of existing Dishes |
| apple | 2 | Ingredient + Vendor (Apple Inc. vs the fruit) |
| brooks running | 2 | Customer + Vendor |

A merge feature therefore needs: (a) cross-type merge with a type-priority rule (Person ⊃ Customer/Vendor roles), (b) a Dish↔Product unification pass for Square catalog items, and (c) a guard that stops extractors from minting the business itself / the founder as Customer or Vendor.

---

## Section 2 — Data Source Recommendations

Context verified in repo: GA4 **is** installed (`gtag` with `G-P0Q3W8KEKY` in `index.html`); Square token already in `.env` and used by sidecar jobs; current Square coverage = Catalog + Customer Directory only (`extract_square_catalog.py`, `extract_square_customers.py`); payments/orders deliberately delegated to "local-budget" and the webhook brain-ingest is disabled; `extract_cpw_prices.py` is a one-off CSV import of Co-op Partners Warehouse wholesale prices.

### 2.1 Candidate evaluation

**1. Square Orders API (and re-enabling live payment ingest)** — *not currently captured*
- Signal: per-line-item sales (`SearchOrders` returns line items, quantities, totals, location, `customer_id`). Turns the brain's Dish/Product nodes into demand-ranked nodes; enables Customer→ORDERED→Dish edges, repeat-purchase detection, day-of-week demand curves per business line (meal prep vs pizza vs Localist window).
- API/auth: existing `SQUARE_ACCESS_TOKEN`; `POST /v2/orders/search` ([docs](https://developer.squareup.com/reference/square/orders-api/search-orders)). Free.
- Effort: **low** — clone `extract_square_customers.py`, paginate by location + date cursor, write `order.completed` ledger events + ORDERED assertions keyed to `squareCustomerId` (149 customers already linked). Loyalty API exists but requires a paid Square Loyalty subscription — skip ([Loyalty overview](https://developer.squareup.com/docs/loyalty-api/overview)).

**2. Google Analytics 4 Data API** — site already tags `G-P0Q3W8KEKY`
- Signal: daily sessions/users per landing page (tiny-weddings, meal-prep, pizza, Localist), traffic source attribution to correlate with `localist.window.viewed` and intake submissions; closes the top-of-funnel blind spot.
- API/auth: free; service account added as GA4 property viewer; `runReport`. Standard-property quotas (e.g., 10 concurrent requests, generous hourly token buckets) are far beyond a daily one-property job ([quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas)).
- Effort: **low** — one sidecar job emitting `web.traffic.daily` ledger events; no app review, no OAuth dance.

**3. Weather — Open-Meteo (skip NOAA unless attribution-free needed)**
- Signal: historical (ERA5 back to 1940) + forecast for Minneapolis; join temperature/precip/snow to weekly order counts → demand-correlation inferences ("snow Friday → pizza pickup down X%", "first 80°F week → meal-prep churn"). Forecast data lets the brain warn about *next* week.
- API/auth: no key, free for non-commercial up to 10k calls/day; commercial license is a cheap monthly subscription if needed ([pricing](https://open-meteo.com/en/pricing), [historical API](https://open-meteo.com/en/docs/historical-weather-api)).
- Effort: **trivial** — one HTTP call/day plus a one-time backfill; the only real work is the correlation inference job, which is exactly what the (currently dead) inference layer needs to come back to life.

**4. Google Business Profile reviews**
- Signal: ratings + review text → `GAVE_FEEDBACK` ledger events and reputation trend; review text is high-quality customer language for the USES_WORDING corpus.
- API/auth: free, but **gated** — new GCP projects get 0 quota; must apply with a verified GBP (60+ days old) and wait ~3–10 business days for approval ([prereqs](https://developers.google.com/my-business/content/prereqs), [review data](https://developers.google.com/my-business/content/review-data)).
- Effort: medium (mostly the approval wait). Volume is small for a single-location business — worth doing, not first.

**5. Instagram (Meta) Graph API — organic posts + engagement**
- Signal: post reach/saves/comments per content angle; the brain already has `CREATES_CONTENT_ANGLE` and `USES_WORDING` nodes this would feed; correlate post timing with inquiry spikes (a Walker Art Center partnership inquiry in the audit literally came from an IG tag).
- API/auth: requires Business/Creator account, a Meta developer app, OAuth, and **Meta app review** before production use; ~200 calls/hr per account — plenty ([Meta overview](https://developers.facebook.com/docs/instagram-platform/overview/), [integration guide](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/)). Free.
- Effort: **medium-high** for one person (app review friction, token refresh plumbing). High value for a food business, but worst value-per-effort of the viable options. Manual monthly CSV export from the IG professional dashboard is a legitimate cheap interim.

**6. USDA / commodity food prices — AMS MyMarketNews API**
- Signal: terminal-market wholesale produce prices (Chicago/Minneapolis-relevant reports) → benchmark the CPW `PRICED_AT` assertions and flag ingredient cost spikes before menu pricing decisions. Complements, not replaces, the existing one-off `extract_cpw_prices.py` (CPW = actual paid prices; USDA = market trend).
- API/auth: free key on registration; JSON over `marsapi.ams.usda.gov` ([getting started](https://mymarketnews.ams.usda.gov/mars-api/getting-started)).
- Effort: low-medium (the work is mapping USDA commodity names onto the 1,298 Ingredient nodes — start with the top-20 ingredients by CONTAINS frequency).

**7. Local event calendars (Mpls/St. Paul)**
- Signal: demand spikes for pizza pop-ups/Localist window from stadium concerts, festivals, conventions. Ticketmaster Discovery API is the only good free structured source: 5,000 calls/day, geo-filterable ([Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)). Eventbrite killed its public event-search API; Meet Minneapolis / Explore Minnesota have no APIs (scraping = maintenance tax); PredictHQ is enterprise-priced.
- Effort: low for Ticketmaster-only, but signal is partial (misses farmers markets, neighborhood festivals — arguably the events that matter most to this business). Marginal; do after weather proves the correlation pipeline works.

**8. Rejected / deferred**
- **QuickBooks Online API**: the audit shows QBO is in active use (Intuit emails everywhere). True vendor-payment history would fix the "12/149 vendors have payment data" gap better than anything — but OAuth2 app setup + accounting-data sensitivity makes it a heavier lift; revisit if local-budget can't export.
- **Yelp Fusion** (only 3 truncated review excerpts per business), **foot-traffic data** (Placer.ai etc., enterprise pricing), **PredictHQ** (paid), **Facebook Page data** (low signal vs IG): poor fits for a one-person operation.

### 2.2 Top 3 by value-per-integration-effort

1. **Square Orders API nightly sync + backfill** — highest-value structured data the business already owns; existing token; one new sidecar job; directly fixes the brain's biggest blind spot (zero transaction events) and links 149 already-ID'd customers to what they actually buy.
2. **GA4 Data API daily pull** — tagging already live, free, service-account auth in an afternoon; gives the brain its only marketing-funnel signal and pairs with the live `hub_localist` events.
3. **Open-Meteo weather backfill + daily forecast** — near-zero effort, and it's the forcing function to resurrect the inference layer (103/103 inferences stale since April) with a genuinely useful demand-correlation inference for a weather-exposed meal-prep/pizza operation.

Runners-up: GBP reviews (start the access application now, integrate when approved), USDA MyMarketNews (after top-20 ingredient mapping), Instagram (manual export until app review feels worth it).

---

### Appendix: highest-leverage hygiene fixes surfaced by the audit (no new sources needed)

1. Re-run gmail + Brevo + Square-customer syncs on a schedule — all stale since late April/early May.
2. Extract dietary constraints from the 7 `intake.meal_prep.submitted` ledger events → Customer PREFERS/AVOIDS edges (currently 0/394).
3. Review queue for the 829 provisional assertions (785 gmail-sent); blocklist the business's own addresses (`*@localeffortfood.com`, `dataweston@*`, `*.brevosend.com`) from entity minting.
4. Merge pass: cross-type person clusters (Weston Smith ×3, Josiah Evensen ×3…), Dish↔Product Square twins, and the 95 sentence-fragment Dish names (archive, don't merge).
5. Dedupe guard on meal-prep intake Notes (3 identical Notes per submission day).
