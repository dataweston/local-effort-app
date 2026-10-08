#!/usr/bin/env node
/**
 * CPW (Co-op Partners Warehouse) weekly price lists as a PACK/UNIT REFERENCE.
 * READ-ONLY: never writes the database, never ingests purchases, never touches Gmail
 * beyond list/get/attachments.get. The output is a mapping-file proposal for
 * `node scripts/food-ops.cjs apply-mapping --data <file>` (review it, then apply there).
 *
 *   node scripts/food-ops-cpw-units.cjs [--source cache|gmail] [--dir .tmp/cpw]
 *                                       [--out .tmp/mapping/units-cpw-mapping.json]
 *                                       [--hints <mapping.json>[,<mapping.json>...]]
 *
 *   --source cache  (default when <dir> already holds CSVs) read the saved CSVs.
 *   --source gmail  list "CPW Price List" mails with a CSV attachment through the repo's
 *                   authorized Gmail client and save each CSV to <dir> (the non-PII catalog
 *                   cache; file name = send date + message id + attachment name), then read them.
 *   --hints         mapping proposals whose review questions carry "(suggested stock key: k)"
 *                   (default: every .tmp/mapping/*.json except the output).
 *
 * Targets: every VendorItem with status `unmapped` and no pack size, any vendor. Matching is
 * conservative (UPC equality, or brand + product tokens + size agreement; see cpwCatalog.js).
 * Retail receipts are per-each, so the proposed pack is the single unit ("12/16 OZ" -> 16 oz),
 * never the case. Matches become mappings only when a stock key is already suggested for the
 * item and its dimension fits; everything else (ambiguous sizes, no stock key) goes to `review`
 * with the candidates listed. The printed report counts matched / ambiguous / no match and the
 * spend covered. Output carries no e-mail text and no PII.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { buildCatalog, indexCatalog, matchVendorItem, parseCpwCsv } = require('../backend/api/foodOps/cpwCatalog');
const { normalizeText, parsePackText } = require('../backend/api/foodOps/units');

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const ROOT = path.resolve(__dirname, '..');
const DIR = path.resolve(ROOT, value('--dir') || '.tmp/cpw');
const OUT = path.resolve(ROOT, value('--out') || '.tmp/mapping/units-cpw-mapping.json');
const MAPPING_DIR = path.join(ROOT, '.tmp', 'mapping');

const csvFiles = () => (fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((name) => /\.csv$/i.test(name)).sort() : []);

function sanitize(name) {
  return String(name).replace(/[^A-Za-z0-9._-]+/g, '_');
}

function sendDate(headerMap) {
  const raw = (headerMap.date || headerMap.Date || '').replace(/:$/, '');
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? 'unknown' : date.toISOString().slice(0, 10);
}

/** Save every CSV attachment of the CPW price-list mails to DIR. List/get/attachments.get only. */
async function fetchFromGmail() {
  const { getAuthorizedGmailClient } = require('../backend/api/brain/gmailSync.js');
  const { parseGmailFullMessage } = require('../backend/api/brain/gmailMime.js');
  const gmail = await getAuthorizedGmailClient();
  fs.mkdirSync(DIR, { recursive: true });
  const ids = [];
  let pageToken;
  do {
    const page = await gmail.users.messages.list({ userId: 'me', q: 'subject:"CPW Price List" has:attachment filename:csv', maxResults: 100, pageToken });
    for (const message of page.data.messages || []) ids.push(message.id);
    pageToken = page.data.nextPageToken;
  } while (pageToken);
  let saved = 0;
  for (const id of ids) {
    const full = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
    const parsed = parseGmailFullMessage(full.data);
    const stamp = sendDate(parsed.headerMap);
    for (const attachment of parsed.attachments) {
      if (!/\.csv$/i.test(attachment.filename || '')) continue;
      const target = path.join(DIR, `${stamp}_${id.slice(-6)}_${sanitize(attachment.filename)}`);
      if (fs.existsSync(target)) continue;
      const body = await gmail.users.messages.attachments.get({ userId: 'me', messageId: id, id: attachment.attachmentId });
      fs.writeFileSync(target, Buffer.from(body.data.data, 'base64url'));
      saved += 1;
    }
  }
  return { messages: ids.length, saved };
}

