/**
 * Read-only Meta Commerce Manager catalog data feed for Pizza on Smith.
 *
 * Meta's Product Data Specifications for Catalogs documents CSV/TSV/XLSX feed
 * files and product fields including id, title, description, availability,
 * condition, price, link and image_link; brand is also a documented attribute.
 * See https://www.facebook.com/business/help/120325381656392 . This feed emits
 * only those catalog attributes. The specifications do not define a pickup
 * fulfillment attribute for this product feed, so pickup-only is stated in the
 * supported description field; no shipping, pickup address, or pickup SLA is
 * asserted.
 *
 * Mount createMetaProductFeedsRouter() wherever desired; the router exposes
 * GET /feeds/meta-commerce.csv for a scheduled feed in Commerce Manager.
 */
const express = require('express');
const storeProductsHandler = require('../../../api-handlers/store/products');

const STORE = 'pizza-on-smith';
const BRAND = 'Local Effort Cooperative';
const COLUMNS = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'];

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function money(cents) {
  return `${(cents / 100).toFixed(2)} USD`;
}

function productDescription(product) {
  const blocks = Array.isArray(product.longDescriptionBlocks) ? product.longDescriptionBlocks : [];
  const fromBlocks = blocks
    .map((block) => (block && block._type === 'block' && Array.isArray(block.children)
      ? block.children.map((child) => (child && typeof child.text === 'string' ? child.text : '')).join('')
      : ''))
    .filter(Boolean)
    .join(' ');
  const source = fromBlocks || product.longDescription || product.shortDescription || '';
  const description = String(source).replace(/\s+/g, ' ').trim();
  return `Pickup only. ${description || product.title}`;
}

function pricedItems(product) {
  const variants = (Array.isArray(product.variants) ? product.variants : [])
    .filter((variant) => variant && Number.isSafeInteger(variant.price) && variant.price > 0);
  const basePrice = Number.isSafeInteger(product.salePrice) && product.salePrice > 0
    ? product.salePrice
    : product.price;

  if (!(Number.isSafeInteger(basePrice) && basePrice > 0) && variants.length) {
    return variants.map((variant, index) => ({
      id: variant.squareVariationId || `${product.id}-v${index + 1}`,
      title: variant.name ? `${product.title} — ${variant.name}` : product.title,
      price: money(variant.price),
    }));
  }
  if (!(Number.isSafeInteger(basePrice) && basePrice > 0)) return [];
  return [{
    id: product.squareVariationId || product.squareItemId || String(product.id),
    title: product.title,
    price: money(basePrice),
  }];
}

function rowsForProduct(product, site) {
  const images = (Array.isArray(product.images) ? product.images : []).filter(
    (image) => typeof image === 'string' && image.trim(),
  );
  // Meta requires a product image and price; never substitute an unrelated
  // storefront image or guessed price for an incomplete catalog item.
  if (!images.length) return [];

  const availability = product.inventoryManaged === true
    && (typeof product.inventory !== 'number' || product.inventory <= 0)
    ? 'out of stock'
    : 'in stock';
  const link = `${site}/pizza-on-smith#order`;
  return pricedItems(product).map((item) => ({
    id: item.id,
    title: item.title,
    description: productDescription(product),
    availability,
    condition: 'new',
    price: item.price,
    link,
    image_link: images[0],
    brand: BRAND,
  }));
}

function loadStoreProducts() {
  return new Promise((resolve, reject) => {
    let payload = null;
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) {
        payload = body;
        resolve(this.statusCode < 400 && Array.isArray(payload?.products) ? payload.products : []);
        return this;
      },
    };
    Promise.resolve(storeProductsHandler({ query: { store: STORE } }, res)).catch(reject);
  });
}

function createMetaProductFeedsRouter({ logger, siteUrl, loadProducts = loadStoreProducts } = {}) {
  const router = express.Router();
  const site = (siteUrl || process.env.SITE_ORIGIN || 'https://www.localeffortfood.com').replace(/\/$/, '');

  router.get('/feeds/meta-commerce.csv', async (_req, res) => {
    try {
      const products = await loadProducts();
      const rows = products.flatMap((product) => rowsForProduct(product, site));
      const csv = [COLUMNS, ...rows.map((row) => COLUMNS.map((column) => row[column]))]
        .map((row) => row.map(csvCell).join(','))
        .join('\r\n') + '\r\n';

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.end(csv);
    } catch (err) {
      logger?.error({ err }, 'Meta product catalog feed failed');
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.end('Failed to generate product feed');
    }
  });
  return router;
}

module.exports = { createMetaProductFeedsRouter, csvCell, rowsForProduct };
