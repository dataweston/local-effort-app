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
import '../../styles/product-grid.css';

const padded = (n) => String(n).padStart(2, '0');

export default function ProductGrid({ products = [], skuPrefix = 'LE', loading = false }) {
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
            return (
              <li key={product.id} className="le-grid-item">
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
