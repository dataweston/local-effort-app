# Local Effort

Production website, commerce surfaces, and internal operations tooling for **Local Effort Cooperative** — a Minneapolis–St. Paul personal chef team offering in-home dinners, weekly meal prep, and small-event catering.

Live site: https://www.localeffortfood.com

## What this repo contains

| Area | Where | Notes |
| --- | --- | --- |
| Public website (SPA) | `src/` | Vite + React 18, Tailwind. Homepage is `src/pages/FullPageDemoPage.jsx`. |
| Route metadata | `src/config/routes.js` | Single source of truth for public routes; drives prerender, sitemap, and meta. |
| Prerendered HTML for crawlers | `tools/static-export.js` → `prerender/` | Runs during `pnpm build`; also writes `sitemap.xml` and `.routes-manifest.json`. |
| API (production) | `backend/api/` | Express app deployed as one Vercel serverless function. All `/api/*` traffic routes here (see `vercel.json`). |
| API handlers (shared) | `api-handlers/` | Individual request handlers required by `backend/api/index.js` (checkout, store, hub, weekly-order, etc.). |
| Company "brain" | `backend/api/brain/`, `brain-sidecar/` | Fact/inference system over business data. Nightly jobs run as Vercel crons (see `vercel.json`). |
| Weekly planner | `src/features/planner/`, `/weeklydemo` | Internal cockpit. Prisma `PlannerCard` model. |
| Hub | `src/pages/HubPage.jsx`, `api-handlers/hub/` | Internal staff hub (`/hub`), noindex. |
| Sanity CMS studio | `studio/` | Content: blog posts, products, releases, messages, subscribers. |
| Agent/AI surfaces | `public/ai.txt`, `public/llms.txt`, `public/ai/manifest.json`, `/.well-known/ucp`, `/.well-known/mcp` | Machine-readable site/business info, UCP commerce profile, MCP server. |

## Stack

- **Frontend**: Vite, React 18, Tailwind CSS, framer-motion, react-router v6, react-helmet-async
- **Backend**: Express (single serverless function on Vercel), also runnable locally on port 3001
- **Data**: Sanity (content + messages), Supabase (auth via Google OAuth, Postgres tables), Prisma/PostgreSQL (planner), Firebase/Firestore (legacy — do not extend; see `docs/DO-NOT-REVERT-TO-FIREBASE.md`)
- **Payments**: Square (checkout links, webhooks)
- **Email/SMS**: Brevo (transactional + lists, double opt-in newsletter)
- **Monitoring**: Sentry (frontend + backend), Vercel Speed Insights
- **Package manager**: pnpm 9 (workspace), Node 20

## Getting started

```bash
pnpm install            # also runs prisma generate
pnpm start              # Vite dev server (proxies /api → localhost:3001)
pnpm backend:start      # Express API on :3001
pnpm build              # full production build (data gen + vite + prerender + sitemap)
pnpm lint               # eslint over src/
pnpm test:e2e           # Playwright tests
```

Environment variables live in `.env` (never committed). Server secrets must NOT be prefixed `VITE_`; client-safe values use `VITE_*` (or `NEXT_PUBLIC_*`).

## Deployment

Vercel. `vercel.json` defines:

- Static build (`pnpm build` → `dist/`) plus one serverless function (`backend/api/server.js`) that serves all `/api/*` and `/.well-known/*` routes.
- Prerendered routes (`/`, `/blog`, `/sale`, `/book`, …) served from `prerender/`.
- Permanent redirects for retired pages (legacy `/weekly`, `/salepage`, weddings subdomain, etc.).
- Daily crons (GET): brain triage/inference/hypothesis, Square order sync, meal-feedback digest.
- Security and robots headers (internal surfaces are `noindex`).

## Documentation map

- `AGENTS.md` — orientation guide for AI agents and new contributors (read this first)
- `docs/architecture/` — brain, decision engine, Neo4j design docs
- `docs/observability.md` — Sentry, health checks, PM2
- `docs/sale-system-architecture.md` — sale/checkout system
- `docs/brain-current.md` — current state of the brain system
- `docs/archive/` — historical fix logs and retired-feature docs (kept for reference; do not treat as current)
