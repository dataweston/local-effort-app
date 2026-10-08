#!/usr/bin/env node
/**
 * Wholesale / direct vendor order e-mails -> food-ops `vendor_invoice` cost observations.
 * DRY RUN until --apply. Prints a JSON report (no e-mail text, no PII: only vendor names,
 * order numbers, dates, counts and reason codes).
 *
 *   node scripts/food-ops-vendor-orders.cjs [--vendor <key|all>] [--source gmail | --dir <folder>]
 *                                           [--offline] [--out <candidate-lines.json>] [--apply]
 *
 *   --vendor <key|all>  one of the keys in backend/api/foodOps/vendorInvoices/htmlOrders.js
 *                       (meadowlark, olive_oil_lovers, chocolate_alchemy, verns_cheese,
 *                       smoking_goose, browne_trading, good_acre, alemar). Default: all.
 *   --source gmail      (default) reads Gmail with the repo's own authorized client:
 *                       users.messages.list (per-vendor q, `in:anywhere`) and
 *                       users.messages.get format=full. List/get only; nothing is modified,
 *                       sent or labelled.
 *   --dir <folder>      parses saved messages instead: `<folder>/<vendor key>/*` when the folder
 *                       has vendor sub-folders, else `<folder>/*` for the single --vendor.
 *                       Files: `.html`/`.htm` (id = file name), `.txt`, or `.json`
 *                       ({ id, html, text, date, subject }).
 *   --offline           plan against an empty catalog without connecting to the database
 *                       (the Gmail source still talks to Gmail). Cannot be combined with --apply.
 *   --out <file>        writes the candidate vendor lines as JSON.
 *   --apply             writes the plan with catalog.applyPlan. Refused when the plan has errors.
 *                       review_required documents emit no lines and are listed in the report.
 *
 * Every document must reconcile to the cent (lines + shipping + tax - discounts == total),
 * otherwise it emits nothing and is listed under `reviewRequired` with reason codes.
 * New vendor items arrive unmapped; mapping stays a human decision.
 * Browne Trading prices are the discount-adjusted prices actually paid.
 * The Good Acre rows come from order CONFIRMATIONS ("not a final invoice"); its PDF invoices
 * are a separate source.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const catalog = require('../backend/api/foodOps/catalog');
const { VENDORS, parseOrderEmail, toVendorLinesDetailed } = require('../backend/api/foodOps/vendorInvoices/htmlOrders');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

let prismaInstance = null;
function prisma() {
  if (!prismaInstance) {
    const { PrismaClient } = require('@prisma/client');
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

function selectedVendorKeys() {
  const requested = value('--vendor') || 'all';
  if (requested === 'all') return Object.keys(VENDORS);
  const keys = requested.split(',').map((key) => key.trim()).filter(Boolean);
  for (const key of keys) if (!VENDORS[key]) throw new Error(`unknown --vendor "${key}" (use ${Object.keys(VENDORS).join(', ')}, or all)`);
  return keys;
}

async function loadFromGmail(vendorKeys) {
  const { getAuthorizedGmailClient } = require('../backend/api/brain/gmailSync.js');
  const { parseGmailFullMessage } = require('../backend/api/brain/gmailMime.js');
  const gmail = await getAuthorizedGmailClient();
  const byVendor = {};
  for (const vendorKey of vendorKeys) {
    const ids = new Set();
    let pageToken;
    do {
      const page = await gmail.users.messages.list({
        userId: 'me',
        q: `${VENDORS[vendorKey].gmailQuery} in:anywhere`,
        maxResults: 100,
        ...(pageToken ? { pageToken } : {}),
      });
      for (const stub of page.data.messages || []) ids.add(stub.id);
      pageToken = page.data.nextPageToken;
    } while (pageToken);
    const inputs = [];
    for (const messageId of ids) {
      const full = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
      const message = parseGmailFullMessage(full.data);
      inputs.push({
        messageId,
        html: message.htmlContent || '',
        text: message.textContent || '',
        date: (message.headerMap && message.headerMap.date) || (full.data.internalDate ? new Date(Number(full.data.internalDate)) : null),
      });
    }
    byVendor[vendorKey] = inputs;
  }
  return byVendor;
}

function readSaved(file) {
  const id = path.basename(file, path.extname(file));
  const body = fs.readFileSync(file, 'utf8');
  if (/\.json$/i.test(file)) {
    const json = JSON.parse(body);
    return { messageId: json.id || id, html: json.html || '', text: json.text || '', date: json.date || null };
  }
  return /\.txt$/i.test(file) ? { messageId: id, html: '', text: body, date: null } : { messageId: id, html: body, text: '', date: null };
}

function loadFromDir(dir, vendorKeys) {
  const byVendor = {};
  for (const vendorKey of vendorKeys) {
    const sub = path.join(dir, vendorKey);
    const folder = fs.existsSync(sub) && fs.statSync(sub).isDirectory() ? sub : vendorKeys.length === 1 ? dir : null;
    byVendor[vendorKey] = [];
    if (!folder) continue;
    const seen = new Set();
    for (const name of fs.readdirSync(folder).sort()) {
      if (!/\.(?:html?|txt|json)$/i.test(name)) continue;
      const input = readSaved(path.join(folder, name));
      if (seen.has(input.messageId)) continue;
      seen.add(input.messageId);
      byVendor[vendorKey].push(input);
    }
  }
  return byVendor;
}

function bump(map, key, by = 1) {
  map[key] = (map[key] || 0) + by;
}

function buildVendorReport(vendorKey, inputs) {
  const meta = VENDORS[vendorKey];
  const report = {
    vendor: meta.name,
    gmailQuery: meta.gmailQuery,
    priceBasis: meta.priceBasis,
    documentsFound: inputs.length,
    notOrderConfirmation: 0,
    refunds: 0,
    cancelled: 0,
    duplicates: 0,
    parsed: 0,
    reviewRequired: [],
    reconciledExactly: 0,
    candidateLines: 0,
    skippedLines: { freeSamples: 0, nonFood: 0, adjustments: 0 },
    linesWithoutPack: 0,
    observedRange: null,
  };
  const lines = [];
  const seenOrders = new Set();
  const dates = [];
  for (const input of inputs) {
    const order = parseOrderEmail({ vendorKey, ...input });
    if (order.parseState === 'skipped') {
      if (order.skipReason === 'refund') report.refunds += 1;
      else if (order.skipReason === 'cancelled') report.cancelled += 1;
      else report.notOrderConfirmation += 1;
      continue;
    }
    // A re-sent or replied-to confirmation carries the same order id: count it once.
    const orderKey = order.orderId || `message:${order.messageId}`;
    if (seenOrders.has(orderKey)) {
      report.duplicates += 1;
      continue;
    }
    seenOrders.add(orderKey);
    if (order.parseState === 'review_required') {
      report.reviewRequired.push({ orderId: order.orderId, messageId: order.messageId, reasons: order.reasons, lines: order.lines.length });
      continue;
    }
    report.parsed += 1;
    if (order.reconciliation.exact) report.reconciledExactly += 1;
    const detail = toVendorLinesDetailed(order);
    report.candidateLines += detail.lines.length;
    report.skippedLines.freeSamples += detail.freeSamples;
    report.skippedLines.nonFood += detail.nonFood;
    report.skippedLines.adjustments += detail.adjustments;
    report.linesWithoutPack += detail.noPack;
    dates.push(order.purchasedAt);
    lines.push(...detail.lines);
  }
  if (dates.length) {
    dates.sort();
    report.observedRange = [dates[0], dates[dates.length - 1]];
  }
  return { report, lines };
}

async function main() {
  if (has('--apply') && has('--offline')) throw new Error('--offline cannot be combined with --apply');
  const vendorKeys = selectedVendorKeys();
  const source = value('--source') || (value('--dir') ? 'dir' : 'gmail');
  let byVendor;
  if (value('--dir') || source === 'dir') {
    if (!value('--dir')) throw new Error('--dir <folder> is required');
    byVendor = loadFromDir(value('--dir'), vendorKeys);
  } else if (source === 'gmail') {
    byVendor = await loadFromGmail(vendorKeys);
  } else {
    throw new Error(`unknown --source "${source}" (use gmail, or --dir <folder>)`);
  }

  const existing = has('--offline')
    ? { stockProducts: [], vendorItems: [], observationKeys: new Set() }
    : await catalog.loadExistingState(prisma());

  const report = { vendors: {}, totals: { documentsFound: 0, parsed: 0, reviewRequired: 0, candidateLines: 0 } };
  const allLines = [];
  for (const vendorKey of vendorKeys) {
    const built = buildVendorReport(vendorKey, byVendor[vendorKey] || []);
    // Per-vendor plan against the same starting state, for per-vendor creates/duplicates.
    built.report.plan = catalog.summarizePlan(catalog.planVendorLines(built.lines, existing));
    report.vendors[vendorKey] = built.report;
    allLines.push(...built.lines);
    bump(report.totals, 'documentsFound', built.report.documentsFound);
    bump(report.totals, 'parsed', built.report.parsed);
    bump(report.totals, 'reviewRequired', built.report.reviewRequired.length);
    bump(report.totals, 'candidateLines', built.lines.length);
  }
  const plan = catalog.planVendorLines(allLines, existing);
  report.plan = catalog.summarizePlan(plan);

  if (value('--out')) fs.writeFileSync(value('--out'), `${JSON.stringify(allLines, null, 2)}\n`);

  let mode = 'dry-run';
  if (has('--apply')) {
    if (plan.errors.length) {
      mode = 'refused';
      report.refused = 'plan has errors';
      process.exitCode = 2;
    } else {
      await catalog.applyPlan(prisma(), plan);
      mode = 'applied';
    }
  }
  if (plan.errors.length) process.exitCode = 2;
  console.log(JSON.stringify({ mode, ...report }, null, 2));
  if (mode === 'dry-run' && catalog.planHasWrites(plan)) console.error('\nDry run. Re-run with --apply to write.');
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaInstance) await prismaInstance.$disconnect();
    // The Gmail client can keep sockets open; the report is already printed.
    setTimeout(() => process.exit(process.exitCode || 0), 50).unref?.();
  });
