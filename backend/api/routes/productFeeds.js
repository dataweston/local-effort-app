/**
 * Google Merchant Center product feed.
 *
 * Why a feed and not the Merchant API: backend/api/brain/googleMerchantSync.js
 * is deliberately read-only, and writing products through the Merchant API
 * needs the Cloud project registered for Merchant API use plus an OAuth user on
 * the account — the account-side work that is still outstanding
 * (docs/google-business-integrations.md). A scheduled-fetch feed needs neither.
 * The owner adds this URL once under Merchant Center → Data sources → Add
 * product source → Scheduled fetch, and Google pulls it on its own.
 *
 *   /api/feeds/google-merchant.xml                 every storefront
 *   /api/feeds/google-merchant.xml?store=chez-garage   one storefront
 *
 * Products are read through the same handler the storefront calls, so the feed
 * and the shop can never describe different catalogues.
 */

const express = require('express');

const storeProductsHandler = require('../../../api-handlers/store/products');

// Storefronts that are public and orderable. A store not listed here is not fed.
const FEED_STORES = ['sale', 'chez-garage'];

const BRAND = 'Local Effort Cooperative';

// Handmade food cooked by the co-op. There is no manufacturer, so no GTIN and
// no MPN exist; Google wants that stated rather than guessed at.
const GOOGLE_PRODUCT_CATEGORY = 'Food, Beverages & Tobacco > Food Items';

const STORE_META = {
  'sale': { path: '/sale', productType: 'Prepared Food > Seasonal Drops' },
  'chez-garage': { path: '/chez-garage', productType: 'Prepared Food > Chez Garage Pop-Up' },
};

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function money(cents) {
  return `${(Number(cents || 0) / 100).toFixed(2)} USD`;
}

function plainText(product) {
  const blocks = Array.isArray(product.longDescriptionBlocks) ? product.longDescriptionBlocks : [];
  const fromBlocks = blocks
    .map((block) => (block && block._type === 'block' && Array.isArray(block.children)
      ? block.children.map((child) => (child && typeof child.text === 'string' ? child.text : '')).join('')
      : ''))
    .filter(Boolean)
    .join(' ');
  const text = (fromBlocks || product.longDescription || product.shortDescription || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text) return text.length > 4900 ? `${text.slice(0, 4897)}...` : text;
  return `${product.title} from ${BRAND}.`;
}

/**
 * Call the storefront handler with a stub response so the feed reads exactly
 * what the shop reads.
 */
function loadStoreProducts(store) {
  return new Promise((resolve, reject) => {
    let payload = null;
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { payload = body; resolve(this.statusCode < 400 ? (payload?.products || []) : []); return this; },
    };
    Promise.resolve(storeProductsHandler({ query: { store } }, res)).catch(reject);
  });
}

/**
 * One <item> per orderable variant. A product priced through its variants
 * (Chez Garage's Frozen Pizzas) becomes one item per pack size sharing an
 * item_group_id, which is how Google models the same thing.
 */
function itemsForProduct(product, store, siteUrl) {
  const meta = STORE_META[store] || { path: `/${store}`, productType: 'Prepared Food' };
  const link = `${siteUrl}${meta.path}#${product.slug || product.id}`;
  const images = (Array.isArray(product.images) ? product.images : []).filter(Boolean);

  // Google requires an image that shows the product itself. Substituting a
  // storefront photo would be a policy violation, so imageless products are
  // reported out rather than padded.
  if (!images.length) return { items: [], skipped: [`${product.title}: no image`] };

  const managed = product.inventoryManaged === true;
  const qty = typeof product.inventory === 'number' ? product.inventory : null;
  const availability = managed && (qty ?? 0) <= 0 ? 'out_of_stock' : 'in_stock';

  const base = {
    description: plainText(product),
    link,
    imageLink: images[0],
    additionalImages: images.slice(1, 11),
    availability,
    productType: meta.productType,
    // Local delivery only; nothing here ships by carrier. Free at the cart's
    // minimum, which is the storefront's own rule.
    shipping: { country: 'US', region: 'MN', price: '0.00 USD' },
  };

  const variants = (product.variants || []).filter(
    (variant) => variant && typeof variant.price === 'number' && variant.price > 0,
  );
  const basePrice = product.salePrice ?? product.price;

  if (!basePrice && variants.length) {
    const groupId = String(product.id);
    return {
      items: variants.map((variant, idx) => ({
        ...base,
        id: variant.squareVariationId || `${groupId}-v${idx + 1}`,
        itemGroupId: groupId,
        title: `${product.title} — ${variant.name}`,
        price: money(variant.price),
      })),
      skipped: [],
    };
  }

  if (!basePrice) return { items: [], skipped: [`${product.title}: no price`] };

  // g:price is the regular price and g:sale_price the discount, so a product on
  // sale carries both rather than quietly replacing one with the other.
  const onSale = product.salePrice && product.price && product.salePrice < product.price;
  return {
    items: [{
      ...base,
      id: product.squareVariationId || product.squareItemId || String(product.id),
      title: product.title,
      price: money(onSale ? product.price : basePrice),
      ...(onSale ? { salePrice: money(product.salePrice) } : {}),
    }],
    skipped: [],
  };
}

