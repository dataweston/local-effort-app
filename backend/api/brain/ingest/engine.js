/**
 * Unified ingest engine — the SINGLE classify→resolve→apply core.
 *
 * Every ingest entry point (Hub QuickCapture, Drafts, the inbox-triage cron,
 * MCP) calls `process()`. Apply logic lives ONLY in the canonical write helpers
 * referenced here — nothing re-implements it, so there's no drift.
 *
 *   process(text, ctx, { commit }) ->
 *     { intent, confidence, via, resolved, needsConfirm, preview, applied? }
 *
 * Verification policy (less, not none):
 *   - commit:false  -> classify + resolve only, return preview (no writes)
 *   - commit:true   -> apply IF (confidence >= intent threshold AND not blocked
 *                      by the medical-always-confirm rule). Otherwise the result
 *                      is routed to the inbox as a pending item with the parse as
 *                      a triageHint (captured, surfaced, never silently dropped).
 */

const { getPrisma } = require('../../utils/prisma');
const { classify } = require('./classify');
const { writeLedgerEvent, findOrCreateEntity, createInboxItem, canonicalName } = require('../ledger');
const { applyConstraintCorrection } = require('../constraintCorrection');
const { setPricing } = require('../ontologyHelpers');
const { resolveEntity } = require('../resolver');

// Confidence at/above which a commit auto-applies without an explicit confirm.
const AUTO_APPLY_THRESHOLD = {
  constraint_correction: 0.8,
  vendor_price: 0.75,
  task: 0.7,
  new_entity: 0.8,
  append_note: 0.7,
  trash: 0.9,
  needs_human: 1.1, // never auto-applies
};

// ── STAGE 2: resolve — bind named refs via the shared resolver ─────────────────
// Uses resolveEntity (FK anchor → alias → canonicalName, with backfill) so every
// capture binds to the same canonical node the projectors and syncs use, and
// each match enriches the entity (alias/FK) for cheaper future resolution.

async function resolve(prisma, intent, fields, ctx) {
  const resolved = {};
  if (intent === 'constraint_correction') {
    if (ctx?.customerId) {
      const c = await prisma.brainEntity.findFirst({ where: { id: ctx.customerId, entityType: 'Customer', tombstonedAt: null }, select: { id: true, name: true } });
      resolved.customer = c || null;
    } else {
      const r = await resolveEntity({ type: 'Customer', name: fields.customerRef });
      resolved.customer = r.entity;
    }
  } else if (intent === 'vendor_price') {
    resolved.ingredient = (await resolveEntity({ type: 'Ingredient', name: fields.item })).entity;
    resolved.vendor = fields.vendorRef ? (await resolveEntity({ type: 'Vendor', name: fields.vendorRef })).entity : null;
  } else if (intent === 'new_entity') {
    resolved.existing = (await resolveEntity({ type: fields.entityType, name: fields.name })).entity;
  }
  return resolved;
}

// needsConfirm: medical always; otherwise when below auto threshold or a required
// ref didn't resolve.
function computeNeedsConfirm(intent, confidence, fields, resolved) {
  if (intent === 'constraint_correction') {
    const hasMedical = (fields.corrections || []).some(c => c.severity === 'medical');
    if (hasMedical) return { needsConfirm: true, reason: 'medical-always-confirm' };
    if (!resolved.customer) return { needsConfirm: true, reason: 'customer-unresolved' };
  }
  if (intent === 'vendor_price' && !resolved.ingredient) {
    return { needsConfirm: true, reason: 'ingredient-unresolved' };
  }
  if (confidence < (AUTO_APPLY_THRESHOLD[intent] ?? 1.1)) {
    return { needsConfirm: true, reason: 'low-confidence' };
  }
  return { needsConfirm: false, reason: null };
}

