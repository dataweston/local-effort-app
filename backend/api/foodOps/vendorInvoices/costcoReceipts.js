/**
 * Costco in-warehouse digital receipts (costco.com > Orders & Purchases > Warehouse, printed to PDF)
 * -> Food Ops catalog cost observations.
 *
 * Pure parser over the text rows of one receipt PDF (`pdfToTextLines` from ./pdfInvoices, injectable in
 * tests; pass `string[][]` pages or a flat `string[]`). One PDF = one receipt.
 *
 * Receipt layout (the register tape, one row per item):
 *
 *   [E ]<item no>  <DESCRIPTION>  <amount> <Y|N>        E = EBT/SNAP-eligible (food); Y/N = taxable flag
 *   <qty> @ <unit price>                                 printed on the row BEFORE a multi-unit item
 *   <coupon no> #<item no>  <amount>-                    instant savings, applies to the referenced item
 *   SUBTOTAL <n> / TAX <n> / **** TOTAL <n> / TOTAL NUMBER OF ITEMS SOLD = <n> / INSTANT SAVINGS $<n>
 *
 * Long descriptions wrap onto the rows above and below an item row whose own description is empty
 * (`LIBMAN` / `1954192  20.89 Y` / `LOBBY`); those are joined back (above first, then below).
 *
 * Reconciliation (integer cents; any miss -> parseState 'review_required', no lines emitted):
 *   - qty x unit price == printed amount for every `qty @ unit` item;
 *   - sum(item amounts) - sum(instant savings) == SUBTOTAL;   SUBTOTAL + TAX == TOTAL;
 *   - sum(quantities) == TOTAL NUMBER OF ITEMS SOLD when printed;
 *   - sum(instant savings) == INSTANT SAVINGS when printed.
 *
 * Output lines (`toVendorLinesDetailed`): food lines only (see `classify`). Non-food lines keep their
 * index (1-based over ALL items) so source keys never shift, and are counted/summed in `excluded`.
 *   sourceKey `costco|<receipt id>|<index>`, source `vendor_invoice`, vendor `Costco`, sku = item number,
 *   lineTotalCents = amount net of instant savings, unitPriceCents = net per unit.
 *   receipt id = the barcode digits printed under the address (unique per transaction), so a receipt
 *   saved twice yields the same keys.
 *
 * Privacy: receipts hold address, member number and card digits. Only item rows, totals, the receipt id,
 * store number and date are read; nothing else is returned.
 */
'use strict';

const { packTextFrom } = require('./htmlOrders');

const SOURCE = 'vendor_invoice';
const VENDOR = { key: 'costco', keyPrefix: 'costco', name: 'Costco' };

const MONEY = String.raw`(\d[\d,]*\.\d{2})`;
const ITEM_RE = new RegExp(String.raw`^(E\s+)?(\d{3,8})(?:\s+(.*?))?\s+${MONEY}\s+([YN])$`);
const SAVINGS_RE = new RegExp(String.raw`^(\d{3,8})\s+#(\d{3,8})\s+${MONEY}-$`);
const QTY_RE = new RegExp(String.raw`^(\d+)\s*@\s*${MONEY}$`);

const cents = (text) => Math.round(Number(String(text).replace(/,/g, '')) * 100);
const tidy = (text) => String(text).replace(/\s+/g, ' ').trim();

// Food is decided by the register's `E` (SNAP-eligible = food) marker first, then by name (Costco
// abbreviations). A row with no `E` that matches no food word is excluded and reported, never guessed
// (the taxable flag is NOT a food signal: medical gloves print N).
const NON_FOOD = /\b(?:CONT|CNTR|CONTAINER|STORAGE|FOIL\w*|PAPER|TOWEL\w*|TISSUE|NITRILE|GLOVE\w*|MITT?S?|BRM|BROOM|MOP|BOWL|TUB|PIZZABOX|BOX(?:ES)?|BAGS?|WRAP|FILM|LIDS?|CUPS?|PLATES?|NAPKINS?|TRASH|DETERGENT|DISH\w*|CASC\w*|SOAP|BLEACH|CLEANER|SPONGE\w*|BATTER(?:Y|IES)|KITCHEN|APRON|TONGS?|TRAYS?|RACK|LIBMAN|LOBBY|GIFT)\b|27GAL/i;
const FOOD = /\b(?:ORG\w*|OLIVE|OIL|VNGR|VINEGAR|DATES?|PEPSI|COKE|COLA|SODA|WATER|JUICE|COFFEE|TEA|SUGAR|SALT|FLOUR|RICE|BEANS?|NUTS?|ALMONDS?|CHEESE|BUTTER|MILK|CREAM|EGGS?|CHICKEN|CHKN|BEEF|PORK|BACON|SAUSAGE|SALMON|SHRIMP|TUNA|FISH|BREAD|PASTA|SAUCE|TOMATO\w*|ONIONS?|GARLIC|POTATO\w*|APPLES?|BANANAS?|BERR(?:Y|IES)|GRAPES?|LEMONS?|LIMES?|AVOCADO\w*|LETTUCE|SPINACH|KALE|SALAD|YOGURT|HONEY|SYRUP|CEREAL|OATS?|SPICE\w*|PEPPER|CHOC\w*|CANDY|COOKIES?|CRACKERS?|CHIPS|HUMMUS|PIZZA\s+(?:CRUST|DOUGH)|ROTISS\w*|MOZZ\w*|PARM\w*|WINE|BEER)\b/i;

