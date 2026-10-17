const { prisma } = require('../_lib/prisma');
const { getSanityClient } = require('../../backend/api/sanityClient');
const { createChefAccess, fail, object, text, version } = require('./_chefAccess');

const TEMPLATE_QUERY = '*[_type == "chefEngagementTerms" && !(_id in path("drafts.**"))]{_id,_rev,title,version,kind,agreementText,acceptanceText,approvalReference,replyEmail}';
const models = ['chefWorkOpportunity', 'chefWorkOffer', 'chefWorkEvent', 'chefContribution', 'chefContributionRevision', 'chefContributionReview', 'chefCapitalClose', 'chefCapitalAllocation', 'chefCapitalSelection', 'chefEngagement', 'chefEngagementEvent'];
const opportunityInclude = { offers: { include: { membership: { include: { application: true } } } }, events: { orderBy: { createdAt: 'asc' } } };
const contributionInclude = { revisions: { orderBy: { revision: 'asc' } }, reviews: { orderBy: { createdAt: 'asc' } }, membership: { include: { application: true } }, allocation: true };
const engagementInclude = { events: { orderBy: { version: 'asc' } }, membership: { include: { application: true } } };
const closeInclude = { allocations: { orderBy: { membershipId: 'asc' } }, policy: true };
const centralCalendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' });
function integer(value, min, max, label) { if (!Number.isSafeInteger(value) || value < min || value > max) fail(400, `Invalid ${label}`); return value; }
function iso(value, label) {
  const input = text(value, 50, label);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(input) || !Number.isFinite(Date.parse(input))) fail(400, `${label} must be an ISO date/time with an explicit zone`);
  workDate(input.slice(0, 10));
  return new Date(input);
}
function workDate(value) {
  const input = text(value, 10, 'work date');
  const date = new Date(`${input}T12:00:00Z`);
  if (!/^\d{4}-\d\d-\d\d$/.test(input) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input) fail(400, 'Use an actual YYYY-MM-DD work date');
  return input;
}
function checkVersion(row, expected) { version(expected); if (!row) fail(404, 'Record not found'); if (row.version !== expected) fail(409, 'This record changed. Reload before saving.'); }
function enabled(policy) { if (!policy || policy.retiredAt || policy.snapshot?.operationsEnabled !== true) fail(409, 'An adopted current operations-enabled policy is required'); }
function active(row) {
  if (!row || row.status !== 'active' || !row.acceptedAt || row.application?.status === 'withdrawn') fail(409, 'An active membership with accepted terms is required');
  enabled(row.policy);
  return row;
}
function templateSnapshot(row) {
  if (!row) fail(409, 'Select published engagement terms');
  const result = {};
  for (const [key, max] of Object.entries({ _id: 200, _rev: 200, title: 160, version: 80, kind: 20, agreementText: 40000, acceptanceText: 2000, approvalReference: 1000, replyEmail: 254 })) result[key] = text(row[key], max, `template ${key}`);
  if (!['work', 'kitchen'].includes(result.kind) || result.agreementText.length < 100 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(result.replyEmail)) fail(409, 'Published engagement terms are incomplete');
  return result;
}
// Integer largest-remainder apportionment; ties are stable member IDs, not input order.
function apportion(total, weights) {
  const sum = weights.reduce((n, row) => n + BigInt(row.weight), 0n);
  if (!sum) fail(409, 'Approved positive contribution minutes are required');
  const rows = weights.map(row => { const product = BigInt(total) * BigInt(row.weight); return { ...row, cents: Number(product / sum), remainder: product % sum }; });
  let left = total - rows.reduce((n, row) => n + row.cents, 0);
  rows.sort((a, b) => a.remainder === b.remainder ? a.id.localeCompare(b.id, 'en') : a.remainder > b.remainder ? -1 : 1);
  for (const row of rows) if (left-- > 0) row.cents++;
  return rows;
}
function allocateCapital(poolCents, retentionBps, contributions) {
  integer(poolCents, 0, Number.MAX_SAFE_INTEGER, 'pool cents'); integer(retentionBps, 0, 10000, 'retention basis points');
  const seen = new Set(), groups = new Map();
  for (const row of contributions) {
    if (seen.has(row.id)) fail(409, 'A contribution cannot be selected twice'); seen.add(row.id);
    integer(row.verifiedMinutes, 1, 1440, 'verified minutes');
    const key = text(row.membershipId, 100, 'membership');
    groups.set(key, (groups.get(key) || 0) + row.verifiedMinutes);
  }
  const gross = apportion(poolCents, [...groups].map(([id, weight]) => ({ id, weight })));
  const retainedTotal = Number(BigInt(poolCents) * BigInt(retentionBps) / 10000n);
  // Split retention using the gross allocation as weights so no member retains more than their allocation.
  const retained = poolCents ? new Map(apportion(retainedTotal, gross.map(row => ({ id: row.id, weight: row.cents }))).map(row => [row.id, row.cents])) : new Map();
  return gross.sort((a, b) => a.id.localeCompare(b.id, 'en')).map(row => ({ membershipId: row.id, verifiedMinutes: row.weight, totalCents: row.cents, retainedCents: retained.get(row.id) || 0, cashPayableCents: row.cents - (retained.get(row.id) || 0) }));
}
function opportunityDto(row, applicationId, owner) {
  if (owner) return row;
  const ownRows = row.offers.filter(offer => offer.membership.applicationId === applicationId);
  const ids = new Set(ownRows.map(offer => offer.membershipId));
  const own = ownRows.map(({ id, version: revision, status, responseReason, respondedAt, createdAt }) => ({ id, version: revision, status, responseReason, respondedAt, createdAt }));
  return { id: row.id, version: row.version, kind: row.kind, title: row.title, scope: row.scope, startsAt: row.startsAt, endsAt: row.endsAt, timeZone: row.timeZone, compensation: row.compensation, engagementReference: row.engagementReference, suitability: row.suitability, allocationPolicyReference: row.allocationPolicyReference, policySnapshot: row.policySnapshot, responseDeadline: row.responseDeadline, status: row.status, assignedToYou: ids.has(row.assignedMembershipId), offers: own,
    history: row.events.filter(e => ids.has(e.membershipId) || ['post', 'cancel'].includes(e.action)).map(({ id, action, reason, createdAt }) => ({ id, action, reason, createdAt })) };
}
function contributionDto(row, owner) {
  if (owner) return row;
  const { membership, ...rest } = row;
  return { ...rest, reviews: row.reviews.map(({ actorUid, ...review }) => review) };
}
function engagementDto(row, owner) {
  if (owner) return row;
  const { membership, ownerUid, cancelledByUid, ...rest } = row;
  return { ...rest, events: row.events.map(({ actorUid, ...event }) => event) };
}
function createChefWorkHandlers({ prismaClient = prisma, loadTemplates = () => getSanityClient().fetch(TEMPLATE_QUERY, {}, { perspective: 'published' }), now = () => new Date(), ...auth } = {}) {
  const db = prismaClient, access = createChefAccess({ ...auth, prismaClient: db, requiredModels: models });
  const transaction = run => db.$transaction(run, { isolationLevel: 'Serializable' });
  async function membership(tx, id) { return active(await tx.chefMembership.findUnique({ where: { id }, include: { policy: true, application: true } })); }
  async function currentMember(tx, req) { const result = await access.member(req, { active: true, tx }); await membership(tx, result.membership.id); return result; }
  async function policy(tx, id) { const row = await tx.chefMembershipPolicy.findUnique({ where: { id: text(id, 100, 'adopted policy') } }); enabled(row); return row; }
  async function cas(tx, model, row, data) { const result = await tx[model].updateMany({ where: { id: row.id, version: row.version }, data: { ...data, version: row.version + 1 } }); if (result.count !== 1) fail(409, 'This record changed. Reload before saving.'); }
  async function event(tx, opportunityId, actor, action, reason, membershipId = null, clientChoiceEvidence = null) { return tx.chefWorkEvent.create({ data: { opportunityId, actorUid: actor.id, action, reason, membershipId, clientChoiceEvidence, createdAt: now() } }); }
  async function load(req, owner) {
    object(req.query || {}, ['section', 'cursor']);
    const section = req.query.section || 'opportunities';
    if (!['opportunities', 'contributions', 'closes', 'engagements'].includes(section)) fail(400, 'Choose a work section');
    const context = owner ? await access.owner(req) : await access.member(req);
    const identity = owner ? null : context.application.id;
    const cursor = req.query.cursor ? text(req.query.cursor, 100, 'cursor') : null;
    const paging = { orderBy: { id: 'asc' }, take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) };
    let rows;
    if (section === 'opportunities') rows = await db.chefWorkOpportunity.findMany({ ...paging, where: owner ? {} : { offers: { some: { membership: { applicationId: identity } } } }, include: opportunityInclude });
    if (section === 'contributions') rows = await db.chefContribution.findMany({ ...paging, where: owner ? {} : { applicationId: identity }, include: contributionInclude });
    if (section === 'engagements') rows = await db.chefEngagement.findMany({ ...paging, where: owner ? {} : { applicationId: identity }, include: engagementInclude });
    if (section === 'closes') rows = owner ? await db.chefCapitalClose.findMany({ ...paging, include: closeInclude }) : await db.chefCapitalAllocation.findMany({ ...paging, where: { membership: { applicationId: identity } }, include: { close: { select: { id: true, status: true, classReference: true, policyId: true, policySnapshot: true, periodStart: true, periodEnd: true, timeZone: true, poolCents: true, retentionBps: true, approvedAt: true, reason: true } } } });
    const nextCursor = rows.length > 50 ? rows[49].id : null;
    const items = rows.slice(0, 50).map(row => section === 'opportunities' ? opportunityDto(row, identity, owner) : section === 'contributions' ? contributionDto(row, owner) : section === 'engagements' ? engagementDto(row, owner) : row);
    let templates = [], templateError = null;
    if (owner && section === 'engagements') { try { templates = (await loadTemplates()).map(templateSnapshot); } catch { templateError = 'Published CMS templates are unavailable or incomplete. Existing agreements remain unchanged.'; } }
    const policies = owner ? await db.chefMembershipPolicy.findMany({ where: { retiredAt: null }, orderBy: { adoptedAt: 'desc' } }) : [];
    const memberships = owner ? await db.chefMembership.findMany({ where: { status: 'active' }, include: { application: { select: { id: true, name: true } }, policy: true }, orderBy: { id: 'asc' } }) : [];
    return { section, items, nextCursor, canManage: owner ? context.canManage : false, canParticipate: !owner && context.membership?.status === 'active' && !!context.membership.acceptedAt && context.membership.policy?.snapshot?.operationsEnabled === true && !context.membership.policy?.retiredAt && context.application.status !== 'withdrawn', templates, templateError, policies, memberships };
  }
  async function memberMutation(req) {
    const b = object(req.body, ['action', 'id', 'expectedVersion', 'reason', 'minutes', 'category', 'workDate', 'engagementId', 'compensationReference', 'evidenceReference', 'policyReference', 'correctsId', 'accepted', 'signedName', 'templateRevision']);
    return transaction(async tx => {
      const { actor, application, membership: member } = await currentMember(tx, req);
      if (['accept-offer', 'decline-offer'].includes(b.action)) {
        const offer = await tx.chefWorkOffer.findUnique({ where: { id: text(b.id, 100, 'offer') }, include: { opportunity: true } });
        checkVersion(offer, b.expectedVersion);
        if (offer.membershipId !== member.id) fail(404, 'Offer not found');
        const opportunity = offer.opportunity;
        if (offer.status !== 'offered' || opportunity.status !== 'open' || opportunity.responseDeadline <= now()) fail(409, 'This offer is no longer open for a response');
        if (opportunity.policyId !== member.policyId) fail(409, 'The offer requires the same accepted adopted policy');
        await policy(tx, opportunity.policyId);
        const reason = text(b.reason, 2000, 'response reason');
        await cas(tx, 'chefWorkOffer', offer, { status: b.action === 'accept-offer' ? 'accepted' : 'declined', responseReason: reason, respondedAt: now() });
        await event(tx, opportunity.id, actor, b.action, reason, member.id);
        return { saved: true };
      }
      if (['submit-contribution', 'revise-contribution'].includes(b.action)) {
        const date = workDate(b.workDate);
        const centralToday = centralCalendar.format(now());
        if (date > centralToday || (member.admittedAt && date < centralCalendar.format(member.admittedAt))) fail(400, 'Only actual post-admission work through today may be submitted');
        const engagement = await tx.chefEngagement.findUnique({ where: { id: text(b.engagementId, 100, 'engagement') } });
        if (!engagement || engagement.membershipId !== member.id || !engagement.signedAt) fail(409, 'Select your signed engagement; signing is not proof of completed work');
        if (date < centralCalendar.format(engagement.startsAt) || date > centralCalendar.format(engagement.endsAt)) fail(400, 'Actual work date must fall within the signed engagement Central calendar period');
        const facts = { minutes: integer(b.minutes, 1, 1440, 'actual minutes'), category: text(b.category, 160, 'contribution category'), workDate: date, engagementId: engagement.id, compensationReference: text(b.compensationReference, 1000, 'compensation reference'), evidenceReference: text(b.evidenceReference, 1000, 'evidence reference'), policyReference: text(b.policyReference, 1000, 'qualifying policy reference'), reason: text(b.reason, 2000, 'submission/correction reason') };
        let row;
        if (b.action === 'revise-contribution') {
          row = await tx.chefContribution.findUnique({ where: { id: text(b.id, 100, 'contribution') } }); checkVersion(row, b.expectedVersion);
          if (row.applicationId !== application.id) fail(404, 'Contribution not found');
          if (row.membershipId !== member.id || row.policyId !== member.policyId) fail(409, 'A revision must retain its original membership and accepted adopted policy');
          if (!['submitted', 'rejected'].includes(row.status)) fail(409, 'Approved records are immutable. Request an independent reversal and submit a linked correction.');
          await cas(tx, 'chefContribution', row, { status: 'submitted', currentRevision: row.currentRevision + 1 });
        } else {
          const correctsId = b.correctsId ? text(b.correctsId, 100, 'corrected contribution') : null;
          if (correctsId) { const original = await tx.chefContribution.findUnique({ where: { id: correctsId } }); if (!original || original.applicationId !== application.id || original.status !== 'reversed') fail(409, 'A correction must reference your independently reversed contribution'); }
          row = await tx.chefContribution.create({ data: { applicationId: application.id, membershipId: member.id, policyId: member.policyId, policySnapshot: member.policy.snapshot, correctsId, submittedByUid: actor.id, createdAt: now() } });
        }
        await tx.chefContributionRevision.create({ data: { ...facts, contributionId: row.id, revision: b.action === 'revise-contribution' ? row.currentRevision + 1 : 1, submittedByUid: actor.id, createdAt: now() } });
        return { saved: true };
      }
      if (b.action === 'sign-engagement') {
        const row = await tx.chefEngagement.findUnique({ where: { id: text(b.id, 100, 'agreement') } }); checkVersion(row, b.expectedVersion);
        if (row.membershipId !== member.id) fail(404, 'Agreement not found');
        if (row.status !== 'offered' || row.policyId !== member.policyId || !row.ownerConfirmedAt || row.endsAt <= now()) fail(409, 'Agreement is not open for signature');
        if (b.accepted !== true || b.templateRevision !== row.templateSnapshot._rev) fail(400, 'Explicitly accept the exact offered template and negotiated facts');
        const signedName = text(b.signedName, 160, 'signature');
        await cas(tx, 'chefEngagement', row, { status: 'accepted', signedName, signedAt: now(), signedByUid: actor.id });
        await tx.chefEngagementEvent.create({ data: { engagementId: row.id, version: row.version + 1, action: 'sign', reason: 'Member accepted the exact offered template and negotiated facts', actorUid: actor.id, createdAt: now() } });
        return { saved: true };
      }
      fail(400, 'Unsupported member work action');
    });
  }
  async function ownerMutation(req) {
    const { actor } = await access.owner(req);
    const raw = req.body;
    if (!raw || raw.confirmed !== true) fail(400, 'Explicit owner confirmation is required');
    const common = ['action', 'confirmed', 'reason'];
    const fields = {
      'post-opportunity': ['policyId', 'kind', 'title', 'scope', 'startsAt', 'endsAt', 'responseDeadline', 'timeZone', 'compensation', 'engagementReference', 'suitability', 'allocationPolicyReference'],
      'offer-opportunity': ['id', 'expectedVersion', 'membershipId', 'eligibilityEvidence', 'orderingEvidence'],
      'assign-opportunity': ['id', 'expectedVersion', 'membershipId', 'clientChoiceEvidence'],
      'cancel-opportunity': ['id', 'expectedVersion'],
      'review-contribution': ['id', 'expectedVersion', 'revision', 'decision', 'verifiedMinutes', 'policyReference', 'evidenceReference'],
      'reverse-contribution': ['id', 'expectedVersion', 'evidenceReference'],
      'prepare-close': ['policyId', 'classReference', 'periodStart', 'periodEnd', 'timeZone', 'poolCents', 'retentionBps', 'accountantEvidence', 'authorityEvidence', 'contributionIds'],
      'approve-close': ['id', 'expectedVersion'], 'cancel-close': ['id', 'expectedVersion'],
      'offer-engagement': ['membershipId', 'templateId', 'templateRevision', 'startsAt', 'endsAt', 'timeZone', 'scope', 'compensation', 'facility', 'schedule', 'safetyInsurance', 'cancellationTerms', 'authorityReference'],
      'cancel-engagement': ['id', 'expectedVersion'],
    };
    if (!fields[raw.action]) fail(400, 'Unsupported owner work action');
    const b = object(raw, [...common, ...fields[raw.action]]), reason = text(b.reason, 3000, 'decision reason');
    let template;
    if (b.action === 'offer-engagement') {
      const templates = await loadTemplates(); template = templateSnapshot(templates.find(row => row._id === b.templateId));
      if (template._rev !== b.templateRevision) fail(409, 'CMS template changed. Read the current published revision.');
    }
    return transaction(async tx => {
      if (b.action === 'post-opportunity') {
        const adopted = await policy(tx, b.policyId);
        if (!['referral', 'prep'].includes(b.kind)) fail(400, 'Choose referral or prep');
        const startsAt = iso(b.startsAt, 'start'), endsAt = iso(b.endsAt, 'end'), responseDeadline = iso(b.responseDeadline, 'response deadline');
        if (startsAt <= now() || endsAt <= startsAt || responseDeadline <= now() || responseDeadline > startsAt) fail(400, 'Response deadline must precede future work and end must follow start');
        if (b.timeZone !== 'America/Chicago') fail(400, 'Use America/Chicago for Central operating times');
        const row = await tx.chefWorkOpportunity.create({ data: { policyId: adopted.id, policySnapshot: adopted.snapshot, kind: b.kind, title: text(b.title, 160, 'title'), scope: text(b.scope, 5000, 'actual scope'), startsAt, endsAt, responseDeadline, timeZone: b.timeZone, compensation: text(b.compensation, 3000, 'explicit compensation'), engagementReference: text(b.engagementReference, 1000, 'engagement reference'), suitability: text(b.suitability, 3000, 'suitability'), allocationPolicyReference: text(b.allocationPolicyReference, 1000, 'member-first ordering policy'), createdByUid: actor.id, createdAt: now() } });
        await event(tx, row.id, actor, 'post', reason); return { id: row.id };
      }
      if (['offer-opportunity', 'assign-opportunity', 'cancel-opportunity'].includes(b.action)) {
        const row = await tx.chefWorkOpportunity.findUnique({ where: { id: text(b.id, 100, 'opportunity') }, include: opportunityInclude }); checkVersion(row, b.expectedVersion);
        if (row.status === 'cancelled') fail(409, 'Opportunity is cancelled');
        if (b.action === 'cancel-opportunity') { await cas(tx, 'chefWorkOpportunity', row, { status: 'cancelled' }); await event(tx, row.id, actor, 'cancel', reason); return { saved: true }; }
        await policy(tx, row.policyId);
        const member = await membership(tx, text(b.membershipId, 100, 'membership'));
        if (member.policyId !== row.policyId) fail(409, 'The member must accept this exact adopted policy');
        if (b.action === 'offer-opportunity') {
          if (row.status !== 'open' || row.responseDeadline <= now()) fail(409, 'Opportunity response window has closed');
          await cas(tx, 'chefWorkOpportunity', row, {});
          await tx.chefWorkOffer.create({ data: { opportunityId: row.id, membershipId: member.id, eligibilityEvidence: text(b.eligibilityEvidence, 3000, 'eligibility/availability evidence'), orderingEvidence: text(b.orderingEvidence, 3000, 'member-first ordering evidence'), offeredByUid: actor.id, createdAt: now() } });
          await event(tx, row.id, actor, 'offer', reason, member.id);
        } else {
          const offer = row.offers.find(o => o.membershipId === member.id);
          if (!offer || offer.status !== 'accepted' || row.startsAt <= now()) fail(409, 'Assignment requires an accepted private offer before work begins');
          if (row.assignedMembershipId === member.id) fail(409, 'This member is already assigned');
          const evidence = text(b.clientChoiceEvidence, 3000, 'independent assignment/client choice evidence');
          await cas(tx, 'chefWorkOpportunity', row, { status: 'assigned', assignedMembershipId: member.id, assignmentReason: reason, clientChoiceEvidence: evidence, assignedByUid: actor.id, assignedAt: now() });
          await event(tx, row.id, actor, 'assign', reason, member.id, evidence);
        }
        return { saved: true };
      }
      if (['review-contribution', 'reverse-contribution'].includes(b.action)) {
        const row = await tx.chefContribution.findUnique({ where: { id: text(b.id, 100, 'contribution') }, include: contributionInclude }); checkVersion(row, b.expectedVersion);
        if (row.submittedByUid === actor.id || row.membership.application.supabaseUid === actor.id) fail(403, 'Independent review is required; self-approval/reversal is forbidden');
        if (row.allocation) fail(409, 'Allocated contribution is immutable. An accountant must resolve the closed-period adjustment separately; this tool cannot reverse capital.');
        const reverse = b.action === 'reverse-contribution';
        if (reverse ? row.status !== 'approved' : row.status !== 'submitted') fail(409, 'Contribution is not in the required state');
        if (!reverse) { await membership(tx, row.membershipId); await policy(tx, row.policyId); }
        if (!reverse && b.revision !== row.currentRevision) fail(409, 'Review the exact current submitted revision');
        const revision = row.revisions.find(r => r.revision === row.currentRevision);
        if (!reverse && !['approved', 'rejected'].includes(b.decision)) fail(400, 'Choose approval or rejection');
        const decision = reverse ? 'reversed' : b.decision;
        const verifiedMinutes = decision === 'approved' ? integer(b.verifiedMinutes, 1, revision.minutes, 'verified minutes') : 0;
        const review = await tx.chefContributionReview.create({ data: { contributionId: row.id, revision: row.currentRevision, decision, verifiedMinutes, policyReference: reverse ? '' : text(b.policyReference, 1000, 'eligibility policy decision'), evidenceReference: text(b.evidenceReference, 1000, 'independent verification evidence'), reason, actorUid: actor.id, createdAt: now() } });
        await cas(tx, 'chefContribution', row, { status: decision, approvedReviewId: decision === 'approved' ? review.id : null });
        return { saved: true };
      }
      if (b.action === 'prepare-close') {
        const adopted = await policy(tx, b.policyId);
        const periodStart = workDate(b.periodStart), periodEnd = workDate(b.periodEnd);
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now());
        if (periodEnd < periodStart || periodEnd >= today || b.timeZone !== 'America/Chicago') fail(400, 'Use a completed Central calendar period');
        if (!Array.isArray(b.contributionIds) || !b.contributionIds.length || b.contributionIds.length > 2000) fail(400, 'Select 1–2000 approved contributions');
        const ids = b.contributionIds.map(id => text(id, 100, 'contribution'));
        if (new Set(ids).size !== ids.length) fail(400, 'Duplicate contribution selection');
        integer(b.poolCents, 0, Number.MAX_SAFE_INTEGER, 'approved pool cents'); integer(b.retentionBps, 0, 10000, 'retention basis points');
        const row = await tx.chefCapitalClose.create({ data: { policyId: adopted.id, policySnapshot: adopted.snapshot, classReference: text(b.classReference, 1000, 'actual class and instrument'), periodStart, periodEnd, timeZone: b.timeZone, poolCents: BigInt(b.poolCents), retentionBps: b.retentionBps, accountantEvidence: text(b.accountantEvidence, 3000, 'accountant review/solvency evidence'), authorityEvidence: text(b.authorityEvidence, 3000, 'pool/class/retention approval authority evidence'), selectedContributionIds: ids, reason, preparedByUid: actor.id, createdAt: now() } });
        await selectedContributions(tx, row);
        return { id: row.id };
      }
      if (['approve-close', 'cancel-close'].includes(b.action)) {
        const row = await tx.chefCapitalClose.findUnique({ where: { id: text(b.id, 100, 'period close') } }); checkVersion(row, b.expectedVersion);
        if (row.status !== 'prepared') fail(409, 'Only a prepared close may be approved or cancelled');
        if (b.action === 'cancel-close') { await cas(tx, 'chefCapitalClose', row, { status: 'cancelled', cancellationReason: reason, cancelledAt: now(), cancelledByUid: actor.id }); return { saved: true }; }
        await policy(tx, row.policyId);
        const selected = await selectedContributions(tx, row);
        const allocations = allocateCapital(Number(row.poolCents), row.retentionBps, selected.map(c => ({ id: c.id, membershipId: c.membershipId, verifiedMinutes: c.reviews.find(r => r.id === c.approvedReviewId).verifiedMinutes })));
        for (const allocation of allocations) {
          const posting = await tx.chefCapitalAllocation.create({ data: { closeId: row.id, ...allocation, totalCents: BigInt(allocation.totalCents), retainedCents: BigInt(allocation.retainedCents), cashPayableCents: BigInt(allocation.cashPayableCents) } });
          for (const c of selected.filter(c => c.membershipId === allocation.membershipId)) {
            await tx.chefCapitalSelection.create({ data: { contributionId: c.id, allocationId: posting.id, reviewId: c.approvedReviewId, revision: c.currentRevision, verifiedMinutes: c.reviews.find(r => r.id === c.approvedReviewId).verifiedMinutes } });
          }
        }
        await cas(tx, 'chefCapitalClose', row, { status: 'approved', approvedByUid: actor.id, approvedAt: now(), approvalReason: reason });
        return { saved: true };
      }
      if (b.action === 'offer-engagement') {
        const member = await membership(tx, text(b.membershipId, 100, 'membership'));
        const startsAt = iso(b.startsAt, 'start'), endsAt = iso(b.endsAt, 'end');
        if (startsAt <= now() || endsAt <= startsAt || b.timeZone !== 'America/Chicago') fail(400, 'Use a future Central engagement period');
        const facts = {};
        for (const key of ['scope', 'compensation', 'facility', 'schedule', 'safetyInsurance', 'cancellationTerms', 'authorityReference']) facts[key] = text(b[key], 5000, `negotiated ${key}`);
        const row = await tx.chefEngagement.create({ data: { applicationId: member.applicationId, membershipId: member.id, policyId: member.policyId, policySnapshot: member.policy.snapshot, templateSnapshot: template, kind: template.kind, startsAt, endsAt, timeZone: b.timeZone, ...facts, ownerUid: actor.id, ownerConfirmedAt: now(), ownerReason: reason, events: { create: { version: 1, action: 'offer', reason, actorUid: actor.id, createdAt: now() } } } });
        return { id: row.id };
      }
      if (b.action === 'cancel-engagement') {
        const row = await tx.chefEngagement.findUnique({ where: { id: text(b.id, 100, 'engagement') } }); checkVersion(row, b.expectedVersion);
        if (row.status === 'cancelled') fail(409, 'Engagement is already cancelled');
        // Accepted template, negotiated facts and signature remain immutable, including after cancellation.
        await cas(tx, 'chefEngagement', row, { status: 'cancelled', cancelledAt: now(), cancelledByUid: actor.id, cancellationReason: reason });
        await tx.chefEngagementEvent.create({ data: { engagementId: row.id, version: row.version + 1, action: 'cancel', reason, actorUid: actor.id, createdAt: now() } });
        return { saved: true };
      }
      fail(400, 'Unsupported owner work action');
    });
  }
  async function selectedContributions(tx, close) {
    const ids = close.selectedContributionIds;
    const rows = await tx.chefContribution.findMany({ where: { id: { in: ids } }, include: contributionInclude });
    if (rows.length !== ids.length) fail(409, 'A selected contribution no longer exists');
    for (const row of rows) {
      const revision = row.revisions.find(r => r.revision === row.currentRevision), review = row.reviews.find(r => r.id === row.approvedReviewId);
      if (row.status !== 'approved' || row.allocation || row.policyId !== close.policyId || !review || review.revision !== row.currentRevision || review.decision !== 'approved' || !revision || revision.workDate < close.periodStart || revision.workDate > close.periodEnd) fail(409, 'Selected contributions must be unallocated independently approved exact revisions within this policy and period');
    }
    return rows;
  }
  // Prisma BigInt money is encoded as decimal strings, never silently rounded by JSON serialization.
  function json(res, value) { return res.json(JSON.parse(JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v))); }
  const self = (req, res) => access.execute(req, res, ['GET', 'POST'], 'chef-work-member', async () => {
    if (req.method !== 'GET') object(req.query || {}, []);
    return json(res, req.method === 'GET' ? await load(req, false) : await memberMutation(req));
  });
  const admin = (req, res) => access.execute(req, res, ['GET', 'POST'], 'chef-work-owner', async () => {
    if (req.method !== 'GET') object(req.query || {}, []);
    return json(res, req.method === 'GET' ? await load(req, true) : await ownerMutation(req));
  });
  return { self, admin };
}
module.exports = { createChefWorkHandlers, allocateCapital };
