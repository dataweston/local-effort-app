# Universal calendar

Owner: Local Effort. As of 2026-10-13. Review by: when Square Bookings is added or the routing graph changes shape.

One availability engine decides which dates can be sold, for every bookable space. It is a small routing graph that the owner edits in `/admin/calendar-routing` (patch-cable UI). Code lives in `backend/api/calendar/`.

## Model

Everything is **day-granular** and evaluated in `America/Chicago` (never UTC).

| Node kind | Examples | Meaning |
|---|---|---|
| `resource` | `firehouse`, `foodist`, `small-events` | A thing we sell a date of. Owns bookings (`SmallEventHold`), admin open/blocked days (`SmallEventAvailability`). |
| `feed` | `feed:<id>` | An inbound calendar: an iCal URL (Airbnb, Google "secret address") or a Google calendar read through the service account. Busy days live in `VenueBlock`. |
| `ics_out` | `ics:firehouse-airbnb` | An outbound `.ics` URL other systems subscribe to. Served at `/api/calendar/out/<token>.ics`. |
| `google_out` | `google:firehouse-shared`, `google:foodist-shared` | A Google calendar we write booking events into (service account). |
| `hub` | `hub` | The hub calendar. Downstream only: it displays, it never blocks. |

Routes are directed edges `from → to`:

- `blocks` (into a resource): the destination cannot be sold on a day the source is busy.
  - `feed → resource`: the feed's busy days.
  - `resource → resource`: the source's **bookings and live holds only**. An admin "blocked" day stays local to its resource.
- `mirrors` (into `ics_out` / `google_out` / `hub`): the destination reflects the source's own busy days.

Routes are data. Deleting or adding a cable changes behaviour immediately; nothing about Airbnb, Small Events, etc. is hard-coded in the engine.

## Default wiring (seeded once, then owned by the owner)

```
Airbnb feed ──blocks──▶ firehouse            (an Airbnb block does NOT touch small-events)
firehouse ──blocks──▶ small-events           (a firehouse booking does)
firehouse ──mirrors─▶ ics:firehouse-airbnb   (Airbnb subscribes to this URL)
firehouse ──mirrors─▶ google:firehouse-shared
foodist   ──mirrors─▶ google:foodist-shared
Foodist Google feed ─blocks─▶ foodist
all resources ─mirrors─▶ hub
```

## Rules

- Status precedence per day: `booked` > `held` > `blocked` > `open` > absent. Incoming `blocks` edges contribute `booked`/`held`.
- A resource may declare `defaultOpen: { minLeadDays, maxDays }`. Days inside that window with no row are implicitly open (Small Events). Without it, only owner-opened days are payable (FIREHOUSE, FOODIST); other days get the enquiry form.
- Claiming a date takes one Postgres advisory lock per **date** (across resources), re-evaluates the day inside the transaction, then writes the hold. Two simultaneous buyers, or a FIREHOUSE buyer and a Small Events buyer, cannot both win.
- Public availability never returns external event titles or feed labels (they can contain guest or client names).

## Booking contract (all resources)

1. Re-derive the price on the server, claim the date, and persist the estimate **and** a `FinancePaymentAttempt` (`venue-deposit:<estimateId>`) before any Square call.
2. Create the Square payment link with the attempt id as `referenceId`; save the order id on the attempt and the payment row.
3. The webhook confirms only when the captured amount and currency equal the deposit. A hold that expired is re-claimed if the date is still free; otherwise the booking goes to `payment-review` for the owner.
4. Confirmation jobs (customer + owner) are queued in the shared email outbox with stable keys from the persisted estimate. Replay repairs, never duplicates.
5. After confirmation the booking is mirrored (Google event, `.ics` is live automatically). Mirror failures are stored in `CalendarMirror` and retried by the sync cron and by webhook replay.
6. The return page asks `GET /api/venues/:slug/book/:id/status?token=` for the real state; the `?deposit=success` query alone proves nothing.

## External limits (disclose, don't hide)

- **Airbnb cannot be written by API.** It polls our `.ics` roughly every 3 hours (their help page: "automatically updates every 3 hours"). A FIREHOUSE booking therefore blocks Airbnb within about 3 hours, not instantly; an Airbnb booking reaches the site at the next daily sync (`vercel.json` cron). Both directions leave a double-booking window.
- **Google** is written with a service account. Each calendar must be shared with the service account email ("Make changes to events"). Until a calendar id is set on its node, mirroring is reported as unconfigured, never silently skipped.
- Square Bookings is not implemented; no node exists for it.
- The sale-confirmation outbox retry schedule is unverified (`docs/sale-confirmation-scheduler.md`).
