import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildCalendar, parseCalendar, groupIntoRanges, addDaysIso, eachDay } = require('../ical.js');

// A real Airbnb export shape. The DTEND here is the 3rd, which means the 1st
// and 2nd are blocked and the 3rd is free.
const AIRBNB_FEED = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Airbnb Inc//Hosting Calendar 1.0.0//EN',
  'CALSCALE:GREGORIAN',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20260901',
  'DTEND;VALUE=DATE:20260903',
  'UID:abc123@airbnb.com',
  'SUMMARY:Reserved',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('ical parsing', () => {
  it('treats DTEND as exclusive so an imported stay does not leak a phantom day', () => {
    const [event] = parseCalendar(AIRBNB_FEED);
    expect(event.start).toBe('2026-09-01');
    expect(event.end).toBe('2026-09-02');
    expect(event.days).toEqual(['2026-09-01', '2026-09-02']);
    expect(event.days).not.toContain('2026-09-03');
  });

  it('reads a single-day block where DTEND is absent', () => {
    const feed = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20261015',
      'UID:solo@example.com',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const [event] = parseCalendar(feed);
    expect(event.days).toEqual(['2026-10-15']);
  });

  it('unfolds continuation lines before reading properties', () => {
    const feed = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20261101',
      'DTEND;VALUE=DATE:20261102',
      'SUMMARY:Anniversary dinner for the Ol',
      ' son family',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const [event] = parseCalendar(feed);
    expect(event.summary).toBe('Anniversary dinner for the Olson family');
  });

  it('unescapes commas, semicolons and newlines in TEXT values', () => {
    const feed = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20261101',
      'SUMMARY:Reception\\, 40 guests\\; bar\\nsetup at 4',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const [event] = parseCalendar(feed);
    expect(event.summary).toBe('Reception, 40 guests; bar\nsetup at 4');
  });

  it('ignores malformed input rather than throwing', () => {
    expect(parseCalendar('')).toEqual([]);
    expect(parseCalendar(null)).toEqual([]);
    expect(parseCalendar('not a calendar at all')).toEqual([]);
    expect(parseCalendar('BEGIN:VEVENT\r\nSUMMARY:no start\r\nEND:VEVENT')).toEqual([]);
  });
});

describe('ical building', () => {
  it('emits an exclusive DTEND so subscribers see the right last night', () => {
    const out = buildCalendar({
      name: 'FIREHOUSE',
      events: [{ uid: 'x@localeffortfood.com', start: '2026-09-01', end: '2026-09-02' }],
    });
    expect(out).toContain('DTSTART;VALUE=DATE:20260901');
    expect(out).toContain('DTEND;VALUE=DATE:20260903');
  });

  it('round-trips a parsed feed without drifting by a day', () => {
    const parsed = parseCalendar(AIRBNB_FEED);
    const reparsed = parseCalendar(buildCalendar({ name: 'FIREHOUSE', events: parsed }));
    expect(reparsed[0].days).toEqual(parsed[0].days);
  });

  it('folds long lines at 75 octets with a leading-space continuation', () => {
    const out = buildCalendar({
      name: 'FIREHOUSE',
      events: [{ start: '2026-10-05', summary: 'x'.repeat(200) }],
    });
    const lines = out.split('\r\n');
    expect(lines.every((line) => Buffer.from(line, 'utf8').length <= 75)).toBe(true);
    expect(lines.some((line) => line.startsWith(' '))).toBe(true);
  });

  it('folds multi-byte names on codepoint boundaries', () => {
    const out = buildCalendar({ name: `Café ${'é'.repeat(60)}`, events: [] });
    expect(out).not.toContain('�');
    expect(out.split('\r\n').every((line) => Buffer.from(line, 'utf8').length <= 75)).toBe(true);
  });

  it('escapes separators in a summary so one event cannot forge another property', () => {
    const out = buildCalendar({
      name: 'FIREHOUSE',
      events: [{ start: '2026-10-05', summary: 'Reception, 40 guests; bar' }],
    });
    expect(out).toContain('SUMMARY:Reception\\, 40 guests\\; bar');
  });

  it('emits a refresh interval matching the slowest consumer', () => {
    const out = buildCalendar({ name: 'FIREHOUSE', events: [] });
    expect(out).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT2H');
  });
});

describe('date helpers', () => {
  it('crosses month and year boundaries', () => {
    expect(addDaysIso('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('handles a leap day', () => {
    expect(addDaysIso('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('collapses contiguous days into one range per stay', () => {
    expect(groupIntoRanges(['2026-10-02', '2026-10-01', '2026-10-04'])).toEqual([
      { start: '2026-10-01', end: '2026-10-02' },
      { start: '2026-10-04', end: '2026-10-04' },
    ]);
  });

  it('enumerates an inclusive day range', () => {
    expect(eachDay('2026-10-01', '2026-10-03')).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });
});
