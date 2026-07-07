# AGENTS.md — orientation for AI agents working in this repo

This file is the fastest accurate map of the repo. Prefer it over older docs; anything in `docs/archive/` is historical and may describe retired systems.

## What this project is

The production website and operations tooling for **Local Effort Cooperative** (https://www.localeffortfood.com), a Twin Cities personal chef / catering business. Goals, in priority order:

1. **The public site must be fast, clean, and low-friction** — it is the business's storefront.
2. **Be maximally legible to search engines and AI agents** — agents shopping or researching on behalf of customers should be able to find services, pricing, and booking paths without executing JS (see "Agent-facing surfaces" below).
3. **Internal tools** (planner, hub, brain) support daily operations and must never leak into the public index.

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
- **Internal surfaces** (`/weeklydemo`, `/hub`, `/admin/*`, `/portal/*`, `/inbox`, `/campaigns`, `/auth`, `/catherine-schedule`, `/weekly-order*`) are noindex via `vercel.json` headers + `robots.txt` + `INTERNAL_ROUTES` in `src/config/routes.js`. Keep all three in sync when adding routes.
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
2. **Never use default transactional email for human-facing messages.** Supabase built-in SMTP is a dev bootstrap: generic sender, unbranded template, spam-prone, rate-limited to a few emails/hour. Human-facing mail goes through Brevo or user-approved Gmail. Supabase auth emails are acceptable only once custom SMTP and a reviewed, branded template are configured — verify in the dashboard, don't assume.
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

## Conventions

- pnpm only; Node 20; React pinned to 18.2.0 via overrides.
- API handlers: `module.exports = async (req, res) => {}`; mount in `backend/api/index.js`.
- Escape all user input interpolated into email HTML (`escapeHtml` helpers exist in routers).
- Webhooks verify secrets with timing-safe comparison — follow the existing patterns in `backend/api/index.js`.
- Never commit secrets; `.env*` files are gitignored. Client-exposed config must be `VITE_*`/`NEXT_PUBLIC_*` only.
