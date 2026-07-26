# Service surfaces (weekly meals / small events / for businesses / local pizza) — design direction

Four offers, one job each: start a meal-prep signup, request an event date,
unlock the wholesale menu, book a pizza party. The booking form is the
destination on every one — everything else walks the visitor toward it.

## Where they live (changed 2026-07-24)

Weekly Meals and Small Events are no longer panels on `/`. They are standalone
indexable pages so each offer has its own URL, canonical, and JSON-LD:

| offer | surface | accent |
|---|---|---|
| weekly meals | `/weekly-meals` (`src/pages/WeeklyMealsPage.jsx`) | olive |
| small events | `/small-events` (`src/pages/SmallEventsPage.jsx`) | rose |
| for businesses | `/` panel 3 | ink |
| local pizza | `/` panel 2 | hearth |
| membership | `/localist` | — |
| member capital | `/308b-member` (`src/pages/MemberFundraisePage.jsx`) | ink (receipt) |

`/` is now four panels — Home, Local Pizza, For Business, About
(`src/config/fullPageNav.js`). The home panel is **the photo wall and nothing
else**: no headline, no offer cards, nothing above the photographs (client
direction, 2026-07-26). A funnel band was tried there and removed. The header nav
is what carries a visitor to each offer, which is why its titles are
differentiated rather than interchangeable (see Header below).

The slip forms are shared, not copied: `src/components/services/slipForms.jsx`
exports `QuickEventBookForm` and `MealPrepQuickStart`, used by both the
standalone pages and the Local Pizza panel. The standalone pages add a vertical
document rhythm on top of `.ht-scope` via `src/styles/service-page.css`.

Adding a public page needs three files in step or it 404s in production:
`src/config/routes.js`, `src/ssr/StaticApp.jsx`, and a committed `vercel.json`
rewrite. The build-time route sync does not run on Vercel.

## Thesis

From **/julydinner** we take the material system — the hand-ruled order slip:
underline inputs instead of boxes, dashed rules, wobble border-radii, Yomogi
marginalia, conversational validation copy — so booking from the homepage
feels like writing your name on the chef's clipboard. From **/sale** and
**/office-catering** we take the discipline: prices as plain typographic
facts (mono, no badges), photography doing the selling, sentence case
everywhere. We deliberately do **not** take julydinner's scene-making (no
lake, no scatter layer here) — the tabs stay quiet pages of the same
sketchbook, each distinguished by exactly one accent traced to its subject.

