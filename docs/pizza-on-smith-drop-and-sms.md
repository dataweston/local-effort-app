# Pizza on Smith drop mechanics and SMS plan

Owner: Local Effort Cooperative
As of: 2026-10-16
Review by: 2026-11-13, or when the Twilio account is approved, whichever is first.
System of record: Sanity doc `pizza-on-smith-page` (window, fulfillment label, copy) and Sanity manual inventory (quantity caps).

## What is live (built, not deployed unless the release says so)

- **Window.** `dropOpensAt`, `dropClosesAt`, `fulfillmentLabel` live on the Sanity page doc. The server (`api-handlers/store/_pizzaDrop.js`) and the page read the same values; checkout returns 409 `ordering-window-closed` outside the window. The generated JSON snapshot is only an outage fallback.
- **Banner.** `DropBanner` shows the upcoming, open, last-call and closed states with a countdown, plus the fulfillment week. Sold-out states come from Sanity manual inventory.
- **Quantity limit.** Set per product with `node scripts/set-pizza-on-smith-drop.cjs --cap <product-id>=<qty>` (dry run until `--apply`). No caps are applied yet; the owner chooses the numbers.
- **Admin.** `/admin/pizza-on-smith` shows drop status, pick list by pickup/delivery/shipping, orders to do, and sends the method-specific "ready / on its way / shipped" email. Shipping requires a tracking number. Failed or dead-lettered notices show a Retry button.
- **Ready email.** Transactional (`pizza-on-smith-ready` source). It goes through the durable outbox, ignores marketing unsubscribes, and still respects bounces, complaints and suppressions.

## Manual sale confirmations without a worker

In `/admin/pizza-on-smith`, open the paid order and choose **View confirmations**. Review the saved recipients, subject and original message separately for the customer and owner; copied recipients are also shown. Viewing and refreshing never send.

Choose **Send customer confirmation** or **Send owner confirmation**, then confirm the named recipients. The authenticated request processes only that role's durable job immediately through Brevo, without the scheduled worker or unrelated queued messages. This is a purchase confirmation, not the ready/shipped action; it does not change fulfillment status.

The API requires the order's owned, succeeded Square payment and original purchase-time confirmation snapshots. It preserves an existing job's content and stable payment/role key, repairs a missing selected job from its snapshot, and never recharges a payment or resends a job already accepted by the provider. Failed jobs expose their error and a **Retry** control; if Brevo/configuration is unavailable, the job remains recoverable and needs another manual retry while the worker is down. A processing job cannot be manually resent while its claim is active.

Status `sent`, its timestamp and provider message ID mean Brevo accepted the message, not that it reached the recipient's inbox. Owner-only sample verification and explicit recipient approval still apply before real sends; the browser confirmation is not a substitute for those approvals.

Verification: 35 focused sales tests passed. A finite local run exercised the real router and outbox against revision-aware in-memory storage and a simulated provider: read-only preview, one-role send, sent replay, provider failure/manual retry, unrelated jobs untouched, and unchanged fulfillment. The actual admin component was viewed at desktop/mobile sizes with synthetic order/API fixtures and the CMS-generated drop snapshot; cancel/send/retry and accepted-state controls were exercised. No external messages or production writes occurred. The new manual path has not been deployed or verified through real owner-only Brevo sends; the scheduler outage remains separate.

## SMS and RCS: not built

Blocked on a Twilio account and owner approval. Nothing here may message a real person until the owner has received the exact message on their own phone and approved each recipient group.

**Provider:** Twilio, one account for SMS, MMS and RCS (about $0.01 to $0.02 per message plus carrier fees; US A2P 10DLC brand and campaign registration is required before volume sending).

### Build order once approved

1. **Subscriber capture.** A "Text me when the next drop opens" field on the Pizza on Smith page. Needs the `website` honeypot and server-side rate limiting like `backend/api/routes/messages.js`. Store phone (E.164), consent text shown, timestamp, page URL, and IP hash.
2. **Consent.** Consent is explicit, unchecked by default, and separate from the order checkout. Order-form `smsReleaseOptIn` is limited to order-ready texts and is not marketing consent.
3. **Outbox.** Mirror the email outbox: persisted jobs, stable idempotency keys per recipient and message, retry, dead-letter surfacing, delivery evidence from Twilio status callbacks.
4. **Twilio webhook.** Verify the Twilio signature with a timing-safe check. Handle STOP/START/HELP and status callbacks. STOP is honored immediately and permanently across all marketing texts.
5. **Quiet hours.** No marketing texts before 9 am or after 8 pm Central.
6. **Lifecycle sends.** Each message names Local Effort, says what it is, and ends with "Reply STOP to opt out":
   - Waitlist: "Drop opens Oct X at 9 am."
   - Open: link plus close date.
   - Mid-window: remaining quantity, only if true.
   - Closing soon (24 hours) and last call (3 hours), to subscribers who have not ordered.
   - Ready for pickup / out for delivery / shipped: to purchasers who opted in to order texts. The email still goes out regardless.
7. **Dry run.** Send each template to the owner's phone and verify links, STOP and HELP before any real send.

## Known gaps

- Twilio account, 10DLC registration and owner approval: not done.
- Inventory caps: not applied.
- Refunded orders: the admin report filters on `status: 'paid'`; no refund status is written by the current order code, so a refunded order would still count.
