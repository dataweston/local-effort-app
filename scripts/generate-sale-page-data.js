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
    slug: 'pizza-on-smith',
    outputFile: 'src/store/data/generatedPizzaOnSmithPageData.json',
    usesSalePageDoc: false,
    fallbackPage: {
      eyebrow: 'Frozen pizza · Tuesday pickup',
      headline: 'Home-oven pizzas, available on Smith Ave.',
      introduction: 'Pickup on Tuesdays. Perfect frozen pizzas for quick home dinners. 100% Midwest ingredients. Real food.',
      storyHeading: 'A little Naples.\nAll Midwest.',
      storyText: 'Neapolitan-inspired pizzas made with 100% Midwest ingredients. Vacuum sealed for shelf life and home-oven perfection.',
      orderHeading: 'Stock your freezer.',
      orderIntroduction: 'Choose your packs. Mix as you like.',
      pickupHeading: 'Pick up on Tuesday.',
      pickupAddress: '608 Smith Ave S, West St. Paul, MN',
      oliveOilDescription: 'Brush a little olive oil on the crusts after baking. They’re better that way.',
      checkoutFootnote: 'Secure payment with Square · No account needed',
      journalEyebrow: 'A few pictures from around here',
      journalHeading: 'This is local pizza.',
      returnToOrderLabel: 'Fill your freezer ↗',
      notes: [],
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
  try {
    const existing = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), store.outputFile), 'utf8'));
    if (Array.isArray(existing?.products) && existing.products.length) {
      return existing;
    }
  } catch (_) {
    // First build: use the store's copy-only fallback below.
  }
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
    : store.slug === 'pizza-on-smith'
      ? `"page": *[_type == "pizzaOnSmithPage"][0]{
          eyebrow, headline, introduction, storyHeading, storyText,
          orderHeading, orderIntroduction, pickupHeading, pickupAddress,
          oliveOilDescription, checkoutFootnote, journalEyebrow, journalHeading,
          returnToOrderLabel, notes[]{_key, label, heading, text}
        },`
      : '"page": null,';

  const query = `{
    ${pageProjection}
    "products": *[_type == "product" && active == true && $store in stores] | order(coalesce(storeSortOrder, 9999) asc, lower(title) asc){
      _id,
      _rev,
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
      variants[]{_key, name, squareVariationId, price},
      addOns[]{_key, name, additionalCost, squareModifierId, defaultSelected},
      offerDairyFree,
      dairyFreeCost,
      stores,
      storeSortOrder,
      commercialProductKey,
      commercialOfferKey,
      allowsDelivery,
      requiresDateSelection
    }
  }`;

  const result = await client.fetch(query, { store: store.slug });
  const page = result?.page || {};
  const products = Array.isArray(result?.products) ? result.products : [];
  const productsBySlug = new Map();
  products.forEach((product) => {
    const key = product.slug || product._id;
    const existing = productsBySlug.get(key);
    if (!existing || product._id === key) productsBySlug.set(key, product);
  });
  const uniqueProducts = [...productsBySlug.values()];
  const normalizedPage = store.usesSalePageDoc
    ? {
        title: page.title || store.fallbackPage.title,
        subheading: page.subheading || store.fallbackPage.subheading,
        introText: extractPortableText(page.intro) || store.fallbackPage.introText,
      }
    : store.slug === 'pizza-on-smith'
      ? {...store.fallbackPage, ...page, notes: page.notes?.length ? page.notes : store.fallbackPage.notes}
      : store.fallbackPage;

  return {
    generatedAt: new Date().toISOString(),
    store: store.slug,
    page: normalizedPage,
    products: uniqueProducts.map((product) => ({
      id: product._id,
      catalogRevision: product._rev || null,
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
      storeSortOrder: typeof product.storeSortOrder === 'number' ? product.storeSortOrder : null,
      commercialProductKey: product.commercialProductKey || null,
      commercialOfferKey: product.commercialOfferKey || null,
      allowsDelivery: product.allowsDelivery !== false,
      requiresDateSelection: product.requiresDateSelection === true,
    })),
  };
}

async function main() {
  const client = getSanityClient();
  const storeArg = process.argv.find((argument) => argument.startsWith('--store='));
  const requestedStore = storeArg ? storeArg.slice('--store='.length) : null;
  const stores = requestedStore ? STORES.filter((store) => store.slug === requestedStore) : STORES;
  if (requestedStore && !stores.length) throw new Error(`Unknown store: ${requestedStore}`);
  if (!client) {
    process.stderr.write('[sale-data] Missing Sanity environment variables. Writing fallback data.\n');
  }

  for (const store of stores) {
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
