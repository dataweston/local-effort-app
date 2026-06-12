const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const STAFF_TARGETS = [
  {
    name: 'Maria Beck',
    accessLevel: 'staff',
    title: 'Chef',
    knownEmails: [],
  },
  {
    name: 'Zachary Hurdle',
    accessLevel: 'staff',
    title: 'Associate of Community Projects',
    knownEmails: ['hurdlezachary@gmail.com'],
  },
  {
    name: 'Catherine Olsen',
    accessLevel: 'privileged',
    title: 'Chef & Co-Founder',
    knownEmails: ['colsen03@gmail.com'],
  },
];

const CUSTOMER_TARGETS = [
  { name: 'David Levy', slugs: ['levy-family'], aliases: ['David & Allison', 'Levy Family'] },
  { name: 'Sanjay', slugs: ['sanjay-roy'], aliases: ['Sanjay Roy'] },
  { name: 'Katie Ferguson', slugs: ['katie-ferguson'], aliases: ['Katie Ferguson'] },
  { name: 'Tyler Cooper', slugs: ['tyler-cooper'], aliases: ['Tyler'] },
];

function canonicalName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function emailsFromEntity(entity) {
  const values = [
    ...(entity?.aliases || []).map((alias) => alias.alias),
    entity?.properties?.email,
    ...(Array.isArray(entity?.properties?.emails) ? entity.properties.emails : []),
  ];
  return values
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((value) => value.includes('@'));
}

async function findBrainPerson(target) {
  const names = [target.name, ...(target.aliases || [])];
  return prisma.brainEntity.findFirst({
    where: {
      entityType: 'Person',
      tombstonedAt: null,
      OR: [
        { canonicalName: { in: names.map(canonicalName) } },
        ...names.map((name) => ({ name: { equals: name, mode: 'insensitive' } })),
        ...names.map((name) => ({ aliases: { some: { alias: { equals: name, mode: 'insensitive' } } } })),
      ],
    },
    include: { aliases: true },
  });
}

async function upsertHubProfile({ email, displayName, accessLevel, title, customerId = null, userRole = 'member' }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return { skipped: 'missing-email' };

  if (!apply) {
    return { dryRun: true, email: normalizedEmail, displayName, accessLevel, customerId };
  }

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      role: userRole,
      ...(customerId ? { customerId } : {}),
    },
    create: {
      email: normalizedEmail,
      role: userRole,
      customerId,
    },
  });

  const profile = await prisma.hubProfile.upsert({
    where: { userId: user.id },
    update: {
      email: normalizedEmail,
      displayName,
      accessLevel,
      title,
      status: 'active',
    },
    create: {
      userId: user.id,
      email: normalizedEmail,
      displayName,
      accessLevel,
      title,
      status: 'active',
    },
  });

  return { user, profile };
}

async function seedStaff() {
  console.log('\nStaff / privileged hub access');
  for (const target of STAFF_TARGETS) {
    const entity = await findBrainPerson(target);
    const emails = [...new Set([...target.knownEmails, ...emailsFromEntity(entity)])];
    if (!entity) {
      console.log(`- ${target.name}: brain person not found; using known email only`);
    }
    if (!emails.length) {
      console.log(`- ${target.name}: skipped, no email found in repo or brain`);
      continue;
    }
    for (const email of emails) {
      const result = await upsertHubProfile({
        email,
        displayName: target.name,
        accessLevel: target.accessLevel,
        title: target.title,
      });
      console.log(`- ${target.name}: ${apply ? 'upserted' : 'would upsert'} ${email} as ${target.accessLevel}`);
      if (result.skipped) console.log(`  skipped: ${result.skipped}`);
    }
  }
}

async function findCustomer(target) {
  const bySlug = await prisma.customer.findFirst({
    where: { slug: { in: target.slugs } },
    include: { users: true },
  });
  if (bySlug) return bySlug;
  return prisma.customer.findFirst({
    where: {
      OR: [
        { name: { equals: target.name, mode: 'insensitive' } },
        ...target.aliases.map((alias) => ({ name: { equals: alias, mode: 'insensitive' } })),
      ],
    },
    include: { users: true },
  });
}

async function seedCustomers() {
  console.log('\nCustomer hub access');
  for (const target of CUSTOMER_TARGETS) {
    const customer = await findCustomer(target);
    if (!customer) {
      console.log(`- ${target.name}: skipped, no Customer row found for ${target.slugs.join(', ')}`);
      continue;
    }
    if (!customer.users.length) {
      console.log(`- ${target.name}: skipped, customer ${customer.slug} has no User emails`);
      continue;
    }
    for (const user of customer.users) {
      await upsertHubProfile({
        email: user.email,
        displayName: customer.name || target.name,
        accessLevel: 'customer',
        title: 'Weekly meal prep customer',
        customerId: customer.id,
        userRole: 'subscriber',
      });
      console.log(`- ${target.name}: ${apply ? 'upserted' : 'would upsert'} ${user.email} as customer for ${customer.slug}`);
    }
  }
}

async function main() {
  console.log(`Hub weekly meal prep access seed (${apply ? 'APPLY' : 'DRY RUN'})`);
  await seedStaff();
  await seedCustomers();
  console.log('\nNo HubInvite rows are created by this script.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