function loadCatalog() {
  const lists = [];
  for (const name of csvFiles()) {
    const observedAt = /^(\d{4}-\d{2}-\d{2})_/.exec(name)?.[1] || null;
    lists.push({ observedAt, file: name, rows: parseCpwCsv(fs.readFileSync(path.join(DIR, name), 'utf8'), { observedAt, file: name }) });
  }
  return { lists, entries: buildCatalog(lists) };
}

/** Suggested stock keys and not-yet-applied stock products from earlier mapping proposals. */
function readProposals() {
  const requested = value('--hints');
  const files = requested
    ? requested.split(',').map((file) => path.resolve(ROOT, file.trim()))
    : fs.existsSync(MAPPING_DIR)
      ? fs.readdirSync(MAPPING_DIR).filter((name) => name.endsWith('.json')).map((name) => path.join(MAPPING_DIR, name))
      : [];
  const hints = new Map();
  const stockProducts = new Map();
  for (const file of files) {
    if (path.resolve(file) === OUT) continue;
    let data;
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
    for (const stock of data.stockProducts || []) stockProducts.set(stock.key, stock);
    for (const row of data.review || []) {
      const hint = /suggested stock key:\s*([a-z0-9][a-z0-9-]*)/i.exec(row.question || '');
      if (hint && !hints.has(row.identityKey)) hints.set(row.identityKey, hint[1]);
    }
  }
  return { hints, stockProducts };
}