function buildPreview(intent, fields, resolved) {
  switch (intent) {
    case 'constraint_correction':
      return {
        summary: `${resolved.customer?.name || fields.customerRef || '(unknown customer)'}: ` +
          (fields.corrections || []).map(c => `${c.direction === 'prefers' ? 'PREFER' : 'AVOID'} ${c.item}` +
            (c.severity === 'medical' ? ' ⚠medical' : '') + (c.validUntil ? ` until ${String(c.validUntil).slice(0, 10)}` : '')).join('; '),
        customerResolved: !!resolved.customer,
      };
    case 'vendor_price':
      return { summary: `${fields.item} @ $${(fields.priceCents / 100).toFixed(2)}/${fields.unit}` + (resolved.vendor ? ` from ${resolved.vendor.name}` : fields.vendorRef ? ` from ${fields.vendorRef} (new)` : ''), ingredientResolved: !!resolved.ingredient };
    case 'task':
      return { summary: `Task: ${fields.title}` };
    case 'new_entity':
      return { summary: `${fields.entityType}: ${fields.name}` + (resolved.existing ? ' (exists — will append)' : ' (new)') };
    case 'append_note':
      return { summary: `Note: ${(fields.note || '').slice(0, 80)}` };
    case 'trash':
      return { summary: 'Discard (noise)' };
    default:
      return { summary: 'Needs human review' };
  }
}

// ── STAGE 3: apply — the ONLY copies of write logic live behind these calls ────

async function apply(prisma, intent, fields, resolved, ctx) {
  const actor = ctx?.actor || 'founder';
  switch (intent) {
    case 'constraint_correction': {
      const results = [];
      for (const c of fields.corrections || []) {
        results.push(await applyConstraintCorrection({
          customerId: resolved.customer?.id,
          name: resolved.customer ? undefined : fields.customerRef,
          item: c.item, kind: c.kind || 'ingredient', direction: c.direction, severity: c.severity,
          validUntil: c.validUntil || null, note: ctx?.text || null, actor,
        }));
      }
      return { kind: 'constraint_correction', count: results.length, results };
    }
    case 'vendor_price': {
      // Resolve-or-create ingredient + vendor (vendor optional → "Unknown vendor" not minted; require a vendor).
      const ing = resolved.ingredient || (await findOrCreateEntity({ entityType: 'Ingredient', name: fields.item, properties: { source: 'ingest:vendor_price', unit: fields.unit } })).entity;
      let vendor = resolved.vendor;
      if (!vendor && fields.vendorRef) {
        const v = await findOrCreateEntity({ entityType: 'Vendor', name: fields.vendorRef, properties: { source: 'ingest:vendor_price' } });
        vendor = v.entity;
      }
      if (!vendor) return { kind: 'vendor_price', error: 'no vendor — capture needs "from <vendor>"' };
      const assertion = await setPricing({ ingredientId: ing.id, vendorId: vendor.id, pricePerUnit: fields.priceDollars ?? (fields.priceCents / 100), unit: fields.unit });
      return { kind: 'vendor_price', ingredientId: ing.id, vendorId: vendor.id, assertionId: assertion.id };
    }
    case 'task': {
      const event = await writeLedgerEvent({ eventType: 'task.captured', source: ctx?.source || 'ingest', actorType: 'founder', payload: { title: fields.title } });
      const task = await prisma.brainEntity.create({ data: { entityType: 'Task', name: fields.title, properties: { status: 'open', dueDate: fields.dueDate || null, source: ctx?.source || 'ingest' }, status: 'active' } });
      // Optional link to a subject entity (ASSIGNED_TO), used by manual inbox triage.
      if (fields.entityId) {
        await prisma.brainAssertion.create({ data: { srcId: task.id, dstId: fields.entityId, relType: 'ASSIGNED_TO', confidence: 1.0, sourceType: 'manual', createdBy: actor } });
      }
      return { kind: 'task', taskId: task.id, ledgerEventId: event.id };
    }
    case 'new_entity': {
      if (resolved.existing) return { kind: 'new_entity', existing: true, entityId: resolved.existing.id };
      const { entity, created, blocked, blockReason } = await findOrCreateEntity({ entityType: fields.entityType, name: fields.name, properties: fields.properties || { source: 'ingest', note: fields.note || null } });
      if (blocked || !entity) return { kind: 'new_entity', error: blockReason || 'self-identity guard' };
      // Merge supplied properties onto an existing match (parity with old inbox route).
      if (!created && fields.properties && typeof fields.properties === 'object') {
        await prisma.brainEntity.update({ where: { id: entity.id }, data: { properties: { ...(entity.properties || {}), ...fields.properties } } });
      }
      return { kind: 'new_entity', entityId: entity.id, created };
    }
    case 'append_note': {
      // Attach a Note to an existing entity (fields.entityId) via ABOUT, or create
      // a standalone Note when no target is given.
      const note = await prisma.brainEntity.create({ data: { entityType: 'Note', name: (fields.note || '').slice(0, 80), properties: { content: fields.note, source: ctx?.source || 'ingest' }, status: 'active' } });
      if (fields.entityId) {
        await prisma.brainAssertion.create({ data: { srcId: note.id, dstId: fields.entityId, relType: 'ABOUT', confidence: 1.0, sourceType: 'manual', createdBy: actor } });
      }
      return { kind: 'append_note', noteId: note.id, attachedTo: fields.entityId || null };
    }
    case 'trash':
      return { kind: 'trash' };
    default:
      return { kind: 'needs_human' };
  }
}

