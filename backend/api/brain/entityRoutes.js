/**
 * Entity browser routes.
 *
 * GET  /api/brain/entities        — list entities with assertion counts (admin only)
 * GET  /api/brain/entities/:id    — entity detail with recent assertions
 * POST /api/brain/entities/:id/tombstone — soft-delete an entity
 */

const { getPrisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { RELATIONSHIPS, validateRelationship } = require('./relationshipDictionary');
const { canonicalName: canonicalEntityName, writeLedgerEvent } = require('./ledger');
const { foodNameLooksValid, isFoodFragment, FOOD_ENTITY_TYPES: FOOD_TYPES_LIST } = require('./foodNameValidator');

const verifyAdminRequest = createAdminVerifier();

const VALID_TYPES = [
  // Core operational
  'Vendor', 'Customer', 'Person', 'Menu', 'Dish', 'Ingredient', 'Task', 'Note', 'Event',
  'Shift', 'Resource', 'Group', 'StaffRole',
  'Invoice', 'Payment', 'Order', 'Receipt', 'EmailThread', 'Feedback', 'Decision',
  'ContentArtifact', 'SocialPost',
  'PriceQuote', 'LedgerTransaction', 'PriceReference',
  // Business model
  'BusinessLine', 'Offer', 'Occasion', 'Channel', 'CustomerSegment', 'Campaign',
  // Operations
  'ProcessStep', 'Constraint', 'Asset',
  // Strategy
  'Opportunity', 'Risk', 'Metric', 'NarrativeTheme',
  // Supply
  'Supplier', 'Product',
];
const VALID_SORT = ['name', 'assertionCount', 'updatedAt', 'createdAt'];
const AUTO_CONFIRM_SOURCES = new Set([
  'extract_xlsx_model',
  'extract_static',
  'extract_sanity',
  'extract_square_catalog',
  'extract_orders',
  'extract_january',
  'extract_planner',
  'extract_receipts',
  'extract_square_csv',
  'ledger_event',
  'manual',
]);
const FOOD_ENTITY_TYPES = new Set(['Dish', 'Ingredient', 'Menu']);
const FOOD_NOISE_PATTERNS = [
  /unsubscribe/i,
  /view in browser/i,
  /sent from my iphone/i,
  /do not reply/i,
  /confidential/i,
  /copyright/i,
  /instagram|facebook|linkedin|twitter/i,
  /\bhttps?:\/\//i,
  /\bwww\./i,
];
function compactText(value, max = 900) {
  if (value == null) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

function assertionPattern(assertion) {
  return [
    assertion.relType,
    assertion.src?.entityType || 'Unknown',
    assertion.dst?.entityType || 'Unknown',
    assertion.sourceType || 'unknown',
  ].join('|');
}

function assertionReviewWarnings(assertion) {
  return validateRelationship({
    relType: assertion.relType,
    srcType: assertion.src?.entityType,
    dstType: assertion.dst?.entityType,
    srcId: assertion.srcId,
    dstId: assertion.dstId,
  }).warnings;
}

function structuralWarnings(assertion) {
  return assertionReviewWarnings(assertion).filter(w =>
    w.includes('is not modeled as a self-edge') ||
    w.includes('usually starts from') ||
    w.includes('usually points to')
  );
}

function isTrustedAutoConfirm(assertion) {
  const ledgerSource = assertion.ledgerEvent?.source || '';
  return AUTO_CONFIRM_SOURCES.has(assertion.sourceType) ||
    AUTO_CONFIRM_SOURCES.has(assertion.createdBy) ||
    AUTO_CONFIRM_SOURCES.has(ledgerSource);
}

function sourceSummary(ledgerEvent) {
  if (!ledgerEvent) return null;
  const payload = ledgerEvent.payload || {};
  const subject = payload.subject || payload.emailSubject || payload.title || payload.name || '';
  const snippet = payload.snippet || payload.summary || payload.rawContent || '';
  const body = payload.body || payload.text || payload.excerpt || payload.content || '';
  const rows = payload.row || payload.rows || payload.record || payload.data || null;
  const signals = payload.signals || payload.extractions || payload.items || null;
  const excerpt = compactText([subject, snippet, body].filter(Boolean).join('\n\n') || rows || signals || payload);
  return {
    id: ledgerEvent.id,
    eventType: ledgerEvent.eventType,
    source: ledgerEvent.source,
    sourceId: ledgerEvent.sourceId,
    occurredAt: ledgerEvent.occurredAt,
    subject: compactText(subject, 180),
    excerpt,
    payload,
  };
}

function assertionTouchesFood(assertion) {
  return FOOD_ENTITY_TYPES.has(assertion.src?.entityType) || FOOD_ENTITY_TYPES.has(assertion.dst?.entityType);
}

function collectAssertionText(assertion) {
  const metadata = assertion.metadata || {};
  const payload = assertion.ledgerEvent?.payload || {};
  const toText = (value) => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  };
  return compactText([
    toText(metadata.sourceSpan),
    toText(metadata.notes),
    toText(metadata.rationale),
    toText(payload.subject),
    toText(payload.snippet),
    toText(payload.summary),
    toText(payload.rawContent),
    toText(payload.body),
  ].filter(Boolean).join(' '), 2400);
}

function isFoodParsingNoise(assertion) {
  if (!assertionTouchesFood(assertion)) return false;

  if (FOOD_ENTITY_TYPES.has(assertion.src?.entityType) && !foodNameLooksValid(assertion.src?.name, assertion.src?.entityType)) {
    return { ok: true, reason: `Invalid ${assertion.src?.entityType} name shape: "${compactText(assertion.src?.name, 60)}".` };
  }
  if (FOOD_ENTITY_TYPES.has(assertion.dst?.entityType) && !foodNameLooksValid(assertion.dst?.name, assertion.dst?.entityType)) {
    return { ok: true, reason: `Invalid ${assertion.dst?.entityType} name shape: "${compactText(assertion.dst?.name, 60)}".` };
  }

  const text = collectAssertionText(assertion);
  if (text && FOOD_NOISE_PATTERNS.some(re => re.test(text))) {
    return { ok: true, reason: 'Source text looks like footer/newsletter noise, not menu content.' };
  }
  return { ok: false, reason: '' };
}

function decorateAssertion(assertion) {
  const warnings = assertionReviewWarnings(assertion);
  return {
    ...assertion,
    review: {
      warnings,
      structuralWarnings: structuralWarnings(assertion),
      trustedAutoConfirm: isTrustedAutoConfirm(assertion),
      source: sourceSummary(assertion.ledgerEvent),
    },
  };
}

function compactLedgerPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload || null;
  return {
    ledgerPurpose: payload.ledgerPurpose || null,
    ledgerEntry: payload.ledgerEntry || null,
    definitions: payload.definitions || null,
    basis: payload.basis || null,
    equityTransfers: payload.equityTransfers || null,
    resultingCapitalization: payload.resultingCapitalization || null,
    entityIds: payload.entityIds || null,
    clarificationOfLedgerEventId: payload.clarificationOfLedgerEventId || null,
    clarificationOfLedgerEventIds: payload.clarificationOfLedgerEventIds || null,
  };
}

