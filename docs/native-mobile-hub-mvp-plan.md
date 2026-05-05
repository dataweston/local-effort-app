# Native Mobile Hub MVP Plan

## Product Read

The current subscriber portal is the member-facing narrow version of the broader product:

- `This Week` becomes a native `Today` surface.
- `Past Menus` becomes member history across menus, RSVPs, shifts, events, and feedback.
- `DishFeedback` becomes object feedback for dishes, events, resources, and shifts.
- `ChefNote` proves the private staff-routed message use case, but it is not a general thread model.
- `Profile` and linked accounts become identity, household/team access, roles, and notification preferences.

`WeeklyDemoPage.jsx` is the operator-facing narrow version:

- `Daily / Weekly / Monthly` views become the native planning horizon.
- The top financial totals become capacity and consequence signals, not just accounting.
- `GoogleCalendarSync` points toward calendar interoperability as a first-class product primitive.
- `RecurringChangeDialog` maps to recurring event, shift, menu, and prep-list changes.
- The admin `BrainInbox` quick capture becomes the app-wide inbox for notes, tasks, vendors, guests, and schedule changes.
- Auth mode already distinguishes demo/public experience from persisted/admin experience.

The native app should not start as a generic community feed. It should start as an operational daily hub for people who need to know what changed, what they owe, where to be, what needs to be planned, and which private or shared spaces they can enter.

## Product Shape

One React Native app for iPhone and Android, with shared domain models and platform-specific navigation polish.

Feature split should be role-based, not platform-based. iPhone and Android should both support member, staff, vendor, volunteer, and admin/operator workflows. Any preview that shows iPhone as member and Android as operator is only using two device frames to compare roles; it is not a product rule.

Core tabs:

- `Today`: due tasks, upcoming schedule objects, unread critical changes, quick feedback.
- `Calendar`: daily/weekly/monthly schedule, event objects, shifts, time blocks, capacity.
- `Spaces`: gated groups such as household, VIP customers, staff, vendors, volunteers.
- `Threads`: object-bound conversations with visible access labels.
- `Docs`: SOPs, menus, allergy policies, run-of-show, delivery notes, resource acknowledgements.
- `Profile`: linked accounts, dietary profile, roles, history, notification settings.

## Reference Translation

- Lark: messages can produce actions such as tasks, approvals, reminders, and schedule changes.
- Todoist: daily action list, quick capture, due dates, assigned work, and clean completion states.
- Cinny/Matrix: spaces and rooms model gated community boundaries better than one global chat feed.
- Heartbeat: growth path into memberships, public/private events, courses, documents, payments, access groups, workflows, and member discovery.
- Amazing Marvin: use a task funnel instead of showing everything at once: inbox/backlog, planned month/week, orbit/relevant, today, now/focus.
- Morgen: the calendar should be beautiful and operational, with reusable work frames such as prep, service, admin, pickup, and deep work.
- Akiflow: prioritize fast capture, inbox processing, natural-language task/event creation, daily/weekly rituals, and a mobile calendar-first execution view.

## Weekly Planner Translation

The weekly planner suggests the app needs two connected surfaces:

- Member surface: current menu, event RSVP, payment state, feedback due, staff note/object thread, pickup/delivery instruction.
- Operator surface: schedule card, staffing, prep tasks, COGS/labor/capacity, recurring changes, calendar sync, quick capture, inbox triage.

Shared object model:

```txt
planned_object
  type: menu_week | event | shift | prep_task | resource | note | vendor | guest_request
  horizon: inbox | someday | month | week | today | now
  visibility: customer | household | staff | vendor | volunteer | guest | admin
  schedule_status: unscheduled | planned | time_blocked | checked_in | completed | deferred
  source: subscriber_portal | weekly_planner | brain_inbox | calendar | manual
```

This keeps community, customer service, and operations in one system without collapsing their permissions.

## Existing Model Gaps

The current codebase is close enough to validate the product, but not close enough to wire the mobile app directly without migrations.

### Threads

`ChefNote` is useful legacy evidence, not the thread foundation. The current model is:

```txt
ChefNote
  userId
  customerId
  message
  createdAt
```

It has no `objectId`, `objectType`, `threadId`, participant model, visibility, group boundary, or message status. Before mobile threads are connected, add an object-thread layer:

```txt
ObjectThread
  id
  organizationId
  spaceId
  objectType
  objectId
  visibility
  title
  createdBy
  createdAt
  updatedAt

ObjectThreadMessage
  id
  threadId
  senderId
  senderRole
  body
  attachments
  createdAt
  editedAt
  deletedAt
```

Migration path: import or mirror current `ChefNote` rows as messages attached to the relevant customer/profile or menu-week thread, but do not keep building new behavior directly on `ChefNote`.

### Inbox Context

