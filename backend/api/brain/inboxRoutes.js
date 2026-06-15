/**
 * Brain inbox routes.
 *
 * POST /api/brain/inbox        — capture endpoint (Drafts, Shortcut, admin UX, Obsidian)
 * GET  /api/brain/inbox        — triage queue (admin only, Supabase auth)
 * POST /api/brain/inbox/:id/triage — process an item
 * POST /api/brain/tokens       — generate a static BrainApiToken (admin only)
 *
 * Auth:
 *   - Supabase JWT (admin) — full access
 *   - Static BrainApiToken — POST /api/brain/inbox only (for Drafts, Obsidian, Shortcuts)
 */

const crypto = require('crypto');
const { getPrisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { writeLedgerEvent, createInboxItem, findOrCreateEntity } = require('./ledger');

const verifyAdminRequest = createAdminVerifier();

// ── Token auth ────────────────────────────────────────────────────────────────

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function verifyBrainToken(req, requiredScope = 'brain:write') {
  const header = String(req?.headers?.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const raw = match[1].trim();
  const tokenHash = hashToken(raw);
  const prisma = getPrisma();

  const token = await prisma.brainApiToken.findUnique({ where: { tokenHash } });
  if (!token) return null;
  if (!token.scopes.includes(requiredScope)) return null;

  // Update lastUsedAt async
  prisma.brainApiToken.update({
    where: { tokenHash },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return token;
}

async function verifyInboxAuth(req) {
  // Accept either Supabase admin JWT or static brain token
  const adminUser = await verifyAdminRequest(req);
  if (adminUser) return { type: 'admin', identity: adminUser.email };

  const brainToken = await verifyBrainToken(req, 'brain:write');
  if (brainToken) return { type: 'token', identity: brainToken.label };

  return null;
}

// ── Route handlers ────────────────────────────────────────────────────────────

function registerInboxRoutes(app, { logger } = {}) {
  const prisma = getPrisma();

  // POST /api/brain/inbox — capture
  app.post('/api/brain/inbox', async (req, res) => {
    try {
      const auth = await verifyInboxAuth(req);
      if (!auth) return res.status(401).json({ error: 'unauthorized' });

      const { rawContent, source, attachments } = req.body || {};
      if (!rawContent || typeof rawContent !== 'string' || !rawContent.trim()) {
        return res.status(400).json({ error: 'rawContent is required' });
      }
      if (!source || typeof source !== 'string') {
        return res.status(400).json({ error: 'source is required' });
      }

      // LedgerEvent first
      const ledgerEvent = await writeLedgerEvent({
        eventType: 'inbox.captured',
        occurredAt: new Date(),
        source,
        actorType: auth.type === 'admin' ? 'founder' : 'system',
        payload: {
          rawContent: rawContent.trim(),
          source,
          attachments: attachments || null,
          capturedBy: auth.identity,
        },
      });

      // Then inbox item
      const item = await createInboxItem({
        rawContent: rawContent.trim(),
        source,
        attachments: attachments || null,
        ledgerEventId: ledgerEvent.id,
      });

      logger?.info({ id: item.id, source }, 'brain: inbox item captured');
      return res.status(201).json({ ok: true, id: item.id });
    } catch (err) {
      logger?.error({ err }, 'brain: inbox capture error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/inbox — triage queue
  app.get('/api/brain/inbox', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { status = 'pending', limit = '50', offset = '0' } = req.query;
      const items = await prisma.brainInboxItem.findMany({
        where: { status },
        orderBy: { capturedAt: 'desc' },
        take: Math.min(parseInt(limit) || 50, 100),
        skip: parseInt(offset) || 0,
        include: { resultEntity: { select: { id: true, name: true, entityType: true } } },
      });

      // Resolve matched entities from triageHint.matchedEntityId
      const matchedIds = [...new Set(
        items
          .map((i) => i.triageHint?.matchedEntityId)
          .filter(Boolean),
      )];
      let matchedEntityMap = {};
      if (matchedIds.length) {
        const entities = await prisma.brainEntity.findMany({
          where: { id: { in: matchedIds } },
          select: {
            id: true,
            name: true,
            entityType: true,
            _count: { select: { srcAssertions: true, dstAssertions: true } },
          },
        });
        matchedEntityMap = Object.fromEntries(entities.map((e) => [e.id, {
          id: e.id,
          name: e.name,
          entityType: e.entityType,
          assertionCount: (e._count?.srcAssertions || 0) + (e._count?.dstAssertions || 0),
        }]));
      }

      const enriched = items.map((item) => ({
        ...item,
        matchedEntity: item.triageHint?.matchedEntityId
          ? (matchedEntityMap[item.triageHint.matchedEntityId] || null)
          : null,
      }));

      const total = await prisma.brainInboxItem.count({ where: { status } });
      return res.json({ ok: true, items: enriched, total });
    } catch (err) {
      logger?.error({ err }, 'brain: inbox list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/inbox/:id/triage — process an item
  app.post('/api/brain/inbox/:id/triage', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { id } = req.params;
      const { action, payload: triagePayload } = req.body || {};

      const item = await prisma.brainInboxItem.findUnique({ where: { id } });
      if (!item) return res.status(404).json({ error: 'not found' });
      if (item.status !== 'pending') return res.status(400).json({ error: 'already processed' });

      let resultEntityId = null;

      if (action === 'trash') {
        await prisma.brainInboxItem.update({
          where: { id },
          data: { status: 'trashed', processedAt: new Date() },
        });
        return res.json({ ok: true, action: 'trashed' });
      }

      if (action === 'new_entity') {
        const { entityType, name, properties } = triagePayload || {};
        if (!entityType || !name) return res.status(400).json({ error: 'entityType and name required' });

        await writeLedgerEvent({
          eventType: 'inbox.captured',
          occurredAt: new Date(),
          source: 'admin_ux',
          actorType: 'founder',
          payload: { inboxItemId: id, action: 'new_entity', entityType, name },
        });

        // Reuse an existing entity on name/alias match instead of minting duplicates
        const { entity, created, blocked, blockReason } = await findOrCreateEntity({ entityType, name, properties: properties || null });
        if (blocked || !entity) {
          return res.status(422).json({ error: 'self-identity guard', reason: blockReason || `${entityType} "${name}" looks like the business's own identity` });
        }
        if (!created && properties && typeof properties === 'object') {
          await prisma.brainEntity.update({
            where: { id: entity.id },
            data: { properties: { ...(entity.properties || {}), ...properties } },
          });
        }
        resultEntityId = entity.id;
      }

      if (action === 'append_entity') {
        const { entityId, note } = triagePayload || {};
        if (!entityId) return res.status(400).json({ error: 'entityId required' });

        const entity = await prisma.brainEntity.findUnique({ where: { id: entityId } });
        if (!entity) return res.status(404).json({ error: 'entity not found' });

        if (note) {
          // Create a Note entity linked to the target
          const noteEntity = await prisma.brainEntity.create({
            data: {
              entityType: 'Note',
              name: note.slice(0, 80),
              properties: { content: note, source: item.source },
              status: 'active',
            },
          });
          await prisma.brainAssertion.create({
            data: {
              srcId: noteEntity.id,
              dstId: entityId,
              relType: 'ABOUT',
              confidence: 1.0,
              sourceType: 'manual',
              createdBy: 'founder',
            },
          });
          resultEntityId = noteEntity.id;
        } else {
          resultEntityId = entityId;
        }
      }

      if (action === 'new_task') {
        const { title, dueDate, entityId } = triagePayload || {};
        if (!title) return res.status(400).json({ error: 'title required' });

        const task = await prisma.brainEntity.create({
          data: {
            entityType: 'Task',
            name: title,
            properties: { dueDate: dueDate || null, status: 'open' },
            status: 'active',
          },
        });

        if (entityId) {
          await prisma.brainAssertion.create({
            data: {
              srcId: task.id,
              dstId: entityId,
              relType: 'ASSIGNED_TO',
              confidence: 1.0,
              sourceType: 'manual',
              createdBy: 'founder',
            },
          });
        }
        resultEntityId = task.id;
      }

      await prisma.brainInboxItem.update({
        where: { id },
        data: { status: 'triaged', processedAt: new Date(), resultEntityId },
      });

      return res.json({ ok: true, action, resultEntityId });
    } catch (err) {
      logger?.error({ err }, 'brain: triage error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/tokens — generate static token (admin only)
  app.post('/api/brain/tokens', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { label, scopes = ['brain:write'] } = req.body || {};
      if (!label) return res.status(400).json({ error: 'label required' });

      const raw = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(raw);

      await prisma.brainApiToken.create({
        data: { label, tokenHash, scopes },
      });

      logger?.info({ label }, 'brain: api token created');
      // Raw token only shown once — store it now (e.g. in Drafts action)
      return res.status(201).json({ ok: true, token: raw, label, scopes });
    } catch (err) {
      logger?.error({ err }, 'brain: token create error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/tokens — list tokens (admin only, never shows raw value)
  app.get('/api/brain/tokens', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const tokens = await prisma.brainApiToken.findMany({
        select: { id: true, label: true, scopes: true, lastUsedAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ ok: true, tokens });
    } catch (err) {
      return res.status(500).json({ error: 'internal-error' });
    }
  });
}

module.exports = { registerInboxRoutes, hashToken };
