import { createRequire } from 'node:module';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  prisma: null,
  supabase: null,
  square: { client: null, locationId: null },
  auth: null,
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

mockCommonJs('../../api-handlers/_lib/prisma', {
  get prisma() {
    return state.prisma;
  },
});
mockCommonJs('../../backend/api/supabaseClient', {
  getSupabase: () => state.supabase,
});
mockCommonJs('../../api-handlers/_lib/squareClient', {
  getSquareClient: () => state.square,
});
mockCommonJs('../../api-handlers/hub/_auth', {
  resolveHubViewer: async () => state.auth,
  requireHubAccess: () => null,
});

afterAll(() => {
  vi.unstubAllGlobals();
  for (const id of freshModules) delete cjsRequire.cache[id];
  for (const [id, original] of originalModules) {
    if (original) cjsRequire.cache[id] = original;
    else delete cjsRequire.cache[id];
  }
});

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({}),
  }));
  process.env.BREVO_API_KEY = 'test-only';
  process.env.PUBLIC_SITE_URL = 'https://example.test';
  delete process.env.SQUARE_LOCALIST_MONTHLY_PLAN_VARIATION_ID;
  delete process.env.SQUARE_LOCALIST_ANNUAL_PLAN_VARIATION_ID;
  state.prisma = null;
  state.supabase = null;
  state.square = { client: null, locationId: null };
  state.auth = null;
});
describe('Localist Square return state', () => {
  it('preserves the invite but treats query parameters as pending confirmation, never payment success', async () => {
    // Import after Vitest installs its Vite transform because this module is JSX.
    const { getLocalistReturnState } = await import('../../src/pages/LocalistPage.jsx');
    const returned = getLocalistReturnState('?joined=annual&invite=valid_invite_token_1234567890');

    expect(returned).toEqual({
      confirmationTier: 'annual',
      status: 'confirmation',
      membershipUrl: '/hub/membership?invite=valid_invite_token_1234567890',
    });
    expect(returned.status).not.toBe('success');
  });
});


describe('Localist signup Hub handoff', () => {
  it('reuses an unaccepted email-bound Localist invite for waived signup', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'invite-1', token: 'existing_localist_invite_token_123456' });
    const create = vi.fn();
    state.prisma = { hubInvite: { findFirst, create } };
    state.supabase = { from: () => ({ upsert: async () => ({ error: null }) }) };
    const handler = loadFreshCommonJs('../../api-handlers/localist/subscribe');
    const res = response();

    await handler({ method: 'POST', headers: {}, ip: 'waived-test', body: {
      phone: '6125550100', name: 'Ada Member', email: 'ADA@EXAMPLE.COM', tier: 'waived',
    } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.membershipUrl).toBe('https://example.test/hub/membership?invite=existing_localist_invite_token_123456');
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ accessLevel: 'localist', acceptedAt: null }) }));
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a cryptographically random Localist invite and carries it through Square redirect', async () => {
    const create = vi.fn().mockImplementation(async ({ data }) => ({ id: 'invite-2', ...data }));
    state.prisma = { hubInvite: { findFirst: vi.fn().mockResolvedValue(null), create } };
    state.supabase = { from: () => ({ upsert: async () => ({ error: null }) }) };
    const createPaymentLink = vi.fn().mockResolvedValue({ result: { paymentLink: { url: 'https://square.test/pay', orderId: 'order-1' } } });
    state.square = { locationId: 'location-1', client: {
      customersApi: {
        searchCustomers: vi.fn().mockResolvedValue({ result: { customers: [{ id: 'customer-1' }] } }),
        createCustomer: vi.fn(),
      },
      checkoutApi: { createPaymentLink },
    } };
    process.env.SQUARE_LOCALIST_MONTHLY_PLAN_VARIATION_ID = 'variation-1';
    const handler = loadFreshCommonJs('../../api-handlers/localist/subscribe');
    const res = response();

    await handler({ method: 'POST', headers: {}, ip: 'paid-test', body: {
      phone: '6125550101', name: 'Grace Member', email: 'grace@example.com', tier: 'monthly',
    } }, res);

    const inviteData = create.mock.calls[0][0].data;
    expect(inviteData.accessLevel).toBe('localist');
    expect(inviteData.email).toBe('grace@example.com');
    expect(inviteData.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const request = createPaymentLink.mock.calls[0][0];
    expect(request.checkoutOptions.redirectUrl).toBe(`https://example.test/localist?joined=monthly&invite=${inviteData.token}`);
    expect(res.body.checkoutUrl).toBe('https://square.test/pay');
    expect(res.body.membershipUrl).toContain(`invite=${inviteData.token}`);
  });

  it('withholds paid checkout when the durable membership roster write fails', async () => {
    state.prisma = {
      hubInvite: {
        findFirst: vi.fn().mockResolvedValue({ id: 'invite-3', token: 'existing_paid_invite_token_123456789' }),
        create: vi.fn(),
      },
    };
    state.supabase = {
      from: () => ({ upsert: async () => ({ error: { message: 'roster offline' } }) }),
    };
    state.square = {
      locationId: 'location-1',
      client: {
        customersApi: {
          searchCustomers: vi.fn().mockResolvedValue({ result: { customers: [{ id: 'customer-1' }] } }),
          createCustomer: vi.fn(),
        },
        checkoutApi: {
          createPaymentLink: vi.fn().mockResolvedValue({
            result: { paymentLink: { url: 'https://square.test/pay-unexposed', orderId: 'order-2' } },
          }),
        },
      },
    };
    process.env.SQUARE_LOCALIST_MONTHLY_PLAN_VARIATION_ID = 'variation-1';
    const handler = loadFreshCommonJs('../../api-handlers/localist/subscribe');
    const res = response();

    await handler({ method: 'POST', headers: {}, ip: 'roster-failure-test', body: {
      phone: '6125550102', name: 'Blocked Member', email: 'blocked@example.com', tier: 'monthly',
    } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'internal-error' });
    expect(res.body).not.toHaveProperty('checkoutUrl');
  });
});

