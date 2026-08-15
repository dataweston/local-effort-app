require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { writeLedgerEvent } = require('../backend/api/brain/ledger');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const PLANNER_UID = process.env.HUB_MASTER_SUPABASE_UID || '57063b69-34ba-4779-9321-0ebb47c4c19d';
const EVIDENCE_AS_OF = '2026-08-15';

const plans = {
  samantha: {
    schemaVersion: 2,
    sections: {
      lunches: { label: 'Lunches', qty: 3, servesAdults: 2, servesKids: 0, menuCategory: 'lunch', style: 'individual' },
    },
    sectionRules: { lunches: { label: 'Lunches', min: 3, max: 3 } },
    requiredEntrees: 3,
    maxTotalItems: 3,
    allowDuplicates: true,
    billing: { weeklyTotalCents: 11000, cadence: 'weekly', billingDay: 'Saturday', nextBillingDate: '2026-08-22' },
  },
  sanjay: {
    schemaVersion: 2,
    sections: {
      'beef-bowls': { label: 'Beef Bowls', qty: 8, menuCategory: 'lunch', style: 'individual' },
    },
    sectionRules: { 'beef-bowls': { label: 'Beef Bowls', min: 8, max: 8 } },
    requiredEntrees: 8,
    maxTotalItems: 8,
    allowDuplicates: true,
    billing: { monthlyTotalCents: 51200, equivalentWeeklyCents: 12800, cadence: 'monthly', billingDay: '5th', nextBillingDate: '2026-09-05' },
  },
  gabriella: {
    schemaVersion: 2,
    sections: {
      'family-dinners': { label: 'Family Dinners', qty: 5, servesAdults: 4, servesKids: 0, menuCategory: 'dinner', style: 'family' },
    },
    sectionRules: { 'family-dinners': { label: 'Family Dinners', min: 5, max: 5 } },
    requiredEntrees: 5,
    maxTotalItems: 5,
    allowDuplicates: true,
    billing: { monthlyTotalCents: 140500, equivalentWeeklyCents: 35125, cadence: 'monthly', billingDay: 'month end', nextBillingDate: '2026-08-31' },
  },
  david: {
    schemaVersion: 2,
    sections: {
      'family-dinners': { label: 'Family Dinners', qty: 3, servesAdults: 2, servesKids: 2, menuCategory: 'dinner', style: 'family' },
      'kids-meals': { label: 'Kids Meals', qty: 10, menuCategory: 'kids', style: 'individual' },
      'kids-snacks': { label: 'Kids Snacks', qty: 2, menuCategory: 'kids', style: 'individual' },
    },
    sectionRules: {
      'family-dinners': { label: 'Family Dinners', min: 3, max: 3 },
      'kids-meals': { label: 'Kids Meals', min: 10, max: 10 },
    },
    billing: { monthlyTotalCents: 106800, equivalentWeeklyCents: 26700, cadence: 'monthly', billingDay: '10th', nextBillingDate: '2026-09-10' },
  },
  catherine: {
    schemaVersion: 2,
    sections: {
      'family-dinners': { label: 'Family Dinners', qty: 2, servesAdults: 3, servesKids: 0, menuCategory: 'dinner', style: 'family' },
    },
    sectionRules: { 'family-dinners': { label: 'Family Dinners', min: 2, max: 2 } },
    requiredEntrees: 2,
    maxTotalItems: 2,
    allowDuplicates: true,
    billing: { weeklyTotalCents: 12000, cadence: 'weekly', billingDay: 'Monday', nextBillingDate: null },
  },
};

const customerUpdates = [
  { slug: 'samantha-bailey', plan: plans.samantha },
  { slug: 'sanjay-roy', plan: plans.sanjay },
  { slug: 'levy-family', plan: plans.david },
  { slug: 'catherine-squires', plan: plans.catherine },
];

const brainUpdates = [
  { name: 'Samantha Bailey', customerSlug: 'samantha-bailey', stage: 'active', plan: plans.samantha },
  { name: 'Sanjay Roy', customerSlug: 'sanjay-roy', stage: 'active', plan: plans.sanjay },
  { name: 'Gabriella Scarpa', customerSlug: null, stage: 'active', plan: plans.gabriella },
  { name: 'Levy Family', customerSlug: 'levy-family', stage: 'active', plan: plans.david },
  { name: 'Catherine Squires', customerSlug: 'catherine-squires', stage: 'paused', plan: plans.catherine },
];

