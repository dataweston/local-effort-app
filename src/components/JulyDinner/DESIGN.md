# Dinner in July — design direction

One page, one job: **sell twenty seats (or one whole night) at the Arthouse on Friday,
July 17** — and make the meal feel calm, beautiful, and mouth-watering on the way there.

## Thesis

The client's reference is a scene, not an artist: *a line-drawn child walks from the
bottom center of the page up to the top left and back toward the center, drawing a
chalk line as they go — and the closed shape turns out to be a lake.* The menu floats
along that shoreline. We take from this: a single hand-drawn gesture as the page's
entire composition, chalk as the material (grainy, displaced stroke — never a clean
vector), and a child's unhurried pacing for all motion. We deliberately do **not**
take a full illustrated storybook: the scene stays suggestive (one line, one figure,
one lake), the photography stays real and slightly abrasive (actual kitchen photos
scattered like snapshots dropped on the drawing), and everything structural speaks
the existing Local Effort voice so the page reads as ours.

## Tokens (`src/styles/july-dinner.css`)

| token | value | role |
|---|---|---|
| `--jd-paper` | `#fafaf8` | ground (the site's own near-white, not cream) |
| `--jd-ink` | `#23231f` | text + the child's line |
| `--jd-water` | `#6e9bb0` | chalk-blue: lake stroke, ripples, selected chips |
| `--jd-water-deep` | `#48748c` | hover/borders where `--jd-water` is too light |
| `--jd-accent` | `#f35c2b` | the site accent; used once (submit hover) |
| `--jd-dur-1/2/3` | `240ms / 600ms / 2400ms` | tap / settle / draw |
| `--jd-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | the only easing family |
| `--jd-wobble` | uneven border-radius pair | hand-drawn edge for panels, chips, buttons |

Type: **Yomogi** for dish names and small marginalia only (per client); **General
Sans** (`--font-display`) for structure; **Source Sans 3** (`--font-body`) for prose
and the form. All three already load globally.

## Scroll storyboard (climax: the lake)

1. **Arrival** — title, date, place, price in plain structural type. A chalk squiggle
   points down: "the menu is drawn below."
2. **The lake (climax)** — the chalk line draws itself once (2400ms, on first view),
   the child mid-stride at the bottom, twelve dishes floating on the shoreline top to
   bottom. Hovering a dish bobs and swells it gently and rings ripple out — touch the
   water, the pond answers.
3. **The particulars** — three calm paragraphs: the room, what's included, beverages.
4. **The booking** — a chalk-bordered form. Seats 1–8 or buy out the whole night.
   Beverage interests are required chips; dietary and music are optional. Square card
   + express pay, unchanged mechanics.
5. **Coda** — one line, goodbye.

## Motion budget

- **Ambient (exactly one):** a pale shimmer ellipse clipped inside the lake drifts on
  a 48s alternate cycle.
- **Triggered:** the one-time line draw; dish reveal staggered ~90ms after the draw;
  ripple rings + bob on dish hover; photo enlarge on hover, free drag on pointer.
- `prefers-reduced-motion`: line pre-drawn, dishes visible, shimmer parked, ripples
  become a simple color lift, photos still drag (that's function, not decoration).
- Transform/opacity only; the draw uses stroke-dashoffset on one path, once.

## Blacklist audit (what was caught)

- First palette instinct was warm-cream paper — replaced with the site's own
  `#fafaf8` neutral so the ground traces to the repo, not the LLM house style.
- The shared checkout's letter-spaced all-caps section labels are a tell here —
  replaced with sentence-case General Sans headings inside this page's scope.
- No fade-up-on-scroll anywhere; only the lake has an entrance, and it's the concept
  (the line being drawn), not a reveal pattern.
- The hand-drawn wobble radius and self-drawing line are on the "encouraged if the
  brief forces them" side: the brief is literally a chalk drawing.

## Mobile & tradeoffs

The lake keeps its portrait viewBox (1000×1200) so phones get the full scene; dish
type clamps down and rides the same shoreline. Only the first eight photos show under
1024px so snapshots never bury the form. The scattered photos sit *above* text by one
z-layer on purpose ("somewhat abrasive" was the brief); they are kept small and out of
the reading column's center. Buy-out charges a flat $2,550 server-side and consumes
the full seat inventory.
