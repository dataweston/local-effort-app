import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ImageZoom from 'react-image-zooom';
import { useSquareCard } from '../hooks/useSquareCard';
import { useSquareExpressPay } from '../hooks/useSquareExpressPay';
import { getOrCreateCheckoutAttemptId, clearCheckoutAttemptId } from '../lib/checkoutAttemptId';
import { trackEvent } from '../lib/trackEvent';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import '../styles/fullpage-demo-theme.css';

const HERO_IMAGE = '/gallery/Screenshot%20%28172%29.png';
const PRODUCT_PRICE_CENTS = 9000;
const MAX_QUANTITY = 4;
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
        price: '90.00',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
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
    <div className="fullpage-demo february-page psyche-page">
      <Helmet>
        <title>Buy Psyche Olive Oil — 3L Extra-Virgin | {SITE_NAME}</title>
        <meta
          name="description"
          content="Buy Psyche extra-virgin olive oil (3 L bag-in-box) from Local Effort Food Co. in Minneapolis. Single-estate koroneiki from Greece — bright, peppery, EVA-certified. $90 with free local delivery."
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
          content="Single-estate koroneiki extra-virgin olive oil from Greece. Bright, peppery, EVA-certified. $90 for a 3-liter bag-in-box with free local delivery in Minneapolis–St. Paul."
        />
        <meta property="og:image" content={`${SITE_URL}${HERO_IMAGE}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Psyche olive oil 3-liter bag-in-box" />
        <meta property="product:price:amount" content="90.00" />
        <meta property="product:price:currency" content="USD" />
        <meta property="product:availability" content="in stock" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={`${SITE_URL}/psyche`} />
        <meta name="twitter:title" content="Buy Psyche Olive Oil — 3L Extra-Virgin | Local Effort Food Co." />
        <meta
          name="twitter:description"
          content="Single-estate koroneiki extra-virgin olive oil from Greece. $90 for a 3-liter bag-in-box. Free local delivery in Minneapolis–St. Paul."
        />
        <meta name="twitter:image" content={`${SITE_URL}${HERO_IMAGE}`} />
        <meta name="twitter:image:alt" content="Psyche olive oil 3-liter bag-in-box" />
        <script type="application/ld+json">{JSON.stringify(buildProductJsonLd())}</script>
      </Helmet>

      <nav className="february-breadcrumb">
        <a href="/">&lt;- Home</a>
      </nav>

      <div className="february-grid">
        <div className="february-col february-col-left">
          <div className="february-hero-media psyche-hero-media">
            <ImageZoom
              src={HERO_IMAGE}
              alt="Psyche olive oil bottle"
              zoom="200"
            />
          </div>
          <div className="february-hero-text">
            <p>
              <strong>Psyche Olive Oil</strong>
              <br />
              3 Liters - plastic bag with aluminum lining
              <br />
              <a href="https://psycheoliveoil.com/" target="_blank" rel="noreferrer">
                psycheoliveoil.com
              </a>
            </p>
            <p>
              Psyche is the highly regarded olive oil project by Ohio-born artist Theophilos Constantinou.
              Single-estate, late-season koroneiki olives from the Karambotsos family in Ampelofito, Greece.
              Very fresh, medium strength. We don't have polyphenol labs on this yet, but, from Constantinou:
            </p>
            <blockquote className="psyche-quote">
              PSYCHE is different because they are not competing with or comparing it to other olive oil
              brands. It is built on the principle of quality and transparency in the supply chain. It is
              a philosophy towards life. You are buying into a lifestyle, an ideology rooted in food as
              medicine.
            </blockquote>
            <p>
              We're offering this olive oil 20% cheaper than his website because... we can.
            </p>
            <p>
              <a href="https://www.aboutoliveoil.org/extra-virgin-alliance/eva-psyche" target="_blank" rel="noreferrer">
                https://www.aboutoliveoil.org/extra-virgin-alliance/eva-psyche
              </a>
              <br />
              <a href="https://www.instagram.com/psycheoliveoil" target="_blank" rel="noreferrer">
                https://www.instagram.com/psycheoliveoil
              </a>
            </p>
          </div>
        </div>

        <div className="february-col february-col-right">
          {status === 'success' && (
            <div className="february-success">
              <div className="february-success-title">Order confirmed</div>
              <div className="february-success-copy">
                Payment received. A confirmation email is on the way with your details.
              </div>
              {paymentId && (
                <div className="february-success-meta">Payment ID: {paymentId}</div>
              )}
              {emailStatus?.customer === false && (
                <div className="february-warning">We could not send the customer email. Please contact us.</div>
              )}
              {emailStatus?.admin === false && (
                <div className="february-warning">We could not send the admin email. Please contact us.</div>
              )}
            </div>
          )}

          <section className="february-card">
            <div className="february-card-header">
              <div>
                <div className="february-card-title">Buy Psyche olive oil</div>
                <div className="february-card-subtitle">
                  Price per bottle: $90.00
                </div>
                <div className="february-card-subtitle">
                  Quantity: {quantity} (max {MAX_QUANTITY})
                </div>
                <div className="february-card-subtitle">
                  {fulfillment === 'shipping'
                    ? 'Midwest shipping $10 flat.'
                    : deliveryZone === 'extended'
                      ? 'Delivery over 10 miles from 55113 is $10.'
                      : 'Delivery within 10 miles of 55113 is free.'}
                </div>
              </div>
              <div className="february-card-total">
                <div className="february-card-total-label">Total</div>
                <div className="february-card-total-value">${formatMoney(totalCents)}</div>
                <div className="february-card-subtitle">
                  ${formatMoney(subtotalCents)} + ${formatMoney(fulfillmentFeeCents)}
                </div>
              </div>
            </div>

            <form className="february-form" onSubmit={handleSubmit}>
              <div className="february-form-grid">
                <div>
                  <label className="form-fun-label" htmlFor="psyche-quantity">Quantity <span className="required-indicator">*</span></label>
                  <select
                    id="psyche-quantity"
                    className="input"
                    value={quantity}
                    onChange={(e) => {
                      const next = Math.min(MAX_QUANTITY, Math.max(1, Number(e.target.value) || 1));
                      setQuantity(next);
                      resetStatus();
                    }}
                  >
                    {Array.from({ length: MAX_QUANTITY }, (_, idx) => {
                      const value = idx + 1;
                      return (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="psyche-name">Name <span className="required-indicator">*</span></label>
                  <input
                    id="psyche-name"
                    className="input"
                    value={customer.name}
                    onChange={(e) => {
                      setCustomer((prev) => ({ ...prev, name: e.target.value }));
                      resetStatus();
                    }}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="psyche-email">Email <span className="required-indicator">*</span></label>
                  <input
                    id="psyche-email"
                    type="email"
                    className="input"
                    value={customer.email}
                    onChange={(e) => {
                      setCustomer((prev) => ({ ...prev, email: e.target.value }));
                      resetStatus();
                    }}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="psyche-phone">Phone <span className="required-indicator">*</span></label>
                  <input
                    id="psyche-phone"
                    type="tel"
                    className="input"
                    value={customer.phone}
                    onChange={(e) => {
                      setCustomer((prev) => ({ ...prev, phone: formatPhone(e.target.value) }));
                      resetStatus();
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="psyche-fulfillment">Fulfillment <span className="required-indicator">*</span></label>
                  <select
                    id="psyche-fulfillment"
                    className="input"
                    value={fulfillment}
                    onChange={(e) => {
                      setFulfillment(e.target.value);
                      resetStatus();
                    }}
                  >
                    <option value="delivery">Delivery (from 55113)</option>
                    <option value="shipping">Midwest shipping ($10 flat)</option>
                  </select>
                </div>
                {fulfillment === 'delivery' && (
                  <div>
                    <label className="form-fun-label" htmlFor="psyche-delivery-zone">Delivery distance <span className="required-indicator">*</span></label>
                    <select
                      id="psyche-delivery-zone"
                      className="input"
                      value={deliveryZone}
                      onChange={(e) => {
                        setDeliveryZone(e.target.value);
                        resetStatus();
                      }}
                    >
                      <option value="local">Within 10 miles of 55113 (free)</option>
                      <option value="extended">Over 10 miles (+$10)</option>
                    </select>
                  </div>
                )}
                <div className="february-form-span">
                  <label className="form-fun-label" htmlFor="psyche-address1">Address <span className="required-indicator">*</span></label>
                  <input
                    id="psyche-address1"
                    className="input"
                    value={address.line1}
                    onChange={(e) => {
                      setAddress((prev) => ({ ...prev, line1: e.target.value }));
                      resetStatus();
                    }}
                    placeholder="Street address"
                    required
                  />
                </div>
                <div className="february-form-span">
                  <input
                    id="psyche-address2"
                    className="input"
                    value={address.line2}
                    onChange={(e) => {
                      setAddress((prev) => ({ ...prev, line2: e.target.value }));
                      resetStatus();
                    }}
                    placeholder="Unit, suite, etc. (optional)"
                  />
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="psyche-city">City <span className="required-indicator">*</span></label>
                  <input
                    id="psyche-city"
                    className="input"
                    value={address.city}
                    onChange={(e) => {
                      setAddress((prev) => ({ ...prev, city: e.target.value }));
                      resetStatus();
                    }}
                    placeholder="Saint Paul"
                    required
                  />
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="psyche-state">State <span className="required-indicator">*</span></label>
                  <input
                    id="psyche-state"
                    className="input"
                    value={address.state}
                    onChange={(e) => {
                      setAddress((prev) => ({ ...prev, state: e.target.value }));
                      resetStatus();
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="psyche-postal">ZIP <span className="required-indicator">*</span></label>
                  <input
                    id="psyche-postal"
                    className="input"
                    value={address.postal}
                    onChange={(e) => {
                      setAddress((prev) => ({ ...prev, postal: formatPostal(e.target.value) }));
                      resetStatus();
                    }}
                    placeholder="55113"
                    required
                  />
                </div>
                <div className="february-form-span">
                  <label className="form-fun-label" htmlFor="psyche-notes">Delivery or shipping notes</label>
                  <textarea
                    id="psyche-notes"
                    className="textarea february-textarea-lg"
                    rows={4}
                    value={deliveryNotes}
                    onChange={(e) => {
                      setDeliveryNotes(e.target.value);
                      resetStatus();
                    }}
                    placeholder="Gate codes, preferred drop-off, etc."
                  />
                </div>
                <div className="february-form-span">
                  <label className="form-fun-label">Payment</label>
                  <div className="february-payment">
                    {/* Express pay (Apple Pay / Google Pay) — shown when available */}
                    <div
                      id="psyche-express-pay"
                      style={{ display: expressPayAvailable ? 'block' : 'none', marginBottom: '0.75rem' }}
                    />
                    {expressPayAvailable && (
                      <div className="february-payment-status" style={{ textAlign: 'center', margin: '0.5rem 0', fontSize: '0.75rem', color: 'var(--color-text-muted, #888)' }}>
                        — or pay with card —
                      </div>
                    )}
                    {/* Manual card form — always rendered so Square can attach */}
                    <div id="psyche-card-container" className="february-card-container" />
                    {loadingScript && <div className="february-payment-status">Loading secure payment form...</div>}
                    {cardError && <div className="february-payment-error">{cardError}</div>}
                  </div>
                </div>
              </div>
              {error && <div className="february-error">{error}</div>}
              <button
                type="submit"
                className="february-submit"
                disabled={!canSubmit() || status === 'submitting' || status === 'success'}
              >
                {status === 'submitting' ? 'Processing...' : `Pay $${formatMoney(totalCents)}`}
              </button>
              <div className="required-note">
                <span className="required-indicator">*</span>Required fields
              </div>
              <div className="february-form-footnote">
                Payments are processed securely by Square. A confirmation email will be sent after purchase.
              </div>
            </form>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PsychePage;
