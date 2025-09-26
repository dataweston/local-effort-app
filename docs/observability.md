# Observability & Monitoring

This project integrates Sentry (error + performance monitoring), UptimeRobot (availability), and PM2 (process management) for production deployments.

## 1. Sentry

### Frontend (React)
Initialized in `src/index.jsx` using `@sentry/react` with optional replay.
Environment variables (see `.env.example`):
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_TRACES_SAMPLE_RATE` (default 0.1)
- `VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` (default 0.0)
- `VITE_SENTRY_REPLAYS_ERROR_SAMPLE_RATE` (default 1.0)

Wraps the root App with `withProfiler` when DSN present.

### Backend (Express)
Two servers use Sentry if `SENTRY_DSN` is provided:
- Lightweight image search server (`server.js`)
- Main backend API (`backend/api/server.js`)

Environment variables:
- `SENTRY_DSN`
- `SENTRY_TRACES_SAMPLE_RATE` (default 0.1)
- `SENTRY_PROFILES_SAMPLE_RATE` (default 0.0)
- `SENTRY_ENV` (defaults to `NODE_ENV`)

The main backend adds request + tracing handlers and error handler at the end of the middleware chain.

### Deployment Notes
1. Create Sentry projects (e.g. `local-effort-frontend`, `local-effort-backend`).
2. Add DSNs to environment variables in production hosting (Vercel / server host).
3. Optionally add a Sentry auth token for source map upload if you later add the `@sentry/vite-plugin` upload step.

### Release & Source Maps
Integrated `@sentry/vite-plugin` (conditionally enabled when `VITE_SENTRY_DSN`, `SENTRY_ORG` and `SENTRY_PROJECT` are present). Environment variables:
```
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN= # token with project:releases + org:read
SENTRY_RELEASE=custom-release-id (optional; falls back to commit SHA)
```
Build with release (example):
```
SENTRY_RELEASE=$(git rev-parse --short HEAD) npm run build
```
Uploaded source maps live in the release artifacts in Sentry. Disable by unsetting org/project or DSN.

## 2. Health Checks (UptimeRobot)

Endpoints:
- Root server: `GET https://<your-domain>/api/_ping` (already present for Vercel serverless)
- Backend server (PM2 managed): `GET https://<your-domain>/health` returns `{ ok: true, ts: <epoch_ms> }`

Recommended UptimeRobot configuration:
- Monitor Type: HTTPS
- Interval: 5 minutes
- Alert if > 1 failure

Optional advanced monitor: add separate monitors for critical APIs (e.g. `/api/crowdfund/status`).

## 3. PM2 Process Management

File: `ecosystem.config.cjs`
Defines:
- `web-static-server` (runs `server.js`)
- `backend-api` (runs `backend/api/server.js`)

Basic commands:
```
# Start all (production env)
pm2 start ecosystem.config.cjs --env production

# View status
pm2 ls

# View logs (all)
pm2 logs

# Tail a single app
pm2 logs backend-api

# Restart a single app
pm2 restart backend-api

# Apply env variable changes
pm2 restart ecosystem.config.cjs --env production

# Delete processes
pm2 delete ecosystem.config.cjs
```

Logs are stored in PM2's default `~/.pm2/logs` unless you customize the ecosystem entries with `error_file` / `out_file`.

## 4. Structured Logging

Implemented with Pino:
Files: `logger.js` (root server), `backend/api/logger.js` (API with batching shipper).
Env variables:
```
LOG_LEVEL=info        # trace|debug|info|warn|error|fatal
LOG_PRETTY=false      # set true locally for readable output
LOG_SHIP_ENDPOINT=    # optional https endpoint for batched JSON { source, events: [] }
```
Behavior:
* Request logs include method, url, status, latency (ms).
* Errors logged with `{ err }` field (Sentry still captures exceptions separately).
* Optional shipping batches up to 25 events / 5s best-effort.

Extending shipping: point `LOG_SHIP_ENDPOINT` to a lightweight collector (e.g., Logtail, custom ingest, etc.).

## 5. End-to-End Testing (Playwright)

Configured Playwright for smoke tests.
Files:
* `playwright.config.js`
* `tests/e2e/home.spec.js`

Scripts:
```
npm run test:e2e          # headless
npm run test:e2e:headed   # visible browser
npm run test:e2e:report   # open HTML report after run
```
Set `PLAYWRIGHT_BASE_URL` when running against a deployed preview.
Example CI step:
```
npm run build
npx vite preview &
PLAYWRIGHT_BASE_URL=http://localhost:4173 npm run test:e2e
```

