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

const { createHash } = require('node:crypto');
const { getPrisma } = require('../../utils/prisma');
const { classify } = require('./classify');
const {
  writeLedgerEvent,
  findOrCreateEntity,
  createInboxItem,
  canonicalName,
} = require('../ledger');
const { applyConstraintCorrection } = require('../constraintCorrection');
const { setPricing } = require('../ontologyHelpers');
const { resolveEntity } = require('../resolver');
const { reconcilePlannerWorkBlocks } = require('../../planner/workBlocks');
const { runPlannerCardLifecycle } = require('../../planner/lifecycle');

// Confidence at/above which a commit auto-applies without an explicit confirm.
const AUTO_APPLY_THRESHOLD = {
  constraint_correction: 0.8,
  vendor_price: 0.75,
  task: 0.7,
  new_entity: 0.8,
  append_note: 0.7,
  trash: 0.9,
  needs_human: 1.1, // never auto-applies
  event: 1.1, // operational dates always require an explicit confirmation
};

// ── STAGE 2: resolve — bind named refs via the shared resolver ─────────────────
// Uses resolveEntity (FK anchor → alias → canonicalName, with backfill) so every
// capture binds to the same canonical node the projectors and syncs use, and
// each match enriches the entity (alias/FK) for cheaper future resolution.

async function resolve(prisma, intent, fields, ctx) {
  const resolved = {};
  if (intent === 'constraint_correction') {
    if (ctx?.customerId) {
      const c = await prisma.brainEntity.findFirst({
        where: { id: ctx.customerId, entityType: 'Customer', tombstonedAt: null },
        select: { id: true, name: true },
      });
      resolved.customer = c || null;
    } else {
      const r = await resolveEntity({ type: 'Customer', name: fields.customerRef });
      resolved.customer = r.entity;
    }
  } else if (intent === 'vendor_price') {
    resolved.ingredient = (await resolveEntity({ type: 'Ingredient', name: fields.item })).entity;
    resolved.vendor = fields.vendorRef
      ? (await resolveEntity({ type: 'Vendor', name: fields.vendorRef })).entity
      : null;
  } else if (intent === 'new_entity') {
    resolved.existing = (
      await resolveEntity({ type: fields.entityType, name: fields.name })
    ).entity;
  }
  return resolved;
}

// needsConfirm: medical always; otherwise when below auto threshold or a required
// ref didn't resolve.
function computeNeedsConfirm(intent, confidence, fields, resolved, ctx) {
  if (intent === 'constraint_correction') {
    const hasMedical = (fields.corrections || []).some((c) => c.severity === 'medical');
    if (hasMedical) return { needsConfirm: true, reason: 'medical-always-confirm' };
    if (!resolved.customer) return { needsConfirm: true, reason: 'customer-unresolved' };
  }
  if (intent === 'vendor_price' && !resolved.ingredient) {
    return { needsConfirm: true, reason: 'ingredient-unresolved' };
  }
  if (intent === 'event') {
    if (!isValidPlannerDate(fields.date)) {
      return { needsConfirm: true, reason: 'event-date-required' };
    }
    if (!ctx?.plannerUid) {
      return { needsConfirm: true, reason: 'planner-unavailable' };
    }
    return { needsConfirm: true, reason: 'event-always-confirm' };
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
        summary:
          `${resolved.customer?.name || fields.customerRef || '(unknown customer)'}: ` +
          (fields.corrections || [])
            .map(
              (c) =>
                `${c.direction === 'prefers' ? 'PREFER' : 'AVOID'} ${c.item}` +
                (c.severity === 'medical' ? ' ⚠medical' : '') +
                (c.validUntil ? ` until ${String(c.validUntil).slice(0, 10)}` : '')
            )
            .join('; '),
        customerResolved: !!resolved.customer,
      };
    case 'vendor_price':
      return {
        summary:
          `${fields.item} @ $${(fields.priceCents / 100).toFixed(2)}/${fields.unit}` +
          (resolved.vendor
            ? ` from ${resolved.vendor.name}`
            : fields.vendorRef
              ? ` from ${fields.vendorRef} (new)`
              : ''),
        ingredientResolved: !!resolved.ingredient,
      };
    case 'task':
      return { summary: `Task: ${fields.title}` };
    case 'event': {
      const serviceTime = fields.startTime
        ? ` ${fields.startTime}${fields.endTime ? `–${fields.endTime}` : ''}`
        : ' (time TBD)';
      const prep = fields.prepDate
        ? `; prep ${fields.prepDate}${fields.prepStartTime ? ` ${fields.prepStartTime}${fields.prepEndTime ? `–${fields.prepEndTime}` : ''}` : ''}`
        : '; prep needs scheduling';
      return {
        summary: `Event: ${fields.title || 'Untitled'} — ${fields.date || 'date required'}${serviceTime}${prep}`,
      };
    }
    case 'new_entity':
      return {
        summary:
          `${fields.entityType}: ${fields.name}` +
          (resolved.existing ? ' (exists — will append)' : ' (new)'),
      };
    case 'append_note':
      return { summary: `Note: ${(fields.note || '').slice(0, 80)}` };
    case 'trash':
      return { summary: 'Discard (noise)' };
    default:
      return { summary: 'Needs human review' };
  }
}

