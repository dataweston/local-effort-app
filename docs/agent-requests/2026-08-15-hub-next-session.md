# Hub next-session scope — 2026-08-15

## Baseline established this session

- Hub access levels are `localist`, `customer`, `staff`, and `privileged`; unknown and inactive profiles deny access.
- Customer and Localist access is separated from staff operations.
- Square webhooks, not browser redirects or public analytics, are payment authority.
- Localist order completion, shift claims, and schedule-request reviews use single-winner mutations.
- Public Localist checkout, activity, and chat use the Postgres-backed `HubPublicRateLimitBucket` limiter.
- Public chat is text-only; base64 image storage was removed.
- Localist signup creates or reuses an email-bound Hub invite without sending member email.
- Membership reads separate food spending from dues/billing and label 4% credit as accrued estimate, not settled balance.

## Deployment prerequisite

Apply both data migrations before deploying:

- `prisma/migrations/20260815000100_hub_public_rate_limits/migration.sql` in the Prisma Postgres database. Public checkout, activity, and chat fail closed if shared rate-limit storage is unavailable.
- `supabase-localist-members-setup.sql` in Supabase. Localist signup now withholds paid checkout and returns an error unless its durable roster/activation row can be written.

## Next session priorities

1. Add organization membership and derive every private resource scope from authenticated membership; scope documents, threads/messages, shifts, captures, operational orders, spaces, and audit records by organization or household.
2. Introduce a provider-neutral membership dues/subscription/transaction model; backfill the external Supabase `localist_members` roster and Square identifiers without conflating food orders with dues.
3. Add a durable co-op credit ledger with accrual postings, quarterly finalization, redemption, expiration policy fields, and audit history. Keep the current computed 4% amount informational until ledger-backed.
4. Make benefits enforceable entitlements, including paid-member credit eligibility, member-first menu access, meal-prep eligibility, and the waived-only low-cost menu.
5. Move sellable inventory and reservations into a transactional source of truth before checkout; reconcile Square and Sanity asynchronously.
6. Add cursor pagination, consolidated Hub bootstrap reads, cacheable/precomputed meal-prep enrichment, and query indexes based on measured plans.
7. Move any future public media to object storage with size/type validation, quotas, moderation, and deletion controls.
8. Add per-route latency/error/denial/database-pool telemetry and load tests for login bursts, member reads, chat abuse, shift contention, duplicate webhooks, and concurrent checkout/inventory demand.

## Product invariants to preserve

- Localist tiers: monthly $45, annual $375, waived $0.
- Monthly and annual tiers accrue 4% quarterly non-expiring co-op credit; waived does not.
- Waived members otherwise receive the same core membership plus their distinct low-cost menu promise.
- Square remains current billing authority until an explicit provider migration.
- No member-facing email is sent without the owner-first dry run and explicit recipient approval required by `AGENTS.md`.
- The timed `?localist=` guest ordering window remains distinct from authenticated Localist membership.
