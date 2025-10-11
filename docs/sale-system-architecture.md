# Sale Page System Architecture

_Last updated: 2025-10-11_

## Goals

- Serve any sale at `/[saleSlug]` with static-ready content (ISR, 60s) backed by Sanity (+ revalidation tag `sale:${slug}`).
- Unify existing "Sale" and "Paikka" presales into a themable renderer.
- Lean on Square checkout links (Tier A) first; pave path for inline Web Payments (Tier B).
- Persist order counters in Supabase for live tracker components.

## 1. Data Model (Sanity)

### Documents

| Type | Purpose | Key fields |
| --- | --- | --- |
| `sale` | Represents a sale/presale, drives `/[slug]` | `title`, `slug`, `layoutVariant` (`"standard" | "paikka"`), `hero`, `tagline`, `pickupWindow` (start/end/timezone/info), `location` (address/notes), `theme` (color tokens, typography, button style), `products` (array of `saleProduct`), `tracking` (Meta Pixel, UTM source, GTM/GTAG), `email` (Brevo template, sender), `stats` (`soldCount` cache), `square` (locationId, `checkoutMode`, webhook tag), SEO/meta fields |
| `product` | Catalog managed in Sanity, synced with Square | existing fields + `squareCheckoutLinkUrl`, `inventoryMode` (`"square" | "manual"`), `manualQty`, `priceDisplay`, `lastSyncedAt`, `squareItemId`, `squareVariationId` |

### Objects

| Type | Fields |
| --- | --- |
| `saleProduct` | `product` (ref), `order` (number), `limitPerCustomer`, `hide`, `badge`, `priceOverride`, `notes` |
| `pickupWindow` | `timezone`, `start`, `end`, `instructions`, `addressLines[]` |
| `theme` | `accentHex`, `backgroundHex`, `textHex`, `cardVariant`, `buttonVariant`, optional `asset` overrides |
| `seoMeta` | `title`, `description`, `ogImage` |

### Studio UX

- Initial-value template "Create Sale" prompts for slug, layout, pickup window basics, theme preset (Standard/Paikka), optional Meta Pixel + Brevo template.
- Custom panel: "Add products from Square Catalog" (serverless function fetches Square items, convert to `saleProduct` entries, writes checkout link URLs when available).

## 2. Rendering Flow (Next.js)

Target app: `local-office/apps/web` (Next 14). Create `/app/(sales)/[sale]/page.tsx` (or under `src/pages/[sale].tsx` if migrating to pages router). Implementation uses RSC + `revalidateTag`.

```tsx
export const revalidate = 60;
export async function generateStaticParams() {
  const slugs = await groqFetch(`*[_type == "sale" && defined(slug.current)].slug.current`);
  return slugs.map((slug) => ({ sale: slug }));
}

export async function generateMetadata({ params }) {
  const sale = await fetchSale(params.sale, { select: 'meta' });
  return buildSaleMetadata(sale);
}

export default async function SalePage({ params }) {
  const sale = await fetchSale(params.sale);
  if (!sale) notFound();
  return <SaleRenderer sale={sale} />;
}
```

- `fetchSale` wraps Sanity GROQ:
  ```groq
  *[_type == "sale" && slug.current == $slug][0]{
    title,
    layoutVariant,
    pickupWindow {...},
    theme {...},
    tracking {...},
    email {...},
    square {...},
    products[]{
      _key,
      badge,
      hide,
      limitPerCustomer,
      priceOverride,
      product->{
        _id,
        title,
        slug,
        shortDescription,
        images[]{asset->{url}},
        price,
        salePrice,
        priceDisplay,
        squareItemId,
        squareVariationId,
        squareCheckoutLinkUrl,
        inventoryMode,
        manualQty,
      }
    }
  }
  ```

- Data normaliser converts dollars to cents, hydrates `squareCheckoutLinkUrl` precedence (priceOverride > salePrice > price), filters hidden products, sorts by `order`.
- Tag ISR responses: `revalidateTag(`sale:${slug}`)` for use by webhook & Sanity webhooks.

## 3. Component System (`src/components/sale/*`)

```
SaleRenderer.tsx (decision engine)
SaleLayout.tsx (wrapper applying theme)
SaleHero.tsx
SalePickupBlock.tsx
SaleProductGrid.tsx
SaleProductCard.tsx
SaleCheckoutButton.tsx
SaleTracker.tsx (Supabase SWR hook)
SaleFaq.tsx
SaleMetaPixel.tsx
```

- `SaleRenderer` takes `{ sale }` and chooses `StandardLayout` or `PaikkaLayout`. Layouts extend theme tokens (e.g., Standard = light background, Paikka = dark gradient).
- `SaleCheckoutButton` logic:
  - If `squareCheckoutLinkUrl` → render `<LinkButton href>` (Tier A).
  - Else if `sale.square.checkoutMode === 'inline'` → render inline flow (Tier B; toggled feature flag).
  - Else fallback disabled "Coming soon".
