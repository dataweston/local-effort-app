'use strict';

const crypto = require('crypto');
const { canonicalName, writeLedgerEvent } = require('../brain/ledger');
const { checkSelfIdentity } = require('../brain/selfIdentity');
const { validateRelationship } = require('../brain/relationshipDictionary');

const SOURCE = 'planner_event_projection';
const CANCELLED_STATUSES = new Set(['cancelled', 'canceled', 'void']);
const COMPLETED_STATUSES = new Set(['done', 'completed']);
const PLACEHOLDER_CLIENTS = new Set(['client', 'customer', 'unknown', 'tbd', 'to be determined']);

function cleanString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(cleanString).filter(Boolean))];
}

function eventStatus(card) {
  const metadata = objectValue(card.financialMetadata);
  const status = String(metadata.eventStatus || card.status || 'scheduled').toLowerCase();
  if (card.enabled === false || CANCELLED_STATUSES.has(status)) return 'cancelled';
  if (COMPLETED_STATUSES.has(status)) return 'completed';
  return status;
}

function evidenceState(card, evidenceRefs) {
  const metadata = objectValue(card.financialMetadata);
  if (evidenceRefs.length) return 'referenced';
  if (cleanString(metadata.detailSource)?.includes('owner')) return 'owner_reported';
  if (cleanString(card.financialSource)) return 'source_described';
  return 'missing';
}

function blockSnapshot(block) {
  return {
    id: block.id,
    blockType: block.blockType,
    date: block.date,
    startTime: block.startTime,
    endTime: block.endTime,
    status: block.status,
    calendarSyncStatus: block.syncStatus,
    googleCalendarId: block.googleCalendarId,
    googleEventId: block.googleEventId,
  };
}

function projectionPayload(card, workBlocks) {
  const metadata = objectValue(card.financialMetadata);
  const evidenceRefs = uniqueStrings(metadata.evidenceRefs);
  return {
    plannerCardId: card.id,
    plannerUid: card.supabaseUid,
    title: card.title,
    eventStatus: eventStatus(card),
    date: card.date,
    startTime: card.startTime || null,
    endTime: card.endTime || null,
    location: cleanString(metadata.location),
    clientName: cleanString(metadata.clientName),
    guestEstimate: metadata.guestEstimate ?? null,
    serviceType: cleanString(metadata.serviceType),
    menuSummary: cleanString(metadata.menuSummary),
    financialStatus: card.financialStatus || null,
    financialSource: card.financialSource || null,
    revenueCents: Number(card.revenueCents ?? (Number(card.revenue) || 0) * 100),
    cashReceivedCents: Number(card.cashReceivedCents || 0),
    evidenceRefs,
    evidenceState: evidenceState(card, evidenceRefs),
    captureSource: cleanString(metadata.captureSource),
    captureId: cleanString(metadata.captureId),
    workBlocks: workBlocks.map(blockSnapshot),
  };
}

