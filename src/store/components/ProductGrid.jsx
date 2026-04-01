/**
 * ProductGrid
 *
 * Flat product index. Each product is a large tile: image, SKU code, price.
 * Clicking a tile opens ProductDetail overlay.
 *
 * SKU codes follow the convention: two-letter store prefix + zero-padded
 * sequential number: LE-01, LE-02, … The prefix can be overridden via prop.
 *
 * Usage:
 *   <ProductGrid products={products} skuPrefix="LE" />
 */

import React, { useState } from 'react';
import ProductTile from './ProductTile';
import ProductDetail from './ProductDetail';
import { SITE_URL } from '../../config/siteMetadata';
import { ptToHtml } from '../data/ptToHtml';
import '../../styles/product-grid.css';

const padded = (n) => String(n).padStart(2, '0');
const getProductSummary = (product) => {
  const summary = (ptToHtml(product?.longDescriptionBlocks) || product?.longDescription || product?.shortDescription || '')
    .replace(/\s+/g, ' ')
    .trim();
  return summary.length > 220 ? `${summary.slice(0, 217).trim()}...` : summary;
};

export default function ProductGrid({ products = [], skuPrefix = 'LE', loading = false, basePath = '/sale' }) {
  const [selected, setSelected] = useState(null);

  const selectedSku = selected
    ? `${skuPrefix}-${padded(products.indexOf(selected) + 1)}`
    : null;

  return (
    <>
      {loading ? (
        <div className="le-grid-loading" aria-live="polite">Loading...</div>
      ) : products.length === 0 ? (
        <div className="le-grid-empty">No products available.</div>
      ) : (
        <ul className="le-grid" aria-label="Products">
          {products.map((product, i) => {
            const sku = `${skuPrefix}-${padded(i + 1)}`;
            const availability = product.inventoryManaged && (product.inventory ?? 0) <= 0
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock';
            const summary = getProductSummary(product);
            const anchorId = product.slug || product.id;
            return (
              <li
                key={product.id}
                id={anchorId}
                className="le-grid-item"
                itemScope
                itemType="https://schema.org/Product"
              >
                <meta itemProp="name" content={product.title} />
                {product.images?.[0] && <meta itemProp="image" content={product.images[0]} />}
                {summary && <meta itemProp="description" content={summary} />}
                <meta itemProp="sku" content={sku} />
                <meta itemProp="url" content={`${SITE_URL}${basePath}#${anchorId}`} />
                <div itemProp="brand" itemScope itemType="https://schema.org/Brand">
                  <meta itemProp="name" content="Local Effort Food Co." />
                </div>
                <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
                  <meta itemProp="priceCurrency" content="USD" />
                  <meta itemProp="price" content={((product.salePrice ?? product.price) / 100).toFixed(2)} />
                  <meta itemProp="availability" content={availability} />
                  <meta itemProp="url" content={`${SITE_URL}${basePath}#${anchorId}`} />
                </div>
                <ProductTile
                  product={product}
                  sku={sku}
                  onSelect={setSelected}
                />
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <ProductDetail
          product={selected}
          sku={selectedSku}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
