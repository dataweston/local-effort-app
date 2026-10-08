import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runTriagePass: vi.fn(),
}));


import triageRoutes from '../triageRoutes';

const { registerTriageRoutes } = triageRoutes;

function buildApp() {
  const app = express();
  app.use(express.json());
  registerTriageRoutes(app, {
    verifyAdminRequest: async () => ({ email: 'admin@example.test' }),
    runTriagePass: mocks.runTriagePass,
    withJobRun: (_name, run) => run(),
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Brain triage run response', () => {
  it('surfaces stalled eligible work as a failed service response', async () => {
    mocks.runTriagePass.mockResolvedValue({
      itemsProcessed: 0,
      itemsWritten: 0,
      eligibleBacklog: 3,
      blocked: true,
      status: 'blocked',
    });

    const response = await request(buildApp()).post('/api/brain/triage/run').send({});

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ ok: false, status: 'blocked', eligibleBacklog: 3 });
  });

  it('reports an empty pass as healthy no-new-data', async () => {
    mocks.runTriagePass.mockResolvedValue({ itemsProcessed: 0, eligibleBacklog: 0, noNewData: true });

    const response = await request(buildApp()).post('/api/brain/triage/run').send({});

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, status: 'no_new_data', noNewData: true });
  });
});
