'use strict';

const { getAuthorizedGoogleOAuthClient } = require('../brain/gmailSync');
const { ACTIVE_BLOCK_STATUSES } = require('./workBlocks');

const TARGET_CALENDAR_SUMMARY = '608 Smith - Root Rythym and Local Effort';
const TIME_ZONE = 'America/Chicago';
const SERVICE_COLOR_ID = '6';
const PREP_COLOR_ID = '9';
const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.owned',
];

function nextDate(date) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function localDateTime(date, time) {
  return `${date}T${/^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time}`;
}

function eventWindow(block) {
  if (!block.date) throw new Error(`${block.blockType} block has no date`);
  if (Boolean(block.startTime) !== Boolean(block.endTime)) {
    throw new Error(`${block.blockType} block has an incomplete time window`);
  }
  if (!block.startTime) {
    return {
      start: { date: block.date },
      end: { date: nextDate(block.date) },
    };
  }
  const endDate = block.endTime <= block.startTime ? nextDate(block.date) : block.date;
  return {
    start: { dateTime: localDateTime(block.date, block.startTime), timeZone: TIME_ZONE },
    end: { dateTime: localDateTime(endDate, block.endTime), timeZone: TIME_ZONE },
  };
}

function descriptionFor(block, card) {
  const metadata = card?.financialMetadata || {};
  return [
    block.blockType === 'prep' ? 'Local Effort prep window' : 'Local Effort service event',
    `Work status: ${block.status}`,
    block.blockType === 'service' && !block.startTime ? 'Service time: TBD' : null,
    metadata.guestEstimate ? `Guests: ${metadata.guestEstimate}` : null,
    metadata.menuSummary ? `Menu: ${metadata.menuSummary}` : null,
    card?.notes || null,
    `Planner card: ${block.plannerCardId}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function googleEventBody(block, card) {
  const prep = block.blockType === 'prep';
  return {
    summary: `${prep ? 'PREP' : 'SERVICE'} · ${block.title}`,
    description: descriptionFor(block, card),
    location: block.location || undefined,
    ...eventWindow(block),
    colorId: prep ? PREP_COLOR_ID : SERVICE_COLOR_ID,
    transparency: 'opaque',
    reminders: { useDefault: false },
    extendedProperties: {
      private: {
        localEffortPlannerCardId: block.plannerCardId,
        localEffortWorkBlock: block.blockType,
        localEffortSync: 'planner',
        localEffortSourceFingerprint: block.sourceFingerprint,
      },
    },
  };
}

async function findTargetCalendar(client) {
  const response = await client.request({
    url: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    method: 'GET',
    params: { maxResults: 250, minAccessRole: 'owner' },
  });
  const matches = (response.data.items || []).filter(
    (calendar) => calendar.summary === TARGET_CALENDAR_SUMMARY && calendar.accessRole === 'owner'
  );
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one owned calendar named "${TARGET_CALENDAR_SUMMARY}"; found ${matches.length}`
    );
  }
  return matches[0];
}

async function findExistingEvent(client, calendarId, block) {
  const response = await client.request({
    url: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    method: 'GET',
    params: {
      maxResults: 10,
      showDeleted: false,
      privateExtendedProperty: `localEffortPlannerCardId=${block.plannerCardId}`,
    },
  });
  const matches = (response.data.items || []).filter(
    (event) => event.extendedProperties?.private?.localEffortWorkBlock === block.blockType
  );
  if (matches.length > 1) {
    throw new Error(
      `Duplicate ${block.blockType} calendar events for planner card ${block.plannerCardId}`
    );
  }
  return matches[0] || null;
}

function endpointMatches(actual, expected) {
  if (expected.date) return actual?.date === expected.date;
  return typeof actual?.dateTime === 'string' && actual.dateTime.startsWith(expected.dateTime);
}

function verifyCalendarEvent(event, expected, block) {
  const invalid = [];
  if (event.summary !== expected.summary) invalid.push('summary');
  if (event.status !== 'confirmed') invalid.push('status');
  if (event.colorId !== expected.colorId) invalid.push('color');
  if (!endpointMatches(event.start, expected.start)) invalid.push('start');
  if (!endpointMatches(event.end, expected.end)) invalid.push('end');
  if ((event.attendees || []).length) invalid.push('attendees');
  if (event.extendedProperties?.private?.localEffortPlannerCardId !== block.plannerCardId)
    invalid.push('planner link');
  if (event.extendedProperties?.private?.localEffortWorkBlock !== block.blockType)
    invalid.push('block link');
  if (invalid.length)
    throw new Error(`Calendar response failed verification: ${invalid.join(', ')}`);
}

