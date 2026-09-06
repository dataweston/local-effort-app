'use strict';

const { getPrisma } = require('../utils/prisma');
const { createOwnerVerifier } = require('../utils/adminVerifier');
const {
  APPLICABILITY,
  ALL_KNOWLEDGE_KINDS,
  OWNER_INTERVIEW_DEFINITION,
  findQuestion,
  getQuestionIds,
} = require('./ownerInterviewDefinition');

const verifyOwnerRequest = createOwnerVerifier();

const CONFIDENCE_VALUES = Object.freeze(['firm', 'context_dependent', 'tentative']);
const SENSITIVITY_VALUES = Object.freeze(['internal', 'confidential_business', 'external_shareable']);
const DISPOSITION_VALUES = Object.freeze(['draft', 'answered', 'deferred', 'not_known']);
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUESTION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ANSWER_FIELDS = new Set([
  'expectedRevision',
  'responseText',
  'knowledgeKind',
  'confidence',
  'applicability',
  'asOfDate',
  'sourceReference',
  'caveats',
  'sensitivity',
  'disposition',
]);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function definitionSnapshot(definition) {
  return JSON.parse(JSON.stringify(definition));
}

function dateOnly(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function serializeSession(session) {
  return {
    id: session.id,
    interviewKey: session.interviewKey,
    definitionVersion: session.definitionVersion,
    respondentUserId: session.respondentUserId,
    respondentEmail: session.respondentEmail,
    status: session.status,
    currentQuestionId: session.currentQuestionId,
    revision: session.revision,
    startedAt: session.startedAt,
    submittedAt: session.submittedAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function serializeAnswer(answer) {
  return {
    id: answer.id,
    sessionId: answer.sessionId,
    questionId: answer.questionId,
    revision: answer.revision,
    responseText: answer.responseText,
    knowledgeKind: answer.knowledgeKind,
    confidence: answer.confidence,
    applicability: answer.applicability || [],
    asOfDate: dateOnly(answer.asOfDate),
    sourceReference: answer.sourceReference,
    caveats: answer.caveats,
    sensitivity: answer.sensitivity,
    disposition: answer.disposition,
    supersedesId: answer.supersedesId,
    supersededAt: answer.supersededAt,
    submittedAt: answer.submittedAt,
    createdAt: answer.createdAt,
    updatedAt: answer.updatedAt,
  };
}

function sortAnswers(definition, answers) {
  const order = new Map(getQuestionIds(definition).map((id, index) => [id, index]));
  return [...answers].sort((a, b) => {
    const left = order.has(a.questionId) ? order.get(a.questionId) : Number.MAX_SAFE_INTEGER;
    const right = order.has(b.questionId) ? order.get(b.questionId) : Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}

async function loadBundle(prisma, session) {
  const definition = session.definitionSnapshot;
  const answers = await prisma.brainOwnerInterviewAnswer.findMany({
    where: { sessionId: session.id, supersededAt: null },
  });
  return {
    ok: true,
    definition,
    session: serializeSession(session),
    answers: sortAnswers(definition, answers).map(serializeAnswer),
  };
}

function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details !== undefined) error.details = details;
  return res.status(status).json({ ok: false, error });
}

function unknownFields(body, allowedFields) {
  return Object.keys(body || {}).filter((key) => !allowedFields.has(key));
}

function parseExpectedRevision(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function parseDateOnly(value, currentTime) {
  if (value === null || value === undefined || value === '') return { value: null };
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: 'asOfDate must use YYYY-MM-DD.' };
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { error: 'asOfDate must be a real calendar date.' };
  }
  const today = new Date(currentTime).toISOString().slice(0, 10);
  if (value > today) return { error: 'asOfDate cannot be in the future.' };
  return { value: parsed };
}

function optionalString(body, key, maxLength, errors) {
  const supplied = body[key];
  if (supplied === undefined || supplied === null) return null;
  if (typeof supplied !== 'string') {
    errors.push(`${key} must be a string.`);
    return null;
  }
  if (supplied.length > maxLength) errors.push(`${key} must be at most ${maxLength} characters.`);
  return supplied;
}

function validateAnswerInput(body, question, currentTime) {
  const errors = [];
  const extras = unknownFields(body, ANSWER_FIELDS);
  if (extras.length > 0) errors.push(`Unknown field${extras.length === 1 ? '' : 's'}: ${extras.join(', ')}.`);

  const expectedRevision = parseExpectedRevision(body.expectedRevision);
  if (expectedRevision === null) errors.push('expectedRevision must be a non-negative integer.');

  const disposition = body.disposition;
  if (!DISPOSITION_VALUES.includes(disposition)) {
    errors.push(`disposition must be one of: ${DISPOSITION_VALUES.join(', ')}.`);
  }

  const responseText = optionalString(body, 'responseText', 50000, errors) || '';
  const sourceReference = optionalString(body, 'sourceReference', 2000, errors);
  const caveats = optionalString(body, 'caveats', 5000, errors);

  const knowledgeKind = body.knowledgeKind === '' || body.knowledgeKind === undefined
    ? null
    : body.knowledgeKind;
  if (knowledgeKind !== null && !ALL_KNOWLEDGE_KINDS.includes(knowledgeKind)) {
    errors.push(`knowledgeKind must be one of: ${ALL_KNOWLEDGE_KINDS.join(', ')}.`);
  }

  const confidence = body.confidence === '' || body.confidence === undefined ? null : body.confidence;
  if (confidence !== null && !CONFIDENCE_VALUES.includes(confidence)) {
    errors.push(`confidence must be one of: ${CONFIDENCE_VALUES.join(', ')}.`);
  }

  let applicability = [];
  if (body.applicability !== undefined) {
    if (!Array.isArray(body.applicability)) {
      errors.push('applicability must be an array.');
    } else {
      applicability = body.applicability;
      if (new Set(applicability).size !== applicability.length) {
        errors.push('applicability values must be unique.');
      }
      const invalid = applicability.filter(
        (value) => !APPLICABILITY.includes(value) || !question.allowedScope.includes(value)
      );
      if (invalid.length > 0) errors.push(`applicability contains unsupported scope: ${invalid.join(', ')}.`);
    }
  }

  const sensitivity = body.sensitivity || 'confidential_business';
  if (!SENSITIVITY_VALUES.includes(sensitivity)) {
    errors.push(`sensitivity must be one of: ${SENSITIVITY_VALUES.join(', ')}.`);
  }

  const parsedDate = parseDateOnly(body.asOfDate, currentTime);
  if (parsedDate.error) errors.push(parsedDate.error);

  if (disposition === 'answered') {
    if (!responseText.trim()) errors.push('responseText is required when disposition is answered.');
    if (!knowledgeKind) errors.push('knowledgeKind is required when disposition is answered.');
    if (!confidence) errors.push('confidence is required when disposition is answered.');
    if (applicability.length === 0) errors.push('applicability must be nonempty when disposition is answered.');
    if (question.freshness?.asOfRequired && !parsedDate.value) {
      errors.push('asOfDate is required for this question when disposition is answered.');
    }
    if (['observed_fact', 'external_claim'].includes(knowledgeKind) && !sourceReference?.trim()) {
      errors.push(`sourceReference is required for ${knowledgeKind}.`);
    }
    if (['judgment_heuristic', 'hypothesis'].includes(knowledgeKind) && !caveats?.trim()) {
      errors.push(`caveats describing boundaries or disconfirmation are required for ${knowledgeKind}.`);
    }
  }

  return {
    errors,
    value: {
      expectedRevision,
      responseText,
      knowledgeKind,
      confidence,
      applicability,
      asOfDate: parsedDate.value || null,
      sourceReference,
      caveats,
      sensitivity,
      disposition,
    },
  };
}

function validateCurrentAnswer(answer, question, currentTime) {
  return validateAnswerInput(
    {
      expectedRevision: answer.revision,
      responseText: answer.responseText,
      knowledgeKind: answer.knowledgeKind,
      confidence: answer.confidence,
      applicability: answer.applicability,
      asOfDate: dateOnly(answer.asOfDate),
      sourceReference: answer.sourceReference,
      caveats: answer.caveats,
      sensitivity: answer.sensitivity,
      disposition: answer.disposition,
    },
    question,
    currentTime
  ).errors;
}

function isUniqueViolation(error) {
  return error?.code === 'P2002';
}

function isSerializationFailure(error) {
  return error?.code === 'P2034';
}

async function runSerializable(prisma, operation, attempts = 3) {
  try {
    return await prisma.$transaction(operation, { isolationLevel: 'Serializable' });
  } catch (error) {
    if (attempts > 1 && isSerializationFailure(error)) {
      return runSerializable(prisma, operation, attempts - 1);
    }
    throw error;
  }
}

async function ownedSession(prisma, id, owner) {
  const session = await prisma.brainOwnerInterviewSession.findUnique({ where: { id } });
  return session?.respondentUserId === owner.id ? session : null;
}

async function sendRevisionConflict(res, prisma, session, currentAnswer) {
  const bundle = await loadBundle(prisma, session);
  return res.status(409).json({
    ...bundle,
    ok: false,
    error: {
      code: 'revision_conflict',
      message: 'The interview changed elsewhere. Use the authoritative record and retry.',
    },
    ...(currentAnswer !== undefined ? { answer: currentAnswer ? serializeAnswer(currentAnswer) : null } : {}),
  });
}

function registerOwnerInterviewRoutes(
  app,
  {
    logger,
    prisma: prismaForRoutes = getPrisma(),
    verifyOwnerRequestForRoutes = verifyOwnerRequest,
    definition = OWNER_INTERVIEW_DEFINITION,
    now = () => new Date(),
  } = {}
) {
  app.use('/api/brain/owner-interview', (_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });

  async function authorize(req, res) {
    const owner = await verifyOwnerRequestForRoutes(req);
    if (!owner?.id || !owner?.email) {
      sendError(res, 403, 'owner_only', 'Owner authorization is required.');
      return null;
    }
    if (!prismaForRoutes) {
      sendError(res, 503, 'database_unavailable', 'Interview storage is unavailable.');
      return null;
    }
    return { id: String(owner.id), email: normalizeEmail(owner.email) };
  }

  app.post('/api/brain/owner-interview/sessions', async (req, res) => {
    try {
      const owner = await authorize(req, res);
      if (!owner) return undefined;
      const extras = unknownFields(req.body || {}, new Set());
      if (extras.length > 0) {
        return sendError(res, 400, 'invalid_request', 'The session body must be empty.', { fields: extras });
      }

      let session;
      try {
        session = await runSerializable(prismaForRoutes, async (tx) => {
          const active = await tx.brainOwnerInterviewSession.findFirst({
            where: {
              respondentUserId: owner.id,
              interviewKey: definition.interviewKey,
              status: 'in_progress',
            },
            orderBy: { updatedAt: 'desc' },
          });
          if (active) return active;

          const firstQuestionId = getQuestionIds(definition)[0];
          if (!firstQuestionId) throw new Error('Owner interview definition has no questions.');
          return tx.brainOwnerInterviewSession.create({
            data: {
              interviewKey: definition.interviewKey,
              definitionVersion: definition.version,
              definitionSnapshot: definitionSnapshot(definition),
              respondentUserId: owner.id,
              respondentEmail: owner.email,
              status: 'in_progress',
              currentQuestionId: firstQuestionId,
              revision: 0,
              startedAt: now(),
            },
          });
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        session = await prismaForRoutes.brainOwnerInterviewSession.findFirst({
          where: {
            respondentUserId: owner.id,
            interviewKey: definition.interviewKey,
            status: 'in_progress',
          },
          orderBy: { updatedAt: 'desc' },
        });
        if (!session) throw error;
      }

      return res.json(await loadBundle(prismaForRoutes, session));
    } catch (error) {
      logger?.error({ err: error }, 'brain/owner-interview create-or-resume error');
      return sendError(res, 500, 'interview_error', 'Unable to create or resume the interview.');
    }
  });

  app.patch('/api/brain/owner-interview/sessions/:id', async (req, res) => {
    try {
      const owner = await authorize(req, res);
      if (!owner) return undefined;
      if (!SESSION_ID_PATTERN.test(req.params.id)) {
        return sendError(res, 400, 'invalid_session_id', 'Session id is invalid.');
      }
      const extras = unknownFields(req.body || {}, new Set(['currentQuestionId', 'expectedRevision']));
      if (extras.length > 0) {
        return sendError(res, 400, 'invalid_request', 'Unexpected cursor fields.', { fields: extras });
      }
      const expectedRevision = parseExpectedRevision(req.body?.expectedRevision);
      if (expectedRevision === null) {
        return sendError(res, 400, 'invalid_revision', 'expectedRevision must be a non-negative integer.');
      }

      const session = await ownedSession(prismaForRoutes, req.params.id, owner);
      if (!session) return sendError(res, 404, 'session_not_found', 'Interview session was not found.');
      const questionId = req.body?.currentQuestionId;
      if (!QUESTION_ID_PATTERN.test(String(questionId || '')) || !findQuestion(session.definitionSnapshot, questionId)) {
        return sendError(res, 400, 'invalid_question_id', 'currentQuestionId is not in this session definition.');
      }
      if (session.revision !== expectedRevision || session.status !== 'in_progress') {
        return sendRevisionConflict(res, prismaForRoutes, session);
      }

      const changed = await prismaForRoutes.brainOwnerInterviewSession.updateMany({
        where: {
          id: session.id,
          respondentUserId: owner.id,
          status: 'in_progress',
          revision: expectedRevision,
        },
        data: {
          currentQuestionId: questionId,
          revision: { increment: 1 },
        },
      });
      const current = await ownedSession(prismaForRoutes, session.id, owner);
      if (changed.count !== 1) return sendRevisionConflict(res, prismaForRoutes, current || session);
      return res.json(await loadBundle(prismaForRoutes, current));
    } catch (error) {
      logger?.error({ err: error }, 'brain/owner-interview cursor error');
      return sendError(res, 500, 'interview_error', 'Unable to save the interview cursor.');
    }
  });

  app.put('/api/brain/owner-interview/sessions/:id/answers/:questionId', async (req, res) => {
    let owner;
    let session;
    try {
      owner = await authorize(req, res);
      if (!owner) return undefined;
      if (!SESSION_ID_PATTERN.test(req.params.id)) {
        return sendError(res, 400, 'invalid_session_id', 'Session id is invalid.');
      }
      if (!QUESTION_ID_PATTERN.test(req.params.questionId)) {
        return sendError(res, 400, 'invalid_question_id', 'Question id is invalid.');
      }

      session = await ownedSession(prismaForRoutes, req.params.id, owner);
      if (!session) return sendError(res, 404, 'session_not_found', 'Interview session was not found.');
      const question = findQuestion(session.definitionSnapshot, req.params.questionId);
      if (!question) return sendError(res, 400, 'invalid_question_id', 'Question is not in this session definition.');
      if (session.status !== 'in_progress') {
        const current = await prismaForRoutes.brainOwnerInterviewAnswer.findFirst({
          where: { sessionId: session.id, questionId: req.params.questionId, supersededAt: null },
        });
        return sendRevisionConflict(res, prismaForRoutes, session, current);
      }

      const validated = validateAnswerInput(req.body || {}, question, now());
      if (validated.errors.length > 0) {
        return sendError(res, 400, 'invalid_answer', 'Answer validation failed.', validated.errors);
      }

      const result = await runSerializable(prismaForRoutes, async (tx) => {
        const transactionSession = await tx.brainOwnerInterviewSession.findUnique({ where: { id: session.id } });
        if (!transactionSession || transactionSession.respondentUserId !== owner.id) return { state: 'missing' };
        const current = await tx.brainOwnerInterviewAnswer.findFirst({
          where: { sessionId: session.id, questionId: req.params.questionId, supersededAt: null },
        });
        const currentRevision = current?.revision || 0;
        if (transactionSession.status !== 'in_progress' || currentRevision !== validated.value.expectedRevision) {
          return { state: 'conflict', session: transactionSession, answer: current };
        }

        const savedAt = now();
        if (current) {
          const superseded = await tx.brainOwnerInterviewAnswer.updateMany({
            where: { id: current.id, revision: current.revision, supersededAt: null },
            data: { supersededAt: savedAt },
          });
          if (superseded.count !== 1) {
            const authoritative = await tx.brainOwnerInterviewAnswer.findFirst({
              where: { sessionId: session.id, questionId: req.params.questionId, supersededAt: null },
            });
            return { state: 'conflict', session: transactionSession, answer: authoritative };
          }
        }

        const answer = await tx.brainOwnerInterviewAnswer.create({
          data: {
            sessionId: session.id,
            questionId: req.params.questionId,
            revision: currentRevision + 1,
            responseText: validated.value.responseText,
            knowledgeKind: validated.value.knowledgeKind,
            confidence: validated.value.confidence,
            applicability: validated.value.applicability,
            asOfDate: validated.value.asOfDate,
            sourceReference: validated.value.sourceReference,
            caveats: validated.value.caveats,
            sensitivity: validated.value.sensitivity,
            disposition: validated.value.disposition,
            supersedesId: current?.id || null,
          },
        });
        return { state: 'saved', answer };
      });

      if (result.state === 'missing') {
        return sendError(res, 404, 'session_not_found', 'Interview session was not found.');
      }
      if (result.state === 'conflict') {
        return sendRevisionConflict(res, prismaForRoutes, result.session, result.answer);
      }
      const currentSession = await ownedSession(prismaForRoutes, session.id, owner);
      return res.json(await loadBundle(prismaForRoutes, currentSession));
    } catch (error) {
      if (owner && session && isUniqueViolation(error)) {
        const currentSession = await ownedSession(prismaForRoutes, session.id, owner);
        const currentAnswer = await prismaForRoutes.brainOwnerInterviewAnswer.findFirst({
          where: { sessionId: session.id, questionId: req.params.questionId, supersededAt: null },
        });
        return sendRevisionConflict(res, prismaForRoutes, currentSession || session, currentAnswer);
      }
      logger?.error({ err: error }, 'brain/owner-interview answer error');
      return sendError(res, 500, 'interview_error', 'Unable to save the answer.');
    }
  });

  app.post('/api/brain/owner-interview/sessions/:id/complete', async (req, res) => {
    try {
      const owner = await authorize(req, res);
      if (!owner) return undefined;
      if (!SESSION_ID_PATTERN.test(req.params.id)) {
        return sendError(res, 400, 'invalid_session_id', 'Session id is invalid.');
      }
      const extras = unknownFields(req.body || {}, new Set(['expectedRevision']));
      if (extras.length > 0) {
        return sendError(res, 400, 'invalid_request', 'Unexpected completion fields.', { fields: extras });
      }
      const expectedRevision = req.body?.expectedRevision === undefined
        ? undefined
        : parseExpectedRevision(req.body.expectedRevision);
      if (expectedRevision === null) {
        return sendError(res, 400, 'invalid_revision', 'expectedRevision must be a non-negative integer.');
      }

      const result = await runSerializable(prismaForRoutes, async (tx) => {
        const session = await ownedSession(tx, req.params.id, owner);
        if (!session) return { state: 'missing' };
        if (session.status !== 'in_progress') return { state: 'conflict', session };
        if (expectedRevision !== undefined && session.revision !== expectedRevision) {
          return { state: 'conflict', session };
        }

        const answers = await tx.brainOwnerInterviewAnswer.findMany({
          where: { sessionId: session.id, supersededAt: null },
        });
        const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
        const incomplete = [];
        for (const questionId of getQuestionIds(session.definitionSnapshot)) {
          const answer = answerByQuestion.get(questionId);
          if (!answer || !['answered', 'deferred', 'not_known'].includes(answer.disposition)) {
            incomplete.push({ questionId, errors: ['A final disposition is required.'] });
            continue;
          }
          if (answer.disposition === 'answered') {
            const errors = validateCurrentAnswer(answer, findQuestion(session.definitionSnapshot, questionId), now());
            if (errors.length > 0) incomplete.push({ questionId, errors });
          }
        }
        if (incomplete.length > 0) return { state: 'incomplete', incomplete };

        const submittedAt = now();
        const changed = await tx.brainOwnerInterviewSession.updateMany({
          where: { id: session.id, respondentUserId: owner.id, status: 'in_progress' },
          data: { status: 'submitted', submittedAt, revision: { increment: 1 } },
        });
        if (changed.count !== 1) return { state: 'conflict', session };
        await tx.brainOwnerInterviewAnswer.updateMany({
          where: { sessionId: session.id, supersededAt: null, submittedAt: null },
          data: { submittedAt },
        });
        const submitted = await tx.brainOwnerInterviewSession.findUnique({ where: { id: session.id } });
        return { state: 'completed', session: submitted };
      });

      if (result.state === 'missing') return sendError(res, 404, 'session_not_found', 'Interview session was not found.');
      if (result.state === 'incomplete') {
        return sendError(res, 400, 'interview_incomplete', 'Every question needs a final, provenance-valid disposition.', result.incomplete);
      }
      if (result.state === 'conflict') return sendRevisionConflict(res, prismaForRoutes, result.session);
      return res.json(await loadBundle(prismaForRoutes, result.session));
    } catch (error) {
      logger?.error({ err: error }, 'brain/owner-interview complete error');
      return sendError(res, 500, 'interview_error', 'Unable to complete the interview.');
    }
  });

  app.post('/api/brain/owner-interview/sessions/:id/reopen', async (req, res) => {
    let owner;
    try {
      owner = await authorize(req, res);
      if (!owner) return undefined;
      if (!SESSION_ID_PATTERN.test(req.params.id)) {
        return sendError(res, 400, 'invalid_session_id', 'Session id is invalid.');
      }
      const extras = unknownFields(req.body || {}, new Set(['expectedRevision']));
      if (extras.length > 0) {
        return sendError(res, 400, 'invalid_request', 'Unexpected reopen fields.', { fields: extras });
      }
      const expectedRevision = req.body?.expectedRevision === undefined
        ? undefined
        : parseExpectedRevision(req.body.expectedRevision);
      if (expectedRevision === null) {
        return sendError(res, 400, 'invalid_revision', 'expectedRevision must be a non-negative integer.');
      }

      const result = await runSerializable(prismaForRoutes, async (tx) => {
        const session = await ownedSession(tx, req.params.id, owner);
        if (!session) return { state: 'missing' };
        if (session.status !== 'submitted') return { state: 'conflict', session };
        if (expectedRevision !== undefined && session.revision !== expectedRevision) {
          return { state: 'conflict', session };
        }
        const active = await tx.brainOwnerInterviewSession.findFirst({
          where: {
            respondentUserId: owner.id,
            interviewKey: session.interviewKey,
            status: 'in_progress',
            NOT: { id: session.id },
          },
          orderBy: { updatedAt: 'desc' },
        });
        if (active) return { state: 'active', session: active };

        const changed = await tx.brainOwnerInterviewSession.updateMany({
          where: { id: session.id, respondentUserId: owner.id, status: 'submitted' },
          data: { status: 'in_progress', submittedAt: null, revision: { increment: 1 } },
        });
        if (changed.count !== 1) return { state: 'conflict', session };
        const reopened = await tx.brainOwnerInterviewSession.findUnique({ where: { id: session.id } });
        return { state: 'reopened', session: reopened };
      });

      if (result.state === 'missing') return sendError(res, 404, 'session_not_found', 'Interview session was not found.');
      if (result.state === 'active') {
        const bundle = await loadBundle(prismaForRoutes, result.session);
        return res.status(409).json({
          ...bundle,
          ok: false,
          error: { code: 'active_session_exists', message: 'Another in-progress interview already exists.' },
        });
      }
      if (result.state === 'conflict') return sendRevisionConflict(res, prismaForRoutes, result.session);
      return res.json(await loadBundle(prismaForRoutes, result.session));
    } catch (error) {
      if (isUniqueViolation(error)) {
        const active = await prismaForRoutes.brainOwnerInterviewSession.findFirst({
          where: { respondentUserId: owner?.id, status: 'in_progress' },
          orderBy: { updatedAt: 'desc' },
        });
        if (active) {
          const bundle = await loadBundle(prismaForRoutes, active);
          return res.status(409).json({
            ...bundle,
            ok: false,
            error: { code: 'active_session_exists', message: 'Another in-progress interview already exists.' },
          });
        }
      }
      logger?.error({ err: error }, 'brain/owner-interview reopen error');
      return sendError(res, 500, 'interview_error', 'Unable to reopen the interview.');
    }
  });
}

module.exports = {
  CONFIDENCE_VALUES,
  DISPOSITION_VALUES,
  SENSITIVITY_VALUES,
  registerOwnerInterviewRoutes,
  serializeAnswer,
  serializeSession,
  validateAnswerInput,
};
