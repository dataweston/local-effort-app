#!/usr/bin/env node
/**
 * Run the allowlist-only vendor-invoice extractor.
 *   node scripts/extract-vendor-invoices.cjs           # dry run
 *   node scripts/extract-vendor-invoices.cjs --apply    # write provisional EMAILED (vendor contact) assertions
 */

require('dotenv').config();
const { ensureDatabaseUrl } = require('../backend/api/utils/prisma');
const { extractVendorInvoices } = require('../backend/api/brain/vendorInvoiceExtractor');

async function main() {
  ensureDatabaseUrl();
  const apply = process.argv.includes('--apply');
  console.log(`Vendor-invoice extractor (allowlist-only) — ${apply ? 'APPLY' : 'DRY RUN'}\n`);

  const { scanned, invoices, written, unresolved, results } = await extractVendorInvoices({ apply });

  for (const r of results) {
    const flag = r.resolvable ? '✓' : '· (vendor entity not found — not written)';
    console.log(`${flag} ${r.domain.padEnd(20)} ${(r.vendor ? r.vendor.name : r.vendorName).padEnd(18)} ${r.subject.slice(0, 50)}`);
  }

  console.log(`\n── scanned ${scanned} email.thread · ${invoices} allowlisted invoices · ${invoices - unresolved} resolvable · ${unresolved} unresolved`);
  if (apply) console.log(`Wrote ${written} provisional vendor-contact assertions. Review on /brain.`);
  else console.log('Dry run. Re-run with --apply to write.');
}

main().catch((e) => { console.error('extract-vendor-invoices failed:', e); process.exit(1); });
