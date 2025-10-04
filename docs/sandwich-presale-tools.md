# Sandwich presale toolchain guide

This guide explains how the API, web checkout, and kiosk apps coordinate to sell, fulfill, and redeem presale sandwiches. Use it as a playbook when onboarding, extending menu options, or debugging production issues across the stack.

## Setup checklist

1. Copy `docs/sandwich-presale.env.example` to `.env` at the repo root and populate event, key, Square, and Brevo values before starting any service. The API reads this file automatically and enforces required keys such as `EVENT_ID` and `JWT_KID`.【F:docs/sandwich-presale.env.example†L1-L29】【F:apps/api/src/env.ts†L1-L58】
2. Install dependencies with `pnpm install` and run on Node 20.x to satisfy the workspace engines constraint.【F:package.json†L1-L106】
3. Launch each service in its own terminal (or with your preferred process manager):
   - `pnpm --filter @local-effort/api dev`
   - `pnpm --filter @local-office/web dev`
   - `pnpm --filter @local-effort/kiosk dev`
4. Provide Square sandbox credentials and Brevo template details before exercising external hand-offs. The API throws when Square credentials are missing and skips email delivery when Brevo settings are absent.【F:apps/api/src/square.ts†L12-L68】【F:apps/api/src/brevo.ts†L1-L47】
5. When rotating signing keys, either supply base64-encoded Ed25519 material through `.env` or let the API mint a new pair during startup via `ensureActiveKey`. Kiosks pull the active public key through `/keys/current` before verifying tokens.【F:docs/sandwich-presale.env.example†L13-L17】【F:apps/api/src/index.ts†L1-L34】【F:apps/api/src/keys.ts†L29-L99】【F:apps/api/src/routes.ts†L15-L37】

## Environment and shared building blocks

- The presale stack loads configuration from the root `.env`, defaulting to localhost URLs and a file-based SQLite database when optional keys are missing.【F:apps/api/src/env.ts†L1-L58】
- Shared models and token helpers ship from `@local-effort/shared`, including the `Order` shape, Crockford-style backup code generator, and Ed25519 sign/verify utilities used across all three apps.【F:packages/shared/src/types.ts†L1-L21】【F:packages/shared/src/token.ts†L1-L93】
- Menu copy, pricing, and Square SKU metadata live in the Paikka menu module so both the Next.js checkout and API validation stay aligned.【F:apps/web/app/paikka/menu.ts†L1-L33】【F:apps/api/src/orders.ts†L1-L83】

### Environment variable map

| Variable | Purpose | Default |
| --- | --- | --- |
| `EVENT_ID` | Shared event identifier for API projections and kiosk sync. | _(required)_【F:apps/api/src/env.ts†L34-L47】【F:apps/kiosk/src/main/electron-main.ts†L351-L386】 |
| `JWT_KID` | Active signing key ID persisted in the SQLite key table. | _(required)_【F:apps/api/src/env.ts†L34-L47】【F:apps/api/src/keys.ts†L29-L67】 |
| `JWT_PRIVATE_KEY_BASE64` / `JWT_PUBLIC_KEY_BASE64` | Optional Ed25519 keypair for deterministic rotation. | Auto-generated when empty.【F:apps/api/src/env.ts†L34-L47】【F:apps/api/src/keys.ts†L29-L67】 |
| `API_BASE_URL` | Base URL for inter-service requests (web → API, kiosk → API). | `http://localhost:4000`【F:apps/api/src/env.ts†L34-L47】【F:apps/web/app/api/paikka/checkout/route.ts†L15-L133】【F:apps/kiosk/src/main/electron-main.ts†L351-L386】 |
| `PUBLIC_BASE_URL` / `NEXT_PUBLIC_PUBLIC_BASE_URL` | Host used when encoding success-page redirects. | `http://localhost:3000`【F:apps/api/src/env.ts†L34-L47】【F:apps/web/app/api/paikka/checkout/route.ts†L15-L133】 |
| `NEXT_PUBLIC_API_BASE_URL` | Client-side fallback for authenticated utilities. | `/api/mock` unless overridden.【F:apps/web/lib/auth-context.tsx†L21-L74】 |
| `BREVO_API_KEY` / `BREVO_TEMPLATE_ID` | Enables transactional email delivery when present. | Email send skipped if unset.【F:apps/api/src/env.ts†L34-L47】【F:apps/api/src/brevo.ts†L1-L47】 |
| `SQUARE_ENV` | Selects sandbox or production Square environment. | `sandbox` unless set to `production`.【F:apps/api/src/env.ts†L34-L47】 |
| `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` | Required to request Square payment links. | Throws when missing.【F:apps/api/src/env.ts†L34-L47】【F:apps/api/src/square.ts†L12-L68】 |
| `PORT` | API listen port. | `4000`【F:apps/api/src/env.ts†L34-L47】【F:apps/api/src/index.ts†L1-L34】 |
| `DB_URL` | SQLite connection string for orders and keys. | `file:./data.db`【F:apps/api/src/env.ts†L34-L47】 |
| `KIOSK_DEV_SERVER_URL` | Optional renderer URL for kiosk dev builds. | Loads bundled HTML when empty.【F:docs/sandwich-presale.env.example†L23-L29】【F:apps/kiosk/src/main/electron-main.ts†L389-L444】 |

