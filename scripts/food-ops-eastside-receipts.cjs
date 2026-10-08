#!/usr/bin/env node
/**
 * Eastside Food Cooperative eReceipts (.eml files) -> retail price observations
 * for the Food Operations catalog. DRY RUN until --apply.
 *
 *   node scripts/food-ops-eastside-receipts.cjs [--dir <folder> ...] [--offline] [--out lines.json] [--apply]
 *
 * --dir      folder holding .eml receipts (repeatable; searched non-recursively).
 *            Default: the owner's Downloads/attachments (6)..(15) and attachmentsm.
 * --offline  plan against an empty database without connecting (cannot be combined with --apply).
 * --out      write the candidate vendor lines (no PII) as JSON.
 * --apply    write the plan. Refused when the plan has errors. review_required receipts
 *            emit no lines, so only fully reconciled receipts are written; they are listed in the report.
 *
 * Receipts are deduplicated by SHA-256 of the file and by receiptSourceKey, so
 * re-running over overlapping folders and re-applying are both idempotent.
 * Observations are RETAIL prices (indicative retail cost, not wholesale pack
 * cost). The 20% Employee discount is a receipt-level row that is not
 * attributed to items, so line prices stay full retail and it is not allocated.
 * The report never contains raw receipt text, names, or card/member/account data.
 */
require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { simpleParser } = require('mailparser');
const catalog = require('../backend/api/foodOps/catalog');
const { parseEastsideReceipt, buildVendorLines, DEFAULT_EXCLUDED_DEPARTMENTS } = require('../backend/api/foodOps/receipts/eastsideReceipt');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const values = (flag) => args.reduce((acc, arg, index) => (arg === flag && args[index + 1] ? [...acc, args[index + 1]] : acc), []);

let prismaInstance = null;
function prisma() {
  if (!prismaInstance) {
    const { PrismaClient } = require('@prisma/client');
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

function defaultDirs() {
  const downloads = path.join(os.homedir(), 'Downloads');
  return [...Array.from({ length: 10 }, (_, i) => `attachments (${i + 6})`), 'attachmentsm'].map((name) => path.join(downloads, name));
}

function print(object) {
  console.log(JSON.stringify(object, null, 2));
}

function bump(map, key, by = 1) {
  map[key] = (map[key] || 0) + by;
}

async function main() {
  if (has('--apply') && has('--offline')) throw new Error('--offline cannot be combined with --apply');
  const dirs = values('--dir').length ? values('--dir') : defaultDirs();

  const seenFiles = new Set();
  const receipts = new Map(); // receiptSourceKey -> receipt
  let filesRead = 0;
  let duplicateFiles = 0;
  let duplicateKeys = 0;
  let missingDirs = 0;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) { missingDirs += 1; continue; }
    for (const name of fs.readdirSync(dir).filter((file) => /\.eml$/i.test(file)).sort()) {
      const buffer = fs.readFileSync(path.join(dir, name));
      filesRead += 1;
      const sha = crypto.createHash('sha256').update(buffer).digest('hex');
      if (seenFiles.has(sha)) { duplicateFiles += 1; continue; }
      seenFiles.add(sha);
      const { html } = await simpleParser(buffer);
      const receipt = parseEastsideReceipt({ html: html || '' });
      if (receipt.receiptSourceKey.startsWith('eml:sha256:')) receipt.receiptSourceKey = `eml:sha256:${sha.slice(0, 16)}`;
      if (receipts.has(receipt.receiptSourceKey)) { duplicateKeys += 1; continue; }
      receipts.set(receipt.receiptSourceKey, receipt);
    }
  }

  const lines = [];
  const stats = { merchandiseLines: 0, excludedByDepartment: {}, ambiguousPack: 0, preparedLines: 0 };
  const reviewRequired = [];
  const codes = new Set();
  const dates = [];
  let linesParsed = 0;
  let parsedReceipts = 0;
  for (const receipt of receipts.values()) {
    linesParsed += receipt.lines.length;
    if (receipt.purchasedAt) dates.push(receipt.purchasedAt);
    if (receipt.parseState === 'parsed') parsedReceipts += 1;
    else reviewRequired.push({ receiptSourceKey: receipt.receiptSourceKey, reasons: receipt.reasons });
    const built = buildVendorLines(receipt);
    lines.push(...built.lines);
    stats.merchandiseLines += receipt.parseState === 'parsed' ? built.stats.merchandiseLines : 0;
    stats.ambiguousPack += built.stats.ambiguousPack;
    stats.preparedLines += built.stats.preparedLines;
    for (const [department, count] of Object.entries(built.stats.excludedByDepartment)) bump(stats.excludedByDepartment, department, count);
    for (const line of built.lines) if (line.sku) codes.add(line.sku);
  }
  dates.sort();

  const out = value('--out');
  if (out) fs.writeFileSync(out, JSON.stringify(lines, null, 2));

  const existing = has('--offline')
    ? { stockProducts: [], vendorItems: [], observationKeys: new Set() }
    : await catalog.loadExistingState(prisma());
  const plan = catalog.planVendorLines(lines, existing);

  const report = {
    mode: has('--apply') ? 'applied' : 'dry-run',
    note: 'Retail receipt prices: indicative retail cost, not wholesale pack cost. The 20% Employee discount is receipt-level and unallocated; line prices are full retail.',
    unlinkedToLocalBudget: true,
    files: { read: filesRead, duplicateFiles, duplicateReceiptKeys: duplicateKeys, missingDirs },
    receiptsFound: receipts.size,
    parsed: parsedReceipts,
    reviewRequired: reviewRequired.length,
    reconciliationRate: receipts.size ? Number((parsedReceipts / receipts.size).toFixed(4)) : null,
    reviewRequiredReceipts: reviewRequired,
    linesParsed,
    merchandiseLinesInParsedReceipts: stats.merchandiseLines,
    linesEmitted: lines.length,
    excludedByDepartment: stats.excludedByDepartment,
    excludedDepartmentList: DEFAULT_EXCLUDED_DEPARTMENTS,
    preparedLinesEmitted: stats.preparedLines,
    ambiguousPack: stats.ambiguousPack,
    distinctCodes: codes.size,
    dateRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    plan: catalog.summarizePlan(plan),
  };

  if (has('--apply')) {
    // review_required receipts emit zero lines, so the plan holds reconciled receipts only.
    if (plan.errors.length) throw new Error(`--apply refused: plan has ${plan.errors.length} error(s)`);
    await catalog.applyPlan(prisma(), plan);
  }

  print(report);
  if (plan.errors.length) process.exitCode = 2;
  else if (!has('--apply')) console.error('\nDry run. Re-run with --apply to write.');
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaInstance) await prismaInstance.$disconnect();
  });
