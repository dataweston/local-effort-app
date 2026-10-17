import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createChefWorkHandlers, allocateCapital } = require('../../api-handlers/hub/_chefWork');
const { hubAccessFor } = require('../../api-handlers/hub/_auth');
const alice = { id: 'alice-uid', email: 'alice@example.test', email_confirmed_at: '2026-01-01T12:00:00Z' };
const bob = { ...alice, id: 'bob-uid', email: 'bob@example.test' };
const owner = { ...alice, id: 'owner-uid', email: 'chef-owner@example.test' };
const clock = new Date('2026-10-15T18:00:00Z');
const clone = value => structuredClone(value);

// A rollback-capable domain store: CAS and unique selection constraints model the
// races and invariants visible to consumers, without external database access.
function fixture() {
  let sequence = 0;
  let state = Object.fromEntries(['chefApplication', 'chefMembershipPolicy', 'chefMembership', 'chefWorkOpportunity', 'chefWorkOffer', 'chefWorkEvent', 'chefContribution', 'chefContributionRevision', 'chefContributionReview', 'chefCapitalClose', 'chefCapitalAllocation', 'chefCapitalSelection', 'chefEngagement', 'chefEngagementEvent'].map(key => [key, []]));
  state.chefApplication = [{ id: 'app-a', supabaseUid: alice.id, name: 'Alice', status: 'reviewed' }, { id: 'app-b', supabaseUid: bob.id, name: 'Bob', status: 'reviewed' }];
  state.chefMembershipPolicy = [{ id: 'policy', snapshot: { operationsEnabled: true, version: 'adopted-1' }, retiredAt: null }];
  state.chefMembership = [{ id: 'member-a', applicationId: 'app-a' }, { id: 'member-b', applicationId: 'app-b' }].map(row => ({ ...row, policyId: 'policy', status: 'active', acceptedAt: new Date('2026-09-01T12:00:00Z'), admittedAt: new Date('2026-09-01T12:00:00Z') }));
  state.chefEngagement = [{ id: 'signed-work', membershipId: 'member-a', applicationId: 'app-a', policyId: 'policy', signedAt: new Date('2026-09-01T12:00:00Z'), startsAt: new Date('2026-09-01T05:00:00Z'), endsAt: new Date('2026-10-16T04:59:59Z'), timeZone: 'America/Chicago', status: 'accepted', version: 2 }];
  const db = { state: () => state, beforeTransaction: null, $transaction: async run => {
    const before = clone(state);
    try { if (db.beforeTransaction) db.beforeTransaction(); return await run(db); } catch (error) { state = before; throw error; }
  } };
  const member = id => { const row = state.chefMembership.find(m => m.id === id); return row && { ...row, application: state.chefApplication.find(a => a.id === row.applicationId), policy: state.chefMembershipPolicy.find(p => p.id === row.policyId) }; };
  function hydrate(model, row) {
    if (!row) return null;
    if (model === 'chefMembership') return member(row.id);
    if (model === 'chefWorkOffer') return { ...row, opportunity: state.chefWorkOpportunity.find(o => o.id === row.opportunityId), membership: member(row.membershipId) };
    if (model === 'chefWorkOpportunity') return { ...row, offers: state.chefWorkOffer.filter(o => o.opportunityId === row.id).map(o => hydrate('chefWorkOffer', o)), events: state.chefWorkEvent.filter(e => e.opportunityId === row.id) };
    if (model === 'chefContribution') return { ...row, membership: member(row.membershipId), revisions: state.chefContributionRevision.filter(r => r.contributionId === row.id), reviews: state.chefContributionReview.filter(r => r.contributionId === row.id), allocation: state.chefCapitalSelection.find(s => s.contributionId === row.id) || null };
    if (model === 'chefEngagement') return { ...row, membership: member(row.membershipId), events: state.chefEngagementEvent.filter(e => e.engagementId === row.id) };
    if (model === 'chefCapitalClose') return { ...row, allocations: state.chefCapitalAllocation.filter(a => a.closeId === row.id), policy: state.chefMembershipPolicy.find(p => p.id === row.policyId) };
    if (model === 'chefCapitalAllocation') return { ...row, membership: member(row.membershipId), close: state.chefCapitalClose.find(c => c.id === row.closeId) };
    return row;
  }
  function matches(row, where = {}) {
    return Object.entries(where).every(([key, value]) => {
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        if ('in' in value) return value.in.includes(row[key]);
        if ('some' in value) return row[key]?.some(item => matches(item, value.some));
        return matches(row[key] || {}, value);
      }
      return row[key] === value;
    });
  }
  for (const model of Object.keys(state)) db[model] = {
    findUnique: async ({ where, include }) => { const row = state[model].find(r => matches(r, where)); return clone(include ? hydrate(model, row) : row || null); },
    findFirst: async ({ where, include }) => { const row = state[model].find(r => matches(r, where)); return clone(include ? hydrate(model, row) : row || null); },
    findMany: async ({ where, take, cursor, skip = 0 } = {}) => { const rows = state[model].map(r => hydrate(model, r)).filter(r => matches(r, where)); const start = cursor ? rows.findIndex(r => r.id === cursor.id) + skip : 0; return clone(rows.slice(start, take ? start + take : undefined)); },
    create: async ({ data }) => {
      if (model === 'chefCapitalSelection' && state[model].some(r => r.contributionId === data.contributionId)) throw Object.assign(new Error('duplicate allocation'), { code: 'P2002' });
      if (model === 'chefWorkOffer' && state[model].some(r => r.opportunityId === data.opportunityId && r.membershipId === data.membershipId)) throw Object.assign(new Error('duplicate offer'), { code: 'P2002' });
      const { events, ...facts } = data;
      const defaults = { chefWorkOpportunity: 'open', chefWorkOffer: 'offered', chefContribution: 'submitted', chefCapitalClose: 'prepared', chefEngagement: 'offered' };
      const row = { id: `record-${++sequence}`, version: 1, currentRevision: 1, status: defaults[model], ...facts };
      state[model].push(row);
      if (events) state.chefEngagementEvent.push({ id: `event-${++sequence}`, engagementId: row.id, ...events.create });
      return clone(row);
    },
    updateMany: async ({ where, data }) => { const row = state[model].find(r => matches(r, where)); if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 }; },
  };
  let templates = [{ _id: 'terms', _rev: 'cms-1', title: 'Private work agreement', version: 'approved-1', kind: 'work', agreementText: 'Counsel-approved complete binding work agreement. '.repeat(5), acceptanceText: 'I accept these exact terms and negotiated facts.', approvalReference: 'Actual authority record', replyEmail: 'reply@example.test' }];
  const handlers = createChefWorkHandlers({ prismaClient: db, now: () => clock, rateLimit: async () => true, verifyToken: async req => req.subject, resolveReviewer: async req => ({ ...hubAccessFor({ hubProfile: { status: 'active', accessLevel: 'privileged' }, isAdmin: false }), isReadOnlyAdmin: !!req.readOnly, supabaseUser: req.subject }), loadTemplates: async () => clone(templates) });
  async function request(which, body, { subject = which === 'admin' ? owner : alice, query = {}, readOnly = false } = {}) {
    const req = { method: body ? 'POST' : 'GET', body, subject, query, readOnly, headers: {} };
    const res = { statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
    await handlers[which](req, res); return res;
  }
  return { db, request, changeTemplate: () => { templates = templates.map(t => ({ ...t, _rev: 'cms-2', agreementText: 'New replacement agreement. '.repeat(10) })); } };
}
const contribution = () => ({ action: 'submit-contribution', minutes: 90, category: 'Paid prep', workDate: '2026-10-10', engagementId: 'signed-work', compensationReference: 'Compensation ledger 22', evidenceReference: 'Completed work record 44', policyReference: 'Adopted qualifying provision 3', reason: 'Actual completed paid prep' });
const review = (id, overrides = {}) => ({ action: 'review-contribution', id, expectedVersion: 1, revision: 1, decision: 'approved', verifiedMinutes: 75, policyReference: 'Qualifying class provision 3', evidenceReference: 'Independent completed work and pay verification', reason: 'Verified only 75 qualifying minutes', confirmed: true, ...overrides });
const post = () => ({ action: 'post-opportunity', confirmed: true, policyId: 'policy', kind: 'prep', title: 'Actual prep engagement', scope: 'Privately agreed actual work scope', startsAt: '2026-11-02T09:00:00-06:00', endsAt: '2026-11-02T12:00:00-06:00', responseDeadline: '2026-10-20T17:00:00-05:00', timeZone: 'America/Chicago', compensation: 'Actual negotiated compensation reference', engagementReference: 'Negotiation record 11', suitability: 'Verified actual training and availability', allocationPolicyReference: 'Adopted ordering rule 4', reason: 'Authorized actual opportunity' });
const close = ids => ({ action: 'prepare-close', confirmed: true, policyId: 'policy', classReference: 'Actual instrument and class A', periodStart: '2026-10-01', periodEnd: '2026-10-14', timeZone: 'America/Chicago', poolCents: 101, retentionBps: 5000, accountantEvidence: 'Accountant actual solvency and pool review', authorityEvidence: 'Actual approved class/pool/retention resolution', contributionIds: ids, reason: 'Actual closed-period decision' });

