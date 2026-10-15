import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSquareCard } from '../../hooks/useSquareCard';
import { getOrCreateCheckoutAttemptId, clearCheckoutAttemptId } from '../../lib/checkoutAttemptId';
import { trackEvent } from '../../lib/trackEvent';
import { capturePageErrors, reportCheckoutFailure } from '../../lib/checkoutFailure';
import { useCart } from '../cart/CartContext';
import '../../styles/le-checkout.css';
import smithCatalog from '../data/pizzaOnSmith.json';

const fmt = (cents) => `$${((Number(cents) || 0) / 100).toFixed(2)}`;
const PROFILE_STORAGE_KEY = 'le:storeCheckoutProfile';

// Stores using the unified Wednesday pickup windows + flat local-delivery fee.
const UNIFIED_FULFILLMENT_STORES = new Set(['sale']);
const PICKUP_TIME_WINDOWS = ['2pm-4pm', '4pm-6pm'];
const DEFAULT_PICKUP_WINDOW = PICKUP_TIME_WINDOWS[0];
const CHEZ_GARAGE_STORE = 'chez-garage';
const CHEZ_GARAGE_DELIVERY_MINIMUM_CENTS = 7500;
const CHEZ_GARAGE_DELIVERY_FEE_CENTS = 1000;
const CHEZ_GARAGE_PICKUP_ADDRESS = '4379 Mackey Ave, Minneapolis MN 55424';

const blankAddress = { line1: '', line2: '', city: '', state: 'MN', postal: '' };
const blankProfile = {
  customer: { name: '', email: '', phone: '' },
  pickup: true,
  address: blankAddress,
  deliveryInstructions: '',
  pickupWindow: DEFAULT_PICKUP_WINDOW,
  customerNotes: '',
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
      pickupWindow: PICKUP_TIME_WINDOWS.includes(parsed?.pickupWindow)
        ? parsed.pickupWindow
        : DEFAULT_PICKUP_WINDOW,
      customerNotes: parsed?.customerNotes || '',
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
  selectedDate: item.selectedDate || '',
  title: item.title,
}));

function useServerPricing(items, localSubtotal, store, pickup, fulfillmentMethod) {
  const [pricing, setPricing] = useState({
    loading: false,
    error: '',
    subtotal: null,
    fulfillmentFee: 0,
    lines: [],
    pricedAt: null,
    pricingVersion: null,
  });

  const payloadKey = useMemo(
    () => JSON.stringify({ items: buildCartPayload(items), store, pickup, fulfillmentMethod }),
    [items, store, pickup, fulfillmentMethod],
  );

  useEffect(() => {
    if (!items.length) {
      setPricing({ loading: false, error: '', subtotal: null, fulfillmentFee: 0, lines: [], pricedAt: null, pricingVersion: null });
      return undefined;
    }

    const controller = new AbortController();
    setPricing((current) => ({ ...current, loading: true, error: '' }));

    fetch('/api/store/price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: buildCartPayload(items), store, pickup, fulfillmentMethod }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Unable to confirm order total.');
        setPricing({
          loading: false,
          error: '',
          subtotal: Number.isInteger(data?.subtotal) ? data.subtotal : null,
          fulfillmentFee: Number.isInteger(data?.fulfillmentFee) ? data.fulfillmentFee : 0,
          lines: Array.isArray(data?.lines) ? data.lines : [],
          pricedAt: data?.pricedAt || null,
          pricingVersion: data?.pricingVersion || null,
        });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setPricing({
          loading: false,
          error: error?.message || 'Unable to confirm order total.',
          subtotal: null,
          fulfillmentFee: 0,
          lines: [],
          pricedAt: null,
          pricingVersion: null,
        });
      });

    return () => controller.abort();
  }, [payloadKey, items, store, pickup, fulfillmentMethod]);

  const resolvedSubtotal = pricing.subtotal ?? localSubtotal;
  return {
    ...pricing,
    subtotal: resolvedSubtotal,
    // total includes the local-delivery fee when one applies.
    total: resolvedSubtotal + (pricing.fulfillmentFee || 0),
    confirmed: pricing.subtotal !== null && !pricing.error,
  };
}

