#!/usr/bin/env node
/**
 * Run the deterministic event-menu price extractor.
 *   node scripts/extract-menu-quotes.cjs           # dry run (no writes)
 *   node scripts/extract-menu-quotes.cjs --apply    # write provisional QUOTED assertions
 *
 * Provisional only — review them on /brain (Provisional review / Smart review).
 */

require('dotenv').config();
const { ensureDatabaseUrl } = require('../backend/api/utils/prisma');
const { extractMenuQuotes } = require('../backend/api/brain/menuQuoteExtractor');

async function main() {
  ensureDatabaseUrl();
  const apply = process.argv.includes('--apply');
  console.log(`Menu-quote extractor — ${apply ? 'APPLY (writing provisional)' : 'DRY RUN (no writes)'}\n`);

  const { scanned, quotes, written, unresolved, results } = await extractMenuQuotes({ apply });

  for (const r of results) {
    const price = `$${r.perGuestLow}${r.perGuestHigh ? '-' + r.perGuestHigh : ''}/pp`;
    const guests = r.guestCount ? `× ${r.guestCount}g` : '(no count)';
    const who = r.customer ? r.customer.name : `UNRESOLVED → ${r.recipientName || r.recipientEmail || '?'}`;
    const flag = r.resolvable ? '✓' : '·';
    console.log(`${flag} ${price.padEnd(12)} ${guests.padEnd(11)} ${r.offerResolved.padEnd(26)} ${who}`);
    console.log(`    "${r.sourceSpan}"`);
  }

  console.log(`\n── scanned ${scanned} sent emails · ${quotes} quotes found · ${quotes - unresolved} resolvable · ${unresolved} unresolved`);
  if (apply) console.log(`Wrote ${written} provisional QUOTED assertions. Review on /brain.`);
  else console.log('Dry run. Re-run with --apply to write provisional assertions for review.');
}

main().catch((e) => { console.error('extract-menu-quotes failed:', e); process.exit(1); });
