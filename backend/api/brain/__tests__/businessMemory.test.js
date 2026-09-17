import { describe, expect, it, vi } from 'vitest';
import businessMemoryModule from '../businessMemory';

const { buildBusinessContext, searchBusinessMemory, validateSynthesis } = businessMemoryModule;

const occurredAt = new Date('2026-03-30T12:00:00.000Z');
const tylerRows = [
  {
    id: 'rate-four-week',
    kind: 'source',
    source: 'gmail',
    sourceId: 'message-rate',
    occurredAt,
    title: 'Normal cadence',
    text: 'The normal four-week service rate is $1,444.',
    score: 3,
    metadata: {},
  },
  {
    id: 'rate-three-week',
    kind: 'ledger',
    source: 'gmail',
    sourceId: 'message-adjustment',
    occurredAt,
    title: 'Three-week adjustment',
    text: 'The three-week amount is $1,088 because one prior week of service was not delivered and is credited here.',
    score: 2.5,
    metadata: {},
  },
  {
    id: 'membership',
    kind: 'owner',
    source: 'gmail',
    sourceId: 'message-membership',
    occurredAt,
    title: 'Membership',
    text: 'The annual membership is a separate $375 charge.',
    score: 2,
    metadata: {},
  },
];

function sourcePrisma(rows = tylerRows) {
  return { $queryRaw: vi.fn().mockResolvedValue(rows) };
}

function tylerMemoryPrisma() {
  return {
    $queryRaw: vi.fn()
      .mockResolvedValueOnce([tylerRows[0]])
      .mockResolvedValueOnce([tylerRows[1]])
      .mockResolvedValueOnce([tylerRows[2]]),
  };
}

describe('shared Company Brain context', () => {
  it('uses broad ranked terms so one question retrieves facts split across sources', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockImplementation((sql) => {
        expect(sql.values).toContain('"pricing" OR "discrepancy" OR "tyler"');
        return Promise.resolve(tylerRows);
      }),
    };

    const result = await searchBusinessMemory(
      'What was the pricing discrepancy with Tyler?',
      { kinds: ['source'], limit: 12, prismaClient: prisma }
    );

    expect(result.results).toHaveLength(3);
  });

  it('keeps all supporting details available for a like-for-like reconciliation', async () => {
    const llm = vi.fn(async ({ prompt }) => {
      for (const detail of ['$1,444', '$1,088', 'not delivered', '$375']) {
        expect(prompt).toContain(detail);
      }
      return {
        via: 'test-synthesis',
        data: {
          answer: 'There is no discrepancy after a like-for-like normalization.',
          supportedClaims: [
            {
              claim: 'The normal four-week rate is $1,444.',
              quotes: [{ evidenceId: 'source:rate-four-week', quote: 'The normal four-week service rate is $1,444.' }],
              qualifiers: [],
            },
            {
              claim: 'The three-week amount is $1,088 because of the prior undelivered-service credit.',
              quotes: [{ evidenceId: 'ledger:rate-three-week', quote: 'The three-week amount is $1,088 because one prior week of service was not delivered and is credited here.' }],
              qualifiers: [],
            },
            {
              claim: 'The $375 annual membership is separate.',
              quotes: [{ evidenceId: 'owner:membership', quote: 'The annual membership is a separate $375 charge.' }],
              qualifiers: [],
            },
          ],
          reconciliations: [{
            topic: 'Tyler billing',
            normalizedComparison: '$1,444 is the normal four-week rate; $1,088 covers three weeks after the prior undelivered-service credit; $375 is separate annual membership.',
            conclusion: 'No discrepancy remains after comparing like with like.',
            evidenceIds: ['source:rate-four-week', 'ledger:rate-three-week', 'owner:membership'],
          }],
          conflicts: [],
          unknowns: [],
        },
      };
    });

    const context = await buildBusinessContext('Tyler rate discrepancy', {
      kinds: ['source', 'ledger', 'owner'],
      limit: 12,
      prismaClient: tylerMemoryPrisma(),
      llm,
      llmAvailable: () => true,
    });

    expect(context.evidence).toHaveLength(3);
    expect(context.synthesis.answer).toBe('There is no discrepancy after a like-for-like normalization.');
    expect(context.synthesis.evidenceValidation).toEqual({
      valid: true,
      rejectedQuotes: 0,
      rejectedEvidenceIds: 0,
    });
    expect(context.synthesis.reconciliations[0]).toMatchObject({
      conclusion: 'No discrepancy remains after comparing like with like.',
      evidenceIds: ['source:rate-four-week', 'ledger:rate-three-week', 'owner:membership'],
    });
    expect(context.synthesisCoverage.includedIds).toEqual([
      'source:rate-four-week',
      'ledger:rate-three-week',
      'owner:membership',
    ]);
  });

  it('returns the complete evidence set when synthesis is unavailable', async () => {
    const context = await buildBusinessContext('Tyler rate discrepancy', {
      kinds: ['source', 'ledger', 'owner'],
      prismaClient: tylerMemoryPrisma(),
      llm: vi.fn().mockRejectedValue(new Error('provider unavailable')),
      llmAvailable: () => true,
    });

    expect(context.evidence).toHaveLength(3);
    expect(context.synthesis).toBeNull();
    expect(context.synthesisMethod).toBe('evidence-only');
    expect(context.synthesisError).toBe('provider unavailable');
  });

  it('removes fabricated quotations and invalid evidence references', () => {
    const evidence = [{ id: 'source:real', text: 'The source says exactly $375 annual membership.' }];
    const result = validateSynthesis({
      answer: 'Unsupported answer',
      supportedClaims: [
        {
          claim: 'Supported',
          quotes: [{ evidenceId: 'source:real', quote: 'exactly $375 annual membership' }],
          qualifiers: [],
        },
        {
          claim: 'Fabricated',
          quotes: [{ evidenceId: 'source:real', quote: 'a made-up $999 amount' }],
          qualifiers: [],
        },
      ],
      reconciliations: [],
      conflicts: [{ description: 'Fake conflict', evidenceIds: ['source:real', 'source:missing'] }],
      unknowns: [],
    }, evidence);

    expect(result.supportedClaims).toHaveLength(1);
    expect(result.supportedClaims[0].claim).toBe('Supported');
    expect(result.conflicts).toEqual([]);
    expect(result.answer).toBe('Supported');
    expect(result.evidenceValidation).toEqual({
      valid: false,
      rejectedQuotes: 1,
      rejectedEvidenceIds: 1,
    });
  });
});
