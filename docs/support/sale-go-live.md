# Sale Go-Live Runbook (Tier A)

Last updated: 2025-10-13

## Prereqs
- Supabase project with `supabase/sales-orders.sql` applied (creates `sales.orders` and `sales.order_totals`).
- Square sandbox or production access token.
- Sanity project with `sale`, `product`, `saleProduct` schemas deployed.
- Next app deployed (or running locally) exposing `/api/revalidate`.

## Required env
- Supabase (server): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Supabase (client, optional): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Revalidate: `SALE_REVALIDATE_URL`, `SALE_REVALIDATE_SECRET`
- Sanity: `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_TOKEN` (write)
- Square: `SQUARE_ACCESS_TOKEN`, `SQUARE_ENV` (sandbox|production)

## Local dev (Windows bash)
- Start Next app (keep running):
  - cd local-office/apps/web
  - export SALE_REVALIDATE_SECRET=devsecret
  - npm run dev:local   # binds to 127.0.0.1:3030
- Ping revalidate (in another terminal):
  - curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/revalidate?sale=test-sale&secret=devsecret -X POST

## Webhook smoke test
- Set env in the repo root (same shell):
  - export SUPABASE_URL="https://<project>.supabase.co"
  - export SUPABASE_SERVICE_ROLE_KEY="<service-role>"
  - export SALE_REVALIDATE_URL="http://localhost:3000/api/revalidate"
  - export SALE_REVALIDATE_SECRET="devsecret"
- Run extract-only (no secrets needed):
  - npm run sale:smoke:extract
- Run full insert + ISR:
  - npm run sale:smoke:webhook -- --with-revalidate-server --revalidate-port=3031 test-sale

Expected: CLI logs a sale order insert (or duplicate skipped) and revalidate returns 200 in Next logs.

## Generate checkout links (Tier A)
- Dry run (no writes to Square, reads Sanity):
  - npm run sale:links:dry -- --sale <slug>
- Apply (creates links + patches Sanity):
  - export SANITY_TOKEN="<write_token>"
  - export SQUARE_ACCESS_TOKEN="<square>"
  - export SQUARE_ENV="sandbox"
  - npm run sale:links -- --sale <slug>

## Sanity → ISR webhook (deploy target)
- URL: `${SALE_REVALIDATE_URL}?sale={slug.current}&secret=${SALE_REVALIDATE_SECRET}`
- Trigger on: `sale` and referenced `product` / `saleProduct` changes.
- Method: POST. No payload required; query params supported.

## Rollback
- Remove or unset `squareCheckoutLinkUrl` on products to disable direct links.
- Disable webhook in Square dashboard temporarily to stop Supabase writes.

## Troubleshooting
- 401 from /api/revalidate → secret mismatch. Confirm secret in both app and caller.
- No tracker counts → ensure Supabase row inserted and RLS permits reads (or use service proxy endpoint).
- Supabase API PGRST106 → Dashboard → Settings → API → Exposed schemas → add "sales".
- Supabase permission denied on view/orders → run SQL patch `supabase/patch-2025-10-13-sales-grants.sql` to grant service_role rights.
- Links not created → check Square token, env, and that `squareVariationId/ItemId` exist on products.
