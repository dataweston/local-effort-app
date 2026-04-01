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
import { ptToHtml } from '../data/ptToHtml';

const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;

export default function ProductTile({ product, sku, onSelect, showSku = true, showDetailRow = true }) {
  const { map } = useCart();
  const imgRef = useRef(null);

  const primary = Array.isArray(product.images) ? product.images[0] : null;
  const displayPrice = product.salePrice ?? product.price;
  const displayPriceLabel = product.priceDisplay || fmt(displayPrice);
  const summary = useMemo(() => {
    const text = (ptToHtml(product?.longDescriptionBlocks) || product?.longDescription || product?.shortDescription || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return '';
    return text.length > 150 ? `${text.slice(0, 147).trim()}...` : text;
  }, [product]);
  const detailBits = useMemo(() => {
    const bits = [];
    if (product.inventoryManaged && typeof product.inventory === 'number') {
      bits.push(product.inventory > 0 ? `${product.inventory} left` : 'Sold out');
    } else {
      bits.push('Limited drop');
    }
    if (Array.isArray(product.addOns) && product.addOns.length > 0) {
      bits.push(`${product.addOns.length} add-on${product.addOns.length === 1 ? '' : 's'}`);
    } else if (Array.isArray(product.variants) && product.variants.length > 0) {
      bits.push(`${product.variants.length} option${product.variants.length === 1 ? '' : 's'}`);
    } else {
      bits.push('Open for details');
    }
    return bits.join(' | ');
  }, [product]);

  // Check if anything from this product is in the cart
  const inCart = Object.keys(map || {}).some((k) => k.startsWith(product.id));

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
        {summary && <span className="le-tile-description">{summary}</span>}
        {showDetailRow ? (
          <span className="le-tile-detail-row">
            <span className="le-tile-detail-text">{detailBits}</span>
            <span className="le-tile-detail-link">View details</span>
          </span>
        ) : null}
      </span>
    </button>
  );
}
