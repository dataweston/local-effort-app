#!/usr/bin/env node
/**
 * Wholesale vendor PDF invoices -> food-ops cost observations (source `vendor_invoice`).
 * DRY RUN until --apply. Prints a JSON report (no invoice text, no PII).
 *
 *   node scripts/food-ops-vendor-pdf-invoices.cjs [--vendor <key>|all] [--dir <folder of .pdf>]
 *                                                 [--offline] [--out <candidate-lines.json>] [--apply]
 *
 * Vendors: greatciao, bakersfield, goodacre, madrose, hafa (see backend/api/foodOps/vendorInvoices/pdfInvoices.js).
 *
 *   --vendor        one vendor key, or `all` (default).
 *   (default)       reads Gmail with the repo's own authorized client: users.messages.list
 *                   (q = the vendor's query), users.messages.get format=full and
 *                   users.messages.attachments.get for each PDF. List/get only; nothing is
 *                   modified, sent or labelled. PDFs are held in memory and never written to disk.
 *   --dir <folder>  parses saved `.pdf` files instead of Gmail: the folder holds the PDFs of the one
 *                   --vendor, or (with `--vendor all`) one sub-folder per vendor key.
 *   --offline       plan against an empty catalog without connecting to the database
 *                   (the Gmail source still talks to Gmail). Cannot be combined with --apply.
 *   --out <file>    writes the candidate vendor lines as JSON.
 *   --apply         writes the plan with catalog.applyPlan. Refused when the plan has errors.
 *                   review_required invoices emit no lines and are listed in the report.
 *
 * Statements, sales orders, quotes, credits, price lists and forms are counted and skipped.
 * Image-only invoice PDFs are reported as `needsOcr` (vendor + date) and skipped.
 * New vendor items arrive unmapped; mapping stays a human decision.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const catalog = require('../backend/api/foodOps/catalog');
const pdfInvoices = require('../backend/api/foodOps/vendorInvoices/pdfInvoices');

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

const isPdf = (attachment) => /pdf/i.test(attachment.mediaType || '') || /\.pdf$/i.test(attachment.filename || '');

/** Gmail PDFs for one vendor query -> `[{ buffer, filename, date }]`. Read-only. */
async function loadFromGmail(gmail, vendor) {
  const { parseGmailFullMessage } = require('../backend/api/brain/gmailMime.js');
  const ids = new Set();
  let pageToken;
  do {
    const page = await gmail.users.messages.list({ userId: 'me', q: vendor.gmailQuery, maxResults: 100, ...(pageToken ? { pageToken } : {}) });
    for (const stub of page.data.messages || []) ids.add(stub.id);
    pageToken = page.data.nextPageToken;
  } while (pageToken);
  const inputs = [];
  for (const messageId of ids) {
    const full = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
    const date = full.data.internalDate ? new Date(Number(full.data.internalDate)).toISOString().slice(0, 10) : null;
    for (const attachment of parseGmailFullMessage(full.data).attachments.filter(isPdf)) {
      if (!attachment.attachmentId) continue;
      const part = await gmail.users.messages.attachments.get({ userId: 'me', messageId, id: attachment.attachmentId });
      inputs.push({ buffer: Buffer.from(part.data.data || '', 'base64url'), filename: attachment.filename || '', date });
    }
  }
  return inputs;
}

function loadFromDir(dir) {
  return fs.readdirSync(dir)
    .filter((name) => /\.pdf$/i.test(name))
    .sort()
    .map((name) => ({ buffer: fs.readFileSync(path.join(dir, name)), filename: name, date: fs.statSync(path.join(dir, name)).mtime.toISOString().slice(0, 10) }));
}

async function main() {
  if (has('--apply') && has('--offline')) throw new Error('--offline cannot be combined with --apply');
  const wanted = value('--vendor') || 'all';
  const keys = wanted === 'all' ? Object.keys(pdfInvoices.VENDORS) : [wanted];
  for (const key of keys) if (!pdfInvoices.VENDORS[key]) throw new Error(`unknown --vendor "${key}" (use ${Object.keys(pdfInvoices.VENDORS).join(', ')} or all)`);
  const dir = value('--dir');
  if (has('--dir') && !dir) throw new Error('--dir <folder> is required');

  let gmail = null;
  if (!dir) gmail = await require('../backend/api/brain/gmailSync.js').getAuthorizedGmailClient();

  const lines = [];
  const vendors = {};
  for (const key of keys) {
    const vendor = pdfInvoices.VENDORS[key];
    const files = dir ? loadFromDir(wanted === 'all' ? path.join(dir, key) : dir) : await loadFromGmail(gmail, vendor);
    const inputs = [];
    const unreadable = [];
    for (const file of files) {
      try {
        inputs.push({ lines: await pdfInvoices.pdfToTextLines(file.buffer), filename: file.filename, date: file.date });
      } catch (error) {
        unreadable.push(file.date);
      }
    }
    const result = pdfInvoices.processVendor(key, inputs);
    result.report.unreadablePdfs = unreadable.length;
    vendors[key] = result.report;
    lines.push(...result.lines);
  }

  const existing = has('--offline')
    ? { stockProducts: [], vendorItems: [], observationKeys: new Set() }
    : await catalog.loadExistingState(prisma());
  const plan = catalog.planVendorLines(lines, existing);
  const report = { vendors, totalLines: lines.length, plan: catalog.summarizePlan(plan) };

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
