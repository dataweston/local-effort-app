import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import syncModule from '../gmailSync';

const {
  ingestGmailMessage,
  ingestGmailPage,
  ingestGmailThread,
  runNextThreadBatch,
  syncGmailThreads,
} = syncModule;

function cursor(overrides = {}) {
  return {
    id: 'cursor-sent',
    stream: 'messages-v3:recent:sent',
    pageToken: null,
    metadata: {
      label: 'sent',
      lane: 'recent',
      query: 'in:sent after:1700000000',
      queryVersion: 3,
      queryCutoffAt: '2024-01-01T00:00:00.000Z',
    },
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
const ingestGmailPageMock = vi.fn();

function dependencies(overrides = {}) {
  return { prisma, getAuthorizedGmailClient, ingestGmailPage: ingestGmailPageMock, ...overrides };
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
  prisma.brainSyncCursor.findMany.mockResolvedValue([]);
  prisma.brainSyncCursor.findFirst.mockResolvedValue(cursor());
  prisma.brainSyncCursor.updateMany
    .mockResolvedValueOnce({ count: 0 }) // stale-claim recovery
    .mockResolvedValueOnce({ count: 1 }); // atomic claim
  ingestGmailPageMock.mockResolvedValue({ processed: 1, skipped: 0, errors: [] });
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

  it('uses the exact stored query when resuming a Gmail page token', async () => {
    prisma.brainSyncCursor.findFirst.mockResolvedValue(cursor({
      pageToken: 'page-2',
      metadata: {
        label: 'sent',
        lane: 'recent',
        query: 'in:sent after:1234567890',
        queryVersion: 3,
      },
    }));
    const list = gmailReturning([{ id: 'thread-2' }], null);

    await runNextThreadBatch({
      recentDays: 1,
      cutoffAt: new Date('2030-01-01T00:00:00.000Z'),
      dependencies: dependencies(),
    });

    expect(list).toHaveBeenCalledWith(expect.objectContaining({
      q: 'in:sent after:1234567890',
      pageToken: 'page-2',
    }));
  });

  it('passes every listed thread to message-level discovery', async () => {
    gmailReturning([{ id: 'thread-old' }, { id: 'thread-new' }], null);
    ingestGmailPageMock.mockResolvedValue({ processed: 2, skipped: 2, errors: [] });

    const result = await runNextThreadBatch({ batchSize: 2, dependencies: dependencies() });

    expect(ingestGmailPageMock).toHaveBeenCalledTimes(1);
    expect(ingestGmailPageMock).toHaveBeenCalledWith(
      expect.anything(),
      ['thread-old', 'thread-new']
    );
    expect(result).toMatchObject({ processed: 2, skipped: 2, errors: 0 });
  });

  it('does not advance the page when a thread read fails', async () => {
    gmailReturning([{ id: 'thread-bad' }], 'page-2');
    ingestGmailPageMock.mockResolvedValue({
      processed: 0,
      skipped: 0,
      errors: [{ stage: 'thread', id: 'thread-bad', message: 'temporary Gmail read failure' }],
    });

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

    expect(result).toEqual({
      complete: true,
      processed: 0,
      skipped: 0,
      errors: 0,
      captureIncomplete: 0,
      extractionIncomplete: 0,
      extractionGaps: 0,
      blockedStream: null,
      retryPending: false,
    });
    expect(prisma.brainSyncCursor.update).not.toHaveBeenCalled();
  });
});

describe('Gmail page-level message discovery', () => {
  it('deduplicates all message ids with one database lookup and fetches only unseen messages', async () => {
    const get = vi.fn(({ id }) => Promise.resolve({
      data: {
        messages: id === 'thread-1'
          ? [{ id: 'message-old' }, { id: 'message-new' }]
          : [{ id: 'message-new' }, { id: 'message-other' }],
      },
    }));
    const gmail = { users: { threads: { get } } };
    const ingestMessage = vi.fn().mockResolvedValue({
      status: 'ingested',
      captureStatus: 'complete',
      extractionStatus: 'complete',
      extractionGapCount: 0,
    });
    const findCompleted = vi.fn().mockResolvedValue(new Set(['message-old']));

    const result = await ingestGmailPage(gmail, ['thread-1', 'thread-2'], {
      prismaClient: prisma,
      findCompleted,
      ingestMessage,
      threadConcurrency: 2,
      messageConcurrency: 2,
    });

    expect(get).toHaveBeenCalledTimes(2);
    expect(findCompleted).toHaveBeenCalledTimes(1);
    expect(findCompleted).toHaveBeenCalledWith(
      ['message-old', 'message-new', 'message-other'],
      prisma
    );
    expect(ingestMessage).toHaveBeenCalledTimes(2);
    expect(ingestMessage).toHaveBeenCalledWith(gmail, 'message-new', { prismaClient: prisma });
    expect(ingestMessage).toHaveBeenCalledWith(gmail, 'message-other', { prismaClient: prisma });
    expect(result).toEqual({
      processed: 2,
      skipped: 1,
      errors: [],
      captureIncomplete: 0,
      extractionIncomplete: 0,
      extractionGaps: 0,
    });
  });

  it('reports the id of a message that fails ingestion', async () => {
    const gmail = {
      users: {
        threads: {
          get: vi.fn().mockResolvedValue({
            data: { messages: [{ id: 'message-broken' }] },
          }),
        },
      },
    };
    const ingestMessage = vi.fn().mockRejectedValue(new Error('fetch failed'));

    const result = await ingestGmailPage(gmail, ['thread-1'], {
      prismaClient: prisma,
      findCompleted: vi.fn().mockResolvedValue(new Set()),
      ingestMessage,
    });

    expect(result.errors).toEqual([
      { stage: 'message', id: 'message-broken', message: 'fetch failed' },
    ]);
  });

  it('repairs both legacy ledger-only and interrupted source-only messages', async () => {
    const gmail = {
      users: {
        threads: {
          get: vi.fn().mockResolvedValue({
            data: {
              messages: [
                { id: 'legacy-ledger-only' },
                { id: 'interrupted-source-only' },
                { id: 'fully-complete' },
              ],
            },
          }),
        },
      },
    };
    const prismaClient = {
      brainSourceDocument: {
        findMany: vi.fn().mockResolvedValue([
          { sourceId: 'interrupted-source-only' },
          { sourceId: 'fully-complete' },
        ]),
      },
      ledgerEvent: {
        findMany: vi.fn().mockResolvedValue([
          { sourceId: 'legacy-ledger-only' },
          { sourceId: 'fully-complete' },
        ]),
      },
    };
    const ingestMessage = vi.fn().mockResolvedValue({
      status: 'ingested',
      captureStatus: 'complete',
      extractionStatus: 'complete',
      extractionGapCount: 0,
    });

    const result = await ingestGmailPage(gmail, ['thread-legacy'], {
      prismaClient,
      ingestMessage,
    });

    expect(ingestMessage).toHaveBeenCalledTimes(2);
    expect(ingestMessage).toHaveBeenCalledWith(
      gmail,
      'legacy-ledger-only',
      { prismaClient }
    );
    expect(ingestMessage).toHaveBeenCalledWith(
      gmail,
      'interrupted-source-only',
      { prismaClient }
    );
    expect(prismaClient.ledgerEvent.findMany).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ processed: 2, skipped: 1, errors: [] });
  });
});

