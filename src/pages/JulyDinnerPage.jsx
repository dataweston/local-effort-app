import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSquareCard } from '../hooks/useSquareCard';
import { useSquareExpressPay } from '../hooks/useSquareExpressPay';
import { getOrCreateCheckoutAttemptId, clearCheckoutAttemptId } from '../lib/checkoutAttemptId';
import { trackEvent } from '../lib/trackEvent';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import LakeMenu from '../components/JulyDinner/LakeMenu';
import ScatterLayer from '../components/JulyDinner/ScatterLayer';
import '../styles/le-checkout.css';
import '../styles/product-grid.css';
import '../styles/july-dinner.css';

// Design direction: src/components/JulyDinner/DESIGN.md

// Fallbacks shown until /api/july-dinner/event responds (server merges Sanity content).
const FALLBACK_EVENT = {
  title: 'Dinner in July',
  dateLabel: 'Friday, July 17, 2026',
  timeLabel: '6:30 in the evening',
  eventDateTime: '2026-07-17T18:30:00-05:00',
  location: 'The Arthouse',
  locationDetails: 'North Minneapolis — full address and arrival details come by email',
  priceCents: 7000,
  capacity: 20,
  buyoutPriceCents: 255000,
  buyoutCapacity: 30,
  maxSeatsPerOrder: 8,
  summary:
    'One long table at the Arthouse in North Minneapolis. A multi-course dinner drawn from what Minnesota farms are pulling out of the ground in the middle of July.',
  included: 'Your seat includes the full multi-course dinner and a non-alcoholic beverage.',
  beverageNote:
    'A non-alcoholic beverage is included with every seat, and there will be plenty more to drink the night of — tell us below what you like.',
  menu: [],
  heroImageUrl: null,
};

// The menu so far — replaced by the Sanity dinnerEvent menu when one exists.
const DEFAULT_DISHES = [
  'green bean casserole',
  'melon and mint',
  'raspberries with yogurt',
  'tomatoes',
  'currant kombucha',
  'mustard green kimchi',
  'ice cream',
  'shiso dolmas',
  'salame',
  'cheesy bread',
  'vanilla tart',
  'dry wit',
];

// Seat stepper is live (1–8 per booking); the seats-remaining counts stay
// hidden for now (client request) — flip to resurface them.
const SHOW_QUANTITY = true;
const SHOW_SEATS_REMAINING = false;

const CONTACT_EMAIL = 'yum@localeffortfood.com';

// Must match BEVERAGE_OPTIONS in api-handlers/july-dinner/_event.js.
const BEVERAGE_OPTIONS = [
  'single glass of wine',
  'single beer',
  'lots of wine',
  'lots of beer',
  'liquor',
  'liquor and cocktails',
  'cocktails and wine',
  'prefer non alcoholic',
  'prefer tea',
  'prefer diet coke',
  'prefer sparkling water',
  'prefer thc',
];