async function persistSyncError(prismaClient, block, error) {
  await prismaClient.plannerWorkBlock.update({
    where: { id: block.id },
    data: {
      syncStatus: 'error',
      syncError: String(error?.message || error).slice(0, 1000),
    },
  });
}

async function synchronizeBlock(prismaClient, client, calendarId, block, card) {
  const existing = await findExistingEvent(client, calendarId, block);
  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  if (!ACTIVE_BLOCK_STATUSES.has(block.status)) {
    if (existing) {
      await client.request({
        url: `${baseUrl}/${encodeURIComponent(existing.id)}`,
        method: 'DELETE',
        params: { sendUpdates: 'none' },
      });
    }
    const syncStatus = block.status === 'cancelled' ? 'removed' : 'not_scheduled';
    await prismaClient.plannerWorkBlock.update({
      where: { id: block.id },
      data: {
        googleCalendarId: null,
        googleEventId: null,
        googleEtag: null,
        syncStatus,
        syncError: null,
        lastSyncedAt: new Date(),
      },
    });
    return {
      blockId: block.id,
      plannerCardId: block.plannerCardId,
      blockType: block.blockType,
      action: existing ? 'delete' : 'skip',
      syncStatus,
    };
  }

  const body = googleEventBody(block, card);
  const response = await client.request({
    url: existing ? `${baseUrl}/${encodeURIComponent(existing.id)}` : baseUrl,
    method: existing ? 'PATCH' : 'POST',
    params: { sendUpdates: 'none' },
    data: body,
  });
  verifyCalendarEvent(response.data, body, block);
  await prismaClient.plannerWorkBlock.update({
    where: { id: block.id },
    data: {
      googleCalendarId: calendarId,
      googleEventId: response.data.id,
      googleEtag: response.data.etag || null,
      syncStatus: 'synced',
      syncError: null,
      lastSyncedAt: new Date(),
    },
  });
  return {
    blockId: block.id,
    plannerCardId: block.plannerCardId,
    blockType: block.blockType,
    action: existing ? 'update' : 'create',
    syncStatus: 'synced',
    googleEventId: response.data.id,
  };
}

function workBlockWhere(plannerUid, { cardIds, from, to, force }) {
  const where = { supabaseUid: plannerUid };
  if (cardIds?.length) where.plannerCardId = { in: [...new Set(cardIds.map(String))] };
  if (from || to) {
    where.OR = [
      { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } },
      { syncStatus: { in: ['pending', 'error'] } },
    ];
  }
  if (!force && !from && !to) {
    where.syncStatus = { in: ['pending', 'error'] };
  }
  return where;
}

async function syncPlannerWorkBlocks({
  prismaClient,
  plannerUid,
  cardIds = [],
  from = null,
  to = null,
  force = false,
  oauthClient = null,
  calendar = null,
}) {
  const blocks = await prismaClient.plannerWorkBlock.findMany({
    where: workBlockWhere(plannerUid, { cardIds, from, to, force }),
    orderBy: [{ date: 'asc' }, { plannerCardId: 'asc' }, { blockType: 'asc' }],
    take: 250,
  });
  if (!blocks.length) {
    return {
      ok: true,
      calendar: TARGET_CALENDAR_SUMMARY,
      processed: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      errors: [],
    };
  }

  const cards = await prismaClient.plannerCard.findMany({
    where: {
      supabaseUid: plannerUid,
      id: { in: [...new Set(blocks.map((block) => block.plannerCardId))] },
    },
  });
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const client =
    oauthClient || (await getAuthorizedGoogleOAuthClient(REQUIRED_SCOPES, prismaClient));
  const target = calendar || (await findTargetCalendar(client));
  const results = [];
  const errors = [];

  for (const block of blocks) {
    try {
      results.push(
        await synchronizeBlock(
          prismaClient,
          client,
          target.id,
          block,
          cardsById.get(block.plannerCardId) || null
        )
      );
    } catch (error) {
      await persistSyncError(prismaClient, block, error);
      errors.push({
        blockId: block.id,
        plannerCardId: block.plannerCardId,
        blockType: block.blockType,
        error: String(error?.message || error),
      });
    }
  }

  const count = (action) => results.filter((result) => result.action === action).length;
  return {
    ok: errors.length === 0,
    calendar: target.summary || TARGET_CALENDAR_SUMMARY,
    processed: blocks.length,
    created: count('create'),
    updated: count('update'),
    deleted: count('delete'),
    skipped: count('skip'),
    errors,
    results,
  };
}

module.exports = {
  TARGET_CALENDAR_SUMMARY,
  REQUIRED_SCOPES,
  eventWindow,
  googleEventBody,
  findTargetCalendar,
  findExistingEvent,
  syncPlannerWorkBlocks,
};
