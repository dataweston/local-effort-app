# Sale System To-Do — 2025-10-12

## Blockers (Do first)
- [x] Implement `/api/revalidate` endpoint (Next app) that validates `SALE_REVALIDATE_SECRET`, accepts `sale` param, and calls `revalidateTag(\`sale:${slug}\`)`.
- [x] Update `local-office/apps/web/.env.example` with `SALE_REVALIDATE_SECRET` and `SALE_REVALIDATE_URL` guidance; document usage in `docs/sale-system-architecture.md` follow-up section.
- [ ] Smoke-test `api/square/webhook.ts` against new revalidate endpoint (Square sandbox event → Supabase insert + ISR trigger log).

## Tier A — Square + Sale Rendering
- [ ] Build `scripts/square-create-links.ts` CLI: fetch products via Sanity, create Square checkout links, patch products with `squareCheckoutLinkUrl`/`squareCheckoutLinkId`.
- [ ] Ensure Square checkout metadata supplies `saleSlug`, `productId`, and `qty`; add helpers reused by webhook + CLI.
- [ ] Add JSON logging & dry-run flag to the CLI for safety before production writes.

## Tier A — Sanity & Studio
- [ ] Finalize `sale`, `product`, `saleProduct` schema updates in Sanity studio (refs, theme tokens, pickup window object).
- [ ] Ship “Create Sale” initial-value template plus Square catalog panel that patches products with checkout links.
- [ ] Configure Sanity webhook → `/api/revalidate` with tag `sale:${slug}` and document setup in Studio README.

## Tier A — Tracker & Supabase
- [ ] Define RLS policies / security definer for `sales.order_totals` so reads work with anon key; migrate `SaleTrackerClient` to use public Supabase client.
- [ ] Add retry/backoff + stale data messaging in `SaleTrackerClient` for poor connections.

## Tier B — Inline Checkout
- [ ] Implement `/api/square/create-checkout` endpoint for Web Payments SDK (validate payload, create Square order/payment, return confirmation).
- [ ] Build `SaleInlineCheckout` modal using Square Web Payments SDK with feature flag for rollout.

## QA, Testing, and Ops
- [ ] Add Vitest integration test covering `SaleRenderer` (renders products, tracker fallback, structured data snippet).
- [ ] Add webhook sandbox test (mock Square payload -> ensure Supabase insert + ISR call recorded).
- [ ] Update `docs/sale-system-architecture.md` with latest pipeline diagrams and testing instructions.
- [ ] Provide runbook entry in `docs/support/` for “Square sale goes live” (env vars, CLI usage, verification steps).
