#!/usr/bin/env node
/*
 Batch-tag Cloudinary images using filename keywords and a synonyms map.
 - Uses CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 - Optional: --prefix <folder> to limit to a folder path (public_id prefix)
 - Optional: --apply to actually write tags (default is dry-run)
 - Optional: --mapFile tools/tag-synonyms.json to supply custom synonyms
 - Optional: --max <n> to limit total processed assets
 */
/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

const args = process.argv.slice(2);
function getArg(name, def = undefined) {
  const idx = args.indexOf(name);
  if (idx === -1) return def;
  const v = args[idx + 1];
  if (!v || v.startsWith('--')) return true; // flags like --apply
  return v;
}

const APPLY = !!getArg('--apply', false);
const PREFIX = getArg('--prefix', '');
const MAP_FILE = getArg('--mapFile', '');
const MAX = getArg('--max', 0) ? parseInt(getArg('--max', 0), 10) : 0;

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('Missing Cloudinary env. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

// Built-in simple synonyms and pluralization support
const DEFAULT_SYNONYMS = {
  pasta: ['spaghetti', 'noodles', 'macaroni', 'penne', 'fettuccine', 'lasagna'],
  beef: ['steak', 'steaks', 'sirloin', 'roast'],
  pork: ['ham', 'bacon', 'pancetta', 'prosciutto'],
  dessert: ['desserts', 'sweets', 'pastry', 'pastries', 'cake', 'cakes'],
  salad: ['salads', 'greens'],
  appetizer: ['appetizers', 'starter', 'starters', 'tapas'],
  soup: ['soups', 'broth'],
  bread: ['breads', 'loaf', 'loaves', 'focaccia', 'sourdough'],
  tomato: ['tomatoes'],
  potato: ['potatoes'],
  berry: ['berries'],
  pizza: ['pizzas', 'margherita'],
};

function loadSynonyms() {
  if (!MAP_FILE) return DEFAULT_SYNONYMS;
  const full = path.resolve(MAP_FILE);
  if (!fs.existsSync(full)) {
    console.warn(`Synonyms file not found at ${full}; proceeding with defaults.`);
    return DEFAULT_SYNONYMS;
  }
  try {
    const data = JSON.parse(fs.readFileSync(full, 'utf-8'));
    return { ...DEFAULT_SYNONYMS, ...data };
  } catch (e) {
    console.warn('Failed to parse synonyms file, using defaults:', e.message);
    return DEFAULT_SYNONYMS;
  }
}

const SYN = loadSynonyms();

function tokenize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9_\-/]+/g, ' ')
    .split(/[\s_\-/]+/)
    .filter(Boolean);
}

function expandTokens(tokens) {
  const out = new Set();
  for (const t of tokens) {
    out.add(t);
    if (t.endsWith('ies') && t.length > 3) out.add(t.slice(0, -3) + 'y');
    if (t.endsWith('es')) out.add(t.slice(0, -2));
    if (t.endsWith('s')) out.add(t.slice(0, -1)); else { out.add(t + 's'); out.add(t + 'es'); }
    if (SYN[t]) SYN[t].forEach((s) => out.add(String(s).toLowerCase()));
  }
  return Array.from(out);
}

async function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function run() {
  console.log(`[cloudinary-tag-all] start ${APPLY ? 'APPLY' : 'DRY-RUN'} prefix=${PREFIX || '*'} max=${MAX || '∞'}`);
  let cursor = null;
  let processed = 0;
  // eslint-disable-next-line no-constant-condition
  for (;;) {
    const exp = PREFIX ? `resource_type:image AND public_id:${PREFIX}*` : 'resource_type:image';
    const builder = cloudinary.search.expression(exp).with_field('context').max_results(500);
    if (cursor) builder.next_cursor(cursor);
    const res = await builder.execute();
    const items = res.resources || [];
    if (!items.length) break;
    for (const r of items) {
      if (MAX && processed >= MAX) break;
      processed += 1;
      const baseTokens = new Set();
      // derive from public_id path/filename
      tokenize(r.public_id).forEach((t) => baseTokens.add(t));
      // derive from existing context fields if available
      const ctx = r.context && (r.context.custom || r.context);
      if (ctx) {
        Object.values(ctx).forEach((v) => tokenize(v).forEach((t) => baseTokens.add(t)));
      }
      const expanded = expandTokens(Array.from(baseTokens));
      const existing = new Set(r.tags || []);
      const toAdd = expanded.filter((t) => !existing.has(t));

      if (!toAdd.length) {
        console.log(`- ${r.public_id} (no new tags)`);
        continue;
      }

      if (APPLY) {
        for (const tag of toAdd) {
          try {
            await cloudinary.uploader.add_tag(tag, [r.public_id], { resource_type: r.resource_type || 'image' });
            await delay(80);
          } catch (e) {
            console.warn(`  ! failed add_tag ${tag} -> ${r.public_id}: ${e.message}`);
          }
        }
        console.log(`+ ${r.public_id} added ${toAdd.length} tag(s)`);
      } else {
        console.log(`[dry-run] ${r.public_id} would add: ${toAdd.join(', ')}`);
      }
    }
    if (MAX && processed >= MAX) break;
    cursor = res.next_cursor;
  if (!cursor) break;
  }
  console.log(`[cloudinary-tag-all] done. processed=${processed}`);
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
