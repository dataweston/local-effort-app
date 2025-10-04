import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useSquareCard } from '../hooks/useSquareCard';

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
  const canonical = 'https://localeffort.app/pizza-party';
  const siteName = 'Local Effort';
  const pageTitle = 'Mobile Wood-Fired Pizza Party | Local Effort';
  const pageDescription = 'Book a mobile wood-fired pizza party (up to 15 guests) with Local Effort. We bring the oven, premium midwest ingredients, and sourdough crust to your home.';

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
    description: 'On-site artisanal wood-fired pizza experience (up to 15 guests).',
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
      price: '300',
      priceCurrency: 'USD',
      availability: 'https://schema.org/LimitedAvailability',
      url: canonical,
      validFrom: new Date().toISOString()
    }
  }));

  const serviceSchema = {
    '@type': 'Service',
    name: 'Mobile Wood-Fired Pizza Party',
    description: pageDescription,
    provider: {
      '@type': 'LocalBusiness',
      name: siteName,
      areaServed: { '@type': 'Place', name: 'Minnesota' }
    },
    offers: {
      '@type': 'Offer',
      price: '300',
      priceCurrency: 'USD',
      description: 'Flat event rate for up to 15 guests.'
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
  const { cardLoaded, error: cardError, loadingScript, tokenize, reset, envInfo } = useSquareCard('#pp-card-container', squareEnabled, [squareEnabled]);
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

  const basePrice = 300;
  const addOnTotal = addOnEnabled ? guestCount * 9 : 0;
  const grandTotal = basePrice + addOnTotal;

  useEffect(() => {
    let active = true;
    fetchPizzaImages((imgs) => { if (active) setImages(imgs); }, (err) => active && setError(err), (val) => active && setLoading(val));
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
        if (process.env.NODE_ENV !== 'production') {
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
      if (process.env.NODE_ENV !== 'production') {
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
          basePriceCents: 30000,
          addOnPricePerGuestCents: 900
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      setBookingState(s => ({ ...s, [date]: { loading: false, success: true, paymentId: data.paymentId } }));
      setBookedDate(date);
      setJustBooked(true);
      closeModal();
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
      <div className="space-y-16">
        {bookedDate && (
          <div className={`p-4 rounded-lg border bg-green-50 text-green-800 text-sm shadow-sm flex items-start gap-3 transition-all ${justBooked ? 'border-green-400 ring-2 ring-green-300' : 'border-green-300'}`}>
            <span className="font-semibold">Booked!</span>
            <span>Your reservation for <strong>{bookedDate}</strong> was received. We\'ll follow up to confirm details.</span>
          </div>
        )}
        {/* Removed original h2 and paragraph per request */}
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-14">
        {/* Intro */}
        <div className="text-center space-y-4">
          <h1 className="heading-display heading-balance">Pizza party special</h1>
          <p className="mt-2 text-xl md:text-2xl text-neutral-800 max-w-3xl mx-auto leading-relaxed">Host an unforgettable pizza experience right in your home. We bring the oven, the dough, and the vibes. We call it <strong>Local Pizza</strong>.</p>
        </div>

        {/* Offer Card */}
        <section>
          <div className="relative rounded-2xl border bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6 md:p-10 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.15]" style={{backgroundImage:'radial-gradient(circle at 30% 30%, #fb923c, transparent 60%)'}} />
            <div className="relative grid md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2 space-y-4">
                <h2 className="heading-lg heading-balance">Pizza party in your home</h2>
                <ul className="list-disc list-inside text-neutral-700 text-sm md:text-base space-y-1">
                  <li>Up to 15 guests</li>
                  <li>100% local midwest ingredients, slow-fermented sourdough crust</li>
                  <li>We handle setup, firing & service</li>
                  <li>Includes 2 hours of active pizza making/eating time</li>
                </ul>
              </div>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">$300</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-neutral-500">Flat event rate</div>
                </div>
                <button type="button" onClick={() => openModal(null)} className="inline-flex items-center rounded-md bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 shadow-sm transition-colors">Book / Pay</button>
              </div>
            </div>
          </div>
        </section>

        {/* Available Dates */}
        <section id="dates">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            Available {availabilityMonthLabel} Dates
            <span className="text-[10px] font-mono bg-neutral-200 rounded px-1.5 py-0.5">{availabilityYearLabel}</span>
          </h3>
          <div className="mx-auto max-w-4xl">
            {upcomingDates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-600">
                More pizza party dates are coming soon. Reach out if you need a custom date.
              </div>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {upcomingDates.map(({ label, weekday }) => {
                  const st = bookingState[label] || {};
                  const isSoldOut = soldOutDates.has(label);
                  return (
                    <li key={label} className={`relative group rounded-xl border bg-white/80 backdrop-blur-sm shadow-sm px-3 py-3 flex flex-col items-start justify-between h-28 overflow-hidden ${isSoldOut ? 'opacity-80' : ''}`}>
                      <div className="w-full flex items-start justify-between gap-2">
                        <div>
                          {weekday && <span className="block text-[10px] uppercase tracking-wide text-neutral-500">{weekday}</span>}
                          <span className="font-semibold text-neutral-800 text-sm tracking-tight">{label}</span>
                        </div>
                        {st.loading && <span className="text-[10px] text-orange-600 animate-pulse">...</span>}
                      </div>
                      <button
                        type="button"
                        disabled={st.loading || isSoldOut}
                        onClick={() => openModal(label)}
                        className={`mt-auto inline-flex justify-center items-center rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-colors border ${st.loading || isSoldOut ? 'bg-neutral-200 text-neutral-500 border-neutral-200 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600'}`}
                        aria-label={`Book pizza party on ${label}`}
                      >
                        {isSoldOut ? 'Sold out' : st.loading ? 'Processing' : 'Book'}
                      </button>
                      {isSoldOut && (
                        <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wide bg-rose-100 text-rose-700 rounded px-2 py-0.5">Sold Out</span>
                      )}
                      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-orange-50/40 to-rose-50/40" />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Image Grid */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-semibold">Pizza Inspiration</h3>
            {loading && <span className="text-sm text-neutral-500 animate-pulse">Loading...</span>}
          </div>
          {error && (
            <div className="p-4 mb-6 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              Could not load images: {error}
            </div>
          )}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
            {/* Masonry using CSS multi-columns */}
            {images.map((img, idx) => (
              <motion.figure key={img.asset_id || img.public_id} className="mb-3 break-inside-avoid rounded-lg overflow-hidden shadow-sm bg-neutral-100" whileHover={{ scale: 1.02 }}>
                <img
                  src={img.thumbnail_url}
                  alt={`Wood-fired pizza ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-auto block"
                  decoding="async"
                  fetchPriority={idx < 2 ? 'high' : 'auto'}
                />
              </motion.figure>
            ))}
            {!loading && images.length === 0 && !error && (
              <p className="text-sm text-neutral-500">No images found yet. Tag some photos in Cloudinary with 'pizza'.</p>
            )}
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <h3 className="text-xl font-semibold mt-24 mb-6">FAQ</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-neutral-900">What pizzas does this include?</h4>
              <p className="text-sm text-neutral-700 mt-1">We have some signature favorites, or we're happy to take requests.</p>
            </div>
            <div>
              <h4 className="font-medium text-neutral-900">Does it include anything besides pizza?</h4>
              <p className="text-sm text-neutral-700 mt-1">This offer is just for pizza, but we can build a bigger package if you like. It's easy to add additional sides like salads and dessert.</p>
            </div>
            <div>
              <h4 className="font-medium text-neutral-900">What kind of pizza do you make?</h4>
              <p className="text-sm text-neutral-700 mt-1">Minnesotan-style. It's sort of neapolitan, sort of New York. Puffy, crispy, chewy crusts. It's our own thing.</p>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              className="relative w-full max-w-md rounded-xl bg-white shadow-lg border p-6 space-y-5 mt-10 mb-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedDate ? `Book ${selectedDate}` : 'Select a Date'}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{selectedDate ? 'Confirm your details below.' : 'Choose a date to continue.'}</p>
                </div>
                <button onClick={closeModal} className="text-neutral-400 hover:text-neutral-600" aria-label="Close">✕</button>
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
                  <div className="flex items-center justify-between text-sm font-medium pt-2 border-t">
                    <span>Total</span>
                    <span>${grandTotal}</span>
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
                    bookingState[selectedDate]?.loading || submitting ? 'Charging…' :
                      (!fullName.trim() ? 'Enter Name' : !isValidEmail(email) ? 'Enter Email' : !isValidPhone(phone) ? 'Phone Needed' : !isValidAddress(address) ? 'Address Needed' : 'Pay Now')
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
              <div id="pp-card-container" className="mt-4 border rounded-md p-4 bg-white min-h-[88px]" aria-label="Pizza party card form">
                {!cardLoaded && !cardError && (
                  <p className="text-xs text-neutral-500">
                    {loadingScript ? 'Loading payment library…' : 'Initializing secure payment form…'}
                  </p>
                )}
                {cardError && (
                  <div className="text-[10px] text-rose-600 space-y-1">
                    <p>{cardError}</p>
                    <FallbackLink date={selectedDate} email={email} addOnGuests={addOnEnabled ? guestCount : 0} />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {process.env.NODE_ENV !== 'production' && (
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

