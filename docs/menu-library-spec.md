# Local Effort menu library: spec

Owner: Local Effort Cooperative · As of 2026-10-17 · Review by: when Phase 6 ships, or the owner rejects this plan.

Status: executed 2026-10-17 (phases 1-6). Phase 7 is not started. Decisions taken: Prisma `Dish` edited in the hub, public path `/dishes`, nothing public until the owner marks it. Import applied to production (942 dishes, 221 menus). Open: brain `Dish` entities and `APPEARS_ON` relations were not built by the importer; `WeeklyMealsPage.jsx` still carries `RECENT_MEAL_PREP_MENUS` until a published `meal_prep_week` exists to replace it; the public diet/protein filters are a JavaScript enhancement (course anchors and the full list work without JS). Original plan follows. The source corpus is `.tmp/menu-recovery/` (gitignored; contains customer names and prices).

## Outcome

One canonical catalog of Local Effort dishes and the menus they appeared on. The catalog is:

- Recovered from about four years of client email.
- Browsable and searchable by the owner, hub staff, meal-prep clients and the public.
- Indexed in the Company Brain and exposed to agents.
- Grows automatically as new menus are written.

It is the base for composing menus fast now and for customer self-serve composition later.

## What exists today (evidence)

| Thing | Where | State |
|---|---|---|
| Recovered corpus | `.tmp/menu-recovery/extracted.json`, `RECOVERED_MENUS.md` | 221 menus and 1,797 dish lines from 180 threads, 2022-05 to 2026-10. Lines are free text. 35% carry an explicit course ("First course:", "Dessert:"). About 1,024 distinct leading names; 164 recur three or more times (croque monsieur ×22, focaccia ×19, torta caprese ×15). Some lines are not dishes, e.g. "seated and shared" ×40 and "movement" ×8. |
| Prisma `Dish` | `prisma/schema.prisma:262` | title, description, tags[], categories[], allergens[], status. Linked to prices, orders, feedback, `DishSourceLink` (provenance) and `DishDraft` (review queue). Admin CRUD is in `api-handlers/weekly-order/admin/dishes.js`. The customer picker is retired (410). |
| Brain `Dish` entity | `backend/api/brain/dishResolver.js` | Created weekly by the hub meal-prep notepad (`api-handlers/hub/master-menu.js`). Linked to Prisma via `BrainEntity.localEffortDishId` (schema:1682). About 19% are Gmail-fragment junk (`docs/brain-data-audit.md`). |
| Brain `Menu` entity | `backend/api/brain/menuRoutes.js` | `properties.dishes[]` as JSON. Includes a share-token portal (`/portal/:token`), customer feedback, and avoid/medical constraint checks before broadcast. |
| Graph relations | `backend/api/brain/relationshipDictionary.js:22-95` | `APPEARS_ON` (Dish→Menu/Event), `CONTAINS` (Dish→Ingredient), `AVOIDED_BY` / `MEDICAL_CONSTRAINT`. |
| Search | `backend/api/brain/businessMemory.js` | Postgres full-text search across 7 memory kinds. Its header requires that API routes and MCP use this module. No embeddings. |
| Sanity | `studio/schemaTypes/menu*.js`, `mealPrepMenu.js` | Free-text strings with no frontend consumer (orphaned). `dinnerEvent.menu` feeds `/julydinner`. |
| Hard-coded menus | `src/pages/WeeklyMealsPage.jsx:18-43`, `WeeklyOrderPage.jsx:160-280` | Violate the content-ownership rule today. |
| Party quotes | `SmallEventEstimate` (schema:36-73), `/book` wizard | The menu is free-text `menuNotes`/`courses`. |
| Diet vocabularies | localist booleans, `officeMenu.js` diets, `Dish.allergens` free text, `MealPrepCustomerMenuItem.diet` | No shared enum. |

There are already three dish models, and none is canonical. This plan does not add a fourth.

## Decisions (recommendation first)

