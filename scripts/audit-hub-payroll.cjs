require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { __internals } = require('../api-handlers/hub/payroll');

const prisma = new PrismaClient();

async function main() {
  const requested = String(process.argv.slice(2).join(' ') || 'Maria Beck').trim();
  const profile = await prisma.hubProfile.findFirst({
    where: {
      OR: [
        { displayName: { equals: requested, mode: 'insensitive' } },
        { email: { equals: requested, mode: 'insensitive' } },
      ],
    },
  });
  if (!profile) throw new Error(`Hub profile not found: ${requested}`);

  const entity = await prisma.brainEntity.findFirst({
    where: { entityType: 'Person', name: { equals: profile.displayName, mode: 'insensitive' }, tombstonedAt: null },
    select: { properties: true, updatedAt: true },
  });
  const year = new Date().getUTCFullYear();
  const today = new Date().toISOString().slice(0, 10);
  const windowEndDate = new Date(`${today}T00:00:00Z`);
  windowEndDate.setUTCDate(windowEndDate.getUTCDate() + 14);
  const windowEnd = windowEndDate.toISOString().slice(0, 10);
  const square = await __internals.squarePayrollEvidence(profile, `${year}-01-01`, today);
  const shifts = await prisma.plannerCard.findMany({
    where: {
      objectType: 'shift',
      date: { gte: today, lte: windowEnd },
      people: { hasSome: [profile.displayName, profile.displayName.split(/\s+/)[0]] },
      enabled: true,
    },
    select: { id: true, title: true, date: true, startTime: true, endTime: true, people: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
  console.log(JSON.stringify({
    employee: profile.displayName,
    upcomingShifts: shifts,
    square,
    brain: __internals.brainPayrollEvidence(entity),
    note: 'Square Labor evidence is not a Square Payroll pay stub and excludes taxes, deductions, reimbursements, and payroll adjustments.',
  }, null, 2));
}

main()
  .catch((error) => {
    const detail = error?.result?.errors?.map((item) => item.detail).filter(Boolean).join('; ');
    console.error(detail || error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