- `SaleTracker` executes Supabase query `SELECT COALESCE(SUM(qty),0) AS sold FROM sales.orders WHERE sale_slug=$1`. Uses anon key on client, caches via SWR and revalidates on focus. Show skeleton while loading.

## 4. Square Integrations

### CLI Script (`scripts/square-create-links.ts`)

- Inputs: `--sale <slug>` or `--products productSlug:ITEM_ID/VAR_ID`.
- Flow:
  1. Fetch targeted products from Sanity.
  2. Ensure each has `squareItemId`/`squareVariationId`.
  3. Call Square Catalog API to confirm existence.
  4. Create checkout link via `POST /v2/online-checkout/payment-links` (metadata includes `{ saleSlug, productId }`).
  5. Patch Sanity product with `squareCheckoutLinkUrl` & `squareCheckoutLinkId`.
  6. Output summary table.

### Webhook (`api/square/webhook.ts`)

- Replace existing handler with:
  - Raw body capture (no body parser).
  - Signature verification with `SQUARE_WEBHOOK_SIGNATURE_KEY` & `SQUARE_WEBHOOK_NOTIFICATION_URL`.
  - Handle `payment.created` / `payment.updated` where status `COMPLETED`.
  - Compute `qty`, `amount`, `saleSlug` from payment metadata (e.g., `payment.note` or `order.metadata.saleSlug`).
  - Upsert Supabase `orders` table (service key via env). Table schema:
    ```sql
    create table if not exists public.orders (
      id uuid primary key default gen_random_uuid(),
      square_payment_id text unique not null,
      sale_slug text not null,
      product_id text,
      qty int not null,
      amount_cents int not null,
      customer_email text,
      received_at timestamptz default now()
    );
    ```
  - Update cached `stats.soldCount` in Sanity (via mutation) as optional step.
  - Fire `await revalidateSale(saleSlug)` which `fetch`es `/api/revalidate?sale=${saleSlug}` with secret token.

### Inline Checkout (Tier B)

- API route `api/square/create-checkout.ts`
  - Validates payload `{ saleSlug, productId, qty, buyerEmail, squareToken }`.
  - Looks up sale & product to ensure inline checkout is allowed.
  - Creates Square order & payment via Payments API.
  - Returns success payload with redirect URL or confirmation data.
- Frontend `SaleCheckoutButton` toggles a headless modal containing Square Web Payments SDK card component. Feature flagged per sale.

## 5. Revalidation & Cache Invalidation

- `/api/revalidate` accepts `?sale=<slug>&secret=<token>`.
  ```ts
  const tag = `sale:${slug}`;
  revalidateTag(tag);
  ```
- Sanity webhook config triggers this endpoint on `sale` or related `saleProduct` changes.
- Square webhook triggers revalidate after Supabase upsert.

## 6. Analytics & Meta

- `generateMetadata` builds `<title>`, `<meta name="description">`, OG + Twitter tags using `sale.meta` fallback to defaults.
- If `sale.tracking.metaPixelId` present, inject `<Script id="fb-pixel">`.
- Add JSON-LD `ProfessionalService` + `Sale` schema, referencing sale title, window, products.

## 7. Deployment & Routing

- Preferred: Deploy Next app (`local-office/apps/web`) on Vercel; add rewrite in Vite app (`vercel.json` or Express proxy) to forward `/[sale]` to Next.
- Optional: Generate microfrontend per sale (`apps/sale-${slug}`) with rewrite fallback—documented but out of scope until needed.

## 8. Workstream Checklist

1. **Schemas & Studio**: add `sale`, `saleProduct`, field upgrades, initial-value template, panel.
2. **Next Route**: scaffold `[sale]`, GROQ fetch, renderer, components, metadata.
3. **UI Extraction**: port shared elements from current sale/Paikka pages → new component library.
4. **Supabase Migration**: add `orders` table + RLS policy, service key env wiring.
5. **Square Integrations**: CLI script, webhook rewrite, optional inline checkout route.
6. **Sanity Webhooks & ISR**: configure revalidate endpoint + tags.
7. **Analytics & SEO**: ensure meta, pixel, JSON-LD coverage.
8. **Docs & Tests**: update README, add E2E or integration tests (Vitest or Playwright) for sale rendering.

## 9. Assumptions

- Next.js deployment is available (existing `local-office/apps/web`). If SPA must remain Vite-only, fallback is to build the route under Vite with SSR via `@local-office` adapter + express—documented separately.
- Square metadata on checkout links includes `saleSlug` and optionally `productId` for webhook mapping.
- Supabase anon key accessible client-side for read-only tracker queries; service role key reserved for webhooks/scripts.

## 10. Open Questions / Follow-ups

- Confirm canonical environment variables (`SANITY_*`, `SQUARE_*`, `SUPABASE_*`) across Vite + Next + serverless functions.
- Decide on OG image generation strategy (static asset vs. dynamic edge function).
- Determine QA approach for webhook (Square sandbox events + Supabase local). Add mocks under `tests/square-webhook.test.ts`.
- Inline checkout timeline: implement after Tier A launch unless stakeholders prioritize cart experience.