1. **Source of truth for dish facts.** Recommended: Prisma `Dish`, extended. It is typed, already linked to orders, feedback, provenance and the brain, and the weekly meal-prep pipeline can write to it automatically. Sanity keeps the page copy around the library (intro, headings, calls to action).
   - This needs one line added to the AGENTS.md "Content ownership" section, so no agent copies dish text into Sanity or JSX.
   - Alternative: Sanity `dish` documents. Studio editing comes free, but every new meal-prep dish then becomes an automated CMS write, and brain/order links must cross systems.
2. **Public path.** Recommended: `/dishes`. `/menu` is a retired route that redirects to `/` (AGENTS.md); using it needs the owner to explicitly un-retire it.
3. **Public exposure.** Default: nothing is public until the owner marks a dish `public`.
   - Archived client menus never go public with names, prices or dates.
   - The owner may publish an anonymized version ("Backyard birthday, 20 guests, fall") as a template.
4. **Diet and allergen claims.** Model-inferred tags are stored as `inferred`. Public pages show only diet tags the owner has confirmed. Allergen statements are never auto-published.

## Data model

### `Dish` (extended)

Add to the Prisma model:

- `slug @unique`
- `courses String[]`, from this vocabulary: snack, board, starter, soup, salad, main, side, bread, dessert, breakfast, drink, pantry
- `proteins String[]`, from: beef, pork, lamb, poultry, duck, fish, shellfish, egg, dairy-led, legume, tofu, vegetable-led. This is the "meat or vegetable" axis.
- `diets String[]` plus `dietsVerifiedAt DateTime?`. Diets: vegetarian, vegan, gluten-free, dairy-free. These map to schema.org `suitableForDiet`.
- `seasons String[]`
- `cuisines String[]`
- `components String[]`: primary flavors and components in the owner's wording
- `formats String[]`, from: plated, family-style, buffet, passed, board, drop-off, meal-prep
- `programs String[]`, from: events, meal-prep, cafe, pop-up, storefront
- `visibility`: internal, clients or public. This is separate from `status`, which stays draft, active or retired.
- A generated `tsvector` column with a GIN index.

Existing fields stay: `title`, `description`, `allergens`, `status`.

### Vocabulary module

One shared vocabulary module, consumed by the backend, the hub and public pages. It maps the existing localist booleans, the `officeMenu` diets and free-text allergens onto the enums above. Those surfaces migrate onto it as they are touched; they are not rewritten in this pass.

### Dish identity

Each catalog `Dish` has exactly one brain `Dish` entity, linked through `localEffortDishId`. Import and `master-menu` both enforce this 1:1 link.

### Menus

Menus are brain `Menu` entities, reusing the portal, feedback and constraint checks. Extend `properties`:

```
kind: archive | template | proposal | meal_prep_week
program, occasion, serviceStyle, guests, pricePerGuest, eventDate (America/Chicago), status
sections: [{ course, items: [{ dishId, wording }] }]
```

`wording` keeps the owner's exact descriptor for that occasion. That is how variations are recorded over time.

- Every item also gets an `APPEARS_ON` relation.
- Provenance is a `DishSourceLink` (sourceId `gmail-menu-recovery`, externalKey `<threadId>#<menu>#<line>`) plus the Gmail thread id. Thread ids are visible only to the owner.

### Derived, never stored

Times served, first and last served, and "often served with" (co-occurrence on the same menu). These are computed from `APPEARS_ON` at query or snapshot time.

### Wiki

There is no separate wiki. The dish page is the wiki page: description, facets, a timeline of variations, pairings, feedback, and the linked `Recipe` if one exists. Longer technique notes stay in `HubDocument` and link to dishes.

## Phase 1: normalize the corpus (offline, no production writes)

