const { businessLineForStore } = require('../finance/businessLines');

const DEFAULT_COMMERCIAL_PRODUCTS = {
  pizza: {
    productKey: 'pizza',
    offerKey: 'pizza_on_smith_pickup',
    businessLineKey: 'pizza',
    sourceSystem: 'pizza_on_smith',
    productName: 'Pizza',
  },
  retail: {
    productKey: 'retail',
    offerKey: 'retail_storefront',
    businessLineKey: 'store',
    sourceSystem: 'sanity',
    productName: 'Retail storefront',
  },
};

function resolveCommercialProductRef({
  store,
  sourceSystem,
  productId,
  productTitle,
  productKey,
  offerKey,
}) {
  const normalizedStore = typeof store === 'string' ? store : 'sale';
  const sanitizedSourceSystem = typeof sourceSystem === 'string' ? sourceSystem : null;

  if (productKey && offerKey) {
    return {
      productKey,
      offerKey,
      businessLineKey: businessLineForStore(normalizedStore),
      sourceSystem: sanitizedSourceSystem || (productKey === 'pizza' ? 'pizza_on_smith' : 'sanity'),
      sourceId: productId || productTitle || productKey,
    };
  }

  if (normalizedStore === 'pizza-on-smith') {
    return {
      ...DEFAULT_COMMERCIAL_PRODUCTS.pizza,
      sourceSystem: sanitizedSourceSystem || DEFAULT_COMMERCIAL_PRODUCTS.pizza.sourceSystem,
      sourceId: productId || productTitle || DEFAULT_COMMERCIAL_PRODUCTS.pizza.offerKey,
    };
  }

  return {
    ...DEFAULT_COMMERCIAL_PRODUCTS.retail,
    sourceSystem: sanitizedSourceSystem || DEFAULT_COMMERCIAL_PRODUCTS.retail.sourceSystem,
    sourceId: productId || productTitle || DEFAULT_COMMERCIAL_PRODUCTS.retail.offerKey,
  };
}

module.exports = {
  DEFAULT_COMMERCIAL_PRODUCTS,
  resolveCommercialProductRef,
};
