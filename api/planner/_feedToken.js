const crypto = require('crypto');

const TOKEN_SCOPE = 'catherine';
const TOKEN_VERSION = 1;

function getFeedSecret() {
  return process.env.PLANNER_FEED_SECRET || '';
}

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createPlannerFeedToken({ uid, scope = TOKEN_SCOPE }) {
  const secret = getFeedSecret();
  if (!secret || !uid) return null;

  const payloadObj = {
    v: TOKEN_VERSION,
    uid: String(uid),
    scope: String(scope),
  };
  const payload = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const signature = signPayload(payload, secret);

  return `${payload}.${signature}`;
}

function verifyPlannerFeedToken(rawToken, expectedScope = TOKEN_SCOPE) {
  const secret = getFeedSecret();
  if (!secret || !rawToken || typeof rawToken !== 'string') return null;

  const parts = rawToken.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  const expectedSig = signPayload(payload, secret);
  const expectedBuf = Buffer.from(expectedSig);
  const providedBuf = Buffer.from(signature);
  if (expectedBuf.length !== providedBuf.length) return null;
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded?.v !== TOKEN_VERSION) return null;
    if (decoded?.scope !== expectedScope) return null;
    if (!decoded?.uid) return null;
    return { uid: decoded.uid, scope: decoded.scope };
  } catch (_err) {
    return null;
  }
}

module.exports = {
  TOKEN_SCOPE,
  createPlannerFeedToken,
  verifyPlannerFeedToken,
};
