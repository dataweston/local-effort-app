#!/usr/bin/env node
require('dotenv').config();
const { prisma } = require('../backend/api/utils/prisma');
const { syncStorefrontCatalog } = require('../backend/api/pricing/storefrontCatalogSync');

async function main() {
  const apply = process.argv.includes('--apply');
  const json = process.argv.includes('--json');
  if (!prisma) throw new Error('DATABASE_URL is required');
  const summary = await syncStorefrontCatalog({ prisma, apply });
  process.stdout.write(json ? `${JSON.stringify(summary)}\n` : `${apply ? 'APPLY' : 'DRY RUN'}\n${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.code || 'catalog-sync-failed'}: ${error.message}\n`);
  if (error.errors) error.errors.forEach((message) => process.stderr.write(`- ${message}\n`));
  process.exitCode = 1;
}).finally(async () => prisma?.$disconnect?.());
