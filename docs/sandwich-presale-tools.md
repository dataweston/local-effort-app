# Sandwich presale toolchain guide

This guide explains how the API, web checkout, and kiosk apps coordinate to sell, fulfill, and redeem presale sandwiches. Use it as a playbook when onboarding, extending menu options, or debugging production issues across the stack.

## Setup checklist

1. Copy `docs/sandwich-presale.env.example` to `.env` at the repo root and populate event, key, Square, and Brevo values before starting any service. The API reads this file automatically and enforces required keys such as `EVENT_ID` and `JWT_KID`.ã€F:docs/sandwich-presale.env.exampleâ€ L1-L29ã€‘ã€F:apps/api/src/env.tsâ€ L1-L58ã€‘
2. Install dependencies with `pnpm install` and run on Node 20.x to satisfy the workspace engines constraint.ã€F:package.jsonâ€ L1-L106ã€‘
3. Launch each service in its own terminal (or with your preferred process manager):
   - `pnpm --filter @local-effort/api dev`
   - `pnpm --filter @local-office/web dev`
   - `pnpm --filter @local-effort/kiosk dev`
4. Provide Square sandbox credentials and Brevo template details before exercising external hand-offs. The API throws when Square credentials are missing and skips email delivery when Brevo settings are absent.ã€F:apps/api/src/square.tsâ€ L12-L68ã€‘ã€F:apps/api/src/brevo.tsâ€ L1-L47ã€‘
5. When rotating signing keys, either supply base64-encoded Ed25519 material through `.env` or let the API mint a new pair during startup via `ensureActiveKey`. Kiosks pull the active public key through `/keys/current` before verifying tokens.ã€F:docs/sandwich-presale.env.exampleâ€ L13-L17ã€‘ã€F:apps/api/src/index.tsâ€ L1-L34ã€‘ã€F:apps/api/src/keys.tsâ€ L29-L99ã€‘ã€F:apps/api/src/routes.tsâ€ L15-L37ã€‘

## Environment and shared building blocks

- The presale stack loads configuration from the root `.env`, defaulting to localhost URLs and a file-based SQLite database when optional keys are missing.ã€F:apps/api/src/env.tsâ€ L1-L58ã€‘
- Shared models and token helpers ship from `@local-effort/shared`, including the `Order` shape, Crockford-style backup code generator, and Ed25519 sign/verify utilities used across all three apps.ã€F:packages/shared/src/types.tsâ€ L1-L21ã€‘ã€F:packages/shared/src/token.tsâ€ L1-L93ã€‘
- Menu copy, pricing, and Square SKU metadata live in the Paikka menu module so both the Next.js checkout and API validation stay aligned.ã€F:local-office/apps/web/app/paikka/menu.tsâ€ L1-L33ã€‘ã€F:apps/api/src/orders.tsâ€ L1-L83ã€‘

### Environment variable map

| Variable | Purpose | Default |
| --- | --- | --- |
| `EVENT_ID` | Shared event identifier for API projections and kiosk sync. | _(required)_ã€F:apps/api/src/env.tsâ€ L34-L47ã€‘ã€F:apps/kiosk/src/main/electron-main.tsâ€ L351-L386ã€‘ |
| `JWT_KID` | Active signing key ID persisted in the SQLite key table. | _(required)_ã€F:apps/api/src/env.tsâ€ L34-L47ã€‘ã€F:apps/api/src/keys.tsâ€ L29-L67ã€‘ |
| `JWT_PRIVATE_KEY_BASE64` / `JWT_PUBLIC_KEY_BASE64` | Optional Ed25519 keypair for deterministic rotation. | Auto-generated when empty.ã€F:apps/api/src/env.tsâ€ L34-L47ã€‘ã€F:apps/api/src/keys.tsâ€ L29-L67ã€‘ |
| `API_BASE_URL` | Base URL for inter-service requests (web â†’ API, kiosk â†’ API). | `http://localhost:4000`ã€F:apps/api/src/env.tsâ€ L34-L47ã€‘ã€F:local-office/apps/web/app/api/paikka/checkout/route.tsâ€ L15-L133ã€‘ã€F:apps/kiosk/src/main/electron-main.tsâ€ L351-L386ã€‘ |
| `PUBLIC_BASE_URL` / `NEXT_PUBLIC_PUBLIC_BASE_URL` | Host used when encoding success-page redirects. | `http://localhost:3000`ã€F:apps/api/src/env.tsâ€ L34-L47ã€‘ã€F:local-office/apps/web/app/api/paikka/checkout/route.tsâ€ L15-L133ã€‘ |
| `NEXT_PUBLIC_API_BASE_URL` | Client-side fallback for authenticated utilities. | `/api/mock` unless overridden.ã€F:local-office/apps/web/lib/auth-context.tsxâ€ L21-L74ã€‘ |
| `BREVO_API_KEY` / `BREVO_TEMPLATE_ID` | Enables transactional email delivery when present. | Email send skipped if unset.ã€F:apps/api/src/env.tsâ€ L34-L47ã€‘ã€F:apps/api/src/brevo.tsâ€ L1-L47ã€‘ |
| `SQUARE_ENV` | Selects sandbox or production Square environment. | `sandbox` unless set to `production`.ã€F:apps/api/src/env.tsâ€ L34-L47ã€‘ |
| `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` | Required to request Square payment links. | Throws when missing.ã€F:apps/api/src/env.tsâ€ L34-L47ã€‘ã€F:apps/api/src/square.tsâ€ L12-L68ã€‘ |
| `PORT` | API listen port. | `4000`ã€F:apps/api/src/env.tsâ€ L34-L47ã€‘ã€F:apps/api/src/index.tsâ€ L1-L34ã€‘ |
| `DB_URL` | SQLite connection string for orders and keys. | `file:./data.db`ã€F:apps/api/src/env.tsâ€ L34-L47ã€‘ |
| `KIOSK_DEV_SERVER_URL` | Optional renderer URL for kiosk dev builds. | Loads bundled HTML when empty.ã€F:docs/sandwich-presale.env.exampleâ€ L23-L29ã€‘ã€F:apps/kiosk/src/main/electron-main.tsâ€ L389-L444ã€‘ |