function fingerprint(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function eventEntityProperties(existing, payload, ledgerEventId, sourceFingerprint, reconciledAt) {
  return {
    ...objectValue(existing?.properties),
    plannerUid: payload.plannerUid,
    date: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime,
    location: payload.location,
    clientName: payload.clientName,
    guestEstimate: payload.guestEstimate,
    serviceType: payload.serviceType,
    menuSummary: payload.menuSummary,
    eventStatus: payload.eventStatus,
    financialStatus: payload.financialStatus,
    financialSource: payload.financialSource,
    revenueCents: payload.revenueCents,
    cashReceivedCents: payload.cashReceivedCents,
    evidenceRefs: payload.evidenceRefs,
    evidenceState: payload.evidenceState,
    captureSource: payload.captureSource,
    captureId: payload.captureId,
    workBlocks: payload.workBlocks,
    plannerProjection: {
      ledgerEventId,
      sourceFingerprint,
      reconciledAt,
    },
  };
}

async function ensureEventEntity(prisma, card, payload, ledgerEvent, sourceFingerprint, now) {
  const existing = await prisma.brainEntity.findFirst({
    where: { entityType: 'Event', plannerCardId: card.id, tombstonedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  const status = payload.eventStatus === 'cancelled' ? 'inactive' : 'active';
  const properties = eventEntityProperties(
    existing,
    payload,
    ledgerEvent.id,
    sourceFingerprint,
    now.toISOString()
  );
  if (existing) {
    return prisma.brainEntity.update({
      where: { id: existing.id },
      data: {
        name: card.title,
        canonicalName: canonicalName(card.title),
        properties,
        status,
      },
    });
  }
  return prisma.brainEntity.create({
    data: {
      entityType: 'Event',
      name: card.title,
      canonicalName: canonicalName(card.title),
      plannerCardId: card.id,
      properties,
      status,
    },
  });
}

function explicitClientName(card) {
  const value = cleanString(objectValue(card.financialMetadata).clientName);
  if (!value || PLACEHOLDER_CLIENTS.has(canonicalName(value))) return null;
  return value;
}

async function resolveExplicitClient(prisma, card) {
  const name = explicitClientName(card);
  if (!name) return { entity: null, reason: 'no_explicit_client' };
  const metadata = objectValue(card.financialMetadata);
  const preferredId =
    cleanString(metadata.brainCustomerId || metadata.customerEntityId) ||
    (String(metadata.possibleBrainCustomerConfidence || '').startsWith('corroborated')
      ? cleanString(metadata.possibleBrainCustomerId)
      : null);
  if (preferredId) {
    const preferred = await prisma.brainEntity.findFirst({
      where: { id: preferredId, entityType: { in: ['Customer', 'Person'] }, tombstonedAt: null },
    });
    if (preferred) return { entity: preferred, reason: 'explicit_entity_id' };
  }

  const normalized = canonicalName(name);
  for (const entityType of ['Customer', 'Person']) {
    const existing = await prisma.brainEntity.findFirst({
      where: {
        entityType,
        tombstonedAt: null,
        OR: [
          { canonicalName: normalized },
          { name: { equals: name, mode: 'insensitive' } },
          { aliases: { some: { alias: { equals: name, mode: 'insensitive' } } } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return { entity: existing, reason: `matched_${entityType.toLowerCase()}` };
  }

  const selfCheck = checkSelfIdentity('Customer', name);
  if (selfCheck.blocked) return { entity: null, reason: selfCheck.reason };
  const entity = await prisma.brainEntity.create({
    data: {
      entityType: 'Customer',
      name,
      canonicalName: normalized,
      properties: {
        explicitPlannerClient: true,
        firstPlannerCardId: card.id,
        source: SOURCE,
      },
      status: 'active',
    },
  });
  return { entity, reason: 'created_from_explicit_client' };
}

function assertionData({ srcId, dstId, relType, ledgerEvent, metadata, confidence = 1 }) {
  const validation = validateRelationship({
    relType,
    srcType: relType === 'CLIENT_FOR' ? 'Customer' : undefined,
    dstType: 'Event',
    srcId,
    dstId,
  });
  if (!validation.ok)
    throw new Error(validation.errors.join('; ') || `Invalid ${relType} relationship`);
  return {
    srcId,
    dstId,
    relType: validation.relType,
    metadata,
    confidence,
    sourceType: SOURCE,
    sourceId: ledgerEvent.id,
    createdBy: `system:${SOURCE}`,
    provisional: false,
  };
}

async function reconcileClientAssertion(
  prisma,
  card,
  eventEntity,
  clientResolution,
  ledgerEvent,
  now
) {
  const existing = await prisma.brainAssertion.findMany({
    where: {
      dstId: eventEntity.id,
      relType: 'CLIENT_FOR',
      sourceType: SOURCE,
      retractedAt: null,
      knownUntil: null,
    },
  });
  const client = clientResolution.entity;
  if (!client) {
    if (existing.length) {
      await prisma.brainAssertion.updateMany({
        where: { id: { in: existing.map((row) => row.id) } },
        data: {
          knownUntil: now,
          retractedAt: now,
          retractedBy: `system:${SOURCE}`,
          retractedReason: 'explicit_planner_client_removed',
          retractionSourceId: ledgerEvent.id,
        },
      });
    }
    return null;
  }

  const current = existing.find((row) => row.srcId === client.id);
  const metadata = {
    plannerCardId: card.id,
    clientName: explicitClientName(card),
    resolution: clientResolution.reason,
    evidenceRefs: uniqueStrings(objectValue(card.financialMetadata).evidenceRefs),
  };
  if (current) {
    await prisma.brainAssertion.update({
      where: { id: current.id },
      data: { metadata, sourceId: ledgerEvent.id },
    });
    const stale = existing.filter((row) => row.id !== current.id);
    if (stale.length) {
      await prisma.brainAssertion.updateMany({
        where: { id: { in: stale.map((row) => row.id) } },
        data: {
          knownUntil: now,
          supersededBy: current.id,
          supersededAt: now,
          supersededReason: 'planner_client_reconciled',
        },
      });
    }
    return current;
  }

  const created = await prisma.brainAssertion.create({
    data: assertionData({
      srcId: client.id,
      dstId: eventEntity.id,
      relType: 'CLIENT_FOR',
      ledgerEvent,
      metadata,
    }),
  });
  if (existing.length) {
    await prisma.brainAssertion.updateMany({
      where: { id: { in: existing.map((row) => row.id) } },
      data: {
        knownUntil: now,
        supersededBy: created.id,
        supersededAt: now,
        supersededReason: 'planner_client_changed',
      },
    });
  }
  return created;
}

function parseEvidenceRef(reference) {
  const separator = reference.indexOf(':');
  if (separator <= 0 || separator === reference.length - 1) return null;
  return {
    kind: reference.slice(0, separator).toLowerCase(),
    externalId: reference.slice(separator + 1),
  };
}

async function evidenceDetails(prisma, reference) {
  const parsed = parseEvidenceRef(reference);
  if (!parsed) return null;
  if (parsed.kind === 'gmail') {
    const ledger = await prisma.ledgerEvent.findFirst({
      where: {
        eventType: 'email.thread',
        source: 'gmail',
        sourceId: parsed.externalId,
        tombstonedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      entityType: 'EmailThread',
      name: ledger?.payload?.subject || `Gmail thread ${parsed.externalId}`,
      status: ledger ? 'active' : 'reference_only',
      properties: {
        evidenceRef: reference,
        gmailThreadId: parsed.externalId,
        ledgerEventId: ledger?.id || null,
        gmailUrl: `https://mail.google.com/mail/u/0/#all/${parsed.externalId}`,
        resolution: ledger ? 'ledger_event' : 'external_reference_only',
      },
    };
  }
  if (parsed.kind === 'square-invoice') {
    const invoice = await prisma.commercialInvoice.findFirst({
      where: {
        OR: [
          { invoiceNumber: { equals: parsed.externalId, mode: 'insensitive' } },
          { sourceSystem: 'square', sourceId: parsed.externalId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      entityType: 'Invoice',
      name: `Square invoice ${parsed.externalId}`,
      status: invoice ? 'active' : 'reference_only',
      properties: {
        evidenceRef: reference,
        squareInvoiceId: parsed.externalId,
        commercialInvoiceId: invoice?.id || null,
        amountCents: invoice?.totalCents ?? null,
        invoiceStatus: invoice?.status || null,
        resolution: invoice ? 'commercial_invoice' : 'external_reference_only',
      },
    };
  }
  if (parsed.kind === 'ledger-event') {
    const ledger = await prisma.ledgerEvent.findUnique({ where: { id: parsed.externalId } });
    return {
      entityType: 'Note',
      name: ledger
        ? `${ledger.eventType} evidence from ${ledger.source}`
        : `Ledger evidence ${parsed.externalId}`,
      status: ledger && !ledger.tombstonedAt ? 'active' : 'reference_only',
      properties: {
        evidenceRef: reference,
        ledgerEventId: ledger?.id || parsed.externalId,
        eventType: ledger?.eventType || null,
        source: ledger?.source || null,
        sourceId: ledger?.sourceId || null,
        resolution: ledger && !ledger.tombstonedAt ? 'ledger_event' : 'missing_ledger_event',
      },
    };
  }
  return null;
}

async function ensureEvidenceEntity(prisma, reference, details) {
  const existing = await prisma.brainEntity.findFirst({
    where: {
      entityType: details.entityType,
      tombstonedAt: null,
      properties: { path: ['evidenceRef'], equals: reference },
    },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) {
    return prisma.brainEntity.update({
      where: { id: existing.id },
      data: {
        name: details.name,
        canonicalName: canonicalName(`${details.entityType}:${reference}`),
        properties: { ...objectValue(existing.properties), ...details.properties },
        status: details.status,
      },
    });
  }
  return prisma.brainEntity.create({
    data: {
      entityType: details.entityType,
      name: details.name,
      canonicalName: canonicalName(`${details.entityType}:${reference}`),
      properties: details.properties,
      status: details.status,
    },
  });
}

async function reconcileEvidenceAssertions(prisma, card, eventEntity, ledgerEvent, now) {
  const references = uniqueStrings(objectValue(card.financialMetadata).evidenceRefs);
  const currentReferences = new Set(references);
  const existing = await prisma.brainAssertion.findMany({
    where: {
      dstId: eventEntity.id,
      relType: 'EVIDENCES',
      sourceType: SOURCE,
      retractedAt: null,
      knownUntil: null,
    },
  });
  const existingByRef = new Map(existing.map((row) => [row.metadata?.evidenceRef, row]));
  let resolved = 0;
  let unresolved = 0;

  for (const reference of references) {
    const details = await evidenceDetails(prisma, reference);
    if (!details) {
      unresolved += 1;
      continue;
    }
    const evidenceEntity = await ensureEvidenceEntity(prisma, reference, details);
    const metadata = {
      plannerCardId: card.id,
      evidenceRef: reference,
      resolution: details.properties.resolution,
    };
    const current = existingByRef.get(reference);
    if (current?.srcId === evidenceEntity.id) {
      await prisma.brainAssertion.update({
        where: { id: current.id },
        data: { metadata, sourceId: ledgerEvent.id },
      });
    } else {
      await prisma.brainAssertion.create({
        data: assertionData({
          srcId: evidenceEntity.id,
          dstId: eventEntity.id,
          relType: 'EVIDENCES',
          ledgerEvent,
          metadata,
        }),
      });
      if (current) {
        await prisma.brainAssertion.update({
          where: { id: current.id },
          data: {
            knownUntil: now,
            retractedAt: now,
            retractedBy: `system:${SOURCE}`,
            retractedReason: 'evidence_entity_replaced',
            retractionSourceId: ledgerEvent.id,
          },
        });
      }
    }
    resolved += 1;
  }

  const stale = existing.filter((row) => !currentReferences.has(row.metadata?.evidenceRef));
  if (stale.length) {
    await prisma.brainAssertion.updateMany({
      where: { id: { in: stale.map((row) => row.id) } },
      data: {
        knownUntil: now,
        retractedAt: now,
        retractedBy: `system:${SOURCE}`,
        retractedReason: 'planner_evidence_removed',
        retractionSourceId: ledgerEvent.id,
      },
    });
  }
  return { resolved, unresolved, removed: stale.length };
}

async function archiveMissingEvents(prisma, plannerUid, missingIds, now) {
  let archived = 0;
  for (const plannerCardId of missingIds) {
    const entities = await prisma.brainEntity.findMany({
      where: { entityType: 'Event', plannerCardId, tombstonedAt: null },
    });
    if (!entities.length) continue;
    const payload = { plannerCardId, plannerUid, eventStatus: 'deleted' };
    const sourceFingerprint = fingerprint(payload);
    const ledgerEvent = await writeLedgerEvent({
      prismaClient: prisma,
      eventType: 'planner.event.reconciled',
      source: SOURCE,
      sourceId: `${plannerCardId}:${sourceFingerprint}`,
      actorType: 'system',
      occurredAt: now,
      payload,
    });
    for (const entity of entities) {
      await prisma.brainEntity.update({
        where: { id: entity.id },
        data: {
          status: 'inactive',
          properties: {
            ...objectValue(entity.properties),
            eventStatus: 'deleted',
            plannerProjection: {
              ledgerEventId: ledgerEvent.id,
              sourceFingerprint,
              reconciledAt: now.toISOString(),
            },
          },
        },
      });
      archived += 1;
    }
  }
  return archived;
}

async function projectPlannerEvidence({ prisma, plannerUid, cardIds = null, now = new Date() }) {
  if (!prisma) throw new Error('Prisma is required');
  if (!plannerUid) throw new Error('plannerUid is required');
  const requestedIds = cardIds ? [...new Set(cardIds.filter(Boolean).map(String))] : null;
  if (requestedIds && !requestedIds.length) {
    return {
      ok: true,
      cardsSeen: 0,
      eventsProjected: 0,
      eventsArchived: 0,
      evidenceResolved: 0,
      evidenceUnresolved: 0,
    };
  }
  const cards = await prisma.plannerCard.findMany({
    where: {
      supabaseUid: plannerUid,
      objectType: 'event',
      ...(requestedIds ? { id: { in: requestedIds } } : {}),
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });
  const workBlocks = cards.length
    ? await prisma.plannerWorkBlock.findMany({
        where: { supabaseUid: plannerUid, plannerCardId: { in: cards.map((card) => card.id) } },
        orderBy: [{ date: 'asc' }, { blockType: 'asc' }],
      })
    : [];
  const blocksByCard = new Map();
  for (const block of workBlocks) {
    if (!blocksByCard.has(block.plannerCardId)) blocksByCard.set(block.plannerCardId, []);
    blocksByCard.get(block.plannerCardId).push(block);
  }

  const stats = {
    ok: true,
    cardsSeen: cards.length,
    eventsProjected: 0,
    eventsArchived: 0,
    clientsLinked: 0,
    evidenceResolved: 0,
    evidenceUnresolved: 0,
    evidenceRemoved: 0,
  };
  for (const card of cards) {
    const payload = projectionPayload(card, blocksByCard.get(card.id) || []);
    const sourceFingerprint = fingerprint(payload);
    const ledgerEvent = await writeLedgerEvent({
      prismaClient: prisma,
      eventType: 'planner.event.reconciled',
      source: SOURCE,
      sourceId: `${card.id}:${sourceFingerprint}`,
      actorType: 'system',
      occurredAt: now,
      payload,
    });
    const eventEntity = await ensureEventEntity(
      prisma,
      card,
      payload,
      ledgerEvent,
      sourceFingerprint,
      now
    );
    const clientResolution = await resolveExplicitClient(prisma, card);
    const clientAssertion = await reconcileClientAssertion(
      prisma,
      card,
      eventEntity,
      clientResolution,
      ledgerEvent,
      now
    );
    const evidence = await reconcileEvidenceAssertions(prisma, card, eventEntity, ledgerEvent, now);
    stats.eventsProjected += 1;
    if (clientAssertion) stats.clientsLinked += 1;
    stats.evidenceResolved += evidence.resolved;
    stats.evidenceUnresolved += evidence.unresolved;
    stats.evidenceRemoved += evidence.removed;
  }

  if (requestedIds) {
    const found = new Set(cards.map((card) => card.id));
    const missing = requestedIds.filter((id) => !found.has(id));
    stats.eventsArchived = await archiveMissingEvents(prisma, plannerUid, missing, now);
  }
  return stats;
}

module.exports = {
  SOURCE,
  eventStatus,
  projectionPayload,
  projectPlannerEvidence,
};
