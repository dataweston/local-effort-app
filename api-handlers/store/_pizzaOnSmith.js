// Owner-defined offers, shared by the page, pricing and payment handlers.
const { resolveCommercialProductRef } = require('../../backend/api/pricing/commercialCatalogBridge');
const catalog = require('../../src/store/data/pizzaOnSmith.json');
const products = catalog.products.map((p) => {
  const productRef = resolveCommercialProductRef({
    store: catalog.store,
    sourceSystem: 'pizza_on_smith',
    productId: p.id,
    productTitle: p.name || p.title || p.id,
  });
  return {
    ...p,
    _id: p.id,
    slug: { current: p.id },
    stores: [catalog.store],
    productKey: productRef.productKey,
    offerKey: productRef.offerKey,
    commercialProductKey: productRef.productKey,
    commercialOfferKey: productRef.offerKey,
    sourceSystem: productRef.sourceSystem,
    businessLineKey: productRef.businessLineKey,
    allowsDelivery: false,
    inventoryMode: 'unmanaged',
    variants: [],
    addOns: [],
    images: p.image ? [{ asset: { url: `/images/pizza-on-smith/${p.image}.webp` } }] : [],
  };
});
const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
// Never let a Smith order inherit another shop's address or fulfillment terms.
function validateSmithOrder(items, store, pickup) {
  const hasSmith = items.some((item) => !!productMap[item.productId]);
  if (!hasSmith && store !== catalog.store) return null;
  if (store !== catalog.store || items.some((item) => !productMap[item.productId])) {
    return 'Please check out Pizza on Smith items separately at /pizza-on-smith.';
  }
  if (pickup !== true)
    return 'Pizza on Smith is pickup only: Tuesdays at 604 Smith Ave S, West St. Paul.';
  if (items.some((item) => item.variationId || item.dairyFree || item.addOnIndices?.length)) {
    return 'These pizzas have no selectable modifiers. Please refresh your order.';
  }
  return null;
}
module.exports = { catalog, products, productMap, validateSmithOrder };
