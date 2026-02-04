const crypto = require('crypto');
const express = require('express');
const { prisma } = require('../utils/prisma');
const { getSquareClient } = require('../../../api-handlers/_lib/squareClient');

const DEFAULT_DEPOSIT_PERCENT = 0.15;
const ESTIMATE_LIFESPAN_DAYS = 5;
const HOLD_WINDOW_HOURS = 24;

const SMALL_EVENT_CONFIG = {
  dinner: {
    label: 'Dinner party',
    baseRate: 95,
    minimumTotal: 850,
    staffingGuestsPer: 8,
    staffingHourly: 45,
    staffingHours: 4,
    rangeMin: 0.9,
    rangeMax: 1.2,
  },
  pizza: {
    label: 'Pizza Party',
    baseRate: 95,
    minimumTotal: 850,
    staffingGuestsPer: 8,
    staffingHourly: 45,
    staffingHours: 4,
    rangeMin: 0.9,
    rangeMax: 1.2,
  },
  weddings: {
    label: 'Weddings',
    baseRate: 140,
    minimumTotal: 3200,
    staffingGuestsPer: 12,
    staffingHourly: 55,
    staffingHours: 6,
    rangeMin: 0.92,
    rangeMax: 1.25,
  },
  holiday: {
    label: 'Small events',
    baseRate: 70,
    minimumTotal: 1200,
    staffingGuestsPer: 15,
    staffingHourly: 40,
    staffingHours: 4,
    rangeMin: 0.9,
    rangeMax: 1.18,
  },
};

const EVENT_TYPES = Object.keys(SMALL_EVENT_CONFIG);
const ADMIN_TOKEN = process.env.SMALL_EVENTS_ADMIN_TOKEN || process.env.EVENTS_ADMIN_TOKEN || '';

const normalizeString = (value, limit = 400) => {
  if (value == null) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.slice(0, limit);
};

const parseIntSafe = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const toMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, num);
};

const toCents = (value) => Math.round(toMoney(value) * 100);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addHours = (date, hours) => {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
};

const computeEstimate = (type, payload) => {
  const config = SMALL_EVENT_CONFIG[type];
  if (!config) return null;
  const guestCount = Math.max(0, parseIntSafe(payload.guestCount));
  const staffingCount = guestCount ? Math.max(1, Math.ceil(guestCount / config.staffingGuestsPer)) : 0;
  const staffingCost = staffingCount * config.staffingHourly * config.staffingHours;
  const foodCost = guestCount * config.baseRate;
  const subtotal = Math.max(foodCost + staffingCost, config.minimumTotal);
  const estimateMin = subtotal * config.rangeMin;
  const estimateMax = subtotal * config.rangeMax;

  const overridePercent = Number(payload.depositOverridePercent);
  const depositPercent = Number.isFinite(overridePercent) && overridePercent > 0
    ? overridePercent / 100
    : DEFAULT_DEPOSIT_PERCENT;
  const overrideAmount = Number(payload.depositOverrideAmount);
  const depositAmount = Number.isFinite(overrideAmount) && overrideAmount > 0
    ? overrideAmount
    : subtotal * depositPercent;

  return {
    guestCount,
    staffingCount,
    staffingCostCents: toCents(staffingCost),
    subtotalCents: toCents(subtotal),
    estimateMinCents: toCents(estimateMin),
    estimateMaxCents: toCents(estimateMax),
    depositPercent: Math.round(depositPercent * 100),
    depositAmountCents: toCents(depositAmount),
  };
};

const buildClaimToken = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return crypto.randomBytes(16).toString('hex');
};

const buildSessionToken = () => crypto.randomBytes(24).toString('hex');

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash) return false;
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
};

const extractBearerToken = (req) => {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1];
  return req.headers['x-session-token'] || '';
};

const hasAdminToken = (req) => {
  const token = req.headers['x-admin-token'] || '';
  return Boolean(ADMIN_TOKEN && token && token === ADMIN_TOKEN);
};

const getSession = async (req) => {
  const token = extractBearerToken(req);
  if (!token) return null;
  const session = await prisma.smallEventSession.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    await prisma.smallEventSession.delete({ where: { token } }).catch(() => {});
    return null;
  }
  return session;
};

const requireAdmin = async (req, res) => {
  if (hasAdminToken(req)) return { inform: 'token' };
  const session = await getSession(req);
  if (session?.user?.isAdmin) return session;
  res.status(403).json({ error: 'admin-required' });
  return null;
};

const ensurePrisma = (res) => {
  if (!prisma) {
    res.status(500).json({ error: 'database-unavailable' });
    return false;
  }
  return true;
};

const createSessionForUser = async (userId) => {
  const token = buildSessionToken();
  const expiresAt = addDays(new Date(), 30);
  await prisma.smallEventSession.create({
    data: { token, userId, expiresAt },
  });
  return token;
};