beforeEach(() => vi.stubEnv('ADMIN_EMAILS', owner.email));
afterEach(() => vi.unstubAllEnvs());

describe('money-safe deterministic capital apportionment', () => {
  it('preserves pool and retained totals with deterministic tie breaks independent of selection order', () => {
    const rows = ['c', 'a', 'b'].map(id => ({ id, membershipId: id, verifiedMinutes: 60 }));
    expect(allocateCapital(101, 5000, rows)).toEqual([
      { membershipId: 'a', verifiedMinutes: 60, totalCents: 34, retainedCents: 17, cashPayableCents: 17 },
      { membershipId: 'b', verifiedMinutes: 60, totalCents: 34, retainedCents: 17, cashPayableCents: 17 },
      { membershipId: 'c', verifiedMinutes: 60, totalCents: 33, retainedCents: 16, cashPayableCents: 17 },
    ]);
    expect(allocateCapital(101, 5000, [...rows].reverse())).toEqual(allocateCapital(101, 5000, rows));
  });
  it('handles zero surplus, full retention and products beyond safe integer arithmetic without inventing equity', () => {
    const rows = [{ id: 'one', membershipId: 'a', verifiedMinutes: 1440 }, { id: 'two', membershipId: 'b', verifiedMinutes: 1 }];
    expect(allocateCapital(0, 10000, rows).map(r => r.totalCents)).toEqual([0, 0]);
    const result = allocateCapital(Number.MAX_SAFE_INTEGER, 10000, rows);
    expect(result.reduce((n, r) => n + BigInt(r.totalCents), 0n)).toBe(BigInt(Number.MAX_SAFE_INTEGER));
    expect(result.every(r => r.cashPayableCents === 0 && r.retainedCents === r.totalCents)).toBe(true);
    expect(() => allocateCapital(10, 5000, [rows[0], rows[0]])).toThrow('selected twice');
    expect(() => allocateCapital(1.5, 5000, rows)).toThrow('pool cents');
  });
});

