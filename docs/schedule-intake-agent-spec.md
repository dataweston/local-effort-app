# Schedule intake agent specification

Status: implementation-ready
Owner: Local Effort Cooperative
Primary surface: `/weeklydemo`; staff projection: `/hub`

## Outcome

One founder message describing a week must become a reviewed, source-backed planner update without a manual spreadsheet pass. The agent should ask the founder only about unresolved facts that could materially change operations, cash, or customer commitments.

The interaction target is:

1. Founder pastes a loose schedule, corrections, and follow-up facts in one or more messages.
2. Agent resolves dates, staff shifts, kitchen rentals, production, deliveries, meal-prep clients, and events.
3. Agent reconciles Gmail, Square, Food Corridor, Accell/Courie, Local Budget, and the Company Brain.
4. Agent previews material assumptions and exceptions.
5. Agent idempotently writes planner cards, COGS, overhead, recurring revenue, and evidence metadata.
6. Agent verifies persisted totals and reports what remains unknown.

## Input contract

Accept conversational text. Do not require a form. Preserve every founder correction as an ordered fact; later messages in the same intake supersede earlier messages when they directly conflict.

Minimum inferred fields:

- target week and timezone (`America/Chicago` by default);
- date, start/end time, object type, title, assigned people;
- customer/program, quantities, menu or service details;
- expected revenue, cash received, direct cost, and payment status;
- recurrence cadence and forecast horizon;
- delivery provider and requested delivery day;
- source, source record identifiers, evidence date, confidence, and unresolved fields.

The normalized output must use the existing planner import contract in `scripts/upsert-planner-week.cjs`:

- `weekStart`;
- `cards[]` with stable deterministic IDs;
- optional `recurringSeries[]`;
- `cogs[]`;
- `overheads[]`.

All money is integer cents. Dates are `YYYY-MM-DD`; local times are `HH:mm`.

## Source precedence

Use field-level precedence, not whole-record precedence:

1. latest explicit founder statement;
2. settled Square payment, invoice, or receipt evidence;
3. approved Food Corridor booking or dispatch-provider record;
4. customer/vendor email with a concrete date, quantity, menu, or price;
5. current Company Brain fact with source and as-of date;
6. Local Budget cash transaction;
7. catalog price, stable recurring-payment rhythm, or documented rate model;
8. agent estimate.

Never silently replace a higher-priority fact. Store both facts and the reconciliation when sources differ.

## Processing workflow

### 1. Parse and merge the conversation

- Resolve relative dates against the intake date.
- Normalize people and customers through known aliases (`Maria` = `Maria Beck`; common client misspellings included).
- Merge incremental corrections before doing financial math.
- Retain the raw founder text or an immutable capture reference for audit.

### 2. Enrich in parallel

- Gmail: event menus, itineraries, delivery messages, vendor booking approvals, and invoice receipts.
- Square: invoices/payments, catalog prices, recurring cadence, team-member wage settings, and closed Labor timecards.
- Food Corridor: approved booking notifications until an official API is available.
- Accell/Courie: historical delivery invoices now; official dispatch API when credentials are issued.
- Local Budget: cash movements and category totals. Do not allocate merchant-level spending to a job without a defensible join.
- Company Brain: canonical people/customers, pay rates, corrections, known constraints, and prior evidence.

Connector failures should not discard the intake. Record connector status and continue with lower-priority evidence.

### 3. Calculate financials

For every card, independently calculate and label:

- planned revenue;
- cash received and receipt date;
- direct cash cost;
- ingredient COGS;
- founder labor (tracked separately from cash wages);
- confidence/status and source.

Recurring meal-prep revenue is projected from validated payment rhythm for eight weeks by default. One-time add-ons are excluded unless explicitly recurring. Deposits count as cash received and reduce outstanding event receivables; they do not reduce event revenue.

Do not invent ingredient COGS. A missing recipe-to-purchase allocation remains `unresolved`, with the exact data join needed to resolve it.

### 4. Exception policy

Auto-commit when all are true:

- date/object identity is unambiguous;
- the write is internal and reversible;
- no customer or staff message will be sent;
- no material source conflict remains;
- the value is exact or clearly labeled as a forecast.

Ask the founder only when an unresolved fact affects one of:

- customer commitment or event timing;
- staff assignment or availability;
- more than $100 of revenue/cost, or more than 10% of a card's value;
- dietary/allergy safety;
- external dispatch, invoice, calendar invite, or human-facing message.

Batch questions into one short exception list. Never block unrelated planner writes.

### 5. Write and verify

- Generate deterministic IDs from source + date + entity; reruns update instead of duplicate.
- Refuse to overwrite planner records owned by another planner identity.
- Write all related cards and financial rows in one transaction where practical.
- Re-read persisted records and compare card count, planned revenue, cash received, and direct cost.
- Emit an audit summary containing source IDs, changed fields, assumptions, and unresolved items.

## Staff schedule behavior

- Assigned staff see `My Shift Calendar` in Hub; admins see all staff shifts.
- Assigned staff and admins can edit date/start/end for a shift.
- Staff can submit change, available-time-block, and time-off requests.
- Admin approval applies the requested change or creates the approved time block.
- Pay evidence is private to the employee and privileged admins. Never expose one employee's wage or timecards to another staff member.
- No schedule change sends an email/SMS automatically. Human-facing notification remains a separately approved workflow.

## Automation hooks

Implement these jobs after the conversational intake path is stable:

- nightly source reconciliation for Square payments and Food Corridor booking-change emails;
- Sunday draft of the next two weeks based on recurring series;
- daily exception detector for unpaid recurring clients, missing event arrivals, overlapping staff shifts, and unpriced kitchen/delivery blocks;
- post-event reconciliation of final revenue, deposits, COGS, delivery, kitchen, and paid labor.

Each job must be safe to rerun and must record a durable run status.

## Acceptance tests

1. Replaying the July 20, 2026 intake creates no duplicates and reproduces exact current-week totals.
2. A later correction of pizza variants changes only the affected card and total.
3. A February event deposit plus two July payments reconcile to $2,400 cash without changing $5,000 projected revenue.
4. Food Corridor usage crossing 20 July hours selects the $35/hour Neon tier for later July bookings.
5. A discounted early meal-prep payment preserves service-week revenue and predicts the next invoice from the actual cadence.
6. Maria can edit her assigned shift and submit a time block; another staff user cannot edit Maria's shift or view her pay evidence.
7. An admin can approve or decline Maria's request and the resulting planner write is idempotent.
8. Connector failure leaves a visible unresolved item rather than a fabricated value.
9. No customer/staff email, SMS, dispatch, or external calendar event is created without the required approval workflow.

## Definition of done

The feature is done when the founder can paste a weekly schedule, receive at most one concise exception list, approve if needed, and see the reconciled week in `/weeklydemo` plus the privacy-filtered staff schedule in `/hub`, with repeat runs producing the same records and totals.
