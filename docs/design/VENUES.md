# Venues — direction for /firehouse, /foodist and /private-events

Three pages that sell one thing: our food and our service, in our room instead
of the customer's. They extend the specimen system rather than introducing a
second one. Read [SPECIMEN.md](./SPECIMEN.md) first; everything there still
applies and only the departures are argued here.

Implementation is `src/styles/venue-page.css`, `src/components/venues/*`, facts
in `src/config/venues.json`, API in `backend/api/routes/venues.js`.

## References

The client supplied three booking flows. Two were reachable and one was not,
which is recorded here so nobody later assumes all three were studied:

- **SHARE** (Studio-Merge, shareintensive.com) — read directly. The extractable
  is **colour as categorical coding**: each programme carries an identifying
  colour, cards state `Starts Jan 16, 2027` / `€195` / `BOOK NOW`, and
  availability is a live per-item state rather than a static claim. This is
  already how `home-tabs.css:33-58` thinks, so it validated extending the house
  accent-per-subject rule to two venues instead of importing a new palette.
- **Explora Journeys** — only the marketing homepage was reachable, not the
  guest-selection funnel that was linked. What it gave: roughly 70% whitespace,
  serif display over sans body, a `Nights` selector paired with a live
  "From $X per adult", and restrained motion. The extractable used here is the
  **live figure that recomputes as the selection changes**, not the layout.
- **Dribbble 3670675 "Dashboard Booking Flow"** — not retrievable. Nothing in
  this direction derives from it. If it matters, it needs to be supplied as an
  image and this section updated.

## Thesis

Every other service page on this site sells a dish, and the specimen grammar
suits that exactly: a subject floats alone on a sheet with a cast shadow. A
room is not a subject. It is a volume, and what you are actually buying is a
**night in it** — so on these pages the thing that floats on the sheet is time.

The calendar is therefore not a widget dropped into a specimen page. It is the
specimen.

### What the sources gave that a description from memory would not

**Nieuwenhuis's study sheet is already a state machine.** `RP-T-1969-185`
carries four states of completion at once — hawthorn fully painted, anemones in
outline, a root system in pencil. SPECIMEN.md already turned that into the
reveal. A booking calendar also carries four states at once, and they map
one-to-one:

| calendar state | degree of finish | how it reads |
| --- | --- | --- |
| open | full paint | sits on the sheet with a cast shadow |
| held | wash | flattened, shadow gone, drawn in dashed outline |
| booked | struck | crossed through in the venue accent, as a cataloguer crosses out a folio |
| blocked | pencil | faint, present on the sheet but not offered |
| unmanaged | query | faint, with a dotted rule under the numeral |

**Unmanaged** means no row exists for that day, so the page promises nothing and
routes to the enquiry form rather than to a hold. Its dotted rule is
load-bearing, not decorative: a greyscale check during build showed `blocked`
and `unmanaged` rendering as the same faint numeral, which is unacceptable when
one is clickable and the other is not. A cataloguer's mark for an undetermined
entry is a pencil query, so the query is the mark — and it is the only state on
the grid that invites a question.

This is the reason the calendar carries no coloured status chips. Every state
differs in shadow, rule and strike before it differs in colour, so the grid
survives greyscale, colour blindness and the contrast floor — and the accent
stays a *line*, which is what keeps it inside the ~4% coverage fence that
`brand-tokens.css:74` sets.

**Coorte's asparagus is a photograph of a room at night.** `SK-A-2099` is 81%
void, one object, one raking light from the upper left. A room photographed in
low light is the same picture. So each venue page spends its single dark band
on exactly that, and — because this is the one page where the climax and the
decision are the same moment — it sits immediately before the closing ask.

**de Boodt's caption strip is the only table in the reference set.** The
calendar grid is the one primitive with no ancestor here, so it is built from
the nearest thing that does exist (`specimen.css:139-152`): cells divided by
rules, square corners, a hairline inside a firmer border. Source-derived rather
than invented, but it should be understood as the new primitive on these pages.

## Accents

Two venues, two accents, **zero new colours**. Both were already measured and
already in `brand-tokens.css:83-85`.

