#!/usr/bin/env node

/**
 * Local wrapper for the July Dinner buyout Google Ads campaign helper.
 *
 * Default is validate-only. Nothing is created unless --apply is passed.
 * The production-safe route is POST /api/brain/google-ads/july-buyout-campaign.
 */

try {
  require('dotenv').config();
  require('dotenv').config({ path: '.env.local' });
} catch {
  // dotenv is present in this repo; keep the script usable in stripped-down envs.
}

const {
  CONFIRM_APPLY,
  listAccessibleCustomers,
  mutateJulyBuyoutCampaign,
} = require('../backend/api/brain/googleAdsJulyBuyout');

function parseArgs(argv) {
  const args = {
    apply: false,
    dailyBudget: 25,
    customerId: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') {
      args.apply = true;
    } else if (arg === '--list-accessible') {
      args.listAccessible = true;
    } else if (arg === '--daily-budget') {
      args.dailyBudget = Number(argv[++i]);
    } else if (arg === '--customer-id') {
      args.customerId = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  process.stdout.write([
    'Usage:',
    '  node scripts/google-ads-july-buyout-campaign.js --list-accessible',
    '  node scripts/google-ads-july-buyout-campaign.js [--daily-budget 25] [--customer-id 1234567890]',
    '  node scripts/google-ads-july-buyout-campaign.js --apply [--daily-budget 25] [--customer-id 1234567890]',
    '',
    'Default mode validates only. --apply creates paused resources.',
    `Production route apply confirmation: ${CONFIRM_APPLY}`,
    '',
  ].join('\n'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.listAccessible) {
    const result = await listAccessibleCustomers();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  const result = await mutateJulyBuyoutCampaign({
    apply: args.apply,
    dailyBudget: args.dailyBudget,
    customerId: args.customerId,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Google Ads July buyout campaign failed: ${error.message}\n`);
  process.exitCode = 1;
});
