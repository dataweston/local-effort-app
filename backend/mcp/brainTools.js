/**
 * Brain MCP tools — 15 cockpit queries + provisional write model.
 *
 * Read tools (Claude can call freely):
 *   brain.vendor.list          — all active vendors + assertion counts
 *   brain.vendor.get           — one vendor with assertions + inferences
 *   brain.vendor.spend         — spend history for a vendor
 *   brain.customer.list        — all active customers + churn signals
 *   brain.customer.get         — one customer with full history
 *   brain.inference.active     — active inferences, filterable by type
 *   brain.inbox.pending        — pending inbox items (triage queue)
 *   brain.entity.search        — fuzzy name search across all entity types
 *   brain.entity.get           — single entity with all assertions + inferences
 *   brain.ledger.recent        — most recent N ledger events
 *   brain.ledger.for_entity    — ledger events touching a specific entity
 *   brain.cashflow.summary     — 90-day payment totals by vendor
 *   brain.tasks.open           — all open Task entities
 *
 * Provisional write tools (Claude creates at confidence 0.5, founder confirms):
 *   brain.assert.provisional   — write a provisional BrainAssertion
 *   brain.entity.create        — create a new entity (provisional=true by default)
 *
 * Trust constraints enforced here:
 *   - Claude cannot write confidence > 0.7 or provisional=false directly
 *   - Claude cannot set relType = 'MEDICAL_CONSTRAINT'
 *   - Claude cannot tombstone entities (no delete path)
 */

const { z } = require('zod');
const { getPrisma } = require('../api/utils/prisma');
const { writeLedgerEvent, canonicalName } = require('../api/brain/ledger');
const { RELATIONSHIPS, normalizeRelType, validateRelationship } = require('../api/brain/relationshipDictionary');

// ── helpers ──────────────────────────────────────────────────────────────────

function json(data) {
  return { content: [{ type: 'json', json: data }] };
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000);
}

// ── Read tools ────────────────────────────────────────────────────────────────

