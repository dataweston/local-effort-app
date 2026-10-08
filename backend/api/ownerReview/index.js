const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { isDeepStrictEqual } = require('node:util');
const { createHash } = require('node:crypto');
const catalog = require('../foodOps/catalog');

const CLASS_KEYS = Object.freeze({
  GMAIL_DISPOSITION: 'brain.gmail.disposition.sender_thread_class.v1',
  PARTNER_VENDOR_IDENTITY: 'brain.partner.vendor_identity.v1',
  FOOD_PACK_SIZE: 'food_ops.pack_size.mass.ingredient_family.v1',
  FOOD_RECEIPT_SCOPE: 'food_ops.receipt_scope.vendor_item.v1',
  FOOD_VENDOR_STOCK_PRODUCT: 'food_ops.vendor_item.stock_product.v1',
});
const DOMAINS = new Set(['brain', 'food_ops', 'operations']);
const SAFE_DISPOSITIONS = new Set(['hold', 'leave_unassigned', 'ignore_candidate', 'none']);
const IDENTIFIER = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const enumString = (values) => z.enum(values);
const refs = z.array(IDENTIFIER).max(50);
const evidenceCandidate = z.object({ evidenceRefs: refs }).strict();
const versionedQuestion = z.object({ schemaVersion: z.literal(1) }).strict();
const schemas = {
  [CLASS_KEYS.GMAIL_DISPOSITION]: {
    domain: 'brain', question: versionedQuestion,
    candidateSet: z.object({ schemaVersion: z.literal(1), candidates: z.array(z.object({ disposition: enumString(['business', 'personal', 'transactional', 'other']), ...evidenceCandidate.shape }).strict()).max(20) }).strict(),
    answer: z.object({ disposition: enumString(['business', 'personal', 'transactional', 'other']) }).strict(),
  },
  [CLASS_KEYS.PARTNER_VENDOR_IDENTITY]: {
    domain: 'brain', question: versionedQuestion,
    candidateSet: z.object({ schemaVersion: z.literal(1), candidates: z.array(z.object({ vendorId: IDENTIFIER, ...evidenceCandidate.shape }).strict()).max(20) }).strict(),
    answer: z.object({ outcome: enumString(['match', 'no_match']), vendorId: IDENTIFIER.nullable() }).strict(),
  },
  [CLASS_KEYS.FOOD_PACK_SIZE]: {
    domain: 'food_ops', question: versionedQuestion,
    candidateSet: z.object({ schemaVersion: z.literal(1), candidates: z.array(z.object({ ingredientFamily: IDENTIFIER, gramsPerPack: z.number().positive().max(100000), ...evidenceCandidate.shape }).strict()).max(20) }).strict(),
    answer: z.object({ ingredientFamily: IDENTIFIER, gramsPerPack: z.number().positive().max(100000) }).strict(),
  },
  [CLASS_KEYS.FOOD_RECEIPT_SCOPE]: {
    domain: 'food_ops', question: versionedQuestion,
    candidateSet: z.object({ schemaVersion: z.literal(1), candidates: z.array(z.object({ scope: enumString(['personal', 'business', 'shared', 'unknown']), ...evidenceCandidate.shape }).strict()).max(20) }).strict(),
    answer: z.object({ scope: enumString(['personal', 'business', 'shared', 'unknown']) }).strict(),
  },
  [CLASS_KEYS.FOOD_VENDOR_STOCK_PRODUCT]: {
    domain: 'food_ops', question: versionedQuestion,
    candidateSet: z.object({ schemaVersion: z.literal(1), candidates: z.array(z.object({ productId: IDENTIFIER, ...evidenceCandidate.shape }).strict()).max(30) }).strict(),
    answer: z.object({ outcome: enumString(['select', 'ignore']), productId: IDENTIFIER.nullable(), packText: z.string().trim().min(1).max(100).optional() }).strict().refine((v) => (v.outcome === 'select') === Boolean(v.productId)),
  },
};