## 6. Local Development
Install packages after pulling changes:
```
npm install
(cd backend && npm install)
```
Run backend only:
```
npm run backend:start
```
Run frontend dev (Vite):
```
npm start
```
(Optional) run both via PM2 locally:
```
pm2 start ecosystem.config.cjs
```

## 7. Sentry Release Workflow & Source Maps

Automated release + sourcemap upload is wired via `@sentry/vite-plugin` and `sentry-cli` scripts in `package.json`.

Environment variables required (CI / build environment):
```
SENTRY_ORG=your-org
SENTRY_PROJECT=your-frontend-project   # matches project slug in Sentry
SENTRY_AUTH_TOKEN=xxxxxxxxxxxxxxxx     # token with scopes: project:releases, org:read
SENTRY_RELEASE=<optional explicit id>  # defaults to short git SHA when using build:release script
VITE_SENTRY_DSN=...                    # for runtime reporting
```

Backend (Node) release association:
```
SENTRY_DSN=...
SENTRY_ENV=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.0
```

### Provided npm scripts
```
npm run release:version   # prints current $SENTRY_RELEASE (debug)
npm run release:new       # create release in Sentry
npm run release:files     # upload sourcemaps from dist/
npm run release:commits   # associate commits automatically (non-fatal if fails)
npm run release:finalize  # finalize release (marks deploy-ready)
npm run release:all       # convenience: new + files + commits + finalize
npm run build:release     # build with release id (git short SHA if not set) then upload
```

### Typical CI pipeline snippet
```
export SENTRY_AUTH_TOKEN=***
export SENTRY_ORG=your-org
export SENTRY_PROJECT=local-effort-frontend
export SENTRY_RELEASE=$(git rev-parse --short HEAD)
npm ci
npm run build:release
```

If you want to skip Sentry on a given build (e.g. fork / local), simply omit `SENTRY_ORG` / `SENTRY_PROJECT` or the auth token; the plugin will be inert.

### Verifying locally (dry run)
```
SENTRY_ORG=your-org \
SENTRY_PROJECT=local-effort-frontend \
SENTRY_AUTH_TOKEN=**** \
SENTRY_RELEASE=local-test $(npm bin)/sentry-cli releases list | head -n 5  # sanity (optional)

SENTRY_RELEASE=local-test npm run build:release
```
You should see upload logs and a finalized release in Sentry. Generate a test error in the app; confirm the issue shows the correct release.

### Backend release association (optional)
For backend stack traces to map to a release, set `SENTRY_RELEASE` in the environment before starting the Node processes (PM2 or otherwise). Example PM2 start:
```
SENTRY_RELEASE=$(git rev-parse --short HEAD) pm2 start ecosystem.config.cjs --env production
```
Ensure the same release id used for frontend; this lets Sentry link issues across services.

---

If you later add a deploy notification, you can extend with:
```
sentry-cli releases deploys $SENTRY_RELEASE new -e production
```
Add that after `release:finalize` if desired.

## 8. Alerting Strategy
- Sentry: configure alert rules for new issues & performance regressions (Apdex/response time) per project.
- UptimeRobot: email/SMS alerts to on-call address.
- (Future) Add Slack webhook integration for both.

## 9. Tuning Sample Rates
Start low in production:
- `tracesSampleRate=0.1` (10%)
- Increase temporarily when diagnosing performance issues.
- Keep replays off (`0`) unless needed to debug complex UX issues.

## 10. Security / PII Hygiene
Avoid sending raw user-submitted message bodies if they may contain sensitive details. Current instrumentation captures uncaught exceptions only; to sanitize additional data, configure `beforeSend` in Sentry init.

Example:
```js
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  beforeSend(event) {
    // scrub email fields example
    if (event.user && event.user.email) delete event.user.email;
    return event;
  }
});
```

## 11. Checklist After Deployment
- [ ] DSNs set in environment
- [ ] Health monitors added in UptimeRobot
- [ ] PM2 processes running & `pm2 save` executed (if using startup scripts)
- [ ] Sentry issues appearing on intentional test error
- [ ] Alert rules configured

---
Questions or want to extend observability further (metrics, logs aggregation)? Add follow-up tasks in this doc.
