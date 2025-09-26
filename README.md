# le-redesigns

Created with CodeSandbox

## Messaging/Email MVP

This app now includes a basic messaging/email foundation:

- Backend endpoints (served by `backend/api/server.js`):
	- `POST /api/messages/submit` — public inquiry form. Upserts contact to Brevo and mirrors message to Sanity.
	- `POST /api/messages/send` — team outbound email. Sends via Brevo and mirrors to Sanity.
	- `GET /api/inbox` — fetches recent messages from Sanity (filter by `status=open`).
	- `POST /api/campaigns/save` — saves a draft campaign (HTML) to Sanity.
	- `POST /api/push/subscribe` — save a web push subscription to Sanity.
	- `POST /api/push/notify` — send a test push to all subscribers.

- Frontend pages:
	- `/inbox` shows a minimal inbox list.
	- `/campaigns` has a basic HTML editor placeholder (swap with EmailBuilder.js later).
	- A floating “Support” widget is mounted to every page with quick FAQ and an email form.

### Environment variables (server)

Set these in your hosting provider (do NOT prefix with VITE_):


Client-side env vars remain under `VITE_*` and should not include secrets.

### Notes


## Observability & Monitoring

See `docs/observability.md` for full setup. Key points:
* Sentry integrated (frontend + backend). Provide `VITE_SENTRY_DSN` and `SENTRY_DSN`.
* Health endpoints: `/api/_ping` (serverless) and `/health` (backend API) for UptimeRobot.
* PM2 process file: `ecosystem.config.cjs` (`pm2 start ecosystem.config.cjs --env production`).
* Example environment variables in `.env.example`.

### Sentry Release Workflow (Summary)
Automated source map upload + release creation uses `sentry-cli` and scripts in `package.json`.

Typical flow:
```
export SENTRY_AUTH_TOKEN=***   # scopes: project:releases, org:read
export SENTRY_ORG=your-org
export SENTRY_PROJECT=local-effort-frontend
export SENTRY_RELEASE=$(git rev-parse --short HEAD)
npm run build:release
```
Scripts available:
`release:new` `release:files` `release:commits` `release:finalize` `release:all` `build:release`.
Omit Sentry env vars to build without uploading.


