# Specimen — direction for the public site

The material system behind every page reachable from the header: `/`,
`/weekly-meals`, `/small-events`, `/sale`, `/localist`, and the home panels for
Local Pizza, For Business and About.

Sources are the twenty-one works in [REFERENCE-SET.md](./REFERENCE-SET.md).
Implementation is `src/styles/specimen.css`, tokens in
`src/styles/brand-tokens.css`, reveal in `src/hooks/useSpecimenReveal.js`.

## Thesis

The set is not a collection of Dutch paintings. Thirteen of the twenty-one are
paper — specimen sheets, study sheets, mounted drawings — where a subject
floats alone on a bare sheet with a cast shadow, named in handwriting, and the
apparatus of documentation is left visible rather than tidied away: ruled
borders, folio numbers, accession marks, three-language captions.

We take that grammar as the site's structure. From Coorte and Hondecoeter we
take the one thing paper cannot give — a near-black field under a single raking
light — and spend it once per page, on the moment that matters. We keep the
motion contract /julydinner already established, unchanged.

We deliberately do **not** take the Golden Age painting look: no gilt, no
chiaroscuro pastiche, no museum-wall framing. The set's own centre of gravity
is the working sheet, not the finished picture.

### What the sources actually say

Three findings did the most work, and none of them survive a description of
these works from memory — they came from looking:

- **de Boodt's apple sheet** (`RP-T-BR-2017-1-9-58`) is a layout system. Double
  ruled border, four apples floating with cast shadows, `153` handwritten in
  the corner, and a caption strip along the bottom divided into three cells:
  *Boheemsche Appel · Poma Bohemica · Pomme de Bohème*. A header, a grid and a
  footer, drawn around 1600. It is the reason `.specimen-caption` exists and
  the reason this site has no letter-spaced all-caps eyebrows.
- **Nieuwenhuis's study sheet** (`RP-T-1969-185`) carries four states of
  completion at once — hawthorn fully painted, anemones in bare outline, a root
  system in pencil, an apple and pear cut open. That is where the reveal comes
  from: things here *finish*, they do not slide.
- **Coorte's asparagus** (`SK-A-2099`) is 81% void with one light from the
  upper left and the signature inked into the stone ledge. It is the only work
  in the set with a climax, and it is the model for how a page spends its dark
  band.

## Tokens

Everything below is measured, not chosen. `scripts/reference/palette.py`
regenerates the numbers.

| Token | Value | Source |
| --- | --- | --- |
| `--brand-linen` | `#F1E3D8` | shipped brand; measured sheet median `#F3EBE5` sits within a hair of it |
| `--brand-sheet` | `#F3EBE5` | median ground across the 13 paper works |
| `--brand-void` | `#18130C` | Coorte's ground — 81% of that canvas |
| `--brand-oxide` | `#A26354` | median accent; covers 4.2% of a sheet and no more |
| `--brand-mount` | `#E4E4D8` | the board Henstenburgh's sheet is hinged to |
| `--accent-poppy` | `#8F3031` | Henstenburgh |
| `--accent-apple` | `#AC4C4B` | de Boodt |
| `--accent-ochre` | `#794F2B` | Avercamp |
| `--le-dur-1/2/3` | 240 / 600 / 2400ms | canonical copy of `july-dinner.css:19-21` |
| `--le-ease` | `cubic-bezier(.22,1,.36,1)` | same |
| `--le-ambient` | 48s | one loop, matching `july-dinner.css:432` |

The six nav accents were left alone. They already trace to subject
(`home-tabs.css:9-12`) and the measurements did not beat them for identity —
Coorte and Hondecoeter, asked for an accent, return dark browns, because that
is honestly what their most saturated pixels are. Those two lend the void
instead.

**The field is the sheet; the chrome is the mount.** The header takes
`--brand-mount` so it frames the page rather than reading as a mismatched band
of the old field. That is the Henstenburgh construction: board around sheet.

## Choreography

### The service pages

`/weekly-meals`, `/small-events`, `/localist` and `/sale` share one shell
(`service-page.css`). Their journey is not a funnel building to a call to
action, because the call to action is the hero: the order slip is the first
thing on the page. The script is therefore not *persuade, then ask* — it is
**ask, then answer the things that stop someone finishing.**

