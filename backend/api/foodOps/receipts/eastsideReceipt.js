/**
 * Eastside Food Cooperative eReceipt parser (pure: no I/O, no network, no clock).
 *
 * Input is the already-decoded HTML of one emailed eReceipt (a table with one
 * <td> per monospace register line; department headers are bold). The output
 * follows the shared receipt contract used by the retail receipt importers.
 *
 * Retail, not wholesale: prices on these receipts are shelf prices at a retail
 * co-op, so they are indicative retail cost observations, never wholesale pack
 * cost. A 20% Employee discount appears on many receipts as ONE receipt-level
 * negative row (sometimes split into Cpn variants); it is not attributed to any
 * item, so line prices stay full retail and the discount is kept as its own
 * `discount` row. Nothing here allocates it back onto items.
 *
 * Validation is exact to the cent. Any failure marks the receipt
 * `review_required` with a named reason and `toVendorLines` then emits nothing:
 *   - subtotal_mismatch      lines (merchandise + fee + discount rows) != SUBTOTAL
 *   - total_mismatch         SUBTOTAL + tax != TOTAL
 *   - invalid_date / missing_receipt_number / missing_subtotal / missing_total
 *   - unrecognized_rows      a register row no rule understands
 *   - (REMOVED rows are informational: the register still charges the item and SUBTOTAL ties with it)
 *   - refund_receipt         negative SUBTOTAL (never a price observation)
 * Per-line `qty * unit price` vs line total only produces a `warning:` reason.
 */

const crypto = require('crypto');
const { parsePackText } = require('../units');

const MERCHANT = 'Eastside Food Cooperative';
const VENDOR_NAME = 'Eastside Food Cooperative';
const SOURCE = 'receipt_eastside';

/**
 * Departments dropped by default from price observations because they are not
 * ingredients (health/body/care, supplements, household/general merchandise,
 * alcohol/regulated, bottle deposits, non-inventory open rings). Keys are the
 * canonical department names produced by `canonicalDepartment`. Prepared/deli
 * departments are intentionally NOT excluded; the CLI reports them separately.
 * Department is the register's own grouping: a household item rung up under
 * GROCERY still passes through.
 */
const DEFAULT_EXCLUDED_DEPARTMENTS = Object.freeze([
  'HBC',
  'Wellness',
  'Supplements',
  'General Merchandise',
  'Non-Inventory',
  'Alcohol & Regulated Items',
  'Bottle Sales',
]);

/** Departments the CLI reports as prepared food (kept, counted separately). */
const PREPARED_DEPARTMENTS = Object.freeze(['Prepared Foods', 'Deli', 'Beverage Bar']);

const KNOWN_DEPARTMENTS = [
  'Grocery', 'Packaged Grocery', 'Packaged', 'Produce', 'Produce & Floral', 'Meat', 'Meat & Seafood', 'Seafood',
  'Refrigerated', 'Cheese', 'Bulk', 'Frozen', 'Bread', 'Prepared Foods', 'Prepared', 'Deli', 'Beverage Bar',
  'HBC', 'Wellness', 'Supplements', 'General Merchandise', 'Non-Inventory', 'Alcohol & Regulated Items', 'Bottle Sales',
];
const departmentKey = (text) => String(text).toLowerCase().replace(/[^a-z0-9&]+/g, '');
const KNOWN_BY_KEY = new Map(KNOWN_DEPARTMENTS.map((name) => [departmentKey(name), name]));
// "Prepared" + "Foods" wrapped over two rows is the one split that reads as a different known name.
KNOWN_BY_KEY.set(departmentKey('Prepared Foods'), 'Prepared Foods');

/** Canonical department name for a (possibly wrap-joined) header, else the cleaned header text. */
function canonicalDepartment(text) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return KNOWN_BY_KEY.get(departmentKey(clean)) || clean;
}

// ---------------------------------------------------------------------------
// HTML -> rows

const ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name) => (name.toLowerCase() in ENTITIES ? ENTITIES[name.toLowerCase()] : whole))
    .replace(/\u00a0/g, ' ');
}

