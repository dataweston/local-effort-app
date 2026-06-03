import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSquareCard } from '../../hooks/useSquareCard';
import { useSquareExpressPay } from '../../hooks/useSquareExpressPay';
import { getOrCreateCheckoutAttemptId, clearCheckoutAttemptId } from '../../lib/checkoutAttemptId';
import { trackEvent } from '../../lib/trackEvent';
import { useCart } from '../cart/CartContext';
import '../../styles/le-checkout.css';

const fmt = (cents) => `$${((Number(cents) || 0) / 100).toFixed(2)}`;
const PROFILE_STORAGE_KEY = 'le:storeCheckoutProfile';

const blankAddress = { line1: '', line2: '', city: '', state: 'MN', postal: '' };
const blankProfile = {
  customer: { name: '', email: '', phone: '' },
  pickup: true,
  address: blankAddress,
  deliveryInstructions: '',
};

const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(0, 10);
const formatPhone = (value) => {
  const digits = normalizePhone(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const loadProfile = () => {
  if (typeof window === 'undefined') return blankProfile;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return blankProfile;
    const parsed = JSON.parse(raw);
    return {
      customer: {
        name: parsed?.customer?.name || '',
        email: parsed?.customer?.email || '',
        phone: formatPhone(parsed?.customer?.phone || ''),
      },
      pickup: parsed?.pickup !== false,
      address: { ...blankAddress, ...(parsed?.address || {}) },
      deliveryInstructions: parsed?.deliveryInstructions || '',
    };
  } catch (_) {
    return blankProfile;
  }
};

const buildCartPayload = (items) => items.map((item) => ({
  productId: item.productId,
  variationId: item.variationId || null,
  qty: item.qty,
  addOnIndices: item.addOnIndices || [],
  dairyFree: !!item.dairyFree,
  title: item.title,
}));

function useServerPricing(items, localSubtotal) {
  const [pricing, setPricing] = useState({
    loading: false,
    error: '',
    subtotal: null,
    lines: [],
    pricedAt: null,
  });

  const payloadKey = useMemo(() => JSON.stringify(buildCartPayload(items)), [items]);

  useEffect(() => {
    if (!items.length) {
      setPricing({ loading: false, error: '', subtotal: null, lines: [], pricedAt: null });
      return undefined;
    }

    const controller = new AbortController();
    setPricing((current) => ({ ...current, loading: true, error: '' }));

    fetch('/api/store/price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: buildCartPayload(items) }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Unable to confirm order total.');
        setPricing({
          loading: false,
          error: '',
          subtotal: Number.isInteger(data?.subtotal) ? data.subtotal : null,
          lines: Array.isArray(data?.lines) ? data.lines : [],
          pricedAt: data?.pricedAt || null,
        });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setPricing({
          loading: false,
          error: error?.message || 'Unable to confirm order total.',
          subtotal: null,
          lines: [],
          pricedAt: null,
        });
      });

    return () => controller.abort();
  }, [payloadKey, items]);

  return {
    ...pricing,
    subtotal: pricing.subtotal ?? localSubtotal,
    confirmed: pricing.subtotal !== null && !pricing.error,
  };
}

