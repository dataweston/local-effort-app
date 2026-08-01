#!/usr/bin/env node
/**
 * Create (or update) the Wave 1 event-dates email as a DRAFT campaign in Brevo.
 *
 * This is a TEMPLATE, not a message. Every piece of prose is lorem ipsum and
 * every value a wrong guess would make misleading — dates, seat counts, prices —
 * is a bracketed placeholder rather than a plausible-looking invention, so the
 * draft cannot be sent by accident and read as true. The owner replaces the
 * copy; the design is the deliverable.
 *
 *   node scripts/create-wave1-events-template-draft.js --dry-run   print the HTML
 *   node scripts/create-wave1-events-template-draft.js             create the draft
 *
 * Draft only. No scheduledAt, no sendNow — same contract as
 * create-chez-garage-media-draft.js and the rule in AGENTS.md: everything goes
 * out through Brevo and a human sends it. Re-running updates the existing draft
 * (matched by campaign name) instead of stacking duplicates, and leaves the
 * subject alone once it exists.
 *
 * ── Design ────────────────────────────────────────────────────────────────
 * Direction: docs/design/SPECIMEN.md. Sources are the twenty-one Rijksmuseum
 * works in docs/design/REFERENCE-SET.md, already measured into
 * src/styles/brand-tokens.css:56-113, plus three pages of this site:
 *
 *   /            the photo wall — many photographs, 10px gutters, varied
 *                aspect, no cards and no captions (FullPageDemoPage.jsx:1746,
 *                layoutConfig gap: 10). Becomes the specimen plate below.
 *   /julydinner  marginalia hanging outside the measure, snapshots with a
 *                sideways cast shadow (july-dinner.css:18-23). Becomes the
 *                margin note. Its hearth accent #F35C2B is deliberately NOT
 *                taken — that page is a summer lake party and this is an
 *                invitation to people spending real money.
 *   /chez-garage the four-cell fact list, labelled and mono, price stated
 *                before anything is asked (ChezGaragePage.jsx:384-401).
 *                Becomes the dates ledger.
 *
 * An email is literally a sheet of fixed width sitting on a field, which is the
 * Henstenburgh construction SPECIMEN.md:74-76 already names: board around
 * sheet. So the mount is the page field, the sheet is the column, de Boodt's
 * double rule holds it (specimen.css:96-108), the folio number sits in the
 * corner, and the three-cell caption strip does the job a letter-spaced all-caps
 * eyebrow would otherwise do — which is how the source does it, and why this
 * site has no eyebrows (SPECIMEN.md:158-160).
 *
 * The void is spent once, on the invitation, per SPECIMEN.md:93. Coorte's
 * asparagus (SK-A-2099) is 81% near-black with one light from the upper left and
 * the signature inked in below; that is the construction of the dark band, and
 * it is why the photograph sits INSIDE the dark field rather than having text
 * laid over it. Text-over-photo would also have needed a background-image on a
 * <td>, which Outlook drops without VML. The faithful choice and the robust one
 * are the same choice here.
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local'), override: false });

const CAMPAIGN_NAME = 'Wave 1 — event dates (design template)';
const WAVE_1_LIST_ID = 21; // "Summer Sale 2026 - Wave 1 - 45"
const EVENTS_URL = 'https://www.localeffortfood.com/small-events';

// Placeholder on purpose: this draft has no message in it yet.
const SUBJECT = '[Subject line — replace before sending]';

/* ── Palette ───────────────────────────────────────────────────────────────
   Email cannot use the custom properties in brand-tokens.css — Outlook's Word
   engine ignores var() and rgba() both — so the token values are flattened here
   and nowhere else. The alpha rules are composited against the sheet by hand so
   the hairlines survive Outlook as solid hex:

     --specimen-rule       rgba(58,46,63,.42) over #F3EBE5  ->  #A59C9F
     --specimen-rule-hair  rgba(58,46,63,.18) over #F3EBE5  ->  #D2C9C7
     --color-text-secondary rgba(58,46,63,.78) over #F3EBE5 ->  #635864
     --color-text-muted    rgba(58,46,63,.60) over #F3EBE5  ->  #847A81
     --brand-linen at 70%  over #18130C                     ->  #B0A49B

   --brand-oxide #A26354 measures 4.00:1 against the sheet, which passes for
   rules and large type and fails for body copy. That matches the fence
   SPECIMEN.md:150-157 already put around it — never a button fill, never a
   heading colour — so here it is a 2px rule above the ledger and nothing else.
   Body text and links stay ink. */
