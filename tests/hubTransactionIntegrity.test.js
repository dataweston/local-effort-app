import { createRequire } from 'node:module';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  prisma: {},
  sanityClient: null,
}));

const cjsRequire = createRequire(import.meta.url);
const originalModules = new Map();
const freshModules = new Set();

function mockCommonJs(specifier, exports) {
  const id = cjsRequire.resolve(specifier);
  if (!originalModules.has(id)) originalModules.set(id, cjsRequire.cache[id]);
  cjsRequire.cache[id] = { id, filename: id, loaded: true, children: [], paths: [], exports };
}

function loadFreshCommonJs(specifier) {
  const id = cjsRequire.resolve(specifier);
  delete cjsRequire.cache[id];
  freshModules.add(id);
  return cjsRequire(id);
}

mockCommonJs('../api-handlers/_lib/prisma.js', { prisma: harness.prisma });
mockCommonJs('../api-handlers/hub/_auth.js', {
  resolveHubViewer: async (req) => req.testAuth,
  requireHubAccess: () => null,
});
mockCommonJs('../api-handlers/hub/_masterPlanner.js', { masterPlannerUid: () => 'master-planner' });
mockCommonJs('../api-handlers/hub/_publicRateLimit.js', {
  enforcePublicRateLimit: async () => true,
  PUBLIC_RATE_LIMITS: { activity: {} },
});
mockCommonJs('../backend/api/sanityClient.js', {
  getSanityClient: () => harness.sanityClient,
});

afterAll(() => {
  vi.unstubAllGlobals();
  for (const id of freshModules) delete cjsRequire.cache[id];
  for (const [id, original] of originalModules) {
    if (original) cjsRequire.cache[id] = original;
    else delete cjsRequire.cache[id];
  }
});

let markLocalistOrderPaidFromSquare;
let activityHandler;
let shiftsHandler;

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
  };
}

function auth(userId, displayName, isPrivileged = false) {
  return {
    viewer: { userId, email: `${userId}@example.com` },
    hubProfile: { userId, displayName },
    isPrivileged,
  };
}

beforeEach(() => {
  for (const key of Object.keys(harness.prisma)) delete harness.prisma[key];
  harness.sanityClient = null;
  vi.unstubAllGlobals();
  vi.stubGlobal('fetch', vi.fn());
  delete process.env.BREVO_API_KEY;
  vi.clearAllMocks();
  ({ markLocalistOrderPaidFromSquare } = loadFreshCommonJs('../api-handlers/hub/_localistOrderBrain.js'));
  activityHandler = loadFreshCommonJs('../api-handlers/hub/localist-activity.js');
  shiftsHandler = loadFreshCommonJs('../api-handlers/hub/shifts.js');
});

