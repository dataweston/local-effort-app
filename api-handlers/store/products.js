// GET /api/store/products
// Product/page presentation comes directly from Sanity. Pricing is verified
// separately by /api/store/price so a missing pricing-kernel table never makes
// published CMS edits disappear from the storefront.
const sanity = require('@sanity/client');
const {
  generatedProductToResponse,
  getGeneratedStorePage,
  getGeneratedSaleProducts,
} = require('./_saleCatalog');
const { productToResponse } = require('./_sanityStorefront');

const projectId =
  process.env.VITE_APP_SANITY_PROJECT_ID ||
  process.env.VITE_SANITY_PROJECT_ID ||
  process.env.SANITY_PROJECT_ID;
const dataset =
  process.env.VITE_APP_SANITY_DATASET ||
  process.env.VITE_SANITY_DATASET ||
  process.env.SANITY_DATASET;

const client =
  projectId && dataset
    ? sanity.createClient({
        projectId,
        dataset,
        useCdn: false,
        perspective: 'published',
        apiVersion: '2025-02-19',
      })
    : null;

function extractPortableText(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) return '';
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

function fallbackFor(store) {
  const generated = getGeneratedSaleProducts(store);
  const products = (
    generated.length
      ? generated
      : store === 'pizza-on-smith'
        ? require('./_pizzaOnSmith').products
        : []
  ).map(generatedProductToResponse);
  return {
    products,
    page: getGeneratedStorePage(store),
  };
}

function uniqueProducts(products) {
  const bySlug = new Map();
  for (const product of products) {
    const key = product.slug || product.id;
    const existing = bySlug.get(key);
    if (!existing || product.id === key) bySlug.set(key, product);
  }
  return [...bySlug.values()];
}

const PRODUCT_PROJECTION = `{
  _id,
  _rev,
  title,
  slug,
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
}`;

const PIZZA_PAGE_PROJECTION = `{
  eyebrow,
  headline,
  introduction,
  storyHeading,
  storyText,
  orderHeading,
  orderIntroduction,
  pickupHeading,
  pickupAddress,
  oliveOilDescription,
  checkoutFootnote,
  journalEyebrow,
  journalHeading,
  returnToOrderLabel,
  notes[]{_key, label, heading, text}
}`;

module.exports = async (req, res) => {
  const store = req.query?.store || 'sale';
  const fallback = fallbackFor(store);
  if (!client) {
    return res.status(200).json({
      ...fallback,
      source: fallback.products.length ? 'generated' : 'empty',
    });
  }

  try {
    const productsQuery = `*[_type == "product" && active == true && $store in stores]${PRODUCT_PROJECTION} | order(coalesce(storeSortOrder, 9999) asc, lower(title) asc)`;
    const pageQuery =
      store === 'pizza-on-smith'
        ? `*[_type == "pizzaOnSmithPage"][0]${PIZZA_PAGE_PROJECTION}`
        : store === 'sale'
          ? '*[_type == "salePage"][0]{title, subheading, intro}'
          : 'null';
    const raw = await client.fetch(
      `{"page": ${pageQuery}, "products": ${productsQuery}}`,
      { store },
    );
    const products = Array.isArray(raw?.products)
      ? uniqueProducts(raw.products.map((document) => productToResponse(document, store)))
      : [];
    const page =
      store === 'sale' && raw?.page
        ? {
            title: raw.page.title || null,
            subheading: raw.page.subheading || null,
            introText: extractPortableText(raw.page.intro) || null,
          }
        : raw?.page || fallback.page;

    return res.status(200).json({
      products: products.length ? products : fallback.products,
      page,
      source: products.length ? 'sanity' : 'generated',
    });
  } catch (error) {
    if (fallback.products.length) {
      return res.status(200).json({
        ...fallback,
        source: 'generated',
        warning: error.message || 'Failed to load live products',
      });
    }
    return res.status(500).json({ error: error.message || 'Failed to load products' });
  }
};
