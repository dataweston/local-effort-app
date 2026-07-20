const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString, safePrisma } = require('./_http');
const { masterPlannerUid } = require('./_masterPlanner');
const { isShiftCard } = require('./_planner');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

function dayOfWeek(date) {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('en-US', { weekday: 'long' });
}

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value) {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
}

function normalizedName(value) {
  return String(value || '').trim().toLowerCase();
}

function personMatchesProfile(person, profile) {
  const personName = normalizedName(person);
  const displayName = normalizedName(profile?.displayName);
  if (!personName || !displayName) return false;
  return personName === displayName
    || personName === displayName.split(/\s+/)[0]
    || displayName === personName.split(/\s+/)[0];
}

function canEditShift(card, auth) {
  return auth.isPrivileged || (card.people || []).some((person) => personMatchesProfile(person, auth.hubProfile));
}

const REQUEST_TYPES = new Set(['change', 'time_block', 'time_off']);
const REQUEST_STATUSES = new Set(['approved', 'declined']);

const effectiveShiftWhere = {
  OR: [
    { objectType: 'shift' },
    { objectType: null, zone: 'timed' },
  ],
};

function shiftIsOpen(card, activeClaims = []) {
  // A shift is up for pickup when it was explicitly put up (optional) or when
  // nobody is assigned to it. Assigned shifts stay covered until put up.
  return card.optional || ((card.people || []).length === 0 && activeClaims.length === 0);
}

function publicShift(card, claims = []) {
  const activeClaims = claims.filter((claim) => claim.status === 'claimed');
  return {
    id: card.id,
    title: card.title,
    date: card.date,
    dayOfWeek: card.dayOfWeek,
    startTime: card.startTime,
    endTime: card.endTime,
    people: card.people || [],
    status: card.status,
    open: shiftIsOpen(card, activeClaims),
    putUp: !!card.optional && (card.people || []).length > 0,
    claimedBy: activeClaims.map((claim) => claim.userId),
    createdAt: asIso(card.createdAt),
    updatedAt: asIso(card.updatedAt),
  };
}

