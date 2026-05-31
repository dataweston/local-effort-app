// GET /api/store/products
// Returns products from Sanity; future: merge with Square for inventory/price.
const sanity = require('@sanity/client');

const projectId = process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
const dataset = process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET;

// useCdn: false ensures Sanity Studio edits are immediately reflected without CDN cache delay.
const client = projectId && dataset ? sanity.createClient({ projectId, dataset, useCdn: false, apiVersion: '2023-05-03' }) : null;

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

module.exports = async (req, res) => {
  try {
    if (!client) return res.status(200).json({ products: [], page: null });
    
    // Get store filter from query parameter (e.g., ?store=happy-monday)
    const storeFilter = req.query?.store || 'sale'; // Default to 'sale' for backwards compatibility

    // For the sale store also fetch the salePage document so SalePage can
    // display live title/subheading/intro without requiring a redeploy.
    const combinedQuery = `{
      "page": *[_type == "salePage"][0]{ title, subheading, intro },
      "products": *[_type == "product" && active == true && $store in stores]{
        _id,
        title,
        slug,
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
      } | order(title asc)
    }`;

    const productsOnlyQuery = `*[_type == "product" && active == true && $store in stores]{
      _id,
      title,
      slug,
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
    } | order(title asc)`;

    const raw = storeFilter === 'sale'
      ? await client.fetch(combinedQuery, { store: storeFilter })
      : { products: await client.fetch(productsOnlyQuery, { store: storeFilter }), page: null };

    const docs = Array.isArray(raw.products) ? raw.products : [];

    // Build live page metadata when available
    const rawPage = raw.page || {};
    const livePage = rawPage.title ? {
      title: rawPage.title || null,
      subheading: rawPage.subheading || null,
      introText: extractPortableText(rawPage.intro) || null,
    } : null;
    const products = (docs || []).map((d) => ({
      id: d._id,
      title: d.title,
      slug: d.slug?.current,
      shortDescription: d.shortDescription,
      longDescription: typeof d.longDescription === 'string' ? d.longDescription : null,
      longDescriptionBlocks: Array.isArray(d.longDescription) ? d.longDescription : null,
      images: (d.images || []).map((i) => i?.asset?.url).filter(Boolean),
      price: d.price ?? 0, // Already in cents from Sanity
      salePrice: d.salePrice ?? null, // Already in cents from Sanity
      priceDisplay: d.priceDisplay || null,
      inventoryManaged: !!d.inventoryManaged,
      inventory: typeof d.inventory === 'number' ? d.inventory : null,
      squareItemId: d.squareItemId || null,
      squareVariationId: d.squareVariationId || null,
      variants: Array.isArray(d.variants) ? d.variants : [],
      addOns: Array.isArray(d.addOns) ? d.addOns : [],
      offerDairyFree: d.offerDairyFree ?? false,
      dairyFreeCost: d.dairyFreeCost ?? 0,
      stores: Array.isArray(d.stores) ? d.stores : [],
    }));
    res.status(200).json({ products, page: livePage });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to load products' });
  }
};