## API service (`@local-effort/api`)

- Commands: run `pnpm --filter @local-effort/api dev` for iterative development (`tsx watch src/index.ts`), `pnpm --filter @local-effort/api build` to compile TypeScript, and `pnpm --filter @local-effort/api start` to launch the compiled server.ã€F:apps/api/package.jsonâ€ L1-L30ã€‘
- HTTP surface area lives in `routes.ts`. It exposes health checks, signing-key rotation, incremental order projection sync, order creation plus Brevo email delivery, QR PNG rendering, kiosk check-in, and the Square checkout proxy.ã€F:apps/api/src/routes.tsâ€ L1-L130ã€‘
- `orders.ts` validates presale payloads, enforces unique `paymentReference` values, regenerates missing JWTs, and persists gratuity amounts alongside Crockford backup codes for kiosk lookups.ã€F:apps/api/src/orders.tsâ€ L26-L172ã€‘
- Square hand-off is centralized in `square.ts`, which assembles Payment Link requests with presale pricing and optional gratuity service charges.ã€F:apps/api/src/square.tsâ€ L12-L68ã€‘
- `brevo.ts` wraps transactional email delivery and gracefully skips sending when credentials are absent, surfacing HTTP failures as thrown errors.ã€F:apps/api/src/brevo.tsâ€ L1-L47ã€‘
- QR rendering uses the `renderQrPng` helper to return a 256Ã—256 PNG for kiosk scanners.ã€F:apps/api/src/qr.tsâ€ L1-L9ã€‘

## Web checkout (`@local-office/web`)

- Commands: use `pnpm --filter @local-office/web dev` for local iteration, plus `build`/`start` and `lint`/Playwright `test:e2e` for production parity.ã€F:local-office/apps/web/package.jsonâ€ L1-L35ã€‘
- The `/paikka` page enforces presale pricing, gratuity presets, and client-side validation for required customer fields before calling the Next API route.ã€F:local-office/apps/web/app/paikka/menu.tsâ€ L1-L33ã€‘ã€F:local-office/apps/web/app/paikka/page.tsxâ€ L1-L240ã€‘
- `app/api/paikka/checkout` validates payloads, encodes customer state for the redirect, maps SKUs to Square line items, and POSTs to the APIâ€™s `/square/checkout` endpoint.ã€F:local-office/apps/web/app/api/paikka/checkout/route.tsâ€ L1-L134ã€‘
- After Square redirects back, `app/paikka/success` decodes saved state, resolves the payment reference, calls `/orders/create`, renders the receipt, and exposes the resend button for Brevo hand-off.ã€F:local-office/apps/web/app/paikka/success/page.tsxâ€ L1-L226ã€‘
- The resend button posts the order/JWT pair to a Next API bridge, which forwards to `/brevo/send` on the API service.ã€F:local-office/apps/web/app/paikka/resend-email-button.tsxâ€ L1-L50ã€‘ã€F:local-office/apps/web/app/api/paikka/resend/route.tsâ€ L1-L33ã€‘
- Success page totals rely on the shared Paikka menu module so displayed pricing matches API validation and Square charges.ã€F:local-office/apps/web/app/paikka/success/page.tsxâ€ L101-L209ã€‘ã€F:local-office/apps/web/app/paikka/menu.tsâ€ L1-L33ã€‘

## Kiosk app (`@local-effort/kiosk`)

