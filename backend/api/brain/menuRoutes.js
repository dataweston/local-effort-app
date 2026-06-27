/**
 * Brain menu routes.
 *
 * POST /api/brain/menu                  — create a Menu entity (admin)
 * GET  /api/brain/menu                  — list Menu entities (admin)
 * GET  /api/brain/menu/:id              — get one Menu with dishes + constraints (admin)
 * POST /api/brain/menu/:id/broadcast    — constraint-check then publish (admin)
 * POST /api/brain/menu/:id/feedback     — customer feedback write-back (token-gated)
 * GET  /api/brain/portal/:shareToken    — public portal read (no auth)
 */

const crypto = require('crypto');
const { getPrisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { writeLedgerEvent, createInboxItem } = require('./ledger');

const verifyAdminRequest = createAdminVerifier();

function setPortalPrivacyHeaders(res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'private, no-store');
}

// ── Constraint check ──────────────────────────────────────────────────────────

/**
 * Check a customer's constraints against a list of dish names.
 * Returns { blocked: boolean, violations: Array<{severity, relType, constraint, dish}> }
 */
async function checkConstraints(prisma, customerId, dishNames) {
  const customer = await prisma.brainEntity.findFirst({
    where: {
      id: customerId,
      entityType: 'Customer',
      tombstonedAt: null,
    },
    include: {
      srcAssertions: {
        where: {
          relType: { in: ['PREFERS', 'AVOIDS', 'MEDICAL_CONSTRAINT'] },
          retractedAt: null,
          knownUntil: null,
          // Honor time-boxed corrections (e.g. "no legumes this month"): an
          // assertion with a validUntil in the past is expired and must not
          // block. validFrom is non-nullable (defaults to now) so a simple
          // lte guard keeps not-yet-in-effect assertions out.
          OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
          validFrom: { lte: new Date() },
        },
        include: {
          dst: { select: { id: true, name: true, entityType: true } },
        },
      },
    },
  });

  if (!customer) return { blocked: false, violations: [] };

  const violations = [];
  const dishNamesLower = dishNames.map(d => d.toLowerCase());

  for (const assertion of customer.srcAssertions) {
    const constraintName = (assertion.dst?.name || '').toLowerCase();
    const matchedDish = dishNamesLower.find(d => d.includes(constraintName) || constraintName.includes(d));
    if (!matchedDish) continue;

    const severity = assertion.metadata?.severity || (assertion.relType === 'MEDICAL_CONSTRAINT' ? 'medical' : 'preference');

    violations.push({
      severity,
      relType: assertion.relType,
      constraint: assertion.dst?.name,
      dish: dishNames[dishNamesLower.indexOf(matchedDish)],
      assertionId: assertion.id,
    });
  }

  const blocked = violations.some(v => v.severity === 'medical' || v.severity === 'avoid');
  return { blocked, violations };
}

// ── Route handlers ────────────────────────────────────────────────────────────

