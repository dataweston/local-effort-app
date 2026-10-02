import { describe, expect, it, vi } from 'vitest';
import syncModule from '../storefrontCatalogSync';
const { CatalogValidationError, catalogDigest, normalizeSanityCatalog, reconcileStorefrontCatalog, storefrontRules } = syncModule;

const doc = (overrides = {}) => ({ _id: 'p1', _rev: 'rev1', title: 'Pizza', price: 1200, salePrice: 1000, stores: ['sale'], commercialProductKey: 'retail', commercialOfferKey: 'sale.pizza', variants: [{ _key: 'large', name: 'Large', price: 1800 }], addOns: [{ _key: 'pepper', name: 'Pepper', additionalCost: 125 }], offerDairyFree: true, dairyFreeCost: 200, ...overrides });

describe('storefront catalog synchronization', () => {
  it('normalizes cents and emits stable base, variant, addon and dairy-free rules', () => {
    const products = normalizeSanityCatalog([doc()], { productKeys: new Set(['retail']) });
    expect(products[0]).toMatchObject({ priceCents: 1000, listPriceCents: 1200, salePriceCents: 1000 });
    expect(storefrontRules(products).map((rule) => [rule.ruleKey, rule.amountCents])).toEqual([
      ['storefront.sale.pizza.base', 1000], ['storefront.sale.pizza.variant.large', 1800],
      ['storefront.sale.pizza.addon.pepper', 125], ['storefront.sale.pizza.addon.dairy_free', 200],
    ]);
  });

  it.each([
    [[doc(), doc({ _id: 'p2' })], 'duplicate commercialOfferKey'],
    [[doc({ commercialProductKey: 'missing' })], 'references missing product family'],
    [[doc({ price: null, salePrice: null })], 'price must be'],
    [[doc({ stores: ['mystery'] })], 'unknown store'],
    [[doc({ addOns: [{ name: 'No key', additionalCost: 1 }] })], 'requires a stable _key'],
  ])('rejects the complete set before writes', (documents, message) => {
    expect(() => normalizeSanityCatalog(documents, { productKeys: new Set(['retail']) })).toThrow(CatalogValidationError);
    try { normalizeSanityCatalog(documents, { productKeys: new Set(['retail']) }); } catch (error) { expect(error.errors.join(' ')).toContain(message); }
  });

  it('has a deterministic digest independent of source order', () => {
    const left = normalizeSanityCatalog([doc(), doc({ _id: 'p2', commercialOfferKey: 'sale.other' })], { productKeys: new Set(['retail']) });
    const right = normalizeSanityCatalog([...left].reverse().map((item) => ({ _id: item.sanityProductId, _rev: item.revision, title: item.title, price: item.listPriceCents, salePrice: item.salePriceCents, stores: item.stores, commercialProductKey: item.productKey, commercialOfferKey: item.offerKey, variants: [{ _key: 'large', name: 'Large', price: 1800 }], addOns: [{ _key: 'pepper', name: 'Pepper', additionalCost: 125 }], offerDairyFree: true, dairyFreeCost: 200 })), { productKeys: new Set(['retail']) });
    expect(catalogDigest(left)).toBe(catalogDigest(right));
  });

  it('is idempotent and preserves non-storefront rules when publishing', async () => {
    const documents = [doc()];
    const normalized = normalizeSanityCatalog(documents, { productKeys: new Set(['retail']) });
    const digest = catalogDigest(normalized);
    const create = vi.fn(); const update = vi.fn();
    const prisma = { commercialProduct: { findMany: vi.fn().mockResolvedValue([{ id: 'family1', key: 'retail' }]) }, commercialOffer: { findMany: vi.fn().mockResolvedValue([]) }, priceBook: { findFirst: vi.fn().mockResolvedValue({ id: 'book1', key: 'local-effort-standard', version: 1, name: 'Standard', currency: 'USD', metadata: {}, rules: [{ id: 'r1', priceBookId: 'book1', ruleKey: 'meal_prep.breakfast', calculator: 'meal_prep', scopeKey: 'breakfast', ruleType: 'unit_amount', amountCents: 1200, sortOrder: 1 }] }) }, $transaction: (callback) => callback({ commercialOffer: { upsert: vi.fn(), updateMany: vi.fn() }, priceBook: { create, update } }) };
    const first = await reconcileStorefrontCatalog({ prisma, documents, apply: true });
    expect(first.newPriceBookVersions).toBe(1);
    expect(create.mock.calls[0][0].data.rules.create.some((rule) => rule.calculator === 'meal_prep')).toBe(true);
    prisma.priceBook.findFirst.mockResolvedValue({ id: 'book2', key: 'local-effort-standard', version: 2, metadata: { storefrontCatalogDigest: digest }, rules: [] });
    const second = await reconcileStorefrontCatalog({ prisma, documents, apply: true });
    expect(second.newPriceBookVersions).toBe(0);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
