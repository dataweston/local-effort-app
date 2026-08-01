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

import React, { useMemo, useRef } from 'react';
import { useCart } from '../cart/CartContext';

const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;

export default function ProductTile({ product, sku, onSelect, showSku = true, showDetailRow = true }) {
  const { map } = useCart();
  const imgRef = useRef(null);

  const primary = Array.isArray(product.images) ? product.images[0] : null;
  const displayPrice = product.salePrice ?? product.price;
  // A product priced entirely through its variants carries 0 on the parent, so
  // the tile was advertising $0.00 (Chez Garage's Frozen Pizzas). Fall back to
  // the cheapest variant. An explicit Sanity priceDisplay still wins.
  const variantFloor = useMemo(() => {
    const prices = (product.variants || [])
      .map((variant) => variant?.price)
      .filter((price) => typeof price === 'number' && price > 0);
    return prices.length ? Math.min(...prices) : null;
  }, [product]);
  const displayPriceLabel = product.priceDisplay
    || (!displayPrice && variantFloor ? `From ${fmt(variantFloor)}` : fmt(displayPrice));
  // Previews use the short description only; the long description is reserved
  // for the detail overlay so it never appears twice.
  const summary = useMemo(() => {
    const text = String(product?.shortDescription || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return text.length > 150 ? `${text.slice(0, 147).trim()}...` : text;
  }, [product]);
  // Availability label: show the real count when inventory is tracked,
  // otherwise stay quiet rather than inventing copy.
  const detailBits = useMemo(() => {
    if (product.inventoryManaged && typeof product.inventory === 'number') {
      return product.inventory > 0 ? `${product.inventory} available` : 'Sold out';
    }
    return '';
  }, [product]);

  // Check if anything from this product is in the cart
  const inCart = Object.keys(map || {}).some((k) => k === product.id || k.startsWith(`${product.id}:`));

  return (
    <button
      type="button"
      className="le-tile"
      onClick={() => onSelect(product)}
      aria-label={`View ${product.title}`}
    >
      <span className="le-tile-image-wrap">
        {primary ? (
          <img
            ref={imgRef}
            src={primary}
            alt={product.title}
            loading="lazy"
            className="le-tile-image"
          />
        ) : (
          <span className="le-tile-image-placeholder" aria-hidden="true" />
        )}
        {inCart && <span className="le-tile-in-cart" aria-label="In bag" />}
        {product.salePrice && <span className="le-tile-badge">Sale</span>}
        {primary && <span className="le-tile-expand" aria-hidden="true">⤢</span>}
      </span>
      <span className="le-tile-meta">
        {showSku ? <span className="le-tile-sku">{sku}</span> : <span />}
        <span className="le-tile-price">
          {product.salePrice && (
            <>
              <span className="sr-only">Original price: </span>
              <span className="le-tile-price-original">{fmt(product.price)}</span>
              <span className="sr-only">Sale price: </span>
            </>
          )}
          {displayPriceLabel}
        </span>
      </span>
      <span className="le-tile-copy">
        <span className="le-tile-title">{product.title}</span>
        {product.allowsDelivery === false && (
          <span className="le-pickup-only">Pickup only — not eligible for delivery</span>
        )}
        {summary && <span className="le-tile-description">{summary}</span>}
        {showDetailRow ? (
          <span className="le-tile-detail-row">
            <span className="le-tile-detail-text">{detailBits}</span>
            <span className="le-tile-detail-link">View details</span>
          </span>
        ) : null}
        {/* detailBits intentionally empty when inventory is untracked */}
      </span>
    </button>
  );
}
