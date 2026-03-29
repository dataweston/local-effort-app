import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ImageZoom from 'react-image-zooom';
import { useSquareCard } from '../hooks/useSquareCard';
import { useSquareExpressPay } from '../hooks/useSquareExpressPay';
import { getOrCreateCheckoutAttemptId, clearCheckoutAttemptId } from '../lib/checkoutAttemptId';
import { trackEvent } from '../lib/trackEvent';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import '../styles/fullpage-demo-theme.css';
import '../styles/le-checkout.css';

const HERO_IMAGE = '/gallery/Screenshot%20%28172%29.png';
const ORIGINAL_PRICE_CENTS = 9000;
const PRODUCT_PRICE_CENTS = 7000;
const MAX_QUANTITY = 1;
const DELIVERY_FEE_CENTS = 1000;
const SHIPPING_FEE_CENTS = 1000;

/* ── JSON-LD structured data for Google rich results ── */
const buildProductJsonLd = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Product',
      name: 'Psyche Olive Oil — 3 Liter Bag-in-Box',
      description:
        'Single-estate, late-season koroneiki extra-virgin olive oil from Ampelofito, Greece. Bright, peppery finish — ideal for finishing, dipping, and drizzling. Produced by artist Theophilos Constantinou. EVA certified.',
      image: `${SITE_URL}${HERO_IMAGE}`,
      url: `${SITE_URL}/psyche`,
      brand: {
        '@type': 'Brand',
        name: 'Psyche Olive Oil',
        url: 'https://psycheoliveoil.com/',
      },
      sku: 'PSYCHE-3L',
      category: 'Grocery > Cooking Oils > Olive Oil',
      material: 'Extra-virgin olive oil — Koroneiki varietal',
      countryOfOrigin: {
        '@type': 'Country',
        name: 'Greece',
      },
      weight: {
        '@type': 'QuantitativeValue',
        value: 3,
        unitCode: 'LTR',
      },
      offers: {
        '@type': 'Offer',
        price: '70.00',
        priceCurrency: 'USD',
        availability: 'https://schema.org/LimitedAvailability',
        url: `${SITE_URL}/psyche`,
        priceValidUntil: '2026-12-31',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'LocalBusiness',
          name: 'Local Effort Food Co.',
          url: SITE_URL,
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Roseville',
            addressRegion: 'MN',
            postalCode: '55113',
            addressCountry: 'US',
          },
          areaServed: {
            '@type': 'GeoCircle',
            geoMidpoint: { '@type': 'GeoCoordinates', latitude: 44.9778, longitude: -93.2650 },
            geoRadius: '50000',
          },
        },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: '10.00',
            currency: 'USD',
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'US',
            addressRegion: ['MN', 'WI', 'IA', 'ND', 'SD'],
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
            transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' },
          },
        },
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Psyche Olive Oil', item: `${SITE_URL}/psyche` },
      ],
    },
  ],
});