const raiseSchema = z.object({
  domain: z.enum(['brain', 'food_ops', 'operations']), classKey: z.string().min(1).max(120),
  questionKey: IDENTIFIER, question: z.unknown(), candidateSet: z.unknown().optional(),
  safeDisposition: z.enum(['hold', 'leave_unassigned', 'ignore_candidate', 'none']),
  priorityBand: z.enum(['safety', 'money', 'time', 'routine']), raisedBy: IDENTIFIER,
  idempotencyKey: IDENTIFIER, sourceVersion: IDENTIFIER.optional(), dueAt: z.string().datetime().optional(),
  members: z.array(z.object({ subjectType: IDENTIFIER, subjectId: IDENTIFIER, evidenceRefs: refs.default([]), valueCents: z.number().int().min(0).max(100000000).optional() }).strict()).min(1).max(100),
}).strict();
const answerSchema = z.object({ answer: z.unknown(), expectedRevision: z.number().int().positive(), sourceVersion: IDENTIFIER.nullable(), idempotencyKey: IDENTIFIER }).strict();
const skipSchema = z.object({ reasonCode: z.enum(['not_relevant', 'duplicate', 'insufficient_evidence', 'incorrect_source', 'other']), expectedRevision: z.number().int().positive(), idempotencyKey: IDENTIFIER }).strict();
const PRIVACY_KEY = /(?:email|phone|address|customer|contact|body|content|raw|text|message|invoice|receipt|subject|name|description|prompt|note|transcript)/i;
const forbidden = (value) => {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(forbidden);
  return Object.entries(value).some(([key, child]) => PRIVACY_KEY.test(key) || forbidden(child));
};
const statusCodeError = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const toDate = (value) => value ? new Date(value) : null;

function receiptScopeVersion(row) {
  return createHash('sha256').update(JSON.stringify([
    row.id, row.source, row.sourceKey, new Date(row.observedAt).toISOString(), row.packCostCents,
    row.scope ?? null, row.scopeSource ?? null, row.scopeAt ? new Date(row.scopeAt).toISOString() : null,
  ])).digest('hex');
}

function safeRequest(request) {
  const schema = schemas[request.classKey];
  const question = schema?.question.safeParse(request.question);
  const candidateSet = request.candidateSet == null ? null : schema?.candidateSet?.safeParse(request.candidateSet);
  return {
    id: IDENTIFIER.safeParse(request.id).success ? request.id : null,
    domain: DOMAINS.has(request.domain) ? request.domain : null,
    classKey: schema ? request.classKey : null,
    questionKey: IDENTIFIER.safeParse(request.questionKey).success ? request.questionKey : null,
    status: ['proposed', 'queued', 'answered', 'auto_resolved', 'superseded', 'expired', 'escalated', 'conflict'].includes(request.status) ? request.status : null,
    priorityBand: ['safety', 'money', 'time', 'routine'].includes(request.priorityBand) ? request.priorityBand : null,
    question: question?.success ? question.data : null,
    candidateSet: candidateSet?.success ? candidateSet.data : null,
    safeDisposition: SAFE_DISPOSITIONS.has(request.safeDisposition) ? request.safeDisposition : null,
    sourceVersion: request.sourceVersion == null || IDENTIFIER.safeParse(request.sourceVersion).success ? request.sourceVersion : null,
    dueAt: request.dueAt, createdAt: request.createdAt, updatedAt: request.updatedAt,
    members: (request.members || []).map((member) => ({
      id: IDENTIFIER.safeParse(member.id).success ? member.id : null,
      subjectType: IDENTIFIER.safeParse(member.subjectType).success ? member.subjectType : null,
      subjectId: IDENTIFIER.safeParse(member.subjectId).success ? member.subjectId : null,
      evidenceRefs: Array.isArray(member.evidenceRefs) ? member.evidenceRefs.filter((ref) => IDENTIFIER.safeParse(ref).success) : [],
      valueCents: Number.isInteger(member.valueCents) && member.valueCents >= 0 ? member.valueCents : null,
      state: ['open', 'applied', 'skipped', 'stale', 'conflict'].includes(member.state) ? member.state : null,
      createdAt: member.createdAt,
    })),
    decisions: (request.decisions || []).map((decision) => {
      const answer = decision.answer?.skipped === true ? { skipped: true } : schema?.answer.safeParse(decision.answer);
      return {
        id: IDENTIFIER.safeParse(decision.id).success ? decision.id : null,
        revision: Number.isInteger(decision.revision) && decision.revision > 0 ? decision.revision : null,
        actorType: ['owner', 'rule', 'system'].includes(decision.actorType) ? decision.actorType : null,
        answer: answer?.success === false ? null : answer?.data ?? answer,
        reason: ['not_relevant', 'duplicate', 'insufficient_evidence', 'incorrect_source', 'other'].includes(decision.reason) ? decision.reason : null,
        applyState: ['not_requested', 'dry_run', 'applied', 'failed', 'compensated'].includes(decision.applyState) ? decision.applyState : null,
        createdAt: decision.createdAt,
      };
    }),
  };
}