1. **Line split and classify.** Use `completion(model="smol")` per menu, with the menu as context, under a frozen schema. Each line splits into zero or more dishes, each with:
   - `name` (owner's words, title-cased)
   - `wording` (full descriptor)
   - `course` (inferred from position and prefix when not stated)
   - `proteins`, `diets` (always `inferred`), `seasons`, `cuisines`, `components`, `formats`, `program`
   - `isDish`, which drops service-style lines such as "seated and shared"
2. **Cluster into canonical dishes.**
   - First pass is deterministic: normalized name plus token overlap.
   - Ambiguous pairs, such as "Croque monsieur" vs "Croque madame" or "Torta caprese" vs "Chocolate torta", go to `judge_batch` with a frozen same-dish/variant/different rubric.
   - The canonical name is the most frequent recent wording.
3. **Flag for the owner.** These go to a review queue:
   - judge confidence below 0.7
   - a dish with no course
   - a diet tag that conflicts with components (e.g. "vegetarian" with anchovy)
   - a singleton dish whose name is shorter than 3 tokens
4. **Write outputs to `.tmp/menu-recovery/`.**
   - `catalog.json`: dishes with variants and sources.
   - `catalog-review.md`: flagged items only, plus counts per course and protein.
5. **Acceptance.**
   - The owner skims `catalog-review.md`.
   - A spot check of 20 random dishes against `threads.jsonl` shows faithful wording.
   - Every source line maps to a dish or is an explicit non-dish.
   - Report counts: lines, dishes, non-dishes, flagged, and the clusters merged by the judge.

## Phase 2: schema and import (production writes, dry run first)

- Prisma migration `YYYYMMDDHHMMSS_menu_library` for the `Dish` fields and the FTS index.
- `scripts/import-menu-library.cjs`:
  - Dry run by default; `--apply` writes.
  - Idempotent on `slug` and on the `DishSourceLink` unique key.
  - Upserts the catalog `Dish` rows (status `active`, visibility `internal`).
  - Links or creates the brain `Dish` entity through `dishResolver`. Junk fragments it matches are left for the existing quality cleanup.
  - Creates archive `Menu` entities with `APPEARS_ON` relations.
  - Writes one ledger event per run.
- The dry run prints a create/link/skip count for each table. The owner approves before `--apply`.
- Commit `scripts/recover-gmail-menus.cjs`, which is PII-free, as the operator tool. Add `--since` for incremental runs, and document it in AGENTS.md "Operator CLIs".

## Phase 3: search and brain index

- Add memory kinds `dish` and `menu` to `businessMemory.js`. This makes them reachable from `/api/brain/search`, MCP `brain.search` and `/api/brain/context` together.
- Add a private MCP tool `brain.dish.search` (gated by `brain:read`).
- Add a public MCP tool `menu.dishes.search` in `backend/mcp/server.js`, returning `public` dishes only.
- Hub API, following the `api-handlers/hub/resolve-dish.js` pattern (`resolveHubViewer`, then `requireHubAccess`):
  - `GET /api/hub/menu-library`: returns the whole visible catalog with facets. The response is filtered by viewer: customers see `clients`/`public`; staff and privileged see everything; provenance goes to privileged only.
  - `GET /api/hub/menu-library/dish?id=`: detail and timeline.
  - `PATCH` (privileged): edit facets, visibility and verification.
  - `POST /merge` (privileged).
  - `GET /api/hub/menu-library/menus`: archive and templates.
- In the UI, search and facets are client-side over the full list. About 700 dishes, roughly 60 KB gzipped, filters instantly.

## Phase 4: hub "Menu" tab (owner, staff, meal-prep clients)

Built from `brand-tokens.css` and `specimen.css`, following `docs/design/SPECIMEN.md`. No cards, pill badges, eyebrows or fade-ups.

- **Browse.**
  - A search field at the top.
  - A facet rail with Course, Meat or vegetable, Diet, Season, Program and Format. Facets are ruled checkbox lists with mono counts, not chips.
  - "Group by" options: course (default), protein, season or program.
  - Results are ruled ledger rows: dish name in the display face, the owner's descriptor in body text, and mono meta such as `served 22× · last Oct 2026`.
- **Dish page.**
  - Description, then facets. Facets are inline-editable for privileged users, and an `inferred` diet shows a confirm control.
  - A variation timeline: each dated wording, the menu it appeared on, and, for privileged users only, a link to the Gmail thread.
  - "Often served with", feedback, and the recipe.
- **Menus view.** The archive and templates, filterable by program, guests, price-per-guest band, season and status. Each menu opens as a menu sheet.
- **Menu sheet** (shared component, the restaurant-menu rendering):
  - A sheet ground, with course headings as real headings.
  - Dish name plus descriptor.
  - Optional mono price-per-guest line and the Local Effort mark.
  - A print stylesheet for clean PDFs to attach to proposals.
- **By role.**
  - Customers see Browse limited to `clients`/`public`, plus a "favorite" and "avoid" toggle. Avoid writes `AVOIDED_BY` through the existing constraint model, so the meal-prep broadcast check honors it.
  - Hub staff see everything except provenance and pricing.

## Phase 5: owner composer and record-as-you-go

- **Composer (privileged).**
  - Start from blank, a template or an archive menu.
  - Pick dishes per course using the same browse UI; the sheet preview is live.
  - Saves a brain `Menu` with kind `proposal` or `template`.
  - "Share" uses the existing `/portal/:token` flow, which provides client feedback and constraint checks.
- **Weekly meal prep.** `master-menu` links each resolved brain `Dish` to a catalog `Dish`. New names become `Dish` rows with status `draft` in the review queue. Each week is saved as a `meal_prep_week` menu.
- **Gmail.** An incremental `recover-gmail-menus.cjs --since` run (owner-triggered) feeds new sent menus into the Phase 1 pipeline and the review queue.

## Phase 6: public `/dishes`

- **Data.** Prerendered from a committed snapshot `src/store/data/generatedMenuLibrary.json`, built by `scripts/generate-menu-library.cjs`.
  - It contains only `public` dishes and owner-confirmed diets.
  - The generator fails if any archive client name or price appears in the output.
- **Layout.** Grouped by course, with diet and protein filters that work without JS as anchors, plus progressive enhancement. Calls to action go to `/book` and `/weekly-meals`.
- **Copy.** The intro, headings and calls to action live in Sanity, read through an allowlisted query and the snapshot.
- **Structured data.** JSON-LD `Menu` / `MenuSection` / `MenuItem` with `suitableForDiet`.
- **Same change.**
  - `src/config/routes.js`, `App.jsx`, `StaticApp.jsx`, `public/ai.txt`, `public/llms.txt`, `public/ai/manifest.json`.
  - Replace the hard-coded `RECENT_MEAL_PREP_MENUS` in `WeeklyMealsPage.jsx` with published `meal_prep_week` templates from the snapshot.
  - `pnpm check:content` must pass.

## Phase 7 (later, outline only): customer composition

- **Small parties.** The `/book` wizard gains a "Build your menu" step: pick from party-eligible public dishes per course, within the service style's course rules. The result is stored as a structured menu (`menuEntityId`) on `SmallEventEstimate`, replacing the free-text `menuNotes`/`courses`, and the owner confirms it. The deposit Brevo confirmations must then include the composed menu (AGENTS.md "Sales confirmation emails").
- **Meal-prep clients.** Weekly picks from that week's menu plus favorites and avoids feed `MealPrepChangeRequest`.

## Verification per phase

- **Phase 1:** counts and spot checks, as above.
- **Phase 2:** the dry-run diff is approved, `--apply` runs, and a re-run is a no-op.
- **Phase 3:** `brain.search` returns dish and menu hits for 5 known queries, e.g. "lamb", "torta caprese" and "baby shower". The hub API is checked under customer, staff and privileged tokens; customers get no provenance or prices.
- **Phase 4–5:** open the hub tab as each role, desktop and mobile. Compose a menu, print it to PDF, open its portal link, and check the PDF and the portal page.
- **Phase 6:** load the rendered page from the real snapshot with JS on and off, and validate the JSON-LD. Grep the snapshot for archive client names (expect none). `pnpm check:content`.

## Known limits

- Menus that exist only as images, in Drive, in non-shared Docs, or never emailed are absent until OCR or a Drive grant is approved.
- Diet tags from Phase 1 are inferences until the owner confirms them.
- Semantic ("smoky fall lamb") search is not planned. Postgres full-text search plus facets is enough at this size; revisit if needed.
