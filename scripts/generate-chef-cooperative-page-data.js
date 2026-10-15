#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createClient } = require('@sanity/client');
const contract = require('../shared/chef-cooperative-page.json');
require('dotenv').config({ path: '.env.local', quiet: true });
require('dotenv').config({ quiet: true });
for (const filename of ['.env.production.local', '.env.vercel.production']) require('dotenv').config({ path: filename, override: false, quiet: true });
const output = path.resolve(__dirname, '../src/store/data/generatedChefCooperativePageData.json');

async function main() {
  const { assertChefCooperativeContent } = await import(pathToFileURL(path.resolve(__dirname, '../shared/chef-cooperative-content.mjs')).href);
  const projectId = process.env.SANITY_PROJECT_ID || process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || 'd6l9d0ea';
  const dataset = process.env.SANITY_DATASET || process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || 'localeffort';
  const source = { projectId, dataset, documentId: contract.documentId };
  try {
    const client = createClient({ projectId, dataset, apiVersion: '2025-02-19', perspective: 'published', useCdn: false });
    const page = assertChefCooperativeContent(await client.fetch(contract.query));
    if (!page._rev || !page._updatedAt) throw new Error('Published document lacks CMS revision evidence.');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), source, page }, null, 2)}\n`);
    console.log(`[chef-cooperative-data] Generated published ${page._id} revision ${page._rev}.`);
  } catch (error) {
    try {
      const previous = JSON.parse(fs.readFileSync(output, 'utf8'));
      assertChefCooperativeContent(previous.page);
      if (previous.source?.projectId !== projectId || previous.source?.dataset !== dataset || previous.source?.documentId !== contract.documentId || !previous.page._rev || !previous.page._updatedAt || !previous.generatedAt) throw new Error('Snapshot lacks matching CMS source/revision evidence.');
      console.warn(`[chef-cooperative-data] CMS unavailable or invalid (${error.message}); retaining valid CMS snapshot revision ${previous.page._rev}.`);
    } catch (snapshotError) {
      throw new Error(`No valid published chef cooperative document or prior CMS snapshot. ${error.message} ${snapshotError.message} With owner approval, run node scripts/seed-chef-cooperative-page.cjs --apply, then rerun this generator. Do not hand-author the generated JSON.`);
    }
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
