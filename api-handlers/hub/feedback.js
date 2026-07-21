const { prisma } = require('../_lib/prisma');
const { resolveHubViewer } = require('./_auth');
const { methodNotAllowed, cleanString } = require('./_http');
const { sourceIdFor, writeLedger } = require('./_ledger');


function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function normalizeMenuWeekId(value) {
  const id = cleanString(value, 160);
  if (!id) return null;
  return id.startsWith('menu_week:') ? id.slice('menu_week:'.length) : id;
}

async function assertVisibleDish(auth, { dishId, menuWeekId }) {
  const item = await prisma.menuWeekItem.findFirst({
    where: { dishId, menuWeekId, isVisible: true },
    select: { dishId: true },
  });
  if (!item) return false;
  if (auth.isAdmin || !auth.customer) return true;

  const visibility = await prisma.dishVisibility.findFirst({
    where: { dishId, menuWeekId, customerId: auth.customer.id },
    select: { canView: true },
  });
  return !visibility || visibility.canView !== false;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  if (!auth.dbUser?.id) return res.status(404).json({ error: 'No local user profile found' });

  const body = req.body || {};
  const dishId = cleanString(body.dishId || body.metadata?.dishId, 120);
  const menuWeekId = normalizeMenuWeekId(body.menuWeekId || body.objectId);
  const thumbsUp = parseBoolean(body.thumbsUp);
  const notes = cleanString(body.notes, 3000);

  if (!dishId) return res.status(400).json({ error: 'dishId is required' });
  if (!menuWeekId) return res.status(400).json({ error: 'menuWeekId is required' });
  if (thumbsUp === null) return res.status(400).json({ error: 'thumbsUp is required' });

  try {
    const canSeeDish = await assertVisibleDish(auth, { dishId, menuWeekId });
    if (!canSeeDish) return res.status(404).json({ error: 'Dish not found for this menu week' });

    const source = cleanString(body.source, 80) || 'mobile';
    const sourceId = sourceIdFor({ ...body, source }, ['feedback', auth.dbUser.id, dishId, menuWeekId]);
    const ledger = await writeLedger(prisma, {
      eventType: 'hub.feedback_submitted',
      source,
      sourceId,
      auth,
      occurredAt: body.occurredAt,
      payload: {
        captureIntent: 'feedback',
        actorRole: body.actorRole || auth.roles[0] || null,
        dishId,
        menuWeekId,
        objectType: 'menu_week',
        objectId: menuWeekId,
        thumbsUp,
        notes,
        customerId: auth.customer?.id || null,
      },
    });

    const feedback = await prisma.dishFeedback.upsert({
      where: {
        userId_dishId_menuWeekId: {
          userId: auth.dbUser.id,
          dishId,
          menuWeekId,
        },
      },
      update: { thumbsUp, notes },
      create: {
        userId: auth.dbUser.id,
        dishId,
        menuWeekId,
        thumbsUp,
        notes,
      },
    });

    return res.status(201).json({
      ok: true,
      feedbackId: feedback.id,
      ledgerEventId: ledger.event.id,
      existing: ledger.existing,
    });
  } catch (err) {
    console.error('[hub/feedback] error', err);
    return res.status(500).json({ error: 'Unable to submit hub feedback' });
  }
};
