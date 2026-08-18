import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useSquareCard } from '../hooks/useSquareCard';
import { getOrCreateCheckoutAttemptId, clearCheckoutAttemptId } from '../lib/checkoutAttemptId';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import '../styles/fullpage-demo-theme.css';
import '../styles/home-tabs.css';
import '../styles/service-page.css';
import '../styles/pizza-party.css';

const PIZZA_FAQ = [
  {
    q: 'What pizzas does this include?',
    a: 'We have signature favourites we make every time, and we are happy to take requests. Tell us what your people like when we confirm the date.',
  },
  {
    q: 'Does it include anything besides pizza?',
    a: 'This offer is pizza only, but it is easy to build out — salads, sides, and dessert can all be added. Ask and we will price it.',
  },
  {
    q: 'What kind of pizza do you make?',
    a: 'Minnesotan-style. Sort of Neapolitan, sort of New York. Puffy, crispy, chewy crusts. It is our own thing.',
  },
];

// Fetch up to 8 images tagged 'pizza' using existing API (uses tag expansion logic)
async function fetchPizzaImages(setter, setError, setLoading) {
  try {
    const res = await fetch('/api/search-images?query=pizza&per_page=8');
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    setter(Array.isArray(data.images) ? data.images : []);
  } catch (e) {
    console.error('Failed to load pizza images', e);
    setError(e.message || 'Error loading images');
  } finally {
    setLoading(false);
  }
}

const PIZZA_PARTY_DATES = [
  { label: 'Oct 2', isoDate: '2024-10-02' },
  { label: 'Oct 3', isoDate: '2024-10-03' },
  { label: 'Oct 4', isoDate: '2024-10-04' },
  { label: 'Oct 9', isoDate: '2024-10-09' },
  { label: 'Oct 10', isoDate: '2024-10-10' },
  { label: 'Oct 11', isoDate: '2024-10-11' },
  { label: 'Oct 16', isoDate: '2024-10-16' },
  { label: 'Oct 17', isoDate: '2024-10-17' }
];

