const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function minutesBetween(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60_000);
}

function paidMinutes(shift) {
  const total = minutesBetween(shift.startAt, shift.endAt);
  const unpaidBreaks = (shift.breaks || [])
    .filter((item) => !item.isPaid)
    .reduce((sum, item) => sum + minutesBetween(item.startAt, item.endAt), 0);
  return Math.max(0, total - unpaidBreaks);
}

async function main() {
  loadEnv(path.resolve(__dirname, '..', '.env'));
  const { getSquareClient } = require('../api-handlers/_lib/squareClient');
  const { client, locationId } = getSquareClient();
  if (!client?.laborApi) throw new Error('Square Labor API is unavailable');

  const year = Number(process.argv[2]) || new Date().getFullYear();
  const allLocations = process.argv.includes('--all-locations');
  const startAt = `${year}-01-01T00:00:00Z`;
  const endAt = `${year + 1}-01-01T00:00:00Z`;
  const shifts = [];
  let cursor;
  do {
    const response = await client.laborApi.searchShifts({
      query: {
        filter: {
          locationIds: locationId && !allLocations ? [locationId] : undefined,
          status: 'CLOSED',
          start: { startAt, endAt },
        },
        sort: { field: 'START_AT', order: 'ASC' },
      },
      limit: 200,
      cursor,
    });
    shifts.push(...(response.result.shifts || []));
    cursor = response.result.cursor;
  } while (cursor);

  const wageResponse = await client.laborApi.listTeamMemberWages();
  const wageSettings = wageResponse.result.teamMemberWages || [];

  const months = {};
  const teamMembers = new Set();
  let wageCovered = 0;
  for (const shift of shifts) {
    const key = String(shift.startAt).slice(0, 7);
    if (!months[key]) months[key] = { timecards: 0, paidHours: 0, grossWagesCents: 0, wageCovered: 0 };
    const minutes = paidMinutes(shift);
    const hourlyRateCents = Number(shift.wage?.hourlyRate?.amount || 0);
    months[key].timecards += 1;
    months[key].paidHours += minutes / 60;
    if (hourlyRateCents > 0) {
      wageCovered += 1;
      months[key].wageCovered += 1;
      months[key].grossWagesCents += Math.round((minutes / 60) * hourlyRateCents);
    }
    if (shift.teamMemberId) teamMembers.add(shift.teamMemberId);
  }

  console.log(JSON.stringify({
    source: 'square_labor_api',
    year,
    locationFiltered: Boolean(locationId && !allLocations),
    timecards: shifts.length,
    teamMemberCount: teamMembers.size,
    wageSettingCount: wageSettings.length,
    configuredHourlyRates: wageSettings.filter((item) => Number(item.hourlyRate?.amount || 0) > 0).length,
    wageCoverage: shifts.length ? wageCovered / shifts.length : null,
    grossWagesCents: Object.values(months).reduce((sum, row) => sum + row.grossWagesCents, 0),
    paidHours: Object.values(months).reduce((sum, row) => sum + row.paidHours, 0),
    months: Object.fromEntries(Object.entries(months).map(([key, row]) => [key, {
      ...row,
      paidHours: Math.round(row.paidHours * 100) / 100,
    }])),
    note: 'Gross wage estimate from completed timecards; excludes employer taxes, benefits, reimbursements, and payroll adjustments.',
  }, null, 2));
}

main().catch((error) => {
  const detail = error?.result?.errors?.map((item) => item.detail).filter(Boolean).join('; ');
  console.error(detail || error.message);
  process.exit(1);
});