const C = {
  mount: '#E4E4D8',   // brand-tokens.css:75 — Henstenburgh's mount board
  sheet: '#F3EBE5',   // brand-tokens.css:72 — median ground of the 13 paper works
  void: '#18130C',    // brand-tokens.css:73 — Coorte's ground
  linen: '#F1E3D8',   // brand-tokens.css:2
  ink: '#3A2E3F',     // brand-tokens.css:8
  secondary: '#635864',
  muted: '#847A81',
  rule: '#A59C9F',
  hair: '#D2C9C7',
  oxide: '#A26354',   // brand-tokens.css:74 — 4.2% coverage on a sheet, no more
  onVoid: '#B0A49B',
};

/* Prose is Georgia and data is Courier New, following the only email this house
   has already shipped (create-chez-garage-media-draft.js:51,54). Neither is a
   webfont, so nothing here depends on a font load, and the pairing carries the
   site's own casting — Source Sans 3 for prose, Office Code Pro for money and
   data — into the two faces every mail client actually has. */
const SERIF = "Georgia,'Times New Roman',serif";
const MONO = "'Courier New',Courier,monospace";

/* ── Photography ──────────────────────────────────────────────────────────
   Chosen by looking, not by filename: the whole /api/search-images pool was
   pulled down as contact sheets first. f_jpg rather than f_auto — Cloudinary
   picks webp off the Accept header and mail clients do not send a usable one.
   Requested at 2x and declared at 1x. */
const CLD = 'https://res.cloudinary.com/dokyhfvyd/image/upload';
const img = (id, w, h) => `${CLD}/c_fill,g_auto,f_jpg,q_auto:good,w_${w * 2},h_${h * 2}/${id}`;

// Widths. 600 outer keeps every client happy; the mount takes 16 either side,
// the frame takes its own 6, and the sheet's inner padding takes 26.
const SHEET_W = 568;
const BLEED_W = 556; // inside the double rule — the void band runs to here
const TEXT_W = 504;  // inside the sheet padding

// The plate. Three columns of two tiles, tile heights differing but every
// column summing to 338 + one 8px gutter, so the columns land level while no
// two tiles match. That is the photo wall's masonry without the drag handles.
const PLATE_W = 162;
const PLATE = [
  [
    // Asparagus, chives, chive blossoms laid out flat. It rhymes with Coorte's
    // Still Life with Asparagus, which is the one work in the set with a
    // climax (SPECIMEN.md:44-46), and it is shot like a study sheet.
    { id: 'eziwhpekv6rqjubsxhwf', h: 216, alt: 'Asparagus and chive blossoms laid out on a pale ground' },
    { id: 't68wei1oxkqzwkphieoz', h: 122, alt: 'Wine poured beside plated dessert on a laid table' },
  ],
  [
    { id: 'judrmh6wucu5glfx5rjt', h: 122, alt: 'Chilled shrimp in coupes on white linen with yellow flowers' },
    { id: 'vkrkotr669hts9trijjo', h: 216, alt: 'A long table set with serving bowls and candles' },
  ],
  [
    // A cake slice on a botanical plate: painted flowers, a moth, and a Latin
    // binomial printed on the rim. A specimen sheet that happens to be dinner.
    { id: 'zgzf0e2svmxssdshbrkl', h: 162, alt: 'A slice of tart on a botanical plate printed with flowers and a moth' },
    { id: 'ecamocv76bjmkhzeyvck', h: 176, alt: 'A basket of cut greens and wildflowers on a tree stump' },
  ],
];

