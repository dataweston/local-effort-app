const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer } = require('./_auth');
const { methodNotAllowed, cleanString } = require('./_http');
const { sourceIdFor, writeLedger } = require('./_ledger');
const { cardToObject, plannerCardObjectType } = require('./_planner');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

function splitObjectId(rawId, queryType) {
  const id = cleanString(rawId, 160);
  const type = cleanString(queryType, 80);
  if (!id) return { type, id: null };
  const sep = id.indexOf(':');
  if (sep > 0) {
    return { type: id.slice(0, sep), id: id.slice(sep + 1) };
  }
  return { type, id };
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isClockTime(value) {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
}

function planUpdates(body) {
  const updates = {};
  const scheduleStatus = cleanString(body.scheduleStatus || body.status, 40);
  const date = cleanString(body.date, 20);
  const startTime = cleanString(body.startTime, 20);
  const endTime = cleanString(body.endTime, 20);

  if (typeof body.enabled === 'boolean') updates.enabled = body.enabled;
  if (typeof body.optional === 'boolean') updates.optional = body.optional;
  if (isIsoDate(date)) updates.date = date;
  if (isClockTime(startTime)) updates.startTime = startTime;
  if (isClockTime(endTime)) updates.endTime = endTime;
  if (Array.isArray(body.people)) {
    updates.people = body.people
      .map((person) => cleanString(person, 80))
      .filter(Boolean)
      .slice(0, 20);
  }

  if (scheduleStatus === 'deferred') {
    updates.enabled = false;
  } else if (scheduleStatus === 'planned' || scheduleStatus === 'time_blocked') {
    updates.enabled = true;
    updates.optional = false;
  }

  return { updates, scheduleStatus };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const parsed = splitObjectId(req.params?.id || req.query?.id, req.body?.objectType || req.query?.type);
  if (!parsed.id) return res.status(400).json({ error: 'object id is required' });
  if (!['planner_card', 'shift', 'prep_task'].includes(parsed.type)) {
    return res.status(400).json({ error: 'Only planner-backed objects can be planned in this MVP' });
  }

  const body = req.body || {};
  const { updates, scheduleStatus } = planUpdates(body);
  if (!Object.keys(updates).length && !scheduleStatus) {
    return res.status(400).json({ error: 'No plan update was provided' });
  }

  try {
    const card = await prisma.plannerCard.findFirst({
      where: {
        id: parsed.id,
        ...(auth.isAdmin ? {} : { supabaseUid: auth.viewer.supabaseUid }),
      },
    });
    if (!card) return res.status(404).json({ error: 'Planner object not found' });
    if (parsed.type !== 'planner_card' && parsed.type !== plannerCardObjectType(card)) {
      return res.status(409).json({ error: 'Planner object type does not match the stored card' });
    }

    const source = cleanString(body.source, 80) || 'mobile';
    const sourceId = sourceIdFor({ ...body, source }, ['plan', parsed.type, parsed.id, scheduleStatus || 'update']);
    const ledger = await writeLedger(prisma, {
      eventType: 'hub.object_plan_updated',
      source,
      sourceId,
      auth,
      occurredAt: body.occurredAt,
      payload: {
        actorRole: body.actorRole || auth.roles[0] || null,
        objectType: parsed.type,
        objectId: parsed.id,
        scheduleStatus: scheduleStatus || null,
        updates,
        note: cleanString(body.note, 3000),
      },
    });

    const updated = await prisma.plannerCard.update({
      where: { id: card.id },
      data: updates,
    });

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      object: cardToObject(updated),
      ledgerEventId: ledger.event.id,
      existing: ledger.existing,
    });
  } catch (err) {
    console.error('[hub/object-plan] error', err);
    return res.status(500).json({ error: 'Unable to update object plan' });
  }
};