describe('Gmail canonical message commit', () => {
  it('completes the semantic inbox when exact source backfill finds a legacy event', async () => {
    const gmail = {
      users: {
        messages: {
          get: vi.fn().mockResolvedValue({
            data: { id: 'legacy-ledger-only', threadId: 'thread-legacy', raw: 'unused' },
          }),
        },
      },
    };
    const parseMessage = vi.fn().mockResolvedValue({
      rawContent: Buffer.from('exact message'),
      occurredAt: new Date('2026-03-30T12:00:00.000Z'),
      title: 'Legacy message',
      textContent: 'A durable business detail.',
      htmlContent: null,
      headers: [],
      attachments: [],
      captureStatus: 'complete',
      extractionStatus: 'complete',
      extractionGaps: [],
      metadata: {
        gmailThreadId: 'thread-legacy',
        from: [],
        to: [],
        cc: [],
        bcc: [],
        rfcMessageId: null,
      },
    });
    const archiveSource = vi.fn().mockResolvedValue({
      id: 'source-new',
      contentHash: 'a'.repeat(64),
      rawByteLength: 13,
    });
    const writeLedger = vi.fn().mockResolvedValue({
      id: 'event-existing',
      _existing: true,
    });
    const createInbox = vi.fn().mockResolvedValue({ id: 'inbox-new' });
    const tx = {
      brainInboxItem: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const prismaClient = {
      $transaction: vi.fn((commit) => commit(tx)),
    };

    const result = await ingestGmailMessage(gmail, 'legacy-ledger-only', {
      prismaClient,
      parseMessage,
      archiveSource,
      writeLedger,
      createInbox,
    });

    expect(tx.brainInboxItem.findFirst).toHaveBeenCalledWith({
      where: {
        source: 'gmail',
        triageHint: { path: ['ledgerEventId'], equals: 'event-existing' },
      },
      select: { id: true },
    });
    expect(createInbox).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: 'ingested', sourceDocumentId: 'source-new' });
  });
});