describe('private chef work lifecycle', () => {
  it('rechecks accepted active membership and adopted operations policy inside the mutation transaction', async () => {
    const { db, request } = fixture();
    db.beforeTransaction = () => { db.state().chefMembershipPolicy[0].snapshot.operationsEnabled = false; };
    expect((await request('self', contribution())).statusCode).toBe(409);
    expect(db.state().chefContribution).toEqual([]);
    db.beforeTransaction = null;
    db.state().chefMembership[0].acceptedAt = null;
    expect((await request('self', contribution())).statusCode).toBe(409);
  });
  it('binds offers to stable identity, expires responses, and separates acceptance/assignment from approved work', async () => {
    const { db, request } = fixture();
    const posted = await request('admin', post());
    expect(posted.statusCode).toBe(200);
    const id = posted.body.id;
    expect((await request('admin', { action: 'offer-opportunity', id, expectedVersion: 1, membershipId: 'member-a', eligibilityEvidence: 'Actual safety and availability verified', orderingEvidence: 'Rotation position under adopted policy', confirmed: true, reason: 'Member first' })).statusCode).toBe(200);
    const offer = db.state().chefWorkOffer[0];
    const response = { action: 'accept-offer', id: offer.id, expectedVersion: 1, reason: 'Available and interested' };
    expect((await request('self', response, { subject: { ...bob, email: alice.email } })).statusCode).toBe(404);
    expect((await request('self', response)).statusCode).toBe(200);
    expect((await request('self', response)).statusCode).toBe(409);
    expect(db.state().chefWorkOpportunity[0].status).toBe('open');
    expect(db.state().chefContribution).toEqual([]);
    expect((await request('admin', { action: 'assign-opportunity', id, expectedVersion: 2, membershipId: 'member-a', clientChoiceEvidence: 'Client independently selected Alice after review', confirmed: true, reason: 'Independent suitable assignment' })).statusCode).toBe(200);
    expect(db.state().chefWorkOpportunity[0].assignedMembershipId).toBe('member-a');
    expect(db.state().chefContribution).toEqual([]);
    expect(db.state().chefWorkEvent.map(e => e.action)).toEqual(['post', 'offer', 'accept-offer', 'assign']);
    db.state().chefWorkOpportunity[0].status = 'open'; db.state().chefWorkOpportunity[0].responseDeadline = new Date('2026-10-14T12:00:00Z');
    db.state().chefWorkOffer[0].status = 'offered';
    expect((await request('self', { ...response, expectedVersion: 2 })).statusCode).toBe(409);
  });
  it('hides other members and private assignment evidence from member reads', async () => {
    const { db, request } = fixture();
    const result = await request('admin', post());
    db.state().chefWorkOpportunity[0].clientChoiceEvidence = 'Owner-only client deliberation';
    db.state().chefWorkOffer.push({ id: 'private-a', opportunityId: result.body.id, membershipId: 'member-a', status: 'offered', version: 1, eligibilityEvidence: 'Private A evidence' }, { id: 'private-b', opportunityId: result.body.id, membershipId: 'member-b', status: 'offered', version: 1, eligibilityEvidence: 'Private B evidence' });
    const res = await request('self', undefined, { query: { section: 'opportunities' } });
    expect(res.body.items[0].offers.map(o => o.id)).toEqual(['private-a']);
    expect(JSON.stringify(res.body)).not.toContain('Private B evidence');
    expect(JSON.stringify(res.body)).not.toContain('Owner-only client deliberation');
    expect(JSON.stringify(res.body)).not.toContain(bob.id);
  });
  it('reviews exact revisions, preserves rejection/correction/reversal history and forbids self approval', async () => {
    const { db, request } = fixture();
    expect((await request('self', contribution())).statusCode).toBe(200);
    const id = db.state().chefContribution[0].id;
    expect((await request('admin', review(id, { revision: 2 }))).statusCode).toBe(409);
    db.state().chefApplication[0].supabaseUid = owner.id;
    expect((await request('admin', review(id))).statusCode).toBe(403);
    db.state().chefApplication[0].supabaseUid = alice.id;
    expect((await request('admin', review(id, { decision: 'rejected', verifiedMinutes: 0, reason: 'Evidence does not support claimed time' }))).statusCode).toBe(200);
    expect((await request('self', { ...contribution(), action: 'revise-contribution', id, expectedVersion: 2, minutes: 80, reason: 'Corrected time against actual completed work' })).statusCode).toBe(200);
    expect((await request('admin', review(id, { expectedVersion: 3, revision: 1 }))).statusCode).toBe(409);
    expect((await request('admin', review(id, { expectedVersion: 3, revision: 2, verifiedMinutes: 70 }))).statusCode).toBe(200);
    expect((await request('self', { ...contribution(), action: 'revise-contribution', id, expectedVersion: 4 })).statusCode).toBe(409);
    expect((await request('admin', { action: 'reverse-contribution', id, expectedVersion: 4, evidenceReference: 'Discovered duplicate source evidence', reason: 'Independent correction required', confirmed: true })).statusCode).toBe(200);
    expect((await request('self', { ...contribution(), correctsId: id, minutes: 65 })).statusCode).toBe(200);
    expect(db.state().chefContributionRevision.filter(r => r.contributionId === id).map(r => r.minutes)).toEqual([90, 80]);
    expect(db.state().chefContributionReview.map(r => [r.revision, r.decision, r.verifiedMinutes])).toEqual([[1, 'rejected', 0], [2, 'approved', 70], [2, 'reversed', 0]]);
    expect(db.state().chefContribution[1].correctsId).toBe(id);
  });
  describe.each(['submit-contribution', 'revise-contribution'])('signed engagement calendar period for %s', action => {
    it.each([
      ['2026-10-08', 400],
      ['2026-10-09', 200],
      ['2026-10-10', 200],
      ['2026-10-11', 400],
    ])('handles actual work on %s with status %s using inclusive Central dates, not UTC dates', async (workDate, status) => {
      const { db, request } = fixture();
      Object.assign(db.state().chefEngagement[0], { startsAt: new Date('2026-10-10T02:00:00Z'), endsAt: new Date('2026-10-11T04:59:59Z') });
      let original = null;
      if (action === 'revise-contribution') {
        expect((await request('self', contribution())).statusCode).toBe(200);
        original = clone(db.state().chefContribution[0]);
      }
      const result = await request('self', { ...contribution(), action, workDate, ...(original ? { id: original.id, expectedVersion: original.version } : {}) });
      expect(result.statusCode).toBe(status);
      const dates = original ? ['2026-10-10'] : [];
      expect(db.state().chefContributionRevision.map(row => row.workDate)).toEqual(status === 200 ? [...dates, workDate] : dates);
      if (status === 400) expect(db.state().chefContribution).toEqual(original ? [original] : []);
    });
  });
  it.each([['submitted', 'active'], ['rejected', 'ended']])('does not revise %s history through a readmission when the original membership is %s', async (status, originalStatus) => {
    const { db, request } = fixture();
    expect((await request('self', contribution())).statusCode).toBe(200);
    const id = db.state().chefContribution[0].id;
    if (status === 'rejected') expect((await request('admin', review(id, { decision: 'rejected', verifiedMinutes: 0 }))).statusCode).toBe(200);
    const original = clone(db.state().chefContribution[0]);
    const revisions = clone(db.state().chefContributionRevision);
    const firstMembership = db.state().chefMembership[0];
    firstMembership.status = originalStatus;
    db.state().chefMembership.unshift({ ...firstMembership, id: 'readmitted-a', status: 'active', admittedAt: new Date('2026-10-01T12:00:00Z') });
    db.state().chefEngagement.push({ ...db.state().chefEngagement[0], id: 'readmitted-work', membershipId: 'readmitted-a' });
    const result = await request('self', { ...contribution(), action: 'revise-contribution', id, expectedVersion: original.version, engagementId: 'readmitted-work', minutes: 80 });
    expect(result.statusCode).toBe(409);
    expect(db.state().chefContribution).toEqual([original]);
    expect(db.state().chefContributionRevision).toEqual(revisions);
  });
  it('does not append new-policy facts to an original contribution even when the membership ID is unchanged', async () => {
    const { db, request } = fixture();
    expect((await request('self', contribution())).statusCode).toBe(200);
    const original = clone(db.state().chefContribution[0]);
    const revisions = clone(db.state().chefContributionRevision);
    db.state().chefMembershipPolicy.push({ id: 'new-policy', snapshot: { operationsEnabled: true, version: 'adopted-2' }, retiredAt: null });
    db.state().chefMembership[0].policyId = 'new-policy';
    db.state().chefEngagement.push({ ...db.state().chefEngagement[0], id: 'new-policy-work', policyId: 'new-policy' });
    const result = await request('self', { ...contribution(), action: 'revise-contribution', id: original.id, expectedVersion: original.version, engagementId: 'new-policy-work' });
    expect(result.statusCode).toBe(409);
    expect(db.state().chefContribution).toEqual([original]);
    expect(db.state().chefContributionRevision).toEqual(revisions);
  });
  it('requires actual approval and accountant authority before posting once, never reallocating or paying', async () => {
    const { db, request } = fixture();
    await request('self', contribution()); const id = db.state().chefContribution[0].id;
    expect((await request('admin', close([id]))).statusCode).toBe(409);
    await request('admin', review(id));
    const prepared = await request('admin', close([id])); expect(prepared.statusCode).toBe(200);
    expect(db.state().chefCapitalAllocation).toEqual([]);
    const approved = await request('admin', { action: 'approve-close', id: prepared.body.id, expectedVersion: 1, reason: 'Confirmed actual authority and accountant evidence', confirmed: true });
    expect(approved.statusCode).toBe(200);
    expect(db.state().chefCapitalAllocation.map(a => [a.totalCents, a.retainedCents, a.cashPayableCents])).toEqual([[101n, 50n, 51n]]);
    expect(db.state().chefCapitalSelection.map(s => [s.contributionId, s.revision, s.verifiedMinutes])).toEqual([[id, 1, 75]]);
    expect((await request('admin', close([id]))).statusCode).toBe(409);
    expect((await request('admin', { action: 'reverse-contribution', id, expectedVersion: 2, reason: 'Attempt to rewrite allocated work', evidenceReference: 'Any reference', confirmed: true })).statusCode).toBe(409);
    const visible = await request('self', undefined, { query: { section: 'closes' } });
    expect(visible.body.items[0].totalCents).toBe('101');
    expect(visible.body.items[0].cashPayableCents).toBe('51');
  });
  it('signs immutable CMS and negotiated snapshots and retains them after cancellation and CMS replacement', async () => {
    const { db, request, changeTemplate } = fixture();
    const offered = await request('admin', { action: 'offer-engagement', confirmed: true, membershipId: 'member-a', templateId: 'terms', templateRevision: 'cms-1', startsAt: '2026-11-01T09:00:00-06:00', endsAt: '2026-11-01T12:00:00-06:00', timeZone: 'America/Chicago', scope: 'Actual negotiated work', compensation: 'Actual negotiated rate and timing', facility: 'Actual negotiated facility', schedule: 'Actual negotiated schedule', safetyInsurance: 'Actual reviewed safety/insurance', cancellationTerms: 'Exact negotiated cancellation', authorityReference: 'Actual contracting authority', reason: 'Owner confirms exact privately negotiated facts' });
    expect(offered.statusCode).toBe(200); const id = offered.body.id;
    changeTemplate();
    expect((await request('self', { action: 'sign-engagement', id, expectedVersion: 1, templateRevision: 'cms-2', signedName: 'Alice', accepted: true })).statusCode).toBe(400);
    expect((await request('self', { action: 'sign-engagement', id, expectedVersion: 1, templateRevision: 'cms-1', signedName: 'Alice', accepted: true })).statusCode).toBe(200);
    expect((await request('self', { ...contribution(), engagementId: id })).statusCode).toBe(400);
    expect(db.state().chefContribution).toEqual([]);
    expect((await request('admin', { action: 'cancel-engagement', id, expectedVersion: 2, confirmed: true, reason: 'Cancellation under negotiated terms' })).statusCode).toBe(200);
    const saved = db.state().chefEngagement.find(row => row.id === id);
    expect(saved.templateSnapshot._rev).toBe('cms-1');
    expect(saved.compensation).toBe('Actual negotiated rate and timing');
    expect(saved.signedName).toBe('Alice');
    expect(saved.signedAt).toEqual(clock);
    expect(saved.status).toBe('cancelled');
    expect(db.state().chefEngagementEvent.filter(e => e.engagementId === id).map(e => e.action)).toEqual(['offer', 'sign', 'cancel']);
    const memberRead = await request('self', undefined, { query: { section: 'engagements' } });
    const memberAgreement = memberRead.body.items.find(row => row.id === id);
    expect(memberAgreement.cancellationReason).toBe('Cancellation under negotiated terms');
    expect(memberAgreement.compensation).toBe(saved.compensation);
    expect(memberAgreement.events.map(event => event.action)).toEqual(['offer', 'sign', 'cancel']);
    expect(JSON.stringify(memberRead.body)).not.toContain(owner.id);
    expect(memberAgreement).not.toHaveProperty('ownerUid');
    expect(memberAgreement).not.toHaveProperty('cancelledByUid');
    const ownerRead = await request('admin', undefined, { query: { section: 'engagements' } });
    expect(ownerRead.body.items.find(row => row.id === id)).toMatchObject({ ownerUid: owner.id, cancelledByUid: owner.id });
  });
  it('rejects zoneless work dates, malformed actual dates and read-only owner mutations', async () => {
    const { request } = fixture();
    expect((await request('admin', { ...post(), startsAt: '2026-11-02T09:00:00' })).statusCode).toBe(400);
    expect((await request('self', { ...contribution(), workDate: '2026-99-99' })).statusCode).toBe(400);
    expect((await request('admin', post(), { readOnly: true })).statusCode).toBe(403);
  });
});
