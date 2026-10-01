# Unified storefront commerce specification

**Status:** implementation-ready proposal  
**Prepared:** 2026-09-30  
**Scope:** Sanity products, `/sale`, `/pizza-on-smith`, the product/pricing kernel, Finance Core order lines, and product-level sales reporting

## Agent execution contract

Implement this as a staged migration, not a flag-day rewrite. Preserve the existing
Pizza on Smith visual design and checkout behavior while replacing its product data
source. Do not edit unrelated Local Office, Brain, Planner, or finance workflows.

The owner requirements captured by this specification are:

1. Storefront products, including Pizza on Smith products, are managed in Sanity.
2. The product/pricing kernel is the commercial umbrella for every sellable item.
3. `/sale` and `/pizza-on-smith` use the same catalog, pricing, checkout, and order-line path.
4. Checkout never trusts browser prices and never charges when catalog identity or pricing is unresolved.
5. Finance Core retains immutable evidence of exactly which product, offer, catalog revision, and price-book version was sold.

Production Sanity mutations, webhook configuration, database migrations, backfills,
and catalog cutover require explicit owner authorization. Build dry-run tooling and
verify it locally first; do not apply it to production as part of an unapproved code
change.

## Outcome

An operator publishes a product in Sanity once. That publication becomes a validated,
versioned commercial offer in the kernel. Both storefronts read the same composed
catalog, both pricing and checkout use the same server-side calculator, and a paid
order can be reported by product and offer without parsing display titles or guessing
from processor IDs.

```text
Sanity product document (operator authoring + merchandising)
                         |
                         v
        validated catalog reconciliation/publication
                         |
                         v
CommercialProduct + CommercialOffer + versioned PriceBook rules
                         |
               +---------+---------+
               |                   |
               v                   v
     composed storefront       server pricing
     /sale and /pizza          and checkout
               |                   |
               +---------+---------+
                         v
 CommercialOrderLine -> product, offer, catalog revision, price book
                         |
                         v
             /api/sales product reporting
```

## Current state to build on

The repo already contains useful foundations. Do not recreate them:

- `CommercialProduct`, `CommercialOffer`, `PriceBook`, and `PriceRule` exist in
  `prisma/schema.prisma`.
- `CommercialOrder` and `CommercialOrderLine` already capture all general-store
  checkout transactions before Square is called.
- `backend/api/pricing/commercialCatalogBridge.js` currently maps store items into
  broad `pizza` and `retail` families.
- `backend/api/pricing/priceBookManifest.js` currently seeds the `pizza`, `retail`,
  `small_event`, and `meal_prep` families and broad offers.
- `/sale` is authored in Sanity, has a generated build snapshot, and refreshes through
  `GET /api/store/products?store=sale`.
- `/pizza-on-smith` still reads products from
  `src/store/data/pizzaOnSmith.json`; its product images are local files under
  `public/images/pizza-on-smith`.
- `POST /api/store/price` and `POST /api/store/checkout` independently recompute prices
  from Sanity or the local Pizza JSON. They do not yet use a published kernel price
  rule as their common authority.
- Store checkout writes `productKey` and `offerKey` into line metadata, but
  `CommercialOrderLine` has no foreign keys to `CommercialProduct`,
  `CommercialOffer`, or `PriceBook`.

The current broad offers (`pizza_on_smith_pickup` and `retail_storefront`) are valid
channel defaults, but they are too coarse to identify individual sellable items.
Retain them only as migration fallbacks. Every migrated Sanity product must receive a
durable item-level offer key.

## Authority boundaries

| Concern | Authority | Notes |
| --- | --- | --- |
| Product title, descriptions, images, tags, storefront placement | Sanity `product` | Sanity remains the operator-facing management surface. |
| Stable product family and sellable-offer identity | Product/pricing kernel | Sanity stores the mapping keys; the database enforces unique identities. |
| Operator-entered base, sale, variant, and add-on prices | Sanity authoring | Prices are not executable until reconciled into a published `PriceBook` version. |
| Executable checkout price | Published kernel price rules | `/price` and `/checkout` must call the same calculator. |
| Manual or Square stock quantity | Existing Sanity/Square inventory path | Do not pretend `InventoryResource` is SKU stock; it currently models reservable capacity. |
| Store/pickup rules and business line | Store configuration and `businessLineForStore()` | Derive business line from the checkout channel, not from product family. |
| Payment execution | Square | Square identifiers are provider mappings, not product identity. |
| Sale and payment evidence | Finance Core | Order lines retain immutable snapshots and relational catalog references. |
| Product imagery delivery | Sanity CDN | Decorative page imagery may remain local; commerce-card images move with the products. |

