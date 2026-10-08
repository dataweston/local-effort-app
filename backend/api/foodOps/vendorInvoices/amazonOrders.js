/**
 * Amazon purchases -> Food Ops catalog cost observations. Pure parsers over HTML (strings); the CLI loads
 * Gmail messages or saved pages. Two sources with very different fidelity:
 *
 *  1. `parseConfirmationEmail(html, { date })` - Gmail "Order Confirmation" (auto-confirm@amazon.com).
 *     Per-item quantity and price. Titles are truncated by Amazon (~36 chars + "..."), so pack sizes are often
 *     lost. The order date is the email date. The 2023 layout prints `Order n of m` blocks with
 *     [unit price, Qty, line total]; the 2025 layout prints [category, Sold by, Qty, unit price]. A split
 *     purchase ("divided into N orders") is N order blocks in one email.
 *  2. `parseOrderHistory(html)` - the saved "Your Orders" page (full titles, order date and order total,
 *     NO item prices). An order is priced only when it has exactly one item: the line total is then the order
 *     total (which already includes any tax/shipping). Multi-item orders are reported as unpriced, never split.
 *
 * Reconciliation (integer cents). Amazon totals include tax/shipping that is not itemised, so an exact tie is
 * only possible for a single order with no tax:
 *   - per item: quantity x unit price == line total (2023 layout) - always exact or review_required;
 *   - per order: `Order Total` (when printed and non-zero; `$0.00` means "not printed") must be >= sum(lines)
 *     and within 25% of it. The residual is reported as tax/shipping.
 *     reconciliation.state = exact | plus_tax_shipping | total_unprinted | mismatch.
 * A mismatch makes the order review_required and it emits no lines.
 *
 * Only food and kitchen consumables are emitted (`classifyTitle`); everything else (equipment, household,
 * personal care, tires...) is counted and summed in `excluded`. Indexes are 1-based over ALL items of an order,
 * so a source key `amazon|<order id>|<index>` never shifts when the filter changes.
 *
 * Privacy: shipping name/address are never read or returned.
 */
'use strict';

const { htmlToTokens, moneyCents, packTextFrom, parseDateText } = require('./htmlOrders');

const SOURCE = 'vendor_invoice';
const VENDOR = { key: 'amazon', keyPrefix: 'amazon', name: 'Amazon' };
const ORDER_ID = /^\d{3}-\d{7}-\d{7}$/;
const MAX_RESIDUAL = 0.25;

const clean = (text) => String(text).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&reg;/g, '').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

// First match wins: equipment/household/personal -> other; then consumables; then food; else other.
const OTHER = /\b(?:tires?|toothpaste|ibuprofen|tablets?|diapers?|pampers|litter|dishwasher|motor oil|castrol|peel|knife|cutting board|totes?|storage bins?|mason jars?|canning jars?|pans?|reusable|sealer machine|address labels|proofing|dressing containers|blender|mixer|scale|thermometer|apron|mop|broom|vitamin|supplement|shampoo|detergent)\b/i;
const CONSUMABLE = /\b(?:sealer bags?|vacuum sealer|zipper bags?|food bags?|freezer bags?|gloves?|food label\w*|labeling stickers|allergen\w*|deli containers?|deli cups?|to-go|take-?out|pizza (?:party )?box\w*|plates?|napkins?|paper towels?|foil|parchment|plastic wrap|cling|cups? and lids|hinged lid|lids?)\b/i;
const FOOD = /\b(?:sugar|panela|salt|oil|vinegar|flour|rice|beans?|nuts?|spice|seasoning|honey|syrup|candy|gummy|gummies|chocolate|cocoa|coffee|tea|pasta|sauce|cheese|butter|yeast|oats?|snack|jerky|olive|vanilla|extract|baking|dough|tomato\w*|grocery)\b/i;

/** `'food' | 'consumable' | 'other'` for an item title (+ Amazon's category label when it prints one). */
function classifyTitle(title, category = '') {
  if (OTHER.test(title)) return 'other';
  if (CONSUMABLE.test(title)) return 'consumable';
  if (FOOD.test(title) || (/^grocery$/i.test(category) && !/\b(?:pet|cat|dog)\b/i.test(title))) return 'food';
  return 'other';
}

function tokensOf(htmlOrTokens) {
  return Array.isArray(htmlOrTokens) ? htmlOrTokens.map(clean).filter(Boolean) : htmlToTokens(htmlOrTokens).map(clean).filter(Boolean);
}

