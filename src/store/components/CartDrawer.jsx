/**
 * CartDrawer
 *
 * Minimal slide-in cart. Design principles (Yeezy / Shopify-grade):
 *  - No upsells, no promotional banners, no cross-sells
 *  - Subtotal sourced from server (via /api/store/price) — never computed in React
 *  - Line items: thumbnail + SKU/title + qty controls + line price
 *  - Single CTA: "Checkout" → navigates to /checkout
 *  - Falls back gracefully if pricing API is unavailable (shows local estimate)
 *
 * Usage: drop <CartDrawer store="sale" /> anywhere inside <CartProvider>.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '../cart/CartContext';
import { trackEvent } from '../../lib/trackEvent';
import '../../styles/cart-drawer.css';

const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;

// Debounced server pricing — fires 400ms after the last cart mutation.
const usePricedSubtotal = (items) => {
  const [serverSubtotal, setServerSubtotal] = useState(null);
  const [pricingError, setPricingError] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!items.length) {
      setServerSubtotal(null);
      setPricingError(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const payload = {
          items: items.map((i) => ({
            productId: i.productId,
            variationId: i.variationId || null,
            qty: i.qty,
            addOnIndices: i.addOnIndices || [],
            dairyFree: i.dairyFree || false,
          })),
        };
        const res = await fetch('/api/store/price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('pricing failed');
        const data = await res.json();
        setServerSubtotal(data.subtotal ?? null);
        setPricingError(false);
      } catch (_) {
        setPricingError(true);
      }
    }, 400);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [items]);

  return { serverSubtotal, pricingError };
};

export default function CartDrawer({ store = 'sale' }) {
  const { items, subtotal, open, closeCart, clear, remove, updateQty } = useCart();
  const { serverSubtotal, pricingError } = usePricedSubtotal(items);

  // Displayed subtotal: server value if available, else local estimate
  const displaySubtotal = serverSubtotal ?? subtotal;
  const isServerConfirmed = serverSubtotal !== null && !pricingError;

  // Track cart open
  useEffect(() => {
    if (open) trackEvent('cart.opened', { store });
  }, [open, store]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (e.key === 'Escape') closeCart(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, closeCart]);

  // Trap scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleCheckout = useCallback(() => {
    trackEvent('checkout.started', { store, itemCount: items.length });
    closeCart();
    window.location.href = `/checkout?store=${store}`;
  }, [closeCart, store, items.length]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="le-cart-backdrop"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="le-cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
      >
        {/* Header */}
        <div className="le-cart-header">
          <span className="le-cart-heading">Bag</span>
          <button
            type="button"
            className="le-cart-close"
            onClick={closeCart}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="le-cart-body">
          {items.length === 0 ? (
            <p className="le-cart-empty">Your bag is empty.</p>
          ) : (
            <ul className="le-cart-lines" aria-label="Cart items">
              {items.map((item) => (
                <li key={item.key} className="le-cart-line">
                  {item.image && (
                    <img
                      src={item.image}
                      alt=""
                      aria-hidden="true"
                      className="le-cart-line-img"
                    />
                  )}
                  <div className="le-cart-line-info">
                    <div className="le-cart-line-title">{item.title}</div>
                    <div className="le-cart-line-price">{fmt(item.unitPrice)}</div>
                    <div className="le-cart-line-controls">
                      <button
                        type="button"
                        className="le-cart-qty-btn"
                        onClick={() => updateQty(item.key, Math.max(0, item.qty - 1))}
                        aria-label={`Decrease quantity of ${item.title}`}
                      >
                        −
                      </button>
                      <span className="le-cart-qty-count" aria-live="polite">{item.qty}</span>
                      <button
                        type="button"
                        className="le-cart-qty-btn"
                        onClick={() => updateQty(item.key, item.qty + 1)}
                        aria-label={`Increase quantity of ${item.title}`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="le-cart-remove"
                        onClick={() => remove(item.key)}
                        aria-label={`Remove ${item.title}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="le-cart-line-total">
                    {fmt(item.unitPrice * item.qty)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="le-cart-footer">
            <div className="le-cart-subtotal">
              <span className="le-cart-subtotal-label">
                Subtotal{isServerConfirmed ? '' : ' (est.)'}
              </span>
              <span className="le-cart-subtotal-value">{fmt(displaySubtotal)}</span>
            </div>
            {pricingError && (
              <p className="le-cart-pricing-note">
                Prices are estimated. Final total confirmed at checkout.
              </p>
            )}
            <p className="le-cart-tax-note">Tax and fulfillment calculated at checkout.</p>
            <button
              type="button"
              className="le-cart-checkout-btn"
              onClick={handleCheckout}
            >
              Checkout
            </button>
            <button
              type="button"
              className="le-cart-clear"
              onClick={() => {
                if (window.confirm('Clear your bag?')) clear();
              }}
            >
              Clear bag
            </button>
          </div>
        )}
      </div>
    </>
  );
}
