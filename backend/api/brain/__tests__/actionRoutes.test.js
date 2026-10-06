import { describe, expect, it } from 'vitest';

const { actionData } = require('../actionRoutes');

describe('Brain operational actions', () => {
  it('normalizes proposed recommendations into bounded durable fields', () => {
    expect(actionData({
      actionType: 'follow_up',
      title: 'Follow up with the venue',
      rationale: 'The quote is waiting on a date.',
      evidenceIds: ['a', 'a', '', 'b'],
      dueAt: '2026-10-10T12:00:00.000Z',
    })).toEqual(expect.objectContaining({
      actionType: 'follow_up',
      status: 'proposed',
      title: 'Follow up with the venue',
      evidenceIds: ['a', 'b'],
      dueAt: new Date('2026-10-10T12:00:00.000Z'),
    }));
  });

  it('rejects missing action titles', () => {
    expect(() => actionData({ actionType: 'follow_up' })).toThrow('title is required');
  });

  it('rejects unknown lifecycle statuses instead of silently defaulting', () => {
    expect(() => actionData({
      actionType: 'follow_up',
      title: 'Follow up with the venue',
      status: 'done',
    })).toThrow('invalid status');
  });
});