const formatMoney = (cents) => (cents / 100).toFixed(2);
const isValidEmail = (value) => /.+@.+\..+/.test(value.trim());
const normalizePhone = (value) => value.replace(/\D/g, '').slice(0, 10);
const formatPhone = (value) => {
  const digits = normalizePhone(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};
const formatPostal = (value) => value.replace(/\D/g, '').slice(0, 5);

const PsychePage = () => {
  const [fulfillment, setFulfillment] = useState('delivery');
  const [deliveryZone, setDeliveryZone] = useState('local');
  const [quantity, setQuantity] = useState(1);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: 'MN', postal: '' });
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);

  const fulfillmentFeeCents = useMemo(() => {
    if (fulfillment === 'shipping') return SHIPPING_FEE_CENTS;
    return deliveryZone === 'extended' ? DELIVERY_FEE_CENTS : 0;
  }, [fulfillment, deliveryZone]);

  const subtotalCents = useMemo(
    () => PRODUCT_PRICE_CENTS * quantity,
    [quantity]
  );
  const totalCents = useMemo(
    () => subtotalCents + fulfillmentFeeCents,
    [subtotalCents, fulfillmentFeeCents]
  );

  const { cardLoaded, error: cardError, loadingScript, tokenize, verifyBuyer } = useSquareCard(
    '#psyche-card-container',
    true,
    []
  );

  const checkoutAttemptRef = useRef('');
  const attemptStorageKey = 'le:checkoutAttempt:psyche';

  const resolveCheckoutAttemptId = useCallback(() => {
    if (checkoutAttemptRef.current) return checkoutAttemptRef.current;
    const next = getOrCreateCheckoutAttemptId(attemptStorageKey);
    checkoutAttemptRef.current = next;
    return next;
  }, []);

  const clearCheckoutAttempt = useCallback(() => {
    checkoutAttemptRef.current = '';
    clearCheckoutAttemptId(attemptStorageKey);
  }, []);

  // Express pay (Apple Pay / Google Pay) — mounted above the manual card form.
  // When the wallet returns a token we reuse the same checkout submit path.
  const handleExpressToken = useCallback(async (token) => {
    if (status === 'submitting') return;
    if (!customer.name.trim() || !customer.email.trim()) return; // still need contact info
    trackEvent('express_pay.used', { store: 'psyche' });
    setError('');
    setStatus('submitting');
    try {
      const checkoutAttemptId = resolveCheckoutAttemptId();
      const response = await fetch('/api/psyche/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          fulfillment,
          deliveryZone,
          deliveryNotes,
          quantity,
          customer,
          address,
          checkoutAttemptId,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Payment failed.');
      setPaymentId(data?.paymentId || '');
      setEmailStatus(data?.emailStatus || null);
      setStatus('success');
      clearCheckoutAttempt();
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Unable to complete purchase.');
    }
  // deps intentionally omitted — this is a stable callback; resolveCheckoutAttemptId is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, customer, address, fulfillment, deliveryZone, deliveryNotes, quantity]);

  const { googlePayAvailable, applePayAvailable } = useSquareExpressPay({
    amountCents: totalCents,
    containerId: '#psyche-express-pay',
    enabled: status !== 'success',
    onToken: handleExpressToken,
  });

  const expressPayAvailable = googlePayAvailable || applePayAvailable;

  // Track when express pay becomes available in this browser
  React.useEffect(() => {
    if (expressPayAvailable) trackEvent('express_pay.shown', { store: 'psyche' });
  }, [expressPayAvailable]);

  const resetStatus = () => {
    if (status !== 'idle') {
      setStatus('idle');
      setError('');
    }
  };

  const canSubmit = () => {
    if (!customer.name.trim()) return false;
    if (!isValidEmail(customer.email)) return false;
    if (normalizePhone(customer.phone).length !== 10) return false;
    if (!address.line1.trim() || !address.city.trim() || address.postal.trim().length < 5) return false;
    if (!cardLoaded) return false;
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'submitting') return;
    setError('');

    if (!canSubmit()) {
      setError('Please complete all required fields before purchasing.');
      return;
    }

    setStatus('submitting');
    const checkoutAttemptId = resolveCheckoutAttemptId();
    trackEvent('payment.attempted', { store: 'psyche', sessionId: checkoutAttemptId, amountCents: totalCents });
    try {
      const token = await tokenize();
      const verificationDetails = {
        amount: (totalCents / 100).toFixed(2),
        currencyCode: 'USD',
        intent: 'CHARGE',
        billingContact: {
          givenName: customer?.name?.split(' ')?.[0] || undefined,
          familyName: customer?.name?.split(' ')?.slice(1).join(' ') || undefined,
          email: customer?.email || undefined,
          phone: customer?.phone || undefined,
          addressLines: [address?.line1, address?.line2].filter(Boolean),
          city: address?.city || undefined,
          state: address?.state || undefined,
          postalCode: address?.postal || undefined,
          countryCode: 'US',
        },
      };
      const verificationToken = await verifyBuyer(token, verificationDetails);

      const response = await fetch('/api/psyche/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          verificationToken,
          checkoutAttemptId,
          fulfillment,
          deliveryZone,
          deliveryNotes,
          quantity,
          customer,
          address,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Payment failed.');
      }

      trackEvent('order.placed', { store: 'psyche', sessionId: checkoutAttemptId, paymentId: data?.paymentId });
      setPaymentId(data?.paymentId || '');
      setEmailStatus(data?.emailStatus || null);
      setStatus('success');
      clearCheckoutAttempt();
    } catch (err) {
      trackEvent('payment.failed', { store: 'psyche', reason: err?.message });
      setStatus('error');
      setError(err?.message || 'Unable to complete purchase.');
    }
  };

  return (
    <div className="le-checkout-page psyche-page">
      <Helmet>
        <title>Buy Psyche Olive Oil — 3L Extra-Virgin | {SITE_NAME}</title>
        <meta
          name="description"
          content="Buy Psyche extra-virgin olive oil (3 L bag-in-box) from Local Effort Food Co. in Minneapolis. Single-estate koroneiki from Greece — bright, peppery, EVA-certified. Now $70 (was $90) — last bottle! Free local delivery."
        />
        <meta
          name="keywords"
          content="Psyche olive oil, buy olive oil Minneapolis, extra virgin olive oil, koroneiki, Greek olive oil, Local Effort Food Co., bag in box olive oil, finishing oil"
        />
        <link rel="canonical" href={`${SITE_URL}/psyche`} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`${SITE_URL}/psyche`} />
        <meta property="og:title" content="Buy Psyche Olive Oil — 3L Extra-Virgin | Local Effort Food Co." />
        <meta
          property="og:description"
          content="Single-estate koroneiki extra-virgin olive oil from Greece. Bright, peppery, EVA-certified. Now $70 (was $90) — last bottle! 3-liter bag-in-box with free local delivery in Minneapolis–St. Paul."
        />
        <meta property="og:image" content={`${SITE_URL}${HERO_IMAGE}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Psyche olive oil 3-liter bag-in-box" />
        <meta property="product:price:amount" content="70.00" />
        <meta property="product:price:currency" content="USD" />
        <meta property="product:availability" content="limited availability" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={`${SITE_URL}/psyche`} />
        <meta name="twitter:title" content="Buy Psyche Olive Oil — 3L Extra-Virgin | Local Effort Food Co." />
        <meta
          name="twitter:description"
          content="Single-estate koroneiki extra-virgin olive oil from Greece. Now $70 (was $90) — last bottle! Free local delivery in Minneapolis–St. Paul."
        />
        <meta name="twitter:image" content={`${SITE_URL}${HERO_IMAGE}`} />
        <meta name="twitter:image:alt" content="Psyche olive oil 3-liter bag-in-box" />
        <script type="application/ld+json">{JSON.stringify(buildProductJsonLd())}</script>
      </Helmet>

      <nav className="le-checkout-nav">
        <a className="le-checkout-back" href="/">← Home</a>
      </nav>

      <div className="le-checkout-layout">

        {/* ── Left: product context ── */}
        <div className="le-checkout-context">
          <ImageZoom
            src={HERO_IMAGE}
            alt="Psyche olive oil 3-liter bag-in-box"
            zoom="200"
            className="le-checkout-product-img"
          />

          <div>
            <h1 className="le-checkout-product-title">Psyche Olive Oil</h1>
            <div className="le-checkout-price-row" style={{ marginTop: '0.5rem' }}>
              <span className="le-checkout-price-original">${formatMoney(ORIGINAL_PRICE_CENTS)}</span>
              <span className="le-checkout-price-current">${formatMoney(PRODUCT_PRICE_CENTS)}</span>
              <span className="le-checkout-price-note">Only 1 remaining</span>
            </div>
          </div>

          <div className="le-checkout-product-meta">
            <p>
              3 Liters — plastic bag with aluminum lining
              <br />
              <a href="https://psycheoliveoil.com/" target="_blank" rel="noreferrer">psycheoliveoil.com</a>
            </p>
            <p>
              Psyche is the highly regarded olive oil project by Ohio-born artist Theophilos Constantinou.
              Single-estate, late-season koroneiki olives from the Karambotsos family in Ampelofito, Greece.
              Very fresh, medium strength. We don't have polyphenol labs on this yet, but, from Constantinou:
            </p>
            <blockquote className="le-checkout-product-quote">
              PSYCHE is different because they are not competing with or comparing it to other olive oil
              brands. It is built on the principle of quality and transparency in the supply chain. It is
              a philosophy towards life. You are buying into a lifestyle, an ideology rooted in food as
              medicine.
            </blockquote>
            <p>
              We're offering this olive oil cheaper than his website because... we can.
            </p>
            <p>
              <a href="https://www.aboutoliveoil.org/extra-virgin-alliance/eva-psyche" target="_blank" rel="noreferrer">
                EVA certification
              </a>
              {' · '}
              <a href="https://www.instagram.com/psycheoliveoil" target="_blank" rel="noreferrer">
                @psycheoliveoil
              </a>
            </p>
          </div>

          {/* Fulfillment selector */}
          <div>
            <span className="le-checkout-selector-label">Fulfillment</span>
            <div className="le-checkout-pills" role="group" aria-label="Fulfillment method">
              <button
                type="button"
                className={`le-checkout-pill${fulfillment === 'delivery' ? ' is-selected' : ''}`}
                onClick={() => { setFulfillment('delivery'); resetStatus(); }}
                aria-pressed={fulfillment === 'delivery'}
              >
                Delivery
                <span className="le-checkout-pill-sub">from 55113</span>
              </button>
              <button
                type="button"
                className={`le-checkout-pill${fulfillment === 'shipping' ? ' is-selected' : ''}`}
                onClick={() => { setFulfillment('shipping'); resetStatus(); }}
                aria-pressed={fulfillment === 'shipping'}
              >
                Shipping
                <span className="le-checkout-pill-sub">Midwest, $10 flat</span>
              </button>
            </div>
          </div>

          {fulfillment === 'delivery' && (
            <div>
              <span className="le-checkout-selector-label">Delivery distance</span>
              <div className="le-checkout-pills" role="group" aria-label="Delivery distance">
                <button
                  type="button"
                  className={`le-checkout-pill${deliveryZone === 'local' ? ' is-selected' : ''}`}
                  onClick={() => { setDeliveryZone('local'); resetStatus(); }}
                  aria-pressed={deliveryZone === 'local'}
                >
                  Within 10 miles
                  <span className="le-checkout-pill-sub">free</span>
                </button>
                <button
                  type="button"
                  className={`le-checkout-pill${deliveryZone === 'extended' ? ' is-selected' : ''}`}
                  onClick={() => { setDeliveryZone('extended'); resetStatus(); }}
                  aria-pressed={deliveryZone === 'extended'}
                >
                  Over 10 miles
                  <span className="le-checkout-pill-sub">+$10</span>
                </button>
              </div>
            </div>
          )}

          {/* Live total */}
          <div className="le-checkout-summary">
            <span className="le-checkout-summary-label">Total</span>
            <div style={{ textAlign: 'right' }}>
              <div className="le-checkout-summary-value">${formatMoney(totalCents)}</div>
              {fulfillmentFeeCents > 0 && (
                <div className="le-checkout-summary-breakdown">
                  ${formatMoney(subtotalCents)} + ${formatMoney(fulfillmentFeeCents)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: checkout form ── */}
        <div className="le-checkout-form-panel">

          {status === 'success' ? (
            <div className="le-checkout-success">
              <div className="le-checkout-success-title">Order confirmed</div>
              <p className="le-checkout-success-copy">
                Payment received. A confirmation email is on the way with your details.
              </p>
              {paymentId && (
                <div className="le-checkout-success-meta">Payment ID: {paymentId}</div>
              )}
              {emailStatus?.customer === false && (
                <div className="le-checkout-warning">We could not send the customer email. Please contact us.</div>
              )}
              {emailStatus?.admin === false && (
                <div className="le-checkout-warning">We could not send the admin email. Please contact us.</div>
              )}
            </div>
          ) : (
            <form className="le-checkout-form" onSubmit={handleSubmit} noValidate>

              {/* Contact */}
              <div className="le-checkout-section">
                <div className="le-checkout-section-title">Contact</div>
                <div className="le-checkout-field">
                  <label className="le-checkout-label" htmlFor="psyche-name">Name</label>
                  <input
                    id="psyche-name"
                    className="le-checkout-input"
                    value={customer.name}
                    onChange={(e) => { setCustomer((prev) => ({ ...prev, name: e.target.value })); resetStatus(); }}
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="le-checkout-field">
                  <label className="le-checkout-label" htmlFor="psyche-email">Email</label>
                  <input
                    id="psyche-email"
                    type="email"
                    className="le-checkout-input"
                    value={customer.email}
                    onChange={(e) => { setCustomer((prev) => ({ ...prev, email: e.target.value })); resetStatus(); }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="le-checkout-field">
                  <label className="le-checkout-label" htmlFor="psyche-phone">Phone</label>
                  <input
                    id="psyche-phone"
                    type="tel"
                    className="le-checkout-input"
                    value={customer.phone}
                    onChange={(e) => { setCustomer((prev) => ({ ...prev, phone: formatPhone(e.target.value) })); resetStatus(); }}
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>

              {/* Deliver to */}
              <div className="le-checkout-section">
                <div className="le-checkout-section-title">Deliver to</div>
                <div className="le-checkout-field">
                  <label className="le-checkout-label" htmlFor="psyche-address1">Street address</label>
                  <input
                    id="psyche-address1"
                    className="le-checkout-input"
                    value={address.line1}
                    onChange={(e) => { setAddress((prev) => ({ ...prev, line1: e.target.value })); resetStatus(); }}
                    placeholder="Street address"
                    autoComplete="address-line1"
                    required
                  />
                </div>
                <div className="le-checkout-field">
                  <label className="le-checkout-label" htmlFor="psyche-address2">Unit / suite <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <input
                    id="psyche-address2"
                    className="le-checkout-input"
                    value={address.line2}
                    onChange={(e) => { setAddress((prev) => ({ ...prev, line2: e.target.value })); resetStatus(); }}
                    placeholder="Apt, suite, etc."
                    autoComplete="address-line2"
                  />
                </div>
                <div className="le-checkout-field-row">
                  <div className="le-checkout-field">
                    <label className="le-checkout-label" htmlFor="psyche-city">City</label>
                    <input
                      id="psyche-city"
                      className="le-checkout-input"
                      value={address.city}
                      onChange={(e) => { setAddress((prev) => ({ ...prev, city: e.target.value })); resetStatus(); }}
                      placeholder="Saint Paul"
                      autoComplete="address-level2"
                      required
                    />
                  </div>
                  <div className="le-checkout-field">
                    <label className="le-checkout-label" htmlFor="psyche-postal">ZIP</label>
                    <input
                      id="psyche-postal"
                      className="le-checkout-input"
                      value={address.postal}
                      onChange={(e) => { setAddress((prev) => ({ ...prev, postal: formatPostal(e.target.value) })); resetStatus(); }}
                      placeholder="55113"
                      autoComplete="postal-code"
                      required
                    />
                  </div>
                </div>
                <div className="le-checkout-field">
                  <label className="le-checkout-label" htmlFor="psyche-notes">Delivery notes <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <textarea
                    id="psyche-notes"
                    className="le-checkout-textarea"
                    rows={3}
                    value={deliveryNotes}
                    onChange={(e) => { setDeliveryNotes(e.target.value); resetStatus(); }}
                    placeholder="Gate codes, preferred drop-off, etc."
                  />
                </div>
              </div>

              {/* Payment */}
              <div className="le-checkout-section">
                <div className="le-checkout-section-title">Payment</div>
                <div className="le-checkout-payment">
                  {/* Express pay — Apple Pay / Google Pay */}
                  <div
                    id="psyche-express-pay"
                    className="le-checkout-express"
                    style={{ display: expressPayAvailable ? 'block' : 'none' }}
                  />
                  {expressPayAvailable && (
                    <div className="le-checkout-express-divider">or pay with card</div>
                  )}
                  {/* Card iframe */}
                  <div className="le-checkout-card-container">
                    <div id="psyche-card-container" />
                  </div>
                  {loadingScript && (
                    <div className="le-checkout-card-loading">Loading secure payment form…</div>
                  )}
                  {cardError && (
                    <div className="le-checkout-error">{cardError}</div>
                  )}
                  {/* Trust row */}
                  <div className="le-checkout-trust">
                    <svg className="le-checkout-trust-icon" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                      <rect x="1" y="5" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M4 5V4a2 2 0 0 1 4 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    Secured by Square
                    <span className="le-checkout-trust-sep">·</span>
                    Visa, Mastercard, Amex, Discover
                  </div>
                </div>
              </div>

              {error && <div className="le-checkout-error">{error}</div>}

              <button
                type="submit"
                className="le-checkout-submit"
                disabled={!canSubmit() || status === 'submitting' || status === 'success'}
              >
                {status === 'submitting' ? 'Processing…' : `Pay $${formatMoney(totalCents)}`}
              </button>

              <p className="le-checkout-footnote">
                A confirmation email will be sent after purchase.
              </p>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};

export default PsychePage;
