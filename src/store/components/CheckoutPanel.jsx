import React, { useState } from 'react';
import { useCart } from '../cart/CartContext';
import '../../styles/le-checkout.css';

const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;

export default function CheckoutPanel({ store = 'sale', onBack }) {
  const { items, subtotal, open, closeCart, clear } = useCart();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pickup, setPickup] = useState(true);
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: '', postal: '' });
  const [orderResult, setOrderResult] = useState(null); // { name, email, pickup }
  const cardRef = React.useRef(null);
  const cardElRef = React.useRef(null);

  // Load Square Web Payments SDK once panel opens with items
  React.useEffect(() => {
    const appId = import.meta?.env?.VITE_SQUARE_APP_ID || window?.__SQUARE_APP_ID__;
    const locationId = import.meta?.env?.VITE_SQUARE_LOCATION_ID || window?.__SQUARE_LOCATION_ID__;
    if (!open) return;
    if (!items || items.length === 0) return;
    setError('');
    if (!appId || !locationId) {
      setError('Square not configured');
      return;
    }
    let canceled = false;
    (async () => {
      try {
        if (!document.getElementById('sq-wpsdk')) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.id = 'sq-wpsdk';
            s.src = 'https://web.squarecdn.com/v1/square.js';
            s.onload = resolve;
            s.onerror = () => reject(new Error('Square SDK failed'));
            document.head.appendChild(s);
          });
        }
        if (canceled) return;
        const ensureSquare = () => new Promise((resolve, reject) => {
          let tries = 0;
          const t = setInterval(() => {
            tries++;
            if (window.Square && typeof window.Square.payments === 'function') {
              clearInterval(t); resolve();
            } else if (tries > 50) {
              clearInterval(t); reject(new Error('Square SDK not ready'));
            }
          }, 100);
        });
        await ensureSquare();
        const p = window.Square ? window.Square.payments(appId, locationId) : null;
        if (!p) throw new Error('Square payments unavailable');
        if (cardRef.current && typeof cardRef.current.destroy === 'function') {
          try { cardRef.current.destroy(); } catch (e) { /* ignore */ }
          cardRef.current = null;
        }
        const card = await p.card();
        cardRef.current = card;
        if (cardElRef.current) {
          await card.attach('#sq-card');
        }
      } catch (e) {
        if (!canceled) setError(e?.message ? `Payment form failed: ${e.message}` : 'Payment form failed to load');
      }
    })();
    return () => { canceled = true; };
  }, [open, items]);

  React.useEffect(() => {
    if (!open && cardRef.current && typeof cardRef.current.destroy === 'function') {
      try { cardRef.current.destroy(); } catch (e) { /* ignore */ }
      cardRef.current = null;
    }
    if (!open) {
      // Reset form state when drawer closes
      setOrderResult(null);
      setError('');
      setName('');
      setEmail('');
      setPhone('');
      setPickup(true);
      setAddress({ line1: '', line2: '', city: '', state: '', postal: '' });
    }
  }, [open]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');
    try {
      let token = null;
      if (cardRef.current) {
        const result = await cardRef.current.tokenize();
        if (result.status !== 'OK') {
          const msg = (result?.errors && result.errors[0]?.message) || result?.status || 'Card details invalid';
          throw new Error(msg);
        }
        token = result.token;
      }
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name, email, phone },
          pickup,
          address: pickup ? null : address,
          items: items.map((i) => ({
            productId: i.productId,
            variationId: i.variationId,
            qty: i.qty,
            unitPrice: i.unitPrice,
            title: i.title,
          })),
          token,
          store,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      setOrderResult({ name, email, pickup });
      clear();
    } catch (e) {
      setError(e.message || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;

  // Success state — replaces form
  if (orderResult) {
    return (
      <>
        <div className="le-checkout-drawer-header">
          <span className="le-checkout-drawer-title">Order confirmed</span>
          <button
            type="button"
            className="le-cart-close"
            onClick={closeCart}
            aria-label="Close"
          >✕</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div className="le-checkout-success">
            <div className="le-checkout-success-title">Order placed</div>
            <p className="le-checkout-success-copy">
              Thanks{orderResult.name ? `, ${orderResult.name.split(' ')[0]}` : ''}. A confirmation email is on the way to {orderResult.email}.
            </p>
            <p className="le-checkout-success-copy" style={{ marginTop: '0.5rem' }}>
              {orderResult.pickup
                ? "We\u2019ll be in touch with pickup details."
                : "We\u2019ll be in touch with delivery details."}
            </p>
          </div>
          <button
            type="button"
            className="le-checkout-submit"
            onClick={closeCart}
          >
            Continue shopping
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="le-checkout-drawer-header">
        {onBack ? (
          <button type="button" className="le-checkout-drawer-back" onClick={onBack}>
            ← Bag
          </button>
        ) : (
          <span className="le-checkout-drawer-title">Checkout</span>
        )}
        <button
          type="button"
          className="le-cart-close"
          onClick={closeCart}
          aria-label="Close"
        >✕</button>
      </div>

      {items.length === 0 ? (
        <p className="le-cart-empty" style={{ padding: '2rem 1.5rem' }}>Your bag is empty.</p>
      ) : (
        <div className="le-checkout-drawer" style={{ overflowY: 'auto', flex: '1 1 0' }}>

          {/* Order summary */}
          <div className="le-checkout-section" style={{ paddingTop: 0 }}>
            <div className="le-checkout-section-title">Your order</div>
            {items.map((item) => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: '#111' }}>
                  {item.title}
                  {item.qty > 1 && (
                    <span style={{ fontFamily: 'ui-monospace, SF Mono, monospace', color: '#6b655d', marginLeft: '0.4rem' }}>
                      ×{item.qty}
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: '0.8125rem', color: '#111', whiteSpace: 'nowrap' }}>
                  {fmt(item.unitPrice * item.qty)}
                </span>
              </div>
            ))}
            <div className="le-checkout-summary" style={{ marginTop: '0.5rem' }}>
              <span className="le-checkout-summary-label">Subtotal</span>
              <span className="le-checkout-summary-value">{fmt(subtotal)}</span>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#6b655d', margin: '0.25rem 0 0', fontFamily: 'ui-monospace, SF Mono, monospace' }}>
              Tax and fulfillment calculated at checkout.
            </p>
          </div>

          <form onSubmit={onSubmit} className="le-checkout-form">

            {/* Contact */}
            <div className="le-checkout-section">
              <div className="le-checkout-section-title">Contact</div>
              <div className="le-checkout-field">
                <label className="le-checkout-label" htmlFor="co-name">Name</label>
                <input
                  id="co-name"
                  className="le-checkout-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="le-checkout-field">
                <label className="le-checkout-label" htmlFor="co-email">Email</label>
                <input
                  id="co-email"
                  type="email"
                  className="le-checkout-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="le-checkout-field">
                <label className="le-checkout-label" htmlFor="co-phone">Phone</label>
                <input
                  id="co-phone"
                  type="tel"
                  className="le-checkout-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Fulfillment */}
            <div className="le-checkout-section">
              <div className="le-checkout-section-title">Fulfillment</div>
              <div className="le-checkout-pickup-selector" role="group" aria-label="Fulfillment method">
                <button
                  type="button"
                  className={`le-checkout-pickup-pill${pickup ? ' is-selected' : ''}`}
                  onClick={() => setPickup(true)}
                  aria-pressed={pickup}
                >
                  Pickup
                </button>
                <button
                  type="button"
                  className={`le-checkout-pickup-pill${!pickup ? ' is-selected' : ''}`}
                  onClick={() => setPickup(false)}
                  aria-pressed={!pickup}
                >
                  Local delivery
                </button>
              </div>

              {!pickup && (
                <>
                  <div className="le-checkout-field">
                    <label className="le-checkout-label" htmlFor="addr1">Street address</label>
                    <input
                      id="addr1"
                      className="le-checkout-input"
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      autoComplete="address-line1"
                      required
                    />
                  </div>
                  <div className="le-checkout-field">
                    <label className="le-checkout-label" htmlFor="addr2">Unit / suite <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input
                      id="addr2"
                      className="le-checkout-input"
                      value={address.line2}
                      onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                      autoComplete="address-line2"
                    />
                  </div>
                  <div className="le-checkout-field-row">
                    <div className="le-checkout-field">
                      <label className="le-checkout-label" htmlFor="co-city">City</label>
                      <input
                        id="co-city"
                        className="le-checkout-input"
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        autoComplete="address-level2"
                        required
                      />
                    </div>
                    <div className="le-checkout-field">
                      <label className="le-checkout-label" htmlFor="co-state">State</label>
                      <input
                        id="co-state"
                        className="le-checkout-input"
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        autoComplete="address-level1"
                        required
                      />
                    </div>
                  </div>
                  <div className="le-checkout-field">
                    <label className="le-checkout-label" htmlFor="co-zip">ZIP</label>
                    <input
                      id="co-zip"
                      className="le-checkout-input"
                      value={address.postal}
                      onChange={(e) => setAddress({ ...address, postal: e.target.value })}
                      autoComplete="postal-code"
                      required
                    />
                  </div>
                </>
              )}
            </div>

            {/* Payment */}
            <div className="le-checkout-section">
              <div className="le-checkout-section-title">Payment</div>
              <div className="le-checkout-payment">
                <div className="le-checkout-card-container">
                  <div id="sq-card" ref={cardElRef} />
                </div>
                <div className="le-checkout-trust">
                  <svg className="le-checkout-trust-icon" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                    <rect x="1" y="5" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M4 5V4a2 2 0 0 1 4 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  Secured by Square
                  <span className="le-checkout-trust-sep">·</span>
                  Visa, MC, Amex, Discover
                </div>
              </div>
            </div>

            {error && <div className="le-checkout-error">{error}</div>}

            <button
              type="submit"
              className="le-checkout-submit"
              disabled={processing}
            >
              {processing ? 'Processing…' : `Pay ${fmt(subtotal)}`}
            </button>

            <p className="le-checkout-footnote">
              A confirmation email will be sent after purchase.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
