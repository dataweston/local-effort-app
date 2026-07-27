/**
 * Create the two Localist membership subscription plans in the Square catalog.
 *
 * One-time setup for the /localist signup+payment flow: api-handlers/localist/
 * subscribe.js mints a Square-hosted checkout link carrying a subscription plan
 * VARIATION id, which both takes the first payment and enrols the buyer in the
 * recurring plan. Without these objects, paid signups silently fall back to
 * "recorded, team notified, a human follows up".
 *
 * Idempotent: re-running finds the existing plans by name and prints their ids
 * rather than creating duplicates.
 *
 *   node scripts/create-localist-subscription-plans.js          # dry run
 *   node scripts/create-localist-subscription-plans.js --apply  # write
 *
 * Run from the repo root — node resolves square/dotenv from the root
 * node_modules.
 */
require('dotenv').config();
const crypto = require('crypto');
const { getSquareClient } = require('../api-handlers/_lib/squareClient');

const PLANS = [
  { key: 'monthly', name: 'Localist Membership — Monthly', cadence: 'MONTHLY', amount: 4500 },
  { key: 'annual', name: 'Localist Membership — Annual', cadence: 'ANNUAL', amount: 37500 },
];

const ENV_VAR = {
  monthly: 'SQUARE_LOCALIST_MONTHLY_PLAN_VARIATION_ID',
  annual: 'SQUARE_LOCALIST_ANNUAL_PLAN_VARIATION_ID',
};

const money = (cents) => `$${(cents / 100).toFixed(2)}`;

async function listExistingPlans(client) {
  const res = await client.catalogApi.listCatalog(undefined, 'SUBSCRIPTION_PLAN');
  return res?.result?.objects || [];
}

// The variation is the object checkout enrols into, so it is the id the app needs.
function variationOf(plan) {
  const variations = plan?.subscriptionPlanData?.subscriptionPlanVariations || [];
  return variations[0]?.id || null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const { client, locationId, environmentName } = getSquareClient();
  if (!client) throw new Error('Square client unavailable — check SQUARE_ACCESS_TOKEN.');

  console.log(`Square ${environmentName}, location ${locationId}\n`);

  const existing = await listExistingPlans(client);
  const byName = new Map(existing.map((o) => [o?.subscriptionPlanData?.name, o]));

  const toCreate = [];
  const results = {};

  for (const plan of PLANS) {
    const hit = byName.get(plan.name);
    if (hit) {
      results[plan.key] = variationOf(hit);
      console.log(`EXISTS  ${plan.name}`);
      console.log(`        plan ${hit.id}  variation ${results[plan.key]}\n`);
    } else {
      toCreate.push(plan);
      console.log(`MISSING ${plan.name}  ${money(plan.amount)} / ${plan.cadence}\n`);
    }
  }

  if (!toCreate.length) {
    console.log('Nothing to create.');
  } else if (!apply) {
    console.log(`Dry run. Re-run with --apply to create ${toCreate.length} plan(s).`);
    return;
  } else {
    const objects = toCreate.map((plan) => ({
      type: 'SUBSCRIPTION_PLAN',
      id: `#${plan.key}-plan`,
      presentAtAllLocations: true,
      subscriptionPlanData: {
        name: plan.name,
        subscriptionPlanVariations: [
          {
            type: 'SUBSCRIPTION_PLAN_VARIATION',
            id: `#${plan.key}-variation`,
            presentAtAllLocations: true,
            subscriptionPlanVariationData: {
              name: plan.name,
              phases: [
                {
                  cadence: plan.cadence,
                  ordinal: 0,
                  pricing: {
                    type: 'STATIC',
                    priceMoney: { amount: plan.amount, currency: 'USD' },
                  },
                },
              ],
            },
          },
        ],
      },
    }));

    const res = await client.catalogApi.batchUpsertCatalogObjects({
      idempotencyKey: crypto.randomUUID(),
      batches: [{ objects }],
    });

    const created = res?.result?.objects || [];
    for (const plan of toCreate) {
      const made = created.find((o) => o?.subscriptionPlanData?.name === plan.name);
      results[plan.key] = variationOf(made);
      console.log(`CREATED ${plan.name}`);
      console.log(`        plan ${made?.id}  variation ${results[plan.key]}\n`);
    }
  }

  console.log('--- add to Vercel env + .env ---');
  for (const plan of PLANS) {
    if (results[plan.key]) console.log(`${ENV_VAR[plan.key]}=${results[plan.key]}`);
  }
}

main().catch((err) => {
  console.error('FAILED:', err?.message || err);
  if (err?.errors) console.error(JSON.stringify(err.errors, null, 2));
  process.exit(1);
});
