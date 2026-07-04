import { describe, expect, it } from 'vitest';
import searchConsoleSync from '../searchConsoleSync';

const {
  calendarDateInTimeZone,
  completedDates,
  normalizePageUrl,
} = searchConsoleSync;

describe('searchConsoleSync helpers', () => {
  it('uses the Search Console Pacific calendar date near UTC midnight', () => {
    const now = new Date('2026-07-05T01:30:00.000Z');
    expect(calendarDateInTimeZone(now)).toBe('2026-07-04');
    expect(completedDates(3, now)).toEqual([
      '2026-06-30',
      '2026-07-01',
      '2026-07-02',
    ]);
  });

  it('returns completed dates in chronological order', () => {
    expect(completedDates(2, new Date('2026-07-10T18:00:00.000Z'))).toEqual([
      '2026-07-07',
      '2026-07-08',
    ]);
  });

  it('removes query strings and fragments from page evidence', () => {
    expect(normalizePageUrl('https://www.localeffortfood.com/book?utm_source=x#form')).toEqual({
      pageUrl: 'https://www.localeffortfood.com/book',
      page: '/book',
    });
  });
});
