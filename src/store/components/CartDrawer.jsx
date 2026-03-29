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
import CheckoutPanel from './CheckoutPanel';
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
  const drawerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const prevFocusRef = useRef(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // Displayed subtotal: server value if available, else local estimate
  const displaySubtotal = serverSubtotal ?? subtotal;
  const isServerConfirmed = serverSubtotal !== null && !pricingError;

  // Track cart open
  useEffect(() => {
    if (open) trackEvent('cart.opened', { store });
  }, [open, store]);

  // Focus trap + Escape
  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement;
    if (closeBtnRef.current) closeBtnRef.current.focus();

    const handleKey = (e) => {
      if (e.key === 'Escape') { closeCart(); return; }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = Array.from(
          drawerRef.current.querySelectorAll(
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
  }, [open, closeCart]);

  // Trap scroll when open; reset confirm and checkout state on close
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setConfirmClear(false);
      setCheckingOut(false);
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleCheckout = useCallback(() => {
    trackEvent('checkout.started', { store, itemCount: items.length });
    setCheckingOut(true);
  }, [store, items.length]);

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
        aria-label={checkingOut ? 'Checkout' : 'Your cart'}
        ref={drawerRef}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Checkout panel — slides in when user clicks Checkout */}
        {checkingOut ? (
          <CheckoutPanel
            store={store}
            onBack={() => setCheckingOut(false)}
          />
        ) : (
          <>
            {/* Bag header */}
            <div className="le-cart-header">
              <span className="le-cart-heading">Bag</span>
              <button
                ref={closeBtnRef}
                type="button"
                className="le-cart-close"
                onClick={closeCart}
                aria-label="Close cart"
              >
                ✕
              </button>
            </div>

            {/* Bag body */}
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

            {/* Bag footer */}
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
                {confirmClear ? (
                  <div className="le-cart-confirm-row">
                    <span className="le-cart-confirm-label">Clear bag?</span>
                    <button
                      type="button"
                      className="le-cart-clear"
                      onClick={() => { clear(); setConfirmClear(false); }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className="le-cart-clear"
                      onClick={() => setConfirmClear(false)}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="le-cart-clear"
                    onClick={() => setConfirmClear(true)}
                  >
                    Clear bag
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
