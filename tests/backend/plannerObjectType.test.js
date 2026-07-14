import { describe, expect, it } from 'vitest';
import { cardToObject, isShiftCard, plannerCardObjectType } from '../../api-handlers/hub/_planner';

describe('planner card object type', () => {
  it('uses the explicit type before the legacy zone fallback', () => {
    const eventCard = { id: 'event-1', zone: 'timed', objectType: 'event', title: 'Catering service', people: [] };

    expect(plannerCardObjectType(eventCard)).toBe('event');
    expect(isShiftCard(eventCard)).toBe(false);
    expect(cardToObject(eventCard).type).toBe('event');
  });

  it('keeps legacy timed and untimed cards compatible', () => {
    expect(plannerCardObjectType({ zone: 'timed', objectType: null })).toBe('shift');
    expect(plannerCardObjectType({ zone: 'untimed', objectType: null })).toBe('prep_task');
  });
});