// ── Orchestrator ───────────────────────────────────────────────────────────────

async function process(text, ctx = {}, { commit = false } = {}) {
  const prisma = getPrisma();
  const cls = await classify(text, ctx);
  const fields = cls.fields || {};
  const resolved = await resolve(prisma, cls.intent, fields, ctx);
  const { needsConfirm, reason } = computeNeedsConfirm(cls.intent, cls.confidence, fields, resolved);
  const preview = buildPreview(cls.intent, fields, resolved);

  const base = {
    intent: cls.intent, confidence: cls.confidence, via: cls.via,
    fields, resolved, needsConfirm, needsConfirmReason: reason, preview,
    rationale: cls.rationale || null,
  };

  if (!commit) return { ...base, committed: false };

  // Commit path. Auto-apply only when allowed; otherwise capture to inbox.
  const canAuto = !needsConfirm;
  // `force:true` lets an explicit operator confirm apply a needsConfirm result
  // (except it can't bypass classification into needs_human/trash).
  const allowApply = canAuto || ctx.force === true;
  if (allowApply && cls.intent !== 'needs_human' && cls.intent !== 'trash') {
    try {
      const applied = await apply(prisma, cls.intent, fields, resolved, { ...ctx, text });
      await writeLedgerEvent({
        eventType: 'ingest.applied', source: ctx.source || 'ingest', actorType: 'founder',
        payload: { intent: cls.intent, confidence: cls.confidence, via: cls.via, applied, forced: !canAuto },
      });
      return { ...base, committed: true, applied };
    } catch (err) {
      // fall through to inbox capture on apply error
      base.applyError = err.message;
    }
  }

  // Not auto-appliable (or errored). Callers that are themselves draining an
  // existing inbox item (the triage cron) pass noInboxFallback to avoid minting
  // a duplicate row — they annotate the original item with the returned parse.
  if (ctx.noInboxFallback) {
    return { ...base, committed: false, capturedToInbox: false };
  }
  const ledgerEvent = await writeLedgerEvent({
    eventType: 'inbox.captured', source: ctx.source || 'ingest', actorType: 'founder',
    payload: { rawContent: text, intent: cls.intent, confidence: cls.confidence, preview, needsConfirmReason: reason },
  });
  const item = await prisma.brainInboxItem.create({
    data: {
      rawContent: text, source: ctx.source || 'ingest', status: 'pending',
      triageHint: { intent: cls.intent, confidence: cls.confidence, fields, preview, via: cls.via, reason },
    },
  });
  return { ...base, committed: false, capturedToInbox: true, inboxItemId: item.id, ledgerEventId: ledgerEvent.id };
}

/**
 * Direct apply — for callers that already know the intent + fields (e.g. a
 * founder's manual inbox-triage click). Skips classification. Resolves refs,
 * runs the canonical apply, writes an ingest.applied ledger event.
 * Returns { ok, applied } or throws.
 */
async function applyDirect(intent, fields, ctx = {}) {
  const prisma = getPrisma();
  const resolved = await resolve(prisma, intent, fields, ctx);
  const applied = await apply(prisma, intent, fields, resolved, ctx);
  await writeLedgerEvent({
    eventType: 'ingest.applied', source: ctx.source || 'ingest', actorType: 'founder',
    payload: { intent, applied, direct: true },
  });
  return { ok: true, applied };
}

module.exports = { process, applyDirect, apply, resolve, AUTO_APPLY_THRESHOLD };