## API service (`@local-effort/api`)

- Commands: run `pnpm --filter @local-effort/api dev` for iterative development (`tsx watch src/index.ts`), `pnpm --filter @local-effort/api build` to compile TypeScript, and `pnpm --filter @local-effort/api start` to launch the compiled server.【F:apps/api/package.json†L1-L30】
- HTTP surface area lives in `routes.ts`. It exposes health checks, signing-key rotation, incremental order projection sync, order creation plus Brevo email delivery, QR PNG rendering, kiosk check-in, and the Square checkout proxy.【F:apps/api/src/routes.ts†L1-L130】
- `orders.ts` validates presale payloads, enforces unique `paymentReference` values, regenerates missing JWTs, and persists gratuity amounts alongside Crockford backup codes for kiosk lookups.【F:apps/api/src/orders.ts†L26-L172】
- Square hand-off is centralized in `square.ts`, which assembles Payment Link requests with presale pricing and optional gratuity service charges.【F:apps/api/src/square.ts†L12-L68】
- `brevo.ts` wraps transactional email delivery and gracefully skips sending when credentials are absent, surfacing HTTP failures as thrown errors.【F:apps/api/src/brevo.ts†L1-L47】
- QR rendering uses the `renderQrPng` helper to return a 256×256 PNG for kiosk scanners.【F:apps/api/src/qr.ts†L1-L9】

## Web checkout (`@local-office/web`)

- Commands: use `pnpm --filter @local-office/web dev` for local iteration, plus `build`/`start` and `lint`/Playwright `test:e2e` for production parity.【F:apps/web/package.json†L1-L35】
- The `/paikka` page enforces presale pricing, gratuity presets, and client-side validation for required customer fields before calling the Next API route.【F:apps/web/app/paikka/menu.ts†L1-L33】【F:apps/web/app/paikka/page.tsx†L1-L240】
- `app/api/paikka/checkout` validates payloads, encodes customer state for the redirect, maps SKUs to Square line items, and POSTs to the API’s `/square/checkout` endpoint.【F:apps/web/app/api/paikka/checkout/route.ts†L1-L134】
- After Square redirects back, `app/paikka/success` decodes saved state, resolves the payment reference, calls `/orders/create`, renders the receipt, and exposes the resend button for Brevo hand-off.【F:apps/web/app/paikka/success/page.tsx†L1-L226】
- The resend button posts the order/JWT pair to a Next API bridge, which forwards to `/brevo/send` on the API service.【F:apps/web/app/paikka/resend-email-button.tsx†L1-L50】【F:apps/web/app/api/paikka/resend/route.ts†L1-L33】
- Success page totals rely on the shared Paikka menu module so displayed pricing matches API validation and Square charges.【F:apps/web/app/paikka/success/page.tsx†L101-L209】【F:apps/web/app/paikka/menu.ts†L1-L33】

## Kiosk app (`@local-effort/kiosk`)

