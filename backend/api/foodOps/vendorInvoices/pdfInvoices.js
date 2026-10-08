/**
 * Wholesale vendor PDF invoices -> Food Ops catalog cost observations.
 *
 * Pure parsers over text lines extracted from a PDF (`pdfToTextLines`, the only impure,
 * injectable piece). One parser per vendor layout; each returns a normalised document:
 *
 *   { vendor, kind: 'invoice', invoiceNumber, invoiceDate (YYYY-MM-DD), totalCents, subtotalCents,
 *     items: [{ index, sku, description, quantity, unitPriceCents, lineTotalCents, kind, packText, packStatus }],
 *     adjustments: [{ kind: 'shipping'|'fee'|'tax'|'discount'|'balance_forward', cents }],
 *     skipped: { noQuantity }, reasons: [], parseState: 'parsed' | 'review_required' }
 *
 * Document kinds other than `invoice` (statements, sales orders, quotes, credits, other vendors'
 * documents, price lists/forms, empty image-only PDFs = `needs_ocr`) are never parsed, only counted.
 *
 * Reconciliation (exact, integer cents; any miss -> review_required, no lines emitted):
 *   - every merchandise line: quantity x unit price == line total within the rounding of a
 *     2-3 decimal printed unit price (<= ceil(quantity / 2) cents);
 *   - sum(items) == printed subtotal when the document prints one;
 *   - sum(items) + sum(adjustments: shipping, fees, tax, discounts) == printed total.
 *
 * Price semantics (per vendor, derived from the invoices themselves):
 *   unitPriceCents = price of ONE ordered unit, quantity = units ordered, lineTotalCents = line total.
 *   packText describes that ONE unit; by-weight lines are priced per lb with packText '1 lb'.
 *   packText null = no pack could be inferred (`packStatus` 'none' or 'ambiguous'); never guessed.
 *
 * sourceKey (idempotency is `vendor_invoice|sourceKey`): `<vendor key>|<invoice number>|<line index>`
 *   vendor key  greatciao | bakersfield | goodacre | madrose | hafa (never collides with the HTML
 *               order parsers, whose Good Acre keys use `good-acre-confirmation`);
 *   invoice number  the number printed on the PDF itself (NOT the Gmail message id), so forwarded
 *               and reminder copies of one invoice share keys;
 *   line index  1-based over ALL product lines of the invoice (skipped lines keep their index).
 *
 * Privacy: PDFs hold names, addresses, phones. Parsers read item text, prices, invoice numbers
 * and dates only; nothing else is retained or returned.
 */
'use strict';

const { parsePackText } = require('../units');

const SOURCE = 'vendor_invoice';

// ---------------------------------------------------------------------------
// PDF -> text (the only impure part; pass a different extractor in tests)
// ---------------------------------------------------------------------------

/** Extract text rows per page with pdfjs: items grouped by y, ordered by x, wide gaps = 2 spaces. */
async function pdfToTextLines(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: false, isEvalSupported: false, verbosity: 0 }).promise;
  const pages = [];
  try {
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const items = content.items
        .filter((item) => typeof item.str === 'string' && item.str.trim() !== '')
        .map((item) => ({ str: item.str, x: item.transform[4], y: item.transform[5], w: item.width || 0 }));
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      const rows = [];
      for (const item of items) {
        const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2.5);
        if (row) row.items.push(item);
        else rows.push({ y: item.y, items: [item] });
      }
      rows.sort((a, b) => b.y - a.y);
      pages.push(rows.map((row) => {
        row.items.sort((a, b) => a.x - b.x);
        let text = '';
        let end = null;
        for (const item of row.items) {
          if (end !== null) text += item.x - end > 8 ? '  ' : item.x - end > 0.5 ? ' ' : '';
          text += item.str;
          end = item.x + item.w;
        }
        return text.replace(/[ \t]+$/, '');
      }));
    }
  } finally {
    await doc.destroy();
  }
  return pages;
}

