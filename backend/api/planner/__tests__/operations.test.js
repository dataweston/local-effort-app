import { describe, expect, it } from 'vitest';

const { addBillingInterval, billingOccurrences } = await import('../billingSchedule.js');
const { cardRevenueCents, eventOrderStatus, reportedCash } = await import('../commercialLedger.js');
const { eventStatus, projectionPayload } = await import('../evidenceReconciliation.js');
const { eventWindow, googleEventBody } = await import('../googleCalendarSync.js');
const { eventWorkBlockSpecs, reconcilePlannerWorkBlocks } = await import('../workBlocks.js');

function eventCard(overrides = {}) {
  return {
    id: 'event-a',
    supabaseUid: 'planner-a',
    objectType: 'event',
    title: 'Anniversary dinner',
    date: '2026-09-12',
    startTime: '18:00',
    endTime: '22:00',
    status: 'confirmed',
    enabled: true,
    financialMetadata: {
      location: 'Roseville',
      prepDate: '2026-09-11',
      prepStartTime: '13:00',
      prepEndTime: '17:00',
    },
    ...overrides,
  };
}

describe('planner work-block reconciliation', () => {
  it('models prep and service separately and only resyncs changed source data', async () => {
    const rows = new Map();
    const prisma = {
      plannerWorkBlock: {
        findMany: async () => [...rows.values()],
        upsert: async ({ where, update, create }) => {
          const key = `${where.plannerCardId_blockType.plannerCardId}:${where.plannerCardId_blockType.blockType}`;
          const current = rows.get(key);
          const row = { id: current?.id || key, ...(current ? { ...current, ...update } : create) };
          rows.set(key, row);
          return row;
        },
      },
    };

    const first = await reconcilePlannerWorkBlocks(prisma, 'planner-a', [eventCard()], []);
    expect(first).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          blockType: 'service',
          status: 'scheduled',
          syncStatus: 'pending',
        }),
        expect.objectContaining({ blockType: 'prep', status: 'scheduled', syncStatus: 'pending' }),
      ])
    );

    for (const [key, row] of rows)
      rows.set(key, { ...row, syncStatus: 'synced', googleEventId: `google-${row.blockType}` });
    const unchanged = await reconcilePlannerWorkBlocks(prisma, 'planner-a', [eventCard()], []);
    expect(unchanged.every((row) => row.syncStatus === 'synced')).toBe(true);

    const changed = await reconcilePlannerWorkBlocks(
      prisma,
      'planner-a',
      [eventCard({ title: 'Updated dinner' })],
      []
    );
    expect(changed.every((row) => row.syncStatus === 'pending')).toBe(true);
  });

  it('keeps an unscheduled prep obligation explicit', () => {
    const [service, prep] = eventWorkBlockSpecs(eventCard({ financialMetadata: {} }));
    expect(service).toMatchObject({ blockType: 'service', status: 'scheduled' });
    expect(prep).toMatchObject({ blockType: 'prep', status: 'needs_schedule', date: null });
  });
});

describe('Google Calendar event contract', () => {
  it('creates opaque attendee-free events with disabled reminders', () => {
    const service = eventWorkBlockSpecs(eventCard())[0];
    const body = googleEventBody(service, eventCard());

    expect(body).toMatchObject({
      summary: 'SERVICE · Anniversary dinner',
      transparency: 'opaque',
      reminders: { useDefault: false },
      extendedProperties: {
        private: { localEffortPlannerCardId: 'event-a', localEffortWorkBlock: 'service' },
      },
    });
    expect(body).not.toHaveProperty('attendees');
  });

  it('places an overnight end time on the following calendar day', () => {
    expect(
      eventWindow({
        blockType: 'service',
        date: '2026-09-12',
        startTime: '20:00',
        endTime: '01:00',
      })
    ).toEqual({
      start: { dateTime: '2026-09-12T20:00:00', timeZone: 'America/Chicago' },
      end: { dateTime: '2026-09-13T01:00:00', timeZone: 'America/Chicago' },
    });
  });
});

describe('commercial and evidence projection rules', () => {
  it('preserves cents, payment evidence state, and source references', () => {
    const card = eventCard({
      revenue: 125.5,
      revenueCents: null,
      cashReceivedCents: 5000,
      financialSource: 'owner_reported',
      financialMetadata: {
        ...eventCard().financialMetadata,
        cashReceivedAt: '2026-09-01',
        evidenceRefs: ['gmail:thread-1', ' gmail:thread-1 ', 'square-invoice:invoice-1'],
      },
    });

    expect(cardRevenueCents(card)).toBe(12550);
    expect(reportedCash(card)).toMatchObject({ amountCents: 5000, evidenceState: 'dated_report' });
    expect(eventOrderStatus(card)).toBe('booked');
    expect(projectionPayload(card, [])).toMatchObject({
      revenueCents: 12550,
      evidenceRefs: ['gmail:thread-1', 'square-invoice:invoice-1'],
      evidenceState: 'referenced',
    });
    expect(eventStatus({ ...card, status: 'done' })).toBe('completed');
  });

  it('expands recurring billing deterministically across month ends', () => {
    expect(addBillingInterval('2026-01-31', 'monthly_month_end')).toBe('2026-02-28');
    expect(billingOccurrences('2026-01-31', 'monthly_month_end', '2026-04-30')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });
});
