#!/usr/bin/env node
/**
 * Amazon confirmation emails or saved confirmations -> Food Ops vendor cost observations.
 * DRY RUN until --apply. Reports counts/reason codes only (no customer, order, or item text).
 *
 *   node scripts/food-ops-amazon-orders.cjs [--source gmail | --dir <folder>]
 *                                           [--offline] [--out <candidate-lines.json] [--apply]
 *
 * Gmail source uses the repo authorized client and a targeted confirmation-sender query with
 * users.messages.list/get only. Saved source accepts JSON {id, html, text, toks, date}, HTML, or TXT.
 * --offline plans against an empty catalog and cannot be combined with --apply.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const catalog = require('../backend/api/foodOps/catalog');
const amazon = require('../backend/api/foodOps/vendorInvoices/amazonOrders');
const QUERY = 'from:auto-confirm@amazon.com in:anywhere';

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

function parseDate(input) {
  if (!input) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function savedInputs(dir) {
  return fs.readdirSync(dir).sort().filter((name) => /\.(?:html?|txt|json)$/i.test(name)).map((name) => {
    const file = path.join(dir, name);
    if (/\.json$/i.test(name)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return { id: data.id || path.basename(name, '.json'), html: data.html || '', text: data.text || '', toks: data.toks || null, date: parseDate(data.date) };
    }
    const body = fs.readFileSync(file, 'utf8');
    return { id: path.basename(name, path.extname(name)), html: /\.html?$/i.test(name) ? body : '', text: /\.txt$/i.test(name) ? body : '', date: null };
  });
}

async function gmailInputs() {
  const { getAuthorizedGmailClient } = require('../backend/api/brain/gmailSync.js');
  const { parseGmailFullMessage } = require('../backend/api/brain/gmailMime.js');
  const gmail = await getAuthorizedGmailClient();
  const ids = new Set();
  let pageToken;
  do {
    const page = await gmail.users.messages.list({ userId: 'me', q: QUERY, maxResults: 100, ...(pageToken ? { pageToken } : {}) });
    for (const message of page.data.messages || []) ids.add(message.id);
    pageToken = page.data.nextPageToken;
  } while (pageToken);
  const inputs = [];
  for (const id of ids) {
    const full = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
    const parsed = parseGmailFullMessage(full.data);
    inputs.push({ id, html: parsed.htmlContent || '', text: parsed.textContent || '', date: parseDate(parsed.headerMap?.date || (full.data.internalDate ? new Date(Number(full.data.internalDate)) : null)) });
  }
  return inputs;
}

function reportFor(inputs) {
  const report = {
    vendor: amazon.VENDOR.name,
    documentsFound: inputs.length,
    ordersFound: 0,
    duplicates: 0,
    skipped: 0,
    parsed: 0,
    reviewRequired: [],
    candidateLines: 0,
    excludedItems: 0,
    unpricedItems: 0,
    linesWithoutPack: 0,
    observedRange: null,
  };
  const orders = [];
  for (const input of inputs) {
    const result = amazon.parseConfirmationEmail(input.toks || input.html || input.text, { date: input.date });
    if (!result.orders.length) report.skipped += 1;
    report.ordersFound += result.orders.length;
    orders.push(...result.orders);
    if (result.reasons.length) report.reviewRequired.push({ reasons: result.reasons });
  }
  const unique = amazon.dedupeOrders(orders);
  report.duplicates = orders.length - unique.length;
  const lines = [];
  const dates = [];
  for (const order of unique) {
    if (order.parseState !== 'parsed') {
      report.reviewRequired.push({ reasons: order.reasons });
      continue;
    }
    report.parsed += 1;
    const detail = amazon.toVendorLinesDetailed(order);
    lines.push(...detail.lines);
    report.excludedItems += detail.excluded.count;
    report.unpricedItems += detail.unpriced.count;
    report.linesWithoutPack += detail.noPack;
    if (order.purchasedAt) dates.push(order.purchasedAt);
  }
  report.candidateLines = lines.length;
  if (dates.length) {
    dates.sort();
    report.observedRange = [dates[0], dates[dates.length - 1]];
  }
  return { report, lines };
}

async function main() {
  if (has('--apply') && has('--offline')) throw new Error('--offline cannot be combined with --apply');
  const dir = value('--dir');
  const source = value('--source') || (dir ? 'dir' : 'gmail');
  if (source !== 'gmail' && source !== 'dir') throw new Error(`unknown --source "${source}" (use gmail or dir)`);
  if (source === 'dir' && !dir) throw new Error('--dir <folder> is required with --source dir');
  const inputs = source === 'dir' ? savedInputs(dir) : await gmailInputs();
  const { report, lines } = reportFor(inputs);
  const existing = has('--offline') ? { stockProducts: [], vendorItems: [], observationKeys: new Set() } : await catalog.loadExistingState(prisma());
  const plan = catalog.planVendorLines(lines, existing);
  if (value('--out')) fs.writeFileSync(value('--out'), `${JSON.stringify(lines, null, 2)}\n`);
  const output = { mode: 'dry-run', source, query: source === 'gmail' ? QUERY : undefined, report, plan: catalog.summarizePlan(plan) };
  if (has('--apply')) {
    if (plan.errors.length) {
      output.mode = 'refused';
      output.refused = 'plan has errors';
      process.exitCode = 2;
    } else {
      await catalog.applyPlan(prisma(), plan);
      output.mode = 'applied';
    }
  } else if (plan.errors.length) process.exitCode = 2;
  console.log(JSON.stringify(output, null, 2));
  if (output.mode === 'dry-run' && catalog.planHasWrites(plan)) console.error('\nDry run. Re-run with --apply to write.');
}

main()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => {
    if (prismaInstance) await prismaInstance.$disconnect();
    setTimeout(() => process.exit(process.exitCode || 0), 50).unref?.();
  });
