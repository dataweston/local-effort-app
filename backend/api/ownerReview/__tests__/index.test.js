import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { CLASS_KEYS, createOwnerReviewRouter, createOwnerReviewService } from '../index';

function fakePrisma() {
  const db = { requests: [], members: [], decisions: [], audits: [], writes: 0 };
  const withRelations = (r) => ({ ...r, members: db.members.filter((m) => m.requestId === r.id), decisions: db.decisions.filter((d) => d.requestId === r.id) });
  db.ownerReviewRequest = {
    findUnique: vi.fn(async ({ where }) => {
      const r = where.id ? db.requests.find((x) => x.id === where.id) : db.requests.find((x) => x.domain === where.domain_idempotencyKey.domain && x.idempotencyKey === where.domain_idempotencyKey.idempotencyKey);
      return r ? withRelations(r) : null;
    }),
    findMany: vi.fn(async ({ where }) => db.requests.filter((r) => (!where.status || (typeof where.status === 'string' ? r.status === where.status : where.status.in.includes(r.status))) && (!where.domain || r.domain === where.domain) && (!where.classKey || r.classKey === where.classKey)).map(withRelations)),
    create: vi.fn(async ({ data }) => {
      db.writes += 1;
      const request = { ...data, id: `review-${db.requests.length + 1}`, createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z'), resolvedAt: null };
      db.requests.push(request);
      for (const m of data.members.create) db.members.push({ ...m, id: `member-${db.members.length + 1}`, requestId: request.id, createdAt: new Date('2026-01-01T00:00:00Z') });
      return withRelations(request);
    }),
    update: vi.fn(async ({ where, data }) => { db.writes += 1; Object.assign(db.requests.find((r) => r.id === where.id), data); return withRelations(db.requests.find((r) => r.id === where.id)); }),
  };
  db.ownerReviewMember = {
    createMany: vi.fn(async ({ data }) => { db.writes += data.length; for (const m of data) if (!db.members.some((x) => x.requestId === m.requestId && x.subjectType === m.subjectType && x.subjectId === m.subjectId)) db.members.push({ ...m, id: `member-${db.members.length + 1}` }); }),
    updateMany: vi.fn(async ({ where, data }) => { db.writes += 1; for (const m of db.members.filter((x) => x.requestId === where.requestId && x.state === where.state)) Object.assign(m, data); }),
  };
  db.ownerReviewDecision = {
    findUnique: vi.fn(async ({ where }) => db.decisions.find((decision) => decision.requestId === where.requestId_idempotencyKey.requestId && decision.idempotencyKey === where.requestId_idempotencyKey.idempotencyKey) || null),
    create: vi.fn(async ({ data }) => { db.writes += 1; const d = { ...data, id: `decision-${db.decisions.length + 1}`, createdAt: new Date('2026-01-02T00:00:00Z') }; db.decisions.push(d); return d; }),
  };
  db.ownerReviewAudit = { create: vi.fn(async ({ data }) => { db.writes += 1; const a = { ...data, id: `audit-${db.audits.length + 1}` }; db.audits.push(a); return a; }) };
  db.$transaction = (callback) => callback(db);
  return db;
}

const validRaise = (overrides = {}) => ({
  domain: 'food_ops', classKey: CLASS_KEYS.FOOD_RECEIPT_SCOPE, questionKey: 'receipt_scope',
  question: { schemaVersion: 1 }, candidateSet: { schemaVersion: 1, candidates: [{ scope: 'business', evidenceRefs: ['evidence-1'] }] },
  safeDisposition: 'hold', priorityBand: 'money', raisedBy: 'receipt-scope-adapter', idempotencyKey: 'event-1', sourceVersion: 'v1',
  members: [{ subjectType: 'vendor_item', subjectId: 'item-1', evidenceRefs: ['evidence-1'] }], ...overrides,
});
function appFor({ db = fakePrisma(), authorized = true } = {}) {
  const app = express(); app.use(express.json());
  app.use('/api/admin/reviews', createOwnerReviewRouter({ prismaClient: db, verifyAdminRequest: vi.fn().mockResolvedValue(authorized ? { id: 'admin-1' } : null) }));
  return { app, db };
}

describe('owner review contract', () => {
  it('requires admin verification before reading or writing', async () => {
    const { app, db } = appFor({ authorized: false });
    const response = await request(app).post('/api/admin/reviews/raise').send(validRaise());
    expect(response.status).toBe(401);
    expect(db.writes).toBe(0);
  });

  it('rejects unknown, unregistered, and raw-content payloads without persistence', async () => {
    const { app, db } = appFor();
    const extra = await request(app).post('/api/admin/reviews/raise').send(validRaise({ rawBody: 'synthetic private text' }));
    const body = await request(app).post('/api/admin/reviews/raise').send(validRaise({ candidateSet: { schemaVersion: 1, candidates: [], emailBody: 'synthetic private text' } }));
    const key = await request(app).post('/api/admin/reviews/raise').send(validRaise({ classKey: 'food_ops.unknown.v1' }));
    expect(extra.status).toBe(400);
    expect(body.status).toBe(400);
    expect(key.status).toBe(400);
    expect(db.writes).toBe(0);
  });

  it('raises idempotently and merges distinct members once', async () => {
    const db = fakePrisma(); const service = createOwnerReviewService({ prismaClient: db });
    const first = await service.raise(validRaise());
    const second = await service.raise(validRaise({ members: [
      { subjectType: 'vendor_item', subjectId: 'item-1', evidenceRefs: ['evidence-1'] },
      { subjectType: 'vendor_item', subjectId: 'item-2', evidenceRefs: ['evidence-2'] },
    ] }));
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.request.members.map((m) => m.subjectId)).toEqual(['item-1', 'item-2']);
    expect(db.requests).toHaveLength(1);
    expect(db.audits.map((a) => a.eventType)).toEqual(['raised', 'merged']);
  });
  it('rejects a reused request key when its class question or candidates differ', async () => {
    const db = fakePrisma(); const service = createOwnerReviewService({ prismaClient: db });
    await service.raise(validRaise());
    await expect(service.raise(validRaise({
      candidateSet: { schemaVersion: 1, candidates: [{ scope: 'personal', evidenceRefs: ['evidence-1'] }] },
    }))).rejects.toMatchObject({ statusCode: 409 });
    expect(db.members).toHaveLength(1);
    expect(db.audits.map((audit) => audit.eventType)).toEqual(['raised']);
  });


  it('ranks open work and separates needs-decision, shadow, and history views', async () => {
    const db = fakePrisma(); const service = createOwnerReviewService({ prismaClient: db });
    await service.raise(validRaise({ idempotencyKey: 'routine', priorityBand: 'routine' }));
    await service.raise(validRaise({ idempotencyKey: 'safety', priorityBand: 'safety' }));
    db.decisions.push({ id: 'shadow', requestId: 'review-1', revision: 1, applyState: 'dry_run' });
    expect((await service.list({ state: 'needs_decision' })).map((r) => r.priorityBand)).toEqual(['safety', 'routine']);
    expect((await service.list({ state: 'applied_shadow' })).map((r) => r.id)).toEqual(['review-1']);
    expect(await service.list({ state: 'history' })).toEqual([]);
  });

  it('records immutable answer and skip decisions with audits but requests no apply', async () => {
    const db = fakePrisma(); const service = createOwnerReviewService({ prismaClient: db });
    await service.raise(validRaise());
    const answered = await service.answer('review-1', { answer: { scope: 'business' }, expectedRevision: 1, sourceVersion: 'v1', idempotencyKey: 'answer-1' });
    const writesAfterAnswer = db.writes;
    const replay = await service.answer('review-1', { answer: { scope: 'business' }, expectedRevision: 1, sourceVersion: 'v1', idempotencyKey: 'answer-1' });
    expect(replay.decisions).toHaveLength(1);
    expect(db.writes).toBe(writesAfterAnswer);
    expect(answered.status).toBe('answered');
    expect(answered.decisions[0]).toMatchObject({ revision: 1, applyState: 'not_requested', answer: { scope: 'business' } });
    expect(db.audits.at(-1).eventType).toBe('answered');
    await service.raise(validRaise({ idempotencyKey: 'event-2', members: [{ subjectType: 'vendor_item', subjectId: 'item-2', evidenceRefs: [] }] }));
    const skipped = await service.skip('review-2', { reasonCode: 'duplicate', expectedRevision: 1, idempotencyKey: 'skip-1' });
    expect(skipped.status).toBe('answered');
    expect(skipped.decisions[0]).toMatchObject({ answer: { skipped: true }, reason: 'duplicate' });
    expect(db.audits.at(-1)).toMatchObject({ eventType: 'answered', reasonCode: 'duplicate' });
  });

  it('marks stale source versions as conflict without recording or overwriting a decision', async () => {
    const db = fakePrisma(); const service = createOwnerReviewService({ prismaClient: db });
    await service.raise(validRaise());
    await expect(service.answer('review-1', { answer: { scope: 'business' }, expectedRevision: 1, sourceVersion: 'stale-v0', idempotencyKey: 'answer-stale' })).rejects.toMatchObject({ statusCode: 409 });
    expect(db.requests[0].status).toBe('conflict');
    expect(db.decisions).toHaveLength(0);
    expect(db.members[0].state).toBe('conflict');
    expect(db.audits.at(-1).eventType).toBe('conflict');
  });
  it('resolves only allowlisted vendor-catalog fields from source IDs for the stock-product class', async () => {
    const db = fakePrisma();
    db.vendorItem = { findMany: vi.fn(async () => [{ id: 'vendor-item-1', vendorName: 'Synthetic Supplier', description: 'Synthetic ingredient', normalizedDescription: 'synthetic ingredient', packText: '1 lb', email: 'must-not-leak@example.test' }]) };
    db.stockProduct = { findMany: vi.fn(async () => [{ id: 'stock-1', key: 'ingredient_synthetic', name: 'Synthetic Ingredient' }]) };
    const service = createOwnerReviewService({ prismaClient: db });
    const result = await service.raise({
      domain: 'food_ops', classKey: CLASS_KEYS.FOOD_VENDOR_STOCK_PRODUCT, questionKey: 'stock_product_match',
      question: { schemaVersion: 1 }, candidateSet: { schemaVersion: 1, candidates: [{ productId: 'stock-1', evidenceRefs: ['catalog-evidence-1'] }] },
      safeDisposition: 'leave_unassigned', priorityBand: 'routine', raisedBy: 'vendor-mapping', idempotencyKey: 'mapping-1',
      members: [{ subjectType: 'vendor_item', subjectId: 'vendor-item-1', evidenceRefs: ['vendor-item-1'] }],
    });
    expect(db.requests[0].candidateSet).toEqual({ schemaVersion: 1, candidates: [{ productId: 'stock-1', evidenceRefs: ['catalog-evidence-1'] }] });
    expect(result.request.members[0]).toMatchObject({ vendorName: 'Synthetic Supplier', description: 'Synthetic ingredient', packText: '1 lb' });
    expect(result.request.candidateSet.candidates[0]).toMatchObject({ productKey: 'ingredient_synthetic', productName: 'Synthetic Ingredient' });
    expect(JSON.stringify(result.request)).not.toContain('must-not-leak@example.test');
  });
  it('queues bounded unmapped vendor items with stable source versions and no copied descriptions', async () => {
    const db = fakePrisma();
    const updatedAt = new Date('2026-10-08T00:00:00.000Z');
    db.ownerReviewMember.findMany = vi.fn(async () => []);
    db.vendorItem = { findMany: vi.fn(async () => [{
      id: 'vendor-item-1', updatedAt, status: 'unmapped', vendorName: 'Synthetic Supplier',
      description: 'Synthetic ingredient', normalizedDescription: 'synthetic ingredient', packText: '1 lb', stockProduct: null,
    }]) };
    const service = createOwnerReviewService({ prismaClient: db });
    const result = await service.queueUnmappedVendorItems(10);
    expect(result).toEqual({ examined: 1, created: 1 });
    expect(db.requests[0]).toMatchObject({
      classKey: CLASS_KEYS.FOOD_VENDOR_STOCK_PRODUCT,
      status: 'queued',
      sourceVersion: updatedAt.toISOString(),
      question: { schemaVersion: 1 },
      candidateSet: { schemaVersion: 1, candidates: [] },
    });
    expect(db.requests[0].question).not.toHaveProperty('description');
    expect(db.members[0]).toMatchObject({ subjectType: 'vendor_item', subjectId: 'vendor-item-1' });
  });
  it('applies a confirmed catalog mapping once and records its source write', async () => {
    const db = fakePrisma();
    const updatedAt = new Date('2026-10-08T00:00:00.000Z');
    const source = {
      id: 'vendor-item-1', updatedAt, status: 'unmapped', vendorName: 'Synthetic Supplier',
      description: 'Synthetic ingredient', normalizedDescription: 'synthetic ingredient',
      packText: '1 lb', packBaseQuantity: 453.59237, packDimension: 'mass', stockProduct: null,
    };
    const product = { id: 'stock-1', key: 'ingredient_synthetic', name: 'Synthetic Ingredient', dimension: 'mass' };
    db.ownerReviewMember.findMany = vi.fn(async () => []);
    db.vendorItem = {
      findMany: vi.fn(async () => [source]),
      findUnique: vi.fn(async () => source),
      updateMany: vi.fn(async ({ where, data }) => {
        const matches = source.status === where.status && source.updatedAt.getTime() === where.updatedAt.getTime();
        if (matches) Object.assign(source, data);
        return { count: matches ? 1 : 0 };
      }),
    };
    db.stockProduct = {
      findMany: vi.fn(async () => [product]),
      findUnique: vi.fn(async ({ where }) => (where.id === product.id || where.key === product.key ? product : null)),
    };
    const service = createOwnerReviewService({ prismaClient: db });
    await service.raise({
      domain: 'food_ops', classKey: CLASS_KEYS.FOOD_VENDOR_STOCK_PRODUCT, questionKey: 'stock_product_match',
      question: { schemaVersion: 1 }, candidateSet: { schemaVersion: 1, candidates: [{ productId: product.id, evidenceRefs: ['catalog-evidence-1'] }] },
      safeDisposition: 'leave_unassigned', priorityBand: 'routine', raisedBy: 'vendor-mapping',
      idempotencyKey: 'mapping-apply-1', sourceVersion: updatedAt.toISOString(),
      members: [{ subjectType: 'vendor_item', subjectId: source.id, evidenceRefs: [source.id] }],
    });
    const answer = {
      answer: { outcome: 'select', productId: product.id }, expectedRevision: 1,
      sourceVersion: updatedAt.toISOString(), idempotencyKey: 'mapping-answer-1',
    };
    const result = await service.answer('review-1', answer);
    expect(source).toMatchObject({ status: 'mapped', stockProductId: product.id, packText: '1 lb' });
    expect(result.decisions[0]).toMatchObject({ applyState: 'applied', answer: { outcome: 'select', productId: product.id } });
    expect(result.members[0].state).toBe('applied');
    expect(db.audits.at(-1).afterRef.applyState).toBe('applied');
    const writeCount = db.vendorItem.updateMany.mock.calls.length;
    await service.answer('review-1', answer);
    expect(db.vendorItem.updateMany).toHaveBeenCalledTimes(writeCount);
  });
  it('conflicts instead of recording a vendor mapping answer after the source item changes', async () => {
    const db = fakePrisma();
    const originalVersion = new Date('2026-10-08T00:00:00.000Z');
    const source = { id: 'vendor-item-1', updatedAt: originalVersion, status: 'unmapped', vendorName: 'Synthetic Supplier', description: 'Synthetic ingredient', normalizedDescription: 'synthetic ingredient', packText: '1 lb', stockProduct: null };
    db.ownerReviewMember.findMany = vi.fn(async () => []);
    db.vendorItem = { findMany: vi.fn(async () => [source]) };
    const service = createOwnerReviewService({ prismaClient: db });
    await service.queueUnmappedVendorItems(10);
    source.updatedAt = new Date('2026-10-08T00:01:00.000Z');
    await expect(service.answer('review-1', {
      answer: { outcome: 'ignore', productId: null },
      expectedRevision: 1,
      sourceVersion: originalVersion.toISOString(),
      idempotencyKey: 'answer-stale-vendor-item',
    })).rejects.toMatchObject({ statusCode: 409 });
    expect(db.requests[0].status).toBe('conflict');
    expect(db.decisions).toHaveLength(0);
    expect(db.audits.at(-1).eventType).toBe('conflict');
  });

  it('records and applies a single receipt-scope decision through the canonical ledger', async () => {
    const db = fakePrisma();
    const observation = {
      id: 'observation-1', source: 'receipt_wedge', sourceKey: 'wedge-2026-10-08|1',
      observedAt: new Date('2026-10-08T00:00:00.000Z'), packCostCents: 725,
      scope: null, scopeSource: null, scopeAt: null,
    };
    db.costObservation = {
      findUnique: vi.fn(async () => observation),
      updateMany: vi.fn(async ({ where, data }) => {
        if (observation.id !== where.id || observation.scope !== where.scope) return { count: 0 };
        Object.assign(observation, data);
        return { count: 1 };
      }),
    };
    const service = createOwnerReviewService({ prismaClient: db });

    const result = await service.recordReceiptScopeDecision({ observationId: observation.id, scope: 'business' });

    expect(observation).toMatchObject({ scope: 'business', scopeSource: 'owner' });
    expect(result.status).toBe('answered');
    expect(result.decisions[0]).toMatchObject({ answer: { scope: 'business' }, applyState: 'applied' });
    expect(result.members[0]).toMatchObject({ subjectType: 'cost_observation', subjectId: observation.id, state: 'applied' });
    expect(db.audits.map((audit) => audit.eventType)).toEqual(['raised', 'answered']);
  });

  it('records a conflict instead of changing a receipt line that changed before apply', async () => {
    const db = fakePrisma();
    const original = {
      id: 'observation-2', source: 'receipt_wedge', sourceKey: 'wedge-2026-10-08|2',
      observedAt: new Date('2026-10-08T00:00:00.000Z'), packCostCents: 725,
      scope: null, scopeSource: null, scopeAt: null,
    };
    db.costObservation = {
      findUnique: vi.fn()
        .mockResolvedValueOnce(original)
        .mockResolvedValueOnce({ ...original, scope: 'personal', scopeSource: 'owner', scopeAt: new Date('2026-10-09T00:00:00.000Z') }),
      updateMany: vi.fn(),
    };
    const service = createOwnerReviewService({ prismaClient: db });

    await expect(service.recordReceiptScopeDecision({ observationId: original.id, scope: 'business' })).rejects.toMatchObject({ statusCode: 409 });

    expect(db.costObservation.updateMany).not.toHaveBeenCalled();
    expect(db.requests[0].status).toBe('conflict');
    expect(db.decisions).toHaveLength(0);
    expect(db.audits.at(-1).eventType).toBe('conflict');
  });

  it('expires only due queued requests and audits the transition', async () => {
    const db = fakePrisma();
    const service = createOwnerReviewService({ prismaClient: db });
    const now = new Date('2026-10-09T12:00:00.000Z');
    await service.raise(validRaise({ idempotencyKey: 'due', dueAt: '2026-10-09T11:00:00.000Z' }));
    await service.raise(validRaise({ idempotencyKey: 'future', dueAt: '2026-10-10T11:00:00.000Z' }));
    db.ownerReviewRequest.findMany.mockImplementation(async ({ where }) => db.requests
      .filter((request) => request.status === where.status && request.dueAt <= where.dueAt.lte)
      .map((request) => ({ id: request.id, dueAt: request.dueAt })));
    db.ownerReviewRequest.updateMany = vi.fn(async ({ where, data }) => {
      const request = db.requests.find((item) => item.id === where.id && item.status === where.status && item.dueAt <= where.dueAt.lte);
      if (!request) return { count: 0 };
      Object.assign(request, data);
      return { count: 1 };
    });

    await expect(service.expireDueRequests({ now })).resolves.toEqual({ examined: 1, expired: 1 });
    expect(db.requests.map((request) => request.status)).toEqual(['expired', 'queued']);
    expect(db.members.map((member) => member.state)).toEqual(['expired', 'open']);
    expect(db.audits.at(-1)).toMatchObject({
      eventType: 'expired',
      actorType: 'system',
      reasonCode: 'due_at_elapsed',
      afterRef: { status: 'expired', expiredAt: now.toISOString() },
    });
  });



});
