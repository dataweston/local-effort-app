# Crowdfunding data flow

Most crowdfunding sales are captured directly from the
`/crowdfunding` page through the embedded Square card form. That flow updates a
single Firestore document (`crowdfund/status`) and an optional feedback
collection. This guide explains how to verify those writes and where any legacy
or optional data ends up.

## Real-time checkout (`/api/crowdfund/checkout`)

* Runs when a supporter enters card details on the crowdfunding page. The
  handler charges Square using the generated token and then records the result
  in Firestore if the admin SDK is available. 【F:api/crowdfund/checkout.js†L5-L68】
* The pizza counter and ticker copy live at `crowdfund/status`. Each successful
  checkout increments `pizzasSold` and appends a new entry to the `funders`
  array. Entries are plain text (name, email/phone/notes, timestamp) so you can
  audit sales directly in the Firebase console. 【F:api/crowdfund/checkout.js†L33-L63】

### How to view current sales in Firebase

1. Open the Firebase console, choose **Firestore Database → Data**, and select
   the `crowdfund` collection.
2. Click the `status` document. The top-level `pizzasSold` field reflects the
   live pizza total shown on the site. Expand the `funders` array to see each
   contribution in plain text along with the ISO timestamp that was recorded.
3. The pizza feedback widget stores comments at `crowdfund_feedback`. Each
   document includes the supporter name, rating, message, and timestamp so you
   can review the submissions as they appear on the page.

## Crowdfunding summary API (`/api/crowdfunding/summary`)

* The client polls this endpoint for live totals. It now prioritizes
  `aggregates/crowdfunding` (if the Square webhook pipeline is running) and
  automatically falls back to `crowdfund/status` so on-page checkouts are
  reflected even when the aggregate collection does not exist. 【F:packages/lib/crowdfundingPipeline.js†L187-L256】
* The response includes `pizzas`, `backers`, `goal`, and `updatedAt`, with
  caching disabled so the UI always renders the freshest numbers.
  【F:api/crowdfunding/summary.ts†L1-L45】

## Optional Square webhook (`/api/square/webhook`)

* When configured, Square can push completed payments to this endpoint. The
  webhook populates richer bookkeeping documents—`orders/{paymentId}` and
  `backers/{customerId}`—and maintains a running aggregate at
  `aggregates/crowdfunding`. 【F:api/square/webhook.ts†L79-L146】
* These collections are not required for the crowdfunding page to function, so
  they may be empty in environments where the webhook is disabled.

## Legacy confirmation flow (`/api/crowdfund/confirm-payment`)

* Hosted Square checkout links (when enabled) still post back to this endpoint
  after a supporter returns to the site. It uses the same `crowdfund/status`
  document to increment `pizzasSold` and append the funder details, ensuring the
  ticker stays in sync regardless of payment method.
  【F:api/crowdfund/confirm-payment.js†L1-L68】

Between the `crowdfund/status` document and the optional webhook data you can
trace every sale in plain text, whether it happened through the embedded card
form or a hosted Square checkout link.

