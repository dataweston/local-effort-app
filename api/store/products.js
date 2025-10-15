// GET /api/store/products
// Returns products from Sanity; future: merge with Square for inventory/price.
const sanity = require('@sanity/client');

const projectId = process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
const dataset = process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET;

const client = projectId && dataset ? sanity.createClient({ projectId, dataset, useCdn: true, apiVersion: '2023-05-03' }) : null;

module.exports = async (req, res) => {
  try {
    if (!client) return res.status(200).json({ products: [] });
    
    // Get store filter from query parameter (e.g., ?store=happy-monday)
    const storeFilter = req.query?.store || 'sale'; // Default to 'sale' for backwards compatibility
    
    // Query products that are active AND include the requested store in their stores array
    const query = `*[_type == "product" && active == true && $store in stores]{
      _id,
      title,
      slug,
      shortDescription,
      longDescription,
      images[]{asset->{url}},
      price,
      salePrice,
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
    
    const docs = await client.fetch(query, { store: storeFilter });
    const products = (docs || []).map((d) => ({
      id: d._id,
      title: d.title,
      slug: d.slug?.current,
      shortDescription: d.shortDescription,
      longDescription: typeof d.longDescription === 'string' ? d.longDescription : null,
      longDescriptionBlocks: Array.isArray(d.longDescription) ? d.longDescription : null,
      images: (d.images || []).map((i) => i?.asset?.url).filter(Boolean),
      price: d.price ?? 0,
      salePrice: d.salePrice ?? null,
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
    res.status(200).json({ products });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to load products' });
  }
};
