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
  busy feed for Airbnb, Google Calendar, Vrbo and Lodgify. The feed advertises
  `REFRESH-INTERVAL: PT2H`, which governs how often *subscribers* poll us and is
  the right number for them.

  Inbound import runs on a **daily** cron (`0 7 * * *`), not the two-hourly one
  this was first written with. That is a platform constraint, not a preference:
  a sub-daily cron failed the Vercel deploy outright, and every other cron in
  `vercel.json` is daily for the same reason. Read the uniformity there as a
  limit, not a style.

  The trade-off is real and worth stating. A newly booked night on Airbnb can
  take up to a day to close here, which is a genuine double-booking window. It
  is narrowed by the fact that `/availability` fails closed and that a stale
  block stays blocked — the failure mode that survives a missed sync is a date
  we wrongly *hold*, not one we wrongly sell. If the window needs to shrink, the
  fix is an opportunistic refresh on the availability path when the newest
  `lastSyncAt` is stale, bounded to one feed per request; that was left out
  deliberately rather than putting an outbound fetch on the critical path.
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

---

# Addendum — FIREHOUSE finished, and the deposit (2026-09-22)

The direction above did not change. What follows is what filled it in: the
photographs it was designed around, and the deposit that turns beat 3 from an
enquiry into a sale.

## The photographs

Four, supplied by the owner. They are committed to `public/images/venues/
firehouse/` rather than pulled from Cloudinary, because the hero and the void
are the fold and the climax of a prerendered Google Ads landing page and
neither can wait on a client-side image search. The gallery at beat 5 still
comes from Cloudinary by tag, which is the right trade for photographs nobody
has art-directed.

| File | Beat | Job |
| --- | --- | --- |
| `hall.webp` | 1, hero | The volume: mezzanine, steel stair, kitchen behind. The wow, and the reason someone who came for a chef stays for the room. |
| `building.webp` | 2, after the ledger | The building from the street. Red brick, the apparatus bay glazed over. |
| `hall-wide.jpg` | 4, the void | The same room wide, under the 62% ink wash the void band already applied. A bright photograph darkened reads as evening, which is what Coorte's ground is. |
| `kitchen.webp` | 5, release | The kitchen. This is the chef connection: the last thing seen is the room where the cooking happens. |

**The exterior settles the accent after the fact.** `--accent-poppy` was
sampled from Henstenburgh in `brand-tokens.css:83` long before anyone here had
seen this building, and the argument for it was that "a firehouse is a red
building". The building is red brick. The accent was right for a reason that
turned out to be literal.

**The secondary plates are mounted, not bled.** `.venue-plate` wraps
`.specimen-frame`, so each gets the ruled border, the hairline inside it, and a
folio top right — the catalogue treatment the reference set uses on every
sheet. The frame reserves `padding-top: 1.9rem` because the folio otherwise
lands on the photograph once the frame's fluid padding shrinks below it. That
is fine over de Boodt's paper and not fine over a sky; caught in a screenshot at
503px, not by the build.

## The deposit

Beat 3 used to collect an enquiry. It now takes 20% through Square and holds
the night.

The reason is the journey this page is actually for: someone who arrived to
book a chef, saw the room, and wants the date. That intent does not survive a
day of waiting for a reply, and the availability grid was already sitting right
there telling them the night is free. Selling it was the only honest next move.

**Where the numbers come from.** `backend/api/pricing/priceBookManifest.js`,
the owner's published policy, effective 2026-09-18. Nothing is restated:
`smallEventEstimator.js` derives the service styles, both venue fees and the
deposit rate out of `RULES` at require time, so editing the manifest moves the
page.

| | |
| --- | --- |
| Buffet or passed | $45–$75 per guest |
| Family-style or coursed | $65–$95 per guest |
| Individually plated and coursed | $105–$250 per guest |
| FIREHOUSE room | $750 per event day |
| FOODIST room | $150 per event day |
| Deposit | 20% of the low estimate |

**The deposit is taken against the LOW end, plus fixed costs.** That basis is
written into the rule itself (`estimateBasis:
lower_rate_times_high_guest_count_plus_fixed_costs`) and the pricing discovery
argued it: the operator sets the real menu price later, so holding at the top
of the range would mean refunding the difference on most bookings. Thirty
guests at buffet is $45 × 30 + $750 = $2,100, and the hold is $420 — the worked
example in `artifacts/product-pricing-discovery-2026-09-17`, which the
estimator's tests assert against directly.

