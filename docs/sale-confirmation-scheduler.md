# Sale-confirmation delivery status

Owner: Local Effort Cooperative  
As of: 2026-10-13  
Review by: Before any production release that can create sales

There is currently no verified scheduled worker for the durable sale-confirmation outbox. The GitHub Actions scheduler was removed at the owner's request. Its recent scheduled run failed before starting because the GitHub account was locked due to a billing issue. The Vercel Hobby plan does not support the required five-minute sale-confirmation cron.

The outbox still persists idempotent customer and owner confirmation jobs and retry state, but those jobs are not guaranteed to be processed without an operational worker. Do not deploy a sales change or treat a sale flow as complete until an approved worker schedule is restored and a successful scheduled run plus delivery evidence are verified. Do not replace this requirement with Square receipts or browser success pages.

The Pizza on Smith customer confirmation uses the supplied Cloudinary image transformed to JPEG. An owner-only sample of the customer and owner emails was sent through the durable outbox on 2026-10-13; both were delivered to the owner inbox, the customer-style email rendered the image, and neither appeared in spam. No customer was contacted. Owner approval for real customer delivery is still pending.

Testing must use owner-only recipients; never send test messages to customers. Any future schedule must call the authenticated `/api/email/sale-confirmations/process` endpoint and preserve the durable outbox's retry and delivery-evidence behavior.
