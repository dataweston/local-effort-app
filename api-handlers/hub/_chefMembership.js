const { prisma } = require('../_lib/prisma');
const { verifySupabaseToken, isReadOnlyAdminEmail } = require('../weekly-order/_auth');
const { resolveHubViewer } = require('./_auth');
const { enforcePublicRateLimit } = require('./_publicRateLimit');
const { getSanityClient } = require('../../backend/api/sanityClient');
const { createChefAccess, fail, object, text, version: expectedVersion } = require('./_chefAccess');

const POLICY_QUERY = '*[_id == "chef-membership-terms" && _type == "chefMembershipTerms"][0]{_rev,title,version,agreementText,acceptanceText,onboardingInstructions,secureOnboardingUrl,approvalReference,replyEmail,operationsEnabled,publicationEnabled,publicationConsentText,dues{amountCents,currency,billingText,refundText,cancellationText,waiverText}}';
const include = { policy: true, events: { orderBy: { version: 'desc' } }, application: { select: { id: true, name: true, email: true, status: true, version: true, supabaseUid: true } } };
function policySnapshot(record) {
  if (!record) fail(409, 'Publish final chef membership terms in Studio before adopting a policy');
  const snapshot = {};
  for (const [key, max] of Object.entries({ _rev: 200, title: 160, version: 80, agreementText: 40000, acceptanceText: 2000, onboardingInstructions: 5000, approvalReference: 500, replyEmail: 254 })) snapshot[key] = text(record[key], max, `membership terms ${key}`);
  if (snapshot.agreementText.length < 100 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(snapshot.replyEmail)) fail(409, 'Membership terms are incomplete');
  if (record.secureOnboardingUrl) {
    let url;
    try { url = new URL(text(record.secureOnboardingUrl, 2048, 'onboarding URL')); }
    catch { fail(409, 'Use a valid public HTTPS onboarding provider landing page'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !['app.squareup.com', 'squareup.com', 'payroll.squareup.com'].includes(url.hostname) || !/^\/(?:payroll|dashboard\/payroll|login)?\/?$/.test(url.pathname)) fail(409, 'Use an approved public Square payroll landing page, not a personal invitation or token-bearing URL');
    snapshot.secureOnboardingUrl = url.href;
  }
  if (record.operationsEnabled != null && typeof record.operationsEnabled !== 'boolean') fail(409, 'Choose whether the adopted policy enables chef operations');
  snapshot.operationsEnabled = record.operationsEnabled === true;
  if (record.publicationEnabled != null && typeof record.publicationEnabled !== 'boolean') fail(409, 'Choose whether separate moderated directory consent is available');
  snapshot.publicationEnabled = record.publicationEnabled === true;
  if (snapshot.publicationEnabled) snapshot.publicationConsentText = text(record.publicationConsentText, 8000, 'directory consent statement');
  if (record.dues) {
    object(record.dues, ['amountCents', 'currency', 'billingText', 'refundText', 'cancellationText', 'waiverText', '_type']);
    if (!Number.isSafeInteger(record.dues.amountCents) || record.dues.amountCents < 1 || record.dues.amountCents > 2147483647 || record.dues.currency !== 'USD') fail(409, 'Adopt a positive USD dues amount in integer cents');
    snapshot.dues = { amountCents: record.dues.amountCents, currency: 'USD' };
    for (const key of ['billingText', 'refundText', 'cancellationText', 'waiverText']) snapshot.dues[key] = text(record.dues[key], 8000, `dues ${key}`);
  }
  return snapshot;
}
function dto(row, privileged = false) {
  if (!row) return null;
  const { application, policy, events, ...member } = row;
  delete member.offeredByUid;
  delete member.orientationVerifiedByUid;
  delete member.onboardingVerifiedByUid;
  delete member.admittedByUid;
  return { ...member, applicant: privileged ? application : { name: application.name }, terms: policy.snapshot, policyRetiredAt: policy.retiredAt,
    history: events.map(({ privateNote, actorUid, ...event }) => privileged ? { ...event, privateNote, actorUid } : event) };
}
async function loadPublishedPolicy() { return getSanityClient().fetch(POLICY_QUERY, {}, { perspective: 'published' }); }

function createChefMembershipHandlers({ prismaClient = prisma, verifyToken = verifySupabaseToken, resolveReviewer = resolveHubViewer, rateLimit = enforcePublicRateLimit, loadPolicy = loadPublishedPolicy, now = () => new Date() } = {}) {
  const db = prismaClient;
  const access = createChefAccess({ prismaClient: db, verifyToken, resolveReviewer, rateLimit, requiredModels: ['chefMembership', 'chefMembershipPolicy', 'chefMembershipEvent'] });
  const { execute } = access;
  async function mutate(tx, row, data, actor, action, privateNote = '') {
    const next = row.version + 1;
    const updated = await tx.chefMembership.updateMany({ where: { id: row.id, version: row.version }, data: { ...data, version: next } });
    if (updated.count !== 1) fail(409, 'Membership changed. Reload before saving.');
    await tx.chefMembershipEvent.create({ data: { membershipId: row.id, version: next, action, fromStatus: row.status, toStatus: data.status || row.status, memberReason: data.memberReason ?? row.memberReason, privateNote, actorUid: actor.id, createdAt: now() } });
    return tx.chefMembership.findUnique({ where: { id: row.id }, include });
  }
  const self = (req, res) => execute(req, res, ['GET', 'PATCH'], 'chef-membership-self', async () => {
    object(req.query || {}, ['cursor']);
    const actor = await verifyToken(req);
    if (!actor?.id || !actor?.email || !actor.email_confirmed_at) fail(401, 'Sign in with a verified Google account.');
    if (req.method !== 'GET' && isReadOnlyAdminEmail(actor.email)) fail(403, 'Read-only admin access');
    const application = await db.chefApplication.findUnique({ where: { supabaseUid: actor.id } });
    if (!application) {
      if (req.method !== 'GET') fail(404, 'Submit an application before responding to membership');
      return res.json({ membership: null, agreements: [], nextCursor: null });
    }
    if (req.method === 'GET') {
      const current = await db.chefMembership.findFirst({ where: { applicationId: application.id }, orderBy: [{ offeredAt: 'desc' }, { id: 'desc' }], include });
      const cursor = req.query.cursor ? text(req.query.cursor, 100, 'cursor') : null;
      const rows = await db.chefMembership.findMany({ where: { applicationId: application.id, acceptedAt: { not: null }, ...(current ? { id: { not: current.id } } : {}) }, orderBy: { id: 'asc' }, take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include });
      return res.json({ membership: dto(current), agreements: rows.slice(0, 50).map(row => dto(row)), nextCursor: rows.length > 50 ? rows[49].id : null });
    }
    const body = object(req.body, ['action', 'id', 'expectedVersion', 'policyId', 'acceptedName', 'accepted', 'memberReason', 'website']);
    if (body.website !== undefined && (typeof body.website !== 'string' || body.website.trim())) fail(400, 'Membership update could not be accepted.');
    if (!['accept', 'decline', 'leave'].includes(body.action)) fail(400, 'Choose a membership response');
    expectedVersion(body.expectedVersion);
    const result = await db.$transaction(async (tx) => {
      const row = await tx.chefMembership.findFirst({ where: { applicationId: application.id }, orderBy: [{ offeredAt: 'desc' }, { id: 'desc' }], include });
      if (!row) fail(404, 'Membership offer not found');
      if (row.id !== body.id || row.version !== body.expectedVersion) fail(409, 'Membership changed. Reload before responding.');
      if (body.action === 'accept') {
        if (row.status !== 'offered' || row.policy.retiredAt || row.application.status !== 'reviewed') fail(409, 'This offer is not open for acceptance. Contact the owner.');
        if (body.policyId !== row.policyId || body.accepted !== true) fail(400, 'Read and explicitly accept the exact offered agreement');
        return mutate(tx, row, { status: 'accepted', acceptedName: text(body.acceptedName, 160, 'signature'), acceptedAt: now(), memberReason: '' }, actor, 'accept');
      }
      if (body.action === 'decline' ? !['offered', 'accepted'].includes(row.status) : row.status !== 'active') fail(409, 'This response is not available for the current membership status');
      return mutate(tx, row, { status: body.action === 'leave' ? 'resigned' : 'declined', endedAt: now(), memberReason: text(body.memberReason ?? '', 2000, 'response reason', false) }, actor, body.action);
    }, { isolationLevel: 'Serializable' });
    return res.json({ membership: dto(result) });
  });
  const admin = (req, res) => execute(req, res, ['GET', 'POST', 'PATCH'], 'chef-membership-admin', async () => {
    object(req.query || {}, ['applicationId', 'cursor']);
    const { actor, canManage } = await access.owner(req);
    if (req.method === 'GET') {
      const policies = await db.chefMembershipPolicy.findMany({ orderBy: { adoptedAt: 'desc' }, take: 30 });
      const cursor = req.query.cursor ? text(req.query.cursor, 100, 'cursor') : null;
      const rows = await db.chefMembership.findMany({ where: req.query.applicationId ? { applicationId: text(req.query.applicationId, 100, 'application') } : {}, orderBy: { id: 'asc' }, take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include });
      let publishedPolicy = null, policyError = null;
      try { publishedPolicy = policySnapshot(await loadPolicy()); } catch { policyError = 'Final CMS terms are missing, invalid, or unavailable. Existing signed terms remain unchanged.'; }
      return res.json({ policies, memberships: rows.slice(0, 50).map((row) => dto(row, true)), nextCursor: rows.length > 50 ? rows[49].id : null, publishedPolicy, policyError, canManage });
    }
    const body = object(req.body, ['action', 'id', 'applicationId', 'expectedVersion', 'expectedApplicationVersion', 'policyId', 'expectedCmsRevision', 'confirmed', 'memberReason', 'privateNote']);
    if (body.confirmed !== true) fail(400, 'Explicit owner confirmation is required');
    if (req.method === 'POST' && body.action === 'adopt-policy') {
      const snapshot = policySnapshot(await loadPolicy());
      if (snapshot._rev !== body.expectedCmsRevision) fail(409, 'Published terms changed. Read the current revision before adopting.');
      const policy = await db.chefMembershipPolicy.upsert({ where: { sourceRevision: snapshot._rev }, create: { sourceRevision: snapshot._rev, version: snapshot.version, snapshot, adoptedByUid: actor.id, adoptedAt: now() }, update: {} });
      return res.json({ policy });
    }
    if (req.method === 'POST' && body.action === 'offer') {
      expectedVersion(body.expectedApplicationVersion);
      const membership = await db.$transaction(async (tx) => {
        const application = await tx.chefApplication.findUnique({ where: { id: text(body.applicationId, 100, 'application') } });
        if (!application || application.status !== 'reviewed' || application.version !== body.expectedApplicationVersion) fail(409, 'Review the current application before offering membership');
        const policy = await tx.chefMembershipPolicy.findUnique({ where: { id: text(body.policyId, 100, 'policy') } });
        if (!policy || policy.retiredAt) fail(409, 'Choose an adopted, current membership policy');
        return tx.chefMembership.create({ data: { applicationId: application.id, policyId: policy.id, offeredByUid: actor.id, offeredAt: now(), memberReason: text(body.memberReason ?? '', 2000, 'member reason', false), events: { create: { version: 1, action: 'offer', toStatus: 'offered', actorUid: actor.id, createdAt: now() } } }, include });
      }, { isolationLevel: 'Serializable' });
      return res.json({ membership: dto(membership, true) });
    }
    if (req.method !== 'PATCH') fail(400, 'Choose adoption or a membership offer');
    if (body.action === 'retire-policy') {
      const policy = await db.chefMembershipPolicy.update({ where: { id: text(body.policyId, 100, 'policy') }, data: { retiredAt: now(), retiredByUid: actor.id } });
      return res.json({ policy });
    }
    if (!['verify-orientation', 'verify-onboarding', 'admit', 'revoke', 'cancel-offer'].includes(body.action)) fail(400, 'Unsupported membership action');
    expectedVersion(body.expectedVersion);
    const membership = await db.$transaction(async (tx) => {
      const row = await tx.chefMembership.findUnique({ where: { id: text(body.id, 100, 'membership') }, include });
      if (!row) fail(404, 'Membership not found');
      if (row.version !== body.expectedVersion) fail(409, 'Membership changed. Reload before saving.');
      const privateNote = text(body.privateNote ?? '', 3000, 'private verification note', ['verify-orientation', 'verify-onboarding', 'revoke'].includes(body.action));
      let data;
      if (body.action.startsWith('verify-')) {
        if (row.status !== 'accepted') fail(409, 'The member must accept the agreement before onboarding is verified');
        if (body.action === 'verify-onboarding' && !row.policy.snapshot.secureOnboardingUrl) fail(409, 'The adopted agreement must identify an approved secure onboarding provider before completion can be verified');
        data = body.action === 'verify-orientation' ? { orientationVerifiedAt: now(), orientationVerifiedByUid: actor.id } : { onboardingVerifiedAt: now(), onboardingVerifiedByUid: actor.id };
      } else if (body.action === 'admit') {
        if (row.status !== 'accepted' || row.policy.retiredAt || row.application.status !== 'reviewed' || !row.acceptedAt || !row.orientationVerifiedAt || !row.onboardingVerifiedAt) fail(409, 'Admission requires current reviewed application, accepted adopted terms, verified orientation, and verified secure onboarding');
        data = { status: 'active', admittedAt: now(), admittedByUid: actor.id, memberReason: text(body.memberReason, 2000, 'admission message') };
      } else {
        if (body.action === 'revoke' ? row.status !== 'active' : !['offered', 'accepted'].includes(row.status)) fail(409, 'This action is not available for the current membership status');
        data = { status: body.action === 'revoke' ? 'revoked' : 'cancelled', endedAt: now(), memberReason: text(body.memberReason, 2000, 'member-facing reason') };
      }
      return mutate(tx, row, data, actor, body.action, privateNote);
    }, { isolationLevel: 'Serializable' });
    return res.json({ membership: dto(membership, true) });
  });
  return { self, admin };
}
module.exports = { createChefMembershipHandlers };