const plannerUpdates = [
  {
    templateId: 'meal-prep-samantha-bailey-monday',
    title: 'Meal prep — Samantha Bailey: 3 lunches for 2 adults',
    weeklyCents: 11000,
    enabled: true,
    source: 'Owner-confirmed reduced plan and $110 weekly Saturday billing; Square invoice 000067 paid August 15',
    metadata: { billingCustomerName: 'Samantha Bailey', billingAmountCents: 11000, billingCadence: 'weekly_saturday', nextBillingDate: '2026-08-22', billingStatus: 'active', squareRecipient: 's.anupama.bailey@gmail.com', serviceDay: 'Monday' },
    notes: 'Three lunches for two adults. Bills $110 each Saturday; Monday service.',
  },
  {
    templateId: 'meal-prep-sanjay-wednesday',
    title: 'Meal prep — Sanjay: 8 beef bowls',
    weeklyCents: 12800,
    enabled: true,
    source: 'Owner-confirmed 8 beef bowls weekly and $512 monthly billing',
    metadata: { billingCustomerName: 'Sanjay', billingAmountCents: 51200, billingCadence: 'monthly', nextBillingDate: '2026-09-05', billingStatus: 'active', squareRecipient: 'sanjayroy1309@gmail.com', serviceDay: 'Wednesday', beefBowls: 8 },
    notes: 'Eight beef bowls each Wednesday. Bills $512 monthly; next billing September 5.',
  },
  {
    templateId: 'meal-prep-gabriella-scarpa-tuesday',
    title: 'Meal prep — Gabriella Scarpa',
    weeklyCents: 35125,
    enabled: true,
    source: 'Owner-confirmed $1,405 monthly billing; August includes one skipped service week',
    metadata: { billingCustomerName: 'Gabriella Scarpa', billingAmountCents: 140500, billingCadence: 'monthly_month_end', nextBillingDate: '2026-08-31', billingStatus: 'active', squareRecipient: 'scarpa.gabriella5@gmail.com', serviceDay: 'Tuesday', currentMonthSkippedWeeks: 1 },
    notes: 'Monthly billing is $1,405. The current cycle includes one skipped service week; next billing is August 31.',
  },
  {
    templateId: 'meal-prep-david-allison-monday',
    title: 'Meal prep — David and Allison',
    weeklyCents: 26700,
    enabled: true,
    source: 'Square invoice 000013-R-0012 scheduled for $1,068 on September 10; owner identified September 10 billing',
    metadata: { billingCustomerName: 'David and Allison', billingAmountCents: 106800, billingCadence: 'monthly', nextBillingDate: '2026-09-10', billingStatus: 'active', squareRecipient: 'davelevy3@gmail.com', serviceDay: 'Monday' },
    notes: 'Monthly billing is $1,068. Square invoice #000013-R-0012 is scheduled for September 10.',
  },
  {
    templateId: 'meal-prep-catherine-squires-wednesday',
    title: 'Meal prep — Catherine Squires (confirmation pending)',
    weeklyCents: 12000,
    enabled: false,
    source: 'Owner-confirmed two-week pause; order confirmation pending August 15',
    metadata: { billingCustomerName: 'Catherine Squires', billingAmountCents: 12000, billingCadence: 'weekly_monday', nextBillingDate: null, billingStatus: 'paused_pending_confirmation', squareRecipient: 'catherine@catherinesquires.com', serviceDay: 'Wednesday' },
    notes: 'Usually bills $120 on Monday. Paused after two weeks off; do not forecast until the current order is confirmed.',
  },
].map((entry) => ({
  ...entry,
  metadata: {
    ...entry.metadata,
    cashflowBillingOverride: true,
    billingEvidence: 'owner_reported_empirical',
    evidenceAsOf: EVIDENCE_AS_OF,
  },
}));