const formatMoney = (cents) =>
  (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plainMoney = (cents) => (cents / 100).toFixed(2); // schema.org / Square want no thousands separator
const isValidEmail = (value) => /.+@.+\..+/.test(value.trim());
const normalizePhone = (value) => value.replace(/\D/g, '').slice(0, 10);
const formatPhone = (value) => {
  const digits = normalizePhone(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const buildEventJsonLd = (event) => ({
  '@context': 'https://schema.org',
  '@type': 'FoodEvent',
  name: `${event.title} — ${SITE_NAME}`,
  description: event.summary,
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  ...(event.eventDateTime ? { startDate: event.eventDateTime } : {}),
  location: {
    '@type': 'Place',
    name: event.location,
    address: { '@type': 'PostalAddress', addressLocality: 'Minneapolis', addressRegion: 'MN', addressCountry: 'US' },
  },
  organizer: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  offers: {
    '@type': 'Offer',
    url: `${SITE_URL}/julydinner`,
    price: plainMoney(event.priceCents),
    priceCurrency: 'USD',
    availability: 'https://schema.org/LimitedAvailability',
  },
});

const JulyDinnerPage = () => {
  const [event, setEvent] = useState(FALLBACK_EVENT);
  const [seatsRemaining, setSeatsRemaining] = useState(null); // null = loading
  const [soldOut, setSoldOut] = useState(false);
  const [bookingType, setBookingType] = useState('seats'); // 'seats' | 'buyout'
  const [quantity, setQuantity] = useState(SHOW_QUANTITY ? 2 : 1);
  const [partySize, setPartySize] = useState(12);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [beverageInterests, setBeverageInterests] = useState([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [musicPreferences, setMusicPreferences] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);
  const [confirmed, setConfirmed] = useState(null); // { bookingType, quantity, partySize }
  const [showCheckout, setShowCheckout] = useState(false);
  const [artistOpen, setArtistOpen] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [shopProducts, setShopProducts] = useState(null); // null = not fetched
  const [mapReady, setMapReady] = useState(false); // Google embed loads on first hover/focus

  // Modals: lock the page scroll and close on Escape.
  const anyModal = showCheckout || showShop;
  useEffect(() => {
    if (!anyModal) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowCheckout(false);
        setShowShop(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [anyModal]);

  // Shop products load once, the first time the shop opens (sale-page source).
  useEffect(() => {
    if (!showShop || shopProducts !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/store/products?store=sale');
        const data = res.ok ? await res.json() : null;
        if (!cancelled) setShopProducts(Array.isArray(data?.products) ? data.products.slice(0, 8) : []);
      } catch {
        if (!cancelled) setShopProducts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [showShop, shopProducts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/july-dinner/event');
        const data = res.ok ? await res.json() : null;
        if (cancelled || !data?.ok) return;
        setEvent((prev) => ({ ...prev, ...data.event }));
        setSeatsRemaining(data.seatsRemaining);
        setSoldOut(Boolean(data.soldOut || data.cancelled));
        setQuantity((q) => Math.max(1, Math.min(q, data.seatsRemaining || 1)));
      } catch {
        // keep fallbacks; checkout still validates server-side
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const isBuyout = bookingType === 'buyout';
  const maxSeats = Math.min(
    event.maxSeatsPerOrder || 8,
    seatsRemaining === null ? event.capacity : Math.max(0, seatsRemaining)
  );
  // Buying out the night only works while the table is still empty.
  const buyoutAvailable = seatsRemaining === null || seatsRemaining >= event.capacity;
  const totalCents = isBuyout ? event.buyoutPriceCents : event.priceCents * quantity;
  const seatWord = quantity === 1 ? 'seat' : 'seats';

  const dishes = useMemo(
    () =>
      Array.isArray(event.menu) && event.menu.length > 0
        ? event.menu.map((item) => item.course).filter(Boolean)
        : DEFAULT_DISHES,
    [event.menu]
  );

  const { cardLoaded, error: cardError, loadingScript, tokenize, verifyBuyer } = useSquareCard(
    '#july-dinner-card-container',
    showCheckout && !soldOut,
    [showCheckout, soldOut]
  );

  const checkoutAttemptRef = useRef('');
  const attemptStorageKey = 'le:checkoutAttempt:july-dinner';

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

  const submitCheckout = useCallback(async (payload) => {
    const checkoutAttemptId = resolveCheckoutAttemptId();
    const response = await fetch('/api/july-dinner/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        checkoutAttemptId,
        bookingType,
        quantity,
        partySize: isBuyout ? partySize : undefined,
        customer,
        beverageInterests,
        dietaryRestrictions,
        musicPreferences,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (typeof data?.seatsRemaining === 'number') {
        setSeatsRemaining(data.seatsRemaining);
        if (data.seatsRemaining <= 0) setSoldOut(true);
      }
      throw new Error(data?.error || 'Payment failed.');
    }
    trackEvent('order.placed', { store: 'july-dinner', sessionId: checkoutAttemptId, paymentId: data?.paymentId, bookingType });
    setPaymentId(data?.paymentId || '');
    setEmailStatus(data?.emailStatus || null);
    setConfirmed({ bookingType, quantity, partySize });
    if (typeof data?.seatsRemaining === 'number') setSeatsRemaining(data.seatsRemaining);
    setStatus('success');
    clearCheckoutAttempt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingType, quantity, partySize, customer, beverageInterests, dietaryRestrictions, musicPreferences, isBuyout]);

  const validationMessage = useCallback(() => {
    if (soldOut) return 'This dinner is sold out.';
    if (isBuyout && !buyoutAvailable) return 'Some seats are already spoken for, so the whole night is no longer available — a few seats still are.';
    if (!isBuyout && maxSeats < 1) return 'This dinner is sold out.';
    if (!customer.name.trim()) return 'Add your name so we know whose seat this is.';
    if (!isValidEmail(customer.email)) return 'Add your email — all the details arrive there.';
    if (normalizePhone(customer.phone).length !== 10) return 'Add a phone number in case we need to reach you the day of.';
    if (beverageInterests.length === 0) return 'Pick at least one beverage interest — it tells us what to have waiting.';
    return '';
  }, [soldOut, isBuyout, buyoutAvailable, maxSeats, customer, beverageInterests]);

  // Express pay (Apple Pay / Google Pay)
  const handleExpressToken = useCallback(async (token) => {
    if (status === 'submitting') return;
    const problem = validationMessage();
    if (problem) {
      setError(`${problem} Then tap the express pay button again.`);
      return;
    }
    trackEvent('express_pay.used', { store: 'july-dinner' });
    setError('');
    setStatus('submitting');
    try {
      await submitCheckout({ token });
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Unable to complete purchase.');
    }
  }, [status, validationMessage, submitCheckout]);

  const { googlePayAvailable, applePayAvailable } = useSquareExpressPay({
    amountCents: totalCents,
    containerId: '#july-dinner-express-pay',
    enabled: showCheckout && status !== 'success' && !soldOut,
    onToken: handleExpressToken,
  });
  const expressPayAvailable = googlePayAvailable || applePayAvailable;

  useEffect(() => {
    if (expressPayAvailable) trackEvent('express_pay.shown', { store: 'july-dinner' });
  }, [expressPayAvailable]);

  const resetStatus = () => {
    if (status !== 'idle') {
      setStatus('idle');
      setError('');
    }
  };

  const stepQuantity = (direction) => {
    setQuantity((q) => Math.max(1, Math.min(maxSeats || 1, q + direction)));
    resetStatus();
  };

  const stepPartySize = (direction) => {
    setPartySize((p) => Math.max(1, Math.min(event.buyoutCapacity || 30, p + direction)));
    resetStatus();
  };

  const toggleBeverage = (option) => {
    setBeverageInterests((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
    resetStatus();
  };

  const canSubmit = () => !validationMessage() && cardLoaded;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'submitting') return;
    setError('');
    const problem = validationMessage();
    if (problem) {
      setError(problem);
      return;
    }
    setStatus('submitting');
    const checkoutAttemptId = resolveCheckoutAttemptId();
    trackEvent('payment.attempted', { store: 'july-dinner', sessionId: checkoutAttemptId, amountCents: totalCents, bookingType });
    try {
      const token = await tokenize();
      const nameParts = customer.name.trim().split(' ');
      const verificationToken = await verifyBuyer(token, {
        amount: plainMoney(totalCents),
        currencyCode: 'USD',
        intent: 'CHARGE',
        billingContact: {
          givenName: nameParts[0] || undefined,
          familyName: nameParts.slice(1).join(' ') || undefined,
          email: customer.email || undefined,
          phone: customer.phone || undefined,
          countryCode: 'US',
        },
      });
      await submitCheckout({ token, verificationToken });
    } catch (err) {
      trackEvent('payment.failed', { store: 'july-dinner', reason: err?.message });
      setStatus('error');
      setError(err?.message || 'Unable to complete purchase.');
    }
  };

  const seatsLabel =
    seatsRemaining === null
      ? `${event.capacity} seats`
      : soldOut || seatsRemaining <= 0
        ? 'sold out'
        : `${seatsRemaining} of ${event.capacity} seats left`;

  return (
    <div className="july-dinner-page">
      <Helmet>
        <title>Local Effort Cooperative Serves Summer — Tickets | {SITE_NAME}</title>
        <meta
          name="description"
          content={`${event.summary} $${formatMoney(event.priceCents)} per seat, ${event.capacity} seats total. Non-alcoholic beverage included.`}
        />
        <link rel="canonical" href={`${SITE_URL}/julydinner`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/julydinner`} />
        <meta property="og:title" content={`Local Effort Cooperative Serves Summer — Tickets | ${SITE_NAME}`} />
        <meta property="og:description" content={event.summary} />
        {event.heroImageUrl && <meta property="og:image" content={event.heroImageUrl} />}
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(buildEventJsonLd(event))}</script>
      </Helmet>

      {/* The photo layer is anchored to this upper block so snapshots hold
          their ground when the checkout appears below. */}
      <div className="jd-upper">
      <ScatterLayer />

      <a className="jd-back" href="/">← local effort</a>

      {/* ── The lake, with the hero on its north-east shore ── */}
      <section className="jd-scene" aria-label="Dinner in July — the menu so far">
        <header className="jd-hero">
          <h1 className="jd-title">Local Effort Cooperative Serves Summer</h1>
          <p className="jd-when">
            {event.dateLabel} ·{' '}
            <a
              className="jd-place-link"
              href="https://www.thearthouse.events"
              target="_blank"
              rel="noopener noreferrer"
            >
              The Arthouse
            </a>
            ,{' '}
            <span
              className="jd-map-wrap"
              onPointerEnter={() => setMapReady(true)}
              onFocus={() => setMapReady(true)}
            >
              <a
                className="jd-place-link"
                href="https://www.google.com/maps/search/?api=1&query=4400+Lyndale+Ave+N,+Minneapolis,+MN"
                target="_blank"
                rel="noopener noreferrer"
              >
                North Minneapolis
              </a>
              <span className="jd-map-preview" aria-hidden="true">
                {mapReady && (
                  <iframe
                    title="Map: 4400 Lyndale Ave N, Minneapolis"
                    src="https://www.google.com/maps?q=4400+Lyndale+Ave+N,+Minneapolis,+MN&output=embed"
                    loading="lazy"
                  />
                )}
              </span>
            </span>
          </p>
          <p className="jd-terms">
            ${formatMoney(event.priceCents)} a seat{SHOW_SEATS_REMAINING ? ` · ${seatsLabel}` : ''} · {event.timeLabel}
          </p>
          <p className="jd-lede">
            the popup form finally collapses into an endless stream of ingredients, mise, little
            ideas and highlights from meal prep. we'll feature mountains of flowers and herbs from
            Nissa Inselman-Field from Otsego, and from HAFA in Hastings, plus fresh dairy from
            Autumnwood in Forest Lake, sparkling botanicals from Peder Schweigert, and probably
            some meat too.
          </p>
          <button
            type="button"
            className="jd-buy"
            onClick={() => setShowCheckout(true)}
          >
            buy tickets
          </button>

          <p className="jd-hint">psst — the photos are loose. drag them anywhere.</p>
          <button
            type="button"
            className="jd-artist-link"
            aria-expanded={artistOpen}
            onClick={() => setArtistOpen((v) => !v)}
          >
            illustrate for a worker owned cooperative
          </button>
          {artistOpen && (
            <p className="jd-artist-copy">
              drawings for equity? we're looking for an artist or collective to contribute the
              visual story to our growing effort. make a huge impact and keep a piece of it.{' '}
              email <a href="mailto:dataweston@gmail.com">Weston</a>.
            </p>
          )}
        </header>

        <LakeMenu dishes={dishes} onShop={() => setShowShop(true)} />
      </section>

      <p className="jd-lake-caption">the menu so far —</p>
      </div>

      {/* ── The booking: a near-fullpage popup ── */}
      {showCheckout && (
      <div className="jd-modal" role="dialog" aria-modal="true" aria-label="Tickets">
        <div className="jd-modal-backdrop" onClick={() => setShowCheckout(false)} />
        <section id="book" className="jd-book jd-modal-panel">
        <button
          type="button"
          className="jd-modal-close"
          onClick={() => setShowCheckout(false)}
          aria-label="Close"
        >
          ×
        </button>
        <div className="jd-book-panel">
          {status === 'success' && confirmed ? (
            <div className="jd-done">
              <div className="jd-done-ripple" aria-hidden="true"><span /><span /><span /></div>
              <h2 className="jd-done-title">You're on the lake</h2>
              <p className="jd-done-copy">
                {confirmed.bookingType === 'buyout'
                  ? `The whole night at ${event.location} is yours — up to ${confirmed.partySize} of you.`
                  : `${confirmed.quantity} ${confirmed.quantity === 1 ? 'seat' : 'seats'} confirmed for ${event.title}.`}{' '}
                A confirmation with everything you need — where to go, when to arrive, what to
                expect — is on its way to {customer.email}. A reminder with the exact address
                follows a few days before the dinner.
              </p>
              {paymentId && <div className="jd-done-meta">Payment ID: {paymentId}</div>}
              {emailStatus?.customer === false && (
                <div className="jd-error">We could not send the confirmation email. Please write to {CONTACT_EMAIL}.</div>
              )}
            </div>
          ) : soldOut || (seatsRemaining !== null && seatsRemaining <= 0) ? (
            <div className="jd-done">
              <div className="jd-done-ripple" aria-hidden="true"><span /><span /><span /></div>
              <h2 className="jd-done-title">Sold out</h2>
              <p className="jd-done-copy">
                All {event.capacity} seats for {event.title} are spoken for.
                Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to join the
                waitlist — we reach out first if a seat opens up.
              </p>
            </div>
          ) : (
            <form className="le-checkout-form" onSubmit={handleSubmit} noValidate>
              <h2 className="jd-book-title">Tickets</h2>

              {/* How many */}
              <fieldset className="jd-fieldset">
                <legend className="jd-h">How many of you?</legend>
                <div className="jd-modes" role="group" aria-label="Booking type">
                  <button
                    type="button"
                    className="jd-mode"
                    aria-pressed={!isBuyout}
                    onClick={() => { setBookingType('seats'); resetStatus(); }}
                  >
                    A few seats
                  </button>
                  <button
                    type="button"
                    className="jd-mode"
                    aria-pressed={isBuyout}
                    onClick={() => { setBookingType('buyout'); resetStatus(); }}
                    disabled={!buyoutAvailable}
                    title={buyoutAvailable ? undefined : 'Some seats are already sold'}
                  >
                    Buy it Out
                  </button>
                </div>

                {isBuyout ? (
                  <>
                    <p className="jd-mode-note">
                      The room, the table, the kitchen, and the evening are yours — up to{' '}
                      {event.buyoutCapacity} people for ${formatMoney(event.buyoutPriceCents)},
                      food and service included. Beverages are arranged separately.
                    </p>
                    <div className="jd-stepper">
                      <button type="button" className="jd-step-btn" onClick={() => stepPartySize(-1)} disabled={partySize <= 1 || status === 'submitting'} aria-label="Fewer people">−</button>
                      <span className="jd-step-count" aria-live="polite">{partySize}</span>
                      <button type="button" className="jd-step-btn" onClick={() => stepPartySize(1)} disabled={partySize >= (event.buyoutCapacity || 30) || status === 'submitting'} aria-label="More people">+</button>
                      <span className="jd-step-note">roughly how many are coming — you can firm it up later</span>
                    </div>
                  </>
                ) : SHOW_QUANTITY ? (
                  <div className="jd-stepper">
                    <button type="button" className="jd-step-btn" onClick={() => stepQuantity(-1)} disabled={quantity <= 1 || status === 'submitting'} aria-label="Fewer seats">−</button>
                    <span className="jd-step-count" aria-live="polite">{quantity}</span>
                    <button type="button" className="jd-step-btn" onClick={() => stepQuantity(1)} disabled={quantity >= maxSeats || status === 'submitting'} aria-label="More seats">+</button>
                    <span className="jd-step-note">
                      ${formatMoney(event.priceCents)} each · up to {event.maxSeatsPerOrder || 8} per booking{SHOW_SEATS_REMAINING ? ` · ${seatsLabel}` : ''}
                    </span>
                  </div>
                ) : (
                  <p className="jd-mode-note">${formatMoney(event.priceCents)} a seat.</p>
                )}
              </fieldset>

              {/* Who */}
              <fieldset className="jd-fieldset">
                <legend className="jd-h">Who should we look for?</legend>
                <div className="le-checkout-field">
                  <label className="le-checkout-label" htmlFor="jd-name">Name</label>
                  <input
                    id="jd-name"
                    className="le-checkout-input"
                    value={customer.name}
                    onChange={(e) => { setCustomer((prev) => ({ ...prev, name: e.target.value })); resetStatus(); }}
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="le-checkout-field">
                  <label className="le-checkout-label" htmlFor="jd-email">Email</label>
                  <input
                    id="jd-email"
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
                  <label className="le-checkout-label" htmlFor="jd-phone">Phone</label>
                  <input
                    id="jd-phone"
                    type="tel"
                    className="le-checkout-input"
                    value={customer.phone}
                    onChange={(e) => { setCustomer((prev) => ({ ...prev, phone: formatPhone(e.target.value) })); resetStatus(); }}
                    placeholder="(612) 555-0123"
                    autoComplete="tel"
                    required
                  />
                </div>
              </fieldset>

              {/* Beverages (required) */}
              <fieldset className="jd-fieldset">
                <legend className="jd-h">
                  Dinner includes a few non-alcoholic drinks. What else would you want to be drinking?{' '}
                  <span className="jd-opt">pick all that apply</span>
                </legend>
                <div className="jd-chips" role="group" aria-label="Beverage interests">
                  {BEVERAGE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="jd-chip"
                      aria-pressed={beverageInterests.includes(option)}
                      onClick={() => toggleBeverage(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Optional notes */}
              <fieldset className="jd-fieldset">
                <legend className="jd-h">Anything we should know? <span className="jd-opt">optional</span></legend>
                <div className="le-checkout-field">
                  <label className="le-checkout-label" htmlFor="jd-dietary">Allergies & dietary notes</label>
                  <textarea
                    id="jd-dietary"
                    className="le-checkout-textarea"
                    rows={2}
                    value={dietaryRestrictions}
                    onChange={(e) => { setDietaryRestrictions(e.target.value); resetStatus(); }}
                    placeholder="Anything we should cook around?"
                  />
                </div>
                <div className="le-checkout-field">
                  <label className="le-checkout-label" htmlFor="jd-music">Music you'd love to hear</label>
                  <input
                    id="jd-music"
                    className="le-checkout-input"
                    value={musicPreferences}
                    onChange={(e) => { setMusicPreferences(e.target.value); resetStatus(); }}
                    placeholder="A record, an artist, a mood…"
                  />
                </div>
              </fieldset>

              {/* Payment */}
              <fieldset className="jd-fieldset">
                <legend className="jd-h">Payment</legend>
                <div className="le-checkout-payment">
                  <div
                    id="july-dinner-express-pay"
                    className="le-checkout-express"
                    style={{ display: expressPayAvailable ? 'block' : 'none' }}
                  />
                  {expressPayAvailable && (
                    <div className="le-checkout-express-divider">or pay with card</div>
                  )}
                  <div className="le-checkout-card-container">
                    <div id="july-dinner-card-container" />
                  </div>
                  {loadingScript && (
                    <div className="le-checkout-card-loading">Loading secure payment form…</div>
                  )}
                  {cardError && <div className="jd-error">{cardError}</div>}
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
              </fieldset>

              <div className="jd-total">
                <div>
                  <div className="jd-total-value">${formatMoney(totalCents)}</div>
                  <div className="jd-total-breakdown">
                    {isBuyout
                      ? `the whole night · up to ${event.buyoutCapacity} people`
                      : SHOW_QUANTITY
                        ? `${quantity} ${seatWord} × $${formatMoney(event.priceCents)}`
                        : 'one seat at the table'}
                  </div>
                </div>
              </div>

              {error && <div className="jd-error" role="alert">{error}</div>}

              <button
                type="submit"
                className="jd-submit"
                disabled={!canSubmit() || status === 'submitting'}
              >
                {status === 'submitting'
                  ? 'Setting your place…'
                  : isBuyout
                    ? `Buy it out — $${formatMoney(event.buyoutPriceCents)}`
                    : SHOW_QUANTITY
                      ? `Reserve ${quantity} ${seatWord} — $${formatMoney(totalCents)}`
                      : `Reserve your seat — $${formatMoney(totalCents)}`}
              </button>

              <p className="jd-footnote">
                Instant confirmation by email, with every detail you need. Questions? Reply to it — a human answers.
              </p>
            </form>
          )}
        </div>
        </section>
      </div>
      )}

      {/* ── The shop: sale-page products, sale-page look ── */}
      {showShop && (
      <div className="jd-modal" role="dialog" aria-modal="true" aria-label="Shop">
        <div className="jd-modal-backdrop" onClick={() => setShowShop(false)} />
        <section className="jd-shop jd-modal-panel">
          <button
            type="button"
            className="jd-modal-close"
            onClick={() => setShowShop(false)}
            aria-label="Close"
          >
            ×
          </button>
          <div className="jd-shop-panel">
            <h2 className="jd-shop-title">from the shop</h2>
            {shopProducts === null ? (
              <p className="jd-shop-loading">setting the shelf…</p>
            ) : shopProducts.length === 0 ? (
              <p className="jd-shop-loading">the shelf is bare right now — the store has more.</p>
            ) : (
              <ul className="le-grid jd-shop-grid">
                {shopProducts.map((product) => (
                  <li key={product.id || product.slug} className="le-grid-item">
                    <a className="le-tile" href={product.slug ? `/product/${product.slug}` : '/sale'}>
                      <span className="le-tile-image-wrap">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            loading="lazy"
                            className="le-tile-image"
                          />
                        ) : (
                          <span className="le-tile-image-placeholder" aria-hidden="true" />
                        )}
                      </span>
                      <span className="le-tile-meta">
                        <span />
                        <span className="le-tile-price">
                          {product.priceDisplay || `$${(((product.salePrice ?? product.price) || 0) / 100).toFixed(2)}`}
                        </span>
                      </span>
                      <span className="le-tile-copy">
                        <span className="le-tile-title">{product.title}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <a className="jd-shop-more" href="/sale">open the store →</a>
          </div>
        </section>
      </div>
      )}

      <footer className="jd-coda">
        local ingredients and cooperative ownership. — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </footer>
    </div>
  );
};

export default JulyDinnerPage;