function finishOrder(order, emailTotalCents) {
  const reasons = [];
  const items = order.items;
  if (!items.length) reasons.push('no_items');
  for (const item of items) {
    if (item.lineTotalCents === null) continue;
    if (item.quantity * item.unitPriceCents !== item.lineTotalCents) reasons.push(`quantity_mismatch:${item.index}`);
  }
  const priced = items.length > 0 && items.every((item) => item.lineTotalCents !== null);
  const sum = priced ? items.reduce((total, item) => total + item.lineTotalCents, 0) : null;
  const total = order.orderTotalCents && order.orderTotalCents > 0 ? order.orderTotalCents : null;
  const rec = { linesCents: sum, orderTotalCents: total, taxShippingCents: null, state: 'total_unprinted', exact: false };
  if (priced && total !== null) {
    const residual = total - sum;
    rec.taxShippingCents = residual;
    if (residual === 0) { rec.state = 'exact'; rec.exact = true; }
    else if (residual > 0 && residual <= sum * MAX_RESIDUAL) rec.state = 'plus_tax_shipping';
    else { rec.state = 'mismatch'; reasons.push('order_total_mismatch'); }
  }
  order.reasons = reasons;
  order.reconciliation = rec;
  order.priced = priced;
  order.parseState = reasons.length ? 'review_required' : 'parsed';
  order.emailTotalCents = emailTotalCents ?? null;
  return order;
}

/**
 * Gmail order-confirmation HTML (or its tokens) -> `{ orders, totalCents, reasons }`.
 * `date` (YYYY-MM-DD) is the message date and becomes each order's `purchasedAt`.
 */
