---
applyTo: "**/*"
---

All sales modules, existing and future, require Brevo customer confirmations and owner notifications after verified successful payment, without exception. Square receipts do not replace them. Follow AGENTS.md's Sales confirmation emails contract: persisted idempotent jobs, retry/delivery evidence, actual fulfillment details, reply contact, and real owner-only tests. No sales feature is complete while confirmation is absent or unverified. Do not send to customers during testing.

Implementation contract:
- Preserve each module's existing customer and business payloads; durability is not a reason to replace its fulfillment details or copy.
- Persist purchase facts and an owned payment-attempt anchor before creating a charge or hosted checkout link. Save the Square order ID so authenticated completed-payment webhooks can reconcile hosted purchases.
- Snapshot confirmation content independently of Brevo API-key availability. Queue failures must remain recoverable; provider configuration outages must not permanently erase required messages.
- Use the shared durable outbox with stable payment/role keys. Both direct checkout and UCP completion must receive the outbox dependency; webhook replay must repair missing jobs without creating duplicate messages.
- Gift-card recovery must resume the original idempotent card creation/activation before queueing code-bearing confirmations. Never recharge a captured payment to repair fulfillment.
- Verify the worker schedule against the hosting plan before release. A configured cron is not evidence that retries actually run.
- Owner-approved sample appearance does not authorize customer delivery or deployment. Report remaining approval/configuration blockers separately from local test results.