function renderItem(item) {
  const parts = [
    `<g:id>${escapeXml(item.id)}</g:id>`,
    `<g:title>${escapeXml(item.title)}</g:title>`,
    `<g:description>${escapeXml(item.description)}</g:description>`,
    `<g:link>${escapeXml(item.link)}</g:link>`,
    `<g:image_link>${escapeXml(item.imageLink)}</g:image_link>`,
    ...item.additionalImages.map((url) => `<g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`),
    `<g:availability>${item.availability}</g:availability>`,
    `<g:price>${item.price}</g:price>`,
    ...(item.salePrice ? [`<g:sale_price>${item.salePrice}</g:sale_price>`] : []),
    '<g:condition>new</g:condition>',
    `<g:brand>${escapeXml(BRAND)}</g:brand>`,
    '<g:identifier_exists>no</g:identifier_exists>',
    `<g:google_product_category>${escapeXml(GOOGLE_PRODUCT_CATEGORY)}</g:google_product_category>`,
    `<g:product_type>${escapeXml(item.productType)}</g:product_type>`,
    ...(item.itemGroupId ? [`<g:item_group_id>${escapeXml(item.itemGroupId)}</g:item_group_id>`] : []),
    '<g:shipping>'
      + `<g:country>${item.shipping.country}</g:country>`
      + `<g:region>${item.shipping.region}</g:region>`
      + `<g:price>${item.shipping.price}</g:price>`
      + '</g:shipping>',
  ];
  return `    <item>\n      ${parts.join('\n      ')}\n    </item>`;
}

function createProductFeedsRouter({ logger, siteUrl } = {}) {
  const router = express.Router();
  const site = (siteUrl || process.env.SITE_ORIGIN || 'https://www.localeffortfood.com').replace(/\/$/, '');

  router.get('/feeds/google-merchant.xml', async (req, res) => {
    try {
      const requested = String(req.query?.store || '').trim();
      if (requested && !FEED_STORES.includes(requested)) {
        return res.status(400).type('text/plain').send('Unknown store');
      }
      const stores = requested ? [requested] : FEED_STORES;

      const rendered = [];
      const skipped = [];
      const seen = new Set();

      for (const store of stores) {
        const products = await loadStoreProducts(store);
        for (const product of products) {
          const result = itemsForProduct(product, store, site);
          skipped.push(...result.skipped.map((reason) => `${store}/${reason}`));
          for (const item of result.items) {
            // A product can belong to more than one storefront; Merchant Center
            // rejects a feed with duplicate ids.
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            rendered.push(renderItem(item));
          }
        }
      }

      const note = skipped.length
        ? `\n  <!-- ${skipped.length} product(s) withheld: ${escapeXml(skipped.join('; '))} -->`
        : '';

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(BRAND)} — product feed</title>
    <link>${escapeXml(site)}</link>
    <description>Prepared food, pantry goods, and pop-up menu items from ${escapeXml(BRAND)} in Minneapolis–St. Paul.</description>${note}
${rendered.join('\n')}
  </channel>
</rss>`;

      if (skipped.length) logger?.warn({ skipped }, 'google merchant feed: products withheld');

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
      return res.end(xml);
    } catch (err) {
      logger?.error({ err }, 'google merchant feed failed');
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      return res.end('Failed to generate product feed');
    }
  });

  return router;
}

module.exports = {
  createProductFeedsRouter,
  FEED_STORES,
  itemsForProduct,
  renderItem,
};
