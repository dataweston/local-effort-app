// Onboard Maria Beck: attach her email in the brain + hub, create a staff
// invite, seed her recurring weekend prep shifts in the weeklydemo planner,
// and block out her June 16-24 vacation.
//
// Usage: node scripts/setup-maria-beck.js --apply   (dry run without --apply)
require('dotenv').config();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const MARIA_EMAIL = 'mariakodet.beck@gmail.com';
const MARIA_NAME = 'Maria Beck';
const MASTER_PLANNER_UID = '57063b69-34ba-4779-9321-0ebb47c4c19d'; // dataweston@gmail.com (weeklydemo)
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || 'https://localeffortfood.com';

const SHIFT_START = '2026-06-13'; // first upcoming Saturday
const SHIFT_END = '2026-12-31';
const SHIFT_DAYS = ['Saturday', 'Sunday', 'Monday'];
const VACATION_START = '2026-06-16';
const VACATION_END = '2026-06-24';

function eachDate(from, to) {
  const dates = [];
  const cursor = new Date(`${from}T00:00:00`);
  const last = new Date(`${to}T00:00:00`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function weekday(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
}

function inVacation(date) {
  return date >= VACATION_START && date <= VACATION_END;
}

async function attachEmailToBrain() {
  const entity = await prisma.brainEntity.findFirst({
    where: { entityType: 'Person', name: { equals: MARIA_NAME, mode: 'insensitive' }, tombstonedAt: null },
  });
  if (!entity) {
    console.log('- brain: Maria Beck Person entity not found, skipping');
    return;
  }
  const properties = { ...(entity.properties || {}), email: MARIA_EMAIL };
  if (apply) {
    await prisma.brainEntity.update({ where: { id: entity.id }, data: { properties } });
  }
  console.log(`- brain: ${apply ? 'set' : 'would set'} properties.email=${MARIA_EMAIL} on ${entity.id}`);
}

async function upsertHubProfile() {
  if (!apply) {
    console.log(`- hub: would upsert User + staff HubProfile for ${MARIA_EMAIL}`);
    return null;
  }
  const user = await prisma.user.upsert({
    where: { email: MARIA_EMAIL },
    update: {},
    create: { email: MARIA_EMAIL, role: 'member' },
  });
  await prisma.hubProfile.upsert({
    where: { userId: user.id },
    update: { email: MARIA_EMAIL, displayName: MARIA_NAME, accessLevel: 'staff', title: 'Chef', status: 'active' },
    create: { userId: user.id, email: MARIA_EMAIL, displayName: MARIA_NAME, accessLevel: 'staff', title: 'Chef', status: 'active' },
  });
  console.log(`- hub: upserted User + staff HubProfile for ${MARIA_EMAIL}`);
  return user;
}

async function createInvite() {
  const existing = await prisma.hubInvite.findFirst({
    where: { email: MARIA_EMAIL, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) {
    console.log('- invite: active invite already exists, reusing');
    return existing;
  }
  if (!apply) {
    console.log(`- invite: would create staff invite for ${MARIA_EMAIL}`);
    return null;
  }
  const invitedBy = await prisma.user.findUnique({ where: { email: 'dataweston@gmail.com' } });
  const invite = await prisma.hubInvite.create({
    data: {
      token: crypto.randomBytes(32).toString('base64url'),
      email: MARIA_EMAIL,
      accessLevel: 'staff',
      displayNameHint: MARIA_NAME,
      invitedByUserId: invitedBy?.id || null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`- invite: created staff invite for ${MARIA_EMAIL}`);
  return invite;
}

async function seedPrepShifts() {
  const dates = eachDate(SHIFT_START, SHIFT_END).filter((date) => SHIFT_DAYS.includes(weekday(date)));
  let created = 0;
  let skipped = 0;
  for (const date of dates) {
    const day = weekday(date);
    const templateId = `prep-maria-${day.toLowerCase()}`;
    const existing = await prisma.plannerCard.findFirst({
      where: { supabaseUid: MASTER_PLANNER_UID, templateId, date },
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    const people = inVacation(date) ? [] : [MARIA_NAME];
    if (apply) {
      await prisma.plannerCard.create({
        data: {
          supabaseUid: MASTER_PLANNER_UID,
          templateId,
          title: 'Prep shift',
          date,
          dayOfWeek: day,
          zone: 'timed',
          people,
          startTime: '10:00',
          endTime: '16:00',
          costPerHour: 35,
          optional: true, // up for pickup in the hub
          enabled: true,
          status: 'todo',
          sortOrder: 10,
        },
      });
    }
    created += 1;
  }
  console.log(`- shifts: ${apply ? 'created' : 'would create'} ${created} prep shift cards (${skipped} already existed)`);
}

async function seedVacationCards() {
  let created = 0;
  for (const date of eachDate(VACATION_START, VACATION_END)) {
    const existing = await prisma.plannerCard.findFirst({
      where: { supabaseUid: MASTER_PLANNER_UID, title: `${MARIA_NAME} — Vacation`, date },
    });
    if (existing) continue;
    if (apply) {
      await prisma.plannerCard.create({
        data: {
          supabaseUid: MASTER_PLANNER_UID,
          title: `${MARIA_NAME} — Vacation`,
          date,
          dayOfWeek: weekday(date),
          zone: 'untimed',
          people: [MARIA_NAME],
          optional: false,
          enabled: true,
          status: 'todo',
          sortOrder: 0,
        },
      });
    }
    created += 1;
  }
  console.log(`- vacation: ${apply ? 'created' : 'would create'} ${created} vacation cards (${VACATION_START}..${VACATION_END})`);
}

async function unassignMariaDuringVacation() {
  const cards = await prisma.plannerCard.findMany({
    where: {
      date: { gte: VACATION_START, lte: VACATION_END },
      people: { hasSome: [MARIA_NAME, 'Maria'] },
      NOT: { title: `${MARIA_NAME} — Vacation` },
    },
  });
  for (const card of cards) {
    const people = (card.people || []).filter((person) => person !== MARIA_NAME && person !== 'Maria');
    if (apply) {
      await prisma.plannerCard.update({
        where: { id: card.id },
        data: { people, optional: true, status: 'open' },
      });
    }
    console.log(`- vacation: ${apply ? 'unassigned' : 'would unassign'} Maria from "${card.title}" on ${card.date} (now open for pickup)`);
  }
  if (!cards.length) console.log('- vacation: no other shifts had Maria assigned in the window');
}

async function main() {
  console.log(`Maria Beck onboarding (${apply ? 'APPLY' : 'DRY RUN'})`);
  await attachEmailToBrain();
  await upsertHubProfile();
  const invite = await createInvite();
  await seedPrepShifts();
  await seedVacationCards();
  await unassignMariaDuringVacation();
  if (invite) {
    console.log(`\nInvite link: ${PUBLIC_SITE_URL}/hub?invite=${encodeURIComponent(invite.token)}`);
    console.log(`Expires: ${invite.expiresAt?.toISOString()}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
