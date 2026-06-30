#!/usr/bin/env node
/**
 * Reclassify Brevo email-list "GAVE_FEEDBACK" self-loops into SUBSCRIBED_TO
 * edges pointing at a single "Brevo Email List" Channel entity.
 *
 * WHY: extract_brevo.py recorded list subscriptions as GAVE_FEEDBACK self-loops
 * (Customer->Customer), conflating "is on our email list" with real customer
 * feedback (testimonials, Thumbtack reviews) and violating the dictionary
 * (GAVE_FEEDBACK is selfEdge:false -> Dish/Menu/Offer/Feedback). This pass moves
 * ONLY metadata.source === 'brevo' edges to SUBSCRIBED_TO -> Channel, leaving the
 * 3 testimonials + 8 thumbtack_review edges as GAVE_FEEDBACK untouched.
 *
 * Idempotent: re-running skips already-migrated rows. Reversible: each migrated
 * assertion records metadata.migratedFrom = { relType, dstId }.
 *
 *   node scripts/migrate-brevo-feedback-to-subscription.cjs           # dry run
 *   node scripts/migrate-brevo-feedback-to-subscription.cjs --apply   # write
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) { let v = m[2].trim(); if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1); process.env[m[1]]=v; }
}
const APPLY = process.argv.includes('--apply');
const { PrismaClient } = require('@prisma/client');
const { canonicalName, writeLedgerEvent } = require('../backend/api/brain/ledger');
const prisma = new PrismaClient();

const CHANNEL_NAME = 'Brevo Email List';

(async () => {
  // 1. find-or-create the Channel entity
  const cname = canonicalName(CHANNEL_NAME);
  let channel = await prisma.brainEntity.findFirst({
    where: { entityType: 'Channel', canonicalName: cname, tombstonedAt: null },
  });
  if (!channel) {
    if (APPLY) {
      channel = await prisma.brainEntity.create({
        data: { entityType: 'Channel', name: CHANNEL_NAME, canonicalName: cname,
          properties: { provider: 'brevo', kind: 'email_list' } },
      });
      console.log('created Channel entity:', channel.id);
    } else {
      console.log('[dry-run] would create Channel entity "' + CHANNEL_NAME + '"');
      channel = { id: '<new-channel-id>' };
    }
  } else {
    console.log('found existing Channel entity:', channel.id);
  }

  // 2. target rows: Brevo-sourced GAVE_FEEDBACK self-loops not already migrated
  const rows = await prisma.brainAssertion.findMany({
    where: {
      relType: 'GAVE_FEEDBACK', retractedAt: null, knownUntil: null,
      metadata: { path: ['source'], equals: 'brevo' },
    },
    select: { id: true, srcId: true, dstId: true, metadata: true },
  });
  const todo = rows.filter(r => !(r.metadata && r.metadata.migratedFrom));
  console.log(`Brevo GAVE_FEEDBACK rows: ${rows.length}; needing migration: ${todo.length}`);

  if (!APPLY) {
    console.log('[dry-run] would repoint', todo.length, 'edges -> SUBSCRIBED_TO -> Channel', channel.id);
    console.log('[dry-run] sample:', todo.slice(0,3).map(r=>r.id).join(', '));
    await prisma.$disconnect();
    return;
  }

  let migrated = 0;
  for (const r of todo) {
    await prisma.brainAssertion.update({
      where: { id: r.id },
      data: {
        relType: 'SUBSCRIBED_TO',
        dstId: channel.id,
        metadata: { ...(r.metadata || {}), migratedFrom: { relType: 'GAVE_FEEDBACK', dstId: r.dstId }, migratedAt: new Date().toISOString() },
      },
    });
    migrated++;
  }

  await writeLedgerEvent({
    eventType: 'brain.migration',
    source: 'migrate-brevo-feedback-to-subscription',
    sourceId: 'brevo-feedback-to-subscription-v1',
    occurredAt: new Date(),
    actorType: 'script',
    payload: { migrated, channelId: channel.id, from: 'GAVE_FEEDBACK', to: 'SUBSCRIBED_TO' },
  }).catch(e => console.warn('ledger write warn:', e.message));

  console.log(`Migrated ${migrated} Brevo edges to SUBSCRIBED_TO -> ${channel.id}`);
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