const SOLD_OUT_OVERRIDES = ['Oct 2', 'Oct 3', 'Oct 4'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toLocalDate = (isoDate) => {
  if (!isoDate) return null;
  const parts = isoDate.split('-').map((part) => parseInt(part, 10));
  if (parts.length !== 3 || parts.some((val) => Number.isNaN(val))) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const formatDateLabel = (isoDate, fallbackLabel) => {
  const dateObj = toLocalDate(isoDate);
  if (!dateObj) return fallbackLabel || isoDate;
  return `${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getDate()}`;
};

const DISPLAY_YEAR = 2025; // Limit the public schedule to the 2025 season.

const projectDateToYear = (isoDate, targetYear) => {
  const baseDate = toLocalDate(isoDate);
  if (!baseDate) return null;

  const projected = new Date(baseDate);
  projected.setHours(0, 0, 0, 0);
  projected.setFullYear(targetYear);

  return projected;
};

// NOTE: Replaced custom embedded payment logic with shared useSquareCard hook.

const PizzaPartyPage = () => {
  // SEO canonical (update if production domain differs)
  const canonical = `${SITE_URL}/pizza-party`;
  const siteName = SITE_NAME;
  const pageTitle = 'Book Your Pizza Party - Pay a Deposit | Local Effort';
  const pageDescription = 'Pay a deposit to book your pizza party. $75 deposit reserves your date. Estimated $450 for parties of 15 guests with premium wood-fired pizza and local ingredients.';

  // Build Event JSON-LD from scheduled dates (Central time).
  const startOfToday = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const upcomingDates = PIZZA_PARTY_DATES
    .map((entry) => {
      const projectedDate = projectDateToYear(entry.isoDate, DISPLAY_YEAR);
      if (!projectedDate || projectedDate < startOfToday) return null;
      const isoDate = projectedDate.toISOString().slice(0, 10);
      const label = entry.label || formatDateLabel(isoDate, entry.label);
      return {
        ...entry,
        label,
        isoDate,
        dateObj: projectedDate,
        weekday: projectedDate.toLocaleDateString('en-US', { weekday: 'short' })
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.dateObj && b.dateObj ? a.dateObj - b.dateObj : 0));

  const availabilityYears = Array.from(new Set(upcomingDates.map((entry) => entry.dateObj?.getFullYear()).filter(Boolean)));
  const availabilityMonthLabel = upcomingDates.length ? upcomingDates[0].dateObj.toLocaleString('en-US', { month: 'long' }) : 'Upcoming';
  const availabilityYearLabel = availabilityYears.length === 0 ? String(new Date().getFullYear()) : availabilityYears.join(' / ');

  const eventStartHour = '17:00:00'; // 5pm placeholder
  const timezoneOffset = '-05:00'; // CDT (adjust for DST if needed)
  const eventsSchema = upcomingDates.map(({ isoDate }) => ({
    '@type': 'Event',
    name: 'Private Mobile Pizza Party',
    description: 'On-site artisanal wood-fired pizza experience (up to 15 guests). $75 deposit to book.',
    startDate: `${isoDate}T${eventStartHour}${timezoneOffset}`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: 'Client Provided Location',
      address: { '@type': 'PostalAddress', addressRegion: 'MN', addressCountry: 'US' }
    },
    organizer: { '@type': 'Organization', name: siteName, url: canonical.replace('/pizza-party','/') },
    offers: {
      '@type': 'Offer',
      price: '75',
      priceCurrency: 'USD',
      availability: 'https://schema.org/LimitedAvailability',
      url: canonical,
      validFrom: new Date().toISOString()
    }
  }));

  const serviceSchema = {
    '@type': 'Service',
    name: 'Pizza Party Booking - Deposit Required',
    description: pageDescription,
    provider: {
      '@type': 'LocalBusiness',
      name: siteName,
      areaServed: { '@type': 'Place', name: 'Minnesota' }
    },
    offers: {
      '@type': 'Offer',
      price: '75',
      priceCurrency: 'USD',
      description: '$75 deposit to reserve your date. Estimated $450 for parties of 15 guests.'
    },
    category: 'Catering',
    additionalType: 'https://schema.org/FoodEstablishment'
  };

  const breadcrumbSchema = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: canonical.replace('/pizza-party','/') },
      { '@type': 'ListItem', position: 2, name: 'Pizza Party', item: canonical }
    ]
  };

  const jsonLd = [serviceSchema, ...eventsSchema, breadcrumbSchema];

  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingState, setBookingState] = useState({}); // date => {loading,error,success,paymentId}
  const [soldOutDates, setSoldOutDates] = useState(() => new Set(SOLD_OUT_OVERRIDES));
  // Only initialize Square when modal is open (reduces race with container not yet in DOM)
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const squareEnabled = showModal; // we initialize after modal mounts
  const { cardLoaded, error: cardError, loadingScript, tokenize, verifyBuyer, reset, envInfo } = useSquareCard('#pp-card-container', squareEnabled, [squareEnabled]);
  const checkoutAttemptRef = useRef('');
  const attemptStorageKey = 'le:checkoutAttempt:pizza-party';
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
  const [bookedDate, setBookedDate] = useState(null);
  const [justBooked, setJustBooked] = useState(false); // differentiate newly booked success for banner animation
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: 'MN', postal: '' });
  const [mealTime, setMealTime] = useState('5:00 PM');
  const [pizzaRequests, setPizzaRequests] = useState('');
  const [addOnEnabled, setAddOnEnabled] = useState(false);
  const [guestCount, setGuestCount] = useState(10);
  const [submitting, setSubmitting] = useState(false); // prevent rapid double submit
  const isValidEmail = (val) => /.+@.+\..+/.test(val.trim());
  // Phone / postal formatting utilities
  const formatPhone = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  };
  const isValidPhone = (val) => val.replace(/\D/g,'').length === 10;
  const formatPostal = (val) => val.replace(/[^0-9]/g,'').slice(0,5);
  const isValidAddress = (a) => a.line1.trim().length > 3 && a.city.trim().length > 1 && a.postal.trim().length >= 5;

  const basePrice = 75; // Deposit amount
  // Estimated total mirrors the pizza costing in the small-events estimator
  // (backend/api/routes/smallEvents.js → SMALL_EVENT_CONFIG.pizza). Keep in sync.
  const PIZZA_PRICING = {
    baseRate: 55,
    baseRateFloor: 38,
    baseRateTaperPerGuest: 0.6,
    minGuests: 4,
    minimumTotal: 850,
    staffingGuestsPer: 8,
    staffingHourly: 45,
    staffingHours: 4,
    rangeMid: 1.0, // midpoint of rangeMin 0.9 / rangeMax 1.2
  };
  const estimatePizzaTotal = (guests) => {
    const g = Math.max(0, Number(guests) || 0);
    if (!g) return 0;
    const over = Math.max(0, g - PIZZA_PRICING.minGuests);
    const perGuest = Math.max(
      PIZZA_PRICING.baseRateFloor,
      PIZZA_PRICING.baseRate - PIZZA_PRICING.baseRateTaperPerGuest * over,
    );
    const staffCount = Math.max(1, Math.ceil(g / PIZZA_PRICING.staffingGuestsPer));
    const staffing = staffCount * PIZZA_PRICING.staffingHourly * PIZZA_PRICING.staffingHours;
    const subtotal = Math.max(g * perGuest + staffing, PIZZA_PRICING.minimumTotal);
    return Math.round(subtotal * PIZZA_PRICING.rangeMid);
  };
  const estimatedTotal = estimatePizzaTotal(guestCount);
  const addOnTotal = addOnEnabled ? guestCount * 9 : 0;
  const grandTotal = basePrice + addOnTotal;

  useEffect(() => {
    let active = true;
    fetchPizzaImages((imgs) => { if (active) setImages(imgs); }, (err) => active && setError(err), (val) => active && setLoading(val));
    
    // Fetch available pizza party dates from calendar
    const fetchCalendarDates = async () => {
      try {
        const res = await fetch('/api/calendar/events?event_type=pizza_party&visibility=public&status=scheduled');
        if (res.ok) {
          const events = await res.json();
          // Transform calendar events to match expected format
          const calendarDates = events
            .filter(e => e.is_bookable && e.start_date)
            .map(e => ({
              label: new Date(e.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              isoDate: e.start_date,
            }));
          // For now, still use hardcoded dates if no calendar dates available
          // TODO: Fully transition to calendar-only dates
          if (calendarDates.length > 0) {
            // Calendar dates loaded successfully
          }
        }
      } catch (err) {
        console.warn('Failed to load calendar dates, using fallback:', err);
      }
    };
    
    fetchCalendarDates();
    return () => { active = false; };
  }, []);


  useEffect(() => {
    let mounted = true;
    const loadAvailability = async () => {
      try {
        const res = await fetch('/api/store/pizza-party-status');
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (!mounted || !data?.soldOutDates) return;
        setSoldOutDates((prev) => {
          const next = new Set(prev);
          data.soldOutDates.filter(Boolean).forEach((label) => next.add(label));
          return next;
        });
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[pizza-party] availability load failed', err);
        }
      }
    };
    loadAvailability();
    const timer = setInterval(loadAvailability, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (selectedDate && soldOutDates.has(selectedDate)) {
      setSelectedDate(null);
    }
  }, [selectedDate, soldOutDates]);

  // Google Places Autocomplete (optional if key provided in global or env)
  useEffect(() => {
    if (!showModal) return; // only when modal open to reduce overhead
    const apiKey = window.GOOGLE_PLACES_KEY || import.meta?.env?.VITE_GOOGLE_PLACES_KEY;
    if (!apiKey) return; // silently skip
    const existing = document.querySelector('script[data-gplaces]');
    if (existing) return; // assume loaded
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__lpPlacesInit`;
    s.async = true;
    s.dataset.gplaces = 'true';
    window.__lpPlacesInit = () => {
      try {
        const input = document.querySelector('#pp-address-line1');
        if (!input || !window.google || !window.google.maps) return;
        const ac = new window.google.maps.places.Autocomplete(input, { types: ['address'], componentRestrictions: { country: 'us' } });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place || !Array.isArray(place.address_components)) return;
          const comp = (type) => place.address_components.find(c => c.types.includes(type))?.long_name || '';
          const streetNumber = comp('street_number');
          const route = comp('route');
          const locality = comp('locality') || comp('sublocality') || '';
            const admin = comp('administrative_area_level_1') || '';
          const postal = comp('postal_code') || '';
          setAddress(a => ({
            ...a,
            line1: [streetNumber, route].filter(Boolean).join(' ') || a.line1,
            city: locality || a.city,
            state: admin || a.state,
            postal: postal || a.postal,
          }));
        });
      } catch (_) { /* ignore */ }
    };
    document.head.appendChild(s);
  return () => { try { delete window.__lpPlacesInit; } catch (_) { /* ignore cleanup */ } };
  }, [showModal]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const b = params.get('booked');
    if (b) {
      setBookedDate(b);
      // remove query param without reload
      params.delete('booked');
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const openModal = (date) => {
    // force a fresh mount each time modal opens
    try {
      if (typeof reset === 'function') {
        reset();
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[pizza-party] failed to reset payment form', err);
      }
    }
    setShowModal(true);
    setSelectedDate(date);
  };
  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setEmail('');
    setAddOnEnabled(false);
    setGuestCount(10);
    clearCheckoutAttempt();
  };
  const submitBooking = async () => {
    if (!selectedDate) return;
    if (submitting) return; // guard
    // basic validation
    if (!fullName.trim() || !isValidEmail(email) || !isValidPhone(phone) || !isValidAddress(address)) {
      setBookingState(s => ({ ...s, [selectedDate]: { ...(s[selectedDate]||{}), error: 'Please complete required contact & address fields.' } }));
      return;
    }
    setSubmitting(true);
    const date = selectedDate;
    // optimistic: mark loading
    setBookingState(s => ({ ...s, [date]: { loading: true } }));
    try {
      let token;
      try { token = await tokenize(); } catch (e) { throw new Error(e?.message || 'Card not ready'); }
      const basePriceCents = 30000;
      const addOnPricePerGuestCents = 900;
      const guestsInt = addOnEnabled ? guestCount : 0;
      const amountCents = basePriceCents + (guestsInt > 0 ? guestsInt * addOnPricePerGuestCents : 0);
      const nameParts = fullName.trim().split(' ');
      const verificationDetails = {
        amount: (amountCents / 100).toFixed(2),
        currencyCode: 'USD',
        intent: 'CHARGE',
        billingContact: {
          givenName: nameParts[0] || undefined,
          familyName: nameParts.slice(1).join(' ') || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          addressLines: [address?.line1, address?.line2].filter(Boolean),
          city: address?.city || undefined,
          state: address?.state || undefined,
          postalCode: address?.postal || undefined,
          countryCode: 'US',
        },
      };
      const verificationToken = await verifyBuyer(token, verificationDetails);
      const checkoutAttemptId = resolveCheckoutAttemptId();
      const res = await fetch('/api/store/pizza-party-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date,
          email: email.trim(),
            name: fullName.trim(),
            phone: phone.trim(),
            address,
            mealTime,
          pizzaRequests,
          addOnGuests: addOnEnabled ? guestCount : 0,
          token,
          verificationToken,
          checkoutAttemptId,
          basePriceCents,
          addOnPricePerGuestCents
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      setBookingState(s => ({ ...s, [date]: { loading: false, success: true, paymentId: data.paymentId } }));
      setBookedDate(date);
      setJustBooked(true);
      closeModal();
      clearCheckoutAttempt();
      // Fire-and-forget receipt email
      try {
        fetch('/api/store/pizza-party-receipt', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ paymentId: data.paymentId, date, email: email.trim(), addOnGuests: addOnEnabled ? guestCount : 0 })
        }).catch(() => {});
      } catch (_) { /* ignore */ }
      setTimeout(() => setJustBooked(false), 6000);
    } catch (e) {
      // Retire the attempt id so a retry is a new payment rather than a replay
      // of the cached decline under the same idempotency key.
      clearCheckoutAttempt();
      setBookingState(s => ({ ...s, [date]: { loading: false, error: e.message || 'Error' } }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:site_name" content={siteName} />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {/* Optional: supply a representative image if available */}
        {/* <meta property="og:image" content="https://localeffort.app/og/pizza-party.jpg" /> */}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      {/* Rebuilt onto .ht-scope--pizza (2026-07-26). What was here: an
          amber→orange→rose gradient card with a radial blob overlay, a
          gradient-fill price, backdrop-blur date cards, 10px all-caps eyebrows,
          and hover gradient washes. Every one of those is on the
          art-page-design blacklist, and none of it matched the Local Pizza
          panel this page is supposed to continue. Payment logic below is
          untouched — this was a reskin, not a rewrite. */}
      <div className="fullpage-demo-scope service-page pizza-party-page">
        <div className="ht-scope ht-scope--pizza is-drawn service-page__body">
          {bookedDate && (
            <div
              className={`ht-success${justBooked ? ' is-fresh' : ''}`}
              role="status"
            >
              <p className="ht-success-lead">booked —</p>
              <p className="ht-copy" style={{ marginTop: 0 }}>
                Your reservation for <strong>{bookedDate}</strong> was received.
                We&apos;ll follow up to confirm the details.
              </p>
            </div>
          )}

          {/* ── The offer ── */}
          <section className="service-hero">
            <div className="ht-slip">
              <p className="ht-kicker">local pizza —</p>
              <h1 className="ht-heading">A pizza party in your house</h1>
              <span className="ht-rule-line" aria-hidden="true" />
              <p className="ht-copy">
                We bring the oven, the dough, and the fire. You invite people and
                stand around the oven with them for two hours while pizzas come
                out one at a time.
              </p>
              <div className="ht-ledger">
                <div className="ht-ledger-row">
                  <span>Up to 15 guests</span>
                </div>
                <div className="ht-ledger-row">
                  <span>100% local Midwest ingredients, slow-fermented sourdough crust</span>
                </div>
                <div className="ht-ledger-row">
                  <span>Setup, firing and service handled</span>
                </div>
                <div className="ht-ledger-row">
                  <span>Two hours of active pizza making and eating</span>
                </div>
                <div className="ht-ledger-row">
                  <span>Deposit to reserve your date</span>
                  <span className="ht-ledger-price">${basePrice}</span>
                </div>
                <div className="ht-ledger-row">
                  <span>Estimated total for {guestCount} guests</span>
                  <span className="ht-ledger-price">${estimatedTotal}</span>
                </div>
              </div>
              <button type="button" onClick={() => openModal(null)} className="ht-submit">
                Book a date
              </button>
            </div>
          </section>

          {/* ── Dates: chips, the same pressed-state control the event type uses ── */}
          <section id="dates" className="service-pricing">
            <p className="ht-kicker">open dates —</p>
            <h2>
              {availabilityMonthLabel} {availabilityYearLabel}
            </h2>
            {upcomingDates.length === 0 ? (
              <p className="ht-copy">
                More pizza party dates are coming soon. Get in touch if you need a
                date we haven&apos;t listed.
              </p>
            ) : (
              <div className="ht-chips pizza-dates">
                {upcomingDates.map(({ label, weekday }) => {
                  const st = bookingState[label] || {};
                  const isSoldOut = soldOutDates.has(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      className="ht-chip"
                      disabled={st.loading || isSoldOut}
                      onClick={() => openModal(label)}
                      aria-label={`Book pizza party on ${label}`}
                    >
                      {weekday ? `${weekday} ` : ''}{label}
                      <span className="pizza-dates__state">
                        {isSoldOut ? 'sold out' : st.loading ? 'one moment' : 'book'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Photos ── */}
          <section className="service-gallery">
            <p className="ht-kicker">from the oven —</p>
            {error && <p className="ht-error">Could not load images: {error}</p>}
            <div className="pizza-gallery">
              {images.map((img, idx) => (
                <figure className="ht-polaroid" key={img.asset_id || img.public_id}>
                  <img
                    src={img.thumbnail_url}
                    alt={`Wood-fired pizza from a Local Effort pizza party (${idx + 1})`}
                    loading="lazy"
                    decoding="async"
                    fetchPriority={idx < 2 ? 'high' : 'auto'}
                  />
                </figure>
              ))}
            </div>
            {!loading && images.length === 0 && !error && (
              <p className="ht-footnote">
                No photos yet — tag some Cloudinary images with &lsquo;pizza&rsquo;.
              </p>
            )}
          </section>

          {/* ── FAQ ── */}
          <section className="service-faq" aria-labelledby="pizza-faq">
            <p className="ht-kicker">questions —</p>
            <h2 id="pizza-faq">Before you book</h2>
            <div className="service-faq__list">
              {PIZZA_FAQ.map((item) => (
                <details className="ht-recent-menu" key={item.q}>
                  <summary>
                    <span>{item.q}</span>
                    <span className="ht-recent-menu__hint">answer</span>
                  </summary>
                  <div className="ht-recent-menu__body">
                    <p className="ht-copy" style={{ marginTop: 0 }}>{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div className="fullpage-demo-scope pizza-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="pizza-modal__scrim" onClick={closeModal} />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="ht-scope ht-scope--pizza is-drawn ht-slip pizza-modal__panel"
            >
              <div className="pizza-modal__head">
                <div>
                  <p className="ht-kicker">{selectedDate ? 'book —' : 'pick a date —'}</p>
                  <h3 className="ht-heading">{selectedDate ? selectedDate : 'Select a date'}</h3>
                  <span className="ht-rule-line" aria-hidden="true" />
                </div>
                <button onClick={closeModal} className="pizza-modal__close" aria-label="Close">✕</button>
              </div>
              {!selectedDate && (
                <div className="space-y-2">
                  <ul className="max-h-48 overflow-auto border rounded-md divide-y">
                    {upcomingDates.map(({ label }) => {
                      const isSoldOut = soldOutDates.has(label);
                      return (
                        <li key={label} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span>{label}</span>
                          <button
                            type="button"
                            onClick={() => (!isSoldOut ? setSelectedDate(label) : null)}
                            disabled={isSoldOut}
                            className={`text-xs font-semibold px-2 py-1 rounded-md ${isSoldOut ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
                          >
                            {isSoldOut ? 'Sold out' : 'Select'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {selectedDate && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium">Name
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </label>
                  <label className="block text-sm font-medium">Email
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </label>
                  <label className="block text-sm font-medium">Phone
                    <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(555) 123-4567" className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </label>
                  <fieldset className="border rounded-md p-3 space-y-2">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Address</legend>
                    <div className="grid grid-cols-1 gap-2">
                      <input id="pp-address-line1" value={address.line1} onChange={e=>setAddress(a=>({...a,line1:e.target.value}))} placeholder="Street address" className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                      <input value={address.line2} onChange={e=>setAddress(a=>({...a,line2:e.target.value}))} placeholder="Apt / Suite (optional)" className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                      <div className="grid grid-cols-6 gap-2">
                        <input value={address.city} onChange={e=>setAddress(a=>({...a,city:e.target.value}))} placeholder="City" className="col-span-3 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        <input value={address.state} onChange={e=>setAddress(a=>({...a,state:e.target.value}))} placeholder="State" className="col-span-1 rounded-md border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        <input value={address.postal} onChange={e=>setAddress(a=>({...a,postal:formatPostal(e.target.value)}))} placeholder="ZIP" className="col-span-2 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                      </div>
                    </div>
                  </fieldset>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block text-sm font-medium">Mealtime
                      <select value={mealTime} onChange={e=>setMealTime(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                        {['4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="block text-sm font-medium">Guests
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={guestCount}
                        onChange={(e) => setGuestCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </label>
                  </div>
                  <div className="space-y-2 border rounded-md p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" checked={addOnEnabled} onChange={(e) => setAddOnEnabled(e.target.checked)} />
                      <span>Add salads & dessert ($9 / guest)</span>
                    </label>
                    {addOnEnabled && (
                      <div className="flex items-center gap-3 pl-6">
                        <span className="text-xs text-neutral-500">Add-on total: ${addOnTotal}</span>
                      </div>
                    )}
                  </div>
                  <label className="block text-sm font-medium">Pizza Requests (optional)
                    <textarea value={pizzaRequests} onChange={e=>setPizzaRequests(e.target.value)} placeholder="Favorite styles, dietary notes, special requests..." rows={3} className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </label>
                  <div className="space-y-1 pt-2 border-t text-sm">
                    <div className="flex items-center justify-between font-medium">
                      <span>Deposit (due now)</span>
                      <span>${grandTotal}</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-600 text-xs">
                      <span>Estimated total ({guestCount} guests)</span>
                      <span>${estimatedTotal}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={closeModal} type="button" className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-50">Cancel</button>
                <button
                  onClick={selectedDate ? submitBooking : undefined}
                  type="button"
                  disabled={selectedDate ? (bookingState[selectedDate]?.loading || submitting || !cardLoaded || !!cardError || loadingScript || !isValidEmail(email) || !fullName.trim() || !isValidPhone(phone) || !isValidAddress(address)) : false}
                  className={`flex-1 rounded-md text-sm font-semibold px-4 py-2 shadow disabled:opacity-60 disabled:cursor-not-allowed ${selectedDate ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'}`}
                >
                  {selectedDate ? (
                    bookingState[selectedDate]?.loading || submitting ? 'Processing…' :
                      (!fullName.trim() ? 'Enter Name' : !isValidEmail(email) ? 'Enter Email' : !isValidPhone(phone) ? 'Phone Needed' : !isValidAddress(address) ? 'Address Needed' : 'Pay Deposit')
                  ) : 'Select a Date'}
                </button>
              </div>
              {selectedDate && bookingState[selectedDate]?.error && (
                <p className="text-xs text-rose-600 pt-2">{bookingState[selectedDate].error}</p>
              )}
              {selectedDate && bookingState[selectedDate]?.success && (
                <p className="text-xs text-emerald-600 pt-2">Payment successful! We will confirm shortly.</p>
              )}
              {cardError && (
                <p className="text-xs text-rose-600 pt-2">{cardError}</p>
              )}
              <div className="mt-4 border rounded-md p-4 bg-white" aria-label="Pizza party card form">
                <div id="pp-card-container" className="min-h-[88px]" />
                {!cardLoaded && !cardError && (
                  <p className="mt-2 text-xs text-neutral-500">
                    {loadingScript ? 'Loading payment library…' : 'Initializing secure payment form…'}
                  </p>
                )}
              {(cardError || (selectedDate && bookingState[selectedDate]?.error)) && (
                <div className="mt-2 text-[10px] text-rose-600 space-y-1">
                  {cardError && <p>{cardError}</p>}
                  <FallbackLink date={selectedDate} email={email} addOnGuests={addOnEnabled ? guestCount : 0} />
                </div>
              )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {import.meta.env.DEV && (
        <div className="mt-12 max-w-md text-xs p-3 border rounded bg-neutral-50 space-y-1">
          <p className="font-semibold">Payment Diagnostics</p>
          <p>SDK: {envInfo?.sdkUrl}</p>
          <p>Environment: {envInfo?.environment || 'unknown'}</p>
          <p>Sandbox: {String(envInfo?.sandbox)}</p>
          <p>App ID present: {envInfo?.appId ? 'yes' : 'no'}</p>
          <p>Location ID present: {envInfo?.locationId ? 'yes' : 'no'}</p>
          <p>Secure context: {envInfo?.secureContext ? 'true' : 'false'}</p>
          <p>Allowed for Square: {envInfo?.secureForSquare ? 'true' : 'false'}</p>
          <p>
            Host: {envInfo?.hostname || 'unknown'} ({envInfo?.protocol || 'n/a'})
          </p>
          <p>Card loaded: {cardLoaded ? 'true' : 'false'}</p>
          {cardError && <p className="text-rose-600">Error: {cardError}</p>}
        </div>
      )}
    </>
  );
};

// Hosted payment link fallback component
const FallbackLink = ({ date, email, addOnGuests }) => {
  const [url, setUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');
  const build = async () => {
    if (loading) return;
    setLoading(true); setErr('');
    try {
      const qs = new URLSearchParams();
      if (date) qs.set('date', date);
      if (email) qs.set('email', email);
      if (addOnGuests) qs.set('addOnGuests', String(addOnGuests));
      const res = await fetch(`/api/store/pizza-party-link?${qs.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Link creation failed');
      setUrl(data.url);
    } catch (e) {
      setErr(e?.message || 'Failed to create link');
    } finally { setLoading(false); }
  };
  return (
    <div className="space-y-1">
      {!url && <button type="button" onClick={build} className="underline text-[10px]">Get fallback hosted checkout</button>}
      {loading && <p>Building link…</p>}
      {err && <p className="text-rose-600">{err}</p>}
      {url && <p><a href={url} className="text-orange-600 underline" target="_blank" rel="noopener noreferrer">Open hosted Square checkout</a></p>}
    </div>
  );
};
FallbackLink.propTypes = {};

export default PizzaPartyPage;

