import { describe, expect, it } from 'vitest';
import {
  acceptSuggestions,
  applyReceiptScope,
  buildReceipts,
  buildSuggestions,
  effectiveScope,
  getReceipt,
  listReceipts,
  receiptKeyOf,
  scopeSummary,
  setDefaultScope,
  summarizeScopes,
} from '../receiptScope';

const NOW = new Date('2026-10-08T12:00:00.000Z');

function fakePrisma({ vendorItems, observations }) {
  const items = new Map(vendorItems.map((item) => [item.id, { defaultScope: null, vendorName: 'Test Co-op', ...item }]));
  const rows = observations.map((row, index) => ({
    id: row.id || `o${index}`,
    quantity: null,
    lineTotalCents: null,
    scope: null,
    scopeSource: null,
    scopeAt: null,
    ...row,
  }));
  const withItem = (row) => ({ ...row, vendorItem: items.get(row.vendorItemId) });
  const matches = (row, where = {}) => {
    if (where.source) {
      if (typeof where.source === 'string' ? row.source !== where.source : !where.source.in.includes(row.source)) return false;
    }
    if (where.sourceKey?.startsWith && !row.sourceKey.startsWith(where.sourceKey.startsWith)) return false;
    if (where.observedAt?.gte && row.observedAt < where.observedAt.gte) return false;
    if (where.observedAt?.lte && row.observedAt > where.observedAt.lte) return false;
    if (where.scopeSource && row.scopeSource !== where.scopeSource) return false;
    if (where.vendorItemId?.in && !where.vendorItemId.in.includes(row.vendorItemId)) return false;
    if (where.id?.in && !where.id.in.includes(row.id)) return false;
    if (where.scope === null && row.scope !== null) return false;
    return true;
  };
  const calls = { updateMany: [] };
  return {
    rows,
    items,
    calls,
    costObservation: {
      findMany: async ({ where }) => rows.filter((row) => matches(row, where)).map(withItem),
      groupBy: async ({ where }) => {
        const counts = new Map();
        for (const row of rows.filter((r) => matches(r, where) && r.scope)) {
          const key = `${row.vendorItemId}|${row.scope}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        return [...counts].map(([key, count]) => {
          const [vendorItemId, scope] = key.split('|');
          return { vendorItemId, scope, _count: { _all: count } };
        });
      },
      updateMany: async ({ where, data }) => {
        calls.updateMany.push({ where, data });
        const hit = rows.filter((row) => matches(row, where));
        for (const row of hit) Object.assign(row, data);
        return { count: hit.length };
      },
    },
    vendorItem: {
      findUnique: async ({ where }) => (items.has(where.id) ? { id: where.id } : null),
      update: async ({ where, data }) => {
        Object.assign(items.get(where.id), data);
        const { id, description, defaultScope } = items.get(where.id);
        return { id, description, defaultScope };
      },
    },
    $transaction: async (operations) => Promise.all(operations),
  };
}

const D1 = new Date('2026-05-02T00:00:00.000Z');
const D2 = new Date('2026-05-09T00:00:00.000Z');

function world(extraObservations = []) {
  return fakePrisma({
    vendorItems: [
      { id: 'milk', description: 'Milk 1 gal' },
      { id: 'beer', description: 'Test IPA 6pk' },
      { id: 'flour', description: 'Flour 5 lb' },
    ],
    observations: [
      { id: 'a0', vendorItemId: 'milk', source: 'receipt_wedge', sourceKey: 'gmail:aaa:0', observedAt: D1, packCostCents: 500 },
      { id: 'a1', vendorItemId: 'beer', source: 'receipt_wedge', sourceKey: 'gmail:aaa:1', observedAt: D1, packCostCents: 1200 },
      { id: 'a2', vendorItemId: 'flour', source: 'receipt_wedge', sourceKey: 'gmail:aaa:2', observedAt: D1, packCostCents: 300, quantity: 2 },
      { id: 'b0', vendorItemId: 'milk', source: 'receipt_wedge', sourceKey: 'gmail:aaa1:0', observedAt: D2, packCostCents: 450 },
      ...extraObservations,
    ],
  });
}

describe('receiptKeyOf', () => {
  it('drops the trailing line index for every source key shape', () => {
    expect(receiptKeyOf('gmail:abc123:7')).toBe('gmail:abc123');
    expect(receiptKeyOf('eml:2024-06-03:123456:0')).toBe('eml:2024-06-03:123456');
    expect(receiptKeyOf('meadowlark|1001|12')).toBe('meadowlark|1001');
    expect(receiptKeyOf('no-index')).toBe('no-index');
  });
});

describe('effective scope and suggestions', () => {
  it('lets an observation decision beat the item default, and a default beat nothing', () => {
    expect(effectiveScope({ scope: 'business', scopeSource: 'owner' }, { defaultScope: 'personal' })).toEqual({ scope: 'business', origin: 'owner' });
    expect(effectiveScope({ scope: null }, { defaultScope: 'personal' })).toEqual({ scope: 'personal', origin: 'default' });
    expect(effectiveScope({ scope: null }, { defaultScope: null })).toEqual({ scope: null, origin: null });
    expect(effectiveScope({ scope: 'personal', scopeSource: 'rule' }, null).origin).toBe('suggestion');
  });

  it('suggests only when at least two owner decisions all agree', () => {
    const map = buildSuggestions([
      { vendorItemId: 'one', scope: 'business', count: 1 },
      { vendorItemId: 'two', scope: 'personal', count: 3 },
      { vendorItemId: 'mixed', scope: 'personal', count: 5 },
      { vendorItemId: 'mixed', scope: 'business', count: 1 },
    ]);
    expect([...map.keys()]).toEqual(['two']);
    expect(map.get('two')).toEqual({ scope: 'personal', evidence: 3 });
  });
});

describe('buildReceipts', () => {
  it('does not merge receipts whose ids share a prefix, and computes status and money by effective scope', () => {
    const db = world();
    db.rows[0].scope = 'business';
    db.rows[0].scopeSource = 'owner';
    db.items.get('beer').defaultScope = 'personal';
    const receipts = buildReceipts(db.rows.map((row) => ({ ...row, vendorItem: db.items.get(row.vendorItemId) })));
    expect(receipts.map((r) => r.receiptKey)).toEqual(['gmail:aaa1', 'gmail:aaa']); // newest first
    const first = receipts[1];
    expect(first.lineCount).toBe(3);
    expect(first.totalCents).toBe(500 + 1200 + 600); // flour: 2 x 300 without a stored line total
    expect(first.cents).toEqual({ business: 500, personal: 1200, unassigned: 600 });
    expect(first.status).toBe('partial');
    expect(first.lines.map((l) => l.scopeOrigin)).toEqual(['owner', 'default', null]);
  });
});

describe('listReceipts', () => {
  it('defaults to nothing hidden, filters by scope, and keeps progress totals over the whole window', async () => {
    const db = world();
    db.rows[0].scope = 'business';
    db.rows[0].scopeSource = 'owner';
    db.rows[1].scope = 'personal';
    db.rows[1].scopeSource = 'owner';
    db.rows[2].scope = 'business';
    db.rows[2].scopeSource = 'owner';

    const unassigned = await listReceipts(db, { source: 'receipt_wedge', scope: 'unassigned' });
    expect(unassigned.receipts.map((r) => r.receiptKey)).toEqual(['gmail:aaa1']);
    expect(unassigned.matched).toBe(1);
    expect(unassigned.totals).toMatchObject({ receipts: 2, lines: 4, assignedLines: 3, unassignedLines: 1, businessCents: 500 + 600, personalCents: 1200, unassignedCents: 450 });

    const personal = await listReceipts(db, { source: 'receipt_wedge', scope: 'personal' });
    expect(personal.receipts.map((r) => r.receiptKey)).toEqual(['gmail:aaa']);

    const windowed = await listReceipts(db, { source: 'receipt_wedge', from: '2026-05-05', to: '2026-05-31' });
    expect(windowed.receipts.map((r) => r.receiptKey)).toEqual(['gmail:aaa1']);
  });

  it('suggests a scope only after repeated agreeing owner decisions, and never over a default or decision', async () => {
    const db = world([
      { id: 'c0', vendorItemId: 'milk', source: 'receipt_wedge', sourceKey: 'gmail:ccc:0', observedAt: new Date('2026-04-20T00:00:00.000Z'), packCostCents: 480, scope: 'business', scopeSource: 'owner', scopeAt: NOW },
      { id: 'd0', vendorItemId: 'milk', source: 'receipt_wedge', sourceKey: 'gmail:ddd:0', observedAt: new Date('2026-04-21T00:00:00.000Z'), packCostCents: 470, scope: 'business', scopeSource: 'owner', scopeAt: NOW },
      { id: 'e0', vendorItemId: 'beer', source: 'receipt_wedge', sourceKey: 'gmail:eee:0', observedAt: new Date('2026-04-22T00:00:00.000Z'), packCostCents: 1100, scope: 'personal', scopeSource: 'owner', scopeAt: NOW },
    ]);
    const { receipts } = await listReceipts(db, { source: 'receipt_wedge', scope: 'unassigned' });
    const lines = Object.fromEntries(receipts.flatMap((r) => r.lines).map((l) => [l.observationId, l]));
    expect(lines.a0.suggestion).toEqual({ scope: 'business', evidence: 2 });
    expect(lines.b0.suggestion).toEqual({ scope: 'business', evidence: 2 });
    expect(lines.a1.suggestion).toBeNull(); // only one owner decision for beer
    db.items.get('milk').defaultScope = 'personal';
    const withDefault = await listReceipts(db, { source: 'receipt_wedge', scope: 'all' });
    const milk = withDefault.receipts.flatMap((r) => r.lines).find((l) => l.observationId === 'a0');
    expect(milk).toMatchObject({ scope: 'personal', scopeOrigin: 'default', suggestion: null });
  });

  it('rejects a source that has no receipts', async () => {
    await expect(listReceipts(world(), { source: 'manual' })).rejects.toMatchObject({ name: 'ZodError' });
  });
});

describe('applyReceiptScope', () => {
  it('sets every line as an owner decision, with per-line overrides winning', async () => {
    const db = world();
    const result = await applyReceiptScope(db, {
      source: 'receipt_wedge',
      receiptKey: 'gmail:aaa',
      scope: 'business',
      lines: [{ observationId: 'a1', scope: 'personal' }],
    }, { now: NOW });
    expect(result).toMatchObject({ updated: 3, heldByDefault: 0 });
    expect(db.rows.slice(0, 3).map((r) => [r.scope, r.scopeSource])).toEqual([['business', 'owner'], ['personal', 'owner'], ['business', 'owner']]);
    expect(db.rows[0].scopeAt).toEqual(NOW);
    expect(db.rows[3].scope).toBeNull(); // gmail:aaa1 shares only a prefix with gmail:aaa
  });

  it('lets a receipt-level choice leave default-governed lines to their rule, but still honors an explicit line override', async () => {
    const db = world();
    db.items.get('beer').defaultScope = 'personal';
    const first = await applyReceiptScope(db, { source: 'receipt_wedge', receiptKey: 'gmail:aaa', scope: 'business' }, { now: NOW });
    expect(first).toMatchObject({ updated: 2, heldByDefault: 1 });
    expect(db.rows[1].scope).toBeNull();
    await applyReceiptScope(db, { source: 'receipt_wedge', receiptKey: 'gmail:aaa', lines: [{ observationId: 'a1', scope: 'business' }] }, { now: NOW });
    expect(db.rows[1]).toMatchObject({ scope: 'business', scopeSource: 'owner' });
  });

  it('clears decisions with null', async () => {
    const db = world();
    await applyReceiptScope(db, { source: 'receipt_wedge', receiptKey: 'gmail:aaa', scope: 'personal' }, { now: NOW });
    await applyReceiptScope(db, { source: 'receipt_wedge', receiptKey: 'gmail:aaa', scope: null }, { now: NOW });
    expect(db.rows.slice(0, 3).every((r) => r.scope === null && r.scopeSource === null && r.scopeAt === null)).toBe(true);
  });

  it('rejects unknown receipts, foreign line ids, bad scopes and empty requests without writing', async () => {
    const db = world();
    await expect(applyReceiptScope(db, { source: 'receipt_wedge', receiptKey: 'gmail:nope', scope: 'business' })).rejects.toMatchObject({ statusCode: 404 });
    await expect(applyReceiptScope(db, { source: 'receipt_wedge', receiptKey: 'gmail:aaa', lines: [{ observationId: 'b0', scope: 'business' }] })).rejects.toMatchObject({ statusCode: 422 });
    await expect(applyReceiptScope(db, { source: 'receipt_wedge', receiptKey: 'gmail:aaa', scope: 'both' })).rejects.toMatchObject({ name: 'ZodError' });
    await expect(applyReceiptScope(db, { source: 'receipt_wedge', receiptKey: 'gmail:aaa' })).rejects.toMatchObject({ name: 'ZodError' });
    expect(db.calls.updateMany).toEqual([]);
  });
});

describe('acceptSuggestions', () => {
  const evidence = [
    { id: 'c0', vendorItemId: 'milk', source: 'receipt_wedge', sourceKey: 'gmail:ccc:0', observedAt: new Date('2026-04-20T00:00:00.000Z'), packCostCents: 480, scope: 'business', scopeSource: 'owner', scopeAt: NOW },
    { id: 'd0', vendorItemId: 'milk', source: 'receipt_wedge', sourceKey: 'gmail:ddd:0', observedAt: new Date('2026-04-21T00:00:00.000Z'), packCostCents: 470, scope: 'business', scopeSource: 'owner', scopeAt: NOW },
  ];

  it('writes only still-unassigned suggested lines and stores them as rule decisions', async () => {
    const db = world(evidence);
    db.rows[3].scope = 'personal'; // b0 already holds an accepted (rule) decision
    db.rows[3].scopeSource = 'rule';
    const result = await acceptSuggestions(db, { source: 'receipt_wedge' }, { now: NOW });
    expect(result).toEqual({ accepted: 1, business: 1, personal: 0 });
    expect(db.rows[0]).toMatchObject({ scope: 'business', scopeSource: 'rule' });
    expect(db.rows[3]).toMatchObject({ scope: 'personal', scopeSource: 'rule' });
    expect(db.rows[1].scope).toBeNull();
  });

  it('never overwrites an owner decision recorded between the read and the write', async () => {
    const db = world(evidence);
    const read = db.costObservation.groupBy;
    db.costObservation.groupBy = async (args) => {
      const groups = await read(args);
      db.rows[0].scope = 'personal'; // owner decides in another tab after the suggestions were computed
      db.rows[0].scopeSource = 'owner';
      return groups;
    };
    const result = await acceptSuggestions(db, { source: 'receipt_wedge' }, { now: NOW });
    expect(result.accepted).toBe(1); // b0 only
    expect(db.rows[0]).toMatchObject({ scope: 'personal', scopeSource: 'owner' });
    expect(db.rows[3]).toMatchObject({ scope: 'business', scopeSource: 'rule' });
  });

  it('does not let accepted suggestions count as owner evidence for further suggestions', async () => {
    const db = world([evidence[0], { ...evidence[1], scope: null, scopeSource: null, scopeAt: null }]);
    expect((await listReceipts(db, { source: 'receipt_wedge' })).totals.suggestions).toBe(0); // one owner decision only
    db.rows.find((r) => r.id === 'd0').scope = 'business';
    db.rows.find((r) => r.id === 'd0').scopeSource = 'rule';
    expect((await listReceipts(db, { source: 'receipt_wedge' })).totals.suggestions).toBe(0);
  });

  it('can be limited to one receipt', async () => {
    const db = world(evidence);
    const result = await acceptSuggestions(db, { source: 'receipt_wedge', receiptKey: 'gmail:aaa' }, { now: NOW });
    expect(result.accepted).toBe(1);
    expect(db.rows[3].scope).toBeNull();
    expect((await getReceipt(db, 'receipt_wedge', 'gmail:aaa')).lines[0].scope).toBe('business');
  });
});

describe('setDefaultScope', () => {
  it('sets and clears an item rule and 404s on an unknown item', async () => {
    const db = world();
    expect(await setDefaultScope(db, 'beer', { scope: 'personal' })).toMatchObject({ defaultScope: 'personal' });
    expect(db.items.get('beer').defaultScope).toBe('personal');
    expect((await setDefaultScope(db, 'beer', { scope: null })).defaultScope).toBeNull();
    await expect(setDefaultScope(db, 'missing', { scope: 'business' })).rejects.toMatchObject({ statusCode: 404 });
    await expect(setDefaultScope(db, 'beer', { scope: 'maybe' })).rejects.toMatchObject({ name: 'ZodError' });
  });
});

describe('scope summary', () => {
  it('counts lines and cents by source and effective scope, including unassigned', async () => {
    const db = world([{ id: 'v0', vendorItemId: 'flour', source: 'vendor_invoice', sourceKey: 'acme|1|0', observedAt: D2, packCostCents: 1000, lineTotalCents: 4000 }]);
    db.rows[0].scope = 'business';
    db.rows[0].scopeSource = 'owner';
    db.items.get('beer').defaultScope = 'personal';
    const summary = await scopeSummary(db);
    expect(summary).toEqual([
      { source: 'receipt_wedge', scope: 'business', lines: 1, cents: 500 },
      { source: 'receipt_wedge', scope: 'personal', lines: 1, cents: 1200 },
      { source: 'receipt_wedge', scope: 'unassigned', lines: 2, cents: 600 + 450 },
      { source: 'vendor_invoice', scope: 'unassigned', lines: 1, cents: 4000 },
    ]);
    expect(summarizeScopes([])).toEqual([]);
  });
});
