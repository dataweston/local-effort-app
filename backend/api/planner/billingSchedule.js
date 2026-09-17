'use strict';

function isoDate(value) {
  return value.toISOString().slice(0, 10);
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && isoDate(parsed) === value;
}

function addBillingInterval(dateString, cadence) {
  if (!isIsoDate(dateString)) throw new Error(`Invalid billing date: ${dateString}`);
  const [year, month, day] = dateString.split('-').map(Number);
  const current = new Date(Date.UTC(year, month - 1, day));
  const normalizedCadence = String(cadence || '').toLowerCase();
  if (normalizedCadence.startsWith('weekly')) {
    current.setUTCDate(current.getUTCDate() + 7);
    return isoDate(current);
  }
  if (normalizedCadence === 'every_4_weeks') {
    current.setUTCDate(current.getUTCDate() + 28);
    return isoDate(current);
  }
  if (!['monthly', 'monthly_month_end'].includes(normalizedCadence)) {
    throw new Error(`Unsupported billing cadence: ${cadence || 'missing'}`);
  }
  const nextMonthStart = new Date(Date.UTC(year, month, 1));
  const finalDay = new Date(
    Date.UTC(nextMonthStart.getUTCFullYear(), nextMonthStart.getUTCMonth() + 1, 0)
  ).getUTCDate();
  nextMonthStart.setUTCDate(
    normalizedCadence === 'monthly_month_end' ? finalDay : Math.min(day, finalDay)
  );
  return isoDate(nextMonthStart);
}

function addMonths(dateString, months) {
  if (!isIsoDate(dateString)) throw new Error(`Invalid date: ${dateString}`);
  const [year, month, day] = dateString.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const finalDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(day, finalDay));
  return isoDate(target);
}

function billingOccurrences(startDate, cadence, throughDate, maxOccurrences = 80) {
  if (!isIsoDate(startDate) || !isIsoDate(throughDate) || startDate > throughDate) return [];
  const dates = [];
  let date = startDate;
  while (date <= throughDate && dates.length < maxOccurrences) {
    dates.push(date);
    const next = addBillingInterval(date, cadence);
    if (next <= date) throw new Error(`Billing cadence did not advance from ${date}`);
    date = next;
  }
  if (date <= throughDate)
    throw new Error(`Billing schedule exceeds ${maxOccurrences} occurrences`);
  return dates;
}

module.exports = {
  addBillingInterval,
  addMonths,
  billingOccurrences,
  isIsoDate,
};
