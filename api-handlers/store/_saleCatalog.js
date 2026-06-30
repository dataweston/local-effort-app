let generatedSalePageData = null;

try {
  generatedSalePageData = require('../../src/store/data/generatedSalePageData.json');
} catch (_) {
  generatedSalePageData = null;
}

const normalizeGeneratedProduct = (product) => {
  if (!product || typeof product !== 'object' || !product.id) return null;
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
    allowsDelivery: !!product.allowsDelivery,
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
  const products = getGeneratedSaleProducts();
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
  allowsDelivery: product.allowsDelivery ?? false,
});

module.exports = {
  generatedProductToResponse,
  getGeneratedSalePage,
  getGeneratedSaleProductMap,
  getGeneratedSaleProducts,
};