/** [{ text, bold }] for every non-empty <td>. Whitespace is collapsed. */
function extractRows(html) {
  const rows = [];
  const cell = /<td\b([^>]*)>([\s\S]*?)<\/td>/gi;
  let match;
  while ((match = cell.exec(String(html || ''))) !== null) {
    const bold = /font-weight:\s*bold/i.test(match[1]) || /<(?:b|strong)\b/i.test(match[2]);
    const text = decodeEntities(match[2].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    if (text) rows.push({ text, bold });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// row grammar

const MONEY = String.raw`(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})`;
const toCents = (whole, frac) => Number(whole.replace(/,/g, '')) * 100 + Number(frac);

const DATE_ROW = /^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+\d{1,2}:\d{2}\s*[AP]M\s+Receipt\s*#:\s*(\d+)$/i;
const SUBTOTAL_ROW = new RegExp(String.raw`^SUBTOTAL\s+\$(-?)${MONEY}$`, 'i');
const TOTAL_ROW = new RegExp(String.raw`^TOTAL\s+\$(-?)${MONEY}$`, 'i');
const TAX_ROW = new RegExp(String.raw`^(?:Sales|Hemp)\s+Tax\b.*\$(-?)${MONEY}$`, 'i');
const HEADER_ROW = /^(?:Clerk|Store|Terminal):/i;

// Negative rows: "$-1.85" or "-$1.85". A truncated one-decimal amount ("$-22.4") continues on the next row.
const NEGATIVE = new RegExp(String.raw`^(.*?)\s*(?:\$-|-\$)(\d+)\.(\d{1,2})$`);
const WRAPPED_DIGIT = /^(?:Discount\s+)?(\d)$/i;
const POSITIVE = new RegExp(String.raw`^(.*?)\s*\$${MONEY}\s*([A-Z]{0,4}\d?)$`);
const WEIGHED = /^(\d+(?:\.\d+)?)\s*lb\s*@\s*\$(\d+)\.(\d{2})\s*\/\s*lb$/i;
const WEIGHED_BARE = /^(\d+\.\d+)\s*@\s*\$(\d+)\.(\d{2})$/; // "0.529 @ $9.99": fractional quantity, per-lb price
const MULTIBUY = /^(\d+)\s*@\s*\$(\d+)\.(\d{2})$/;
const MULTIPRICE = /^(\d+)\s*@\s*(\d+)\s*\/\s*\$(\d+)\.(\d{2})$/;
const VOID_ROW = /^REMOVED\s+(.+)$/i;
const NOISE_ROW = /^(?:TARE:\S+(?:\s+lb)?|Manual|Scale|Discount(?:\s+\d+%?)?|Open Item ID .*|\d{6,7}-\d{6}|\* \* \*.*|[-*\s]+)$/i;
const CODE_PREFIX = /^(\d{3,14})\s+(.+)$/;

const strip = (name) => name.replace(/(?<!\d)\s*#/g, '').replace(/\s+/g, ' ').trim();

function classifyNegative(label) {
  if (/coupon|\bcpn\b/i.test(label) && !/employee/i.test(label)) return 'coupon';
  if (/bottle/i.test(label)) return 'deposit';
  return 'discount';
}

function classifyPositive(description) {
  if (/\bbottle\s+(?:deposit|return)\b/i.test(description)) return 'deposit';
  if (/\b(?:equity|owner\s+(?:share|payment))\b/i.test(description)) return 'equity';
  if (/\b(?:paper|plastic|handled|reusable|shopping)\s+bag\b|\bbag\s+(?:fee|charge)\b/i.test(description)) return 'fee';
  if (/\bround\s*up\b|\bdonation\b|\bcharity\b|\bgift\s*card\b|\bpaid on account\b|\bmembership\b/i.test(description)) return 'fee';
  return 'merchandise';
}

function codeKindOf(code) {
  if (!code) return null;
  return code.length >= 8 ? 'upc' : 'plu';
}

function isValidDate(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// ---------------------------------------------------------------------------
// parser

/**
 * @param {{ html: string }} input already-decoded eReceipt HTML
 * @returns {object} Receipt (see the shared contract)
 */
function parseEastsideReceipt(input) {
  const html = String((input && input.html) || '');
  const rows = extractRows(html);
  const reasons = [];
  const hard = (reason) => { if (!reasons.includes(reason)) reasons.push(reason); };

  // header: date + receipt number
  let purchasedAt = null;
  let receiptNumber = null;
  let startIndex = 0;
  const dateIndex = rows.findIndex((row) => DATE_ROW.test(row.text));
  if (dateIndex >= 0) {
    const [, mm, dd, yy, number] = rows[dateIndex].text.match(DATE_ROW);
    const year = 2000 + Number(yy);
    if (isValidDate(year, Number(mm), Number(dd))) {
      purchasedAt = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
    receiptNumber = number;
    startIndex = dateIndex + 1;
    for (let i = startIndex; i < Math.min(rows.length, startIndex + 8); i += 1) {
      if (HEADER_ROW.test(rows[i].text)) startIndex = i + 1;
    }
  }
  if (!purchasedAt) hard('invalid_date');
  if (!receiptNumber) hard('missing_receipt_number');

  // footer: SUBTOTAL (end of item region), taxes, TOTAL
  let subtotalIndex = -1;
  let subtotalCents = null;
  for (let i = startIndex; i < rows.length; i += 1) {
    const m = rows[i].text.match(SUBTOTAL_ROW);
    if (m) {
      subtotalIndex = i;
      subtotalCents = (m[1] ? -1 : 1) * toCents(m[2], m[3]);
      break;
    }
  }
  let taxCents = null;
  let totalCents = null;
  const unrecognized = [];
  if (subtotalIndex >= 0) {
    for (let i = subtotalIndex + 1; i < rows.length; i += 1) {
      const text = rows[i].text;
      const total = text.match(TOTAL_ROW);
      if (total) { totalCents = (total[1] ? -1 : 1) * toCents(total[2], total[3]); break; }
      const tax = text.match(TAX_ROW);
      if (tax) { taxCents = (taxCents || 0) + (tax[1] ? -1 : 1) * toCents(tax[2], tax[3]); continue; }
      if (/\$/.test(text)) unrecognized.push('footer');
    }
  }
  if (subtotalCents === null) hard('missing_subtotal');
  if (totalCents === null) hard('missing_total');

  // item region
  const lines = [];
  let department = null;
  let pendingDepartment = null; // bold fragments of a wrapped department header
  let current = null; // last line eligible for continuation / qty rows
  let currentVoid = null;
  let trailing = null; // last negative row, which may wrap its label onto the next row
  const region = subtotalIndex >= 0 ? rows.slice(startIndex, subtotalIndex) : [];

  const pushLine = (line) => {
    line.index = lines.length;
    lines.push(line);
    current = line;
    currentVoid = null;
    trailing = null;
  };

  for (let i = 0; i < region.length; i += 1) {
    const { text, bold } = region[i];

    if (bold) {
      trailing = null;
      if (/^[-*\s]/.test(text) && !/\$/.test(text)) { current = null; currentVoid = null; continue; }
      if (/\$/.test(text)) { unrecognized.push('bold_money'); current = null; continue; }
      // consecutive bold rows are one header wrapped over rows ("Refriger" + "ated")
      const previousBold = i > 0 && region[i - 1].bold && pendingDepartment !== null;
      pendingDepartment = previousBold ? `${pendingDepartment} ${text}` : text;
      department = canonicalDepartment(pendingDepartment);
      current = null;
      currentVoid = null;
      continue;
    }
    pendingDepartment = null;

    const weighed = text.match(WEIGHED) || text.match(WEIGHED_BARE);
    if (weighed && currentVoid) continue; // quantity row of a REMOVED item
    if (weighed) {
      if (!current || current.weighed || current.quantity !== 1 || current.unitPriceCents !== null) { unrecognized.push('qty_row'); continue; }
      current.quantity = Number(weighed[1]);
      current.unit = 'lb';
      current.unitPriceCents = Number(weighed[2]) * 100 + Number(weighed[3]);
      current.weighed = true;
      continue;
    }
    const multiPrice = text.match(MULTIPRICE);
    if (multiPrice && currentVoid) continue;
    if (multiPrice) {
      if (!current || current.weighed) { unrecognized.push('qty_row'); continue; }
      current.quantity = Number(multiPrice[1]);
      current.unitPriceCents = null; // "N @ M/$P": the unit price is not a whole number of cents in general
      current.multiPrice = true;
      continue;
    }
    const multiBuy = text.match(MULTIBUY);
    if (multiBuy && currentVoid) continue;
    if (multiBuy) {
      if (!current || current.weighed) { unrecognized.push('qty_row'); continue; }
      current.quantity = Number(multiBuy[1]);
      current.unitPriceCents = Number(multiBuy[2]) * 100 + Number(multiBuy[3]);
      continue;
    }
    if (/@/.test(text)) { unrecognized.push('qty_row'); continue; }

    // "REMOVED <name> <flags>" rows carry no amount. The register still charges the item row (the
    // SUBTOTAL ties with it included), so the row is informational; its wrapped name / qty rows are swallowed.
    if (VOID_ROW.test(text)) {
      trailing = null;
      current = null;
      currentVoid = {};
      continue;
    }

    const negative = text.match(NEGATIVE);
    if (negative) {
      let [, label, whole, frac] = negative;
      if (frac.length === 1) {
        // "$-22.4" / "Discount 8": the register wraps the last digit onto the next row
        const next = region[i + 1] && !region[i + 1].bold ? region[i + 1].text.match(WRAPPED_DIGIT) : null;
        if (!next) { unrecognized.push('wrapped_amount'); continue; }
        frac += next[1];
        i += 1;
      }
      const cents = -(Number(whole) * 100 + Number(frac));
      let code = null;
      let description = label.replace(/\s+/g, ' ').trim();
      const prefixed = description.match(CODE_PREFIX);
      if (prefixed) { code = prefixed[1]; description = prefixed[2]; }
      description = description.replace(/^[-\s]+|[-\s]+$/g, '');
      if (!description) { unrecognized.push('discount_label'); continue; }
      const negativeLine = {
        index: lines.length,
        department: null,
        code,
        codeKind: codeKindOf(code),
        description,
        quantity: 1,
        unit: 'each',
        unitPriceCents: null,
        lineTotalCents: cents,
        weighed: false,
        discountCents: 0,
        kind: classifyNegative(description),
      };
      lines.push(negativeLine);
      trailing = negativeLine;
      current = null;
      currentVoid = null;
      continue;
    }

    const positive = text.match(POSITIVE);
    if (positive) {
      let label = positive[1].replace(/\s+/g, ' ').trim();
      let code = null;
      const prefixed = label.match(CODE_PREFIX);
      if (prefixed) { code = prefixed[1]; label = prefixed[2]; }
      if (!label) { unrecognized.push('item_label'); continue; }
      const total = toCents(positive[2], positive[3]);
      const description = strip(label);
      pushLine({
        department,
        code,
        codeKind: codeKindOf(code),
        description,
        quantity: 1,
        unit: 'each',
        unitPriceCents: null,
        lineTotalCents: total,
        weighed: false,
        discountCents: 0,
        kind: classifyPositive(description),
      });
      continue;
    }

    if (/\$/.test(text)) { unrecognized.push('money_row'); continue; }
    if (NOISE_ROW.test(text)) continue;

    // wrapped item name continuation
    if (current) {
      current.description = strip(`${current.description} ${text}`);
      if (current.kind === 'merchandise') current.kind = classifyPositive(current.description);
      continue;
    }
    if (currentVoid) continue;
    if (trailing) {
      trailing.description = `${trailing.description} ${text}`.trim();
      continue;
    }
    unrecognized.push('orphan_text');
  }

  // single-quantity "each" lines carry their total as the unit price; N @ P keeps P
  for (const line of lines) {
    if (line.kind === 'merchandise' && !line.weighed && line.unitPriceCents === null && !line.multiPrice && line.quantity === 1) {
      line.unitPriceCents = line.lineTotalCents;
    }
  }

  // validation
  if (unrecognized.length) {
    hard('unrecognized_rows');
    for (const kind of new Set(unrecognized)) hard(`unrecognized:${kind}`);
  }
  const lineSum = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  if (subtotalCents !== null && lineSum !== subtotalCents) hard('subtotal_mismatch');
  if (subtotalCents !== null && totalCents !== null && subtotalCents + (taxCents || 0) !== totalCents) hard('total_mismatch');
  if (subtotalCents !== null && subtotalCents < 0) hard('refund_receipt');
  const mismatched = lines
    .filter((line) => line.kind === 'merchandise' && line.unitPriceCents !== null
      && Math.abs(Math.round(line.quantity * line.unitPriceCents) - line.lineTotalCents) > 1)
    .map((line) => line.index);
  const warnings = mismatched.length ? [`warning:qty_price_mismatch:${mismatched.join(',')}`] : [];

  const receiptSourceKey = receiptNumber && purchasedAt
    ? `eml:${purchasedAt}:${receiptNumber}`
    : `eml:sha256:${crypto.createHash('sha256').update(html).digest('hex').slice(0, 16)}`;

  return {
    receiptSourceKey,
    merchant: MERCHANT,
    purchasedAt: purchasedAt || null,
    receiptNumber,
    subtotalCents,
    taxCents,
    totalCents,
    lines: lines.map(({ multiPrice, ...line }) => line),
    parseState: reasons.length ? 'review_required' : 'parsed',
    reasons: [...reasons, ...warnings],
  };
}

// ---------------------------------------------------------------------------
// vendor lines

const PACK_MASS = /(?:^|[^a-z0-9.])(\d+(?:\.\d+)?)\s*(lb|lbs)(?![a-z])/i;
const PACK_COUNT = /(?:^|[^a-z0-9.])(\d+)\s*ct(?![a-z])/i;

/**
 * Pack size we are willing to state from a description, as text `parsePackText`
 * accepts. Only `N lb` (any case, "5lb"/"5 LB") and `N ct` are unambiguous
 * here. `5#`, bare `oz` (mass or fluid?), `Size 5`, `6in` are NOT pack sizes.
 */
function strictPackText(description) {
  const mass = description.match(PACK_MASS);
  if (mass) return `${Number(mass[1])} lb`;
  const count = description.match(PACK_COUNT);
  if (count) return `${Number(count[1])} ct`;
  return null;
}

/** True when the description carries a size-looking token we refuse to interpret. */
function hasAmbiguousPackToken(description) {
  return parsePackText(description) !== null || /\d\s*#/.test(description) || /\bsize\s+\d/i.test(description) || /\d\s*oz\b/i.test(description);
}

/**
 * Vendor lines for `catalog.planVendorLines`, plus counters. `toVendorLines`
 * returns only the lines; the CLI uses this for its report.
 *
 * `packText` is null when no pack is stated or the pack token is ambiguous
 * (null means "explicitly no pack": the catalog does not fall back to the
 * description). Ambiguous tokens are counted in `stats.ambiguousPack`.
 */
function buildVendorLines(receipt, { excludeDepartments = DEFAULT_EXCLUDED_DEPARTMENTS } = {}) {
  const stats = {
    merchandiseLines: 0,
    emitted: 0,
    excludedByDepartment: {},
    nonMerchandise: 0,
    ambiguousPack: 0,
    skippedReceipt: receipt.parseState !== 'parsed',
    preparedLines: 0,
  };
  const lines = [];
  const excluded = new Set(excludeDepartments.map(departmentKey));
  for (const line of receipt.lines) {
    if (line.kind !== 'merchandise') { stats.nonMerchandise += 1; continue; }
    stats.merchandiseLines += 1;
    if (stats.skippedReceipt) continue;
    if (line.department && excluded.has(departmentKey(line.department))) {
      stats.excludedByDepartment[line.department] = (stats.excludedByDepartment[line.department] || 0) + 1;
      continue;
    }
    let packText;
    let unitPriceCents;
    if (line.weighed) {
      packText = '1 lb';
      unitPriceCents = line.unitPriceCents;
    } else {
      unitPriceCents = line.unitPriceCents !== null ? line.unitPriceCents : Math.round(line.lineTotalCents / line.quantity);
      packText = strictPackText(line.description);
      if (packText === null && hasAmbiguousPackToken(line.description)) stats.ambiguousPack += 1;
    }
    if (PREPARED_DEPARTMENTS.includes(line.department)) stats.preparedLines += 1;
    lines.push({
      sourceKey: `${receipt.receiptSourceKey}:${line.index}`,
      source: SOURCE,
      vendor: VENDOR_NAME,
      sku: line.code,
      description: line.description,
      packText,
      observedAt: receipt.purchasedAt,
      unitPriceCents,
      quantity: line.quantity,
      lineTotalCents: line.lineTotalCents,
    });
    stats.emitted += 1;
  }
  return { lines, stats };
}

/** Lines shaped for `catalog.planVendorLines`; none for a receipt that is not `parsed`. */
function toVendorLines(receipt, options) {
  return buildVendorLines(receipt, options).lines;
}

module.exports = {
  DEFAULT_EXCLUDED_DEPARTMENTS,
  PREPARED_DEPARTMENTS,
  VENDOR_NAME,
  SOURCE,
  buildVendorLines,
  canonicalDepartment,
  parseEastsideReceipt,
  toVendorLines,
};