function parseConfirmationEmail(htmlOrTokens, { date = null } = {}) {
  const toks = tokensOf(htmlOrTokens);
  const result = { vendorKey: VENDOR.key, vendor: VENDOR.name, orders: [], totalCents: null, reasons: [] };
  const summaryTotal = toks.findIndex((tok) => /^TOTAL$/.test(tok));
  if (summaryTotal >= 0) result.totalCents = moneyCents(toks[summaryTotal + 1]);

  const starts = [];
  toks.forEach((tok, i) => {
    if (/^Order #$/.test(tok) && ORDER_ID.test(toks[i + 1] || '')) starts.push(i);
  });
  const endAt = toks.findIndex((tok, i) => i > (starts[0] ?? Infinity) && /^(To learn more about ordering|Products related to your purchase)/.test(tok));
  starts.forEach((start, n) => {
    const stop = n + 1 < starts.length ? starts[n + 1] : endAt >= 0 ? endAt : toks.length;
    const order = { orderId: toks[start + 1], purchasedAt: date, orderTotalCents: null, items: [] };
    let item = null;
    let afterCondition = false;
    const open = () => (item = { title: null, category: null, seller: null, quantity: null, prices: [] });
    const flush = () => {
      if (!item || !item.title || item.quantity === null || !item.prices.length) return false;
      const [first, last] = [item.prices[0], item.prices[item.prices.length - 1]];
      order.items.push({
        index: order.items.length + 1,
        title: item.title.replace(/\.\.\.$/, '').trim(),
        truncated: /\.\.\.$/.test(item.title),
        category: item.category,
        seller: item.seller,
        quantity: item.quantity,
        unitPriceCents: first,
        lineTotalCents: item.prices.length > 1 ? last : first * item.quantity,
      });
      item = null;
      return true;
    };
    for (let i = start + 2; i < stop; i += 1) {
      const tok = toks[i];
      if (/^Order \d+ of \d+$|^View or manage order$|^\|$|^Order Confirmation$/.test(tok)) continue;
      if (/^Order Total:?$/.test(tok)) {
        order.orderTotalCents = moneyCents(toks[i + 1]);
        break;
      }
      if (!item) open();
      const qty = /^Qty\s*:\s*(\d+)$/.exec(tok);
      if (qty) { item.quantity = Number(qty[1]); afterCondition = false; continue; }
      if (/^\$[\d,]+\.\d{2}$/.test(tok)) {
        item.prices.push(moneyCents(tok));
        afterCondition = false;
        if (item.quantity !== null) { flush(); open(); }
        continue;
      }
      if (/^Sold by$/i.test(tok)) { item.seller = toks[i + 1] && !/^Condition/.test(toks[i + 1]) ? toks[i + 1] : null; i += item.seller ? 1 : 0; continue; }
      if (/^Sold by\s/i.test(tok)) { item.seller = tok.replace(/^Sold by\s+/i, ''); continue; }
      if (/^Condition\b/.test(tok)) { afterCondition = !/^Condition:\s*New$/i.test(tok); continue; }
      if (afterCondition) continue; // seller's condition note + "See more"
      if (item.title === null) item.title = tok;
      else if (item.category === null && item.quantity === null && !item.prices.length) item.category = tok;
    }
    for (const item_ of order.items) item_.kind = classifyTitle(item_.title, item_.category);
    result.orders.push(finishOrder(order, result.totalCents));
  });
  if (!result.orders.length) result.reasons.push('no_orders');

  // 2023 layout prints only the email-wide TOTAL: tie the orders together when no order printed its own.
  if (result.orders.length && result.totalCents && result.orders.every((o) => !o.reconciliation.orderTotalCents && o.priced)) {
    const sum = result.orders.reduce((total, o) => total + o.reconciliation.linesCents, 0);
    const residual = result.totalCents - sum;
    const state = residual === 0 ? 'exact' : residual > 0 && residual <= sum * MAX_RESIDUAL ? 'plus_tax_shipping' : 'mismatch';
    for (const order of result.orders) {
      order.reconciliation.state = state;
      order.reconciliation.exact = state === 'exact';
      order.reconciliation.taxShippingCents = null;
      order.reconciliation.emailResidualCents = residual;
      if (state === 'mismatch') {
        order.reasons.push('email_total_mismatch');
        order.parseState = 'review_required';
      }
    }
  }
  return result;
}

const STATUS = /^(?:Delivered\b|Arriving\b|Now arriving|Package was|Your package|Auto-delivered|Out for delivery|Shipped\b|Not yet shipped|Preparing|\d+$|Track package|Return\b|Get product support|Leave seller feedback|Write a product review|Ask Product Question|Share gift receipt|View your item|View your Subscribe)/;
const ANCHOR_RETURN = /^Return (?:window|or replace items:|items:)/;

/** Saved "Your Orders" page (or tokens) -> `{ orders }` (order-level; items carry titles only). */
function parseOrderHistory(htmlOrTokens) {
  const toks = tokensOf(htmlOrTokens);
  const starts = [];
  toks.forEach((tok, i) => { if (tok === 'Order placed') starts.push(i); });
  const orders = starts.map((start, n) => {
    const stop = n + 1 < starts.length ? starts[n + 1] : toks.length;
    const order = { orderId: null, purchasedAt: parseDateText(toks[start + 1] || ''), orderTotalCents: null, items: [], source: 'order_history' };
    let armed = true;
    for (let i = start + 2; i < stop; i += 1) {
      const tok = toks[i];
      if (tok === 'Total' && order.orderTotalCents === null) order.orderTotalCents = moneyCents(toks[i + 1]);
      else if (tok === 'Order #' && ORDER_ID.test(toks[i + 1] || '')) order.orderId = toks[i + 1];
      else if (tok === 'View your item') armed = true;
      else if (armed && (ANCHOR_RETURN.test(tok) || tok === 'Buy it again')) {
        let back = i - 1;
        let quantity = 1;
        while (back > start && STATUS.test(toks[back])) {
          if (/^\d+$/.test(toks[back])) quantity = Number(toks[back]);
          back -= 1;
        }
        const title = toks[back];
        if (title && back > start + 1 && !/^(?:View invoice|View order details|Order #|Buy it again)$/.test(title) && !ORDER_ID.test(title)) {
          order.items.push({ index: order.items.length + 1, title, quantity, kind: classifyTitle(title), unitPriceCents: null, lineTotalCents: null });
          armed = false;
        }
      }
    }
    return order;
  }).filter((order) => order.orderId);
  for (const order of orders) {
    // Priced only when one item carries the whole order total.
    if (order.items.length === 1 && order.orderTotalCents > 0) {
      const item = order.items[0];
      item.lineTotalCents = order.orderTotalCents;
      item.unitPriceCents = Math.round(order.orderTotalCents / item.quantity);
      item.priceIsOrderTotal = true;
    }
    order.reasons = [];
    if (!order.purchasedAt) order.reasons.push('missing_date');
    if (!order.items.length) order.reasons.push('no_items');
    order.priced = order.items.length > 0 && order.items.every((item) => item.lineTotalCents !== null);
    order.reconciliation = { linesCents: order.priced ? order.orderTotalCents : null, orderTotalCents: order.orderTotalCents, taxShippingCents: 0, state: order.priced ? 'exact' : 'unpriced', exact: order.priced };
    order.parseState = order.reasons.length ? 'review_required' : 'parsed';
  }
  return { vendorKey: VENDOR.key, vendor: VENDOR.name, orders };
}

/** One order per id: a priced confirmation email beats an order-history card; otherwise the first seen wins. */
function dedupeOrders(orders) {
  const byId = new Map();
  for (const order of orders) {
    const kept = byId.get(order.orderId);
    if (!kept || (order.priced && !kept.priced) || (order.priced && kept.priced && order.source !== 'order_history' && kept.source === 'order_history')) byId.set(order.orderId, order);
  }
  return [...byId.values()];
}

/**
 * Catalog lines for one order: food + consumables that are priced. Unpriced items and other-kind items are
 * counted (never guessed).
 * @returns {{ lines, excluded: {count, cents}, unpriced: {count}, noPack: number }}
 */
function toVendorLinesDetailed(order) {
  const out = { lines: [], excluded: { count: 0, cents: 0 }, unpriced: { count: 0 }, noPack: 0 };
  if (order.parseState !== 'parsed') return out;
  for (const item of order.items) {
    if (item.kind === 'other') {
      out.excluded.count += 1;
      out.excluded.cents += item.lineTotalCents || 0;
      continue;
    }
    if (item.lineTotalCents === null) { out.unpriced.count += 1; continue; }
    const packText = packTextFrom(item.title);
    if (!packText) out.noPack += 1;
    out.lines.push({
      sourceKey: `${VENDOR.keyPrefix}|${order.orderId}|${item.index}`,
      source: SOURCE,
      vendor: VENDOR.name,
      description: item.title,
      packText,
      observedAt: order.purchasedAt,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
    });
  }
  return out;
}

module.exports = { SOURCE, VENDOR, classifyTitle, parseConfirmationEmail, parseOrderHistory, dedupeOrders, toVendorLinesDetailed };
