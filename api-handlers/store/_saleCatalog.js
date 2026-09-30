const { resolveCommercialProductRef } = require('../../backend/api/pricing/commercialCatalogBridge');

let generatedSalePageData = null;

try {
  generatedSalePageData = require('../../src/store/data/generatedSalePageData.json');
} catch (_) {
  generatedSalePageData = null;
}

const normalizeGeneratedProduct = (product) => {
  if (!product || typeof product !== 'object' || !product.id) return null;
  const productRef = resolveCommercialProductRef({
    store: 'sale',
    sourceSystem: 'sanity',
    productId: product.id,
    productTitle: product.title || product.id,
  });
  return {
    _id: product.id,
    id: product.id,
    title: product.title || '',
    slug: product.slug ? { current: product.slug } : null,
    shortDescription: product.shortDescription || null,
    longDescription: product.longDescriptionBlocks || product.longDescription || null,
    images: Array.isArray(product.images)
      ? product.images.filter(Boolean).map((url) => ({ asset: { url } }))
      : [],
    price: Number(product.price) || 0,
    salePrice: Number.isFinite(product.salePrice) ? product.salePrice : null,
    priceDisplay: product.priceDisplay || null,
    inventoryManaged: !!product.inventoryManaged,
    inventory: typeof product.inventory === 'number' ? product.inventory : null,
    squareItemId: product.squareItemId || null,
    squareVariationId: product.squareVariationId || null,
    variants: Array.isArray(product.variants) ? product.variants : [],
    addOns: Array.isArray(product.addOns) ? product.addOns : [],
    offerDairyFree: !!product.offerDairyFree,
    dairyFreeCost: Number(product.dairyFreeCost) || 0,
    stores: Array.isArray(product.stores) ? product.stores : ['sale'],
    productKey: product.productKey || productRef.productKey,
    offerKey: product.offerKey || productRef.offerKey,
    commercialProductKey: product.commercialProductKey || productRef.productKey,
    commercialOfferKey: product.commercialOfferKey || productRef.offerKey,
    sourceSystem: product.sourceSystem || productRef.sourceSystem,
    businessLineKey: product.businessLineKey || productRef.businessLineKey,
    allowsDelivery: product.allowsDelivery !== false,
    requiresDateSelection: product.requiresDateSelection === true,
  };
};

const getGeneratedSaleProducts = () => {
  const products = Array.isArray(generatedSalePageData?.products)
    ? generatedSalePageData.products
    : [];
  return products.map(normalizeGeneratedProduct).filter(Boolean);
};

const getGeneratedSalePage = () => {
  const page = generatedSalePageData?.page;
  if (!page || typeof page !== 'object') return null;
  return {
    title: page.title || null,
    subheading: page.subheading || null,
    introText: page.introText || null,
  };
};

const getGeneratedSaleProductMap = (ids = []) => {
  const wanted = new Set(ids.filter(Boolean));
  const products = [...getGeneratedSaleProducts(), ...require('./_pizzaOnSmith').products];
  return Object.fromEntries(
    products
      .filter((product) => wanted.size === 0 || wanted.has(product._id))
      .map((product) => [product._id, product])
  );
};

const generatedProductToResponse = (product) => ({
  id: product._id,
  title: product.title,
  slug: product.slug?.current || null,
  shortDescription: product.shortDescription,
  longDescription: typeof product.longDescription === 'string' ? product.longDescription : null,
  longDescriptionBlocks: Array.isArray(product.longDescription) ? product.longDescription : null,
  images: (product.images || []).map((image) => image?.asset?.url).filter(Boolean),
  price: product.price ?? 0,
  salePrice: product.salePrice ?? null,
  priceDisplay: product.priceDisplay || null,
  inventoryManaged: !!product.inventoryManaged,
  inventory: typeof product.inventory === 'number' ? product.inventory : null,
  squareItemId: product.squareItemId || null,
  squareVariationId: product.squareVariationId || null,
  variants: Array.isArray(product.variants) ? product.variants : [],
  addOns: Array.isArray(product.addOns) ? product.addOns : [],
  offerDairyFree: product.offerDairyFree ?? false,
  dairyFreeCost: product.dairyFreeCost ?? 0,
  stores: Array.isArray(product.stores) ? product.stores : [],
  productKey: product.productKey || resolveCommercialProductRef({ store: 'sale', sourceSystem: 'sanity', productId: product._id, productTitle: product.title }).productKey,
  offerKey: product.offerKey || resolveCommercialProductRef({ store: 'sale', sourceSystem: 'sanity', productId: product._id, productTitle: product.title }).offerKey,
  commercialProductKey: product.commercialProductKey || resolveCommercialProductRef({ store: 'sale', sourceSystem: 'sanity', productId: product._id, productTitle: product.title }).productKey,
  commercialOfferKey: product.commercialOfferKey || resolveCommercialProductRef({ store: 'sale', sourceSystem: 'sanity', productId: product._id, productTitle: product.title }).offerKey,
  sourceSystem: product.sourceSystem || resolveCommercialProductRef({ store: 'sale', sourceSystem: 'sanity', productId: product._id, productTitle: product.title }).sourceSystem,
  businessLineKey: product.businessLineKey || resolveCommercialProductRef({ store: 'sale', sourceSystem: 'sanity', productId: product._id, productTitle: product.title }).businessLineKey,
  allowsDelivery: product.allowsDelivery !== false,
  requiresDateSelection: product.requiresDateSelection === true,
});

module.exports = {
  generatedProductToResponse,
  getGeneratedSalePage,
  getGeneratedSaleProductMap,
  getGeneratedSaleProducts,
};
