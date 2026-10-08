#!/usr/bin/env node
/**
 * Wedge Co-op eReceipts -> food-ops retail cost observations.
 * DRY RUN until --apply. Prints a JSON report (no receipt text, no PII).
 *
 *   node scripts/food-ops-wedge-receipts.cjs [--source gmail | --dir <folder of .html>]
 *                                            [--offline] [--out <candidate-lines.json>] [--apply]
 *
 *   --source gmail  (default) reads Gmail with the repo's own authorized client:
 *                   users.messages.list (q = `from:wedge.coop in:anywhere`) and
 *                   users.messages.get format=full. List/get only; nothing is
 *                   modified, sent or labelled. The eReceipt has only an HTML part.
 *   --dir <folder>  parses saved `.html` receipts; the message id is the file name.
 *   --offline       plan against an empty catalog without connecting to the database
 *                   (the Gmail source still talks to Gmail). Cannot be combined with --apply.
 *   --out <file>    writes the candidate vendor lines as JSON.
 *   --apply         writes the plan with catalog.applyPlan. Refused when the plan has errors.
 *                   review_required receipts emit no lines and are listed in the report.
 *
 * Prices are indicative RETAIL register prices (many are sale prices), not wholesale
 * pack costs. New vendor items arrive unmapped; mapping stays a human decision.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const catalog = require('../backend/api/foodOps/catalog');
const wedge = require('../backend/api/foodOps/receipts/wedgeReceipt');

const GMAIL_QUERY = 'from:wedge.coop in:anywhere';

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

async function loadFromGmail() {
  const { getAuthorizedGmailClient } = require('../backend/api/brain/gmailSync.js');
  const { parseGmailFullMessage } = require('../backend/api/brain/gmailMime.js');
  const gmail = await getAuthorizedGmailClient();
  const ids = new Set();
  let pageToken;
  do {
    const page = await gmail.users.messages.list({ userId: 'me', q: GMAIL_QUERY, maxResults: 100, ...(pageToken ? { pageToken } : {}) });
    for (const stub of page.data.messages || []) ids.add(stub.id);
    pageToken = page.data.nextPageToken;
  } while (pageToken);
  const inputs = [];
  for (const messageId of ids) {
    const full = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
    inputs.push({ messageId, html: parseGmailFullMessage(full.data).htmlContent || '' });
  }
  return inputs;
}

function loadFromDir(dir) {
  const seen = new Map();
  for (const name of fs.readdirSync(dir).sort()) {
    if (!/\.html?$/i.test(name)) continue;
    const messageId = path.basename(name, path.extname(name));
    if (!seen.has(messageId)) seen.set(messageId, { messageId, html: fs.readFileSync(path.join(dir, name), 'utf8') });
  }
  return [...seen.values()];
}

function bump(map, key, by = 1) {
  map[key] = (map[key] || 0) + by;
}

function buildReport(receipts) {
  const report = {
    receiptsFound: receipts.length,
    parsed: 0,
    reviewRequired: { count: 0, receipts: [] },
    softWarnings: 0,
    lines: { total: 0, merchandise: 0, byKind: {} },
    linesEmitted: 0,
    linesEmittedWithConvertiblePack: 0,
    excludedByDepartment: {},
    emittedByDepartment: {},
    preparedDeliLinesEmitted: 0,
    ambiguousPack: 0,
    noPack: 0,
    distinctCodes: 0,
    dateRange: null,
  };
  const lines = [];
  const codes = new Set();
  let first = null;
  let last = null;
  for (const receipt of receipts) {
    if (receipt.parseState === 'parsed') report.parsed += 1;
    else {
      report.reviewRequired.count += 1;
      report.reviewRequired.receipts.push({ receiptSourceKey: receipt.receiptSourceKey, reasons: receipt.reasons });
    }
    report.softWarnings += receipt.reasons.filter((reason) => reason.startsWith('warning:')).length;
    for (const line of receipt.lines) {
      report.lines.total += 1;
      bump(report.lines.byKind, line.kind);
      if (line.kind === 'merchandise') {
        report.lines.merchandise += 1;
        if (line.code) codes.add(line.code);
      }
    }
    if (receipt.purchasedAt) {
      if (!first || receipt.purchasedAt < first) first = receipt.purchasedAt;
      if (!last || receipt.purchasedAt > last) last = receipt.purchasedAt;
    }
    const detailed = wedge.toVendorLinesDetailed(receipt);
    report.ambiguousPack += detailed.ambiguousPack;
    report.noPack += detailed.noPack;
    for (const [department, count] of Object.entries(detailed.excludedByDepartment)) bump(report.excludedByDepartment, department, count);
    const byIndex = new Map(receipt.lines.map((line) => [`${receipt.receiptSourceKey}:${line.index}`, line]));
    for (const line of detailed.lines) {
      const department = byIndex.get(line.sourceKey).department;
      bump(report.emittedByDepartment, department);
      if (/DELI/.test(department || '')) report.preparedDeliLinesEmitted += 1;
      if (line.packText) report.linesEmittedWithConvertiblePack += 1;
      lines.push(line);
    }
  }
  report.linesEmitted = lines.length;
  report.distinctCodes = codes.size;
  report.dateRange = first ? { from: first, to: last } : null;
  return { report, lines };
}

async function main() {
  if (has('--apply') && has('--offline')) throw new Error('--offline cannot be combined with --apply');
  const source = value('--source') || (value('--dir') ? 'dir' : 'gmail');
  let inputs;
  if (value('--dir') || source === 'dir') {
    if (!value('--dir')) throw new Error('--dir <folder> is required');
    inputs = loadFromDir(value('--dir'));
  } else if (source === 'gmail') {
    inputs = await loadFromGmail();
  } else {
    throw new Error(`unknown --source "${source}" (use gmail, or --dir <folder>)`);
  }

  const receipts = inputs.map((input) => wedge.parseWedgeReceipt(input));
  const { report, lines } = buildReport(receipts);
  const existing = has('--offline')
    ? { stockProducts: [], vendorItems: [], observationKeys: new Set() }
    : await catalog.loadExistingState(prisma());
  const plan = catalog.planVendorLines(lines, existing);
  report.plan = catalog.summarizePlan(plan);

  if (value('--out')) fs.writeFileSync(value('--out'), `${JSON.stringify(lines, null, 2)}\n`);

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
