import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import syncModule from '../gmailSync';

const { runNextThreadBatch, syncGmailThreads } = syncModule;

function cursor(overrides = {}) {
  return {
    id: 'cursor-sent',
    stream: 'threads-v1:sent',
    pageToken: null,
    metadata: { label: 'sent' },
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
const ingestGmailThread = vi.fn();
const findIngestedThreadIds = vi.fn();

function dependencies(overrides = {}) {
  return { prisma, getAuthorizedGmailClient, ingestGmailThread, findIngestedThreadIds, ...overrides };
}

function gmailReturning(threads, nextPageToken = null) {
  const list = vi.fn().mockResolvedValue({ data: { threads, nextPageToken } });
  getAuthorizedGmailClient.mockResolvedValue({ users: { threads: { list } } });
  return list;
}

beforeEach(() => {
  vi.resetAllMocks();
  prisma.brainSyncCursor.upsert.mockResolvedValue({});
  prisma.brainSyncCursor.update.mockResolvedValue({});
  prisma.brainSyncCursor.findFirst.mockResolvedValue(cursor());
  prisma.brainSyncCursor.updateMany
    .mockResolvedValueOnce({ count: 0 }) // stale-claim recovery
    .mockResolvedValueOnce({ count: 1 }); // atomic claim
  findIngestedThreadIds.mockResolvedValue(new Set());
  ingestGmailThread.mockResolvedValue({ status: 'ingested' });
});

describe('Gmail thread cursor reliability', () => {
  it('does not claim a stream when Gmail authorization fails', async () => {
    getAuthorizedGmailClient.mockRejectedValue(new Error('Gmail not authorized'));

    await expect(runNextThreadBatch({ batchSize: 10, dependencies: dependencies() })).rejects.toThrow(
      'Gmail not authorized'
    );

    expect(prisma.brainSyncCursor.findFirst).not.toHaveBeenCalled();
    expect(prisma.brainSyncCursor.update).not.toHaveBeenCalled();
  });

  it('stores the next page token so a killed invocation resumes where it stopped', async () => {
    gmailReturning([{ id: 'thread-1' }], 'page-2');

    const result = await runNextThreadBatch({ batchSize: 1, dependencies: dependencies() });

    expect(result).toMatchObject({ processed: 1, skipped: 0, errors: 0, streamComplete: false });
    expect(prisma.brainSyncCursor.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pageToken: 'page-2',
          status: 'pending',
          processedCount: { increment: 1 },
        }),
      })
    );
  });

  it('resumes from a stored page token instead of restarting the stream', async () => {
    prisma.brainSyncCursor.findFirst.mockResolvedValue(cursor({ pageToken: 'page-2' }));
    const list = gmailReturning([{ id: 'thread-2' }], null);

    await runNextThreadBatch({ batchSize: 1, dependencies: dependencies() });

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ pageToken: 'page-2' }));
  });

  it('never re-reads a thread the ledger already holds', async () => {
    gmailReturning([{ id: 'thread-old' }, { id: 'thread-new' }], null);
    findIngestedThreadIds.mockResolvedValue(new Set(['thread-old']));

    const result = await runNextThreadBatch({ batchSize: 2, dependencies: dependencies() });

    expect(ingestGmailThread).toHaveBeenCalledTimes(1);
    expect(ingestGmailThread).toHaveBeenCalledWith(expect.anything(), 'thread-new');
    expect(result).toMatchObject({ processed: 1, skipped: 1, errors: 0 });
  });

  it('does not advance the page when a thread read fails', async () => {
    gmailReturning([{ id: 'thread-bad' }], 'page-2');
    ingestGmailThread.mockRejectedValue(new Error('temporary Gmail read failure'));

    const result = await runNextThreadBatch({ batchSize: 1, dependencies: dependencies() });

    expect(result).toMatchObject({ pageDeferred: true, processed: 0, errors: 1 });
    const deferred = prisma.brainSyncCursor.update.mock.calls.at(-1)[0];
    expect(deferred.data.status).toBe('error');
    expect(deferred.data).not.toHaveProperty('pageToken');
  });

  it('completes the stream when Gmail reports no further page', async () => {
    gmailReturning([{ id: 'thread-last' }], null);

    const result = await runNextThreadBatch({ batchSize: 1, dependencies: dependencies() });

    expect(result).toMatchObject({ streamComplete: true, processed: 1 });
    expect(prisma.brainSyncCursor.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pageToken: null, status: 'complete' }) })
    );
  });

  it('reports a finished pass when no stream is left to drain', async () => {
    prisma.brainSyncCursor.findFirst.mockResolvedValue(null);
    gmailReturning([], null);

    const result = await runNextThreadBatch({ dependencies: dependencies() });

    expect(result).toEqual({ complete: true, processed: 0, skipped: 0, errors: 0 });
    expect(prisma.brainSyncCursor.update).not.toHaveBeenCalled();
  });
});

describe('Gmail thread sync pass bounds', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops at the batch ceiling and reports the backlog as unfinished', async () => {
    const batch = vi.fn().mockResolvedValue({ complete: false, processed: 1, skipped: 4, errors: 0 });

    const result = await syncGmailThreads({
      batchSize: 50,
      maxBatches: 3,
      dependencies: dependencies({ runNextThreadBatch: batch }),
    });

    expect(batch).toHaveBeenCalledTimes(3);
    expect(batch).toHaveBeenCalledWith(expect.objectContaining({ batchSize: 50 }));
    expect(result).toMatchObject({
      complete: false,
      stoppedBy: 'batchCeiling',
      batches: 3,
      processed: 3,
      skipped: 12,
      errors: 0,
    });
  });

  it('returns inside the time budget rather than being killed mid-pass', async () => {
    vi.useFakeTimers();
    const batch = vi.fn().mockImplementation(async () => {
      vi.advanceTimersByTime(30_000);
      return { complete: false, processed: 2, skipped: 0, errors: 0 };
    });

    const result = await syncGmailThreads({
      maxBatches: 20,
      timeBudgetMs: 20_000,
      dependencies: dependencies({ runNextThreadBatch: batch }),
    });

    expect(batch).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ complete: false, stoppedBy: 'timeBudget', batches: 1, processed: 2 });
  });

  it('stops immediately when a page defers for retry', async () => {
    const batch = vi.fn().mockResolvedValue({ complete: false, pageDeferred: true, processed: 0, skipped: 0, errors: 1 });

    const result = await syncGmailThreads({
      maxBatches: 5,
      dependencies: dependencies({ runNextThreadBatch: batch }),
    });

    expect(batch).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ complete: false, stoppedBy: 'pageDeferred', errors: 1 });
  });

  it('restarts finished streams only when asked', async () => {
    const batch = vi.fn().mockResolvedValue({ complete: true, processed: 0, skipped: 0, errors: 0 });
    prisma.brainSyncCursor.updateMany.mockReset();
    prisma.brainSyncCursor.updateMany.mockResolvedValue({ count: 2 });

    const result = await syncGmailThreads({
      restart: true,
      maxBatches: 4,
      dependencies: dependencies({ runNextThreadBatch: batch }),
    });

    expect(prisma.brainSyncCursor.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.brainSyncCursor.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'complete' }),
        data: expect.objectContaining({ status: 'pending', pageToken: null }),
      })
    );
    expect(result).toMatchObject({ complete: true, stoppedBy: 'complete', batches: 1 });
  });
});
