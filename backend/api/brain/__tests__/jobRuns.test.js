import { describe, expect, it, vi } from 'vitest';
import jobRunsModule from '../jobRuns';

const { withJobRun } = jobRunsModule;

describe('Company Brain ingestion job accounting', () => {
  it('records numeric Gmail ingestion errors as a partial run', async () => {
    const prisma = {
      brainJobRun: {
        create: vi.fn().mockImplementation(async ({ data }) => data),
      },
    };

    const summary = await withJobRun('gmail-sync', async () => ({
      processed: 17,
      errors: 2,
      captureIncomplete: 1,
      extractionIncomplete: 3,
    }), { prismaClient: prisma });

    expect(summary.errors).toBe(2);
    expect(prisma.brainJobRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobName: 'gmail-sync',
        status: 'partial',
        itemsProcessed: 17,
        errorCount: 2,
        expectedIntervalHours: 24,
        detail: expect.objectContaining({
          captureIncomplete: 1,
          extractionIncomplete: 3,
        }),
      }),
    });
  });

  it('does not treat partial or blocked runs as fresh', async () => {
    const prisma = {
      brainJobRun: {
        create: vi.fn().mockImplementation(async ({ data }) => data),
        findFirst: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ startedAt: new Date(), status: 'partial' })
          .mockResolvedValueOnce({ startedAt: new Date(), status: 'blocked' }),
      },
    };

    const { jobFreshness } = jobRunsModule;
    const freshness = await jobFreshness(prisma);

    expect(freshness.jobs[0].stale).toBe(true);
    expect(freshness.jobs[0].lastPartialAt).toEqual(expect.any(Date));
  });

  it('records an explicit no-new-data run as healthy', async () => {
    const prisma = {
      brainJobRun: {
        create: vi.fn().mockImplementation(async ({ data }) => data),
      },
    };

    await withJobRun('google-ads-sync', async () => ({ noNewData: true }), { prismaClient: prisma });

    expect(prisma.brainJobRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'no_new_data' }),
    });
  });

  it('records an unsuccessful summary as an error run', async () => {
    const prisma = {
      brainJobRun: {
        create: vi.fn().mockImplementation(async ({ data }) => data),
      },
    };

    await withJobRun('inference-run', async () => ({ ok: false, error: 'database unavailable' }), {
      prismaClient: prisma,
    });

    expect(prisma.brainJobRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'error',
        detail: expect.objectContaining({ error: 'database unavailable' }),
      }),
    });
  });
});
