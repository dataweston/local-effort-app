# le-redesigns

Created with CodeSandbox

## Messaging/Email MVP

This app now includes a basic messaging/email foundation:

- Backend endpoints (served by `backend/api/server.js`):
	- `POST /api/messages/submit` — public inquiry form. Upserts contact to Brevo and mirrors message to Sanity.
	- `POST /api/messages/send` — team outbound email. Sends via Brevo and mirrors to Sanity.
	- `GET /api/inbox` — fetches recent messages from Sanity (filter by `status=open`).
	- `POST /api/campaigns/save` — saves a draft campaign (HTML) to Sanity.
	- `POST /api/push/subscribe` — save a web push subscription to Sanity.
	- `POST /api/push/notify` — send a test push to all subscribers.

- Frontend pages:
	- `/inbox` shows a minimal inbox list.
	- `/campaigns` has a basic HTML editor placeholder (swap with EmailBuilder.js later).
	- A floating “Support” widget is mounted to every page with quick FAQ and an email form.

### Environment variables (server)

Set these in your hosting provider (do NOT prefix with VITE_):

- `BREVO_API_KEY` — required for email sending
- `SENDER_EMAIL` — default from address (also set a Brevo sender)
- `SUPPORT_INBOX_EMAIL` — team inbox to receive new inquiries
- `SANITY_PROJECT_ID` — your Sanity project id (matches studio)
- `SANITY_DATASET` — dataset (default `localeffort`)
- `SANITY_API_TOKEN` — token with write access (to create docs)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — for image search and future media
- `FIREBASE_SERVICE_ACCOUNT_JSON` — JSON for admin SDK (for future features; optional)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — for web push

Client-side env vars remain under `VITE_*` and should not include secrets.

### Notes

- Ensure Vercel `vercel.json` routes include the catch-all to `backend/api/server.js` (already present).
- Sanity schemas added: `contact`, `message`, `campaign`, `pushSubscription`. Run `sanity deploy` in `studio/` to apply.
- Replace the `/campaigns` page editor with EmailBuilder.js when ready.

