#!/usr/bin/env node
/**
 * Costco in-warehouse receipt PDFs -> food-ops cost observations (source `vendor_invoice`).
 * DRY RUN until --apply. Prints a JSON report (no receipt text, no PII).
 *
 *   node scripts/food-ops-costco-receipts.cjs --dir <folder of receipt .pdf> [--vendor costco]
 *                                             [--any-name] [--include-nonfood] [--offline]
 *                                             [--out <candidate-lines.json>] [--apply]
 *
 * Source: costco.com > Orders & Purchases > Warehouse tab > open a receipt > Print > Save as PDF.
 * Gmail holds no Costco receipts, so there is no Gmail mode.
 *
 *   --dir <folder>      REQUIRED. Reads `.pdf` files whose name contains "costco" (use --any-name to try every
 *                       PDF; files that are not receipts are counted as skipped).
 *   --vendor costco     the only vendor this CLI knows (accepted so the flag is uniform across food-ops CLIs).
 *   --include-nonfood   also ingest non-food rows (default: food only; the excluded count/spend is reported).
 *   --offline           plan against an empty catalog without connecting to the database. Not with --apply.
 *   --out <file>        writes the candidate vendor lines as JSON.
 *   --apply             writes the plan with catalog.applyPlan. Refused when the plan has errors. Receipts that do
 *                       not reconcile to the cent (review_required) emit no lines and are listed in the report.
 *
 * The same receipt saved twice (same receipt id) is counted once.
 * New vendor items arrive unmapped; mapping stays a human decision.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const catalog = require('../backend/api/foodOps/catalog');
const { pdfToTextLines } = require('../backend/api/foodOps/vendorInvoices/pdfInvoices');
const costco = require('../backend/api/foodOps/vendorInvoices/costcoReceipts');

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

async function main() {
  if (has('--apply') && has('--offline')) throw new Error('--offline cannot be combined with --apply');
  const vendor = value('--vendor') || costco.VENDOR.key;
  if (vendor !== costco.VENDOR.key) throw new Error(`unknown --vendor "${vendor}" (only "${costco.VENDOR.key}")`);
  const dir = value('--dir');
  if (!dir) throw new Error('--dir <folder of Costco receipt PDFs> is required');
  const includeNonFood = has('--include-nonfood');

  const files = fs.readdirSync(dir)
    .filter((name) => /\.pdf$/i.test(name) && (has('--any-name') || /costco/i.test(name)))
    .sort();

  const report = {
    vendor: costco.VENDOR.name,
    filesRead: files.length,
    unreadable: 0,
    skipped: 0,
    duplicateReceipts: 0,
    receipts: 0,
    parsed: 0,
    reviewRequired: [],
    dateRange: null,
    items: 0,
    foodLines: 0,
    foodCents: 0,
    excluded: { count: 0, cents: 0 },
    noPack: 0,
    reconciliation: { exact: 0, exceptions: [] },
  };
  const lines = [];
  const seen = new Set();
  const dates = [];

  for (const name of files) {
    let rows;
    try {
      rows = await pdfToTextLines(fs.readFileSync(path.join(dir, name)));
    } catch (error) {
      report.unreadable += 1;
      continue;
    }
    const receipt = costco.parseCostcoReceipt(rows);
    if (receipt.parseState === 'skipped') {
      report.skipped += 1;
      continue;
    }
    const id = receipt.receiptId || `file:${name}`;
    if (seen.has(id)) {
      report.duplicateReceipts += 1;
      continue;
    }
    seen.add(id);
    report.receipts += 1;
    report.items += receipt.items.length;
    if (receipt.purchasedAt) dates.push(receipt.purchasedAt);
    if (receipt.parseState !== 'parsed') {
      report.reviewRequired.push({ date: receipt.purchasedAt, reasons: receipt.reasons });
      report.reconciliation.exceptions.push({ date: receipt.purchasedAt, itemsCents: receipt.reconciliation.itemsCents, subtotalCents: receipt.reconciliation.subtotalCents });
      continue;
    }
    report.parsed += 1;
    report.reconciliation.exact += 1;
    const detail = costco.toVendorLinesDetailed(receipt, { includeNonFood });
    lines.push(...detail.lines);
    report.excluded.count += detail.excluded.count;
    report.excluded.cents += detail.excluded.cents;
    report.noPack += detail.noPack;
  }
  report.foodLines = lines.length;
  report.foodCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  dates.sort();
  report.dateRange = dates.length ? [dates[0], dates[dates.length - 1]] : null;

  const existing = has('--offline')
    ? { stockProducts: [], vendorItems: [], observationKeys: new Set() }
    : await catalog.loadExistingState(prisma());
  const plan = catalog.planVendorLines(lines, existing);
  const output = { report, plan: catalog.summarizePlan(plan) };

  if (value('--out')) fs.writeFileSync(value('--out'), `${JSON.stringify(lines, null, 2)}\n`);

  let mode = 'dry-run';
  if (has('--apply')) {
    if (plan.errors.length) {
      mode = 'refused';
      output.refused = 'plan has errors';
      process.exitCode = 2;
    } else {
      await catalog.applyPlan(prisma(), plan);
      mode = 'applied';
    }
  }
  if (plan.errors.length) process.exitCode = 2;
  console.log(JSON.stringify({ mode, ...output }, null, 2));
  if (mode === 'dry-run' && catalog.planHasWrites(plan)) console.error('\nDry run. Re-run with --apply to write.');
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaInstance) await prismaInstance.$disconnect();
    setTimeout(() => process.exit(process.exitCode || 0), 50).unref?.();
  });
