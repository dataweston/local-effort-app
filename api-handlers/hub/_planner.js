const { asIso } = require('./_http');
const { toIsoDate, addDays, startOfLocalDay, getWeekStart, getMonthRange } = require('./_dates');

function plannerCardObjectType(card) {
  return card.objectType || (card.zone === 'timed' ? 'shift' : 'prep_task');
}

function isShiftCard(card) {
  return plannerCardObjectType(card) === 'shift';
}

function cardToObject(card) {
  const type = plannerCardObjectType(card);
  return {
    id: `planner_card:${card.id}`,
    type,
    title: card.title,
    subtitle: card.people?.length ? card.people.join(', ') : null,
    horizon: 'week',
    visibility: 'staff',
    scheduleStatus: card.startTime ? 'time_blocked' : 'planned',
    source: 'weekly_planner',
    startsAt: card.startTime ? `${card.date}T${card.startTime}:00` : null,
    endsAt: card.endTime ? `${card.date}T${card.endTime}:00` : null,
    objectId: card.id,
    metadata: {
      date: card.date,
      dayOfWeek: card.dayOfWeek,
      zone: card.zone,
      objectType: card.objectType || null,
      people: card.people || [],
      optional: card.optional,
      enabled: card.enabled,
      status: card.status || null,
      effectTarget: card.effectTarget,
      effectType: card.effectType,
      createdAt: asIso(card.createdAt),
      updatedAt: asIso(card.updatedAt),
    },
  };
}

function rangeForView(view, anchor = new Date()) {
  const mode = ['day', 'week', 'month'].includes(view) ? view : 'week';
  const safeAnchor = anchor instanceof Date && !Number.isNaN(anchor.getTime()) ? anchor : new Date();
  if (mode === 'day') {
    const start = toIsoDate(startOfLocalDay(safeAnchor));
    const end = start;
    return { view: mode, start, end };
  }
  if (mode === 'month') {
    return { view: mode, ...getMonthRange(safeAnchor) };
  }
  const start = getWeekStart(safeAnchor);
  return { view: mode, start, end: toIsoDate(addDays(`${start}T00:00:00`, 6)) };
}

async function getPlannerObjects(prisma, { supabaseUid, view = 'week', anchor = new Date(), enabledOnly = true }) {
  const range = rangeForView(view, anchor);
  const cards = await prisma.plannerCard.findMany({
    where: {
      supabaseUid,
      date: { gte: range.start, lte: range.end },
      ...(enabledOnly ? { enabled: true } : {}),
      objectType: { not: 'revenue' },
    },
    orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }],
    take: 250,
  });

  return { range, objects: cards.map(cardToObject), cards };
}

module.exports = { cardToObject, getPlannerObjects, isShiftCard, plannerCardObjectType, rangeForView };
