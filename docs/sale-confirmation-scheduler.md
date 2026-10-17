# Sale-confirmation delivery status

Owner: Local Effort Cooperative  
As of: 2026-10-16  
Review by: Before any production release that can create sales

There is currently no verified scheduled worker for the durable sale-confirmation outbox. The GitHub Actions scheduler was removed at the owner's request. Its recent scheduled run failed before starting because the GitHub account was locked due to a billing issue. The Vercel Hobby plan does not support the required five-minute sale-confirmation cron.

The outbox still persists idempotent customer and owner confirmation jobs and retry state, but those jobs are not guaranteed to be processed without an operational worker. By default, do not deploy a sales change until an approved worker schedule is restored and a successful scheduled run plus delivery evidence are verified. The owner explicitly authorized deployment despite this known worker outage on 2026-10-13; follow the owner-authorized worker-outage exception in AGENTS.md without requesting the same approval again. The outage remains unresolved, and sale flows must not be described as end-to-end verified. Do not replace required confirmations with Square receipts or browser success pages.

The local Pizza on Smith admin now includes an explicit per-order **View confirmations** control and separate customer/owner send/retry actions, documented in `pizza-on-smith-drop-and-sms.md`. An authorized request immediately processes only the selected original durable job without a worker. This is a manual recovery path, not a scheduler: failures still require an operator retry while scheduled processing is unavailable. It has local simulated-provider runtime and desktop/mobile browser proof, but is not deployed and has no new real owner-only Brevo verification or customer-send approval.

The Pizza on Smith customer confirmation uses the supplied Cloudinary image transformed to JPEG. An owner-only sample of the customer and owner emails was sent through the durable outbox on 2026-10-13; both were delivered to the owner inbox, the customer-style email rendered the image, and neither appeared in spam. No customer was contacted. Owner approval for real customer delivery is still pending.

Owner checkout-failure alerts (`source: checkout-failure-alert`, `api-handlers/store/_failureAlert.js`) use the same outbox. One immediate send is attempted when a failure is recorded; a failed first send is retried only when a worker runs, so the same outage applies. The failure itself is always in the Brain ledger (`node scripts/checkout-failures.cjs`).

Testing must use owner-only recipients; never send test messages to customers. Any future schedule must call the authenticated `/api/email/sale-confirmations/process` endpoint and preserve the durable outbox's retry and delivery-evidence behavior.
