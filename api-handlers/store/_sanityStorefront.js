const crypto = require('crypto');
const sanity = require('@sanity/client');
const { resolveCommercialProductRef } = require('../../backend/api/pricing/commercialCatalogBridge');
const { businessLineForStore } = require('../../backend/api/finance/businessLines');

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
        token: process.env.SANITY_READ_TOKEN || process.env.SANITY_WRITE_TOKEN,
        useCdn: false,
        perspective: 'published',
        apiVersion: '2025-02-19',
      })
    : null;

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

class SanityStorefrontError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = 'SanityStorefrontError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function requireClient() {
  if (!client) {
    throw new SanityStorefrontError(
      'The product catalog is temporarily unavailable.',
      'catalog-unavailable',
      503,
    );
  }
  return client;
}

async function fetchStorefrontProducts(store, productIds = null) {
  const ids = Array.isArray(productIds) ? [...new Set(productIds.filter(Boolean))] : [];
  const filter = ids.length ? '_id in $ids' : '$store in stores';
  return requireClient().fetch(
    `*[_type == "product" && active == true && $store in stores && ${filter}]${PRODUCT_PROJECTION} | order(coalesce(storeSortOrder, 9999) asc, lower(title) asc)`,
    { store, ids },
  );
}

function productToResponse(document, store) {
  const productRef = resolveCommercialProductRef({
    store,
    sourceSystem: 'sanity',
    productId: document._id,
    productTitle: document.title,
    productKey: document.commercialProductKey,
    offerKey: document.commercialOfferKey,
  });
  const inventoryManaged = document.inventoryMode === 'manual';
  return {
    id: document._id,
    catalogRevision: document._rev || null,
    title: document.title,
    slug: document.slug?.current || null,
    shortDescription: document.shortDescription || null,
    longDescription: typeof document.longDescription === 'string' ? document.longDescription : null,
    longDescriptionBlocks: Array.isArray(document.longDescription) ? document.longDescription : null,
    images: (document.images || []).map((image) => image?.asset?.url).filter(Boolean),
    price: document.salePrice ?? document.price ?? 0,
    listPrice: document.price ?? 0,
    salePrice: document.salePrice ?? null,
    priceDisplay: document.priceDisplay || null,
    inventoryManaged,
    inventory: inventoryManaged ? document.manualQty ?? 0 : null,
    inventoryMode: document.inventoryMode || 'unmanaged',
    manualQty: document.manualQty ?? null,
    squareItemId: document.squareItemId || null,
    squareVariationId: document.squareVariationId || null,
    variants: Array.isArray(document.variants) ? document.variants : [],
    addOns: Array.isArray(document.addOns) ? document.addOns : [],
    offerDairyFree: document.offerDairyFree === true,
    dairyFreeCost: document.dairyFreeCost || 0,
    stores: Array.isArray(document.stores) ? document.stores : [],
    storeSortOrder: document.storeSortOrder ?? null,
    productKey: productRef.productKey,
    offerKey: productRef.offerKey,
    commercialProductKey: productRef.productKey,
    commercialOfferKey: productRef.offerKey,
    sourceSystem: productRef.sourceSystem,
    businessLineKey: productRef.businessLineKey,
    allowsDelivery: document.allowsDelivery !== false,
    requiresDateSelection: document.requiresDateSelection === true,
  };
}

function pricingVersion(products) {
  const value = products
    .map((product) => `${product.id}:${product.catalogRevision || ''}`)
    .sort()
    .join('|');
  return `sanity:${crypto.createHash('sha256').update(value).digest('hex').slice(0, 20)}`;
}