async function loadTargets() {
  const customers = await prisma.customer.findMany({ where: { slug: { in: customerUpdates.map((entry) => entry.slug) } } });
  const entities = await prisma.brainEntity.findMany({
    where: { entityType: 'Customer', tombstonedAt: null, name: { in: brainUpdates.map((entry) => entry.name) } },
  });
  const cards = await prisma.plannerCard.findMany({
    where: { supabaseUid: PLANNER_UID, templateId: { in: plannerUpdates.map((entry) => entry.templateId) }, date: { gte: EVIDENCE_AS_OF } },
  });
  if (customers.length !== customerUpdates.length) throw new Error(`Expected ${customerUpdates.length} Customer rows, found ${customers.length}`);
  if (entities.length !== brainUpdates.length) throw new Error(`Expected ${brainUpdates.length} Brain customer rows, found ${entities.length}`);
  for (const update of plannerUpdates) {
    if (!cards.some((card) => card.templateId === update.templateId)) throw new Error(`No future planner cards found for ${update.templateId}`);
  }
  return { customers, entities, cards };
}

async function main() {
  const targets = await loadTargets();
  const preview = plannerUpdates.map((entry) => ({
    customer: entry.metadata.billingCustomerName,
    plan: entry.title,
    billingAmountCents: entry.metadata.billingAmountCents,
    billingCadence: entry.metadata.billingCadence,
    nextBillingDate: entry.metadata.nextBillingDate,
    billingStatus: entry.metadata.billingStatus,
    plannerCards: targets.cards.filter((card) => card.templateId === entry.templateId).length,
  }));
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', preview }, null, 2));
  if (!APPLY) return;

  const customersBySlug = new Map(targets.customers.map((customer) => [customer.slug, customer]));
  const entitiesByName = new Map(targets.entities.map((entity) => [entity.name, entity]));

  for (const update of brainUpdates) {
    await writeLedgerEvent({
      eventType: 'meal_prep.billing.updated',
      source: 'operator:planner-billing-correction',
      sourceId: `meal-prep-billing:${update.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${EVIDENCE_AS_OF}`,
      actorType: 'operator',
      payload: { name: update.name, stage: update.stage, plan: update.plan, evidenceAsOf: EVIDENCE_AS_OF },
      updatePayload: true,
    });
  }

  await prisma.$transaction([
    ...customerUpdates.map((update) => prisma.customer.update({
      where: { slug: update.slug },
      data: { planRulesJson: update.plan },
    })),
    ...brainUpdates.map((update) => {
      const entity = entitiesByName.get(update.name);
      const linkedCustomerId = update.customerSlug ? customersBySlug.get(update.customerSlug).id : entity.localEffortCustomerId;
      const properties = entity.properties || {};
      return prisma.brainEntity.update({
        where: { id: entity.id },
        data: {
          localEffortCustomerId: linkedCustomerId || null,
          properties: {
            ...properties,
            mealPrepStage: update.stage,
            mealPrepPlan: update.plan,
            billingEvidenceAsOf: EVIDENCE_AS_OF,
            billingEvidence: 'owner_reported_empirical',
            ...(update.name === 'Catherine Squires'
              ? { mealPrepPause: { reason: 'two_weeks_off', confirmationPending: true, asOf: EVIDENCE_AS_OF } }
              : { mealPrepPause: null }),
          },
        },
      });
    }),
    ...plannerUpdates.map((update) => prisma.plannerCard.updateMany({
      where: { supabaseUid: PLANNER_UID, templateId: update.templateId, date: { gte: EVIDENCE_AS_OF } },
      data: {
        title: update.title,
        revenue: Math.round(update.weeklyCents / 100),
        revenueCents: update.weeklyCents,
        cashReceivedCents: 0,
        financialStatus: update.enabled ? 'committed' : 'paused_pending_confirmation',
        financialSource: update.source,
        financialMetadata: update.metadata,
        notes: update.notes,
        enabled: update.enabled,
      },
    })),
  ]);

  const verified = await loadTargets();
  console.log(JSON.stringify({
    mode: 'applied',
    customers: verified.customers.map((customer) => ({ slug: customer.slug, billing: customer.planRulesJson?.billing })),
    brain: verified.entities.map((entity) => ({ name: entity.name, stage: entity.properties?.mealPrepStage, billing: entity.properties?.mealPrepPlan?.billing, linkedCustomerId: entity.localEffortCustomerId })),
    planner: plannerUpdates.map((update) => ({
      templateId: update.templateId,
      cards: verified.cards.filter((card) => card.templateId === update.templateId).map((card) => ({ date: card.date, revenueCents: card.revenueCents, enabled: card.enabled, metadata: card.financialMetadata })),
    })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
