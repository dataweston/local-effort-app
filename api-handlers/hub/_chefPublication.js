const { prisma } = require('../_lib/prisma');
const { getSanityClient } = require('../../backend/api/sanityClient');
const { createChefAccess, fail, object, text, version } = require('./_chefAccess');

const include = { application: true, membership: { include: { policy: true } }, events: { orderBy: { version: 'desc' } } };
const directoryQuery = '*[_id == "chef-cooperative-page" && _type == "chefCooperativePage"][0].directory{enabled,heading,body}';
async function publishedDirectory() { return getSanityClient().fetch(directoryQuery, {}, { perspective: 'published' }); }
function directorySettings(value) {
  if (!value?.enabled) return null;
  return { heading: text(value.heading, 200, 'directory heading'), body: text(value.body, 6000, 'directory explanation') };
}
function draftInput(value) {
  object(value, ['displayName', 'serviceArea', 'bio', 'services', 'photoUrl']);
  const draft = {};
  for (const [key, max] of Object.entries({ displayName: 120, serviceArea: 300, bio: 2000, services: 1500 })) draft[key] = text(value[key], max, `public ${key}`);
  draft.photoUrl = text(value.photoUrl ?? '', 2048, 'public photo URL', false);
  if (draft.photoUrl) {
    let url;
    try { url = new URL(draft.photoUrl); } catch { fail(400, 'Use a public HTTPS photo URL'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || /(^localhost$|\.local$|\.internal$|^[\d.]+$|:)/i.test(url.hostname)) fail(400, 'Use a public HTTPS photo URL without credentials, tokens or private network addresses');
    draft.photoUrl = url.href;
  }
  return draft;
}
function publicDto(row) {
  const { displayName, serviceArea, bio, services, photoUrl } = row.draft;
  return { slug: row.slug, displayName, serviceArea, bio, services, photoUrl };
}
function visible(row) {
  return row.membership.status === 'active' && row.application.status === 'reviewed' && row.application.publicationConsent && !row.removedAt && row.consentedAt && row.approvedAt && row.consentedVersion === row.draftVersion && row.approvedVersion === row.draftVersion && row.consentedApplicationVersion === row.application.version && row.consentedPolicyId === row.membership.policyId && row.membership.policy.snapshot.publicationEnabled === true && row.consentText === row.membership.policy.snapshot.publicationConsentText;
}
function privateDto(row, owner = false) {
  if (!row) return null;
  return { id: row.id, slug: row.slug, draft: row.draft, version: row.version, draftVersion: row.draftVersion, consentedVersion: row.consentedVersion, consentedAt: row.consentedAt, consentText: row.consentText, approvedVersion: row.approvedVersion, approvedAt: row.approvedAt, removedAt: row.removedAt, moderationReason: row.moderationReason, visible: Boolean(visible(row)), membershipStatus: row.membership.status, ...(owner ? { applicationId: row.applicationId, applicantName: row.application.name } : {}), history: row.events.map(({ id, version: eventVersion, action, createdAt, privateNote, actorUid }) => ({ id, version: eventVersion, action, createdAt, ...(owner ? { privateNote, actorUid } : {}) })) };
}
function createChefPublicationHandlers({ prismaClient = prisma, loadDirectory = publishedDirectory, now = () => new Date(), ...authOptions } = {}) {
  const db = prismaClient;
  const access = createChefAccess({ ...authOptions, prismaClient: db, requiredModels: ['chefPublicProfile', 'chefPublicProfileEvent', 'chefApplication', 'chefMembership'] });
  async function save(tx, row, data, actor, action, privateNote = '') {
    const next = row.version + 1;
    const updated = await tx.chefPublicProfile.updateMany({ where: { id: row.id, version: row.version }, data: { ...data, version: next } });
    if (updated.count !== 1) fail(409, 'The listing changed. Reload before saving.');
    const saved = await tx.chefPublicProfile.findUnique({ where: { id: row.id }, include });
    await tx.chefPublicProfileEvent.create({ data: { profileId: row.id, version: next, action, actorUid: actor.id, privateNote, snapshot: { draft: saved.draft, draftVersion: saved.draftVersion, consentedVersion: saved.consentedVersion, consentText: saved.consentText, approvedVersion: saved.approvedVersion, moderationReason: saved.moderationReason }, createdAt: now() } });
    return tx.chefPublicProfile.findUnique({ where: { id: row.id }, include });
  }
  const self = (req, res) => access.execute(req, res, ['GET', 'POST', 'PATCH'], 'chef-publication-self', async () => {
    object(req.query || {}, []);
    const viewer = await access.member(req);
    if (req.method === 'GET') {
      const row = await db.chefPublicProfile.findUnique({ where: { applicationId: viewer.application.id }, include });
      return res.json({ profile: privateDto(row), applicationConsent: viewer.application.publicationConsent, applicationReviewed: viewer.application.status === 'reviewed', policyId: viewer.membership?.policyId || null, publicationTerms: viewer.membership?.policy.snapshot.publicationEnabled ? viewer.membership.policy.snapshot.publicationConsentText : null, canSubmit: viewer.membership?.status === 'active' && viewer.application.status !== 'withdrawn' && viewer.membership.policy.snapshot.publicationEnabled === true });
    }
    const body = object(req.body, ['action', 'expectedVersion', 'expectedDraftVersion', 'draft', 'slug', 'accepted', 'policyId', 'website']);
    if (body.website !== undefined && (typeof body.website !== 'string' || body.website.trim())) fail(400, 'This listing update could not be accepted');
    if (!['save-draft', 'consent', 'remove'].includes(body.action)) fail(400, 'Choose a listing action');
    const result = await db.$transaction(async tx => {
      const { actor, application, membership } = await access.member(req, { active: body.action !== 'remove', tx });
      const row = await tx.chefPublicProfile.findUnique({ where: { applicationId: application.id }, include });
      if (body.expectedVersion !== (row?.version || 0)) fail(409, 'The listing changed. Reload before saving.');
      if (body.action === 'save-draft') {
        if (!membership.policy.snapshot.publicationEnabled) fail(409, 'Your adopted agreement does not enable directory publication');
        const draft = draftInput(body.draft);
        const slug = text(body.slug, 100, 'public URL identifier');
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(400, 'Use lowercase words, numbers and single hyphens for the public URL identifier');
        if (row) return save(tx, row, { draft, slug, draftVersion: row.draftVersion + 1, membershipId: membership.id, consentedVersion: null, consentedApplicationVersion: null, consentedPolicyId: null, consentedAt: null, consentText: null, approvedVersion: null, approvedAt: null, approvedByUid: null, removedAt: null, moderationReason: '' }, actor, 'save-draft');
        return tx.chefPublicProfile.create({ data: { applicationId: application.id, membershipId: membership.id, slug, draft, events: { create: { version: 1, action: 'save-draft', actorUid: actor.id, snapshot: { draft, draftVersion: 1 }, createdAt: now() } } }, include });
      }
      if (!row) fail(404, 'Save a separate public listing draft first');
      if (body.action === 'remove') return save(tx, row, { removedAt: now(), consentedVersion: null, consentedAt: null, approvedVersion: null, approvedAt: null, approvedByUid: null }, actor, 'withdraw-consent');
      if (row.membershipId !== membership.id || !membership.policy.snapshot.publicationEnabled || application.status !== 'reviewed' || !application.publicationConsent) fail(409, 'A reviewed application, its consideration consent, and an eligible adopted membership agreement are required');
      if (body.expectedDraftVersion !== row.draftVersion || body.policyId !== membership.policyId || body.accepted !== true) fail(400, 'Explicitly consent to this exact listing revision and agreement statement');
      return save(tx, row, { consentedVersion: row.draftVersion, consentedApplicationVersion: application.version, consentedPolicyId: membership.policyId, consentedAt: now(), consentText: membership.policy.snapshot.publicationConsentText, approvedVersion: null, approvedAt: null, approvedByUid: null, removedAt: null, moderationReason: '' }, actor, 'consent');
    }, { isolationLevel: 'Serializable' });
    return res.json({ profile: privateDto(result) });
  });
  const admin = (req, res) => access.execute(req, res, ['GET', 'PATCH'], 'chef-publication-admin', async () => {
    object(req.query || {}, ['cursor']);
    const { actor, canManage } = await access.owner(req);
    if (req.method === 'GET') {
      const cursor = req.query.cursor ? text(req.query.cursor, 100, 'cursor') : null;
      const rows = await db.chefPublicProfile.findMany({ orderBy: { id: 'asc' }, take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include });
      let directory = null;
      try { directory = directorySettings(await loadDirectory()); } catch { /* Approval below still fails closed; private records remain available. */ }
      return res.json({ profiles: rows.slice(0, 50).map(row => privateDto(row, true)), nextCursor: rows.length > 50 ? rows[49].id : null, canManage, directoryConfigured: Boolean(directory) });
    }
    const body = object(req.body, ['action', 'id', 'expectedVersion', 'expectedDraftVersion', 'confirmed', 'memberReason', 'privateNote']);
    if (body.confirmed !== true || !['approve', 'remove'].includes(body.action)) fail(400, 'Choose and explicitly confirm a moderation action');
    version(body.expectedVersion);
    const reason = text(body.memberReason, 2000, 'member-facing moderation explanation');
    const privateNote = text(body.privateNote ?? '', 3000, 'private moderation note', false);
    if (body.action === 'approve' && !directorySettings(await loadDirectory())) fail(409, 'Publish the approved CMS directory heading, explanation and enabled setting before approving a listing');
    const result = await db.$transaction(async tx => {
      const row = await tx.chefPublicProfile.findUnique({ where: { id: text(body.id, 100, 'listing') }, include });
      if (!row) fail(404, 'Listing not found');
      if (row.version !== body.expectedVersion || row.draftVersion !== body.expectedDraftVersion) fail(409, 'The listing changed. Review the exact current revision.');
      if (body.action === 'remove') return save(tx, row, { removedAt: now(), approvedVersion: null, approvedAt: null, approvedByUid: null, moderationReason: reason }, actor, 'owner-remove', privateNote);
      if (row.membership.status !== 'active' || row.application.status !== 'reviewed' || !row.application.publicationConsent || row.consentedApplicationVersion !== row.application.version || row.consentedVersion !== row.draftVersion || row.consentedPolicyId !== row.membership.policyId || !row.membership.policy.snapshot.publicationEnabled || row.consentText !== row.membership.policy.snapshot.publicationConsentText || !row.consentedAt || row.removedAt) fail(409, 'Current active membership and explicit consent to this exact application, listing and policy revision are required');
      draftInput(row.draft);
      return save(tx, row, { approvedVersion: row.draftVersion, approvedAt: now(), approvedByUid: actor.id, moderationReason: reason }, actor, 'approve', privateNote);
    }, { isolationLevel: 'Serializable' });
    return res.json({ profile: privateDto(result, true) });
  });
  const publicList = (req, res) => access.execute(req, res, ['GET'], 'chef-public-directory', async () => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    object(req.query || {}, ['cursor', 'slug']);
    const directory = directorySettings(await loadDirectory());
    if (!directory) return res.json({ directory: null, profiles: [], nextCursor: null });
    const cursor = req.query.cursor ? text(req.query.cursor, 100, 'cursor') : null;
    const slug = req.query.slug ? text(req.query.slug, 100, 'public identifier') : null;
    const rows = await db.chefPublicProfile.findMany({ where: { approvedAt: { not: null }, removedAt: null, membership: { status: 'active' }, application: { status: 'reviewed', publicationConsent: true }, ...(slug ? { slug } : {}) }, orderBy: { id: 'asc' }, take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, slug: true, draft: true, draftVersion: true, consentedVersion: true, consentedAt: true, consentText: true, consentedApplicationVersion: true, consentedPolicyId: true, approvedVersion: true, approvedAt: true, removedAt: true, membership: { select: { status: true, policyId: true, policy: { select: { snapshot: true } } } }, application: { select: { status: true, version: true, publicationConsent: true } } } });
    return res.json({ directory, profiles: rows.slice(0, 50).filter(visible).map(publicDto), nextCursor: rows.length > 50 ? rows[49].id : null });
  });
  return { self, admin, publicList };
}
module.exports = { createChefPublicationHandlers };
