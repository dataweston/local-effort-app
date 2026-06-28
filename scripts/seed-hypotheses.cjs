#!/usr/bin/env node
/**
 * Seed the (now-working) hypothesis engine with real, machine-checkable
 * hypotheses. The engine (backend/api/brain/hypothesisEngine.js) evaluates each
 * nightly via a predicate { condition, prediction } using:
 *   orderCount(days) | spendTotal(days) | vendorCount(days) |
 *   daysSinceLastOrder | feedbackRating(dish, days)
 * reading payment.completed events keyed by payload.vendorEntityId (now 100%
 * populated by Track B + the resolver).
 *
 * Idempotent: skips a hypothesis whose name already exists.
 *
 *   node scripts/seed-hypotheses.cjs           # dry run
 *   node scripts/seed-hypotheses.cjs --apply   # create
 */

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}
const { PrismaClient } = require(path.join(root, 'node_modules/@prisma/client'));
const prisma = new PrismaClient();
global.__localEffortPrisma = prisma;
const { writeLedgerEvent } = require(path.join(root, 'backend/api/brain/ledger'));

const APPLY = process.argv.includes('--apply');

async function vendorId(name) {
  const e = await prisma.brainEntity.findFirst({ where: { entityType: 'Vendor', tombstonedAt: null, name: { equals: name, mode: 'insensitive' } }, select: { id: true } });
  return e?.id || null;
}

async function main() {
  // Resolve anchors used by subject-specific hypotheses.
  const eastside = await vendorId('Eastside Food Cooperative');

  const HYPOTHESES = [
    {
      name: 'Vendor base is concentrating',
      statement: 'The business is consolidating spend onto fewer vendors over time (a procurement-risk signal).',
      condition: 'vendorCount(90) >= 1',           // always true when there is spend
      prediction: 'vendorCount(30) <= 25',          // few distinct vendors in the last month
      evidenceWindow: '90 days', minSampleSize: 3,
    },
    {
      name: 'Eastside is the anchor supplier',
      statement: 'Eastside Food Cooperative remains the dominant ongoing food supplier.',
      condition: 'orderCount(90) >= 3',             // active relationship
      prediction: 'daysSinceLastOrder <= 21',       // still buying recently
      evidenceWindow: '90 days', minSampleSize: 3,
      subjectEntityId: eastside,
    },
    {
      name: 'Monthly food spend is stable, not spiking',
      statement: 'Total vendor spend in the last 30 days is within a normal band (no runaway COGS).',
      condition: 'spendTotal(90) >= 1',
      prediction: 'spendTotal(30) <= 1500000',      // <= $15,000/mo across all vendors
      evidenceWindow: '90 days', minSampleSize: 3,
    },
  ].filter(h => h.subjectEntityId !== null); // drop subject-anchored ones whose anchor is missing

  const created = [];
  for (const h of HYPOTHESES) {
    const exists = await prisma.brainEntity.findFirst({ where: { entityType: 'Hypothesis', tombstonedAt: null, name: { equals: h.name, mode: 'insensitive' } }, select: { id: true } });
    if (exists) { console.log('skip (exists):', h.name); continue; }
    if (!APPLY) { console.log('would create:', h.name, '→', h.condition, '=>', h.prediction); continue; }

    const entity = await prisma.brainEntity.create({
      data: {
        entityType: 'Hypothesis', name: h.name, status: 'active',
        properties: {
          statement: h.statement,
          predicate: { condition: h.condition, prediction: h.prediction, evidenceWindow: h.evidenceWindow || '90 days', minSampleSize: h.minSampleSize || 3 },
          subjectEntityId: h.subjectEntityId || null,
          status: 'collecting', confidence: null, sampleSize: 0, confirmedCount: 0, rejectedCount: 0, lastEvaluatedAt: null,
        },
      },
    });
    await writeLedgerEvent({ eventType: 'hypothesis.created', source: 'script:seed-hypotheses', actorType: 'founder', payload: { hypothesisId: entity.id, name: h.name } });
    created.push(h.name);
  }
  console.log(`\n${APPLY ? 'created' : 'dry-run'}: ${created.length} hypotheses`, created);
}

main().catch(e => { console.error('ERR', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
