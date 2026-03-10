/**
 * ProductTile
 *
 * Single product in the grid. Yeezy-grade: large image, SKU code, price.
 * Nothing else on the tile. Click opens ProductDetail overlay.
 *
 * SKU code convention: first two letters of the category prefix (derived from
 * the product title or a sku field if present) + sequential display index.
 * e.g. "LE-01", "LE-02" — passed as `sku` prop from ProductGrid.
 */

import React, { useRef } from 'react';
import { useCart } from '../cart/CartContext';

const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;

export default function ProductTile({ product, sku, onSelect }) {
  const { map } = useCart();
  const imgRef = useRef(null);

  const primary = Array.isArray(product.images) ? product.images[0] : null;
  const displayPrice = product.salePrice ?? product.price;

  // Check if anything from this product is in the cart
  const inCart = Object.keys(map || {}).some((k) => k.startsWith(product.id));

  return (
    <button
      type="button"
      className="le-tile"
      onClick={() => onSelect(product)}
      aria-label={`View ${product.title}`}
    >
      <div className="le-tile-image-wrap">
        {primary ? (
          <img
            ref={imgRef}
            src={primary}
            alt={product.title}
            loading="lazy"
            className="le-tile-image"
          />
        ) : (
          <div className="le-tile-image-placeholder" aria-hidden="true" />
        )}
        {inCart && <span className="le-tile-in-cart" aria-label="In bag" />}
      </div>
      <div className="le-tile-meta">
        <span className="le-tile-sku">{sku}</span>
        <span className="le-tile-price">
          {product.salePrice && (
            <span className="le-tile-price-original">{fmt(product.price)}</span>
          )}
          {fmt(displayPrice)}
        </span>
      </div>
    </button>
  );
}
