// GET /api/store/products
// Store product prices and editorial fields are released together against the
// published kernel snapshot. Sanity supplies only the current editorial page.
const sanity = require('@sanity/client');
const { prisma } = require('../_lib/prisma');
const { getStorefrontCatalog } = require('../../backend/api/pricing/storefrontCatalogService');
const { getGeneratedStorePage } = require('./_saleCatalog');

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
  const fallbackPage = getGeneratedStorePage(store);
  if (!client) return res.status(503).json({ error: 'Catalog is temporarily unavailable.' });

  try {
    const pageQuery =
      store === 'pizza-on-smith'
        ? `*[_type == "pizzaOnSmithPage"][0]${PIZZA_PAGE_PROJECTION}`
        : store === 'sale'
          ? '*[_type == "salePage"][0]{title, subheading, intro}'
          : 'null';
    const raw = await client.fetch(
      `{"page": ${pageQuery}}`,
      { store },
    );
    const { products } = await getStorefrontCatalog({ store, prisma });
    const page =
      store === 'sale' && raw?.page
        ? {
            title: raw.page.title || null,
            subheading: raw.page.subheading || null,
            introText: extractPortableText(raw.page.intro) || null,
          }
        : raw?.page || fallbackPage;

    return res.status(200).json({
      products,
      page,
      source: 'pricing-kernel',
    });
  } catch (error) {
    return res.status(error.statusCode || 503).json({ error: error.message || 'Failed to load products', code: error.code || 'catalog-pricing-unavailable' });
  }
};
