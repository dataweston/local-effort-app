#!/usr/bin/env node
/* THROWAWAY read-only triage over the Brain gmail index (LedgerEvent source='gmail'). */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const GROUPS = {
  wefunder: /wefunder|regulation\s*cf|reg[-\s]?cf|crowdfund/i,
  sharedcapital: /shared\s*capital/i,
  groove: /groove/i,
  mccd: /\bmccd\b|metropolitan\s*consortium|community\s*development/i,
  lending: /\bsba\b|\bloan\b|loans|lender|lending|credit\s*union|underwrit|term\s*sheet|promissory|line\s*of\s*credit|\bLOC\b|financing|prequalif|pre-qualif/i,
  lange: /lange/i,
  squarecapital: /square\s*(capital|loan|loans|financial|financing)|capital\s*advance|advance\s*repay/i,
  accounting: /accountant|bookkeep|\bcpa\b|quickbooks|tax\s*return|1099|\bk-1\b|balance\s*sheet|profit\s*(and|&)\s*loss|\bp&l\b|financial\s*statement/i,
  tax: /sales\s*tax|payroll\s*tax|department\s*of\s*revenue|\birs\b|withhold|\b941\b|mn\s*revenue|unemployment\s*insurance|\bein\b|tax\s*notice|tax\s*due/i,
  lease: /neon\s*collective|\bneon\b|lease|sublease|kitchen\s*rent|commissary|license\s*agreement|landlord/i,
  marsh: /\bmarsh\b|\brfp\b|request\s*for\s*proposal|caf[eé]/i,
  insurance: /insur|certificate\s*of\s*insurance|\bcoi\b|workers.?\s*comp|general\s*liability|policy\s*renew/i,
  collections: /past\s*due|collection|overdue|final\s*notice|payment\s*reminder|delinquen|unpaid|outstanding\s*balance|statement\s*of\s*account/i,
  capitalraise: /investor|equity|\bsafe\b|convertible|cap\s*table|due\s*diligence|\bgrant\b|capital\s*raise|fundrais/i,
};

function domainOf(addr) {
  const m = String(addr || '').match(/@([A-Za-z0-9.-]+)/g);
  return m ? [...new Set(m.map((x) => x.slice(1).toLowerCase()))].join(',') : '(none)';
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.ledgerEvent.findMany({
      where: { source: 'gmail', tombstonedAt: null },
      select: { id: true, eventType: true, occurredAt: true, sourceId: true, payload: true },
      orderBy: { occurredAt: 'desc' },
    });
    console.log(`TOTAL gmail ledger rows: ${rows.length}`);
    const types = {};
    for (const r of rows) types[r.eventType] = (types[r.eventType] || 0) + 1;
    console.log(`eventTypes: ${JSON.stringify(types)}`);
    const dates = rows.map((r) => r.occurredAt.toISOString().slice(0, 10)).sort();
    console.log(`date range: ${dates[0]} .. ${dates[dates.length - 1]}`);
    const since = new Date('2026-05-01T00:00:00Z');
    const recent = rows.filter((r) => r.occurredAt >= since);
    console.log(`rows occurredAt >= 2026-05-01: ${recent.length}`);

    const only = process.argv[2];
    const scope = process.argv[3] === 'all' ? rows : recent;
    for (const [name, re] of Object.entries(GROUPS)) {
      if (only && only !== 'ALL' && only !== name) continue;
      const hits = scope.filter((r) => {
        const p = r.payload || {};
        return re.test(`${p.subject || ''} ${p.from || ''} ${p.to || ''} ${p.snippet || ''}`);
      });
      console.log(`\n##### ${name.toUpperCase()} — ${hits.length} hit(s)`);
      for (const r of hits) {
        const p = r.payload || {};
        console.log(
          `- ${r.occurredAt.toISOString().slice(0, 10)} | thread=${r.sourceId} | msgs=${p.messageCount} | ` +
            `fromDomain=${domainOf(p.from)} | toDomain=${domainOf(p.to)} | parties=${domainOf((p.participants || []).join(' '))}`
        );
        console.log(`  SUBJ: ${String(p.subject || '').slice(0, 160)}`);
        console.log(`  SNIP: ${String(p.snippet || '').replace(/\s+/g, ' ').slice(0, 400)}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});
