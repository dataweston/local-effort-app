import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@sanity/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

for (const envFile of ['.env.production.local', '.env']) {
  dotenv.config({ path: path.join(repoRoot, envFile), override: false });
}

const projectId = process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.VITE_APP_SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.VITE_APP_SANITY_DATASET || 'localeffort';
const token = process.env.SANITY_API_TOKEN || process.env.SANITY_WRITE_TOKEN;

if (!projectId || !dataset || !token) {
  console.error('Missing Sanity write configuration. Expected SANITY_PROJECT_ID, SANITY_DATASET, and SANITY_API_TOKEN or SANITY_WRITE_TOKEN.');
  process.exit(2);
}

const apply = process.argv.includes('--apply');
const verbose = process.argv.includes('--verbose');
const sourcePath = path.join(repoRoot, 'backend', 'decision', 'businessPriorities.json');

const client = createClient({
  projectId,
  dataset,
  token,
  useCdn: false,
  apiVersion: '2023-05-03',
});

function normalizePriorityDoc(priority, existingId) {
  return {
    _id: existingId || `decisionPriority.${priority.id}`,
    _type: 'decisionPriority',
    title: priority.label,
    priorityId: priority.id,
    active: priority.active !== false,
    weight: priority.weight,
    strategy: priority.strategy,
    reasons: Array.isArray(priority.reasons) ? priority.reasons : [],
    messageFacts: Array.isArray(priority.messageFacts) ? priority.messageFacts : [],
    ctaLabel: priority.cta?.label || null,
    ctaHref: priority.cta?.href || null,
    match: {
      pageTypes: Array.isArray(priority.match?.pageTypes) ? priority.match.pageTypes : [],
      pathPrefixes: Array.isArray(priority.match?.pathPrefixes) ? priority.match.pathPrefixes : [],
      acquisitionSources: Array.isArray(priority.match?.acquisitionSources) ? priority.match.acquisitionSources : [],
    },
  };
}

async function main() {
  const raw = await fs.readFile(sourcePath, 'utf8');
  const priorities = JSON.parse(raw);
  if (!Array.isArray(priorities) || priorities.length === 0) {
    throw new Error('No priorities found in backend/decision/businessPriorities.json');
  }

  const ids = priorities.map((entry) => entry.id);
  const existing = await client.fetch(
    '*[_type == "decisionPriority" && priorityId in $ids]{ _id, priorityId, title, _updatedAt }',
    { ids }
  );
  const existingByPriorityId = new Map((existing || []).map((doc) => [doc.priorityId, doc]));

  const docs = priorities.map((priority) => normalizePriorityDoc(priority, existingByPriorityId.get(priority.id)?._id));
  const summary = docs.map((doc) => ({
    priorityId: doc.priorityId,
    title: doc.title,
    id: doc._id,
    mode: existingByPriorityId.has(doc.priorityId) ? 'update' : 'create',
  }));

  if (!apply) {
    console.log(JSON.stringify({ ok: true, dryRun: true, count: docs.length, items: summary }, null, 2));
    return;
  }

  let transaction = client.transaction();
  for (const doc of docs) {
    transaction = transaction.createOrReplace(doc);
  }
  await transaction.commit();

  const seeded = await client.fetch(
    '*[_type == "decisionPriority" && priorityId in $ids] | order(weight desc){ _id, priorityId, title, weight, strategy, active }',
    { ids }
  );

  console.log(JSON.stringify({
    ok: true,
    applied: true,
    count: Array.isArray(seeded) ? seeded.length : 0,
    items: seeded,
  }, null, 2));

  if (verbose) {
    const total = await client.fetch('count(*[_type == "decisionPriority"])');
    console.log(JSON.stringify({ ok: true, totalDecisionPriorities: total }, null, 2));
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
