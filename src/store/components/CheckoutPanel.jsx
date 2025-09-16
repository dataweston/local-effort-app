import React, { useState } from 'react';
import { useCart } from '../cart/CartContext';

export default function CheckoutPanel() {
  const { items, subtotal, open, closeCart, clear } = useCart();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pickup, setPickup] = useState(true);
  // Square Web Payments SDK handles its own internal state; we keep refs only
  const cardRef = React.useRef(null);
  const cardElRef = React.useRef(null);

  // Load Square Web Payments SDK once panel opens
  React.useEffect(() => {
    const appId = import.meta?.env?.VITE_SQUARE_APP_ID || window?.__SQUARE_APP_ID__;
    const locationId = import.meta?.env?.VITE_SQUARE_LOCATION_ID || window?.__SQUARE_LOCATION_ID__;
    if (!open) return;
    if (!items || items.length === 0) return; // mount form only when there are items
    setError('');
    if (!appId || !locationId) {
      setError('Square not configured');
      return;
    }
    let canceled = false;
    (async () => {
      try {
        // Ensure SDK is loaded
        if (!document.getElementById('sq-wpsdk')) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.id = 'sq-wpsdk';
            s.src = 'https://web.squarecdn.com/v1/square.js';
            s.onload = resolve; s.onerror = () => reject(new Error('Square SDK failed'));
            document.head.appendChild(s);
          });
        }
        if (canceled) return;
        // Wait for global
        const ensureSquare = () => new Promise((resolve, reject) => {
          let tries = 0;
          const t = setInterval(() => {
            tries++;
            if (window.Square && typeof window.Square.payments === 'function') {
              clearInterval(t); resolve();
            } else if (tries > 50) { // ~5s
              clearInterval(t); reject(new Error('Square SDK not ready'));
            }
          }, 100);
        });
        await ensureSquare();
        const p = window.Square ? window.Square.payments(appId, locationId) : null;
        if (!p) throw new Error('Square payments unavailable');
        // Recreate card each time we open with items
        const card = await p.card();
        cardRef.current = card;
        if (cardElRef.current) {
          cardElRef.current.innerHTML = '';
          await card.mount(cardElRef.current);
        }
      } catch (e) {
        setError('Payment form failed to load');
      }
    })();
    return () => { canceled = true; };
  }, [open, items]);

  // Cleanup card when panel closes to avoid stale mounts
  React.useEffect(() => {
    if (!open && cardRef.current && typeof cardRef.current.destroy === 'function') {
      try { cardRef.current.destroy(); } catch (e) { /* ignore */ }
      cardRef.current = null;
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
        if (result.status !== 'OK') throw new Error('Card tokenize failed');
        token = result.token;
      }
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name, email },
          pickup,
          items: items.map(i => ({ productId: i.productId, variationId: i.variationId, qty: i.qty, unitPrice: i.unitPrice, title: i.title })),
          token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      clear();
      closeCart();
      alert('Order placed!');
    } catch (e) {
      setError(e.message || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50">
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl p-4 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold">Your Cart</h3>
          <button className="btn" onClick={closeCart}>Close</button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-neutral-600">Your cart is empty.</p>
        ) : (
          <>
            <ul className="divide-y">
              {items.map((i) => (
                <li key={i.key} className="py-2 flex items-center gap-3">
                  {i.image && <img src={i.image} alt="" className="w-12 h-12 object-cover rounded" />}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{i.title}</div>
                    <div className="text-xs text-neutral-600">Qty {i.qty} • ${(i.unitPrice/100).toFixed(2)}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t pt-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${(subtotal/100).toFixed(2)}</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">Tax calculated by Square.</p>
            </div>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label className="label" htmlFor="co-name">Name</label>
                <input id="co-name" className="input w-full" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label" htmlFor="co-email">Email</label>
                <input id="co-email" type="email" className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <input id="pickup" type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} />
                <label htmlFor="pickup">Pickup / local service</label>
              </div>
              {/* Square Card placeholder: we’ll render Web Payments SDK after backend is wired */}
              <div className="rounded-md border p-3 text-sm text-neutral-600">
                <div ref={cardElRef} className="min-h-[52px]" />
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
              <button type="submit" className="btn btn-primary w-full" disabled={processing}>{processing ? 'Processing…' : 'Checkout'}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
