import { describe, expect, it } from 'vitest';
import { resolveCommercialProductRef } from '../commercialCatalogBridge';

describe('commercial catalog bridge', () => {
  it('maps Sanity storefront items to the retail product family', () => {
    expect(resolveCommercialProductRef({
      store: 'sale',
      sourceSystem: 'sanity',
      productId: 'sale-prod-1',
      productTitle: 'Garden soup',
    })).toMatchObject({
      productKey: 'retail',
      offerKey: 'retail_storefront',
      sourceSystem: 'sanity',
      businessLineKey: 'store',
    });
  });

  it('maps Pizza on Smith items to the pizza family', () => {
    expect(resolveCommercialProductRef({
      store: 'pizza-on-smith',
      sourceSystem: 'pizza_on_smith',
      productId: 'cheese',
      productTitle: 'Cheese Pizza',
    })).toMatchObject({
      productKey: 'pizza',
      offerKey: 'pizza_on_smith_pickup',
      sourceSystem: 'pizza_on_smith',
      businessLineKey: 'pizza',
    });
  });

  it('prefers explicit item-level identity while deriving the business line from the store', () => {
    expect(resolveCommercialProductRef({
      store: 'pizza-on-smith',
      sourceSystem: 'sanity',
      productId: 'olive-oil',
      productTitle: 'Olive Oil',
      productKey: 'retail',
      offerKey: 'pizza_on_smith.olive_oil.1_liter',
    })).toEqual({
      productKey: 'retail',
      offerKey: 'pizza_on_smith.olive_oil.1_liter',
      businessLineKey: 'pizza',
      sourceSystem: 'sanity',
      sourceId: 'olive-oil',
    });
  });
});
