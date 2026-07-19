/**
 * Brain inbox triage — Vercel cron that drains pending BrainInboxItems through
 * the SINGLE ingest engine (backend/api/brain/ingest/). This module no longer
 * classifies or applies on its own; it calls `ingestEngine.process(commit)` per
 * item and handles inbox bookkeeping:
 *   - engine applied it       -> mark triaged, write inbox.auto_triaged, route to Hub
 *   - high-confidence trash    -> mark trashed
 *   - otherwise                -> leave pending with the engine's parse as a
 *                                 triageHint for the drawer. rawContent is never mutated.
 */

const { Prisma } = require('@prisma/client');
const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent } = require('./ledger');
const { process: ingestProcess } = require('./ingest/engine');
const { hasLlm } = require('./llmJson');

const AUTO_ACT_THRESHOLD = 0.85;
const OPS_SOURCES = new Set(['gmail', 'square', 'Obsidian']);

// Classification + apply now live in the single ingest engine
// (backend/api/brain/ingest/). This module only drives it per pending inbox
// item and handles inbox-status bookkeeping + Hub routing.

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
  if (!hasLlm()) {
    logger?.warn('brain/triage: no LLM provider configured — skipping pass');
    return { acted: 0, deferred: 0, errors: ['no ANTHROPIC_API_KEY or OPENAI_API_KEY set'] };
  }

  const items = await prisma.brainInboxItem.findMany({
    where: { status: 'pending', triageHint: { equals: Prisma.AnyNull } },
    orderBy: { capturedAt: 'desc' },
    take: limit,
    select: { id: true, rawContent: true, source: true },
  });
  if (!items.length) return { acted: 0, deferred: 0, errors: [] };

  let acted = 0;
  let deferred = 0;
  const errors = [];

  for (const item of items) {
    try {
      // Single ingest engine: classify → resolve → apply (commit). The engine
      // auto-applies confident/safe results and otherwise leaves the item
      // pending with a triageHint (it writes nothing on needs_human/low-conf).
      const r = await ingestProcess(item.rawContent, { source: item.source || 'node_triage', actor: 'system', noInboxFallback: true }, { commit: true });

      // trash is classification-only in the engine (never applied) — handle the
      // high-confidence auto-trash here so noise still clears the queue.
      if (r.intent === 'trash' && r.confidence >= AUTO_ACT_THRESHOLD) {
        await prisma.brainInboxItem.update({ where: { id: item.id }, data: { status: 'trashed', processedAt: new Date() } });
        await writeLedgerEvent({ eventType: 'inbox.auto_triaged', source: 'node_triage', sourceId: item.id, payload: { action: 'trash', confidence: r.confidence } });
        acted += 1;
        continue;
      }

      if (r.committed && r.applied && !r.applied.error) {
        // The engine applied it. Mark this inbox item triaged + route to Hub.
        const resultEntityId = r.applied.entityId || r.applied.taskId || r.applied.noteId
          || r.applied.results?.[0]?.itemEntityId || null;
        await prisma.brainInboxItem.update({ where: { id: item.id }, data: { status: 'triaged', processedAt: new Date(), resultEntityId } });
        await writeLedgerEvent({ eventType: 'inbox.auto_triaged', source: 'node_triage', sourceId: item.id, payload: { intent: r.intent, confidence: r.confidence, applied: r.applied } });
        await routeToHub(prisma, { source: item.source, action: r.intent, raw: item.rawContent, entityName: r.preview?.summary }, logger);
        acted += 1;
        continue;
      }

      // Not applied: leave a structured hint for the drawer (engine already
      // captured a fallback inbox item if commit produced one; here we annotate
      // THIS item so the founder sees what the engine understood).
      await prisma.brainInboxItem.update({
        where: { id: item.id },
        data: { triageHint: { intent: r.intent, confidence: r.confidence, preview: r.preview, reason: r.needsConfirmReason, fields: r.fields, via: r.via } },
      });
      await routeToHub(prisma, { source: item.source, action: r.intent, raw: item.rawContent, entityName: r.preview?.summary }, logger);
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