- Commands: `pnpm --filter @local-effort/kiosk dev` runs the Electron main process and Vite renderer in watch mode, while `build` orchestrates production bundles with tsup and Vite.【F:apps/kiosk/package.json†L1-L34】
- `electron-main.ts` handles runtime orchestration: it verifies QR tokens with the shared Ed25519 public key, enforces the 90-minute grace window, records redemptions, and coordinates sync cycles that fetch keys/orders and flush offline check-ins.【F:apps/kiosk/src/main/electron-main.ts†L300-L444】
- `parseArgs()` wires CLI flags (`--station-id`, `--api`, `--event-id`, `--db`, `--sync-interval-ms`) so you can package kiosk builds per venue.【F:apps/kiosk/src/main/electron-main.ts†L351-L386】
- `database.ts` seeds SQLite tables for cached orders, redemptions, offline outbox payloads, signing keys, and metadata, providing helpers for upserts, queue management, and active-key tracking.【F:apps/kiosk/src/main/database.ts†L1-L218】

## Operational playbooks

- **Provisioning keys**: Starting the API seeds the `keys` table when no active key exists or when the configured `JWT_KID` is missing, ensuring kiosks receive a valid public key from `/keys/current`. Provide base64-encoded keys in `.env` for deterministic rotations.【F:docs/sandwich-presale.env.example†L13-L17】【F:apps/api/src/index.ts†L1-L34】【F:apps/api/src/keys.ts†L29-L99】【F:apps/api/src/routes.ts†L15-L37】
- **Square checkout smoke test**: Use the `/paikka` flow to request a Square checkout link and verify `/square/checkout` returns a hosted URL; missing credentials surface as explicit API errors.【F:apps/web/app/api/paikka/checkout/route.ts†L75-L134】【F:apps/api/src/routes.ts†L104-L129】【F:apps/api/src/square.ts†L12-L68】
- **Order finalization**: After Square redirects back, the success page posts to `/orders/create`. The API enforces idempotency, regenerates missing JWTs, and triggers Brevo sends for new orders.【F:apps/web/app/paikka/success/page.tsx†L76-L209】【F:apps/api/src/routes.ts†L39-L66】【F:apps/api/src/orders.ts†L40-L172】【F:apps/api/src/brevo.ts†L1-L47】
- **Offline redemption recovery**: Kiosk outbox entries persist in SQLite and replay through `/checkin` once connectivity returns. Monitor the outbox count and sync interval flags when diagnosing delayed flushes.【F:apps/kiosk/src/main/database.ts†L139-L217】【F:apps/kiosk/src/main/electron-main.ts†L331-L347】【F:apps/api/src/routes.ts†L78-L103】

## Integration drills

1. **End-to-end presale purchase**
   - Start the API and web dev servers with sandbox Square credentials configured.
   - Complete a purchase through `/paikka`, following the redirect back to `/paikka/success`.
   - Confirm the kiosk dev build can scan the issued QR, flipping the status from unused (green) to redeemed (yellow).【F:apps/web/app/api/paikka/checkout/route.ts†L75-L134】【F:apps/web/app/paikka/success/page.tsx†L76-L226】【F:apps/api/src/routes.ts†L39-L129】【F:apps/kiosk/src/main/electron-main.ts†L300-L444】
2. **Offline kiosk simulation**
   - While the kiosk is running, disconnect the network after logging one redemption.
   - Ensure the redemption is queued in the SQLite outbox, reconnect, and watch the runtime flush the entry via `/checkin`.【F:apps/kiosk/src/main/database.ts†L139-L217】【F:apps/kiosk/src/main/electron-main.ts†L331-L347】【F:apps/api/src/routes.ts†L78-L103】
3. **Key rotation and projection sync**
   - Call `/keys/current` to verify a new key is issued when none is active, then hit `/orders` with a `since` timestamp to confirm projections update. Kiosks persist both the key and the last-sync marker locally.【F:apps/api/src/routes.ts†L15-L37】【F:apps/kiosk/src/main/database.ts†L139-L217】【F:apps/kiosk/src/main/electron-main.ts†L314-L329】
4. **Email resend flow**
   - From the success page, trigger the resend button and confirm the Next API bridge forwards the request to `/brevo/send`, which either queues the Brevo send or returns an error payload for logging.【F:apps/web/app/paikka/resend-email-button.tsx†L1-L50】【F:apps/web/app/api/paikka/resend/route.ts†L1-L33】【F:apps/api/src/routes.ts†L54-L66】【F:apps/api/src/brevo.ts†L1-L47】
