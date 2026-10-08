/**
 * Vendor order-confirmation / invoice e-mail parsers (pure: no I/O, no network, no clock).
 *
 * Wholesale and direct vendor purchases that arrive as HTML (or plain-text) e-mails
 * become `vendor_invoice` cost observations, the same way the Wedge parser turns
 * eReceipts into retail observations. One adapter per vendor sits on a shared core:
 *
 *   html/text -> tokens (one non-empty string per block/cell) -> adapter -> order
 *
 * parseOrderEmail({ vendorKey, html, text, messageId, date }) returns an Order:
 *   { vendorKey, vendor, orderId, messageId, purchasedAt, parseState, skipReason?, reasons,
 *     lines: [{ index, description, sku, packText, quantity, unitPriceCents, lineTotalCents, kind }],
 *     summary: { subtotal, shipping, tax, discount, total },     // cents, null when absent
 *     reconciliation: { linesCents, expectedTotalCents, totalCents, exact } }
 *
 *   parseState  'parsed'          every check passed; lines may be emitted.
 *               'review_required' something did not reconcile EXACTLY to the cent; emit nothing.
 *                                 `reasons` are stable codes (never document text).
 *               'skipped'         not a purchase: skipReason 'not_order_confirmation' | 'refund' | 'cancelled'.
 *   line.kind   'merchandise' | 'free_sample' ($0 line) | 'non_food' (packaging, shipping, equipment)
 *               | 'adjustment' (negative line). Only 'merchandise' becomes a candidate line.
 *
 * Reconciliation (always exact, in integer cents):
 *   - every line: quantity x unit price == line total, and line total / quantity is a whole number
 *     of cents when the document only prints line totals;
 *   - sum(all lines, including skipped ones) == printed Subtotal when the document prints one;
 *   - Subtotal (or sum of lines) + shipping + tax - discounts == printed Total.
 * Any miss -> review_required; nothing is guessed or adjusted.
 *
 * sourceKey (idempotency is `vendor_invoice|sourceKey`): `<keyPrefix>|<orderId>|<line index>`
 *   keyPrefix  the registry key with `_` -> `-` (`the Good Acre` confirmations use
 *              `good-acre-confirmation`, so they never collide with that vendor's PDF invoices);
 *   orderId    the vendor's own order / invoice number, or the Gmail message id when the document
 *              has none (Chocolate Alchemy); line index is 1-based over ALL lines of the document
 *              (skipped lines keep their index), so keys are stable if the filter rules change.
 *
 * Privacy: bodies hold names, addresses, phones and card digits. Nothing here keeps or returns
 * any of them: only item text, prices, order ids and dates leave a parser.
 */
const { parsePackText } = require('../units');

const SOURCE = 'vendor_invoice';

// --- html / text -> tokens ----------------------------------------------------------------

const NAMED_ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"',
  ndash: '-', mdash: '-', hellip: '...', times: '×', bull: '•', reg: '®', trade: '™', copy: '©',
};

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

const BLOCK_TAG = /<\/?(?:p|div|tr|td|th|table|tbody|thead|tfoot|br|li|ul|ol|h[1-6]|section|article|center|hr|body|html)\b[^>]*>/gi;

