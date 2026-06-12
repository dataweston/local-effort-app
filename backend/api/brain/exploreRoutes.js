/**
 * Brain explore routes — self-serve querying for the /brain maintenance bench.
 *
 * POST /api/brain/query  — structured query over whitelisted datasets.
 *   body: {
 *     dataset:  'entities' | 'assertions' | 'ledger' | 'inferences' | 'inbox',
 *     filters:  [{ field, op: 'equals'|'contains'|'gte'|'lte'|'not_equals', value }],
 *     groupBy:  ['field' | { field, bucket: 'day'|'week'|'month' }],   // optional
 *     sort:     'field' (rows mode) — defaults per dataset,
 *     order:    'asc'|'desc',
 *     limit:    number (<= 2000)
 *   }
 *   Rows mode (no groupBy): returns raw rows with the dataset's columns.
 *   Group mode: returns one row per group with count (+ avg of numeric cols).
 *
 * GET /api/brain/graph — nodes + edges for the graph view.
 *   query: type, q, limit
 *
 * All identifiers are resolved through hardcoded whitelists; user values only
 * ever enter the SQL as bound parameters.
 */

const { Prisma } = require('@prisma/client');
const { getPrisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');

const verifyAdminRequest = createAdminVerifier();

// ── Dataset definitions ───────────────────────────────────────────────────────
// columns: exposed field name → SQL expression (trusted, hardcoded).

const DATASETS = {
  entities: {
    from: '"BrainEntity" e',
    base: 'e."tombstonedAt" IS NULL',
    columns: {
      type: 'e."entityType"',
      name: 'e.name',
      status: 'e.status',
      createdAt: 'e."createdAt"',
      updatedAt: 'e."updatedAt"',
    },
    dateFields: ['createdAt', 'updatedAt'],
    numericFields: [],
    defaultSort: 'updatedAt',
  },
  assertions: {
    from: '"BrainAssertion" a JOIN "BrainEntity" s ON s.id = a."srcId" JOIN "BrainEntity" d ON d.id = a."dstId"',
    base: 'a."retractedAt" IS NULL',
    columns: {
      relType: 'a."relType"',
      srcType: 's."entityType"',
      srcName: 's.name',
      dstType: 'd."entityType"',
      dstName: 'd.name',
      sourceType: 'a."sourceType"',
      createdBy: 'a."createdBy"',
      provisional: 'a.provisional',
      confidence: 'a.confidence',
      createdAt: 'a."createdAt"',
    },
    dateFields: ['createdAt'],
    numericFields: ['confidence'],
    booleanFields: ['provisional'],
    defaultSort: 'createdAt',
  },
  ledger: {
    from: '"LedgerEvent" l',
    base: 'l."tombstonedAt" IS NULL',
    columns: {
      eventType: 'l."eventType"',
      source: 'l.source',
      sourceId: 'l."sourceId"',
      actorType: 'l."actorType"',
      occurredAt: 'l."occurredAt"',
      amountCents: "NULLIF(l.payload->>'amountCents','')::numeric",
      payloadText: 'l.payload::text',
    },
    dateFields: ['occurredAt'],
    numericFields: ['amountCents'],
    defaultSort: 'occurredAt',
  },
  inferences: {
    from: '"BrainInference" i JOIN "BrainEntity" e ON e.id = i."srcId"',
    base: 'TRUE',
    columns: {
      type: 'i."inferenceType"',
      entityName: 'e.name',
      entityType: 'e."entityType"',
      confidence: 'i.confidence',
      summary: 'i.summary',
      computedAt: 'i."computedAt"',
      active: '(i."knownUntil" IS NULL AND i."supersededBy" IS NULL)',
    },
    dateFields: ['computedAt'],
    numericFields: ['confidence'],
    booleanFields: ['active'],
    defaultSort: 'computedAt',
  },
  inbox: {
    from: '"BrainInboxItem" b',
    base: 'TRUE',
    columns: {
      status: 'b.status',
      source: 'b.source',
      content: 'b."rawContent"',
      capturedAt: 'b."capturedAt"',
      processedAt: 'b."processedAt"',
    },
    dateFields: ['capturedAt', 'processedAt'],
    numericFields: [],
    defaultSort: 'capturedAt',
  },
};

const OPS = {
  equals: (expr, value) => Prisma.sql`${expr} = ${value}`,
  not_equals: (expr, value) => Prisma.sql`${expr} <> ${value}`,
  contains: (expr, value) => Prisma.sql`${expr}::text ILIKE ${'%' + value + '%'}`,
  gte: (expr, value) => Prisma.sql`${expr} >= ${value}`,
  lte: (expr, value) => Prisma.sql`${expr} <= ${value}`,
};

const BUCKETS = new Set(['day', 'week', 'month']);

function columnExpr(ds, field) {
  const sql = ds.columns[field];
  if (!sql) throw new Error(`unknown field: ${field}`);
  return Prisma.raw(sql);
}

function coerceValue(ds, field, op, value) {
  if (ds.dateFields?.includes(field) && (op === 'gte' || op === 'lte' || op === 'equals')) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new Error(`invalid date for ${field}`);
    return d;
  }
  if (ds.numericFields?.includes(field)) {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error(`invalid number for ${field}`);
    return n;
  }
  if (ds.booleanFields?.includes(field)) {
    return value === true || value === 'true';
  }
  return String(value);
}