`BrainInboxItem` is currently adequate for admin-only triage. It does not have `organizationId`, `spaceId`, `objectId`, `objectType`, `visibility`, `actorId`, `actorRole`, or `offlineQueueId`.

Before staff/member capture opens up, add those fields or introduce a `HubCapture` table that writes a ledger event first and then optionally creates a `BrainInboxItem` for review.

### Hub Routes

No `/api/hub/*` routes exist yet. They should be treated as real backend implementation work, not just contract documentation.

`GET /api/hub/today` is a composition endpoint. It will need to join or adapt:

- active weekly menu and cutoff state
- current order/payment state
- pending feedback
- private staff/customer notes or object threads
- calendar events and shifts
- weekly planner cards
- Brain Inbox items for operator/admin views
- notification/change summaries

This route should be implemented before the native app depends on multiple low-level web routes.

## Knowledge / Context Graph Strategy

The existing Brain architecture should become the data-quality backbone of the native hub.

Current useful primitives:

- `LedgerEvent`: immutable source event. This should remain the first write for every capture, order, RSVP, check-in, shift claim, feedback event, and message-derived action.
- `BrainInboxItem`: holding queue for uncertain or unprocessed context.
- `BrainEntity`: durable navigable things such as Customer, Vendor, Dish, Ingredient, Menu, Task, Note, Event, Payment, Order, Feedback, Decision, Recipe, Batch.
- `BrainAssertion`: typed relationship between durable entities, validated against `relationshipDictionary.js`.
- `BrainInference`: computed signal with confidence, decay, stale/supersede handling.
- Neo4j: read-side projection for graph analytics and contextual suggestions, not the operational source of truth.

Ledger and graph writes should stay separate:

- `capture_intent` is a user/interface hint.
- `LedgerEvent.eventType` is the canonical event taxonomy.
- A small translation table should map capture intent plus context into event types such as `hub.note_captured`, `hub.task_captured`, `hub.feedback_submitted`, `hub.checkin_recorded`, or `hub.schedule_change_requested`.

Mobile capture should write a compact context envelope with every item:

```txt
source
source_id
actor_id
actor_role
organization_id
space_id
object_id
object_type
visibility
occurred_at
raw_content
attachments
client_created_at
offline_queue_id
capture_intent: note | task | event_change | vendor | feedback | checkin | payment | resource
```

Efficient capture rules:

- Capture fast, but resolve slowly.
- Use one stable idempotency key per client action: `source + source_id` for server-known source events, or `source + offline_queue_id` for mobile-created events. A retry must reuse the same key until the server acknowledges it.
- Use canonical names, aliases, and semantic search before creating a new entity.
- Prefer object-bound capture: a note taken inside an event, shift, menu week, customer profile, or vendor profile should inherit that context automatically.
- Batch low-risk mobile writes locally and sync when online.
- If a write succeeds server-side but the client misses the acknowledgement, the retry should return the original ledger event/result instead of creating a second event.
- Ask for the minimum missing field needed to route the item, not a full form.

Accuracy rules:

- Ledger events are facts about what was observed; graph assertions are the current interpretation.
- Direct mobile extraction should create provisional assertions unless the source is structured and deterministic.
- Low-confidence or conflicting extraction goes to Brain Inbox review.
- Every assertion should preserve provenance: source event, source app, actor, timestamp, and confidence.
- Relationship dictionary warnings should be visible in review, not hidden in logs.
- Facts with lifecycle, money, line items, status, or multiple participants should be promoted into event/artifact nodes instead of compressed into a single edge.

Immediate graph extensions to consider before relying on hub writes:

```txt
Task ASSIGNED_TO Person|Customer|Vendor|StaffRole|Group
Task ATTACHED_TO Event|Menu|Shift|Resource|Customer|Vendor|Order
Person RSVP_TO Event
Person CHECKED_IN_TO Event|Shift
Person ACKNOWLEDGED Resource
Event BELONGS_TO Group
Shift SCHEDULED_FOR Event|Group
Note ABOUT *
```

This gives the native app a precise way to gather operational context without becoming a noisy note bucket.

## MVP Scope

Phase 1 should implement:

- Supabase project, user model, JWT verification, and role rules reused from the web app.
- React Native auth implemented separately with Expo AuthSession/deep links and AsyncStorage-backed session persistence.
- Push token registration immediately after auth/profile setup, with permissions handled gracefully.
- Customer/member profile from the weekly order portal.
- Today API composed from active menu week, order state, pending feedback, object threads or legacy ChefNote evidence, and events/shifts.
- Planner API composed from weekly planner cards, recurring changes, calendar objects, and Brain Inbox items.
- Capture API that writes ledger-first and returns routing/entity suggestions before graph mutation.
- Spaces list from customer/group memberships.
- Object detail screen for `menu_week`, `event`, `shift`, and `resource`.
- Calendar screen with `day`, `week`, and `month` modes.
- Inbox screen or drawer for unprocessed notes/tasks, initially admin-only.
- Object thread model and API. Existing `ChefNote` can seed the use case, but should not be the long-term storage model.

