import { describe, expect, it, vi } from 'vitest';
import serviceModule from '../storefrontCatalogService';
const { getStorefrontCatalog, priceStorefrontCart } = serviceModule;

function dependencies() {
  const rules = [
    { ruleKey: 'storefront.sale.pizza.base', calculator: 'store_item', amountCents: 1000 },
    { ruleKey: 'storefront.sale.pizza.addon.pepper', calculator: 'store_item', amountCents: 125 },
  ];
  return {
    prisma: {
      priceBook: { findFirst: async () => ({ id: 'book1', key: 'local-effort-standard', version: 4, metadata: { storefrontCatalogDigest: 'abcdef0123456789', sanityRevisions: { sanity1: 'rev1' } }, rules }) },
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

  it('rejects Sanity revision drift before returning a price', async () => {
    const deps = dependencies();
    deps.sanityClient.fetch = async () => [{ _id: 'sanity1', _rev: 'rev2', title: 'Changed', commercialProductKey: 'retail', commercialOfferKey: 'sale.pizza', stores: ['sale'] }];
    await expect(priceStorefrontCart({ store: 'sale', items: [{ productId: 'sanity1', qty: 1 }], ...deps })).rejects.toMatchObject({ code: 'catalog-revision-drift', statusCode: 409 });
  });

  it('intersects requested IDs with the selected store in the Sanity query', async () => {
    const deps = dependencies();
    const fetch = vi.fn().mockResolvedValue([]);
    await getStorefrontCatalog({ store: 'sale', productIds: ['sanity1'], ...deps, sanityClient: { fetch } });
    expect(fetch.mock.calls[0][0]).toContain('(_id in $productIds && $store in stores)');
  });

  it('does not accept an unknown commerce store', async () => {
    await expect(getStorefrontCatalog({ store: 'tiny-diner', ...dependencies() })).rejects.toMatchObject({ code: 'catalog-store-invalid', statusCode: 404 });
  });
});
