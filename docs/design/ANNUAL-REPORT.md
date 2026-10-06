# Annual report — direction

`/annual-report`, built in `src/pages/AnnualReportPage.jsx` and
`src/styles/annual-report.css`. It extends the specimen system
([SPECIMEN.md](./SPECIMEN.md)); it does not have a look of its own.

## What the page is for

The owners read a January–September cashflow window — what came in, what it
cost, what remained after unresolved outflows and founder draws — and can
check every figure against the statement at the end. Reading and checking are
the whole job. There is no call to action.

## Thesis

Read off the repo: the site already has a measured material system, taken from
the owner's Rijksmuseum set — paper sheet, one dark band, ruled frames, caption
strips, a hand note in Yomogi, figures in mono. The old report ignored it and
used terracotta on cream, DM Sans with a Playfair italic, mono-caps eyebrows,
01–06 markers and a grid of metric cards, none of which trace to the site.

This page puts the report's content into the house system. Each figure is
labelled where it is drawn, the long numbers sit in a ruled ledger, and the
photographs lie on the sheet with the shared raking shadow. The one place it
departs from the service pages is that it is a ledger first: charts are
direct-labelled with no legend, and the full statement is the destination
rather than the call to action.

Not taken: the Golden Age painting look beyond the single Coorte band, and any
decorative use of the museum works. Each plate is food.

## Genre notes

The research tools could read the Figma and Dribbble tag pages only as search
results, not the shots themselves, so these come from the sources that did
load (an annual-report roundup, Figma community templates) and from the form:
charts are treated as editorial content rather than buried in tables, one
visual system holds across every spread, photography is the company's own
rather than stock, and the financial statement is kept in full, ruled, with
negatives in parentheses.

## Evidence for each decision

| Decision | Traces to |
| --- | --- |
| Sheet field, ink, one oxide accent for rules and negatives | `brand-tokens.css:72-76` |
| One dark band; Coorte's ground is the measured `--brand-void` | `brand-tokens.css:73`, `SPECIMEN.md` "Coorte's asparagus" |
| Type: General Sans / Source Sans 3 / Office Code Pro / Yomogi | `index.css:65-69` |
| Caption strip instead of eyebrows | `specimen.css:144-171` |
| Double-ruled frame and folio around the statement | `specimen.css:96-119` |
| Reveal by degree of finish; bars grow inside the 600ms window | `specimen.css:186-233`, `useSpecimenReveal.js` |
| Durations and easing | `brand-tokens.css:109-112` |
| Mount-board bar, drawn underline for the current section | `SPECIMEN.md` "Wayfinding", `header-nav.css:90-100` |

The oxide used for negative figures is `--brand-oxide` mixed 30% toward ink
(`--ar-oxide-text`), because the measured value is 3.9:1 on the sheet and fails
for small text. Parentheses carry the meaning; colour only reinforces it.

## Choreography

1. **Cover.** A plate and its caption strip. Above the fold, so it never waits.
2. **Summary.** Five figures in a ledger beside the month chart. Two hand notes
   mark the two months the text mentions.
3. **Where the money went.** A waterfall from net revenue to operating income.
   Each deduction starts where the last one stopped.
4. **The dark band — the climax.** Operating income, over Coorte's asparagus,
   with the raking light. The only dark surface on the page.
5. **Release.** Where revenue came from, then Happy Monday, each with its own
   photographs and the caveats stated in plain sentences.
6. **The statement.** Full income statement, ruled and tabular.
7. **Notes.** Terms, what is still open, sources.

## Motion

Same two layers as the rest of the site. Ambient: the raking light on the dark
band, 48s. Triggered: each section's rule draws, plates arrive as a wash then
settle, bars grow from their baseline staggered 30–60ms a step. Transform and
opacity only. The cover is not wrapped in a reveal.

`prefers-reduced-motion` presents the finished page: rules drawn, bars full,
plates saturated. Prerender and no-JS do the same because
`useSpecimenReveal` starts at `done`.

**Testing the reveal in dev.** `src/index.jsx` wraps the app in
`React.StrictMode`, which runs effects twice in development. The hook's "arm
once" guard then skips re-observing, so in `pnpm start` every revealed section
stays hidden. Production does not double-invoke effects. To exercise the reveal
locally, remove StrictMode temporarily or test a production build.

## Mobile

Under 52rem everything stacks. The cover plate goes above the caption strip, the
strip becomes rows, the waterfall and channel rows fold so the figure sits beside
the label and the bar takes the line beneath, the Coorte plate runs full width
under the text with its fade turned vertical, and the statement scrolls sideways
with its labels pinned. The top bar scrolls sideways instead of wrapping.

## Images

- Cover, quality plate and the meal-prep thumbnail: `public/annual-report/*.webp`,
  resized from `public/gallery` originals (3 MB down to 60–160 KB).
- Events thumbnail and the handwritten menu: Cloudinary, public IDs already used
  elsewhere on the site.
- Coorte and the Delft tile: IIIF from the museum
  (`docs/design/REFERENCE-SET.md`). Maker, date and accession number stay in the
  caption.

## Blacklist audit

- Cream + clay: kept the measured sheet and oxide only, oxide never fills a
  surface or a button, and the dark void breaks the pairing.
- DM Sans, Playfair, DM Mono: removed.
- Eyebrows and 01–06 markers: removed. The rail with rotated numbered links is
  replaced by a bar with plain links.
- Metric cards and bento: replaced by ledgers.
- Count-up numbers, fade-up reveals, gradient fills: none.
- Copy: headlines are plain labels ("Where the money went"). Anything the old
  page claimed that the data does not show ("a stronger middle", "gross profit
  grew faster than the operating result") is gone. Every number in the prose is
  computed from `MONTHS` and `TOTALS`.
