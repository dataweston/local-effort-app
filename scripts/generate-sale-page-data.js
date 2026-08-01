#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const sanity = require('@sanity/client');

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local'), override: false });
dotenv.config({ path: path.resolve(process.cwd(), '.env.vercel.production'), override: false });

// Every storefront that is prerendered needs its catalogue on disk at build
// time — the pages fetch /api/store/products at runtime, and a crawler that
// never runs the fetch would otherwise see an empty grid and no Product
// JSON-LD. `salePage` is a Sanity singleton that only describes /sale, so the
// other stores carry their copy here.
const STORES = [
  {
    slug: 'sale',
    outputFile: 'src/store/data/generatedSalePageData.json',
    usesSalePageDoc: true,
    fallbackPage: {
      title: 'Local Effort Sale',
      subheading: 'Seasonal prepared foods, pantry goods, and limited preorders.',
      introText:
        'Browse the current Local Effort sale for seasonal drops, limited runs, and pantry staples. Open any product for larger photos, full details, and checkout options.',
    },
  },
  {
    slug: 'chez-garage',
    outputFile: 'src/store/data/generatedChezGaragePageData.json',
    usesSalePageDoc: false,
    fallbackPage: {
      title: 'Chez Garage',
      subheading: 'Hyper-casual dining from Local Effort Cooperative.',
      introText:
        'Chez Garage is a hyper-casual dining pop-up from Local Effort Cooperative: pub pizza, smoked and braised meats, and pantry goods to take home, served out of a garage.',
    },
  },
];

function extractPortableText(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';
  return blocks
    .map((block) => {
      if (!block || block._type !== 'block' || !Array.isArray(block.children)) return '';
      return block.children
        .map((child) => (child && typeof child.text === 'string' ? child.text : ''))
        .join('')
        .trim();
    })
    .filter(Boolean)
    .join('\n\n');
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function fallbackData(store) {
  return {
    generatedAt: new Date().toISOString(),
    store: store.slug,
    page: store.fallbackPage,
    products: [],
  };
}

function getSanityClient() {
  const projectId =
    process.env.VITE_APP_SANITY_PROJECT_ID ||
    process.env.VITE_SANITY_PROJECT_ID ||
    process.env.SANITY_PROJECT_ID;
  const dataset =
    process.env.VITE_APP_SANITY_DATASET ||
    process.env.VITE_SANITY_DATASET ||
    process.env.SANITY_DATASET;

  if (!projectId || !dataset) return null;

  return sanity.createClient({
    projectId,
    dataset,
    useCdn: true,
    apiVersion: '2023-05-03',
  });
}

async function fetchStoreData(client, store) {
  const pageProjection = store.usesSalePageDoc
    ? `"page": *[_type == "salePage"][0]{
      title,
      subheading,
      intro
    },`
    : '"page": null,';

  const query = `{
    ${pageProjection}
    "products": *[_type == "product" && active == true && $store in stores] | order(title asc){
      _id,
      title,
      "slug": slug.current,
      shortDescription,
      longDescription,
      images[]{asset->{url}},
      price,
      salePrice,
      priceDisplay,
      inventoryMode,
      manualQty,
      squareItemId,
      squareVariationId,
      variants[]{name, squareVariationId, price},
      addOns[]{name, additionalCost, squareModifierId, defaultSelected},
      offerDairyFree,
      dairyFreeCost,
      stores,
      allowsDelivery,
      requiresDateSelection
    }
  }`;

  const result = await client.fetch(query, { store: store.slug });
  const page = result?.page || {};
  const products = Array.isArray(result?.products) ? result.products : [];

  return {
    generatedAt: new Date().toISOString(),
    store: store.slug,
    page: {
      title: page.title || store.fallbackPage.title,
      subheading: page.subheading || store.fallbackPage.subheading,
      introText: extractPortableText(page.intro) || store.fallbackPage.introText,
    },
    products: products.map((product) => ({
      id: product._id,
      title: product.title,
      slug: product.slug || null,
      shortDescription: product.shortDescription || '',
      longDescription: typeof product.longDescription === 'string' ? product.longDescription : null,
      longDescriptionBlocks: Array.isArray(product.longDescription) ? product.longDescription : null,
      images: (product.images || []).map((image) => image?.asset?.url).filter(Boolean),
      price: typeof product.price === 'number' ? product.price : 0,
      salePrice: typeof product.salePrice === 'number' ? product.salePrice : null,
      priceDisplay: product.priceDisplay || null,
      // Inventory is configured as inventoryMode + manualQty in Sanity.
      inventoryManaged: product.inventoryMode === 'manual',
      inventory: product.inventoryMode === 'manual' && typeof product.manualQty === 'number'
        ? product.manualQty
        : null,
      squareItemId: product.squareItemId || null,
      squareVariationId: product.squareVariationId || null,
      variants: Array.isArray(product.variants) ? product.variants : [],
      addOns: Array.isArray(product.addOns) ? product.addOns : [],
      offerDairyFree: Boolean(product.offerDairyFree),
      dairyFreeCost: typeof product.dairyFreeCost === 'number' ? product.dairyFreeCost : 0,
      stores: Array.isArray(product.stores) ? product.stores : [],
      allowsDelivery: product.allowsDelivery !== false,
      requiresDateSelection: product.requiresDateSelection === true,
    })),
  };
}

async function main() {
  const client = getSanityClient();
  if (!client) {
    process.stderr.write('[sale-data] Missing Sanity environment variables. Writing fallback data.\n');
  }

  for (const store of STORES) {
    const data = client
      ? await fetchStoreData(client, store).catch((error) => {
        process.stderr.write(`[sale-data] ${store.slug}: Sanity fetch failed, writing fallback. ${error?.message || error}\n`);
        return fallbackData(store);
      })
      : fallbackData(store);

    const outputFile = path.resolve(process.cwd(), store.outputFile);
    ensureDirectory(outputFile);
    fs.writeFileSync(outputFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    process.stdout.write(`[sale-data] ${store.slug}: wrote ${data.products.length} products to ${store.outputFile}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`[sale-data] Unexpected error ${error?.message || error}\n`);
  process.exit(1);
});
