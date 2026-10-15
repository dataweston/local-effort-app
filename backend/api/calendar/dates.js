// Day arithmetic for the universal calendar. Business days are evaluated in
// America/Chicago, never UTC: at 8pm Central on the 12th, `toISOString()` already
// says the 13th, and a date that is "today" for the owner would read as
// "tomorrow" to the availability engine.

const { addDaysIso, eachDay } = require('../utils/ical');

const BUSINESS_TIME_ZONE = 'America/Chicago';

const chicagoDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD of an instant as seen on a wall calendar in Chicago. */
const chicagoDateOf = (instant) => chicagoDay.format(instant instanceof Date ? instant : new Date(instant));

const todayChicago = (now = new Date()) => chicagoDateOf(now);

const isIsoDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

module.exports = {
  BUSINESS_TIME_ZONE,
  addDaysIso,
  chicagoDateOf,
  eachDay,
  isIsoDate,
  todayChicago,
};