async function presentRequest(request, prismaClient) {
  const result = safeRequest(request);
  if (request.classKey === CLASS_KEYS.FOOD_VENDOR_STOCK_PRODUCT && result.candidateSet?.candidates?.length && prismaClient.stockProduct?.findMany) {
    const products = await prismaClient.stockProduct.findMany({
      where: { id: { in: result.candidateSet.candidates.map((candidate) => candidate.productId) } },
      select: { id: true, key: true, name: true },
    });
    const byId = new Map(products.map((product) => [product.id, { productKey: product.key, productName: product.name }]));
    result.candidateSet = { ...result.candidateSet, candidates: result.candidateSet.candidates.map((candidate) => ({ ...candidate, ...(byId.get(candidate.productId) || {}) })) };
  }
  if (request.classKey !== CLASS_KEYS.FOOD_VENDOR_STOCK_PRODUCT || !prismaClient.vendorItem?.findMany) return result;
  const sources = await prismaClient.vendorItem.findMany({
    where: { id: { in: result.members.map((member) => member.subjectId) } },
    select: { id: true, vendorName: true, description: true, normalizedDescription: true, packText: true, stockProduct: { select: { key: true, name: true } } },
  });
  const byId = new Map(sources.map((source) => [source.id, {
    vendorName: source.vendorName, description: source.description, normalizedDescription: source.normalizedDescription,
    packText: source.packText, stockProduct: source.stockProduct ? { key: source.stockProduct.key, name: source.stockProduct.name } : null,
  }]));
  result.members = result.members.map((member) => ({ ...member, ...(byId.get(member.subjectId) || {}) }));
  return result;
}