function selectedAddOns(product, item) {
  const keys = Array.isArray(item.addOnKeys) ? item.addOnKeys : [];
  const indices = Array.isArray(item.addOnIndices) ? item.addOnIndices : [];
  const selected = [];
  for (const key of [...new Set(keys)]) {
    const addOn = product.addOns.find((entry) => entry._key === key);
    if (!addOn) {
      throw new SanityStorefrontError(
        'A selected add-on is no longer available.',
        'catalog-option-invalid',
        422,
      );
    }
    selected.push(addOn);
  }
  if (!keys.length) {
    for (const index of [...new Set(indices.map(Number))]) {
      if (!Number.isInteger(index) || !product.addOns[index]) {
        throw new SanityStorefrontError(
          'A selected add-on is no longer available.',
          'catalog-option-invalid',
          422,
        );
      }
      selected.push(product.addOns[index]);
    }
  }
  return selected;
}

async function priceSanityStorefrontCart({ store, items, expectedPricingVersion = null }) {
  const ids = [...new Set(items.map((item) => item.productId).filter(Boolean))];
  const documents = await fetchStorefrontProducts(store, ids);
  const products = documents.map((document) => productToResponse(document, store));
  const version = pricingVersion(products);
  if (expectedPricingVersion && expectedPricingVersion !== version) {
    throw new SanityStorefrontError(
      'Prices changed; review your bag before checking out.',
      'catalog-price-changed',
      409,
    );
  }
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines = items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) {
      throw new SanityStorefrontError(
        `Product not found: ${item.productId}`,
        'catalog-product-unavailable',
        422,
      );
    }
    const quantity = Number(item.qty);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new SanityStorefrontError('Each item needs qty >= 1.', 'catalog-option-invalid', 422);
    }
    let unitPrice = product.price;
    let variationId = item.variationId || null;
    const optionLabels = [];
    if (variationId || item.variantKey) {
      const variant = product.variants.find(
        (entry) => entry._key === item.variantKey || entry.squareVariationId === variationId,
      );
      if (!variant || !Number.isInteger(variant.price)) {
        throw new SanityStorefrontError(
          'The selected variant is no longer available.',
          'catalog-option-invalid',
          422,
        );
      }
      unitPrice = variant.price;
      variationId = variant.squareVariationId || variationId;
      if (variant.name) optionLabels.push(variant.name);
    }
    const addOns = selectedAddOns(product, item);
    addOns.forEach((addOn) => {
      unitPrice += addOn.additionalCost || 0;
      if (addOn.name) optionLabels.push(addOn.name);
    });
    if (item.dairyFree) {
      if (!product.offerDairyFree) {
        throw new SanityStorefrontError(
          'Dairy-free is not available for this item.',
          'catalog-option-invalid',
          422,
        );
      }
      unitPrice += product.dairyFreeCost;
      optionLabels.push('Dairy-free');
    }
    return {
      sanityProductId: product.id,
      productId: product.id,
      catalogRevision: product.catalogRevision,
      commercialProductId: null,
      commercialProductKey: product.productKey,
      productKey: product.productKey,
      commercialOfferId: null,
      commercialOfferKey: product.offerKey,
      offerKey: product.offerKey,
      priceBookId: null,
      priceBookKey: 'sanity-storefront',
      priceBookVersion: null,
      pricingRuleKeys: [],
      title: product.title,
      quantity,
      qty: quantity,
      unitPriceCents: unitPrice,
      unitPrice,
      totalCents: unitPrice * quantity,
      lineTotal: unitPrice * quantity,
      optionSummary: optionLabels.join(', '),
      addOnKeys: addOns.map((addOn) => addOn._key).filter(Boolean),
      addOnIndices: item.addOnIndices || [],
      dairyFree: item.dairyFree === true,
      variationId,
      squareItemId: product.squareItemId,
      squareVariationId: variationId || product.squareVariationId,
      selectedDate: item.selectedDate || null,
      inventoryMode: product.inventoryMode,
      manualQty: product.manualQty,
      allowsDelivery: product.allowsDelivery,
      sourceSystem: 'sanity',
      businessLineKey: businessLineForStore(store),
      store,
    };
  });
  return {
    lines,
    subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
    pricingVersion: version,
    priceBookKey: 'sanity-storefront',
    priceBookVersion: null,
  };
}

module.exports = {
  SanityStorefrontError,
  fetchStorefrontProducts,
  priceSanityStorefrontCart,
  productToResponse,
};
