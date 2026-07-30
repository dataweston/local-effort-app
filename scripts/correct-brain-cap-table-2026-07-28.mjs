// Owner correction 2026-07-28 — cap table.
//
// Corrects the 2026-07-18 pass, which recorded Renee Owens' 2% as coming entirely
// from Weston Smith. It came 1% from Weston and 1% from Catherine, so both founders
// sit at 46.5%, not 45.5% / 47.5%.
//
//   Weston Smith    46.5   (50 − 2.5 Sarah − 1 Renee)
//   Catherine Olsen 46.5   (50 − 2.5 Sarah − 1 Renee)
//   Sarah Olsen      5.0
//   Renee Owens      2.0   ($6,000; $3,000 to each founder)
//                  ------
//                  100.0
//
// Also: Zachary Hurdle is no longer eligible for his 0.5% offer (retract).
// Maria Beck's 1% offer stands, still unaccepted, and would come from Weston.
//
// Dry run:  node scripts/correct-brain-cap-table-2026-07-28.mjs
// Apply:    node scripts/correct-brain-cap-table-2026-07-28.mjs --apply
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const NOW = new Date();
const SOURCE = 'owner_correction';
const SOURCE_ID = 'owner-corrections:2026-07-28:cap-table-renee-split';
const ACTOR = 'founder:weston-smith';
const SNAPSHOT_ID = '6b062655-d651-4abe-a014-5e63bf1c702b';

const HOLDERS = [
  { holder: 'Weston Smith', percent: 46.5, source: 'initial 50%, minus 2.5% to Sarah Olsen, minus 1% to Renee Owens' },
  { holder: 'Catherine Olsen', percent: 46.5, source: 'initial 50%, minus 2.5% to Sarah Olsen, minus 1% to Renee Owens' },
  { holder: 'Sarah Olsen', percent: 5, source: '2.5% from Weston Smith and 2.5% from Catherine Olsen' },
  { holder: 'Renee Owens', percent: 2, source: '1% from Weston Smith and 1% from Catherine Olsen, $6,000 total' },
];

async function exactEntity(tx, name, entityType) {
  const rows = await tx.brainEntity.findMany({ where: { name, entityType } });
  if (rows.length !== 1) {
    throw new Error(`Expected one ${entityType} named "${name}"; found ${rows.length}`);
  }
  return rows[0];
}

async function supersede(tx, ids, eventId, reason, replacementId = null) {
  for (const id of ids) {
    await tx.brainAssertion.update({
      where: { id },
      data: {
        knownUntil: NOW,
        supersededAt: NOW,
        supersededBy: replacementId,
        supersededReason: reason,
      },
    });
  }
}

function assertionData(srcId, dstId, relType, metadata, eventId) {
  return {
    srcId, dstId, relType, metadata,
    validFrom: NOW, knownFrom: NOW,
    confidence: 1,
    sourceType: SOURCE,
    sourceId: eventId,
    createdBy: ACTOR,
    provisional: false,
    confirmedAt: NOW,
    confirmedBy: ACTOR,
  };
}

async function liveIds(tx, where) {
  const rows = await tx.brainAssertion.findMany({
    where: { ...where, knownUntil: null, retractedAt: null },
    select: { id: true },
  });
  return rows.map(r => r.id);
}

