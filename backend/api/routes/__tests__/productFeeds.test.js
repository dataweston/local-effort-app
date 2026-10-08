import {describe, expect, it} from 'vitest';
import productFeeds from '../productFeeds';

const {itemsForProduct, renderItem} = productFeeds;
const smithPizza = {
  id: 'smith-cheese-3',
  title: '10-inch frozen cheese pizzas · 3 pack',
  price: 3400,
  images: ['https://cdn.example.test/smith-cheese.webp'],
  inventoryManaged: true,
  inventory: 4,
};

describe('Google Merchant feed for Pizza on Smith', () => {
  it('offers an accurate pickup listing and a direct checkout URL without shipping claims', () => {
    const result = itemsForProduct(smithPizza, 'pizza-on-smith', 'https://www.localeffortfood.com');
    expect(result.items).toHaveLength(1);
    const [item] = result.items;
    expect(item.link).toBe('https://www.localeffortfood.com/pizza-on-smith#order');
    expect(item.checkoutLinkTemplate).toBe(
      'https://www.localeffortfood.com/pizza-on-smith?add_to_cart=smith-cheese-3',
    );
    expect(item.pickupMethod).toBe('buy');
    expect(item.pickupSla).toBe('7-day');
    expect(item.shipping).toBeUndefined();
    expect(item.availability).toBe('in_stock');
    const xml = renderItem(item);
    expect(xml).toContain('<g:checkout_link_template>https://www.localeffortfood.com/pizza-on-smith?add_to_cart=smith-cheese-3</g:checkout_link_template>');
    expect(xml).toContain('<g:pickup_method>buy</g:pickup_method>');
    expect(xml).not.toContain('<g:shipping>');
  });

  it('does not offer depleted tracked inventory or invent a product image', () => {
    const depleted = itemsForProduct({...smithPizza, inventory: 0}, 'pizza-on-smith', 'https://example.test');
    expect(depleted.items[0].availability).toBe('out_of_stock');
    expect(itemsForProduct({...smithPizza, images: []}, 'pizza-on-smith', 'https://example.test').items).toEqual([]);
  });
});
