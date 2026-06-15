/**
 * Brain inbox triage — Node port of brain-sidecar/jobs/triage_inbox.py.
 *
 * Runs in the deployed backend (no Python required), so triage hints and
 * auto-actions happen on a Vercel cron instead of only when the founder's
 * desktop runs the sidecar.
 *
 * Per pending BrainInboxItem without a triageHint:
 *   1. Classify with Claude (structured output) into:
 *      new_entity | append_entity | new_task | trash | needs_human
 *   2. Auto-act on high-confidence clear cases:
 *      - trash       (confidence >= 0.85)
 *      - new_entity  (confidence >= 0.85, safe entity types, via findOrCreateEntity)
 *   3. Everything else keeps status=pending with a structured triageHint for
 *      the inbox drawer. rawContent is never mutated.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { Prisma } = require('@prisma/client');
const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent, findOrCreateEntity } = require('./ledger');

const AUTO_ACT_THRESHOLD = 0.85;
const SAFE_AUTO_ENTITY_TYPES = new Set(['Vendor', 'Ingredient', 'Customer']);
const OPS_SOURCES = new Set(['gmail', 'square', 'Obsidian']);
const MODEL = process.env.BRAIN_TRIAGE_MODEL || 'claude-opus-4-8';

const SOURCE_HINTS = {
  gmail:
    'Came from Gmail. Likely a vendor quote, supplier invoice, customer inquiry, payment confirmation, ' +
    'or a food-industry contact. Vendor and Ingredient entities are common here. ' +
    'SaaS receipts, marketing emails, and personal emails -> trash.',
  square:
    'Came from Square. This is a payment or transaction record. ' +
    'Likely a Customer payment or event sale. Financial data -> needs_human unless clearly a routine payment.',
  admin_ux:
    'Manually typed by the founder in the web app. Could be anything: a vendor name to remember, ' +
    'a task, a quick note, a customer name, or a business idea. Read literally - capture exactly what was typed.',
  Drafts:
    'Came from Apple Drafts (iOS notes app). Likely a quick capture during physical kitchen work: ' +
    'vendor contact, ingredient price overheard, task reminder, or meeting note.',
  Obsidian:
    'Came from Obsidian (structured notes). Likely a longer note, meeting summary, business decision, ' +
    'or research finding. Note and Task entities are common here.',
  Shortcut:
    'Came from an iOS Shortcut (quick capture button). Very brief, single-idea captures. ' +
    'Often a vendor name, ingredient, or to-do.',
  portal:
    'Came from the customer menu feedback portal. Usually a disliked dish with optional notes. ' +
    'Customer and Dish entities are common here.',
};

const TRIAGE_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['new_entity', 'append_entity', 'new_task', 'trash', 'needs_human'] },
    entityType: { type: ['string', 'null'], description: 'Entity type for new_entity/append_entity, e.g. Vendor, Customer, Ingredient, Dish, Note' },
    entityName: { type: ['string', 'null'], description: 'Exact entity name for new_entity, or the known entity to append to' },
    note: { type: ['string', 'null'], description: 'For append_entity: the note text to attach' },
    taskTitle: { type: ['string', 'null'], description: 'For new_task: short imperative task title' },
    confidence: { type: 'number', description: 'Confidence 0.1-0.95' },
    rationale: { type: 'string', description: 'One sentence explaining the decision' },
  },
  required: ['action', 'entityType', 'entityName', 'note', 'taskTitle', 'confidence', 'rationale'],
  additionalProperties: false,
};

let anthropicClient = null;
function getAnthropic() {
  if (!anthropicClient) anthropicClient = new Anthropic();
  return anthropicClient;
}

async function loadEntityContext(prisma) {
  try {
    const rows = await prisma.brainEntity.findMany({
      where: { tombstonedAt: null },
      orderBy: [{ entityType: 'asc' }, { name: 'asc' }],
      take: 500,
      select: { entityType: true, name: true },
    });
    const byType = new Map();
    for (const r of rows) {
      if (!byType.has(r.entityType)) byType.set(r.entityType, []);
      byType.get(r.entityType).push(r.name);
    }
    const lines = ['Known entities in the knowledge graph:'];
    for (const [etype, names] of [...byType.entries()].sort()) {
      lines.push(`  ${etype}s: ${names.slice(0, 40).join(', ')}`);
    }
    return lines.join('\n');
  } catch {
    return 'No existing entities available.';
  }
}

function buildPrompt(rawContent, source, entityContext) {
  const sourceHint = SOURCE_HINTS[source] || `Source: ${source}.`;
  return `You are triaging captured notes for Local Effort Food's knowledge graph.

BUSINESS CONTEXT:
Local Effort Food is a small Minneapolis food business run by Weston Smith.
Revenue lines: Weekly Meal Subscription (household meal boxes), Private Dinners & Events,
Local Effort Pizza (pop-up events), Happy Monday wholesale, and Catering.
Key entity types: Vendor (food suppliers), Customer (subscribers/event clients),
Ingredient, Dish, Menu, Task, Note, Event, StaffRole.

SOURCE HINT:
${sourceHint}

${entityContext}

RULES:
- If entityName closely matches a known entity above -> prefer append_entity over new_entity.
- If content is a to-do, reminder, or action for the founder -> new_task.
- If content names a person, company, or ingredient not in the known list -> new_entity.
- If content is clearly noise, a duplicate, or unrelated to the food business -> trash.
- If you are unsure about anything - stakes, category, or match -> needs_human.
- Financial decisions, legal documents, or content affecting multiple parties -> needs_human.

CONTENT:
${rawContent}`;
}

async function classifyItem(rawContent, source, entityContext) {
  const client = getAnthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(rawContent, source, entityContext) }],
    output_config: { format: { type: 'json_schema', schema: TRIAGE_SCHEMA } },
  });
  const text = response.content.find((b) => b.type === 'text')?.text;
  if (!text) throw new Error('triage: empty model response');
  const decision = JSON.parse(text);
  decision.confidence = Math.min(0.95, Math.max(0.1, Number(decision.confidence) || 0.5));
  return decision;
}

function validateDecision(decision) {
  const errors = [];
  if (decision.action === 'new_entity' && !decision.entityName) errors.push('entityName required for new_entity');
  if (decision.action === 'new_task' && !decision.taskTitle) errors.push('taskTitle required for new_task');
  return errors;
}

// Mirror of brain-sidecar/hub.py post_to_space — surfaces triage activity in the hub.
async function routeToHub(prisma, { source, action, raw, entityName }, logger) {
  try {
    const snippet = raw.slice(0, 80).replace(/\n/g, ' ');
    const body = `[${source} -> ${action}] ${snippet}${entityName ? ` — ${entityName}` : ''}`;
    let spaceKey = null;
    let title = null;
    if (OPS_SOURCES.has(source)) {
      spaceKey = 'ops-alerts';
      title = 'Ops Alerts';
    } else if (action === 'new_task') {
      spaceKey = 'admin';
      title = 'Admin';
    }
    if (!spaceKey) return;

    const space = await prisma.hubSpace.findFirst({ where: { key: spaceKey }, select: { id: true } });
    if (!space) return;

    let thread = await prisma.objectThread.findFirst({
      where: { objectType: 'hub_space', objectId: space.id, visibility: 'admin' },
    });
    if (!thread) {
      thread = await prisma.objectThread.create({
        data: { objectType: 'hub_space', objectId: space.id, visibility: 'admin', title },
      });
    }
    await prisma.objectThreadMessage.create({
      data: { threadId: thread.id, senderId: 'system', senderRole: 'bot', body },
    });
    await prisma.objectThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
  } catch (err) {
    logger?.warn({ err }, 'brain/triage: hub routing failed');
  }
}

async function runTriagePass({ logger, limit = 30 } = {}) {
  const prisma = getPrisma();
  if (!process.env.ANTHROPIC_API_KEY) {
    logger?.warn('brain/triage: ANTHROPIC_API_KEY not set — skipping pass');
    return { acted: 0, deferred: 0, errors: ['ANTHROPIC_API_KEY not set'] };
  }

  const items = await prisma.brainInboxItem.findMany({
    where: { status: 'pending', triageHint: { equals: Prisma.AnyNull } },
    orderBy: { capturedAt: 'desc' },
    take: limit,
    select: { id: true, rawContent: true, source: true },
  });
  if (!items.length) return { acted: 0, deferred: 0, errors: [] };

  const entityContext = await loadEntityContext(prisma);
  let acted = 0;
  let deferred = 0;
  const errors = [];

  for (const item of items) {
    try {
      const decision = await classifyItem(item.rawContent, item.source, entityContext);

      if (validateDecision(decision).length > 0) {
        deferred += 1;
        continue;
      }

      // Auto-trash high-confidence noise
      if (decision.action === 'trash' && decision.confidence >= AUTO_ACT_THRESHOLD) {
        await prisma.brainInboxItem.update({
          where: { id: item.id },
          data: { status: 'trashed', processedAt: new Date() },
        });
        await writeLedgerEvent({
          eventType: 'inbox.auto_triaged',
          source: 'node_triage',
          sourceId: item.id,
          payload: { action: 'trash', confidence: decision.confidence, rationale: decision.rationale },
        });
        acted += 1;
        continue;
      }

      // Auto-create safe entity types
      if (
        decision.action === 'new_entity' &&
        decision.confidence >= AUTO_ACT_THRESHOLD &&
        SAFE_AUTO_ENTITY_TYPES.has(decision.entityType) &&
        decision.entityName
      ) {
        const { entity, created, blocked, blockReason } = await findOrCreateEntity({
          entityType: decision.entityType,
          name: decision.entityName,
        });
        // Self-identity guard refused this (business's own address/name minted
        // as a counterparty). Don't crash the run — leave it as a hint instead.
        if (blocked || !entity) {
          logger?.info({ item: item.id, entityName: decision.entityName, blockReason }, 'brain/triage: skipped self-identity mint');
          await prisma.brainInboxItem.update({
            where: { id: item.id },
            data: {
              triageHint: { action: 'blocked', entityType: decision.entityType, entityName: decision.entityName, note: blockReason || 'self-identity guard' },
            },
          });
          continue;
        }
        await writeLedgerEvent({
          eventType: 'inbox.auto_triaged',
          source: 'node_triage',
          sourceId: item.id,
          payload: {
            action: 'new_entity',
            entityType: decision.entityType,
            entityName: decision.entityName,
            entityId: entity.id,
            created,
            confidence: decision.confidence,
            rationale: decision.rationale,
          },
        });
        await prisma.brainInboxItem.update({
          where: { id: item.id },
          data: { status: 'triaged', processedAt: new Date(), resultEntityId: entity.id },
        });
        await routeToHub(prisma, { source: item.source, action: decision.action, raw: item.rawContent, entityName: decision.entityName }, logger);
        acted += 1;
        continue;
      }

      // Otherwise leave pending with a structured hint for the drawer
      const hint = {
        action: decision.action,
        entityType: decision.entityType || null,
        entityName: decision.entityName || null,
        note: decision.note || null,
        taskTitle: decision.taskTitle || null,
        confidence: decision.confidence,
        rationale: decision.rationale,
        matchedEntityId: null,
      };
      if (decision.action === 'append_entity' && decision.entityName) {
        const matched = await prisma.brainEntity.findFirst({
          where: { name: { equals: decision.entityName, mode: 'insensitive' }, tombstonedAt: null },
          select: { id: true },
        });
        if (matched) hint.matchedEntityId = matched.id;
      }
      await prisma.brainInboxItem.update({ where: { id: item.id }, data: { triageHint: hint } });
      await routeToHub(prisma, {
        source: item.source,
        action: decision.action,
        raw: item.rawContent,
        entityName: decision.entityName || decision.taskTitle,
      }, logger);
      deferred += 1;
    } catch (err) {
      errors.push(`${item.id}: ${err.message}`);
      logger?.warn({ err, itemId: item.id }, 'brain/triage: item failed');
      deferred += 1;
    }
  }

  logger?.info({ acted, deferred, errors: errors.length }, 'brain/triage: pass complete');
  return { acted, deferred, errors };
}

module.exports = { runTriagePass };
