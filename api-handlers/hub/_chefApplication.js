const { prisma } = require('../_lib/prisma');
const { verifySupabaseToken, isReadOnlyAdminEmail } = require('../weekly-order/_auth');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { enforcePublicRateLimit } = require('./_publicRateLimit');

const ACKNOWLEDGMENT_VERSION = 'chef-application-2026-10-15';
const PUBLIC_CONSENT_VERSION = 'chef-public-draft-2026-10-15';
const STATUSES = ['pending', 'reviewed', 'needs-information', 'withdrawn'];
const fields = { name: 120, serviceArea: 300, experience: 3000, interests: 1500, availability: 1500, phone: 40 };
const workFields = { services: 2000, cuisines: 1000, training: 1500, equipment: 1500, travel: 1000 };
const publicFields = { bio: 2000, services: 1500, photoUrl: 2048 };

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function object(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, `${label} must be an object`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(400, `Unsupported ${label} field: ${key}`);
  return value;
}
const LABELS = {
  name: 'Your name', serviceArea: 'Where you can work', experience: 'Your experience', interests: 'What you are looking for', availability: 'Your availability', phone: 'Your phone number',
  'workProfile.services': 'Services', 'workProfile.cuisines': 'Cuisines and specialties', 'workProfile.training': 'Training', 'workProfile.equipment': 'Equipment', 'workProfile.travel': 'Travel range',
  'publicDraft.bio': 'Public biography', 'publicDraft.services': 'Public services', 'publicDraft.photoUrl': 'Photo link',
};
function text(value, max, label, required = false) {
  const name = LABELS[label] || label;
  if (typeof value !== 'string') fail(400, `${name} must be text`);
  const clean = value.trim();
  if (required && !clean) fail(400, `${name} is required`);
  if (clean.length > max) fail(400, `${name} is too long (limit ${max} characters)`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(clean)) fail(400, `${name} contains characters that cannot be saved`);
  return clean;
}
function nested(value, bounds, label) {
  const input = object(value || {}, Object.keys(bounds), label);
  return Object.fromEntries(Object.entries(bounds).map(([key, max]) => [key, text(input[key] ?? '', max, `${label}.${key}`)]));
}
function version(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail(400, 'expectedVersion must be a positive integer');
  return value;
}
function safePhoto(value) {
  if (!value) return '';
  let url;
  try { url = new URL(value); } catch { fail(400, 'Photo must be a public HTTPS URL'); }
  const host = url.hostname.toLowerCase();
  // No remote fetching or automatic preview. Exclude credentials and local/IP endpoints.
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !host.includes('.') || host.endsWith('.local') || host.endsWith('.localhost') || host.endsWith('.internal') || host.startsWith('[') || /^[\d.]+$/.test(host)) fail(400, 'Photo must be a public HTTPS URL');
  return url.href;
}
function applicantFields(body, { acknowledgmentRequired = false } = {}) {
  const result = {};
  for (const [key, max] of Object.entries(fields)) result[key] = text(body[key] ?? '', max, key, key !== 'phone');
  if (!['email', 'phone', 'either'].includes(body.contactPreference)) fail(400, 'Choose an email or phone contact preference');
  if (body.contactPreference !== 'email' && !result.phone) fail(400, 'Phone is required for this contact preference');
  if (result.phone && (!/^\+?[\d().\s-]+$/.test(result.phone) || !/^\d{7,15}$/.test(result.phone.replace(/\D/g, '')))) fail(400, 'Invalid phone number');
  result.contactPreference = body.contactPreference;
  result.workProfile = nested(body.workProfile, workFields, 'workProfile');
  result.publicDraft = nested(body.publicDraft, publicFields, 'publicDraft');
  result.publicDraft.photoUrl = safePhoto(result.publicDraft.photoUrl);
  if (typeof body.publicationConsent !== 'boolean') fail(400, 'publicationConsent must be true or false');
  result.publicationConsent = body.publicationConsent;
  if (acknowledgmentRequired && body.acknowledgment !== true) fail(400, 'Application acknowledgment is required');
  if (body.acknowledgment !== undefined && typeof body.acknowledgment !== 'boolean') fail(400, 'Invalid acknowledgment');
  return result;
}
const inputKeys = [...Object.keys(fields), 'contactPreference', 'workProfile', 'publicDraft', 'publicationConsent', 'acknowledgment', 'website'];
function consentData(data, current, now) {
  return {
    publicationConsentAt: data.publicationConsent ? (current?.publicationConsentAt || now) : null,
    publicationConsentVersion: data.publicationConsent ? PUBLIC_CONSENT_VERSION : null,
  };
}
function selfDto(row) {
  if (!row) return null;
  const { id, email, name, serviceArea, experience, interests, availability, phone, contactPreference, workProfile, publicDraft, publicationConsent, publicationConsentAt, publicationConsentVersion, acknowledgmentVersion, acknowledgedAt, status, applicantReason, version: revision, withdrawnAt, createdAt, updatedAt } = row;
  return { id, email, name, serviceArea, experience, interests, availability, phone, contactPreference, workProfile, publicDraft, publicationConsent, publicationConsentAt, publicationConsentVersion, acknowledgmentVersion, acknowledgedAt, status, applicantReason, version: revision, withdrawnAt, createdAt, updatedAt,
    history: (row.history || []).map(({ version: v, action, fromStatus, toStatus, applicantReason: reason, createdAt: at }) => ({ version: v, action, fromStatus, toStatus, applicantReason: reason, createdAt: at })),
  };
}
const includeHistory = { history: { orderBy: { version: 'desc' } } };
function audit(current, data, actor, action) {
  return { applicationId: current.id, version: data.version, action, fromStatus: current.status, toStatus: data.status || current.status, applicantReason: data.applicantReason ?? current.applicantReason, privateNote: data.privateNote || '', actorUid: actor.id, actorEmail: actor.email.toLowerCase() };
}
async function updateVersion(tx, current, data, actor, action, privateNote = '') {
  const changed = await tx.chefApplication.updateMany({ where: { id: current.id, version: current.version }, data });
  if (changed.count !== 1) fail(409, 'Application changed. Reload before saving.');
  await tx.chefApplicationHistory.create({ data: { ...audit(current, data, actor, action), privateNote } });
  return tx.chefApplication.findUnique({ where: { id: current.id }, include: includeHistory });
}
function createChefApplicationHandlers({ prismaClient = prisma, verifyToken = verifySupabaseToken, resolveReviewer = resolveHubViewer, rateLimit = enforcePublicRateLimit, now = () => new Date() } = {}) {
  const db = prismaClient;
  async function execute(req, res, methods, run) {
    res.setHeader('Cache-Control', 'private, no-store');
    if (!methods.includes(req.method)) { res.setHeader('Allow', methods.join(', ')); return res.status(405).json({ error: 'Method not allowed' }); }
    if (!db?.chefApplication || !db?.chefApplicationHistory) return res.status(503).json({ error: 'Chef application storage unavailable. Please try again later.' });
    try { return await run(); } catch (error) {
      if (!error.status) console.error('[hub/chef-application] storage failure', error.code || error.name);
      return res.status(error.status || 503).json({ error: error.status ? error.message : 'Chef application storage unavailable. Your changes were not saved; reload and try again.' });
    }
  }
  async function limit(req, res, scope, count = 30) {
    return rateLimit(req, res, { scope, limit: count, windowMs: 10 * 60 * 1000, prismaClient: db });
  }
  const self = (req, res) => execute(req, res, ['GET', 'POST', 'PATCH'], async () => {
    object(req.query || {}, [], 'query');
    const actor = await verifyToken(req);
    if (!actor?.id || !actor?.email || !actor.email_confirmed_at) return res.status(401).json({ error: 'Sign in with a verified Google account.' });
    if (req.method !== 'GET' && isReadOnlyAdminEmail(actor.email)) return res.status(403).json({ error: 'Read-only admin access' });
    if (!await limit(req, res, req.method === 'GET' ? 'chef-application-read' : 'chef-application-save', req.method === 'GET' ? 180 : 30)) return;
    if (req.method === 'GET') {
      const row = await db.chefApplication.findUnique({ where: { supabaseUid: actor.id }, include: includeHistory });
      return res.json({ application: selfDto(row) });
    }
    const body = object(req.body, [...inputKeys, 'action', 'expectedVersion'], 'application');
    if (body.website !== undefined && (typeof body.website !== 'string' || body.website.trim())) return res.status(400).json({ error: 'Application could not be accepted.' });
    if (req.method === 'POST') {
      object(body, inputKeys, 'application');
      const data = applicantFields(body, { acknowledgmentRequired: true });
      const create = () => db.$transaction(async (tx) => {
        const existing = await tx.chefApplication.findUnique({ where: { supabaseUid: actor.id }, include: includeHistory });
        if (existing) return existing;
        const email = actor.email.trim().toLowerCase();
        let user = await tx.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
        if (!user) user = await tx.user.create({ data: { email, role: 'member' } });
        const bound = await tx.chefApplication.findUnique({ where: { userId: user.id } });
        if (bound) fail(409, 'This account is already bound to another sign-in identity. Contact the owner.');
        const at = now();
        return tx.chefApplication.create({ data: { ...data, ...consentData(data, null, at), userId: user.id, supabaseUid: actor.id, email, acknowledgmentVersion: ACKNOWLEDGMENT_VERSION, acknowledgedAt: at,
          history: { create: { version: 1, action: 'apply', toStatus: 'pending', actorUid: actor.id, actorEmail: email } },
        }, include: includeHistory });
      });
      let row;
      try { row = await create(); } catch (error) { if (error.code !== 'P2002') throw error; row = await create(); }
      return res.json({ application: selfDto(row) });
    }
    const action = body.action || 'update';
    if (!['update', 'withdraw', 'reapply', 'resubmit'].includes(action)) fail(400, 'Unsupported application action');
    version(body.expectedVersion);
    if (action === 'withdraw') object(body, ['action', 'expectedVersion', 'website'], 'withdrawal');
    const row = await db.$transaction(async (tx) => {
      const current = await tx.chefApplication.findUnique({ where: { supabaseUid: actor.id } });
      if (!current) fail(404, 'Application not found');
      if (current.version !== body.expectedVersion) fail(409, 'Application changed. Reload before saving.');
      if (action === 'withdraw' && current.status === 'withdrawn') return tx.chefApplication.findUnique({ where: { id: current.id }, include: includeHistory });
      if (action === 'reapply' ? current.status !== 'withdrawn' : current.status === 'withdrawn') fail(409, 'Withdrawn applications must be reapplied before editing.');
      if (action === 'resubmit' && current.status !== 'needs-information') fail(409, 'Only an application needing information can be resubmitted.');
      const at = now();
      let data = { version: current.version + 1 };
      if (action === 'withdraw') data = { ...data, status: 'withdrawn', withdrawnAt: at, publicationConsent: false, publicationConsentAt: null, publicationConsentVersion: null };
      else {
        const editable = applicantFields(body, { acknowledgmentRequired: action === 'reapply' });
        data = { ...data, ...editable, ...consentData(editable, current, at) };
        if (action === 'reapply' || action === 'resubmit' || current.status === 'reviewed') data = { ...data, status: 'pending', applicantReason: '', withdrawnAt: null };
        if (action === 'reapply') data = { ...data, acknowledgmentVersion: ACKNOWLEDGMENT_VERSION, acknowledgedAt: at };
      }
      return updateVersion(tx, current, data, actor, action);
    });
    return res.json({ application: selfDto(row) });
  });
  const review = (req, res) => execute(req, res, ['GET', 'PATCH'], async () => {
    object(req.query || {}, ['id', 'status', 'cursor'], 'query');
    // Resolve using no caller-supplied household selectors; broad domain-admin rules are never used.
    const auth = await resolveReviewer({ ...req, method: req.method, headers: req.headers, query: {}, body: {} }, db);
    const denied = requireHubAccess(auth, { privileged: true });
    if (denied) return res.status(denied.status).json({ error: denied.error });
    if (!auth.supabaseUser?.id || !auth.supabaseUser?.email) return res.status(401).json({ error: 'Unauthorized' });
    if (req.method !== 'GET' && auth.isReadOnlyAdmin) return res.status(403).json({ error: 'Read-only admin access' });
    if (!await limit(req, res, 'chef-application-review', 180)) return;
    if (req.method === 'GET') {
      if (req.query?.id) {
        const id = text(req.query.id, 100, 'id', true);
        const row = await db.chefApplication.findUnique({ where: { id }, include: includeHistory });
        if (!row) fail(404, 'Application not found');
        return res.json({ application: { ...selfDto(row), history: row.history }, canReview: !auth.isReadOnlyAdmin });
      }
      const status = req.query?.status;
      if (status && !STATUSES.includes(status)) fail(400, 'Invalid status filter');
      const cursor = req.query?.cursor ? text(req.query.cursor, 100, 'cursor') : null;
      const rows = await db.chefApplication.findMany({ where: status ? { status } : {}, orderBy: { id: 'asc' }, take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, name: true, email: true, status: true, version: true, updatedAt: true } });
      return res.json({ applications: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].id : null, canReview: !auth.isReadOnlyAdmin });
    }
    const body = object(req.body, ['id', 'expectedVersion', 'status', 'applicantReason', 'privateNote'], 'review');
    const id = text(body.id, 100, 'id', true);
    version(body.expectedVersion);
    if (!['pending', 'reviewed', 'needs-information'].includes(body.status)) fail(400, 'Choose a review disposition, not membership approval');
    const applicantReason = text(body.applicantReason, 2000, 'applicantReason', body.status !== 'pending');
    const privateNote = text(body.privateNote ?? '', 3000, 'privateNote');
    const row = await db.$transaction(async (tx) => {
      const current = await tx.chefApplication.findUnique({ where: { id } });
      if (!current) fail(404, 'Application not found');
      if (current.version !== body.expectedVersion) fail(409, 'Application changed. Reload before reviewing.');
      if (current.status === 'withdrawn') fail(409, 'A withdrawn application cannot be reviewed.');
      return updateVersion(tx, current, { status: body.status, applicantReason, version: current.version + 1 }, auth.supabaseUser, 'review', privateNote);
    });
    return res.json({ application: { ...selfDto(row), history: row.history }, canReview: true });
  });
  return { self, review };
}
module.exports = { createChefApplicationHandlers };
