# Local Office Worker

Node.js worker powered by BullMQ that will handle asynchronous tasks such as batching, label generation requests, webhook delivery, and invoice preparation.

## Planned queues
- `batcher` for cutoff processing
- `labels` for PDF/ZPL generation
- `dispatcher` for delivery job orchestration
- `notify` for email/SMS
- `invoice` for closeout and Square invoice creation
- `webhook-out` for outbound webhook retries