function automationCandidates(assertions) {
  const confirm = [];
  const retract = [];
  for (const assertion of assertions) {
    const foodNoise = isFoodParsingNoise(assertion);
    if (foodNoise.ok) {
      retract.push({ id: assertion.id, reason: foodNoise.reason });
      continue;
    }

    const bad = structuralWarnings(assertion);
    if (bad.length > 0) {
      retract.push({ id: assertion.id, reason: bad[0] });
      continue;
    }
    if (isTrustedAutoConfirm(assertion)) {
      confirm.push({ id: assertion.id, reason: 'trusted deterministic source with valid relationship shape' });
    }
  }
  return { confirm, retract };
}

function buildReviewSuggestions({ pending, reviewed }) {
  const statsByPattern = new Map();

  for (const assertion of reviewed) {
    const key = assertionPattern(assertion);
    const existing = statsByPattern.get(key) || { confirmed: 0, retracted: 0, total: 0 };
    if (assertion.confirmedAt) existing.confirmed += 1;
    if (assertion.retractedAt) existing.retracted += 1;
    existing.total += 1;
    statsByPattern.set(key, existing);
  }

  const groups = new Map();
  for (const assertion of pending) {
    const key = assertionPattern(assertion);
    const warnings = structuralWarnings(assertion);
    const foodNoise = isFoodParsingNoise(assertion);
    const stats = statsByPattern.get(key) || { confirmed: 0, retracted: 0, total: 0 };
    const confirmRate = stats.total ? stats.confirmed / stats.total : 0;
    const retractRate = stats.total ? stats.retracted / stats.total : 0;

    let action = null;
    let score = 0;
    let reason = '';

    if (foodNoise.ok) {
      action = 'retract';
      score = 0.97;
      reason = foodNoise.reason;
    } else if (warnings.length > 0) {
      action = 'retract';
      score = 0.92;
      reason = warnings[0];
    } else if (isTrustedAutoConfirm(assertion)) {
      action = 'confirm';
      score = 0.93;
      reason = 'Trusted deterministic source with valid relationship shape.';
    } else if (stats.total >= 3 && confirmRate >= 0.85) {
      action = 'confirm';
      score = Math.min(0.98, confirmRate);
      reason = `You confirmed ${stats.confirmed}/${stats.total} reviewed assertions with this pattern.`;
    } else if (stats.total >= 3 && retractRate >= 0.85) {
      action = 'retract';
      score = Math.min(0.98, retractRate);
      reason = `You retracted ${stats.retracted}/${stats.total} reviewed assertions with this pattern.`;
    } else if ((assertion.confidence || 0) >= 0.65) {
      action = 'confirm';
      score = 0.68;
      reason = 'Valid relationship dictionary match with high extraction confidence.';
    }

    if (!action) continue;

    const groupKey = `${action}|${key}|${reason}`;
    const group = groups.get(groupKey) || {
      key: groupKey,
      action,
      relType: assertion.relType,
      srcType: assertion.src?.entityType || 'Unknown',
      dstType: assertion.dst?.entityType || 'Unknown',
      sourceType: assertion.sourceType || 'unknown',
      reason,
      score,
      reviewed: stats,
      assertionIds: [],
      samples: [],
    };

    group.assertionIds.push(assertion.id);
    group.score = Math.max(group.score, score);
    if (group.samples.length < 4) {
      group.samples.push({
        id: assertion.id,
        confidence: assertion.confidence,
        src: assertion.src ? { id: assertion.src.id, entityType: assertion.src.entityType, name: assertion.src.name } : null,
        dst: assertion.dst ? { id: assertion.dst.id, entityType: assertion.dst.entityType, name: assertion.dst.name } : null,
        metadata: assertion.metadata || null,
      });
    }
    groups.set(groupKey, group);
  }

  return [...groups.values()]
    .map(group => ({
      ...group,
      totalCount: group.assertionIds.length,
      assertionIds: group.assertionIds.slice(0, 500),
      count: Math.min(group.assertionIds.length, 500),
    }))
    .sort((a, b) => (b.score - a.score) || (b.count - a.count))
    .slice(0, 12);
}

