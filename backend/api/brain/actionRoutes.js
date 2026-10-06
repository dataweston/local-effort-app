const { getPrisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');

const verifyAdminRequest = createAdminVerifier();
const ACTION_STATUSES = new Set(['proposed', 'accepted', 'deferred', 'in_progress', 'completed', 'dismissed']);
const OPEN_STATUSES = ['proposed', 'accepted', 'in_progress'];

function parseDate(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${field} must be a valid date`);
  return date;
}

function actionData(body = {}) {
  const actionType = String(body.actionType || '').trim();
  const title = String(body.title || '').trim();
  if (!actionType || actionType.length > 80) throw new Error('actionType is required (<=80 chars)');
  if (!title || title.length > 240) throw new Error('title is required (<=240 chars)');
  if (body.status !== undefined && !ACTION_STATUSES.has(body.status)) throw new Error('invalid status');
  const evidenceIds = Array.isArray(body.evidenceIds)
    ? [...new Set(body.evidenceIds.map(String).map(s => s.trim()).filter(Boolean))].slice(0, 100)
    : [];
  return {
    actionType,
    status: body.status || 'proposed',
    title,
    rationale: body.rationale ? String(body.rationale).slice(0, 2000) : null,
    recommendation: body.recommendation ?? null,
    evidenceIds,
    sourceType: body.sourceType ? String(body.sourceType).slice(0, 80) : null,
    sourceId: body.sourceId ? String(body.sourceId).slice(0, 200) : null,
    subjectEntityId: body.subjectEntityId ? String(body.subjectEntityId) : null,
    owner: body.owner ? String(body.owner).slice(0, 160) : null,
    dueAt: parseDate(body.dueAt, 'dueAt'),
  };
}

function registerActionRoutes(app, { logger } = {}) {
  const prisma = getPrisma();

  app.get('/api/brain/actions', async (req, res) => {
    try {
      if (!await verifyAdminRequest(req)) return res.status(403).json({ error: 'admin only' });
      const requested = req.query.status ? String(req.query.status).split(',').filter(Boolean) : OPEN_STATUSES;
      const statuses = requested.filter(status => ACTION_STATUSES.has(status));
      if (!statuses.length) return res.status(400).json({ error: 'invalid status' });
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
      const items = await prisma.brainAction.findMany({
        where: { status: { in: statuses } },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        take: limit,
      });
      return res.json({ ok: true, items, count: items.length, statuses });
    } catch (err) {
      logger?.error({ err }, 'brain/actions list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.post('/api/brain/actions', async (req, res) => {
    try {
      if (!await verifyAdminRequest(req)) return res.status(403).json({ error: 'admin only' });
      const created = await prisma.brainAction.create({ data: actionData(req.body) });
      return res.status(201).json({ ok: true, item: created });
    } catch (err) {
      if (/required|valid date|invalid/.test(err.message)) return res.status(400).json({ error: err.message });
      logger?.error({ err }, 'brain/actions create error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.patch('/api/brain/actions/:id', async (req, res) => {
    try {
      if (!await verifyAdminRequest(req)) return res.status(403).json({ error: 'admin only' });
      const status = req.body?.status;
      if (!ACTION_STATUSES.has(status)) return res.status(400).json({ error: 'invalid status' });
      const now = new Date();
      const data = {
        status,
        ...(req.body.title !== undefined ? { title: String(req.body.title).trim().slice(0, 240) } : {}),
        ...(req.body.rationale !== undefined ? { rationale: req.body.rationale ? String(req.body.rationale).slice(0, 2000) : null } : {}),
        ...(req.body.owner !== undefined ? { owner: req.body.owner ? String(req.body.owner).slice(0, 160) : null } : {}),
        ...(req.body.dueAt !== undefined ? { dueAt: parseDate(req.body.dueAt, 'dueAt') } : {}),
        ...(req.body.outcome !== undefined ? { outcome: req.body.outcome } : {}),
        ...(status !== 'proposed' ? { decidedAt: now } : {}),
        ...(status === 'completed' ? { completedAt: now } : {}),
      };
      const updated = await prisma.brainAction.update({ where: { id: req.params.id }, data });
      return res.json({ ok: true, item: updated });
    } catch (err) {
      if (/valid date/.test(err.message)) return res.status(400).json({ error: err.message });
      logger?.error({ err }, 'brain/actions update error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });
}

module.exports = { registerActionRoutes, actionData, ACTION_STATUSES };
