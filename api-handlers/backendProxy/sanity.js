const { createClient } = require('@sanity/client');

const projectId = process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
const dataset = process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET || 'localeffort';

const client = projectId && dataset ? createClient({ projectId, dataset, useCdn: false, apiVersion: '2023-05-03' }) : null;

async function fetchProducts() {
  if (!client) return [];
  const docs = await client.fetch(`*[_type == "product" && defined(active) && active == true]{
    _id,
    title,
    "slug": slug.current,
    shortDescription,
    longDescription,
    "images": images[]->{..., asset->url}[].asset->url,
    price,
    salePrice,
    squareItemId,
    squareVariationId,
    variants,
  }|order(title asc)`);
  return (docs || []).map((d) => ({
    id: d._id,
    title: d.title,
    slug: d.slug,
    shortDescription: d.shortDescription,
    longDescription: d.longDescriptionHtml || d.longDescription || '',
    images: Array.isArray(d.images) ? d.images : [],
    price: d.price ?? 0,
    salePrice: d.salePrice ?? null,
    squareItemId: d.squareItemId || null,
    squareVariationId: d.squareVariationId || null,
    variants: d.variants || [],
  }));
}

module.exports = { fetchProducts };