function registerBrainReadTools(server) {
  const prisma = getPrisma();

  // 1. brain.vendor.list
  server.registerTool(
    'brain.vendor.list',
    {
      title: 'List vendors',
      description: 'Return all active Vendor entities with assertion counts and latest inference signals.',
      inputSchema: z.object({
        includeInactive: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    },
    async ({ includeInactive = false, limit = 100 }) => {
      const vendors = await prisma.brainEntity.findMany({
        where: {
          entityType: 'Vendor',
          tombstonedAt: null,
          ...(includeInactive ? {} : { status: 'active' }),
        },
        orderBy: { name: 'asc' },
        take: limit,
        include: {
          aliases: { select: { alias: true } },
          srcAssertions: { where: { retractedAt: null, knownUntil: null }, select: { relType: true } },
          srcInferences: { where: { knownUntil: null, supersededBy: null }, select: { inferenceType: true, confidence: true, summary: true } },
        },
      });
      return json({ vendors, count: vendors.length });
    }
  );

  // 2. brain.vendor.get
  server.registerTool(
    'brain.vendor.get',
    {
      title: 'Get vendor detail',
      description: 'Return one vendor with all assertions (ORDERED, PRICED_AT, etc.) and active inferences.',
      inputSchema: z.object({
        entityId: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
      }),
    },
    async ({ entityId, name }) => {
      if (!entityId && !name) throw new Error('entityId or name required');
      const vendor = await prisma.brainEntity.findFirst({
        where: {
          entityType: 'Vendor',
          tombstonedAt: null,
          ...(entityId ? { id: entityId } : { name: { equals: name, mode: 'insensitive' } }),
        },
        include: {
          aliases: true,
          srcAssertions: {
            where: { retractedAt: null, knownUntil: null },
            orderBy: { validFrom: 'desc' },
          },
          srcInferences: {
            where: { knownUntil: null, supersededBy: null },
            orderBy: { computedAt: 'desc' },
          },
        },
      });
      if (!vendor) throw new Error('vendor not found');
      return json({ vendor });
    }
  );

  // 3. brain.vendor.spend
  server.registerTool(
    'brain.vendor.spend',
    {
      title: 'Vendor spend history',
      description: 'Return payment.completed ledger events for a vendor, grouped by month.',
      inputSchema: z.object({
        entityId: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        daysBack: z.number().int().min(1).max(730).optional(),
      }),
    },
    async ({ entityId, name, daysBack = 365 }) => {
      if (!entityId && !name) throw new Error('entityId or name required');

      // Resolve vendor name for merchant matching
      let vendorName = name;
      if (entityId && !name) {
        const e = await prisma.brainEntity.findUnique({ where: { id: entityId }, select: { name: true, aliases: { select: { alias: true } } } });
        if (!e) throw new Error('vendor not found');
        vendorName = e.name;
      }

      const cutoff = daysAgo(daysBack);
      const events = await prisma.ledgerEvent.findMany({
        where: {
          eventType: 'payment.completed',
          occurredAt: { gte: cutoff },
          tombstonedAt: null,
        },
        orderBy: { occurredAt: 'desc' },
        select: { id: true, occurredAt: true, payload: true, source: true },
      });

      // Filter by merchant name match (payload.merchantName)
      const vendorLower = vendorName?.toLowerCase().trim() || '';
      const matched = events.filter(ev => {
        const m = (ev.payload?.merchantName || '').toLowerCase().trim();
        return m && (m === vendorLower || m.includes(vendorLower) || vendorLower.includes(m));
      });

      // Group by month
      const byMonth = {};
      let total = 0;
      for (const ev of matched) {
        const month = ev.occurredAt.toISOString().slice(0, 7);
        if (!byMonth[month]) byMonth[month] = { count: 0, totalCents: 0 };
        byMonth[month].count++;
        byMonth[month].totalCents += ev.payload?.amountCents || 0;
        total += ev.payload?.amountCents || 0;
      }

      return json({ events: matched, byMonth, totalCents: total, totalDollars: (total / 100).toFixed(2) });
    }
  );

  // 4. brain.customer.list
  server.registerTool(
    'brain.customer.list',
    {
      title: 'List customers',
      description: 'Return all active Customer entities with churn inference signals.',
      inputSchema: z.object({
        withChurnSignal: z.boolean().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      }),
    },
    async ({ withChurnSignal = false, limit = 100 }) => {
      const customers = await prisma.brainEntity.findMany({
        where: {
          entityType: 'Customer',
          tombstonedAt: null,
          status: 'active',
          ...(withChurnSignal ? {
            srcInferences: { some: { inferenceType: 'CHURNING', knownUntil: null, supersededBy: null } },
          } : {}),
        },
        orderBy: { name: 'asc' },
        take: limit,
        include: {
          srcInferences: {
            where: { inferenceType: 'CHURNING', knownUntil: null, supersededBy: null },
            select: { confidence: true, summary: true, computedAt: true },
          },
        },
      });
      return json({ customers, count: customers.length });
    }
  );

  // 5. brain.customer.get
  server.registerTool(
    'brain.customer.get',
    {
      title: 'Get customer detail',
      description: 'Return one customer with all assertions, inferences, and order history.',
      inputSchema: z.object({
        entityId: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        squareCustomerId: z.string().min(1).optional(),
      }),
    },
    async ({ entityId, name, squareCustomerId }) => {
      if (!entityId && !name && !squareCustomerId) throw new Error('entityId, name, or squareCustomerId required');
      const customer = await prisma.brainEntity.findFirst({
        where: {
          entityType: 'Customer',
          tombstonedAt: null,
          ...(entityId ? { id: entityId } : squareCustomerId ? { squareCustomerId } : { name: { equals: name, mode: 'insensitive' } }),
        },
        include: {
          aliases: true,
          srcAssertions: { where: { retractedAt: null, knownUntil: null }, orderBy: { validFrom: 'desc' } },
          dstAssertions: { where: { retractedAt: null, knownUntil: null }, orderBy: { validFrom: 'desc' } },
          srcInferences: { where: { knownUntil: null, supersededBy: null }, orderBy: { computedAt: 'desc' } },
        },
      });
      if (!customer) throw new Error('customer not found');
      return json({ customer });
    }
  );

  // 6. brain.inference.active
  server.registerTool(
    'brain.inference.active',
    {
      title: 'Active inference signals',
      description: 'List active brain inferences. Filter by type: PREFERS, AVOIDS, CHURNING, PRICE_DRIFT.',
      inputSchema: z.object({
        inferenceType: z.enum(['PREFERS', 'AVOIDS', 'CHURNING', 'PRICE_DRIFT']).optional(),
        minConfidence: z.number().min(0).max(1).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    },
    async ({ inferenceType, minConfidence = 0, limit = 50 }) => {
      const inferences = await prisma.brainInference.findMany({
        where: {
          knownUntil: null,
          supersededBy: null,
          ...(inferenceType ? { inferenceType } : {}),
          confidence: { gte: minConfidence },
        },
        orderBy: { confidence: 'desc' },
        take: limit,
        include: {
          src: { select: { id: true, name: true, entityType: true } },
        },
      });
      return json({ inferences, count: inferences.length });
    }
  );

  // 7. brain.inbox.pending
  server.registerTool(
    'brain.inbox.pending',
    {
      title: 'Pending inbox items',
      description: 'Return pending brain inbox items awaiting triage.',
      inputSchema: z.object({
        source: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    },
    async ({ source, limit = 20 }) => {
      const items = await prisma.brainInboxItem.findMany({
        where: {
          status: 'pending',
          ...(source ? { source } : {}),
        },
        orderBy: { capturedAt: 'desc' },
        take: limit,
      });
      const total = await prisma.brainInboxItem.count({ where: { status: 'pending' } });
      return json({ items, total });
    }
  );

  // 8. brain.entity.search
  server.registerTool(
    'brain.entity.search',
    {
      title: 'Search entities',
      description: 'Fuzzy name search across all brain entity types.',
      inputSchema: z.object({
        query: z.string().min(1),
        entityType: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    },
    async ({ query, entityType, limit = 20 }) => {
      const entities = await prisma.brainEntity.findMany({
        where: {
          tombstonedAt: null,
          ...(entityType ? { entityType } : {}),
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { aliases: { some: { alias: { contains: query, mode: 'insensitive' } } } },
          ],
        },
        take: limit,
        select: { id: true, name: true, entityType: true, status: true, properties: true },
      });
      return json({ entities, count: entities.length });
    }
  );

  // 9. brain.entity.get
  server.registerTool(
    'brain.entity.get',
    {
      title: 'Get entity',
      description: 'Return a single entity with all assertions and active inferences.',
      inputSchema: z.object({
        entityId: z.string().min(1),
      }),
    },
    async ({ entityId }) => {
      const entity = await prisma.brainEntity.findUnique({
        where: { id: entityId },
        include: {
          aliases: true,
          srcAssertions: { where: { retractedAt: null, knownUntil: null }, orderBy: { validFrom: 'desc' } },
          dstAssertions: { where: { retractedAt: null, knownUntil: null }, orderBy: { validFrom: 'desc' } },
          srcInferences: { where: { knownUntil: null, supersededBy: null } },
          dstInferences: { where: { knownUntil: null, supersededBy: null } },
        },
      });
      if (!entity) throw new Error('entity not found');
      return json({ entity });
    }
  );

  // 10. brain.ledger.recent
  server.registerTool(
    'brain.ledger.recent',
    {
      title: 'Recent ledger events',
      description: 'Return the most recent ledger events, optionally filtered by event type or source.',
      inputSchema: z.object({
        eventType: z.string().optional(),
        source: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    },
    async ({ eventType, source, limit = 20 }) => {
      const events = await prisma.ledgerEvent.findMany({
        where: {
          tombstonedAt: null,
          ...(eventType ? { eventType } : {}),
          ...(source ? { source } : {}),
        },
        orderBy: { occurredAt: 'desc' },
        take: limit,
        select: { id: true, eventType: true, occurredAt: true, source: true, actorType: true, payload: true },
      });
      return json({ events, count: events.length });
    }
  );

  // 11. brain.ledger.for_entity
  server.registerTool(
    'brain.ledger.for_entity',
    {
      title: 'Ledger events for entity',
      description: 'Return ledger events that sourced assertions for a specific entity.',
      inputSchema: z.object({
        entityId: z.string().min(1),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    },
    async ({ entityId, limit = 50 }) => {
      // Events referenced by this entity's assertions
      const assertions = await prisma.brainAssertion.findMany({
        where: { OR: [{ srcId: entityId }, { dstId: entityId }], sourceId: { not: null } },
        select: { sourceId: true },
      });
      const eventIds = [...new Set(assertions.map(a => a.sourceId).filter(Boolean))];

      const events = await prisma.ledgerEvent.findMany({
        where: { id: { in: eventIds }, tombstonedAt: null },
        orderBy: { occurredAt: 'desc' },
        take: limit,
        select: { id: true, eventType: true, occurredAt: true, source: true, payload: true },
      });
      return json({ events, count: events.length });
    }
  );

  // 12. brain.cashflow.summary
  server.registerTool(
    'brain.cashflow.summary',
    {
      title: 'Cashflow summary',
      description: '90-day payment totals grouped by vendor, ordered by spend descending.',
      inputSchema: z.object({
        daysBack: z.number().int().min(7).max(365).optional(),
      }),
    },
    async ({ daysBack = 90 }) => {
      const cutoff = daysAgo(daysBack);
      const events = await prisma.ledgerEvent.findMany({
        where: { eventType: 'payment.completed', occurredAt: { gte: cutoff }, tombstonedAt: null },
        select: { payload: true, occurredAt: true },
      });

      const byVendor = {};
      for (const ev of events) {
        const name = (ev.payload?.merchantName || 'unknown').toLowerCase().trim();
        if (!byVendor[name]) byVendor[name] = { totalCents: 0, count: 0 };
        byVendor[name].totalCents += ev.payload?.amountCents || 0;
        byVendor[name].count++;
      }

      const rows = Object.entries(byVendor)
        .map(([vendor, d]) => ({ vendor, totalCents: d.totalCents, totalDollars: (d.totalCents / 100).toFixed(2), count: d.count }))
        .sort((a, b) => b.totalCents - a.totalCents);

      const grandTotal = rows.reduce((s, r) => s + r.totalCents, 0);
      return json({ rows, grandTotalCents: grandTotal, grandTotalDollars: (grandTotal / 100).toFixed(2), daysBack });
    }
  );

  // 13. brain.tasks.open
  server.registerTool(
    'brain.tasks.open',
    {
      title: 'Open tasks',
      description: 'Return all open Task entities with any linked entity context.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(200).optional(),
      }),
    },
    async ({ limit = 50 }) => {
      const tasks = await prisma.brainEntity.findMany({
        where: {
          entityType: 'Task',
          tombstonedAt: null,
          status: 'active',
          properties: { path: ['status'], equals: 'open' },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          srcAssertions: {
            where: { retractedAt: null, knownUntil: null },
            include: { dst: { select: { id: true, name: true, entityType: true } } },
          },
        },
      });
      return json({ tasks, count: tasks.length });
    }
  );
}

// ── Provisional write tools ───────────────────────────────────────────────────

const FORBIDDEN_REL_TYPES = ['MEDICAL_CONSTRAINT'];

function brainPythonBin() {
  return process.env.BRAIN_PYTHON_BIN
    || process.env.PYTHON_BIN
    || (process.platform === 'win32'
      ? 'C:/Users/user/AppData/Local/Programs/Python/Python310/python.exe'
      : 'python3');
}

function registerBrainWriteTools(server) {
  const prisma = getPrisma();

  // 14. brain.assert.provisional
  server.registerTool(
    'brain.assert.provisional',
    {
      title: 'Write provisional assertion',
      description: 'Claude writes a provisional assertion (confidence ≤ 0.7, provisional=true). Founder must confirm before it affects outputs.',
      inputSchema: z.object({
        srcId: z.string().min(1),
        dstId: z.string().min(1),
        relType: z.string().min(1),
        confidence: z.number().min(0.1).max(0.7).optional(),
        metadata: z.record(z.any()).optional(),
        validFrom: z.string().datetime().optional(),
        rationale: z.string().min(1),
      }),
    },
    async ({ srcId, dstId, relType, confidence = 0.5, metadata, validFrom, rationale }) => {
      const normalizedRel = normalizeRelType(relType);
      if (FORBIDDEN_REL_TYPES.includes(normalizedRel)) {
        throw new Error(`relType '${relType}' requires founder confirmation via the inbox — Claude cannot assert this directly`);
      }

      // Verify both entities exist
      const [src, dst] = await Promise.all([
        prisma.brainEntity.findUnique({ where: { id: srcId }, select: { id: true, name: true, entityType: true } }),
        prisma.brainEntity.findUnique({ where: { id: dstId }, select: { id: true, name: true, entityType: true } }),
      ]);
      if (!src) throw new Error(`srcId '${srcId}' not found`);
      if (!dst) throw new Error(`dstId '${dstId}' not found`);
      const validation = validateRelationship({
        relType: normalizedRel,
        srcType: src.entityType,
        dstType: dst.entityType,
        srcId,
        dstId,
      });

      const ledgerEvent = await writeLedgerEvent({
        eventType: 'assertion.provisional',
        source: 'mcp_claude',
        actorType: 'system',
        payload: { srcId, dstId, relType: normalizedRel, confidence, rationale, relationshipWarnings: validation.warnings },
      });

      const assertion = await prisma.brainAssertion.create({
        data: {
          srcId,
          dstId,
          relType: normalizedRel,
          confidence,
          metadata: {
            ...(metadata || {}),
            rationale,
            ...(validation.warnings.length ? { relationshipWarnings: validation.warnings } : {}),
          },
          validFrom: validFrom ? new Date(validFrom) : new Date(),
          knownFrom: new Date(),
          sourceType: 'mcp_claude',
          sourceId: ledgerEvent.id,
          createdBy: 'claude',
          provisional: true,
        },
      });

      return json({
        ok: true,
        assertionId: assertion.id,
        provisional: true,
        relationshipWarnings: validation.warnings,
        message: 'Assertion created. Awaiting founder confirmation.',
      });
    }
  );

  // 15. brain.entity.create
  server.registerTool(
    'brain.entity.create',
    {
      title: 'Create entity (provisional)',
      description: 'Claude creates a new brain entity as provisional. Appears in inbox for founder review.',
      inputSchema: z.object({
        entityType: z.string().min(1),
        name: z.string().min(1),
        properties: z.record(z.any()).optional(),
        rationale: z.string().min(1),
      }),
    },
    async ({ entityType, name, properties, rationale }) => {
      // Check for existing entity with same name+type
      const existing = await prisma.brainEntity.findFirst({
        where: {
          entityType,
          tombstonedAt: null,
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { canonicalName: canonicalName(name) },
          ],
        },
        select: { id: true, name: true },
      });
      if (existing) {
        return json({ ok: false, existing, message: `Entity already exists: ${existing.id}` });
      }

      const ledgerEvent = await writeLedgerEvent({
        eventType: 'entity.provisional',
        source: 'mcp_claude',
        actorType: 'system',
        payload: { entityType, name, rationale },
      });

      const entity = await prisma.brainEntity.create({
        data: {
          entityType,
          name,
          canonicalName: canonicalName(name),
          properties: properties || null,
          status: 'provisional',
        },
      });

      // Add to inbox for founder review
      await prisma.brainInboxItem.create({
        data: {
          rawContent: `Claude created provisional ${entityType}: "${name}". Rationale: ${rationale}`,
          source: 'mcp_claude',
          status: 'pending',
        },
      });

      return json({ ok: true, entityId: entity.id, provisional: true, message: 'Entity created as provisional. Review in inbox.' });
    }
  );
}

// ── Ontology tools ───────────────────────────────────────────────────────────

function registerBrainOntologyTools(server) {
  const { computeRecipeCost, computeDishMargin, createIngredient, createRecipe, recordBatch } = require('../api/brain/ontologyHelpers');
  const prisma = getPrisma();

  server.registerTool(
    'brain.ontology.relationships',
    {
      title: 'Relationship dictionary',
      description: 'Return the controlled relationship dictionary, including allowed source/destination types and promotion guidance.',
      inputSchema: z.object({}),
    },
    async () => json({ relationships: RELATIONSHIPS })
  );

  server.registerTool(
    'brain.recipe.get',
    {
      title: 'Get recipe with cost breakdown',
      description: 'Return a recipe\'s ingredient lines and theoretical cost per portion based on current pricing.',
      inputSchema: z.object({
        recipeId: z.string().min(1).optional(),
        dishEntityId: z.string().min(1).optional(),
      }),
    },
    async ({ recipeId, dishEntityId }) => {
      if (!recipeId && !dishEntityId) throw new Error('recipeId or dishEntityId required');

      let resolvedRecipeId = recipeId;
      if (!resolvedRecipeId && dishEntityId) {
        const a = await prisma.brainAssertion.findFirst({
          where: { dstId: dishEntityId, relType: 'VERSION_OF', retractedAt: null, knownUntil: null },
          orderBy: { validFrom: 'desc' },
          select: { srcId: true },
        });
        if (!a) throw new Error('no recipe found for this dish');
        resolvedRecipeId = a.srcId;
      }

      const cost = await computeRecipeCost(resolvedRecipeId);
      return json(cost);
    }
  );

  server.registerTool(
    'brain.recipe.create',
    {
      title: 'Create recipe (provisional)',
      description: 'Create a new Recipe entity with ingredient lines. Lines land in inbox for founder pricing review if any ingredient lacks pricing.',
      inputSchema: z.object({
        name: z.string().min(1),
        dishEntityId: z.string().optional(),
        yieldPortions: z.number().int().min(1),
        lines: z.array(z.object({
          ingredientId: z.string().min(1),
          quantity: z.number().positive(),
          unit: z.string().min(1),
          notes: z.string().optional(),
        })).min(1),
        notes: z.string().optional(),
      }),
    },
    async ({ name, dishEntityId, yieldPortions, lines, notes }) => {
      const result = await createRecipe({ name, dishEntityId, yieldPortions, lines, notes, createdBy: 'claude' });
      const cost = await computeRecipeCost(result.recipe.id);

      if (!cost.pricingComplete) {
        const { createInboxItem } = require('../api/brain/ledger');
        await createInboxItem({
          rawContent: `Recipe "${name}" created by Claude — ${cost.unpricedIngredients.length} ingredients need pricing: ${cost.unpricedIngredients.join(', ')}`,
          source: 'mcp_claude',
        });
      }

      return json({ ...result, cost, message: cost.pricingComplete ? 'Recipe created with full pricing.' : 'Recipe created. Some ingredients need pricing — see inbox.' });
    }
  );

  server.registerTool(
    'brain.batch.record',
    {
      title: 'Record a production batch',
      description: 'Record an actual production run for a recipe with real cost. Updates effective cost per portion.',
      inputSchema: z.object({
        recipeId: z.string().min(1),
        portionsMade: z.number().int().min(1),
        actualCostCents: z.number().int().min(0),
        madeAt: z.string().datetime().optional(),
        notes: z.string().optional(),
      }),
    },
    async ({ recipeId, portionsMade, actualCostCents, madeAt, notes }) => {
      const batch = await recordBatch({ recipeId, portionsMade, actualCostCents, madeAt, notes });
      return json({ ok: true, batchId: batch.id, costPerPortionCents: batch.properties?.costPerPortionCents });
    }
  );

  server.registerTool(
    'brain.margin.summary',
    {
      title: 'Margin summary across all dishes',
      description: 'Return theoretical and actual cost per portion vs selling price for every dish that has a linked recipe.',
      inputSchema: z.object({
        flagFilter: z.enum(['low', 'ok', 'good', 'unknown']).optional(),
      }),
    },
    async ({ flagFilter }) => {
      const dishAssertions = await prisma.brainAssertion.findMany({
        where: { relType: 'VERSION_OF', retractedAt: null, knownUntil: null },
        select: { dstId: true },
        distinct: ['dstId'],
      });

      const results = await Promise.all(
        dishAssertions.map(a => computeDishMargin(a.dstId).catch(err => ({ dishEntityId: a.dstId, error: err.message, marginFlag: 'unknown' })))
      );

      const filtered = flagFilter ? results.filter(r => r.marginFlag === flagFilter) : results;
      const sorted = filtered.sort((a, b) => (a.marginPct ?? 999) - (b.marginPct ?? 999));

      const flagCounts = { low: 0, ok: 0, good: 0, unknown: 0 };
      for (const r of results) flagCounts[r.marginFlag || 'unknown']++;

      return json({ dishes: sorted, flagCounts, total: results.length });
    }
  );
}

// ── Menu tools ────────────────────────────────────────────────────────────────

function registerBrainMenuTools(server) {
  const prisma = getPrisma();

  server.registerTool(
    'brain.menu.create',
    {
      title: 'Create menu draft',
      description: 'Create a new Menu entity as a draft. Dishes are a list of { name, description? } objects.',
      inputSchema: z.object({
        name: z.string().min(1),
        weekOf: z.string().optional(),
        dishes: z.array(z.object({
          name: z.string().min(1),
          description: z.string().optional(),
        })).min(1),
        customerIds: z.array(z.string().min(1)).optional(),
        notes: z.string().optional(),
      }),
    },
    async ({ name, weekOf, dishes, customerIds = [], notes }) => {
      const crypto = require('crypto');
      const { writeLedgerEvent } = require('../api/brain/ledger');
      const shareToken = crypto.randomBytes(20).toString('hex');

      const entity = await prisma.brainEntity.create({
        data: {
          entityType: 'Menu',
          name,
          status: 'draft',
          shareToken,
          properties: { weekOf: weekOf || null, dishes, customerIds, notes: notes || null, broadcastStatus: 'draft' },
        },
      });

      await writeLedgerEvent({
        eventType: 'menu.created',
        source: 'mcp_claude',
        actorType: 'system',
        payload: { menuEntityId: entity.id, name, weekOf, dishCount: dishes.length },
      });

      return json({ ok: true, id: entity.id, shareToken, message: 'Menu draft created. Run brain.menu.broadcast to publish.' });
    }
  );

  server.registerTool(
    'brain.menu.broadcast',
    {
      title: 'Broadcast menu to customers',
      description: 'Run constraint check and publish a Menu entity. Medical constraints always block. Avoid constraints block unless override=true.',
      inputSchema: z.object({
        menuId: z.string().min(1),
        override: z.boolean().optional(),
        overrideReason: z.string().optional(),
      }),
    },
    async ({ menuId, override = false, overrideReason }) => {
      const { writeLedgerEvent } = require('../api/brain/ledger');

      const menu = await prisma.brainEntity.findUnique({ where: { id: menuId } });
      if (!menu || menu.entityType !== 'Menu') throw new Error('menu not found');

      const dishes = menu.properties?.dishes || [];
      const dishNames = dishes.map(d => d.name || d);
      const customerIds = menu.properties?.customerIds || [];

      // Inline constraint check (same logic as menuRoutes.js)
      const allViolations = [];
      for (const cid of customerIds) {
        const customer = await prisma.brainEntity.findFirst({
          where: { id: cid, entityType: 'Customer', tombstonedAt: null },
          include: {
            srcAssertions: {
              where: { relType: { in: ['PREFERS', 'AVOIDS', 'MEDICAL_CONSTRAINT'] }, retractedAt: null, knownUntil: null },
              include: { dst: { select: { id: true, name: true } } },
            },
          },
        });
        if (!customer) continue;
        const dishNamesLower = dishNames.map(d => d.toLowerCase());
        for (const a of customer.srcAssertions) {
          const cname = (a.dst?.name || '').toLowerCase();
          const match = dishNamesLower.find(d => d.includes(cname) || cname.includes(d));
          if (!match) continue;
          const severity = a.metadata?.severity || (a.relType === 'MEDICAL_CONSTRAINT' ? 'medical' : 'preference');
          allViolations.push({ customerId: cid, severity, relType: a.relType, constraint: a.dst?.name, dish: dishNames[dishNamesLower.indexOf(match)] });
        }
      }

      const medicalBlocks = allViolations.filter(v => v.severity === 'medical');
      const avoidBlocks = allViolations.filter(v => v.severity === 'avoid');

      if (medicalBlocks.length > 0) {
        return json({ ok: false, blocked: true, reason: 'medical-constraint', violations: medicalBlocks,
          message: 'Medical constraints violated. Cannot broadcast via MCP — resolve in admin UX.' });
      }

      if (avoidBlocks.length > 0 && !override) {
        return json({ ok: false, blocked: true, reason: 'avoid-constraint', violations: avoidBlocks,
          message: 'Avoid constraints found. Pass override=true with overrideReason to proceed.' });
      }

      if (avoidBlocks.length > 0 && override) {
        await writeLedgerEvent({
          eventType: 'menu.constraint_override',
          source: 'mcp_claude',
          actorType: 'system',
          payload: { menuId, overrideReason: overrideReason || 'no reason given', violations: avoidBlocks },
        });
      }

      await prisma.brainEntity.update({
        where: { id: menuId },
        data: { status: 'active', properties: { ...menu.properties, broadcastStatus: 'published', broadcastAt: new Date().toISOString() } },
      });

      await writeLedgerEvent({
        eventType: 'menu.published',
        source: 'mcp_claude',
        actorType: 'system',
        payload: { menuId, menuName: menu.name, shareToken: menu.shareToken, customerCount: customerIds.length, dishCount: dishes.length },
      });

      return json({
        ok: true,
        shareToken: menu.shareToken,
        portalUrl: `/portal/${menu.shareToken}`,
        customerCount: customerIds.length,
        preferenceViolations: allViolations.filter(v => v.severity === 'preference'),
      });
    }
  );
}

// ── Hypothesis tools ──────────────────────────────────────────────────────────

function registerBrainHypothesisTools(server) {
  const prisma = getPrisma();

  server.registerTool(
    'brain.hypothesis.list',
    {
      title: 'List hypotheses',
      description: 'Return all active hypotheses with their current status, confidence, and sample size. Use this to check which theories are being tracked and how they are progressing.',
      inputSchema: z.object({}),
    },
    async () => {
      const hypotheses = await prisma.brainEntity.findMany({
        where: { entityType: 'Hypothesis', tombstonedAt: null, status: { not: 'archived' } },
        orderBy: { createdAt: 'desc' },
      });
      return json({ hypotheses, count: hypotheses.length });
    }
  );

  server.registerTool(
    'brain.hypothesis.create',
    {
      title: 'Create hypothesis',
      description: 'Create a new machine-checkable hypothesis with a predicate. The predicate has a condition (subject state) and prediction (expected outcome). Supported functions: orderCount(days), spendTotal(days), vendorCount(days), feedbackRating(dish, days), daysSinceLastOrder.',
      inputSchema: z.object({
        name: z.string().min(1).describe('Short name for the hypothesis'),
        statement: z.string().min(1).describe('Plain English statement of the theory'),
        condition: z.string().min(1).describe('e.g. "orderCount(first_30_days) >= 2"'),
        prediction: z.string().min(1).describe('e.g. "orderCount(days_60_to_90) >= 4"'),
        evidenceWindow: z.string().optional().describe('e.g. "90 days"'),
        minSampleSize: z.number().int().min(1).optional().describe('Min data points before concluding (default 3)'),
        subjectEntityId: z.string().optional().describe('Entity this hypothesis is about'),
        notes: z.string().optional(),
      }),
    },
    async ({ name, statement, condition, prediction, evidenceWindow, minSampleSize, subjectEntityId, notes }) => {
      const entity = await prisma.brainEntity.create({
        data: {
          entityType: 'Hypothesis',
          name,
          status: 'active',
          properties: {
            statement,
            predicate: { condition, prediction, evidenceWindow: evidenceWindow || '90 days', minSampleSize: minSampleSize || 3 },
            subjectEntityId: subjectEntityId || null,
            notes: notes || null,
            status: 'collecting',
            confidence: null,
            sampleSize: 0,
            confirmedCount: 0,
            rejectedCount: 0,
            lastEvaluatedAt: null,
          },
        },
      });
      await writeLedgerEvent({
        eventType: 'hypothesis.created',
        source: 'mcp',
        actorType: 'claude',
        payload: { hypothesisId: entity.id, name, statement },
      });
      return json({ ok: true, id: entity.id, name, message: 'Hypothesis created. It will be evaluated in the next nightly pass.' });
    }
  );
}

// ── Semantic search tool ──────────────────────────────────────────────────────

function registerBrainSearchTools(server) {
  const { spawn } = require('child_process');
  const path = require('path');
  const prisma = getPrisma();

  const SIDECAR_DIR = path.resolve(__dirname, '../../brain-sidecar');

  async function vectorSearch(query, { limit = 8, table } = {}) {
    return new Promise((resolve, reject) => {
      const pythonBin = brainPythonBin();
      const script = `
import sys, json
sys.path.insert(0, r'${SIDECAR_DIR.replace(/\\/g, '\\\\')}')
from dotenv import load_dotenv; load_dotenv()
from vector_store import VectorStore
vs = VectorStore()
results = vs.search(${JSON.stringify(query)}, limit=${limit}${table ? `, table_filter=${JSON.stringify(table)}` : ''})
print(json.dumps(results))
`;
      const child = spawn(pythonBin, ['-c', script], { env: { ...process.env }, cwd: SIDECAR_DIR });
      let out = ''; let err = '';
      child.stdout.on('data', d => { out += d; });
      child.stderr.on('data', d => { err += d; });
      child.on('close', code => {
        if (code !== 0) return reject(new Error(err.slice(0, 200) || `exit ${code}`));
        try { resolve(JSON.parse(out.trim())); } catch { reject(new Error('invalid JSON from sidecar')); }
      });
      setTimeout(() => { child.kill(); reject(new Error('sidecar timeout')); }, 10_000);
    });
  }

  server.registerTool(
    'brain.search',
    {
      title: 'Semantic search',
      description: 'Vector search across all brain entities and inbox items. Use this to find vendors, customers, ingredients, or inbox content by meaning — not just exact name match. Falls back to keyword search if embeddings are unavailable.',
      inputSchema: z.object({
        query: z.string().min(1).describe('Natural language search query'),
        limit: z.number().int().min(1).max(20).optional().describe('Max results (default 8)'),
        table: z.enum(['entity', 'assertion', 'inbox']).optional().describe('Restrict to entity, assertion, or inbox results'),
      }),
    },
    async ({ query, limit = 8, table }) => {
      let results;
      let method = 'vector';

      try {
        results = await vectorSearch(query, { limit, table });
      } catch {
        method = 'keyword';
        results = [];
        if (!table || table === 'entity') {
          const entities = await prisma.brainEntity.findMany({
            where: { tombstonedAt: null, name: { contains: query, mode: 'insensitive' } },
            take: limit,
            select: { id: true, entityType: true, name: true },
          });
          results.push(...entities.map(e => ({
            id: `entity:${e.id}`, table: 'entity',
            text: `${e.entityType}: ${e.name}`, score: null,
            metadata: { entityId: e.id, entityType: e.entityType, name: e.name },
          })));
        }
        if (!table || table === 'assertion') {
          const assertions = await prisma.brainAssertion.findMany({
            where: {
              retractedAt: null,
              OR: [
                { relType: { contains: query, mode: 'insensitive' } },
                { src: { name: { contains: query, mode: 'insensitive' } } },
                { dst: { name: { contains: query, mode: 'insensitive' } } },
              ],
            },
            take: limit,
            include: {
              src: { select: { id: true, entityType: true, name: true } },
              dst: { select: { id: true, entityType: true, name: true } },
            },
          });
          results.push(...assertions.map(a => ({
            id: `assertion:${a.id}`, table: 'assertion',
            text: `${a.src?.entityType}: ${a.src?.name} ${a.relType} ${a.dst?.entityType}: ${a.dst?.name}`,
            score: null,
            metadata: { assertionId: a.id, relType: a.relType, src: a.src, dst: a.dst },
          })));
        }
        if (!table || table === 'inbox') {
          const items = await prisma.brainInboxItem.findMany({
            where: { status: 'pending', rawContent: { contains: query, mode: 'insensitive' } },
            take: limit,
            select: { id: true, rawContent: true, source: true },
          });
          results.push(...items.map(i => ({
            id: `inbox:${i.id}`, table: 'inbox',
            text: i.rawContent.slice(0, 200), score: null,
            metadata: { inboxId: i.id, source: i.source },
          })));
        }
      }

      return json({ query, method, results, count: results.length });
    }
  );
}

// ── Registration entry point ──────────────────────────────────────────────────

function registerBrainTools(server) {
  registerBrainReadTools(server);
  registerBrainWriteTools(server);
  registerBrainOntologyTools(server);
  registerBrainMenuTools(server);
  registerBrainHypothesisTools(server);
  registerBrainSearchTools(server);
}

module.exports = { registerBrainTools };
