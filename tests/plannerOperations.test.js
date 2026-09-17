import { describe, expect, it } from 'vitest';
import {
  capacityAssessment,
  displayWorkBlocks,
  evidenceHref,
  evidenceReferences,
} from '../src/components/weeklyplanner/plannerOperations';

function block(overrides = {}) {
  return {
    id: 'block',
    plannerCardId: 'event-a',
    blockType: 'service',
    date: '2026-09-12',
    startTime: '10:00',
    endTime: '14:00',
    status: 'scheduled',
    ...overrides,
  };
}

describe('planner capacity provenance', () => {
  it('flags an overlap only from complete recorded same-day windows', () => {
    const result = capacityAssessment('event-a', [
      block(),
      block({
        id: 'peer',
        plannerCardId: 'event-b',
        blockType: 'prep',
        startTime: '12:00',
        endTime: '13:00',
      }),
    ]);

    expect(result).toMatchObject({
      state: 'review',
      comparedBlockCount: 1,
      overlaps: [expect.objectContaining({ plannerCardId: 'event-b', blockType: 'prep' })],
    });
  });

  it('does not overstate availability when a relevant window lacks times', () => {
    const result = capacityAssessment('event-a', [
      block(),
      block({ id: 'peer', plannerCardId: 'event-b', startTime: null, endTime: null }),
    ]);

    expect(result).toMatchObject({ state: 'unknown', comparedBlockCount: 0 });
    expect(result.detail).toContain('1 relevant work window');
  });

  it('reports no recorded overlap when complete windows only touch at an edge', () => {
    const result = capacityAssessment('event-a', [
      block(),
      block({ id: 'peer', plannerCardId: 'event-b', startTime: '14:00', endTime: '16:00' }),
    ]);

    expect(result).toMatchObject({ state: 'clear', comparedBlockCount: 1, overlaps: [] });
    expect(result.label).toBe('No recorded overlap');
  });
});

describe('planner work and evidence derivation', () => {
  it('keeps missing prep visible instead of treating an event card as a single service block', () => {
    const [prep, service] = displayWorkBlocks([
      {
        id: 'event-a',
        objectType: 'event',
        title: 'Dinner',
        date: '2026-09-12',
        startTime: '17:00',
        endTime: '21:00',
        status: 'confirmed',
        financialMetadata: {},
      },
    ]);

    expect(prep).toMatchObject({ blockType: 'prep', status: 'needs_schedule', persisted: false });
    expect(service).toMatchObject({ blockType: 'service', status: 'scheduled', persisted: false });
  });

  it('deduplicates evidence references and only links supported destinations', () => {
    const card = {
      financialMetadata: {
        evidenceRefs: [' gmail:thread-1 ', 'gmail:thread-1', 'square-invoice:invoice-1'],
      },
    };

    expect(evidenceReferences(card)).toEqual(['gmail:thread-1', 'square-invoice:invoice-1']);
    expect(evidenceHref('gmail:thread-1')).toBe('https://mail.google.com/mail/u/0/#all/thread-1');
    expect(evidenceHref('square-invoice:invoice-1')).toBeNull();
  });
});
