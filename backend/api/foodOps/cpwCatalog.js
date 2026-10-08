'use strict';

/**
 * Co-op Partners Warehouse (CPW) price-list catalog, used ONLY as a pack/unit
 * reference. Nothing here produces purchases or cost observations: the weekly
 * lists are list prices, not what we paid. The value is the product identity
 * (brand, UPC, description) and the case pack ("12/16 OZ"), from which the
 * single-unit size a retail receipt sells ("16 oz") is derived.
 *
 * Pure functions only: Gmail/DB/file access lives in scripts/food-ops-cpw-units.cjs.
 */

const { UNITS, normalizeText, normalizeUnit, parsePackText } = require('./units');

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** RFC 4180 reader: quoted fields, doubled quotes, embedded newlines, BOM, CRLF. */
function parseCsv(text) {
  const input = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ---------------------------------------------------------------------------
// Identifiers and sizes
// ---------------------------------------------------------------------------

/** Comparable UPC key: digits only, leading zeros dropped, so 011... and 11... agree. */
function upcKey(raw) {
  const digits = String(raw === null || raw === undefined ? '' : raw).replace(/\D/g, '').replace(/^0+/, '');
  return digits.length >= 8 ? digits : null;
}

const SIZE_UNIT_TEXT = { ct: 'ct', each: 'ct', floz: 'fl oz' };

function packTextOf(quantity, unit) {
  const rounded = Number(Number(quantity).toFixed(4));
  return `${rounded} ${SIZE_UNIT_TEXT[unit] || unit}`;
}

function sizeUnit(raw) {
  const token = String(raw || '').trim().toLowerCase().replace(/\.+$/, '');
  if (token === 'o') return 'oz'; // the list truncates "3.2 OZ" to "3.2 O" in a narrow column
  if (/^fl\.?\s*oz$/.test(token)) return 'floz';
  if (token === 'lt') return 'l';
  return normalizeUnit(token);
}

/**
 * Split a CPW COUNT/SIZE cell.
 *   "12/16 OZ"   -> case of 12, single unit 16 oz
 *   "28 LB"      -> case of 1, single unit 28 lb
 *   "90-100 CT"  -> ranged (produce by count): no single-unit size
 *   "12/4/3.2 O" -> nested pack (12 x 4 x 3.2 oz): the retail each is ambiguous
 *   "KEG RECYCL" -> not a size
 * Retail receipts are per-each, so `packText` is the single unit, never the case.
 */
function parseCountSize(raw) {
  const text = String(raw === null || raw === undefined ? '' : raw).trim().replace(/\s+/g, ' ');
  const empty = { caseText: text, caseCount: null, unitQuantity: null, unit: null, dimension: null, packText: null, baseQuantity: null, ranged: false, nested: false };
  if (!text) return empty;
  if (/^\d+\s*-\s*\d+\s*(?:ct|count)?$/i.test(text) || /^\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\s*[a-z#]+$/i.test(text)) return { ...empty, ranged: true };
  const nested = /^(\d+)\s*\/\s*(\d+)\s*\/\s*(\d*\.?\d+)\s*([a-z#.]+(?:\s?oz)?)$/i.exec(text);
  if (nested) return { ...empty, caseCount: Number(nested[1]), nested: true };
  const match = /^(?:(\d+)\s*\/\s*)?(\d*\.?\d+)\s*(fl\.?\s*oz\.?|[a-z#]+\.?)$/i.exec(text);
  if (!match) return empty;
  const unit = sizeUnit(match[3]);
  const quantity = Number(match[2]);
  if (!unit || !(quantity > 0)) return empty;
  const [dimension, factor] = UNITS[unit];
  return {
    caseText: text,
    caseCount: match[1] === undefined ? 1 : Number(match[1]),
    unitQuantity: quantity,
    unit,
    dimension,
    packText: packTextOf(quantity, unit),
    baseQuantity: quantity * factor,
    ranged: false,
    nested: false,
  };
}

function parseMoneyCents(raw) {
  const cleaned = String(raw === null || raw === undefined ? '' : raw).replace(/[$,\s]/g, '');
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return cents > 0 ? cents : null;
}

// ---------------------------------------------------------------------------
// List files
// ---------------------------------------------------------------------------

function cell(value) {
  return String(value === null || value === undefined ? '' : value).replace(/\s+/g, ' ').trim();
}

function headerColumns(row) {
  const labels = row.map((value) => cell(value).toUpperCase());
  const find = (pattern, from = 0) => {
    for (let i = from; i < labels.length; i += 1) if (pattern.test(labels[i])) return i;
    return -1;
  };
  const pro = find(/^PRO(?:DUCT)? ?#$/);
  const size = find(/^COUNT\/SIZE$/);
  if (pro < 0 || size < 0) return null;
  return {
    pro,
    size,
    description: find(/^(?:PRODUCT )?DESCRIPTION$/),
    variety: find(/^MARK\/VARIETY$/),
    brand: find(/^BRAND$/),
    origin: find(/^ORIGIN$/),
    price: find(/^PRICE$/),
    upc: find(/^(?:SKU\/)?UPC$/),
    cat: find(/^CAT$/),
  };
}

/**
 * Read one CPW price-list or UPC-list CSV. Layouts differ across the 2023-24
 * sends (header row position, separate Mark/variety column, UPC column, price
 * formatted "$1.00" or "1"), so the header row is found by its labels and
 * re-detected whenever it repeats.
 */
function parseCpwCsv(text, { observedAt = null, file = null } = {}) {
  const rows = [];
  let columns = null;
  let category = null;
  for (const raw of parseCsv(text)) {
    const header = headerColumns(raw);
    if (header) { columns = header; continue; }
    if (!columns) continue;
    const cells = raw.map(cell);
    const pro = cells[columns.pro] || '';
    if (!/^\d{3,6}$/.test(pro)) {
      const filled = cells.filter(Boolean);
      if (filled.length === 1 && !/^(PRODUCE|GROCERY|DAIRY|FROZEN)$/i.test(filled[0])) category = filled[0];
      continue;
    }
    const pick = (index) => (index >= 0 ? cells[index] || null : null);
    const description = pick(columns.description);
    if (!description) continue;
    const size = parseCountSize(pick(columns.size));
    rows.push({
      proNumber: pro,
      category: pick(columns.cat) || category,
      description,
      variety: pick(columns.variety),
      brand: pick(columns.brand),
      upc: upcKey(pick(columns.upc)),
      origin: pick(columns.origin),
      size,
      priceCents: parseMoneyCents(pick(columns.price)),
      observedAt,
      file,
    });
  }
  return rows;
}

function entryKey(row) {
  if (row.proNumber) return `pro:${row.proNumber}`;
  if (row.upc) return `upc:${row.upc}`;
  return `name:${normalizeText([row.brand, row.description, row.variety].filter(Boolean).join(' '))}|${row.size.caseText}`;
}

/**
 * Collapse many weekly lists into one entry per CPW product number, keeping the
 * newest row and filling its blanks (UPC, brand, size) from older sightings.
 * `lists` = [{ observedAt: 'YYYY-MM-DD', rows }] in any order.
 */
function buildCatalog(lists) {
  const ordered = [...lists].sort((a, b) => String(a.observedAt || '').localeCompare(String(b.observedAt || '')));
  const entries = new Map();
  for (const list of ordered) {
    for (const row of list.rows) {
      const key = entryKey(row);
      const prior = entries.get(key);
      if (!prior) {
        entries.set(key, { ...row, key, firstSeen: list.observedAt || null, lastSeen: list.observedAt || null, listings: 1 });
        continue;
      }
      const next = { ...prior, listings: prior.listings + 1, lastSeen: list.observedAt || prior.lastSeen };
      for (const field of ['category', 'description', 'variety', 'brand', 'upc', 'origin', 'priceCents', 'file']) {
        if (row[field] !== null && row[field] !== undefined && row[field] !== '') next[field] = row[field];
      }
      next.size = row.size && row.size.packText ? row.size : prior.size.packText ? prior.size : row.size;
      entries.set(key, next);
    }
  }
  return [...entries.values()];
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

// CPW list abbreviations (descriptions are cut at ~20 characters) -> plain words.
const ABBREVIATIONS = {
  wht: 'white', whl: 'whole', choc: 'chocolate', strawb: 'strawberry', blueb: 'blueberry', rstd: 'roasted', unsltd: 'unsalted',
  unslt: 'unsalted', sltd: 'salted', qrtd: 'quartered', frzn: 'frozen', grn: 'green', blk: 'black', xtra: 'extra', vrgn: 'virgin',
  tradtnl: 'traditional', reg: 'regular', med: 'medium', sm: 'small', lg: 'large', lrg: 'large', orig: 'original', van: 'vanilla',
  pnut: 'peanut', btr: 'butter', chs: 'cheese', chd: 'cheddar', mozz: 'mozzarella', ygrt: 'yogurt', yog: 'yogurt', nf: 'nonfat',
  lf: 'lowfat', evoo: 'extra virgin olive oil', ev: 'extra virgin', ww: 'whole wheat', ap: 'all purpose', bbq: 'barbecue',
  mac: 'macaroni', whip: 'whipping', crm: 'cream', chz: 'cheese', xl: 'extra large', lrge: 'large', pkgd: '', og: '', cv: '', org: '', organic: '', ea: '', pk: '',
};

const NOISE = new Set(['the', 'and', 'of', 'in', 'with', 'w', 'a', 'an', 'for', 'to', 's', 'that', 'brand', 'new', 'fresh']);
const BRAND_WEAK = new Set(['co', 'coop', 'cooperative', 'farm', 'farms', 'foods', 'food', 'company', 'inc', 'llc', 'kitchen', 'natural', 'naturals', 'organic', 'organics', 'creamery', 'dairy', 'brewing', 'the', 'and', 'of', 'bros', 'brothers']);
const SIZE_WORDS = new Set(['oz', 'lb', 'lbs', 'ct', 'count', 'pk', 'pack', 'g', 'kg', 'ml', 'l', 'gal', 'qt', 'pt', 'fl', 'ea', 'each', 'pc', 'pcs']);

function singular(token) {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

/** Plain-word tokens: abbreviations expanded, noise/size words/numbers dropped, singularised. */
function nameTokens(...parts) {
  const out = [];
  for (const word of normalizeText(parts.filter(Boolean).join(' ')).split(' ')) {
    if (!word) continue;
    const expanded = Object.prototype.hasOwnProperty.call(ABBREVIATIONS, word) ? ABBREVIATIONS[word] : word;
    for (const piece of expanded.split(' ')) {
      if (!piece || NOISE.has(piece) || SIZE_WORDS.has(piece) || /^\d+$/.test(piece)) continue;
      out.push(singular(piece));
    }
  }
  return out;
}

/** Remove the size ("16 oz", "12/8 oz") from free text so it does not count as a name token. */
function stripSize(text) {
  const size = parsePackText(text);
  if (!size) return { size: null, text: String(text || '') };
  return { size, text: String(text).replace(size.text, ' ') };
}

function tokenMatches(token, set, list) {
  if (set.has(token)) return true;
  // Descriptions are truncated at ~20 chars: "TRADTNL", "ROBUST TAST".
  if (token.length >= 4) for (const other of list) if (other.length > token.length && other.startsWith(token)) return true;
  return false;
}

function brandTokens(brand) {
  return nameTokens(brand).filter((token) => !BRAND_WEAK.has(token));
}

function sameSize(a, b) {
  if (!a || !b || a.dimension !== b.dimension) return false;
  const left = a.baseQuantity;
  const right = b.baseQuantity;
  return Math.abs(left - right) / Math.max(left, right) <= 0.03;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function indexCatalog(entries) {
  const byUpc = new Map();
  const byBrandToken = new Map();
  const prepared = entries.map((entry) => {
    const product = nameTokens(entry.variety || entry.description);
    const category = entry.variety ? nameTokens(entry.description) : [];
    const brand = brandTokens(entry.brand);
    const prep = { entry, product, category, brand };
    if (entry.upc) {
      if (!byUpc.has(entry.upc)) byUpc.set(entry.upc, []);
      byUpc.get(entry.upc).push(prep);
    }
    for (const token of brand) {
      if (!byBrandToken.has(token)) byBrandToken.set(token, []);
      byBrandToken.get(token).push(prep);
    }
    return prep;
  });
  return { prepared, byUpc, byBrandToken };
}

function targetUpc(identityKey) {
  const sku = /\|sku:(\d{8,14})$/.exec(String(identityKey || ''));
  return sku ? upcKey(sku[1]) : null;
}

function coverage(tokens, other) {
  if (!tokens.length) return 1;
  const set = new Set(other);
  const hit = tokens.filter((token) => tokenMatches(token, set, other)).length;
  return hit / tokens.length;
}

function candidateView(prep, why) {
  const { entry } = prep;
  return {
    proNumber: entry.proNumber,
    brand: entry.brand,
    name: [entry.description, entry.variety].filter(Boolean).join(' / '),
    upc: entry.upc,
    caseText: entry.size.caseText,
    packText: entry.size.packText,
    priceCents: entry.priceCents,
    lastSeen: entry.lastSeen,
    via: why,
  };
}

function groupBySize(preps) {
  const groups = [];
  for (const prep of preps) {
    const { size } = prep.entry;
    const unitless = !size.packText;
    const group = groups.find((g) => (unitless ? g.size === null : g.size && sameSize(g.size, size)));
    if (group) group.preps.push(prep);
    else groups.push({ size: unitless ? null : size, preps: [prep] });
  }
  return groups;
}

const PRICE_RATIO = [0.6, 6];

function priceRatio(item, entry) {
  const unitCost = entry.priceCents && entry.size.caseCount ? entry.priceCents / entry.size.caseCount : null;
  const paid = Number(item.lastPackCostCents);
  if (!unitCost || !(paid > 0)) return null;
  return paid / unitCost;
}

/**
 * Match one unmapped vendor item to the CPW catalog.
 *   item: { identityKey, description, packText?, lastPackCostCents? }
 * Returns { status: 'matched'|'ambiguous'|'none', via, confidence, packText, candidates, reason }.
 *   - UPC equality is the primary key (a retail SKU that is a UPC).
 *   - Otherwise brand tokens + product tokens must agree both ways, and any size
 *     printed in the item description must equal the CPW unit size.
 *   - Candidates that disagree on unit size, a conflicting UPC/name pair, an
 *     implausible price, or a nested/ranged CPW pack stay `ambiguous`.
 */
function matchVendorItem(item, index) {
  const { text: bare, size: ownSize } = stripSize(item.description);
  const tokens = nameTokens(bare);
  const upc = targetUpc(item.identityKey);

  let via = null;
  let pool = [];
  if (upc && index.byUpc.has(upc)) {
    via = 'upc';
    pool = index.byUpc.get(upc);
  } else {
    const seen = new Set();
    for (const token of tokens) {
      for (const prep of index.byBrandToken.get(token) || []) seen.add(prep);
    }
    for (const prep of seen) {
      if (coverage(prep.brand, tokens) < (prep.brand.length >= 3 ? 0.66 : 1)) continue;
      const own = [...prep.product, ...prep.brand];
      if (!prep.product.length) continue;
      const forward = coverage(prep.product, tokens);
      const backward = coverage(tokens.filter((token) => !prep.brand.includes(token)), own);
      const need = prep.product.length <= 2 ? 1 : 0.75;
      if (forward >= need && backward >= 0.75) pool.push(prep);
    }
    via = 'text';
  }
  if (!pool.length) return { status: 'none', via: null, confidence: null, packText: null, candidates: [], reason: 'no CPW product shares the UPC or brand+name' };

  if (via === 'upc') {
    // A UPC hit whose names share nothing is a stale or reused code, not a match.
    const conflicting = pool.filter((prep) => !tokens.length || (coverage(tokens, [...prep.product, ...prep.category, ...prep.brand]) < 0.34 && coverage(prep.product, tokens) < 0.34));
    if (conflicting.length === pool.length) {
      return { status: 'ambiguous', via, confidence: null, packText: null, candidates: pool.map((prep) => candidateView(prep, via)), reason: 'UPC matches a CPW product with a different name' };
    }
    pool = pool.filter((prep) => !conflicting.includes(prep));
  }

  let candidates = pool;
  if (ownSize) {
    const agreeing = pool.filter((prep) => prep.entry.size.packText && sameSize(prep.entry.size, ownSize));
    if (!agreeing.length) {
      return { status: 'ambiguous', via, confidence: null, packText: null, candidates: pool.map((prep) => candidateView(prep, via)), reason: `item names ${ownSize.text} but no CPW size agrees` };
    }
    candidates = agreeing;
  }

  const views = candidates.map((prep) => candidateView(prep, via));
  const groups = groupBySize(candidates);
  if (groups.length > 1) {
    return { status: 'ambiguous', via, confidence: null, packText: null, candidates: views, reason: 'CPW lists this product in different sizes' };
  }
  const [group] = groups;
  if (!group.size) {
    const nested = candidates.some((prep) => prep.entry.size.nested);
    return { status: 'ambiguous', via, confidence: null, packText: null, candidates: views, reason: nested ? 'CPW case is a nested pack (case/inner/each); the each size is not stated' : 'CPW size is a count range or free text, not a single-unit size' };
  }

  const newest = [...group.preps].sort((a, b) => String(b.entry.lastSeen || '').localeCompare(String(a.entry.lastSeen || '')))[0];
  const ratio = priceRatio(item, newest.entry);
  if (ratio !== null && (ratio < PRICE_RATIO[0] || ratio > PRICE_RATIO[1])) {
    return { status: 'ambiguous', via, confidence: null, packText: null, candidates: views, reason: `paid price is ${ratio.toFixed(1)}x the CPW unit price (implausible for the same size)` };
  }
  return {
    status: 'matched',
    via,
    confidence: via === 'upc' ? 'high' : 'medium',
    packText: group.size.packText,
    dimension: group.size.dimension,
    caseText: newest.entry.size.caseText,
    candidates: views,
    reason: null,
  };
}

module.exports = {
  buildCatalog,
  indexCatalog,
  matchVendorItem,
  nameTokens,
  parseCountSize,
  parseCpwCsv,
  parseCsv,
  upcKey,
};