The key distinction is that Sanity is the place where an operator manages a product,
while the kernel is the record of what was valid and executable at a point in time.
There must not be two independently editable live price sources.

## Catalog identity model

Use the existing models with the following semantics:

- `CommercialProduct` is a durable product family or customer-recognizable concept,
  such as `pizza`, `retail`, `meal_prep`, or `small_event`.
- `CommercialOffer` is a concrete sellable configuration. For storefront products,
  each active Sanity product document maps to one item-level offer. Variants and
  add-ons remain option rules beneath that offer.
- `PriceBook` is a complete, immutable version of executable pricing policy.
- `CommercialOrderLine` is the immutable sale snapshot and must reference the exact
  product, offer, and price book used.

### Sanity product fields

Add a `Commerce identity` field group in `studio/schemaTypes/product.js`:

| Field | Type | Rule |
| --- | --- | --- |
| `commercialProductKey` | string | Required when `active` and assigned to a store. Initially allow `pizza` and `retail`. |
| `commercialOfferKey` | string | Required when `active` and assigned to a store; lowercase stable key matching `^[a-z0-9][a-z0-9._-]*$`. |

Also add `pizza-on-smith` to the `stores` choices.

The Studio description must say that `commercialOfferKey` is immutable after the
first sale. Studio validation can enforce shape and presence; the reconciliation
service must enforce uniqueness across documents and correct product-family mapping.

Do not add an independently editable `businessLineKey` to Sanity. A product may be
shown in multiple stores, and the business line belongs to the transaction channel.
Use `businessLineForStore(store)` at checkout. In particular, olive oil sold through
Pizza on Smith may belong to the `retail` product family while the resulting order
still belongs to the `pizza` business line.

### Offer composition snapshot

On reconciliation, store a normalized, non-price snapshot in
`CommercialOffer.composition`:

```json
{
  "schemaVersion": 1,
  "source": {
    "system": "sanity",
    "id": "<sanity _id>",
    "revision": "<sanity _rev>"
  },
  "stores": ["sale"],
  "fulfillment": {
    "allowsDelivery": true,
    "requiresDateSelection": false
  },
  "processor": {
    "squareItemId": null,
    "squareVariationId": null
  },
  "variants": [],
  "addOns": [],
  "dairyFree": null
}
```

Include stable Sanity array `_key` values for variants and add-ons in all queries and
client payloads. Array indexes may be accepted during a compatibility window, but the
new canonical cart shape uses `variantKey` and `addOnKeys`. Reordering Sanity fields
must never change what an existing cart means.

Names, source revision, stores, and processor mappings may be repeated in offer
metadata/composition as an operational snapshot. Monetary amounts belong in price
rules, not in the offer composition.

### Storefront price rules

Add a `store_item` calculator namespace to the existing price book. Use deterministic
keys:

```text
storefront.<offerKey>.base
storefront.<offerKey>.variant.<variantKey>
storefront.<offerKey>.addon.<addOnKey>
storefront.<offerKey>.addon.dairy_free
```

- Base and variant rules use `unit_amount`.
- Add-ons use `fixed_amount`.
- `amountCents` is the currently executable amount (`salePrice` when present,
  otherwise `price`).
- Preserve list price, sale price, Sanity document ID, source revision, and stores in
  `PriceRule.parameters` for audit and storefront display.
- `priceDisplay` is presentation only and never replaces a numeric executable amount.
- Reject active products with missing/non-integer/negative executable amounts.
- Preserve all non-storefront rules when publishing a new price-book version.

Changing a price creates a new complete `PriceBook` version. Never mutate a published
rule referenced by a quote or order. If the normalized catalog/pricing digest is
unchanged, reconciliation must be idempotent and must not create another version.

## Publication and reconciliation

Create one service, suggested location
`backend/api/pricing/storefrontCatalogSync.js`, used by both a CLI and a protected
webhook route.

### Reconciliation algorithm

1. Fetch all active Sanity products assigned to commerce stores using a fresh,
   non-CDN Sanity client. Include `_id`, `_rev`, all commerce identity fields, prices,
   option `_key` values, inventory mode, fulfillment flags, images, and Square IDs.
