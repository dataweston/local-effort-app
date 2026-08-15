import { createRequire } from 'node:module';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  limitedScopes: new Set(),
  prisma: null,
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
mockCommonJs('../../api-handlers/hub/_publicRateLimit', {
  PUBLIC_RATE_LIMITS: {
    checkout: { scope: 'hub-localist-checkout', limit: 8, windowMs: 600_000 },
    activity: { scope: 'hub-localist-activity', limit: 180, windowMs: 60_000 },
    chat: { scope: 'hub-localist-chat', limit: 12, windowMs: 300_000 },
  },
  enforcePublicRateLimit: vi.fn(async (_req, res, config) => {
    if (!state.limitedScopes.has(config.scope)) return true;
    res.setHeader('Retry-After', '37');
    res.status(429).json({ error: 'rate-limit-exceeded', retryAfter: 37 });
    return false;
  }),
});
mockCommonJs('../../backend/api/sanityClient', {
  getSanityClient: vi.fn(() => null),
  getSanityReadClient: vi.fn(() => null),
});
mockCommonJs('../../api-handlers/hub/_auth', {
  resolveHubViewer: vi.fn(),
  requireHubAccess: vi.fn(),
});
mockCommonJs('../../api-handlers/hub/_localistOrderBrain', {
  writeOrderBrainRecords: vi.fn(),
});
mockCommonJs('square', {
  Client: vi.fn(function MockSquareClient() {
    return { checkoutApi: { createPaymentLink: vi.fn() } };
  }),
  Environment: { Sandbox: 'Sandbox', Production: 'Production' },
});

afterAll(() => {
  for (const id of freshModules) delete cjsRequire.cache[id];
  for (const [id, original] of originalModules) {
    if (original) cjsRequire.cache[id] = original;
    else delete cjsRequire.cache[id];
  }
});

function makePrisma() {
  const thread = {
    id: 'public-thread',
    singletonKey: 'hub-localist-public-chat',
    objectType: 'hub_localist',
    objectId: 'public-localist',
    visibility: 'public',
    title: 'Localist Chat',
  };
  return {
    objectThread: {
      upsert: vi.fn(async () => thread),
      update: vi.fn(async () => thread),
    },
    objectThreadMessage: {
      create: vi.fn(async ({ data }) => ({
        id: 'message-1',
        ...data,
        createdAt: new Date('2026-08-15T12:00:00.000Z'),
      })),
      findMany: vi.fn(async () => []),
    },
    ledgerEvent: { create: vi.fn(async () => ({})) },
  };
}

async function loadApps() {
  const checkoutHandler = loadFreshCommonJs('../../api-handlers/hub/localist-checkout');
  const activityHandler = loadFreshCommonJs('../../api-handlers/hub/localist-activity');
  const chatHandler = loadFreshCommonJs('../../api-handlers/hub/localist-chat');
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.all('/checkout', checkoutHandler);
  app.all('/activity', activityHandler);
  app.all('/chat', chatHandler);
  return app;
}

describe('Hub public mutation safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.limitedScopes.clear();
    state.prisma = makePrisma();
    delete process.env.SQUARE_ACCESS_TOKEN;
  });

  it.each([
    ['checkout', '/checkout', 'hub-localist-checkout'],
    ['activity', '/activity', 'hub-localist-activity'],
    ['anonymous chat', '/chat', 'hub-localist-chat'],
  ])('returns 429 with Retry-After when %s is limited', async (_name, path, scope) => {
    state.limitedScopes.add(scope);
    const app = await loadApps();

    const response = await request(app).post(path).send({});

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('37');
    expect(response.body).toEqual({ error: 'rate-limit-exceeded', retryAfter: 37 });
  });

  it.each([
    { imageUpload: { dataUrl: 'data:image/png;base64,aGVsbG8=', mimeType: 'image/png' } },
    { imageUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==' },
    { imageUrl: 'https://media.giphy.com/media/abc123/example.gif' },
  ])('rejects chat attachments without storing a message', async (media) => {
    const app = await loadApps();

    const response = await request(app).post('/chat').send({ senderName: 'Guest', body: '', ...media });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/text messages only/i);
    expect(state.prisma.objectThreadMessage.create).not.toHaveBeenCalled();
  });

  it('uses the unique singleton upsert when concurrent readers create the public chat', async () => {
    const app = await loadApps();

    const [first, second] = await Promise.all([
      request(app).get('/chat'),
      request(app).get('/chat'),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(state.prisma.objectThread.upsert).toHaveBeenCalledTimes(2);
    expect(state.prisma.objectThread.upsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { singletonKey: 'hub-localist-public-chat' },
      create: expect.objectContaining({ singletonKey: 'hub-localist-public-chat' }),
    }));
  });
});