function createOwnerReviewService({ prismaClient = prisma } = {}) {
  if (!prismaClient) throw new Error('database unavailable');
  const tx = (fn) => typeof prismaClient.$transaction === 'function' ? prismaClient.$transaction(fn) : fn(prismaClient);
  const requestInclude = { members: { orderBy: { createdAt: 'asc' } }, decisions: { orderBy: { revision: 'asc' } } };

  async function raise(input) {
    const payload = raiseSchema.parse(input);
    const schema = schemas[payload.classKey];
    if (!schema || schema.domain !== payload.domain) throw statusCodeError(400, 'review-class-invalid');
    if (!schema.question.safeParse(payload.question).success || (payload.candidateSet !== undefined && !schema.candidateSet?.safeParse(payload.candidateSet).success) || forbidden(payload.question) || forbidden(payload.candidateSet)) {
      throw statusCodeError(400, 'review-payload-invalid');
    }
    const members = payload.members.map((m) => ({ ...m, evidenceRefs: m.evidenceRefs || [], state: 'open' }));
    const where = { domain_idempotencyKey: { domain: payload.domain, idempotencyKey: payload.idempotencyKey } };
    return tx(async (db) => {
      let existing = await db.ownerReviewRequest.findUnique({ where, include: requestInclude });
      let created = false;
      if (!existing) {
        try {
          existing = await db.ownerReviewRequest.create({ data: {
            domain: payload.domain, classKey: payload.classKey, questionKey: payload.questionKey,
            status: 'queued', priorityBand: payload.priorityBand, question: payload.question,
            candidateSet: payload.candidateSet ?? null, safeDisposition: payload.safeDisposition,
            raisedBy: payload.raisedBy, idempotencyKey: payload.idempotencyKey,
            sourceVersion: payload.sourceVersion ?? null, dueAt: toDate(payload.dueAt),
            members: { create: members },
          }, include: requestInclude });
          created = true;
          await db.ownerReviewAudit.create({ data: { requestId: existing.id, eventType: 'raised', actorType: 'producer', afterRef: { status: 'queued', sourceVersion: existing.sourceVersion } } });
        } catch (error) {
          if (error?.code !== 'P2002') throw error;
          existing = await db.ownerReviewRequest.findUnique({ where, include: requestInclude });
      }
      }
      if (!existing) throw statusCodeError(409, 'review-idempotency-conflict');
      if (!created && (
        existing.classKey !== payload.classKey
        || existing.questionKey !== payload.questionKey
        || existing.priorityBand !== payload.priorityBand
        || existing.safeDisposition !== payload.safeDisposition
        || existing.raisedBy !== payload.raisedBy
        || (existing.sourceVersion ?? null) !== (payload.sourceVersion ?? null)
        || !isDeepStrictEqual(existing.question, payload.question)
        || !isDeepStrictEqual(existing.candidateSet ?? null, payload.candidateSet ?? null)
      )) throw statusCodeError(409, 'review-idempotency-conflict');
      if (!created) {
        const memberCreate = members.map(({ subjectType, subjectId, evidenceRefs, valueCents }) => ({ requestId: existing.id, subjectType, subjectId, evidenceRefs, valueCents: valueCents ?? null, state: 'open' }));
        if (memberCreate.length && db.ownerReviewMember.createMany) await db.ownerReviewMember.createMany({ data: memberCreate, skipDuplicates: true });
        else for (const data of memberCreate) {
          const duplicate = await db.ownerReviewMember.findUnique({ where: { requestId_subjectType_subjectId: { requestId: existing.id, subjectType: data.subjectType, subjectId: data.subjectId } } });
          if (!duplicate) await db.ownerReviewMember.create({ data });
        }
        const refreshed = await db.ownerReviewRequest.findUnique({ where: { id: existing.id }, include: requestInclude });
        if (refreshed.members?.length !== existing.members?.length) await db.ownerReviewAudit.create({ data: { requestId: existing.id, eventType: 'merged', actorType: 'producer', beforeRef: { memberCount: existing.members?.length || 0 }, afterRef: { memberCount: refreshed.members?.length || 0 } } });
        existing = refreshed;
      }
      return { request: await presentRequest(existing, prismaClient), created };
    });
  }

  async function queueUnmappedVendorItems(limit = 100) {
    const take = Math.min(Math.max(Number(limit) || 100, 1), 100);
    const sources = await prismaClient.vendorItem.findMany({
      where: { status: 'unmapped' },
      take,
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      select: { id: true, updatedAt: true },
    });
    if (!sources.length) return { examined: 0, created: 0 };
    const openMembers = await prismaClient.ownerReviewMember.findMany({
      where: {
        subjectType: 'vendor_item',
        subjectId: { in: sources.map((source) => source.id) },
        state: 'open',
        request: { classKey: CLASS_KEYS.FOOD_VENDOR_STOCK_PRODUCT, status: 'queued' },
      },
      select: { subjectId: true },
    });
    const alreadyQueued = new Set(openMembers.map((member) => member.subjectId));
    let created = 0;
    for (const source of sources) {
      if (alreadyQueued.has(source.id)) continue;
      const sourceVersion = source.updatedAt.toISOString();
      const result = await raise({
        domain: 'food_ops',
        classKey: CLASS_KEYS.FOOD_VENDOR_STOCK_PRODUCT,
        questionKey: 'stock_product_match',
        question: { schemaVersion: 1 },
        candidateSet: { schemaVersion: 1, candidates: [] },
        safeDisposition: 'leave_unassigned',
        priorityBand: 'routine',
        raisedBy: 'owner-review-vendor-queue',
        idempotencyKey: `vendor-item:${source.id}:${sourceVersion}`,
        sourceVersion,
        members: [{ subjectType: 'vendor_item', subjectId: source.id, evidenceRefs: [source.id] }],
      });
      if (result.created) created += 1;
    }
    return { examined: sources.length, created };
  }

  async function recordReceiptScopeDecision({ observationId, scope }) {
    if (!['business', 'personal'].includes(scope)) throw statusCodeError(400, 'review-receipt-scope-invalid');
    const observation = await prismaClient.costObservation.findUnique({
      where: { id: observationId },
      select: { id: true, source: true, sourceKey: true, observedAt: true, packCostCents: true, scope: true, scopeSource: true, scopeAt: true },
    });
    if (!observation || observation.scope !== null) throw statusCodeError(409, 'review-receipt-scope-stale');
    const sourceVersion = receiptScopeVersion(observation);
    const key = createHash('sha256').update(`${observationId}:${scope}`).digest('hex');
    const raised = await raise({
      domain: 'food_ops',
      classKey: CLASS_KEYS.FOOD_RECEIPT_SCOPE,
      questionKey: `cost-observation:${observationId}`,
      question: { schemaVersion: 1 },
      safeDisposition: 'leave_unassigned',
      priorityBand: 'money',
      raisedBy: 'food-ops-receipt-scope',
      idempotencyKey: `receipt-scope:${key}`,
      sourceVersion,
      members: [{ subjectType: 'cost_observation', subjectId: observationId, evidenceRefs: [observationId] }],
    });
    return resolve(raised.request.id, {
      answer: { scope },
      expectedRevision: 1,
      sourceVersion,
      idempotencyKey: `receipt-scope-answer:${key}`,
    }, false);
  }

  async function list({ state = 'needs_decision', domain, classKey, limit = 50 } = {}) {
    if (!['needs_decision', 'applied_shadow', 'history'].includes(state)) throw statusCodeError(400, 'review-filter-invalid');
    const where = {};
    if (state === 'needs_decision') where.status = 'queued';
    if (state === 'history') where.status = { in: ['answered', 'conflict', 'superseded', 'expired', 'escalated', 'auto_resolved'] };
    if (domain) { if (!DOMAINS.has(domain)) throw statusCodeError(400, 'review-filter-invalid'); where.domain = domain; }
    if (classKey) { if (!schemas[classKey]) throw statusCodeError(400, 'review-filter-invalid'); where.classKey = classKey; }
    const found = await prismaClient.ownerReviewRequest.findMany({ where, take: Math.min(Math.max(Number(limit) || 50, 1), 100), include: requestInclude, orderBy: [{ priorityBand: 'asc' }, { dueAt: 'asc' }, { createdAt: 'asc' }] });
    const rows = state === 'applied_shadow' ? found.filter((r) => (r.decisions || []).some((d) => ['dry_run', 'applied'].includes(d.applyState))) : found;
    const rank = { safety: 0, money: 1, time: 2, routine: 3 };
    rows.sort((a, b) => (rank[a.priorityBand] - rank[b.priorityBand]) || ((a.dueAt ? +new Date(a.dueAt) : Infinity) - (b.dueAt ? +new Date(b.dueAt) : Infinity)) || (+new Date(a.createdAt) - +new Date(b.createdAt)));
    return Promise.all(rows.map((row) => presentRequest(row, prismaClient)));
  }

  async function expireDueRequests({ now = new Date(), limit = 100 } = {}) {
    const asOf = new Date(now);
    if (!Number.isFinite(asOf.getTime())) throw statusCodeError(400, 'review-expiry-time-invalid');
    const take = Math.min(Math.max(Number(limit) || 100, 1), 100);
    return tx(async (db) => {
      const due = await db.ownerReviewRequest.findMany({
        where: { status: 'queued', dueAt: { lte: asOf } },
        take,
        orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
        select: { id: true, dueAt: true },
      });
      let expired = 0;
      for (const request of due) {
        const changed = await db.ownerReviewRequest.updateMany({
          where: { id: request.id, status: 'queued', dueAt: { lte: asOf } },
          data: { status: 'expired', resolvedAt: asOf },
        });
        if (changed.count !== 1) continue;
        await db.ownerReviewMember.updateMany({ where: { requestId: request.id, state: 'open' }, data: { state: 'expired' } });
        await db.ownerReviewAudit.create({
          data: {
            requestId: request.id,
            eventType: 'expired',
            actorType: 'system',
            beforeRef: { status: 'queued', dueAt: request.dueAt?.toISOString?.() || null },
            afterRef: { status: 'expired', expiredAt: asOf.toISOString() },
            reasonCode: 'due_at_elapsed',
          },
        });
        expired += 1;
      }
      return { examined: due.length, expired };
    });
  }

  async function resolve(id, payload, skip = false) {
    const parsed = skip ? skipSchema.parse(payload) : answerSchema.parse(payload);
    const schema = schemas[(await prismaClient.ownerReviewRequest.findUnique({ where: { id }, select: { classKey: true } }))?.classKey];
    if (!schema) throw statusCodeError(404, 'review-not-found');
    if (!skip && (!schema.answer.safeParse(parsed.answer).success || forbidden(parsed.answer))) throw statusCodeError(400, 'review-answer-invalid');
    const result = await tx(async (db) => {
      const request = await db.ownerReviewRequest.findUnique({ where: { id }, include: requestInclude });
      if (!request) throw statusCodeError(404, 'review-not-found');
      if (request.status !== 'queued' && !(request.decisions || []).some((decision) => decision.idempotencyKey === parsed.idempotencyKey)) {
        throw statusCodeError(409, 'review-not-queued');
      }
      const priorDecision = await db.ownerReviewDecision.findUnique({ where: { requestId_idempotencyKey: { requestId: id, idempotencyKey: parsed.idempotencyKey } } });
      if (priorDecision) {
        const answer = skip ? { skipped: true } : parsed.answer;
        const reason = skip ? parsed.reasonCode : null;
        if (!isDeepStrictEqual(priorDecision.answer, answer) || (priorDecision.reason ?? null) !== reason) {
          throw statusCodeError(409, 'review-decision-idempotency-conflict');
        }
        return { request: await presentRequest(await db.ownerReviewRequest.findUnique({ where: { id }, include: requestInclude }), prismaClient), replayed: true };
      }
      const latest = request.decisions?.reduce((n, d) => Math.max(n, d.revision), 0) || 0;
      let product = null;
      if (!skip && request.classKey === CLASS_KEYS.FOOD_VENDOR_STOCK_PRODUCT && parsed.answer.outcome === 'select') {
        product = await db.stockProduct.findUnique({ where: { id: parsed.answer.productId }, select: { id: true, key: true } });
        if (!product) throw statusCodeError(400, 'review-product-invalid');
      }
      let sourceConflict = false;
      if (!skip && request.classKey === CLASS_KEYS.FOOD_VENDOR_STOCK_PRODUCT) {
        const sourceIds = request.members.filter((member) => member.subjectType === 'vendor_item').map((member) => member.subjectId);
        const sources = await db.vendorItem.findMany({ where: { id: { in: sourceIds } }, select: { id: true, status: true, updatedAt: true } });
        sourceConflict = sources.length !== sourceIds.length || sources.some((source) => (
          source.status !== 'unmapped' || source.updatedAt.toISOString() !== request.sourceVersion
        ));
      }
      const receiptMember = request.members.find((item) => item.subjectType === 'cost_observation');
      let receiptObservation = null;
      if (!skip && request.classKey === CLASS_KEYS.FOOD_RECEIPT_SCOPE && receiptMember) {
        const source = await db.costObservation.findUnique({
          where: { id: receiptMember.subjectId },
          select: { id: true, source: true, sourceKey: true, observedAt: true, packCostCents: true, scope: true, scopeSource: true, scopeAt: true },
        });
        receiptObservation = source;
        sourceConflict = !source || request.members.filter((item) => item.subjectType === 'cost_observation').length !== 1
          || source.scope !== null || receiptScopeVersion(source) !== request.sourceVersion;
      }
      if (parsed.expectedRevision !== latest + 1 || (!skip && (parsed.sourceVersion ?? null) !== (request.sourceVersion ?? null)) || sourceConflict) {
        await db.ownerReviewMember.updateMany({ where: { requestId: id, state: 'open' }, data: { state: 'conflict' } });
        await db.ownerReviewAudit.create({ data: { requestId: id, eventType: 'conflict', actorType: 'owner', beforeRef: { status: request.status, sourceVersion: request.sourceVersion, revision: latest }, afterRef: { expectedRevision: parsed.expectedRevision, sourceVersion: parsed.sourceVersion ?? null }, reasonCode: 'source_version_or_revision_conflict' } });
        await db.ownerReviewRequest.update({ where: { id }, data: { status: 'conflict' } });
        return { conflict: true };
      }
      let applyState = 'not_requested';
      if (!skip && request.classKey === CLASS_KEYS.FOOD_VENDOR_STOCK_PRODUCT) {
        const expectedUpdatedAt = new Date(request.sourceVersion);
        for (const member of request.members.filter((item) => item.subjectType === 'vendor_item')) {
          if (parsed.answer.outcome === 'ignore') await catalog.ignoreVendorItem(db, member.subjectId, expectedUpdatedAt);
          else await catalog.mapVendorItem(db, member.subjectId, { stockProductKey: product.key, packText: parsed.answer.packText }, expectedUpdatedAt);
        }
        applyState = 'applied';
      }
      if (!skip && request.classKey === CLASS_KEYS.FOOD_RECEIPT_SCOPE && receiptObservation && ['business', 'personal'].includes(parsed.answer.scope)) {
        const applied = await db.costObservation.updateMany({
          where: { id: receiptObservation.id, scope: null },
          data: { scope: parsed.answer.scope, scopeSource: 'owner', scopeAt: new Date() },
        });
        if (applied.count !== 1) {
          await db.ownerReviewMember.updateMany({ where: { requestId: id, state: 'open' }, data: { state: 'conflict' } });
          await db.ownerReviewAudit.create({ data: { requestId: id, eventType: 'conflict', actorType: 'owner', beforeRef: { status: request.status, sourceVersion: request.sourceVersion, revision: latest }, afterRef: { reason: 'source_version_changed' }, reasonCode: 'source_version_changed' } });
          await db.ownerReviewRequest.update({ where: { id }, data: { status: 'conflict' } });
          return { conflict: true };
        }
        applyState = 'applied';
      }
      const decision = await db.ownerReviewDecision.create({ data: { requestId: id, revision: latest + 1, actorType: 'owner', answer: skip ? { skipped: true } : parsed.answer, reason: skip ? parsed.reasonCode : null, applyState, idempotencyKey: parsed.idempotencyKey } });
      await db.ownerReviewRequest.update({ where: { id }, data: { status: 'answered', resolvedAt: new Date() } });
      await db.ownerReviewMember.updateMany({ where: { requestId: id, state: 'open' }, data: { state: skip ? 'skipped' : applyState === 'applied' ? 'applied' : 'open' } });
      await db.ownerReviewAudit.create({ data: { requestId: id, decisionId: decision.id, eventType: 'answered', actorType: 'owner', beforeRef: { status: request.status, revision: latest }, afterRef: { status: 'answered', revision: latest + 1, skipped: skip, applyState }, reasonCode: skip ? parsed.reasonCode : null } });
      return { request: await presentRequest(await db.ownerReviewRequest.findUnique({ where: { id }, include: requestInclude }), prismaClient) };
    });
    if (result.conflict) throw statusCodeError(409, 'review-source-version-conflict');
    return result.request;
  }

  return { raise, queueUnmappedVendorItems, recordReceiptScopeDecision, expireDueRequests, list, answer: (id, payload) => resolve(id, payload, false), skip: (id, payload) => resolve(id, payload, true) };
}

