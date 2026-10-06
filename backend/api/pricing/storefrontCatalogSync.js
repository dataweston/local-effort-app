const crypto = require('crypto');
const sanity = require('@sanity/client');
const { COMMERCE_STORE_KEYS } = require('./commerceStores');
const { RULES: BASE_PRICE_RULES } = require('./priceBookManifest');

const PRICE_BOOK_KEY = 'local-effort-standard';
const KNOWN_STORES = new Set(COMMERCE_STORE_KEYS);
const KEY_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

class CatalogValidationError extends Error {
  constructor(errors) {
    super(`Catalog validation failed (${errors.length})`);
    this.name = 'CatalogValidationError';
    this.code = 'catalog-validation-failed';
    this.errors = errors;
  }
}

function integerCents(value, path, errors, { optional = false } = {}) {
  if (optional && (value === null || value === undefined)) return null;
  if (!Number.isInteger(value) || value < 0) {
    errors.push(`${path} must be a non-negative integer number of cents`);
    return null;
  }
  return value;
}

function normalizeOption(option, kind, productId, errors) {
  const key = String(option?._key || '').trim();
  if (!key || !KEY_PATTERN.test(key)) errors.push(`${productId} ${kind} requires a stable _key`);
  const amountField = kind === 'variant' ? 'price' : 'additionalCost';
  return {
    key,
    name: String(option?.name || '').trim(),
    amountCents: integerCents(option?.[amountField], `${productId}.${kind}.${key || '?'}`, errors),
    squareVariationId: option?.squareVariationId || null,
    squareModifierId: option?.squareModifierId || null,
    defaultSelected: option?.defaultSelected === true,
  };
}

function normalizeSanityCatalog(documents, { productKeys = null } = {}) {
  const errors = [];
  const seenOffers = new Set();
  const products = (Array.isArray(documents) ? documents : []).map((doc) => {
    const id = String(doc?._id || '').trim();
    const productKey = String(doc?.commercialProductKey || '').trim();
    const offerKey = String(doc?.commercialOfferKey || '').trim();
    const stores = [...new Set(Array.isArray(doc?.stores) ? doc.stores.map(String) : [])].sort();
    if (!id) errors.push('product is missing _id');
    if (!productKey || !KEY_PATTERN.test(productKey)) errors.push(`${id || '?'} has no valid commercialProductKey`);
    if (productKeys && !productKeys.has(productKey)) errors.push(`${id || '?'} references missing product family ${productKey}`);
    if (!offerKey || !KEY_PATTERN.test(offerKey)) errors.push(`${id || '?'} has no valid commercialOfferKey`);
    if (seenOffers.has(offerKey)) errors.push(`duplicate commercialOfferKey ${offerKey}`);
    seenOffers.add(offerKey);
    if (!stores.length) errors.push(`${id || '?'} has no commerce store`);
    stores.forEach((store) => { if (!KNOWN_STORES.has(store)) errors.push(`${id || '?'} uses unknown store ${store}`); });

    const price = integerCents(doc?.price, `${id}.price`, errors);
    const salePrice = integerCents(doc?.salePrice, `${id}.salePrice`, errors, { optional: true });
    const variants = (doc?.variants || []).map((option) => normalizeOption(option, 'variant', id, errors));
    const addOns = (doc?.addOns || []).map((option) => normalizeOption(option, 'addon', id, errors));
    const dairyFreeCost = doc?.offerDairyFree
      ? integerCents(doc?.dairyFreeCost ?? 0, `${id}.dairyFreeCost`, errors)
      : 0;
    return {
      sanityProductId: id,
      revision: String(doc?._rev || ''),
      productKey,
      offerKey,
      title: String(doc?.title || '').trim(),
      description: doc?.shortDescription || null,
      stores,
      priceCents: salePrice ?? price,
      listPriceCents: price,
      salePriceCents: salePrice,
      variants,
      addOns,
      offerDairyFree: doc?.offerDairyFree === true,
      dairyFreeCost,
      inventoryMode: doc?.inventoryMode || 'unmanaged',
      manualQty: Number.isInteger(doc?.manualQty) ? doc.manualQty : null,
      allowsDelivery: doc?.allowsDelivery !== false,
      requiresDateSelection: doc?.requiresDateSelection === true,
      images: (doc?.images || []).map((image) => image?.asset?.url || image?.url).filter(Boolean),
      squareItemId: doc?.squareItemId || null,
      squareVariationId: doc?.squareVariationId || null,
    };
  }).sort((a, b) => a.offerKey.localeCompare(b.offerKey));
  if (errors.length) throw new CatalogValidationError(errors);
  return products;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function catalogDigest(products) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(products))).digest('hex');
}

