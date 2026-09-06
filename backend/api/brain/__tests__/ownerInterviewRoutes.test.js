import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import ownerInterviewRoutesModule from '../ownerInterviewRoutes';
import ownerInterviewDefinitionModule from '../ownerInterviewDefinition';

const { registerOwnerInterviewRoutes } = ownerInterviewRoutesModule;
const { OWNER_INTERVIEW_DEFINITION, getQuestionIds } = ownerInterviewDefinitionModule;

const OWNER = { id: 'owner-user-1', email: 'Owner@Example.com' };

// Minimal in-memory stand-in for the two interview tables. Every other Prisma
// model is proxied so any attempt to touch the ledger, graph, inbox, inference,
// or an operational table fails the test instead of silently writing.
function createPrismaDouble() {
  const sessions = [];
  const answers = [];
  const nextId = () => randomUUID();

  const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => {
    if (key === 'NOT') return !matches(row, value);
    if (value === null) return row[key] === null || row[key] === undefined;
    return row[key] === value;
  });

  const applyData = (row, data) => {
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && 'increment' in value) row[key] = (row[key] || 0) + value.increment;
      else row[key] = value;
    }
    row.updatedAt = new Date();
  };

  const sortDesc = (rows, orderBy) => {
    const field = orderBy ? Object.keys(orderBy)[0] : null;
    if (!field) return rows;
    return [...rows].sort((a, b) => new Date(b[field]).getTime() - new Date(a[field]).getTime());
  };

  const table = (rows, defaults) => ({
    findFirst: async ({ where, orderBy } = {}) => sortDesc(rows.filter((row) => matches(row, where)), orderBy)[0] || null,
    findMany: async ({ where } = {}) => rows.filter((row) => matches(row, where)),
    findUnique: async ({ where }) => rows.find((row) => row.id === where.id) || null,
    count: async ({ where } = {}) => rows.filter((row) => matches(row, where)).length,
    create: async ({ data }) => {
      const row = { id: nextId(), createdAt: new Date(), updatedAt: new Date(), ...defaults.values, ...data };
      if (defaults.unique) {
        const clash = rows.find((existing) => defaults.unique(existing, row));
        if (clash) {
          const error = new Error('Unique constraint failed');
          error.code = 'P2002';
          throw error;
        }
      }
      rows.push(row);
      return { ...row };
    },
    updateMany: async ({ where, data }) => {
      const target = rows.filter((row) => matches(row, where));
      target.forEach((row) => applyData(row, data));
      return { count: target.length };
    },
  });

  const models = {
    brainOwnerInterviewSession: table(sessions, {
      prefix: 'session',
      values: { status: 'in_progress', revision: 0, submittedAt: null },
      unique: (existing, row) => existing.respondentUserId === row.respondentUserId
        && existing.interviewKey === row.interviewKey
        && existing.status === 'in_progress'
        && row.status === 'in_progress',
    }),
    brainOwnerInterviewAnswer: table(answers, {
      prefix: 'answer',
      values: {
        knowledgeKind: null,
        confidence: null,
        applicability: [],
        asOfDate: null,
        sourceReference: null,
        caveats: null,
        sensitivity: 'confidential_business',
        disposition: 'draft',
        supersedesId: null,
        supersededAt: null,
        submittedAt: null,
      },
      unique: (existing, row) => existing.sessionId === row.sessionId
        && existing.questionId === row.questionId
        && !existing.supersededAt
        && !row.supersededAt,
    }),
    $transaction: async (operation) => operation(prisma),
  };

  const prisma = new Proxy(models, {
    get(target, property) {
      if (property in target) return target[property];
      if (typeof property === 'string' && property.startsWith('brain')) {
        throw new Error(`Interview routes must not touch ${property}`);
      }
      if (typeof property === 'string' && !property.startsWith('$') && property !== 'then') {
        throw new Error(`Interview routes must not touch ${property}`);
      }
      return undefined;
    },
  });

  return { prisma, sessions, answers };
}

