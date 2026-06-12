# Crowdfunding pipeline overview

This document summarizes how Square payments flow into Firestore and surface on the `/crowdfunding` page.

## Data flow

1. **Square webhook** (`/api/square/webhook`)
   - Verifies the Square HMAC signature using `SQUARE_WEBHOOK_SIGNATURE_KEY` and `SQUARE_WEBHOOK_NOTIFICATION_URL`.
   - Ignores non-payment events and payments that are not `COMPLETED`.
   - Extracts pizza line-item quantity and total amount, then runs a Firestore transaction that:
     - Writes a new `orders/{paymentId}` document.
     - Upserts `backers/{customerId}` with aggregated counts and totals.
     - Updates `aggregates/crowdfunding` totals (`pizzas`, `backers`, `updatedAt`).
   - Duplicate webhook deliveries are ignored via the `orders/{paymentId}` existence check.

2. **Crowdfunding summary API** (`/api/crowdfunding/summary`)
   - Returns the latest `pizzas`, `backers`, and `updatedAt` fields from `aggregates/crowdfunding`.
   - Sets `Cache-Control: no-store` to avoid CDN caching.

3. **Crowdfunding page** (`src/pages/CrowdfundingPage.jsx`)
   - Uses `swr` to fetch `/api/crowdfunding/summary` on mount and every 30 seconds.
   - Merges live totals with Sanity baseline data for display resilience.

4. **Feedback API** (`/api/feedback`)
   - `POST` validates a 1–5 `rating` and up to 2000-character `comment`, then writes to `feedback/{docId}`.
   - `GET` returns recent feedback since a timestamp (defaults to the last 7 days).
   - The crowdfunding page submits ratings and loads recent comments from this endpoint.

5. **Firestore rules** (`firestore.rules`)
   - Allow public read access only to `aggregates/crowdfunding`.
   - Lock down all other collections (including `feedback`) for server-side access via the Admin SDK.

## Backfill script

`scripts/backfillSquare.ts` iterates through the Square Payments API and reuses `applyCompletedPayment` to reconcile historical transactions. Provide `SQUARE_ACCESS_TOKEN`, `SQUARE_ENV`, and Firebase Admin credentials, then run with `ts-node` or compile via `tsc`.

## Environment variables

Set the following (matching client/server project IDs):

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SQUARE_ENV=production
SQUARE_ACCESS_TOKEN=EAAA...
SQUARE_WEBHOOK_SIGNATURE_KEY=...
SQUARE_WEBHOOK_NOTIFICATION_URL=https://<domain>/api/square/webhook
APP_ENV=production
```

Ensure `FIREBASE_PROJECT_ID` equals `NEXT_PUBLIC_FIREBASE_PROJECT_ID` to prevent mismatches.

## Testing checklist

- `POST /api/square/webhook` with a valid signature updates `orders`, `backers`, and `aggregates/crowdfunding` once.
- Replaying the same webhook leaves totals unchanged.
- `GET /api/crowdfunding/summary` reflects the latest aggregate counts.
- `POST /api/feedback` accepts ratings 1–5 and truncates comments at 2000 characters.
- `/crowdfunding` shows live totals within a few seconds of a new payment.