function registerEntityRoutes(app, { logger } = {}) {
  const prisma = getPrisma();

  // GET /api/brain/entities
  app.get('/api/brain/entities', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const {
        type,
        q,
        sort = 'updatedAt',
        order = 'desc',
        limit = '50',
        offset = '0',
        includeArchived = 'false',
        provisionalOnly = 'false',
        relType,
      } = req.query;

      const take = Math.min(parseInt(limit) || 50, 200);
      const skip = parseInt(offset) || 0;
      const sortField = VALID_SORT.includes(sort) ? sort : 'updatedAt';
      const sortDir = order === 'asc' ? 'asc' : 'desc';

      const where = {};
      if (!JSON.parse(includeArchived)) {
        where.tombstonedAt = null;
      }
      if (type && VALID_TYPES.includes(type)) {
        where.entityType = type;
      }
      if (q && q.trim()) {
        where.name = { contains: q.trim(), mode: 'insensitive' };
      }
      if (JSON.parse(provisionalOnly)) {
        where.OR = [
          { srcAssertions: { some: { provisional: true, retractedAt: null, knownUntil: null } } },
          { dstAssertions: { some: { provisional: true, retractedAt: null, knownUntil: null } } },
        ];
      }
      if (relType && String(relType).trim()) {
        const normalizedRel = String(relType).trim().toUpperCase();
        where.OR = [
          ...(where.OR || []),
          { srcAssertions: { some: { relType: normalizedRel, retractedAt: null, knownUntil: null } } },
          { dstAssertions: { some: { relType: normalizedRel, retractedAt: null, knownUntil: null } } },
        ];
      }

      const orderBy = sortField === 'assertionCount'
        ? { srcAssertions: { _count: sortDir } }
        : { [sortField]: sortDir };

      const [entities, total] = await Promise.all([
        prisma.brainEntity.findMany({
          where,
          orderBy,
          take,
          skip,
          select: {
            id: true,
            entityType: true,
            name: true,
            status: true,
            properties: true,
            createdAt: true,
            updatedAt: true,
            tombstonedAt: true,
            _count: { select: { srcAssertions: true, dstAssertions: true } },
          },
        }),
        prisma.brainEntity.count({ where }),
      ]);

      // Attach last signal date (most recent assertion involving this entity)
      const ids = entities.map(e => e.id);
      const lastSignals = ids.length > 0
        ? await prisma.$queryRaw`
            SELECT DISTINCT ON (x.id) x.id, x."lastSignalAt"
            FROM (
              SELECT a."srcId" AS id, a."createdAt" AS "lastSignalAt"
              FROM "BrainAssertion" a
              WHERE a."srcId" = ANY(${ids})
                AND a."retractedAt" IS NULL
              UNION ALL
              SELECT a."dstId" AS id, a."createdAt" AS "lastSignalAt"
              FROM "BrainAssertion" a
              WHERE a."dstId" = ANY(${ids})
                AND a."retractedAt" IS NULL
            ) x
            ORDER BY x.id, x."lastSignalAt" DESC
          `
        : [];

      const provisionalCounts = ids.length > 0
        ? await prisma.$queryRaw`
            SELECT id, COUNT(*)::int AS "provisionalCount"
            FROM (
              SELECT a."srcId" AS id
              FROM "BrainAssertion" a
              WHERE a."srcId" = ANY(${ids})
                AND a.provisional = true
                AND a."retractedAt" IS NULL
              UNION ALL
              SELECT a."dstId" AS id
              FROM "BrainAssertion" a
              WHERE a."dstId" = ANY(${ids})
                AND a.provisional = true
                AND a."retractedAt" IS NULL
            ) x
            GROUP BY id
          `
        : [];

      const lastSignalMap = Object.fromEntries(lastSignals.map(r => [r.id, r.lastSignalAt]));
      const provisionalMap = Object.fromEntries(provisionalCounts.map(r => [r.id, Number(r.provisionalCount || 0)]));

      const enriched = entities.map(e => ({
        id: e.id,
        entityType: e.entityType,
        name: e.name,
        status: e.status,
        properties: e.properties,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        tombstonedAt: e.tombstonedAt,
        assertionCount: (e._count.srcAssertions || 0) + (e._count.dstAssertions || 0),
        lastSignalAt: lastSignalMap[e.id] || null,
        provisionalCount: provisionalMap[e.id] || 0,
      }));

      return res.json({ ok: true, entities: enriched, total });
    } catch (err) {
      logger?.error({ err }, 'brain: entities list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/entities/:id
  app.get('/api/brain/entities/:id', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const provisionalOnly = String(req.query.provisionalOnly || 'false') === 'true';
      const assertionWhere = provisionalOnly ? { provisional: true, retractedAt: null } : {};
      const entity = await prisma.brainEntity.findUnique({
        where: { id: req.params.id },
        include: {
          srcAssertions: {
            where: assertionWhere,
            orderBy: [{ provisional: 'desc' }, { createdAt: 'desc' }],
            take: provisionalOnly ? 100 : 40,
            include: {
              dst: { select: { id: true, name: true, entityType: true } },
              ledgerEvent: { select: { id: true, eventType: true, source: true, sourceId: true, occurredAt: true, payload: true } },
            },
          },
          dstAssertions: {
            where: assertionWhere,
            orderBy: [{ provisional: 'desc' }, { createdAt: 'desc' }],
            take: provisionalOnly ? 100 : 30,
            include: {
              src: { select: { id: true, name: true, entityType: true } },
              ledgerEvent: { select: { id: true, eventType: true, source: true, sourceId: true, occurredAt: true, payload: true } },
            },
          },
        },
      });

      if (!entity) return res.status(404).json({ error: 'not found' });

      return res.json({
        ok: true,
        entity: {
          ...entity,
          srcAssertions: (entity.srcAssertions || []).map(decorateAssertion),
          dstAssertions: (entity.dstAssertions || []).map(decorateAssertion),
        },
      });
    } catch (err) {
      logger?.error({ err }, 'brain: entity detail error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/entities/:id/tombstone
  app.post('/api/brain/entities/:id/tombstone', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const entity = await prisma.brainEntity.findUnique({ where: { id: req.params.id } });
      if (!entity) return res.status(404).json({ error: 'not found' });

      await prisma.brainEntity.update({
        where: { id: req.params.id },
        data: { tombstonedAt: new Date(), status: 'archived' },
      });

      logger?.info({ id: req.params.id, name: entity.name }, 'brain: entity tombstoned');
      return res.json({ ok: true });
    } catch (err) {
      logger?.error({ err }, 'brain: entity tombstone error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // PATCH /api/brain/entities/:id — edit name, status, or properties
  app.patch('/api/brain/entities/:id', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const entity = await prisma.brainEntity.findUnique({ where: { id: req.params.id } });
      if (!entity) return res.status(404).json({ error: 'not found' });

      const { name, status, properties } = req.body || {};
      const data = {};
      if (name && typeof name === 'string') {
        data.name = name.trim();
        data.canonicalName = canonicalEntityName(data.name);
      }
      if (status && typeof status === 'string') data.status = status;
      if (properties && typeof properties === 'object') {
        data.properties = { ...(entity.properties || {}), ...properties };
      }
      if (!Object.keys(data).length) return res.status(400).json({ error: 'nothing to update' });

      const updated = await prisma.brainEntity.update({ where: { id: req.params.id }, data });
      logger?.info({ id: req.params.id, data }, 'brain: entity updated');
      return res.json({ ok: true, entity: updated });
    } catch (err) {
      logger?.error({ err }, 'brain: entity update error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/entities/:id/merge-into/:targetId
  // Repoints all graph references from :id (the duplicate) onto :targetId
  // (the survivor), copies aliases + missing properties/FK anchors, then
  // tombstones the duplicate. The survivor keeps its name and type.
  app.post('/api/brain/entities/:id/merge-into/:targetId', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { id: loserId, targetId } = req.params;
      if (loserId === targetId) return res.status(400).json({ error: 'cannot merge an entity into itself' });

      const [loser, target] = await Promise.all([
        prisma.brainEntity.findUnique({ where: { id: loserId }, include: { aliases: true } }),
        prisma.brainEntity.findUnique({ where: { id: targetId } }),
      ]);
      if (!loser) return res.status(404).json({ error: 'source entity not found' });
      if (!target) return res.status(404).json({ error: 'target entity not found' });
      if (target.tombstonedAt) return res.status(400).json({ error: 'target entity is tombstoned' });
      if (loser.tombstonedAt) return res.status(400).json({ error: 'source entity is already tombstoned' });

      const FK_ANCHORS = ['localEffortCustomerId', 'localEffortDishId', 'localBudgetVendorId', 'squareCustomerId', 'plannerCardId'];
      const anchorFill = {};
      for (const key of FK_ANCHORS) {
        if (!target[key] && loser[key]) anchorFill[key] = loser[key];
      }

      const aliasRows = [
        ...loser.aliases.map(a => ({ entityId: targetId, alias: a.alias, source: a.source })),
        { entityId: targetId, alias: loser.name, source: 'merge' },
      ];

      await prisma.$transaction([
        prisma.brainAssertion.updateMany({ where: { srcId: loserId }, data: { srcId: targetId } }),
        prisma.brainAssertion.updateMany({ where: { dstId: loserId }, data: { dstId: targetId } }),
        // Repointing can turn loser↔target edges into self-edges — retract
        // them (MENU_SNAPSHOT is the only relType modeled as a self-edge).
        prisma.brainAssertion.updateMany({
          where: { srcId: targetId, dstId: targetId, retractedAt: null, relType: { not: 'MENU_SNAPSHOT' } },
          data: { retractedAt: new Date(), retractedBy: 'system:merge', retractedReason: 'self_edge_after_merge' },
        }),
        prisma.brainInference.updateMany({ where: { srcId: loserId }, data: { srcId: targetId } }),
        prisma.brainInference.updateMany({ where: { dstId: loserId }, data: { dstId: targetId } }),
        prisma.brainInboxItem.updateMany({ where: { resultEntityId: loserId }, data: { resultEntityId: targetId } }),
        prisma.brainEntityAlias.deleteMany({ where: { entityId: loserId } }),
        prisma.brainEntityAlias.createMany({ data: aliasRows, skipDuplicates: true }),
        prisma.brainEntity.update({
          where: { id: targetId },
          data: {
            properties: { ...(loser.properties || {}), ...(target.properties || {}) },
            ...anchorFill,
          },
        }),
        prisma.brainEntity.update({
          where: { id: loserId },
          data: { tombstonedAt: new Date(), tombstoneReason: `merged_into:${targetId}`, status: 'archived' },
        }),
      ]);

      await writeLedgerEvent({
        eventType: 'entity.merged',
        source: 'admin_ux',
        actorType: 'founder',
        payload: {
          loserId,
          loserName: loser.name,
          loserType: loser.entityType,
          targetId,
          targetName: target.name,
          targetType: target.entityType,
        },
      });

      logger?.info({ loserId, targetId }, 'brain: entities merged');
      return res.json({ ok: true, targetId });
    } catch (err) {
      logger?.error({ err }, 'brain: entity merge error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/assertions/:id/confirm — confirm a provisional assertion
  app.get('/api/brain/assertion/:id', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const assertion = await prisma.brainAssertion.findUnique({
        where: { id: req.params.id },
        include: {
          src: { select: { id: true, entityType: true, name: true } },
          dst: { select: { id: true, entityType: true, name: true } },
          ledgerEvent: { select: { id: true, eventType: true, source: true, sourceId: true, occurredAt: true, payload: true } },
        },
      });
      if (!assertion) return res.status(404).json({ error: 'not found' });

      return res.json({ ok: true, assertion: decorateAssertion(assertion), relationships: RELATIONSHIPS });
    } catch (err) {
      logger?.error({ err }, 'brain: assertion detail error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.patch('/api/brain/assertion/:id', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const existing = await prisma.brainAssertion.findUnique({
        where: { id: req.params.id },
        include: {
          src: { select: { id: true, entityType: true, name: true } },
          dst: { select: { id: true, entityType: true, name: true } },
        },
      });
      if (!existing) return res.status(404).json({ error: 'not found' });

      const data = {};
      let src = existing.src;
      let dst = existing.dst;
      const relType = req.body?.relType ? String(req.body.relType).trim().toUpperCase() : existing.relType;

      if (req.body?.srcId && req.body.srcId !== existing.srcId) {
        src = await prisma.brainEntity.findUnique({
          where: { id: String(req.body.srcId) },
          select: { id: true, entityType: true, name: true },
        });
        if (!src) return res.status(400).json({ error: 'srcId not found' });
        data.srcId = src.id;
      }
      if (req.body?.dstId && req.body.dstId !== existing.dstId) {
        dst = await prisma.brainEntity.findUnique({
          where: { id: String(req.body.dstId) },
          select: { id: true, entityType: true, name: true },
        });
        if (!dst) return res.status(400).json({ error: 'dstId not found' });
        data.dstId = dst.id;
      }

      if (relType !== existing.relType) data.relType = relType;
      if (req.body?.metadata !== undefined) {
        if (!req.body.metadata || typeof req.body.metadata !== 'object' || Array.isArray(req.body.metadata)) {
          return res.status(400).json({ error: 'metadata must be an object' });
        }
        data.metadata = req.body.metadata;
      }
      if (req.body?.confidence !== undefined) {
        const confidence = Number(req.body.confidence);
        if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
          return res.status(400).json({ error: 'confidence must be 0..1' });
        }
        data.confidence = confidence;
      }
      if (!Object.keys(data).length) return res.status(400).json({ error: 'nothing to update' });

      const validation = validateRelationship({
        relType,
        srcType: src.entityType,
        dstType: dst.entityType,
        srcId: src.id,
        dstId: dst.id,
      });
      const metadata = data.metadata ?? existing.metadata ?? {};
      data.metadata = {
        ...metadata,
        relationshipWarnings: validation.warnings,
        reviewedEditAt: new Date().toISOString(),
      };

      const updated = await prisma.brainAssertion.update({
        where: { id: req.params.id },
        data,
        include: {
          src: { select: { id: true, entityType: true, name: true } },
          dst: { select: { id: true, entityType: true, name: true } },
          ledgerEvent: { select: { id: true, eventType: true, source: true, sourceId: true, occurredAt: true, payload: true } },
        },
      });

      return res.json({ ok: true, assertion: decorateAssertion(updated) });
    } catch (err) {
      logger?.error({ err }, 'brain: assertion update error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.post('/api/brain/assertions/:id/confirm', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const assertion = await prisma.brainAssertion.findUnique({ where: { id: req.params.id } });
      if (!assertion) return res.status(404).json({ error: 'not found' });

      await prisma.brainAssertion.update({
        where: { id: req.params.id },
        data: { provisional: false, confirmedAt: new Date(), confirmedBy: 'admin' },
      });

      return res.json({ ok: true });
    } catch (err) {
      logger?.error({ err }, 'brain: assertion confirm error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/assertions/:id/retract — retract (soft-delete) an assertion
  app.post('/api/brain/assertions/:id/retract', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const assertion = await prisma.brainAssertion.findUnique({ where: { id: req.params.id } });
      if (!assertion) return res.status(404).json({ error: 'not found' });

      await prisma.brainAssertion.update({
        where: { id: req.params.id },
        data: {
          retractedAt: new Date(),
          retractedBy: 'admin',
          retractedReason: req.body?.reason || 'admin_retraction',
        },
      });

      return res.json({ ok: true });
    } catch (err) {
      logger?.error({ err }, 'brain: assertion retract error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/assertions/provisional — review queue
  app.get('/api/brain/assertions/provisional', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { limit = '100', relType } = req.query;
      const assertions = await prisma.brainAssertion.findMany({
        where: {
          provisional: true,
          retractedAt: null,
          knownUntil: null,
          ...(relType ? { relType: String(relType).trim().toUpperCase() } : {}),
        },
        orderBy: [{ confidence: 'asc' }, { createdAt: 'desc' }],
        take: Math.min(parseInt(limit) || 100, 250),
        include: {
          src: { select: { id: true, entityType: true, name: true } },
          dst: { select: { id: true, entityType: true, name: true } },
          ledgerEvent: { select: { id: true, eventType: true, source: true, sourceId: true, occurredAt: true, payload: true } },
        },
      });
      return res.json({ ok: true, assertions: assertions.map(decorateAssertion), count: assertions.length });
    } catch (err) {
      logger?.error({ err }, 'brain: provisional assertions list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/assertions/provisional/suggestions
  // Smart review queue. Learns from confirmed/retracted assertions and groups
  // matching provisionals into bulk-review suggestions.
  app.get('/api/brain/assertions/provisional/suggestions', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { limit = '1000', relType } = req.query;
      const take = Math.min(parseInt(limit) || 1000, 2000);
      const relFilter = relType ? { relType: String(relType).trim().toUpperCase() } : {};

      const [pending, reviewed] = await Promise.all([
        prisma.brainAssertion.findMany({
          where: {
            provisional: true,
            retractedAt: null,
            knownUntil: null,
            ...relFilter,
          },
          orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
          take,
          include: {
            src: { select: { id: true, entityType: true, name: true } },
            dst: { select: { id: true, entityType: true, name: true } },
            ledgerEvent: { select: { id: true, eventType: true, source: true, sourceId: true, occurredAt: true, payload: true } },
          },
        }),
        prisma.brainAssertion.findMany({
          where: {
            OR: [
              { confirmedAt: { not: null } },
              { retractedAt: { not: null } },
            ],
            ...relFilter,
          },
          orderBy: { createdAt: 'desc' },
          take: 5000,
          include: {
            src: { select: { id: true, entityType: true, name: true } },
            dst: { select: { id: true, entityType: true, name: true } },
            ledgerEvent: { select: { id: true, eventType: true, source: true, sourceId: true, occurredAt: true, payload: true } },
          },
        }),
      ]);
      const automation = automationCandidates(pending);

      return res.json({
        ok: true,
        pendingCount: pending.length,
        reviewedCount: reviewed.length,
        automation: {
          confirmCount: automation.confirm.length,
          retractCount: automation.retract.length,
          confirmIds: automation.confirm.slice(0, 500).map(x => x.id),
          retractIds: automation.retract.slice(0, 500).map(x => x.id),
        },
        suggestions: buildReviewSuggestions({ pending, reviewed }),
      });
    } catch (err) {
      logger?.error({ err }, 'brain: provisional suggestions error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/assertions/provisional/bulk
  app.post('/api/brain/assertions/provisional/bulk', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const action = String(req.body?.action || '').toLowerCase();
      const assertionIds = Array.isArray(req.body?.assertionIds)
        ? req.body.assertionIds.filter(Boolean).slice(0, 500)
        : [];
      if (!['confirm', 'retract'].includes(action)) {
        return res.status(400).json({ error: 'action must be confirm or retract' });
      }
      if (assertionIds.length === 0) {
        return res.status(400).json({ error: 'assertionIds required' });
      }

      const where = {
        id: { in: assertionIds },
        provisional: true,
        retractedAt: null,
        knownUntil: null,
      };

      const result = action === 'confirm'
        ? await prisma.brainAssertion.updateMany({
            where,
            data: {
              provisional: false,
              confirmedAt: new Date(),
              confirmedBy: 'admin:smart-review',
            },
          })
        : await prisma.brainAssertion.updateMany({
            where,
            data: {
              retractedAt: new Date(),
              retractedBy: 'admin:smart-review',
              retractedReason: req.body?.reason || 'smart_review_batch',
            },
          });

      return res.json({ ok: true, action, count: result.count });
    } catch (err) {
      logger?.error({ err }, 'brain: provisional bulk review error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/quality — compact graph cleanup dashboard data.
  app.post('/api/brain/assertions/provisional/auto', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const dryRun = req.body?.dryRun !== false;
      const limit = Math.min(parseInt(req.body?.limit) || 1000, 2000);
      const pending = await prisma.brainAssertion.findMany({
        where: { provisional: true, retractedAt: null, knownUntil: null },
        orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        include: {
          src: { select: { id: true, entityType: true, name: true } },
          dst: { select: { id: true, entityType: true, name: true } },
          ledgerEvent: { select: { id: true, eventType: true, source: true, sourceId: true, occurredAt: true, payload: true } },
        },
      });
      const candidates = automationCandidates(pending);
      const confirmIds = candidates.confirm.slice(0, 500).map(x => x.id);
      const retractIds = candidates.retract.slice(0, 500).map(x => x.id);

      if (dryRun) {
        return res.json({
          ok: true,
          dryRun: true,
          confirmCount: confirmIds.length,
          retractCount: retractIds.length,
          confirmSamples: candidates.confirm.slice(0, 5),
          retractSamples: candidates.retract.slice(0, 5),
        });
      }

      const [confirmed, retracted] = await Promise.all([
        confirmIds.length
          ? prisma.brainAssertion.updateMany({
              where: { id: { in: confirmIds }, provisional: true, retractedAt: null, knownUntil: null },
              data: { provisional: false, confirmedAt: new Date(), confirmedBy: 'admin:auto-review' },
            })
          : { count: 0 },
        retractIds.length
          ? prisma.brainAssertion.updateMany({
              where: { id: { in: retractIds }, provisional: true, retractedAt: null, knownUntil: null },
              data: {
                retractedAt: new Date(),
                retractedBy: 'admin:auto-review',
                retractedReason: 'structural_relationship_violation',
              },
            })
          : { count: 0 },
      ]);

      return res.json({ ok: true, dryRun: false, confirmed: confirmed.count, retracted: retracted.count });
    } catch (err) {
      logger?.error({ err }, 'brain: provisional auto review error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/ledger/lookup — focused provenance lookup for an entity name.
  app.get('/api/brain/ledger/lookup', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const q = String(req.query.q || '').trim();
      const sourcePrefix = String(req.query.sourcePrefix || '').trim();
      const take = Math.min(parseInt(req.query.limit, 10) || 100, 250);
      if (q.length < 2) return res.status(400).json({ error: 'q must be at least 2 characters' });

      const entities = await prisma.brainEntity.findMany({
        where: {
          tombstonedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { canonicalName: { contains: canonicalEntityName(q), mode: 'insensitive' } },
            { aliases: { some: { alias: { contains: q, mode: 'insensitive' } } } },
          ],
        },
        orderBy: [{ entityType: 'asc' }, { name: 'asc' }],
        take: 12,
        select: {
          id: true,
          entityType: true,
          name: true,
          canonicalName: true,
          properties: true,
          status: true,
          aliases: { select: { alias: true, source: true }, take: 8 },
        },
      });

      const entityIds = entities.map(e => e.id);
      const assertionWhere = {
        retractedAt: null,
        sourceId: { not: null },
        OR: [
          { srcId: { in: entityIds } },
          { dstId: { in: entityIds } },
        ],
        ledgerEvent: {
          is: {
            tombstonedAt: null,
            ...(sourcePrefix ? { sourceId: { startsWith: sourcePrefix } } : {}),
          },
        },
      };

      const assertions = entityIds.length
        ? await prisma.brainAssertion.findMany({
            where: assertionWhere,
            orderBy: [{ createdAt: 'desc' }],
            take,
            include: {
              src: { select: { id: true, entityType: true, name: true } },
              dst: { select: { id: true, entityType: true, name: true } },
              ledgerEvent: { select: { id: true, eventType: true, source: true, sourceId: true, occurredAt: true, createdAt: true, actorType: true, payload: true } },
            },
          })
        : [];

      const directEvents = await prisma.$queryRaw`
        SELECT id, "eventType", source, "sourceId", "occurredAt", "createdAt", "actorType", payload
        FROM "LedgerEvent"
        WHERE "tombstonedAt" IS NULL
          AND (${sourcePrefix} = '' OR "sourceId" LIKE ${`${sourcePrefix}%`})
          AND (
            "sourceId" ILIKE ${`%${q}%`}
            OR payload::text ILIKE ${`%${q}%`}
          )
        ORDER BY "occurredAt" DESC, "createdAt" DESC
        LIMIT ${Math.min(take, 100)}
      `;

      const eventMap = new Map();
      for (const assertion of assertions) {
        if (assertion.ledgerEvent) eventMap.set(assertion.ledgerEvent.id, assertion.ledgerEvent);
      }
      for (const event of directEvents) eventMap.set(event.id, event);

      const ledgerEvents = [...eventMap.values()]
        .sort((a, b) => new Date(b.occurredAt || b.createdAt) - new Date(a.occurredAt || a.createdAt))
        .map(event => ({
          ...sourceSummary(event),
          actorType: event.actorType,
          createdAt: event.createdAt,
          compactPayload: compactLedgerPayload(event.payload),
        }));

      return res.json({
        ok: true,
        query: q,
        sourcePrefix: sourcePrefix || null,
        entities,
        assertions: assertions.map(assertion => ({
          id: assertion.id,
          relType: assertion.relType,
          metadata: assertion.metadata,
          confidence: assertion.confidence,
          provisional: assertion.provisional,
          createdAt: assertion.createdAt,
          validFrom: assertion.validFrom,
          sourceType: assertion.sourceType,
          src: assertion.src,
          dst: assertion.dst,
          ledgerEventId: assertion.ledgerEvent?.id || assertion.sourceId,
          ledgerSourceId: assertion.ledgerEvent?.sourceId || null,
          ledgerEventType: assertion.ledgerEvent?.eventType || null,
        })),
        ledgerEvents,
      });
    } catch (err) {
      logger?.error({ err }, 'brain: ledger lookup error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.get('/api/brain/quality', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const [
        duplicateEntities,
        crossTypeDuplicates,
        duplicateSourceIds,
        selfEdges,
        provisional,
        orphaned,
      ] = await Promise.all([
        prisma.$queryRaw`
          SELECT "entityType",
                 COALESCE("canonicalName", lower(name)) AS canonical,
                 COUNT(*)::int AS n,
                 json_agg(json_build_object('id', id, 'name', name, 'entityType', "entityType") ORDER BY "createdAt") AS members
          FROM "BrainEntity"
          WHERE "tombstonedAt" IS NULL
          GROUP BY 1, 2
          HAVING COUNT(*) > 1
          ORDER BY n DESC
          LIMIT 50
        `,
        prisma.$queryRaw`
          SELECT canonical,
                 COUNT(*)::int AS n,
                 json_agg(json_build_object('id', id, 'name', name, 'entityType', "entityType") ORDER BY "createdAt") AS members
          FROM (
            SELECT id, "entityType", name, "createdAt",
                   COALESCE("canonicalName", lower(name)) AS canonical
            FROM "BrainEntity"
            WHERE "tombstonedAt" IS NULL
          ) x
          GROUP BY canonical
          HAVING COUNT(*) > 1 AND COUNT(DISTINCT "entityType") > 1
          ORDER BY n DESC
          LIMIT 50
        `,
        prisma.$queryRaw`
          SELECT "eventType", source, "sourceId", COUNT(*)::int AS n
          FROM "LedgerEvent"
          WHERE "sourceId" IS NOT NULL AND "tombstonedAt" IS NULL
          GROUP BY 1, 2, 3
          HAVING COUNT(*) > 1
          ORDER BY n DESC
          LIMIT 50
        `,
        prisma.$queryRaw`
          SELECT a."relType", e."entityType", COUNT(*)::int AS n
          FROM "BrainAssertion" a
          JOIN "BrainEntity" e ON e.id = a."srcId"
          WHERE a."srcId" = a."dstId" AND a."retractedAt" IS NULL
          GROUP BY 1, 2
          ORDER BY n DESC
          LIMIT 50
        `,
        prisma.brainAssertion.count({ where: { provisional: true, retractedAt: null } }),
        prisma.$queryRaw`
          SELECT e."entityType", COUNT(*)::int AS n
          FROM "BrainEntity" e
          WHERE e."tombstonedAt" IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM "BrainAssertion" a
              WHERE (a."srcId" = e.id OR a."dstId" = e.id)
                AND a."retractedAt" IS NULL
            )
          GROUP BY 1
          ORDER BY n DESC
          LIMIT 50
        `,
      ]);

      return res.json({
        ok: true,
        duplicateEntities,
        crossTypeDuplicates,
        duplicateSourceIds,
        selfEdges,
        provisionalAssertions: provisional,
        orphanedEntitiesByType: orphaned,
      });
    } catch (err) {
      logger?.error({ err }, 'brain: quality report error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/quality/fragments — food entities (Dish/Ingredient/Menu)
  // whose names are gmail sentence-fragments. The "dishes" mess made visible.
  app.get('/api/brain/quality/fragments', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const candidates = await prisma.brainEntity.findMany({
        where: { entityType: { in: [...FOOD_TYPES_LIST] }, tombstonedAt: null },
        select: { id: true, name: true, entityType: true, createdAt: true },
        orderBy: { entityType: 'asc' },
      });
      const fragments = candidates
        .filter(e => isFoodFragment(e.name, e.entityType))
        .map(e => ({ id: e.id, name: e.name, entityType: e.entityType, createdAt: e.createdAt }));

      return res.json({ ok: true, fragments, count: fragments.length });
    } catch (err) {
      logger?.error({ err }, 'brain: fragments list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/quality/fragments/archive — archive (reversible) the given
  // fragment entity ids, or all detected fragments when { all: true }.
  app.post('/api/brain/quality/fragments/archive', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      let ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];

      if (req.body?.all === true) {
        const candidates = await prisma.brainEntity.findMany({
          where: { entityType: { in: [...FOOD_TYPES_LIST] }, tombstonedAt: null },
          select: { id: true, name: true, entityType: true },
        });
        ids = candidates.filter(e => isFoodFragment(e.name, e.entityType)).map(e => e.id);
      } else {
        // Re-validate each id is genuinely a fragment before archiving — never
        // archive an arbitrary id a client sends.
        const rows = await prisma.brainEntity.findMany({
          where: { id: { in: ids }, entityType: { in: [...FOOD_TYPES_LIST] }, tombstonedAt: null },
          select: { id: true, name: true, entityType: true },
        });
        ids = rows.filter(e => isFoodFragment(e.name, e.entityType)).map(e => e.id);
      }

      if (!ids.length) return res.json({ ok: true, archived: 0 });

      const { count } = await prisma.brainEntity.updateMany({
        where: { id: { in: ids } },
        data: { tombstonedAt: new Date(), status: 'archived', tombstoneReason: 'cleanup:food_fragment' },
      });
      logger?.info({ count }, 'brain: archived food fragments');
      return res.json({ ok: true, archived: count });
    } catch (err) {
      logger?.error({ err }, 'brain: fragments archive error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.get('/api/brain/relationships', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });
      return res.json({ ok: true, relationships: RELATIONSHIPS });
    } catch (err) {
      return res.status(500).json({ error: 'internal-error' });
    }
  });
}

module.exports = { registerEntityRoutes };
