import { describe, expect, it } from 'vitest';
import { createDecisionAssignmentService, hashToBucket } from '../assignmentService';

describe('decision assignment service', () => {
  it('produces stable buckets for the same input', () => {
    expect(hashToBucket('adaptive-welcome-v1:sess-123')).toBe(hashToBucket('adaptive-welcome-v1:sess-123'));
  });

  it('assigns deterministically for the same session and experiment', () => {
    const service = createDecisionAssignmentService();
    const first = service.assign({ sessionId: 'sess-123', experimentKey: 'adaptive-welcome-v1' });
    const second = service.assign({ sessionId: 'sess-123', experimentKey: 'adaptive-welcome-v1' });

    expect(first).toEqual(second);
    expect(['control', 'rules']).toContain(first.variant);
  });
});
