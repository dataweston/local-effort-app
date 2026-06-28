#!/usr/bin/env node
/**
 * Backfill resolved entityIds onto existing ledger payloads.
 *
 * The inference engine keys vendors/customers by raw merchantName/customerId
 * strings; the hypothesis engine reads payload.vendorEntityId/customerEntityId —
 * which NO ledger event currently carries, so it resolves to nothing every run.
 * This one-time pass uses the shared resolver to write the resolved entity id
 * onto each event's payload, so both engines can read one shared key.
 *
 * Idempotent: skips events that already have the resolved id.
 * Read-only by default; pass --apply to write.
 *
 *   node scripts/backfill-entity-ids.cjs           # dry run
 *   node scripts/backfill-entity-ids.cjs --apply   # write
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
const { resolveEntity } = require(path.join(root, 'backend/api/brain/resolver'));

const APPLY = process.argv.includes('--apply');

async function main() {
  const stats = { customerEvents: 0, customerResolved: 0, customerWritten: 0, vendorEvents: 0, vendorResolved: 0, vendorWritten: 0 };
  const custCache = new Map();
  const vendCache = new Map();

  // ── Customer side: events with payload.customerId (Square) → customerEntityId ──
  const custIds = await prisma.$queryRawUnsafe(
    `SELECT id FROM "LedgerEvent" WHERE "tombstonedAt" IS NULL AND payload ? 'customerId'`);
  const custEvents = await prisma.ledgerEvent.findMany({
    where: { id: { in: custIds.map(r => r.id) } },
    select: { id: true, payload: true },
  });
  for (const ev of custEvents) {
    stats.customerEvents++;
    const pl = ev.payload || {};
    if (pl.customerEntityId) continue; // already backfilled
    const cid = pl.customerId;
    if (!cid) continue;
    let entId = custCache.get(cid);
    if (entId === undefined) {
      const r = await resolveEntity({ type: 'Customer', ids: { squareCustomerId: cid } });
      entId = r.entity?.id || null;
      custCache.set(cid, entId);
    }
    if (!entId) continue;
    stats.customerResolved++;
    if (APPLY) {
      await prisma.ledgerEvent.update({ where: { id: ev.id }, data: { payload: { ...pl, customerEntityId: entId } } });
      stats.customerWritten++;
    }
  }

  // ── Vendor side: events with payload.merchantName → vendorEntityId ──
  const vendIds = await prisma.$queryRawUnsafe(
    `SELECT id FROM "LedgerEvent" WHERE "tombstonedAt" IS NULL AND payload ? 'merchantName'`);
  const vendEvents = await prisma.ledgerEvent.findMany({
    where: { id: { in: vendIds.map(r => r.id) } },
    select: { id: true, payload: true },
  });
  for (const ev of vendEvents) {
    stats.vendorEvents++;
    const pl = ev.payload || {};
    if (pl.vendorEntityId) continue;
    const name = pl.merchantName;
    if (!name) continue;
    let entId = vendCache.get(name.toLowerCase());
    if (entId === undefined) {
      const r = await resolveEntity({ type: 'Vendor', name });
      entId = r.entity?.id || null;
      vendCache.set(name.toLowerCase(), entId);
    }
    if (!entId) continue;
    stats.vendorResolved++;
    if (APPLY) {
      await prisma.ledgerEvent.update({ where: { id: ev.id }, data: { payload: { ...pl, vendorEntityId: entId } } });
      stats.vendorWritten++;
    }
  }

  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', ...stats }, null, 2));
}

main().catch(e => { console.error('ERR', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