/** `{ food: boolean, reason }` for one item row. */
function classify(description, ebt) {
  if (ebt) return { food: true, reason: 'ebt_eligible' };
  if (NON_FOOD.test(description)) return { food: false, reason: 'non_food_name' };
  if (FOOD.test(description)) return { food: true, reason: 'food_name' };
  return { food: false, reason: 'unrecognised' };
}

function flatten(pages) {
  const flat = Array.isArray(pages) && pages.some(Array.isArray) ? pages.flat() : pages || [];
  return flat.map((line) => String(line).replace(/\s+$/, '').trim()).filter(Boolean);
}

function isoFromUs(month, day, year) {
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (d.getUTCFullYear() !== Number(year) || d.getUTCMonth() !== Number(month) - 1 || d.getUTCDate() !== Number(day)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parse one receipt.
 * @returns {{ vendorKey, vendor, receiptId, storeNumber, purchasedAt, parseState: 'parsed'|'review_required'|'skipped',
 *   reasons: string[], items: object[], summary: {subtotalCents, taxCents, totalCents, savingsCents, itemsSold},
 *   reconciliation: {itemsCents, subtotalCents, totalCents, exact: boolean} }}
 */
function parseCostcoReceipt(pages) {
  const rows = flatten(pages);
  const reasons = [];
  const result = {
    vendorKey: VENDOR.key,
    vendor: VENDOR.name,
    receiptId: null,
    storeNumber: null,
    purchasedAt: null,
    parseState: 'skipped',
    reasons,
    items: [],
    summary: { subtotalCents: null, taxCents: null, totalCents: null, savingsCents: null, itemsSold: null },
    reconciliation: { itemsCents: 0, subtotalCents: null, totalCents: null, exact: false },
  };

  const memberAt = rows.findIndex((row) => /^Member\b/i.test(row));
  const subtotalAt = rows.findIndex((row) => /^SUBTOTAL\s/.test(row));
  if (memberAt < 0 || subtotalAt < 0 || subtotalAt <= memberAt) return result; // not a Costco receipt

  const store = rows.slice(0, memberAt).map((row) => /#\s*(\d{2,4})\s*$/.exec(row)).find(Boolean);
  result.storeNumber = store ? store[1] : null;
  const barcode = rows.slice(0, memberAt).find((row) => /^\d{18,}$/.test(row));
  const stamp = rows.map((row) => /^(\d{2})\/(\d{2})\/(\d{4})\s+\d{2}:\d{2}\b/.exec(row)).find(Boolean);
  result.purchasedAt = stamp ? isoFromUs(stamp[1], stamp[2], stamp[3]) : null;
  if (!result.purchasedAt) reasons.push('missing_date');
  const trn = rows.map((row) => /Whse:\s*(\d+)\s+Trm:\s*(\d+)\s+Trn:\s*(\d+)/.exec(row)).find(Boolean);
  result.receiptId = barcode || (trn && result.purchasedAt ? `${trn[1]}-${trn[2]}-${trn[3]}-${result.purchasedAt.replace(/-/g, '')}` : null);
  if (!result.receiptId) reasons.push('missing_receipt_id');

  // Region between the member number and the SUBTOTAL row.
  let from = memberAt + 1;
  if (/^\d{6,}$/.test(rows[from] || '')) from += 1;
  const region = rows.slice(from, subtotalAt);

  // Pass 1: classify rows; qty rows attach to the next item and are invisible to wrap adjacency.
  const typed = [];
  let pendingQty = null;
  for (const text of region) {
    const qty = QTY_RE.exec(text);
    if (qty) {
      pendingQty = { quantity: Number(qty[1]), unitPriceCents: cents(qty[2]) };
      continue;
    }
    const savings = SAVINGS_RE.exec(text);
    if (savings) {
      typed.push({ type: 'savings', refNumber: savings[2], cents: cents(savings[3]) });
      continue;
    }
    const item = ITEM_RE.exec(text);
    if (item) {
      typed.push({
        type: 'item',
        number: item[2],
        description: item[3] ? tidy(item[3]) : '',
        amountCents: cents(item[4]),
        ebt: Boolean(item[1]),
        taxable: item[5] === 'Y',
        qty: pendingQty,
      });
      pendingQty = null;
      continue;
    }
    typed.push({ type: 'text', text, used: false });
  }
  if (pendingQty) reasons.push('dangling_quantity');

  // Pass 2: join wrapped descriptions around items with an empty description.
  typed.forEach((entry, i) => {
    if (entry.type !== 'item' || entry.description) return;
    const before = typed[i - 1];
    const after = typed[i + 1];
    const parts = [];
    if (before && before.type === 'text' && !before.used) { parts.push(before.text); before.used = true; }
    if (after && after.type === 'text' && !after.used) { parts.push(after.text); after.used = true; }
    entry.description = tidy(parts.join(' '));
  });

  // Pass 3: items, with instant savings folded into the referenced item.
  const items = [];
  const savingsTotal = { cents: 0 };
  for (const entry of typed) {
    if (entry.type === 'item') {
      const index = items.length + 1;
      const quantity = entry.qty ? entry.qty.quantity : 1;
      if (entry.qty && quantity * entry.qty.unitPriceCents !== entry.amountCents) reasons.push(`quantity_mismatch:${index}`);
      if (!entry.description) reasons.push(`missing_description:${index}`);
      items.push({
        index,
        sku: entry.number,
        description: entry.description,
        ebt: entry.ebt,
        taxable: entry.taxable,
        quantity,
        amountCents: entry.amountCents,
        savingsCents: 0,
      });
    } else if (entry.type === 'savings') {
      const target = [...items].reverse().find((item) => item.sku === entry.refNumber);
      if (!target) reasons.push(`orphan_savings:${entry.refNumber}`);
      else target.savingsCents += entry.cents;
      savingsTotal.cents += entry.cents;
    }
  }

  const grab = (re) => {
    const row = rows.map((text) => re.exec(text)).find(Boolean);
    return row ? cents(row[1]) : null;
  };
  const summary = result.summary;
  summary.subtotalCents = grab(new RegExp(String.raw`^SUBTOTAL\s+${MONEY}$`));
  summary.taxCents = grab(new RegExp(String.raw`^TAX\s+${MONEY}$`));
  summary.totalCents = grab(new RegExp(String.raw`^\*+\s*TOTAL\s+${MONEY}$`));
  summary.savingsCents = grab(new RegExp(String.raw`^INSTANT SAVINGS\s+\$${MONEY}$`));
  const sold = rows.map((text) => /^TOTAL NUMBER OF ITEMS SOLD\s*=\s*(\d+)$/.exec(text)).find(Boolean);
  summary.itemsSold = sold ? Number(sold[1]) : null;

  for (const item of items) {
    const net = item.amountCents - item.savingsCents;
    const unit = net / item.quantity;
    item.lineTotalCents = net;
    item.unitPriceCents = Number.isInteger(unit) ? unit : Math.round(unit);
    item.packText = packTextFrom(item.description);
    const verdict = classify(item.description, item.ebt);
    item.kind = verdict.food ? 'merchandise' : 'non_food';
    item.classifiedBy = verdict.reason;
  }
  result.items = items;

  const itemsCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const rec = result.reconciliation;
  rec.itemsCents = itemsCents;
  rec.subtotalCents = summary.subtotalCents;
  rec.totalCents = summary.totalCents;
  if (!items.length) reasons.push('no_items');
  if (summary.subtotalCents === null || summary.totalCents === null || summary.taxCents === null) reasons.push('missing_totals');
  else {
    if (itemsCents !== summary.subtotalCents) reasons.push('subtotal_mismatch');
    if (summary.subtotalCents + summary.taxCents !== summary.totalCents) reasons.push('total_mismatch');
  }
  if (summary.itemsSold !== null && items.reduce((sum, item) => sum + item.quantity, 0) !== summary.itemsSold) reasons.push('item_count_mismatch');
  if (summary.savingsCents !== null && savingsTotal.cents !== summary.savingsCents) reasons.push('instant_savings_mismatch');
  if (summary.savingsCents === null && savingsTotal.cents > 0) reasons.push('instant_savings_unprinted');

  rec.exact = reasons.length === 0;
  result.parseState = rec.exact ? 'parsed' : 'review_required';
  return result;
}

/**
 * Catalog lines for one receipt. `includeNonFood` keeps non-food rows (default: food only).
 * @returns {{ lines: object[], excluded: { count: number, cents: number, descriptions: string[] }, noPack: number }}
 */
function toVendorLinesDetailed(receipt, { includeNonFood = false } = {}) {
  const result = { lines: [], excluded: { count: 0, cents: 0, descriptions: [] }, noPack: 0 };
  if (receipt.parseState !== 'parsed') return result;
  for (const item of receipt.items) {
    if (item.kind !== 'merchandise' && !includeNonFood) {
      result.excluded.count += 1;
      result.excluded.cents += item.lineTotalCents;
      result.excluded.descriptions.push(item.description);
      continue;
    }
    if (!item.packText) result.noPack += 1;
    result.lines.push({
      sourceKey: `${VENDOR.keyPrefix}|${receipt.receiptId}|${item.index}`,
      source: SOURCE,
      vendor: VENDOR.name,
      sku: item.sku,
      description: item.description,
      packText: item.packText, // null = explicitly no pack
      observedAt: receipt.purchasedAt,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
    });
  }
  return result;
}

module.exports = { SOURCE, VENDOR, classify, parseCostcoReceipt, toVendorLinesDetailed };
