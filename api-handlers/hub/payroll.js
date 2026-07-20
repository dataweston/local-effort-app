const { PrismaClient } = require('@prisma/client');
const { getSquareClient } = require('../_lib/squareClient');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString } = require('./_http');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function isoDate(value, fallback) {
  const cleaned = cleanString(value, 20);
  return cleaned && /^\d{4}-\d{2}-\d{2}$/.test(cleaned) ? cleaned : fallback;
}

function addDays(date, days) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function minutesBetween(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60_000);
}

function paidMinutes(shift) {
  const total = minutesBetween(shift.startAt, shift.endAt);
  const unpaid = (shift.breaks || [])
    .filter((entry) => !entry.isPaid)
    .reduce((sum, entry) => sum + minutesBetween(entry.startAt, entry.endAt), 0);
  return Math.max(0, total - unpaid);
}

function findSquareTeamMember(teamMembers, profile) {
  const email = normalize(profile?.email);
  const displayName = normalize(profile?.displayName);
  return teamMembers.find((member) => normalize(member.emailAddress) === email)
    || teamMembers.find((member) => normalize(`${member.givenName || ''} ${member.familyName || ''}`) === displayName)
    || null;
}

function brainPayrollEvidence(entity) {
  const properties = entity?.properties && typeof entity.properties === 'object' ? entity.properties : {};
  const rateCents = Number(properties.hourlyRateCents)
    || (Number(properties.hourlyRate || properties.payRate) ? Math.round(Number(properties.hourlyRate || properties.payRate) * 100) : null);
  const documentedHours = Number(properties.documentedHours || properties.payrollDocumentedHours) || null;
  const documentedGrossCents = Number(properties.documentedGrossCents || properties.grossWagesCents) || null;
  const asOf = properties.payrollAsOf || properties.asOf || null;
  if (!rateCents && !documentedHours && !documentedGrossCents) return null;
  return {
    source: 'company_brain',
    sourceUpdatedAt: asIso(entity.updatedAt),
    asOf,
    hourlyRateCents: rateCents,
    documentedHours,
    documentedGrossCents,
  };
}

async function squarePayrollEvidence(profile, from, to) {
  const { client } = getSquareClient();
  if (!client?.teamApi || !client?.laborApi) return { available: false, reason: 'Square Labor API unavailable' };

  const members = [];
  let cursor;
  do {
    const response = await client.teamApi.searchTeamMembers({
      query: { filter: { status: 'ACTIVE' } },
      limit: 200,
      cursor,
    });
    members.push(...(response.result.teamMembers || []));
    cursor = response.result.cursor;
  } while (cursor);

  const member = findSquareTeamMember(members, profile);
  if (!member?.id) return { available: true, matched: false, reason: 'No Square team member matched this Hub profile' };

  const wageResponse = await client.laborApi.listTeamMemberWages(member.id, 200);
  const wages = wageResponse.result.teamMemberWages || [];
  const currentWage = wages
    .filter((wage) => Number(wage.hourlyRate?.amount || 0) > 0)
    .sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')))[0] || null;

  const shifts = [];
  cursor = undefined;
  do {
    const response = await client.laborApi.searchShifts({
      query: {
        filter: {
          teamMemberIds: [member.id],
          status: 'CLOSED',
          start: { startAt: `${from}T00:00:00Z`, endAt: `${addDays(to, 1)}T00:00:00Z` },
        },
        sort: { field: 'START_AT', order: 'ASC' },
      },
      limit: 200,
      cursor,
    });
    shifts.push(...(response.result.shifts || []));
    cursor = response.result.cursor;
  } while (cursor);

  let grossWagesCents = 0;
  let paidMinutesTotal = 0;
  shifts.forEach((shift) => {
    const minutes = paidMinutes(shift);
    paidMinutesTotal += minutes;
    const rateCents = Number(shift.wage?.hourlyRate?.amount || currentWage?.hourlyRate?.amount || 0);
    grossWagesCents += Math.round((minutes / 60) * rateCents);
  });

  return {
    available: true,
    matched: true,
    source: 'square_labor_api',
    teamMemberId: member.id,
    currentHourlyRateCents: Number(currentWage?.hourlyRate?.amount || 0) || null,
    wageTitle: currentWage?.title || null,
    timecardCount: shifts.length,
    paidHours: Math.round((paidMinutesTotal / 60) * 100) / 100,
    grossWagesCents,
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  let profile = auth.hubProfile;
  const requestedUserId = cleanString(req.query?.userId, 120);
  if (requestedUserId && requestedUserId !== auth.viewer.userId) {
    if (!auth.isPrivileged) return res.status(403).json({ error: 'Payroll is private to the employee and admins' });
    profile = await prisma.hubProfile.findFirst({ where: { userId: requestedUserId } });
  }
  if (!profile) return res.status(404).json({ error: 'Hub profile not found' });

  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = addDays(today, -90);
  const from = isoDate(req.query?.from, defaultFrom);
  const to = isoDate(req.query?.to, today);
  if (to < from || new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`) > 366 * 86_400_000) {
    return res.status(400).json({ error: 'Payroll range must be valid and no longer than 366 days' });
  }

  try {
    const brainEntity = await prisma.brainEntity.findFirst({
      where: {
        entityType: 'Person',
        name: { equals: profile.displayName, mode: 'insensitive' },
        tombstonedAt: null,
      },
      select: { properties: true, updatedAt: true },
    });
    const brain = brainPayrollEvidence(brainEntity);
    let square;
    try {
      square = await squarePayrollEvidence(profile, from, to);
    } catch (error) {
      square = { available: false, reason: error?.result?.errors?.[0]?.detail || error.message || 'Square Labor lookup failed' };
    }

    const currentHourlyRateCents = square.currentHourlyRateCents || brain?.hourlyRateCents || null;
    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      employee: { userId: profile.userId, displayName: profile.displayName, title: profile.title || null },
      period: { from, to },
      currentHourlyRateCents,
      square,
      brain,
      limitations: [
        'Square Labor timecards and wage settings are available here; Square Payroll pay stubs, taxes, deductions, and deposits are not exposed by this connection.',
        'Gross wages are estimated from closed timecards and their hourly rates and are not a pay-stub total.',
      ],
    });
  } catch (err) {
    console.error('[hub/payroll] error', err);
    return res.status(500).json({ error: 'Unable to load payroll evidence' });
  }
};

module.exports.__internals = { brainPayrollEvidence, findSquareTeamMember, paidMinutes, squarePayrollEvidence };
