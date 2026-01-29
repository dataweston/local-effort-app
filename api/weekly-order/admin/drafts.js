const { PrismaClient } = require('@prisma/client');

const ADMIN_TOKEN = process.env.WEEKLY_ORDER_ADMIN_TOKEN || '';

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const checkAdmin = (req) => {
  if (!ADMIN_TOKEN) return true;
  const header = req.headers['x-admin-token'] || '';
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return header === ADMIN_TOKEN || bearer === ADMIN_TOKEN;
};

const mergeUnique = (arr, extra) => {
  const set = new Set([...(arr || []), ...(extra || [])]);
  return Array.from(set).filter(Boolean);
};

const applyDraftToDish = async ({ draft, targetDish }) => {
  const updates = {
    tags: mergeUnique(targetDish.tags, draft.tags),
    categories: mergeUnique(targetDish.categories, draft.categories),
    allergens: mergeUnique(targetDish.allergens, draft.allergens),
  };
  if (!targetDish.description && draft.description) {
    updates.description = draft.description;
  }
  return prisma.dish.update({
    where: { id: targetDish.id },
    data: updates,
  });
};

module.exports = async (req, res) => {
  if (!prisma) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  if (!checkAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const status = req.query?.status || 'pending';
    const items = await prisma.dishDraft.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      include: {
        ingest: true,
        matchedDish: true,
      },
    });
    return res.status(200).json({ items });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, draftId, targetDishId, updates } = req.body || {};
  if (!draftId) {
    return res.status(400).json({ error: 'Missing draftId' });
  }

  const draft = await prisma.dishDraft.findUnique({
    where: { id: draftId },
    include: { ingest: true, matchedDish: true },
  });
  if (!draft) {
    return res.status(404).json({ error: 'Draft not found' });
  }

  if (action === 'reject') {
    const updated = await prisma.dishDraft.update({
      where: { id: draftId },
      data: { status: 'rejected', notes: updates?.notes || null },
    });
    return res.status(200).json({ item: updated });
  }

  if (action === 'update') {
    const updated = await prisma.dishDraft.update({
      where: { id: draftId },
      data: {
        title: updates?.title ?? draft.title,
        description: updates?.description ?? draft.description,
        categories: updates?.categories ?? draft.categories,
        tags: updates?.tags ?? draft.tags,
        allergens: updates?.allergens ?? draft.allergens,
        notes: updates?.notes ?? draft.notes,
      },
    });
    return res.status(200).json({ item: updated });
  }

  if (action === 'approve' || action === 'merge') {
    let dish = null;
    if (targetDishId) {
      dish = await prisma.dish.findUnique({ where: { id: targetDishId } });
      if (!dish) return res.status(404).json({ error: 'Target dish not found' });
      await applyDraftToDish({ draft, targetDish: dish });
    } else if (draft.matchedDishId) {
      dish = await prisma.dish.findUnique({ where: { id: draft.matchedDishId } });
      if (dish) {
        await applyDraftToDish({ draft, targetDish: dish });
      }
    }

    if (!dish) {
      dish = await prisma.dish.create({
        data: {
          title: draft.title,
          description: draft.description,
          tags: draft.tags,
          categories: draft.categories,
          allergens: draft.allergens,
          status: 'approved',
        },
      });
    }

    if (draft.ingest?.externalKey) {
      await prisma.dishSourceLink.create({
        data: {
          dishId: dish.id,
          sourceId: draft.ingest.id,
          externalKey: draft.ingest.externalKey,
        },
      }).catch(() => {});
    }

    const updated = await prisma.dishDraft.update({
      where: { id: draftId },
      data: {
        status: action === 'merge' ? 'merged' : 'approved',
        matchedDishId: dish.id,
      },
    });

    return res.status(200).json({ item: updated, dish });
  }

  return res.status(400).json({ error: 'Unsupported action' });
};
