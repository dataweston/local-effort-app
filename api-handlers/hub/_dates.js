function toIsoDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfLocalDay(date = new Date()) {
  const d = startOfLocalDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getWeekStart(value = new Date()) {
  const d = startOfLocalDay(value instanceof Date ? value : new Date(value));
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toIsoDate(d);
}

function getMonthRange(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
  };
}

function getWeekEnd(weekStart) {
  return addDays(new Date(weekStart), 6);
}

module.exports = {
  toIsoDate,
  startOfLocalDay,
  endOfLocalDay,
  addDays,
  getWeekStart,
  getMonthRange,
  getWeekEnd,
};