// The opening figure: an overhead of a laid table, 9638x3628 native, so the
// 2.66:1 band is the photograph's own shape rather than a crop imposed on it.
const FIGURE = {
  id: 'ej6cf0cddqox3vmdbzab',
  w: TEXT_W,
  h: 190,
  alt: 'Overhead view of a long table laid with linen, serving dishes and cutlery',
};

// The climax: the site's own hero (cloudinaryContent.js:9) — a long table under
// paper lanterns at dusk, guests seated. The client's single most deliberate
// image choice, and it is already lit from behind, so it glows against the void
// without any filter laid on top of it.
const CLIMAX = {
  id: 'vjuesai2mxfavpq9d2df',
  w: BLEED_W,
  h: 312,
  alt: 'Guests seated at a long table under paper lanterns at dusk',
};

const LOREM = {
  pre: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.',
  head: 'Lorem ipsum dolor sit amet, consectetur',
  lede:
    'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque '
    + 'laudantium, totam rem aperiam eaque ipsa quae ab illo inventore veritatis.',
  body:
    'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia '
    + 'consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
  invite:
    'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci '
    + 'velit, sed quia non numquam eius modi tempora incidunt ut labore.',
  margin: 'Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse.',
  cta: 'Lorem ipsum dolor',
};

// Three rows, because "a few dates" is three. Dates, seats and prices are
// bracketed rather than lorem: a plausible-looking wrong date is the one kind of
// placeholder that does damage if this draft ever goes out unedited.
const DATES = [
  { when: '[ DATE ]', title: 'Lorem ipsum dolor sit', note: 'Consectetur adipiscing elit, sed do eiusmod tempor incididunt.', meta: '[ SEATS ] · [ PRICE ]' },
  { when: '[ DATE ]', title: 'Ut enim ad minim veniam', note: 'Quis nostrud exercitation ullamco laboris nisi ut aliquip.', meta: '[ SEATS ] · [ PRICE ]' },
  { when: '[ DATE ]', title: 'Duis aute irure dolor', note: 'In reprehenderit in voluptate velit esse cillum dolore eu fugiat.', meta: '[ SEATS ] · [ PRICE ]' },
];

const cell = (content, style) => `<td style="${style}">${content}</td>`;

// de Boodt's caption strip: three cells divided by rules, from the bottom of
// RP-T-BR-2017-1-9-58. Two data cells and one in the hand. Sentence case, not
// all caps — see specimen.css:138-143.
const captionStrip = (cells, { top = C.rule, color = C.muted } = {}) => `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-top:1px solid ${top};">
  <tr>
    ${cells.map(({ text, hand }, i) => cell(
      text,
      `padding:7px 10px 7px ${i === 0 ? '0' : '10px'};`
      + `${i < cells.length - 1 ? `border-right:1px solid ${C.hair};` : ''}`
      + `font-family:${hand ? SERIF : MONO};`
      + `${hand ? 'font-style:italic;' : 'letter-spacing:0.01em;'}`
      + `font-size:12px;line-height:1.4;color:${color};vertical-align:top;`,
    )).join('\n    ')}
  </tr>
</table>`;