2. Normalize and validate the complete set before writing anything:
   - unique `commercialOfferKey`;
   - referenced `CommercialProduct.key` exists;
   - all active products have executable prices;
   - variants/add-ons have stable keys and valid integer cent amounts;
   - store slugs are recognized;
   - no document silently falls back to a broad generic offer.
3. Produce a deterministic digest from normalized commercial identity and pricing.
4. In one database transaction:
   - upsert item-level `CommercialOffer` records by key;
   - update names, status, composition, and source metadata;
   - mark previously synced offers absent from the active set as inactive, never delete
     them;
   - if the digest changed, clone the latest published price book, replace only its
     `store_item` rules, validate the full rule set, publish version `N + 1`, and mark
     the prior version superseded/expired;
   - record the digest and source revision set in `PriceBook.metadata`.
5. Return a summary containing created, updated, inactivated, unchanged, rejected,
   and new price-book version counts. Never return secrets or full customer data.

Do not trust product or price fields from the webhook request body. After authenticating
the request, fetch canonical documents from Sanity and run a full reconciliation. A
full-set reconcile avoids partial price books and handles deletes/deactivations.

### Entry points

Implement both:

- `node scripts/sync-sanity-commerce.cjs` — dry run by default; `--apply` performs the
  transaction; `--json` emits a machine-readable summary.
- `POST /api/internal/catalog/sanity-sync` — protected by a dedicated
  `SANITY_COMMERCE_WEBHOOK_SECRET`, compared timing-safely, and rate limited.

The CLI and route must call the same service. Configure the Sanity webhook only after
the dry run, migration, and read-back checks are approved. Document required variables
without committing values.

## Shared runtime catalog and pricing

Create one internal service, suggested location
`backend/api/pricing/storefrontCatalogService.js`. It owns:

- joining Sanity merchandising data to published offers;
- reading the latest effective published price book;
- producing a normalized product response;
- resolving stable option keys;
- pricing a cart; and
- returning the exact relational references and snapshots needed by Finance Core.

Suggested interface:

```js
getStorefrontCatalog({store, productIds})
priceStorefrontCart({store, items, fulfillment, expectedPriceBookVersion})
```

`priceStorefrontCart` returns lines with at least:

```js
{
  sanityProductId,
  catalogRevision,
  commercialProductId,
  commercialProductKey,
  commercialOfferId,
  commercialOfferKey,
  priceBookId,
  priceBookKey,
  priceBookVersion,
  pricingRuleKeys,
  title,
  quantity,
  unitPriceCents,
  totalCents,
  optionSummary,
  squareItemId,
  squareVariationId
}
```

Refactor these handlers to call the service rather than maintain separate pricing
implementations:

- `api-handlers/store/products.js`
- `api-handlers/store/price.js`
- `api-handlers/store/checkout.js`

The price response must include `priceBookKey`, `priceBookVersion`, and a compact
`pricingVersion` token. Update `CartDrawer.jsx` and `CheckoutPanel.jsx` to submit that
token to checkout. Roll out in two compatible steps: first return and submit the token;
then require it. If the version changes before checkout, return HTTP 409 with a clear
"prices changed; review your bag" response before creating an order or calling Square.

Failure behavior is fail-closed:

- no mapped/published offer: 409 `catalog-product-unpublished`;
- invalid or missing option key: 422 `catalog-option-invalid`;
- stale pricing token: 409 `catalog-price-changed`;
- kernel unavailable: 503 `catalog-pricing-unavailable`;
- manual inventory authority unavailable: retain the existing no-charge inventory
  failure behavior.

Generated JSON is an SEO and temporary display fallback only. It must never authorize
a payment. Server pricing and checkout require a published kernel version.

## Finance Core lineage

Add nullable relational fields to `CommercialOrderLine` so existing rows remain valid:

```text
commercialProductId -> CommercialProduct.id
commercialOfferId   -> CommercialOffer.id
priceBookId          -> PriceBook.id
catalogRevision      string, normally the Sanity _rev
```

Add reverse relations and indexes for product, offer, and price book. Keep the existing
snapshot fields (`sku`, `name`, `quantity`, `unitPriceCents`, `totalCents`) and
`sourceSystem`/`sourceId`.

For new Sanity-managed storefront sales:

- `sourceSystem` is `sanity` for both `/sale` and `/pizza-on-smith`;
- `sourceId` is always the Sanity document `_id`, not a variation ID;
- `sku` is the stable commercial offer key unless an explicit durable SKU is later
  added;