| venue | token | value | why |
| --- | --- | --- | --- |
| FIREHOUSE | `--accent-poppy` | `#8F3031` | Henstenburgh, `RP-T-1898-A-3500`. A firehouse is a red building; the measured poppy arrives there without the fire-engine-red tell. |
| FOODIST | `--accent-ochre` | `#794F2B` | Avercamp, `SK-A-1718` — the ice field. Warm earth, separable from poppy at a glance *and* in greyscale. |

A third venue added without an accent falls back to `--brand-oxide` rather than
to nothing.

**Accents are categorical, not hierarchical.** FOODIST is the primary home
(owner, 2026-09-17) and FIREHOUSE is the second space, but that is expressed by
**order** — FOODIST is first in `venues.json`, so it is the default panel on
`/private-events` — and never by making one accent louder or larger. That is the
SHARE lesson: colour identifies, it does not rank.

The **Hopkins facility is not one of these spaces** and must not be given a page
by pattern-matching. It is backup capacity for large events and frozen pizza
production, with no public booking surface.

### The primary home and the business node

FOODIST is the business's own premises, so its `Place` and the site-wide
`LocalBusiness` (`index.html:41-54`) describe one physical address. Two unlinked
nodes at one address read as duplicate entities, which is exactly what a
Business Profile match must avoid. `buildVenueJsonLd()` therefore emits a
fragment carrying the existing `#business` `@id` with `location` pointing at
`#venue`; nodes sharing an `@id` merge in a JSON-LD graph, so this attaches the
venue to the business rather than declaring a rival.

**Open, and an owner decision:** that `LocalBusiness` node currently claims
`addressLocality: "Roseville"` with no street address. If FOODIST is the primary
home, that is stale, and it is the node every venue `Service` references as
`provider`. It should be corrected in the same pass that fills `venues.json`.

**The accent does not reach the call to action.** `.ht-submit` fills with
`--ht-accent-deep` (`home-tabs.css:288-297`), and these pages sit under a bare
`.ht-scope` with no tab variant — so the token was initially undefined and the
primary button rendered as white text on cream. Invisible, and caught in a
screenshot rather than by the build.

The obvious repair is to pour the venue accent into it, and that is precisely
what SPECIMEN.md forbids: the measured accents are "never a button fill, a
heading colour or a gradient". Numerically one button would not breach the 4%
coverage figure, but arguing the fence down by the numbers is how the fence
stops working. So the fill is **ink**, following `.ht-scope--business`
(`home-tabs.css:47-51`) — the precedent for a page that is really a price sheet,
which is what a room-and-rate page is. Poppy and ochre keep carrying identity
where the fence allows: the calendar strike and the switch hinge.

## Choreography

Five beats, and **one departure from the house script**.

The service pages open on the order slip, because SPECIMEN.md's reading is
"ask, then answer the things that stop someone finishing" — and a dinner party
needs no introduction. A room does. Nobody books a space they have not seen. So
the photograph takes the fold here and the calendar comes after the ledger.

It is still a specimen and not a banner: the plate sits on the sheet with the
raking shadow rather than bleeding to the window edge, so the header's mount
board keeps framing it, and the venue name is set on the sheet *beneath* the
plate the way a mounted drawing is captioned on its board. That also avoids
reversing type out of an unknown photograph, which would fail contrast and force
a scrim.

1. **The room, on the sheet.** One plate, cast shadow, name and capacity beneath.
2. **The ledger.** Capacity, floor, hours, room fee, what is in the room. Ruled
   rows — not cards.
3. **The ask.** Calendar and slip together. Picking a night fills the slip's
   date field, so the grid and the form can never state two different dates.
4. **The void.** The room at night, one quote, the 48s raking light. The only
   dark surface on the page.
5. **Release.** Photographs, then the calendar feed for anyone planning around
   other bookings.

### The switch

`/private-events` carries both rooms, so it needs a control — and the default
answer, a segmented pill, is the single most generic component on the internet.

