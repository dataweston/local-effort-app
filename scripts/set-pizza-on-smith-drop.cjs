#!/usr/bin/env node
// Sets the Pizza on Smith drop window and removes stale "Tuesday pickup" copy on
// the Sanity `pizza-on-smith-page` document. Dry run unless --apply is passed.
//   node scripts/set-pizza-on-smith-drop.cjs --opens 2026-10-13T00:00:00-05:00 \
//     --closes 2026-10-28T23:59:59-05:00 --fulfillment "Week of November 2, 2026" \
//     [--cap smith-cheese-3=60 --cap smith-brussels=40] [--apply]
// --cap switches a product to managed inventory with that quantity; checkout then
// refuses oversells and the page shows "Only N left" and "Sold out".
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const sanity = require('@sanity/client');

const args = (name) =>
  process.argv.flatMap((value, index) => (value === `--${name}` && process.argv[index + 1] ? [process.argv[index + 1]] : []));
const arg = (name) => args(name)[0];

const DOC_ID = 'pizza-on-smith-page';
const STALE = /tuesday/i;

async function main() {
  const opens = arg('opens');
  const closes = arg('closes');
  const fulfillment = arg('fulfillment');
  if (![opens, closes, fulfillment].every(Boolean) || [opens, closes].some((value) => Number.isNaN(Date.parse(value)))) {
    throw new Error('Provide --opens, --closes (ISO datetimes with offset) and --fulfillment.');
  }
  if (Date.parse(closes) <= Date.parse(opens)) throw new Error('--closes must be after --opens.');
  const caps = args('cap').map((entry) => {
    const [id, qty] = entry.split('=');
    const quantity = Number(qty);
    if (!id || !Number.isInteger(quantity) || quantity < 0) throw new Error(`Invalid --cap "${entry}"; use product-id=quantity.`);
    return { id, quantity };
  });

  const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
  const client = sanity.createClient({
    projectId: process.env.SANITY_PROJECT_ID || 'd6l9d0ea',
    dataset: process.env.SANITY_DATASET || 'localeffort',
    apiVersion: '2025-02-19',
    useCdn: false,
    token,
  });

  const doc = await client.fetch('*[_id == $id][0]', { id: DOC_ID });
  if (!doc) throw new Error(`${DOC_ID} not found.`);

  // Stale pickup-day copy is cleared (not rewritten) so the page falls back to the
  // drop-aware defaults; editors can then write replacements in Studio.
  const unset = ['introduction', 'pickupHeading', 'pickupAddress']
    .filter((field) => typeof doc[field] === 'string' && STALE.test(doc[field]));
  // Eyebrows and numbered note labels are retired (AGENTS.md design rules): the
  // fields are gone from the schema, so any stored value is removed outright.
  for (const field of ['eyebrow', 'journalEyebrow']) if (field in doc) unset.push(field);
  const staleNotes = (doc.notes || []).some((note) => STALE.test(`${note.heading} ${note.text}`));
  if (staleNotes) unset.push('notes');
  const set = { dropOpensAt: opens, dropClosesAt: closes, fulfillmentLabel: fulfillment };
  if (!staleNotes && (doc.notes || []).some((note) => 'label' in note)) {
    set.notes = doc.notes.map((note) => Object.fromEntries(Object.entries(note).filter(([key]) => key !== 'label')));
  }

  const summary = { id: DOC_ID, set, unset, caps, apply: process.argv.includes('--apply') };
  if (!summary.apply) {
    process.stdout.write(`${JSON.stringify({ ...summary, note: 'Dry run. Re-run with --apply to write.' }, null, 2)}\n`);
    return;
  }
  if (!token) throw new Error('A Sanity write token is required for --apply.');
  const tx = client.transaction().patch(DOC_ID, (patch) => patch.set(set).unset(unset));
  for (const { id, quantity } of caps) {
    tx.patch(id, (patch) => patch.set({ inventoryMode: 'manual', manualQty: quantity, lastSyncedAt: new Date().toISOString() }));
  }
  await tx.commit();
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