const html = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>Local Effort Cooperative</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  /* Progressive enhancement only. Everything structural is inlined above, so a
     client that drops this block still gets the sheet, the rules and the void. */
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
  /* Collapsed borders keep the ruled tables — caption strip, ledger — from
     doubling their hairlines. The cost is that padding no longer applies to a
     <table> box at all, so every piece of vertical rhythm in this email lives
     on a <td>. Putting it back on a table silently does nothing. */
  table { border-collapse:collapse !important; }
  a { color:${C.ink}; }

  /* The cast shadow from specimen.css:126-132. Directional because every source
     in the set is lit from the upper left (--specimen-light: -32deg), so nothing
     here casts straight down. Outlook drops box-shadow and the figure lands flat
     on the sheet, which is a photograph on paper either way. */
  .figure { box-shadow:14px 10px 22px -12px rgba(58,46,63,0.42); }

  /* Cerberus columns: <th> takes display:inline-block where <td> does not. */
  .col { display:inline-block; width:100%; max-width:${PLATE_W}px; vertical-align:top; font-weight:normal; text-align:left; }

  @media screen and (max-width:480px) {
    .col { max-width:100% !important; }
    .col img { width:100% !important; height:auto !important; }
    .pad { padding-left:18px !important; padding-right:18px !important; }
    .pad-l { padding-left:18px !important; }
    .pad-r { padding-right:18px !important; }
    .head { font-size:25px !important; }
    /* The caption strip is the one primitive that changes shape under 40rem —
       three cells become stacked rows, same as specimen.css:173-184. */
    .capcell { display:block !important; width:100% !important; border-right:0 !important; border-bottom:1px solid ${C.hair} !important; padding-left:0 !important; }
  }

  /* Best effort against forced dark mode. Every pin is an explicit class on the
     element that owns the surface — never a descendant selector. An earlier
     draft pinned ".sheet td", which reaches every cell in the email including
     the void band, and repainted the climax linen-on-linen. Gmail's own
     inversion still cannot be opted out of, but nothing here fights itself. */
  @media (prefers-color-scheme:dark) {
    .pin-mount { background-color:${C.mount} !important; }
    .pin-sheet { background-color:${C.sheet} !important; }
    .pin-void  { background-color:${C.void} !important; }
    .pin-linen { background-color:${C.linen} !important; }
    .ink { color:${C.ink} !important; }
    .on-void { color:${C.linen} !important; }
    .on-linen { color:${C.void} !important; }
  }
  [data-ogsc] .pin-mount { background-color:${C.mount} !important; }
  [data-ogsc] .pin-sheet { background-color:${C.sheet} !important; }
  [data-ogsc] .pin-void  { background-color:${C.void} !important; }
  [data-ogsc] .pin-linen { background-color:${C.linen} !important; }
  [data-ogsc] .ink { color:${C.ink} !important; }
  [data-ogsc] .on-void { color:${C.linen} !important; }
  [data-ogsc] .on-linen { color:${C.void} !important; }
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.mount};">

<div style="display:none;font-size:1px;color:${C.mount};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${LOREM.pre}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

<table role="presentation" class="pin-mount" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${C.mount}" style="background-color:${C.mount};">
<tr><td class="pin-mount" align="center" style="padding:24px 16px 40px;">

<!-- The sheet, held by de Boodt's double border: a firm rule outside, a
     hairline 5px in, the gap between them doing the work. Square corners —
     every ruled border in the set was drawn with a straight edge
     (specimen.css:91-100). -->
