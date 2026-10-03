#!/usr/bin/env node
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const sanity = require('@sanity/client');

const DESCRIPTIONS = {
  'smith-cheese-3': 'Three pizzas, ready when you are.',
  'smith-cheese-6': 'Six pizzas. Save $9 vs. two 3-packs.',
  'smith-kids-3': 'Little pizzas for little appetites.',
  'smith-brussels': 'One pizza. Something a little different.',
  'smith-olive-oil': 'Brush a little on the crust after baking.',
};

const OFFER_KEYS = {
  'smith-cheese-3': ['pizza', 'pizza_on_smith.cheese.3_pack'],
  'smith-cheese-6': ['pizza', 'pizza_on_smith.cheese.6_pack'],
  'smith-kids-3': ['pizza', 'pizza_on_smith.kids_cheese.3_pack'],
  'smith-brussels': ['pizza', 'pizza_on_smith.brussels.single'],
  'smith-olive-oil': ['retail', 'pizza_on_smith.olive_oil.1_liter'],
};

function getClient() {
  const projectId =
    process.env.VITE_APP_SANITY_PROJECT_ID ||
    process.env.VITE_SANITY_PROJECT_ID ||
    process.env.SANITY_PROJECT_ID ||
    'd6l9d0ea';
  const dataset =
    process.env.VITE_APP_SANITY_DATASET ||
    process.env.VITE_SANITY_DATASET ||
    process.env.SANITY_DATASET ||
    'localeffort';
  if (!process.env.SANITY_WRITE_TOKEN) throw new Error('SANITY_WRITE_TOKEN is required');
  return sanity.createClient({
    projectId,
    dataset,
    token: process.env.SANITY_WRITE_TOKEN,
    useCdn: false,
    perspective: 'raw',
    apiVersion: '2025-02-19',
  });
}

async function main() {
  const apply = process.argv.includes('--apply');
  const client = getClient();
  const catalog = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../src/store/data/pizzaOnSmith.json'), 'utf8'),
  );
  const canonicalIds = catalog.products.map((product) => product.id);
  const duplicateIds = canonicalIds.map((id) => `storefront-pizza-on-smith-${id}`);
  const allIds = [...canonicalIds, ...duplicateIds];
  const documents = await client.fetch(
    '*[_id in $ids || _id in $draftIds]{_id,title,images}',
    {ids: allIds, draftIds: allIds.map((id) => `drafts.${id}`)},
  );
  const byId = new Map(documents.map((document) => [document._id, document]));
  const patches = catalog.products.map((product, index) => {
    const duplicate = byId.get(`storefront-pizza-on-smith-${product.id}`);
    const canonical = byId.get(product.id);
    const images = canonical?.images?.length ? canonical.images : duplicate?.images || [];
    return {
      id: product.id,
      draftId: byId.has(`drafts.${product.id}`) ? `drafts.${product.id}` : null,
      values: {
        title: product.title,
        slug: {_type: 'slug', current: product.id},
        shortDescription: DESCRIPTIONS[product.id],
        active: true,
        price: product.price,
        stores: ['pizza-on-smith'],
        storeSortOrder: (index + 1) * 10,
        commercialProductKey: OFFER_KEYS[product.id][0],
        commercialOfferKey: OFFER_KEYS[product.id][1],
        allowsDelivery: true,
        inventoryMode: 'unmanaged',
        ...(images.length ? {images} : {}),
      },
    };
  });
  const deletes = documents
    .map((document) => document._id)
    .filter((id) => duplicateIds.includes(id) || duplicateIds.some((base) => id === `drafts.${base}`));
  const summary = {
    apply,
    canonicalProducts: patches.map(({id, draftId, values}) => ({
      id,
      draftAlsoPatched: Boolean(draftId),
      title: values.title,
      storeSortOrder: values.storeSortOrder,
      allowsDelivery: values.allowsDelivery,
    })),
    duplicateDocumentsToDelete: deletes,
  };
  if (!apply) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  const transaction = client.transaction();
  patches.forEach(({id, draftId, values}) => {
    transaction.patch(id, (patch) => patch.set(values));
    if (draftId) transaction.patch(draftId, (patch) => patch.set(values));
  });
  deletes.forEach((id) => transaction.delete(id));
  transaction.patch('pizza-on-smith-page', (patch) =>
    patch.setIfMissing({
      oliveOilDescription: 'The finishing touch: brush a little olive oil on the crusts after baking. They’re better that way.',
      checkoutFootnote: 'Secure payment with Square · No account needed',
      returnToOrderLabel: 'Fill your freezer ↗',
    }),
  );
  await transaction.commit();
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
