const sanity = require('@sanity/client');
const { businessLineForStore } = require('../finance/businessLines');
const { PRICE_BOOK_KEY } = require('./storefrontCatalogSync');

class StorefrontCatalogError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = 'StorefrontCatalogError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function pricingVersionFor(book) {
  const digest = String(book?.metadata?.storefrontCatalogDigest || '').slice(0, 12);
  return `${book.key}:${book.version}:${digest}`;
}

function createClient(env = process.env) {
  const projectId = env.VITE_APP_SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID || env.SANITY_PROJECT_ID;
  const dataset = env.VITE_APP_SANITY_DATASET || env.VITE_SANITY_DATASET || env.SANITY_DATASET;
  if (!projectId || !dataset) return null;
  return sanity.createClient({ projectId, dataset, token: env.SANITY_READ_TOKEN || env.SANITY_WRITE_TOKEN, useCdn: false, perspective: 'published', apiVersion: '2025-02-19' });
}

const PROJECTION = `{_id,_rev,title,slug,shortDescription,longDescription,images[]{asset->{url}},price,salePrice,priceDisplay,inventoryMode,manualQty,squareItemId,squareVariationId,variants[]{_key,name,squareVariationId,price},addOns[]{_key,name,additionalCost,squareModifierId,defaultSelected},offerDairyFree,dairyFreeCost,stores,commercialProductKey,commercialOfferKey,allowsDelivery,requiresDateSelection}`;

async function publishedKernel(prisma) {
  if (!prisma) throw new StorefrontCatalogError('Pricing is temporarily unavailable.', 'catalog-pricing-unavailable', 503);
  const book = await prisma.priceBook.findFirst({ where: { key: PRICE_BOOK_KEY, status: 'published', effectiveAt: { lte: new Date() } }, orderBy: { version: 'desc' }, include: { rules: { where: { calculator: 'store_item' } } } });
  if (!book) throw new StorefrontCatalogError('No storefront price book is published.', 'catalog-pricing-unavailable', 503);
  return book;
}

async function fetchDocuments(client, { store, productIds }) {
  if (!client) throw new StorefrontCatalogError('Catalog is temporarily unavailable.', 'catalog-pricing-unavailable', 503);
  const filter = productIds?.length ? '_id in $productIds' : '$store in stores';
  return client.fetch(`*[_type == "product" && active == true && ${filter}]${PROJECTION} | order(title asc)`, { store, productIds: productIds || [] });
}

async function getStorefrontCatalog({ store, productIds = null, prisma, sanityClient = createClient() }) {
  const [book, docs] = await Promise.all([publishedKernel(prisma), fetchDocuments(sanityClient, { store, productIds })]);
  const offerKeys = [...new Set((docs || []).map((doc) => doc.commercialOfferKey).filter(Boolean))];
  const offers = await prisma.commercialOffer.findMany({ where: { key: { in: offerKeys }, status: 'active' }, include: { product: true } });
  const offerByKey = new Map(offers.map((offer) => [offer.key, offer]));
  const ruleByKey = new Map(book.rules.map((rule) => [rule.ruleKey, rule]));
  const products = (docs || []).map((doc) => {
    const offer = offerByKey.get(doc.commercialOfferKey);
    const baseRule = ruleByKey.get(`storefront.${doc.commercialOfferKey}.base`);
    if (!offer || !baseRule || offer.product.key !== doc.commercialProductKey) {
      throw new StorefrontCatalogError(`Product ${doc._id} is not published.`, 'catalog-product-unpublished', 409);
    }
    return {
      id: doc._id, catalogRevision: doc._rev, title: doc.title, slug: doc.slug?.current || null,
      shortDescription: doc.shortDescription || null, longDescription: typeof doc.longDescription === 'string' ? doc.longDescription : null,
      longDescriptionBlocks: Array.isArray(doc.longDescription) ? doc.longDescription : null,
      images: (doc.images || []).map((image) => image?.asset?.url).filter(Boolean),
      price: baseRule.amountCents, salePrice: doc.salePrice ?? null, priceDisplay: doc.priceDisplay || null,
      inventoryManaged: doc.inventoryMode === 'manual', inventory: doc.inventoryMode === 'manual' ? doc.manualQty ?? 0 : null,
      inventoryMode: doc.inventoryMode || 'unmanaged', manualQty: doc.manualQty ?? null,
      squareItemId: doc.squareItemId || null, squareVariationId: doc.squareVariationId || null,
      variants: doc.variants || [], addOns: doc.addOns || [], offerDairyFree: doc.offerDairyFree === true,
      dairyFreeCost: doc.dairyFreeCost || 0, stores: doc.stores || [], allowsDelivery: doc.allowsDelivery !== false,
      requiresDateSelection: doc.requiresDateSelection === true,
      commercialProductId: offer.product.id, commercialProductKey: offer.product.key,
      commercialOfferId: offer.id, commercialOfferKey: offer.key,
      productKey: offer.product.key, offerKey: offer.key, sourceSystem: 'sanity', businessLineKey: businessLineForStore(store),
    };
  });
  return { products, priceBookId: book.id, priceBookKey: book.key, priceBookVersion: book.version, pricingVersion: pricingVersionFor(book), rules: ruleByKey };
}

