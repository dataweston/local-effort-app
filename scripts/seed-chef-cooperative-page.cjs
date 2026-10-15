#!/usr/bin/env node
// Default: local validation and preview only. --apply creates ONE published singleton
// if absent; existing owner content is never patched or replaced.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
require('dotenv').config({ path: '.env.local', quiet: true });
require('dotenv').config({ quiet: true });
const { createClient } = require('@sanity/client');
const contract = require('../shared/chef-cooperative-page.json');

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--apply')) throw new Error('Usage: node scripts/seed-chef-cooperative-page.cjs [--apply]');
  const { assertChefCooperativeContent } = await import(pathToFileURL(path.resolve(__dirname, '../shared/chef-cooperative-content.mjs')).href);
  const document = assertChefCooperativeContent(require('./content/chef-cooperative-page.cjs'));
  const projectId = process.env.SANITY_PROJECT_ID || process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || 'd6l9d0ea';
  const dataset = process.env.SANITY_DATASET || process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || 'localeffort';
  if (!args.includes('--apply')) {
    console.log(JSON.stringify({ mode: 'dry-run', projectId, dataset, operation: 'createIfNotExists', document }, null, 2));
    console.log('No network read or write performed. Review copy, then use --apply only with owner publication approval. Existing content is never overwritten.');
    return;
  }
  const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN || process.env.sanity_write_token;
  if (!token) throw new Error('--apply requires SANITY_WRITE_TOKEN or SANITY_API_TOKEN.');
  const client = createClient({ projectId, dataset, apiVersion: '2025-02-19', useCdn: false, token, perspective: 'published' });
  const existing = await client.fetch(contract.query);
  const draft = await client.getDocument(`drafts.${contract.documentId}`);
  if (draft && !existing) throw new Error('An owner draft already exists. Publish/review it in Studio; this seed will not bypass it.');
  await client.createIfNotExists(document);
  const readback = assertChefCooperativeContent(await client.fetch(contract.query));
  console.log(JSON.stringify({ mode: 'apply', operation: 'createIfNotExists', existingPreserved: Boolean(existing), documentId: readback._id, revision: readback._rev, updatedAt: readback._updatedAt, projectId, dataset }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
