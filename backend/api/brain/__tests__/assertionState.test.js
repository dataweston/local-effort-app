import { describe, expect, it } from 'vitest';

const { currentAssertionWhere, currentAssertionSql } = require('../assertionState');

describe('current assertion state', () => {
  it('requires an assertion to be live and valid at the read time', () => {
    const now = new Date('2026-10-06T12:00:00.000Z');
    expect(currentAssertionWhere(now)).toEqual({
      retractedAt: null,
      supersededAt: null,
      supersededBy: null,
      knownUntil: null,
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
    });
  });

  it('emits the same lifecycle constraints for SQL retrieval', () => {
    const sql = currentAssertionSql('a').strings.join(' ');
    expect(sql).toContain('"retractedAt" IS NULL');
    expect(sql).toContain('"supersededAt" IS NULL');
    expect(sql).toContain('"supersededBy" IS NULL');
    expect(sql).toContain('"knownUntil" IS NULL');
    expect(sql).toContain('"validFrom" <= CURRENT_TIMESTAMP');
    expect(sql).toContain('"validUntil" > CURRENT_TIMESTAMP');
  });
});
