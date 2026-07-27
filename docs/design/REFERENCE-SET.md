# The reference set

Twenty-one works the owner assembled as a public set in the Rijksmuseum's
collection online. This is the source material for the site's material system;
the direction drawn out of it is in [SPECIMEN.md](./SPECIMEN.md).

Source set: `https://www.rijksmuseum.nl/en/collection/set/art--fe081a96-33a8-4831-77e0-08dee78d1c6c`

## Rights

The owner has confirmed rights to use all twenty-one works, in part or whole,
on this site. Fourteen are Public Domain by the museum's own statement; the
remaining seven are in copyright and are cleared by that confirmation rather
than by the licence. Maker and date stay in the markup for every work either
way — attribution is cheap and it is how the caption strip earns its place.

Two rows deserve a note: *Tram gezien vanuit interieur* and *Bericht van de
regenmoeder* are marked Public Domain in the museum's linked data but flagged
`isDownloadable: false` by its own site API. Both are late-20th-century, so the
PD statement looks like a metadata error on the museum's end.

## Fetching

Nothing here is committed as an image. Every work is pulled on demand from the
IIIF Image API, which supports arbitrary region and size, so a detail can be
cropped server-side at print resolution instead of shipping a whole painting
and cropping it in CSS:

```
https://iiif.micr.io/{iiif}/full/1600,/0/default.webp        # width-constrained
https://iiif.micr.io/{iiif}/1000,1200,800,800/max/0/gray.jpg # region, grayscale
https://iiif.micr.io/{iiif}/info.json                        # dimensions, tiles
```

No API key is required for any of it. The museum's older key-based Collection
API is gone — it returns HTTP 410 — so anything found online that registers for
a Rijksstudio key is describing a dead service.

`scripts/reference/fetch-set.cjs` re-harvests the set and re-resolves every
work. Note that the set lives in the museum's user-set system, which the public
linked-data search cannot see: `memberOfSetId` returns nothing for it. The
script reads the site's own endpoint instead, which is undocumented and may
change:

```
https://www.rijksmuseum.nl/api/v1/collection/userset
  ?userSetId=fe081a96-33a8-4831-77e0-08dee78d1c6c&language=en&setObjectsPage=1
```

Drop the `art--` slug prefix or it 400s on validation, and page in twenties —
`setObjectsPageSize=100` is rejected, and object 21 only appears on page 2.

## The works

"Pole" is measured, not assigned: paper means more than 60% of the canvas is
light, which in practice means the subject floats on a bare sheet. See
`scripts/reference/palette.py`.

| Work | Maker, date | Accession | IIIF | Source px | Pole | Rights |
| --- | --- | --- | --- | --- | --- | --- |
| Tegel met fruitmand | anonymous, c. 1640 - c. 1660 | BK-1955-287 | `maCBx` | 5390×5390 | panel | Public Domain |
| Twee vergieten | Paul Damsté (signed by artist), 1996 | RP-T-2006-135 | `LIYef` | 5894×4458 | paper | Copyright |
| Geabstraheerde voorstelling met piramiden, palm en vrucht | Simon Koene (signed by artist), 1988 | RP-P-2001-433 | `OWAtl` | 4842×6246 | paper | Copyright |
| Eiland II | Hans Landsaat (signed by artist), 1977 | RP-P-2010-221-2747 | `GiuJS` | 5256×5438 | paper | Copyright |
| Fragment veelkleurig gestreept zijdeweefsel | Zijdeweverij Heshuyzen, 1750 - 1800 | BK-NM-8593-4-1 | `qdsLv` | 5033×7349 | paper | Public Domain |
| Tram gezien vanuit interieur | Marinus Fuit (signed by artist), 1992 | RP-P-2010-222-1461 | `YltCU` | 6412×4986 | paper | Public Domain* |
| Bericht van de regenmoeder | Harrie A. Gerritz (signed by artist), 1950 - 2009 | RP-P-2010-222-1036 | `vFGxo` | 5090×6590 | paper | Public Domain* |
| Studieblad met vruchten, planten en bloemen | Theo Nieuwenhuis, 1876 - 1951 | RP-T-1969-185(R) | `XcYvw` | 6187×4836 | paper | Public Domain |
| Stilleven met appel en een kruik | Leo Gestel, 1891 - 1941 | RP-T-1960-568 | `SBoxO` | 4314×2779 | paper | Public Domain |
| Appel (Malus domestica) | Anselmus Boëtius de Boodt, 1596 - 1610 | RP-T-BR-2017-1-9-58 | `jaTqd` | 3372×4494 | paper | Public Domain |
| Still Life with Apple | Lucassen (signed by artist), 1971 | RP-P-2010-222-771 | `uosPp` | 5068×6548 | paper | Copyright |
| Zonder titel (Untitled) | Erik Andriesse, 1979 | RP-P-2019-1 | `kgBAG` | 7844×6360 | paper | Copyright |
| Sketch for a Still Life of Fruit and Flowers | Jan van Huysum, c. 1725 - c. 1735 | RP-T-1899-A-4272 | `XrOGB` | 4608×5878 | panel | Public Domain |
| Farm in Provence | Vincent van Gogh, c. 1888-06 | SK-A-2226 | `XVgSo` | 7129×5221 | panel | Public Domain |
| Scarlet Ibis with an Egg | attributed to Dorothea Maria Gsell, 1699 - 1701 | RP-T-1977-16 | `sJofp` | 2892×3902 | panel | Public Domain |
| Five Studies of Anemones | anonymous, c. 1760 - c. 1770 | RP-T-1948-43 | `SfbIN` | 6006×4526 | paper | Public Domain |
| Flowers in a Glass Vase with a Butterfly | Herman Henstenburgh, c. 1700 | RP-T-1898-A-3500 | `GMEXG` | 5232×7048 | paper | Public Domain |
| Square Man | Karel Appel, 1951 | SK-A-5002 | `YMarE` | 4903×4990 | panel | Copyright |
| Winter Landscape with Ice Skaters | Hendrick Avercamp (signed by artist), c. 1608 | SK-A-1718 | `aXnzA` | 6337×3674 | panel | Public Domain |
| A Pelican and other Birds near a Pool ('The Floating Feather') | Melchior d'Hondecoeter, c. 1680 | SK-A-175 | `BaFQb` | 4739×5186 | panel | Public Domain |
| Still Life with Asparagus | Adriaen Coorte (mentioned on object), 1697 | SK-A-2099 | `OHDPD` | 4747×5908 | panel | Public Domain |

\* Public Domain per the museum's linked data, but flagged not-downloadable by
its site API. Treat as unsettled.

## Scripts

All in `scripts/reference/`. They need `pillow` and `numpy`; none of them run
at build time.

| Script | What it does |
| --- | --- |
| `fetch-set.cjs` | Re-harvest the set, resolve each work to its linked-data id |
| `palette.py` | Download working copies, extract palettes with true coverage ratios |
| `accents.py` | Split ground from accent across the two poles |
| `destinations.py` | Derive one accent per nav destination from a nominated work |
| `make-paper.py` | Cut the tileable paper ground used by the whole site |
| `art-set-palette.json` | Cached output — every work with palette, ratios, rights |
