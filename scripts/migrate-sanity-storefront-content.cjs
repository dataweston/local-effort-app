#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sanity = require('@sanity/client');

const OFFER_KEYS = {
  'smith-cheese-3': ['pizza', 'pizza_on_smith.cheese.3_pack'],
  'smith-cheese-6': ['pizza', 'pizza_on_smith.cheese.6_pack'],
  'smith-kids-3': ['pizza', 'pizza_on_smith.kids_cheese.3_pack'],
  'smith-brussels': ['pizza', 'pizza_on_smith.brussels.single'],
  'smith-olive-oil': ['retail', 'pizza_on_smith.olive_oil.1_liter'],
};

function getClient() {
  const projectId = process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
  const dataset = process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET;
  if (!projectId || !dataset) throw new Error('Sanity project and dataset are required');
  return sanity.createClient({ projectId, dataset, token: process.env.SANITY_WRITE_TOKEN, useCdn: false, apiVersion: '2025-02-19' });
}

function pizzaDocuments() {
  const legacy = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/store/data/pizzaOnSmith.json'), 'utf8'));
  return legacy.products.map((product) => ({
    _id: `storefront-pizza-on-smith-${product.id}`,
    _type: 'product', title: product.title, slug: { _type: 'slug', current: product.id }, active: true,
    price: product.price, stores: ['pizza-on-smith'], commercialProductKey: OFFER_KEYS[product.id][0],
    commercialOfferKey: OFFER_KEYS[product.id][1], allowsDelivery: false, inventoryMode: 'unmanaged',
    migrationMetadata: { legacyId: product.id, source: 'pizzaOnSmith.json' },
    legacyImage: product.image || null,
  }));
}

async function main() {
  const apply = process.argv.includes('--apply');
  const client = getClient();
  const sale = await client.fetch(`*[_type == "product" && active == true && "sale" in stores]{_id,title,commercialProductKey,commercialOfferKey}`);
  const salePlan = sale.map((product) => ({ id: product._id, title: product.title, commercialProductKey: product.commercialProductKey || 'retail', commercialOfferKey: product.commercialOfferKey || `sale.${String(product._id).replace(/^drafts\./, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')}` }));
  const pizzas = pizzaDocuments();
  const summary = { apply, sale: salePlan, pizza: pizzas.map(({ legacyImage, ...doc }) => ({ ...doc, imageAction: legacyImage ? `upload public/images/pizza-on-smith/${legacyImage}.webp` : 'none' })) };
  if (!apply) return process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!process.env.SANITY_WRITE_TOKEN) throw new Error('SANITY_WRITE_TOKEN is required with --apply');
  const transaction = client.transaction();
  const uploadedAssets = new Map();
  salePlan.forEach((product) => transaction.patch(product.id, (patch) => patch.set({ commercialProductKey: product.commercialProductKey, commercialOfferKey: product.commercialOfferKey })));
  for (const doc of pizzas) {
    const { legacyImage, ...sanityDoc } = doc;
    if (legacyImage) {
      let asset = uploadedAssets.get(legacyImage);
      if (!asset) {
        asset = await client.assets.upload('image', fs.createReadStream(path.resolve(__dirname, `../public/images/pizza-on-smith/${legacyImage}.webp`)), { filename: `${legacyImage}.webp` });
        uploadedAssets.set(legacyImage, asset);
      }
      sanityDoc.images = [{ _key: 'primary', _type: 'image', asset: { _type: 'reference', _ref: asset._id } }];
    }
    transaction.createIfNotExists(sanityDoc);
  }
  await transaction.commit();
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
