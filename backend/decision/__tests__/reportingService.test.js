import { describe, expect, it } from 'vitest';
import { summarizeEvents } from '../reportingService';

describe('decision reporting service', () => {
  it('summarizes event counts and top priorities', () => {
    const summary = summarizeEvents([
      { eventType: 'decision.rendered', variant: 'rules', strategy: 'orient', selectedPriorityIds: ['home-small-events'] },
      { eventType: 'decision.clicked', variant: 'rules', strategy: 'orient', selectedPriorityIds: ['home-small-events'] },
      { eventType: 'decision.rendered', variant: 'control', strategy: 'orient', selectedPriorityIds: [] },
    ]);

    expect(summary.totals.rendered).toBe(2);
    expect(summary.totals.clicked).toBe(1);
    expect(summary.clickThroughRate).toBe(0.5);
    expect(summary.topPriorities[0]).toEqual({ priorityId: 'home-small-events', count: 2 });
  });
});