**The prices ship twice, and the duplication is guarded.**
`src/config/eventPricing.js` carries the same numbers as ESM so the figure
renders in prerendered HTML — a price that arrives by fetch is a price the
crawler and the no-JS visitor never see, which is the exact failure the
prerender exists to prevent. `tests/eventPricing.test.js` requires the CJS
manifest and asserts every value and every computed deposit across the grid, so
the copy cannot drift silently. The server re-derives before minting a payment
link, so the client's copy is never load-bearing for correctness.

**Three rules in `POST /api/venues/:slug/book`:**

1. **The hold is written before the payment link exists**, and released if
   Square fails. The other order sells a night that was never taken off the
   market.
2. **Only an operator-opened date is payable.** `unmanaged` has no row, promises
   nothing, and routes to the enquiry form — the state table above, enforced.
   This means *the page cannot sell anything until dates are opened in the
   availability admin*. That is the fail-closed posture working as designed, not
   a bug, but it is the difference between a live booking page and a decorative
   one.
3. **The amount is server-derived** from date, guests and style alone. A tampered
   client can only ever pay the correct price.

Known race: two visitors can pass the in-transaction hold check within the same
instant and both receive a link. The window is milliseconds and the recovery is
a refund; closing it properly wants a unique constraint on
`SmallEventHold.slotId`, which is a migration and was left out of this pass
rather than half-done.

No schema migration was needed. The flow reuses `SmallEventEstimate`,
`SmallEventAvailability`, `SmallEventHold` and `SmallEventPayment` exactly as
the /small-events checkout does.

## The ask, laid out

`service-page.css:65` pins `.ht-slip` to `flex: 0 1 560px`, which is right where
a slip shares a row with a photograph and wrong here, where it left the slip
stranded at 560px beside an empty window and stacked a twelve-row calendar on
top of the price. The venue scope overrides it to the page's own 62rem measure
and splits it: calendar left, deposit right, above 62rem. The calendar is
sticky, so the night you picked is still on screen while you read what it costs.
Below 62rem it stacks, because two columns of 15rem is worse than scrolling.

## The other customer

A visitor already staying in the building wants a cook, not a room. That is a
second product line, so it gets a footnote under the hero and its own sheet —
never a second call to action at the fold, which would give the page two
climaxes and therefore none.

`GuestChefPrompt.jsx` is a **scaffold and says so on its face**. The owner named
two products, "Fill the fridge" and "Personal chef", and nothing else; no copy,
pricing, field list or checkout has been invented to cover the gap, and every
unknown renders as a visible `coming soon` in the same spirit as the TODO gate
in `venues.json`. To finish it, each product needs a line of description, a
price basis that lands in `priceBookManifest.js` as rules rather than in the
component, the fields fulfilment actually requires, and whether it takes a
deposit or is paid in full. The Square path is already built and reusable.

The note only renders where the street is a real value, because an unnamed
"already a guest here?" means nothing.

## Blacklist audit for this pass

Kept from the original list, plus what this pass was tempted by:

- **Three service-style cards** — the single most likely defect here, since the
  styles are literally three options. They are ruled radio rows on the ledger's
  own rules.
- **A count-up on the estimate** — the figure changes. It does not animate.
- **A gradient or pill deposit button** — `.ht-submit`, filled with ink, per the
  accent fence argued above.
- **Green "available" / red "booked" chips**, again, now that money is involved
  and the temptation is stronger. Still degrees of finish.
- **Rounded cards with soft shadows around the photographs** — plates in ruled
  frames with the raking shadow.
- **A guest-count slider with a gradient track** — a mono stepper reusing
  `.venue-calendar__step`, so the two things on this page that step through
  something are the same control.
- **"Seamless booking", "instant confirmation", "effortless"** — the copy says
  what happens: the night is held for 24 hours while you pay, and released if
  you do not.

## Still owner-blocked

`verified` stays **false**, so there is still no `Place` JSON-LD and both pages
still send `noindex,follow`. What is missing is facts, not design:

- ~~**Capacity**~~ — supplied 2026-09-22: 16 seated / 50 standing at both rooms.
  See Addendum 2.
- **The address** — the owner gave "1290 Snelling" in passing and it is recorded
  as the street, but the city, postcode and geo are still TODO and must match
  the Business Profile exactly.
