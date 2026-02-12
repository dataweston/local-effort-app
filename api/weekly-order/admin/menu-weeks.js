const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const ADMIN_TOKEN = process.env.WEEKLY_ORDER_ADMIN_TOKEN || '';

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const safeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

const checkAdmin = (req) => {
  if (!ADMIN_TOKEN) return false;
  const header = req.headers['x-admin-token'] || '';
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return safeEqual(header, ADMIN_TOKEN) || safeEqual(bearer, ADMIN_TOKEN);
};

const slugify = (value) => (value || '')
  .toString()
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

module.exports = async (req, res) => {
  if (!prisma) {
    return res.status(500).json({ error: 'Database not configured' });
  }
  if (!checkAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const items = await prisma.menuWeek.findMany({
      orderBy: { weekStart: 'desc' },
      include: {
        items: { include: { dish: true, section: true } },
        sections: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const {
      action,
      id,
      weekStart,
      cutoffAt,
      status,
      dishId,
      isVisible,
      isAddon,
      includedInPlan,
      sectionId,
      sortOrder,
      capacityLimit,
      title,
      slug,
      sectionOrder,
      sectionIdTarget,
    } = req.body || {};

    if (action === 'create') {
      if (!weekStart || !cutoffAt) {
        return res.status(400).json({ error: 'Missing weekStart or cutoffAt' });
      }
      const item = await prisma.menuWeek.create({
        data: {
          weekStart: new Date(weekStart),
          cutoffAt: new Date(cutoffAt),
          status: status || 'draft',
        },
      });
      return res.status(200).json({ item });
    }

    if (action === 'update') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const item = await prisma.menuWeek.update({
        where: { id },
        data: {
          weekStart: weekStart ? new Date(weekStart) : undefined,
          cutoffAt: cutoffAt ? new Date(cutoffAt) : undefined,
          status: status || undefined,
        },
      });
      return res.status(200).json({ item });
    }

    if (action === 'add-item') {
      if (!id || !dishId) return res.status(400).json({ error: 'Missing menu week id or dishId' });
      const item = await prisma.menuWeekItem.upsert({
        where: { menuWeekId_dishId: { menuWeekId: id, dishId } },
        update: {
          isVisible: isVisible ?? true,
          isAddon: isAddon ?? false,
          includedInPlan: includedInPlan ?? false,
          sectionId: sectionId ?? null,
          sortOrder: sortOrder ?? 0,
          capacityLimit: capacityLimit ?? null,
        },
        create: {
          menuWeekId: id,
          dishId,
          isVisible: isVisible ?? true,
          isAddon: isAddon ?? false,
          includedInPlan: includedInPlan ?? false,
          sectionId: sectionId ?? null,
          sortOrder: sortOrder ?? 0,
          capacityLimit: capacityLimit ?? null,
        },
      });
      return res.status(200).json({ item });
    }

    if (action === 'update-item') {
      if (!id || !dishId) return res.status(400).json({ error: 'Missing menu week id or dishId' });
      const item = await prisma.menuWeekItem.update({
        where: { menuWeekId_dishId: { menuWeekId: id, dishId } },
        data: {
          isVisible: isVisible ?? undefined,
          isAddon: isAddon ?? undefined,
          includedInPlan: includedInPlan ?? undefined,
          sectionId: sectionId ?? undefined,
          sortOrder: sortOrder ?? undefined,
          capacityLimit: capacityLimit ?? undefined,
        },
      });
      return res.status(200).json({ item });
    }

    if (action === 'remove-item') {
      if (!id || !dishId) return res.status(400).json({ error: 'Missing menu week id or dishId' });
      await prisma.menuWeekItem.delete({
        where: { menuWeekId_dishId: { menuWeekId: id, dishId } },
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'add-section') {
      if (!id || !title) return res.status(400).json({ error: 'Missing menu week id or title' });
      const section = await prisma.menuWeekSection.create({
        data: {
          menuWeekId: id,
          title,
          slug: slugify(slug || title),
          sortOrder: Number(sectionOrder) || 0,
        },
      });
      return res.status(200).json({ section });
    }

    if (action === 'update-section') {
      if (!sectionIdTarget) return res.status(400).json({ error: 'Missing sectionId' });
      const section = await prisma.menuWeekSection.update({
        where: { id: sectionIdTarget },
        data: {
          title: title ?? undefined,
          slug: slug ? slugify(slug) : undefined,
          sortOrder: sectionOrder !== undefined ? Number(sectionOrder) || 0 : undefined,
        },
      });
      return res.status(200).json({ section });
    }

    if (action === 'remove-section') {
      if (!sectionIdTarget) return res.status(400).json({ error: 'Missing sectionId' });
      await prisma.menuWeekItem.updateMany({
        where: { sectionId: sectionIdTarget },
        data: { sectionId: null },
      });
      await prisma.menuWeekSection.delete({ where: { id: sectionIdTarget } });
      return res.status(200).json({ ok: true });
    }

    if (action === 'populate-from-ingest') {
      if (!id) return res.status(400).json({ error: 'Missing menu week id' });
      const { ingestId, sectionId: targetSectionId } = req.body;
      if (!ingestId) return res.status(400).json({ error: 'Missing ingestId' });

      const drafts = await prisma.dishDraft.findMany({
        where: {
          sourceIngestId: ingestId,
          status: { in: ['approved', 'merged'] },
          matchedDishId: { not: null },
        },
      });

      if (!drafts.length) {
        return res.status(400).json({ error: 'No approved drafts with matched dishes in this ingest' });
      }

      const results = [];
      for (const draft of drafts) {
        try {
          await prisma.menuWeekItem.upsert({
            where: { menuWeekId_dishId: { menuWeekId: id, dishId: draft.matchedDishId } },
            update: {},
            create: {
              menuWeekId: id,
              dishId: draft.matchedDishId,
              isVisible: true,
              isAddon: false,
              includedInPlan: false,
              sectionId: targetSectionId || null,
              sortOrder: 0,
            },
          });
          results.push({ dishId: draft.matchedDishId, title: draft.title, added: true });
        } catch (err) {
          results.push({ dishId: draft.matchedDishId, title: draft.title, added: false, error: err.message });
        }
      }

      return res.status(200).json({ ok: true, results, added: results.filter((r) => r.added).length });
    }

    return res.status(400).json({ error: 'Unsupported action' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
