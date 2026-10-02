// GET /api/store/products
// Returns products from Sanity; future: merge with Square for inventory/price.
const sanity = require('@sanity/client');
const { resolveCommercialProductRef } = require('../../backend/api/pricing/commercialCatalogBridge');
const { getStorefrontCatalog } = require('../../backend/api/pricing/storefrontCatalogService');
const { prisma } = require('../_lib/prisma');
const { generatedProductToResponse, getGeneratedSalePage, getGeneratedSaleProducts } = require('./_saleCatalog');

const projectId = process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
const dataset = process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET;

const client = projectId && dataset ? sanity.createClient({ projectId, dataset, useCdn: true, apiVersion: '2023-05-03' }) : null;

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
    // Get store filter from query parameter (e.g., ?store=happy-monday)
    const storeFilter = req.query?.store || 'sale'; // Default to 'sale' for backwards compatibility
    const generatedSmith = getGeneratedSaleProducts('pizza-on-smith');
    const smithFallback = (generatedSmith.length ? generatedSmith : require('./_pizzaOnSmith').products).map(generatedProductToResponse);
    const fallbackProducts = storeFilter === 'sale'
      ? getGeneratedSaleProducts().map(generatedProductToResponse)
      : storeFilter === 'pizza-on-smith' ? smithFallback : [];
    const fallbackPage = storeFilter === 'sale' ? getGeneratedSalePage() : null;
    if (!client) {
      return res.status(200).json({
        products: fallbackProducts,
        page: fallbackPage,
        source: fallbackProducts.length ? 'generated' : 'empty',
      });
    }

    try {
      const catalog = await getStorefrontCatalog({ store: storeFilter, prisma, sanityClient: client });
      const pageQuery = storeFilter === 'pizza-on-smith'
        ? `*[_type == "pizzaOnSmithPage"][0]{eyebrow, headline, introduction, storyHeading, storyText, orderHeading, orderIntroduction, pickupHeading, pickupAddress, journalEyebrow, journalHeading, notes[]{label, heading, text}}`
        : `*[_type == "salePage"][0]{ title, subheading, intro }`;
      const rawPage = (storeFilter === 'sale' || storeFilter === 'pizza-on-smith') ? await client.fetch(pageQuery) : null;
      const page = storeFilter === 'sale' && rawPage ? { title: rawPage.title || null, subheading: rawPage.subheading || null, introText: extractPortableText(rawPage.intro) || null } : rawPage;
      return res.status(200).json({ products: catalog.products, page, source: 'sanity', priceBookKey: catalog.priceBookKey, priceBookVersion: catalog.priceBookVersion, pricingVersion: catalog.pricingVersion });
    } catch (error) {
      return res.status(200).json({ products: fallbackProducts, page: fallbackPage, source: 'generated', warning: error.code || error.message || 'catalog-pricing-unavailable' });
    }
    
    // Query products that are active AND include the requested store in their stores array
    const productProjection = `{
      _id,
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
      variants[]{name, squareVariationId, price},
      addOns[]{name, additionalCost, squareModifierId, defaultSelected},
      offerDairyFree,
      dairyFreeCost,
      stores,
      commercialProductKey,
      commercialOfferKey,
      allowsDelivery,
      requiresDateSelection
    }`;
    const productsQuery = `*[_type == "product" && active == true && $store in stores]${productProjection} | order(title asc)`;
    const pageQuery = storeFilter === 'pizza-on-smith'
      ? `*[_type == "pizzaOnSmithPage"][0]{eyebrow, headline, introduction, storyHeading, storyText, orderHeading, orderIntroduction, pickupHeading, pickupAddress, journalEyebrow, journalHeading, notes[]{label, heading, text}}`
      : `*[_type == "salePage"][0]{ title, subheading, intro }`;
    const combinedQuery = `{
      "page": ${pageQuery},
      "products": ${productsQuery}
    }`;
    const raw = (storeFilter === 'sale' || storeFilter === 'pizza-on-smith')
      ? await client.fetch(combinedQuery, { store: storeFilter })
      : { products: await client.fetch(productsQuery, { store: storeFilter }), page: null };
    const docs = Array.isArray(raw.products) ? raw.products : [];
    const livePage = storeFilter === 'pizza-on-smith' ? (raw.page || null) : raw.page?.title ? {
      title: raw.page.title || null,
      subheading: raw.page.subheading || null,
      introText: extractPortableText(raw.page.intro) || null,
    } : fallbackPage;
    let products = (docs || []).map((d) => {
      // Inventory is configured in Sanity as inventoryMode + manualQty.
      // 'manual' tracks a fixed quantity; 'unmanaged'/'square' are not
      // count-managed here, so they show no quantity on the storefront.
      const inventoryManaged = d.inventoryMode === 'manual';
      const inventory = inventoryManaged && typeof d.manualQty === 'number' ? d.manualQty : null;
      const commercialRef = resolveCommercialProductRef({
        store: storeFilter,
        sourceSystem: 'sanity',
        productId: d._id,
        productTitle: d.title,
        productKey: d.commercialProductKey,
        offerKey: d.commercialOfferKey,
      });
      return {
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
      inventoryManaged,
      inventory,
      squareItemId: d.squareItemId || null,
      squareVariationId: d.squareVariationId || null,
      variants: Array.isArray(d.variants) ? d.variants : [],
      addOns: Array.isArray(d.addOns) ? d.addOns : [],
      offerDairyFree: d.offerDairyFree ?? false,
      dairyFreeCost: d.dairyFreeCost ?? 0,
      stores: Array.isArray(d.stores) ? d.stores : [],
      productKey: d.productKey || commercialRef.productKey,
      offerKey: d.offerKey || commercialRef.offerKey,
      commercialProductKey: d.commercialProductKey || commercialRef.productKey,
      commercialOfferKey: d.commercialOfferKey || commercialRef.offerKey,
      sourceSystem: d.sourceSystem || commercialRef.sourceSystem,
      businessLineKey: d.businessLineKey || commercialRef.businessLineKey,
      allowsDelivery: d.allowsDelivery !== false,
      requiresDateSelection: d.requiresDateSelection === true,
      };
    });
    if (storeFilter === 'pizza-on-smith') {
      const position = new Map(smithFallback.map((product, index) => [product.id, index]));
      products = products.sort((a, b) => (position.get(a.id) ?? 999) - (position.get(b.id) ?? 999));
    }
    res.status(200).json({
      products: products.length ? products : fallbackProducts,
      page: livePage,
      source: products.length ? 'sanity' : 'generated',
    });
  } catch (e) {
    const failedStore = req.query?.store || 'sale';
    const fallbackProducts = failedStore === 'sale'
      ? getGeneratedSaleProducts().map(generatedProductToResponse)
      : failedStore === 'pizza-on-smith'
        ? (getGeneratedSaleProducts('pizza-on-smith').length ? getGeneratedSaleProducts('pizza-on-smith') : require('./_pizzaOnSmith').products).map(generatedProductToResponse)
        : [];
    if (fallbackProducts.length) {
      return res.status(200).json({
        products: fallbackProducts,
        page: getGeneratedSalePage(),
        source: 'generated',
        warning: e.message || 'Failed to load live products',
      });
    }
    return res.status(500).json({ error: e.message || 'Failed to load products' });
  }
};
