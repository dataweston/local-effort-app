import { describe, expect, it, vi } from 'vitest';

import rateLimitModule from '../../api-handlers/hub/_publicRateLimit.js';

const { consumePublicRateLimit, hashClientIp } = rateLimitModule;

function sharedBucketModel() {
  const buckets = new Map();
  return {
    buckets,
    upsert: vi.fn(async ({ where, create, update }) => {
      const keyData = where.scope_clientHash_windowStart;
      const key = `${keyData.scope}:${keyData.clientHash}:${keyData.windowStart.toISOString()}`;
      const existing = buckets.get(key);
      if (!existing) {
        const created = { ...create };
        buckets.set(key, created);
        return { count: created.count };
      }
      existing.count += update.count.increment;
      existing.expiresAt = update.expiresAt;
      return { count: existing.count };
    }),
  };
}

function request(ip = '203.0.113.19') {
  return { headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` } };
}

describe('Hub public shared rate limiter', () => {
  it('atomically increments one shared bucket and blocks above its limit', async () => {
    const model = sharedBucketModel();
    const clients = [
      { hubPublicRateLimitBucket: model },
      { hubPublicRateLimitBucket: model },
    ];
    const attempts = await Promise.all(Array.from({ length: 6 }, (_, index) => consumePublicRateLimit({
      req: request(),
      scope: 'chat',
      limit: 5,
      windowMs: 60_000,
      now: new Date('2026-08-15T12:00:10.000Z'),
      prismaClient: clients[index % clients.length],
    })));

    expect(attempts.map((attempt) => attempt.count)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(attempts.map((attempt) => attempt.allowed)).toEqual([true, true, true, true, true, false]);
    expect(model.buckets.size).toBe(1);
    expect(model.upsert).toHaveBeenCalledTimes(6);
  });

  it('starts a new bucket after the fixed window and isolates scopes', async () => {
    const model = sharedBucketModel();
    const prismaClient = { hubPublicRateLimitBucket: model };
    const common = { req: request(), limit: 1, windowMs: 60_000, prismaClient };

    const first = await consumePublicRateLimit({ ...common, scope: 'chat', now: '2026-08-15T12:00:59.000Z' });
    const blocked = await consumePublicRateLimit({ ...common, scope: 'chat', now: '2026-08-15T12:00:59.500Z' });
    const otherScope = await consumePublicRateLimit({ ...common, scope: 'activity', now: '2026-08-15T12:00:59.500Z' });
    const reset = await consumePublicRateLimit({ ...common, scope: 'chat', now: '2026-08-15T12:01:00.000Z' });

    expect(first.allowed).toBe(true);
    expect(blocked).toMatchObject({ allowed: false, limited: true, retryAfter: 1 });
    expect(otherScope.allowed).toBe(true);
    expect(reset).toMatchObject({ allowed: true, count: 1 });
    expect(model.buckets.size).toBe(3);
  });

  it('stores only a SHA-256 client hash and fails closed when storage fails', async () => {
    const ip = '198.51.100.77';
    const model = sharedBucketModel();
    await consumePublicRateLimit({
      req: request(ip),
      scope: 'checkout',
      limit: 1,
      windowMs: 60_000,
      prismaClient: { hubPublicRateLimitBucket: model },
      now: '2026-08-15T12:00:00.000Z',
    });

    const persisted = model.upsert.mock.calls[0][0].create;
    expect(persisted.clientHash).toBe(hashClientIp(request(ip)));
    expect(persisted.clientHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(persisted)).not.toContain(ip);

    const failed = await consumePublicRateLimit({
      req: request(ip),
      scope: 'checkout',
      limit: 1,
      windowMs: 60_000,
      prismaClient: { hubPublicRateLimitBucket: { upsert: vi.fn().mockRejectedValue(new Error('offline')) } },
    });
    expect(failed).toMatchObject({ allowed: false, unavailable: true });
  });
});
