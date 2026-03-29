const express = require('express');
const { z } = require('zod');
const { buildDecisionContext, buildDecisionContextFromRequest } = require('../../decision/contextBuilder');
const { buildDecisionPreview } = require('../../decision/previewEngine');
const { loadBusinessPriorityRegistry } = require('../../decision/businessPriorityRegistry');
const {
  createJsonPriorityRepository,
  createPriorityRepository,
} = require('../../decision/priorityRepository');
const { logDecisionEvent } = require('../../decision/eventLogger');
const { createDecisionAssignmentService } = require('../../decision/assignmentService');
const { createDecisionAuditRepository } = require('../../decision/auditRepository');
const { createDecisionReportingService } = require('../../decision/reportingService');
const { createLlmCopyService } = require('../../decision/llmCopyService');
const { prisma } = require('../utils/prisma');
const {
  DEFAULT_DECISION_EXPERIMENT_KEY,
  getDecisionExperiment,
} = require('../../decision/experiments');
const { createAdminVerifier } = require('../utils/adminVerifier');

const previewRequestSchema = z.object({
  sessionId: z.string().optional(),
  experimentKey: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
  path: z.string().optional(),
  pageType: z.string().optional(),
  category: z.string().optional(),
  productSlug: z.string().optional(),
  acquisition: z.record(z.any()).optional(),
  visitor: z.record(z.any()).optional(),
  session: z.record(z.any()).optional(),
  constraints: z.record(z.any()).optional(),
  variantOverride: z.string().optional(),
});

function createDefaultPriorityRepository({ logger } = {}) {
  return createPriorityRepository({
    logger,
    fallbackRepository: createJsonPriorityRepository({
      logger,
      loadRegistry: () => loadBusinessPriorityRegistry(),
    }),
  });
}

function resolveAssignment({ assignmentService, context, experimentKey, variantOverride }) {
  const assignment = assignmentService.assign({
    sessionId: context.sessionId,
    experimentKey,
  });

  if (!variantOverride) {
    return assignment;
  }

  const experiment = getDecisionExperiment(experimentKey);
  const allowedVariants = new Set((experiment?.variants || []).map((variant) => variant.key));
  if (!allowedVariants.has(variantOverride)) {
    throw new Error('decision-variant-override-invalid');
  }

  return {
    ...assignment,
    variant: variantOverride,
    source: 'admin_override',
  };
}

function createDecisionRouter({
  logger,
  assignmentService = createDecisionAssignmentService(),
  auditRepository = createDecisionAuditRepository({ logger }),
  reportingService = createDecisionReportingService({ logger, prismaClient: prisma }),
  priorityRepository = createDefaultPriorityRepository({ logger }),
  llmCopyService = createLlmCopyService({ logger }),
  verifyAdminRequest = createAdminVerifier(),
} = {}) {
  const router = express.Router();

  router.get('/decision/context', (req, res) => {
    try {
      const context = buildDecisionContextFromRequest(req);
      return res.json({ ok: true, context });
    } catch (err) {
      logger?.error?.({ err }, 'decision context build failed');
      return res.status(400).json({ error: 'decision-context-invalid' });
    }
  });

  router.post('/decision/preview', async (req, res) => {
    try {
      const payload = previewRequestSchema.parse(req.body || {});
      const context = buildDecisionContext({
        sessionId: payload.sessionId || 'preview-session',
        occurredAt: payload.occurredAt,
        path: payload.path || '/',
        pageType: payload.pageType,
        category: payload.category,
        productSlug: payload.productSlug,
        acquisition: payload.acquisition,
        visitor: payload.visitor,
        session: payload.session,
        constraints: payload.constraints,
      });
      const experimentKey = payload.experimentKey || DEFAULT_DECISION_EXPERIMENT_KEY;
      const assignment = resolveAssignment({
        assignmentService,
        context,
        experimentKey,
      });
      const prioritySource = await priorityRepository.listPriorities();
      const result = await buildDecisionPreview({
        context,
        assignment,
        registry: prioritySource.items,
        prioritySource: prioritySource.metadata,
        llmCopyService,
      });
      await auditRepository.persistAssignment({ assignment, context });
      return res.json(result);
    } catch (err) {
      logger?.error?.({ err }, 'decision preview failed');
      return res.status(400).json({ error: 'decision-preview-invalid' });
    }
  });

  router.post('/decision/events', async (req, res) => {
    try {
      const event = logDecisionEvent({ logger, event: req.body || {} });
      await auditRepository.persistEvent(event);
      return res.status(202).json({ ok: true, event });
    } catch (err) {
      logger?.error?.({ err }, 'decision event invalid');
      return res.status(400).json({ error: 'decision-event-invalid' });
    }
  });

  router.post('/decision/admin/preview', async (req, res) => {
    try {
      const adminUser = await verifyAdminRequest(req);
      if (!adminUser) {
        return res.status(401).json({ error: 'decision-admin-unauthorized' });
      }

      const payload = previewRequestSchema.parse(req.body || {});
      const context = buildDecisionContext({
        sessionId: payload.sessionId || 'decision-admin-preview',
        occurredAt: payload.occurredAt,
        path: payload.path || '/',
        pageType: payload.pageType,
        category: payload.category,
        productSlug: payload.productSlug,
        acquisition: payload.acquisition,
        visitor: payload.visitor,
        session: payload.session,
        constraints: payload.constraints,
      });
      const experimentKey = payload.experimentKey || DEFAULT_DECISION_EXPERIMENT_KEY;
      const assignment = resolveAssignment({
        assignmentService,
        context,
        experimentKey,
        variantOverride: payload.variantOverride,
      });
      const prioritySource = await priorityRepository.listPriorities();
      const result = await buildDecisionPreview({
        context,
        assignment,
        registry: prioritySource.items,
        prioritySource: prioritySource.metadata,
        llmCopyService,
      });
      await auditRepository.persistAssignment({ assignment, context });
      return res.json(result);
    } catch (err) {
      logger?.error?.({ err }, 'decision admin preview failed');
      return res.status(400).json({ error: 'decision-admin-preview-invalid' });
    }
  });

  router.get('/decision/admin/report', async (req, res) => {
    try {
      const adminUser = await verifyAdminRequest(req);
      if (!adminUser) {
        return res.status(401).json({ error: 'decision-admin-unauthorized' });
      }
      const days = Number.parseInt(String(req.query?.days || '7'), 10) || 7;
      const summary = await reportingService.getSummary({ days });
      return res.json(summary);
    } catch (err) {
      logger?.error?.({ err }, 'decision admin report failed');
      return res.status(400).json({ error: 'decision-admin-report-invalid' });
    }
  });

  return router;
}

module.exports = { createDecisionRouter };
