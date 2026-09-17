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
});
