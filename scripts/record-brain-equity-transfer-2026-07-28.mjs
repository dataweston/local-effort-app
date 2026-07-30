// Equity transfer 2026-07-28 (as reported by owner): Weston Smith → Catherine Olsen, 10%.
//
//   Weston Smith    46.5 − 10 = 36.5
//   Catherine Olsen 46.5 + 10 = 56.5
//   Sarah Olsen                  5.0
//   Renee Owens                  2.0
//                             ------
//                              100.0   women-held: 63.5%
//
// Catherine now clears 51% on her own, so the ownership test under Minn. R. 1230.1604
// no longer depends on Sarah's 5% or Renee's 2%.
//
// UNKNOWN, flagged in the ledger payload for owner follow-up:
//   - effective DATE of the transfer (recorded as reported, not as executed)
//   - CONSIDERATION (gift? services? purchase?) and whether it is documented
// Both matter for certification: 1230.1604 requires ownership that is "real,
// substantial, and continuing, going beyond pro forma ownership," and certifiers
// scrutinize interests transferred shortly before an application.
//
// Dry run:  node scripts/record-brain-equity-transfer-2026-07-28.mjs
// Apply:    node scripts/record-brain-equity-transfer-2026-07-28.mjs --apply
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const NOW = new Date();
const SOURCE = 'owner_correction';
const SOURCE_ID = 'owner-transfer:2026-07-28:weston-to-catherine-10pct';
const ACTOR = 'founder:weston-smith';
const SNAPSHOT_ID = '6b062655-d651-4abe-a014-5e63bf1c702b';
const TXN_NAME = 'Weston Smith to Catherine Olsen 10% Equity Transfer';

const HOLDERS = [
  { holder: 'Catherine Olsen', percent: 56.5, woman: true,
    source: 'initial 50%, minus 2.5% to Sarah Olsen, minus 1% to Renee Owens, plus 10% from Weston Smith' },
  { holder: 'Weston Smith', percent: 36.5, woman: false,
    source: 'initial 50%, minus 2.5% to Sarah Olsen, minus 1% to Renee Owens, minus 10% to Catherine Olsen' },
  { holder: 'Sarah Olsen', percent: 5, woman: true,
    source: '2.5% from Weston Smith and 2.5% from Catherine Olsen' },
  { holder: 'Renee Owens', percent: 2, woman: true,
    source: '1% from Weston Smith and 1% from Catherine Olsen, $6,000 total' },
];
const WOMEN_PCT = HOLDERS.filter(h => h.woman).reduce((s, h) => s + h.percent, 0);

async function exactEntity(tx, name, entityType) {
  const rows = await tx.brainEntity.findMany({ where: { name, entityType } });
  if (rows.length !== 1) throw new Error(`Expected one ${entityType} named "${name}"; found ${rows.length}`);
  return rows[0];
}

function assertionData(srcId, dstId, relType, metadata, eventId) {
  return {
    srcId, dstId, relType, metadata,
    validFrom: NOW, knownFrom: NOW, confidence: 1,
    sourceType: SOURCE, sourceId: eventId, createdBy: ACTOR,
    provisional: false, confirmedAt: NOW, confirmedBy: ACTOR,
  };
}

