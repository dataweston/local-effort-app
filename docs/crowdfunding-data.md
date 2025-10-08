# Crowdfunding data flow

The crowdfunding experience relies on a small set of Firestore collections and
documents. Use this guide as a checklist when you need to verify that sales are
being recorded correctly.

## Square webhook (`/api/square/webhook`)

* Writes an order document for each completed Square payment to
  `orders/{squarePaymentId}` with the quantity, amount, and source metadata.
  The handler lives in `api/square/webhook.ts` and delegates persistence to the
  shared pipeline helper. 【F:api/square/webhook.ts†L79-L123】
* Maintains a backer profile at `backers/{customerId}` so repeat supporters are
  tracked and counted correctly. 【F:api/square/webhook.ts†L101-L118】
* Updates the aggregate totals at `aggregates/crowdfunding`, incrementing the
  pizza count and distinct backer total, and setting a fresh `updatedAt`
  timestamp. 【F:api/square/webhook.ts†L120-L130】

## Crowdfunding summary API (`/api/crowdfunding/summary`)

* Returns the sanitized contents of `aggregates/crowdfunding`, falling back to
  zero totals when the document is missing. 【F:api/crowdfunding/summary.ts†L1-L51】
* Disables caching so the crowdfunding page always renders the most recent
  numbers. 【F:api/crowdfunding/summary.ts†L39-L45】

## Legacy confirmation flow (`/api/crowdfund/confirm-payment`)

* After the hosted checkout redirects back, the legacy endpoint increments the
  pizza count stored at `crowdfund/status`, appending the supporter name for the
  marquee ticker. 【F:backend/api/routes/crowdfunding.js†L88-L141】
* The same document is surfaced through the serverless version at
  `/api/crowdfund/status`. 【F:api/crowdfund/status.js†L1-L33】

Between these endpoints and documents you can trace every sale from the Square
webhook all the way to the numbers displayed on the crowdfunding landing page.

