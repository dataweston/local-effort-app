const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const BUSINESS_TIME_ZONE = 'America/Chicago';

const isRealIsoDate = (value) => {
  const date = String(value || '').trim();
  if (!DATE_PATTERN.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

const businessTodayIso = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
};

const isSelectableDate = (value, now = new Date()) => {
  const date = String(value || '').trim();
  return isRealIsoDate(date) && date >= businessTodayIso(now);
};

module.exports = {
  BUSINESS_TIME_ZONE,
  businessTodayIso,
  isRealIsoDate,
  isSelectableDate,
};
