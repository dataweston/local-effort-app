const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getArg = (args, name) => {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] || null;
};

const loadJson = (filePath) => {
  const fullPath = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
};

const main = async () => {
  const args = process.argv.slice(2);
  const slug = getArg(args, '--slug');
  const name = getArg(args, '--name');
  const emailsArg = getArg(args, '--emails');
  const weekStart = getArg(args, '--week');
  const planBase = getArg(args, '--plan-base');
  const planDelivery = getArg(args, '--plan-delivery');
  const rulesFile = getArg(args, '--rules-file');

  if (!slug || !emailsArg) {
    console.error('Usage: node scripts/weekly-order-customer-setup.js --slug customer-slug --emails a@b.com,c@d.com [--name "Customer Name"] [--week 2026-02-03] [--plan-base 25700] [--plan-delivery 1000] [--rules-file data/rules.json]');
    process.exit(1);
  }

  const emails = emailsArg.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const planRulesJson = rulesFile ? loadJson(rulesFile) : null;

  const customer = await prisma.customer.upsert({
    where: { slug },
    update: {
      name: name || undefined,
      planRulesJson: planRulesJson || undefined,
      priceTierDefault: 'subscriber',
    },
    create: {
      slug,
      name: name || null,
      planRulesJson: planRulesJson || null,
      priceTierDefault: 'subscriber',
    },
  });

  for (const email of emails) {
    await prisma.user.upsert({
      where: { email },
      update: { role: 'subscriber', customerId: customer.id },
      create: { email, role: 'subscriber', customerId: customer.id },
    });
  }

  if (weekStart && (planBase || planDelivery)) {
    const menuWeek = await prisma.menuWeek.findFirst({
      where: { weekStart: new Date(weekStart) },
    });
    if (!menuWeek) {
      console.error('MenuWeek not found for', weekStart);
      process.exit(1);
    }
    await prisma.customerPlan.upsert({
      where: { customerId_menuWeekId: { customerId: customer.id, menuWeekId: menuWeek.id } },
      update: {
        basePriceCents: Number(planBase) || 0,
        deliveryFeeCents: Number(planDelivery) || 0,
      },
      create: {
        customerId: customer.id,
        menuWeekId: menuWeek.id,
        basePriceCents: Number(planBase) || 0,
        deliveryFeeCents: Number(planDelivery) || 0,
      },
    });
  }

  console.log(`Customer ${customer.slug} configured with ${emails.length} user(s).`);
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