function createOwnerReviewRouter({ logger = null, prismaClient = prisma, verifyAdminRequest = createAdminVerifier(), service = null } = {}) {
  const router = express.Router();
  const reviewService = service || createOwnerReviewService({ prismaClient });
  const guarded = (handler) => async (req, res) => {
    const admin = await verifyAdminRequest(req);
    if (!admin) return res.status(401).json({ error: 'review-admin-unauthorized' });
    try { return await handler(req, res, admin); }
    catch (error) {
      logger?.error?.({ err: error, path: req.path }, 'owner review route failed');
      if (error?.name === 'ZodError') return res.status(400).json({ error: 'review-request-invalid', details: error.issues });
      return res.status(error?.statusCode || 500).json({ error: error?.message || 'internal-error' });
    }
  };
  router.get('/', guarded(async (req, res) => res.json({ ok: true, reviews: await reviewService.list({ state: req.query.state, domain: req.query.domain, classKey: req.query.classKey, limit: req.query.limit }) })));
  router.post('/raise', guarded(async (req, res) => {
    const result = await reviewService.raise(req.body || {});
    return res.status(result.created ? 201 : 200).json({ ok: true, ...result });
  }));
  router.post('/expire-due', guarded(async (_req, res) => res.json({ ok: true, ...await reviewService.expireDueRequests() })));
  router.post('/:id/answer', guarded(async (req, res) => res.json({ ok: true, review: await reviewService.answer(req.params.id, req.body || {}) })));
  router.post('/:id/skip', guarded(async (req, res) => res.json({ ok: true, review: await reviewService.skip(req.params.id, req.body || {}) })));
  return router;
}

module.exports = { CLASS_KEYS, CLASS_SCHEMAS: schemas, createOwnerReviewService, createOwnerReviewRouter };