// ── STAGE 3: apply — the ONLY copies of write logic live behind these calls ────

function isValidPlannerDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, date));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === date
  );
}

function plannerDayOfWeek(date) {
  if (!isValidPlannerDate(date)) throw new Error('A valid event date is required');
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
}

function eventCaptureKey(fields, ctx) {
  const identity =
    ctx?.captureId ||
    `${ctx?.source || 'ingest'}:${ctx?.text || ''}:${fields.date || ''}:${fields.title || ''}`;
  return createHash('sha256').update(String(identity)).digest('hex').slice(0, 24);
}

async function applyEvent(prisma, fields, ctx) {
  if (!ctx?.plannerUid) throw new Error('A planner identity is required to create an event');
  if (!isValidPlannerDate(fields.date)) throw new Error('A valid event date is required');

  const source = ctx.source || 'ingest';
  const captureKey = eventCaptureKey(fields, ctx);
  const cardId = `brain-event-${captureKey}`;
  const title =
    String(fields.title || 'Untitled event')
      .trim()
      .slice(0, 160) || 'Untitled event';
  const status = ['inquiry', 'tentative', 'confirmed', 'scheduled'].includes(fields.status)
    ? fields.status
    : 'inquiry';
  const financialMetadata = {
    captureSource: source,
    captureId: ctx.captureId || captureKey,
    prepSchedulingStatus: fields.prepDate ? 'scheduled' : 'needs_schedule',
  };
  for (const key of [
    'location',
    'guestEstimate',
    'menuSummary',
    'prepDate',
    'prepStartTime',
    'prepEndTime',
  ]) {
    if (fields[key] !== null && fields[key] !== undefined && fields[key] !== '') {
      financialMetadata[key] = fields[key];
    }
  }
  if (ctx.customerName) financialMetadata.clientName = String(ctx.customerName).trim();
  if (ctx.customerId) financialMetadata.clientEntityId = String(ctx.customerId);
  if (Array.isArray(ctx.evidenceRefs)) {
    const evidenceRefs = [
      ...new Set(ctx.evidenceRefs.map((ref) => String(ref).trim()).filter(Boolean)),
    ];
    if (evidenceRefs.length) financialMetadata.evidenceRefs = evidenceRefs;
  }

  const ledgerEvent = await writeLedgerEvent({
    prismaClient: prisma,
    eventType: 'planner.event.captured',
    source,
    sourceId: ctx.captureId || captureKey,
    actorType: 'founder',
    payload: {
      plannerCardId: cardId,
      title,
      date: fields.date,
      startTime: fields.startTime || null,
      endTime: fields.endTime || null,
    },
  });

  const applied = await prisma.$transaction(async (tx) => {
    const existingCard = await tx.plannerCard.findUnique({ where: { id: cardId } });
    if (existingCard && existingCard.supabaseUid !== ctx.plannerUid) {
      throw new Error('Captured event id belongs to another planner');
    }

    const card =
      existingCard ||
      (await tx.plannerCard.create({
        data: {
          id: cardId,
          supabaseUid: ctx.plannerUid,
          title,
          date: fields.date,
          dayOfWeek: plannerDayOfWeek(fields.date),
          zone: 'timed',
          objectType: 'event',
          people: [],
          startTime: fields.startTime || null,
          endTime: fields.endTime || null,
          revenue: 0,
          revenueCents: null,
          cashReceivedCents: 0,
          cost: 0,
          costCents: null,
          costPerHour: null,
          costPerHourCents: null,
          financialStatus:
            status === 'confirmed' || status === 'scheduled' ? 'committed' : 'planned',
          financialSource: 'brain_capture',
          financialMetadata,
          notes: fields.note || ctx.text || null,
          optional: false,
          enabled: true,
          sortOrder: 99,
          status,
          priority: 0,
        },
      }));

    let entity = await tx.brainEntity.findFirst({
      where: { entityType: 'Event', plannerCardId: cardId, tombstonedAt: null },
    });
    if (!entity) {
      entity = await tx.brainEntity.create({
        data: {
          entityType: 'Event',
          name: title,
          canonicalName: canonicalName(title),
          plannerCardId: cardId,
          properties: {
            date: fields.date,
            startTime: fields.startTime || null,
            endTime: fields.endTime || null,
            location: fields.location || null,
            guestEstimate: fields.guestEstimate ?? null,
            source,
            captureId: ctx.captureId || captureKey,
          },
          status: 'active',
        },
      });
    }
    await reconcilePlannerWorkBlocks(tx, ctx.plannerUid, [card], []);
    return { card, entity, existing: !!existingCard };
  });

  await writeLedgerEvent({
    prismaClient: prisma,
    eventType: 'planner.event.captured',
    source,
    sourceId: ctx.captureId || captureKey,
    actorType: 'founder',
    payload: { brainEntityId: applied.entity.id },
    updatePayload: true,
  });
  const lifecycle = await runPlannerCardLifecycle({
    prismaClient: prisma,
    plannerUid: ctx.plannerUid,
    cardIds: [applied.card.id],
    syncCalendar: true,
  });

  return {
    kind: 'event',
    plannerCardId: applied.card.id,
    card: { ...applied.card, order: applied.card.sortOrder },
    entityId: applied.entity.id,
    ledgerEventId: ledgerEvent.id,
    existing: applied.existing,
    lifecycle,
  };
}

