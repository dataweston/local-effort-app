# Stage 4: Priority Repository And Preview Console

This stage moves the decision engine from file-only configuration toward business-managed operation while keeping the public runtime stable.

## What changed

- Added a priority repository abstraction with two concrete sources:
  - Sanity-backed `decisionPriority` documents
  - JSON fallback from `backend/decision/businessPriorities.json`
- Added admin verification for internal decision preview routes using Supabase bearer tokens and admin-email checks.
- Added an internal preview surface at `/admin/decision-preview` for operators to inspect:
  - normalized context
  - experiment assignment
  - selected recommendation
  - matched and unmatched priorities
  - decision debug payload
- Added a Sanity schema for `decisionPriority` so editorial/business teams can manage priorities without code deploys once content is published.

## Architectural impact

The decision layer no longer depends on a file path as its only business-priority source. The runtime now asks a repository for priorities and receives a normalized contract regardless of whether those priorities came from Sanity or JSON.

That gives the repo a cleaner boundary between:

- decision policy
- storage/editorial source
- admin inspection tooling

## Runtime behavior

### Public preview endpoint

`POST /api/decision/preview`

- remains suitable for future customer-facing use
- continues to return the stable decision result contract
- now loads priorities through the repository abstraction

### Internal admin preview endpoint

`POST /api/decision/admin/preview`

- requires a valid Supabase bearer token for an admin user
- supports optional `variantOverride`
- includes decision debug diagnostics for operator inspection

## Sanity rollout notes

The repository prefers Sanity when available and falls back to JSON when:

- Sanity is not configured
- the Sanity query returns no priorities
- the Sanity repository fails

This allows editorial migration without blocking runtime stability.

## Seeding priorities

The repo now includes a reusable seed script:

- `pnpm decision:seed-priorities:dry`
- `pnpm decision:seed-priorities`

The script reads `backend/decision/businessPriorities.json` and creates or replaces `decisionPriority` documents in Sanity using stable IDs.

## Recommended next steps

1. Seed `decisionPriority` documents in Sanity using the existing JSON priorities as the bootstrap source.
2. Use the compact preview matrix in `docs/architecture/decision-preview-test-matrix.md` to tune weights, strategies, and match rules.
3. Add an LLM-assisted variant only after the admin preview console is being used to validate priority logic and copy behavior.
