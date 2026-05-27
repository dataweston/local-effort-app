# Element Community Tool Spec

## Context

The current app already has the right business surface for a Local Effort community/team tool:

- `HubPage` shows role-scoped spaces, today's actions, object threads, and the admin brain inbox.
- `SubscriberPortalPage` owns customer identity, weekly menus, feedback, profile data, linked accounts, and note-to-chef messaging.
- `BrainPortalPage` supports public share-token feedback flows.
- `BrainBrowserPage` gives admins graph/entity review, provenance lookup, and provisional assertion triage.
- `AdminWeeklyOrderPage` runs the weekly order operating system: menu ingest, dish catalog, weeks, pricing, plans, overrides, logs, and prep lists.
- `api-handlers/hub/*` and `packages/shared/src/hub.ts` define the current Hub contract: spaces, planned objects, actions, threads, captures, feedback, check-ins, and today views.

Element should become the realtime communication layer behind those surfaces, not a wholesale replacement for them.

## Product Goal

Create a community/team tool where subscribers, staff, vendors, volunteers, and admins can talk in the right context while the Local Effort app keeps operational truth: menus, plans, tasks, feedback, customer state, and brain knowledge.

## Architecture

Keep this repository as the system of record for:

- Supabase login and role resolution.
- Customer/profile/weekly-order data.
- Hub spaces and object-to-thread context.
- Brain inbox capture and entity graph workflows.
- Matrix integration workers/API handlers.

Run Element Server Suite separately on Kubernetes via `infra/element-ess`, with these responsibilities:

- Matrix homeserver and room federation policy.
- Element Web client.
- Account/auth service when OIDC/SSO is enabled.
- Media storage, push, and call/RTC services.

## Identity Model

Phase 1:

- Supabase remains app login.
- Matrix accounts are provisioned server-side for users who need chat.
- Store Matrix user IDs on local users/customers through a Prisma migration.
- Use a server-side bot/application-service token to create rooms, invite users, and bridge messages.

Phase 2:

- Evaluate OIDC from Supabase/Auth0/another identity provider into Matrix Authentication Service.
- Add account linking and deprovisioning flows.

## Room Model

Map Hub spaces to Matrix spaces:

- Customer household: one private Matrix room per customer or household.
- Staff operations: private staff room plus focused rooms for prep, delivery, events, and admin.
- Object rooms: optional contextual rooms for high-value objects like a menu week, event, vendor order, or prep shift.

Map Hub object threads to Matrix rooms only when realtime collaboration is useful. Keep lightweight app-only threads for simple notes.

## Data Flow

Outbound from app to Matrix:

- Admin creates or updates a Hub space.
- Server integration creates/updates Matrix room and membership.
- Hub thread messages from `ObjectThreadMessage` are mirrored to Matrix when the thread is bridged.
- Weekly-order events can post concise bot updates to customer/staff rooms.

Inbound from Matrix to app:

- Matrix webhook/sync worker receives room events.
- Known bridged rooms write messages into `ObjectThreadMessage`.
- Messages with capture intent or admin commands write to `HubCapture` or `BrainInboxItem`.
- Staff/admin-only rooms can create planner cards, check-ins, or brain inbox items after review.

## API Work

Add a server-only integration layer:

- `backend/api/matrix/client.js`: Matrix client wrapper.
- `backend/api/matrix/provisioning.js`: users, rooms, spaces, invites.
- `backend/api/matrix/bridge.js`: event sync and idempotent mirror writes.
- `api-handlers/hub/matrix-link.js`: admin endpoint to link a Hub space/thread to Matrix.
- Prisma fields/tables for Matrix IDs, room links, event cursors, and mirrored event IDs.

## UI Work

Phase 1:

- Add "Open in chat" actions to Hub space/thread headers when a Matrix room is linked.
- Add admin-only room-link status to Hub space/thread details.
- Keep customer note-to-chef inside the subscriber portal, but mirror it to the right Matrix room for staff.

Phase 2:

- Embed Element Web or a Matrix timeline panel only where it improves the workflow.
- Add room notifications/unread counts to Hub spaces.
- Add capture actions from chat messages into brain inbox.

## Privacy And Permissions

- Customers can only see their household/customer rooms and customer-visible object rooms.
- Staff rooms must never expose customer profile fields unless the room is explicitly scoped to that customer.
- Admin/brain rooms are admin-only.
- Matrix media retention and export policy must match customer privacy expectations.
- Log Matrix event IDs and metadata, not full message bodies, in operational logs.

## Milestones

1. Deploy Element ESS to a staging domain with `infra/element-ess` values.
2. Add Prisma schema for Matrix account/room links and event idempotency.
3. Build server-side Matrix client and provisioning smoke script.
4. Link one admin/staff Hub space to one Matrix room.
5. Mirror subscriber note-to-chef messages to Matrix and inbound staff replies back to `ObjectThreadMessage`.
6. Add Hub UI status/open-chat controls.
7. Add brain capture from selected Matrix messages.
8. Decide whether to enable OIDC/SSO for production.

## Open Decisions

- Permanent Matrix server name.
- Kubernetes provider and ingress class.
- Object storage provider for media.
- Whether federation is disabled for a private community or selectively allowed.
- Whether customers use Element Web directly or only the Local Effort portal at first.
- Retention policy for customer and staff chat history.
- Whether Matrix becomes the primary notification path or stays supplemental to email/SMS/push.