export default function CheckoutPanel({ store = 'sale', onBack }) {
  const { items, subtotal, open, closeCart, clear } = useCart();
  const loadedProfile = useMemo(loadProfile, []);
  const [customer, setCustomer] = useState(loadedProfile.customer);
  const [pickup, setPickup] = useState(loadedProfile.pickup);
  const [address, setAddress] = useState(loadedProfile.address);
  const [deliveryInstructions, setDeliveryInstructions] = useState(loadedProfile.deliveryInstructions);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const checkoutAttemptRef = useRef('');
  const attemptStorageKey = `le:checkoutAttempt:store:${store}`;

  const pricing = useServerPricing(items, subtotal);
  const amountCents = pricing.subtotal;
  const deliveryAvailable = useMemo(() => items.every((item) => !!item.allowsDelivery), [items]);
  const enabled = open && items.length > 0 && status !== 'success';
  const { cardLoaded, error: cardError, loadingScript, tokenize, verifyBuyer, reset } = useSquareCard(
    '#store-card-container',
    enabled,
    []
  );

  const updateCustomer = useCallback((patch) => {
    setCustomer((current) => ({ ...current, ...patch }));
    if (status !== 'idle') {
      setStatus('idle');
      setError('');
    }
  }, [status]);

  const updateAddress = useCallback((patch) => {
    setAddress((current) => ({ ...current, ...patch }));
    if (status !== 'idle') {
      setStatus('idle');
      setError('');
    }
  }, [status]);

  const resolveCheckoutAttemptId = useCallback(() => {
    if (checkoutAttemptRef.current) return checkoutAttemptRef.current;
    const next = getOrCreateCheckoutAttemptId(attemptStorageKey);
    checkoutAttemptRef.current = next;
    return next;
  }, [attemptStorageKey]);

  const clearCheckoutAttempt = useCallback(() => {
    checkoutAttemptRef.current = '';
    clearCheckoutAttemptId(attemptStorageKey);
  }, [attemptStorageKey]);

  const canSubmit = useCallback((requireCard = true) => {
    if (!items.length) return false;
    if (!customer.name.trim()) return false;
    if (!isValidEmail(customer.email)) return false;
    if (customer.phone && normalizePhone(customer.phone).length < 10) return false;
    if (!pickup) {
      if (!address.line1.trim() || !address.city.trim()) return false;
      if (!address.state.trim() || address.postal.trim().replace(/\D/g, '').length < 5) return false;
    }
    if (requireCard && !cardLoaded) return false;
    return true;
  }, [address, cardLoaded, customer, items.length, pickup]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
        customer,
        pickup,
        address,
        deliveryInstructions,
      }));
    } catch (_) {
      // Storage is a convenience only.
    }
  }, [address, customer, deliveryInstructions, pickup]);

  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setError('');
      setOrderResult(null);
      clearCheckoutAttempt();
      reset();
    }
  }, [clearCheckoutAttempt, open, reset]);

  useEffect(() => {
    if (!deliveryAvailable) setPickup(true);
  }, [deliveryAvailable]);

  const verificationDetails = useMemo(() => {
    const nameParts = customer.name.trim().split(/\s+/).filter(Boolean);
    return {
      amount: (amountCents / 100).toFixed(2),
      currencyCode: 'USD',
      intent: 'CHARGE',
      billingContact: {
        givenName: nameParts[0] || undefined,
        familyName: nameParts.slice(1).join(' ') || undefined,
        email: customer.email.trim() || undefined,
        phone: normalizePhone(customer.phone) || undefined,
        addressLines: pickup ? undefined : [address.line1, address.line2].filter(Boolean),
        city: pickup ? undefined : address.city || undefined,
        state: pickup ? undefined : address.state || undefined,
        postalCode: pickup ? undefined : address.postal || undefined,
        countryCode: 'US',
      },
    };
  }, [address, amountCents, customer, pickup]);

  const submitCheckout = useCallback(async ({ token, verificationToken, method }) => {
    const checkoutAttemptId = resolveCheckoutAttemptId();
    const response = await fetch('/api/store/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim(),
          phone: formatPhone(customer.phone),
        },
        pickup,
        address: pickup ? null : address,
        deliveryInstructions,
        items: buildCartPayload(items),
        token,
        verificationToken,
        checkoutAttemptId,
        store,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || 'Checkout failed.');
    trackEvent('order.placed', {
      store,
      method,
      sessionId: checkoutAttemptId,
      paymentId: data?.paymentId,
      amountCents: data?.amountCents || amountCents,
    });
    setOrderResult({
      name: customer.name.trim(),
      email: customer.email.trim(),
      pickup,
      amountCents: data?.amountCents || amountCents,
      paymentId: data?.paymentId || '',
    });
    clear();
    setStatus('success');
    clearCheckoutAttempt();
  }, [
    address,
    amountCents,
    clear,
    clearCheckoutAttempt,
    customer,
    deliveryInstructions,
    items,
    pickup,
    resolveCheckoutAttemptId,
    store,
  ]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (status === 'submitting') return;
    setError('');

    if (!canSubmit(true)) {
      setError('Please complete the required checkout fields before paying.');
      return;
    }

    setStatus('submitting');
    const checkoutAttemptId = resolveCheckoutAttemptId();
    trackEvent('payment.attempted', { store, sessionId: checkoutAttemptId, amountCents });

    try {
      const token = await tokenize();
      const verificationToken = await verifyBuyer(token, verificationDetails);
      await submitCheckout({ token, verificationToken, method: 'card' });
    } catch (err) {
      trackEvent('payment.failed', { store, reason: err?.message });
      setStatus('error');
      setError(err?.message || 'Unable to complete purchase.');
    }
  }, [
    amountCents,
    canSubmit,
    resolveCheckoutAttemptId,
    status,
    store,
    submitCheckout,
    tokenize,
    verificationDetails,
    verifyBuyer,
  ]);

  const handleExpressToken = useCallback(async (token) => {
    if (status === 'submitting') return;
    setError('');
    if (!canSubmit(false)) {
      setError('Add your contact and fulfillment details before using express pay.');
      return;
    }

    setStatus('submitting');
    try {
      trackEvent('express_pay.used', { store, amountCents });
      await submitCheckout({ token, verificationToken: undefined, method: 'express' });
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Unable to complete purchase.');
    }
  }, [amountCents, canSubmit, status, store, submitCheckout]);

  const { googlePayAvailable, applePayAvailable, error: expressError } = useSquareExpressPay({
    amountCents,
    containerId: '#store-express-pay',
    enabled,
    onToken: handleExpressToken,
  });
  const expressPayAvailable = googlePayAvailable || applePayAvailable;

  useEffect(() => {
    if (expressPayAvailable) trackEvent('express_pay.shown', { store });
  }, [expressPayAvailable, store]);

  if (!open) return null;

  if (orderResult) {
    return (
      <>
        <div className="le-checkout-drawer-header">
          <span className="le-checkout-drawer-title">Order confirmed</span>
          <button type="button" className="le-cart-close" onClick={closeCart} aria-label="Close">x</button>
        </div>
        <div className="le-checkout-drawer" style={{ overflowY: 'auto', flex: '1 1 0' }}>
          <div className="le-checkout-success">
            <div className="le-checkout-success-title">Order placed</div>
            <p className="le-checkout-success-copy">
              Thanks{orderResult.name ? `, ${orderResult.name.split(' ')[0]}` : ''}. A confirmation email is on the way to {orderResult.email}.
            </p>
            <p className="le-checkout-success-copy">
              {orderResult.pickup
                ? 'Pickup details will be sent separately.'
                : 'Delivery details will be sent separately.'}
            </p>
            <div className="le-checkout-success-meta">
              {fmt(orderResult.amountCents)} paid{orderResult.paymentId ? ` - ${orderResult.paymentId}` : ''}
            </div>
          </div>
          <button type="button" className="le-checkout-submit" onClick={closeCart}>
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
            Back to bag
          </button>
        ) : (
          <span className="le-checkout-drawer-title">Checkout</span>
        )}
        <button type="button" className="le-cart-close" onClick={closeCart} aria-label="Close">x</button>
      </div>

      {items.length === 0 ? (
        <p className="le-cart-empty" style={{ padding: '2rem 1.5rem' }}>Your bag is empty.</p>
      ) : (
        <div className="le-checkout-drawer" style={{ overflowY: 'auto', flex: '1 1 0' }}>
          <div className="le-checkout-section" style={{ paddingTop: 0 }}>
            <div className="le-checkout-section-title">Your order</div>
            {items.map((item) => (
              <div key={item.key} className="le-checkout-line">
                <div className="le-checkout-line-main">
                  <span className="le-checkout-line-title">{item.title}</span>
                  {item.optionSummary && (
                    <span className="le-checkout-line-options">{item.optionSummary}</span>
                  )}
                </div>
                <span className="le-checkout-line-meta">
                  {item.qty > 1 ? `${item.qty} x ` : ''}{fmt(item.unitPrice)}
                </span>
              </div>
            ))}
            <div className="le-checkout-summary" style={{ marginTop: '0.5rem' }}>
              <span className="le-checkout-summary-label">
                Total{pricing.confirmed ? '' : ' est.'}
              </span>
              <span className="le-checkout-summary-value">{fmt(amountCents)}</span>
            </div>
            {pricing.loading && (
              <p className="le-checkout-footnote" style={{ margin: 0, textAlign: 'left' }}>
                Confirming current prices...
              </p>
            )}
            {pricing.error && (
              <div className="le-checkout-warning">
                {pricing.error} Final total is still recomputed before payment.
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="le-checkout-form">
            <div className="le-checkout-section">
              <div className="le-checkout-section-title">Contact</div>
              <div className="le-checkout-field">
                <label className="le-checkout-label" htmlFor="co-name">Name</label>
                <input
                  id="co-name"
                  className="le-checkout-input"
                  value={customer.name}
                  onChange={(event) => updateCustomer({ name: event.target.value })}
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
                  value={customer.email}
                  onChange={(event) => updateCustomer({ email: event.target.value })}
                  autoComplete="email"
                  inputMode="email"
                  required
                />
              </div>
              <div className="le-checkout-field">
                <label className="le-checkout-label" htmlFor="co-phone">Phone</label>
                <input
                  id="co-phone"
                  type="tel"
                  className="le-checkout-input"
                  value={customer.phone}
                  onChange={(event) => updateCustomer({ phone: formatPhone(event.target.value) })}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="le-checkout-section">
              <div className="le-checkout-section-title">Fulfillment</div>
              {deliveryAvailable ? (
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
              ) : (
                <p className="le-checkout-footnote" style={{ margin: 0 }}>Pickup only</p>
              )}

              {!pickup && (
                <>
                  <div className="le-checkout-field">
                    <label className="le-checkout-label" htmlFor="co-address-line1">Street address</label>
                    <input
                      id="co-address-line1"
                      className="le-checkout-input"
                      value={address.line1}
                      onChange={(event) => updateAddress({ line1: event.target.value })}
                      autoComplete="shipping address-line1"
                      required
                    />
                  </div>
                  <div className="le-checkout-field">
                    <label className="le-checkout-label" htmlFor="co-address-line2">Apt / suite</label>
                    <input
                      id="co-address-line2"
                      className="le-checkout-input"
                      value={address.line2}
                      onChange={(event) => updateAddress({ line2: event.target.value })}
                      autoComplete="shipping address-line2"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="le-checkout-field-row">
                    <div className="le-checkout-field">
                      <label className="le-checkout-label" htmlFor="co-city">City</label>
                      <input
                        id="co-city"
                        className="le-checkout-input"
                        value={address.city}
                        onChange={(event) => updateAddress({ city: event.target.value })}
                        autoComplete="shipping address-level2"
                        required
                      />
                    </div>
                    <div className="le-checkout-field">
                      <label className="le-checkout-label" htmlFor="co-state">State</label>
                      <input
                        id="co-state"
                        className="le-checkout-input"
                        value={address.state}
                        onChange={(event) => updateAddress({ state: event.target.value.toUpperCase().slice(0, 2) })}
                        autoComplete="shipping address-level1"
                        required
                      />
                    </div>
                  </div>
                  <div className="le-checkout-field">
                    <label className="le-checkout-label" htmlFor="co-postal">ZIP</label>
                    <input
                      id="co-postal"
                      className="le-checkout-input"
                      value={address.postal}
                      onChange={(event) => updateAddress({ postal: event.target.value.replace(/[^\d-]/g, '').slice(0, 10) })}
                      autoComplete="shipping postal-code"
                      inputMode="numeric"
                      required
                    />
                  </div>
                  <div className="le-checkout-field">
                    <label className="le-checkout-label" htmlFor="co-delivery-notes">Delivery notes</label>
                    <textarea
                      id="co-delivery-notes"
                      className="le-checkout-textarea"
                      value={deliveryInstructions}
                      onChange={(event) => setDeliveryInstructions(event.target.value)}
                      autoComplete="off"
                      placeholder="Optional"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="le-checkout-section">
              <div className="le-checkout-section-title">Payment</div>
              <div className="le-checkout-payment">
                <div
                  id="store-express-pay"
                  className="le-checkout-express"
                  aria-label="Express payment options"
                />
                {expressPayAvailable && <div className="le-checkout-express-divider">or</div>}
                <div className="le-checkout-card-container">
                  <div id="store-card-container" />
                  {(loadingScript || (!cardLoaded && !cardError)) && (
                    <div className="le-checkout-card-loading">Loading secure payment form...</div>
                  )}
                </div>
                <div className="le-checkout-trust">
                  <span aria-hidden="true">Lock</span>
                  Secured by Square
                  <span className="le-checkout-trust-sep">/</span>
                  Visa, Mastercard, Amex, Discover
                </div>
              </div>
            </div>

            {(error || cardError || expressError) && (
              <div className="le-checkout-error">{error || cardError || expressError}</div>
            )}

            <button
              type="submit"
              className="le-checkout-submit"
              disabled={status === 'submitting' || !canSubmit(true)}
            >
              {status === 'submitting' ? 'Processing...' : `Pay ${fmt(amountCents)}`}
            </button>

            <p className="le-checkout-footnote">
              Contact and fulfillment details are saved on this device for faster checkout next time.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