function publicScheduleRequest(request, profilesByUserId = new Map()) {
  const profile = profilesByUserId.get(request.userId);
  return {
    id: request.id,
    userId: request.userId,
    requesterName: profile?.displayName || null,
    plannerCardId: request.plannerCardId,
    requestType: request.requestType,
    requestedDate: request.requestedDate,
    requestedStartTime: request.requestedStartTime,
    requestedEndTime: request.requestedEndTime,
    note: request.note,
    status: request.status,
    reviewedAt: asIso(request.reviewedAt),
    createdAt: asIso(request.createdAt),
    updatedAt: asIso(request.updatedAt),
  };
}

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { privileged: req.method === 'POST' && !['claim', 'putUp'].includes(req.body?.action) });
  if (denied) return res.status(denied.status).json({ error: denied.error });
  if (!auth.viewer.userId) return res.status(403).json({ error: 'Hub profile required' });

  const supabaseUid = masterPlannerUid(auth);

  try {
    if (req.method === 'POST' && req.body?.action === 'update') {
      const plannerCardId = cleanString(req.body?.plannerCardId, 120);
      if (!plannerCardId) return res.status(400).json({ error: 'plannerCardId is required' });
      const card = await prisma.plannerCard.findFirst({ where: { id: plannerCardId, supabaseUid, ...effectiveShiftWhere } });
      if (!card) return res.status(404).json({ error: 'Shift not found' });
      if (!canEditShift(card, auth)) return res.status(403).json({ error: 'Only assigned staff or an admin can edit this shift' });

      const date = cleanString(req.body?.date, 20) || card.date;
      const startTime = cleanString(req.body?.startTime, 20) || card.startTime;
      const endTime = cleanString(req.body?.endTime, 20);
      if (!isDate(date) || !isTime(startTime) || (endTime && !isTime(endTime))) {
        return res.status(400).json({ error: 'A valid date, start time, and optional end time are required' });
      }
      const data = {
        date,
        dayOfWeek: dayOfWeek(date),
        startTime,
        endTime: endTime || null,
        status: card.status === 'open' ? 'open' : 'scheduled',
      };
      if (auth.isPrivileged) data.title = cleanString(req.body?.title, 160) || card.title;
      const updated = await prisma.plannerCard.update({ where: { id: card.id }, data });
      return res.status(200).json({ ok: true, shift: publicShift(updated) });
    }

    if (req.method === 'POST' && req.body?.action === 'request') {
      const requestType = cleanString(req.body?.requestType, 30);
      if (!REQUEST_TYPES.has(requestType)) return res.status(400).json({ error: 'Unsupported schedule request type' });
      const plannerCardId = cleanString(req.body?.plannerCardId, 120);
      let card = null;
      if (plannerCardId) {
        card = await prisma.plannerCard.findFirst({ where: { id: plannerCardId, supabaseUid, ...effectiveShiftWhere } });
        if (!card) return res.status(404).json({ error: 'Shift not found' });
        if (!canEditShift(card, auth)) return res.status(403).json({ error: 'Only assigned staff can request changes to this shift' });
      }
      const requestedDate = cleanString(req.body?.date, 20) || card?.date;
      const requestedStartTime = cleanString(req.body?.startTime, 20) || card?.startTime || null;
      const requestedEndTime = cleanString(req.body?.endTime, 20) || card?.endTime || null;
      if (!isDate(requestedDate)
        || (requestedStartTime && !isTime(requestedStartTime))
        || (requestedEndTime && !isTime(requestedEndTime))) {
        return res.status(400).json({ error: 'A valid requested date and optional times are required' });
      }
      const created = await prisma.hubScheduleRequest.create({
        data: {
          userId: auth.viewer.userId,
          plannerCardId: card?.id || null,
          requestType,
          requestedDate,
          requestedStartTime,
          requestedEndTime,
          note: cleanString(req.body?.note, 1000),
        },
      });
      return res.status(201).json({
        ok: true,
        request: publicScheduleRequest(created, new Map([[auth.viewer.userId, auth.hubProfile]])),
      });
    }

    if (req.method === 'POST' && req.body?.action === 'cancelRequest') {
      const requestId = cleanString(req.body?.requestId, 120);
      const request = await prisma.hubScheduleRequest.findFirst({ where: { id: requestId } });
      if (!request) return res.status(404).json({ error: 'Schedule request not found' });
      if (request.userId !== auth.viewer.userId && !auth.isPrivileged) return res.status(403).json({ error: 'Forbidden' });
      if (request.status !== 'pending') return res.status(409).json({ error: 'Only pending requests can be canceled' });
      const updated = await prisma.hubScheduleRequest.update({ where: { id: request.id }, data: { status: 'canceled' } });
      return res.status(200).json({ ok: true, request: publicScheduleRequest(updated) });
    }

    if (req.method === 'POST' && req.body?.action === 'reviewRequest') {
      if (!auth.isPrivileged) return res.status(403).json({ error: 'Privileged access required' });
      const requestId = cleanString(req.body?.requestId, 120);
      const status = cleanString(req.body?.status, 30);
      if (!REQUEST_STATUSES.has(status)) return res.status(400).json({ error: 'Review status must be approved or declined' });
      const request = await prisma.hubScheduleRequest.findFirst({ where: { id: requestId } });
      if (!request) return res.status(404).json({ error: 'Schedule request not found' });
      if (request.status !== 'pending') return res.status(409).json({ error: 'Schedule request has already been reviewed' });

      const profile = await prisma.hubProfile.findFirst({ where: { userId: request.userId } });
      const result = await prisma.$transaction(async (tx) => {
        let shift = null;
        if (status === 'approved' && request.plannerCardId) {
          const existing = await tx.plannerCard.findFirst({ where: { id: request.plannerCardId, supabaseUid } });
          if (!existing) throw new Error('Requested shift no longer exists');
          shift = await tx.plannerCard.update({
            where: { id: existing.id },
            data: {
              date: request.requestedDate,
              dayOfWeek: dayOfWeek(request.requestedDate),
              startTime: request.requestedStartTime,
              endTime: request.requestedEndTime,
              status: 'scheduled',
            },
          });
        } else if (status === 'approved' && !request.plannerCardId) {
          const label = request.requestType === 'time_off' ? 'Unavailable' : 'Time block';
          shift = await tx.plannerCard.create({
            data: {
              supabaseUid,
              title: `${profile?.displayName || 'Staff'} — ${label}`,
              date: request.requestedDate,
              dayOfWeek: dayOfWeek(request.requestedDate),
              zone: 'timed',
              objectType: 'shift',
              startTime: request.requestedStartTime,
              endTime: request.requestedEndTime,
              people: profile?.displayName ? [profile.displayName] : [],
              optional: false,
              enabled: true,
              status: request.requestType,
              notes: request.note,
              sortOrder: Date.now(),
            },
          });
        }
        const reviewed = await tx.hubScheduleRequest.update({
          where: { id: request.id },
          data: { status, reviewedByUserId: auth.viewer.userId, reviewedAt: new Date() },
        });
        return { shift, reviewed };
      });
      return res.status(200).json({
        ok: true,
        request: publicScheduleRequest(result.reviewed, new Map([[request.userId, profile]])),
        shift: result.shift ? publicShift(result.shift) : null,
      });
    }

    if (req.method === 'POST' && req.body?.action === 'claim') {
      const plannerCardId = cleanString(req.body?.plannerCardId, 120);
      if (!plannerCardId) return res.status(400).json({ error: 'plannerCardId is required' });
      const card = await prisma.plannerCard.findFirst({ where: { id: plannerCardId, supabaseUid, ...effectiveShiftWhere } });
      if (!card) return res.status(404).json({ error: 'Open shift not found' });
      const existingClaims = await prisma.hubShiftClaim.findMany({ where: { plannerCardId } });
      if (!shiftIsOpen(card, existingClaims.filter((claim) => claim.status === 'claimed'))) {
        return res.status(404).json({ error: 'Open shift not found' });
      }

      const claim = await prisma.hubShiftClaim.upsert({
        where: { plannerCardId_userId: { plannerCardId, userId: auth.viewer.userId } },
        update: { status: 'claimed', note: cleanString(req.body?.note, 500) },
        create: {
          plannerCardId,
          userId: auth.viewer.userId,
          note: cleanString(req.body?.note, 500),
        },
      });

      // Anyone who put the shift up hands it over to the claimer.
      const offered = existingClaims.filter((entry) => entry.status === 'offered' && entry.userId !== auth.viewer.userId);
      let people = card.people || [];
      if (offered.length) {
        const offeredProfiles = await prisma.hubProfile.findMany({ where: { userId: { in: offered.map((entry) => entry.userId) } } });
        const offeredNames = new Set(offeredProfiles.map((profile) => profile.displayName));
        people = people.filter((person) => !offeredNames.has(person));
        await prisma.hubShiftClaim.updateMany({
          where: { id: { in: offered.map((entry) => entry.id) } },
          data: { status: 'released' },
        });
      }

      const name = auth.hubProfile?.displayName || auth.viewer.email;
      people = Array.from(new Set([...people, name].filter(Boolean)));
      const updated = await prisma.plannerCard.update({
        where: { id: card.id },
        data: { people, optional: false, status: 'claimed' },
      });
      return res.status(200).json({ ok: true, shift: publicShift(updated, [claim]) });
    }

    if (req.method === 'POST' && req.body?.action === 'putUp') {
      const plannerCardId = cleanString(req.body?.plannerCardId, 120);
      if (!plannerCardId) return res.status(400).json({ error: 'plannerCardId is required' });
      const card = await prisma.plannerCard.findFirst({ where: { id: plannerCardId, supabaseUid, ...effectiveShiftWhere } });
      if (!card) return res.status(404).json({ error: 'Shift not found' });

      const name = auth.hubProfile?.displayName || auth.viewer.email;
      const isAssigned = (card.people || []).includes(name)
        || (card.people || []).some((person) => personMatchesProfile(person, auth.hubProfile));
      if (!isAssigned && !auth.isPrivileged) {
        return res.status(403).json({ error: 'Only the assigned person can put a shift up for pickup' });
      }

      const claim = await prisma.hubShiftClaim.upsert({
        where: { plannerCardId_userId: { plannerCardId, userId: auth.viewer.userId } },
        update: { status: 'offered', note: cleanString(req.body?.note, 500) },
        create: {
          plannerCardId,
          userId: auth.viewer.userId,
          status: 'offered',
          note: cleanString(req.body?.note, 500),
        },
      });

      const updated = await prisma.plannerCard.update({
        where: { id: card.id },
        data: { optional: true, status: 'open' },
      });
      return res.status(200).json({ ok: true, shift: publicShift(updated, [claim]) });
    }

    if (req.method === 'POST') {
      const title = cleanString(req.body?.title, 160);
      const date = cleanString(req.body?.date, 20);
      const startTime = cleanString(req.body?.startTime, 20);
      const endTime = cleanString(req.body?.endTime, 20);
      if (!title || !isDate(date) || !isTime(startTime)) {
        return res.status(400).json({ error: 'title, date, and startTime are required' });
      }
      const card = await prisma.plannerCard.create({
        data: {
          supabaseUid,
          title,
          date,
          dayOfWeek: dayOfWeek(date),
          zone: 'timed',
          objectType: 'shift',
          startTime,
          endTime: isTime(endTime) ? endTime : null,
          people: [],
          optional: true,
          enabled: true,
          status: 'open',
          sortOrder: Date.now(),
        },
      });
      return res.status(201).json({ ok: true, shift: publicShift(card) });
    }

    const from = cleanString(req.query?.from, 20) || new Date().toISOString().slice(0, 10);
    const to = cleanString(req.query?.to, 20) || from;
    const cards = await prisma.plannerCard.findMany({
      where: {
        supabaseUid,
        date: { gte: from, lte: to },
        enabled: true,
        ...effectiveShiftWhere,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 250,
    });
    const claims = await prisma.hubShiftClaim.findMany({
      where: { plannerCardId: { in: cards.map((card) => card.id) } },
    });
    const byCard = new Map();
    claims.forEach((claim) => {
      byCard.set(claim.plannerCardId, [...(byCard.get(claim.plannerCardId) || []), claim]);
    });
    const requests = await safePrisma([], () => prisma.hubScheduleRequest.findMany({
      where: {
        requestedDate: { gte: from, lte: to },
        ...(auth.isPrivileged ? {} : { userId: auth.viewer.userId }),
      },
      orderBy: [{ requestedDate: 'asc' }, { createdAt: 'desc' }],
      take: 250,
    }));
    const requestUserIds = [...new Set(requests.map((request) => request.userId))];
    const requestProfiles = requestUserIds.length
      ? await prisma.hubProfile.findMany({ where: { userId: { in: requestUserIds } } })
      : [];
    const profilesByUserId = new Map(requestProfiles.map((profile) => [profile.userId, profile]));
    return res.status(200).json({
      ok: true,
      shifts: cards.filter(isShiftCard).map((card) => publicShift(card, byCard.get(card.id) || [])),
      requests: requests.map((request) => publicScheduleRequest(request, profilesByUserId)),
    });
  } catch (err) {
    console.error('[hub/shifts] error', err);
    return res.status(500).json({ error: 'Unable to manage shifts' });
  }
};