async function correct(tx) {
  const existing = await tx.ledgerEvent.findFirst({ where: { source: SOURCE, sourceId: SOURCE_ID } });
  if (existing) return { alreadyApplied: true, eventId: existing.id };

  const [org, weston, catherine, sarah, renee, reneeTxn, zachOffer, zachGrant, mariaOffer, mariaGrant, snapshot] =
    await Promise.all([
      exactEntity(tx, 'Local Effort Cooperative', 'Organization'),
      exactEntity(tx, 'Weston Smith', 'Person'),
      exactEntity(tx, 'Catherine Olsen', 'Person'),
      exactEntity(tx, 'Sarah Olsen', 'Person'),
      exactEntity(tx, 'Renee Owens', 'Person'),
      exactEntity(tx, 'Renee Owens Future Non-Governance Profit Interest Investment', 'LedgerTransaction'),
      exactEntity(tx, 'Zachary Hurdle Associate of Community Projects Offer', 'JobOffer'),
      exactEntity(tx, 'Zachary Hurdle 0.5% Worker Equity Offer', 'EquityGrant'),
      exactEntity(tx, 'Maria Beck Chef Offer', 'JobOffer'),
      exactEntity(tx, 'Maria Beck 1% Worker Equity Offer', 'EquityGrant'),
      exactEntity(tx, 'Local Effort Cooperative Current Fully Diluted Cap Table', 'CapitalizationSnapshot'),
    ]);

  const event = await tx.ledgerEvent.create({
    data: {
      eventType: 'business.facts.corrected',
      schemaVersion: 1,
      occurredAt: NOW,
      source: SOURCE,
      sourceId: SOURCE_ID,
      actorType: 'founder',
      actorId: 'Weston Smith',
      payload: {
        effectiveAsOf: '2026-07-28',
        supersedes: 'owner-corrections:2026-07-18:economist-facts-v2',
        corrections: {
          capitalization: {
            basis: 'fully diluted',
            holders: HOLDERS,
            totalsToPercent: 100,
            reneeSourceSplit: [
              { source: 'Weston Smith', percent: 1, cashPaidCents: 300000 },
              { source: 'Catherine Olsen', percent: 1, cashPaidCents: 300000 },
            ],
            womenHeldPercent: 53.5,
          },
          zacharyOffer: { percent: 0.5, status: 'no_longer_eligible', includedInCapTable: false },
          mariaOffer: { percent: 1, accepted: false, wouldComeFrom: 'Weston Smith', includedInCapTable: false },
        },
        note: 'The 2026-07-18 pass attributed all of Renee Owens 2% to Weston Smith. It was split 1% / 1% between the two founders.',
      },
    },
  });

  const stats = {};
  const reason = 'Superseded by owner correction 2026-07-28: Renee 2% split 1%/1% between founders';

  // 1. Founder + holder equity positions.
  const holderEntity = { 'Weston Smith': weston, 'Catherine Olsen': catherine, 'Sarah Olsen': sarah, 'Renee Owens': renee };
  stats.holders = [];
  for (const h of HOLDERS) {
    const entity = holderEntity[h.holder];
    const stale = await liveIds(tx, { srcId: entity.id, dstId: org.id, relType: 'HOLDS_EQUITY_IN' });
    const created = await tx.brainAssertion.create({
      data: assertionData(entity.id, org.id, 'HOLDS_EQUITY_IN', {
        basis: 'fully diluted',
        percent: h.percent,
        source: h.source,
        snapshotId: SNAPSHOT_ID,
        ...(h.holder === 'Renee Owens' ? { cashPaidCents: 600000 } : {}),
      }, event.id),
    });
    await supersede(tx, stale, event.id, reason, created.id);
    stats.holders.push({ holder: h.holder, percent: h.percent, superseded: stale.length });
  }

  // 2. Renee's purchase: 1% from each founder, not 2% from Weston.
  const staleFrom = await liveIds(tx, { srcId: reneeTxn.id, relType: 'TRANSFERS_EQUITY_FROM' });
  const fromWeston = await tx.brainAssertion.create({
    data: assertionData(reneeTxn.id, weston.id, 'TRANSFERS_EQUITY_FROM',
      { percent: 1, recipient: 'Renee Owens', cashPaidCents: 300000 }, event.id),
  });
  await tx.brainAssertion.create({
    data: assertionData(reneeTxn.id, catherine.id, 'TRANSFERS_EQUITY_FROM',
      { percent: 1, recipient: 'Renee Owens', cashPaidCents: 300000 }, event.id),
  });
  await supersede(tx, staleFrom, event.id, reason, fromWeston.id);
  stats.reneeTransfersFrom = { superseded: staleFrom.length, created: 2 };

  const staleTo = await liveIds(tx, { srcId: reneeTxn.id, dstId: renee.id, relType: 'TRANSFERS_EQUITY_TO' });
  const toRenee = await tx.brainAssertion.create({
    data: assertionData(reneeTxn.id, renee.id, 'TRANSFERS_EQUITY_TO', {
      percent: 2,
      cashPaidCents: 600000,
      source: 'Weston Smith (1%) and Catherine Olsen (1%)',
    }, event.id),
  });
  await supersede(tx, staleTo, event.id, reason, toRenee.id);
  stats.reneeTransfersTo = { superseded: staleTo.length, created: 1 };

  // 3. Zachary Hurdle is no longer eligible — retract, don't supersede.
  const zachIds = await liveIds(tx, {
    OR: [
      { srcId: zachOffer.id, relType: 'OFFERS_EQUITY_RIGHT' },
      { srcId: zachGrant.id }, { dstId: zachGrant.id },
    ],
  });
  for (const id of zachIds) {
    await tx.brainAssertion.update({
      where: { id },
      data: {
        retractedAt: NOW,
        retractedBy: ACTOR,
        retractedReason: 'Zachary Hurdle no longer eligible for the 0.5% worker equity offer (owner, 2026-07-28)',
        retractionSourceId: event.id,
      },
    });
  }
  await tx.brainEntity.update({
    where: { id: zachGrant.id },
    data: {
      status: 'tombstoned',
      tombstonedAt: NOW,
      tombstoneReason: 'Offer withdrawn — recipient no longer eligible (owner, 2026-07-28)',
      properties: { ...(zachGrant.properties || {}), status: 'no_longer_eligible', withdrawnAt: '2026-07-28' },
    },
  });
  stats.zacharyRetracted = zachIds.length;

  // 4. Maria's 1% offer stands, unaccepted, sourced from Weston.
  const staleMaria = await liveIds(tx, { srcId: mariaOffer.id, dstId: mariaGrant.id, relType: 'OFFERS_EQUITY_RIGHT' });
  const mariaNew = await tx.brainAssertion.create({
    data: assertionData(mariaOffer.id, mariaGrant.id, 'OFFERS_EQUITY_RIGHT', {
      offeredPercent: 1,
      accepted: false,
      wouldComeFrom: 'Weston Smith',
      includedInCapTable: false,
    }, event.id),
  });
  await supersede(tx, staleMaria, event.id,
    'Superseded by owner correction 2026-07-28: offer would dilute Weston Smith alone', mariaNew.id);
  stats.mariaOffer = { superseded: staleMaria.length, created: 1 };

  // 5. Entity properties: snapshot + both founders.
  await tx.brainEntity.update({
    where: { id: snapshot.id },
    data: {
      properties: {
        ...(snapshot.properties || {}),
        correctedAt: NOW.toISOString(),
        organization: 'Local Effort Cooperative',
        basis: 'fully diluted',
        holderPercents: HOLDERS,
        totalsToPercent: 100,
        womenHeldPercent: 53.5,
        pendingOffers: [
          { holder: 'Maria Beck', percent: 1, accepted: false, wouldComeFrom: 'Weston Smith' },
        ],
        withdrawnOffers: [{ holder: 'Zachary Hurdle', percent: 0.5, reason: 'no longer eligible' }],
      },
    },
  });
  for (const [entity, percent] of [[weston, 46.5], [catherine, 46.5]]) {
    await tx.brainEntity.update({
      where: { id: entity.id },
      data: { properties: { ...(entity.properties || {}), postTrustPostReneeEquityPercent: percent } },
    });
  }
  stats.entitiesUpdated = ['snapshot', 'Weston Smith', 'Catherine Olsen', 'Zachary Hurdle 0.5% Worker Equity Offer'];

  return { alreadyApplied: false, eventId: event.id, stats };
}

async function main() {
  if (!APPLY) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      sourceId: SOURCE_ID,
      wouldWrite: {
        holders: HOLDERS,
        totalsToPercent: HOLDERS.reduce((s, h) => s + h.percent, 0),
        womenHeldPercent: 53.5,
        reneeSplit: '1% Weston + 1% Catherine, $3,000 each',
        zachary: 'retract 0.5% offer + tombstone grant entity',
        maria: '1% offer stands, unaccepted, would come from Weston Smith',
      },
      hint: 'Re-run with --apply to write.',
    }, null, 2));
    return;
  }
  const result = await prisma.$transaction(tx => correct(tx), { timeout: 30000 });
  console.log(JSON.stringify({ mode: 'apply', ...result }, null, 2));
}

main()
  .catch(e => { console.error('FAILED:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
