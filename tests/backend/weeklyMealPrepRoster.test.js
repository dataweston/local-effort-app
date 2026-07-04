import { describe, expect, it } from 'vitest';
import weeklyMealPrepHandler from '../../api-handlers/hub/weekly-meal-prep';

const { splitRosterCustomers } = weeklyMealPrepHandler._internals;

describe('weekly meal prep roster classification', () => {
  it('keeps paused customers out of the active roster', () => {
    const result = splitRosterCustomers([
      { id: 'tyler', name: 'Tyler Cooper', mealPrepStage: 'paused' },
      { id: 'samantha', name: 'Samantha Bailey', mealPrepStage: 'active' },
      { id: 'catherine', name: 'Catherine Squires', mealPrepStage: 'active' },
    ]);

    expect(result.active.map((customer) => customer.name)).toEqual([
      'Catherine Squires',
      'Samantha Bailey',
    ]);
    expect(result.paused.map((customer) => customer.name)).toEqual(['Tyler Cooper']);
  });

  it('treats legacy roster rows without a stage as active', () => {
    const result = splitRosterCustomers([
      { id: 'legacy', name: 'Legacy Customer' },
    ]);

    expect(result.active).toHaveLength(1);
    expect(result.paused).toHaveLength(0);
  });
});