- selected variant/add-on keys and Square mappings live in metadata;
- `businessLineKey` continues to come from the order/store channel.

Update `backend/api/finance/commercialOrders.js` so normalized line input can carry the
new IDs and revision into the nested create. The storefront pricing service resolves
the IDs; the pre-charge transaction persists them. Unknown IDs or mismatched keys are
validation failures before the pending order/payment attempt is created.

Provide a dry-run backfill script for historical lines whose metadata already contains
`productKey`/`offerKey`. Only fill unambiguous matches. Report ambiguous and unmapped
lines; never assign a guessed item-level offer. Do not run the backfill without owner
approval.

## Pizza on Smith migration

Add Pizza on Smith to the shared Sanity/generator/runtime path without changing its
visual treatment.

### Content import

Create an idempotent, dry-run-first import script for the five records currently in
`src/store/data/pizzaOnSmith.json`:

| Legacy ID | Product family | Suggested offer key |
| --- | --- | --- |
| `smith-cheese-3` | `pizza` | `pizza_on_smith.cheese.3_pack` |
| `smith-cheese-6` | `pizza` | `pizza_on_smith.cheese.6_pack` |
| `smith-kids-3` | `pizza` | `pizza_on_smith.kids_cheese.3_pack` |
| `smith-brussels` | `pizza` | `pizza_on_smith.brussels.single` |
| `smith-olive-oil` | `retail` | `pizza_on_smith.olive_oil.1_liter` |

Each imported document must preserve title and cent price, use
`stores: ['pizza-on-smith']`, set `allowsDelivery: false`, and remain active. Upload
the existing product-card images as Sanity assets and reuse one uploaded cheese asset
for the three cheese offers. Do not invent an olive-oil image. Record the original ID
in migration metadata if the Sanity `_id` differs.

After import, commerce-card image URLs should be `cdn.sanity.io` URLs. Local decorative
or hero imagery may remain under `public/images/pizza-on-smith`. Do not delete local
assets in the cutover PR; they are the rollback source.

### Page and fallback data

- Extend `scripts/generate-sale-page-data.js` (or rename/generalize it in a separate,
  mechanical commit) to emit
  `src/store/data/generatedPizzaOnSmithPageData.json` from Sanity.
- Refactor `PizzaOnSmithPage.jsx` to initialize from that generated snapshot and refresh
  from `/api/store/products?store=pizza-on-smith`, matching the `/sale` pattern.
- Keep pickup address/day and page-specific editorial copy in a small store config;
  those are not products and do not need to move into Sanity in this project.
- Reduce `api-handlers/store/_pizzaOnSmith.js` to validation/configuration. It must no
  longer be a second product catalog.
- After the production read-back and rollback window, remove the product array from
  `pizzaOnSmith.json` or replace the file with clearly named non-product configuration.

Do not change `src/config/routes.js`, sitemap/agent surfaces, or route wiring: the
public route already exists.

## Sale page migration

Backfill stable item-level offer keys and a product family for all active Sanity
products assigned to `sale`. Default existing general-store documents to `retail`, but
emit a dry-run list for owner review before writing. Do not collapse them into the
generic `retail_storefront` offer after the cutover.

Keep the existing `salePage` singleton for page copy. Product presentation remains in
Sanity, generated snapshot behavior remains, and the public response shape should stay
backward compatible while adding commercial identity and pricing-version fields.

## Product-level sales value

Once new lines have relational lineage, add an admin-protected read-only endpoint:

```text
GET /api/sales/products?days=365
```

Return paid-order metrics grouped by product and offer:

- `commercialProductKey` and name;
- `commercialOfferKey` and name;
- `businessLineKey` and channel;
- order count, units, gross paid cents, first sale, and latest sale;
- unmapped paid-line count and cents as a visible coverage warning.

Use `CommercialOrder.status = 'paid'`, matching the existing reorder reporting. Do not
infer contribution margin here; preserve the documented Local Budget join boundary.

## Rollout sequence and gates

### Stage 1 — identity and schema, no behavior change

1. Add Sanity commerce fields and Pizza store choice.
2. Add nullable order-line foreign keys and migration.
3. Extend the existing bridge to prefer explicit item-level keys and derive business
   line from store.
4. Add tests. Keep broad fallbacks temporarily.

**Gate:** existing Sale and Pizza pricing/checkout tests pass; Prisma validates; Studio
builds; no storefront output changes.

### Stage 2 — reconcile Sanity into the kernel