function cleanTokens(lines) {
  return lines
    .map((line) => line.replace(/[\u00a0\u200b-\u200f\u034f\ufeff]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((line) => /[A-Za-z0-9$]/.test(line));
}

/** One string per block-level element / table cell; inline markup is joined. */
function htmlToTokens(html) {
  const stripped = String(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(head|style|script)\b[\s\S]*?<\/\1>/gi, '')
    .replace(BLOCK_TAG, '\n')
    .replace(/<[^>]*>/g, '');
  return cleanTokens(decodeEntities(stripped).split(/\n/));
}

function textToTokens(text) {
  return cleanTokens(String(text || '').split(/\r?\n/));
}

const toTokens = ({ html, text }) => (html && String(html).trim() ? htmlToTokens(html) : textToTokens(text));

// --- money, dates, packs ------------------------------------------------------------------

const MONEY_AT = /(\(?)\s*(-?)\s*\$\s*(-?)\s*([\d,]+)\.(\d{2})(?!\d)/;
const MONEY_TOKEN = /^\(?\s*-?\s*\$\s*-?\s*[\d,]+\.\d{2}\)?(?:\s*USD)?$/;

/** Cents of the first money amount in `text` (`$1,234.50`, `-$5.00`, `($5.00)`), 0 for "Free", else null. */
function moneyCents(text) {
  const value = String(text ?? '').trim();
  if (/^free$/i.test(value)) return 0;
  const match = MONEY_AT.exec(value);
  if (!match) return null;
  const cents = Number(match[4].replace(/,/g, '')) * 100 + Number(match[5]);
  return match[2] === '-' || match[3] === '-' ? -cents : cents;
}

const isMoneyToken = (token) => MONEY_TOKEN.test(token) || /^free$/i.test(token);

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function isoDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** `November 12, 2022` / `Nov 12, 2022` / `4/16/2025` -> YYYY-MM-DD, else null. */
function parseDateText(text) {
  const named = /([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(text);
  if (named) {
    const month = MONTHS.findIndex((name) => name.startsWith(named[1].toLowerCase().slice(0, 3)) && name.startsWith(named[1].toLowerCase()));
    if (month >= 0) return isoDate(named[3], month + 1, named[2]);
  }
  const numeric = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text);
  return numeric ? isoDate(numeric[3], numeric[1], numeric[2]) : null;
}

/** The caller's fallback date: `YYYY-MM-DD`, an ISO timestamp, an RFC 2822 Date header or a Date. */
function normalizeInputDate(date) {
  if (!date) return null;
  if (date instanceof Date) return Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date));
  if (match) return isoDate(match[1], match[2], match[3]);
  const parsed = new Date(String(date)); // RFC 2822 Date header
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
}

/**
 * Canonical pack text for ONE ordered unit, or null when the text carries no recognised pack
 * (`5 lb`, `3 l`, `48 each`, `6 x 200 g`). `parsePackText` decides what is recognised.
 */
function packTextFrom(text) {
  if (!text) return null;
  const pack = parsePackText(text);
  if (!pack) return null;
  const unit = pack.unit === 'floz' ? 'fl oz' : pack.unit;
  return pack.count !== 1 ? `${pack.count} x ${pack.size} ${unit}` : `${pack.size} ${unit}`;
}

const tidy = (text) => String(text).replace(/\s+/g, ' ').trim();

// --- shared line / summary / reconciliation core -----------------------------------------------

const NON_FOOD_COMMON = /\b(?:shipping|handling|delivery fee|service fee|processing fee|packaging|gift card|insurance|tip)\b/i;

function makeLine(ctx, { description, sku = null, packText = null, quantity, unitPriceCents, lineTotalCents, unitRounded = false }) {
  const reasons = ctx.reasons;
  let unit = unitPriceCents;
  if (!(quantity > 0) || !Number.isFinite(lineTotalCents)) {
    reasons.push('line_unreadable');
  } else if (unit === undefined || unit === null) {
    if (lineTotalCents % quantity === 0) unit = lineTotalCents / quantity;
    else {
      unit = null;
      reasons.push('unit_price_inexact');
    }
  } else if (!unitRounded && Math.round(unit * quantity) !== lineTotalCents) {
    reasons.push('line_math_mismatch');
  }
  let kind = 'merchandise';
  if (lineTotalCents === 0) kind = 'free_sample';
  else if (lineTotalCents < 0) kind = 'adjustment';
  else if (NON_FOOD_COMMON.test(description) || (ctx.nonFood && ctx.nonFood.test(description))) kind = 'non_food';
  const line = {
    index: ctx.lines.length + 1,
    description: tidy(description),
    sku: sku || null,
    packText: packText || null,
    quantity,
    unitPriceCents: unit,
    lineTotalCents,
    kind,
  };
  ctx.lines.push(line);
  return line;
}

const SUMMARY_LABELS = [
  ['subtotal', /^sub-?total\s*(?::\s*)?(?=\$|$)/i],
  ['shipping', /^shipping\b/i],
  ['tax', /^(?:sales )?tax(?:es)?\b/i],
  ['discount', /^discounts?\b/i],
  ['total', /^(?:order )?total\s*(?::\s*)?(?=\$|$)/i],
  ['saved', /^you saved\b/i],
];

/** First occurrence of each label from `from` on; the value is in the same token or the next one. */
function readSummary(tokens, from) {
  const out = { subtotal: null, shipping: null, tax: null, discount: null, total: null, saved: null };
  for (let i = Math.max(0, from); i < tokens.length; i += 1) {
    for (const [key, pattern] of SUMMARY_LABELS) {
      if (out[key] !== null) continue;
      const match = pattern.exec(tokens[i]);
      if (!match) continue;
      let cents = moneyCents(tokens[i].slice(match[0].length));
      if (cents === null && i + 1 < tokens.length && /^[(\-$]/.test(tokens[i + 1])) cents = moneyCents(tokens[i + 1]);
      if (cents !== null) out[key] = key === 'discount' || key === 'saved' ? Math.abs(cents) : cents;
    }
  }
  return out;
}

const REFUND_HEAD = /\b(?:refund(?:ed)?|credit (?:memo|note)|return(?:ed)? (?:items?|order))\b/i;
const CANCEL_HEAD = /\b(?:cancel+ed|cancel+ation)\b/i;

/** Refund / cancellation notices announce themselves in the first lines. */
function nonPurchaseKind(tokens) {
  const head = tokens.slice(0, 8).join(' ');
  if (REFUND_HEAD.test(head)) return 'refund';
  if (CANCEL_HEAD.test(head)) return 'cancelled';
  return null;
}

const sumCents = (lines) => lines.reduce((total, line) => total + (Number.isFinite(line.lineTotalCents) ? line.lineTotalCents : 0), 0);

function finishOrder(meta, ctx, { orderId, messageId, purchasedAt, summary, orderDiscountCents = 0 }) {
  const reasons = [...ctx.reasons];
  const lines = ctx.lines;
  if (!orderId) reasons.push('missing_order_id');
  if (!purchasedAt) reasons.push('missing_date');
  if (!lines.length) reasons.push('no_lines');
  if (summary.total === null) reasons.push('missing_total');
  if (summary.total !== null && summary.total < 0) return skipped(meta, messageId, 'refund');

  const linesCents = sumCents(lines);
  if (summary.subtotal !== null && linesCents !== summary.subtotal) reasons.push('lines_subtotal_mismatch');
  let expectedTotalCents = null;
  if (summary.total !== null) {
    const base = summary.subtotal !== null ? summary.subtotal : linesCents;
    expectedTotalCents = base + (summary.shipping || 0) + (summary.tax || 0) - (summary.discount || 0) - orderDiscountCents;
    if (expectedTotalCents !== summary.total) reasons.push('total_mismatch');
  }
  const unique = [...new Set(reasons)];
  return {
    vendorKey: meta.key,
    vendor: meta.name,
    orderId: orderId || null,
    messageId: messageId || null,
    purchasedAt: purchasedAt || null,
    parseState: unique.length ? 'review_required' : 'parsed',
    reasons: unique,
    lines,
    summary: { subtotal: summary.subtotal, shipping: summary.shipping, tax: summary.tax, discount: summary.discount, total: summary.total },
    reconciliation: { linesCents, expectedTotalCents, totalCents: summary.total, exact: !unique.length },
  };
}

function skipped(meta, messageId, skipReason) {
  return {
    vendorKey: meta.key,
    vendor: meta.name,
    orderId: null,
    messageId: messageId || null,
    purchasedAt: null,
    parseState: 'skipped',
    skipReason,
    reasons: [],
    lines: [],
    summary: null,
    reconciliation: null,
  };
}

const findIndex = (tokens, pattern, from = 0) => {
  for (let i = Math.max(0, from); i < tokens.length; i += 1) if (pattern.test(tokens[i])) return i;
  return -1;
};

const newContext = (nonFood) => ({ reasons: [], lines: [], nonFood });

// --- Shopify-style item blocks (Olive Oil Lovers, Smoking Goose, Browne Trading) ------------------

const ITEM_HEADER = /^(.+?)\s+[×x]\s*(\d+)$/;
const STANDALONE_QTY = /^[×x]\s*(\d+)$/;
const DISCOUNT_TOKEN = /^\(\s*-\s*\$\s*[\d,]+\.\d{2}\s*\)$/;
const PROMO_CODE = /^[A-Z0-9][A-Z0-9_-]{5,}$/;

/**
 * `name × qty`, optionally followed by variant text, a promo code, a `(-$x)` line discount and
 * one or two prices. Two prices are `list, paid`; the PAID (discount-adjusted) price is the line total.
 * Returns the number of line discount cents taken.
 */
function shopifyItems(ctx, region, describe) {
  const merged = [];
  for (const token of region) {
    const qty = STANDALONE_QTY.exec(token);
    if (qty && merged.length && !isMoneyToken(merged[merged.length - 1])) merged[merged.length - 1] = `${merged[merged.length - 1]} × ${qty[1]}`;
    else merged.push(token);
  }
  const items = [];
  for (const token of merged) {
    const header = ITEM_HEADER.exec(token);
    if (header && !isMoneyToken(token)) items.push({ name: header[1], quantity: Number(header[2]), extras: [] });
    else if (items.length) items[items.length - 1].extras.push(token);
  }
  let lineDiscountCents = 0;
  for (const item of items) {
    const prices = [];
    let discount = null;
    const variants = [];
    for (const extra of item.extras) {
      if (DISCOUNT_TOKEN.test(extra)) discount = Math.abs(moneyCents(extra));
      else if (isMoneyToken(extra)) prices.push(moneyCents(extra));
      else if (!PROMO_CODE.test(extra)) variants.push(extra);
    }
    let paid = null;
    if (prices.length === 1 && discount === null) [paid] = prices;
    else if (prices.length === 2 && discount !== null) {
      if (prices[0] - discount !== prices[1]) ctx.reasons.push('discount_math_mismatch');
      [, paid] = prices;
    } else if (prices.length === 1) {
      // a discount with a single price: the printed price is already net of it only if proven by the totals
      ctx.reasons.push('unrecognized_line_shape');
    } else ctx.reasons.push('unrecognized_line_shape');
    if (discount !== null) lineDiscountCents += discount;
    const variant = variants.join(' ') || null;
    makeLine(ctx, { ...describe(item.name, variant), quantity: item.quantity, lineTotalCents: paid });
  }
  if (!items.length) ctx.reasons.push('no_item_rows');
  return lineDiscountCents;
}

/** Shopify `You saved $X` = line discounts (already inside the prices) + any order-level discount. */
function orderLevelDiscount(ctx, summary, lineDiscountCents) {
  if (summary.saved === null) return 0;
  const residual = summary.saved - lineDiscountCents;
  if (residual < 0) {
    ctx.reasons.push('saved_less_than_line_discounts');
    return 0;
  }
  return residual;
}

// --- vendor adapters -------------------------------------------------------------------------------

function parseMeadowlark(meta, { tokens, messageId }) {
  const marker = findIndex(tokens, /^Your Order #\d+ Has Been Placed/i);
  if (marker < 0) return skipped(meta, messageId, 'not_order_confirmation');
  const orderId = /#(\d+)/.exec(tokens[marker])[1];
  const ctx = newContext(meta.nonFood);
  const placed = findIndex(tokens, /^Placed on /i, marker);
  const purchasedAt = placed >= 0 ? parseDateText(tokens[placed]) : null;
  const subtotalAt = findIndex(tokens, /^Subtotal$/i, marker);
  if (subtotalAt < 0) {
    ctx.reasons.push('missing_subtotal');
    return finishOrder(meta, ctx, { orderId, messageId, purchasedAt, summary: readSummary(tokens, marker) });
  }
  let current = [];
  const start = placed >= 0 ? placed + 1 : marker + 1;
  for (const token of tokens.slice(start, subtotalAt)) {
    current.push(token);
    const unitMatch = /^(\$[\d,]+\.\d{2}) \/ Item$/i.exec(token);
    if (!unitMatch) continue;
    const qtyAt = current.findIndex((entry) => /^Qty:\s*\d+$/i.test(entry));
    const priceAt = current.findIndex((entry) => /^\$[\d,]+\.\d{2}$/.test(entry));
    if (qtyAt < 0 || priceAt < 1) {
      ctx.reasons.push('unrecognized_line_shape');
    } else {
      const afterPrice = current.slice(priceAt + 1, qtyAt);
      const sku = afterPrice.length && !/^[A-Za-z ]+:/.test(afterPrice[0]) ? afterPrice[0] : null;
      const variants = sku ? afterPrice.slice(1) : afterPrice;
      const size = variants.map((entry) => /^(?:size|weight)\s*:\s*(.+)$/i.exec(entry)).find(Boolean);
      const type = variants.map((entry) => /^type\s*:\s*(.+)$/i.exec(entry)).find(Boolean);
      const name = current[priceAt - 1].replace(/^New!\s*/i, '');
      makeLine(ctx, {
        description: type ? `${name} (${type[1]})` : name,
        sku,
        packText: size ? packTextFrom(size[1]) : null,
        quantity: Number(/\d+/.exec(current[qtyAt])[0]),
        unitPriceCents: moneyCents(unitMatch[1]),
        lineTotalCents: moneyCents(current[priceAt]),
      });
    }
    current = [];
  }
  if (current.length) ctx.reasons.push('unparsed_item_region');
  return finishOrder(meta, ctx, { orderId, messageId, purchasedAt, summary: readSummary(tokens, subtotalAt) });
}

function parseOliveOilLovers(meta, { tokens, messageId }) {
  const marker = findIndex(tokens, /^Order Confirmation$/i);
  const orderAt = marker >= 0 ? findIndex(tokens, /^Order [A-Z]{2,5}\d{5,}$/, marker) : -1;
  if (orderAt < 0) return skipped(meta, messageId, 'not_order_confirmation');
  const orderId = /^Order (\S+)$/.exec(tokens[orderAt])[1];
  const ctx = newContext(meta.nonFood);
  const purchasedAt = parseDateText(tokens[orderAt + 1] || '');
  const subtotalAt = findIndex(tokens, /^Subtotal$/i, orderAt);
  if (subtotalAt < 0) return finishOrder(meta, { ...ctx, reasons: ['missing_subtotal'] }, { orderId, messageId, purchasedAt, summary: readSummary(tokens, orderAt) });
  const viewAt = findIndex(tokens, /^View Order Status/i, orderAt);
  const region = tokens.slice(viewAt >= 0 ? viewAt + 1 : orderAt + 2, subtotalAt);
  const lineDiscount = shopifyItems(ctx, region, (name) => ({ description: name, packText: packTextFrom(name) }));
  const summary = readSummary(tokens, subtotalAt);
  return finishOrder(meta, ctx, { orderId, messageId, purchasedAt, summary, orderDiscountCents: orderLevelDiscount(ctx, summary, lineDiscount) });
}

const CHOCOLATE_ITEM = /^(?:\*\s*)?(\d+)x\s+(.+?)\s+for\s+\$\s*([\d,]+\.\d{2})\s+each$/i;
const CHOCOLATE_ITEM_START = /^(?:\*\s*)?\d+x\s/i;

function parseChocolateAlchemy(meta, { tokens, messageId }) {
  const marker = findIndex(tokens, /^This email is to confirm your recent order/i);
  if (marker < 0) return skipped(meta, messageId, 'not_order_confirmation');
  const ctx = newContext(meta.nonFood);
  const dateAt = findIndex(tokens, /^Date \d{1,2}\/\d{1,2}\/\d{4}$/, marker);
  const purchasedAt = dateAt >= 0 ? parseDateText(tokens[dateAt]) : null;
  // The plain-text body hard-wraps long item names; rejoin until `for $ x each`.
  const rows = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (!CHOCOLATE_ITEM_START.test(tokens[i])) continue;
    let row = tokens[i];
    let span = 0;
    while (!CHOCOLATE_ITEM.test(row) && span < 4 && i + span + 1 < tokens.length) {
      span += 1;
      row = `${row} ${tokens[i + span]}`;
    }
    if (CHOCOLATE_ITEM.test(row)) {
      rows.push(row);
      i += span;
    } else ctx.reasons.push('unparsed_item_row');
  }
  for (const row of rows) {
    const [, quantity, name, price] = CHOCOLATE_ITEM.exec(row);
    const unitPriceCents = moneyCents(`$${price}`);
    makeLine(ctx, {
      description: name,
      packText: packTextFrom(name),
      quantity: Number(quantity),
      unitPriceCents,
      lineTotalCents: unitPriceCents * Number(quantity),
    });
  }
  const summary = readSummary(tokens, dateAt >= 0 ? dateAt : marker);
  // No order number in the body: the Gmail message id is the document id.
  return finishOrder(meta, ctx, { orderId: messageId, messageId, purchasedAt, summary });
}

function parseVernsCheese(meta, { tokens, messageId, date }) {
  const orderAt = findIndex(tokens, /^\[?Order #\d+\]?(?:\s|$)/);
  const received = findIndex(tokens, /received your order|Your Order is Being Processed/i) >= 0;
  if (orderAt < 0 || !received) return skipped(meta, messageId, 'not_order_confirmation');
  const orderId = /#(\d+)/.exec(tokens[orderAt])[1];
  const ctx = newContext(meta.nonFood);
  const purchasedAt = parseDateText(tokens[orderAt]) || date;
  const subtotalAt = findIndex(tokens, /^Subtotal:?$/i, orderAt);
  if (subtotalAt < 0) return finishOrder(meta, { ...ctx, reasons: ['missing_subtotal'] }, { orderId, messageId, purchasedAt, summary: readSummary(tokens, orderAt) });
  const region = tokens.slice(orderAt + 1, subtotalAt).filter((token) => !/^(?:Product|Quantity|Price|Order summary)$/i.test(token));
  if (region.length % 3 !== 0) ctx.reasons.push('unparsed_item_region');
  for (let i = 0; i + 2 < region.length; i += 3) {
    const qty = /^[×x]?\s*(\d+)$/.exec(region[i + 1]);
    if (!qty || !isMoneyToken(region[i + 2])) {
      ctx.reasons.push('unrecognized_line_shape');
      continue;
    }
    makeLine(ctx, {
      description: region[i],
      packText: packTextFrom(region[i]),
      quantity: Number(qty[1]),
      lineTotalCents: moneyCents(region[i + 2]),
    });
  }
  return finishOrder(meta, ctx, { orderId, messageId, purchasedAt, summary: readSummary(tokens, subtotalAt) });
}

function parseSmokingGoose(meta, { tokens, messageId, date }) {
  const thanks = findIndex(tokens, /^Thank you for your order!?$/i);
  const summaryAt = findIndex(tokens, /^Order summary$/i);
  const orderAt = findIndex(tokens, /^Order #\d+$/);
  if (thanks < 0 || summaryAt < 0 || orderAt < 0) return skipped(meta, messageId, 'not_order_confirmation');
  const orderId = /\d+/.exec(tokens[orderAt])[0];
  const ctx = newContext(meta.nonFood);
  const subtotalAt = findIndex(tokens, /^Subtotal$/i, summaryAt);
  if (subtotalAt < 0) return finishOrder(meta, { ...ctx, reasons: ['missing_subtotal'] }, { orderId, messageId, purchasedAt: date, summary: readSummary(tokens, summaryAt) });
  // `Title - Variant title` -> the variant title ("Salame Cotto: Sale! - Salame Cotto: Whole" -> "Salame Cotto: Whole")
  const lineDiscount = shopifyItems(ctx, tokens.slice(summaryAt + 1, subtotalAt), (name) => {
    const description = name.split(' - ').pop();
    return { description, packText: packTextFrom(description) };
  });
  const summary = readSummary(tokens, subtotalAt);
  return finishOrder(meta, ctx, { orderId, messageId, purchasedAt: date, summary, orderDiscountCents: orderLevelDiscount(ctx, summary, lineDiscount) });
}

function parseBrowneTrading(meta, { tokens, messageId, date }) {
  const thanks = findIndex(tokens, /^Thank you for your purchase!?$/i);
  const summaryAt = findIndex(tokens, /^Order summary$/i);
  const orderAt = findIndex(tokens, /^Order #\d+$/);
  if (thanks < 0 || summaryAt < 0 || orderAt < 0) return skipped(meta, messageId, 'not_order_confirmation');
  const orderId = /\d+/.exec(tokens[orderAt])[0];
  const ctx = newContext(meta.nonFood);
  const subtotalAt = findIndex(tokens, /^Subtotal$/i, summaryAt);
  if (subtotalAt < 0) return finishOrder(meta, { ...ctx, reasons: ['missing_subtotal'] }, { orderId, messageId, purchasedAt: date, summary: readSummary(tokens, summaryAt) });
  // Price actually paid = the discount-adjusted line price (the list price minus the line discount).
  const lineDiscount = shopifyItems(ctx, tokens.slice(summaryAt + 1, subtotalAt), (name, variant) => ({
    description: variant ? `${name} (${variant})` : name,
    packText: packTextFrom(variant) || packTextFrom(name),
  }));
  const summary = readSummary(tokens, subtotalAt);
  return finishOrder(meta, ctx, { orderId, messageId, purchasedAt: date, summary, orderDiscountCents: orderLevelDiscount(ctx, summary, lineDiscount) });
}

function parseGoodAcre(meta, { tokens, messageId }) {
  const invoiceAt = findIndex(tokens, /^Invoice#\s*\d+$/i);
  const headerAt = findIndex(tokens, /^Item Name$/i, invoiceAt);
  const totalAt = findIndex(tokens, /^Order Total:?$/i, headerAt);
  if (invoiceAt < 0 || headerAt < 0 || totalAt < 0) return skipped(meta, messageId, 'not_order_confirmation');
  const orderId = /\d+/.exec(tokens[invoiceAt])[0];
  const ctx = newContext(meta.nonFood);
  const dateAt = findIndex(tokens, /^Order Date:/i, invoiceAt);
  const purchasedAt = dateAt >= 0 ? parseDateText(tokens[dateAt]) : null;
  const start = headerAt + 6; // Item Name | Producer | Unit | Price | Qty | Total
  let current = [];
  for (let i = start; i < totalAt; i += 1) {
    if (isMoneyToken(tokens[i]) && /^\d+$/.test(tokens[i + 1] || '') && isMoneyToken(tokens[i + 2] || '') && i + 2 < totalAt) {
      // cells before the price: name, [producer], unit (a blank producer cell is not exported)
      if (current.length < 2 || current.length > 3) ctx.reasons.push('unrecognized_line_shape');
      else {
        const unit = current[current.length - 1];
        makeLine(ctx, {
          description: `${current[0]} (${unit})`,
          packText: packTextFrom(unit),
          quantity: Number(tokens[i + 1]),
          unitPriceCents: moneyCents(tokens[i]),
          lineTotalCents: moneyCents(tokens[i + 2]),
        });
      }
      current = [];
      i += 2;
    } else current.push(tokens[i]);
  }
  if (current.length) ctx.reasons.push('unparsed_item_region');
  return finishOrder(meta, ctx, { orderId, messageId, purchasedAt, summary: readSummary(tokens, totalAt) });
}

function parseAlemar(meta, { tokens, messageId }) {
  const company = findIndex(tokens, /^Alemar Cheese Company$/i);
  const invoiceAt = findIndex(tokens, /^Invoice #:?$/i);
  const headerAt = findIndex(tokens, /^Date$/);
  const totalAt = findIndex(tokens, /^Total:?$/i, headerAt);
  if (company < 0 || invoiceAt < 0 || headerAt < 0 || totalAt < 0) return skipped(meta, messageId, 'not_order_confirmation');
  const orderId = /^\d+$/.test(tokens[invoiceAt + 1] || '') ? tokens[invoiceAt + 1] : null;
  const ctx = newContext(meta.nonFood);
  const dateAt = findIndex(tokens, /^Invoice Date:?$/i);
  const purchasedAt = dateAt >= 0 ? parseDateText(tokens[dateAt + 1] || '') : null;
  const rows = tokens.slice(headerAt + 5, totalAt);
  if (rows.length % 5 !== 0) ctx.reasons.push('unparsed_item_region');
  for (let i = 0; i + 4 < rows.length; i += 5) {
    const [rowDate, rawDescription, qty, rate, amount] = rows.slice(i, i + 5);
    if (!parseDateText(rowDate) || !/^\d+(?:\.\d+)?$/.test(qty) || !/^\d+(?:\.\d+)?$/.test(rate) || !/^-?[\d,]+\.\d{2}$/.test(amount)) {
      ctx.reasons.push('unrecognized_line_shape');
      continue;
    }
    const quantity = Number(qty);
    const lineTotalCents = moneyCents(`$${amount}`);
    if (Math.round(Number(rate) * quantity * 100) !== lineTotalCents) ctx.reasons.push('line_math_mismatch');
    const perPiece = /\b(?:each|price per piece)\s*$/i.test(rawDescription);
    const description = rawDescription.replace(/^WHOLESALE\s+/i, '').replace(/\s+(?:price per piece|each)\s*$/i, '');
    // Rates are printed to 3 places for per-piece lines; the unit price is rounded to cents, the line total stays exact.
    // Rows without a per-piece marker are priced per pound (the invoice does not print the unit; the quantities are weights).
    const line = makeLine(ctx, {
      description,
      packText: perPiece ? null : '1 lb',
      quantity,
      unitPriceCents: Math.round(Number(rate) * 100),
      lineTotalCents,
      unitRounded: true,
    });
    if (line.packText === '1 lb') ctx.assumedPounds = (ctx.assumedPounds || 0) + 1;
  }
  const order = finishOrder(meta, ctx, { orderId, messageId, purchasedAt, summary: readSummary(tokens, totalAt) });
  if (ctx.assumedPounds) order.assumedPoundLines = ctx.assumedPounds;
  return order;
}

// --- registry ------------------------------------------------------------------------------------------

const EQUIPMENT = /\b(?:melangers?|grinders?|winnowers?|crackers?|assembly|replacement|spare|gasket|motor|belt|pulley|cone|wheel|roller|thermometer|mold|sieve)\b/i;
const COOLER = /\b(?:coolers?|ice packs?|dry ice|insulat\w*)\b/i;

function define(key, { name, keyPrefix, gmailQuery, priceBasis, nonFood, adapter }) {
  const meta = { key, name, keyPrefix: keyPrefix || key.replace(/_/g, '-'), gmailQuery, priceBasis, nonFood };
  return {
    ...meta,
    parse({ html, text, messageId, date } = {}) {
      const tokens = toTokens({ html, text });
      const kind = nonPurchaseKind(tokens);
      if (kind) return skipped(meta, messageId, kind);
      return adapter(meta, { tokens, messageId, date: normalizeInputDate(date) });
    },
  };
}

const VENDORS = Object.freeze({
  meadowlark: define('meadowlark', {
    name: 'Meadowlark Organics',
    gmailQuery: 'from:meadowlarkmill.com subject:"Order Confirmed"',
    priceBasis: 'unit price per ordered unit (bag) as printed',
    adapter: parseMeadowlark,
  }),
  olive_oil_lovers: define('olive_oil_lovers', {
    name: 'Olive Oil Lovers',
    gmailQuery: 'from:oliveoillovers.com subject:"Update On Your Order"',
    priceBasis: 'line price printed per item row / quantity',
    adapter: parseOliveOilLovers,
  }),
  chocolate_alchemy: define('chocolate_alchemy', {
    name: 'Chocolate Alchemy',
    gmailQuery: '"Chocolate Alchemy" subject:confirmation',
    priceBasis: 'price "each" as printed',
    nonFood: EQUIPMENT,
    adapter: parseChocolateAlchemy,
  }),
  verns_cheese: define('verns_cheese', {
    name: "Vern's Cheese",
    gmailQuery: 'subject:"Vern\'s Cheese Order"',
    priceBasis: 'printed line price / quantity',
    nonFood: COOLER,
    adapter: parseVernsCheese,
  }),
  smoking_goose: define('smoking_goose', {
    name: 'Smoking Goose',
    gmailQuery: 'from:ordergoose.com subject:"Thank you for your order"',
    priceBasis: 'printed line price / quantity',
    adapter: parseSmokingGoose,
  }),
  browne_trading: define('browne_trading', {
    name: 'Browne Trading',
    gmailQuery: 'from:brownetrading.com subject:confirmed',
    priceBasis: 'price actually paid: the discount-adjusted line price / quantity (list price minus the line discount)',
    adapter: parseBrowneTrading,
  }),
  good_acre: define('good_acre', {
    name: 'The Good Acre',
    keyPrefix: 'good-acre-confirmation',
    gmailQuery: 'from:thegoodacre.org subject:"Confirmation for Order"',
    priceBasis: 'printed unit (case) price; confirmations are NOT final invoices',
    adapter: parseGoodAcre,
  }),
  alemar: define('alemar', {
    name: 'Alemar Cheese',
    gmailQuery: 'from:notification.intuit.com Alemar',
    priceBasis: 'printed rate (per lb for fractional quantities, per piece otherwise), rounded to cents; line total exact',
    adapter: parseAlemar,
  }),
});

/** @returns {object} Order (see the header). Throws only for an unknown vendor key. */
function parseOrderEmail({ vendorKey, html, text, messageId, date }) {
  const vendor = VENDORS[vendorKey];
  if (!vendor) throw new Error(`unknown vendor "${vendorKey}" (use ${Object.keys(VENDORS).join(', ')})`);
  return vendor.parse({ html, text, messageId, date });
}

// --- candidate vendor lines -----------------------------------------------------------------------------------

/**
 * Convert an Order to catalog.planVendorLines input. Only `parsed` orders emit lines, and only
 * merchandise lines: $0 free samples, non-food lines and negative adjustments are counted instead.
 * Returns { lines, freeSamples, nonFood, adjustments, noPack }.
 */
function toVendorLinesDetailed(order) {
  const result = { lines: [], freeSamples: 0, nonFood: 0, adjustments: 0, noPack: 0 };
  if (order.parseState !== 'parsed') return result;
  const meta = VENDORS[order.vendorKey];
  for (const line of order.lines) {
    if (line.kind === 'free_sample') result.freeSamples += 1;
    else if (line.kind === 'non_food') result.nonFood += 1;
    else if (line.kind === 'adjustment') result.adjustments += 1;
    else {
      if (!line.packText) result.noPack += 1;
      result.lines.push({
        sourceKey: `${meta.keyPrefix}|${order.orderId}|${line.index}`,
        source: SOURCE,
        vendor: meta.name,
        ...(line.sku ? { sku: line.sku } : {}),
        description: line.description,
        packText: line.packText, // null = explicitly no pack (never fall back to parsing the description)
        observedAt: order.purchasedAt,
        unitPriceCents: line.unitPriceCents,
        quantity: line.quantity,
        lineTotalCents: line.lineTotalCents,
      });
    }
  }
  return result;
}

const toVendorLines = (order) => toVendorLinesDetailed(order).lines;

module.exports = {
  SOURCE,
  VENDORS,
  parseOrderEmail,
  toVendorLines,
  toVendorLinesDetailed,
  // exported for tests and the CLI
  htmlToTokens,
  moneyCents,
  packTextFrom,
  parseDateText,
};