function buildApp({ owner = OWNER, prismaDouble = createPrismaDouble() } = {}) {
  const app = express();
  app.use(express.json());
  registerOwnerInterviewRoutes(app, {
    prisma: prismaDouble.prisma,
    verifyOwnerRequestForRoutes: async (req) => (req.headers.authorization === 'Bearer owner-token' ? owner : null),
  });
  return { app, prismaDouble };
}

async function startSession(app) {
  const response = await request(app).post('/api/brain/owner-interview/sessions').set('Authorization', 'Bearer owner-token');
  expect(response.status).toBe(200);
  return response.body;
}

function answeredBody(expectedRevision, overrides = {}) {
  return {
    expectedRevision,
    responseText: 'A specific operating observation with its context.',
    knowledgeKind: 'owner_experience',
    confidence: 'context_dependent',
    applicability: ['local_effort'],
    asOfDate: '2026-09-01',
    sensitivity: 'confidential_business',
    disposition: 'answered',
    ...overrides,
  };
}

describe('owner interview definition', () => {
  it('publishes a versioned, comprehensive, provenance-requiring question set', () => {
    const ids = getQuestionIds(OWNER_INTERVIEW_DEFINITION);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(60);
    expect(OWNER_INTERVIEW_DEFINITION.modules.length).toBeGreaterThanOrEqual(10);
    expect(OWNER_INTERVIEW_DEFINITION.version).toBeGreaterThanOrEqual(1);

    for (const module of OWNER_INTERVIEW_DEFINITION.modules) {
      expect(module.questions.length).toBeGreaterThan(0);
      for (const question of module.questions) {
        expect(question.prompt.trim().length).toBeGreaterThan(0);
        expect(question.purpose.trim().length).toBeGreaterThan(0);
        expect(question.allowedScope.length).toBeGreaterThan(0);
        expect(question.sensitivityCeiling).toBe('confidential_business');
        expect(question.freshness.asOfRequired).toBe(true);
      }
    }
  });
});

describe('owner interview authorization', () => {
  it('refuses every method without owner identity and never caches responses', async () => {
    const { app } = buildApp();
    const calls = [
      ['post', '/api/brain/owner-interview/sessions'],
      ['patch', '/api/brain/owner-interview/sessions/2a1c2d3e-4f56-4789-89ab-0123456789ab'],
      ['put', '/api/brain/owner-interview/sessions/2a1c2d3e-4f56-4789-89ab-0123456789ab/answers/decision-threshold'],
      ['post', '/api/brain/owner-interview/sessions/2a1c2d3e-4f56-4789-89ab-0123456789ab/complete'],
      ['post', '/api/brain/owner-interview/sessions/2a1c2d3e-4f56-4789-89ab-0123456789ab/reopen'],
    ];

    for (const [method, path] of calls) {
      const denied = await request(app)[method](path).set('Authorization', 'Bearer staff-token');
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe('owner_only');
      expect(denied.headers['cache-control']).toBe('private, no-store');
    }
  });

  it('refuses to read or write another respondent session', async () => {
    const first = buildApp();
    const created = await startSession(first.app);
    const second = buildApp({ owner: { id: 'other-user', email: 'other@example.com' }, prismaDouble: first.prismaDouble });

    const response = await request(second.app)
      .patch(`/api/brain/owner-interview/sessions/${created.session.id}`)
      .set('Authorization', 'Bearer owner-token')
      .send({ currentQuestionId: 'decision-threshold', expectedRevision: 0 });
    expect(response.status).toBe(404);
  });
});

