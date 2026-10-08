/**
 * Personal vs business scope for purchases (docs/architecture/food-operations-core-plan.md, 4c).
 *
 * Price evidence is valid whoever the purchase was for; scope only drives spend and usage
 * reporting. Nothing here touches cost/price calculations.
 *
 *   effective scope = observation.scope ?? vendorItem.defaultScope ?? null   (null = unassigned)
 *
 * A receipt is the set of observations sharing the receipt part of `sourceKey`
 * (`gmail:<id>:<idx>`, `eml:<date>:<id>:<idx>`, `<prefix>|<orderId>|<idx>`: the trailing index is dropped).
 *
 * Suggestions are computed on read and never stored as decisions: a vendor item with >= 2 owner
 * decisions that all agree suggests that scope. Accepting a suggestion stores it as
 * scopeSource = 'rule', which never counts as owner evidence (no self-reinforcement).
 */
const { z } = require('zod');
const { httpError } = require('./catalog');

const SCOPES = ['business', 'personal'];
const RECEIPT_SOURCES = ['receipt_wedge', 'receipt_eastside', 'vendor_invoice'];
const SUGGESTION_MIN_EVIDENCE = 2;
const MAX_OBSERVATIONS = 20000;

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const scopeValue = z.enum(SCOPES);
const sourceValue = z.enum(RECEIPT_SOURCES);