What was removed (the previous rework's template, repeated four times):
letter-spaced all-caps eyebrows, uniform rounded cards with soft shadows,
price pills, boxed SaaS inputs with uppercase mini-labels, pill buttons.

## Tokens (`src/styles/home-tabs.css`, scoped under `.ht-scope`)

| token | value | role |
|---|---|---|
| `--ht-ink` | `var(--brand-ink)` #3A2E3F | text, the pen |
| `--ht-paper` | `rgba(250,250,248,.92)` | the slip, over photos or the bridge bg |
| `--ht-rule` | `rgba(58,46,63,.3)` | hand-ruled input underlines |
| `--ht-accent` (meals) | `#7A846E` brand-olive | the vegetable week |
| `--ht-accent` (events) | `#C66C78` brand-rose | the celebration |
| `--ht-accent` (business) | `#3A2E3F` ink | a printed price sheet |
| `--ht-accent` (pizza) | `#F35C2B` site accent | the hearth (same accent /julydinner uses) |
| `--ht-dur-1/2` | `240ms / 600ms` | tap / settle — julydinner's scale |
| `--ht-ease` | `cubic-bezier(0.22,1,0.36,1)` | the only easing family |
| `--ht-wobble(-sm)` | uneven radius pairs | hand-drawn edges (slips, chips, submit) |

Type casting (all load globally already): **General Sans** headings,
**Source Sans 3** prose + inputs, **Yomogi** kickers/labels/marginalia,
**Office Code Pro** money, dates, and the business ledger.

The business tab is the exception that proves the wobble: its slip is a
**receipt** — straight 2px edges, one heavy ink top rule, mono kicker and
labels, prices in dashed-underline ledger rows. No wobble inside it.

## Composition per surface

1. **Weekly meals** (`/weekly-meals`) — slip left with a hero print beside it
   (`.ht-hero-photo`, with a hardcoded Cloudinary fallback so the fold is never
   half-empty when the gallery API is slow), then the real recent menus as proof,
   a pricing ledger, an FAQ, photos, and the form again at the close. Submitting
   the quick form auto-sends the intake-form email (Brevo template 27, same as
   the waitlist).
2. **Small events** (`/small-events`) — slip left over the full-bleed event
   photo, then the testimonial as a General Sans margin quote with a Yomogi
   attribution, FAQ, photos, and the form again at the close.

   Both pages carried a three-across "how it works" step row, and small events
   also had a "what we cook" taxonomy row. Removed on client direction
   (2026-07-26). Worth noting they were also the layout tell the art-direction
   skill's blacklist names — three cards in a row, made three times across three
   pages. The only three-across grid left in this system is the 308B offerings,
   where three is a real closed set.
3. **For businesses** (`/` panel 3) — the receipt. Wholesale only
   (consulting/collabs removed per client, 2026-07). Three starting prices as
   ledger rows; the email gate is one written line; the unlocked menu renders as
   more ledger rows. The hero is a `cover` background — it was a `no-repeat`
   floating rectangle that left ~45% of the panel empty.
4. **Local pizza** (`/` panel 2) — slip left over the pizza photo; the Yomogi
   ingredient note (grande / bakers field / dei fratelli) sits at the head of the
   photo grid below.
5. **About** (`/` panel 4) — brought onto this system in 2026-07. It had been
   missed: a centred rounded card with an 18/32 shadow, 0.24em uppercase
   eyebrows, and `.about-tab { font-family: var(--font-office-code) }` putting
   every paragraph of prose in monospace. Now paper slips, a hand kicker with a
   drawn olive rule, prose in Source Sans, and the newsletter as a slip instead
   of a slate Tailwind card.

## Header

Menu titles are differentiated rather than interchangeable: each carries a
one-word descriptor (Yomogi) and the accent of its destination as a hairline
that draws on hover and holds when active. Membership is the only item styled as
an action. Config in `src/config/fullPageNav.js` (`HEADER_NAV`, `HEADER_CTA`),
styles in `src/components/layout/header-nav.css`.

The active panel reaches the header through a `localeffort:panelchange` window
event. The previous mechanism inline-styled `nav button[data-menu-btn]` from
FullPageDemoPage, but the header renders anchors — so it never matched and the
active tab was never marked at all.

One Yomogi margin note per tab, maximum. Secondary paths are dashed
underlines, never buttons.

## Forms (function, not just paint)

- Phone auto-formats to `(612) 555-0123` (julydinner's formatter).
- Date inputs get `min=today`; events validate date-first with copy in the
  site's voice ("Pick the date you're hoping for…").
- The event-type `<select>` became three pressed-state chips.
- Success states are a stamped note: dashed accent border + Yomogi lead
  ("request received —", "you're in —", "menu unlocked —").
- Every quiet promise moved above the fold of the form: "No payment now —
  we confirm the date and details together first."
- Unchanged mechanics: endpoints, honeypots (`.ht-hp`), trackEvent calls,
  autocomplete attributes, sr-only crawl summaries, JSON-LD.

## Motion budget

- **Triggered only, no ambient.** One 600ms rule that draws itself under
  the heading the first time each tab is visited (`.is-drawn` set from
  `visitedPages` in FullPageDemoPage), plus 240ms hover/focus transitions.
  Transform/opacity only.
- `prefers-reduced-motion`: rules pre-drawn, hover translations off.

## Blacklist audit (what was caught)

- The old eyebrows/cards/pills were themselves tells — removed rather than
  restyled.
- First instinct for pizza was a generic tomato red; replaced with the
  repo's own `#F35C2B` so the accent traces to the codebase.
- Wobble everywhere would be a new uniform — the business tab intentionally
  refuses it.
- No fade-up-on-scroll anywhere; the only entrance is the drawn rule, which
  is the concept (a hand ruling the page), not a reveal pattern.

## Mobile & tradeoffs

Slips go full-width under 640px, form rows collapse to one column, inputs
keep the 44px touch floor and 16px font (no iOS zoom). The gallery photos'
±0.4° lean is transform-only and static — it reads as texture, not motion.
Header descriptors drop between 1024px and 1280px where the row gets tight; the
accents stay. Below 1024px the sheet carries each accent as a left tick.

Known dev quirk (pre-existing): Vite serves root `api/*.js` files as text
instead of proxying, so gallery photos only populate in production — the home
panel reads "No images found" locally.

## Structural fixes made alongside (2026-07-24)

- `.fullpage-container` is `overflow-y: clip`, not `hidden`. `hidden` still
  permits *programmatic* vertical scrolling, and `scrollIntoView` was driving
  `scrollTop` to ~60px, shoving every panel up and exposing a 60px band of page
  background under the fold on every tab. `useFullPageScroll` now drives
  `container.scrollTo({ left })` directly in horizontal mode.
- `.fullpage-section` is `height: 100%`, not `100vh` — a viewport-unit height
  inside a viewport-height flex row overflows by whatever the container's borders
  and scrollbar gutter consume.
- `.announcement-bar` is `display: block`, not `flex`. As flex items the
  whitespace-only text nodes around its highlighted `<span>` collapsed, so it
  rendered "TRY**LOCAL PIZZA**AND MORE". Its `min-height` is 56px to match
  `ANNOUNCEMENT_HEIGHT` in the JSX, which was disagreeing with a 40px CSS height.
