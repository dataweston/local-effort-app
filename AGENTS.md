# AGENTS.md — orientation for AI agents working in this repo

This file is the fastest accurate map of the repo. Prefer it over older docs; anything in `docs/archive/` is historical and may describe retired systems.

## What this project is

The production website and operations tooling for **Local Effort Cooperative** (https://www.localeffortfood.com), a Twin Cities personal chef / catering business. Goals, in priority order:

1. **The public site must be fast, clean, and low-friction** — it is the business's storefront.
2. **Be maximally legible to search engines and AI agents** — agents shopping or researching on behalf of customers should be able to find services, pricing, and booking paths without executing JS (see "Agent-facing surfaces" below).
3. **Internal tools** (planner, hub, brain) support daily operations and must never leak into the public index.

## Service-first execution

Optimize for the user's completed outcome, not for the amount of investigation performed. Correctness and safety still control, but repository exploration is a cost.

- **Define the narrow contract first.** Identify the requested result, owner-supplied inputs, authoritative source, direct consumers, and smallest acceptance check. Do not invent adjacent goals, audits, or cleanup.
- **Trust owner intent.** Owner-provided decisions, corrections, desired assumptions, and acceptance criteria are inputs, not hypotheses to reconfirm. When asked to encode a forecast or scenario, label the supplied figures as owner-defined/model inputs and implement them. Corroborate only when the requested deliverable makes a claim about observed actuals or the owner explicitly asks for an audit.
- **Use progressive discovery.** Read the applicable skill or workflow first, then named files or the likely source of truth and its direct consumers. Search narrow paths and read the smallest complete ranges. Broaden only for a specific unresolved dependency. Never inspect Planner, Brain, billing, history, or production systems “just in case.”
- **Make every lookup earn its context.** Before a read or search, know which implementation or verification decision its result will change. Reuse prior results; do not repeat searches, reread unchanged files, or reread a successful edit merely for reassurance. Avoid large repo-root output.
- **Move to implementation promptly.** A small scoped request should normally reach its first edit within two focused discovery waves and finish in roughly 10–15 tool calls. These are diagnostic targets, not permission to skip a needed safety check; exceed them only for a named blocker or dependency, not curiosity.
- **Choose for the user.** Follow established conventions and take the smallest safe, reversible path when ambiguity is immaterial. Ask only when alternatives produce materially different business outcomes. Do not make the user manage the agent's process.
- **Keep side effects explicit.** Do not read or mutate production data, contact people, invoke external services, or begin a broad audit unless the requested outcome requires it and the action is authorized. Prefer available dry runs.
- **Verify once, proportionately.** Use the minimum check that exercises the changed contract: parse plus a targeted model run for data/config; focused test, lint, or smoke path for code; the changed browser path for UI. Use a full build only for build/deploy or cross-cutting integration risk. Do not stack redundant checks without a failure-driven reason.
- **Stop when done.** Once the acceptance criteria pass, deliver immediately. Report the result, changed files, exact verification, and only material caveats. Do not append a self-audit, speculative follow-up work, or unrelated improvements.

## Repo map (what matters)

```
src/                      React SPA (Vite). Homepage = src/pages/FullPageDemoPage.jsx (large file, ~4.6k lines)
src/App.jsx               All client routes. Retired pages redirect to "/".
src/config/routes.js      SINGLE SOURCE OF TRUTH for public routes → prerender + sitemap + vercel routing
backend/api/index.js      Express app (~4.5k lines). ALL /api/* production traffic. Mounted routers in backend/api/routes/.
backend/api/server.js     Thin serverless entry for the Express app.
api-handlers/             Individual handlers required by backend/api/index.js (store, hub, weekly-order, checkout…)
api/                      Legacy Vercel-function-style handlers — NOT routed in production (vercel.json sends /api/* to backend). Don't add here.
tools/static-export.js    Prerender + sitemap generation, runs in `pnpm build`
prisma/                   PlannerCard model (weekly planner)
studio/                   Sanity CMS studio (separate npm project)
public/                   Static assets incl. robots.txt, ai.txt, llms.txt, ai/manifest.json, business.json
docs/                     Current docs. docs/archive/ = historical, do not trust as current.
```

## Key facts that are easy to get wrong

- **Routing**: `vercel.json` `routes` send every `/api/*` and `/.well-known/*` request to the single Express function. The root `api/` directory is mostly dead in production — change `backend/api/` + `api-handlers/` instead.
- **Retired pages** (about, services, pricing, menu, gallery, pizzafunder, paikka, crowdfunding, partner portals, city landing pages, `/calendar`) redirect to `/`. Don't resurrect them or add them to sitemaps.
- **Firebase/Firestore is legacy.** Supabase is the auth + new-data store. See `docs/DO-NOT-REVERT-TO-FIREBASE.md`.
- **Crons are GET requests** (Vercel crons): brain triage/inference/hypothesis, square-orders sync, meal-feedback digest — schedules in `vercel.json`.
- **Internal surfaces** (`/planner` (formerly `/weeklydemo`, which redirects), `/hub`, `/admin/*`, `/portal/*`, `/inbox`, `/campaigns`, `/auth`, `/catherine-schedule`, `/weekly-order*`) are noindex via `vercel.json` headers + `robots.txt` + `INTERNAL_ROUTES` in `src/config/routes.js`. Keep all three in sync when adding routes.
- **Public forms must keep their anti-bot guards**: honeypot field named `website` + server-side rate limiting in `backend/api/routes/messages.js`. Any new public form endpoint needs both.
- **Brand theming**: CSS custom properties in `src/styles/brand-tokens.css`; pages opt into theme via `fullpage-demo-scope` class.
- **Auth**: `useSupabaseAuth()` from `src/contexts/SupabaseAuthContext.jsx` (Google OAuth; returns `user, session, accessToken, isAdmin, …`).

## Agent-facing surfaces (keep these accurate)

| Surface | Purpose |
| --- | --- |
| `/robots.txt` | Allows all crawlers incl. GPTBot; disallows internal routes; points at sitemap |
| `/sitemap.xml` | Generated at build from `PUBLIC_ROUTES` — never hand-edit |
| `/ai.txt` + `/llms.txt` | Concise machine-readable site guide for LLM crawlers |
| `/ai/manifest.json` | Detailed machine manifest: routes, feeds, APIs, MCP/UCP endpoints |
| `/business.json` | Structured business profile (schema.org-flavored) |
| `/.well-known/ucp` | Universal Commerce Protocol profile; REST at `/ucp/v1` |
| `/.well-known/mcp` | MCP server (streamable HTTP): support search, Sanity query, UCP checkout tools |
| `GET /api/public/site` | Machine-readable summary of routes/feeds/APIs |
| `GET /api/support/search?q=` | Public semantic support search |
| `POST /api/messages/submit` | Public contact endpoint (honeypot: include nothing in `website`) |

When adding/retiring a public page: update `src/config/routes.js`, `App.jsx`, `public/ai.txt`, `public/llms.txt`, and `public/ai/manifest.json` together.

## Human-facing communications (hard rules)

Any email, SMS, or notification that reaches a real customer or staff member is a production deployment with no rollback. This is a live business; a confusing or spammy message costs trust that code fixes can't recover. These rules exist because of a real incident (July 2026: Supabase-default password-reset emails went to a staff member and customers — spam-filtered, zero identifying info, and the link dumped recipients on the homepage instead of /hub; everyone was confused).

1. **Dry-run to the owner first, always.** Before a message reaches a real recipient, send the exact message through the exact mechanism to the owner's address. Open it, check the spam folder, click every link, confirm the landing page. Then get explicit approval for the real send — name each recipient.
2. **Never send messages via Supabase — all outbound messages go through Brevo.** This is a hard ban, owner-mandated 2026-07-06: do not trigger `resetPasswordForEmail`, `inviteUserByEmail`, magic links, `generateLink`+send, or dashboard-triggered auth emails, to anyone, owner included. Supabase's built-in mailer is spam-filtered, unbranded, and capped at ~2 emails/hour. The ban lifts for auth emails only once Supabase SMTP relays through Brevo with the branded template live (`docs/supabase-auth-email-setup.md`) — verify in the dashboard, don't assume. If a flow seems to require a Supabase-sent email before then, stop and escalate to the owner; never send around it. Non-auth messages always go via Brevo (or owner-approved Gmail).
3. **Every message must orient its recipient.** Who it's from (Local Effort), why they're receiving it, what to do, what they'll see afterward, and who to contact if stuck. A bare system-generated link is never acceptable to send a human.
4. **The tested path must be the shipped path.** Verifying the in-app reset flow does not verify a dashboard-triggered reset email. If you tested A and are shipping B, B is untested — stop and test B.
5. **Auth links are guilty until proven innocent.** Supabase silently rewrites `redirectTo` to the project Site URL unless the target is on the auth redirect allowlist — this is how reset links landed on the homepage. Click the actual link in the actual received email before any real send.
6. **Escalate unfitness signals; don't ship around them.** If the channel rate-limits, spam-folders, or misroutes during testing, that's a blocker to raise with the user — not a caveat to write into the message copy.
7. **Leave an audit trail.** Record who was contacted, when, via what channel, and with what content (commit message, notes doc, or the user's Sent folder). "Sent via dashboard" that nobody can reconstruct later is not acceptable.

## Commands

```bash
pnpm start              # dev frontend (proxy /api → :3001)
pnpm backend:start      # dev API on :3001
pnpm build              # full prod build incl. prerender + sitemap
pnpm lint / lint:fix    # eslint on src/
pnpm test:e2e           # Playwright
```

### Operator CLIs (use these before writing a one-off script)

```bash
node scripts/gmail.cjs status                    # auth health + index freshness + how to fix
node scripts/gmail.cjs search "rad pizza" --max 5
node scripts/gmail.cjs thread <threadId>
node scripts/gmail.cjs sync --refresh-recent --recent-days 45
node scripts/audit-square-recurring-invoices.cjs --query "Tyler"  # search live Square invoices by customer/title

node scripts/planner.cjs list --from 2026-09-01 --to 2026-09-30
node scripts/planner.cjs add --date fri --title "Rad — pizza dinner" --type event
node scripts/planner.cjs add --date "sep 25" --title "Clare — apple crisps" --apply
```

`planner.cjs add` parses `fri` / `tomorrow` / `sep 25` / `9/25` forward from today,
derives `dayOfWeek` and a deterministic id, prints same-day cards as a capacity
check, and is a **dry run until `--apply`**. For multi-card batches with COGS and
recurring series, `scripts/upsert-planner-week.cjs --data <file.json>` still applies.

**Gmail keeps breaking?** Run `scripts/gmail.cjs status` first. It probes the
Gmail API—not just token expiry—and force-refreshes one rejected access token
before reporting a reconnect requirement. The sync archives exact RFC 2822
bytes before deriving searchable text, refreshes recent business mail daily,
and drains the historical lane in bounded batches. `GMAIL_PUBSUB_TOPIC` plus
`GMAIL_PUBSUB_SERVICE_ACCOUNT` enables authenticated push refresh; without both,
daily polling remains the explicit fallback. An index older than two days is
stale. If `testingModeGrant` is reported, publish the Google Cloud OAuth consent
screen because Testing grants expire weekly. Reconnect via the Brain UI →
Partners → **Connect Gmail**; that POST signs OAuth state server-side, while a
locally generated URL can fail state verification.

## Conventions

- pnpm only; Node 20; React pinned to 18.2.0 via overrides.
- API handlers: `module.exports = async (req, res) => {}`; mount in `backend/api/index.js`.
- Escape all user input interpolated into email HTML (`escapeHtml` helpers exist in routers).
- Webhooks verify secrets with timing-safe comparison — follow the existing patterns in `backend/api/index.js`.
- Never commit secrets; `.env*` files are gitignored. Client-exposed config must be `VITE_*`/`NEXT_PUBLIC_*` only.
- Scope Glob/Grep to src/, backend/, api-handlers/, scripts/, docs/ — repo-root globs time out.