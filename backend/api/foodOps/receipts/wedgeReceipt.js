/**
 * Wedge Co-op eReceipt parser (pure: no I/O, no network, no clock).
 *
 * Input is the HTML part of the Gmail eReceipt. The receipt body is a table of
 * fixed-width `<tr><td>` rows, so layout (leading spaces, column gaps) carries
 * meaning and is parsed here from rows, never from flattened text.
 *
 * Row grammar (items section, between the first department header and SUBTOTAL):
 *   department header  `   07 PRODUCE`                       (indent >= 5, 2-digit code, UPPER name)
 *   item               `94062        Cucumber.O      4.57FWV` (code at column 0, description, price + flag letters)
 *   description cont.  `             15.5oz`                 (indent >= 9, no price)
 *   count row          `              2 @ 3.49`              (units, unit price)
 *   weight row         `              1.53 lb @ $2.99/lb`    (pounds, $ per lb)
 *   ignored            `Container Weight:  0.01 lb`, `Manual Weight`
 *   saving (info)      `Regular Price: 8.99    You Save: 3.00` (the line price is already net of it)
 *   adjustment         `             5% off          -5.49`  (indent >= 9, label, signed amount)
 * Tail: SUBTOTAL, `Sales Tax (x%)`, TOTAL, tender rows, TOTAL TENDERED, Change.
 * Everything after `Change` (owner number, card block, marketing) is a footer
 * that is skipped without being stored, so no member or card data is retained.
 *
 * Adjustment and fee rows are returned in `lines` with a non-merchandise `kind`
 * so `sum(lines.lineTotalCents) === subtotalCents` can be checked exactly.
 *
 * Prices are retail shelf/register prices. They are indicative retail cost
 * observations, not wholesale pack costs.
 */
const { parsePackText } = require('../units');

const MERCHANT_FALLBACK = 'Wedge Co-op';
const VENDOR_NAME = 'Wedge Linden Hills Co-op';
const SOURCE = 'receipt_wedge';

/**
 * Departments dropped from observation candidates by default (non-food).
 * Matching is by whole phrase inside the upper-cased department name, so
 * `HOUSEHOLD & PET` is matched by `HOUSEHOLD`. Observed in the live corpus:
 * HOUSEHOLD & PET, PERSONAL CARE, BAG FEE (and STOCK PURCHASE, which is member
 * equity and never merchandise). The remaining entries are anticipated Wedge
 * department names that were NOT observed; they only act if such a department
 * ever appears. Prepared/deli departments are deliberately NOT excluded; the
 * dry-run report counts them separately.
 */
const DEFAULT_EXCLUDED_DEPARTMENTS = Object.freeze([
  'HOUSEHOLD',
  'PET',
  'PERSONAL CARE',
  'BODY CARE',
  'HEALTH',
  'WELLNESS',
  'SUPPLEMENTS',
  'VITAMINS',
  'BEER',
  'WINE',
  'LIQUOR',
  'ALCOHOL',
  'BAG FEE',
  'STOCK PURCHASE',
]);

// --- HTML -> rows -----------------------------------------------------------

const NAMED_ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(text) {
  return text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (whole, dec, hex, name) => {
    if (dec !== undefined) return String.fromCodePoint(Number(dec));
    if (hex !== undefined) return String.fromCodePoint(parseInt(hex, 16));
    const named = NAMED_ENTITIES[name.toLowerCase()];
    return named === undefined ? whole : named;
  });
}

