const crypto = require('crypto');
const { prisma } = require('../_lib/prisma');

const PUBLIC_RATE_LIMITS = Object.freeze({
  checkout: Object.freeze({ scope: 'hub-localist-checkout', limit: 8, windowMs: 10 * 60 * 1000 }),
  activity: Object.freeze({ scope: 'hub-localist-activity', limit: 180, windowMs: 60 * 1000 }),
  chat: Object.freeze({ scope: 'hub-localist-chat', limit: 12, windowMs: 5 * 60 * 1000 }),
});

function firstHeaderValue(value) {
  if (Array.isArray(value)) return value[0] || '';
  return String(value || '').split(',')[0].trim();
}

function getClientIp(req) {
  return firstHeaderValue(req?.headers?.['x-vercel-forwarded-for'])
    || firstHeaderValue(req?.headers?.['x-forwarded-for'])
    || firstHeaderValue(req?.headers?.['x-real-ip'])
    || String(req?.ip || req?.socket?.remoteAddress || req?.connection?.remoteAddress || 'unknown').trim();
}

function hashClientIp(req) {
  return crypto.createHash('sha256').update(getClientIp(req)).digest('hex');
}

async function consumePublicRateLimit({ req, scope, limit, windowMs, prismaClient = prisma, now = new Date() }) {
  const nowDate = now instanceof Date ? now : new Date(now);
  const nowMs = nowDate.getTime();
  const safeLimit = Math.max(1, Math.floor(Number(limit) || 0));
  const safeWindowMs = Math.max(1000, Math.floor(Number(windowMs) || 0));
  if (!scope || !Number.isFinite(nowMs) || !prismaClient?.hubPublicRateLimitBucket?.upsert) {
    return { allowed: false, unavailable: true, retryAfter: 1 };
  }

  const windowStartMs = Math.floor(nowMs / safeWindowMs) * safeWindowMs;
  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + safeWindowMs);
  const clientHash = hashClientIp(req);

  try {
    const bucket = await prismaClient.hubPublicRateLimitBucket.upsert({
      where: {
        scope_clientHash_windowStart: { scope, clientHash, windowStart },
      },
      create: {
        scope,
        clientHash,
        windowStart,
        expiresAt,
        count: 1,
      },
      update: {
        count: { increment: 1 },
        expiresAt,
      },
      select: { count: true },
    });
    if (bucket.count === 1 && prismaClient.hubPublicRateLimitBucket.deleteMany) {
      await prismaClient.hubPublicRateLimitBucket.deleteMany({
        where: { expiresAt: { lt: nowDate } },
      }).catch((cleanupError) => {
        console.warn(`[hub/rate-limit] ${scope} cleanup failed`, cleanupError?.message || cleanupError);
      });
    }
    const retryAfter = Math.max(1, Math.ceil((expiresAt.getTime() - nowMs) / 1000));
    return {
      allowed: bucket.count <= safeLimit,
      unavailable: false,
      limited: bucket.count > safeLimit,
      retryAfter,
      count: bucket.count,
    };
  } catch (error) {
    console.error(`[hub/rate-limit] ${scope} storage unavailable`, error?.message || error);
    return { allowed: false, unavailable: true, retryAfter: 1 };
  }
}

async function enforcePublicRateLimit(req, res, options) {
  const result = await consumePublicRateLimit({ req, ...options });
  if (result.allowed) return true;

  if (result.unavailable) {
    res.setHeader('Retry-After', String(result.retryAfter));
    res.status(503).json({ error: 'rate-limit-unavailable' });
    return false;
  }

  res.setHeader('Retry-After', String(result.retryAfter));
  res.status(429).json({ error: 'rate-limit-exceeded', retryAfter: result.retryAfter });
  return false;
}

module.exports = {
  PUBLIC_RATE_LIMITS,
  consumePublicRateLimit,
  enforcePublicRateLimit,
  getClientIp,
  hashClientIp,
};
