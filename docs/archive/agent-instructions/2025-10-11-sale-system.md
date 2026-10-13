# Sale System Progress — 2025-10-11

## Completed (Oct 11, 2025)
- Applied Supabase migration `supabase/sales-orders.sql` to project `qupwpcsbaidpykghqzxt`, creating `sales.orders`, indexes, RLS policies, and the `sales.order_totals` view.
- Updated Next.js tracker pipeline:
  - `local-office/apps/web/app/api/sales/[sale]/tracker/route.ts` now reads from `order_totals`.
  - Supabase client defaults to the `sales` schema; `.env.example` documents required keys.
- Rebuilt Square webhook (`api/square/webhook.ts`) to:
  - Verify signatures and persist payments into Supabase (deduping on `square_payment_id`).
  - Trigger optional ISR via `SALE_REVALIDATE_URL` / `SALE_REVALIDATE_SECRET`.
  - Continue updating legacy Firestore via `applyCompletedPayment`.
- Documented changes in `docs/sale-system-architecture.md`; workspace root now depends on `@supabase/supabase-js`.

## Outstanding Goals
1. **Square Integrations**
   - Finish CLI `scripts/square-create-links.ts` for checkout link generation.
   - Implement inline checkout API + Web Payments SDK UI.
   - Ensure Square metadata consistently supplies `saleSlug`, `productId`, and `qty`.
2. **Sanity & Studio Enhancements**
   - Build Square catalog panel and finalize schema wiring for sale documents.
   - Configure Sanity webhooks to hit `/api/revalidate` with `sale:${slug}` tags once the endpoint exists.
3. **Client Tracker Improvements**
   - Define RLS policies for anon reads and migrate `SaleTrackerClient` to use the public Supabase key instead of the service-role proxy.
4. **Revalidation Endpoint**
   - Implement `/api/revalidate` honoring `SALE_REVALIDATE_SECRET`; verify deploy configs set `SALE_REVALIDATE_URL`.
5. **Testing & Monitoring**
   - Exercise Square webhook in sandbox to confirm Supabase writes and ISR triggers.
   - Add integration tests (Vitest/Playwright) for sale rendering and tracker counts.
   - Consider logging/alerting on webhook failures.
6. **Docs & Ops**
   - Update deployment checklists with Supabase env var requirements and SQL migration notes for new environments.

## Key Env Vars
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `NEXT_PUBLIC_SUPABASE_*`.
- `SALE_REVALIDATE_URL`, `SALE_REVALIDATE_SECRET` (optional).
- Existing Sanity/Square secrets remain unchanged.

## Quick Verification Steps
1. Trigger Square sandbox payment with sale metadata → confirm row in `sales.orders` and Next tracker count bump.
2. If `SALE_REVALIDATE_URL` set, verify Vercel logs show ISR request.
3. Run `pnpm exec next lint --file app/api/sales/[sale]/tracker/route.ts` in `local-office/apps/web` after any edits.

High-Level Goal Alignment

Goal 1: “Unified sale page system with live Supabase counters” → Supabase schema is live; trackers read the aggregate view; env scaffolding provided. Still need anon-key read path once RLS policies are finalized for client reads.
Goal 2: “Square-powered fulfillment (Tier A now, Tier B next)” → Webhook now targets Supabase, paving way for Tier A launch. CLI for checkout links, inline checkout API, and Sanity catalog panel remain outstanding.
Goal 3: “Operationalized revalidation and analytics” → Hooks exist for ISR (SALE_REVALIDATE_URL). Need actual revalidate endpoint, analytics/SEO tasks, and webhook testing harness.