/** One string per `<tr>`, cells joined by a space, leading spaces preserved. */
function htmlToRows(html) {
  const rows = [];
  for (const row of String(html || '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((cell) => decodeEntities(cell[1].replace(/<[^>]*>/g, '')).replace(/\u00a0/g, ' '));
    if (cells.length) rows.push(cells.join(' ').replace(/\s+$/, ''));
  }
  return rows;
}

// --- helpers ----------------------------------------------------------------

const MONEY = '-?[\\d,]+\\.\\d{2}';
const toCents = (text) => Math.round(Number(String(text).replace(/[$,]/g, '')) * 100);

/** Letters -> a, digits -> 9: a row shape that is safe to put in a reason. */
const maskShape = (row) => row.trim().replace(/[A-Za-z]/g, 'a').replace(/\d/g, '9').replace(/\s{2,}/g, '  ').slice(0, 60);

function isoDate(month, day, yy) {
  const year = 2000 + Number(yy);
  const date = new Date(Date.UTC(year, Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function codeKindOf(code) {
  if (!/^\d+$/.test(code)) return null;
  if (code.length >= 2 && code.length <= 6) return 'plu';
  if (code.length >= 7 && code.length <= 13) return 'upc';
  return null;
}

function classify({ department, code, description, lineTotalCents }) {
  if (code === 'EQUITY' || /STOCK PURCHASE/.test(department || '')) return 'equity';
  if (code === 'B.DEPOSIT' || /\bdeposit\b/i.test(description)) return 'deposit';
  if (/\bcoupon\b/i.test(description)) return 'coupon';
  if (/^BAG FEE$/.test(department || '') || /^bag (fee|charge)\b/i.test(description) || /donation|paid in/i.test(description)) return 'fee';
  return lineTotalCents < 0 ? 'discount' : 'merchandise';
}

const CODE_ONLY_ROW = /^[\d$.\-\s]+$/;

// --- parser -----------------------------------------------------------------

const HEADER_ROW = /^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+\d{1,2}:\d{2}\s*(?:AM|PM)\s+Receipt #:\s*(\d+)\s*$/i;
const DEPT_ROW = /^\s{5,}(\d{2}) ([A-Z][A-Z \/&.\-]*)$/;
const ITEM_ROW = new RegExp(`^(\\d{2,13}|EQUITY|B\\.DEPOSIT)(?: \\d+)?\\s*(\\S.*?)\\s+(${MONEY})([A-Z]{0,6})$`);
const COUNT_ROW = /^\s+(\d+) @ \$?(\d+\.\d{2})$/;
const WEIGHT_ROW = /^\s+(\d+(?:\.\d+)?) lb @ \$(\d+\.\d{2})\/lb$/;
const CONTAINER_ROW = /^Container Weight:\s+\d+(?:\.\d+)? lb$/;
const MANUAL_WEIGHT_ROW = /^\s+Manual Weight$/;
const SAVING_ROW = new RegExp('^Regular Price:\\s+(\\d+\\.\\d{2})\\s+You Save:\\s+(\\d+\\.\\d{2})$');
const ADJUST_ROW = new RegExp(`^\\s{9,}(\\S.*?)\\s{2,}(${MONEY})$`);
const SUBTOTAL_ROW = new RegExp(`^\\s*SUBTOTAL\\s+(${MONEY})$`);
const TAX_ROW = new RegExp(`^\\s*Sales Tax \\(\\d+(?:\\.\\d+)?%\\)\\s+(${MONEY})$`);
const TOTAL_ROW = new RegExp(`^\\s*TOTAL\\s+(${MONEY})$`);
const TENDER_ROW = new RegExp(`^\\s*(Debit|Credit|Cash|EBT[A-Za-z ]*|Gift Card|Check|Visa|Mastercard|Discover|Amex)\\s+(${MONEY})$`, 'i');
const TENDERED_ROW = new RegExp(`^\\s*TOTAL TENDERED\\s+(${MONEY})$`);
const CHANGE_ROW = new RegExp(`^\\s*Change\\s+(${MONEY})$`);

/**
 * @param {{messageId: string, html: string}} input
 * @returns {object} Receipt (see the shared receipts contract)
 */
function parseWedgeReceipt({ messageId, html }) {
  const reasons = [];
  const warnings = [];
  const lines = [];
  const unrecognized = [];
  const receipt = {
    receiptSourceKey: `gmail:${messageId}`,
    merchant: MERCHANT_FALLBACK,
    purchasedAt: null,
    receiptNumber: null,
    subtotalCents: null,
    taxCents: null,
    totalCents: null,
    lines,
    parseState: 'parsed',
    reasons,
  };
  if (!messageId) reasons.push('missing_message_id');

  const rows = htmlToRows(html);
  let state = 'head';
  let department = null;
  let item = null; // the open merchandise-or-other item row awaiting continuation rows
  let last = null; // most recent line (item or adjustment) for description continuation
  let tenders = 0;
  let tendered = null;
  let change = 0;
  let sawChange = false;

  const push = (line) => {
    line.index = lines.length;
    lines.push(line);
    last = line;
    return line;
  };
  const closeItem = () => { item = null; };

  for (const raw of rows) {
    const row = raw.replace(/\s+$/, '');
    if (!row.trim() || /^\s*-+\s*$/.test(row)) continue;
    let m;

    if (state === 'head') {
      if ((m = row.match(HEADER_ROW))) {
        receipt.purchasedAt = isoDate(m[1], m[2], m[3]);
        receipt.receiptNumber = m[4];
      } else if (/^Wedge[A-Za-z ]*$/.test(row.trim()) && receipt.merchant === MERCHANT_FALLBACK) {
        receipt.merchant = row.trim();
      } else if (DEPT_ROW.test(row)) {
        state = 'items';
        const dept = row.match(DEPT_ROW);
        department = dept[2].trim();
      }
      continue;
    }

    if (state === 'items') {
      if ((m = row.match(SUBTOTAL_ROW))) { closeItem(); receipt.subtotalCents = toCents(m[1]); state = 'tail'; continue; }
      if ((m = row.match(DEPT_ROW))) { closeItem(); department = m[2].trim(); continue; }
      if (!/^\s/.test(row) && (m = row.match(ITEM_ROW))) {
        const description = m[2].replace(/\s+/g, ' ').trim();
        const code = m[1] === 'EQUITY' || m[1] === 'B.DEPOSIT' ? m[1] : m[1];
        const lineTotalCents = toCents(m[3]);
        const kind = classify({ department, code, description, lineTotalCents });
        item = push({
          index: 0,
          department,
          code,
          codeKind: codeKindOf(code),
          description,
          quantity: 1,
          unit: 'each',
          unitPriceCents: lineTotalCents,
          lineTotalCents,
          weighed: false,
          discountCents: 0,
          kind,
          _qtyRow: false,
        });
        continue;
      }
      if (item) {
        if ((m = row.match(COUNT_ROW))) {
          if (item._qtyRow) { unrecognized.push(row); continue; }
          item._qtyRow = true;
          item.quantity = Number(m[1]);
          item.unitPriceCents = toCents(m[2]);
          continue;
        }
        if ((m = row.match(WEIGHT_ROW))) {
          if (item._qtyRow) { unrecognized.push(row); continue; }
          item._qtyRow = true;
          item.quantity = Number(m[1]);
          item.unit = 'lb';
          item.unitPriceCents = toCents(m[2]);
          item.weighed = true;
          continue;
        }
        if (CONTAINER_ROW.test(row) || MANUAL_WEIGHT_ROW.test(row)) continue;
        if ((m = row.match(SAVING_ROW))) { item.discountCents = toCents(m[2]); continue; }
      }
      if ((m = row.match(ADJUST_ROW)) && last) {
        const description = m[1].replace(/\s+/g, ' ').trim();
        const lineTotalCents = toCents(m[2]);
        const kind = classify({ department: null, code: null, description, lineTotalCents });
        if (kind === 'merchandise') { unrecognized.push(row); continue; }
        closeItem();
        push({
          index: 0,
          department: null,
          code: null,
          codeKind: null,
          description,
          quantity: 1,
          unit: 'each',
          unitPriceCents: lineTotalCents,
          lineTotalCents,
          weighed: false,
          discountCents: 0,
          kind,
        });
        continue;
      }
      if (last && (/^\s{9,}\S/.test(row) || /^PAYMENT$/.test(row))) {
        const text = row.trim();
        // Coupon codes and bare amounts are continuation noise on non-merchandise lines.
        if (last.kind === 'merchandise' || !CODE_ONLY_ROW.test(text)) last.description = `${last.description} ${text}`.replace(/\s+/g, ' ');
        continue;
      }
      unrecognized.push(row);
      continue;
    }

    if (state === 'tail') {
      if ((m = row.match(TAX_ROW))) { receipt.taxCents = (receipt.taxCents || 0) + toCents(m[1]); continue; }
      if ((m = row.match(TOTAL_ROW))) { receipt.totalCents = toCents(m[1]); continue; }
      if ((m = row.match(TENDERED_ROW))) { tendered = toCents(m[1]); continue; }
      if ((m = row.match(CHANGE_ROW))) { change = toCents(m[1]); sawChange = true; state = 'footer'; continue; }
      if ((m = row.match(TENDER_ROW))) { tenders += toCents(m[2]); continue; }
      unrecognized.push(row);
      continue;
    }
    // state === 'footer': owner number, card block, marketing. Skipped unread.
  }

  for (const line of lines) delete line._qtyRow;

  // --- validation ---
  if (!receipt.purchasedAt) reasons.push(receipt.receiptNumber === null ? 'missing_header' : 'invalid_date');
  if (!receipt.receiptNumber) reasons.push('missing_receipt_number');
  if (!lines.length) reasons.push('no_item_rows');
  if (receipt.subtotalCents === null) reasons.push('missing_subtotal');
  if (receipt.totalCents === null) reasons.push('missing_total');
  if (unrecognized.length) {
    reasons.push(`unrecognized_rows:${unrecognized.length}`);
    for (const shape of new Set(unrecognized.slice(0, 5).map(maskShape))) reasons.push(`unrecognized_row_shape:${shape}`);
  }
  if (receipt.subtotalCents !== null) {
    const sum = lines.reduce((total, line) => total + line.lineTotalCents, 0);
    if (sum !== receipt.subtotalCents) reasons.push(`subtotal_mismatch:lines=${sum},subtotal=${receipt.subtotalCents}`);
  }
  if (receipt.subtotalCents !== null && receipt.totalCents !== null
    && receipt.subtotalCents + (receipt.taxCents || 0) !== receipt.totalCents) {
    reasons.push(`total_mismatch:subtotal+tax=${receipt.subtotalCents + (receipt.taxCents || 0)},total=${receipt.totalCents}`);
  }
  if (receipt.totalCents !== null && state !== 'items' && tenders - change !== receipt.totalCents) {
    reasons.push(`tender_mismatch:tendered=${tenders - change},total=${receipt.totalCents}`);
  }
  if (tendered !== null && tendered !== tenders) reasons.push(`tendered_row_mismatch:${tendered},${tenders}`);
  if (state !== 'footer' && state !== 'tail') reasons.push('missing_tail');
  else if (!sawChange) reasons.push('missing_change_row');
  for (const line of lines) {
    if (line.kind === 'merchandise' && line.lineTotalCents <= 0) reasons.push(`nonpositive_merchandise_line:${line.index}`);
  }
  if (reasons.length) receipt.parseState = 'review_required';

  // Soft: qty x unit price vs line total (printed $/lb or sale rows can differ by rounding or discount).
  for (const line of lines) {
    if (line.kind !== 'merchandise' || line.unitPriceCents === null) continue;
    const expected = Math.round(line.quantity * line.unitPriceCents);
    if (Math.abs(expected - line.lineTotalCents) > 1) warnings.push(`warning:line_math:${line.index}`);
  }
  reasons.push(...warnings);
  return receipt;
}

// --- vendor lines ----------------------------------------------------------------

function excludedBy(department, list) {
  if (!department) return null;
  const name = ` ${department.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()} `;
  for (const entry of list) {
    const phrase = ` ${String(entry).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()} `;
    if (name.includes(phrase)) return entry;
  }
  return null;
}

// Receipt descriptions print net quantity as `16oz`, which `parsePackText` reads as
// MASS ounces. For liquids that is wrong (fluid ounces) and the cost engine would
// later reject or mis-convert it, so ounce tokens get a closed, explicit treatment:
//  - a liquid noun directly before the ounce token (`Whole Milk 128oz`) -> `128 fl oz`
//  - any other beverage/oil/ice-cream hint in the description -> ambiguous (null)
//  - everything else (`Mayonnaise 16oz`, `Fig Preserves 13oz`) -> mass ounces
const FLUID_TERMINAL = /(?:\b(?:water|milk|half & half|kombucha|lemonade|juice|latte|yerba ?mate|cold brew|cld brw coffee)|yrbamate)(?:\.O)?\s+(\d+(?:\.\d+)?)\s*oz$/i;
const FLUID_HINT = /\b(?:water|wtr|milk|half & half|kombucha|lemonade|juice|latte|coffee|brw|brew|tea|soda|seltzer|cider|kefir|drink|beverage|ice cream|ice crm|oil|vinegar|broth|stock)\b|yerba ?mate|yrbamate/i;
// More than one quantity token (`12ct 3oz`) or a multipack token (`6pk`) cannot be
// resolved to a single pack size, so the pack is unknowable.
const QUANTITY_TOKEN = /\d+(?:\.\d+)?\s*(?:fl\.?\s?oz|oz|lbs?|kg|g|ml|l|ct|gal|doz|pt|pint|qt)(?![a-z])/gi;
const MULTIPACK_TOKEN = /\b\d+\s*(?:pk|pack)\b/i;

/**
 * Pack text for a counted line, or null when the description has no pack token
 * the cost engine can convert without guessing. `status` is `ok`, `none` (no
 * pack token at all) or `ambiguous` (a token exists but its dimension or
 * meaning is not certain). `5#`, a truncated `16o`, `Size 00`, multipacks and
 * dry/liquid pints/quarts are ambiguous.
 */
function derivePack(description) {
  const text = String(description || '');
  const ambiguous = { packText: null, status: 'ambiguous' };
  if (/\d#/.test(text) || MULTIPACK_TOKEN.test(text) || /\d(?:\.\d+)?o$/i.test(text)) return ambiguous;
  const tokens = text.match(QUANTITY_TOKEN) || [];
  if (tokens.length > 1) return ambiguous;
  const pack = parsePackText(text);
  if (!pack) return /\bsize\s+\d/i.test(text) ? ambiguous : { packText: null, status: 'none' };
  if (pack.unit === 'pt' || pack.unit === 'qt') return ambiguous;
  if (pack.unit === 'oz' && pack.count === 1) {
    const fluid = text.match(FLUID_TERMINAL);
    if (fluid) {
      const fluidText = `${fluid[1]} fl oz`;
      const parsed = parsePackText(fluidText);
      return parsed && parsed.dimension === 'volume' ? { packText: fluidText, status: 'ok' } : ambiguous;
    }
    if (FLUID_HINT.test(text)) return ambiguous;
  }
  return { packText: pack.text, status: 'ok' };
}

/**
 * Convert a parsed receipt to catalog.planVendorLines input. Only parsed
 * receipts and merchandise lines outside the excluded departments are emitted.
 * Returns { lines, ambiguousPack, noPack, excludedByDepartment, skippedReceipt }.
 */
function toVendorLinesDetailed(receipt, { excludeDepartments = DEFAULT_EXCLUDED_DEPARTMENTS } = {}) {
  const result = { lines: [], ambiguousPack: 0, noPack: 0, excludedByDepartment: {}, skippedReceipt: false };
  if (receipt.parseState !== 'parsed') {
    result.skippedReceipt = true;
    return result;
  }
  for (const line of receipt.lines) {
    if (line.kind !== 'merchandise') continue;
    const dropped = excludedBy(line.department, excludeDepartments);
    if (dropped) {
      result.excludedByDepartment[line.department] = (result.excludedByDepartment[line.department] || 0) + 1;
      continue;
    }
    let packText;
    if (line.weighed) {
      packText = '1 lb';
    } else {
      const pack = derivePack(line.description);
      packText = pack.packText;
      if (pack.status === 'ambiguous') result.ambiguousPack += 1;
      else if (pack.status === 'none') result.noPack += 1;
    }
    result.lines.push({
      sourceKey: `${receipt.receiptSourceKey}:${line.index}`,
      source: SOURCE,
      vendor: VENDOR_NAME,
      sku: line.code,
      description: line.description,
      packText,
      observedAt: receipt.purchasedAt,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      lineTotalCents: line.lineTotalCents,
    });
  }
  return result;
}

const toVendorLines = (receipt, options) => toVendorLinesDetailed(receipt, options).lines;

module.exports = {
  DEFAULT_EXCLUDED_DEPARTMENTS,
  VENDOR_NAME,
  htmlToRows,
  parseWedgeReceipt,
  toVendorLines,
  toVendorLinesDetailed,
};
