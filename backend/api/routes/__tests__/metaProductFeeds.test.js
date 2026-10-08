import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';

const products = {};
import { createMetaProductFeedsRouter } from '../metaProductFeeds';

const product = {
  id: 'smith-cheese',
  title: 'Cheese Pizza',
  shortDescription: 'A prepared cheese pizza',
  price: 3400,
  images: ['https://cdn.example.test/pizza.jpg'],
  inventoryManaged: true,
  inventory: 3,
};

function createApp() {
  const app = express();
  app.use(createMetaProductFeedsRouter({
    siteUrl: 'https://shop.example.test/',
    loadProducts: async () => products['pizza-on-smith'] || [],
  }));
  return app;
}


afterEach(() => {
  for (const key of Object.keys(products)) delete products[key];
});

describe('Meta Commerce Manager CSV feed for Pizza on Smith', () => {
  it('maps live store catalog data and states pickup-only without shipping or checkout claims', async () => {
    products['pizza-on-smith'] = [product];

    const response = await request(createApp()).get('/feeds/meta-commerce.csv').expect(200);
    const lines = response.text.trimEnd().split('\r\n');
    expect(lines[0]).toBe('"id","title","description","availability","condition","price","link","image_link","brand"');
    expect(lines[1]).toContain('"smith-cheese","Cheese Pizza","Pickup only. A prepared cheese pizza","in stock","new","34.00 USD"');
    expect(lines[1]).toContain('"https://shop.example.test/pizza-on-smith#order"');
    expect(lines[1]).toContain('"https://cdn.example.test/pizza.jpg"');
    expect(lines[1]).toContain('"Local Effort Cooperative"');
    expect(response.text).not.toMatch(/shipping|delivery|instagram checkout/i);
  });

  it('withholds products missing a product image or usable positive price', async () => {
    products['pizza-on-smith'] = [
      product,
      { ...product, id: 'no-image', images: [] },
      { ...product, id: 'no-price', price: null },
      { ...product, id: 'zero-price', price: 0 },
    ];

    const response = await request(createApp()).get('/feeds/meta-commerce.csv').expect(200);
    expect(response.text).toContain('"smith-cheese"');
    expect(response.text).not.toContain('"no-image"');
    expect(response.text).not.toContain('"no-price"');
    expect(response.text).not.toContain('"zero-price"');
  });

  it('CSV-quotes delimiter, quote, and line-break catalog values and preserves XML-like text safely', async () => {
    products['pizza-on-smith'] = [{
      ...product,
      title: 'Pie, "special"\n<seasonal>',
      shortDescription: 'Fresh & ready, pickup only\n</description>',
      images: ['https://cdn.example.test/image?a=1&b=2'],
    }];

    const response = await request(createApp()).get('/feeds/meta-commerce.csv').expect(200);
    expect(response.headers['content-type']).toMatch(/^text\/csv; charset=utf-8/);
    expect(response.headers['cache-control']).toContain('s-maxage=1800');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.text).toContain('"Pie, ""special""\n<seasonal>"');
    expect(response.text).toContain('"Pickup only. Fresh & ready, pickup only </description>"');
    expect(response.text).toContain('"https://cdn.example.test/image?a=1&b=2"');
  });

  it('maps depleted tracked inventory to the documented out-of-stock availability', async () => {
    products['pizza-on-smith'] = [{ ...product, inventory: 0 }];
    const response = await request(createApp()).get('/feeds/meta-commerce.csv').expect(200);
    expect(response.text).toContain('"out of stock"');
  });
});