function optionKeyFromInput(options, requestedKey, legacyIndex) {
  if (requestedKey) return requestedKey;
  if (Number.isInteger(legacyIndex) && options[legacyIndex]?._key) return options[legacyIndex]._key;
  return null;
}

async function priceStorefrontCart({ store, items, fulfillment = {}, expectedPriceBookVersion = null, prisma, sanityClient = createClient() }) {
  const ids = [...new Set(items.map((item) => item.productId))];
  const catalog = await getStorefrontCatalog({ store, productIds: ids, prisma, sanityClient });
  if (expectedPriceBookVersion && expectedPriceBookVersion !== catalog.pricingVersion) {
    throw new StorefrontCatalogError('Prices changed; review your bag before checking out.', 'catalog-price-changed', 409);
  }
  const byId = new Map(catalog.products.map((product) => [product.id, product]));
  const lines = items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) throw new StorefrontCatalogError(`Product ${item.productId} is not published.`, 'catalog-product-unpublished', 409);
    const quantity = Number(item.qty);
    if (!Number.isInteger(quantity) || quantity < 1) throw new StorefrontCatalogError('Each item needs qty >= 1.', 'catalog-option-invalid', 422);
    let unitPriceCents = catalog.rules.get(`storefront.${product.offerKey}.base`).amountCents;
    const pricingRuleKeys = [`storefront.${product.offerKey}.base`];
    const optionLabels = [];
    let variationId = item.variationId || null;
    if (variationId || item.variantKey) {
      const variant = product.variants.find((entry) => entry._key === item.variantKey || entry.squareVariationId === variationId);
      if (!variant?._key) throw new StorefrontCatalogError('The selected variant is no longer available.', 'catalog-option-invalid', 422);
      const ruleKey = `storefront.${product.offerKey}.variant.${variant._key}`;
      const rule = catalog.rules.get(ruleKey);
      if (!rule) throw new StorefrontCatalogError('The selected variant is not published.', 'catalog-option-invalid', 422);
      unitPriceCents = rule.amountCents;
      variationId = variant.squareVariationId || variationId;
      pricingRuleKeys.splice(0, 1, ruleKey);
      if (variant.name) optionLabels.push(variant.name);
    }
    const requestedKeys = Array.isArray(item.addOnKeys)
      ? item.addOnKeys
      : (item.addOnIndices || []).map((index) => optionKeyFromInput(product.addOns, null, Number(index)));
    for (const key of [...new Set(requestedKeys)]) {
      if (!key || !product.addOns.some((addOn) => addOn._key === key)) throw new StorefrontCatalogError('A selected add-on is no longer available.', 'catalog-option-invalid', 422);
      const ruleKey = `storefront.${product.offerKey}.addon.${key}`;
      const rule = catalog.rules.get(ruleKey);
      if (!rule) throw new StorefrontCatalogError('A selected add-on is not published.', 'catalog-option-invalid', 422);
      unitPriceCents += rule.amountCents;
      pricingRuleKeys.push(ruleKey);
      optionLabels.push(product.addOns.find((addOn) => addOn._key === key).name);
    }
    if (item.dairyFree) {
      const ruleKey = `storefront.${product.offerKey}.addon.dairy_free`;
      const rule = catalog.rules.get(ruleKey);
      if (!product.offerDairyFree || !rule) throw new StorefrontCatalogError('Dairy-free is not available for this item.', 'catalog-option-invalid', 422);
      unitPriceCents += rule.amountCents;
      pricingRuleKeys.push(ruleKey);
      optionLabels.push('Dairy-free');
    }
    return { sanityProductId: product.id, productId: product.id, catalogRevision: product.catalogRevision, commercialProductId: product.commercialProductId, commercialProductKey: product.productKey, productKey: product.productKey, commercialOfferId: product.commercialOfferId, commercialOfferKey: product.offerKey, offerKey: product.offerKey, priceBookId: catalog.priceBookId, priceBookKey: catalog.priceBookKey, priceBookVersion: catalog.priceBookVersion, pricingRuleKeys, title: product.title, quantity, qty: quantity, unitPriceCents, unitPrice: unitPriceCents, totalCents: unitPriceCents * quantity, lineTotal: unitPriceCents * quantity, optionSummary: optionLabels.join(', '), addOnKeys: requestedKeys, addOnIndices: item.addOnIndices || [], dairyFree: item.dairyFree === true, variationId, squareItemId: product.squareItemId, squareVariationId: variationId || product.squareVariationId, selectedDate: item.selectedDate || null, inventoryMode: product.inventoryMode, manualQty: product.manualQty, allowsDelivery: product.allowsDelivery, sourceSystem: 'sanity', businessLineKey: businessLineForStore(store), store };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.totalCents, 0);
  return { ...catalog, products: undefined, rules: undefined, lines, subtotal, fulfillment };
}

module.exports = { StorefrontCatalogError, getStorefrontCatalog, priceStorefrontCart, pricingVersionFor };