function registerMenuRoutes(app, { logger } = {}) {
  const prisma = getPrisma();

  async function saveMenuFeedback(menu, body = {}) {
    const { dishName, rating, notes, customerName } = body;
    if (!dishName || !rating) {
      return { status: 400, body: { error: 'dishName and rating required' } };
    }
    if (!['love', 'like', 'ok', 'dislike'].includes(rating)) {
      return { status: 400, body: { error: 'rating must be love|like|ok|dislike' } };
    }

    const cleanNotes = typeof notes === 'string' ? notes.trim().slice(0, 2000) : '';
    const cleanCustomerName = typeof customerName === 'string' ? customerName.trim().slice(0, 120) : '';

    const ledgerEvent = await writeLedgerEvent({
      eventType: 'menu.feedback',
      source: 'portal',
      actorType: 'customer',
      payload: {
        menuId: menu.id,
        menuName: menu.name,
        dishName,
        rating,
        notes: cleanNotes || null,
        customerName: cleanCustomerName || null,
      },
    });

    if (rating === 'dislike') {
      await createInboxItem({
        rawContent: `Menu feedback - ${cleanCustomerName || 'customer'} disliked "${dishName}" on menu "${menu.name}"${cleanNotes ? ': ' + cleanNotes : ''}`,
        source: 'portal',
      });
    }

    logger?.info({ menuId: menu.id, dishName, rating }, 'brain: menu feedback received');
    return { status: 200, body: { ok: true, ledgerEventId: ledgerEvent.id } };
  }

  // POST /api/brain/menu — create Menu entity
  app.post('/api/brain/menu', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { name, weekOf, dishes = [], customerIds = [], notes } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name required' });

      const shareToken = crypto.randomBytes(20).toString('hex');

      const entity = await prisma.brainEntity.create({
        data: {
          entityType: 'Menu',
          name,
          status: 'draft',
          shareToken,
          properties: {
            weekOf: weekOf || null,
            dishes,        // array of { name, description?, dishId? }
            customerIds,   // who this menu is for
            notes: notes || null,
            broadcastStatus: 'draft',
          },
        },
      });

      const ledgerEvent = await writeLedgerEvent({
        eventType: 'menu.created',
        source: 'admin_ux',
        actorType: 'founder',
        payload: { menuEntityId: entity.id, name, weekOf, dishCount: dishes.length },
      });

      logger?.info({ id: entity.id, name }, 'brain: menu created');
      return res.status(201).json({ ok: true, id: entity.id, shareToken });
    } catch (err) {
      logger?.error({ err }, 'brain: menu create error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/menu — list menus
  app.get('/api/brain/menu', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { status, limit = '20' } = req.query;
      const menus = await prisma.brainEntity.findMany({
        where: {
          entityType: 'Menu',
          tombstonedAt: null,
          ...(status ? { status } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit) || 20, 100),
        select: { id: true, name: true, status: true, shareToken: true, properties: true, createdAt: true },
      });
      return res.json({ ok: true, menus });
    } catch (err) {
      logger?.error({ err }, 'brain: menu list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/menu/:id — get menu with constraint preview
  app.get('/api/brain/menu/:id', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const menu = await prisma.brainEntity.findUnique({
        where: { id: req.params.id },
      });
      if (!menu || menu.entityType !== 'Menu') return res.status(404).json({ error: 'not found' });

      const dishes = menu.properties?.dishes || [];
      const dishNames = dishes.map(d => d.name || d);
      const customerIds = menu.properties?.customerIds || [];

      // Run constraint check for each customer
      const constraintSummary = [];
      for (const cid of customerIds) {
        const result = await checkConstraints(prisma, cid, dishNames);
        if (result.violations.length > 0) {
          const customer = await prisma.brainEntity.findUnique({ where: { id: cid }, select: { name: true } });
          constraintSummary.push({ customerId: cid, customerName: customer?.name, ...result });
        }
      }

      return res.json({ ok: true, menu, constraintSummary });
    } catch (err) {
      logger?.error({ err }, 'brain: menu get error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/menu/:id/broadcast — constraint-check then publish
  app.post('/api/brain/menu/:id/broadcast', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const menu = await prisma.brainEntity.findUnique({ where: { id: req.params.id } });
      if (!menu || menu.entityType !== 'Menu') return res.status(404).json({ error: 'not found' });

      const dishes = menu.properties?.dishes || [];
      const dishNames = dishes.map(d => d.name || d);
      const customerIds = menu.properties?.customerIds || [];
      const { override = false, overrideReason } = req.body || {};

      // Check all customer constraints
      const allViolations = [];
      for (const cid of customerIds) {
        const result = await checkConstraints(prisma, cid, dishNames);
        for (const v of result.violations) {
          allViolations.push({ customerId: cid, ...v });
        }
      }

      const medicalBlocks = allViolations.filter(v => v.severity === 'medical');
      const avoidBlocks = allViolations.filter(v => v.severity === 'avoid');

      // Medical: always blocks, no override
      if (medicalBlocks.length > 0) {
        return res.status(422).json({
          error: 'broadcast-blocked-medical',
          message: 'Medical constraints violated — cannot broadcast. Remove conflicting dishes or update constraints in admin UX.',
          violations: medicalBlocks,
        });
      }

      // Avoid: blocks unless founder explicitly overrides
      if (avoidBlocks.length > 0 && !override) {
        return res.status(422).json({
          error: 'broadcast-blocked-avoid',
          message: 'Avoid constraints violated. Pass { override: true, overrideReason } to proceed.',
          violations: avoidBlocks,
        });
      }

      // Log override if used
      if (avoidBlocks.length > 0 && override) {
        await writeLedgerEvent({
          eventType: 'menu.constraint_override',
          source: 'admin_ux',
          actorType: 'founder',
          payload: { menuId: menu.id, overrideReason: overrideReason || 'no reason given', violations: avoidBlocks },
        });
      }

      // Publish
      const updatedProps = {
        ...menu.properties,
        broadcastStatus: 'published',
        broadcastAt: new Date().toISOString(),
      };

      await prisma.brainEntity.update({
        where: { id: menu.id },
        data: { status: 'active', properties: updatedProps },
      });

      await writeLedgerEvent({
        eventType: 'menu.published',
        source: 'admin_ux',
        actorType: 'founder',
        payload: {
          menuId: menu.id,
          menuName: menu.name,
          shareToken: menu.shareToken,
          customerCount: customerIds.length,
          dishCount: dishes.length,
          overrideUsed: avoidBlocks.length > 0 && override,
        },
      });

      logger?.info({ menuId: menu.id }, 'brain: menu broadcast');
      return res.json({
        ok: true,
        shareToken: menu.shareToken,
        portalUrl: `/portal/${menu.shareToken}`,
        customerCount: customerIds.length,
        preferenceViolations: allViolations.filter(v => v.severity === 'preference'),
      });
    } catch (err) {
      logger?.error({ err }, 'brain: menu broadcast error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // POST /api/brain/menu/:id/feedback — customer feedback (token-gated via shareToken)
  app.post('/api/brain/menu/:id/feedback', async (req, res) => {
    try {
      setPortalPrivacyHeaders(res);
      const menu = await prisma.brainEntity.findUnique({ where: { id: req.params.id } });
      if (!menu || menu.entityType !== 'Menu') return res.status(404).json({ error: 'not found' });

      // Token must come via Authorization header (not query string — avoids log/referrer leakage)
      const authHeader = String(req.headers.authorization || '');
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      if (!token || token !== menu.shareToken) {
        return res.status(401).json({ error: 'invalid token' });
      }

      const { dishName, rating, notes, customerName } = req.body || {};
      if (!dishName || !rating) return res.status(400).json({ error: 'dishName and rating required' });
      if (!['love', 'like', 'ok', 'dislike'].includes(rating)) {
        return res.status(400).json({ error: 'rating must be love|like|ok|dislike' });
      }

      // Write ledger event — feedback is immutable
      const ledgerEvent = await writeLedgerEvent({
        eventType: 'menu.feedback',
        source: 'portal',
        actorType: 'customer',
        payload: {
          menuId: menu.id,
          menuName: menu.name,
          dishName,
          rating,
          notes: notes || null,
          customerName: customerName || null,
        },
      });

      // Queue for brain triage if negative
      if (rating === 'dislike') {
        await createInboxItem({
          rawContent: `Menu feedback — ${customerName || 'customer'} disliked "${dishName}" on menu "${menu.name}"${notes ? ': ' + notes : ''}`,
          source: 'portal',
        });
      }

      logger?.info({ menuId: menu.id, dishName, rating }, 'brain: menu feedback received');
      return res.json({ ok: true, ledgerEventId: ledgerEvent.id });
    } catch (err) {
      logger?.error({ err }, 'brain: menu feedback error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  // GET /api/brain/portal/:shareToken — public portal (no auth)
  app.post('/api/brain/portal/:shareToken/feedback', async (req, res) => {
    try {
      setPortalPrivacyHeaders(res);
      const menu = await prisma.brainEntity.findUnique({
        where: { shareToken: req.params.shareToken },
      });
      if (!menu || menu.entityType !== 'Menu' || menu.status !== 'active') {
        return res.status(404).json({ error: 'not found' });
      }

      const result = await saveMenuFeedback(menu, req.body || {});
      return res.status(result.status).json(result.body);
    } catch (err) {
      logger?.error({ err }, 'brain: portal feedback error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.get('/api/brain/portal/:shareToken', async (req, res) => {
    try {
      setPortalPrivacyHeaders(res);
      const menu = await prisma.brainEntity.findUnique({
        where: { shareToken: req.params.shareToken },
      });

      if (!menu || menu.entityType !== 'Menu') {
        return res.status(404).json({ error: 'not found' });
      }
      if (menu.status !== 'active') {
        return res.status(404).json({ error: 'menu not yet published' });
      }

      // Prior feedback for this menu, latest rating per dish, so a refreshed
      // portal page can re-hydrate submitted state instead of double-submitting.
      const feedbackEvents = await prisma.ledgerEvent.findMany({
        where: {
          eventType: 'menu.feedback',
          tombstonedAt: null,
          payload: { path: ['menuId'], equals: menu.id },
        },
        orderBy: { occurredAt: 'asc' },
        select: { payload: true },
        take: 500,
      });
      const feedbackByDish = new Map();
      for (const ev of feedbackEvents) {
        const p = ev.payload || {};
        if (!p.dishName) continue;
        feedbackByDish.set(p.dishName, {
          dishName: p.dishName,
          rating: p.rating,
          notes: p.notes || null,
          customerName: p.customerName || null,
        });
      }

      // Return safe public view — no internal IDs for customer list
      return res.json({
        ok: true,
        menu: {
          name: menu.name,
          weekOf: menu.properties?.weekOf,
          dishes: menu.properties?.dishes || [],
          notes: menu.properties?.notes,
          broadcastAt: menu.properties?.broadcastAt,
        },
        feedback: [...feedbackByDish.values()],
      });
    } catch (err) {
      logger?.error({ err }, 'brain: portal read error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });
}

module.exports = { registerMenuRoutes };
