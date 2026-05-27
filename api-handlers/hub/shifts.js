const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString } = require('./_http');
const { masterPlannerUid } = require('./_masterPlanner');

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
    open: card.optional || activeClaims.length === 0,
    claimedBy: activeClaims.map((claim) => claim.userId),
    createdAt: asIso(card.createdAt),
    updatedAt: asIso(card.updatedAt),
  };
}

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { privileged: req.method === 'POST' && req.body?.action !== 'claim' });
  if (denied) return res.status(denied.status).json({ error: denied.error });
  if (!auth.viewer.userId) return res.status(403).json({ error: 'Hub profile required' });

  const supabaseUid = masterPlannerUid(auth);

  try {
    if (req.method === 'POST' && req.body?.action === 'claim') {
      const plannerCardId = cleanString(req.body?.plannerCardId, 120);
      if (!plannerCardId) return res.status(400).json({ error: 'plannerCardId is required' });
      const card = await prisma.plannerCard.findFirst({ where: { id: plannerCardId, supabaseUid, zone: 'timed' } });
      if (!card || !card.optional) return res.status(404).json({ error: 'Open shift not found' });

      const claim = await prisma.hubShiftClaim.upsert({
        where: { plannerCardId_userId: { plannerCardId, userId: auth.viewer.userId } },
        update: { status: 'claimed', note: cleanString(req.body?.note, 500) },
        create: {
          plannerCardId,
          userId: auth.viewer.userId,
          note: cleanString(req.body?.note, 500),
        },
      });

      const name = auth.hubProfile?.displayName || auth.viewer.email;
      const people = Array.from(new Set([...(card.people || []), name].filter(Boolean)));
      const updated = await prisma.plannerCard.update({
        where: { id: card.id },
        data: { people, optional: false, status: 'claimed' },
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
        zone: 'timed',
        date: { gte: from, lte: to },
        enabled: true,
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
      shifts: cards.map((card) => publicShift(card, byCard.get(card.id) || [])),
    });
  } catch (err) {
    console.error('[hub/shifts] error', err);
    return res.status(500).json({ error: 'Unable to manage shifts' });
  }
};
