const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString } = require('./_http');
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

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { privileged: req.method === 'POST' && !['claim', 'putUp'].includes(req.body?.action) });
  if (denied) return res.status(denied.status).json({ error: denied.error });
  if (!auth.viewer.userId) return res.status(403).json({ error: 'Hub profile required' });

  const supabaseUid = masterPlannerUid(auth);

  try {
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
      const isAssigned = (card.people || []).includes(name);
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
    return res.status(200).json({
      ok: true,
      shifts: cards.filter(isShiftCard).map((card) => publicShift(card, byCard.get(card.id) || [])),
    });
  } catch (err) {
    console.error('[hub/shifts] error', err);
    return res.status(500).json({ error: 'Unable to manage shifts' });
  }
};