Henstenburgh's sheet is hinged to a mount board, and `.specimen-figure--lifted`
(`specimen.css:130`) already encodes "raised off the board". So the switch is
**two sheets on one mount**: the inactive sheet sits flat and slightly behind,
the active one is lifted with the standard shadow and hinged along its top edge
by a 2px rule in that venue's accent. Switching moves the lift, 240ms.

The active venue is mirrored into `?venue=` so an ad, an email or a Maps link
can land on a specific room, and the panel is keyed on the slug so switching
remounts the calendar — a date picked at FIREHOUSE must not survive into
FOODIST's slip.

## Motion

No new vocabulary. Entrances use the shared completion reveal; the only
page-level additions are 240ms hover and lift states, all transform, filter,
opacity and background-colour. One ambient element per page, the existing
`.specimen-void__light` on a 48s cycle.

Reduced motion: the switch stops travelling and the calendar stops lifting.
Every state stays distinguishable, because no state was ever carried by motion
— they are shadow, rule and strike.

## Google-first, and what that can and cannot mean

The brief asked for these to be "Google first", for booking through Google
surfaces and for Ads. Three of those four are built; one is not ours to build.

- **Prerendered.** All three routes are in `src/config/routes.js`,
  `src/ssr/StaticApp.jsx` and `vercel.json`. A Google Ads landing page that
  renders client-side is scored on an empty div.
- **Structured data.** `Place`/`EventVenue` with address and geo, `Service`, and
  a `WebPage` carrying a `ReserveAction` whose `EntryPoint` accepts a date, so
  a booking partner or a Maps surface has a documented way in.
- **Calendar interop.** `GET /api/venues/:slug/calendar.ics` is a subscribable
  busy feed for Airbnb, Google Calendar, Vrbo and Lodgify; feeds pointed the
  other way are imported on a two-hour cron, matching Lodgify's own iCal
  refresh cadence.
- **Reserve with Google cannot be self-integrated.** It requires a booking
  *partner* with a contractual merchant relationship and sub-second availability
  responses. The 2026 expansion to 500+ partners works by reading the booking
  link already on the Business Profile, so the route is Lodgify (or equivalent)
  as partner → GBP link → Maps/LSA. The availability API here is the half we
  own and is shaped to be consumed that way.

### The publishing gate

`venues.json` carries a `verified` flag and it is a mechanism, not a comment.
While it is false, `buildVenueJsonLd()` emits **no** `Place`, `PostalAddress` or
`geo` node and the page sends `noindex,follow`. A name-address-phone mismatch
against the Business Profile is worse than saying nothing, and a placeholder
that ships is a placeholder that gets indexed. Flip it only when every `TODO` is
a real value that matches the Business Profile exactly.

## Fail-closed

Both the calendar component and the availability endpoint fail closed. If the
database is unreachable the API returns 503 and the component renders an
enquiry message instead of a grid. An empty calendar reads as "every night is
free", which is how a room gets double-booked. A feed that fails to fetch leaves
its previous blocks in place for the same reason.

## What was deliberately not done

The blacklist audit for this direction, kept because the next contributor will
be tempted by exactly these:

- **A segmented pill toggle** — replaced by the two sheets on a mount above.
- **Green/red availability chips** — replaced by degrees of finish. Colour is
  never the only carrier of a state here.
- **Three amenity feature-cards** — the ledger is ruled rows. SPECIMEN.md rules
  out bento grids and three-card rows and that has not been relaxed.
- **`01/02/03` step markers** — `localist-membership.css:10-14` records that the
  site already removed these once. Not reintroduced.
- **Count-up capacity numbers** — capacity is mono text that is simply there.
- **A hero with headline + subline + two buttons** — the fold is a photograph
  and a name.
- **Marketing register** — copy takes its voice from the shipped pages
  (`"Minnesotan food for Minnesotans"`, `"dinner & pizza parties from $850 ·
  larger events from $1,200"`): plain, factual, money in mono, lowercase kicker
  with a trailing em-dash.

One thing to watch: the calendar is the first primitive on this site with no
direct ancestor in the reference set. It is derived from the caption strip, but
if it drifts toward a conventional date picker — rounded cells, coloured pills,
a shadow on the popover — the derivation is gone and it should be pulled back
to the ruled table it is now.
