'use strict';

const crypto = require('crypto');

const ACTIVE_BLOCK_STATUSES = new Set(['scheduled', 'completed']);
const CANCELLED_CARD_STATUSES = new Set(['cancelled', 'canceled', 'void']);
const COMPLETED_CARD_STATUSES = new Set(['done', 'completed']);
const UNCONFIRMED_CARD_STATUSES = new Set(['inquiry', 'tentative']);

function cleanString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isCancelledCard(card) {
  const metadata = card.financialMetadata || {};
  return (
    card.enabled === false ||
    CANCELLED_CARD_STATUSES.has(String(card.status || '').toLowerCase()) ||
    CANCELLED_CARD_STATUSES.has(String(metadata.eventStatus || '').toLowerCase())
  );
}

function isCompletedCard(card) {
  return COMPLETED_CARD_STATUSES.has(String(card.status || '').toLowerCase());
}

function fingerprint(spec) {
  const serialized = JSON.stringify({
    blockType: spec.blockType,
    title: spec.title,
    date: spec.date,
    startTime: spec.startTime,
    endTime: spec.endTime,
    status: spec.status,
    location: spec.location,
  });
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

function eventWorkBlockSpecs(card) {
  if (card.objectType !== 'event') return [];

  const metadata = card.financialMetadata || {};
  const cancelled = isCancelledCard(card);
  const completed = isCompletedCard(card);
  const unconfirmed =
    UNCONFIRMED_CARD_STATUSES.has(String(card.status || '').toLowerCase()) ||
    UNCONFIRMED_CARD_STATUSES.has(String(metadata.eventStatus || '').toLowerCase());
  const location = cleanString(metadata.location);
  const serviceDate = cleanString(card.date);
  const serviceStart = cleanString(card.startTime);
  const serviceEnd = cleanString(card.endTime);
  const serviceWindowComplete = Boolean(serviceStart) === Boolean(serviceEnd);

  const prepDate = cleanString(metadata.prepDate);
  const prepStart = cleanString(metadata.prepStartTime);
  const prepEnd = cleanString(metadata.prepEndTime);
  const prepValues = [prepDate, prepStart, prepEnd].filter(Boolean).length;
  const prepComplete = prepValues === 3;
  const prepMarkedComplete =
    String(metadata.prepSchedulingStatus || '').toLowerCase() === 'completed';

  const service = {
    plannerCardId: String(card.id),
    blockType: 'service',
    title: card.title || 'Untitled event',
    date: serviceDate,
    startTime: serviceWindowComplete ? serviceStart : null,
    endTime: serviceWindowComplete ? serviceEnd : null,
    status: cancelled
      ? 'cancelled'
      : completed
        ? 'completed'
        : unconfirmed
          ? 'needs_schedule'
          : serviceDate && serviceWindowComplete
            ? 'scheduled'
            : 'needs_schedule',
    location,
  };

  const prep = {
    plannerCardId: String(card.id),
    blockType: 'prep',
    title: card.title || 'Untitled event',
    date: prepDate,
    startTime: prepStart,
    endTime: prepEnd,
    status: cancelled
      ? 'cancelled'
      : unconfirmed
        ? 'needs_schedule'
        : prepComplete
          ? prepMarkedComplete || completed
            ? 'completed'
            : 'scheduled'
          : 'needs_schedule',
    location,
  };

  return [service, prep].map((spec) => ({ ...spec, sourceFingerprint: fingerprint(spec) }));
}

function nextSyncState(existing, spec) {
  if (existing?.sourceFingerprint === spec.sourceFingerprint && existing.status === spec.status) {
    return {
      syncStatus: existing.syncStatus,
      syncError: existing.syncError,
    };
  }
  if (ACTIVE_BLOCK_STATUSES.has(spec.status)) {
    return { syncStatus: 'pending', syncError: null };
  }
  if (existing?.googleEventId) {
    return { syncStatus: 'pending', syncError: null };
  }
  return {
    syncStatus: spec.status === 'cancelled' ? 'removed' : 'not_scheduled',
    syncError: null,
  };
}

function cancelledSpec(card, existing) {
  const spec = {
    plannerCardId: String(card.id),
    blockType: existing.blockType,
    title: card.title || existing.title || 'Deleted event',
    date: existing.date,
    startTime: existing.startTime,
    endTime: existing.endTime,
    status: 'cancelled',
    location: existing.location,
  };
  return { ...spec, sourceFingerprint: fingerprint(spec) };
}

async function reconcilePlannerWorkBlocks(prismaClient, uid, cards = [], deletedCards = []) {
  const changedCards = [...cards, ...deletedCards].filter((card) => card?.id);
  const cardIds = [...new Set(changedCards.map((card) => String(card.id)))];
  if (!cardIds.length) return [];

  const existingRows = await prismaClient.plannerWorkBlock.findMany({
    where: { supabaseUid: uid, plannerCardId: { in: cardIds } },
  });
  const existingByKey = new Map(
    existingRows.map((row) => [`${row.plannerCardId}:${row.blockType}`, row])
  );
  const deletedIds = new Set(deletedCards.map((card) => String(card.id)));
  const reconciled = [];

  for (const card of changedCards) {
    const id = String(card.id);
    const existingForCard = existingRows.filter((row) => row.plannerCardId === id);
    let specs = deletedIds.has(id) ? [] : eventWorkBlockSpecs(card);

    if (!specs.length && existingForCard.length) {
      specs = existingForCard.map((row) => cancelledSpec(card, row));
    } else if (deletedIds.has(id) && card.objectType === 'event' && !existingForCard.length) {
      specs = eventWorkBlockSpecs({ ...card, enabled: false });
    }

    for (const spec of specs) {
      const key = `${id}:${spec.blockType}`;
      const existing = existingByKey.get(key);
      const syncState = nextSyncState(existing, spec);
      const data = {
        supabaseUid: uid,
        title: spec.title,
        date: spec.date,
        startTime: spec.startTime,
        endTime: spec.endTime,
        status: spec.status,
        location: spec.location,
        sourceFingerprint: spec.sourceFingerprint,
        ...syncState,
      };
      const row = await prismaClient.plannerWorkBlock.upsert({
        where: {
          plannerCardId_blockType: {
            plannerCardId: id,
            blockType: spec.blockType,
          },
        },
        update: data,
        create: {
          plannerCardId: id,
          blockType: spec.blockType,
          ...data,
        },
      });
      existingByKey.set(key, row);
      reconciled.push(row);
    }
  }

  return reconciled;
}

module.exports = {
  ACTIVE_BLOCK_STATUSES,
  eventWorkBlockSpecs,
  reconcilePlannerWorkBlocks,
};