async function correct(tx) {
  const existing = await tx.ledgerEvent.findFirst({ where: { source: SOURCE, sourceId: SOURCE_ID } });
  if (existing) return { alreadyApplied: true, eventId: existing.id };

  const [org, weston, catherine, sarah, renee, snapshot] = await Promise.all([
    exactEntity(tx, 'Local Effort Cooperative', 'Organization'),
    exactEntity(tx, 'Weston Smith', 'Person'),
    exactEntity(tx, 'Catherine Olsen', 'Person'),
    exactEntity(tx, 'Sarah Olsen', 'Person'),
    exactEntity(tx, 'Renee Owens', 'Person'),
    exactEntity(tx, 'Local Effort Cooperative Current Fully Diluted Cap Table', 'CapitalizationSnapshot'),
  ]);

  const event = await tx.ledgerEvent.create({
    data: {
      eventType: 'business.equity.transferred',
      schemaVersion: 1,
      occurredAt: NOW,
      source: SOURCE,
      sourceId: SOURCE_ID,
      actorType: 'founder',
      actorId: 'Weston Smith',
      payload: {
        reportedAsOf: '2026-07-28',
        transfer: { from: 'Weston Smith', to: 'Catherine Olsen', percent: 10 },
        capitalization: { basis: 'fully diluted', holders: HOLDERS, totalsToPercent: 100, womenHeldPercent: WOMEN_PCT },
        openQuestions: [
          'Effective date of the transfer is unrecorded; the graph holds the reported date, not the executed date.',
          'Consideration is unrecorded (gift / services / purchase) and may be undocumented.',
          'Certification relevance: Minn. R. 1230.1604 requires ownership that is real, substantial, and continuing, going beyond pro forma ownership.',
        ],
      },
    },
  });

  // The transfer itself, as a first-class ledger transaction.
  const txn = await tx.brainEntity.create({
    data: {
      entityType: 'LedgerTransaction',
      name: TXN_NAME,
      properties: {
        transactionType: 'equity_transfer',
        from: 'Weston Smith',
        to: 'Catherine Olsen',
        percent: 10,
        calculationBasis: 'fully diluted',
        effectiveDate: null,
        consideration: null,
        documentationStatus: 'not_yet_papered',
        reportedAsOf: '2026-07-28',
      },
    },
  });
  await tx.brainAssertion.create({
    data: assertionData(txn.id, weston.id, 'TRANSFERS_EQUITY_FROM',
      { percent: 10, recipient: 'Catherine Olsen' }, event.id),
  });
  await tx.brainAssertion.create({
    data: assertionData(txn.id, catherine.id, 'TRANSFERS_EQUITY_TO',
      { percent: 10, source: 'Weston Smith' }, event.id),
  });
  await tx.brainAssertion.create({
    data: assertionData(org.id, txn.id, 'ISSUES_EQUITY_RIGHT',
      { holder: 'Catherine Olsen', transferType: 'founder_to_founder' }, event.id),
  });

  // Restate the two affected holder positions.
  const holderEntity = { 'Catherine Olsen': catherine, 'Weston Smith': weston, 'Sarah Olsen': sarah, 'Renee Owens': renee };
  const stats = { holders: [] };
  for (const h of HOLDERS.filter(x => ['Catherine Olsen', 'Weston Smith'].includes(x.holder))) {
    const entity = holderEntity[h.holder];
    const stale = await tx.brainAssertion.findMany({
      where: { srcId: entity.id, dstId: org.id, relType: 'HOLDS_EQUITY_IN', knownUntil: null, retractedAt: null },
      select: { id: true },
    });
    const created = await tx.brainAssertion.create({
      data: assertionData(entity.id, org.id, 'HOLDS_EQUITY_IN',
        { basis: 'fully diluted', percent: h.percent, source: h.source, snapshotId: SNAPSHOT_ID }, event.id),
    });
    for (const prior of stale) {
      await tx.brainAssertion.update({
        where: { id: prior.id },
        data: {
          knownUntil: NOW, supersededAt: NOW, supersededBy: created.id,
          supersededReason: 'Superseded by 10% equity transfer from Weston Smith to Catherine Olsen (owner, 2026-07-28)',
        },
      });
    }
    stats.holders.push({ holder: h.holder, percent: h.percent, superseded: stale.length });
  }

  await tx.brainEntity.update({
    where: { id: snapshot.id },
    data: {
      properties: {
        ...(snapshot.properties || {}),
        correctedAt: NOW.toISOString(),
        basis: 'fully diluted',
        holderPercents: HOLDERS,
        totalsToPercent: 100,
        womenHeldPercent: WOMEN_PCT,
        majorityWomanOwner: { holder: 'Catherine Olsen', percent: 56.5 },
        lastTransfer: { from: 'Weston Smith', to: 'Catherine Olsen', percent: 10, reportedAsOf: '2026-07-28' },
      },
    },
  });
  for (const [entity, percent] of [[catherine, 56.5], [weston, 36.5]]) {
    await tx.brainEntity.update({
      where: { id: entity.id },
      data: { properties: { ...(entity.properties || {}), postTrustPostReneeEquityPercent: percent } },
    });
  }
  stats.transactionEntity = txn.id;

  return { alreadyApplied: false, eventId: event.id, stats };
}

async function main() {
  if (!APPLY) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      sourceId: SOURCE_ID,
      wouldWrite: {
        transfer: 'Weston Smith → Catherine Olsen, 10%',
        holders: HOLDERS,
        totalsToPercent: HOLDERS.reduce((s, h) => s + h.percent, 0),
        womenHeldPercent: WOMEN_PCT,
        note: 'Catherine alone clears 51%; ownership test no longer depends on Sarah or Renee.',
        unrecorded: ['effective date', 'consideration'],
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
