import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/prisma', () => ({ prisma: {} }));
vi.mock('../../brain/postBotMessage', () => ({ postBotMessage: vi.fn() }));

let plannerUidForUser;
let applyPlannerCardChanges;

beforeEach(async () => {
  vi.resetModules();
  ({
    __internals: { plannerUidForUser, applyPlannerCardChanges },
  } = await import('../planner'));
});

describe('planner identity helper', () => {
  it('uses the shared master planner for admins', () => {
    expect(
      plannerUidForUser(
        { id: 'admin-user', email: 'dataweston@gmail.com' },
        { HUB_MASTER_SUPABASE_UID: 'master-planner' }
      )
    ).toBe('master-planner');
  });

  it('keeps non-admin planners isolated', () => {
    expect(
      plannerUidForUser(
        { id: 'staff-user', email: 'staff@example.com' },
        { HUB_MASTER_SUPABASE_UID: 'master-planner' }
      )
    ).toBe('staff-user');
  });
});

describe('planner card change helper', () => {
  const existingCard = {
    id: 'card-existing',
    templateId: null,
    title: 'Weekly prep updated',
    date: '2026-07-14',
    dayOfWeek: 'Tuesday',
    zone: 'timed',
    objectType: 'event',
    people: ['Avery'],
    startTime: '08:00',
    endTime: '10:00',
    revenue: 15000,
    cost: 5000,
    optional: false,
    enabled: true,
    sortOrder: 1,
    status: 'todo',
    priority: 0,
  };

  it('upserts changed cards and deletes only explicit ids', async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([{ id: 'card-existing', supabaseUid: 'planner-user-1' }]);
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const upsert = vi.fn().mockResolvedValue({});
    const workBlockFindMany = vi.fn().mockResolvedValue([]);
    const workBlockUpsert = vi.fn(async ({ create }) => ({
      id: `${create.plannerCardId}:${create.blockType}`,
      ...create,
    }));
    const transaction = vi.fn(async (callback) =>
      callback({
        plannerCard: { findMany, deleteMany, upsert },
        plannerWorkBlock: { findMany: workBlockFindMany, upsert: workBlockUpsert },
      })
    );

    const result = await applyPlannerCardChanges(
      { $transaction: transaction },
      'planner-user-1',
      [existingCard],
      ['card-removed']
    );

    expect(result).toEqual({ upserted: 1, deleted: 1 });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { supabaseUid: 'planner-user-1', id: { in: ['card-removed'] } },
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { id: 'card-existing' },
      create: expect.objectContaining({
        id: 'card-existing',
        supabaseUid: 'planner-user-1',
        objectType: 'event',
      }),
      update: expect.not.objectContaining({ supabaseUid: expect.anything() }),
    });
    expect(workBlockUpsert).toHaveBeenCalledTimes(2);
  });

  it('does not delete anything for an empty change set', async () => {
    const deleteMany = vi.fn();
    const upsert = vi.fn();
    const transaction = vi.fn(async (callback) =>
      callback({
        plannerCard: { findMany: vi.fn(), deleteMany, upsert },
      })
    );

    await expect(
      applyPlannerCardChanges({ $transaction: transaction }, 'planner-user-1', [], [])
    ).resolves.toEqual({ upserted: 0, deleted: 0 });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects attempts to overwrite another planner owner', async () => {
    const deleteMany = vi.fn();
    const upsert = vi.fn();
    const transaction = vi.fn(async (callback) =>
      callback({
        plannerCard: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: 'card-existing', supabaseUid: 'different-planner' }]),
          deleteMany,
          upsert,
        },
      })
    );

    await expect(
      applyPlannerCardChanges({ $transaction: transaction }, 'planner-user-1', [existingCard], [])
    ).rejects.toThrow('belongs to another planner');
    expect(deleteMany).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });
});
