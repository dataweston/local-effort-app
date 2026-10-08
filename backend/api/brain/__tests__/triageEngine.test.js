import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
  ingestProcess: vi.fn(),
  writeLedgerEvent: vi.fn(),
}));


import triageEngine from '../triageEngine';

const { runTriagePass } = triageEngine;
const item = {
  id: 'inbox-1',
  rawContent: 'synthetic inbox content',
  source: 'test',
  triageHint: { ledgerEventId: 'source-event-1' },
};
const deferredClassification = {
  intent: 'needs_human',
  confidence: 0.2,
  fields: { category: 'synthetic' },
  preview: { summary: 'synthetic summary' },
  needsConfirmReason: 'low-confidence',
  via: 'test',
  committed: false,
};
const prismaClient = {
  brainInboxItem: {
    findMany: mocks.findMany,
    update: mocks.update,
    count: mocks.count,
  },
};
const runPass = () => runTriagePass({
  prismaClient,
  processItem: mocks.ingestProcess,
  writeLedgerEventFn: mocks.writeLedgerEvent,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockResolvedValue({});
  mocks.writeLedgerEvent.mockResolvedValue({});
});

describe('runTriagePass lifecycle eligibility', () => {
  it('classifies source-ledger-only hints and preserves the evidence ID', async () => {
    mocks.findMany.mockResolvedValue([item]);
    mocks.count.mockResolvedValue(0);
    mocks.ingestProcess.mockResolvedValue(deferredClassification);

    const summary = await runPass();

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'pending', triageState: 'eligible' },
      orderBy: { capturedAt: 'asc' },
    }));
    expect(mocks.ingestProcess).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: item.id },
      data: expect.objectContaining({
        triageState: 'classified',
        triageHint: expect.objectContaining({ ledgerEventId: 'source-event-1', intent: 'needs_human' }),
      }),
    }));
    expect(summary).toMatchObject({ itemsProcessed: 1, itemsWritten: 1, eligibleBacklog: 0, deferred: 1 });
  });

  it('selects only eligible pending items, excluding already classified hints', async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);

    const summary = await runPass();

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'pending', triageState: 'eligible' },
    }));
    expect(mocks.ingestProcess).not.toHaveBeenCalled();
    expect(summary.noNewData).toBe(true);
  });

  it('keeps failed items eligible so a later pass retries them', async () => {
    mocks.findMany.mockResolvedValue([item]);
    mocks.count.mockResolvedValue(1);
    mocks.ingestProcess
      .mockRejectedValueOnce(new Error('temporary classifier failure'))
      .mockResolvedValueOnce(deferredClassification);

    const failedPass = await runPass();
    expect(failedPass).toMatchObject({ itemsProcessed: 1, itemsWritten: 0, eligibleBacklog: 1, status: 'partial' });
    expect(failedPass.errors).toHaveLength(1);
    expect(mocks.update).not.toHaveBeenCalled();

    mocks.count.mockResolvedValue(0);
    const retryPass = await runPass();
    expect(mocks.findMany).toHaveBeenCalledTimes(2);
    expect(retryPass).toMatchObject({ itemsProcessed: 1, itemsWritten: 1, eligibleBacklog: 0 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ triageState: 'classified' }),
    }));
  });

  it('reports noNewData only for an empty eligible backlog and blocks stalled work', async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValueOnce(0).mockResolvedValueOnce(3);

    const emptyPass = await runPass();
    expect(emptyPass).toMatchObject({ noNewData: true, eligibleBacklog: 0 });

    const stalledPass = await runPass();
    expect(stalledPass).toMatchObject({ blocked: true, status: 'blocked', eligibleBacklog: 3 });
    expect(stalledPass.noNewData).not.toBe(true);
  });
});