describe('Square Localist membership activation', () => {
  it('matches the Square order, activates once, and records only supported identifiers', async () => {
    const member = { id: 'member-1', status: 'checkout_started', square_order_id: 'order-1', square_customer_id: null };
    const updates = [];
    state.supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ limit: async () => ({ data: [{ ...member }], error: null }) }) }),
        update: (changes) => ({ eq: async () => { updates.push(changes); Object.assign(member, changes); return { error: null }; } }),
      }),
    };
    const { markLocalistMembershipPaidFromSquare: activate } = loadFreshCommonJs('../../api-handlers/localist/membershipBilling');
    const payment = { id: 'payment-1', orderId: 'order-1', customerId: 'customer-1', status: 'COMPLETED' };

    expect(await activate(payment)).toMatchObject({ matched: true, updated: true });
    expect(await activate(payment)).toMatchObject({ matched: true, updated: false });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ status: 'active', square_customer_id: 'customer-1' });
    expect(updates[0]).not.toHaveProperty('square_payment_id');
    expect(updates[0]).not.toHaveProperty('square_subscription_id');
  });

  it('propagates a roster activation failure for webhook retry', async () => {
    state.supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ limit: async () => ({
          data: [{ id: 'member-2', status: 'checkout_started', square_order_id: 'order-2' }],
          error: null,
        }) }) }),
        update: () => ({ eq: async () => ({ error: { message: 'write unavailable' } }) }),
      }),
    };
    const { markLocalistMembershipPaidFromSquare: activate } = loadFreshCommonJs('../../api-handlers/localist/membershipBilling');

    await expect(activate({
      id: 'payment-2',
      orderId: 'order-2',
      customerId: 'customer-2',
      status: 'COMPLETED',
    })).rejects.toThrow(/write unavailable/i);
  });
});

describe('Hub membership read model', () => {
  it('uses uncapped aggregates while returning only recent purchases and ignores member support override', async () => {
    const aggregate = vi.fn()
      .mockResolvedValueOnce({ _sum: { totalCents: 125000 }, _count: { _all: 75 }, _max: { paidAt: new Date('2026-08-01') } })
      .mockResolvedValueOnce({ _sum: { totalCents: 25000 } });
    const findMany = vi.fn().mockResolvedValue(Array.from({ length: 12 }, (_, i) => ({ id: `order-${i}`, totalCents: 1000, paidAt: new Date('2026-08-01') })));
    state.prisma = {
      hubLocalistOrder: { aggregate, findMany },
      hubDocument: { findMany: vi.fn().mockResolvedValue([]) },
    };
    state.supabase = { from: () => ({ select: () => ({ ilike: (_key, email) => ({ order: () => ({ limit: async () => ({ data: [{ tier: 'monthly', status: 'active', created_at: '2026-01-01', email }], error: null }) }) }) }) }) };
    state.auth = { isStaff: false, viewer: { email: 'member@example.com' }, hubProfile: { email: 'member@example.com', accessLevel: 'localist', status: 'active' } };
    const handler = loadFreshCommonJs('../../api-handlers/hub/membership');
    const res = response();

    await handler({ method: 'GET', query: { email: 'other@example.com' } }, res);

    expect(res.statusCode).toBe(200);
    expect(aggregate.mock.calls[0][0].where.customerEmail.equals).toBe('member@example.com');
    expect(res.body.purchases).toMatchObject({ totalCents: 125000, orderCount: 75, quarterToDateCents: 25000 });
    expect(res.body.purchases.recent).toHaveLength(12);
    expect(findMany.mock.calls[0][0].take).toBe(12);
    expect(res.body).not.toHaveProperty('spending');
    expect(res.body.credit).not.toHaveProperty('balance');
    expect(res.body.credit.note).toContain('Accrued estimate only');
  });

  it('allows the support email override for staff', async () => {
    state.prisma = {
      hubLocalistOrder: { aggregate: vi.fn().mockResolvedValue({ _sum: { totalCents: 0 }, _count: { _all: 0 }, _max: { paidAt: null } }), findMany: vi.fn().mockResolvedValue([]) },
      hubDocument: { findMany: vi.fn().mockResolvedValue([]) },
    };
    state.supabase = null;
    state.auth = { isStaff: true, viewer: { email: 'staff@example.com' }, hubProfile: { email: 'staff@example.com', accessLevel: 'staff', status: 'active' } };
    const handler = loadFreshCommonJs('../../api-handlers/hub/membership');
    const res = response();

    await handler({ method: 'GET', query: { email: 'member@example.com' } }, res);

    expect(state.prisma.hubLocalistOrder.aggregate.mock.calls[0][0].where.customerEmail.equals).toBe('member@example.com');
  });
});