1. **The slip, on the sheet.** Form and one large photograph side by side, the
   photograph carrying a cast shadow so it sits *on* the page rather than in
   it. Price is stated here, in mono, before anything is asked for.
2. **The ledger.** What it costs, ruled, no cards and no badges.
3. **The steps.** How it actually works.
4. **The dark band — the climax.** One section drops to `--brand-void` and
   carries a single work full-bleed under the raking light, with the quote over
   it. This is the only dark surface on the page and the only moment of
   maximum intensity. Spend it once.
5. **Release, and the slip again.** Back to sheet, gallery, and the same form
   restated at the close for anyone who scrolled instead of filling.

Cover the CTA and the page still points at it: the slip is where the eye enters
and the closing slip is where it exits.

### The home page

`/` is a horizontal scroll-snap container of four panels, which makes it a
different instrument — the beats are lateral, not vertical, and each panel is
its own sheet. The photo wall is panel one and stays chrome-free by client
direction (`fullPageNav.js:86-88`). The dark band belongs to Local Pizza, which
is the one panel with a hearth in it.

### Wayfinding

The header already does this in the page's own language: each item grows a 2px
rule in the accent of the place it leads to (`header-nav.css:90-100`), drawn
rather than rendered. Nothing else is needed, and no scroll arrow should be
added.

## Motion

Two layers, and only two.

**Ambient** is one element per page: `.specimen-void__light`, a raking gradient
drifting on a 48-second cycle, transform and opacity only. Long enough that the
eye cannot count it.

**Triggered** is the completion reveal. A section's rule draws itself, the
subject arrives desaturated like a wash, then the colour settles — three stages
inside one ~900ms window, staggered four steps of 90ms and no further. Nobody
waits for a page to assemble itself.

`prefers-reduced-motion` is designed, not switched off: everything presents
already finished — drawn, saturated, settled — and the raking light holds at
one position. Nothing is hidden and nothing waits. The observer
(`useSpecimenReveal.js`) also resolves to the finished state when
`IntersectionObserver` is missing, so the prerender pass and any
non-JS environment get the complete page rather than a blank one.

## Mobile

The caption strip is the only primitive that changes shape: three cells become
stacked rows under 40rem, dividers rotating from vertical to horizontal, since
three columns of caption at 375px is unreadable. The ruled frame keeps its
inset at every width — it is a hairline, and it does not need to scale. The
paper tile is 512px and repeats, so it costs the same at any viewport.

## What was deliberately not done

The blacklist audit for this direction, kept because the next contributor will
be tempted by exactly these:

- **Warm cream + clay accent** is the most recognisable machine-design palette
  there is. It survives here only because it is measured — `#F3EBE5` is the
  literal median of thirteen works and `#F1E3D8` predates this work — and it is
  fenced: the accent stays at the measured `#A26354` (31% saturation, against
  the tell's 63%), stays near its measured 4% coverage, and is never a button
  fill, a heading colour or a gradient. The second field is Coorte's void,
  which breaks the cream-and-clay reading outright. If the accent drifts
  brighter or spreads, this has failed.
- **Numbered 01/02/03 markers** — cut as a sequence device. Numerals appear
  only as the sources use them: folio numbers and real accession numbers.
  `localist-membership.css:10-14` records that the rest of the site already
  removed these once; do not reintroduce them.
- **Letter-spaced all-caps eyebrows** — replaced by the caption strip, which is
  the same job done the way the source does it.
- **Generated noise texture** — the paper is a real crop from the empty margin
  of `RP-T-1948-43`, pulled at native resolution through the IIIF region
  endpoint and mirror-tiled. It carries actual fibre and foxing.
- **Uniform fade-up-20px reveals** — replaced by the completion reveal above.
- **Bento grids and three-card rows** — the specimen sheet is deliberately
  non-grid, varied in scale, with cast shadows.

One tension is unresolved and worth stating: annotations are set in Yomogi,
which is the house's established handwriting voice, while the references'
handwriting is 17th-century copperplate and Dutch cursive. Extending the
existing system won that argument on purpose. Revisit only with a real
copperplate italic, never with a generic script face.
