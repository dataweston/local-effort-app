import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createDecisionRouter } from '../decision';

function createApp(overrides = {}) {
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
  const app = express();
  app.use(express.json());
  app.use('/api', createDecisionRouter({ logger, ...overrides }));
  return { app, logger };
}

describe('decision router', () => {
  it('builds normalized context from request signals', async () => {
    const { app } = createApp();

    const res = await request(app)
      .get('/api/decision/context?utm_source=google&utm_campaign=spring-push&returning=true')
      .set('x-session-id', 'sess-ctx-1')
      .set('x-device-type', 'mobile')
      .set('referer', 'https://google.com');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.context.sessionId).toBe('sess-ctx-1');
    expect(res.body.context.acquisition.source).toBe('google');
    expect(res.body.context.visitor.isReturning).toBe(true);
  });

  it('returns a decision preview based on normalized context and priorities', async () => {
    const assignmentService = {
      assign: vi.fn().mockReturnValue({
        experimentKey: 'adaptive-welcome-v1',
        variant: 'rules',
        bucket: 2222,
        source: 'deterministic_hash',
      }),
    };
    const auditRepository = {
      persistAssignment: vi.fn().mockResolvedValue({}),
      persistEvent: vi.fn(),
    };
    const priorityRepository = {
      listPriorities: vi.fn().mockResolvedValue({
        items: [
          {
            id: 'weekly-order-retention',
            label: 'Reassure weekly-order customers and returning buyers',
            weight: 0.86,
            active: true,
            strategy: 'reassure',
            reasons: ['repeat-flow', 'operational-fit'],
            messageFacts: [
              'Weekly ordering works best when returning customers can confirm the current menu quickly.',
            ],
            cta: { label: 'Open weekly order', href: '/weekly-order' },
            match: { pageTypes: ['commerce'], pathPrefixes: ['/weekly-order'], acquisitionSources: [] },
            sourceName: 'json',
          },
        ],
        metadata: { sourceName: 'json', fallbackUsed: true, itemCount: 1 },
      }),
    };
    const { app } = createApp({ auditRepository, assignmentService, priorityRepository });

    const res = await request(app)
      .post('/api/decision/preview')
      .send({
        sessionId: 'sess-preview-1',
        path: '/weekly-order',
        pageType: 'commerce',
        visitor: { isReturning: true },
        session: { cartItemCount: 2 },
      });

    expect(res.status).toBe(200);
    expect(res.body.version).toBe('1');
    expect(res.body.assignment.experimentKey).toBe('adaptive-welcome-v1');
    expect(res.body.selected.strategy).toBe('reassure');
    expect(res.body.selected.businessPriorities[0].id).toBe('weekly-order-retention');
    expect(res.body.debug.prioritySource.sourceName).toBe('json');
    expect(Array.isArray(res.body.selected.reasonCodes)).toBe(true);
    expect(auditRepository.persistAssignment).toHaveBeenCalledTimes(1);
  });

  it('accepts structured decision events', async () => {
    const auditRepository = {
      persistAssignment: vi.fn(),
      persistEvent: vi.fn().mockResolvedValue({}),
    };
    const { app, logger } = createApp({ auditRepository });

    const res = await request(app)
      .post('/api/decision/events')
      .send({
        version: '1',
        eventType: 'decision.rendered',
        occurredAt: '2026-03-29T12:00:00.000Z',
        sessionId: 'sess-event-1',
        path: '/sale',
        strategy: 'promote',
        assignment: {
          experimentKey: 'adaptive-welcome-v1',
          variant: 'rules',
          bucket: 1234,
          source: 'deterministic_hash',
        },
        reasonCodes: ['sale-page'],
        selectedPriorityIds: ['sale-catalog-guidance'],
        metadata: { surface: 'preview' },
      });

    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(auditRepository.persistEvent).toHaveBeenCalledTimes(1);
  });

  it('returns a control-style preview when assigned to control', async () => {
    const assignmentService = {
      assign: vi.fn().mockReturnValue({
        experimentKey: 'adaptive-welcome-v1',
        variant: 'control',
        bucket: 1,
        source: 'deterministic_hash',
      }),
    };
    const auditRepository = {
      persistAssignment: vi.fn().mockResolvedValue({}),
      persistEvent: vi.fn(),
    };
    const priorityRepository = {
      listPriorities: vi.fn().mockResolvedValue({
        items: [],
        metadata: { sourceName: 'json', fallbackUsed: false, itemCount: 0 },
      }),
    };
    const { app } = createApp({ assignmentService, auditRepository, priorityRepository });

    const res = await request(app)
      .post('/api/decision/preview')
      .send({ sessionId: 'sess-control-1', path: '/sale', pageType: 'sale' });

    expect(res.status).toBe(200);
    expect(res.body.assignment.variant).toBe('control');
    expect(res.body.selected.reasonCodes).toContain('control');
  });

  it('requires admin auth for internal preview and supports variant override', async () => {
    const assignmentService = {
      assign: vi.fn().mockReturnValue({
        experimentKey: 'adaptive-welcome-v1',
        variant: 'rules',
        bucket: 5151,
        source: 'deterministic_hash',
      }),
    };
    const auditRepository = {
      persistAssignment: vi.fn().mockResolvedValue({}),
      persistEvent: vi.fn(),
    };
    const priorityRepository = {
      listPriorities: vi.fn().mockResolvedValue({
        items: [
          {
            id: 'home-small-events',
            label: 'Guide planners toward small-events intake',
            weight: 0.9,
            active: true,
            strategy: 'orient',
            reasons: ['service-fit'],
            messageFacts: ['Small events are the fastest place to start.'],
            cta: { label: 'Plan an event', href: '/#small-events' },
            match: { pageTypes: ['home'], pathPrefixes: ['/'], acquisitionSources: [] },
            sourceName: 'sanity',
          },
        ],
        metadata: { sourceName: 'sanity', fallbackUsed: false, itemCount: 1 },
      }),
    };
    const verifyAdminRequest = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'admin-user', email: 'owner@localeffortfood.com' });
    const { app } = createApp({
      assignmentService,
      auditRepository,
      priorityRepository,
      verifyAdminRequest,
    });

    const unauthorized = await request(app)
      .post('/api/decision/admin/preview')
      .send({ sessionId: 'sess-admin-0', path: '/', pageType: 'home' });

    expect(unauthorized.status).toBe(401);
    const authorized = await request(app)
      .post('/api/decision/admin/preview')
      .set('Authorization', 'Bearer token')
      .send({
        sessionId: 'sess-admin-1',
        path: '/',
        pageType: 'home',
        variantOverride: 'control',
      });

    expect(authorized.status).toBe(200);
    expect(authorized.body.assignment.variant).toBe('control');
    expect(authorized.body.assignment.source).toBe('admin_override');
    expect(authorized.body.debug.priorityEvaluations).toHaveLength(1);
  });

  it('returns an admin report summary for verified admins', async () => {
    const reportingService = {
      getSummary: vi.fn().mockResolvedValue({
        ok: true,
        days: 14,
        totals: {
          totalEvents: 4,
          rendered: 3,
          clicked: 1,
          dismissed: 0,
          converted: 0,
        },
        variants: [{ key: 'rules', count: 3 }],
        strategies: [{ key: 'orient', count: 2 }],
        topPriorities: [{ priorityId: 'home-small-events', count: 2 }],
        clickThroughRate: 0.3333,
      }),
    };
    const verifyAdminRequest = vi.fn().mockResolvedValue({ id: 'admin-user', email: 'owner@localeffortfood.com' });
    const { app } = createApp({ reportingService, verifyAdminRequest });

    const res = await request(app)
      .get('/api/decision/admin/report?days=14')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.totals.rendered).toBe(3);
    expect(reportingService.getSummary).toHaveBeenCalledWith({ days: 14 });
  });
});