/** Flatten `string[][]` pages (or an already flat `string[]`) into trimmed non-empty lines. */
function flattenPages(pages) {
  const flat = Array.isArray(pages) && pages.some(Array.isArray) ? pages.flat() : pages || [];
  return flat.map((line) => String(line).replace(/\s+$/, '')).filter((line) => line.trim() !== '');
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function cents(text) {
  const raw = String(text).trim();
  const negative = raw.startsWith('-') || /^\(.*\)$/.test(raw);
  const value = Number(raw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(value)) return null;
  return (negative ? -1 : 1) * Math.round(value * 100);
}

function isoDate(month, day, year) {
  const y = String(year).length === 2 ? 2000 + Number(year) : Number(year);
  const m = Number(month);
  const d = Number(day);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function dateFrom(text) {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\b/.exec(text);
  return m ? isoDate(m[1], m[2], m[3]) : null;
}

const MONEY = '-?\\$?\\s?[\\d,]+\\.\\d{2}';
const squish = (text) => String(text).replace(/\s+/g, ' ').trim();

const UNIT_ALIASES = { g: 'g', gr: 'g', kg: 'kg', lb: 'lb', lbs: 'lb', oz: 'oz', ml: 'ml', l: 'l', dozen: 'dozen', doz: 'dozen', ct: 'ct' };
const PACK_RE = /(?<![A-Za-z0-9.\-/])(?:(\d+(?:\.\d+)?)\s*[xX]\s*)?(\d+(?:\.\d+)?)\s*(gr|g|kg|lbs|lb|oz|ml|l|dozen|doz|ct)(?![A-Za-z])/gi;

/** Last pack token in free text: `{ count, size, unit, text, sizeText }` or null. Validated against parsePackText. */
function packFromText(text) {
  let found = null;
  for (const m of String(text).matchAll(PACK_RE)) {
    const unit = UNIT_ALIASES[m[3].toLowerCase()];
    const sizeText = `${Number(m[2])} ${unit}`;
    const count = m[1] ? Number(m[1]) : null;
    found = { count, size: Number(m[2]), unit, sizeText, text: count ? `${count} x ${sizeText}` : sizeText };
  }
  if (!found || !parsePackText(found.text)) return null;
  return found;
}

const weightPack = { packText: '1 lb', packStatus: 'ok' };
const noPack = (status = 'none') => ({ packText: null, packStatus: status });

function newDoc(vendor) {
  return {
    vendor,
    kind: 'invoice',
    invoiceNumber: null,
    invoiceDate: null,
    totalCents: null,
    subtotalCents: null,
    items: [],
    adjustments: [],
    skipped: { noQuantity: 0 },
    reasons: [],
    parseState: 'parsed',
  };
}

function addItem(doc, { sku = null, description, quantity, unitPriceCents, lineTotalCents, pack }) {
  const free = lineTotalCents === 0;
  doc.items.push({
    index: doc.items.length + 1,
    sku,
    description: squish(description),
    quantity,
    unitPriceCents,
    lineTotalCents,
    kind: free ? 'free_sample' : 'merchandise',
    ...(pack || noPack()),
  });
}

const addAdjustment = (doc, kind, amount) => {
  if (amount !== 0) doc.adjustments.push({ kind, cents: amount });
};

function adjustmentKind(label) {
  if (/discount|promo/i.test(label)) return 'discount';
  if (/ship|freight|deliver/i.test(label)) return 'shipping';
  if (/fee|surcharge|service/i.test(label)) return 'fee';
  if (/tax/i.test(label)) return 'tax';
  return null;
}

function finalizeDoc(doc) {
  const reasons = doc.reasons;
  if (reasons.includes('opening_balance_item')) {
    // an AR carry-over: the food lines of that layout carry no amounts, so nothing can be reconciled
    doc.reasons = ['opening_balance_unpriced_lines'];
    doc.parseState = 'review_required';
    return doc;
  }
  if (!doc.invoiceNumber) reasons.push('missing_invoice_number');
  if (!doc.invoiceDate) reasons.push('invalid_date');
  if (doc.totalCents === null) reasons.push('missing_total');
  if (!doc.items.length) reasons.push('no_lines');
  for (const item of doc.items) {
    if (item.kind !== 'merchandise') continue;
    const expected = Math.round(item.quantity * item.unitPriceCents);
    if (Math.abs(expected - item.lineTotalCents) > Math.ceil(item.quantity * 0.5)) {
      reasons.push('line_math_mismatch');
      break;
    }
  }
  const itemsCents = doc.items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const adjustmentsCents = doc.adjustments.reduce((sum, adj) => sum + adj.cents, 0);
  if (doc.subtotalCents !== null && doc.subtotalCents !== itemsCents) reasons.push('subtotal_mismatch');
  if (doc.totalCents !== null && doc.totalCents !== itemsCents + adjustmentsCents) reasons.push('total_mismatch');
  doc.itemsCents = itemsCents;
  doc.adjustmentsCents = adjustmentsCents;
  doc.reasons = [...new Set(reasons)];
  doc.parseState = doc.reasons.length ? 'review_required' : 'parsed';
  return doc;
}

const headText = (lines, n = 10) => lines.slice(0, n).join('\n');
const CREDIT_RE = /\b(credit memo|credit note|refund|cancell?ed|void)\b/i;

// ---------------------------------------------------------------------------
// Great Ciao: `Quant. Unit  Item  Description  Price  Total`
// ---------------------------------------------------------------------------

const GC_ROW = new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(\\d+/CS|<?EACH>?|LB|CS)\\s+(\\S+)\\s+(.*?)\\s+(${MONEY})\\s+(${MONEY})$`, 'i');
const GC_UNPRICED = new RegExp(`^(?:LB|EACH|\\d+/CS)\\s+\\S+\\s+.*?\\s+${MONEY}$`, 'i');

function classifyGreatCiao(lines, filename) {
  const text = lines.join('\n');
  if (/Quote Number/i.test(text) || /^quote/i.test(filename || '')) return 'quote';
  if (/Invoice\s+(?:Number|#)\s+\d+/i.test(text) && /Invoice total/i.test(text)) return 'invoice';
  if (/\bStatement\b/i.test(headText(lines, 12))) return 'statement';
  return 'other';
}

function parseGreatCiao(lines) {
  const doc = newDoc('greatciao');
  let inTable = false;
  let last = null;
  const rows = [];
  for (const line of lines) {
    let m;
    if (!doc.invoiceNumber && (m = /^Invoice\s+(?:Number|#)\s+(\d+)\s*$/i.exec(line))) doc.invoiceNumber = m[1];
    else if (!doc.invoiceDate && (m = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(line.trim()))) doc.invoiceDate = isoDate(m[1], m[2], m[3]);
    else if ((m = new RegExp(`^Invoice total\\.*\\s*\\$?\\s*(${MONEY})`, 'i').exec(line))) {
      doc.totalCents = cents(m[1]);
      inTable = false;
    } else if (/^Quant\.\s+Unit\s+Item/i.test(line)) inTable = true;
    else if (inTable) {
      if ((m = GC_ROW.exec(line))) {
        last = { unit: m[2].toUpperCase().replace(/[<>]/g, ''), quantity: Number(m[1]), sku: m[3], description: m[4], unitPriceCents: cents(m[5]), lineTotalCents: cents(m[6]) };
        rows.push(last);
      } else if (GC_UNPRICED.test(line)) {
        doc.skipped.noQuantity += 1;
        last = null;
      } else if (last) last.description += ` ${line.trim()}`;
    }
  }
  for (const row of rows) {
    if (row.sku.toUpperCase() === 'DISCOUNT' || /discount/i.test(row.description) || row.lineTotalCents < 0) {
      addAdjustment(doc, 'discount', row.lineTotalCents);
      continue;
    }
    const size = packFromText(row.description);
    let pack = noPack();
    if (row.unit === 'LB') pack = weightPack;
    else if (size) pack = { packText: /CS$/.test(row.unit) ? size.text : size.sizeText, packStatus: 'ok' };
    addItem(doc, { sku: row.sku, description: row.description, quantity: row.quantity, unitPriceCents: row.unitPriceCents, lineTotalCents: row.lineTotalCents, pack });
  }
  return finalizeDoc(doc);
}

// ---------------------------------------------------------------------------
// Baker's Field Flour & Bread: `Description  Qty  Rate  Amount`, quantities are lb
// ---------------------------------------------------------------------------

const BF_ROW = new RegExp(`^(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s+(\\d+\\.\\d{2,})\\s+(${MONEY})$`);
const BF_FEE = new RegExp(`^(.+?)\\s+(\\d+\\.\\d{2})\\s+(${MONEY})$`);

function classifyBakersField(lines, filename) {
  const text = lines.join('\n');
  const isInvoice = /^Invoice$/m.test(text) && /Description\s+Qty\s+Rate\s+Amount/.test(text);
  if (!isInvoice) return /\bStatement\b/i.test(headText(lines, 6)) ? 'statement' : 'other';
  const ours = /bakers?[_'’ ]*field/i.test(filename || '') || /\bBFFB\b|Baker'?s?['’]?s? Field/i.test(text);
  return ours ? 'invoice' : 'other_vendor';
}

function parseBakersField(lines) {
  const doc = newDoc('bakersfield');
  let inTable = false;
  let headerNext = false;
  for (const line of lines) {
    let m;
    if (/^Date\s+Invoice #/.test(line)) headerNext = true;
    else if (headerNext && (m = /^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d+)\s*$/.exec(line))) {
      headerNext = false;
      doc.invoiceDate = dateFrom(m[1]);
      doc.invoiceNumber = m[2];
    } else if (/^Description\s+Qty\s+Rate\s+Amount/.test(line)) inTable = true;
    else if ((m = new RegExp(`^Total\\s+(${MONEY})$`).exec(line))) {
      doc.totalCents = cents(m[1]);
      inTable = false;
    } else if (inTable) {
      if ((m = BF_ROW.exec(line))) {
        addItem(doc, {
          description: m[1],
          quantity: Number(m[2]),
          unitPriceCents: cents(m[3]),
          lineTotalCents: cents(m[4]),
          pack: weightPack,
        });
      } else if ((m = BF_FEE.exec(line))) {
        const kind = adjustmentKind(m[1]);
        if (kind) addAdjustment(doc, kind, cents(m[3]));
        else doc.reasons.push('unrecognised_line');
      }
    }
  }
  return finalizeDoc(doc);
}

// ---------------------------------------------------------------------------
// The Good Acre: QuickBooks `ACTIVITY QTY RATE AMOUNT` (2022) and Zoho/Odoo-style
// `Item Description Qty Rate Amount` (2024-25)
// ---------------------------------------------------------------------------

const GA_ROW = new RegExp(`^(.*?)\\s*(\\d+(?:\\.\\d+)?)\\s+\\$?(${MONEY.replace('-?\\$?\\s?', '')})\\s+\\$?(${MONEY.replace('-?\\$?\\s?', '')})$`);
const GA_STOP = /^(Subtotal|Tax|Total|Balance Due|BALANCE DUE|Payments\/Credits)\b|\sTotal\s+(?:USD\s+)?\$?[\d,]+\.\d{2}$/;

function classifyGoodAcre(lines, filename) {
  const head = `${headText(lines, 8)}\n${filename || ''}`;
  if (/\bStatement\b/i.test(head)) return 'statement';
  if (/Sales Order/i.test(head)) return 'sales_order';
  if (/\bINVOICE\b/i.test(head) && /^(ACTIVITY\s+QTY|Item\s+Description\s+Qty)/im.test(lines.join('\n'))) return 'invoice';
  return 'other';
}

/** `X X` -> `X` (the PDF prints the item name twice, wrapped across lines). */
function collapseDouble(text) {
  const tokens = squish(text).split(' ');
  for (let k = Math.floor(tokens.length / 2); k >= 1; k -= 1) {
    if (tokens.length === 2 * k && tokens.slice(0, k).join(' ') === tokens.slice(k).join(' ')) return tokens.slice(0, k).join(' ');
  }
  return tokens.join(' ');
}

function parseGoodAcre(lines) {
  const doc = newDoc('goodacre');
  let layout = null;
  let headerDate = false;
  const entries = [];
  let tableOpen = false;
  for (const line of lines) {
    let m;
    if (!doc.invoiceNumber && ((m = /Invoice\s*#\s*([A-Z]*\d+)\b/i.exec(line)) || (m = /^#([A-Z]*\d+)\s*$/.exec(line.trim())))) doc.invoiceNumber = m[1].toUpperCase();
    if (!doc.invoiceDate) {
      if (/Invoice Date/i.test(line)) headerDate = true;
      else if ((m = /^Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/.exec(line)) || (m = /(?:^|\s)(?<!DUE )DATE\s+(\d{1,2}\/\d{1,2}\/\d{4})/.exec(line)) || (headerDate && (m = /^(\d{1,2}\/\d{1,2}\/\d{4})\b/.exec(line)))) {
        doc.invoiceDate = dateFrom(m[1]);
        headerDate = false;
      }
    }
    if (/^ACTIVITY\s+QTY/.test(line)) { layout = 'activity'; tableOpen = true; continue; }
    if (/^Item\s+Description\s+Qty/.test(line)) { layout = 'item'; tableOpen = true; continue; }
    if ((m = /(?:^|\s)Total\s+(?:USD\s+)?\$?([\d,]+\.\d{2})\s*$/.exec(line))) doc.totalCents = cents(m[1]);
    else if ((m = /^Subtotal\s+(?:USD\s+)?\$?([\d,]+\.\d{2})$/.exec(line))) doc.subtotalCents = cents(m[1]);
    else if ((m = /^Tax\s+(?:USD\s+)?\$?([\d,]+\.\d{2})$/.exec(line))) addAdjustment(doc, 'tax', cents(m[1]));
    else if (doc.totalCents === null && /^BALANCE DUE$/.test(line)) headerDate = false;
    else if (doc.totalCents === null && (m = /^\$([\d,]+\.\d{2})$/.exec(line.trim())) && lines[lines.indexOf(line) - 1] === 'BALANCE DUE') doc.totalCents = cents(m[1]);
    if (!tableOpen) continue;
    if (GA_STOP.test(line) || /^BALANCE DUE$/.test(line)) { tableOpen = false; continue; }
    const row = GA_ROW.exec(line);
    entries.push(row ? { row: { prefix: row[1].trim(), quantity: Number(row[2]), rate: cents(row[3]), total: cents(row[4]) }, tail: [] } : { text: line.trim() });
  }
  // attach text lines: to the next row when that row has no prefix of its own, else to the previous row
  const rows = [];
  let pending = [];
  for (const entry of entries) {
    if (entry.text !== undefined) { pending.push(entry.text); continue; }
    const row = { ...entry.row, head: [], tail: [] };
    if (!row.prefix && layout === 'item') { row.head = pending; pending = []; }
    else if (rows.length) { rows[rows.length - 1].tail.push(...pending); pending = []; }
    rows.push(row);
  }
  if (rows.length) rows[rows.length - 1].tail.push(...pending);

  for (const row of rows) {
    if (/opening balance/i.test(row.prefix)) {
      doc.reasons.push('opening_balance_item');
      addAdjustment(doc, 'balance_forward', row.total);
      continue;
    }
    const parts = row.prefix.split(/\s{2,}/);
    const extra = parts.length > 1 ? parts.slice(1).join(' ') : '';
    const description = layout === 'activity'
      ? squish(row.tail.join(' '))
      : collapseDouble([...row.head, parts[0], ...row.tail].filter(Boolean).join(' '));
    if (!description) { doc.reasons.push('missing_description'); continue; }
    let pack = noPack();
    const dozen = /\b(\d+(?:\.\d+)?)\s*dozen\b/i.exec(`${extra} ${description}`);
    if (/case pound avg/i.test(extra)) pack = noPack('ambiguous');
    else if (dozen) pack = { packText: `${Number(dozen[1])} dozen`, packStatus: 'ok' };
    else {
      const size = packFromText(`${extra} ${description}`);
      if (size) pack = { packText: size.text, packStatus: 'ok' };
    }
    addItem(doc, { description, quantity: row.quantity, unitPriceCents: row.rate, lineTotalCents: row.total, pack });
  }
  return finalizeDoc(doc);
}

// ---------------------------------------------------------------------------
// Mad Rose Specialty Foods: `Item  Description  Qty  List Price  Disc  Rate  Amt`
// (direct) and `ACTIVITY  DESCRIPTION  QTY  RATE  AMOUNT` (Melio copy). One ordered unit is one
// bottle/jar: `[12/cs]` is the case count the vendor ships in, not the priced unit.
// ---------------------------------------------------------------------------

const MR_ROW = /^(.*?)\s+(\d+)\s+(?:\$[\d,.]+\s+\d+(?:\.\d+)?%\s+)?\$?([\d,]+\.\d+)\s+\$?([\d,]+\.\d{2})T?$/;
const MR_STOP = /^(SUBTOTAL|TAX|SHIPPING|TOTAL|PAYMENTS|BALANCE)\b|^\d+(?:\s+\$?[\d,.]+)?$/;
const MR_SIZE = /(?<![A-Za-z0-9.\-/])(\d+(?:\.\d+)?)\s*(gr|g|kg|ml|l|oz|lb)(?![A-Za-z])/gi;

function classifyMadRose(lines) {
  const head = headText(lines, 10);
  if (/Sales Order/i.test(head)) return 'sales_order';
  if (/^(ACTIVITY|Item)\s+Description\s+Qty/im.test(lines.join('\n')) && /\bINVOICE\b/i.test(head)) return 'invoice';
  return 'other';
}

function madRosePack(blockLines) {
  const sizes = new Set();
  for (let i = 0; i < blockLines.length; i += 1) {
    let raw = blockLines[i];
    // the tail of an item code wrapped onto the next line (`IT-ARM-01-` / `211L ...`) is not a size
    if (i > 0 && /\bIT-[A-Z0-9-]*-(?:\s|$)/.test(blockLines[i - 1].trim())) raw = raw.trim().replace(/^\S+/, ' ');
    const text = raw.replace(/Lot:\s*\S+/gi, ' ').replace(/\bIT-[A-Z0-9-]+/g, ' ');
    for (const m of text.matchAll(MR_SIZE)) sizes.add(`${Number(m[1])} ${UNIT_ALIASES[m[2].toLowerCase()]}`);
  }
  if (sizes.size === 1) {
    const text = [...sizes][0];
    return parsePackText(text) ? { packText: text, packStatus: 'ok' } : noPack();
  }
  return noPack(sizes.size ? 'ambiguous' : 'none');
}

function madRoseSku(blockLines) {
  for (let i = 0; i < blockLines.length; i += 1) {
    const m = /\bIT-[A-Z0-9][A-Z0-9-]*/.exec(blockLines[i]);
    if (!m) continue;
    let sku = m[0];
    if (sku.endsWith('-') && blockLines[i + 1]) sku += (/^\S+/.exec(blockLines[i + 1].trim()) || [''])[0];
    return sku.replace(/-+$/, '');
  }
  return null;
}

function parseMadRose(lines) {
  const doc = newDoc('madrose');
  let inTable = false;
  const rows = [];
  for (const line of lines) {
    let m;
    if (!doc.invoiceNumber && (m = /\bINVOICE\s*#?:?\s+([A-Z]{0,3}\d+)\b/.exec(line))) doc.invoiceNumber = m[1];
    if (!doc.invoiceDate && (m = /(?<!SHIP )(?<!DUE )\bDATE:?\s+(\d{1,2}\/\d{1,2}\/\d{4})/.exec(line))) doc.invoiceDate = dateFrom(m[1]);
    if (/^(Item|ACTIVITY)\s+Description\s+Qty/i.test(line)) { inTable = true; continue; }
    if ((m = new RegExp(`^SUBTOTAL\\s+(${MONEY})$`).exec(line))) doc.subtotalCents = cents(m[1]);
    else if ((m = new RegExp(`^SHIPPING\\s+(${MONEY})$`).exec(line))) addAdjustment(doc, 'shipping', cents(m[1]));
    else if ((m = new RegExp(`^TAX(?:\\s*\\(\\d+\\))?\\s+(${MONEY})$`).exec(line))) addAdjustment(doc, 'tax', cents(m[1]));
    else if ((m = new RegExp(`^TOTAL\\s+(${MONEY})$`).exec(line))) doc.totalCents = cents(m[1]);
    if (!inTable) continue;
    if (MR_STOP.test(line)) { inTable = false; continue; }
    const row = MR_ROW.exec(line);
    if (row) rows.push({ prefix: row[1], quantity: Number(row[2]), rate: cents(row[3]), total: cents(row[4]), block: [row[1]] });
    else if (rows.length) rows[rows.length - 1].block.push(line.trim());
  }
  for (const row of rows) {
    const description = row.prefix.split(/\s{2,}/).pop();
    addItem(doc, {
      sku: madRoseSku(row.block),
      description,
      quantity: row.quantity,
      unitPriceCents: row.rate,
      lineTotalCents: row.total,
      pack: madRosePack(row.block),
    });
  }
  return finalizeDoc(doc);
}

// ---------------------------------------------------------------------------
// HAFA (Hmong American Farmers Association): QuickBooks `DATE ACTIVITY QTY RATE AMOUNT`
// ---------------------------------------------------------------------------

const HAFA_ROW = /^(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+(\d+(?:\.\d+)?)\s+(\d+\.\d{2,})\s+([\d,]+\.\d{2})$/;

function classifyHafa(lines) {
  const text = lines.join('\n');
  return /^Invoice$/m.test(text) && /DATE\s+ACTIVITY\s+QTY\s+RATE\s+AMOUNT/.test(text) ? 'invoice' : 'other';
}

/** Canonical `<name>, lb` / `<name>, bunch` suffix: the PDFs spell the unit lbs/lb/LBS/LB/# or BC. */
function hafaItem(activity) {
  const unit = /(?:,|\s)\s*(lbs?|#|bc)\s*$/i.exec(activity);
  if (!unit) return { description: activity, pack: noPack('none') };
  const base = activity.slice(0, unit.index).trim();
  return unit[1].toLowerCase() === 'bc'
    ? { description: `${base}, bunch`, pack: noPack('none') }
    : { description: `${base}, lb`, pack: weightPack };
}

function parseHafa(lines) {
  const doc = newDoc('hafa');
  let headerNext = false;
  let inTable = false;
  for (const line of lines) {
    let m;
    if (/^INVOICE #\s+DATE\s+TOTAL DUE/.test(line)) { headerNext = true; continue; }
    if (headerNext && (m = /^(\S+)\s+(\d{2}\/\d{2}\/\d{4})\s+\$?[\d,]+\.\d{2}/.exec(line))) {
      headerNext = false;
      doc.invoiceNumber = m[1];
      doc.invoiceDate = dateFrom(m[2]);
      continue;
    }
    if (/^DATE\s+ACTIVITY\s+QTY\s+RATE\s+AMOUNT/.test(line)) { inTable = true; continue; }
    if (/SUBTOTAL\s+[\d,]+\.\d{2}$/.test(line) && (m = /SUBTOTAL\s+([\d,]+\.\d{2})$/.exec(line))) { inTable = false; doc.subtotalCents = cents(m[1]); continue; }
    if ((m = /^TAX\s+\$?([\d,]+\.\d{2})$/.exec(line))) addAdjustment(doc, 'tax', cents(m[1]));
    else if ((m = /(?:^|\s)TOTAL\s+\$?([\d,]+\.\d{2})$/.exec(line))) doc.totalCents = cents(m[1]);
    else if (inTable && (m = HAFA_ROW.exec(line))) {
      addItem(doc, { ...hafaItem(m[2]), quantity: Number(m[3]), unitPriceCents: cents(m[4]), lineTotalCents: cents(m[5]) });
    }
  }
  return finalizeDoc(doc);
}

// ---------------------------------------------------------------------------
// registry
// ---------------------------------------------------------------------------

const VENDORS = {
  greatciao: {
    key: 'greatciao',
    name: 'Great Ciao',
    gmailQuery: '(from:greatciao.com OR "Great Ciao" OR greatciao) has:attachment filename:pdf in:anywhere',
    classify: classifyGreatCiao,
    parse: parseGreatCiao,
  },
  bakersfield: {
    key: 'bakersfield',
    name: "Baker's Field Flour & Bread",
    gmailQuery: '(from:bakersfieldflour.com OR from:foodbuilding.com OR "Bakers\' Field" OR "Baker\'s Field") has:attachment filename:pdf in:anywhere',
    classify: classifyBakersField,
    parse: parseBakersField,
  },
  goodacre: {
    key: 'goodacre',
    name: 'The Good Acre',
    gmailQuery: '(from:thegoodacre.org OR "The Good Acre") has:attachment filename:pdf in:anywhere',
    classify: classifyGoodAcre,
    parse: parseGoodAcre,
  },
  madrose: {
    key: 'madrose',
    name: 'Mad Rose Specialty Foods',
    gmailQuery: '(madrosefoods OR "Mad Rose") has:attachment filename:pdf in:anywhere',
    classify: classifyMadRose,
    parse: parseMadRose,
  },
  hafa: {
    key: 'hafa',
    name: 'Hmong American Farmers Association',
    gmailQuery: '(from:hmongfarmers.com OR HAFA) has:attachment filename:pdf in:anywhere',
    classify: classifyHafa,
    parse: parseHafa,
  },
};

// ---------------------------------------------------------------------------
// classification, dedupe, orchestration
// ---------------------------------------------------------------------------

const INVOICE_NAME = /invoice|^inv[_ #-]/i;

/**
 * Kind of one PDF: invoice | statement | sales_order | quote | credit | other_vendor | other | needs_ocr.
 * `needs_ocr` = no extractable text in a file that is named like an invoice (image-only scan).
 */
function classifyDocument(vendorKey, lines, filename) {
  const vendor = VENDORS[vendorKey];
  if (!vendor) throw new Error(`unknown vendor "${vendorKey}"`);
  const flat = flattenPages(lines);
  if (flat.join('').trim().length < 40) return INVOICE_NAME.test(filename || '') ? 'needs_ocr' : 'other';
  const kind = vendor.classify(flat, filename);
  if (kind === 'invoice' && CREDIT_RE.test(headText(flat, 8))) return 'credit';
  return kind;
}

function parseDocument(vendorKey, lines) {
  return VENDORS[vendorKey].parse(flattenPages(lines));
}

const signature = (doc) => JSON.stringify([
  doc.totalCents,
  doc.items.map((item) => [item.quantity, item.unitPriceCents, item.lineTotalCents]),
  doc.adjustments.map((adj) => [adj.kind, adj.cents]),
]);

/**
 * Collapse copies of one invoice number (forwards, reminders, re-sends). Copies that parsed and
 * agree on every amount are one invoice (the copy with most SKUs, then the latest, wins); parsed
 * copies that disagree -> review_required `conflicting_copies`; when no copy parsed the first
 * copy's reasons are reported once.
 */
function dedupeInvoices(docs) {
  const groups = new Map();
  const unnumbered = [];
  for (const doc of docs) {
    if (!doc.invoiceNumber) unnumbered.push(doc);
    else groups.set(doc.invoiceNumber, [...(groups.get(doc.invoiceNumber) || []), doc]);
  }
  const invoices = [...unnumbered];
  let duplicates = 0;
  for (const copies of groups.values()) {
    duplicates += copies.length - 1;
    const parsed = copies.filter((doc) => doc.parseState === 'parsed');
    if (!parsed.length) { invoices.push(copies[0]); continue; }
    if (new Set(parsed.map(signature)).size > 1) {
      invoices.push({ ...parsed[0], items: [], adjustments: [], reasons: ['conflicting_copies'], parseState: 'review_required' });
      continue;
    }
    const skus = (doc) => doc.items.filter((item) => item.sku).length;
    parsed.sort((a, b) => skus(a) - skus(b) || String(a.receivedAt || '').localeCompare(String(b.receivedAt || '')));
    invoices.push(parsed[parsed.length - 1]);
  }
  return { invoices, duplicates };
}

/** Candidate vendor lines for `catalog.planVendorLines`: merchandise lines of one parsed invoice. */
function toVendorLines(doc) {
  if (doc.parseState !== 'parsed') return [];
  const vendor = VENDORS[doc.vendor];
  return doc.items
    .filter((item) => item.kind === 'merchandise')
    .map((item) => ({
      sourceKey: `${vendor.key}|${doc.invoiceNumber}|${item.index}`,
      source: SOURCE,
      vendor: vendor.name,
      ...(item.sku ? { sku: item.sku } : {}),
      description: item.description,
      packText: item.packText,
      observedAt: doc.invoiceDate,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
    }));
}

/**
 * Process every PDF of one vendor.
 * @param inputs `[{ lines | pages, filename?, date? }]` (`date` = when the email was sent, YYYY-MM-DD)
 * @returns `{ lines, report }`; report holds counts, review reasons and reconciliation proof only.
 */
function processVendor(vendorKey, inputs) {
  const vendor = VENDORS[vendorKey];
  const report = {
    vendor: vendor.name,
    documentsFound: inputs.length,
    skippedDocuments: { statement: 0, sales_order: 0, quote: 0, credit: 0, other_vendor: 0, other: 0 },
    needsOcr: [],
    invoicesParsedFromPdfs: 0,
    duplicatesDeduped: 0,
    invoices: 0,
    parsed: 0,
    reviewRequired: [],
    reconciliation: [],
    lines: { emitted: 0, freeSamplesSkipped: 0, nonFoodAdjustments: 0, unpricedRowsSkipped: 0 },
    packStatus: { ok: 0, none: 0, ambiguous: 0 },
    packNotInferred: [],
  };
  const docs = [];
  for (const input of inputs) {
    const lines = flattenPages(input.lines ?? input.pages);
    const kind = classifyDocument(vendorKey, lines, input.filename);
    if (kind === 'needs_ocr') { report.needsOcr.push({ vendor: vendor.name, date: input.date || null }); continue; }
    if (kind !== 'invoice') { report.skippedDocuments[kind] += 1; continue; }
    const doc = vendor.parse(lines);
    doc.receivedAt = input.date || null;
    if (doc.totalCents !== null && doc.totalCents <= 0) { report.skippedDocuments.credit += 1; continue; }
    report.invoicesParsedFromPdfs += 1;
    docs.push(doc);
  }
  const { invoices, duplicates } = dedupeInvoices(docs);
  report.duplicatesDeduped = duplicates;
  report.invoices = invoices.length;
  const lines = [];
  for (const doc of invoices) {
    if (doc.parseState !== 'parsed') {
      report.reviewRequired.push({ invoice: doc.invoiceNumber, date: doc.invoiceDate, totalCents: doc.totalCents, reasons: doc.reasons });
      continue;
    }
    report.parsed += 1;
    const byKind = {};
    for (const adj of doc.adjustments) byKind[adj.kind] = (byKind[adj.kind] || 0) + adj.cents;
    report.reconciliation.push({ invoice: doc.invoiceNumber, date: doc.invoiceDate, totalCents: doc.totalCents, itemsCents: doc.itemsCents, adjustments: byKind, exact: doc.itemsCents + doc.adjustmentsCents === doc.totalCents });
    report.lines.freeSamplesSkipped += doc.items.filter((item) => item.kind === 'free_sample').length;
    report.lines.nonFoodAdjustments += doc.adjustments.length;
    report.lines.unpricedRowsSkipped += doc.skipped.noQuantity;
    for (const item of doc.items.filter((entry) => entry.kind === 'merchandise')) {
      report.packStatus[item.packStatus] += 1;
      if (!item.packText) report.packNotInferred.push({ invoice: doc.invoiceNumber, index: item.index, status: item.packStatus, description: item.description });
    }
    lines.push(...toVendorLines(doc));
  }
  report.lines.emitted = lines.length;
  return { lines, report };
}

module.exports = {
  SOURCE,
  VENDORS,
  pdfToTextLines,
  flattenPages,
  packFromText,
  classifyDocument,
  parseDocument,
  dedupeInvoices,
  toVendorLines,
  processVendor,
};
