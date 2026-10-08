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

const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent } = require('./ledger');
const { process: ingestProcess } = require('./ingest/engine');

const AUTO_ACT_THRESHOLD = 0.85;
const OPS_SOURCES = new Set(['gmail', 'square', 'Obsidian']);

// Classification + apply now live in the single ingest engine
// (backend/api/brain/ingest/). This module only drives it per pending inbox
// item and handles inbox-status bookkeeping + Hub routing.

// Mirror of brain-sidecar/hub.py post_to_space — surfaces triage activity in the hub.
async function routeToHub(prisma, { source, action }, logger) {
  try {
    const body = `[${source} -> ${action}]`;
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

async function runTriagePass({ logger, limit = 30, prismaClient = null, processItem = ingestProcess, writeLedgerEventFn = writeLedgerEvent } = {}) {
  const prisma = prismaClient || getPrisma();

  const where = { status: 'pending', triageState: 'eligible' };
  const items = await prisma.brainInboxItem.findMany({
    where,
    orderBy: { capturedAt: 'asc' },
    take: limit,
    select: { id: true, rawContent: true, source: true, triageHint: true },
  });

  let itemsProcessed = 0;
  let itemsWritten = 0;
  let acted = 0;
  let deferred = 0;
  const errors = [];

  for (const item of items) {
    itemsProcessed += 1;
    try {
      const r = await processItem(item.rawContent, { source: item.source || 'node_triage', actor: 'system', noInboxFallback: true }, { commit: true });

      if (r.intent === 'trash' && r.confidence >= AUTO_ACT_THRESHOLD) {
        await prisma.brainInboxItem.update({
          where: { id: item.id },
          data: { status: 'trashed', processedAt: new Date(), triageState: 'classified' },
        });
        itemsWritten += 1;
        await writeLedgerEventFn({ eventType: 'inbox.auto_triaged', source: 'node_triage', sourceId: item.id, payload: { action: 'trash', confidence: r.confidence } });
        acted += 1;
        continue;
      }

      if (r.committed && r.applied && !r.applied.error) {
        const resultEntityId = r.applied.entityId || r.applied.taskId || r.applied.noteId
          || r.applied.results?.[0]?.itemEntityId || null;
        await prisma.brainInboxItem.update({
          where: { id: item.id },
          data: { status: 'triaged', processedAt: new Date(), resultEntityId, triageState: 'classified' },
        });
        itemsWritten += 1;
        await writeLedgerEventFn({ eventType: 'inbox.auto_triaged', source: 'node_triage', sourceId: item.id, payload: { intent: r.intent, confidence: r.confidence, applied: r.applied } });
        await routeToHub(prisma, { source: item.source, action: r.intent }, logger);
        acted += 1;
        continue;
      }

      await prisma.brainInboxItem.update({
        where: { id: item.id },
        data: {
          triageState: 'classified',
          triageHint: {
            ...(item.triageHint && typeof item.triageHint === 'object' && !Array.isArray(item.triageHint) ? item.triageHint : {}),
            intent: r.intent,
            confidence: r.confidence,
            preview: r.preview,
            reason: r.needsConfirmReason,
            fields: r.fields,
            via: r.via,
          },
        },
      });
      itemsWritten += 1;
      await routeToHub(prisma, { source: item.source, action: r.intent }, logger);
      deferred += 1;
    } catch (err) {
      errors.push(`${item.id}: ${err.message}`);
      logger?.warn({ err, itemId: item.id }, 'brain/triage: item failed');
    }
  }

  const eligibleBacklog = await prisma.brainInboxItem.count({ where });
  const noNewData = eligibleBacklog === 0 && itemsProcessed === 0;
  const blocked = eligibleBacklog > 0 && itemsWritten === 0 && errors.length === 0;
  const status = blocked ? 'blocked' : errors.length > 0 ? 'partial' : undefined;
  logger?.info({ itemsProcessed, itemsWritten, eligibleBacklog, acted, deferred, errors: errors.length }, 'brain/triage: pass complete');
  return {
    itemsProcessed,
    itemsWritten,
    eligibleBacklog,
    acted,
    deferred,
    errors,
    ...(noNewData ? { noNewData: true } : {}),
    ...(blocked ? { blocked: true } : {}),
    ...(status ? { status } : {}),
  };

}

module.exports = { runTriagePass };