describe('Hub transaction integrity', () => {
  it('records checkout-success analytics without treating the browser redirect as payment evidence', async () => {
    const createEvent = vi.fn().mockResolvedValue({ id: 'analytics-event' });
    const updateOrder = vi.fn();
    const updateOrders = vi.fn();
    Object.assign(harness.prisma, {
      hubLocalistWindow: { findUnique: vi.fn().mockResolvedValue(null) },
      ledgerEvent: { create: createEvent },
      hubLocalistOrder: { update: updateOrder, updateMany: updateOrders },
    });
    const req = {
      method: 'POST',
      headers: {},
      body: {
        eventType: 'localist.checkout.success',
        sessionId: 'session-1',
        path: '/hub?localistOrder=order-1&orderId=square-order-1',
        metadata: { returnedFromSquare: true },
      },
    };
    const res = response();

    await activityHandler(req, res);

    expect(res.statusCode).toBe(204);
    expect(createEvent).toHaveBeenCalledOnce();
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ eventType: 'localist.checkout.success', source: 'hub_localist' }),
    }));
    expect(updateOrder).not.toHaveBeenCalled();
    expect(updateOrders).not.toHaveBeenCalled();
  });

  it('lets one duplicate Square delivery apply the paid transition and side effects', async () => {
    let order = {
      id: 'localist-order-1',
      status: 'checkout_created',
      customerName: 'Casey',
      customerEmail: null,
      customerPhone: null,
      pickupWindow: 'Friday',
      totalCents: 1800,
      totalQuantity: 2,
      items: [{ id: 'menu-item-1', name: 'Soup', quantity: 2, priceCents: 900 }],
      squareOrderId: 'square-order-1',
      squarePaymentId: null,
      paidAt: null,
      checkoutStartedAt: new Date('2026-08-14T12:00:00Z'),
    };
    const ledgerCreate = vi.fn().mockResolvedValue({ id: 'paid-ledger-event' });
    const inboxCreate = vi.fn().mockResolvedValue({ id: 'paid-inbox-item' });
    const orderUpdate = vi.fn(async ({ data }) => {
      order = { ...order, ...data };
      return { ...order };
    });
    const orderUpdateMany = vi.fn(async ({ where, data }) => {
      if (order.id !== where.id || order.status === 'paid') return { count: 0 };
      order = { ...order, ...data };
      return { count: 1 };
    });
    const orderFindUnique = vi.fn(async ({ where }) => {
      if (where.squareOrderId && where.squareOrderId !== order.squareOrderId) return null;
      if (where.id && where.id !== order.id) return null;
      return { ...order };
    });
    const commit = vi.fn().mockResolvedValue({});
    const set = vi.fn(() => ({ commit }));
    const patch = vi.fn(() => ({ set }));
    harness.sanityClient = {
      fetch: vi.fn().mockResolvedValue([{ _id: 'menu-item-1', inventoryCount: 8 }]),
      patch,
    };
    const orderPrisma = {
      hubLocalistOrder: {
        findUnique: orderFindUnique,
        updateMany: orderUpdateMany,
        update: orderUpdate,
      },
      ledgerEvent: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: ledgerCreate,
      },
      brainInboxItem: { create: inboxCreate },
    };
    const payment = {
      id: 'square-payment-1',
      order_id: 'square-order-1',
      status: 'COMPLETED',
      created_at: '2026-08-15T09:00:00Z',
    };

    const results = await Promise.all([
      markLocalistOrderPaidFromSquare(orderPrisma, payment),
      markLocalistOrderPaidFromSquare(orderPrisma, payment),
    ]);

    expect(results).toHaveLength(2);
    expect(order.status).toBe('paid');
    expect(order.squarePaymentId).toBe('square-payment-1');
    expect(orderUpdateMany).toHaveBeenCalledTimes(2);
    expect(harness.sanityClient.fetch).toHaveBeenCalledOnce();
    expect(patch).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith({ inventoryCount: 6 });
    expect(commit).toHaveBeenCalledOnce();
    expect(ledgerCreate).toHaveBeenCalledOnce();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(inboxCreate).toHaveBeenCalledOnce();
  });

  it('allows one concurrent shift claimant and returns 409 to the loser without another active claim', async () => {
    let card = {
      id: 'shift-1',
      supabaseUid: 'master-planner',
      title: 'Lunch shift',
      date: '2026-08-20',
      dayOfWeek: 'Thursday',
      startTime: '10:00',
      endTime: '14:00',
      objectType: 'shift',
      people: [],
      optional: true,
      status: 'open',
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    };
    const claims = [];
    const plannerCard = {
      findFirst: vi.fn(async () => ({ ...card, people: [...card.people] })),
      updateMany: vi.fn(async ({ where, data }) => {
        if (card.id !== where.id
          || card.status !== where.status
          || card.optional !== where.optional
          || JSON.stringify(card.people) !== JSON.stringify(where.people.equals)) return { count: 0 };
        card = { ...card, ...data };
        return { count: 1 };
      }),
      findUnique: vi.fn(async () => ({ ...card, people: [...card.people] })),
    };
    const hubShiftClaim = {
      findMany: vi.fn(async () => claims.map((claim) => ({ ...claim }))),
      upsert: vi.fn(async ({ create }) => {
        const claim = { id: `claim-${claims.length + 1}`, status: 'claimed', ...create };
        claims.push(claim);
        return { ...claim };
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    };
    Object.assign(harness.prisma, {
      plannerCard,
      hubShiftClaim,
      hubProfile: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: async (callback) => callback({ plannerCard, hubShiftClaim }),
    });
    const first = response();
    const second = response();

    await Promise.all([
      shiftsHandler({ method: 'POST', body: { action: 'claim', plannerCardId: card.id }, testAuth: auth('user-1', 'Alex') }, first),
      shiftsHandler({ method: 'POST', body: { action: 'claim', plannerCardId: card.id }, testAuth: auth('user-2', 'Blair') }, second),
    ]);

    expect([first.statusCode, second.statusCode].sort()).toEqual([200, 409]);
    expect(claims).toHaveLength(1);
    expect(claims.filter((claim) => claim.status === 'claimed')).toHaveLength(1);
    expect(card.status).toBe('claimed');
    expect(card.people).toHaveLength(1);
    expect(hubShiftClaim.upsert).toHaveBeenCalledOnce();
  });

  it('conditionally reviews a pending schedule request before creating its approved card', async () => {
    let scheduleRequest = {
      id: 'request-1',
      userId: 'staff-1',
      plannerCardId: null,
      requestType: 'time_off',
      requestedDate: '2026-08-25',
      requestedStartTime: '09:00',
      requestedEndTime: '12:00',
      note: 'Appointment',
      status: 'pending',
      reviewedAt: null,
      createdAt: new Date('2026-08-10T00:00:00Z'),
      updatedAt: new Date('2026-08-10T00:00:00Z'),
    };
    const createdCards = [];
    const hubScheduleRequest = {
      findFirst: vi.fn(async () => ({ ...scheduleRequest })),
      updateMany: vi.fn(async ({ where, data }) => {
        if (scheduleRequest.id !== where.id || scheduleRequest.status !== where.status) return { count: 0 };
        scheduleRequest = { ...scheduleRequest, ...data };
        return { count: 1 };
      }),
      findUnique: vi.fn(async () => ({ ...scheduleRequest })),
    };
    const plannerCard = {
      create: vi.fn(async ({ data }) => {
        const created = { id: `generated-${createdCards.length + 1}`, ...data };
        createdCards.push(created);
        return created;
      }),
      findFirst: vi.fn(),
      update: vi.fn(),
    };
    Object.assign(harness.prisma, {
      hubScheduleRequest,
      plannerCard,
      hubProfile: { findFirst: vi.fn().mockResolvedValue({ userId: 'staff-1', displayName: 'Casey' }) },
      $transaction: async (callback) => callback({ hubScheduleRequest, plannerCard }),
    });
    const first = response();
    const second = response();
    const request = () => ({
      method: 'POST',
      body: { action: 'reviewRequest', requestId: scheduleRequest.id, status: 'approved' },
      testAuth: auth('admin-1', 'Admin', true),
    });

    await Promise.all([
      shiftsHandler(request(), first),
      shiftsHandler(request(), second),
    ]);

    expect([first.statusCode, second.statusCode].sort()).toEqual([200, 409]);
    expect(scheduleRequest.status).toBe('approved');
    expect(createdCards).toHaveLength(1);
    expect(plannerCard.create).toHaveBeenCalledOnce();
  });

  it('does not let put-up reopen a shift after a concurrent claim wins', async () => {
    let card = {
      id: 'shift-2',
      supabaseUid: 'master-planner',
      title: 'Dinner shift',
      date: '2026-08-21',
      dayOfWeek: 'Friday',
      startTime: '14:00',
      endTime: '18:00',
      objectType: 'shift',
      people: ['Alex'],
      optional: true,
      status: 'open',
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    };
    let releaseReaders;
    const bothRead = new Promise((resolve) => { releaseReaders = resolve; });
    let readCount = 0;
    let releasePutUp;
    const claimCommitted = new Promise((resolve) => { releasePutUp = resolve; });
    const plannerCard = {
      findFirst: vi.fn(async () => {
        const snapshot = { ...card, people: [...card.people] };
        readCount += 1;
        if (readCount === 2) releaseReaders();
        await bothRead;
        return snapshot;
      }),
      updateMany: vi.fn(async ({ where, data }) => {
        if (data.status === 'open') await claimCommitted;
        const matches = card.id === where.id
          && card.status === where.status
          && card.optional === where.optional
          && JSON.stringify(card.people) === JSON.stringify(where.people.equals);
        if (!matches) return { count: 0 };
        card = { ...card, ...data };
        if (data.status === 'claimed') releasePutUp();
        return { count: 1 };
      }),
      findUnique: vi.fn(async () => ({ ...card, people: [...card.people] })),
    };
    const hubShiftClaim = {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(async ({ create, update }) => ({
        id: 'claim-winner',
        status: update.status || create.status || 'claimed',
        ...create,
      })),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    };
    Object.assign(harness.prisma, {
      plannerCard,
      hubShiftClaim,
      hubProfile: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: async (callback) => callback({ plannerCard, hubShiftClaim }),
    });
    const claimResponse = response();
    const putUpResponse = response();

    await Promise.all([
      shiftsHandler({
        method: 'POST',
        body: { action: 'claim', plannerCardId: card.id },
        testAuth: auth('user-2', 'Blair'),
      }, claimResponse),
      shiftsHandler({
        method: 'POST',
        body: { action: 'putUp', plannerCardId: card.id },
        testAuth: auth('user-1', 'Alex'),
      }, putUpResponse),
    ]);

    expect(claimResponse.statusCode).toBe(200);
    expect(putUpResponse.statusCode).toBe(409);
    expect(card.status).toBe('claimed');
    expect(card.optional).toBe(false);
    expect(card.people).toEqual(['Alex', 'Blair']);
    expect(hubShiftClaim.upsert).toHaveBeenCalledOnce();
  });

  it('does not let cancellation overwrite a concurrent approved request', async () => {
    let scheduleRequest = {
      id: 'request-2',
      userId: 'staff-1',
      plannerCardId: null,
      requestType: 'time_off',
      requestedDate: '2026-08-26',
      requestedStartTime: '09:00',
      requestedEndTime: '12:00',
      note: 'Appointment',
      status: 'pending',
      reviewedAt: null,
      createdAt: new Date('2026-08-10T00:00:00Z'),
      updatedAt: new Date('2026-08-10T00:00:00Z'),
    };
    let releaseReaders;
    const bothRead = new Promise((resolve) => { releaseReaders = resolve; });
    let readCount = 0;
    let releaseCancel;
    const reviewCommitted = new Promise((resolve) => { releaseCancel = resolve; });
    const hubScheduleRequest = {
      findFirst: vi.fn(async () => {
        const snapshot = { ...scheduleRequest };
        readCount += 1;
        if (readCount === 2) releaseReaders();
        await bothRead;
        return snapshot;
      }),
      updateMany: vi.fn(async ({ where, data }) => {
        if (data.status === 'canceled') await reviewCommitted;
        if (scheduleRequest.id !== where.id || scheduleRequest.status !== where.status) return { count: 0 };
        scheduleRequest = { ...scheduleRequest, ...data };
        if (data.status === 'approved') releaseCancel();
        return { count: 1 };
      }),
      findUnique: vi.fn(async () => ({ ...scheduleRequest })),
    };
    const plannerCard = {
      create: vi.fn(async ({ data }) => ({ id: 'generated-request-2', ...data })),
    };
    Object.assign(harness.prisma, {
      hubScheduleRequest,
      plannerCard,
      hubProfile: { findFirst: vi.fn().mockResolvedValue({ userId: 'staff-1', displayName: 'Casey' }) },
      $transaction: async (callback) => callback({ hubScheduleRequest, plannerCard }),
    });
    const reviewResponse = response();
    const cancelResponse = response();

    await Promise.all([
      shiftsHandler({
        method: 'POST',
        body: { action: 'reviewRequest', requestId: scheduleRequest.id, status: 'approved' },
        testAuth: auth('admin-1', 'Admin', true),
      }, reviewResponse),
      shiftsHandler({
        method: 'POST',
        body: { action: 'cancelRequest', requestId: scheduleRequest.id },
        testAuth: auth('staff-1', 'Casey'),
      }, cancelResponse),
    ]);

    expect(reviewResponse.statusCode).toBe(200);
    expect(cancelResponse.statusCode).toBe(409);
    expect(scheduleRequest.status).toBe('approved');
    expect(plannerCard.create).toHaveBeenCalledOnce();
  });
});
