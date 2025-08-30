/*
  batch-upload.ts

  Scans ./images for image files, uses Cloudinary auto-tagging add-on
  (default: aws_rek) to detect labels, normalizes labels into tags, and
  uploads each image to Cloudinary under
  folder `auto_uploads` with tags and context (alt, title).

  Usage:
    # install deps
  npm install cloudinary
    npm install -D ts-node typescript @types/node

    # run
    npx ts-node batch-upload.ts

  Environment variables (recommended to use a .env file or export in shell):
  CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET
  CLOUDINARY_CATEGORIZER (optional, default 'aws_rek')
  AUTO_TAGGING_THRESHOLD (optional, default '0.8')

  Notes:
    - Script processes images sequentially to avoid throttling.
    - Dry-run / batching features can be added as needed.
*/

import fs from 'fs';
import path from 'path';
import util from 'util';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

// --- Configuration / env checks ---
const CLOUD_NAME = process.env.CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
const CLOUD_API_KEY = process.env.CLOUD_API_KEY || process.env.CLOUDINARY_API_KEY;
const CLOUD_API_SECRET = process.env.CLOUD_API_SECRET || process.env.CLOUDINARY_API_SECRET;
// Leave empty by default; set CLOUDINARY_CATEGORIZER to a valid add-on id (e.g., 'google_tagging', 'imagga_tagging', 'aws_rek')
const CATEGORIZER = process.env.CLOUDINARY_CATEGORIZER || '';
const AUTO_TAGGING_THRESHOLD = parseFloat(process.env.AUTO_TAGGING_THRESHOLD || '0.8');

if (!CLOUD_NAME || !CLOUD_API_KEY || !CLOUD_API_SECRET) {
  console.error('Missing Cloudinary credentials. Set CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET.');
  process.exit(1);
}
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUD_API_KEY,
  api_secret: CLOUD_API_SECRET,
});

// Image folder
const IMAGES_DIR = path.resolve(process.cwd(), 'images');

// Acceptable image extensions (lowercase)
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp', '.heic', '.heif']);

function isImageFile(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTS.has(ext);
}

function normalizeLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove punctuation
    .replace(/[\s-]+/g, '_');
}

function extractTagsFromUploadResponse(res: any): string[] {
  // Try applied tags array first
  const tagList: string[] = Array.isArray(res?.tags) ? res.tags : [];
  // Try categorization info (aws_rek)
  const infoData: any[] = CATEGORIZER ? (res?.info?.categorization?.[CATEGORIZER]?.data || []) : [];
  const fromInfo = infoData.map((d: any) => d.tag).filter(Boolean);
  const all = [...tagList, ...fromInfo];
  // Normalize and dedupe
  const norm = all.map((t) => normalizeLabel(String(t))).filter(Boolean);
  return Array.from(new Set(norm)).slice(0, 10);
}

async function uploadToCloudinary(filePath: string, publicId: string, title: string, hash: string) {
  const contextParts: string[] = [];
  // alt will be filled in after auto-tagging; include title/hash now
  if (title) contextParts.push(`title=${encodeURIComponent(title)}`);
  if (hash) contextParts.push(`hash=${hash}`);
  const contextStr = contextParts.join('|');

  const baseOptions: any = {
    public_id: publicId, // explicit public id (includes folder path)
    unique_filename: false,
    overwrite: false,
    context: contextStr || undefined,
    resource_type: 'image',
  };
  const withCategorization: any = { ...baseOptions };
  if (CATEGORIZER) {
    withCategorization.categorization = CATEGORIZER;
    withCategorization.auto_tagging = AUTO_TAGGING_THRESHOLD;
  }
  try {
    return await cloudinary.uploader.upload(filePath, withCategorization);
  } catch (e) {
    const msg = errorToString(e);
    if (CATEGORIZER && /Categorization item .* is not valid/i.test(msg)) {
      console.warn(`  Categorization '${CATEGORIZER}' not enabled. Retrying without auto-tagging.`);
      return await cloudinary.uploader.upload(filePath, baseOptions);
    }
    throw e;
  }
}

