import { beforeEach, describe, expect, it, vi } from 'vitest';

for (const key of [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
  'VERCEL_POSTGRES_URL',
  'VERCEL_POSTGRES_URL_NON_POOLING',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NO_SSL',
])
  delete process.env[key];

const state = {
  cards: new Map(),
  entities: [],
  ledgerEvents: [],
  workBlocks: new Map(),
};

const prismaMock = {
  $transaction: vi.fn(async (callback) => callback(prismaMock)),
  plannerCard: {
    findUnique: vi.fn(async ({ where }) => state.cards.get(where.id) || null),
    create: vi.fn(async ({ data }) => {
      const row = {
        ...data,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };
      state.cards.set(row.id, row);
      return row;
    }),
  },
  plannerWorkBlock: {
    findMany: vi.fn(async ({ where }) =>
      [...state.workBlocks.values()].filter(
        (block) =>
          block.supabaseUid === where.supabaseUid &&
          (!where.plannerCardId?.in || where.plannerCardId.in.includes(block.plannerCardId))
      )
    ),
    upsert: vi.fn(async ({ where, update, create }) => {
      const key = `${where.plannerCardId_blockType.plannerCardId}:${where.plannerCardId_blockType.blockType}`;
      const existing = state.workBlocks.get(key);
      const row = {
        id: existing?.id || `work-block-${state.workBlocks.size + 1}`,
        ...(existing ? { ...existing, ...update } : create),
      };
      state.workBlocks.set(key, row);
      return row;
    }),
  },
  brainEntity: {
    findFirst: vi.fn(
      async ({ where }) =>
        state.entities.find(
          (entity) =>
            entity.entityType === where.entityType &&
            entity.plannerCardId === where.plannerCardId &&
            entity.tombstonedAt === where.tombstonedAt
        ) || null
    ),
    create: vi.fn(async ({ data }) => {
      const row = { id: `entity-${state.entities.length + 1}`, tombstonedAt: null, ...data };
      state.entities.push(row);
      return row;
    }),
  },
  ledgerEvent: {
    findFirst: vi.fn(
      async ({ where }) =>
        state.ledgerEvents.find(
          (event) =>
            event.eventType === where.eventType &&
            event.source === where.source &&
            event.sourceId === where.sourceId &&
            event.tombstonedAt === where.tombstonedAt
        ) || null
    ),
    create: vi.fn(async ({ data }) => {
      const row = {
        id: `ledger-${state.ledgerEvents.length + 1}`,
        tombstonedAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        ...data,
      };
      state.ledgerEvents.push(row);
      return row;
    }),
    update: vi.fn(async ({ where, data }) => {
      const index = state.ledgerEvents.findIndex((event) => event.id === where.id);
      const row = { ...state.ledgerEvents[index], ...data };
      state.ledgerEvents[index] = row;
      return row;
    }),
  },
};

globalThis.__localEffortPrisma = prismaMock;

const { classifyDeterministic } = await import('../ingest/classify.js');
const { isValidPlannerDate, process: processCapture } = await import('../ingest/engine.js');

const structuredCapture =
  'event: Happy Monday anniversary | date: 2026-09-12 | time: 8am-4pm | location: Roseville | guests: 75 | menu: pizzas | prep: 2026-09-11 1pm-5pm';

describe('event capture classification', () => {
  it('extracts service and prep work without turning field labels into the title', () => {
    const result = classifyDeterministic(structuredCapture, { today: '2026-01-01' });

    expect(result).toMatchObject({
      intent: 'event',
      fields: {
        title: 'Happy Monday anniversary',
        date: '2026-09-12',
        startTime: '08:00',
        endTime: '16:00',
        location: 'Roseville',
        guestEstimate: 75,
        menuSummary: 'pizzas',
        prepDate: '2026-09-11',
        prepStartTime: '13:00',
        prepEndTime: '17:00',
      },
    });
  });

  it('does not mistake a leading weekday for the event title', () => {
    const result = classifyDeterministic(
      'event: Sat 9/12/2026 8am-4pm Happy Monday anniversary, Roseville, pizzas à la carte',
      { today: '2026-01-01' }
    );

    expect(result.fields.title).toBe('Happy Monday anniversary, Roseville, pizzas à la carte');
    expect(result.fields.date).toBe('2026-09-12');
  });

  it('rejects calendar-shaped but impossible dates', () => {
    const result = classifyDeterministic('event: Impossible dinner | date: 2026-02-30', {
      today: '2026-01-01',
    });

    expect(result.fields.date).toBeNull();
    expect(isValidPlannerDate('2026-02-30')).toBe(false);
    expect(isValidPlannerDate('2026-02-28')).toBe(true);
  });
});

describe('event capture application', () => {
  beforeEach(() => {
    state.cards.clear();
    state.entities.length = 0;
    state.ledgerEvents.length = 0;
    state.workBlocks.clear();
    vi.clearAllMocks();
  });

  it('requires preview confirmation and idempotently creates one planner event', async () => {
    const context = {
      today: '2026-01-01',
      plannerUid: 'master-planner',
      source: 'planner_quick_capture',
      captureId: 'capture-happy-monday',
      customerName: 'Happy Monday',
      evidenceRefs: ['gmail:thread-123', 'gmail:thread-123'],
    };

    const preview = await processCapture(structuredCapture, context, { commit: false });
    expect(preview).toMatchObject({
      intent: 'event',
      committed: false,
      needsConfirm: true,
      needsConfirmReason: 'event-always-confirm',
    });
    expect(state.cards.size).toBe(0);

    const first = await processCapture(
      structuredCapture,
      { ...context, force: true },
      { commit: true }
    );
    const second = await processCapture(
      structuredCapture,
      { ...context, force: true },
      { commit: true }
    );

    expect(first.committed).toBe(true);
    expect(first.applied).toMatchObject({ kind: 'event', existing: false });
    expect(first.applied.card).toMatchObject({
      supabaseUid: 'master-planner',
      objectType: 'event',
      title: 'Happy Monday anniversary',
      date: '2026-09-12',
      dayOfWeek: 'Saturday',
      startTime: '08:00',
      endTime: '16:00',
      status: 'inquiry',
      financialMetadata: {
        clientName: 'Happy Monday',
        evidenceRefs: ['gmail:thread-123'],
        prepSchedulingStatus: 'scheduled',
        prepDate: '2026-09-11',
        prepStartTime: '13:00',
        prepEndTime: '17:00',
      },
    });
    expect(second.applied.existing).toBe(true);
    expect(state.cards.size).toBe(1);
    expect(state.entities).toHaveLength(1);
    expect(state.entities[0]).toMatchObject({
      entityType: 'Event',
      plannerCardId: first.applied.plannerCardId,
    });
    expect(
      state.ledgerEvents.filter((event) => event.eventType === 'planner.event.captured')
    ).toHaveLength(1);
    expect([...state.workBlocks.values()]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          blockType: 'service',
          plannerCardId: first.applied.plannerCardId,
        }),
        expect.objectContaining({ blockType: 'prep', plannerCardId: first.applied.plannerCardId }),
      ])
    );
  });
});