async function loadDatabase() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    // Explicit columns via raw SQL: independent of Prisma-client/schema drift on pending migrations.
    const items = await prisma.$queryRawUnsafe(`
      SELECT v."identityKey", v."vendorKey", v.description, v."lastPackCostCents",
             COALESCE((SELECT SUM(o."lineTotalCents") FROM "CostObservation" o WHERE o."vendorItemId" = v.id), 0) AS spend
      FROM "VendorItem" v
      WHERE v.status = 'unmapped' AND v."packBaseQuantity" IS NULL
      ORDER BY spend DESC`);
    const stock = await prisma.$queryRawUnsafe('SELECT key, name, aliases, dimension, "densityGPerMl" FROM "StockProduct"');
    return {
      items: items.map((row) => ({ ...row, spend: Number(row.spend), lastPackCostCents: row.lastPackCostCents === null ? null : Number(row.lastPackCostCents) })),
      stock: new Map(stock.map((row) => [row.key, { dimension: row.dimension, density: row.densityGPerMl === null ? null : Number(row.densityGPerMl), names: [row.name, row.key.replace(/-/g, ' '), ...(row.aliases || [])] }])),
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Generic stock products for UPC-matched items whose stock key does not exist anywhere yet.
 * Only a few plain commodities; `pattern` is tested against the item description.
 */
const GENERIC_STOCK = [
  { pattern: /^(?:organic )?(?:heavy )?whipping cream$/i, key: 'heavy-cream', name: 'Heavy cream', dimension: 'volume', densityGPerMl: 0.994, aliases: ['heavy whipping cream', 'whipping cream', 'heavy cream'] },
  { pattern: /^light cream$/i, key: 'light-cream', name: 'Light cream', dimension: 'volume', densityGPerMl: 1.0, aliases: ['light cream', 'coffee cream'] },
  { pattern: /^butter salted$/i, key: 'butter-salted', name: 'Butter, salted', dimension: 'mass', aliases: ['salted butter', 'butter salted'] },
  { pattern: /^soft tofu$/i, key: 'tofu-soft', name: 'Tofu, soft', dimension: 'mass', aliases: ['soft tofu', 'silken tofu'] },
  { pattern: /^baby arugula$/i, key: 'baby-arugula', name: 'Baby arugula', dimension: 'mass', aliases: ['baby arugula', 'arugula'] },
  { pattern: /tostadas?$/i, key: 'corn-tostadas', name: 'Corn tostadas', dimension: 'mass', aliases: ['tostadas', 'corn tostadas'] },
  { pattern: /^pizza crust$/i, key: 'pizza-crust', name: 'Pizza crust', dimension: 'count', aliases: ['pizza crust', 'pizza crusts'] },
  { pattern: /^stone ?ground deli mustard$|^stonegroud deli mustard$/i, key: 'mustard-stoneground', name: 'Mustard, stoneground', dimension: 'mass', aliases: ['stoneground mustard', 'deli mustard'] },
  { pattern: /^romaine (?:twins|hearts)(?: organic)?$/i, key: 'romaine-lettuce' },
];

const usd = (cents) => Math.round(cents) / 100;

function describeCandidate(candidate) {
  const name = [candidate.brand, candidate.name].filter(Boolean).join(' ');
  return `#${candidate.proNumber || '?'} ${name} (${candidate.caseText || 'no size'}${candidate.packText ? ` -> ${candidate.packText}` : ''})`;
}

function dimensionFits(stock, dimension) {
  if (!stock) return false;
  if (stock.dimension === dimension) return true;
  return (stock.density || stock.densityGPerMl) > 0 && stock.dimension !== 'count' && dimension !== 'count';
}

async function main() {
  let fetched = null;
  const source = value('--source') || (csvFiles().length ? 'cache' : 'gmail');
  if (source === 'gmail') fetched = await fetchFromGmail();
  else if (source !== 'cache') throw new Error(`--source must be cache or gmail (got ${source})`);

  const { lists, entries } = loadCatalog();
  if (!entries.length) throw new Error(`no CPW rows parsed from ${DIR}`);
  const index = indexCatalog(entries);
  const { hints, stockProducts } = readProposals();
  const database = await loadDatabase();
  // A stock key is only inferred from the item text when exactly one stock product carries that exact name/alias.
  const byName = new Map();
  const claim = (name, key) => {
    const norm = normalizeText(name);
    if (!norm) return;
    if (!byName.has(norm)) byName.set(norm, new Set());
    byName.get(norm).add(key);
  };
  for (const [key, row] of database.stock) row.names.forEach((name) => claim(name, key));
  for (const stock of stockProducts.values()) [stock.name, stock.key.replace(/-/g, ' '), ...(stock.aliases || [])].forEach((name) => claim(name, stock.key));
  const inferKey = (description) => {
    const keys = byName.get(normalizeText(description));
    return keys && keys.size === 1 ? [...keys][0] : null;
  };
  const declared = new Map();
  const stockDimension = (key) => database.stock.get(key) || (stockProducts.get(key) ? { dimension: stockProducts.get(key).dimension, density: stockProducts.get(key).densityGPerMl || null } : null);

  const mappings = [];
  const review = [];
  const stats = {};
  const bump = (group, vendor, spend) => {
    const bucket = (stats[group] = stats[group] || { items: 0, spendCents: 0, byVendor: {} });
    bucket.items += 1;
    bucket.spendCents += spend;
    const per = (bucket.byVendor[vendor] = bucket.byVendor[vendor] || { items: 0, spendCents: 0 });
    per.items += 1;
    per.spendCents += spend;
  };

  for (const item of database.items) {
    const result = matchVendorItem(item, index);
    if (result.status === 'none') { bump('noMatch', item.vendorKey, item.spend); continue; }
    if (result.status === 'ambiguous') {
      bump('ambiguous', item.vendorKey, item.spend);
      const options = result.candidates.slice(0, 4).map(describeCandidate).join('; ');
      review.push({ identityKey: item.identityKey, description: item.description, question: `CPW candidates: ${options}. ${result.reason}. Which size is this?` });
      continue;
    }
    const generic = GENERIC_STOCK.find((entry) => entry.pattern.test(item.description.trim()));
    let hint = hints.get(item.identityKey) || inferKey(item.description) || (generic ? generic.key : null);
    if (hint && !stockDimension(hint) && generic && generic.name) {
      declared.set(generic.key, { key: generic.key, name: generic.name, kind: 'raw', dimension: generic.dimension, ...(generic.densityGPerMl ? { densityGPerMl: generic.densityGPerMl } : {}), aliases: generic.aliases, notes: 'Generic stock product proposed from CPW unit matching.' });
      hint = generic.key;
    }
    const stock = hint ? stockDimension(hint) || declared.get(hint) || null : null;
    let packText = result.packText;
    let confidence = result.confidence;
    let fluidNote = '';
    // CPW prints liquid cases in OZ ("6/32 OZ" is a quart). A volume stock product with an OZ pack is fluid ounces.
    if (stock && stock.dimension === 'volume' && result.dimension === 'mass' && /(?:^|\s)oz$/.test(result.packText)) {
      packText = result.packText.replace(/ oz$/, ' fl oz');
      confidence = 'medium';
      fluidNote = '; CPW lists liquids in OZ, read as fl oz for a volume stock product';
    }
    const matchedDimension = packText.endsWith('fl oz') ? 'volume' : result.dimension;
    const [top] = result.candidates;
    const evidence = `CPW price list ${describeCandidate(top)}, matched by ${result.via === 'upc' ? 'UPC' : 'brand + product name'}; the retail unit is the single unit, not the case`;
    if (hint && dimensionFits(stock, matchedDimension)) {
      bump('matched', item.vendorKey, item.spend);
      if (!database.stock.has(hint) && !declared.has(hint) && stockProducts.has(hint)) declared.set(hint, stockProducts.get(hint));
      mappings.push({ identityKey: item.identityKey, stockKey: hint, packText, confidence, why: evidence + fluidNote });
    } else {
      bump('matchedNeedsStockKey', item.vendorKey, item.spend);
      const why = !hint ? 'no stock key is suggested yet' : `stock key ${hint} is ${stock ? stock.dimension : 'unknown'} but the pack is ${result.dimension}`;
      review.push({ identityKey: item.identityKey, description: item.description, question: `${evidence}; pack ${packText} (${confidence}). ${why}: which stock product?` });
    }
  }

  for (const row of mappings) if (!parsePackText(row.packText)) throw new Error(`unparseable pack ${row.packText} for ${row.identityKey}`);
  const total = database.items.length;
  const totalSpend = database.items.reduce((sum, item) => sum + item.spend, 0);
  const proposal = {
    stockProducts: [...declared.values()],
    mappings,
    ignore: [],
    review,
    stats: {
      source: 'CPW weekly price lists (pack/unit reference only; not purchases)',
      catalog: { files: lists.length, products: entries.length },
      targets: total,
    },
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(proposal, null, 1)}\n`);

  const money = (group) => (stats[group] ? { items: stats[group].items, spend: usd(stats[group].spendCents), byVendor: Object.fromEntries(Object.entries(stats[group].byVendor).map(([vendor, row]) => [vendor, { items: row.items, spend: usd(row.spendCents) }])) } : { items: 0, spend: 0, byVendor: {} });
  console.log(JSON.stringify({
    fetched,
    catalog: { files: lists.length, products: entries.length, withUpc: entries.filter((entry) => entry.upc).length },
    targets: { items: total, spend: usd(totalSpend) },
    mappedToStockWithPack: money('matched'),
    matchedButNeedsStockKey: money('matchedNeedsStockKey'),
    ambiguous: money('ambiguous'),
    noMatch: money('noMatch'),
    wrote: path.relative(ROOT, OUT),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
