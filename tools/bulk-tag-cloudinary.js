#!/usr/bin/env node
/*
  tools/bulk-tag-cloudinary.js
  Usage (local):
    CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=... \
      node tools/bulk-tag-cloudinary.js --publicIds "site/partners/logo,site/gallery/img1" --addTags "type:partner,collection:home,published" --dry

  This script will add tags to assets by public_id. It supports a dry-run mode that prints the intended changes.
*/

const cloudinary = require('cloudinary').v2;

// Minimal argument parser to avoid external dependency
function parseArgs(argvRaw) {
  const out = {};
  let key = null;
  for (const token of argvRaw) {
    if (token.startsWith('--')) {
      key = token.slice(2);
      if (key === 'dry') {
        out.dry = true;
        key = null;
      }
    } else if (key) {
      out[key] = token;
      key = null;
    }
  }
  return out;
}

const argv = parseArgs(process.argv.slice(2));

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUD_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUD_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !CLOUD_KEY || !CLOUD_SECRET) {
  console.error('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in environment');
  process.exit(1);
}

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: CLOUD_KEY, api_secret: CLOUD_SECRET });

async function tagAssets(publicIds = [], addTags = [], dry = true) {
  for (const pid of publicIds) {
    try {
      console.log(`Processing ${pid} — adding tags: ${addTags.join(',')}`);
      if (dry) continue;
      // use explicit resource_type:image for image assets
      await cloudinary.uploader.add_tag(addTags.join(','), pid, { resource_type: 'image' });
      console.log(`Tagged ${pid}`);
    } catch (err) {
      console.error(`Failed to tag ${pid}:`, err && (err.message || err));
    }
  }
}

(async function main() {
  const publicIdsArg = argv.publicIds || argv.pids || '';
  const addTagsArg = argv.addTags || argv.tags || '';
  const dry = Boolean(argv.dry || false);

  const publicIds = publicIdsArg.split(',').map((s) => s.trim()).filter(Boolean);
  const addTags = addTagsArg.split(',').map((s) => s.trim()).filter(Boolean);

  if (!publicIds.length || !addTags.length) {
    console.error('Usage: --publicIds "id1,id2" --addTags "tag1,tag2" [--dry]');
    process.exit(1);
  }

  console.log('Dry run:', dry);
  await tagAssets(publicIds, addTags, dry);
})();
