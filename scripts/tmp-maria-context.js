/* Temporary read-only context query for Maria Beck */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { OR: [{ email: { contains: 'maria', mode: 'insensitive' } }, { email: { contains: 'beck', mode: 'insensitive' } }] },
    select: { id: true, email: true, role: true },
  });
  console.log('USERS:', JSON.stringify(users, null, 2));

  const profiles = await prisma.hubProfile.findMany({
    where: { OR: [{ displayName: { contains: 'maria', mode: 'insensitive' } }, { email: { contains: 'maria', mode: 'insensitive' } }] },
  });
  console.log('HUB PROFILES:', JSON.stringify(profiles, null, 2));

  const allProfiles = await prisma.hubProfile.findMany({ select: { displayName: true, email: true, accessLevel: true, status: true } });
  console.log('ALL HUB PROFILES:', JSON.stringify(allProfiles, null, 2));

  const entities = await prisma.brainEntity.findMany({
    where: { name: { contains: 'maria', mode: 'insensitive' }, tombstonedAt: null },
    select: { id: true, name: true, entityType: true, properties: true },
  });
  console.log('BRAIN ENTITIES:', JSON.stringify(entities, null, 2));

  const invites = await prisma.hubInvite.findMany({
    where: { OR: [{ email: { contains: 'maria', mode: 'insensitive' } }, { displayNameHint: { contains: 'maria', mode: 'insensitive' } }] },
  });
  console.log('INVITES:', JSON.stringify(invites, null, 2));

  const cards = await prisma.plannerCard.findMany({
    where: { people: { hasSome: ['Maria', 'maria', 'Maria Beck'] } },
    select: { id: true, supabaseUid: true, title: true, date: true, startTime: true, endTime: true, people: true, optional: true, templateId: true },
    orderBy: { date: 'asc' },
    take: 30,
  });
  console.log('PLANNER CARDS WITH MARIA:', JSON.stringify(cards, null, 2));

  const uids = await prisma.plannerCard.groupBy({ by: ['supabaseUid'], _count: true });
  console.log('PLANNER UIDS:', JSON.stringify(uids, null, 2));
}

main().finally(() => prisma.$disconnect());
