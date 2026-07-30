/**
 * ProductDetail
 *
 * Full-screen overlay for a single product. Opened from ProductTile click.
 * Layout: left = large image carousel, right = variant picker + add-to-bag.
 * No lifestyle copy on entry — just the object and the action.
 *
 * On mobile: stacked, image first, then details.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PortableText } from '@portabletext/react';
import { portableTextComponents } from '../../utils/portableTextComponents';
import { buildCartKey, useCart } from '../cart/CartContext';
import { useToast } from '../../components/common/ToastProvider';
import { ptToHtml } from '../data/ptToHtml';

const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;

export default function ProductDetail({ product, sku, onClose }) {
  const { add, map, updateQty, openCart } = useCart();
  const { notify } = useToast();
  const [imgIdx, setImgIdx] = useState(0);
  const [variantIdx, setVariantIdx] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState({});
  const [isDairyFree, setIsDairyFree] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const overlayRef = useRef(null);
  const closeBtnRef = useRef(null);
  const prevFocusRef = useRef(null);

  const images = useMemo(() => {
    return (Array.isArray(product.images) ? product.images : []).filter(Boolean);
  }, [product.images]);

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const hasAddOns = Array.isArray(product.addOns) && product.addOns.length > 0;
  const chosen = hasVariants
    ? product.variants[Math.max(0, Math.min(variantIdx, product.variants.length - 1))]
    : null;

  // Initialize default add-ons
  useEffect(() => {
    if (hasAddOns) {
      const defaults = {};
      product.addOns.forEach((addon, i) => { if (addon.defaultSelected) defaults[i] = true; });
      setSelectedAddOns(defaults);
    }
  }, [hasAddOns, product.addOns]);

  const basePrice = chosen?.price ?? (product.salePrice ?? product.price);
  const addOnTotal = hasAddOns
    ? Object.keys(selectedAddOns).reduce(
        (s, i) => s + (selectedAddOns[i] ? (product.addOns[i]?.additionalCost || 0) : 0),
        0,
      )
    : 0;
  const dairyFreeExtra = isDairyFree && product.offerDairyFree ? (product.dairyFreeCost || 0) : 0;
  const unitPrice = basePrice + addOnTotal + dairyFreeExtra;
  const unitPriceLabel = product.priceDisplay && addOnTotal === 0 && dairyFreeExtra === 0
    ? product.priceDisplay
    : fmt(unitPrice);

  const variationId = chosen?.squareVariationId || product.squareVariationId || null;
  const selectedAddOnIndices = useMemo(
    () => Object.keys(selectedAddOns).filter((k) => selectedAddOns[k]).map(Number),
    [selectedAddOns]
  );
  const optionSummary = useMemo(() => {
    const labels = [];
    if (chosen?.name) labels.push(chosen.name);
    selectedAddOnIndices.forEach((idx) => {
      const name = product.addOns?.[idx]?.name;
      if (name) labels.push(name);
    });
    if (isDairyFree && product.offerDairyFree) labels.push('Dairy-free');
    return labels.join(', ');
  }, [chosen, selectedAddOnIndices, product.addOns, isDairyFree, product.offerDairyFree]);
  const cartKey = buildCartKey(product.id, variationId, selectedAddOnIndices, isDairyFree, selectedDate);
  const inCartQty = map?.[cartKey]?.qty || 0;
  const isOutOfStock = product.inventoryManaged && (product.inventory ?? 0) <= inCartQty;
  const leadText = useMemo(() => {
    const text = (ptToHtml(product?.longDescriptionBlocks) || product?.longDescription || product?.shortDescription || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return '';
    return text.length > 220 ? `${text.slice(0, 217).trim()}...` : text;
  }, [product]);
  const handleAdd = useCallback(() => {
    if (isOutOfStock || (product.requiresDateSelection && !selectedDate)) return;
    add({
      productId: product.id,
      variationId,
      unitPrice,
      qty: 1,
      title: product.title,
      image: images[0] || null,
      addOnIndices: selectedAddOnIndices,
      dairyFree: isDairyFree,
      optionSummary,
      allowsDelivery: product.allowsDelivery !== false,
      selectedDate,
    });
    notify(`${product.title} added`, {
      actionLabel: 'View bag',
      onAction: () => { onClose(); openCart(); },
    });
  }, [isOutOfStock, add, product, variationId, unitPrice, images, selectedAddOnIndices, isDairyFree, optionSummary, selectedDate, notify, onClose, openCart]);

  // Focus trap + Escape
  useEffect(() => {
    prevFocusRef.current = document.activeElement;
    if (closeBtnRef.current) closeBtnRef.current.focus();

    const handleKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key === 'Tab' && overlayRef.current) {
        const focusable = Array.from(
          overlayRef.current.querySelectorAll(
            'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      prevFocusRef.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="le-detail-overlay" aria-hidden="false">
      {/* Backdrop */}
      <div className="le-detail-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        className="le-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-label={product.title}
        ref={overlayRef}
      >
        {/* Close */}
        <button
          ref={closeBtnRef}
          type="button"
          className="le-detail-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="le-detail-body">
          {/* Images */}
          <div className="le-detail-images">
            <div className="le-detail-main-img-wrap">
              {images[imgIdx] ? (
                <img
                  src={images[imgIdx]}
                  alt={product.title}
                  className="le-detail-main-img"
                />
              ) : (
                <div className="le-detail-img-placeholder" />
              )}
            </div>
            {images.length > 1 && (
              <div className="le-detail-thumbs" role="list" aria-label="Product images">
                {images.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`le-detail-thumb${i === imgIdx ? ' is-active' : ''}`}
                    onClick={() => setImgIdx(i)}
                    aria-label={`Image ${i + 1}`}
                    aria-current={i === imgIdx ? 'true' : undefined}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info + purchase */}
          <div className="le-detail-info">
            <div className="le-detail-sku">{sku}</div>
            <h2 className="le-detail-title">{product.title}</h2>

            <div className="le-detail-price">
              {product.salePrice && (
                <>
                  <span className="sr-only">Original price: </span>
                  <span className="le-detail-price-original">{fmt(product.price)}</span>
                </>
              )}
              <span className="sr-only">{product.salePrice ? 'Sale price: ' : 'Price: '}</span>
              <span className="le-detail-price-current">{unitPriceLabel}</span>
            </div>

            {leadText && <p className="le-detail-lead">{leadText}</p>}
            {product.allowsDelivery === false && (
              <p className="le-pickup-only">Pickup only — this item is not eligible for delivery.</p>
            )}
            {product.requiresDateSelection && (
              <label className="le-detail-date">
                <span className="le-detail-section-label">Select a date</span>
                <input
                  type="date"
                  min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)}
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  required
                />
                <small>Choose any date from today onward.</small>
              </label>
            )}

            {/* "Availability" and "Fulfillment" fact boxes removed — fulfillment
                is chosen at checkout and stock is conveyed by the add-to-bag
                state, so these were redundant design artifacts. */}

            {/* Variant selector */}
            {hasVariants && (
              <div className="le-detail-section">
                <div className="le-detail-section-label">Option</div>
                <div className="le-detail-pills">
                  {product.variants.map((v, i) => (
                    <button
                      key={v.squareVariationId || v.name || i}
                      type="button"
                      className={`le-detail-pill${variantIdx === i ? ' is-selected' : ''}`}
                      onClick={() => setVariantIdx(i)}
                      aria-pressed={variantIdx === i}
                    >
                      {v.name || `Option ${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add-ons */}
            {hasAddOns && (
              <div className="le-detail-section">
                <div className="le-detail-section-label">Customize</div>
                <div className="le-detail-addons">
                  {product.addOns.map((addon, i) => (
                    <label key={i} className="le-detail-addon-row">
                      <input
                        type="checkbox"
                        checked={selectedAddOns[i] || false}
                        onChange={(e) =>
                          setSelectedAddOns((prev) => ({ ...prev, [i]: e.target.checked }))
                        }
                      />
                      <span className="le-detail-addon-name">{addon.name}</span>
                      <span className="le-detail-addon-cost">
                        {addon.additionalCost > 0 ? `+${fmt(addon.additionalCost)}` : 'incl.'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Dairy-free */}
            {product.offerDairyFree && (
              <div className="le-detail-section">
                <label className="le-detail-addon-row">
                  <input
                    type="checkbox"
                    checked={isDairyFree}
                    onChange={(e) => setIsDairyFree(e.target.checked)}
                  />
                  <span className="le-detail-addon-name">Dairy-free</span>
                  <span className="le-detail-addon-cost">
                    {product.dairyFreeCost > 0 ? `+${fmt(product.dairyFreeCost)}` : 'same price'}
                  </span>
                </label>
              </div>
            )}

            {/* Cart qty controls if already in bag */}
            {inCartQty > 0 && (
              <div className="le-detail-qty-row">
                <button
                  type="button"
                  className="le-detail-qty-btn"
                  onClick={() => updateQty(cartKey, Math.max(0, inCartQty - 1))}
                  aria-label="Decrease"
                >
                  −
                </button>
                <span className="le-detail-qty-count">{inCartQty} in bag</span>
                <button
                  type="button"
                  className="le-detail-qty-btn"
                  onClick={() => updateQty(cartKey, inCartQty + 1)}
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            )}

            {/* Add to bag */}
            <button
              type="button"
              className="le-detail-add-btn"
              onClick={handleAdd}
              disabled={isOutOfStock || (product.requiresDateSelection && !selectedDate)}
              aria-disabled={isOutOfStock || (product.requiresDateSelection && !selectedDate)}
            >
              {isOutOfStock
                ? 'Out of stock'
                : product.requiresDateSelection && !selectedDate
                  ? 'Select a date'
                  : inCartQty > 0
                    ? 'Add one more'
                    : 'Add to bag'}
            </button>

            {/* Description — below the fold intentionally */}
            {(Array.isArray(product.longDescriptionBlocks) && product.longDescriptionBlocks.length > 0) ? (
              <div className="le-detail-description">
                <div className="le-detail-section-label">More details</div>
                <PortableText value={product.longDescriptionBlocks} components={portableTextComponents} />
              </div>
            ) : product.longDescription ? (
              <div className="le-detail-description">
                <div className="le-detail-section-label">More details</div>
                <p>{product.longDescription}</p>
              </div>
            ) : product.shortDescription ? (
              <div className="le-detail-description">
                <div className="le-detail-section-label">More details</div>
                <p>{product.shortDescription}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
