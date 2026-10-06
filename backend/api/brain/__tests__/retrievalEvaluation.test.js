import { describe, expect, it } from 'vitest';

const { evaluateRetrieval } = require('../businessMemory');

describe('retrieval evaluation', () => {
  it('computes hit rate, reciprocal rank, and precision from ranked evidence', async () => {
    const result = await evaluateRetrieval(async (query) => ({
      results: query === 'pricing'
        ? [{ id: 'source:price-1' }, { id: 'source:other' }]
        : [{ id: 'source:other' }],
    }), [
      { name: 'pricing evidence', query: 'pricing', expectedIds: ['source:price-1'] },
      { name: 'missing feedback evidence', query: 'feedback', expectedIds: ['source:feedback-1'] },
    ]);

    expect(result.caseCount).toBe(2);
    expect(result.hitRate).toBe(0.5);
    expect(result.meanReciprocalRank).toBe(0.5);
    expect(result.meanPrecisionAtExpectedCount).toBe(0.5);
    expect(result.cases[0].hit).toBe(true);
    expect(result.cases[1].hit).toBe(false);
  });
});
