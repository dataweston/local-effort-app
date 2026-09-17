const CONFIRMED_EVENT_STATUSES = new Set(['confirmed', 'booked', 'scheduled', 'completed']);
const CANCELLED_EVENT_STATUSES = new Set(['cancelled', 'canceled', 'void']);
const COMPLETED_EVENT_STATUSES = new Set(['done', 'completed']);
const ACTIVE_BLOCK_STATUSES = new Set(['scheduled', 'completed']);

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function metadataFor(card) {
  const metadata = card?.financialMetadata;
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
}

function fallbackStatus(card, blockType, date, startTime, endTime) {
  const metadata = metadataFor(card);
  const cardStatus = String(card.status || metadata.eventStatus || '').toLowerCase();
  if (card.enabled === false || CANCELLED_EVENT_STATUSES.has(cardStatus)) return 'cancelled';
  if (COMPLETED_EVENT_STATUSES.has(cardStatus)) return 'completed';
  if (!CONFIRMED_EVENT_STATUSES.has(cardStatus)) return 'needs_schedule';
  if (blockType === 'prep') {
    return date && startTime && endTime ? 'scheduled' : 'needs_schedule';
  }
  return date && Boolean(startTime) === Boolean(endTime) ? 'scheduled' : 'needs_schedule';
}

function fallbackBlock(card, blockType) {
  const metadata = metadataFor(card);
  const prep = blockType === 'prep';
  const date = text(prep ? metadata.prepDate : card.date);
  const startTime = text(prep ? metadata.prepStartTime : card.startTime);
  const endTime = text(prep ? metadata.prepEndTime : card.endTime);
  return {
    id: `local:${card.id}:${blockType}`,
    plannerCardId: String(card.id),
    blockType,
    title: card.title || 'Untitled event',
    date,
    startTime,
    endTime,
    status: fallbackStatus(card, blockType, date, startTime, endTime),
    location: text(metadata.location),
    syncStatus: 'not_persisted',
    syncError: null,
    persisted: false,
  };
}

export function displayWorkBlocks(cards = [], persistedBlocks = []) {
  const byKey = new Map(
    persistedBlocks.map((block) => [
      `${block.plannerCardId}:${block.blockType}`,
      { ...block, persisted: true },
    ])
  );
  const blocks = [];
  for (const card of cards) {
    if (card.objectType !== 'event') continue;
    for (const blockType of ['prep', 'service']) {
      const key = `${card.id}:${blockType}`;
      blocks.push(byKey.get(key) || fallbackBlock(card, blockType));
    }
  }
  return blocks;
}

function timeInMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function intervalFor(block) {
  if (!block.date || !ACTIVE_BLOCK_STATUSES.has(block.status)) return null;
  const start = timeInMinutes(block.startTime);
  const end = timeInMinutes(block.endTime);
  if (start == null || end == null || end <= start) return null;
  return { start, end };
}

function intervalsOverlap(left, right) {
  return left.start < right.end && right.start < left.end;
}

export function capacityAssessment(plannerCardId, blocks = []) {
  const own = blocks.filter((block) => block.plannerCardId === String(plannerCardId));
  const active = blocks.filter((block) => block.date && ACTIVE_BLOCK_STATUSES.has(block.status));
  const overlaps = [];
  const compared = new Set();
  const unknownPeers = new Set();
  let timedWindows = 0;
  let unknownOwnWindows = 0;

  for (const block of own) {
    if (!block.date || block.status === 'needs_schedule') {
      unknownOwnWindows += 1;
      continue;
    }
    if (!ACTIVE_BLOCK_STATUSES.has(block.status)) continue;
    const interval = intervalFor(block);
    if (!interval) {
      unknownOwnWindows += 1;
      continue;
    }
    timedWindows += 1;
    for (const peer of active) {
      if (peer.plannerCardId === block.plannerCardId || peer.date !== block.date) continue;
      const key = `${peer.plannerCardId}:${peer.blockType}`;
      const peerInterval = intervalFor(peer);
      if (!peerInterval) {
        unknownPeers.add(key);
        continue;
      }
      compared.add(key);
      if (intervalsOverlap(interval, peerInterval)) overlaps.push(peer);
    }
  }

  const uniqueOverlaps = [
    ...new Map(
      overlaps.map((block) => [`${block.plannerCardId}:${block.blockType}`, block])
    ).values(),
  ];
  if (uniqueOverlaps.length) {
    return {
      state: 'review',
      label: 'Capacity review',
      detail: `${uniqueOverlaps.length} overlapping recorded work window${uniqueOverlaps.length === 1 ? '' : 's'}`,
      overlaps: uniqueOverlaps,
      comparedBlockCount: compared.size,
    };
  }
  if (unknownOwnWindows || unknownPeers.size) {
    const unknownCount = unknownOwnWindows + unknownPeers.size;
    return {
      state: 'unknown',
      label: 'Capacity unknown',
      detail: `${unknownCount} relevant work window${unknownCount === 1 ? '' : 's'} need a complete date and time`,
      overlaps: [],
      comparedBlockCount: compared.size,
    };
  }
  if (!timedWindows) {
    return {
      state: 'inactive',
      label: 'No active window',
      detail: 'This event is completed or cancelled',
      overlaps: [],
      comparedBlockCount: compared.size,
    };
  }
  return {
    state: 'clear',
    label: 'No recorded overlap',
    detail: `Compared with ${compared.size} complete same-day work window${compared.size === 1 ? '' : 's'}`,
    overlaps: [],
    comparedBlockCount: compared.size,
  };
}

export function workBlockTimeLabel(block) {
  if (!block?.date) return 'Date and time needed';
  if (!block.startTime || !block.endTime) return `${block.date} · time not recorded`;
  return `${block.date} · ${block.startTime}–${block.endTime}`;
}

export function workBlockSyncLabel(block) {
  if (!block) return 'Not created';
  if (block.syncStatus === 'synced') return 'On Google Calendar';
  if (block.syncStatus === 'error') return 'Calendar sync error';
  if (block.syncStatus === 'pending') return 'Calendar update pending';
  if (block.syncStatus === 'removed') return 'Removed from calendar';
  if (block.status === 'needs_schedule') return 'Not sent — schedule incomplete';
  if (block.syncStatus === 'not_persisted') return 'Save to schedule';
  return 'Not on calendar';
}

export function evidenceReferences(card) {
  const refs = metadataFor(card).evidenceRefs;
  return Array.isArray(refs)
    ? [...new Set(refs.map((reference) => String(reference).trim()).filter(Boolean))]
    : [];
}

export function evidenceHref(reference) {
  if (reference.startsWith('gmail:')) {
    return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(reference.slice(6))}`;
  }
  return null;
}

export { ACTIVE_BLOCK_STATUSES, CONFIRMED_EVENT_STATUSES };