function sha1(buffer: Buffer): string {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

function getDateParts(filePath: string) {
  const stats = fs.statSync(filePath);
  const d = stats.mtime || new Date();
  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return { year, month };
}

function sanitizeBaseName(name: string) {
  const base = name.replace(path.extname(name), '');
  return base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .slice(0, 80);
}

async function findExistingByHash(hash: string) {
  try {
    const expr = `context:"hash:${hash}" AND resource_type:image`;
    const result = await cloudinary.search.expression(expr).max_results(1).execute();
    const resources = (result as any).resources || [];
    return resources[0] || null;
  } catch (e) {
    console.warn('  Search by hash failed, proceeding without dedupe:', errorToString(e));
    return null;
  }
}

function buildOrganizedPublicId(tags: string[], filename: string, hash: string, dateParts: {year:string; month:string}) {
  const primary = tags[0] || 'uncategorized';
  const base = sanitizeBaseName(filename);
  const shortHash = hash.slice(0, 8);
  const folder = `auto_uploads/${primary}/${dateParts.year}/${dateParts.month}`;
  return `${folder}/${base}-${shortHash}`;
}

function errorToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function processFile(filename: string) {
  const filePath = path.join(IMAGES_DIR, filename);
  console.log(`Processing: ${filename}`);
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      console.log('  Skipping (not a file)');
      return;
    }

    if (!isImageFile(filename)) {
      console.log('  Skipping (not an image)');
      return;
    }

  const buffer = fs.readFileSync(filePath);
  const fileHash = sha1(buffer);

    // Deduplication: check if an asset with same hash already exists
    const existing = await findExistingByHash(fileHash);
    const dateParts = getDateParts(filePath);
    // Will determine tags after upload or via explicit for existing
    let tags: string[] = [];
    let targetPublicId: string;

    if (existing) {
      // If duplicate exists, ensure it's organized under the target folder/name
      const existingPublicId: string = existing.public_id || '';
      // Try to trigger auto-tagging on existing asset (if add-on enabled)
      if (CATEGORIZER) {
        try {
          await cloudinary.uploader.explicit(existingPublicId, {
            type: 'upload',
            categorization: CATEGORIZER,
            auto_tagging: AUTO_TAGGING_THRESHOLD,
            resource_type: 'image',
          } as any);
        } catch (e) {
          const msg = errorToString(e);
          if (/Categorization item .* is not valid/i.test(msg)) {
            console.warn(`  Categorization '${CATEGORIZER}' not enabled; skipping explicit tagging.`);
          } else {
            console.warn('  Explicit categorization failed:', msg);
          }
        }
      }
      // Fetch fresh details to read tags
      const details = await cloudinary.api.resource(existingPublicId, { resource_type: 'image' });
      const existingTags: string[] = Array.isArray((details as any).tags) ? (details as any).tags : [];
      tags = Array.from(new Set(existingTags.map((t) => normalizeLabel(String(t))))).filter(Boolean).slice(0, 10);
      targetPublicId = buildOrganizedPublicId(tags, filename, fileHash, dateParts);
      if (existingPublicId !== targetPublicId) {
        try {
          console.log(`  Duplicate found. Renaming existing asset to ${targetPublicId}`);
          await cloudinary.uploader.rename(existingPublicId, targetPublicId, {
            overwrite: true,
            resource_type: 'image',
          });
        } catch (e) {
          console.warn('  Rename failed:', errorToString(e));
        }
      } else {
        console.log('  Duplicate found at desired location. Skipping upload.');
      }
      // Update tags/context on the organized asset
      try {
        if (tags.length) {
          await cloudinary.uploader.add_tag(tags.join(','), [targetPublicId], { resource_type: 'image' });
        }
        const contextParts: string[] = [];
        const alt = tags.join(',');
        if (alt) contextParts.push(`alt=${alt}`);
        if (filename) contextParts.push(`title=${encodeURIComponent(filename)}`);
        contextParts.push(`hash=${fileHash}`);
        await cloudinary.uploader.explicit(targetPublicId, {
          type: 'upload',
          context: contextParts.join('|'),
          resource_type: 'image',
        });
      } catch (e) {
        console.warn('  Tag/context update failed:', errorToString(e));
      }
      const finalDetails = await cloudinary.api.resource(targetPublicId, { resource_type: 'image' });
      console.log(`  Final URL: ${(finalDetails as any).secure_url || (finalDetails as any).url}`);
    } else {
      // New upload to incoming area, then determine tags and move
      const base = sanitizeBaseName(filename);
      const shortHash = fileHash.slice(0, 8);
      const incomingPublicId = `auto_uploads/_incoming/${base}-${shortHash}`;
      const uploadRes = await uploadToCloudinary(filePath, incomingPublicId, filename, fileHash);
      const appliedTags = extractTagsFromUploadResponse(uploadRes as any);
      tags = appliedTags;
      console.log(`  Tags: ${tags.join(', ') || '(none)'}`);
      targetPublicId = buildOrganizedPublicId(tags, filename, fileHash, dateParts);
      // Rename/move to organized location
      try {
        if (incomingPublicId !== targetPublicId) {
          await cloudinary.uploader.rename(incomingPublicId, targetPublicId, {
            overwrite: true,
            resource_type: 'image',
          });
        }
      } catch (e) {
        console.warn('  Rename after upload failed:', errorToString(e));
      }
      // Ensure context includes alt/title/hash
      try {
        const contextParts: string[] = [];
        const alt = tags.join(',');
        if (alt) contextParts.push(`alt=${alt}`);
        if (filename) contextParts.push(`title=${encodeURIComponent(filename)}`);
        contextParts.push(`hash=${fileHash}`);
        await cloudinary.uploader.explicit(targetPublicId, {
          type: 'upload',
          context: contextParts.join('|'),
          resource_type: 'image',
        });
      } catch (e) {
        console.warn('  Context update failed:', errorToString(e));
      }
      const finalDetails = await cloudinary.api.resource(targetPublicId, { resource_type: 'image' });
      console.log(`  Uploaded: ${(finalDetails as any).secure_url || (finalDetails as any).url}`);
    }
  } catch (err: unknown) {
    console.error(`  Error processing ${filename}:`, errorToString(err));
  }
}

async function main() {
  try {
    if (!fs.existsSync(IMAGES_DIR)) {
      console.error(`Images directory not found: ${IMAGES_DIR}`);
      process.exit(1);
    }

    const files = await readdir(IMAGES_DIR);
    // Process sequentially to avoid throttling
    for (const f of files) {
      await processFile(f);
      // small delay between uploads
      await new Promise((r) => setTimeout(r, 300));
    }

    console.log('Done.');
  } catch (err: unknown) {
    console.error('Fatal error:', errorToString(err));
    process.exit(1);
  }
}

main();