describe('Gmail message-level deduplication', () => {
  it('fetches only a new reply while retaining earlier messages in the thread', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { messages: [{ id: 'message-old' }, { id: 'message-new' }] },
    });
    const gmail = { users: { threads: { get } } };
    const ingestMessage = vi.fn().mockResolvedValue({ status: 'ingested' });
    const findCompleted = vi.fn().mockResolvedValue(new Set(['message-old']));

    const result = await ingestGmailThread(gmail, 'thread-1', {
      prismaClient: prisma,
      ingestMessage,
      findCompleted,
    });

    expect(get).toHaveBeenCalledWith({ userId: 'me', id: 'thread-1', format: 'minimal' });
    expect(findCompleted).toHaveBeenCalledWith(['message-old', 'message-new'], prisma);
    expect(ingestMessage).toHaveBeenCalledTimes(1);
    expect(ingestMessage).toHaveBeenCalledWith(gmail, 'message-new', { prismaClient: prisma });
    expect(result).toEqual({ status: 'ingested', processed: 1, skipped: 1 });
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

  it('refreshes only completed recent streams while preserving the archive', async () => {
    const batch = vi.fn()
      .mockResolvedValueOnce({ complete: true, processed: 0, skipped: 0, errors: 0 })
      .mockResolvedValueOnce({ complete: true, processed: 0, skipped: 0, errors: 0 });
    prisma.brainSyncCursor.updateMany.mockReset();
    prisma.brainSyncCursor.updateMany.mockResolvedValue({ count: 0 });
    prisma.brainSyncCursor.findMany.mockResolvedValue([
      cursor({ id: 'recent-sent' }),
      cursor({
        id: 'recent-yum',
        stream: 'messages-v3:recent:yum',
        metadata: {
          label: 'yum',
          lane: 'recent',
          query: 'to:yum@example.com after:1',
          queryVersion: 3,
        },
      }),
    ]);

    const result = await syncGmailThreads({
      refreshRecent: true,
      maxBatches: 4,
      cutoffAt: new Date('2026-03-30T00:00:00.000Z'),
      dependencies: dependencies({ runNextThreadBatch: batch }),
    });

    expect(prisma.brainSyncCursor.upsert).toHaveBeenCalledTimes(4);
    expect(prisma.brainSyncCursor.update).toHaveBeenCalledTimes(2);
    for (const call of prisma.brainSyncCursor.update.mock.calls) {
      expect(call[0].data).toMatchObject({ status: 'pending', pageToken: null });
      expect(call[0].data.metadata).toMatchObject({ lane: 'recent', queryVersion: 3 });
    }
    expect(batch).toHaveBeenNthCalledWith(1, expect.objectContaining({ lane: 'recent' }));
    expect(batch).toHaveBeenNthCalledWith(2, expect.objectContaining({ lane: 'archive' }));
    expect(result).toMatchObject({
      complete: true,
      stoppedBy: 'complete',
      batches: 2,
      laneBatches: { recent: 1, archive: 1 },
    });
  });
});