- Commands: `pnpm --filter @local-effort/kiosk dev` runs the Electron main process and Vite renderer in watch mode, while `build` orchestrates production bundles with tsup and Vite.ã€F:apps/kiosk/package.jsonâ€ L1-L34ã€‘
- `electron-main.ts` handles runtime orchestration: it verifies QR tokens with the shared Ed25519 public key, enforces the 90-minute grace window, records redemptions, and coordinates sync cycles that fetch keys/orders and flush offline check-ins.ã€F:apps/kiosk/src/main/electron-main.tsâ€ L300-L444ã€‘
- `parseArgs()` wires CLI flags (`--station-id`, `--api`, `--event-id`, `--db`, `--sync-interval-ms`) so you can package kiosk builds per venue.ã€F:apps/kiosk/src/main/electron-main.tsâ€ L351-L386ã€‘
- `database.ts` seeds SQLite tables for cached orders, redemptions, offline outbox payloads, signing keys, and metadata, providing helpers for upserts, queue management, and active-key tracking.ã€F:apps/kiosk/src/main/database.tsâ€ L1-L218ã€‘

## Operational playbooks

- **Provisioning keys**: Starting the API seeds the `keys` table when no active key exists or when the configured `JWT_KID` is missing, ensuring kiosks receive a valid public key from `/keys/current`. Provide base64-encoded keys in `.env` for deterministic rotations.ã€F:docs/sandwich-presale.env.exampleâ€ L13-L17ã€‘ã€F:apps/api/src/index.tsâ€ L1-L34ã€‘ã€F:apps/api/src/keys.tsâ€ L29-L99ã€‘ã€F:apps/api/src/routes.tsâ€ L15-L37ã€‘
- **Square checkout smoke test**: Use the `/paikka` flow to request a Square checkout link and verify `/square/checkout` returns a hosted URL; missing credentials surface as explicit API errors.ã€F:local-office/apps/web/app/api/paikka/checkout/route.tsâ€ L75-L134ã€‘ã€F:apps/api/src/routes.tsâ€ L104-L129ã€‘ã€F:apps/api/src/square.tsâ€ L12-L68ã€‘
- **Order finalization**: After Square redirects back, the success page posts to `/orders/create`. The API enforces idempotency, regenerates missing JWTs, and triggers Brevo sends for new orders.ã€F:local-office/apps/web/app/paikka/success/page.tsxâ€ L76-L209ã€‘ã€F:apps/api/src/routes.tsâ€ L39-L66ã€‘ã€F:apps/api/src/orders.tsâ€ L40-L172ã€‘ã€F:apps/api/src/brevo.tsâ€ L1-L47ã€‘
- **Offline redemption recovery**: Kiosk outbox entries persist in SQLite and replay through `/checkin` once connectivity returns. Monitor the outbox count and sync interval flags when diagnosing delayed flushes.ã€F:apps/kiosk/src/main/database.tsâ€ L139-L217ã€‘ã€F:apps/kiosk/src/main/electron-main.tsâ€ L331-L347ã€‘ã€F:apps/api/src/routes.tsâ€ L78-L103ã€‘

## Integration drills

1. **End-to-end presale purchase**
   - Start the API and web dev servers with sandbox Square credentials configured.
   - Complete a purchase through `/paikka`, following the redirect back to `/paikka/success`.
   - Confirm the kiosk dev build can scan the issued QR, flipping the status from unused (green) to redeemed (yellow).ã€F:local-office/apps/web/app/api/paikka/checkout/route.tsâ€ L75-L134ã€‘ã€F:local-office/apps/web/app/paikka/success/page.tsxâ€ L76-L226ã€‘ã€F:apps/api/src/routes.tsâ€ L39-L129ã€‘ã€F:apps/kiosk/src/main/electron-main.tsâ€ L300-L444ã€‘
2. **Offline kiosk simulation**
   - While the kiosk is running, disconnect the network after logging one redemption.
   - Ensure the redemption is queued in the SQLite outbox, reconnect, and watch the runtime flush the entry via `/checkin`.ã€F:apps/kiosk/src/main/database.tsâ€ L139-L217ã€‘ã€F:apps/kiosk/src/main/electron-main.tsâ€ L331-L347ã€‘ã€F:apps/api/src/routes.tsâ€ L78-L103ã€‘
3. **Key rotation and projection sync**
   - Call `/keys/current` to verify a new key is issued when none is active, then hit `/orders` with a `since` timestamp to confirm projections update. Kiosks persist both the key and the last-sync marker locally.ã€F:apps/api/src/routes.tsâ€ L15-L37ã€‘ã€F:apps/kiosk/src/main/database.tsâ€ L139-L217ã€‘ã€F:apps/kiosk/src/main/electron-main.tsâ€ L314-L329ã€‘
4. **Email resend flow**
   - From the success page, trigger the resend button and confirm the Next API bridge forwards the request to `/brevo/send`, which either queues the Brevo send or returns an error payload for logging.ã€F:local-office/apps/web/app/paikka/resend-email-button.tsxâ€ L1-L50ã€‘ã€F:local-office/apps/web/app/api/paikka/resend/route.tsâ€ L1-L33ã€‘ã€F:apps/api/src/routes.tsâ€ L54-L66ã€‘ã€F:apps/api/src/brevo.tsâ€ L1-L47ã€‘

