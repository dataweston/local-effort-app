#!/usr/bin/env node
/* THROWAWAY read-only: payload completeness + full recent-window dump + brain-derived enrichment. */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

function doms(v) {
  const m = String(v || '').match(/@([A-Za-z0-9.-]+)/g);
  return m ? [...new Set(m.map((x) => x.slice(1).toLowerCase()))].join(',') : '-';
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.ledgerEvent.findMany({
      where: { source: 'gmail', tombstonedAt: null },
      select: { id: true, occurredAt: true, sourceId: true, payload: true, createdAt: true },
      orderBy: { occurredAt: 'desc' },
    });

    const withSnip = rows.filter((r) => String(r.payload?.snippet || '').trim().length > 0);
    const keys = new Set();
    for (const r of rows) for (const k of Object.keys(r.payload || {})) keys.add(k);
    console.log(`PAYLOAD COMPLETENESS: ${rows.length} rows; non-empty snippet=${withSnip.length}; keys=${[...keys].join(',')}`);
    const ing = rows.map((r) => r.createdAt.toISOString().slice(0, 10)).sort();
    console.log(`ingest createdAt range: ${ing[0]} .. ${ing[ing.length - 1]}`);

    const since = new Date('2026-05-01T00:00:00Z');
    const recent = rows.filter((r) => r.occurredAt >= since);
    console.log(`\n===== ALL ${recent.length} THREADS WITH FIRST-MESSAGE DATE >= 2026-05-01 =====`);
    for (const r of recent) {
      const p = r.payload || {};
      console.log(
        `${r.occurredAt.toISOString().slice(0, 10)} | ${r.sourceId} | m=${String(p.messageCount).padStart(2)} | ` +
          `from=${doms(p.from)} -> to=${doms(p.to)} | ${String(p.subject || '').slice(0, 110)}`
      );
    }

    // Brain-derived enrichment for the high-stakes threads.
    const focus = [
      '19faa9297f709fb9', '19fa5917c3aba203', '19fa589fc7d0b485', '19fa42417fec0ce1',
      '19fc8816de915a42', '19f09766693908c0',
      '19ce2e7dadba3aab', '19cddad2b729358c',
      '19cafb11913f5a59', '193cb805730f3261', '1921545c888f6988', '199a06fc4f5c58d5',
      '19d6fa859549130f', '19dac289af831cb6', '19a6e07d5261467a', '1993f603ba669a7b',
    ];
    const focusEvents = rows.filter((r) => focus.includes(r.sourceId));
    const ids = focusEvents.map((r) => r.id);
    const items = await prisma.brainInboxItem.findMany({
      where: { ledgerEventId: { in: ids } },
      select: { id: true, ledgerEventId: true, status: true, rawContent: true, createdAt: true },
    });
    console.log(`\n===== BRAIN INBOX ITEMS for ${ids.length} focus events: ${items.length} =====`);
    const byEvent = new Map(focusEvents.map((r) => [r.id, r.sourceId]));
    for (const it of items) {
      console.log(`thread=${byEvent.get(it.ledgerEventId)} status=${it.status} raw=${it.rawContent.replace(/\s+/g, ' ').slice(0, 500)}`);
    }
    const asserts = await prisma.brainAssertion.findMany({
      where: { ledgerEventId: { in: ids } },
      take: 60,
    });
    console.log(`\n===== BRAIN ASSERTIONS on focus events: ${asserts.length} =====`);
    for (const a of asserts) console.log(JSON.stringify(a).slice(0, 400));
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});
