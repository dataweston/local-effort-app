# Home tabs (weekly meals / small events / for businesses / local pizza) — design direction

Four tabs, one job each: start a meal-prep signup, request an event date,
unlock the wholesale menu, book a pizza party. The booking form is the
destination on every tab — everything else walks the visitor toward it.

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

## Composition per tab

1. **Weekly meals** — slip left on the bridge background, facts as two mono
   lines of price math, masonry photo columns below (`.ht-polaroid` leans
   each card ±0.4°, echoing the home tab's loose snapshots).
2. **Small events** — slip floats right over the full-bleed event photo
   (mirror of meals). Date-first form: the date field leads, then chips for
   party type, then contact. Testimonial reset as a General Sans margin
   quote with a Yomogi attribution.
3. **For businesses** — the receipt. Three starting prices as ledger rows;
   the email gate is one written line (label, underline, button); the
   unlocked wholesale menu renders as more ledger rows.
4. **Local pizza** — slip left over the pizza photo; the Yomogi ingredient
   note (grande / bakers field / dei fratelli) promoted from a buried
   masonry card to the tab's margin note, beside a mono "in your freezer"
   stock note.

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
Known dev quirk (pre-existing): Vite serves root `api/*.js` files as text
instead of proxying, so gallery photos only populate in production.
