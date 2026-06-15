#!/usr/bin/env node
/**
 * Run the deterministic inbound-lead extractor.
 *   node scripts/extract-leads.cjs           # dry run (no writes)
 *   node scripts/extract-leads.cjs --apply    # write provisional DISCUSSED_OFFER (lead) assertions
 */

require('dotenv').config();
const { ensureDatabaseUrl } = require('../backend/api/utils/prisma');
const { extractLeads } = require('../backend/api/brain/leadExtractor');

async function main() {
  ensureDatabaseUrl();
  const apply = process.argv.includes('--apply');
  console.log(`Lead extractor — ${apply ? 'APPLY (writing provisional)' : 'DRY RUN (no writes)'}\n`);

  const { scanned, leads, written, unresolved, results } = await extractLeads({ apply });

  for (const r of results) {
    const who = r.customer ? r.customer.name : `UNRESOLVED → ${r.recipientName || r.recipientEmail || '?'}`;
    const flag = r.resolvable ? '✓' : '·';
    const occ = (r.occasion || '—').padEnd(13);
    const g = (r.guestCount ? `${r.guestCount}g` : '—').padEnd(5);
    const d = (r.eventDateText || '—').padEnd(10);
    console.log(`${flag} ${occ} ${g} ${d} ${r.offerResolved.padEnd(26)} ${who}`);
  }

  console.log(`\n── scanned ${scanned} sent emails · ${leads} leads found · ${leads - unresolved} resolvable · ${unresolved} unresolved`);
  if (apply) console.log(`Wrote ${written} provisional lead assertions. Review on /brain.`);
  else console.log('Dry run. Re-run with --apply to write provisional assertions for review.');
}

main().catch((e) => { console.error('extract-leads failed:', e); process.exit(1); });
