#!/usr/bin/env node
/**
 * Generates src/store/data/generatedMenuLibrary.json for the public /dishes page.
 *
 *   dishes  ← Prisma Dish rows the owner marked public (backend/api/menuLibraryPublic.js, the same
 *             shaping the public MCP tool uses). The hub owns these facts.
 *   page    ← the optional `dishLibraryPage` Sanity singleton (heading, intro, link labels).
 *
 * Fails the build if any public dish text contains an archive client name or looks like a price.
 * If the database or CMS cannot be reached it keeps the previous snapshot's half (same retention
 * rule as generate-chef-cooperative-page-data.js) and says so; with no previous snapshot it fails.
 */
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@sanity/client');
const contract = require('../shared/dish-library-page.json');
require('dotenv').config({ path: '.env.local', quiet: true });
require('dotenv').config({ quiet: true });
for (const filename of ['.env.production.local', '.env.vercel.production']) require('dotenv').config({ path: filename, override: false, quiet: true });

const output = path.resolve(__dirname, '../src/store/data/generatedMenuLibrary.json');

function readPrevious() {
  try { return JSON.parse(fs.readFileSync(output, 'utf8')); } catch { return null; }
}

async function loadDishes() {
  const { prisma } = require('../api-handlers/_lib/prisma');
  if (!prisma) throw new Error('DATABASE_URL is not configured');
  const { loadPublicDishes, archiveClientNames, privacyProblems } = require('../backend/api/menuLibraryPublic');
  try {
    const dishes = await loadPublicDishes(prisma);
    const problems = privacyProblems(dishes, await archiveClientNames(prisma));
    return { dishes, problems };
  } finally {
    await prisma.$disconnect?.();
  }
}

async function loadPage() {
  const projectId = process.env.SANITY_PROJECT_ID || process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || 'd6l9d0ea';
  const dataset = process.env.SANITY_DATASET || process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || 'localeffort';
  const client = createClient({ projectId, dataset, apiVersion: '2025-02-19', perspective: 'published', useCdn: false });
  return client.fetch(contract.query);
}

async function main() {
  const previous = readPrevious();
  let dishes;
  let page;

  try {
    const loaded = await loadDishes();
    if (loaded.problems.length) {
      throw Object.assign(new Error(`Refusing to publish: ${loaded.problems.join('; ')}`), { privacy: true });
    }
    dishes = loaded.dishes;
  } catch (error) {
    if (error.privacy || !previous) throw error;
    console.warn(`[menu-library] Dish database unavailable (${error.message}); retaining previous snapshot dishes.`);
    dishes = previous.dishes;
  }

  try {
    page = await loadPage();
  } catch (error) {
    if (!previous) throw new Error(`CMS unavailable and no previous snapshot: ${error.message}`);
    console.warn(`[menu-library] CMS unavailable (${error.message}); retaining previous snapshot page copy.`);
    page = previous.page;
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), page: page || null, dishes }, null, 2)}\n`);
  console.log(`[menu-library] ${dishes.length} public dishes; page copy ${page ? `revision ${page._rev}` : 'not yet published in the CMS'}.`);
}

main().then(() => process.exit(0)).catch((error) => { console.error(error.message); process.exit(1); });