function buildWhere(ds, filters) {
  const parts = [Prisma.raw(ds.base)];
  for (const f of filters || []) {
    if (!f || !f.field || !OPS[f.op]) continue;
    const expr = columnExpr(ds, f.field);
    const value = coerceValue(ds, f.field, f.op, f.value);
    parts.push(OPS[f.op](expr, value));
  }
  return Prisma.join(parts, ' AND ');
}

function registerExploreRoutes(app, { logger } = {}) {
  const prisma = getPrisma();

  app.post('/api/brain/query', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { dataset, filters = [], groupBy = [], sort, order = 'desc' } = req.body || {};
      const ds = DATASETS[dataset];
      if (!ds) return res.status(400).json({ error: `dataset must be one of: ${Object.keys(DATASETS).join(', ')}` });

      const limit = Math.min(Math.max(parseInt(req.body?.limit) || 200, 1), 2000);
      const where = buildWhere(ds, filters);
      const dir = order === 'asc' ? Prisma.raw('ASC') : Prisma.raw('DESC');

      if (groupBy.length > 0) {
        // Group mode — count per group, plus avg of any numeric columns.
        const groupSelects = [];
        for (const g of groupBy.slice(0, 3)) {
          const field = typeof g === 'string' ? g : g?.field;
          const bucket = typeof g === 'object' && g?.bucket ? g.bucket : null;
          const expr = columnExpr(ds, field);
          if (bucket) {
            if (!BUCKETS.has(bucket)) return res.status(400).json({ error: 'bucket must be day|week|month' });
            if (!ds.dateFields?.includes(field)) return res.status(400).json({ error: `${field} is not a date field` });
            groupSelects.push({ alias: `${field}_${bucket}`, sql: Prisma.sql`date_trunc(${bucket}, ${expr})` });
          } else {
            groupSelects.push({ alias: field, sql: expr });
          }
        }
        if (!groupSelects.length) return res.status(400).json({ error: 'groupBy fields invalid' });

        const aggSelects = [Prisma.sql`COUNT(*)::int AS count`];
        for (const numField of ds.numericFields || []) {
          aggSelects.push(Prisma.sql`ROUND(AVG(${columnExpr(ds, numField)})::numeric, 3) AS ${Prisma.raw(`"avg_${numField}"`)}`);
          aggSelects.push(Prisma.sql`ROUND(SUM(${columnExpr(ds, numField)})::numeric, 2) AS ${Prisma.raw(`"sum_${numField}"`)}`);
        }

        const selectList = Prisma.join(
          [...groupSelects.map((g) => Prisma.sql`${g.sql} AS ${Prisma.raw(`"${g.alias}"`)}`), ...aggSelects],
          ', '
        );
        const groupRefs = Prisma.join(groupSelects.map((_, i) => Prisma.raw(String(i + 1))), ', ');

        const rows = await prisma.$queryRaw(Prisma.sql`
          SELECT ${selectList}
          FROM ${Prisma.raw(ds.from)}
          WHERE ${where}
          GROUP BY ${groupRefs}
          ORDER BY count ${dir}
          LIMIT ${limit}
        `);
        return res.json({ ok: true, mode: 'group', columns: [...groupSelects.map((g) => g.alias), 'count', ...((ds.numericFields || []).flatMap((f) => [`avg_${f}`, `sum_${f}`]))], rows });
      }

      // Rows mode
      const sortField = ds.columns[sort] ? sort : ds.defaultSort;
      const selectList = Prisma.join(
        Object.entries(ds.columns).map(([alias, sql]) => Prisma.sql`${Prisma.raw(sql)} AS ${Prisma.raw(`"${alias}"`)}`),
        ', '
      );
      const rows = await prisma.$queryRaw(Prisma.sql`
        SELECT ${selectList}
        FROM ${Prisma.raw(ds.from)}
        WHERE ${where}
        ORDER BY ${columnExpr(ds, sortField)} ${dir} NULLS LAST
        LIMIT ${limit}
      `);
      return res.json({ ok: true, mode: 'rows', columns: Object.keys(ds.columns), rows });
    } catch (err) {
      logger?.error({ err }, 'brain/query error');
      return res.status(400).json({ error: err.message || 'query failed' });
    }
  });

  // GET /api/brain/query/schema — field metadata so the UI can render pickers
  app.get('/api/brain/query/schema', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });
      const schema = Object.fromEntries(Object.entries(DATASETS).map(([name, ds]) => [name, {
        fields: Object.keys(ds.columns),
        dateFields: ds.dateFields || [],
        numericFields: ds.numericFields || [],
        booleanFields: ds.booleanFields || [],
        defaultSort: ds.defaultSort,
      }]));
      return res.json({ ok: true, datasets: schema });
    } catch (err) {
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/graph — nodes + edges among them, for the sigma graph view
  app.get('/api/brain/graph', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { type, q } = req.query;
      const limit = Math.min(parseInt(req.query.limit) || 150, 400);

      const where = { tombstonedAt: null };
      if (type) where.entityType = String(type);
      if (q && String(q).trim()) where.name = { contains: String(q).trim(), mode: 'insensitive' };

      const entities = await prisma.brainEntity.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          entityType: true,
          name: true,
          _count: { select: { srcAssertions: true, dstAssertions: true } },
        },
      });
      const ids = entities.map((e) => e.id);

      const edges = ids.length
        ? await prisma.brainAssertion.findMany({
            where: {
              retractedAt: null,
              knownUntil: null,
              srcId: { in: ids },
              dstId: { in: ids },
            },
            take: 3000,
            select: { id: true, srcId: true, dstId: true, relType: true, provisional: true },
          })
        : [];

      // If the page of entities is sparsely connected, pull in first-degree
      // neighbors of the most-connected nodes so the graph shows structure.
      let neighbors = [];
      if (entities.length && edges.length < entities.length / 2 && !q) {
        const extraEdges = await prisma.brainAssertion.findMany({
          where: {
            retractedAt: null,
            knownUntil: null,
            OR: [{ srcId: { in: ids.slice(0, 50) } }, { dstId: { in: ids.slice(0, 50) } }],
          },
          take: 1500,
          select: { id: true, srcId: true, dstId: true, relType: true, provisional: true },
        });
        const known = new Set(ids);
        const neighborIds = new Set();
        for (const e of extraEdges) {
          if (!known.has(e.srcId)) neighborIds.add(e.srcId);
          if (!known.has(e.dstId)) neighborIds.add(e.dstId);
        }
        neighbors = neighborIds.size
          ? await prisma.brainEntity.findMany({
              where: { id: { in: [...neighborIds].slice(0, 200) }, tombstonedAt: null },
              select: {
                id: true,
                entityType: true,
                name: true,
                _count: { select: { srcAssertions: true, dstAssertions: true } },
              },
            })
          : [];
        const allIds = new Set([...ids, ...neighbors.map((n) => n.id)]);
        for (const e of extraEdges) {
          if (allIds.has(e.srcId) && allIds.has(e.dstId) && !edges.some((x) => x.id === e.id)) {
            edges.push(e);
          }
        }
      }

      const toNode = (e) => ({
        id: e.id,
        entityType: e.entityType,
        name: e.name,
        assertionCount: (e._count?.srcAssertions || 0) + (e._count?.dstAssertions || 0),
      });

      return res.json({
        ok: true,
        nodes: [...entities.map(toNode), ...neighbors.map(toNode)],
        edges: edges.map((e) => ({ id: e.id, source: e.srcId, target: e.dstId, relType: e.relType, provisional: e.provisional })),
      });
    } catch (err) {
      logger?.error({ err }, 'brain/graph error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });
}

module.exports = { registerExploreRoutes };
