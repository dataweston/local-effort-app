require('dotenv').config();

const fs = require('fs');
const path = require('path');

const API_VERSION = '2026-05-20';
const DEFAULT_TIMEZONE = 'America/Chicago';

function parseArgs(argv) {
  const dataIndex = argv.indexOf('--data');
  const personIndex = argv.indexOf('--person');
  return {
    apply: argv.includes('--apply'),
    dataPath: path.resolve(dataIndex >= 0 && argv[dataIndex + 1]
      ? argv[dataIndex + 1]
      : path.join(__dirname, 'data', 'planner-week-2026-07-20.json')),
    person: String(personIndex >= 0 && argv[personIndex + 1] ? argv[personIndex + 1] : 'Maria').trim(),
  };
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function squareBaseUrl() {
  const environment = normalize(process.env.SQUARE_ENVIRONMENT || process.env.SQUARE_ENV || 'production');
  return environment === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
}

async function squareRequest(endpoint, { method = 'GET', body } = {}) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error('SQUARE_ACCESS_TOKEN is required');
  const response = await fetch(`${squareBaseUrl()}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Square-Version': API_VERSION,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = (payload.errors || []).map((error) => error.detail || error.code).filter(Boolean).join('; ');
    throw new Error(details || `Square request failed (${response.status})`);
  }
  return payload;
}

function offsetForDate(date, timezone) {
  const sample = new Date(`${date}T12:00:00Z`);
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  }).formatToParts(sample).find((item) => item.type === 'timeZoneName')?.value;
  const match = String(part || '').match(/^GMT([+-]\d{2}:\d{2})$/);
  if (!match) throw new Error(`Unable to determine UTC offset for ${timezone} on ${date}`);
  return match[1];
}

function localTimestamp(date, time, timezone) {
  return `${date}T${time}:00${offsetForDate(date, timezone)}`;
}

function shiftDetails(shift) {
  return shift.published_shift_details || shift.draft_shift_details || {};
}

async function findTeamMember(person) {
  let cursor;
  const matches = [];
  do {
    const payload = await squareRequest('/v2/team-members/search', {
      method: 'POST',
      body: {
        query: { filter: { status: 'ACTIVE' } },
        limit: 200,
        cursor,
      },
    });
    for (const member of payload.team_members || []) {
      const fullName = `${member.given_name || ''} ${member.family_name || ''}`.trim();
      if (normalize(fullName) === normalize(person) || normalize(member.given_name) === normalize(person)) {
        matches.push({ ...member, fullName });
      }
    }
    cursor = payload.cursor;
  } while (cursor);
  if (matches.length !== 1) throw new Error(`Expected one active Square team member matching ${person}; found ${matches.length}`);
  return matches[0];
}

async function findJob(teamMemberId) {
  const [wagePayload, jobsPayload] = await Promise.all([
    squareRequest(`/v2/team-members/${encodeURIComponent(teamMemberId)}/wage-setting`),
    squareRequest('/v2/team-members/jobs'),
  ]);
  const jobs = jobsPayload.jobs || [];
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const assignments = wagePayload.wage_setting?.job_assignments || [];
  const assignment = assignments.find((item) => normalize(byId.get(item.job_id)?.title) === 'chef')
    || assignments.find((item) => item.pay_type === 'HOURLY' && item.job_id)
    || assignments.find((item) => item.job_id);
  if (!assignment?.job_id) throw new Error('Maria has no Square job assignment that can be scheduled');
  return byId.get(assignment.job_id) || { id: assignment.job_id, title: 'Assigned job' };
}

async function searchScheduledShifts({ locationId, teamMemberId, startDate, endDate }) {
  const shifts = [];
  let cursor;
  do {
    const payload = await squareRequest('/v2/labor/scheduled-shifts/search', {
      method: 'POST',
      body: {
        query: {
          filter: {
            location_ids: [locationId],
            team_member_ids: [teamMemberId],
            assignment_status: 'ASSIGNED',
            workday: {
              match_shifts_by: 'START_AT',
              date_range: { start_date: startDate, end_date: endDate },
              default_timezone: DEFAULT_TIMEZONE,
            },
          },
          sort: { field: 'START_AT', order: 'ASC' },
        },
        limit: 50,
        cursor,
      },
    });
    shifts.push(...(payload.scheduled_shifts || []));
    cursor = payload.cursor;
  } while (cursor);
  return shifts;
}

async function main() {
  const { apply, dataPath, person } = parseArgs(process.argv.slice(2));
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) throw new Error('SQUARE_LOCATION_ID is required');
  const payload = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const plannerShifts = (payload.cards || []).filter((card) => (
    card.objectType === 'shift'
    && (card.people || []).some((name) => normalize(name) === normalize(person))
    && card.date && card.startTime && card.endTime
  )).sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  if (!plannerShifts.length) throw new Error(`No timed planner shifts found for ${person}`);

  const [member, locationPayload] = await Promise.all([
    findTeamMember(person),
    squareRequest(`/v2/locations/${encodeURIComponent(locationId)}`),
  ]);
  const timezone = locationPayload.location?.timezone || DEFAULT_TIMEZONE;
  const job = await findJob(member.id);
  const existing = await searchScheduledShifts({
    locationId,
    teamMemberId: member.id,
    startDate: plannerShifts[0].date,
    endDate: plannerShifts[plannerShifts.length - 1].date,
  });
  const results = [];

  for (const card of plannerShifts) {
    const startAt = localTimestamp(card.date, card.startTime, timezone);
    const endAt = localTimestamp(card.date, card.endTime, timezone);
    const marker = `[Local Effort planner:${card.id}]`;
    const match = existing.find((shift) => {
      const details = shiftDetails(shift);
      return details.notes?.includes(marker)
        || (details.team_member_id === member.id && details.start_at === startAt && details.end_at === endAt);
    });
    if (match) {
      results.push({ cardId: card.id, status: 'already_exists', scheduledShiftId: match.id });
      continue;
    }
    if (!apply) {
      results.push({ cardId: card.id, status: 'would_create', startAt, endAt });
      continue;
    }
    const created = await squareRequest('/v2/labor/scheduled-shifts', {
      method: 'POST',
      body: {
        idempotency_key: `le-create-${card.id}`,
        scheduled_shift: {
          draft_shift_details: {
            location_id: locationId,
            job_id: job.id,
            team_member_id: member.id,
            start_at: startAt,
            end_at: endAt,
            notes: `${card.title}. ${marker}`,
          },
        },
      },
    });
    const scheduledShift = created.scheduled_shift;
    await squareRequest(`/v2/labor/scheduled-shifts/${encodeURIComponent(scheduledShift.id)}/publish`, {
      method: 'POST',
      body: {
        idempotency_key: `le-publish-${card.id}`,
        version: scheduledShift.version,
        scheduled_shift_notification_audience: 'NONE',
      },
    });
    results.push({ cardId: card.id, status: 'created_and_published', scheduledShiftId: scheduledShift.id });
  }

  console.log(JSON.stringify({
    mode: apply ? 'applied' : 'dry-run',
    person: member.fullName,
    job: job.title,
    timezone,
    plannerShiftCount: plannerShifts.length,
    existingSquareShiftCount: existing.length,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