describe('owner interview session lifecycle', () => {
  it('resumes one in-progress session instead of creating another', async () => {
    const { app, prismaDouble } = buildApp();
    const first = await startSession(app);
    const second = await startSession(app);

    expect(second.session.id).toBe(first.session.id);
    expect(prismaDouble.sessions).toHaveLength(1);
    expect(first.session.respondentEmail).toBe('owner@example.com');
    expect(first.session.currentQuestionId).toBe(getQuestionIds(OWNER_INTERVIEW_DEFINITION)[0]);
    expect(first.definition.version).toBe(OWNER_INTERVIEW_DEFINITION.version);
  });

  it('records the cursor and rejects a stale session revision', async () => {
    const { app } = buildApp();
    const created = await startSession(app);

    const moved = await request(app)
      .patch(`/api/brain/owner-interview/sessions/${created.session.id}`)
      .set('Authorization', 'Bearer owner-token')
      .send({ currentQuestionId: 'decision-threshold', expectedRevision: created.session.revision });
    expect(moved.status).toBe(200);
    expect(moved.body.session.currentQuestionId).toBe('decision-threshold');
    expect(moved.body.session.revision).toBe(created.session.revision + 1);

    const stale = await request(app)
      .patch(`/api/brain/owner-interview/sessions/${created.session.id}`)
      .set('Authorization', 'Bearer owner-token')
      .send({ currentQuestionId: 'decision-uncertainty', expectedRevision: created.session.revision });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('revision_conflict');
    expect(stale.body.session.currentQuestionId).toBe('decision-threshold');
  });
});

describe('owner interview answers', () => {
  it('requires complete provenance before an answer counts as answered', async () => {
    const { app } = buildApp();
    const created = await startSession(app);
    const url = `/api/brain/owner-interview/sessions/${created.session.id}/answers/decision-threshold`;

    const missing = await request(app)
      .put(url)
      .set('Authorization', 'Bearer owner-token')
      .send({ expectedRevision: 0, responseText: 'Something', disposition: 'answered' });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('invalid_answer');
    expect(missing.body.error.details.join(' ')).toMatch(/knowledgeKind is required/);

    const externalWithoutSource = await request(app)
      .put(url)
      .set('Authorization', 'Bearer owner-token')
      .send(answeredBody(0, { knowledgeKind: 'external_claim' }));
    expect(externalWithoutSource.status).toBe(400);
    expect(externalWithoutSource.body.error.details.join(' ')).toMatch(/sourceReference is required/);

    const heuristicWithoutCaveats = await request(app)
      .put(url)
      .set('Authorization', 'Bearer owner-token')
      .send(answeredBody(0, { knowledgeKind: 'judgment_heuristic' }));
    expect(heuristicWithoutCaveats.status).toBe(400);
    expect(heuristicWithoutCaveats.body.error.details.join(' ')).toMatch(/caveats/);

    const unsupportedScope = await request(app)
      .put(`/api/brain/owner-interview/sessions/${created.session.id}/answers/le-capacity-unit`)
      .set('Authorization', 'Bearer owner-token')
      .send(answeredBody(0, { applicability: ['general_food_industry'] }));
    expect(unsupportedScope.status).toBe(400);
    expect(unsupportedScope.body.error.details.join(' ')).toMatch(/unsupported scope/);

    const futureDate = await request(app)
      .put(url)
      .set('Authorization', 'Bearer owner-token')
      .send(answeredBody(0, { asOfDate: '2999-01-01' }));
    expect(futureDate.status).toBe(400);
    expect(futureDate.body.error.details.join(' ')).toMatch(/cannot be in the future/);
  });

  it('supersedes revisions in place and rejects a stale answer revision', async () => {
    const { app, prismaDouble } = buildApp();
    const created = await startSession(app);
    const url = `/api/brain/owner-interview/sessions/${created.session.id}/answers/decision-threshold`;

    const first = await request(app)
      .put(url)
      .set('Authorization', 'Bearer owner-token')
      .send({ expectedRevision: 0, responseText: 'First draft', disposition: 'draft' });
    expect(first.status).toBe(200);
    const firstAnswer = first.body.answers.find((answer) => answer.questionId === 'decision-threshold');
    expect(firstAnswer.revision).toBe(1);

    const second = await request(app)
      .put(url)
      .set('Authorization', 'Bearer owner-token')
      .send({ expectedRevision: 1, responseText: 'Second draft', disposition: 'draft' });
    expect(second.status).toBe(200);
    const secondAnswer = second.body.answers.find((answer) => answer.questionId === 'decision-threshold');
    expect(secondAnswer.revision).toBe(2);
    expect(secondAnswer.supersedesId).toBe(firstAnswer.id);
    expect(second.body.answers.filter((answer) => answer.questionId === 'decision-threshold')).toHaveLength(1);
    expect(prismaDouble.answers).toHaveLength(2);

    const stale = await request(app)
      .put(url)
      .set('Authorization', 'Bearer owner-token')
      .send({ expectedRevision: 1, responseText: 'Conflicting draft', disposition: 'draft' });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('revision_conflict');
    expect(stale.body.answer.responseText).toBe('Second draft');
  });
});

