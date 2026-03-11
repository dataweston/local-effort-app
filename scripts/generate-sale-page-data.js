#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const sanity = require('@sanity/client');

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local'), override: false });
dotenv.config({ path: path.resolve(process.cwd(), '.env.vercel.production'), override: false });

const OUTPUT_FILE = path.resolve(process.cwd(), 'src/store/data/generatedSalePageData.json');

const FALLBACK_DATA = {
  generatedAt: new Date().toISOString(),
  page: {
    title: 'Local Effort Sale',
    subheading: 'Seasonal prepared foods, pantry goods, and limited preorders.',
    introText:
      'Browse the current Local Effort sale for seasonal drops, limited runs, and pantry staples. Open any product for larger photos, full details, and checkout options.',
  },
  products: [],
};

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

async function fetchSalePageData() {
  const projectId =
    process.env.VITE_APP_SANITY_PROJECT_ID ||
    process.env.VITE_SANITY_PROJECT_ID ||
    process.env.SANITY_PROJECT_ID;
  const dataset =
    process.env.VITE_APP_SANITY_DATASET ||
    process.env.VITE_SANITY_DATASET ||
    process.env.SANITY_DATASET;

  if (!projectId || !dataset) {
    process.stderr.write('[sale-data] Missing Sanity environment variables. Writing fallback data.\n');
    return FALLBACK_DATA;
  }

  const client = sanity.createClient({
    projectId,
    dataset,
    useCdn: true,
    apiVersion: '2023-05-03',
  });

  const query = `{
    "page": *[_type == "salePage"][0]{
      title,
      subheading,
      intro
    },
    "products": *[_type == "product" && active == true && "sale" in stores] | order(title asc){
      _id,
      title,
      "slug": slug.current,
      shortDescription,
      longDescription,
      images[]{asset->{url}},
      price,
      salePrice,
      priceDisplay,
      inventoryManaged,
      inventory,
      squareItemId,
      squareVariationId,
      variants[]{name, squareVariationId, price},
      addOns[]{name, additionalCost, squareModifierId, defaultSelected},
      offerDairyFree,
      dairyFreeCost,
      stores
    }
  }`;

  const result = await client.fetch(query);
  const page = result?.page || {};
  const products = Array.isArray(result?.products) ? result.products : [];

  return {
    generatedAt: new Date().toISOString(),
    page: {
      title: page.title || FALLBACK_DATA.page.title,
      subheading: page.subheading || FALLBACK_DATA.page.subheading,
      introText: extractPortableText(page.intro) || FALLBACK_DATA.page.introText,
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
      inventoryManaged: Boolean(product.inventoryManaged),
      inventory: typeof product.inventory === 'number' ? product.inventory : null,
      squareItemId: product.squareItemId || null,
      squareVariationId: product.squareVariationId || null,
      variants: Array.isArray(product.variants) ? product.variants : [],
      addOns: Array.isArray(product.addOns) ? product.addOns : [],
      offerDairyFree: Boolean(product.offerDairyFree),
      dairyFreeCost: typeof product.dairyFreeCost === 'number' ? product.dairyFreeCost : 0,
      stores: Array.isArray(product.stores) ? product.stores : [],
    })),
  };
}

async function main() {
  const data = await fetchSalePageData().catch((error) => {
    process.stderr.write(`[sale-data] Failed to fetch Sanity data. Writing fallback data. ${error?.message || error}\n`);
    return FALLBACK_DATA;
  });

  ensureDirectory(OUTPUT_FILE);
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  process.stdout.write(`[sale-data] Wrote ${data.products.length} products to ${OUTPUT_FILE}\n`);
}

main().catch((error) => {
  process.stderr.write(`[sale-data] Unexpected error ${error?.message || error}\n`);
  process.exit(1);
});