const listQuerySchema = z.object({
  source: sourceValue.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  scope: z.enum(['unassigned', 'business', 'personal', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

const applyScopeSchema = z
  .object({
    source: sourceValue,
    receiptKey: z.string().trim().min(1),
    scope: scopeValue.nullable().optional(),
    lines: z.array(z.object({ observationId: z.string().min(1), scope: scopeValue.nullable() })).optional(),
  })
  .refine((value) => value.scope !== undefined || (value.lines && value.lines.length > 0), {
    message: 'scope or lines is required',
  });

const acceptSchema = z.object({
  source: sourceValue.optional(),
  receiptKey: z.string().trim().min(1).optional(),
  from: dateString.optional(),
  to: dateString.optional(),
});

const defaultScopeSchema = z.object({ scope: scopeValue.nullable() });

/** `gmail:abc:3` -> `gmail:abc`; `meadowlark|1001|2` -> `meadowlark|1001`; no trailing index -> unchanged. */
function receiptKeyOf(sourceKey) {
  const match = /^(.*)[:|]\d+$/.exec(String(sourceKey));
  return match ? match[1] : String(sourceKey);
}

function lineIndexOf(sourceKey) {
  const match = /[:|](\d+)$/.exec(String(sourceKey));
  return match ? Number(match[1]) : 0;
}

const isoDate = (value) => (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);

function lineTotalCents(observation) {
  if (observation.lineTotalCents !== null && observation.lineTotalCents !== undefined) return observation.lineTotalCents;
  const quantity = observation.quantity === null || observation.quantity === undefined ? null : Number(observation.quantity);
  return quantity && quantity > 0 ? Math.round(observation.packCostCents * quantity) : observation.packCostCents;
}

/** Observation decision first, then the owner's per-item default. `origin` says which one decided. */
function effectiveScope(observation, vendorItem) {
  if (observation.scope) {
    return { scope: observation.scope, origin: observation.scopeSource === 'rule' ? 'suggestion' : 'owner' };
  }
  if (vendorItem?.defaultScope) return { scope: vendorItem.defaultScope, origin: 'default' };
  return { scope: null, origin: null };
}

/**
 * decisionCounts = [{ vendorItemId, scope, count }] over OWNER decisions only.
 * Returns Map<vendorItemId, { scope, evidence }> for items whose owner decisions all agree.
 */
function buildSuggestions(decisionCounts) {
  const byItem = new Map();
  for (const row of decisionCounts) {
    if (!SCOPES.includes(row.scope) || !(row.count > 0)) continue;
    const entry = byItem.get(row.vendorItemId) || {};
    entry[row.scope] = (entry[row.scope] || 0) + row.count;
    byItem.set(row.vendorItemId, entry);
  }
  const suggestions = new Map();
  for (const [vendorItemId, counts] of byItem) {
    const scopes = Object.keys(counts);
    if (scopes.length === 1 && counts[scopes[0]] >= SUGGESTION_MIN_EVIDENCE) {
      suggestions.set(vendorItemId, { scope: scopes[0], evidence: counts[scopes[0]] });
    }
  }
  return suggestions;
}

function statusOf(counts) {
  const assigned = counts.business + counts.personal;
  if (assigned === 0) return 'unassigned';
  if (counts.unassigned > 0) return 'partial';
  if (counts.business > 0 && counts.personal > 0) return 'mixed';
  return counts.business > 0 ? 'business' : 'personal';
}

/**
 * Pure grouping. observations carry a `vendorItem` { vendorName, description, defaultScope }.
 * Receipts come back newest first; lines in receipt order.
 */
function buildReceipts(observations, suggestions = new Map()) {
  const groups = new Map();
  for (const observation of observations) {
    const receiptKey = receiptKeyOf(observation.sourceKey);
    const id = `${observation.source}\u0000${receiptKey}`;
    if (!groups.has(id)) groups.set(id, { source: observation.source, receiptKey, rows: [] });
    groups.get(id).rows.push(observation);
  }
  const receipts = [];
  for (const group of groups.values()) {
    group.rows.sort((a, b) => lineIndexOf(a.sourceKey) - lineIndexOf(b.sourceKey));
    const counts = { business: 0, personal: 0, unassigned: 0 };
    const cents = { business: 0, personal: 0, unassigned: 0 };
    let suggestionCount = 0;
    const lines = group.rows.map((observation) => {
      const resolved = effectiveScope(observation, observation.vendorItem);
      const total = lineTotalCents(observation);
      const bucket = resolved.scope || 'unassigned';
      counts[bucket] += 1;
      cents[bucket] += total;
      const suggestion = resolved.scope ? null : suggestions.get(observation.vendorItemId) || null;
      if (suggestion) suggestionCount += 1;
      return {
        observationId: observation.id,
        vendorItemId: observation.vendorItemId,
        description: observation.vendorItem?.description ?? null,
        quantity: observation.quantity === null || observation.quantity === undefined ? null : Number(observation.quantity),
        unitPriceCents: observation.packCostCents,
        lineTotalCents: total,
        scope: resolved.scope,
        scopeOrigin: resolved.origin,
        defaultScope: observation.vendorItem?.defaultScope ?? null,
        suggestion,
      };
    });
    const first = group.rows[0];
    receipts.push({
      source: group.source,
      receiptKey: group.receiptKey,
      date: isoDate(first.observedAt),
      vendor: first.vendorItem?.vendorName ?? null,
      totalCents: cents.business + cents.personal + cents.unassigned,
      lineCount: lines.length,
      status: statusOf(counts),
      counts,
      cents,
      suggestionCount,
      lines,
    });
  }
  receipts.sort((a, b) => (a.date === b.date ? a.receiptKey.localeCompare(b.receiptKey) : a.date < b.date ? 1 : -1));
  return receipts;
}

function receiptMatchesScope(receipt, scope) {
  if (scope === 'all') return true;
  if (scope === 'unassigned') return receipt.counts.unassigned > 0;
  return receipt.counts[scope] > 0;
}

function summarizeTotals(receipts) {
  const totals = { receipts: receipts.length, lines: 0, assignedLines: 0, unassignedLines: 0, businessCents: 0, personalCents: 0, unassignedCents: 0, suggestions: 0 };
  for (const receipt of receipts) {
    totals.lines += receipt.lineCount;
    totals.assignedLines += receipt.counts.business + receipt.counts.personal;
    totals.unassignedLines += receipt.counts.unassigned;
    totals.businessCents += receipt.cents.business;
    totals.personalCents += receipt.cents.personal;
    totals.unassignedCents += receipt.cents.unassigned;
    totals.suggestions += receipt.suggestionCount;
  }
  return totals;
}

const dayStart = (value) => new Date(`${value}T00:00:00.000Z`);
const dayEnd = (value) => new Date(`${value}T23:59:59.999Z`);

function observationWhere({ source, from, to }) {
  const where = { source: source || { in: RECEIPT_SOURCES } };
  if (from || to) where.observedAt = { ...(from ? { gte: dayStart(from) } : {}), ...(to ? { lte: dayEnd(to) } : {}) };
  return where;
}

const VENDOR_ITEM_SELECT = { vendorName: true, description: true, defaultScope: true };

async function loadSuggestions(prisma, observations) {
  const ids = [...new Set(
    observations
      .filter((row) => !row.scope && !row.vendorItem?.defaultScope)
      .map((row) => row.vendorItemId),
  )];
  if (!ids.length) return new Map();
  const groups = await prisma.costObservation.groupBy({
    by: ['vendorItemId', 'scope'],
    where: { scopeSource: 'owner', vendorItemId: { in: ids } },
    _count: { _all: true },
  });
  return buildSuggestions(groups.map((row) => ({ vendorItemId: row.vendorItemId, scope: row.scope, count: row._count._all })));
}

async function loadReceipts(prisma, where) {
  const observations = await prisma.costObservation.findMany({
    where,
    orderBy: [{ observedAt: 'desc' }, { sourceKey: 'asc' }],
    include: { vendorItem: { select: VENDOR_ITEM_SELECT } },
    take: MAX_OBSERVATIONS + 1,
  });
  const truncated = observations.length > MAX_OBSERVATIONS;
  if (truncated) observations.length = MAX_OBSERVATIONS;
  const suggestions = await loadSuggestions(prisma, observations);
  return { receipts: buildReceipts(observations, suggestions), truncated };
}

/** Receipts for a source/date window. `totals` cover the whole window, not just the scope filter. */
async function listReceipts(prisma, rawQuery = {}) {
  const query = listQuerySchema.parse(rawQuery);
  const { receipts, truncated } = await loadReceipts(prisma, observationWhere(query));
  const matching = receipts.filter((receipt) => receiptMatchesScope(receipt, query.scope));
  return {
    receipts: matching.slice(0, query.limit),
    matched: matching.length,
    totals: summarizeTotals(receipts),
    truncated,
  };
}

async function loadOneReceipt(prisma, source, receiptKey) {
  const observations = await prisma.costObservation.findMany({
    where: { source, sourceKey: { startsWith: receiptKey } },
    orderBy: { sourceKey: 'asc' },
    include: { vendorItem: { select: VENDOR_ITEM_SELECT } },
  });
  const own = observations.filter((row) => receiptKeyOf(row.sourceKey) === receiptKey);
  if (!own.length) throw httpError(404, 'receipt not found');
  const suggestions = await loadSuggestions(prisma, own);
  return { observations: own, receipt: buildReceipts(own, suggestions)[0] };
}

async function getReceipt(prisma, source, receiptKey) {
  return (await loadOneReceipt(prisma, sourceValue.parse(source), receiptKey)).receipt;
}

const clearedData = { scope: null, scopeSource: null, scopeAt: null };
const decisionData = (scope, scopeSource, now) => (scope ? { scope, scopeSource, scopeAt: now } : clearedData);

/**
 * Owner decision for a receipt: `scope` sets every line that is not governed by a vendor-item
 * default (an owner rule is not silently overridden by a receipt-level click), `lines` are explicit
 * per-line overrides that always win. `scope: null` clears. Returns counts; the caller re-reads the receipt.
 */
async function applyReceiptScope(prisma, rawInput, { now = new Date(), ownerReviewService = null } = {}) {
  const input = applyScopeSchema.parse(rawInput);
  const { observations } = await loadOneReceipt(prisma, input.source, input.receiptKey);
  const byId = new Map(observations.map((row) => [row.id, row]));

  const overrides = new Map();
  for (const line of input.lines || []) {
    if (!byId.has(line.observationId)) {
      throw httpError(422, `line ${line.observationId} does not belong to receipt ${input.receiptKey}`);
    }
    if (overrides.has(line.observationId)) throw httpError(422, `line ${line.observationId} listed twice`);
    overrides.set(line.observationId, line.scope);
  }

  if (ownerReviewService && input.scope === undefined && input.lines?.length === 1) {
    const [line] = input.lines;
    const observation = byId.get(line.observationId);
    if (observation && observation.scope === null && ['business', 'personal'].includes(line.scope)) {
      await ownerReviewService.recordReceiptScopeDecision({ observationId: observation.id, scope: line.scope });
      return { source: input.source, receiptKey: input.receiptKey, updated: 1, heldByDefault: 0 };
    }
  }

  const targets = new Map(); // scope|null -> ids
  const add = (scope, id) => {
    const key = scope ?? 'clear';
    if (!targets.has(key)) targets.set(key, []);
    targets.get(key).push(id);
  };
  let heldByDefault = 0;
  if (input.scope !== undefined) {
    for (const row of observations) {
      if (overrides.has(row.id)) continue;
      if (input.scope && !row.scope && row.vendorItem?.defaultScope) {
        heldByDefault += 1;
        continue;
      }
      add(input.scope, row.id);
    }
  }
  for (const [id, scope] of overrides) add(scope, id);

  const operations = [...targets].map(([key, ids]) => prisma.costObservation.updateMany({
    where: { id: { in: ids } },
    data: decisionData(key === 'clear' ? null : key, 'owner', now),
  }));
  if (operations.length) await prisma.$transaction(operations);
  const updated = [...targets.values()].reduce((sum, ids) => sum + ids.length, 0);
  return { source: input.source, receiptKey: input.receiptKey, updated, heldByDefault };
}

/**
 * Store the current suggestions for lines that are still unassigned. Only rows whose scope is
 * still NULL are written (the where clause re-checks it), so an owner decision is never overwritten.
 * Stored with scopeSource = 'rule' so accepted suggestions never count as owner evidence.
 */
async function acceptSuggestions(prisma, rawInput = {}, { now = new Date() } = {}) {
  const input = acceptSchema.parse(rawInput);
  let receipts;
  if (input.receiptKey) {
    if (!input.source) throw httpError(422, 'source is required with receiptKey');
    receipts = [await getReceipt(prisma, input.source, input.receiptKey)];
  } else {
    receipts = (await loadReceipts(prisma, observationWhere(input))).receipts;
  }
  const idsByScope = { business: [], personal: [] };
  for (const receipt of receipts) {
    for (const line of receipt.lines) {
      if (!line.scope && line.suggestion) idsByScope[line.suggestion.scope].push(line.observationId);
    }
  }
  const result = { accepted: 0, business: 0, personal: 0 };
  for (const scope of SCOPES) {
    if (!idsByScope[scope].length) continue;
    const { count } = await prisma.costObservation.updateMany({
      where: { id: { in: idsByScope[scope] }, scope: null },
      data: decisionData(scope, 'rule', now),
    });
    result[scope] = count;
    result.accepted += count;
  }
  return result;
}

/** Owner rule: 'always business / personal for this item' (null removes the rule). */
async function setDefaultScope(prisma, vendorItemId, rawInput) {
  const { scope } = defaultScopeSchema.parse(rawInput);
  const existing = await prisma.vendorItem.findUnique({ where: { id: vendorItemId }, select: { id: true } });
  if (!existing) throw httpError(404, 'vendor item not found');
  return prisma.vendorItem.update({
    where: { id: vendorItemId },
    data: { defaultScope: scope },
    select: { id: true, description: true, defaultScope: true },
  });
}

/** Pure: counts and cents by source x effective scope (unassigned included). */
function summarizeScopes(observations) {
  const table = new Map();
  for (const observation of observations) {
    const scope = effectiveScope(observation, observation.vendorItem).scope || 'unassigned';
    const key = `${observation.source}\u0000${scope}`;
    const row = table.get(key) || { source: observation.source, scope, lines: 0, cents: 0 };
    row.lines += 1;
    row.cents += lineTotalCents(observation);
    table.set(key, row);
  }
  const order = { business: 0, personal: 1, unassigned: 2 };
  return [...table.values()].sort((a, b) => (a.source === b.source ? order[a.scope] - order[b.scope] : a.source.localeCompare(b.source)));
}

async function scopeSummary(prisma, { source } = {}) {
  const observations = await prisma.costObservation.findMany({
    where: source ? { source } : undefined,
    select: {
      source: true,
      packCostCents: true,
      quantity: true,
      lineTotalCents: true,
      scope: true,
      scopeSource: true,
      vendorItem: { select: { defaultScope: true } },
    },
  });
  return summarizeScopes(observations);
}

module.exports = {
  RECEIPT_SOURCES,
  SCOPES,
  SUGGESTION_MIN_EVIDENCE,
  acceptSuggestions,
  applyReceiptScope,
  buildReceipts,
  buildSuggestions,
  effectiveScope,
  getReceipt,
  lineTotalCents,
  listReceipts,
  receiptKeyOf,
  scopeSummary,
  setDefaultScope,
  summarizeScopes,
};