describe('owner interview completion', () => {
  async function resolveEveryQuestion(app, sessionId) {
    for (const questionId of getQuestionIds(OWNER_INTERVIEW_DEFINITION)) {
      const response = await request(app)
        .put(`/api/brain/owner-interview/sessions/${sessionId}/answers/${questionId}`)
        .set('Authorization', 'Bearer owner-token')
        .send({ expectedRevision: 0, responseText: '', disposition: 'deferred' });
      expect(response.status).toBe(200);
    }
  }

  it('blocks completion until every question has a final disposition', async () => {
    const { app } = buildApp();
    const created = await startSession(app);

    const early = await request(app)
      .post(`/api/brain/owner-interview/sessions/${created.session.id}/complete`)
      .set('Authorization', 'Bearer owner-token')
      .send({});
    expect(early.status).toBe(400);
    expect(early.body.error.code).toBe('interview_incomplete');
    expect(early.body.error.details.length).toBe(getQuestionIds(OWNER_INTERVIEW_DEFINITION).length);
  });

  it('freezes submitted revisions, then reopens for correction', async () => {
    const { app, prismaDouble } = buildApp();
    const created = await startSession(app);
    await resolveEveryQuestion(app, created.session.id);

    const completed = await request(app)
      .post(`/api/brain/owner-interview/sessions/${created.session.id}/complete`)
      .set('Authorization', 'Bearer owner-token')
      .send({});
    expect(completed.status).toBe(200);
    expect(completed.body.session.status).toBe('submitted');
    expect(completed.body.answers.every((answer) => answer.submittedAt)).toBe(true);

    const blockedSave = await request(app)
      .put(`/api/brain/owner-interview/sessions/${created.session.id}/answers/decision-threshold`)
      .set('Authorization', 'Bearer owner-token')
      .send({ expectedRevision: 1, responseText: 'After submission', disposition: 'draft' });
    expect(blockedSave.status).toBe(409);

    const reopened = await request(app)
      .post(`/api/brain/owner-interview/sessions/${created.session.id}/reopen`)
      .set('Authorization', 'Bearer owner-token')
      .send({ expectedRevision: completed.body.session.revision });
    expect(reopened.status).toBe(200);
    expect(reopened.body.session.status).toBe('in_progress');
    expect(reopened.body.session.submittedAt).toBeNull();

    const corrected = await request(app)
      .put(`/api/brain/owner-interview/sessions/${created.session.id}/answers/decision-threshold`)
      .set('Authorization', 'Bearer owner-token')
      .send(answeredBody(1, { responseText: 'Corrected after reopening.' }));
    expect(corrected.status).toBe(200);
    const answer = corrected.body.answers.find((item) => item.questionId === 'decision-threshold');
    expect(answer.revision).toBe(2);
    expect(answer.disposition).toBe('answered');

    // Only the two interview tables were ever written.
    expect(prismaDouble.sessions).toHaveLength(1);
    expect(prismaDouble.answers.length).toBe(getQuestionIds(OWNER_INTERVIEW_DEFINITION).length + 1);
  });
});
