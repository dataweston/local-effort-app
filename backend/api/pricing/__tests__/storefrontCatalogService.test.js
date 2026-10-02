import { describe, expect, it } from 'vitest';
import serviceModule from '../storefrontCatalogService';
const { priceStorefrontCart } = serviceModule;

function dependencies() {
  const rules = [
    { ruleKey: 'storefront.sale.pizza.base', calculator: 'store_item', amountCents: 1000 },
    { ruleKey: 'storefront.sale.pizza.addon.pepper', calculator: 'store_item', amountCents: 125 },
  ];
  return {
    prisma: {
      priceBook: { findFirst: async () => ({ id: 'book1', key: 'local-effort-standard', version: 4, metadata: { storefrontCatalogDigest: 'abcdef0123456789' }, rules }) },
      commercialOffer: { findMany: async () => [{ id: 'offer1', key: 'sale.pizza', status: 'active', product: { id: 'product1', key: 'retail' } }] },
    },
    sanityClient: { fetch: async () => [{ _id: 'sanity1', _rev: 'rev1', title: 'Pizza', commercialProductKey: 'retail', commercialOfferKey: 'sale.pizza', stores: ['sale'], addOns: [{ _key: 'pepper', name: 'Pepper', additionalCost: 125 }], variants: [] }] },
  };
}

describe('storefront runtime pricing', () => {
  it('returns relational lineage and uses stable add-on keys', async () => {
    const result = await priceStorefrontCart({ store: 'sale', items: [{ productId: 'sanity1', qty: 2, addOnKeys: ['pepper'] }], ...dependencies() });
    expect(result.subtotal).toBe(2250);
    expect(result.lines[0]).toMatchObject({ commercialProductId: 'product1', commercialOfferId: 'offer1', priceBookId: 'book1', catalogRevision: 'rev1', totalCents: 2250 });
  });

  it('rejects stale pricing before returning chargeable lines', async () => {
    await expect(priceStorefrontCart({ store: 'sale', items: [{ productId: 'sanity1', qty: 1 }], expectedPriceBookVersion: 'old:1:value', ...dependencies() })).rejects.toMatchObject({ code: 'catalog-price-changed', statusCode: 409 });
  });
});