Out of scope for the first build:

- Marketplace discovery.
- Full course builder.
- Complex paid offers.
- Matrix federation.
- Native desktop.

## First Engineering Slice

1. Keep the route-level web prototype as IA/data-shape validation.
2. In parallel, create the React Native / Expo shell with the same static mock data.
3. Define shared response shapes for `today`, `calendar`, `spaces`, `objects`, `threads`, `capture`, and `notifications`.
4. Add database migrations for object threads and mobile capture context.
5. Add relationship dictionary entries needed by task, RSVP, check-in, acknowledgement, event, shift, and object-bound note flows.
6. Implement `/api/hub/today` as the first composition endpoint.
7. Implement React Native auth, deep-link callback handling, secure session storage, profile load, and push token registration.
8. Connect `Today` to real weekly-order portal data.
9. Connect `Calendar` to weekly planner objects.
10. Connect `Inbox` to Brain Inbox capture and triage for admin/operator only.
11. Connect object threads after the new thread model exists.
12. Add offline queue retry/idempotency behavior for capture and low-risk status changes.

## API Shape Draft

```txt
GET /api/hub/today
GET /api/hub/inbox
GET /api/hub/spaces
GET /api/hub/objects/:id
GET /api/hub/calendar?view=day|week|month
GET /api/hub/capture/suggestions?objectId=&q=
GET /api/hub/threads?objectId=
POST /api/hub/feedback
POST /api/hub/capture
POST /api/hub/objects/:id/plan
POST /api/hub/threads/:id/messages
POST /api/hub/checkins
POST /api/hub/push/register
```

## Migration Checklist

Before native writes are trusted:

- Add `ObjectThread` and `ObjectThreadMessage`.
- Add mobile capture context fields or a dedicated `HubCapture` table.
- Add idempotency keys for mobile-created ledger events.
- Add `/api/hub/today` as a backend composition endpoint.
- Add `/api/hub/push/register`.
- Add thread/capture access checks based on role, space, object, and visibility.
- Add relationship dictionary entries for the new operational graph facts.
- Keep Brain Inbox admin-only until visibility and object context are persisted.

## Design Principle

Every mobile screen should answer at least one of:

- What changed?
- What do I need to do?
- Where do I need to be?
- Who can see this?
- Who is coming?
- Who is working?
- Where is the source of truth?

## Implementation Status

Started backend-first, because the native app needs a stable composition layer before Expo screens depend on live data.

Completed foundation:

- Added shared hub response contracts in `packages/shared/src/hub.ts`.
- Added Prisma models and migration for `HubOrganization`, `HubSpace`, `HubSpaceMembership`, `ObjectThread`, `ObjectThreadMessage`, `HubCapture`, and `MobilePushToken`.
- Implemented and mounted:
  - `GET /api/hub/today`
  - `GET /api/hub/inbox`
  - `GET /api/hub/calendar`
  - `GET /api/hub/spaces`
  - `GET /api/hub/objects/:id`
  - `POST /api/hub/objects/:id/plan`
  - `GET /api/hub/threads`
  - `GET /api/hub/threads/:id/messages`
  - `POST /api/hub/threads/:id/messages`
  - `GET /api/hub/capture/suggestions`
  - `POST /api/hub/feedback`
  - `POST /api/hub/capture`
  - `POST /api/hub/checkins`
  - `POST /api/hub/push/register`
- Added ledger-first write behavior for capture, feedback, planner object planning, and check-ins.
- Added a dry-run-by-default `ChefNote` thread backfill script:
  - `pnpm hub:backfill-chef-notes:dry`
  - `pnpm hub:backfill-chef-notes`
- Added a protected-handler smoke script:
  - `pnpm hub:smoke:handlers`
- Added Brain relationship dictionary entries for assignment, attachment, RSVP, check-in, acknowledgement, group ownership, and shift scheduling.

Applied to configured database:

- Applied migration `20260504000100_native_mobile_hub_foundation` with `prisma migrate deploy`.
- Confirmed `prisma migrate status` reports the database schema is up to date.
- Ran `ChefNote` backfill dry run and apply; both found `0` notes, so no thread rows were created.
- Ran unauthenticated hub handler smoke tests; all protected endpoints returned expected `401` responses.
- Added `apps/mobile-hub`, an Expo SDK 55 native shell with static fixtures matching the shared hub contracts.
- Started the Expo dev server locally at `http://localhost:8091`.

Next:

- Test hub endpoints with real Supabase tokens and customer slugs.
- Wire native Supabase auth and pass the access token into `apps/mobile-hub/src/api/hubClient.ts`.
- Add tighter space/role permission checks after real `HubSpaceMembership` data exists.
