#!/usr/bin/env node

require('dotenv').config();

const { prisma } = require('../backend/api/utils/prisma');
const {
  INVENTORY_RESOURCES,
  OFFERS,
  PRICE_BOOK,
  PRODUCTS,
  RULES,
} = require('../backend/api/pricing/priceBookManifest');

const apply = process.argv.includes('--apply');

function comparableRule(rule) {
  return {
    calculator: rule.calculator,
    scopeKey: rule.scopeKey,
    ruleType: rule.ruleType,
    amountCents: rule.amountCents ?? null,
    rateBps: rule.rateBps ?? null,
    parameters: rule.parameters ?? null,
  };
}

function assertPublishedBookHasNoDrift(existing) {
  if (!existing) return;
  const existingByKey = new Map(existing.rules.map((rule) => [rule.ruleKey, rule]));
  for (const expected of RULES) {
    const actual = existingByKey.get(expected.ruleKey);
    if (!actual) continue;
    if (JSON.stringify(comparableRule(actual)) !== JSON.stringify(comparableRule(expected))) {
      throw new Error(`Published price rule drifted: ${expected.ruleKey}. Create price-book version ${PRICE_BOOK.version + 1} instead of rewriting it.`);
    }
  }
}

async function seed() {
  if (!apply) {
    console.log(JSON.stringify({
      dryRun: true,
      productKeys: PRODUCTS.map((item) => item.key),
      offerKeys: OFFERS.map((item) => item.key),
      priceBook: { key: PRICE_BOOK.key, version: PRICE_BOOK.version, status: PRICE_BOOK.status },
      ruleCount: RULES.length,
      inventoryResources: INVENTORY_RESOURCES.map((item) => ({ key: item.key, status: item.status })),
      next: 'Run with --apply after the migration is deployed.',
    }, null, 2));
    return;
  }
  if (!prisma) throw new Error('Database is unavailable');

  const existingBook = await prisma.priceBook.findUnique({
    where: { key_version: { key: PRICE_BOOK.key, version: PRICE_BOOK.version } },
    include: { rules: true },
  });
  assertPublishedBookHasNoDrift(existingBook);

  const result = await prisma.$transaction(async (tx) => {
    const productIds = new Map();
    for (const product of PRODUCTS) {
      const row = await tx.commercialProduct.upsert({
        where: { key: product.key },
        update: { name: product.name, description: product.description, status: 'active' },
        create: { ...product, status: 'active' },
      });
      productIds.set(product.key, row.id);
    }

    for (const offer of OFFERS) {
      const { productKey, ...data } = offer;
      await tx.commercialOffer.upsert({
        where: { key: offer.key },
        update: { ...data, productId: productIds.get(productKey) },
        create: { ...data, productId: productIds.get(productKey) },
      });
    }

    const priceBook = await tx.priceBook.upsert({
      where: { key_version: { key: PRICE_BOOK.key, version: PRICE_BOOK.version } },
      update: {},
      create: {
        ...PRICE_BOOK,
        effectiveAt: new Date(PRICE_BOOK.effectiveAt),
        publishedAt: new Date(),
      },
    });

    for (const rule of RULES) {
      await tx.priceRule.upsert({
        where: { priceBookId_ruleKey: { priceBookId: priceBook.id, ruleKey: rule.ruleKey } },
        update: {},
        create: { ...rule, priceBookId: priceBook.id },
      });
    }

    for (const resource of INVENTORY_RESOURCES) {
      const { productKey, ...data } = resource;
      await tx.inventoryResource.upsert({
        where: { key: resource.key },
        update: { ...data, productId: productIds.get(productKey) },
        create: { ...data, productId: productIds.get(productKey) },
      });
    }

    return { products: PRODUCTS.length, offers: OFFERS.length, rules: RULES.length, resources: INVENTORY_RESOURCES.length };
  });

  console.log(JSON.stringify({ ok: true, applied: true, ...result }, null, 2));
}

seed()
  .catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect?.();
  });
