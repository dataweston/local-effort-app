import { beforeEach, describe, expect, it, vi } from 'vitest';

import syncModule from '../gmailVendorDocumentSync';

const { runNextVendorDocumentBatch } = syncModule;

function cursor(overrides = {}) {
  return {
    id: 'cursor-1',
    windowStart: new Date('2026-08-01T00:00:00Z'),
    windowEnd: new Date('2026-09-01T00:00:00Z'),
    pageToken: null,
    metadata: { priority: 'recent' },
    ...overrides,
  };
}

const prisma = {
  brainSyncCursor: {
    upsert: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
};

const getAuthorizedGmailClient = vi.fn();
const ingestVendorDocumentMessage = vi.fn();

function dependencies() {
  return { prisma, getAuthorizedGmailClient, ingestVendorDocumentMessage };
}

beforeEach(() => {
  vi.resetAllMocks();
  prisma.brainSyncCursor.upsert.mockResolvedValue({});
  prisma.brainSyncCursor.update.mockResolvedValue({});
  prisma.brainSyncCursor.findFirst.mockResolvedValue(cursor());
  prisma.brainSyncCursor.updateMany
    .mockResolvedValueOnce({ count: 0 }) // stale-claim recovery
    .mockResolvedValueOnce({ count: 1 }); // atomic claim
  ingestVendorDocumentMessage.mockResolvedValue({ skipped: false, existing: false });
});

describe('Gmail vendor-document cursor reliability', () => {
  it('does not claim a cursor when Gmail authorization fails', async () => {
    getAuthorizedGmailClient.mockRejectedValue(new Error('Gmail not authorized'));

    await expect(runNextVendorDocumentBatch({ batchSize: 1, dependencies: dependencies() })).rejects.toThrow(
      'Gmail not authorized'
    );

    expect(prisma.brainSyncCursor.findFirst).not.toHaveBeenCalled();
    expect(prisma.brainSyncCursor.update).not.toHaveBeenCalled();
  });

  it('does not advance a page when any message fails', async () => {
    getAuthorizedGmailClient.mockResolvedValue({
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({
            data: { messages: [{ id: 'bad-message' }], nextPageToken: 'next-page' },
          }),
        },
      },
    });
    ingestVendorDocumentMessage.mockRejectedValue(new Error('temporary Gmail read failure'));

    const result = await runNextVendorDocumentBatch({ batchSize: 1, dependencies: dependencies() });

    expect(result).toMatchObject({ pageDeferred: true, processed: 0, errors: 1 });
    const deferredUpdate = prisma.brainSyncCursor.update.mock.calls.at(-1)[0];
    expect(deferredUpdate.data.status).toBe('error');
    expect(deferredUpdate.data).not.toHaveProperty('pageToken');
  });

  it('advances only after the whole page is safely ingested', async () => {
    getAuthorizedGmailClient.mockResolvedValue({
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({
            data: { messages: [{ id: 'message-1' }], nextPageToken: 'next-page' },
          }),
        },
      },
    });

    const result = await runNextVendorDocumentBatch({ batchSize: 1, dependencies: dependencies() });

    expect(result).toMatchObject({ processed: 1, errors: 0, windowComplete: false });
    expect(prisma.brainSyncCursor.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pageToken: 'next-page',
          status: 'pending',
          processedCount: { increment: 1 },
        }),
      })
    );
  });
});