export default function CheckoutPanel({ store = 'sale', onBack }) {
  const { items, subtotal, open, closeCart, clear } = useCart();
  const loadedProfile = useMemo(loadProfile, []);
  const [customer, setCustomer] = useState(loadedProfile.customer);
  const [pickup, setPickup] = useState(
    store === smithCatalog.store ? true : store === CHEZ_GARAGE_STORE ? false : loadedProfile.pickup,
  );
  const [fulfillmentMethod, setFulfillmentMethod] = useState('pickup');
  const [address, setAddress] = useState(loadedProfile.address);
  const [deliveryInstructions, setDeliveryInstructions] = useState(loadedProfile.deliveryInstructions);
  const [pickupWindow, setPickupWindow] = useState(loadedProfile.pickupWindow);
  const [customerNotes, setCustomerNotes] = useState(loadedProfile.customerNotes);
  const [smsReleaseOptIn, setSmsReleaseOptIn] = useState(false);
  const [fulfillmentAreaConfirmed, setFulfillmentAreaConfirmed] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const checkoutAttemptRef = useRef('');
  const attemptStorageKey = `le:checkoutAttempt:store:${store}`;

  const usesUnifiedFulfillment = UNIFIED_FULFILLMENT_STORES.has(store);
  const effectiveFulfillmentMethod = store === smithCatalog.store ? fulfillmentMethod : pickup ? 'pickup' : 'delivery';
  const pricing = useServerPricing(items, subtotal, store, pickup, effectiveFulfillmentMethod);
  const amountCents = pricing.total;
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
    if (pricing.loading || pricing.error || !pricing.confirmed) return false;
    if (!customer.name.trim()) return false;
    if (!isValidEmail(customer.email)) return false;
    if (customer.phone && normalizePhone(customer.phone).length < 10) return false;
    if (smsReleaseOptIn && normalizePhone(customer.phone).length < 10) return false;
    if (store === smithCatalog.store && fulfillmentMethod !== 'pickup' && !fulfillmentAreaConfirmed) return false;
    if (!pickup) {
      if (!address.line1.trim() || !address.city.trim()) return false;
      if (!address.state.trim() || address.postal.trim().replace(/\D/g, '').length < 5) return false;
    }
    if (requireCard && !cardLoaded) return false;
    return true;
  }, [address, cardLoaded, customer, fulfillmentAreaConfirmed, fulfillmentMethod, items.length, pickup, pricing, smsReleaseOptIn, store]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
        customer,
        pickup,
        address,
        deliveryInstructions,
        pickupWindow,
        customerNotes,
      }));
    } catch (_) {
      // Storage is a convenience only.
    }
  }, [address, customer, customerNotes, deliveryInstructions, pickup, pickupWindow]);

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
        fulfillmentMethod: store === smithCatalog.store ? fulfillmentMethod : pickup ? 'pickup' : 'delivery',
        address: pickup ? null : address,
        deliveryInstructions,
        pickupWindow: pickup && usesUnifiedFulfillment ? pickupWindow : undefined,
        customerNotes: customerNotes.trim(),
        items: buildCartPayload(items),
        token,
        verificationToken,
        checkoutAttemptId,
        pricingVersion: pricing.pricingVersion,
        smsReleaseOptIn: store === smithCatalog.store && smsReleaseOptIn,
        fulfillmentAreaConfirmed: store === smithCatalog.store && fulfillmentMethod !== 'pickup' && fulfillmentAreaConfirmed,
        store,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      // The server records its own rejections (api-handlers/store/checkout.js).
      throw Object.assign(new Error(data?.error || 'Checkout failed.'), {
        code: data?.code,
        recordedByServer: true,
      });
    }
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
      pickupWindow: pickup && usesUnifiedFulfillment ? pickupWindow : null,
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
    customerNotes,
    deliveryInstructions,
    items,
    pickup,
    pickupWindow,
    pricing,
    resolveCheckoutAttemptId,
    store,
    usesUnifiedFulfillment,
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

    let stage = 'tokenize';
    try {
      const token = await tokenize();
      stage = 'verify';
      const verificationToken = await verifyBuyer(token, verificationDetails);
      stage = 'submit';
      await submitCheckout({ token, verificationToken, method: 'card' });
    } catch (err) {
      reportCheckoutFailure({ store, sessionId: checkoutAttemptId, stage, error: err, amountCents });
      // Retire the attempt id on failure. Square caches a result per
      // idempotency key, so reusing it after a decline replays the decline
      // rather than taking a fresh payment; the server also refuses a second
      // charge under an attempt it has already recorded as failed.
      clearCheckoutAttempt();
      setStatus('error');
      setError(err?.message || 'Unable to complete purchase.');
    }
  }, [
    amountCents,
    canSubmit,
    clearCheckoutAttempt,
    resolveCheckoutAttemptId,
    status,
    store,
    submitCheckout,
    tokenize,
    verificationDetails,
    verifyBuyer,
  ]);

  useEffect(() => {
    if (!enabled) return undefined;
    return capturePageErrors({ store });
  }, [enabled, store]);

  // The card form failing to load leaves a dead pay button; record it once per
  // distinct message so the owner can see it happened.
  const reportedCardError = useRef('');
  useEffect(() => {
    if (!cardError || reportedCardError.current === cardError) return;
    reportedCardError.current = cardError;
    reportCheckoutFailure({ store, sessionId: undefined, stage: 'card-form', error: new Error(cardError) });
  }, [cardError, store]);

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
                ? store === smithCatalog.store
                  ? `Pickup is at ${smithCatalog.pickup.address}.`
                  : store === CHEZ_GARAGE_STORE
                  ? `Pickup is at ${CHEZ_GARAGE_PICKUP_ADDRESS}.`
                  : `Pickup is at Neon Kitchens, 2103 W Broadway, Minneapolis${orderResult.pickupWindow ? ` on Wednesday ${orderResult.pickupWindow}` : ''}.`
                : 'Local delivery details will be sent separately.'}
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
                  {item.selectedDate && (
                    <span className="le-checkout-line-options">Date: {item.selectedDate}</span>
                  )}
                </div>
                <span className="le-checkout-line-meta">
                  {item.qty > 1 ? `${item.qty} x ` : ''}{fmt(item.unitPrice)}
                </span>
              </div>
            ))}
            {pricing.fulfillmentFee > 0 && (
              <>
                <div className="le-checkout-summary" style={{ marginTop: '0.5rem' }}>
                  <span className="le-checkout-summary-label">Subtotal</span>
                  <span className="le-checkout-summary-value">{fmt(pricing.subtotal)}</span>
                </div>
                <div className="le-checkout-summary">
                  <span className="le-checkout-summary-label">Local delivery</span>
                  <span className="le-checkout-summary-value">{fmt(pricing.fulfillmentFee)}</span>
                </div>
              </>
            )}
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
              {store === smithCatalog.store && (
                <label className="le-checkout-footnote" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={smsReleaseOptIn}
                    onChange={(event) => setSmsReleaseOptIn(event.target.checked)}
                  />
                  <span>Opt in to SMS notifications about future limited pizza releases. Optional; message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out.</span>
                </label>
              )}
            </div>

            <div className="le-checkout-section">
              <div className="le-checkout-section-title">Fulfillment</div>
              {store === smithCatalog.store ? (
                <>
                  <div className="le-checkout-pickup-selector" role="group" aria-label="Fulfillment method">
                    {[
                      ['pickup', 'Pickup — free'],
                      ['delivery', 'Metro delivery — $12'],
                      ['shipping', 'Shipping — $22'],
                    ].map(([method, label]) => (
                      <button
                        key={method}
                        type="button"
                        className={`le-checkout-pickup-pill${fulfillmentMethod === method ? ' is-selected' : ''}`}
                        onClick={() => { setFulfillmentMethod(method); setPickup(method === 'pickup'); setFulfillmentAreaConfirmed(false); }}
                        aria-pressed={fulfillmentMethod === method}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {fulfillmentMethod === 'shipping' && (
                    <p className="le-checkout-footnote">Shipping within 100 miles; $100 merchandise minimum.</p>
                  )}
                  {fulfillmentMethod === 'delivery' && (
                    <p className="le-checkout-footnote">Delivery within the Twin Cities metro area.</p>
                  )}
                  {fulfillmentMethod !== 'pickup' && (
                    <label className="le-checkout-footnote" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <input type="checkbox" required checked={fulfillmentAreaConfirmed} onChange={(event) => setFulfillmentAreaConfirmed(event.target.checked)} />
                      <span>{fulfillmentMethod === 'shipping' ? 'I confirm my delivery address is within 100 miles of West St. Paul.' : 'I confirm my address is within the Twin Cities metro area.'}</span>
                    </label>
                  )}
                </>
              ) : deliveryAvailable ? (
                <div className="le-checkout-pickup-selector" role="group" aria-label="Fulfillment method">
                  <button type="button" className={`le-checkout-pickup-pill${pickup ? ' is-selected' : ''}`} onClick={() => setPickup(true)} aria-pressed={pickup}>Pickup</button>
                  <button type="button" className={`le-checkout-pickup-pill${!pickup ? ' is-selected' : ''}`} onClick={() => setPickup(false)} aria-pressed={!pickup}>
                    {store === CHEZ_GARAGE_STORE
                      ? `Local delivery (+${fmt(CHEZ_GARAGE_DELIVERY_FEE_CENTS)})`
                      : `Local delivery${usesUnifiedFulfillment ? ' (+$6)' : ''}`}
                  </button>
                </div>
              ) : (
                <p className="le-checkout-footnote" style={{ margin: 0 }}>Pickup only</p>
              )}

              {store === CHEZ_GARAGE_STORE && (
                <p className="le-checkout-footnote" style={{ margin: '0.75rem 0 0', textAlign: 'left' }}>
                  {pickup
                    ? 'The pickup address will be included in your confirmation email after purchase.'
                    : `${fmt(CHEZ_GARAGE_DELIVERY_MINIMUM_CENTS)} merchandise minimum plus ${fmt(CHEZ_GARAGE_DELIVERY_FEE_CENTS)} local delivery. Delivery only; shipping is not available.`}
                </p>
              )}

              {store === smithCatalog.store && (
                <p className="le-checkout-footnote" style={{ textAlign: 'left' }}>
                  Pickup, metro delivery, and shipping fulfilled the week of November 2, 2026 · Pickup: {smithCatalog.pickup.address}
                </p>
              )}

              {pickup && usesUnifiedFulfillment && (
                <div className="le-checkout-field">
                  <span className="le-checkout-label" id="co-pickup-window-label">
                    Pickup time (Wednesday)
                  </span>
                  <div
                    className="le-checkout-pickup-selector"
                    role="group"
                    aria-labelledby="co-pickup-window-label"
                  >
                    {PICKUP_TIME_WINDOWS.map((window) => (
                      <button
                        key={window}
                        type="button"
                        className={`le-checkout-pickup-pill${pickupWindow === window ? ' is-selected' : ''}`}
                        onClick={() => setPickupWindow(window)}
                        aria-pressed={pickupWindow === window}
                      >
                        {window}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="le-checkout-field">
                <label className="le-checkout-label" htmlFor="co-customer-notes">
                  {pickup ? 'Pickup notes' : 'Notes for us'}
                </label>
                <textarea
                  id="co-customer-notes"
                  className="le-checkout-textarea"
                  value={customerNotes}
                  onChange={(event) => setCustomerNotes(event.target.value)}
                  autoComplete="off"
                  placeholder={pickup ? 'Anything we should know about your pickup? (optional)' : 'Anything we should know? (optional)'}
                />
              </div>

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

            {(error || cardError) && (
              <div className="le-checkout-error">{error || cardError}</div>
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
