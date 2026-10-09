---
applyTo: "**/*"
---

All sales modules, existing and future, require Brevo customer confirmations and owner notifications after verified successful payment, without exception. Square receipts do not replace them. Follow AGENTS.md's Sales confirmation emails contract: persisted idempotent jobs, retry/delivery evidence, actual fulfillment details, reply contact, and real owner-only tests. No sales feature is complete while confirmation is absent or unverified. Do not send to customers during testing.
