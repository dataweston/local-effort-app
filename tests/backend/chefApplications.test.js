import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createChefApplicationHandlers } = require('../../api-handlers/hub/_chefApplication');
const { hubAccessFor, requireHubAccess } = require('../../api-handlers/hub/_auth');

const alice = { id: 'supabase-alice', email: 'alice@example.test', email_confirmed_at: '2026-10-15T12:00:00Z' };
const bob = { ...alice, id: 'supabase-bob', email: 'bob@example.test' };
const owner = { id: 'supabase-owner', email: 'owner@example.test' };
const payload = () => ({ name: 'Alice Chef', serviceArea: 'Minneapolis', experience: 'Five years cooking', interests: 'Prep and referrals', availability: 'Weekdays', phone: '', contactPreference: 'email', workProfile: {}, publicDraft: {}, publicationConsent: false, acknowledgment: true, website: '' });

// Transactional in-memory persistence preserves domain transitions, version guards,
// uniqueness and rollback without needing credentials or touching an external DB.
function store() {
  let state = { users: [{ id: 'existing-user', email: alice.email, role: 'admin' }], applications: [], history: [], buckets: {} };
  let sequence = 0;
  const db = {
    state: () => state,
    $transaction: async (run) => {
      const before = structuredClone(state);
      try { return await run(db); } catch (error) { state = before; throw error; }
    },
    user: {
      findFirst: async ({ where }) => structuredClone(state.users.find((row) => row.email.toLowerCase() === where.email.equals.toLowerCase()) || null),
      create: async ({ data }) => { const row = { id: `user-${++sequence}`, ...data }; state.users.push(row); return structuredClone(row); },
    },
    chefApplication: {
      findUnique: async ({ where, include }) => {
        const row = state.applications.find((entry) => Object.entries(where).every(([key, value]) => entry[key] === value));
        return row ? structuredClone({ ...row, ...(include ? { history: state.history.filter((h) => h.applicationId === row.id).sort((a, b) => b.version - a.version) } : {}) }) : null;
      },
      create: async ({ data, include }) => {
        if (state.applications.some((row) => row.userId === data.userId || row.supabaseUid === data.supabaseUid)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        const { history, ...attributes } = data;
        const row = { id: `application-${++sequence}`, status: 'pending', applicantReason: '', version: 1, createdAt: new Date(), updatedAt: new Date(), ...attributes };
        state.applications.push(row);
        state.history.push({ id: `audit-${++sequence}`, applicationId: row.id, privateNote: '', applicantReason: '', createdAt: new Date(), ...history.create });
        return db.chefApplication.findUnique({ where: { id: row.id }, include });
      },
      updateMany: async ({ where, data }) => {
        const row = state.applications.find((entry) => entry.id === where.id && entry.version === where.version);
        if (!row) return { count: 0 };
        Object.assign(row, data, { updatedAt: new Date() }); return { count: 1 };
      },
      findMany: async ({ where, take, cursor, skip = 0 }) => {
        const rows = state.applications.filter((row) => !where.status || row.status === where.status).sort((a, b) => a.id.localeCompare(b.id));
        const offset = cursor ? rows.findIndex((row) => row.id === cursor.id) + skip : 0;
        return structuredClone(rows.slice(offset, offset + take).map(({ id, name, email, status, version, updatedAt }) => ({ id, name, email, status, version, updatedAt })));
      },
    },
    chefApplicationHistory: { create: async ({ data }) => { const row = { id: `audit-${++sequence}`, createdAt: new Date(), ...data }; state.history.push(row); return structuredClone(row); } },
    hubPublicRateLimitBucket: { upsert: async ({ where }) => { const key = JSON.stringify(where); const count = (state.buckets[key] || 0) + 1; state.buckets[key] = count; return { count }; } },
  };
  return db;
}
function fixture() {
  const db = store();
  const handlers = createChefApplicationHandlers({ prismaClient: db, verifyToken: async (req) => req.subject,
    resolveReviewer: async (req) => ({ ...hubAccessFor({ hubProfile: req.reviewerProfile, isAdmin: false }), isReadOnlyAdmin: Boolean(req.readOnly), supabaseUser: req.subject }),
  });
  async function request(which, method = 'GET', body, options = {}) {
    const req = { method, body, query: {}, headers: { 'x-forwarded-for': '192.0.2.4' }, subject: alice, ...options };
    const res = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
    await handlers[which](req, res);
    return res;
  }
  const reviewer = { subject: owner, reviewerProfile: { status: 'active', accessLevel: 'privileged' } };
  return { db, request, reviewer };
}

describe('private chef application lifecycle', () => {
  it('creates idempotently without replacing existing roles or granting staff capability', async () => {
    const { request, db } = fixture();
    const created = await request('self', 'POST', payload());
    const replay = await request('self', 'POST', payload());
    expect(created.statusCode).toBe(200);
    expect(replay.body.application.id).toBe(created.body.application.id);
    expect(db.state().applications).toHaveLength(1);
    expect(db.state().history).toHaveLength(1);
    expect(db.state().users).toEqual([{ id: 'existing-user', email: alice.email, role: 'admin' }]);
    expect(requireHubAccess(hubAccessFor({ dbUser: db.state().users[0] }))).toMatchObject({ status: 403 });
  });

  it('binds ownership to the original verified UID, not a recycled or changed email', async () => {
    const { request, db } = fixture();
    const created = await request('self', 'POST', payload());
    expect((await request('self', 'GET', undefined, { subject: bob })).body.application).toBeNull();
    expect((await request('self', 'GET', undefined, { query: { id: created.body.application.id }, subject: bob })).statusCode).toBe(400);
    const takeover = await request('self', 'POST', payload(), { subject: { ...bob, email: alice.email } });
    expect(takeover.statusCode).toBe(409);
    const changedEmail = await request('self', 'GET', undefined, { subject: { ...alice, email: 'changed@example.test' } });
    expect(changedEmail.body.application.id).toBe(created.body.application.id);
    const otherUpdate = await request('self', 'PATCH', { ...payload(), expectedVersion: 1 }, { subject: bob });
    expect(otherUpdate.statusCode).toBe(404);
    expect(db.state().applications[0].version).toBe(1);
  });

  it('rejects unauthenticated/unconfirmed identities, ownership/status injection, invalid URLs and the honeypot before creating records', async () => {
    const { request, db } = fixture();
    expect((await request('self', 'POST', payload(), { subject: null })).statusCode).toBe(401);
    expect((await request('self', 'POST', payload(), { subject: { ...alice, email_confirmed_at: null } })).statusCode).toBe(401);
    for (const extra of [{ status: 'reviewed' }, { userId: 'victim' }, { supabaseUid: bob.id }, { role: 'admin' }, { equity: 10 }, { acknowledgmentVersion: 'other' }, { website: 'bot' }, { name: 'x'.repeat(121) }, { publicDraft: { taxId: 'forbidden' } }]) {
      expect((await request('self', 'POST', { ...payload(), ...extra })).statusCode).toBe(400);
    }
    for (const photoUrl of ['http://example.test/a.jpg', 'javascript:alert(1)', 'https://user:password@example.test/a', 'https://127.0.0.1/a', 'https://[::1]/a', 'https://kitchen.local/a']) {
      expect((await request('self', 'POST', { ...payload(), publicDraft: { photoUrl } })).statusCode).toBe(400);
    }
    expect(db.state().applications).toEqual([]);
    expect(db.state().users).toHaveLength(1);
  });

  it('persists draft consent privately and withdraws/reapplies without losing the original record', async () => {
    const { request, db } = fixture();
    const created = await request('self', 'POST', payload());
    const edited = await request('self', 'PATCH', { ...payload(), expectedVersion: 1, workProfile: { services: 'Dinner parties' }, publicDraft: { bio: 'Independent chef', photoUrl: 'https://example.test/photo.jpg' }, publicationConsent: true });
    expect(edited.body.application).toMatchObject({ version: 2, publicationConsent: true, publicDraft: { bio: 'Independent chef' }, workProfile: { services: 'Dinner parties' } });
    expect(edited.body.application.publicationConsentAt).toBeTruthy();
    const withdrawn = await request('self', 'PATCH', { action: 'withdraw', expectedVersion: 2 });
    expect(withdrawn.body.application).toMatchObject({ status: 'withdrawn', publicationConsent: false, publicationConsentAt: null, version: 3 });
    expect((await request('self', 'PATCH', { ...payload(), expectedVersion: 3 })).statusCode).toBe(409);
    const reapplied = await request('self', 'PATCH', { ...payload(), action: 'reapply', expectedVersion: 3 });
    expect(reapplied.body.application).toMatchObject({ id: created.body.application.id, status: 'pending', version: 4, withdrawnAt: null });
    expect(db.state().applications).toHaveLength(1);
    expect((await request('self')).body.application.history.map((entry) => entry.action)).toEqual(['reapply', 'withdraw', 'update', 'apply']);
  });

  it('denies all applicant/staff/inactive review access and read-only review mutations', async () => {
    const { request, reviewer, db } = fixture();
    const created = await request('self', 'POST', payload());
    for (const reviewerProfile of [undefined, { status: 'active', accessLevel: 'staff' }, { status: 'inactive', accessLevel: 'privileged' }]) {
      expect((await request('review', 'GET', undefined, { reviewerProfile })).statusCode).toBe(403);
      expect((await request('review', 'GET', undefined, { reviewerProfile, query: { id: created.body.application.id } })).statusCode).toBe(403);
    }
    const reviewBody = { id: created.body.application.id, expectedVersion: 1, status: 'reviewed', applicantReason: 'Interest reviewed', privateNote: 'Private deliberation' };
    expect((await request('review', 'PATCH', reviewBody, { ...reviewer, readOnly: true })).statusCode).toBe(403);
    expect(db.state().applications[0].status).toBe('pending');
  });

  it('records reviewer reasons/audit, hides private notes, and prevents stale review overwrites', async () => {
    const { request, reviewer } = fixture();
    const created = (await request('self', 'POST', payload())).body.application;
    const reviewBody = { id: created.id, expectedVersion: 1, status: 'needs-information', applicantReason: 'Please add your travel range', privateNote: 'Owner-only discussion' };
    const reviewed = await request('review', 'PATCH', reviewBody, reviewer);
    expect(reviewed.statusCode).toBe(200);
    expect(reviewed.body.application.history[0]).toMatchObject({ actorUid: owner.id, actorEmail: owner.email, privateNote: reviewBody.privateNote });
    const applicant = (await request('self')).body.application;
    expect(applicant).toMatchObject({ status: 'needs-information', applicantReason: reviewBody.applicantReason, version: 2 });
    expect(JSON.stringify(applicant)).not.toContain('Owner-only discussion');
    expect(JSON.stringify(applicant)).not.toContain(owner.email);
    expect((await request('review', 'PATCH', reviewBody, reviewer)).statusCode).toBe(409);
    expect((await request('self', 'PATCH', { ...payload(), action: 'resubmit', expectedVersion: 2, workProfile: { travel: '20 miles' } })).body.application).toMatchObject({ status: 'pending', applicantReason: '', version: 3 });
    expect((await request('self', 'PATCH', { ...payload(), expectedVersion: 2 })).statusCode).toBe(409);
    expect((await request('review', 'PATCH', { ...reviewBody, expectedVersion: 3, status: 'approved' }, reviewer)).statusCode).toBe(400);
  });

  it('invalidates completed review on applicant edits but keeps information requests until explicit resubmission', async () => {
    const { request, reviewer } = fixture();
    const created = (await request('self', 'POST', payload())).body.application;
    await request('review', 'PATCH', { id: created.id, expectedVersion: 1, status: 'reviewed', applicantReason: 'Original details reviewed' }, reviewer);
    const updated = await request('self', 'PATCH', { ...payload(), expectedVersion: 2, experience: 'New experience not yet reviewed' });
    expect(updated.body.application).toMatchObject({ version: 3, status: 'pending', applicantReason: '' });
    expect(updated.body.application.history[1]).toMatchObject({ toStatus: 'reviewed', applicantReason: 'Original details reviewed' });
    await request('review', 'PATCH', { id: created.id, expectedVersion: 3, status: 'needs-information', applicantReason: 'Please explain availability' }, reviewer);
    const saved = await request('self', 'PATCH', { ...payload(), expectedVersion: 4, availability: 'Monday mornings' });
    expect(saved.body.application).toMatchObject({ version: 5, status: 'needs-information', applicantReason: 'Please explain availability' });
    const submitted = await request('self', 'PATCH', { ...payload(), action: 'resubmit', expectedVersion: 5, availability: 'Monday mornings' });
    expect(submitted.body.application).toMatchObject({ version: 6, status: 'pending', applicantReason: '' });
  });

  it('fails closed on durable rate-limit and application storage outages without reporting a saved application', async () => {
    const { request, db } = fixture();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      db.hubPublicRateLimitBucket.upsert = async () => { throw new Error('offline'); };
      expect((await request('self', 'POST', payload())).statusCode).toBe(503);
      expect(db.state().applications).toEqual([]);
      db.hubPublicRateLimitBucket.upsert = async () => ({ count: 31 });
      const limited = await request('self', 'POST', payload());
      expect(limited.statusCode).toBe(429);
      expect(Number(limited.headers['Retry-After'])).toBeGreaterThan(0);
      db.hubPublicRateLimitBucket.upsert = async () => ({ count: 1 });
      db.chefApplication.create = async () => { throw Object.assign(new Error('schema absent'), { code: 'P2021' }); };
      expect((await request('self', 'POST', payload())).statusCode).toBe(503);
      expect(db.state().applications).toEqual([]);
      expect(db.state().history).toEqual([]);
    } finally { errorSpy.mockRestore(); }
  });

  it('blocks review of a withdrawn application and rolls back audit failures', async () => {
    const { request, db, reviewer } = fixture();
    const created = (await request('self', 'POST', payload())).body.application;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const createAudit = db.chefApplicationHistory.create;
      db.chefApplicationHistory.create = async () => { throw new Error('audit offline'); };
      const failed = await request('review', 'PATCH', { id: created.id, expectedVersion: 1, status: 'reviewed', applicantReason: 'Reviewed' }, reviewer);
      expect(failed.statusCode).toBe(503);
      expect((await request('self')).body.application).toMatchObject({ version: 1, status: 'pending' });
      db.chefApplicationHistory.create = createAudit;
      await request('self', 'PATCH', { action: 'withdraw', expectedVersion: 1 });
      expect((await request('review', 'PATCH', { id: created.id, expectedVersion: 2, status: 'reviewed', applicantReason: 'Reviewed' }, reviewer)).statusCode).toBe(409);
    } finally { errorSpy.mockRestore(); }
  });
});
