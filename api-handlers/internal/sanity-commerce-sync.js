const crypto = require('crypto');
const { prisma } = require('../_lib/prisma');
const { syncStorefrontCatalog } = require('../../backend/api/pricing/storefrontCatalogSync');

const attempts = new Map();
function equal(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function limited(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((at) => now - at < 60000);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > 6;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' });
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (limited(ip)) return res.status(429).json({ error: 'rate-limit-exceeded' });
  const expected = process.env.SANITY_COMMERCE_WEBHOOK_SECRET;
  const provided = req.headers['x-sanity-commerce-secret'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || !equal(provided, expected)) return res.status(401).json({ error: 'unauthorized' });
  if (!prisma) return res.status(503).json({ error: 'catalog-pricing-unavailable' });
  try {
    const summary = await syncStorefrontCatalog({ prisma, apply: true });
    return res.status(200).json({ ok: true, ...summary });
  } catch (error) {
    return res.status(error.code === 'catalog-validation-failed' ? 422 : 503).json({ error: error.code || 'catalog-sync-failed', details: error.errors || undefined });
  }
};
