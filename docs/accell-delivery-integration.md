# Accell delivery integration

Status as of 2026-07-19: **existing Courie.ai account; manual dispatch; API access not yet documented publicly**.

## Verified surface

- Accell's official ordering page: <https://accell.co/order/>
- Accell sends account holders to a branded Courie.ai portal: <https://portal.courie.ai/accell/welcome/login>
- Accell supports scheduled, catering, and multi-stop route delivery, with tracking and proof of delivery.
- Courie.ai advertises APIs and integrations, but no public endpoint or authentication reference was found. Do not infer endpoints from the browser application.
- Gmail confirms Local Effort has used the portal for Happy Monday deliveries and receives create, in-transit, delivered, and tracking-number notifications.
- The latest two Accell invoices located were both $40.61. Use that only as a provisional route-cost forecast until a Friday order is quoted.

## Activation requirement

Ask Accell (info@accell.co or the account representative) for:

1. Courie API documentation and a sandbox/test account.
2. Server-to-server credentials and production base URL.
3. Create, quote, cancel, status, tracking, and proof-of-delivery operations.
4. Idempotency behavior, webhook signing, rate limits, retry rules, and support contacts.
5. Whether recurring Friday multi-stop routes should be represented as route templates or individual orders.

No delivery should be created automatically until a test order is placed to an owner-controlled destination, tracking and cancellation are verified, and the owner approves production use.

## Proposed Local Effort contract

Keep provider-specific fields behind an adapter. The planner should send:

```json
{
  "externalId": "happy-monday-YYYY-MM-DD-stop-N",
  "service": "scheduled-route",
  "readyAt": "ISO-8601 timestamp",
  "deliverBy": "ISO-8601 timestamp",
  "pickup": { "name": "", "address": "", "contact": "" },
  "dropoff": { "name": "", "address": "", "contact": "" },
  "items": [{ "description": "", "quantity": 1 }],
  "instructions": "",
  "idempotencyKey": ""
}
```

The adapter should persist the provider job ID, quoted cost, status, tracking URL, proof-of-delivery reference, and the last webhook timestamp. Credentials belong only in environment variables; never in planner notes or source control.
