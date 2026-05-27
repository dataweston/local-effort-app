const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso } = require('./_http');
const { getPlannerObjects, rangeForView } = require('./_planner');
const { getWeekEnd } = require('./_dates');
const { masterPlannerUid } = require('./_masterPlanner');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

function overlapsRange(start, end, range) {
  const s = String(start || '');
  const e = String(end || start || '');
  return s <= range.end && e >= range.start;
}

async function menuObjectsForRange({ customer, range }) {
  if (!customer) return [];
  const menuWeeks = await prisma.menuWeek.findMany({
    where: {
      status: { in: ['draft', 'published'] },
      weekStart: { lte: new Date(`${range.end}T23:59:59`) },
    },
    orderBy: { weekStart: 'asc' },
    take: 30,
  });

  return menuWeeks
    .filter((menuWeek) => {
      const start = asIso(menuWeek.weekStart)?.slice(0, 10);
      const end = asIso(getWeekEnd(menuWeek.weekStart))?.slice(0, 10);
      return overlapsRange(start, end, range);
    })
    .map((menuWeek) => ({
      id: `menu_week:${menuWeek.id}`,
      type: 'menu_week',
      title: 'Weekly menu',
      subtitle: menuWeek.status,
      horizon: 'week',
      visibility: 'customer',
      scheduleStatus: new Date(menuWeek.cutoffAt) < new Date() ? 'planned' : 'time_blocked',
      source: 'subscriber_portal',
      startsAt: asIso(menuWeek.weekStart),
      endsAt: asIso(menuWeek.cutoffAt),
      objectId: menuWeek.id,
      metadata: {
        status: menuWeek.status,
        cutoffAt: asIso(menuWeek.cutoffAt),
        customerId: customer.id,
      },
    }));
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const denied = requireHubAccess(auth);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  try {
    const view = String(req.query?.view || 'week').toLowerCase();
    const anchor = req.query?.date ? new Date(String(req.query.date)) : new Date();
    const planner = await getPlannerObjects({
      prisma,
      supabaseUid: masterPlannerUid(auth),
      view,
      anchor,
      enabledOnly: false,
    });
    const menuObjects = await menuObjectsForRange({ customer: auth.customer, range: planner.range });

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      view: planner.range.view,
      range: {
        start: planner.range.start,
        end: planner.range.end,
      },
      objects: [...menuObjects, ...planner.objects],
    });
  } catch (err) {
    console.error('[hub/calendar] error', err);
    return res.status(500).json({ error: 'Unable to load hub calendar' });
  }
};