function storefrontRules(products) {
  return products.flatMap((product, productIndex) => {
    const parameters = {
      sanityProductId: product.sanityProductId,
      catalogRevision: product.revision,
      productKey: product.productKey,
      offerKey: product.offerKey,
      listPriceCents: product.listPriceCents,
      salePriceCents: product.salePriceCents,
      stores: product.stores,
      fulfillment: { allowsDelivery: product.allowsDelivery, requiresDateSelection: product.requiresDateSelection },
      inventory: { mode: product.inventoryMode, manualQty: product.manualQty },
      processor: { squareItemId: product.squareItemId, squareVariationId: product.squareVariationId },
      variants: product.variants,
      addOns: product.addOns,
      offerDairyFree: product.offerDairyFree,
      dairyFreeCost: product.dairyFreeCost,
    };
    const base = [{ ruleKey: `storefront.${product.offerKey}.base`, calculator: 'store_item', scopeKey: product.offerKey, ruleType: 'unit_amount', amountCents: product.priceCents, parameters, displayLabel: product.title, sortOrder: 1000 + productIndex * 100 }];
    product.variants.forEach((variant, index) => base.push({ ruleKey: `storefront.${product.offerKey}.variant.${variant.key}`, calculator: 'store_item', scopeKey: product.offerKey, ruleType: 'unit_amount', amountCents: variant.amountCents, parameters: { ...parameters, optionKey: variant.key }, displayLabel: variant.name, sortOrder: 1010 + productIndex * 100 + index }));
    product.addOns.forEach((addOn, index) => base.push({ ruleKey: `storefront.${product.offerKey}.addon.${addOn.key}`, calculator: 'store_item', scopeKey: product.offerKey, ruleType: 'fixed_amount', amountCents: addOn.amountCents, parameters: { ...parameters, optionKey: addOn.key }, displayLabel: addOn.name, sortOrder: 1050 + productIndex * 100 + index }));
    if (product.offerDairyFree) base.push({ ruleKey: `storefront.${product.offerKey}.addon.dairy_free`, calculator: 'store_item', scopeKey: product.offerKey, ruleType: 'fixed_amount', amountCents: product.dairyFreeCost, parameters, displayLabel: 'Dairy-free', sortOrder: 1090 + productIndex * 100 });
    return base;
  });
}

function createSanityClient(env = process.env) {
  const projectId = env.VITE_APP_SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID || env.SANITY_PROJECT_ID;
  const dataset = env.VITE_APP_SANITY_DATASET || env.VITE_SANITY_DATASET || env.SANITY_DATASET;
  if (!projectId || !dataset) throw new Error('Sanity project and dataset are required');
  return sanity.createClient({ projectId, dataset, token: env.SANITY_READ_TOKEN || env.SANITY_WRITE_TOKEN, useCdn: false, perspective: 'published', apiVersion: '2025-02-19' });
}

async function fetchSanityCommerceProducts(client) {
  return client.fetch(`*[_type == "product" && active == true && count(stores) > 0]{_id,_rev,title,shortDescription,images[]{asset->{url}},price,salePrice,priceDisplay,inventoryMode,manualQty,squareItemId,squareVariationId,variants[]{_key,name,squareVariationId,price},addOns[]{_key,name,additionalCost,squareModifierId,defaultSelected},offerDairyFree,dairyFreeCost,stores,commercialProductKey,commercialOfferKey,allowsDelivery,requiresDateSelection}`);
}

