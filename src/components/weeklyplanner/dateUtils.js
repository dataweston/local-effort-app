// Date utility functions for the weekly planner.
// All dates are ISO strings ("2026-02-06"). Week starts on Monday.
// Uses America/Chicago timezone for "today".

const TIMEZONE = 'America/Chicago';

let _nextId = 1000;

/**
 * Get today's date as ISO string in Chicago timezone.
 */
export function getToday() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(now);
  return parts; // "2026-02-06" format
}

/**
 * Parse an ISO date string into a Date object (midnight UTC).
 */
function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Format a Date object as ISO date string "YYYY-MM-DD".
 */
function toISO(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get the Monday (week start) for a given date.
 */
export function getWeekStart(dateStr) {
  const d = parseDate(dateStr);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return toISO(d);
}

/**
 * Get array of 7 ISO date strings (Mon–Sun) for a week starting at weekStartStr.
 */
export function getWeekDates(weekStartStr) {
  const start = parseDate(weekStartStr);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return toISO(d);
  });
}

/**
 * Get day-of-week name for an ISO date string.
 */
export function getDayOfWeek(dateStr) {
  const d = parseDate(dateStr);
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return names[d.getUTCDay()];
}

/**
 * Short format: "Mon 2/9"
 */
export function formatDateShort(dateStr) {
  const d = parseDate(dateStr);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${dayNames[d.getUTCDay()]} ${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/**
 * Full format: "Monday, February 9"
 */
export function formatDateFull(dateStr) {
  const d = parseDate(dateStr);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${dayNames[d.getUTCDay()]}, ${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/**
 * Get all week-start Mondays that cover a given month.
 * Returns array of ISO date strings.
 */
export function getMonthWeeks(year, month) {
  // First day of month
  const first = new Date(Date.UTC(year, month - 1, 1));
  // Last day of month
  const last = new Date(Date.UTC(year, month, 0));

  const firstMonday = getWeekStart(toISO(first));
  const lastMonday = getWeekStart(toISO(last));

  const weeks = [];
  let current = parseDate(firstMonday);
  const end = parseDate(lastMonday);

  while (current <= end) {
    weeks.push(toISO(current));
    current.setUTCDate(current.getUTCDate() + 7);
  }

  return weeks;
}

/**
 * Get all dates for a month calendar grid (28-42 dates including overflow from adjacent months).
 * Always starts on Monday, ends on Sunday.
 */
export function getMonthDates(year, month) {
  const weeks = getMonthWeeks(year, month);
  const dates = [];
  for (const weekStart of weeks) {
    const weekDates = getWeekDates(weekStart);
    dates.push(...weekDates);
  }
  return dates;
}

/**
 * Add n days to a date string.
 */
export function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

/**
 * Add n weeks to a date string.
 */
export function addWeeks(dateStr, n) {
  return addDays(dateStr, n * 7);
}

/**
 * Check if two dates are in the same week (same Monday).
 */
export function isSameWeek(dateA, dateB) {
  return getWeekStart(dateA) === getWeekStart(dateB);
}

/**
 * Check if a date string is today (Chicago timezone).
 */
export function isToday(dateStr) {
  return dateStr === getToday();
}

/**
 * Get the month number (1-12) from an ISO date string.
 */
export function getMonth(dateStr) {
  return parseDate(dateStr).getUTCMonth() + 1;
}

/**
 * Get the year from an ISO date string.
 */
export function getYear(dateStr) {
  return parseDate(dateStr).getUTCFullYear();
}

/**
 * Stamp a weekly template onto real dates for a given week.
 * Returns array of card objects with `date`, `dayOfWeek`, and `templateId` fields.
 */
export function generateWeekCards(template, weekStartStr) {
  const weekDates = getWeekDates(weekStartStr);
  const dayMap = {
    Monday: weekDates[0],
    Tuesday: weekDates[1],
    Wednesday: weekDates[2],
    Thursday: weekDates[3],
    Friday: weekDates[4],
    Saturday: weekDates[5],
    Sunday: weekDates[6],
  };

  const cards = [];
  // Track old template IDs to new IDs for effectTarget remapping
  const idMap = {};

  for (const t of template) {
    const date = dayMap[t.dayOfWeek];
    if (!date) continue;

    const newId = String(++_nextId);
    idMap[t.templateKey] = newId;

    cards.push({
      id: newId,
      templateId: t.templateKey,
      title: t.title,
      date,
      dayOfWeek: t.dayOfWeek,
      zone: t.zone,
      people: [...t.people],
      startTime: t.startTime,
      endTime: t.endTime,
      revenue: t.revenue,
      cost: t.cost || 0,
      costPerHour: t.costPerHour || null,
      optional: t.optional,
      enabled: t.enabled,
      effectTarget: null, // remapped below
      effectType: t.effectType || null,
      effectTargetTemplate: t.effectTargetTemplate || null, // for remapping
      order: t.order,
    });
  }

  // Remap effectTarget from template keys to generated IDs
  for (const card of cards) {
    if (card.effectTargetTemplate && idMap[card.effectTargetTemplate]) {
      card.effectTarget = idMap[card.effectTargetTemplate];
    }
    delete card.effectTargetTemplate;
  }

  return cards;
}