1. Implement normalization, validation, digesting, and transactional publication.
2. Add the dry-run CLI and unit/integration tests.
3. Add the protected webhook route, but do not configure the external webhook yet.

**Gate:** repeated identical dry runs are stable; an applied test-database sync creates
one version; a price change creates exactly one additional complete version; invalid
input writes nothing.

### Stage 3 — one pricing path

1. Implement the shared runtime service.
2. Make `/products`, `/price`, and `/checkout` consume it.
3. Add pricing-version token support to the cart and checkout.
4. Persist order-line foreign keys and snapshots.

**Gate:** the amount returned by `/price`, persisted on the order line, and sent to
Square is identical in tests; stale tokens and catalog failures create no payment
attempt and make no Square call.

### Stage 4 — content migration and storefront cutover

1. Dry-run and review the Sale identity backfill and Pizza import.
2. With owner approval, import Sanity documents/assets and reconcile the catalog.
3. Read back every product, image, cent price, store assignment, and offer mapping.
4. Cut Pizza on Smith to the generated/live shared catalog path.
5. Configure the authenticated webhook only after the tested path is live.

**Gate:** both pages render products without JavaScript from generated data, refresh
from Sanity at runtime, price through the kernel, and complete a sandbox/test checkout.

### Stage 5 — reporting and cleanup

1. Add `/api/sales/products` with coverage warnings.
2. Dry-run any historical lineage backfill and request approval before applying.
3. Remove generic-offer fallback for active mapped storefront items.
4. Remove the Pizza product JSON only after the rollback window.

**Gate:** new paid test orders appear under the correct item-level offer and store
business line; unmapped coverage is explicit rather than silently categorized.

## Required tests

At minimum, add focused coverage for:

1. Sanity normalization in cents, including sale price, variants, add-ons, and dairy-free.
2. Duplicate offer key, missing family, missing price, unknown store, and unstable option
   key rejection.
3. Idempotent reconciliation and price-book version creation on actual price changes.
4. Preservation of meal-prep and small-event rules when storefront rules are replaced.
5. Product deactivation marks an offer inactive without deleting historical relations.
6. `/sale` and `/pizza-on-smith` catalog responses contain item-level product/offer
   keys and the published price version.
7. Price and checkout use one calculator and agree on every line and total.
8. Reordered Sanity add-ons retain cart meaning through stable keys.
9. Stale price token returns 409 before order creation or Square invocation.
10. Pizza olive oil maps to the `retail` product family while its Pizza storefront
    order maps to the `pizza` business line.
11. New order lines persist product, offer, price book, Sanity ID, and revision.
12. Sanity outage behavior: generated display fallback may render, but payment cannot
    bypass kernel pricing or inventory safety.
13. Product reporting includes mapped paid lines and explicit unmapped coverage.

Run the narrowest applicable checks during each stage. Before final cutover, run:

```text
pnpm exec prisma validate
pnpm test -- --run backend/api/pricing
pnpm lint
pnpm build
```

Add targeted handler tests for the store price/checkout failure cases rather than
depending only on a full build.

## Definition of done

This project is complete only when all of the following are true:

- No active Pizza on Smith product is manually authored in repository JSON.
- All active Sale and Pizza products have explicit, unique commercial identities.
- Sanity is the only operator-facing editor for those products and their authored
  prices.
- A published kernel price-book version is the only executable storefront price source.
- `/sale` and `/pizza-on-smith` share the catalog and pricing services.
- Checkout rejects unmapped, invalid, or repriced carts before recording a pending
  payment or calling Square.
- Every new item order line has relational product, offer, and price-book lineage plus
  immutable source/revision snapshots.
- Product-level sales reporting works and exposes unmapped coverage.
- Generated storefront data remains usable for no-JavaScript/SEO rendering.
- Product images on Pizza commerce cards are served by Sanity CDN; decorative page
  assets may remain local.
- Existing Pizza page aesthetics, pickup rules, Sale page copy, and unrelated commerce
  channels are unchanged.

## Explicit non-goals

- Replacing Square as payment processor.
- Moving pickup location/editorial page copy into Sanity.
- Treating `InventoryResource` as retail SKU inventory without a separate inventory
  design.
- Reworking meal-prep or small-event calculators beyond preserving their rules.
- Reclassifying historical order lines by guesswork.
- Redesigning `/sale` or `/pizza-on-smith`.
- Moving Local Budget margin logic into this repo.