- Legal name, hours, floor area.
- FOODIST has had none of this pass: no photographs, no copy. Its fee is now
  real ($150) and the deposit flow works there, but the page is still starved.

---

# Addendum 2 — the food, and capacity (2026-09-22)

## Capacity

**16 seated, or 50 standing, at both rooms** (owner, 2026-09-22). This is the
fact the deposit flow most needed: the estimate is per guest, so before this the
stepper ran to the pricing sanity ceiling of 200 and the page would cheerfully
quote two hundred people into a room that holds fifty. `VenueBooking` now clamps
to `max(seated, standing)` and `POST /:slug/book` rejects `over-capacity`
server-side.

It does **not** flip `verified`. That still needs the address, geo and legal
name matching the Business Profile.

## The food wall replaces the tag gallery

Beat 5 used to be a `PhotoGrid` pulling nine images by Cloudinary tag. It is now
five named photographs. A page that has just asked someone for a $420 deposit
should not close on whatever the `event` tag happened to return that morning.

**These photographs are specimens, and that is not a flourish.** Four of the
five are a single subject on a plate under raking side light against a dark
ground — which is the composition of most of the reference set. The melon
(`A990A759…`) is Coorte's `SK-A-2099` with a cantaloupe in it: dark ground, one
lit object, a fork where the asparagus has its string. The tomato
(`CD4702A3…`) is a botanical sheet — subject centred on a pale ground, herbs
and chive blossoms arranged around it like a study.

So they are mounted the way the venue plates are — ruled frame, hairline
inside, folio top right, caption on the board — and the set is split by the
reference set's own two poles (`brand-tokens.css:60-72`). `pole: paper` mounts
on `--brand-sheet`, `pole: panel` mounts on `--brand-mount`. The distinction is
quiet by design; it is a mount board, not a highlight.

**The wall is laid out by the shape the photographs already have**, not by a
column count picked in advance. In a six-column grid a portrait spans 2 and the
landscape spans 4, which resolves to three specimens across the top and the
service shot paired with the haul beneath. No "featured item" rule, no bento.
`data-shape` is derived in the component rather than matched in CSS off the
inline style, which would depend on how React serialises a custom property.

**Shared, not per-venue.** They live under `sharedPhotos.food` because the food
is the same whichever room it is served in — that is the thesis of these pages,
and copying the same five plates onto each venue would encode the opposite.

**Cloudinary public_ids, not display names.** The owner names assets by camera
filename (`IMG_6479`, and four UUIDs). Cloudinary stores those as `display_name`
and mints a separate opaque `public_id`, which is what a URL needs; they were
resolved through the Admin search API. If a plate 404s, search `display_name`
before assuming a typo.

They are delivered as a plain `<img>` with a Cloudinary `srcset` rather than
through `components/common/cloudinaryImage.jsx`. That component does a blur-up
and watches the underlying element for load; both cost JavaScript, and the
markup it emits carries no real `src` until React hydrates. On a page whose
whole argument is that what matters ships in the HTML, that is the wrong trade.

**One correction worth recording:** `IMG_6479` is natively 3024×4032, portrait.
It was first declared `3 / 2` and the CSS crop quietly ate the bottom third of
the table. Caught in a screenshot by comparing against the source. Declare the
aspect a photograph actually has.

## The reveal was hiding photographs from crawlers

`useSpecimenReveal` used to start at `pending` and let an effect finish it. Its
own comment claimed SSR would "get the finished state immediately" — but
effects do not run during SSR, so the prerendered HTML shipped
`data-finish="pending"`, and `specimen.css:209` hides `.specimen-figure` inside
a pending reveal. Every photograph in a revealed section was `opacity: 0` **in
the file**.

Nothing caught it for as long as the revealed sections held only text. The
venue plate was the first `.specimen-figure` to live inside a
`.specimen-reveal`, and a screenshot of the prerendered page came back blank.

The order is now inverted: **finished is the default, and the client applies the
hidden state on mount**, in a layout effect so it commits before paint and
nothing flashes. A crawler, a prerendered page and a browser whose script failed
all see the finished composition — which is what `prefers-reduced-motion`
already showed (`specimen.css:286`). A section already on screen at mount is
left finished rather than hidden for the pleasure of animating it back in.

Worth remembering as a general rule for this codebase: **any CSS that hides
content until JavaScript says otherwise is invisible to Google on a prerendered
route.** Check `data-*` state attributes in `prerender/<route>/index.html`, not
just in the browser.

