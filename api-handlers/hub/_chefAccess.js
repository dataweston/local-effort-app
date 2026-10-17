const { prisma } = require('../_lib/prisma');
const { verifySupabaseToken, isReadOnlyAdminEmail } = require('../weekly-order/_auth');
const { resolveHubViewer, requireHubAccess, isExplicitHubAdminEmail } = require('./_auth');
const { enforcePublicRateLimit } = require('./_publicRateLimit');

function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail(400, 'Unsupported chef workspace input');
  return value;
}
function text(value, max, label, required = true) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(400, `Invalid ${label}`);
  return value.trim();
}
function version(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail(400, 'Reload the current record before saving');
  return value;
}
function createChefAccess({ prismaClient = prisma, verifyToken = verifySupabaseToken, resolveReviewer = resolveHubViewer, rateLimit = enforcePublicRateLimit, requiredModels = [] } = {}) {
  const db = prismaClient;
  async function execute(req, res, methods, scope, run) {
    res.setHeader('Cache-Control', 'private, no-store');
    if (!methods.includes(req.method)) { res.setHeader('Allow', methods.join(', ')); return res.status(405).json({ error: 'Method not allowed' }); }
    try {
      if (!db || requiredModels.some(model => !db[model])) fail(503, 'Chef workspace storage is unavailable. Your changes were not saved.');
      if (!await rateLimit(req, res, { scope, limit: 120, windowMs: 10 * 60 * 1000, prismaClient: db })) return;
      return await run();
    } catch (error) {
      const conflict = ['P2002', 'P2034', 'P2025'].includes(error.code);
      if (!error.status && !conflict) console.error('[hub/chef-workspace]', error.code || error.name);
      return res.status(error.status || (conflict ? 409 : 503)).json({ error: error.status ? error.message : conflict ? 'This record changed. Reload before saving.' : 'Chef workspace storage is unavailable. Your changes were not saved.' });
    }
  }
  async function member(req, { active = false, tx = db } = {}) {
    const actor = await verifyToken(req);
    if (!actor?.id || !actor?.email || !actor.email_confirmed_at) fail(401, 'Sign in with a verified Google account.');
    if (req.method !== 'GET' && isReadOnlyAdminEmail(actor.email)) fail(403, 'Read-only admin access');
    const application = await tx.chefApplication.findUnique({ where: { supabaseUid: actor.id } });
    if (!application) fail(404, 'Submit a chef application first');
    const membership = await tx.chefMembership.findFirst({ where: { applicationId: application.id, ...(active ? { status: 'active' } : {}) }, orderBy: [{ offeredAt: 'desc' }, { id: 'desc' }], include: { policy: true } });
    if (active && (!membership || application.status === 'withdrawn')) fail(403, 'An active admitted chef membership is required');
    return { actor, application, membership };
  }
  async function owner(req, { write = req.method !== 'GET' } = {}) {
    const auth = await resolveReviewer({ ...req, headers: req.headers, query: {}, body: {} }, db);
    const denied = requireHubAccess(auth, { privileged: true });
    if (denied) fail(denied.status, denied.error);
    const actor = auth.supabaseUser;
    if (!actor?.id || !actor?.email) fail(401, 'Unauthorized');
    const canManage = !auth.isReadOnlyAdmin && !isReadOnlyAdminEmail(actor.email) && isExplicitHubAdminEmail(actor.email);
    if (write && !canManage) fail(403, 'Explicit configured owner authority is required');
    return { actor, canManage, auth };
  }
  return { execute, member, owner };
}
module.exports = { createChefAccess, fail, object, text, version };