const resolveSiteUrl = () => {
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:5173';
};

const sanitizeEstimatePayload = (payload) => ({
  contactName: normalizeString(payload.contactName, 120) || null,
  contactEmail: normalizeString(payload.contactEmail, 160) || null,
  contactPhone: normalizeString(payload.contactPhone, 40) || null,
  guestCount: parseIntSafe(payload.guestCount) || null,
  eventDate: normalizeString(payload.eventDate, 40) || null,
  eventTime: normalizeString(payload.eventTime, 80) || null,
  alternateDates: normalizeString(payload.alternateDates, 200) || null,
  location: normalizeString(payload.location, 200) || null,
  serviceStyle: normalizeString(payload.serviceStyle, 80) || null,
  budgetRange: normalizeString(payload.budgetRange, 80) || null,
  menuNotes: normalizeString(payload.menuNotes, 600) || null,
  dietary: normalizeString(payload.dietary, 600) || null,
  rentals: normalizeString(payload.rentals, 600) || null,
  notes: normalizeString(payload.notes, 600) || null,
  courses: normalizeString(payload.courses, 40) || null,
  plannerInfo: normalizeString(payload.plannerInfo, 200) || null,
  celebrationType: normalizeString(payload.celebrationType, 200) || null,
  kitchenAccess: normalizeString(payload.kitchenAccess, 200) || null,
});

