#!/usr/bin/env node
require('dotenv').config();
const { prisma } = require('../backend/api/utils/prisma');

async function main() {
  const apply = process.argv.includes('--apply');
  if (!prisma) throw new Error('DATABASE_URL is required');
  const lines = await prisma.commercialOrderLine.findMany({ where: { commercialOfferId: null, metadata: { not: null } }, select: { id: true, metadata: true } });
  const offers = await prisma.commercialOffer.findMany({ include: { product: true } });
  const byOffer = new Map(offers.map((offer) => [offer.key, offer]));
  const mapped = [];
  const unmapped = [];
  for (const line of lines) {
    const offer = byOffer.get(line.metadata?.offerKey);
    if (!offer || (line.metadata?.productKey && offer.product.key !== line.metadata.productKey)) unmapped.push({ lineId: line.id, productKey: line.metadata?.productKey || null, offerKey: line.metadata?.offerKey || null });
    else mapped.push({ lineId: line.id, commercialProductId: offer.productId, commercialOfferId: offer.id });
  }
  if (apply) await prisma.$transaction(mapped.map((entry) => prisma.commercialOrderLine.update({ where: { id: entry.lineId }, data: { commercialProductId: entry.commercialProductId, commercialOfferId: entry.commercialOfferId } })));
  process.stdout.write(`${JSON.stringify({ apply, mapped: mapped.length, unmapped }, null, 2)}\n`);
}
main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }).finally(async () => prisma?.$disconnect?.());
