/*
 * Idempotently promote an intake-created brain customer into the operational
 * weekly meal-prep roster. Dry-run by default; pass --apply to write.
 *
 * Example:
 * node scripts/activate-meal-prep-customer.js --name "Catherine Squires" \
 *   --slug catherine-squires --dinners 2 --adults 3 \
 *   --weekly-total-cents 12000 --delivery-included \
 *   --payment-confirmed --delivery-confirmed --apply
 */
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { canonicalName, writeLedgerEvent } = require('../backend/api/brain/ledger');

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

function arg(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

function positiveInteger(name) {
  const value = Number(arg(name));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

async function run() {
  const name = arg('--name');
  const slug = arg('--slug');
  const dinners = positiveInteger('--dinners');
  const adults = positiveInteger('--adults');
  const weeklyTotalCents = positiveInteger('--weekly-total-cents');
  const deliveryIncluded = args.includes('--delivery-included');
  const paymentConfirmed = args.includes('--payment-confirmed');
  const deliveryConfirmed = args.includes('--delivery-confirmed');

  if (!name || !slug) throw new Error('--name and --slug are required');

  const entity = await prisma.brainEntity.findFirst({
    where: {
      entityType: 'Customer',
      canonicalName: canonicalName(name),
      tombstonedAt: null,
    },
  });
  if (!entity) throw new Error(`Brain customer not found: ${name}`);

  const properties = entity.properties || {};
  const email = String(arg('--email', properties.email || '')).trim().toLowerCase();
  if (!email) throw new Error('No email found; pass --email');

  const planRulesJson = {
    schemaVersion: 2,
    requiredEntrees: dinners,
    maxTotalItems: dinners,
    allowDuplicates: true,
    sectionRules: {
      'family-dinners': { label: 'Family Dinners', min: dinners, max: dinners },
    },
    sections: {
      'family-dinners': {
        label: 'Family Dinners',
        qty: dinners,
        servesAdults: adults,
        servesKids: 0,
        menuCategory: 'dinner',
        style: 'family',
      },
    },
    billing: {
      weeklyTotalCents,
      deliveryIncluded,
    },
  };

  const preview = {
    entityId: entity.id,
    name,
    slug,
    email,
    dinners,
    adults,
    weeklyTotalCents,
    deliveryIncluded,
    paymentConfirmed,
    deliveryConfirmed,
  };
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', ...preview }, null, 2));
  if (!APPLY) return;

  const confirmedAt = new Date().toISOString();
  const ledger = await writeLedgerEvent({
    eventType: 'meal_prep.customer.activated',
    source: 'operator:meal-prep-activation',
    sourceId: `customer:${entity.id}`,
    actorType: 'operator',
    payload: { ...preview, confirmedAt },
    updatePayload: true,
  });

  const customer = await prisma.customer.upsert({
    where: { slug },
    update: {
      name,
      planRulesJson,
      priceTierDefault: 'subscriber',
    },
    create: {
      slug,
      name,
      planRulesJson,
      priceTierDefault: 'subscriber',
    },
  });

  await prisma.user.upsert({
    where: { email },
    update: { role: 'subscriber', customerId: customer.id },
    create: { email, role: 'subscriber', customerId: customer.id },
  });

  await prisma.customerProfile.upsert({
    where: { customerId: customer.id },
    update: {
      householdSize: properties.householdSize || `${adults} adults`,
      phone: properties.phone || null,
      address: properties.address || null,
      deliveryNotes: deliveryIncluded ? 'Delivery included in weekly price.' : null,
      intakeSurvey: properties.latestMealPrepIntakeSummary
        ? { summary: properties.latestMealPrepIntakeSummary }
        : undefined,
    },
    create: {
      customerId: customer.id,
      householdSize: properties.householdSize || `${adults} adults`,
      phone: properties.phone || null,
      address: properties.address || null,
      deliveryNotes: deliveryIncluded ? 'Delivery included in weekly price.' : null,
      intakeSurvey: properties.latestMealPrepIntakeSummary
        ? { summary: properties.latestMealPrepIntakeSummary }
        : undefined,
    },
  });

  await prisma.brainEntity.update({
    where: { id: entity.id },
    data: {
      localEffortCustomerId: customer.id,
      properties: {
        ...properties,
        mealPrepStage: 'active',
        mealPrepPlan: planRulesJson,
        activatedAt: properties.activatedAt || confirmedAt,
        activationLedgerEventId: ledger.id,
        paymentConfirmed,
        firstDeliveryConfirmed: deliveryConfirmed,
        ...(paymentConfirmed
          ? { paymentConfirmedAt: properties.paymentConfirmedAt || confirmedAt }
          : {}),
        ...(deliveryConfirmed
          ? { firstDeliveryConfirmedAt: properties.firstDeliveryConfirmedAt || confirmedAt }
          : {}),
      },
    },
  });

  console.log(`Activated ${name} as ${slug} (${customer.id}).`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