function createSmallEventsRouter({ logger } = {}) {
  const router = express.Router();

  router.get('/availability', async (req, res) => {
    if (!ensurePrisma(res)) return;
    try {
      const typeRaw = normalizeString(req.query.type, 40);
      const type = EVENT_TYPES.includes(typeRaw) ? typeRaw : null;
      const where = type ? { type } : {};
      const slots = await prisma.smallEventAvailability.findMany({
        where,
        orderBy: [{ date: 'asc' }, { type: 'asc' }],
      });
      const now = new Date();
      const holds = await prisma.smallEventHold.findMany({
        where: {
          OR: [
            { status: 'confirmed' },
            { status: 'held', holdUntil: { gt: now } },
          ],
        },
      });
      const holdsBySlot = new Map(holds.map((hold) => [hold.slotId, hold]));
      const decorated = slots.map((slot) => {
        const hold = holdsBySlot.get(slot.id);
        const status = hold ? hold.status : slot.status;
        return {
          id: slot.id,
          date: slot.date,
          type: slot.type,
          status,
          notes: slot.notes || '',
          source: slot.source,
          holdUntil: hold?.holdUntil || null,
          estimateId: hold?.estimateId || null,
        };
      });

      const holdPayload = holds.map((hold) => ({
        id: hold.id,
        slotId: hold.slotId,
        estimateId: hold.estimateId,
        status: hold.status,
        holdUntil: hold.holdUntil,
      }));

      return res.json({ slots: decorated, holds: holdPayload });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'small-events availability error');
      return res.status(500).json({ error: 'availability-load-failed' });
    }
  });

  router.post('/availability', async (req, res) => {
    if (!ensurePrisma(res)) return;
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const date = normalizeString(req.body?.date, 20);
      const statusRaw = normalizeString(req.body?.status, 20);
      const status = statusRaw === 'blocked' ? 'blocked' : 'open';
      const notes = normalizeString(req.body?.notes, 200) || null;
      const applyToAllTypes = Boolean(req.body?.applyToAllTypes);
      const typeRaw = normalizeString(req.body?.type, 40);
      const selectedType = EVENT_TYPES.includes(typeRaw) ? typeRaw : EVENT_TYPES[0];
      const targetTypes = applyToAllTypes ? EVENT_TYPES : [selectedType];

      if (!date) return res.status(400).json({ error: 'missing-date' });

      const updates = [];
      for (const targetType of targetTypes) {
        const slot = await prisma.smallEventAvailability.upsert({
          where: { date_type: { date, type: targetType } },
          update: { status, notes, source: 'manual' },
          create: { date, type: targetType, status, notes, source: 'manual' },
        });
        updates.push(slot);
      }

      return res.json({ ok: true, slots: updates });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'small-events availability update error');
      return res.status(500).json({ error: 'availability-update-failed' });
    }
  });

  router.post('/holds', async (req, res) => {
    if (!ensurePrisma(res)) return;
    try {
      const estimateId = normalizeString(req.body?.estimateId, 80);
      const slotId = normalizeString(req.body?.slotId, 80);
      if (!estimateId || !slotId) {
        return res.status(400).json({ error: 'missing-hold-fields' });
      }
      const estimate = await prisma.smallEventEstimate.findUnique({ where: { id: estimateId } });
      if (!estimate) return res.status(404).json({ error: 'estimate-not-found' });

      const slot = await prisma.smallEventAvailability.findUnique({ where: { id: slotId } });
      if (!slot) return res.status(404).json({ error: 'slot-not-found' });
      if (slot.status === 'blocked') return res.status(409).json({ error: 'slot-blocked' });

      const now = new Date();
      const activeHold = await prisma.smallEventHold.findFirst({
        where: {
          slotId,
          OR: [
            { status: 'confirmed' },
            { status: 'held', holdUntil: { gt: now } },
          ],
        },
      });
      if (activeHold && activeHold.estimateId !== estimateId) {
        return res.status(409).json({ error: 'slot-held' });
      }

      const holdUntil = addHours(new Date(), HOLD_WINDOW_HOURS);
      const hold = await prisma.smallEventHold.upsert({
        where: { estimateId },
        update: { slotId, status: 'held', holdUntil },
        create: { estimateId, slotId, status: 'held', holdUntil },
      });

      const updatedEstimate = await prisma.smallEventEstimate.update({
        where: { id: estimateId },
        data: { status: 'held' },
      });

      return res.json({ ok: true, hold, estimate: updatedEstimate });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'small-events hold error');
      return res.status(500).json({ error: 'hold-failed' });
    }
  });

  router.delete('/holds', async (req, res) => {
    if (!ensurePrisma(res)) return;
    try {
      const estimateId = normalizeString(req.query.estimateId, 80);
      if (!estimateId) return res.status(400).json({ error: 'missing-estimate-id' });

      await prisma.smallEventHold.updateMany({
        where: { estimateId },
        data: { status: 'released' },
      });

      const updatedEstimate = await prisma.smallEventEstimate.update({
        where: { id: estimateId },
        data: { status: 'draft' },
      });

      return res.json({ ok: true, estimate: updatedEstimate });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'small-events release hold error');
      return res.status(500).json({ error: 'release-failed' });
    }
  });

  router.post('/holds/cleanup', async (req, res) => {
    if (!ensurePrisma(res)) return;
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const now = new Date();
      const result = await prisma.smallEventHold.updateMany({
        where: { status: 'held', holdUntil: { lte: now } },
        data: { status: 'expired' },
      });
      return res.json({ ok: true, cleared: result.count });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'small-events cleanup error');
      return res.status(500).json({ error: 'cleanup-failed' });
    }
  });

  router.get('/estimates', async (req, res) => {
    if (!ensurePrisma(res)) return;
    try {
      const admin = hasAdminToken(req) || (await getSession(req))?.user?.isAdmin;
      const claimToken = normalizeString(req.query.claimToken, 80);
      const now = new Date();

      await prisma.smallEventEstimate.updateMany({
        where: {
          expiresAt: { lt: now },
          status: { in: ['draft', 'held'] },
        },
        data: { status: 'expired' },
      });

      if (claimToken) {
        const estimate = await prisma.smallEventEstimate.findUnique({
          where: { claimToken },
          include: { hold: { include: { slot: true } } },
        });
        if (!estimate) return res.status(404).json({ error: 'estimate-not-found' });
        return res.json({ estimate });
      }

      if (!admin) {
        const session = await getSession(req);
        if (!session?.user?.id) return res.status(401).json({ error: 'unauthorized' });
        const estimates = await prisma.smallEventEstimate.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: 'desc' },
          include: { hold: { include: { slot: true } } },
        });
        return res.json({ items: estimates });
      }

      const statusRaw = normalizeString(req.query.status, 40);
      const statusFilter = statusRaw && statusRaw !== 'all' ? statusRaw : null;
      const typeRaw = normalizeString(req.query.type, 40);
      const typeFilter = EVENT_TYPES.includes(typeRaw) ? typeRaw : null;

      const estimates = await prisma.smallEventEstimate.findMany({
        where: {
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(typeFilter ? { type: typeFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          hold: { include: { slot: true } },
          user: true,
        },
      });

      return res.json({ items: estimates });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'small-events estimates error');
      return res.status(500).json({ error: 'estimate-load-failed' });
    }
  });

  router.post('/estimates', async (req, res) => {
    if (!ensurePrisma(res)) return;
    try {
      const typeRaw = normalizeString(req.body?.type, 40);
      const type = EVENT_TYPES.includes(typeRaw) ? typeRaw : EVENT_TYPES[0];
      const estimateId = normalizeString(req.body?.estimateId, 80);
      const payload = sanitizeEstimatePayload(req.body || {});
      const computation = computeEstimate(type, req.body || {});
      if (!computation) return res.status(400).json({ error: 'invalid-type' });

      const now = new Date();
      const expiresAt = addDays(now, ESTIMATE_LIFESPAN_DAYS);
      const session = await getSession(req);

      let userId = session?.user?.id || null;
      const wantsAccount = Boolean(req.body?.wantsAccount);
      const accountEmail = normalizeString(req.body?.accountEmail, 160);
      const accountPassword = normalizeString(req.body?.accountPassword, 120);
      let sessionToken = null;

      if (wantsAccount && accountEmail && accountPassword) {
        const emailLower = accountEmail.toLowerCase();
        let user = await prisma.smallEventUser.findUnique({ where: { email: emailLower } });
        if (!user) {
          user = await prisma.smallEventUser.create({
            data: { email: emailLower, passwordHash: hashPassword(accountPassword) },
          });
        } else if (!verifyPassword(accountPassword, user.passwordHash)) {
          return res.status(401).json({ error: 'invalid-password' });
        }
        userId = user.id;
        sessionToken = await createSessionForUser(user.id);
        await prisma.smallEventEstimate.updateMany({
          where: { contactEmail: accountEmail, userId: null },
          data: { userId: user.id },
        });
      }

      const data = {
        type,
        ...payload,
        estimateMinCents: computation.estimateMinCents,
        estimateMaxCents: computation.estimateMaxCents,
        subtotalCents: computation.subtotalCents,
        depositPercent: computation.depositPercent,
        depositAmountCents: computation.depositAmountCents,
        lastEditedAt: now,
        expiresAt,
        ...(userId ? { userId } : {}),
      };

      let estimate = null;
      if (estimateId) {
        estimate = await prisma.smallEventEstimate.update({
          where: { id: estimateId },
          data,
        });
      } else {
        const claimToken = buildClaimToken();
        estimate = await prisma.smallEventEstimate.create({
          data: { ...data, claimToken },
        });
      }

      const hold = await prisma.smallEventHold.findUnique({ where: { estimateId: estimate.id } });

      return res.json({
        estimate: {
          ...estimate,
          staffingCount: computation.staffingCount,
          staffingCostCents: computation.staffingCostCents,
        },
        hold,
        sessionToken,
      });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'small-events estimate save error');
      return res.status(500).json({ error: 'estimate-save-failed' });
    }
  });

  router.post('/checkout', async (req, res) => {
    if (!ensurePrisma(res)) return;
    try {
      const estimateId = normalizeString(req.body?.estimateId, 80);
      if (!estimateId) return res.status(400).json({ error: 'missing-estimate-id' });
      const estimate = await prisma.smallEventEstimate.findUnique({
        where: { id: estimateId },
        include: { hold: true },
      });
      if (!estimate) return res.status(404).json({ error: 'estimate-not-found' });
      if (!estimate.depositAmountCents) return res.status(400).json({ error: 'deposit-missing' });
      if (!estimate.hold) return res.status(409).json({ error: 'hold-required' });
      if (estimate.hold.status !== 'confirmed' && estimate.hold.holdUntil && estimate.hold.holdUntil.getTime() < Date.now()) {
        return res.status(409).json({ error: 'hold-expired' });
      }

      const { client: squareClient, locationId } = getSquareClient();
      if (!squareClient) return res.status(500).json({ error: 'square-not-configured' });
      if (!locationId) return res.status(500).json({ error: 'square-location-missing' });

      const referenceId = `small-event:${estimate.id}`;
      const idempotencyKey = buildClaimToken();
      const response = await squareClient.checkoutApi.createPaymentLink({
        idempotencyKey,
        order: {
          locationId,
          referenceId,
          lineItems: [
            {
              name: `${SMALL_EVENT_CONFIG[estimate.type]?.label || 'Event'} deposit`,
              quantity: '1',
              basePriceMoney: {
                amount: estimate.depositAmountCents,
                currency: 'USD',
              },
            },
          ],
        },
        checkoutOptions: {
          redirectUrl: `${resolveSiteUrl()}/fullpage-demo?deposit=success&estimateId=${estimate.id}`,
          note: referenceId,
          prePopulateBuyerEmail: estimate.contactEmail || undefined,
        },
      });

      const paymentLink = response?.result?.paymentLink;
      const paymentLinkId = paymentLink?.id || null;
      const orderId = paymentLink?.orderId || paymentLink?.order_id || null;

      const paymentRecord = await prisma.smallEventPayment.create({
        data: {
          estimateId: estimate.id,
          amountCents: estimate.depositAmountCents,
          status: 'pending',
          squarePaymentLinkId: paymentLinkId,
          squareOrderId: orderId,
        },
      });

      await prisma.smallEventEstimate.update({
        where: { id: estimate.id },
        data: { depositStatus: 'pending' },
      });

      return res.json({ url: paymentLink?.url, payment: paymentRecord });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'small-events checkout error');
      return res.status(500).json({ error: 'checkout-failed' });
    }
  });

  return router;
}

module.exports = { createSmallEventsRouter };