---

# Addendum 3 — the reorganisation (2026-09-22, owner pass)

Owner feedback: "weird gaps all over the place, the photos are all spread out in
ways that don't make sense." That was fair, and the cause was structural rather
than cosmetic.

## What was wrong

Photographs had been added one at a time, each into its own section, each
inside the full `--service-rhythm`: a 34rem plate mounted under the ledger, a
second plate pushed to the opposite margin after the void, and a separately
titled wall of food at the bottom. Three sections, three different alignments,
three vertical gaps, for what a visitor reads as one thing — *what does this
place look like*.

The space/food split was the deeper error. It made the page argue with itself:
someone booking a venue from a caterer is buying the room and the cooking in one
decision, and sorting the evidence into two labelled bins asks them to evaluate
the halves separately.

## The beats now

1. the room, on the sheet
2. the ledger — what you get
3. the ask — calendar and deposit, side by side
4. **the gallery** — rooms and food, one grid
5. the void — a dark band, one quote, and that is the end

Beats 4 and 5 swapped, and the gallery absorbed all three scattered photo
sections. Captions and folios are gone: the catalogue mount earns its keep on a
single plate with something to say about it, and repeated seven times it is
furniture.

**The grid closes, which is the whole point.** Six columns, spans set per image
in `venues.json`, arranged so each band sums to exactly six — `3+3`, `2+2+2`,
`4+2`. Order in that file is therefore a composition, not a list. Height comes
from `aspect-ratio` on the tile rather than row spans, because a percentage in
`grid-auto-rows` resolves against block size, not width, and the first attempt
at a square row unit was silently wrong. `dense` is insurance: add a photograph
without re-balancing and the grid backfills instead of tearing a hole. Two
columns below 64rem, one below 40rem, wide tiles taking the full row.

## Copy and facts

New hero, owner-supplied. The lede carries three things the page had never
said: the State Fair is across the street, the register runs from relaxed to
black tie, and **you can stay the night** — which is what the guest-chef
footnote and the Airbnb feed import were always implying without ever saying.

**The $750 is a venue fee for an estimated four hours, not a day rate.** It was
printed as "per event day", which oversold it. `venueFeeHours` in `venues.json`,
shown in the ledger and again in the booking panel's own ledger.

**The city is St. Paul.** Recorded in `address.locality`; postcode and geo are
still TODO and the spelling still has to match the Business Profile, so
`verified` stays false.

## One form, not two

The page used to fall back to `QuickEventBookForm` for a night we had not
opened, and that form opens by asking "what kind of party?" with chips —
a different question in a different vocabulary. Someone who has already chosen
buffet or coursed and watched a price move should not be handed a fresh
questionnaire because their night happens to be unpublished.

`VenueBooking` now covers both. Identical selection either way; only the last
step differs. An opened night gets a Square link; anything else posts to
`/api/events/request` carrying the same service style, guest count and estimate
— `eventType` gets the service-style label, since that endpoint prints it
straight into the summary line a human reads.

Three states, not two: *nothing picked yet* takes the deposit copy, because it
describes the normal path. Only an actually-unpublished night says so.

## October to December are open

`scripts/open-venue-dates.cjs` opens a run of nights, idempotently, on the
`(date, type, venue)` key. 92 nights opened at FIREHOUSE for 2026-10-01 →
2026-12-31, verified back through `loadVenueCalendar` — 92 days, all `open`.

Two notes for whoever runs it next. It re-opens a date an admin had *closed*,
so prefer a narrow range to a blanket re-run; holds and imported feed blocks are
untouched and still outrank an open row. And the type is `dinner` for every row:
the page no longer asks what kind of party it is, so one row per night is
enough, and `dinner` is what the existing admin tooling understands.

**That change immediately exposed a bug.** The calendar opened on the current
month, which was September — where nothing was open. A visitor landed on a grid
of greyed-out squares with no reason to think pressing the arrow would help.
`VenueCalendar` now opens on the first month that has an open night, unless the
visitor arrived with a date of their own.

## The page ends on the void

The calendar-feed footnote below the void band is gone (owner, 2026-09-22). The
feed itself is untouched: `GET /api/venues/:slug/calendar.ics` still serves and
`VenuePage` still advertises it in the head as `<link rel="alternate">`.