async function reconcileStorefrontCatalog({ prisma, documents, apply = false }) {
  if (!prisma) throw new Error('Prisma is required');
  const families = await prisma.commercialProduct.findMany({ select: { id: true, key: true } });
  const familyByKey = new Map(families.map((family) => [family.key, family]));
  const products = normalizeSanityCatalog(documents, { productKeys: new Set(familyByKey.keys()) });
  if (!products.length) throw new Error('No active Sanity storefront products were found; reconciliation was not applied.');
  const digest = catalogDigest(products);
  const latest = await prisma.priceBook.findFirst({ where: { key: PRICE_BOOK_KEY, status: 'published' }, orderBy: { version: 'desc' }, include: { rules: true } });
  if (!latest || !Array.isArray(latest.rules) || !latest.rules.some((rule) => rule.calculator !== 'store_item')) {
    throw new Error('A complete base price book must be seeded before storefront reconciliation.');
  }
  const publishedRules = new Map(latest.rules.map((rule) => [rule.ruleKey, rule]));
  const missingBaseRule = BASE_PRICE_RULES.find((rule) => {
    const published = publishedRules.get(rule.ruleKey);
    return !published || JSON.stringify(stable({ calculator: published.calculator, scopeKey: published.scopeKey, ruleType: published.ruleType, amountCents: published.amountCents ?? null, rateBps: published.rateBps ?? null, parameters: published.parameters ?? null })) !== JSON.stringify(stable({ calculator: rule.calculator, scopeKey: rule.scopeKey, ruleType: rule.ruleType, amountCents: rule.amountCents ?? null, rateBps: rule.rateBps ?? null, parameters: rule.parameters ?? null }));
  });
  if (missingBaseRule) throw new Error(`The published base price book is incomplete or changed at ${missingBaseRule.ruleKey}.`);
  const existingOffers = await prisma.commercialOffer.findMany({ where: { metadata: { path: ['source'], equals: 'sanity_storefront' } } });
  const existingByKey = new Map(existingOffers.map((offer) => [offer.key, offer]));
  const activeKeys = new Set(products.map((product) => product.offerKey));
  const created = products.filter((product) => !existingByKey.has(product.offerKey)).length;
  const updated = products.filter((product) => existingByKey.has(product.offerKey) && JSON.stringify(existingByKey.get(product.offerKey).metadata || {}) !== JSON.stringify({ source: 'sanity_storefront', sanityProductId: product.sanityProductId, revision: product.revision, stores: product.stores })).length;
  const inactivated = existingOffers.filter((offer) => offer.status === 'active' && !activeKeys.has(offer.key)).length;
  const changed = latest?.metadata?.storefrontCatalogDigest !== digest;
  const summary = { apply, digest, products: products.length, created, updated, inactivated, unchanged: products.length - created - updated, rejected: 0, newPriceBookVersions: changed ? 1 : 0, nextVersion: changed ? (latest?.version || 0) + 1 : latest?.version || null };
  if (!apply) return summary;

  await prisma.$transaction(async (tx) => {
    for (const product of products) {
      const family = familyByKey.get(product.productKey);
      await tx.commercialOffer.upsert({
        where: { key: product.offerKey },
        create: { key: product.offerKey, productId: family.id, name: product.title, description: product.description, status: 'active', composition: { stores: product.stores }, metadata: { source: 'sanity_storefront', sanityProductId: product.sanityProductId, revision: product.revision, stores: product.stores } },
        update: { productId: family.id, name: product.title, description: product.description, status: 'active', composition: { stores: product.stores }, metadata: { source: 'sanity_storefront', sanityProductId: product.sanityProductId, revision: product.revision, stores: product.stores } },
      });
    }
    const missingIds = existingOffers.filter((offer) => !activeKeys.has(offer.key)).map((offer) => offer.id);
    if (missingIds.length) await tx.commercialOffer.updateMany({ where: { id: { in: missingIds } }, data: { status: 'inactive' } });
    if (!changed) return;
    const nextVersion = (latest?.version || 0) + 1;
    const sourceRules = latest?.rules || [];
    const rules = [...sourceRules.filter((rule) => rule.calculator !== 'store_item'), ...storefrontRules(products)];
    const now = new Date();
    const createdBook = await tx.priceBook.create({ data: { key: PRICE_BOOK_KEY, version: nextVersion, name: latest?.name || 'Local Effort standard pricing', status: 'published', currency: latest?.currency || 'USD', effectiveAt: now, publishedAt: now, metadata: { ...(latest?.metadata || {}), storefrontCatalogDigest: digest, sanityRevisions: Object.fromEntries(products.map((product) => [product.sanityProductId, product.revision])) }, rules: { create: rules.map(({ id, priceBookId, createdAt, updatedAt, ...rule }) => rule) } } });
    if (latest) await tx.priceBook.update({ where: { id: latest.id }, data: { status: 'superseded', expiresAt: now } });
    return createdBook;
  });
  return summary;
}

async function syncStorefrontCatalog({ prisma, sanityClient = createSanityClient(), apply = false }) {
  const documents = await fetchSanityCommerceProducts(sanityClient);
  return reconcileStorefrontCatalog({ prisma, documents, apply });
}

module.exports = { CatalogValidationError, PRICE_BOOK_KEY, catalogDigest, fetchSanityCommerceProducts, normalizeSanityCatalog, reconcileStorefrontCatalog, storefrontRules, syncStorefrontCatalog };
