import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/prisma', () => ({ prisma: {} }));
vi.mock('../../brain/postBotMessage', () => ({ postBotMessage: vi.fn() }));

let saveAllPlannerCards;

beforeEach(async () => {
  vi.resetModules();
  ({ __internals: { saveAllPlannerCards } } = await import('../planner'));
});

describe('planner save-all helper', () => {
  it('keeps card ids stable and deletes missing rows', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const upsert = vi.fn().mockResolvedValue({});
    const transaction = vi.fn(async (callback) => callback({ plannerCard: { deleteMany, upsert } }));

    const prismaClient = { $transaction: transaction };
    const count = await saveAllPlannerCards(prismaClient, 'planner-user-1', [
      {
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
        costPerHour: null,
        optional: false,
        enabled: true,
        effectTarget: 'card-new',
        effectType: null,
        sortOrder: 1,
        status: 'todo',
        projectId: null,
        assigneeId: null,
        priority: 0,
        dueDate: null,
      },
      {
        id: 'card-new',
        templateId: null,
        title: 'Revenue boost',
        date: '2026-07-15',
        dayOfWeek: 'Wednesday',
        zone: 'timed',
        objectType: 'shift',
        people: [],
        startTime: '11:00',
        endTime: '12:00',
        revenue: 10000,
        cost: 0,
        costPerHour: null,
        optional: false,
        enabled: true,
        effectTarget: null,
        effectType: null,
        sortOrder: 2,
        status: 'todo',
        projectId: null,
        assigneeId: null,
        priority: 0,
        dueDate: null,
      },
    ]);

    expect(count).toBe(2);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { supabaseUid: 'planner-user-1', id: { notIn: ['card-existing', 'card-new'] } },
    });
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: 'card-existing' },
      create: expect.objectContaining({
        id: 'card-existing',
        supabaseUid: 'planner-user-1',
        effectTarget: 'card-new',
        objectType: 'event',
      }),
      update: expect.objectContaining({
        supabaseUid: 'planner-user-1',
        effectTarget: 'card-new',
        objectType: 'event',
      }),
    }));
    expect(upsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { id: 'card-new' },
      create: expect.objectContaining({
        id: 'card-new',
        supabaseUid: 'planner-user-1',
        title: 'Revenue boost',
        objectType: 'shift',
      }),
    }));
  });
});