<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${SHEET_W}"><tr><td><![endif]-->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;max-width:${SHEET_W}px;border:1px solid ${C.rule};">
<tr><td class="pin-sheet" style="padding:5px;background-color:${C.sheet};">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${C.hair};background-color:${C.sheet};">
<tr><td class="pin-sheet" style="background-color:${C.sheet};">

  <!-- Masthead. The folio number sits in the corner the way a cataloguer wrote
       it on the sheet (specimen.css:110-119). -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      ${cell(
        '<span class="ink" style="font-family:' + SERIF + ';font-size:15px;color:' + C.ink + ';">Local Effort Cooperative</span>',
        'vertical-align:bottom;padding:26px 0 0 26px;',
      ).replace('<td ', '<td class="pad-l" ')}
      ${cell(
        '<span style="font-family:' + MONO + ';font-size:11px;color:' + C.muted + ';">fol. 001</span>',
        'vertical-align:bottom;text-align:right;padding:26px 26px 0 0;',
      ).replace('<td ', '<td class="pad-r" ')}
    </tr>
  </table>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td class="pad" style="padding:16px 26px 0;">
      ${captionStrip([
        { text: 'Lorem ipsum' },
        { text: 'Dolor sit amet' },
        { text: 'consectetur adipiscing', hand: true },
      ]).replace(/<td style="/g, '<td class="capcell" style="')}
    </td></tr>
  </table>

  <!-- Beat 1: the figure, alone on the sheet, lit from the upper left. -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td class="pad" style="padding:30px 26px 0;">
      <img class="figure" src="${img(FIGURE.id, FIGURE.w, FIGURE.h)}" width="${FIGURE.w}" height="${FIGURE.h}" alt="${FIGURE.alt}" style="width:100%;max-width:${FIGURE.w}px;height:auto;" />
    </td></tr>
  </table>

  <!-- Beat 2: the address. -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td class="pad" style="padding:32px 26px 0;">
      <h1 class="head ink" style="margin:0 0 14px;font-family:${SERIF};font-weight:normal;font-size:29px;line-height:1.18;letter-spacing:-0.008em;color:${C.ink};">${LOREM.head}</h1>
      <p style="margin:0 0 14px;font-family:${SERIF};font-size:17px;line-height:1.62;color:${C.ink};">${LOREM.lede}</p>
      <p style="margin:0;font-family:${SERIF};font-size:15px;line-height:1.68;color:${C.secondary};">${LOREM.body}</p>
    </td></tr>
  </table>

  <!-- Beat 3: the plate. The homepage wall, once you can no longer drag it —
       three columns, six tiles, no two the same height, columns level. -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td class="pad" style="padding:30px 26px 0;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
        <tr>
        ${PLATE.map((column, ci) => `<th class="col" style="padding:0 ${ci < 2 ? '8px' : '0'} 0 0;">
          ${column.map((tile, ti) => `<img src="${img(tile.id, PLATE_W, tile.h)}" width="${PLATE_W}" height="${tile.h}" alt="${tile.alt}" style="width:100%;max-width:${PLATE_W}px;height:auto;${ti === 0 ? 'margin-bottom:8px;' : ''}" />`).join('\n          ')}
        </th>`).join('\n        ')}
        </tr>
      </table>
    </td></tr>
  </table>

  <!-- Beat 4: the ledger. /chez-garage states the terms in mono before it asks
       for anything (ChezGaragePage.jsx:384-401); so does this. The 2px oxide
       rule is the only place the accent appears in the whole email. -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td class="pad" style="padding:34px 26px 36px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-top:2px solid ${C.oxide};">
        ${DATES.map((d, i) => `<tr>
          ${cell(
            `<span style="font-family:${MONO};font-size:12px;line-height:1.5;color:${C.ink};">${d.when}</span>`,
            `width:104px;padding:14px 12px 14px 0;vertical-align:top;${i > 0 ? `border-top:1px solid ${C.hair};` : ''}`,
          )}
          ${cell(
            `<span class="ink" style="font-family:${SERIF};font-size:17px;line-height:1.35;color:${C.ink};">${d.title}</span>`
            + `<br /><span style="font-family:${SERIF};font-size:14px;line-height:1.6;color:${C.secondary};">${d.note}</span>`
            + `<br /><span style="font-family:${MONO};font-size:11px;line-height:2.1;color:${C.muted};">${d.meta}</span>`,
            `padding:14px 0;vertical-align:top;${i > 0 ? `border-top:1px solid ${C.hair};` : ''}`,
          )}
        </tr>`).join('\n        ')}
      </table>
    </td></tr>
  </table>

  <!-- Beat 5: the void — the climax, spent once (SPECIMEN.md:93). Coorte's
       construction: the subject alone in a near-black field, the writing
       inked in below it. Full bleed to the inner rule. -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td class="pin-void" bgcolor="${C.void}" style="background-color:${C.void};padding:0;">
      <img src="${img(CLIMAX.id, CLIMAX.w, CLIMAX.h)}" width="${CLIMAX.w}" height="${CLIMAX.h}" alt="${CLIMAX.alt}" style="width:100%;max-width:${CLIMAX.w}px;height:auto;" />
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr><td class="pad pin-void" bgcolor="${C.void}" style="padding:28px 26px 32px;background-color:${C.void};">
          <p class="on-void" style="margin:0 0 22px;font-family:${SERIF};font-size:18px;line-height:1.66;color:${C.linen};">${LOREM.invite}</p>

          <!-- The destination, not an interruption. Linen fill on the void:
               the sheet reappearing in the dark. Oxide is never a button fill
               (SPECIMEN.md:150-157), and nothing here is rounded. -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
            <tr><td class="pin-linen" bgcolor="${C.linen}" style="background-color:${C.linen};">
              <a class="on-linen" href="${EVENTS_URL}" style="display:block;padding:14px 30px;font-family:${SERIF};font-size:15px;line-height:1;color:${C.void};text-decoration:none;">${LOREM.cta}</a>
            </td></tr>
          </table>

          <p style="margin:20px 0 0;font-family:${MONO};font-size:11px;line-height:1.6;color:${C.onVoid};">Lorem ipsum · dolor sit amet</p>
        </td></tr>
      </table>
    </td></tr>
  </table>

  <!-- Release. The margin note from /julydinner: it hangs outside the measure
       against a rule instead of sitting in a card. -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td class="pad" style="padding:38px 26px 0;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="border-left:1px solid ${C.oxide};padding-left:16px;">
          <p style="margin:0;font-family:${SERIF};font-style:italic;font-size:15px;line-height:1.66;color:${C.secondary};">${LOREM.margin}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td class="pad" style="padding:36px 26px 28px;">
      ${captionStrip([
        { text: 'Minneapolis&ndash;St. Paul' },
        { text: 'Est. 2022' },
        { text: 'worker-owned', hand: true },
      ]).replace(/<td style="/g, '<td class="capcell" style="')}
      <p style="margin:14px 0 0;font-family:${SERIF};font-size:12px;line-height:1.6;color:${C.muted};">
        Local Effort Cooperative &middot; <a href="mailto:yum@localeffortfood.com" style="color:${C.muted};">yum@localeffortfood.com</a><br />
        <a href="{{ unsubscribe }}" style="color:${C.muted};">Unsubscribe</a>
      </p>
    </td></tr>
  </table>

</td></tr>
</table>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->

</td></tr>
</table>
</body>
</html>`;

async function main() {
  if (process.argv.includes('--dry-run')) {
    process.stdout.write(`Campaign: ${CAMPAIGN_NAME}\nSubject:  ${SUBJECT}\nList:     ${WAVE_1_LIST_ID}\n\n${html}\n`);
    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured');
  const headers = { 'api-key': apiKey, accept: 'application/json', 'content-type': 'application/json' };

  const sendersRes = await fetch('https://api.brevo.com/v3/senders', { headers });
  const senders = await sendersRes.json();
  const sender = (senders.senders || []).find((s) => s.active) || (senders.senders || [])[0];
  if (!sender) throw new Error('No verified Brevo sender available');

  const existingRes = await fetch('https://api.brevo.com/v3/emailCampaigns?limit=100&status=draft', { headers });
  const existing = await existingRes.json();
  const match = (existing.campaigns || []).find((c) => c.name === CAMPAIGN_NAME);

  // Same rule as the media pitch: an update sends the body and nothing else, so
  // re-running never overwrites a subject the owner has since written.
  const payload = match
    ? { htmlContent: html }
    : {
      name: CAMPAIGN_NAME,
      subject: SUBJECT,
      type: 'classic',
      sender: { name: 'Local Effort Cooperative', email: sender.email },
      replyTo: 'yum@localeffortfood.com',
      htmlContent: html,
      recipients: { listIds: [WAVE_1_LIST_ID] },
      // No scheduledAt: Brevo keeps this in draft until a human sends it.
    };

  const res = await fetch(
    match ? `https://api.brevo.com/v3/emailCampaigns/${match.id}` : 'https://api.brevo.com/v3/emailCampaigns',
    { method: match ? 'PUT' : 'POST', headers, body: JSON.stringify(payload) },
  );

  if (!res.ok) {
    throw new Error(`Brevo ${res.status}: ${await res.text().catch(() => '')}`);
  }

  const body = res.status === 204 ? { id: match.id } : await res.json();
  process.stdout.write(
    match
      ? `[wave1-template] updated body of draft campaign ${body.id} (subject left untouched)\n`
      : `[wave1-template] created draft campaign ${body.id}\n`
        + `[wave1-template] sender ${sender.email}, list ${WAVE_1_LIST_ID}, status DRAFT (not sent)\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`[wave1-template] ${error?.message || error}\n`);
  process.exit(1);
});
