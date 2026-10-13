#!/usr/bin/env node
// One-time migration for the rich-text + Studio-managed photos change to the Pizza on Smith
// page. Run it when the matching site code is deployed: the previous page code cannot render
// the Portable Text it writes.
//   --upload-only  copy the site's static photos to Cloudinary (tag pizza, folder pizza-on-smith); no Sanity write
//   --apply        also patch pizza-on-smith-page: prose fields become rich text, photo fields are seeded
// Dry run by default.
require('dotenv').config({ path: '.env.local' }); require('dotenv').config();
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const sanity = require('@sanity/client');
const UPLOAD_ONLY = process.argv.includes('--upload-only');
const APPLY = process.argv.includes('--apply') || UPLOAD_ONLY;
const cloud = process.env.CLOUDINARY_CLOUD_NAME;
const key = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const block = (text, i) => ({ _type: 'block', _key: key(text + i), style: 'normal', markDefs: [], children: [{ _type: 'span', _key: key('s' + text + i), text, marks: [] }] });
const toBlocks = (v) => typeof v !== 'string' ? v : v.split(/\n{2,}/).map((p) => p.replace(/^\n+|\n+$/g, '')).filter((p) => p.trim()).map(block);

const STATIC = {
  brussels: 'Brussels sprout pizza on a silver platter',
  sliced: 'A slice pulled from a pepperoni pizza on a wooden board',
  crust: 'Close-up of a blistered pizza crust inside its vacuum seal',
  cheese: 'Small cheese and pepperoni pizzas on parchment',
  oven: 'A person holding a freshly baked pizza beside an outdoor oven',
  stamp: 'Local Pizza lettering printed with hand-carved potato stamps',
  boxed: 'A pizza in a hand-stamped Local Pizza box',
  seasonal: 'A vacuum-sealed seasonal pizza topped with corn, herbs and cheese',
};
const NEW = [
  ['xeqxodaorudcrnqt5mvd', 'A blistered, charred pizza crust stacked in a cardboard box on a wooden table'],
  ['tv0fdfwwknqr0vxeet9w', 'A toddler gazing at a slice of margherita pizza in a cardboard box, with sunflowers in the foreground'],
];

async function upload(name) {
  const publicId = `pizza-on-smith/${name}`;
  const file = path.resolve('public/images/pizza-on-smith', `${name}.webp`);
  const ts = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, overwrite: 'false', tags: 'pizza,pizza-on-smith', timestamp: ts };
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  const signature = crypto.createHash('sha1').update(toSign + process.env.CLOUDINARY_API_SECRET).digest('hex');
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.append(k, String(v));
  form.append('api_key', process.env.CLOUDINARY_API_KEY); form.append('signature', signature);
  form.append('file', new Blob([fs.readFileSync(file)], { type: 'image/webp' }), `${name}.webp`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form });
  const json = await res.json();
  if (!res.ok && !/already exists/i.test(JSON.stringify(json))) throw new Error(`${name}: ${JSON.stringify(json)}`);
  return publicId;
}

(async () => {
  const client = sanity.createClient({ projectId: 'd6l9d0ea', dataset: 'localeffort', apiVersion: '2025-02-19', useCdn: false, token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN });
  const doc = await client.fetch('*[_id == "pizza-on-smith-page"][0]');
  const ids = {};
  for (const name of Object.keys(STATIC)) {
    if (APPLY) ids[name] = await upload(name); else ids[name] = `pizza-on-smith/${name}`;
  }
  const photo = (publicId, alt, i) => ({ _type: 'pizzaPhoto', _key: key(publicId + i), publicId, alt });
  const gallery = [...Object.keys(STATIC).map((n) => [ids[n], STATIC[n]]), ...NEW].map(([id, alt], i) => photo(id, alt, i));
  const set = {
    galleryPhotos: gallery,
    detailPhoto: { _type: 'pizzaPhoto', publicId: ids.crust, alt: 'A close look at the browned crust through its vacuum seal' },
    journalPhotos: ['sliced', 'oven', 'stamp', 'boxed'].map((n, i) => photo(ids[n], STATIC[n], 'j' + i)),
  };
  for (const f of ['introduction', 'storyText', 'orderIntroduction', 'oliveOilDescription']) set[f] = toBlocks(doc[f]);
  if (Array.isArray(doc.notes)) set.notes = doc.notes.map((n) => ({ ...n, text: toBlocks(n.text) }));
  for (const f of Object.keys(set)) if (set[f] == null) delete set[f];
  console.log(JSON.stringify({ apply: APPLY, fields: Object.keys(set), introduction: set.introduction, storyText: set.storyText }, null, 1));
  if (UPLOAD_ONLY) { console.log('uploaded; Sanity untouched'); return; }
  if (APPLY) { await client.patch(doc._id).set(set).commit(); console.log('patched'); }
})().catch((e) => { console.error(e); process.exit(1); });