async function apply(prisma, intent, fields, resolved, ctx) {
  const actor = ctx?.actor || 'founder';
  switch (intent) {
    case 'constraint_correction': {
      const results = [];
      for (const c of fields.corrections || []) {
        results.push(
          await applyConstraintCorrection({
            customerId: resolved.customer?.id,
            name: resolved.customer ? undefined : fields.customerRef,
            item: c.item,
            kind: c.kind || 'ingredient',
            direction: c.direction,
            severity: c.severity,
            validUntil: c.validUntil || null,
            note: ctx?.text || null,
            actor,
          })
        );
      }
      return { kind: 'constraint_correction', count: results.length, results };
    }
    case 'vendor_price': {
      // Resolve-or-create ingredient + vendor (vendor optional → "Unknown vendor" not minted; require a vendor).
      const ing =
        resolved.ingredient ||
        (
          await findOrCreateEntity({
            entityType: 'Ingredient',
            name: fields.item,
            properties: { source: 'ingest:vendor_price', unit: fields.unit },
          })
        ).entity;
      let vendor = resolved.vendor;
      if (!vendor && fields.vendorRef) {
        const v = await findOrCreateEntity({
          entityType: 'Vendor',
          name: fields.vendorRef,
          properties: { source: 'ingest:vendor_price' },
        });
        vendor = v.entity;
      }
      if (!vendor)
        return { kind: 'vendor_price', error: 'no vendor — capture needs "from <vendor>"' };
      const assertion = await setPricing({
        ingredientId: ing.id,
        vendorId: vendor.id,
        pricePerUnit: fields.priceDollars ?? fields.priceCents / 100,
        unit: fields.unit,
      });
      return {
        kind: 'vendor_price',
        ingredientId: ing.id,
        vendorId: vendor.id,
        assertionId: assertion.id,
      };
    }
    case 'event':
      return applyEvent(prisma, fields, ctx);
    case 'task': {
      const event = await writeLedgerEvent({
        eventType: 'task.captured',
        source: ctx?.source || 'ingest',
        actorType: 'founder',
        payload: { title: fields.title },
      });
      const task = await prisma.brainEntity.create({
        data: {
          entityType: 'Task',
          name: fields.title,
          properties: {
            status: 'open',
            dueDate: fields.dueDate || null,
            source: ctx?.source || 'ingest',
          },
          status: 'active',
        },
      });
      // Optional link to a subject entity (ASSIGNED_TO), used by manual inbox triage.
      if (fields.entityId) {
        await prisma.brainAssertion.create({
          data: {
            srcId: task.id,
            dstId: fields.entityId,
            relType: 'ASSIGNED_TO',
            confidence: 1.0,
            sourceType: 'manual',
            createdBy: actor,
          },
        });
      }
      return { kind: 'task', taskId: task.id, ledgerEventId: event.id };
    }
    case 'new_entity': {
      if (resolved.existing)
        return { kind: 'new_entity', existing: true, entityId: resolved.existing.id };
      const { entity, created, blocked, blockReason } = await findOrCreateEntity({
        entityType: fields.entityType,
        name: fields.name,
        properties: fields.properties || { source: 'ingest', note: fields.note || null },
      });
      if (blocked || !entity)
        return { kind: 'new_entity', error: blockReason || 'self-identity guard' };
      // Merge supplied properties onto an existing match (parity with old inbox route).
      if (!created && fields.properties && typeof fields.properties === 'object') {
        await prisma.brainEntity.update({
          where: { id: entity.id },
          data: { properties: { ...(entity.properties || {}), ...fields.properties } },
        });
      }
      return { kind: 'new_entity', entityId: entity.id, created };
    }
    case 'append_note': {
      // Attach a Note to an existing entity (fields.entityId) via ABOUT, or create
      // a standalone Note when no target is given.
      const note = await prisma.brainEntity.create({
        data: {
          entityType: 'Note',
          name: (fields.note || '').slice(0, 80),
          properties: { content: fields.note, source: ctx?.source || 'ingest' },
          status: 'active',
        },
      });
      if (fields.entityId) {
        await prisma.brainAssertion.create({
          data: {
            srcId: note.id,
            dstId: fields.entityId,
            relType: 'ABOUT',
            confidence: 1.0,
            sourceType: 'manual',
            createdBy: actor,
          },
        });
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
  const { needsConfirm, reason } = computeNeedsConfirm(
    cls.intent,
    cls.confidence,
    fields,
    resolved,
    ctx
  );
  const preview = buildPreview(cls.intent, fields, resolved);

  const base = {
    intent: cls.intent,
    confidence: cls.confidence,
    via: cls.via,
    fields,
    resolved,
    needsConfirm,
    needsConfirmReason: reason,
    preview,
    rationale: cls.rationale || null,
  };

  if (!commit) return { ...base, committed: false };

  // Commit path. Auto-apply only when allowed; otherwise capture to inbox.
  const canAuto = !needsConfirm;
  // `force:true` lets an explicit operator confirm apply a needsConfirm result
  // (except it can't bypass classification into needs_human/trash).
  const cannotForce = reason === 'event-date-required' || reason === 'planner-unavailable';
  const allowApply = (canAuto || ctx.force === true) && !cannotForce;
  if (allowApply && cls.intent !== 'needs_human' && cls.intent !== 'trash') {
    try {
      const applied = await apply(prisma, cls.intent, fields, resolved, { ...ctx, text });
      await writeLedgerEvent({
        eventType: 'ingest.applied',
        source: ctx.source || 'ingest',
        actorType: 'founder',
        payload: {
          intent: cls.intent,
          confidence: cls.confidence,
          via: cls.via,
          applied,
          forced: !canAuto,
        },
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
    eventType: 'inbox.captured',
    source: ctx.source || 'ingest',
    actorType: 'founder',
    payload: {
      rawContent: text,
      intent: cls.intent,
      confidence: cls.confidence,
      preview,
      needsConfirmReason: reason,
    },
  });
  const item = await prisma.brainInboxItem.create({
    data: {
      rawContent: text,
      source: ctx.source || 'ingest',
      status: 'pending',
      triageHint: {
        intent: cls.intent,
        confidence: cls.confidence,
        fields,
        preview,
        via: cls.via,
        reason,
      },
    },
  });
  return {
    ...base,
    committed: false,
    capturedToInbox: true,
    inboxItemId: item.id,
    ledgerEventId: ledgerEvent.id,
  };
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
    eventType: 'ingest.applied',
    source: ctx.source || 'ingest',
    actorType: 'founder',
    payload: { intent, applied, direct: true },
  });
  return { ok: true, applied };
}

module.exports = {
  process,
  applyDirect,
  apply,
  applyEvent,
  resolve,
  isValidPlannerDate,
  AUTO_APPLY_THRESHOLD,
};
