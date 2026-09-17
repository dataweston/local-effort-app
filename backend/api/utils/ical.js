// Minimal RFC 5545 reader/writer for venue availability.
//
// No dependency: the whole surface we need is all-day VEVENTs, which is what
// Airbnb, Vrbo, Booking.com and Lodgify emit for a blocked night and what
// Google Calendar accepts on subscribe. A library would carry recurrence,
// timezone databases and attendee handling we would never call.
//
// The one detail that breaks naive implementations: for an all-day event
// DTEND is EXCLUSIVE. Airbnb blocking Sep 1-2 emits DTSTART:20260901 /
// DTEND:20260903. Read it as inclusive and you leak a phantom blocked day on
// every imported reservation, which shows up as a calendar that is always one
// day more booked than the truth.

const MAX_LINE_OCTETS = 75;

/** YYYY-MM-DD -> YYYYMMDD */
const toIcalDate = (iso) => String(iso).slice(0, 10).replace(/-/g, '');

/** YYYYMMDD -> YYYY-MM-DD */
const fromIcalDate = (value) => {
  const digits = String(value).trim().slice(0, 8);
  if (!/^\d{8}$/.test(digits)) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
};

const toIcalStamp = (date) => `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

/** Add whole days to a YYYY-MM-DD string without touching the local timezone. */
const addDaysIso = (iso, days) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};

/** Inclusive day range between two YYYY-MM-DD strings. */
const eachDay = (startIso, endIsoInclusive) => {
  const out = [];
  let cursor = startIso;
  let guard = 0;
  while (cursor <= endIsoInclusive && guard < 1000) {
    out.push(cursor);
    cursor = addDaysIso(cursor, 1);
    guard += 1;
  }
  return out;
};

// RFC 5545 3.3.11: backslash, semicolon, comma and newline are escaped in TEXT.
const escapeText = (value) =>
  String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

const unescapeText = (value) =>
  String(value == null ? '' : value)
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');

// RFC 5545 3.1: content lines fold at 75 octets and continuations begin with a
// single space. Measured in octets, not characters, or a multi-byte venue name
// splits mid-codepoint and the far end drops the line.
const foldLine = (line) => {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= MAX_LINE_OCTETS) return line;

  const parts = [];
  let offset = 0;
  let budget = MAX_LINE_OCTETS;
  while (offset < bytes.length) {
    let take = Math.min(budget, bytes.length - offset);
    // Back off until the slice ends on a codepoint boundary.
    while (take > 1 && Buffer.from(bytes.subarray(offset, offset + take).toString('utf8'), 'utf8').length !== take) {
      take -= 1;
    }
    parts.push(bytes.subarray(offset, offset + take).toString('utf8'));
    offset += take;
    budget = MAX_LINE_OCTETS - 1; // continuations spend one octet on the leading space
  }
  return parts.join('\r\n ');
};

/**
 * Build a VCALENDAR of all-day busy blocks.
 *
 * @param {object} options
 * @param {string} options.name      calendar display name in the subscriber
 * @param {string} options.productId PRODID value
 * @param {Array}  options.events    [{ uid, start, end, summary, description }]
 *                                   start/end are INCLUSIVE YYYY-MM-DD.
 */
function buildCalendar({
  name,
  productId = '-//Local Effort Cooperative//Venue Availability//EN',
  events = [],
}) {
  const stamp = toIcalStamp(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${productId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    // Subscribers poll on their own cadence; Lodgify's iCal refresh is every
    // two hours, so asking for less than that is noise.
    'X-PUBLISHED-TTL:PT2H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT2H',
  ];

  for (const event of events) {
    if (!event || !event.start) continue;
    const startIso = String(event.start).slice(0, 10);
    const endInclusive = String(event.end || event.start).slice(0, 10);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeText(event.uid || `${startIso}@localeffortfood.com`)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toIcalDate(startIso)}`,
      // Exclusive end: the day after the last blocked day.
      `DTEND;VALUE=DATE:${toIcalDate(addDaysIso(endInclusive, 1))}`,
      `SUMMARY:${escapeText(event.summary || 'Reserved')}`,
      'TRANSP:OPAQUE',
      'STATUS:CONFIRMED',
    );
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/**
 * Parse a VCALENDAR into inclusive day ranges.
 * Returns [{ uid, start, end, summary, days }] with end INCLUSIVE — the
 * exclusive DTEND is converted here so callers never have to remember.
 */
function parseCalendar(text) {
  if (!text || typeof text !== 'string') return [];

  // Unfold first (RFC 5545 3.1): a line break followed by space or tab is a
  // continuation, not a new line.
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const events = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current && current.start) {
        // DTEND is exclusive; step back a day for an inclusive end. A missing
        // or same-day DTEND means a single blocked day.
        const inclusiveEnd =
          current.endExclusive && current.endExclusive > current.start
            ? addDaysIso(current.endExclusive, -1)
            : current.start;
        events.push({
          uid: current.uid || null,
          start: current.start,
          end: inclusiveEnd,
          summary: current.summary || 'Reserved',
          days: eachDay(current.start, inclusiveEnd),
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const splitAt = line.indexOf(':');
    if (splitAt === -1) continue;
    const rawName = line.slice(0, splitAt);
    const value = line.slice(splitAt + 1);
    const name = rawName.split(';')[0].toUpperCase();

    if (name === 'UID') current.uid = value.trim();
    else if (name === 'SUMMARY') current.summary = unescapeText(value);
    else if (name === 'DTSTART') current.start = fromIcalDate(value);
    else if (name === 'DTEND') current.endExclusive = fromIcalDate(value);
  }

  return events.filter((event) => event.start);
}

/**
 * Collapse a sorted list of YYYY-MM-DD days into contiguous inclusive ranges,
 * so an export emits one VEVENT per stay rather than one per night.
 */
function groupIntoRanges(days) {
  const sorted = [...new Set(days)].sort();
  const ranges = [];
  for (const day of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && addDaysIso(last.end, 1) === day) {
      last.end = day;
    } else {
      ranges.push({ start: day, end: day });
    }
  }
  return ranges;
}

module.exports = {
  buildCalendar,
  parseCalendar,
  groupIntoRanges,
  addDaysIso,
  eachDay,
  toIcalDate,
  fromIcalDate,
};
